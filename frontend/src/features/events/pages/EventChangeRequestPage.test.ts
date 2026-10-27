import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import { apiError, stubApi } from '../components/test-api';
import EventChangeRequestPage from './EventChangeRequestPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; email: string; displayName: string; role: string } | null };
const organiser = { id: 'organiser-1', email: 'o@example.com', displayName: 'Olivia', role: 'EVENT_ORGANISER' };

const approved = {
  id: 'a', organiserId: 'organiser-1', coordinatorId: 'coordinator-1', status: 'APPROVED',
  name: 'Career fair', purpose: 'Hiring', description: 'Annual fair',
  startsAt: '2026-12-01T01:00:00.000Z', endsAt: '2026-12-01T09:00:00.000Z',
  expectedAttendance: 200, venueRequirements: 'Hall A', accessibilityNeeds: null,
  equipmentRequirements: null, registrationRequired: true,
  registrationCapacity: 150, registrationOpensAt: '2026-11-01T01:00:00.000Z', registrationClosesAt: '2026-11-30T01:00:00.000Z',
  revision: 7, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', review: null,
  actions: { canEditDraft: false, canMakeInitialDecision: false, canEditDetails: false, editMode: null, editableFields: [] },
};

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/:id/change-request', component: EventChangeRequestPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div data-testid="elsewhere">{{ $route.path }}</div>' } },
    ],
  });
  await router.push('/events/a/change-request');
  await router.isReady();
  return { ...render({ template: '<router-view />' }, { global: { plugins: [router] } }), router };
}

beforeEach(() => { session.user = { ...organiser }; });

describe('KAN-15 request a change page', () => {
  it('KAN-15-AC1 sends only the changed significant fields with the displayed revision', async () => {
    const api = stubApi({
      'GET /api/events/a': { body: approved },
      'POST /api/events/a/change-requests': { status: 201, body: { id: 'cr1', status: 'PENDING' } },
    });
    const { router } = await renderPage();
    const submit = await screen.findByRole('button', { name: 'Send change request' });
    expect(submit).toBeDisabled();
    expect(screen.queryByLabelText(/Event name/)).not.toBeInTheDocument();

    await fireEvent.update(screen.getByLabelText(/Expected attendance/), '250');
    await fireEvent.update(screen.getByLabelText(/^Starts/), '2026-12-01T10:00');
    expect(screen.getByText('Only the details you changed are sent.')).toBeInTheDocument();
    await fireEvent.click(submit);

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/events/a'));
    expect(api.writes()).toEqual([{
      key: 'POST /api/events/a/change-requests',
      body: { changes: { startsAt: '2026-12-01T02:00:00.000Z', expectedAttendance: 250 }, expectedRevision: 7 },
    }]);
  });

  it('clears registration settings when registration is turned off', async () => {
    const api = stubApi({
      'GET /api/events/a': { body: approved },
      'POST /api/events/a/change-requests': { status: 201, body: { id: 'cr1' } },
    });
    await renderPage();
    await fireEvent.click(await screen.findByLabelText('No registration'));
    expect(screen.queryByLabelText(/Registration capacity/)).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
    await vi.waitFor(() => expect(api.writes()).toHaveLength(1));
    expect(api.writes()[0]!.body).toEqual({
      changes: { registrationRequired: false, registrationCapacity: null, registrationOpensAt: null, registrationClosesAt: null },
      expectedRevision: 7,
    });
  });

  it('checks required and whole-number fields before sending', async () => {
    const api = stubApi({ 'GET /api/events/a': { body: approved } });
    await renderPage();
    await fireEvent.update(await screen.findByLabelText(/Purpose/), '  ');
    await fireEvent.update(screen.getByLabelText(/Expected attendance/), '2.5');
    await fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
    expect(await screen.findByText('Purpose is required.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number of 0 or more.')).toBeInTheDocument();
    expect(screen.getByText('Check the highlighted details, then try again.')).toBeInTheDocument();
    expect(api.writes()).toEqual([]);
    await fireEvent.update(screen.getByLabelText(/Purpose/), 'Hiring day');
    expect(screen.queryByText('Purpose is required.')).not.toBeInTheDocument();
  });

  it.each([
    [apiError(409, 'EVENT_REVISION_CONFLICT', 'stale'), 'This event changed after you opened it, so your request was not sent. Reload to see the latest details.', true],
    [apiError(409, 'CHANGE_REQUEST_ALREADY_PENDING', 'pending'), 'This event already has a change request awaiting review. Withdraw it from the event page first.', true],
    [apiError(409, 'CANCEL_AND_RESUBMIT_REQUIRED', 'Server says no.'), 'Server says no.', false],
    [apiError(500, 'INTERNAL_ERROR', 'boom'), 'Your change request could not be sent. Check your connection, then try again.', false],
  ])('explains a refused submission (%#)', async (reply, message, stale) => {
    stubApi({ 'GET /api/events/a': { body: approved }, 'POST /api/events/a/change-requests': reply });
    await renderPage();
    await fireEvent.update(await screen.findByLabelText(/Expected attendance/), '210');
    await fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' }) !== null).toBe(stale);
  });

  it('sends a signed-out user to sign in, from loading or from saving', async () => {
    const api = stubApi({ 'GET /api/events/a': apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in') });
    await renderPage();
    expect(await screen.findByText('Sign in to request a change.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');

    api.set('GET /api/events/a', { body: approved });
    session.user = { ...organiser };
    api.set('POST /api/events/a/change-requests', apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in'));
    await fireEvent.update(await screen.findByLabelText(/Expected attendance/), '210');
    await fireEvent.click(screen.getByRole('button', { name: 'Send change request' }));
    expect(await screen.findByText('Sign in to request a change.')).toBeInTheDocument();
  });

  it.each([
    [{ ...approved, status: 'SUBMITTED' }],
    [{ ...approved, organiserId: 'someone-else' }],
  ])('explains when the viewer cannot request a change (%#)', async (detail) => {
    stubApi({ 'GET /api/events/a': { body: detail } });
    await renderPage();
    expect(await screen.findByText(/Change requests are only for the organiser of an approved or confirmed event/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send change request' })).not.toBeInTheDocument();
  });

  it('separates an unavailable event from a temporary failure that can be retried', async () => {
    const api = stubApi({ 'GET /api/events/a': apiError(404, 'EVENT_REQUEST_NOT_FOUND', 'missing') });
    await renderPage();
    expect(await screen.findByText('This event is unavailable or you do not have permission to change it.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();

    api.set('GET /api/events/a', apiError(500, 'INTERNAL_ERROR', 'boom'));
    session.user = { ...organiser, id: 'organiser-1', displayName: 'Again' };
    session.user = { ...organiser };
    await vi.waitFor(() => expect(screen.getByText('This event could not be loaded. Please try again.')).toBeInTheDocument());
    api.set('GET /api/events/a', { body: approved });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Send change request' })).toBeInTheDocument();
  });

  it('shows sign-in when the session ends while open', async () => {
    stubApi({ 'GET /api/events/a': { body: approved } });
    await renderPage();
    await screen.findByRole('button', { name: 'Send change request' });
    session.user = null;
    expect(await screen.findByText('Sign in to request a change.')).toBeInTheDocument();
  });
});
