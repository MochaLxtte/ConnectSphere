import type { PoolClient } from 'pg';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { parseCancellation } from '../../src/modules/events/cancellation.js';
import { assertVenueBookingsLocked, lockVenueBookingsBeforeEvent } from '../../src/modules/events/arrangement-locks.js';
import type { WorkflowActor } from '../../src/modules/events/workflow-support.js';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const coordinatorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('KAN-62 cancellation boundary validation', () => {
  it.each([null, [], 'reason', {}, { reason: 5, confirmAffectedArrangements: true },
    { reason: 'x'.repeat(2001), confirmAffectedArrangements: true }])('rejects malformed cancellation %j', input => {
    expect(() => parseCancellation(input)).toThrow();
  });
  it('accepts the maximum reason length', () => {
    expect(parseCancellation({ reason: 'x'.repeat(2000), confirmAffectedArrangements: true }).reason).toHaveLength(2000);
  });
});

describe('KAN-62/KAN-15 shared venue arrangement locks', () => {
  it('locks each venue gate once in order and retains only the bookings still live after waiting', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'booking-b', venueId: 'venue-b' },
        { id: 'booking-a', venueId: 'venue-a' }, { id: 'booking-c', venueId: 'venue-b' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'booking-b' }] });
    expect(await lockVenueBookingsBeforeEvent({ query } as unknown as PoolClient, id)).toEqual(['booking-b']);
    expect(query.mock.calls[1]?.[1]).toEqual([['venue-a', 'venue-b']]);
    expect(query.mock.calls[2]?.[1]).toEqual([id, ['booking-a', 'booking-b', 'booking-c']]);
  });
  it('takes no gate when the event has no live booking', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    expect(await lockVenueBookingsBeforeEvent({ query } as unknown as PoolClient, id)).toEqual([]);
    expect(query).toHaveBeenCalledOnce();
  });
  it('refuses a newly inserted booking rather than taking a booking lock after the event lock', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'previous' }, { id: 'new' }] });
    await expect(assertVenueBookingsLocked({ query } as unknown as PoolClient, id, ['previous']))
      .rejects.toMatchObject({ code: 'EVENT_ARRANGEMENTS_CHANGED', kind: 'CONFLICT' });
    expect(query).toHaveBeenCalledOnce();
  });
  it('allows the action after all current live bookings were locked', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'previous' }] });
    await expect(assertVenueBookingsLocked({ query } as unknown as PoolClient, id, ['previous', 'expired']))
      .resolves.toBeUndefined();
  });
});

describe('KAN-62 cancellation history HTTP authorization', () => {
  function app(actor: WorkflowActor, row: Record<string, unknown> | null = { eventRequestId: id,
    organiserId: ownerId, coordinatorId, reason: 'Internal cancellation reason' }) {
    const query = vi.fn().mockResolvedValue({ rows: row ? [row] : [] });
    const pool = { query, connect: vi.fn() };
    return { query, app: createApp({ database: pool, workspace: { pool, authenticate: async () => actor } }) };
  }
  it.each([
    { id: ownerId, role: 'EVENT_ORGANISER' },
    { id: coordinatorId, role: 'EVENT_COORDINATOR' },
  ] as const)('returns the private cancellation outcome to the current $role', async actor => {
    const response = await request(app(actor).app).get(`/api/events/${id}/cancellation`).expect(200);
    expect(response.body).toEqual({ cancellation: { eventRequestId: id, reason: 'Internal cancellation reason' } });
  });
  it.each([
    { id: ownerId, role: 'EVENT_COORDINATOR' },
    { id: coordinatorId, role: 'EVENT_ORGANISER' },
    { id, role: 'EVENT_COORDINATOR' },
  ] as const)('does not disclose private history on an ID/role mismatch $id $role', async actor => {
    const response = await request(app(actor).app).get(`/api/events/${id}/cancellation`).expect(200);
    expect(response.body).toEqual({ cancellation: null });
  });
  it('returns no cancellation outcome for an absent record', async () => {
    const response = await request(app({ id: ownerId, role: 'EVENT_ORGANISER' }, null).app)
      .get(`/api/events/${id}/cancellation`).expect(200);
    expect(response.body).toEqual({ cancellation: null });
  });
  it('refuses attendees before querying any cancellation history', async () => {
    const setup = app({ id: ownerId, role: 'ATTENDEE' });
    await request(setup.app).get(`/api/events/${id}/cancellation`).expect(403);
    expect(setup.query).not.toHaveBeenCalled();
  });
});
