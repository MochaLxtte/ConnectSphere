import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../../auth/session.js';
import SafetyReviewPanel from './SafetyReviewPanel.vue';
import { apiError, stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const authSession = reactive({ user: null, loading: false });
  return { authSession, clearLocalSession: () => { authSession.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const coordinator = { id: 'coord', email: 'c@example.test', displayName: 'Casey', role: 'EVENT_COORDINATOR' as const };
const organiser = { id: 'owner', email: 'o@example.test', displayName: 'Owner', role: 'EVENT_ORGANISER' as const };
const READ = 'GET /api/events/event-one/safety';
const round = (overrides: Record<string, unknown> = {}) => ({ id: 'r1', round: 1, status: 'PENDING', emergencyAccess: 'East exits',
  equipmentPlacement: null, crowdMovement: null, submittedByName: 'Casey', submittedAt: '2034-12-01T02:00:00.000Z',
  decidedByName: null, decidedAt: null, decisionNotes: null, requestedAreas: null, missingNotes: ['equipmentPlacement', 'crowdMovement'], ...overrides });
const view = (overrides: Record<string, unknown> = {}) => ({ body: { eventRequestId: 'event-one', eventStatus: 'APPROVED', outcome: 'NONE',
  readiness: { ready: true, checks: [] }, pendingStale: false, rounds: [], unresolvedAreas: [], preparation: null, canSubmit: true, canStartPreparation: false, ...overrides } });
const renderPanel = (status = 'APPROVED') => render(SafetyReviewPanel, { props: { eventRequestId: 'event-one', status } });
beforeEach(() => { session.user = { ...coordinator }; session.loading = false; });

describe('KAN-84 safety review panel', () => {
  it('KAN-84-AC7: explains outstanding arrangement changes and does not offer note-only resubmission', async () => {
    const api = stubApi({ [READ]: view({ outcome: 'CHANGES_REQUESTED', canSubmit: false, unresolvedAreas: ['VENUE', 'TECHNICAL'] }) });
    renderPanel();
    const message = await screen.findByText(/Update the requested Venue and Technical arrangements/);
    expect(message).toHaveAttribute('role', 'status');
    expect(message).toHaveTextContent('Notes alone do not complete the requested changes.');
    expect(screen.queryByRole('button', { name: 'Submit for safety review' })).not.toBeInTheDocument();
    expect(api.writes()).toEqual([]);
  });
  it('KAN-84-AC2/AC3: submits the safety notes, flags missing ones and shows the new round', async () => {
    const api = stubApi({ [READ]: view(), 'POST /api/events/event-one/safety-reviews': { status: 201, body: { review: round() } } });
    const panel = renderPanel();
    await fireEvent.update(await screen.findByLabelText('Emergency access'), '  East exits ');
    expect(screen.getByText(/shown to the Safety Officer as missing: Equipment placement, Crowd movement/)).toBeInTheDocument();
    api.set(READ, view({ outcome: 'PENDING', rounds: [round()], canSubmit: false }));
    await fireEvent.click(screen.getByRole('button', { name: 'Submit for safety review' }));
    expect(await screen.findByText('Round 1 was sent to the Safety Officer.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: 'POST /api/events/event-one/safety-reviews',
      body: { emergencyAccess: '  East exits ', equipmentPlacement: '', crowdMovement: '' } }]);
    expect(await screen.findByText('Awaiting Safety Officer')).toBeInTheDocument();
    expect(await screen.findByTestId('safety-round-1')).toHaveTextContent('Not provided: Equipment placement, Crowd movement');
    expect(panel.emitted('changed')).toHaveLength(1);
  });

  it('KAN-84-AC6/AC12: shows requested changes with their areas and re-reads after a refused submission', async () => {
    const api = stubApi({ [READ]: view({ outcome: 'CHANGES_REQUESTED', rounds: [round({ status: 'CHANGES_REQUESTED',
      decidedByName: 'Sam', decidedAt: '2034-12-02T02:00:00.000Z', decisionNotes: 'Move speakers.', requestedAreas: ['VENUE', 'TECHNICAL'] })] }),
    'POST /api/events/event-one/safety-reviews': apiError(409, 'EVENT_NOT_READY', 'Resolve 1 venue booking still requiring outage recovery before confirming.') });
    renderPanel();
    expect(await screen.findByText('Changes needed: Venue and Technical')).toBeInTheDocument();
    expect(screen.getByText('Move speakers.')).toBeInTheDocument();
    api.set(READ, view({ outcome: 'CHANGES_REQUESTED', canSubmit: false, readiness: { ready: false,
      checks: [{ key: 'VENUE', ready: false, message: 'Resolve 1 venue booking still requiring outage recovery before confirming.' }] } }));
    await fireEvent.click(screen.getByRole('button', { name: 'Submit for safety review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('outage recovery');
    expect(await screen.findByRole('list', { name: 'Safety review readiness' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for safety review' })).not.toBeInTheDocument();
  });

  it('KAN-84-AC8/AC9: starts preparation, then shows it blocked once the approval is stale', async () => {
    const api = stubApi({ [READ]: view({ eventStatus: 'CONFIRMED', outcome: 'APPROVED', canSubmit: false, canStartPreparation: true,
      rounds: [round({ status: 'APPROVED' })] }), 'POST /api/events/event-one/preparation/start': { body: { eventRequestId: 'event-one', changed: true } } });
    renderPanel('CONFIRMED');
    api.set(READ, view({ eventStatus: 'CONFIRMED', outcome: 'APPROVED', canSubmit: false,
      preparation: { startedAt: '2034-12-03T02:00:00.000Z', startedByName: 'Casey', blocked: false } }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Start preparation' }));
    expect(await screen.findByText('Event preparation has started.')).toBeInTheDocument();
    expect(await screen.findByTestId('preparation-status')).toHaveTextContent('Preparation started by Casey');

    stubApi({ [READ]: view({ eventStatus: 'CONFIRMED', outcome: 'STALE',
      preparation: { startedAt: '2034-12-03T02:00:00.000Z', startedByName: 'Casey', blocked: true } }) });
    renderPanel('CONFIRMED');
    expect(await screen.findByText('Approval out of date')).toBeInTheDocument();
    expect(screen.getAllByText(/Preparation blocked/)[0]).toBeInTheDocument();
  });

  it('KAN-84-AC11: the organiser sees the outcome without submit or preparation actions', async () => {
    session.user = { ...organiser };
    stubApi({ [READ]: view({ outcome: 'APPROVED', canSubmit: false, rounds: [round({ status: 'APPROVED' })] }) });
    renderPanel();
    expect(await screen.findByTestId('safety-outcome')).toHaveTextContent('Safety approved');
    expect(screen.getByText('Confirm the event before starting preparation.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('stays hidden before approval and for other roles, without calling the API', () => {
    const api = stubApi({});
    renderPanel('SUBMITTED');
    session.user = { ...coordinator, role: 'SAFETY_OFFICER' };
    renderPanel('APPROVED');
    expect(screen.queryByRole('heading', { name: 'Safety review' })).not.toBeInTheDocument();
    expect(api.calls).toEqual([]);
  });
});
