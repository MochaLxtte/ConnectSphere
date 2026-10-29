import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';
import { recordNotifications } from '../../src/modules/notifications/notify.js';
import { getAttendeeEvent, listAttendeeEvents, listOwnRegistrations, registerForEvent } from '../../src/modules/registrations/registration-service.js';

vi.mock('../../src/modules/notifications/notify.js', () => ({ recordNotifications: vi.fn(async (_c: unknown, items: unknown[]) => items.length) }));
const actor: WorkflowActor = { id: '14000000-0000-4000-8000-000000000001', role: 'ATTENDEE' };
const eventId = '14000000-0000-4000-8000-000000000002';
const organiserId = '14000000-0000-4000-8000-000000000003';
const coordinatorId = '14000000-0000-4000-8000-000000000004';

const base = () => ({ id: eventId, name: 'Career fair', purpose: 'Meet employers', description: null as string | null, startsAt: '2031-01-12T02:00:00.000Z' as string | null,
  endsAt: '2031-01-12T06:00:00.000Z' as string | null, accessibilityNeeds: null, status: 'CONFIRMED', registrationRequired: true as boolean | null, capacity: 5 as number | null,
  opensAt: null as unknown, closesAt: null as unknown, organiserId, coordinatorId: coordinatorId as string | null, started: false, beforeOpen: false, afterClose: false,
  registered: 2, own: null as unknown, ownStatus: null as string | null, venues: [] as unknown[] });
let row: ReturnType<typeof base> | undefined; let freshRow: ReturnType<typeof base> | undefined; let listRows: ReturnType<typeof base>[];
let role: string | null; let locked: boolean; let writeError: unknown; let writeRows: { id: string; at: string }[]; let managers: { id: string; role: string }[]; let mine: unknown[];
const statements: string[] = []; let written = false;
const release = vi.fn();
const query = vi.fn(async (raw: string) => {
  const sql = raw.replace(/\s+/g, ' ').trim(); statements.push(sql);
  if (sql.startsWith('BEGIN')) written = false;
  if (sql.includes('FROM app_users WHERE id = $1 FOR SHARE')) return { rows: role ? [{ role }] : [] };
  if (sql.startsWith('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE')) return { rows: locked ? [{ id: eventId }] : [] };
  if (sql.includes('FROM app_users WHERE id = ANY')) return { rows: managers };
  if (sql.includes("WHERE e.status = 'CONFIRMED'")) return { rows: listRows };
  if (sql.includes('FROM event_registrations r JOIN event_requests e')) return { rows: mine };
  if (sql.includes('WHERE e.id = $2')) { const found = written ? freshRow : row; return { rows: found ? [found] : [] }; }
  if (sql.startsWith('INSERT INTO event_registrations') || sql.startsWith('UPDATE event_registrations')) {
    if (writeError) throw writeError;
    written = true;
    return { rows: writeRows };
  }
  return { rows: [] };
});
const dependencies = { pool: { query, connect: vi.fn(async () => ({ query, release })) } as unknown as Pick<Pool, 'query' | 'connect'> };
beforeEach(() => {
  vi.clearAllMocks(); statements.length = 0; written = false; role = 'ATTENDEE'; locked = true; writeError = null;
  row = base(); freshRow = { ...base(), registered: 3, ownStatus: 'REGISTERED', own: { id: 'r1', status: 'REGISTERED', registeredAt: '2026-10-29T03:00:00.000Z', withdrawnAt: null } };
  writeRows = [{ id: 'r1', at: '2026-10-29T03:00:00.000Z' }]; managers = [{ id: organiserId, role: 'EVENT_ORGANISER' }, { id: coordinatorId, role: 'EVENT_COORDINATOR' }];
  listRows = [base()]; mine = [];
});
const register = (input: unknown = {}, who: WorkflowActor = actor) => registerForEvent(dependencies, { actor: who, eventId, input });

