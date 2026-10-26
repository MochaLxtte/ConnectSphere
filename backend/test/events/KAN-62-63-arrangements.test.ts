import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { parseCancellation } from '../../src/modules/events/cancellation.js';
import { WorkflowError } from '../../src/modules/events/workflow-support.js';
import { listEquipmentRequests, parseEquipmentInput, replaceReservedEquipmentLine,
  reviewEquipmentRequest, saveEquipmentRequest } from '../../src/modules/equipment/equipment-service.js';
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
  function fixture(status = 'APPROVED') {
    const statements: string[] = [];
    const client = { query: async (sql: string) => {
      statements.push(sql);
      if (sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE')) return { rows: [{
        id: eventId, organiserId: ownerId, coordinatorId, status, name: 'Campus forum',
      }], rowCount: 1 };
      if (sql.includes('INSERT INTO event_cancellations')) return { rows: [{ cancelledAt: new Date('2031-01-01T00:00:00Z') }], rowCount: 1 };
      if (sql.includes('UPDATE venue_bookings')) return { rows: [], rowCount: 2 };
      if (sql.includes('UPDATE equipment_requests')) return { rows: [], rowCount: 1 };
      if (sql.includes('UPDATE event_registrations')) return { rows: [{ attendeeId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }, release: () => undefined } as unknown as PoolClient;
    const pool = { connect: async () => client } as Pick<Pool, 'connect'>;
    return { pool, statements };
  }
  it('releases only the event arrangements and writes notifications in the same transaction', async () => {
    const { pool, statements } = fixture();
    const result = await cancelEvent(pool, { eventRequestId: eventId,
      actor: { id: ownerId, role: 'EVENT_ORGANISER' },
      input: { reason: ' Schedule changed ', confirmAffectedArrangements: true } });
    expect(result.released).toEqual({ venueBookings: 2, equipmentRequests: 1, registrations: 1 });
    expect(result.reason).toBe('Schedule changed');
    expect(statements[0]).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
    expect(statements.at(-1)).toBe('COMMIT');
    expect(statements.some((sql) => sql.includes('INSERT INTO notifications'))).toBe(true);
    expect(statements.some((sql) => sql.includes("status = 'CANCELLED'"))).toBe(true);
  });
  it('rolls back a repeated cancellation before touching any arrangements', async () => {
    const { pool, statements } = fixture('CANCELLED');
    await expect(cancelEvent(pool, { eventRequestId: eventId,
      actor: { id: coordinatorId, role: 'EVENT_COORDINATOR' },
      input: { reason: 'Again', confirmAffectedArrangements: true } })).rejects.toThrow('not in a cancellable state');
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(statements.some((sql) => sql.includes('UPDATE venue_bookings'))).toBe(false);
  });
});

