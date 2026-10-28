import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWorkflowFixture, type WorkflowFixture } from '../events/workflow-fixture.js';
import type { WorkflowActor } from '../../../backend/src/modules/events/workflow-support.js';
import { cancelEquipmentLine, getEventEquipmentPlan, listEquipmentRequests, replaceReservedEquipmentLine,
  reviewEquipmentRequest, saveEquipmentRequest } from '../../../backend/src/modules/equipment/equipment-service.js';
import { changeEquipmentReservation, getEquipmentReservationContext } from '../../../backend/src/modules/equipment/reservation-service.js';
import { listNotifications } from '../../../backend/src/modules/notifications/inbox.js';
let f: WorkflowFixture;
let organiser: WorkflowActor; let coordinator: WorkflowActor; let technical: WorkflowActor;
const period = { startsAt: '2031-01-12T02:00:00.000001Z', endsAt: '2031-01-12T04:00:00.000001Z' };
beforeAll(async () => { f = await createWorkflowFixture(); organiser = await f.createUser('EVENT_ORGANISER');
  coordinator = await f.createUser('EVENT_COORDINATOR'); technical = await f.createUser('TECHNICAL_SUPPORT_STAFF'); });
afterAll(async () => { await f?.destroy(); });
async function setup() {
  const eventId = await f.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED', ...period });
  const typeId = randomUUID(); await f.pool.query('INSERT INTO equipment_types(id,name,total_quantity) VALUES($1,$2,2)', [typeId, typeId]);
  return { eventId, typeId, line: { equipmentTypeId: typeId, quantity: 2, ...period, technicalRequirements: 'Wireless' } };
}
const plan = (eventId: string, actor = coordinator) => getEventEquipmentPlan(f.pool, { eventId, actor });
async function save(eventId: string, lines: object[], revision?: string, notRequired = false) {
  return saveEquipmentRequest(f.pool, { eventId, actor: coordinator, input: { lines, notRequired, revision: revision ?? (await plan(eventId)).revision } });
}
async function reserve(eventId: string, lineId: string, revision?: string) {
  return reviewEquipmentRequest(f.pool, { lineId, actor: technical, input: { decision: 'RESERVED', revision: revision ?? (await plan(eventId, technical)).revision } });
}
const row = async (id: string) => (await f.pool.query('SELECT * FROM equipment_requests WHERE id=$1', [id])).rows[0];

