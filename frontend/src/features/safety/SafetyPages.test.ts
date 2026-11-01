import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
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
const otherId = '84000000-0000-4000-8000-0000000000bb';
const OTHER_READ = `GET /api/safety-reviews/${otherId}`;
const OTHER_WRITE = `POST /api/safety-reviews/${otherId}/decision`;
const fingerprint = 'f'.repeat(32);
const detail = (overrides: Record<string, unknown> = {}) => ({ body: {
  review: { id: reviewId, round: 2, status: 'PENDING', fingerprint, emergencyAccess: 'East exits', equipmentPlacement: null,
    crowdMovement: 'Foyer flow', submittedByName: 'Casey', submittedAt: '2034-12-01T02:00:00.000Z', decidedByName: null,
    decidedAt: null, decisionNotes: null, requestedAreas: null, missingNotes: ['equipmentPlacement'] },
  stale: false, canDecide: true,
  event: { id: 'e1', name: 'Graduation dinner', status: 'CONFIRMED', startsAt: '2035-01-01T10:00:00.000Z', endsAt: '2035-01-01T14:00:00.000Z',
    expectedAttendance: 120, venueRequirements: 'Ballroom', accessibilityNeeds: null, equipmentRequirements: 'Speakers', equipmentPlanStatus: 'REQUIRED' },
  venues: [{ bookingId: 'b1', name: 'Grand Hall', location: 'L1', capacity: 150, layouts: ['Banquet'], facilities: ['First aid kit', 'PA system'], accessibilityFeatures: ['Ramp'],
    wheelchairAccessible: true, bookedLayout: 'Banquet', status: 'APPROVED', needsRecovery: false,
    opensAt: '09:00:00', closesAt: '23:00:00', setupMinutes: 15, turnaroundMinutes: 20 }],
  equipment: [{ id: 'q1', name: 'Speaker', quantity: 2, status: 'RESERVED', technicalRequirements: 'Secure cables away from exits.' }],
  readiness: { ready: true, checks: [] }, rounds: [{ id: 'r0', round: 1, status: 'CHANGES_REQUESTED', decisionNotes: 'Add exit plan.' }],
  ...overrides } });

