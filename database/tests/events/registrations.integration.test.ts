import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../backend/src/app.js';
import { getRegistrationRoster, listOwnRegistrations, withdrawRegistration } from '../../../backend/src/modules/registrations/service.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../../../backend/src/modules/notifications/inbox.js';
import { inActorTransaction, type WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { createWorkflowFixture, type WorkflowFixture } from './workflow-fixture.js';

let f: WorkflowFixture;
let owner: WorkflowActor, coordinator: WorkflowActor, other: WorkflowActor, a1: WorkflowActor, a2: WorkflowActor, tech: WorkflowActor;
beforeAll(async () => {
  f = await createWorkflowFixture();
  owner = await f.createUser('EVENT_ORGANISER'); coordinator = await f.createUser('EVENT_COORDINATOR');
  other = await f.createUser('EVENT_COORDINATOR'); a1 = await f.createUser('ATTENDEE');
  a2 = await f.createUser('ATTENDEE'); tech = await f.createUser('TECHNICAL_SUPPORT_STAFF');
});
afterAll(async () => { await f?.destroy(); });
async function event(options: { capacity?: number | null; startsAt?: string; closed?: boolean } = {}) {
  const id = await f.createEvent({ organiserId: owner.id, coordinatorId: coordinator.id, status: 'CONFIRMED',
    startsAt: options.startsAt ?? '2035-01-01T02:00:00Z', endsAt: '2035-01-01T05:00:00Z' });
  await f.pool.query(`UPDATE event_requests SET registration_required=true, registration_capacity=$2,
    registration_closes_at=$3 WHERE id=$1`, [id, options.capacity === undefined ? 1 : options.capacity, options.closed ? '2020-01-01Z' : null]);
  return id;
}
async function register(id: string, actor = a1) {
  return inActorTransaction(f.pool, actor.id, async c => (await c.query<{ id: string }>(
    'INSERT INTO event_registrations(event_request_id,attendee_id) VALUES($1,$2) RETURNING id', [id, actor.id])).rows[0]!.id);
}
const withdraw = (id: string, actor=a1) => withdrawRegistration(f.pool, actor, id, { confirm: true });
const state = async (id: string) => (await f.pool.query('SELECT * FROM event_registrations WHERE id=$1', [id])).rows[0];
const app = (actor: WorkflowActor | null) => createApp({ database: f.pool, workspace: { pool: f.pool, authenticate: async () => actor }, logger: { error() {} } });

describe('KAN-17 / KAN-67 / KAN-80 connected registration PostgreSQL workflows', () => {
  it('TC-18-401/404/405/415: own withdrawal after close persists, releases one place and notifies attendee/managers', async () => {
    const e = await event({ closed: true }); const r = await register(e);
    expect((await listOwnRegistrations(f.pool,a1)).items.find(x=>x.id===r)?.canWithdraw).toBe(true);
    expect(await withdraw(r)).toMatchObject({ changed: true, registration: { status: 'WITHDRAWN' } });
    expect((await state(r)).withdrawn_at).toBeInstanceOf(Date);
    const roster=await getRegistrationRoster(f.pool,owner,e); expect(roster.activeCount).toBe(0);
    expect(roster.items[0]?.status).toBe('WITHDRAWN');
    expect((await listOwnRegistrations(f.pool,a1)).items.find(x=>x.id===r)?.status).toBe('WITHDRAWN');
    const notices=(await f.notifications(e)).filter(x=>x.type==='REGISTRATION_WITHDRAWN');
    expect(notices.map(x=>x.recipient_id).sort()).toEqual([a1.id,owner.id,coordinator.id].sort());
    expect(await listNotifications(f.dependencies,a2)).not.toEqual(expect.arrayContaining([expect.objectContaining({type:'REGISTRATION_WITHDRAWN'})]));
  });
  it('TC-18-408: concurrent withdrawal and replay cannot release a replacement attendee place', async () => {
    const e=await event();const r=await register(e);
    const attempts=await Promise.all([withdraw(r),withdraw(r)]); expect(attempts.map(x=>x.changed).sort()).toEqual([false,true]);
    const first=await state(r); const r2=await register(e,a2); await withdraw(r);
    expect((await state(r)).withdrawn_at).toEqual(first.withdrawn_at);
    expect((await state(r2)).status).toBe('REGISTERED');
    expect((await getRegistrationRoster(f.pool,owner,e)).activeCount).toBe(1);
    expect((await f.notifications(e)).filter(x=>x.type==='REGISTRATION_WITHDRAWN')).toHaveLength(3);
  });
  it('TC-18-406/407/413: started event rejects stale confirmation without changing capacity/notices', async () => {
    const e=await event({ startsAt:'2020-01-01Z' });const r=await register(e);const before=await f.notifications(e);
    await expect(withdraw(r)).rejects.toMatchObject({code:'WITHDRAWAL_NOT_ALLOWED'});
    expect((await state(r)).status).toBe('REGISTERED');expect(await f.notifications(e)).toEqual(before);
  });
  it('KAN-17-AC101 permits an existing active registration on a non-terminal event before start and refuses replays after start', async () => {
    const e=await event(); await f.pool.query("UPDATE event_requests SET status='APPROVED' WHERE id=$1",[e]);
    const r=await register(e);expect(await withdraw(r)).toMatchObject({changed:true});
    await f.pool.query("UPDATE event_requests SET starts_at='2020-01-01Z' WHERE id=$1",[e]);
    await expect(withdraw(r)).rejects.toMatchObject({code:'WITHDRAWAL_NOT_ALLOWED'});
    expect((await state(r)).status).toBe('WITHDRAWN');
  });
  it('TC-18-409/410/411: foreign, missing, cancelled registrations and forged roles are refused', async () => {
    const e=await event();const r=await register(e);
    await expect(withdraw(r,a2)).rejects.toMatchObject({code:'REGISTRATION_NOT_FOUND'});
    await expect(withdraw(randomUUID())).rejects.toMatchObject({code:'REGISTRATION_NOT_FOUND'});
    await expect(withdraw(r,owner)).rejects.toMatchObject({code:'ACTION_FORBIDDEN'});
    await expect(withdraw(r,{id:a1.id,role:'EVENT_ORGANISER'})).rejects.toMatchObject({code:'ACTION_FORBIDDEN'});
    await f.pool.query("UPDATE event_registrations SET status='CANCELLED',cancellation_outcome_at=now() WHERE id=$1",[r]);
    await expect(withdraw(r)).rejects.toMatchObject({code:'WITHDRAWAL_NOT_ALLOWED'});
  });
  it('TC-18-412 / TC-20-424: deferred notice failure rolls back withdrawal and its capacity contribution', async () => {
    const e=await event();const r=await register(e);const before=await f.notifications(e);
    await f.pool.query(`CREATE FUNCTION fail_withdrawal_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.type='REGISTRATION_WITHDRAWN' THEN RAISE EXCEPTION 'injected deferred fault'; END IF; RETURN NEW; END $$;
      CREATE CONSTRAINT TRIGGER fail_withdrawal_notice AFTER INSERT ON notifications
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fail_withdrawal_notice()`);
    try { await expect(withdraw(r)).rejects.toThrow('injected deferred fault'); }
    finally { await f.pool.query('DROP TRIGGER fail_withdrawal_notice ON notifications; DROP FUNCTION fail_withdrawal_notice()'); }
    expect((await state(r)).status).toBe('REGISTERED');expect(await f.notifications(e)).toEqual(before);
    expect((await getRegistrationRoster(f.pool,owner,e)).activeCount).toBe(1);
  });
  it('TC-18-417: unlimited capacity remains null and withdrawal decrements only active count',async()=>{
    const e=await event({capacity:null});const r=await register(e);await register(e,a2);await withdraw(r);await withdraw(r);
    expect((await getRegistrationRoster(f.pool,owner,e)).activeCount).toBe(1);
    expect((await f.pool.query('SELECT registration_capacity FROM event_requests WHERE id=$1',[e])).rows[0].registration_capacity).toBeNull();
  });
  it('TC-18-418/419/420/427/431: owner/current coordinator get correct event/status/count and limited fields',async()=>{
    const e=await event({capacity:null});const r=await register(e);const r2=await register(e,a2);await withdraw(r);
    for(const actor of [owner,coordinator]){
      const result=await getRegistrationRoster(f.pool,actor,e);expect(result.activeCount).toBe(1);expect(result.items).toHaveLength(2);
      expect(Object.keys(result.items[0]!).sort()).toEqual(['displayName','email','status','registeredAt','withdrawnAt','cancelledAt'].sort());
    }
    await f.pool.query("UPDATE event_registrations SET status='CANCELLED',cancellation_outcome_at=now() WHERE id=$1",[r2]);
    expect((await getRegistrationRoster(f.pool,owner,e)).activeCount).toBe(0);
  });
  it('TC-18-424/426/428: empty result and immediate current-assignment authorization',async()=>{
    const e=await event();expect(await getRegistrationRoster(f.pool,owner,e)).toMatchObject({items:[],activeCount:0});
    await expect(getRegistrationRoster(f.pool,other,e)).rejects.toMatchObject({code:'EVENT_REQUEST_NOT_FOUND'});
    await expect(getRegistrationRoster(f.pool,a1,e)).rejects.toMatchObject({code:'ACTION_FORBIDDEN'});
    await f.pool.query('UPDATE event_requests SET coordinator_id=$2 WHERE id=$1',[e,other.id]);
    await expect(getRegistrationRoster(f.pool,coordinator,e)).rejects.toMatchObject({code:'EVENT_REQUEST_NOT_FOUND'});
    expect((await getRegistrationRoster(f.pool,other,e)).items).toEqual([]);
  });
  it('TC-20-412/413/419/420/427: attendee sees safe own notices and can mark only their own',async()=>{
    const e=await event();const r=await register(e);await withdraw(r);
    const notices=(await listNotifications(f.dependencies,a1)).filter(x=>x.type.startsWith('REGISTRATION_'));
    expect(notices).toEqual(expect.arrayContaining([expect.objectContaining({type:'REGISTRATION_WITHDRAWN',event:null,booking:null,link:`/registrations?registration=${r}`})]));
    const n=notices.find(x=>x.type==='REGISTRATION_WITHDRAWN' && x.message.includes('Open day'))!;
    await expect(markNotificationRead(f.dependencies,{actor:a2,notificationId:n.id})).rejects.toMatchObject({code:'NOTIFICATION_NOT_FOUND'});
    expect(await markNotificationRead(f.dependencies,{actor:a1,notificationId:n.id})).toMatchObject({read:true});
    await markAllNotificationsRead(f.dependencies,a2);
    expect((await listNotifications(f.dependencies,a1)).find(x=>x.id===n.id)?.read).toBe(true);
  });
  it('TC-20-426: reusing a registration row emits a distinct outcome, unchanged replay emits none',async()=>{
    const e=await event();const r=await register(e);await withdraw(r);
    await inActorTransaction(f.pool,a1.id,c=>c.query("UPDATE event_registrations SET status='REGISTERED',withdrawn_at=NULL,registered_at=clock_timestamp() WHERE id=$1",[r]));
    expect((await state(r)).outcome_version).toBe(3);
    expect((await f.notifications(e)).filter(x=>x.type==='REGISTRATION_CONFIRMED')).toHaveLength(6);
  });
  it('KAN-17/67 HTTP boundary rejects absent sessions, wrong role, invalid ID/body and foreign record',async()=>{
    const e=await event();const r=await register(e);
    expect((await request(app(null)).get('/api/registrations/mine')).status).toBe(401);
    expect((await request(app(owner)).get('/api/registrations/mine')).status).toBe(403);
    expect((await request(app(a1)).post('/api/registrations/no-id/withdraw').send({confirm:true})).status).toBe(400);
    expect((await request(app(a1)).post(`/api/registrations/${r}/withdraw`).send({confirm:false})).status).toBe(400);
    expect((await request(app(a2)).post(`/api/registrations/${r}/withdraw`).send({confirm:true})).status).toBe(404);
    const own=await request(app(a1)).get('/api/registrations/mine');expect(own.status).toBe(200);expect(own.headers['cache-control']).toBe('no-store');
    expect((await request(app(owner)).get(`/api/events/${e}/registrations`)).status).toBe(200);
    expect((await request(app(other)).get(`/api/events/${e}/registrations`)).status).toBe(404);
  });
});
