import { describe, it, expect, vi } from 'vitest';
import { getRegistrationRoster, listOwnRegistrations, withdrawRegistration } from '../../src/modules/registrations/service.js';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';

const attendee: WorkflowActor = { id: 'a1', role: 'ATTENDEE' };
const owner: WorkflowActor = { id: 'o1', role: 'EVENT_ORGANISER' };
const row = { id: 'r1', status: 'REGISTERED', registeredAt: new Date('2027-01-01Z'), withdrawnAt: null,
  cancelledAt: null, eventId: 'e1', eventName: 'Open day', endsAt: null, purpose: 'Meet attendees', startsAt: new Date('2027-01-10T02:00:00Z'), eventStatus: 'CONFIRMED' };
function database(options: { registration?: Partial<typeof row>; now?: string; role?: string; missing?: boolean; missingLocked?: boolean; fail?: string;
  event?: Record<string, unknown>; roster?: Record<string, unknown>[] } = {}) {
  const query = vi.fn(async (sql: string) => {
    if (options.fail && sql.includes(options.fail)) throw new Error('Injected persistence failure');
    let rows: unknown[] = [];
    if (sql.includes('SELECT role')) rows = [{ role: options.role ?? 'ATTENDEE' }];
    else if (sql.includes('clock_timestamp')) rows = [{ now: new Date(options.now ?? '2027-01-10T01:00:00Z') }];
    else if (sql.includes('SELECT event_request_id')) rows = options.missing ? [] : [{ eventId: 'e1' }];
    else if (sql.includes('organiser_id AS')) rows = options.missing ? [] : [options.event ?? { organiserId: 'o1', coordinatorId: 'c1', status: 'CONFIRMED', name: 'Open day' }];
    else if (sql.includes('SELECT u.display_name')) rows = options.roster ?? [];
    else if (sql.includes('SELECT r.id')) rows = options.missing || options.missingLocked ? [] : [{ ...row, ...options.registration }];
    return { rows, rowCount: rows.length || 1 };
  });
  const release = vi.fn(); const client = { query, release };
  return { pool: { connect: vi.fn(async () => client) } as never, query, release };
}

