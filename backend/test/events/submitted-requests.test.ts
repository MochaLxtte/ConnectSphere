import { describe, expect, it, vi } from 'vitest';
import {
  FOLLOW_UP_STATUSES,
  listFollowUpRequests,
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

describe('KAN-33 / KAN-56 listFollowUpRequests (S1-DEF-02 decided-request access)', () => {
  it('never queries the database for a non-coordinator actor', async () => {
    const pool = fakePool([baseRow]);
    const canViewRequest = vi.fn();
    const items = await listFollowUpRequests({ pool, canViewRequest }, organiser);
    expect(items).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
    expect(canViewRequest).not.toHaveBeenCalled();
  });

  it('queries only decided/follow-up statuses, most recently changed first', async () => {
    const pool = fakePool([]);
    await listFollowUpRequests({ pool, canViewRequest: () => true }, coordinator);
    expect(pool.query).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/status = ANY\(\$1\) ORDER BY updated_at DESC/),
      [FOLLOW_UP_STATUSES],
    );
  });

  it('never overlaps the pending queue and never includes drafts', () => {
    const followUp: readonly string[] = FOLLOW_UP_STATUSES;
    expect(followUp).not.toContain('DRAFT');
    expect(REVIEWABLE_STATUSES.filter((status) => followUp.includes(status))).toEqual([]);
    expect(followUp).toEqual(expect.arrayContaining(['APPROVED', 'REJECTED']));
  });

  it('returns only requests the assignment policy allows, without ownership fields', async () => {
    const assigned = { ...baseRow, id: 'a', status: 'APPROVED' as const, coordinatorId: coordinator.id };
    const otherCoordinator = { ...baseRow, id: 'b', status: 'REJECTED' as const, coordinatorId: 'someone-else' };
    const unassigned = { ...baseRow, id: 'c', status: 'APPROVED' as const, coordinatorId: null };
    const pool = fakePool([assigned, otherCoordinator, unassigned]);
    const canViewRequest = vi.fn(
      (_actor: QueueActor, request: ReviewableRequest) => request.coordinatorId === coordinator.id,
    );

    const items = await listFollowUpRequests({ pool, canViewRequest }, coordinator);

    expect(items).toEqual([
      { id: 'a', name: assigned.name, status: 'APPROVED',
        createdAt: assigned.createdAt, updatedAt: assigned.updatedAt },
    ]);
    expect(canViewRequest).toHaveBeenCalledTimes(3);
  });

  it('returns an empty list when the coordinator has no decided requests', async () => {
    const items = await listFollowUpRequests({ pool: fakePool([]), canViewRequest: () => true }, coordinator);
    expect(items).toEqual([]);
  });

  it('propagates a policy failure instead of returning a partial list', async () => {
    const pool = fakePool([{ ...baseRow, status: 'APPROVED' as const }]);
    const canViewRequest = vi.fn().mockRejectedValue(new Error('policy unavailable'));
    await expect(listFollowUpRequests({ pool, canViewRequest }, coordinator)).rejects.toThrow('policy unavailable');
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