describe('KAN-63 PR63 persisted source revisions and KAN-26 integration', () => {
  it('saves microseconds, technical notes, refreshed versions, and one full KAN-26 reservation', async () => {
    const x = await setup(); const initial = await plan(x.eventId);
    const saved = await save(x.eventId, [x.line], initial.revision);
    expect(saved.revision).toBe((await plan(x.eventId)).revision); expect(saved.revision).not.toBe(initial.revision);
    expect((await row(saved.lines[0]!.id)).notes).toBe('Wireless');
    const result = await reserve(x.eventId, saved.lines[0]!.id);
    expect(result).toMatchObject({ status: 'RESERVED', startsAt: period.startsAt, endsAt: period.endsAt });
    expect((await listNotifications(f.dependencies, technical)).some(item => item.type === 'EQUIPMENT_RESERVED')).toBe(true);
    const notices = await f.notifications(x.eventId); expect(notices.map(n => n.recipient_id).sort()).toEqual([technical.id, coordinator.id].sort());
    await expect(reserve(x.eventId, saved.lines[0]!.id)).rejects.toMatchObject({ code: 'EQUIPMENT_ALREADY_DECIDED' });
    expect(await f.notifications(x.eventId)).toHaveLength(2);
  });
  it('rejects stale and omitted browser versions, including an empty Not Required plan', async () => {
    const x = await setup(); const before = await plan(x.eventId);
    const notRequired = await save(x.eventId, [], before.revision, true);
    expect(notRequired.revision).not.toBe(before.revision);
    await expect(save(x.eventId, [x.line], before.revision)).rejects.toMatchObject({ code: 'STALE_EQUIPMENT_REQUEST' });
    await expect(saveEquipmentRequest(f.pool, { eventId: x.eventId, actor: coordinator, input: { lines: [x.line] } }))
      .rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_REQUEST' });
    expect((await plan(x.eventId)).status).toBe('NOT_REQUIRED');
    expect((await plan(x.eventId)).items).toHaveLength(0);
  });
  it('detects KAN-26 decisions which do not increment the old integer line revision', async () => {
    const x = await setup(); const saved = await save(x.eventId, [x.line]); const id = saved.lines[0]!.id;
    const stale = (await plan(x.eventId)).revision;
    const context = await getEquipmentReservationContext(f.dependencies, { actor: technical, eventId: x.eventId });
    await changeEquipmentReservation(f.dependencies, { actor: technical, eventId: x.eventId, requestId: id, action: 'reserve',
      input: { requirementsVersion: context.requirementsVersion } });
    expect((await row(id)).revision).toBe(1);
    await expect(save(x.eventId, [{ ...x.line, quantity: 1 }], stale)).rejects.toMatchObject({ code: 'STALE_EQUIPMENT_REQUEST' });
    await expect(replaceReservedEquipmentLine(f.pool, { actor: coordinator, lineId: id,
      input: { revision: stale, replacement: x.line } })).rejects.toMatchObject({ code: 'STALE_EQUIPMENT_REQUEST' });
    expect((await row(id)).status).toBe('RESERVED');
  });
  it('refuses stale decisions, active Not Required, duplicate decided lines and off-event periods', async () => {
    const x = await setup(); const first = await save(x.eventId, [x.line]);
    const changed = await save(x.eventId, [{ ...x.line, quantity: 1 }]);
    await expect(reserve(x.eventId, first.lines[0]!.id, first.revision)).rejects.toMatchObject({ code: 'STALE_EQUIPMENT_REQUEST' });
    await expect(save(x.eventId, [], undefined, true)).rejects.toMatchObject({ code: 'EQUIPMENT_STILL_REQUIRED' });
    await expect(save(x.eventId, [{ ...x.line, endsAt: '2031-01-12T04:00:00.000002Z' }])).rejects.toMatchObject({ code: 'EQUIPMENT_REQUEST_PERIOD_MISMATCH' });
    await reserve(x.eventId, changed.lines[0]!.id);
    await expect(save(x.eventId, [x.line])).rejects.toMatchObject({ code: 'EQUIPMENT_REPLACEMENT_REQUIRED' });
  });
  it('requires a fresh version/reason for rejection and cancellation', async () => {
    const x = await setup(); const saved = await save(x.eventId, [x.line]); const id = saved.lines[0]!.id;
    const rejected = await reviewEquipmentRequest(f.pool, { actor: technical, lineId: id,
      input: { revision: saved.revision, decision: 'REJECTED', reason: ' Unavailable ' } });
    expect(rejected).toMatchObject({ status: 'REJECTED', decisionReason: 'Unavailable' });
    await expect(cancelEquipmentLine(f.pool, { actor: coordinator, lineId: id,
      input: { revision: saved.revision, reason: 'Remove' } })).rejects.toMatchObject({ code: 'STALE_EQUIPMENT_REQUEST' });
    await cancelEquipmentLine(f.pool, { actor: coordinator, lineId: id, input: { revision: rejected.revision, reason: 'Remove' } });
    const after = await row(id); expect(after.release_reason).toBe('Remove'); expect(after.decision_reason).toBe('Unavailable');
    const empty = await save(x.eventId, [], undefined, true); expect(empty.status).toBe('NOT_REQUIRED');
  });
  it('replaces explicitly without changing the original allocation and requires fresh reservation', async () => {
    const x = await setup(); const saved = await save(x.eventId, [x.line]); const id = saved.lines[0]!.id; await reserve(x.eventId, id);
    const original = await row(id);
    const replaced = await replaceReservedEquipmentLine(f.pool, { actor: coordinator, lineId: id,
      input: { revision: (await plan(x.eventId)).revision, replacement: { ...x.line, quantity: 1 } } });
    expect(replaced.replacement.status).toBe('REQUESTED'); expect(replaced.revision).toBe((await plan(x.eventId)).revision);
    const old = await row(id); expect(old.quantity).toBe(2); expect(old.decided_at).toEqual(original.decided_at); expect(old.status).toBe('CANCELLED');
    await expect(replaceReservedEquipmentLine(f.pool, { actor: coordinator, lineId: id,
      input: { revision: replaced.revision, replacement: x.line } })).rejects.toMatchObject({ code: 'EQUIPMENT_NOT_RESERVED' });
    await reserve(x.eventId, replaced.replacement.id); expect((await row(replaced.replacement.id)).quantity).toBe(1);
  });
  it('rolls back the full save/replacement for inactive types without releasing old lines', async () => {
    const x = await setup(); const saved = await save(x.eventId, [x.line]); const id = saved.lines[0]!.id; await reserve(x.eventId, id);
    await f.pool.query('UPDATE equipment_types SET is_active=false WHERE id=$1', [x.typeId]);
    await expect(replaceReservedEquipmentLine(f.pool, { actor: coordinator, lineId: id,
      input: { revision: (await plan(x.eventId)).revision, replacement: x.line } })).rejects.toMatchObject({ code: 'INVALID_EQUIPMENT_REQUEST' });
    expect((await row(id)).status).toBe('RESERVED');
  });
  it('rechecks role and ownership and rejects non-approved event writes', async () => {
    const x = await setup(); const p = await plan(x.eventId); const other = await f.createUser('EVENT_COORDINATOR');
    await expect(saveEquipmentRequest(f.pool, { actor: other, eventId: x.eventId, input: { revision: p.revision, lines: [x.line] } })).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    await expect(getEventEquipmentPlan(f.pool, { actor: other, eventId: x.eventId })).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    expect(await listEquipmentRequests(f.pool, { actor: other })).toEqual([]);
    await f.pool.query("UPDATE event_requests SET status='CONFIRMED' WHERE id=$1", [x.eventId]);
    await expect(save(x.eventId, [x.line], (await plan(x.eventId)).revision)).rejects.toMatchObject({ code: 'EVENT_NOT_APPROVED' });
    const revoked = await f.createUser('EVENT_COORDINATOR'); await f.pool.query("UPDATE app_users SET role='ATTENDEE' WHERE id=$1", [revoked.id]);
    await expect(saveEquipmentRequest(f.pool, { actor: revoked, eventId: x.eventId, input: { revision: p.revision, lines: [x.line] } })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
  });
  it('prevents a reservation without a current coordinator and preserves the pending line', async () => {
    const x = await setup(); const saved = await save(x.eventId, [x.line]);
    await f.pool.query('UPDATE event_requests SET coordinator_id=NULL WHERE id=$1', [x.eventId]);
    await expect(reserve(x.eventId, saved.lines[0]!.id)).rejects.toMatchObject({ code: 'EQUIPMENT_COORDINATOR_REQUIRED' });
    expect((await row(saved.lines[0]!.id)).status).toBe('REQUESTED');
  });
  it('serializes two competing event reservations without overbooking or a deadlock', async () => {
    const x = await setup(); const eventB = await f.createEvent({ organiserId: organiser.id, coordinatorId: coordinator.id, status: 'APPROVED', ...period });
    const a = await save(x.eventId, [x.line]); const b = await save(eventB, [x.line]);
    const results = await Promise.allSettled([reserve(x.eventId, a.lines[0]!.id), reserve(eventB, b.lines[0]!.id)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'EQUIPMENT_UNAVAILABLE' } });
    expect((await f.pool.query("SELECT count(*)::int AS n FROM equipment_requests WHERE equipment_type_id=$1 AND status='RESERVED'", [x.typeId])).rows[0].n).toBe(1);
  });
  it('rechecks operational capacity after waiting for a concurrent stock writer', async () => {
    const x = await setup(); const saved = await save(x.eventId, [x.line]);
    const blocker = await f.pool.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM equipment_types WHERE id=$1 FOR UPDATE', [x.typeId]);
      pending = reserve(x.eventId, saved.lines[0]!.id).then(result => ({ result }), error => ({ error }));
      const application = new URL(f.pool.options.connectionString!).searchParams.get('application_name');
      let waiting = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const activity = await f.pool.query(`SELECT 1 FROM pg_stat_activity WHERE application_name=$1
          AND wait_event_type='Lock' AND query LIKE 'SELECT t.id FROM equipment_types%'`, [application]);
        if (activity.rowCount) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await blocker.query('UPDATE equipment_types SET damaged_quantity=1 WHERE id=$1', [x.typeId]);
      await blocker.query('COMMIT');
      expect(await pending).toMatchObject({ error: { code: 'EQUIPMENT_UNAVAILABLE' } });
      expect((await row(saved.lines[0]!.id)).status).toBe('REQUESTED');
      expect(await f.notifications(x.eventId)).toHaveLength(0);
    } finally {
      await blocker.query('ROLLBACK'); blocker.release(); await pending;
    }
  });
  it('serializes two stale coordinator saves and preserves the winning request', async () => {
    const x = await setup(); const revision = (await plan(x.eventId)).revision;
    const results = await Promise.allSettled([save(x.eventId, [x.line], revision), save(x.eventId, [{ ...x.line, quantity: 1 }], revision)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'STALE_EQUIPMENT_REQUEST' } });
    expect((await plan(x.eventId)).items.filter(line => line.status === 'REQUESTED')).toHaveLength(1);
  });
  it('serializes replacement against KAN-26 cancellation with no duplicate replacement or deadlock', async () => {
    const x = await setup(); const saved = await save(x.eventId, [x.line]); const id = saved.lines[0]!.id; await reserve(x.eventId, id);
    const revision = (await plan(x.eventId)).revision;
    const requirementsVersion = (await getEquipmentReservationContext(f.dependencies, { actor: technical, eventId: x.eventId })).requirementsVersion;
    const results = await Promise.allSettled([
      replaceReservedEquipmentLine(f.pool, { actor: coordinator, lineId: id, input: { revision, replacement: { ...x.line, quantity: 1 } } }),
      changeEquipmentReservation(f.dependencies, { actor: technical, eventId: x.eventId, requestId: id, action: 'cancel', input: { requirementsVersion, reason: 'No longer needed' } }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find(result => result.status === 'rejected');
    expect(failed?.status === 'rejected' && ['STALE_EQUIPMENT_REQUEST', 'EQUIPMENT_CONTEXT_CHANGED'].includes(failed.reason.code)).toBe(true);
    expect((await row(id)).status).toBe('CANCELLED');
  });
});
