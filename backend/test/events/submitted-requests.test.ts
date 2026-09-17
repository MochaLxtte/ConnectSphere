import { describe, expect, it, vi } from 'vitest';
import {
  listOwnedDrafts,
  listOwnedRequests,
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

describe('KAN-34 listOwnedDrafts', () => {
  it('never queries the database for a non-organiser actor', async () => {
    const pool = fakePool([{ ...baseRow, status: 'DRAFT' as const }]);
    const items = await listOwnedDrafts({ pool }, coordinator);
    expect(items).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('queries only this organiser\'s own draft requests', async () => {
    const pool = fakePool([]);
    await listOwnedDrafts({ pool }, organiser);
    expect(pool.query).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("organiser_id = $1 AND status = 'DRAFT'"),
      [organiser.id],
    );
  });

  it('returns draft summaries for the organiser', async () => {
    const draftRow = { ...baseRow, id: 'a', organiserId: organiser.id, status: 'DRAFT' as const };
    const pool = fakePool([draftRow]);
    const items = await listOwnedDrafts({ pool }, organiser);
    expect(items).toEqual([
      { id: 'a', name: draftRow.name, status: 'DRAFT', createdAt: draftRow.createdAt, updatedAt: draftRow.updatedAt },
    ]);
  });

  it('returns an empty list when the organiser has no saved drafts', async () => {
    const pool = fakePool([]);
    const items = await listOwnedDrafts({ pool }, organiser);
    expect(items).toEqual([]);
  });
});

describe('KAN-16 listOwnedRequests', () => {
  it.each(['EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'does not query the database for the %s role',
    async (role) => {
      const pool = fakePool([baseRow]);
      expect(await listOwnedRequests({ pool }, { ...organiser, role })).toEqual([]);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it('returns summaries without exposing ownership fields or full request details', async () => {
    const rows = [
      { ...baseRow, id: 'approved', status: 'APPROVED', organiserId: organiser.id },
      { ...baseRow, id: 'draft', status: 'DRAFT', name: null, organiserId: organiser.id },
    ];
    const pool = fakePool(rows);
    expect(await listOwnedRequests({ pool }, organiser)).toEqual([
      { id: 'approved', name: baseRow.name, status: 'APPROVED',
        createdAt: baseRow.createdAt, updatedAt: baseRow.updatedAt },
      { id: 'draft', name: null, status: 'DRAFT',
        createdAt: baseRow.createdAt, updatedAt: baseRow.updatedAt },
    ]);
  });
});
