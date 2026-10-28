import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { parseCancellation } from '../../src/modules/events/cancellation.js';
import { WorkflowError } from '../../src/modules/events/workflow-support.js';
import { parseEquipmentInput } from '../../src/modules/equipment/equipment-service.js';
import { cancelEvent } from '../../src/modules/events/cancellation.js';
import type { Pool, PoolClient } from 'pg';

describe('KAN-62 cancellation input', () => {
  it('trims a required reason and requires explicit arrangement confirmation', () => {
    expect(parseCancellation({ reason: '  Event postponed  ', confirmAffectedArrangements: true }))
      .toEqual({ reason: 'Event postponed', confirmAffectedArrangements: true });
    expect(() => parseCancellation({ reason: '   ', confirmAffectedArrangements: true }))
      .toThrowError(WorkflowError);
    expect(() => parseCancellation({ reason: 'Reason', confirmAffectedArrangements: false }))
      .toThrowError(WorkflowError);
    expect(() => parseCancellation({ reason: 'Reason', confirmAffectedArrangements: true, status: 'CANCELLED' }))
      .toThrowError(WorkflowError);
  });
});

describe('KAN-62 transactional cancellation', () => {
  const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ownerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const coordinatorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  function fixture(status = 'APPROVED', currentRole?: string, overrides: Record<string, unknown> = {}) {
    const statements: string[] = [];
    const parameters: unknown[][] = [];
    const client = { query: async (sql: string, values: unknown[] = []) => {
      statements.push(sql);
      parameters.push(values);
      if (sql === 'SELECT role FROM app_users WHERE id = $1 FOR SHARE') return { rows: [{
        role: currentRole ?? (values[0] === ownerId ? 'EVENT_ORGANISER' : 'EVENT_COORDINATOR'),
      }], rowCount: 1 };
      if (sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE')) return { rows: [{
        id: eventId, organiserId: ownerId, coordinatorId, status, name: 'Campus forum', ...overrides,
      }], rowCount: 1 };
      if (sql.includes('SELECT count(*)::text AS count FROM equipment_requests')) return { rows: [{ count: '3' }], rowCount: 1 };
      if (sql.includes('INSERT INTO event_cancellations')) return { rows: [{ cancelledAt: new Date('2031-01-01T00:00:00Z') }], rowCount: 1 };
      if (sql.includes('UPDATE venue_bookings')) return { rows: [], rowCount: 2 };
      if (sql.includes('UPDATE equipment_requests')) return { rows: [], rowCount: 1 };
      if (sql.includes('UPDATE event_registrations')) return { rows: [{ attendeeId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }, release: () => undefined } as unknown as PoolClient;
    const pool = { connect: async () => client } as Pick<Pool, 'connect'>;
    return { pool, statements, parameters };
  }
  it('releases only the event arrangements and writes notifications in the same transaction', async () => {
    const { pool, statements, parameters } = fixture();
    const result = await cancelEvent(pool, { eventRequestId: eventId,
      actor: { id: ownerId, role: 'EVENT_ORGANISER' },
      input: { reason: ' Schedule changed ', confirmAffectedArrangements: true } });
    expect(result.released).toEqual({ venueBookings: 2, equipmentRequests: 3, registrations: 1 });
    expect(result.reason).toBe('Schedule changed');
    expect(statements[0]).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
    expect(statements.at(-1)).toBe('COMMIT');
    expect(statements.some((sql) => sql.includes('INSERT INTO notifications'))).toBe(true);
    expect(statements.some((sql) => sql.includes("status = 'CANCELLED'"))).toBe(true);
    const terminalEventUpdate = statements.findIndex((sql) => sql.includes("UPDATE event_requests SET status = 'CANCELLED'"));
    const remainingEquipmentUpdate = statements.findIndex((sql) => sql.includes("status IN ('REQUESTED', 'REJECTED')"));
    expect(terminalEventUpdate).toBeGreaterThan(-1);
    expect(remainingEquipmentUpdate).toBeGreaterThan(terminalEventUpdate);
    expect(statements[remainingEquipmentUpdate]).toContain("release_cause = 'EVENT_CANCELLED'");
    expect(statements[remainingEquipmentUpdate]).toContain('released_by = $2');
    const audit = statements.findIndex(sql => sql.includes('INSERT INTO event_cancellations'));
    expect(parameters[audit]?.[4]).toBe(3); // Includes RESERVED rows released by the status trigger.
    const pools = statements.findIndex(sql => sql.includes('SELECT t.id FROM equipment_types'));
    const lines = statements.findIndex(sql => sql.includes('SELECT id FROM equipment_requests'));
    expect(pools).toBeLessThan(lines);
    expect(lines).toBeLessThan(terminalEventUpdate);
  });
  it('rolls back a repeated cancellation before touching any arrangements', async () => {
    const { pool, statements } = fixture('CANCELLED');
    await expect(cancelEvent(pool, { eventRequestId: eventId,
      actor: { id: coordinatorId, role: 'EVENT_COORDINATOR' },
      input: { reason: 'Again', confirmAffectedArrangements: true } })).rejects.toThrow('not in a cancellable state');
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(statements.some((sql) => sql.includes('UPDATE venue_bookings'))).toBe(false);
  });
  it('rechecks a changed role before taking arrangement locks or writing', async () => {
    const { pool, statements } = fixture('APPROVED', 'ATTENDEE');
    await expect(cancelEvent(pool, { eventRequestId: eventId,
      actor: { id: ownerId, role: 'EVENT_ORGANISER' },
      input: { reason: 'No longer authorised', confirmAffectedArrangements: true } }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(statements.some(sql => sql.includes('FROM venue_bookings'))).toBe(false);
  });
  it('rejects a current coordinator who owns the request but is not its assigned coordinator', async () => {
    const { pool, statements } = fixture('APPROVED', 'EVENT_COORDINATOR');
    await expect(cancelEvent(pool, { eventRequestId: eventId,
      actor: { id: ownerId, role: 'EVENT_COORDINATOR' },
      input: { reason: 'Not assigned', confirmAffectedArrangements: true } }))
      .rejects.toMatchObject({ code: 'EVENT_REQUEST_NOT_FOUND' });
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(statements.some(sql => sql.includes('UPDATE venue_bookings'))).toBe(false);
  });
  it('uses generic outcome text for unnamed requests and omits an absent coordinator recipient', async () => {
    const { pool, statements, parameters } = fixture('SUBMITTED', undefined, { name: null, coordinatorId: null });
    await cancelEvent(pool, { eventRequestId: eventId, actor: { id: ownerId, role: 'EVENT_ORGANISER' },
      input: { reason: 'Withdraw', confirmAffectedArrangements: true } });
    const noticeValues = parameters[statements.findIndex(sql => sql.includes('INSERT INTO notifications'))]!;
    expect(noticeValues).toContain('Your event was cancelled.');
    expect(noticeValues).toContain('The event has been cancelled. Your registration is no longer active.');
    expect(noticeValues).not.toContain(coordinatorId);
  });
});

describe('KAN-63 equipment request input', () => {
  const line = { equipmentTypeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', quantity: 2,
    startsAt: '2031-01-12T10:00:00+08:00', endsAt: '2031-01-12T12:00:00+08:00',
    technicalRequirements: 'Wireless microphones' };
  it('normalizes a valid line and its period', () => {
    expect(parseEquipmentInput({ lines: [line] })).toEqual({ lines: [line], notRequired: false });
  });
  it('accepts Not Required only without lines and rejects invalid quantities, intervals, and duplicate types', () => {
    expect(parseEquipmentInput({ lines: [], notRequired: true })).toEqual({ lines: [], notRequired: true });
    expect(() => parseEquipmentInput({ lines: [], notRequired: false })).toThrowError(WorkflowError);
    expect(() => parseEquipmentInput({ lines: [{ ...line, quantity: 0 }] })).toThrowError(WorkflowError);
    expect(() => parseEquipmentInput({ lines: [{ ...line, endsAt: line.startsAt }] })).toThrowError(WorkflowError);
    expect(() => parseEquipmentInput({ lines: [line, line] })).toThrowError(WorkflowError);
  });
});

describe('KAN-62 / KAN-63 protected API routes', () => {
  function appAs(role: 'EVENT_ORGANISER' | 'EVENT_COORDINATOR' | 'TECHNICAL_SUPPORT_STAFF' | 'ATTENDEE') {
    const query = async () => { throw new Error('Protected routes must reject before database access.'); };
    const pool = { query, connect: async () => { throw new Error('Protected routes must reject before transaction.'); } };
    return createApp({ database: pool, workspace: { pool,
      authenticate: async () => ({ id: 'actor', role }) } });
  }
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  it('permits only event managers through cancellation input validation', async () => {
    const response = await request(appAs('EVENT_ORGANISER')).post(`/api/events/${id}/cancel`).send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_CANCELLATION');
    expect((await request(appAs('ATTENDEE')).post(`/api/events/${id}/cancel`).send({})).status).toBe(403);
  });
  it('blocks protected equipment reads and review writes for unrelated roles', async () => {
    expect((await request(appAs('ATTENDEE')).get('/api/equipment-requests')).status).toBe(403);
    expect((await request(appAs('EVENT_COORDINATOR')).post(`/api/equipment-requests/${id}/review`)
      .send({ decision: 'RESERVED' })).status).toBe(403);
  });
});
