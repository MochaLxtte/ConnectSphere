import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { authSession, type SignedInUser } from '../auth/session.js';
import { apiError, stubApi } from '../events/components/test-api';
import SafetyQueuePage from './SafetyQueuePage.vue';
import SafetyReviewPage from './SafetyReviewPage.vue';

vi.mock('../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const authSession = reactive({ user: null, loading: false });
  return { authSession, clearLocalSession: () => { authSession.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const officer: SignedInUser = { id: 's1', email: 's@example.test', displayName: 'Sam', role: 'SAFETY_OFFICER' };
const reviewId = '84000000-0000-4000-8000-0000000000aa';
const READ = `GET /api/safety-reviews/${reviewId}`;
const WRITE = `POST /api/safety-reviews/${reviewId}/decision`;
const fingerprint = 'f'.repeat(32);
const detail = (overrides: Record<string, unknown> = {}) => ({ body: {
  review: { id: reviewId, round: 2, status: 'PENDING', fingerprint, emergencyAccess: 'East exits', equipmentPlacement: null,
    crowdMovement: 'Foyer flow', submittedByName: 'Casey', submittedAt: '2034-12-01T02:00:00.000Z', decidedByName: null,
    decidedAt: null, decisionNotes: null, requestedAreas: null, missingNotes: ['equipmentPlacement'] },
  stale: false, canDecide: true,
  event: { id: 'e1', name: 'Graduation dinner', status: 'CONFIRMED', startsAt: '2035-01-01T10:00:00.000Z', endsAt: '2035-01-01T14:00:00.000Z',
    expectedAttendance: 120, venueRequirements: 'Ballroom', accessibilityNeeds: null, equipmentRequirements: 'Speakers', equipmentPlanStatus: 'REQUIRED' },
  venues: [{ bookingId: 'b1', name: 'Grand Hall', location: 'L1', capacity: 150, layouts: ['Banquet'], accessibilityFeatures: ['Ramp'],
    wheelchairAccessible: true, bookedLayout: 'Banquet', status: 'APPROVED', needsRecovery: false }],
  equipment: [{ id: 'q1', name: 'Speaker', quantity: 2, status: 'RESERVED' }],
  readiness: { ready: true, checks: [] }, rounds: [{ id: 'r0', round: 1, status: 'CHANGES_REQUESTED', decisionNotes: 'Add exit plan.' }],
  ...overrides } });

async function open(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/safety-reviews', component: SafetyQueuePage }, { path: '/safety-reviews/:id', component: SafetyReviewPage },
    { path: '/login', component: { template: '<p>Sign in</p>' } }] });
  await router.push(path); await router.isReady();
  render(RouterView, { global: { plugins: [router] } });
}
beforeEach(() => { session.user = { ...officer }; session.loading = false; });

describe('KAN-84 Safety Officer queue', () => {
  it('KAN-84-AC1: lists rounds awaiting a decision and flags stale ones', async () => {
    stubApi({ 'GET /api/safety-reviews': { body: { items: [
      { id: reviewId, round: 2, eventId: 'e1', eventName: 'Graduation dinner', startsAt: null, submittedAt: '2034-12-01T02:00:00.000Z', stale: true }] } } });
    await open('/safety-reviews');
    expect(await screen.findByRole('link', { name: /Graduation dinner · round 2/ })).toHaveAttribute('href', `/safety-reviews/${reviewId}`);
    expect(screen.getByText(/cannot be approved/)).toBeInTheDocument();
  });

  it('KAN-84-AC1: other roles see a refusal and no data is requested', async () => {
    session.user = { ...officer, role: 'EVENT_COORDINATOR' };
    const api = stubApi({});
    await open('/safety-reviews');
    expect(screen.getByRole('alert')).toHaveTextContent('Only a Safety Officer');
    expect(api.calls).toEqual([]);
  });

  it('shows an empty queue clearly', async () => {
    stubApi({ 'GET /api/safety-reviews': { body: { items: [] } } });
    await open('/safety-reviews');
    expect(await screen.findByText('No safety reviews are waiting for a decision.')).toBeInTheDocument();
  });
});

describe('KAN-84 Safety Officer review decision', () => {
  it('KAN-84-AC3: shows event, venues, equipment, missing notes and that suitability is not approval', async () => {
    stubApi({ [READ]: detail() });
    await open(`/safety-reviews/${reviewId}`);
    expect(await screen.findByText('Missing — not provided by the coordinator')).toBeInTheDocument();
    expect(screen.getByText('Grand Hall').closest('li')).toHaveTextContent('capacity 150');
    expect(screen.getByText('2 × Speaker · RESERVED')).toBeInTheDocument();
    expect(screen.getByText(/Advisory venue suitability is not a safety approval/)).toBeInTheDocument();
    expect(screen.getByText(/Round 1 · Changes requested · Add exit plan./)).toBeInTheDocument();
  });

  it('KAN-84-AC6/AC10: request changes needs notes and an area, and sends the reviewed fingerprint', async () => {
    const api = stubApi({ [READ]: detail(), [WRITE]: { body: { changed: true, review: { status: 'CHANGES_REQUESTED' } } } });
    await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Request changes'));
    const save = screen.getByRole('button', { name: 'Save decision' });
    expect(save).toBeDisabled();
    await fireEvent.update(screen.getByLabelText(/Notes/), 'Move speakers away from exits.');
    expect(save).toBeDisabled();
    await fireEvent.click(screen.getByLabelText('Technical'));
    api.set(READ, detail({ canDecide: false, review: { ...detail().body.review, status: 'CHANGES_REQUESTED',
      decidedByName: 'Sam', decidedAt: '2034-12-02T02:00:00.000Z', decisionNotes: 'Move speakers away from exits.' } }));
    await fireEvent.click(save);
    expect(await screen.findByText('Decision saved: Changes requested.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: WRITE, body: { decision: 'CHANGES_REQUESTED', notes: 'Move speakers away from exits.',
      areas: ['TECHNICAL'], fingerprint } }]);
    expect(await screen.findByText(/Decided by Sam/)).toBeInTheDocument();
  });

  it('KAN-84-AC10/AC12: a stale round cannot be approved, and a refused write reloads the review', async () => {
    const api = stubApi({ [READ]: detail({ stale: true }),
      [WRITE]: apiError(409, 'SAFETY_REVIEW_DECIDED', 'This safety review round has already been decided.') });
    await open(`/safety-reviews/${reviewId}`);
    expect(await screen.findByText(/changed after this round was submitted/)).toBeInTheDocument();
    expect(screen.getByLabelText('Approve')).toBeDisabled();
    await fireEvent.click(screen.getByLabelText('Reject'));
    await fireEvent.update(screen.getByLabelText(/Notes/), 'Exit blocked.');
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already been decided. The review has been reloaded.');
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(2);
  });
});
