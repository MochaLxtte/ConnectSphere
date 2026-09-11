import { describe, expect, it, vi } from 'vitest';
import {
  listReviewableRequests,
  REVIEWABLE_STATUSES,
  type QueueActor,
  type ReviewableRequest,
} from '../../src/modules/events/submitted-requests.js';

const coordinator: QueueActor = { id: '20000000-0000-4000-8000-000000000001', role: 'EVENT_COORDINATOR' };
const organiser: QueueActor = { id: '20000000-0000-4000-8000-000000000002', role: 'EVENT_ORGANISER' };

function fakePool(rows: unknown[]) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

const baseRow = {
  id: '10000000-0000-4000-8000-000000000001',
  organiserId: '10000000-0000-4000-8000-000000000002',
  coordinatorId: null,
  status: 'SUBMITTED' as const,
  name: 'Sample event',
  purpose: null,
  description: null,
  startsAt: null,
  endsAt: null,
  expectedAttendance: null,
  venueRequirements: null,
  accessibilityNeeds: null,
  equipmentRequirements: null,
  registrationRequired: null,
  createdAt: '2026-09-07T00:00:00Z',
  updatedAt: '2026-09-07T00:00:00Z',
};

describe('KAN-33 listReviewableRequests', () => {
  it('never queries the database for a non-coordinator actor', async () => {
    const pool = fakePool([baseRow]);
    const canViewRequest = vi.fn();
    const items = await listReviewableRequests({ pool, canViewRequest }, organiser);
    expect(items).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
    expect(canViewRequest).not.toHaveBeenCalled();
  });

  it('queries only the agreed reviewable statuses', async () => {
    const pool = fakePool([]);
    await listReviewableRequests({ pool, canViewRequest: () => true }, coordinator);
    expect(pool.query).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('status = ANY($1)'),
      [REVIEWABLE_STATUSES],
    );
  });

  it('filters rows the visibility policy denies, in the repository not just the service', async () => {
    const visibleRow = { ...baseRow, id: 'a', coordinatorId: coordinator.id };
    const hiddenRow = { ...baseRow, id: 'b', coordinatorId: 'someone-else' };
    const pool = fakePool([visibleRow, hiddenRow]);
    const canViewRequest = vi.fn(
      (_actor: QueueActor, request: ReviewableRequest) => request.coordinatorId === coordinator.id,
    );

    const items = await listReviewableRequests({ pool, canViewRequest }, coordinator);

    expect(items).toEqual([
      { id: 'a', name: visibleRow.name, status: visibleRow.status,
        createdAt: visibleRow.createdAt, updatedAt: visibleRow.updatedAt },
    ]);
    expect(canViewRequest).toHaveBeenCalledTimes(2);
  });

  it('returns an empty queue when no request is currently reviewable', async () => {
    const pool = fakePool([]);
    const items = await listReviewableRequests({ pool, canViewRequest: () => true }, coordinator);
    expect(items).toEqual([]);
  });
});
