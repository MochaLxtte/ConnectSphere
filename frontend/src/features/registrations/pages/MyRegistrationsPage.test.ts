import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession } from '../../auth/session.js';
import type { MyRegistration } from '../api/registrations';
import { calls, errorResponse, jsonResponse, renderAt, user } from '../test-helpers';
import MyRegistrationsPage from './MyRegistrationsPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: ReturnType<typeof user> | null; loading: boolean };
const renderPage = () => renderAt(MyRegistrationsPage, '/registrations');

function registration(id: string, overrides: Partial<MyRegistration> = {}, event: Partial<MyRegistration['event']> = {}): MyRegistration {
  return {
    registrationId: `registration-${id}`, eventRequestId: `event-${id}`, status: 'REGISTERED',
    registeredAt: '2026-09-17T17:30:00Z', withdrawnAt: null, ...overrides,
    event: {
      id: `event-${id}`, name: `Event ${id}`, status: 'APPROVED', startsAt: '2026-10-01T02:00:00Z',
      endsAt: '2026-10-01T04:00:00Z', venue: { name: 'Main Hall', location: null }, canWithdraw: true, ...event,
    },
  };
}

beforeEach(() => { session.user = user('ATTENDEE'); });

describe('CF-18 my registrations page', () => {
  it('lists registrations with status, event summary and withdraw only where allowed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [
      registration('a'),
      registration('b', { status: 'WITHDRAWN', withdrawnAt: '2026-09-18T01:00:00Z' }, { canWithdraw: false }),
      registration('c', {}, { status: 'CANCELLED', canWithdraw: true, venue: null }),
      registration('d', {}, { canWithdraw: false }),
    ] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    const rows = within(await screen.findByRole('list', { name: 'Your registrations' })).getAllByRole('listitem');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/registrations/mine');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]!).getByRole('link', { name: 'Event a' })).toHaveAttribute('href', '/browse/event-a');
    expect(rows[0]).toHaveTextContent('Registered');
    expect(rows[0]).toHaveTextContent('Main Hall');
    expect(rows[0]).toHaveTextContent(/1 Oct 2026/);
    expect(within(rows[0]!).getByRole('button', { name: 'Withdraw from Event a' })).toBeEnabled();

    expect(rows[1]).toHaveTextContent('Withdrawn');
    expect(rows[1]).toHaveTextContent(/Withdrawn 18 Sept? 2026/);
    expect(within(rows[1]!).queryByRole('button')).not.toBeInTheDocument();

    // A cancelled event is no longer publicly discoverable, so its name is not a link.
    expect(within(rows[2]!).queryByRole('link')).not.toBeInTheDocument();
    expect(rows[2]).toHaveTextContent('Event cancelled');
    expect(rows[2]).toHaveTextContent('Venue to be confirmed');
    expect(within(rows[3]!).queryByRole('button')).not.toBeInTheDocument();
  });

  it('withdraws after confirmation and re-reads the list', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [registration('a')] }))
      .mockResolvedValueOnce(jsonResponse({ registrationId: 'registration-a', status: 'WITHDRAWN' }))
      .mockResolvedValueOnce(jsonResponse({ items: [
        registration('a', { status: 'WITHDRAWN', withdrawnAt: '2026-09-19T01:00:00Z' }, { canWithdraw: false }),
      ] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Withdraw from Event a' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));

    expect(await screen.findByText('You withdrew from Event a.')).toHaveAttribute('role', 'status');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument());
    expect(calls(fetchMock)).toEqual([
      'GET /api/registrations/mine', 'POST /api/registrations/events/event-a/withdraw', 'GET /api/registrations/mine',
    ]);
  });

  it('reports a withdrawal conflict and refreshes the stale list', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [registration('a')] }))
      .mockResolvedValueOnce(errorResponse(409, 'WITHDRAWAL_CLOSED', 'This event has already started.'))
      .mockResolvedValueOnce(jsonResponse({ items: [registration('a', {}, { canWithdraw: false })] }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Withdraw from Event a' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This event has already started.');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument());
    expect(screen.getByText('Event a')).toBeInTheDocument();
  });

  it('shows an empty state with a way to browse events', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })));
    await renderPage();
    expect(await screen.findByRole('heading', { name: 'No registrations yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Browse events' })[0]).toHaveAttribute('href', '/browse');
  });

  it('retries a failure, then clears data and offers sign-in when the session expires', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(503, 'SERVICE_UNAVAILABLE', 'Service unavailable.'))
      .mockResolvedValueOnce(jsonResponse({ items: [registration('a', {}, { name: 'Private event' })] }))
      .mockResolvedValueOnce(errorResponse(401, 'AUTHENTICATION_REQUIRED'));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Private event');

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view your registrations.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Private event')).not.toBeInTheDocument();
  });

  it('clears the list immediately on sign-out and aborts on unmount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [registration('a', {}, { name: 'Private event' })] }));
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderPage();
    await screen.findByText('Private event');

    session.user = null;
    await waitFor(() => expect(screen.queryByText('Private event')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    view.unmount();
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(true);
  });
});
