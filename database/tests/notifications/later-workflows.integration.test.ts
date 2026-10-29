import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';
import { inActorTransaction, type WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { listNotifications } from '../../../backend/src/modules/notifications/inbox.js';
import { listOwnRegistrations } from '../../../backend/src/modules/registrations/service.js';
import { cancelEvent } from '../../../backend/src/modules/events/cancellation.js';
import { submitChangeRequest, decideChangeRequest } from '../../../backend/src/modules/events/change-requests.js';
let f:WorkflowFixture;
let owner:WorkflowActor,coordinator:WorkflowActor,technical:WorkflowActor,venue:WorkflowActor,a1:WorkflowActor,a2:WorkflowActor;
beforeAll(async()=>{
  f=await createWorkflowFixture();
  owner=await f.createUser('EVENT_ORGANISER');coordinator=await f.createUser('EVENT_COORDINATOR');
  technical=await f.createUser('TECHNICAL_SUPPORT_STAFF');venue=await f.createUser('VENUE_STAFF');
  a1=await f.createUser('ATTENDEE');a2=await f.createUser('ATTENDEE');
});
afterAll(async()=>{await f?.destroy();});
async function setup(arrangements=true){
  const id=await f.createEvent({organiserId:owner.id,coordinatorId:coordinator.id,status:'APPROVED',startsAt:'2035-01-01T02:00:00Z',endsAt:'2035-01-01T05:00:00Z'});
  if(!arrangements)return {id,type:'',equipment:''};
  const type=randomUUID();await f.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,3)',[type,'Projector '+type]);
  const equipment=randomUUID();await f.pool.query(`INSERT INTO equipment_requests(id,event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at,status,decided_by,decided_at)
    VALUES($1,$2,$3,$4,2,'2035-01-01T02:00:00Z','2035-01-01T05:00:00Z','RESERVED',$5,now())`,[equipment,id,type,coordinator.id,technical.id]);
  const hall=randomUUID();await f.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)',[hall,'Hall '+hall]);
  await f.pool.query(`INSERT INTO venue_bookings(event_request_id,venue_id,requested_by,status,starts_at,ends_at,decided_by,decided_at)
    VALUES($1,$2,$3,'APPROVED','2035-01-01T02:00:00Z','2035-01-01T05:00:00Z',$4,now())`,[id,hall,coordinator.id,venue.id]);
  return {id,type,equipment};
}
async function registration(id:string,actor=a1,status='REGISTERED'){
  return (await f.pool.query<{id:string}>(`INSERT INTO event_registrations(event_request_id,attendee_id,status,withdrawn_at)
    VALUES($1,$2,$3,CASE WHEN $3='WITHDRAWN' THEN now() END) RETURNING id`,[id,actor.id,status])).rows[0]!.id;
}
const transition=(id:string,status:string)=>inActorTransaction(f.pool,coordinator.id,c=>c.query('UPDATE event_requests SET status=$2 WHERE id=$1',[id,status]));