describe('KAN-14 registration service reads', () => {
  it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as const)('refuses %s before touching the database', async who => {
    const other = { ...actor, role: who };
    await expect(listAttendeeEvents(dependencies, { actor: other })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(listOwnRegistrations(dependencies, { actor: other })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(getAttendeeEvent(dependencies, { actor: other, eventId })).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(register({}, other)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects a malformed event id', async () => {
    await expect(getAttendeeEvent(dependencies, { actor, eventId: 'bad' })).rejects.toMatchObject({ code: 'INVALID_EVENT_ID' });
    await expect(registerForEvent(dependencies, { actor, eventId: 'bad', input: {} })).rejects.toMatchObject({ code: 'INVALID_EVENT_ID' });
  });
  it('KAN-14-AC1 returns the event, its conditions, its approved venues and the caller\'s own state', async () => {
    row = { ...base(), opensAt: '2026-10-01T00:00:00.000Z', closesAt: new Date('2031-01-10T00:00:00.000Z') as never, description: 'Programme',
      venues: [{ name: 'Hall A', location: 'Level 2', startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z' }] };
    const found = await getAttendeeEvent(dependencies, { actor, eventId });
    expect(found.event).toMatchObject({ id: eventId, name: 'Career fair', description: 'Programme', status: 'CONFIRMED',
      venues: [{ name: 'Hall A', location: 'Level 2' }],
      registration: { required: true, opensAt: '2026-10-01T00:00:00.000Z', closesAt: '2031-01-10T00:00:00.000Z', capacity: 5, placesRemaining: 3 } });
    expect(found.registration).toBeNull();
    expect(found.availability).toMatchObject({ canRegister: true });
  });
  it('KAN-14-AC4 shows the caller\'s own registration, including a withdrawal time', async () => {
    row = { ...base(), status: 'COMPLETED', ownStatus: 'WITHDRAWN', registrationRequired: null, capacity: null,
      own: { id: 'r1', status: 'WITHDRAWN', registeredAt: '2026-10-01T00:00:00.000Z', withdrawnAt: '2026-10-02T00:00:00.000Z' } };
    const found = await getAttendeeEvent(dependencies, { actor, eventId });
    expect(found.registration).toEqual({ id: 'r1', status: 'WITHDRAWN', registeredAt: '2026-10-01T00:00:00.000Z', withdrawnAt: '2026-10-02T00:00:00.000Z' });
    expect(found.event.registration).toMatchObject({ required: false, capacity: null, placesRemaining: null });
    expect(found.availability).toMatchObject({ canRegister: false, reason: 'NOT_CONFIRMED' });
  });
  it('treats an unknown event and an event the caller may not see as not found', async () => {
    row = undefined;
    await expect(getAttendeeEvent(dependencies, { actor, eventId })).rejects.toMatchObject({ kind: 'NOT_FOUND', code: 'EVENT_NOT_FOUND' });
    row = { ...base(), status: 'APPROVED' };
    await expect(getAttendeeEvent(dependencies, { actor, eventId })).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
    row = { ...base(), status: 'CANCELLED' };
    await expect(getAttendeeEvent(dependencies, { actor, eventId })).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
  });
  it('lists open events with the caller\'s own status, and lists the caller\'s own registrations', async () => {
    listRows = [{ ...base(), startsAt: null, endsAt: null, ownStatus: 'REGISTERED' }];
    const items = await listAttendeeEvents(dependencies, { actor });
    expect(items).toEqual([expect.objectContaining({ id: eventId, startsAt: null, endsAt: null, ownStatus: 'REGISTERED',
      availability: expect.objectContaining({ reason: 'ALREADY_REGISTERED' }) })]);
    mine = [{ id: 'r1', status: 'REGISTERED', registeredAt: '2026-10-29T03:00:00.000Z', withdrawnAt: null, eventId, eventName: 'Career fair',
      startsAt: new Date('2031-01-12T02:00:00.000Z'), endsAt: null, eventStatus: 'CONFIRMED' }];
    expect(await listOwnRegistrations(dependencies, { actor })).toEqual([{ id: 'r1', status: 'REGISTERED', registeredAt: '2026-10-29T03:00:00.000Z',
      withdrawnAt: null, event: { id: eventId, name: 'Career fair', startsAt: '2031-01-12T02:00:00.000Z', endsAt: null, status: 'CONFIRMED' } }]);
    expect(query.mock.calls.every(call => !String(call[0]).includes('attendee_id <>'))).toBe(true);
  });
});

describe('KAN-14 registering', () => {
  it('KAN-14-AC3/AC104 locks the event, reads fresh counts, inserts and notifies the attendee and the managers', async () => {
    const result = await register();
    expect(result).toMatchObject({ changed: true, registration: { id: 'r1', status: 'REGISTERED' }, availability: { reason: 'ALREADY_REGISTERED' } });
    const lockAt = statements.findIndex(sql => sql.startsWith('SELECT id FROM event_requests WHERE id = $1 FOR UPDATE'));
    const readAt = statements.findIndex(sql => sql.includes('WHERE e.id = $2'));
    expect(lockAt).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(lockAt);
    expect(statements.some(sql => sql.startsWith('INSERT INTO event_registrations'))).toBe(true);
    const sent = vi.mocked(recordNotifications).mock.calls[0]![1];
    expect(sent.map(item => [item.recipientId, item.type])).toEqual([
      [actor.id, 'REGISTRATION_CONFIRMED'], [organiserId, 'REGISTRATION_RECEIVED'], [coordinatorId, 'REGISTRATION_RECEIVED']]);
    expect(sent[1]!.message).toContain('3 of 5 places taken');
  });
  it('KAN-14-AC103 reuses a withdrawn record with an UPDATE, never a second INSERT', async () => {
    row = { ...base(), ownStatus: 'WITHDRAWN', own: { id: 'r1', status: 'WITHDRAWN', registeredAt: '2026-10-01T00:00:00.000Z', withdrawnAt: '2026-10-02T00:00:00.000Z' } };
    await register();
    expect(statements.some(sql => sql.startsWith('UPDATE event_registrations'))).toBe(true);
    expect(statements.some(sql => sql.startsWith('INSERT INTO event_registrations'))).toBe(false);
  });
  it('only notifies managers who still hold the right role, and skips an unassigned coordinator', async () => {
    managers = [{ id: organiserId, role: 'ATTENDEE' }, { id: coordinatorId, role: 'EVENT_COORDINATOR' }];
    await register();
    expect(vi.mocked(recordNotifications).mock.calls[0]![1].map(item => item.recipientId)).toEqual([actor.id, coordinatorId]);
    vi.mocked(recordNotifications).mockClear();
    row = { ...base(), coordinatorId: null }; managers = [{ id: organiserId, role: 'EVENT_ORGANISER' }];
    await register();
    expect(vi.mocked(recordNotifications).mock.calls[0]![1].map(item => item.recipientId)).toEqual([actor.id, organiserId]);
    vi.mocked(recordNotifications).mockClear();
    row = { ...base(), organiserId: coordinatorId, coordinatorId: null }; managers = [];
    await register();
    expect(vi.mocked(recordNotifications).mock.calls[0]![1].map(item => item.recipientId)).toEqual([actor.id]);
  });
  it.each([
    ['ALREADY_REGISTERED', { ownStatus: 'REGISTERED' }, 'REGISTRATION_ALREADY_REGISTERED'], ['not confirmed', { status: 'CONFIRMED', registrationRequired: false }, 'REGISTRATION_DISABLED'],
    ['started', { started: true }, 'REGISTRATION_EVENT_STARTED'], ['closed', { afterClose: true }, 'REGISTRATION_CLOSED'],
    ['not yet open', { beforeOpen: true }, 'REGISTRATION_NOT_OPEN'], ['full', { registered: 5 }, 'REGISTRATION_FULL'], ['capacity zero', { capacity: 0, registered: 0 }, 'REGISTRATION_FULL'],
  ])('KAN-14-AC2/AC6 refuses with a code and message when %s, with nothing written', async (_name, over, code) => {
    row = { ...base(), ...over } as never;
    await expect(register()).rejects.toMatchObject({ kind: 'CONFLICT', code, message: expect.stringMatching(/.{10}/) });
    expect(statements.some(sql => /^(INSERT|UPDATE) event_registrations/.test(sql))).toBe(false);
    expect(recordNotifications).not.toHaveBeenCalled();
    expect(statements).toContain('ROLLBACK');
  });
  it('treats an event that is not visible, or gone, as not found', async () => {
    row = { ...base(), status: 'APPROVED' };
    await expect(register()).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
    locked = false;
    await expect(register()).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
    locked = true; row = undefined;
    await expect(register()).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' });
  });
  it('KAN-14-AC8/AC101 refuses a body that names an identity, and a role removed before the lock', async () => {
    await expect(register({ attendeeId: 'someone-else' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(dependencies.pool.connect).not.toHaveBeenCalled();
    role = 'EVENT_ORGANISER';
    await expect(register()).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    role = null;
    await expect(register()).rejects.toMatchObject({ kind: 'FORBIDDEN' });
    await expect(register(undefined)).rejects.toMatchObject({ kind: 'FORBIDDEN' });
  });
  it('KAN-14-AC5 maps the database capacity guard to the same Full answer, and surfaces anything else', async () => {
    writeError = Object.assign(new Error('full'), { constraint: 'event_registrations_within_capacity' });
    await expect(register()).rejects.toMatchObject({ kind: 'CONFLICT', code: 'REGISTRATION_FULL' });
    writeError = new Error('boom');
    await expect(register()).rejects.toThrow('boom');
    writeError = null; writeRows = [];
    await expect(register()).rejects.toThrow('The registration was not saved.');
    writeRows = [{ id: 'r1', at: '2026-10-29T03:00:00.000Z' }]; freshRow = undefined;
    await expect(register()).rejects.toThrow('could not be read back');
  });
});
