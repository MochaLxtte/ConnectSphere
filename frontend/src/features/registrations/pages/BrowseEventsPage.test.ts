import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession } from '../../auth/session.js';
import { calls, deferredResponse, errorResponse, flush, jsonResponse, publicEvent, renderAt, user } from '../test-helpers';
import BrowseEventsPage from './BrowseEventsPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: ReturnType<typeof user> | null; loading: boolean };
const renderPage = () => renderAt(BrowseEventsPage, '/browse');

beforeEach(() => { session.user = user('ATTENDEE'); });

describe('CF-18 browse events page', () => {
  it('shows open, full, not-yet-open and registered events with the right controls', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading events…');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/registrations/events');

    pending.resolve(jsonResponse({ items: [
      publicEvent({ id: 'open', name: 'Open event' }),
      publicEvent({ id: 'full', name: 'Full event', isOpen: false, closedReason: 'FULL', spotsLeft: 0, registeredCount: 50 }),
      publicEvent({ id: 'soon', name: 'Soon event', isOpen: false, closedReason: 'NOT_OPEN_YET', registrationOpensAt: '2026-09-25T01:00:00Z' }),
      publicEvent({ id: 'mine', name: 'My event', myRegistrationStatus: 'REGISTERED', registrationCapacity: null, spotsLeft: null, venue: null }),
    ] }));
    const rows = within(await screen.findByRole('list', { name: 'Events with registration' })).getAllByRole('listitem');
    expect(rows).toHaveLength(4);

    expect(within(rows[0]!).getByRole('link', { name: 'Open event' })).toHaveAttribute('href', '/browse/open');
    expect(rows[0]).toHaveTextContent('Open');
    expect(rows[0]).toHaveTextContent('12 of 50 places left');
    expect(rows[0]).toHaveTextContent('Main Hall · Block A');
    expect(within(rows[0]!).getByRole('button', { name: 'Register for Open event' })).toBeEnabled();

    expect(rows[1]).toHaveTextContent('Full');
    expect(rows[1]).toHaveTextContent('All places have been taken.');
    expect(within(rows[1]!).queryByRole('button')).not.toBeInTheDocument();

    expect(rows[2]).toHaveTextContent('Opens soon');
    expect(rows[2]).toHaveTextContent(/Registration opens on 25 Sept? 2026/);

    expect(rows[3]).toHaveTextContent('You are registered');
    expect(rows[3]).toHaveTextContent('38 registered · no limit');
    expect(rows[3]).toHaveTextContent('Venue to be confirmed');
    expect(within(rows[3]!).getByRole('button', { name: 'Withdraw from My event' })).toBeInTheDocument();
  });

  it('registers, keeps the list visible and re-reads the counts from the server', async () => {
    const register = deferredResponse();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent()] }))
      .mockReturnValueOnce(register.promise)
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent({ myRegistrationStatus: 'REGISTERED', spotsLeft: 11, registeredCount: 39 })] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Register for Career fair' }));
    const button = screen.getByRole('button', { name: 'Register for Career fair' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Registering…');
    await fireEvent.click(button);

    register.resolve(jsonResponse({ registrationId: 'r1', eventRequestId: 'event-1', status: 'REGISTERED' }, 201));
    expect(await screen.findByText('You are registered')).toBeInTheDocument();
    expect(screen.getByText('You are registered for this event.')).toHaveAttribute('role', 'status');
    expect(screen.getByText('11 of 50 places left')).toBeInTheDocument();
    expect(calls(fetchMock)).toEqual([
      'GET /api/registrations/events', 'POST /api/registrations/events/event-1/register', 'GET /api/registrations/events',
    ]);
  });

  it('explains a full event after losing the last place and refreshes the row', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent({ spotsLeft: 1 })] }))
      .mockResolvedValueOnce(errorResponse(409, 'REGISTRATION_FULL', 'This event is full.'))
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent({ isOpen: false, closedReason: 'FULL', spotsLeft: 0 })] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Register for Career fair' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This event is full.');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Register for Career fair' })).not.toBeInTheDocument());
    expect(screen.getByText('All places have been taken.')).toBeInTheDocument();
  });

  it('asks for confirmation before withdrawing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent({ myRegistrationStatus: 'REGISTERED' })] }))
      .mockResolvedValueOnce(jsonResponse({ registrationId: 'r1', eventRequestId: 'event-1', status: 'WITHDRAWN' }))
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent({ myRegistrationStatus: 'WITHDRAWN' })] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Withdraw from Career fair' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Keep my place' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByRole('button', { name: 'Withdraw from Career fair' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
    expect(await screen.findByRole('button', { name: 'Register for Career fair' })).toHaveTextContent('Register again');
    expect(screen.getByText('Your registration was withdrawn.')).toBeInTheDocument();
    expect(calls(fetchMock)[1]).toBe('POST /api/registrations/events/event-1/withdraw');
  });

  it('lets other roles browse without offering registration', async () => {
    session.user = user('EVENT_ORGANISER');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [publicEvent()] })));
    await renderPage();
    expect(await screen.findByText('Only attendee accounts can register for events.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Register/ })).not.toBeInTheDocument();
  });

  it('shows an empty state, and retries after a failure', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network failure'))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No events are open for registration' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('removes events and offers sign-in when the session expires, including during an action', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent({ name: 'Private event' })] }))
      .mockResolvedValueOnce(errorResponse(401, 'AUTHENTICATION_REQUIRED'));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    await fireEvent.click(await screen.findByRole('button', { name: 'Register for Private event' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to browse events.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Private event')).not.toBeInTheDocument();
    expect(session.user).toBeNull();
  });

  it('aborts on unmount and ignores the previous account\'s response', async () => {
    const pending = deferredResponse();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(jsonResponse({ items: [publicEvent({ name: 'New account event' })] }));
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderPage();
    const firstSignal = (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;

    session.user = user('ATTENDEE', 'user-2');
    expect(await screen.findByText('New account event')).toBeInTheDocument();
    expect(firstSignal?.aborted).toBe(true);
    pending.resolve(jsonResponse({ items: [publicEvent({ name: 'Old account event' })] }));
    await flush();
    expect(screen.queryByText('Old account event')).not.toBeInTheDocument();

    view.unmount();
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).signal?.aborted).toBe(true);
  });
});
