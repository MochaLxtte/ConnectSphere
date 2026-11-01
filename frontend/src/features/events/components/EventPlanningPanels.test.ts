import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EventPlanningPanels from './EventPlanningPanels.vue';
import ReviewRequestPage from '../../reviews/pages/ReviewRequestPage.vue';
import { stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

describe('KAN-61 / KAN-84: readiness after a planning mutation', () => {
  it.each([
    ['venue', 'changed'], ['equipment', 'changed'], ['change request', 'changed'],
    ['venue', 'refresh'], ['equipment', 'refresh'],
  ])('refreshes confirmation and safety after %s %s without remounting another form', async (kind, event) => {
    let resolveConfirmation!: (value: { body: unknown }) => void;
    let resolveSafety!: (value: { body: unknown }) => void;
    const confirmation = `GET /api/events/${eventRequestId}/confirmation`;
    const safety = `GET /api/events/${eventRequestId}/safety`;
    const api = stubApi({
      [confirmation]: { body: { eventRequestId, status: 'APPROVED', canConfirm: true, started: false, confirmation: null,
        readiness: { ready: true, checks: [{ key: 'VENUE', ready: true, message: 'All arrangements ready.' }] } } },
      [safety]: { body: { eventRequestId, eventStatus: 'APPROVED', outcome: 'APPROVED', canSubmit: false,
        canStartPreparation: false, preparation: null, readiness: null, rounds: [], pendingStale: false } },
    });
    const changed = (name: string) => ({ emits: ['changed', 'refresh'], template: `<button @click="$emit('${event}')">Save ${name}</button>` });
    const view = render(EventPlanningPanels, { props, global: { stubs: {
      AssignmentPanel: true, ClarificationPanel: { template: '<label>Unrelated draft<input /></label>' },
      VenueBookingPanel: changed('venue'), EquipmentRequestPanel: changed('equipment'),
      ChangeRequestPanel: changed('change request'), StatusHistoryPanel: true,
      EventCompletionPanel: true, EventCancellationPanel: true,
    } } });
    await screen.findByText('All arrangements ready.');
    await screen.findByTestId('safety-outcome');
    await fireEvent.update(screen.getByLabelText('Unrelated draft'), 'Keep these unsaved notes');
    await fireEvent.click(screen.getByRole('checkbox'));
    api.set(confirmation, () => new Promise(resolve => { resolveConfirmation = resolve; }));
    api.set(safety, () => new Promise(resolve => { resolveSafety = resolve; }));
    await fireEvent.click(screen.getByRole('button', { name: `Save ${kind}` }));
    await waitFor(() => expect(api.calls.filter(call => call.key === confirmation)).toHaveLength(2));
    expect(screen.queryByText('All arrangements ready.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm event' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('safety-outcome')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Unrelated draft')).toHaveValue('Keep these unsaved notes');
    resolveConfirmation({ body: { eventRequestId, status: 'APPROVED', canConfirm: false, started: false, confirmation: null,
      readiness: { ready: false, checks: [{ key: 'VENUE', ready: false, message: 'Resolve the pending venue request.' }] } } });
    resolveSafety({ body: { eventRequestId, eventStatus: 'APPROVED', outcome: 'STALE', canSubmit: false,
      canStartPreparation: false, preparation: null, readiness: null, rounds: [], pendingStale: false } });
    expect(await screen.findByText('Resolve the pending venue request.')).toBeInTheDocument();
    expect(await screen.findByTestId('safety-outcome')).toHaveTextContent('Approval out of date');
    expect(view.emitted('changed')).toHaveLength(1);
    // Reloading the parent detail with the same revision must not discard other in-progress forms.
    await view.rerender({ ...props });
    expect(screen.getByLabelText('Unrelated draft')).toHaveValue('Keep these unsaved notes');
  });
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
beforeEach(() => {
  session.user = { id: 'coordinator-a', role: 'EVENT_COORDINATOR', email: 'coordinator@example.test', displayName: 'Coordinator' };
  session.loading = false;
});

const eventRequestId = 'event-one';
const list = `GET /api/venue-bookings?eventRequestId=${eventRequestId}`;
const props = {
  eventRequestId, currentCoordinatorId: 'coordinator-a', status: 'APPROVED', viewerRole: 'EVENT_COORDINATOR', revision: 8,
};

describe('KAN-15 O-1: planning panels after a change-request decision', () => {
  it('reloads the venue booking list when the event revision advances, and not otherwise', async () => {
    // Other panels' reads are left unstubbed; only the venue panel's reads matter here.
    const api = stubApi({ [list]: { body: { items: [] } }, 'GET /api/venues/search-venues': { body: { items: [] } } });
    const view = render(EventPlanningPanels, { props });
    await screen.findByText('No venue has been requested for this event yet.');
    const loads = () => api.calls.filter((call) => call.key === list).length;
    expect(loads()).toBe(1);

    // An approved change request applies new values (revision 9) and may cancel pending bookings.
    await view.rerender({ ...props, revision: 9 });
    await waitFor(() => expect(loads()).toBe(2));

    // A parent refresh with the same revision keeps the panel and its form as they are.
    await view.rerender({ ...props, revision: 9, currentCoordinatorId: 'coordinator-a' });
    await screen.findByText('No venue has been requested for this event yet.');
    expect(loads()).toBe(2);
  });
});

describe('KAN-61 / KAN-84 / KAN-10 / KAN-62 shared planning outcome propagation', () => {
  it.each([
    ['AssignmentPanel', 'SUBMITTED', 'SUBMITTED'],
    ['ClarificationPanel', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'],
    ['EventConfirmationPanel', 'APPROVED', 'CONFIRMED'],
    ['SafetyReviewPanel', 'CONFIRMED', 'CONFIRMED'],
    ['EventCompletionPanel', 'CONFIRMED', 'COMPLETED'],
    ['EventCancellationPanel', 'APPROVED', 'CANCELLED'],
  ])('rereads the current event after %s saves and preserves another form', async (panel, initialStatus, savedStatus) => {
    const eventPath = `GET /api/events/${eventRequestId}`;
    const detail = {
      id: eventRequestId, organiserId: 'organiser-a', coordinatorId: 'coordinator-a', status: initialStatus,
      name: 'Planning lifecycle event', purpose: 'Test', description: 'Before the saved outcome',
      startsAt: null, endsAt: null, expectedAttendance: 20, venueRequirements: null,
      accessibilityNeeds: null, equipmentRequirements: null, registrationRequired: false,
      createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', revision: 8,
      review: null, actions: { canEditDraft: false, canMakeInitialDecision: false },
    };
    const api = stubApi({ [eventPath]: { body: detail } });
    const stubs: Record<string, boolean | Component> = Object.fromEntries([
      'AssignmentPanel', 'ClarificationPanel', 'ChangeRequestPanel', 'VenueBookingPanel',
      'EquipmentRequestPanel', 'EventConfirmationPanel', 'SafetyReviewPanel',
      'EventCompletionPanel', 'EventCancellationPanel',
    ].map((name) => [name, true]));
    stubs[panel] = {
      props: ['eventRequestId', 'status'], emits: ['changed'],
      template: '<section><span data-testid="saved-panel-context">{{ eventRequestId }}: {{ status }}</span><button @click="$emit(\'changed\')">Saved panel outcome</button></section>',
    };
    stubs.StatusHistoryPanel = { template: '<label>Other planning notes<input /></label>' };
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/reviews/:id', component: ReviewRequestPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ] });
    await router.push(`/reviews/${eventRequestId}`);
    await router.isReady();
    render(ReviewRequestPage, { global: { plugins: [router], stubs } });
    await screen.findByRole('heading', { name: 'Planning lifecycle event' });
    await fireEvent.update(screen.getByLabelText('Other planning notes'), 'Do not discard this draft');
    api.set(eventPath, { body: { ...detail, status: savedStatus, revision: 9, description: 'Saved server outcome' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Saved panel outcome' }));
    await screen.findByText('Saved server outcome');
    expect(screen.getByText('Status').nextElementSibling).toHaveTextContent(savedStatus);
    expect(screen.getByTestId('saved-panel-context')).toHaveTextContent(`${eventRequestId}: ${savedStatus}`);
    expect(screen.getByLabelText('Other planning notes')).toHaveValue('Do not discard this draft');
    expect(api.calls.map(call => call.key)).toEqual([eventPath, eventPath]);
  });
});
