import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../../auth/session.js';
import EventCompletionPanel from './EventCompletionPanel.vue';
import { apiError, stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const authSession = reactive({ user: null, loading: false });
  return { authSession, clearLocalSession: () => { authSession.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const coordinator = { id: 'c1', email: 'c@example.test', displayName: 'Casey', role: 'EVENT_COORDINATOR' as const };
const organiser = { id: 'o1', email: 'o@example.test', displayName: 'Olivia', role: 'EVENT_ORGANISER' as const };
const completion = { eventRequestId: 'event-one', status: 'COMPLETED' as const, completedById: 'c1', completedByName: 'Casey',
  completedAt: '2026-10-29T03:00:00.000Z', releasedEquipmentRequests: 2 };
const props = { eventRequestId: 'event-one', status: 'CONFIRMED', endsAt: '2020-01-12T06:00:00.000Z' };
const button = () => screen.getByRole('button', { name: /Mark event as completed|Completing/ });
beforeEach(() => { session.user = { ...coordinator }; session.loading = false; });

describe('KAN-10 event completion panel', () => {
  it('KAN-10-AC1 offers the action only to a coordinator, for a confirmed event, behind a confirmation', async () => {
    stubApi({});
    render(EventCompletionPanel, { props });
    expect(screen.getByText(/It ends at 12 Jan 2020/)).toBeInTheDocument();
    expect(screen.getByText(/The server checks the time/)).toBeInTheDocument();
    expect(button()).toBeDisabled();
    await fireEvent.click(screen.getByRole('checkbox'));
    expect(button()).toBeEnabled();
  });
  it.each(['SUBMITTED', 'APPROVED', 'CANCELLED', 'REJECTED'])('offers nothing for a %s event', status => {
    stubApi({});
    render(EventCompletionPanel, { props: { ...props, status } });
    expect(screen.queryByRole('heading', { name: 'Event completion' })).not.toBeInTheDocument();
  });
  it.each([['organiser', organiser], ['no one signed in', null]])('offers no action to %s on a confirmed event', (_name, user) => {
    session.user = user as SignedInUser | null; stubApi({});
    render(EventCompletionPanel, { props });
    expect(screen.queryByRole('button', { name: /Mark event as completed/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Event completion' })).not.toBeInTheDocument();
  });
  it('waits for the session before showing anything', () => {
    session.loading = true; stubApi({});
    render(EventCompletionPanel, { props });
    expect(screen.queryByRole('heading', { name: 'Event completion' })).not.toBeInTheDocument();
  });
  it('KAN-10-AC2 completes the event, shows who and when, and tells the page to refresh', async () => {
    const api = stubApi({ 'POST /api/events/event-one/complete': { body: { completion } } });
    const view = render(EventCompletionPanel, { props });
    await fireEvent.click(screen.getByRole('checkbox')); await fireEvent.click(button());
    expect(await screen.findByText(/This event was marked completed/)).toBeInTheDocument();
    expect(screen.getByText(/by Casey/)).toBeInTheDocument();
    expect(screen.getByText(/Equipment reservations released/).closest('p')).toHaveTextContent('Equipment reservations released: 2');
    expect(api.writes()).toEqual([{ key: 'POST /api/events/event-one/complete', body: {} }]);
    expect(view.emitted('changed')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Mark event as completed/ })).not.toBeInTheDocument();
  });
  it('prevents a second submit while one is in flight', async () => {
    let release!: () => void;
    const api = stubApi({ 'POST /api/events/event-one/complete': () => new Promise(resolve => { release = () => resolve({ body: { completion } }); }) });
    render(EventCompletionPanel, { props });
    await fireEvent.click(screen.getByRole('checkbox')); await fireEvent.click(button());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Completing…' })).toBeDisabled());
    await fireEvent.click(screen.getByRole('button', { name: 'Completing…' }));
    expect(api.writes()).toHaveLength(1);
    release(); await screen.findByText(/marked completed/);
  });
  it.each([
    [409, 'EVENT_NOT_ENDED', 'This event has not ended yet.'], [409, 'EVENT_ALREADY_COMPLETED', 'This event has already been marked completed.'],
    [404, 'EVENT_REQUEST_NOT_FOUND', 'The event request was not found.'],
  ])('KAN-10-AC5 shows the refusal (%s %s), clears the confirmation and asks the page to refresh', async (status, code, message) => {
    stubApi({ 'POST /api/events/event-one/complete': apiError(status, code, message) });
    const view = render(EventCompletionPanel, { props });
    await fireEvent.click(screen.getByRole('checkbox')); await fireEvent.click(button());
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(button()).toBeDisabled();
    expect(view.emitted('changed')).toHaveLength(1);
  });
  it('shows a generic message for a network failure and does not refresh', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const view = render(EventCompletionPanel, { props });
    await fireEvent.click(screen.getByRole('checkbox')); await fireEvent.click(button());
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    expect(view.emitted('changed')).toBeUndefined();
  });
  it('signs the person out locally on a 401', async () => {
    stubApi({ 'POST /api/events/event-one/complete': apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in.') });
    render(EventCompletionPanel, { props });
    await fireEvent.click(screen.getByRole('checkbox')); await fireEvent.click(button());
    await waitFor(() => expect(session.user).toBeNull());
  });
  it('KAN-10-AC3 shows the saved completion to the organiser and to the coordinator after a refresh', async () => {
    for (const user of [organiser, coordinator]) {
      cleanup(); session.user = { ...user };
      const api = stubApi({ 'GET /api/events/event-one/completion': { body: { completion } } });
      render(EventCompletionPanel, { props: { ...props, status: 'COMPLETED' } });
      expect(await screen.findByText(/This event was marked completed/)).toBeInTheDocument();
      expect(api.calls[0]?.key).toBe('GET /api/events/event-one/completion');
      expect(screen.queryByRole('button', { name: /Mark event as completed/ })).not.toBeInTheDocument();
      if (user === organiser) expect(screen.queryByText(/Equipment reservations released/)).not.toBeInTheDocument();
    }
  });
  it('says the event is completed when no outcome details are available, and explains a failed load', async () => {
    stubApi({ 'GET /api/events/event-one/completion': { body: { completion: null } } });
    render(EventCompletionPanel, { props: { ...props, status: 'COMPLETED' } });
    expect(await screen.findByText('This event is completed.')).toBeInTheDocument();
    cleanup();
    stubApi({ 'GET /api/events/event-one/completion': apiError(500, 'X', 'Server down') });
    render(EventCompletionPanel, { props: { ...props, status: 'COMPLETED' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
  });
  it('clears the confirmation and any message when the event or its revision changes', async () => {
    stubApi({});
    const view = render(EventCompletionPanel, { props: { ...props, revision: 1 } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await view.rerender({ ...props, revision: 2 });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await fireEvent.click(screen.getByRole('checkbox'));
    await view.rerender({ ...props, eventRequestId: 'event-two', revision: 2 });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('omits the end hint when the event has no end time', () => {
    stubApi({});
    render(EventCompletionPanel, { props: { ...props, endsAt: null } });
    expect(screen.queryByText(/It ends at/)).not.toBeInTheDocument();
  });
});
