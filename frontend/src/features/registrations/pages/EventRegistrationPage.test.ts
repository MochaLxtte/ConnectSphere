import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession } from '../../auth/session.js';
import { calls, errorResponse, jsonResponse, publicEvent, renderAt, user } from '../test-helpers';
import EventRegistrationPage from './EventRegistrationPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: ReturnType<typeof user> | null; loading: boolean };
const renderPage = (id = 'event-1') => renderAt(EventRegistrationPage, `/browse/${id}`, { pattern: '/browse/:id' });

beforeEach(() => { session.user = user('ATTENDEE'); });

describe('CF-18 event registration page', () => {
  it('shows the public details, the registration window and a register button', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(publicEvent({
      registrationOpensAt: '2026-09-01T01:00:00Z', registrationClosesAt: '2026-09-30T01:00:00Z',
    })));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/registrations/events/event-1');
    expect(screen.getByText('Meet employers')).toBeInTheDocument();
    expect(screen.getByText('A public description.')).toBeInTheDocument();
    expect(screen.getByText('Main Hall · Block A')).toBeInTheDocument();
    expect(screen.getByText('12 of 50 places left')).toBeInTheDocument();
    expect(screen.getByText('Opens')).toBeInTheDocument();
    expect(screen.getByText('Closes')).toBeInTheDocument();
    expect(screen.getAllByText(/1 Oct 2026/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Register for Career fair' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Back to events' })).toHaveAttribute('href', '/browse');
  });

  it('registers and re-reads the event without hiding it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(publicEvent()))
      .mockResolvedValueOnce(jsonResponse({ registrationId: 'r1' }, 201))
      .mockResolvedValueOnce(jsonResponse(publicEvent({ myRegistrationStatus: 'REGISTERED', spotsLeft: 11 })));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    await fireEvent.click(await screen.findByRole('button', { name: 'Register for Career fair' }));
    expect(await screen.findByText('You are registered')).toBeInTheDocument();
    expect(screen.getByText('11 of 50 places left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw from Career fair' })).toBeInTheDocument();
    expect(calls(fetchMock)).toEqual([
      'GET /api/registrations/events/event-1', 'POST /api/registrations/events/event-1/register',
      'GET /api/registrations/events/event-1',
    ]);
  });

  it.each([
    ['REGISTRATION_ENDED', 'Closed', 'Registration has closed.'],
    ['EVENT_STARTED', 'Started', 'This event has already started.'],
    ['FULL', 'Full', 'All places have been taken.'],
  ] as const)('explains a %s event and offers no register button', async (closedReason, badge, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(publicEvent({ isOpen: false, closedReason }))));
    await renderPage();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Register/ })).not.toBeInTheDocument();
  });

  it('keeps a registered attendee from withdrawing once the event has started', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(publicEvent({
      isOpen: false, closedReason: 'EVENT_STARTED', myRegistrationStatus: 'REGISTERED',
    }))));
    await renderPage();
    expect(await screen.findByText('This event has started, so you can no longer withdraw.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument();
  });

  it('shows a generic message for an unavailable event without a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(404, 'EVENT_NOT_FOUND', 'The event was not found.')));
    await renderPage('missing');
    expect(await screen.findByRole('alert')).toHaveTextContent('This event is unavailable or is not open for registration.');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('retries a server failure and offers sign-in when the session has expired', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(503, 'SERVICE_UNAVAILABLE', 'Service unavailable.'))
      .mockResolvedValueOnce(jsonResponse(publicEvent({ name: 'Private event' })))
      .mockResolvedValueOnce(errorResponse(401, 'AUTHENTICATION_REQUIRED'));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Private event' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view this event.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Private event')).not.toBeInTheDocument();
  });

  it('loads the new event when the route changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(publicEvent({ name: 'First event' })))
      .mockResolvedValueOnce(jsonResponse(publicEvent({ id: 'event-2', name: 'Second event' })));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await renderPage();
    await screen.findByRole('heading', { name: 'First event' });

    await router.push('/browse/event-2');
    expect(await screen.findByRole('heading', { name: 'Second event' })).toBeInTheDocument();
    expect(screen.queryByText('First event')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/registrations/events/event-2');
  });
});