describe('KAN-17 withdrawal and own registration rules', () => {
  it('AC1/3/4/103 changes the existing owned record and returns persisted display fields', async () => {
    const db = database();
    expect(await withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).toMatchObject({ changed: true,
      registration: { id: 'r1', status: 'WITHDRAWN', canWithdraw: false, withdrawnAt: '2027-01-10T01:00:00.000Z' } });
    expect(db.query.mock.calls.findIndex(([sql]) => sql.includes('event_requests WHERE id = $1 FOR UPDATE')))
      .toBeLessThan(db.query.mock.calls.findIndex(([sql]) => sql.includes('FOR UPDATE OF r')));
    expect(db.query.mock.calls.at(-1)?.[0]).toBe('COMMIT'); expect(db.release).toHaveBeenCalledOnce();
  });
  it.each([null, [], {}, { confirm: false }, { confirm: true, attendeeId: 'a2' }])('AC2 rejects unconfirmed or forged input %j', async input => {
    const db = database(); await expect(withdrawRegistration(db.pool, attendee, 'r1', input)).rejects.toMatchObject({ kind: 'INVALID_INPUT' });
    expect(db.query).not.toHaveBeenCalled();
  });
  it.each(['2027-01-10T01:59:59.999Z', '2027-01-10T01:45:00Z'])('AC101 allows before start at %s', async now => {
    const db = database({ now }); expect(await withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).toMatchObject({ changed: true });
  });
  it('AC101 permits an existing active registration before start without requiring confirmed event status', async () => {
    const db = database({ registration: { eventStatus: 'APPROVED' } });
    expect(await withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).toMatchObject({ changed: true });
  });
  it('AC101 refuses a repeated request at event start without writing again', async () => {
    const db = database({ now: '2027-01-10T02:00:00.000Z', registration: { status: 'WITHDRAWN' } });
    await expect(withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).rejects.toMatchObject({ code: 'WITHDRAWAL_NOT_ALLOWED' });
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE event_registrations'))).toBe(false);
  });
  it.each(['2027-01-10T02:00:00.000Z', '2027-01-10T02:00:00.001Z'])('AC7/101 refuses at or after start %s', async now => {
    const db = database({ now }); await expect(withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).rejects.toMatchObject({ code: 'WITHDRAWAL_NOT_ALLOWED' });
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE event_registrations'))).toBe(false);
    expect(db.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
  it.each([{ startsAt: null }, { eventStatus: 'CANCELLED' }, { status: 'CANCELLED' }])('AC7 refuses ineligible %j', async registration => {
    const db = database({ registration } as Parameters<typeof database>[0]);
    await expect(withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).rejects.toMatchObject({ code: 'WITHDRAWAL_NOT_ALLOWED' });
  });
  it('AC5/103 unchanged replay preserves time and does not write', async () => {
    const db = database({ registration: { status: 'WITHDRAWN' } });
    expect(await withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).toMatchObject({ changed: false });
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE '))).toBe(false);
  });
  it('AC6 protects missing/foreign records and stale profile', async () => {
    const db = database({ missing: true });
    await expect(withdrawRegistration(db.pool, attendee, 'r2', { confirm: true })).rejects.toMatchObject({ code: 'REGISTRATION_NOT_FOUND' });
    const stale = database({ role: 'EVENT_ORGANISER' });
    await expect(listOwnRegistrations(stale.pool, attendee)).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    await expect(withdrawRegistration(db.pool, owner, 'r1', { confirm: true })).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
  });
  it('AC7 safely refuses a record removed before its locked reread', async () => {
    const db = database({ missingLocked: true });
    await expect(withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).rejects.toMatchObject({ code: 'REGISTRATION_NOT_FOUND' });
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE event_registrations'))).toBe(false);
    expect(db.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
  it.each(['UPDATE event_registrations', 'COMMIT'])('AC7 rolls back %s failures', async fail => {
    const db = database({ fail });
    await expect(withdrawRegistration(db.pool, attendee, 'r1', { confirm: true })).rejects.toThrow('Injected');
    expect(db.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
  it('AC4 own list persists statuses and contains only an attendee-scoped query', async () => {
    const db = database(); expect(await listOwnRegistrations(db.pool, attendee)).toMatchObject({ items: [{ id: 'r1', canWithdraw: true }] });
    expect(db.query.mock.calls.some(([sql]) => sql.includes('WHERE r.attendee_id = $1'))).toBe(true);
  });
});

describe('KAN-67 roster authorization and disclosure', () => {
  it('AC1/2/3/101/102 returns only allowed fields with active count', async () => {
    const db = database({ role: owner.role, roster: ['REGISTERED', 'WITHDRAWN', 'CANCELLED'].map(status => ({
      displayName: 'Attendee', email: 'a@example.test', status, registeredAt: row.registeredAt, withdrawnAt: null, cancelledAt: null })) });
    const result = await getRegistrationRoster(db.pool, owner, 'e1'); expect(result.activeCount).toBe(1);
    expect(Object.keys(result.items[0]!)).toEqual(['displayName', 'email', 'status', 'registeredAt', 'withdrawnAt', 'cancelledAt']);
    expect(db.query.mock.calls.some(([sql]) => sql.includes('FOR SHARE'))).toBe(true);
  });
  it('AC5 empty roster is explicit', async () => {
    const db = database({ role: owner.role }); expect(await getRegistrationRoster(db.pool, owner, 'e1')).toMatchObject({ activeCount: 0, items: [] });
  });
  it('AC6/103 refuses former coordinator, unrelated owner, unsupported roles and missing event', async () => {
    for (const actor of [{ id: 'former', role: 'EVENT_COORDINATOR' }, { id: 'o2', role: 'EVENT_ORGANISER' }] as WorkflowActor[]) {
      await expect(getRegistrationRoster(database({ role: actor.role }).pool, actor, 'e1')).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    }
    await expect(getRegistrationRoster(database().pool, attendee, 'e1')).rejects.toMatchObject({ code: 'ACTION_FORBIDDEN' });
    await expect(getRegistrationRoster(database({ role: owner.role, missing: true }).pool, owner, 'missing')).rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
  });
});