async function open(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/safety-reviews', component: SafetyQueuePage }, { path: '/safety-reviews/:id', component: SafetyReviewPage },
    { path: '/login', component: { template: '<p>Sign in</p>' } }] });
  await router.push(path); await router.isReady();
  const view = render(RouterView, { global: { plugins: [router] } });
  return { router, ...view };
}
function deferredReply() {
  let resolve!: (reply: { status?: number; body: unknown }) => void;
  const promise = new Promise<{ status?: number; body: unknown }>(done => { resolve = done; });
  return { promise, resolve };
}
const otherDetail = () => detail({ review: { ...detail().body.review, id: otherId, fingerprint: 'b'.repeat(32) },
  event: { ...detail().body.event, name: 'Other review event' } });
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

  it('KAN-84-AC1: waits for identity restoration and then prompts a signed-out visitor without requesting data', async () => {
    session.user = null;
    session.loading = true;
    const api = stubApi({});
    await open('/safety-reviews');
    expect(screen.getByRole('status')).toHaveTextContent('Loading safety reviews');
    session.loading = false;
    expect(await screen.findByText(/Sign in to view safety reviews/)).toBeInTheDocument();
    expect(api.calls).toEqual([]);
  });

  it('KAN-84-AC1/AC12: a failed queue read offers a retry and uses the refreshed result', async () => {
    const api = stubApi({ 'GET /api/safety-reviews': apiError(503, 'UNAVAILABLE', 'Try again shortly.') });
    await open('/safety-reviews');
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again shortly.');
    api.set('GET /api/safety-reviews', { body: { items: [{ id: reviewId, round: 1, eventId: 'e1', eventName: null,
      startsAt: '2035-01-01T02:00:00Z', submittedAt: '2034-12-01T02:00:00Z', stale: false }] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('link', { name: /Untitled event/ })).toBeInTheDocument();
    expect(screen.getByText(/event starts/)).toHaveTextContent('Singapore time');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('KAN-84-AC1: an expired session clears the identity and shows the sign-in prompt', async () => {
    stubApi({ 'GET /api/safety-reviews': apiError(401, 'AUTHENTICATION_REQUIRED', 'Session expired.') });
    await open('/safety-reviews');
    expect(await screen.findByText(/Sign in to view safety reviews/)).toBeInTheDocument();
    expect(session.user).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
  });

  it.each(['signout', 'role'] as const)('KAN-84-AC12: a pending queue cannot conceal a %s refusal or restore private results', async change => {
    const pending = deferredReply();
    stubApi({ 'GET /api/safety-reviews': () => pending.promise });
    await open('/safety-reviews');
    expect(screen.getByRole('status')).toHaveTextContent('Loading safety reviews');
    session.user = change === 'signout' ? null : { ...officer, role: 'ATTENDEE' };
    await flushPromises();
    if (change === 'signout') expect(screen.getByText(/Sign in to view safety reviews/)).toBeInTheDocument();
    else expect(screen.getByRole('alert')).toHaveTextContent('Only a Safety Officer');
    pending.resolve({ body: { items: [{ id: reviewId, round: 1, eventName: 'Private old review', stale: false }] } });
    await flushPromises();
    expect(screen.queryByText(/Private old review/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading safety reviews/)).not.toBeInTheDocument();
  });
});

describe('KAN-84 Safety Officer review decision', () => {
  it('KAN-84-AC4/AC12: an uppercase review UUID loads and saves the canonical review', async () => {
    const api = stubApi({ [READ]: detail(), [WRITE]: { body: { changed: true, review: { status: 'APPROVED' } } } });
    await open(`/safety-reviews/${reviewId.toUpperCase()}`);
    await fireEvent.click(await screen.findByLabelText('Approve'));
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeEnabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    expect(await screen.findByText('Decision saved: Safety approved.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: WRITE, body: { decision: 'APPROVED', fingerprint } }]);
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(2);
  });

  it('KAN-84-AC3: shows event, venues, equipment, missing notes and that suitability is not approval', async () => {
    stubApi({ [READ]: detail() });
    await open(`/safety-reviews/${reviewId}`);
    expect(await screen.findByText('Missing — not provided by the coordinator')).toBeInTheDocument();
    expect(screen.getByText('Grand Hall').closest('li')).toHaveTextContent('capacity 150');
    expect(screen.getByText('Grand Hall').closest('li')).toHaveTextContent('09:00:00');
    expect(screen.getByText('Grand Hall').closest('li')).toHaveTextContent('23:00:00');
    expect(screen.getByText('Grand Hall').closest('li')).toHaveTextContent('Setup buffer: 15 minutes');
    expect(screen.getByText('Grand Hall').closest('li')).toHaveTextContent('Turnaround buffer: 20 minutes');
    expect(screen.getByText('Grand Hall').closest('li')).toHaveTextContent('Facilities: First aid kit, PA system');
    expect(screen.getByText('2 × Speaker · RESERVED')).toBeInTheDocument();
    expect(screen.getByText('Technical requirements: Secure cables away from exits.')).toBeInTheDocument();
    expect(screen.getByText(/Advisory venue suitability is not a safety approval/)).toBeInTheDocument();
    expect(screen.getByText(/Round 1 · Changes requested · Add exit plan./)).toBeInTheDocument();
  });

  it.each(['empty', 'omitted'])('KAN-84-AC3: reports %s facilities and equipment requirements without inventing safety context', async variant => {
    const base = detail().body;
    const api = stubApi({ [READ]: detail({
      venues: [{ ...base.venues[0], facilities: variant === 'empty' ? [] : undefined }],
      equipment: [{ ...base.equipment[0], technicalRequirements: variant === 'empty' ? null : undefined }],
    }) });
    await open(`/safety-reviews/${reviewId}`);
    expect(await screen.findByText('Facilities: None recorded')).toBeInTheDocument();
    expect(screen.getByText('Technical requirements: Not recorded')).toBeInTheDocument();
    expect(screen.queryByText('Technical requirements: Secure cables away from exits.')).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
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
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('already been decided. The review has been reloaded.'));
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(2);
  });

  it('KAN-84-AC4/AC12: clears the old review and draft while the next route loads, then saves only its fingerprint', async () => {
    const next = deferredReply();
    const api = stubApi({ [READ]: detail(), [OTHER_READ]: () => next.promise,
      [OTHER_WRITE]: { body: { changed: true, review: { status: 'APPROVED' } } } });
    const { router } = await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Request changes'));
    await fireEvent.click(screen.getByLabelText('Technical'));
    await fireEvent.update(screen.getByLabelText(/Notes/), 'Old review notes');
    await router.push(`/safety-reviews/${otherId}`);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the safety review');
    expect(screen.queryByText('Graduation dinner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument();
    expect(api.writes()).toEqual([]);
    next.resolve(otherDetail());
    expect(await screen.findByRole('heading', { name: 'Other review event' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toHaveValue('');
    expect(screen.getByLabelText('Request changes')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled();
    await fireEvent.click(screen.getByLabelText('Approve'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    expect(await screen.findByText('Decision saved: Safety approved.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: OTHER_WRITE, body: { decision: 'APPROVED', fingerprint: 'b'.repeat(32) } }]);
  });

  it.each(['success', 'unauthorized'] as const)('KAN-84-AC12: ignores a late %s read after changing routes', async outcome => {
    const previous = deferredReply();
    const next = deferredReply();
    stubApi({ [READ]: () => previous.promise, [OTHER_READ]: () => next.promise });
    const { router } = await open(`/safety-reviews/${reviewId}`);
    await router.push(`/safety-reviews/${otherId}`);
    previous.resolve(outcome === 'success' ? detail() : apiError(401, 'SESSION_EXPIRED', 'Old session expired.'));
    await flushPromises();
    expect(session.user?.id).toBe(officer.id);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the safety review');
    expect(screen.queryByText('Graduation dinner')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    next.resolve(otherDetail());
    expect(await screen.findByRole('heading', { name: 'Other review event' })).toBeInTheDocument();
  });

  it.each(['account', 'loading', 'role', 'signout'] as const)('KAN-84-AC12: clears the displayed review and draft on %s change', async change => {
    const next = deferredReply();
    const api = stubApi({ [READ]: detail() });
    await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Reject'));
    await fireEvent.update(screen.getByLabelText(/Notes/), 'Private old draft');
    api.set(READ, () => next.promise);
    if (change === 'account') session.user = { ...officer, id: 's2' };
    else if (change === 'loading') session.loading = true;
    else if (change === 'role') session.user = { ...officer, role: 'ATTENDEE' };
    else session.user = null;
    await flushPromises();
    expect(screen.queryByText('Graduation dinner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Private old draft')).not.toBeInTheDocument();
    expect(api.writes()).toEqual([]);
    if (change === 'loading') session.loading = false;
    if (change === 'account' || change === 'loading') {
      next.resolve(detail());
      expect(await screen.findByLabelText(/Notes/)).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled();
    }
  });

  it.each([
    ['success', { body: { changed: true, review: { status: 'APPROVED' } } }],
    ['conflict', apiError(409, 'SAFETY_REVIEW_DECIDED', 'Old review was decided.')],
    ['unauthorized', apiError(401, 'SESSION_EXPIRED', 'Old session expired.')],
  ] as const)('KAN-84-AC12: ignores an old-route %s write without reloading or unlocking the new save', async (_outcome, reply) => {
    const previous = deferredReply();
    const next = deferredReply();
    const api = stubApi({ [READ]: detail(), [WRITE]: () => previous.promise,
      [OTHER_READ]: otherDetail(), [OTHER_WRITE]: () => next.promise });
    const { router } = await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Approve'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await router.push(`/safety-reviews/${otherId}`);
    await fireEvent.click(await screen.findByLabelText('Reject'));
    await fireEvent.update(screen.getByLabelText(/Notes/), 'New review notes');
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    previous.resolve(reply);
    await flushPromises();
    expect(session.user?.id).toBe(officer.id);
    expect(screen.getByRole('heading', { name: 'Other review event' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toHaveValue('New review notes');
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.queryByText(/Decision saved/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.calls.filter(call => call.key === OTHER_READ)).toHaveLength(1);
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(1);
    next.resolve({ body: { changed: true, review: { status: 'REJECTED' } } });
    expect(await screen.findByText('Decision saved: Rejected.')).toBeInTheDocument();
  });

  it.each(['success', 'unauthorized'] as const)('KAN-84-AC12: ignores a previous reviewer\'s %s write on the same route', async outcome => {
    const previous = deferredReply();
    const api = stubApi({ [READ]: detail(), [WRITE]: () => previous.promise });
    await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Approve'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    session.user = { ...officer, id: 's2' };
    await flushPromises();
    await fireEvent.click(await screen.findByLabelText('Reject'));
    await fireEvent.update(screen.getByLabelText(/Notes/), 'New reviewer draft');
    previous.resolve(outcome === 'success' ? { body: { changed: true, review: { status: 'APPROVED' } } }
      : apiError(401, 'SESSION_EXPIRED', 'Old session expired.'));
    await flushPromises();
    expect(session.user?.id).toBe('s2');
    expect(screen.getByLabelText(/Notes/)).toHaveValue('New reviewer draft');
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeEnabled();
    expect(screen.queryByText(/Decision saved/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(2);
  });

  it.each(['signout', 'unmount'] as const)('KAN-84-AC12: an in-flight write after %s has no session or reload side effects', async change => {
    const previous = deferredReply();
    const api = stubApi({ [READ]: detail(), [WRITE]: () => previous.promise });
    const { unmount } = await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Approve'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    if (change === 'unmount') unmount();
    else session.user = null;
    previous.resolve(apiError(401, 'SESSION_EXPIRED', 'Old session expired.'));
    await flushPromises();
    expect(session.user?.id).toBe(change === 'unmount' ? officer.id : undefined);
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(1);
    expect(screen.queryByText(/Decision saved/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('KAN-84-AC10/AC12: blocks duplicate submits and retries until an uncertain write is reconciled', async () => {
    const write = deferredReply();
    const reload = deferredReply();
    const api = stubApi({ [READ]: detail(), [WRITE]: () => write.promise });
    await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Approve'));
    const form = screen.getByRole('button', { name: 'Save decision' }).closest('form')!;
    await fireEvent.submit(form);
    await fireEvent.submit(form);
    expect(api.writes()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    api.set(READ, () => reload.promise);
    write.resolve(apiError(503, 'RESPONSE_LOST', 'The save response was lost.'));
    await flushPromises();
    expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Checking the review\'s saved state');
    expect(screen.queryByText(/Decision saved/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('has been reloaded');
    reload.resolve(detail({ canDecide: false, review: { ...detail().body.review, status: 'APPROVED',
      decidedByName: 'Sam', decidedAt: '2034-12-02T02:00:00.000Z' } }));
    expect(await screen.findByText(/Decided by Sam/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The review has been reloaded.');
    expect(api.writes()).toHaveLength(1);
  });

  it('KAN-84-AC12: keeps a decision unavailable when both the write and reconciliation fail', async () => {
    const api = stubApi({ [READ]: detail(), [WRITE]: () => { throw new Error('Connection lost'); } });
    await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Approve'));
    api.set(READ, apiError(503, 'UNAVAILABLE', 'Review unavailable.'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Reload this page before trying again.'));
    expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Decision saved/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('has been reloaded');
    expect(api.writes()).toHaveLength(1);
  });

  it.each(['read', 'write'] as const)('KAN-84-AC12: a current %s session expiry clears the review without retrying', async operation => {
    const expired = apiError(401, 'SESSION_EXPIRED', 'Sign in again.');
    const api = stubApi({ [READ]: operation === 'read' ? expired : detail(), [WRITE]: expired });
    await open(`/safety-reviews/${reviewId}`);
    if (operation === 'write') {
      await fireEvent.click(await screen.findByLabelText('Approve'));
      await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    }
    expect(await screen.findByText(/Sign in to view this safety review/)).toBeInTheDocument();
    expect(session.user).toBeNull();
    expect(screen.queryByText('Graduation dinner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(1);
  });

  it('KAN-84-AC12: ignores a read session expiry after the review is unmounted', async () => {
    const pending = deferredReply();
    const api = stubApi({ [READ]: () => pending.promise });
    const { unmount } = await open(`/safety-reviews/${reviewId}`);
    unmount();
    pending.resolve(apiError(401, 'SESSION_EXPIRED', 'Old session expired.'));
    await flushPromises();
    expect(session.user?.id).toBe(officer.id);
    expect(api.calls).toHaveLength(1);
  });

  it('KAN-84-AC12: returning to the original route does not revive its previous pending save', async () => {
    const previous = deferredReply();
    const api = stubApi({ [READ]: detail(), [WRITE]: () => previous.promise, [OTHER_READ]: otherDetail() });
    const { router } = await open(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Approve'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await router.push(`/safety-reviews/${otherId}`);
    expect(await screen.findByRole('heading', { name: 'Other review event' })).toBeInTheDocument();
    await router.push(`/safety-reviews/${reviewId}`);
    await fireEvent.click(await screen.findByLabelText('Reject'));
    await fireEvent.update(screen.getByLabelText(/Notes/), 'Fresh draft after returning');
    previous.resolve({ body: { changed: true, review: { status: 'APPROVED' } } });
    await flushPromises();
    expect(screen.queryByText(/Decision saved/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toHaveValue('Fresh draft after returning');
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeEnabled();
    expect(api.calls.filter(call => call.key === READ)).toHaveLength(2);
  });
});