describe('KAN-63 equipment request input', () => {
  const line = { equipmentTypeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', quantity: 2,
    startsAt: '2031-01-12T10:00:00+08:00', endsAt: '2031-01-12T12:00:00+08:00',
    technicalRequirements: 'Wireless microphones' };
  it('normalizes a valid line and its period', () => {
    expect(parseEquipmentInput({ lines: [line] })).toEqual({ lines: [{ ...line,
      startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T04:00:00.000Z' }], notRequired: false });
  });
  it('accepts Not Required only without lines and rejects invalid quantities, intervals, and duplicate types', () => {
    expect(parseEquipmentInput({ lines: [], notRequired: true })).toEqual({ lines: [], notRequired: true });
    expect(() => parseEquipmentInput({ lines: [], notRequired: false })).toThrowError(WorkflowError);
    expect(() => parseEquipmentInput({ lines: [{ ...line, quantity: 0 }] })).toThrowError(WorkflowError);
    expect(() => parseEquipmentInput({ lines: [{ ...line, endsAt: line.startsAt }] })).toThrowError(WorkflowError);
    expect(() => parseEquipmentInput({ lines: [line, line] })).toThrowError(WorkflowError);
  });
});

describe('KAN-63 coordinator request persistence', () => {
  const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const coordinatorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const line = { equipmentTypeId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', quantity: 2,
    startsAt: '2031-01-12T10:00:00+08:00', endsAt: '2031-01-12T12:00:00+08:00', technicalRequirements: null };
  function fixture(coordinator = coordinatorId) {
    const statements: string[] = [];
    const client = { query: async (sql: string) => {
      statements.push(sql);
      if (sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE')) return { rows: [{ status: 'APPROVED',
        coordinatorId: coordinator, organiserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }], rowCount: 1 };
      if (sql.includes('FROM equipment_requests WHERE event_request_id')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO equipment_requests')) return { rows: [{ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status: 'REQUESTED' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }, release: () => undefined } as unknown as PoolClient;
    return { pool: { connect: async () => client } as Pick<Pool, 'connect'>, statements };
  }
  it('saves an event-scoped REQUESTED line for the assigned coordinator', async () => {
    const { pool, statements } = fixture();
    const saved = await saveEquipmentRequest(pool, { eventId, actor: { id: coordinatorId, role: 'EVENT_COORDINATOR' },
      input: { lines: [line] } });
    expect(saved.status).toBe('REQUESTED');
    expect(saved.lines).toHaveLength(1);
    const insert = statements.find((sql) => sql.includes('INSERT INTO equipment_requests'));
    expect(insert).toContain('WHERE t.id = $3 AND t.is_active');
  });
  it('does not write lines for a coordinator assigned to another event', async () => {
    const { pool, statements } = fixture('ffffffff-ffff-4fff-8fff-ffffffffffff');
    await expect(saveEquipmentRequest(pool, { eventId, actor: { id: coordinatorId, role: 'EVENT_COORDINATOR' },
      input: { lines: [line] } })).rejects.toThrow('not found');
    expect(statements.some((sql) => sql.includes('INSERT INTO equipment_requests'))).toBe(false);
    expect(statements.at(-1)).toBe('ROLLBACK');
  });
});

describe('KAN-63 staff review and explicit replacement', () => {
  const lineId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const staff = { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', role: 'TECHNICAL_SUPPORT_STAFF' as const };
  const coordinator = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', role: 'EVENT_COORDINATOR' as const };
  function poolWith(handler: (sql: string) => { rows?: object[]; rowCount?: number }) {
    const statements: string[] = [];
    const client = { query: async (sql: string) => {
      statements.push(sql);
      return { rows: [], rowCount: 1, ...handler(sql) };
    }, release: () => undefined } as unknown as PoolClient;
    return { pool: { connect: async () => client, query: async (sql: string) => {
      statements.push(sql); return { rows: [{ id: lineId }], rowCount: 1 };
    } } as unknown as Pick<Pool, 'connect' | 'query'>, statements };
  }
  it('lists requests for assigned coordinators and Technical Support Staff only', async () => {
    const { pool } = poolWith(() => ({ rows: [{ id: lineId }], rowCount: 1 }));
    await expect(listEquipmentRequests(pool, { actor: { id: 'x', role: 'ATTENDEE' } }))
      .rejects.toThrow('cannot view');
    expect(await listEquipmentRequests(pool, { actor: coordinator, eventId })).toHaveLength(1);
    expect(await listEquipmentRequests(pool, { actor: staff })).toHaveLength(1);
  });
  it('allows a full reservation or a reasoned rejection and requires a rejection reason', async () => {
    const handler = (sql: string) => {
      if (sql.includes('FROM equipment_requests r JOIN event_requests')) return { rows: [{ eventId, status: 'REQUESTED', revision: 4, coordinatorId: coordinator.id, organiserId: 'owner', name: 'Forum' }] };
      if (sql.includes('SELECT status FROM event_requests')) return { rows: [{ status: 'APPROVED' }] };
      if (sql.includes('UPDATE equipment_requests SET status')) return { rows: [{ id: lineId, status: 'RESERVED', quantity: 2, revision: 5 }] };
      return {};
    };
    const { pool, statements } = poolWith(handler);
    expect(await reviewEquipmentRequest(pool, { lineId, actor: staff,
      input: { decision: 'RESERVED', revision: 4 } })).toMatchObject({ status: 'RESERVED' });
    expect(statements.some((sql) => sql.includes('INSERT INTO notifications'))).toBe(true);
    await expect(reviewEquipmentRequest(pool, { lineId, actor: staff,
      input: { decision: 'REJECTED', revision: 4 } })).rejects.toThrow('reason is required');
    await expect(reviewEquipmentRequest(pool, { lineId, actor: staff,
      input: { decision: 'REJECTED', reason: 'Unavailable' } })).resolves.toMatchObject({ status: 'RESERVED' });
    await expect(reviewEquipmentRequest(pool, { lineId, actor: coordinator,
      input: { decision: 'RESERVED' } })).rejects.toThrow('Only Technical Support Staff');
  });
  it('cancels and replaces a reservation only with its current revision and assigned coordinator', async () => {
    const replacement = { equipmentTypeId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', quantity: 1,
      startsAt: '2031-01-12T10:00:00+08:00', endsAt: '2031-01-12T11:00:00+08:00' };
    const { pool, statements } = poolWith((sql) => {
      if (sql.includes('FROM equipment_requests WHERE id = $1 FOR UPDATE')) return { rows: [{ eventId, status: 'RESERVED', revision: 7 }] };
      if (sql.includes('FROM event_requests WHERE id = $1 FOR UPDATE')) return { rows: [{ status: 'APPROVED', coordinatorId: coordinator.id, organiserId: 'owner' }] };
      if (sql.includes('INSERT INTO equipment_requests')) return { rows: [{ id: 'replacement', status: 'REQUESTED', revision: 1 }] };
      return {};
    });
    expect(await replaceReservedEquipmentLine(pool, { lineId, actor: coordinator,
      input: { revision: 7, replacement } })).toMatchObject({ cancelledRequestId: lineId, replacement: { status: 'REQUESTED' } });
    expect(statements.some((sql) => sql.includes("status = 'CANCELLED'"))).toBe(true);
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