describe('KAN-80 added trigger integrations on real PostgreSQL',()=>{
  it('TC-20-409: confirmation notifies current managers, active attendees and arrangement staff once',async()=>{
    const {id}=await setup();const ownId=await registration(id);await registration(id,a2,'WITHDRAWN');
    await transition(id,'CONFIRMED');await transition(id,'CONFIRMED');
    const notices=(await f.notifications(id)).filter(x=>x.type==='EVENT_CONFIRMED');
    expect(notices.map(x=>x.recipient_id).sort()).toEqual([owner.id,coordinator.id,technical.id,venue.id,a1.id].sort());
    const attendeeNotices=await listNotifications(f.dependencies,a1);
    expect(attendeeNotices).toEqual(expect.arrayContaining([expect.objectContaining({type:'EVENT_CONFIRMED',event:null,link:`/registrations?registration=${ownId}`})]));
    expect((await listNotifications(f.dependencies,a2)).some(n=>n.type==='EVENT_CONFIRMED'&&n.message.includes('Open day'))).toBe(false);
  });
  it('TC-20-410: real cancellation includes affected staff and keeps attendee outcome safe',async()=>{
    const {id}=await setup();await registration(id);
    await cancelEvent(f.pool,{eventRequestId:id,actor:owner,input:{reason:'Internal incident details',confirmAffectedArrangements:true}});
    const notices=(await f.notifications(id)).filter(x=>x.type==='EVENT_CANCELLED');
    expect(notices.map(x=>x.recipient_id).sort()).toEqual([owner.id,coordinator.id,technical.id,venue.id,a1.id].sort());
    expect(notices.find(x=>x.recipient_id===owner.id)?.message).toBe('Open day was cancelled.');
    const own=(await listNotifications(f.dependencies,a1)).filter(x=>x.type==='EVENT_CANCELLED');
    expect(own.every(x=>!x.message.includes('Internal incident'))).toBe(true);
    expect(own.every(x=>x.event===null && x.booking===null)).toBe(true);
  });
  it.each(['CONFIRMED','CANCELLED'])('KAN-80 excludes staff of historical cancelled arrangements on %s',async outcome=>{
    const {id}=await setup();
    const oldVenue=await f.createUser('VENUE_STAFF');const oldTech=await f.createUser('TECHNICAL_SUPPORT_STAFF');
    const hall=randomUUID();await f.pool.query('INSERT INTO venues(id,name,capacity) VALUES($1,$2,100)',[hall,'Old hall '+hall]);
    await f.pool.query(`INSERT INTO venue_bookings(event_request_id,venue_id,requested_by,status,starts_at,ends_at,decided_by,decided_at)
      VALUES($1,$2,$3,'CANCELLED','2035-01-01T02:00:00Z','2035-01-01T05:00:00Z',$4,now())`,[id,hall,coordinator.id,oldVenue.id]);
    const type=randomUUID();await f.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,3)',[type,'Old projector '+type]);
    await f.pool.query(`INSERT INTO equipment_requests(event_request_id,equipment_type_id,requested_by,quantity,starts_at,ends_at,status,decided_by,decided_at)
      VALUES($1,$2,$3,1,'2035-01-01T02:00:00Z','2035-01-01T05:00:00Z','CANCELLED',$4,now())`,[id,type,coordinator.id,oldTech.id]);
    if(outcome==='CONFIRMED') await transition(id,outcome);
    else await cancelEvent(f.pool,{eventRequestId:id,actor:owner,input:{reason:'Test',confirmAffectedArrangements:true}});
    const notices=(await f.notifications(id)).filter(n=>n.type===`EVENT_${outcome}`);
    expect(notices.map(n=>n.recipient_id)).toEqual(expect.arrayContaining([venue.id,technical.id]));
    expect(notices.map(n=>n.recipient_id)).not.toContain(oldVenue.id);
    expect(notices.map(n=>n.recipient_id)).not.toContain(oldTech.id);
  });
  it('TC-20-411: empty attendee/staff groups still notify both managers',async()=>{
    const {id}=await setup(false);await transition(id,'CONFIRMED');
    expect((await f.notifications(id)).map(x=>x.recipient_id).sort()).toEqual([owner.id,coordinator.id].sort());
  });
  it('TC-20-423: rollback after a final outcome removes status/history and all inserted notices',async()=>{
    const {id}=await setup(false);
    await expect(inActorTransaction(f.pool,coordinator.id,async c=>{
      await c.query("UPDATE event_requests SET status='CONFIRMED' WHERE id=$1",[id]);throw new Error('after insert');
    })).rejects.toThrow('after insert');
    expect((await f.eventRow(id)).status).toBe('APPROVED');expect(await f.notifications(id)).toEqual([]);
  });
  it('TC-20-402: operational loss notifies affected coordinator and deciding technical staff only',async()=>{
    const {id,type}=await setup();
    await inActorTransaction(f.pool,technical.id,c=>c.query('UPDATE equipment_types SET damaged_quantity=2 WHERE id=$1',[type]));
    const notices=(await f.notifications(id)).filter(x=>x.type==='EQUIPMENT_UNAVAILABLE');
    expect(notices.map(x=>x.recipient_id).sort()).toEqual([coordinator.id,technical.id].sort());
    await inActorTransaction(f.pool,technical.id,c=>c.query('UPDATE equipment_types SET damaged_quantity=2 WHERE id=$1',[type]));
    expect((await f.notifications(id)).filter(x=>x.type==='EQUIPMENT_UNAVAILABLE')).toHaveLength(2);
    expect((await listNotifications(f.dependencies,technical)).some(x=>x.type==='EQUIPMENT_UNAVAILABLE')).toBe(true);
  });
  it('TC-20-402: nonoverlapping reservations do not manufacture pooled shortfall',async()=>{
    const {id,type}=await setup();
    await inActorTransaction(f.pool,technical.id,c=>c.query('UPDATE equipment_types SET damaged_quantity=1 WHERE id=$1',[type]));
    expect((await f.notifications(id)).filter(x=>x.type==='EQUIPMENT_UNAVAILABLE')).toEqual([]);
  });
  it('KAN-80-AC1/8 acknowledges a different technical actor as well as the deciding staff member',async()=>{
    const {id,type}=await setup(); const actingTechnical=await f.createUser('TECHNICAL_SUPPORT_STAFF');
    await inActorTransaction(f.pool,actingTechnical.id,c=>c.query('UPDATE equipment_types SET damaged_quantity=2 WHERE id=$1',[type]));
    const notices=(await f.notifications(id)).filter(x=>x.type==='EQUIPMENT_UNAVAILABLE');
    expect(notices.map(x=>x.recipient_id).sort()).toEqual([coordinator.id,technical.id,actingTechnical.id].sort());
    expect((await listNotifications(f.dependencies,actingTechnical)).some(x=>x.type==='EQUIPMENT_UNAVAILABLE')).toBe(true);
  });
  it('TC-20-423: rolled-back stock loss preserves stock and emits no shortfall',async()=>{
    const {id,type}=await setup();
    await expect(inActorTransaction(f.pool,technical.id,async c=>{
      await c.query('UPDATE equipment_types SET damaged_quantity=2 WHERE id=$1',[type]);throw new Error('stock rollback');
    })).rejects.toThrow('stock rollback');expect(await f.notifications(id)).toEqual([]);
    expect((await f.pool.query('SELECT damaged_quantity FROM equipment_types WHERE id=$1',[type])).rows[0].damaged_quantity).toBe(0);
  });
  it('TC-20-408: legal accepted purpose change informs active attendees without bypassing KAN-15 policy',async()=>{
    const {id}=await setup(false);const ownId=await registration(id);await registration(id,a2,'WITHDRAWN');
    const revision=async()=>(await f.pool.query('SELECT revision FROM event_requests WHERE id=$1',[id])).rows[0].revision;
    const change=await submitChangeRequest(f.dependencies,{eventRequestId:id,actor:owner,input:{changes:{purpose:'Updated attendee programme'},expectedRevision:await revision()}});
    await decideChangeRequest(f.dependencies,{eventRequestId:id,changeRequestId:change.id,actor:coordinator,
      input:{decision:'APPROVED',expectedRevision:await revision()}});
    const notices=(await f.notifications(id)).filter(x=>x.type==='ATTENDEE_EVENT_CHANGED');expect(notices.map(x=>x.recipient_id)).toEqual([a1.id]);
    const details=(await listOwnRegistrations(f.pool,a1)).items.find(r=>r.id===ownId);
    expect(details).toMatchObject({purpose:'Updated attendee programme',eventName:'Open day',endsAt:'2035-01-01T05:00:00.000Z'});
    const own=await listNotifications(f.dependencies,a1);expect(own).toEqual(expect.arrayContaining([expect.objectContaining({type:'ATTENDEE_EVENT_CHANGED',link:`/registrations?registration=${ownId}`,event:null})]));
    expect(own.find(n=>n.type==='ATTENDEE_EVENT_CHANGED' && n.link===`/registrations?registration=${ownId}`)?.message).toContain('changed: purpose');
  });
});
