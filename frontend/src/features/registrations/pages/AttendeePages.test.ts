import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { router as appRouter } from '../../../app/router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session';
import type { AttendeeEventDetail, AttendeeEventSummary, OwnRegistrationSummary } from '../api/attendee-events';

vi.mock('../../auth/session', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'ATTENDEE', id = 'att-a'): SignedInUser => ({ id, role, email: `${id}@example.test`, displayName: id });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const apiError = (status: number, code = 'REQUEST_FAILED', message = 'Temporary failure') => json({ error: { code, message } }, status);
const open = { canRegister: true, reason: null, message: 'Registration is open.', placesRemaining: 3 };
const conditions = { required: true, opensAt: '2026-10-01T02:00:00.000Z', closesAt: '2031-01-10T02:00:00.000Z', capacity: 10, placesRemaining: 3 };
const summary = (over: Partial<AttendeeEventSummary> = {}): AttendeeEventSummary => ({ id: 'e1', name: 'Career fair', startsAt: '2031-01-12T02:00:00.000Z',
  endsAt: '2031-01-12T06:00:00.000Z', registration: conditions, ownStatus: null, availability: open, ...over });
const mine = (over: Partial<OwnRegistrationSummary> = {}): OwnRegistrationSummary => ({ id: 'r1', status: 'REGISTERED', registeredAt: '2026-10-29T03:00:00.000Z', withdrawnAt: null,
  event: { id: 'e1', name: 'Career fair', startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z', status: 'CONFIRMED' }, ...over });
const detail = (over: Partial<AttendeeEventDetail> = {}): AttendeeEventDetail => ({
  event: { id: 'e1', name: 'Career fair', purpose: 'Meet employers', description: 'A full day programme.', startsAt: '2031-01-12T02:00:00.000Z',
    endsAt: '2031-01-12T06:00:00.000Z', accessibilityNeeds: 'Step-free entrance', status: 'CONFIRMED',
    venues: [{ name: 'Harbour Hall', location: 'Level 2', startsAt: '2031-01-12T02:00:00.000Z', endsAt: '2031-01-12T06:00:00.000Z' }], registration: conditions },
  registration: null, availability: open, ...over,
});
const registered = (): AttendeeEventDetail => detail({ registration: { id: 'r1', status: 'REGISTERED', registeredAt: '2026-10-29T03:00:00.000Z', withdrawnAt: null },
  availability: { canRegister: false, reason: 'ALREADY_REGISTERED', message: 'You are already registered for this event.', placesRemaining: 2 } });

function stub(options: { events?: AttendeeEventSummary[]; mine?: OwnRegistrationSummary[]; detail?: () => Response; post?: () => Response | Promise<Response> } = {}) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return options.post ? options.post() : json({ ...registered(), changed: true }, 201);
    if (url === '/api/attendee/events') return json({ items: options.events ?? [summary()] });
    if (url === '/api/attendee/registrations') return json({ items: options.mine ?? [] });
    return options.detail ? options.detail() : json(detail());
  });
  vi.stubGlobal('fetch', fetch); return fetch;
}
async function visit(url: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: appRouter.options.routes });
  await router.push(url); await router.isReady();
  return { ...render(RouterView, { global: { plugins: [router] } }), router };
}
beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-14-AC101 attendee-only access and session isolation', () => {
  for (const url of ['/attend', '/attend/e1']) {
    it.each(['EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF'] as const)(`denies %s at ${url} before fetching`, async role => {
      session.user = user(role); const fetch = stub(); await visit(url);
      expect(screen.getByRole('heading', { name: 'Attendee access only' })).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
    it(`asks a signed-out visitor to sign in, and waits for session restoration, at ${url}`, async () => {
      session.loading = true; const fetch = stub(); await visit(url);
      expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
      cleanup(); session.loading = false; session.user = null; await visit(url);
      expect(screen.getByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  }
  it('reloads for a different attendee and signs out locally on a 401', async () => {
    stub({ mine: [mine()] }); await visit('/attend');
    expect(await screen.findByRole('list', { name: 'My registrations' })).toBeInTheDocument();
    session.user = user('ATTENDEE', 'att-b');
    await waitFor(() => expect(screen.getAllByRole('status').length + screen.queryAllByRole('list').length).toBeGreaterThan(0));
    cleanup();
    vi.stubGlobal('fetch', vi.fn(async () => apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in.')));
    await visit('/attend');
    await waitFor(() => expect(session.user).toBeNull());
  });
});

describe('KAN-14-AC1/AC4 the events page', () => {
  it('lists open events with their state and places, and the attendee\'s own registrations', async () => {
    stub({ events: [summary(), summary({ id: 'e2', name: '  ', ownStatus: 'REGISTERED', registration: { ...conditions, capacity: null, placesRemaining: null },
      availability: { canRegister: false, reason: 'ALREADY_REGISTERED', message: 'You are already registered for this event.', placesRemaining: null } }),
    summary({ id: 'e3', name: 'Quiz night', registration: { ...conditions, placesRemaining: 1 }, availability: { canRegister: false, reason: 'CLOSED', message: 'Registration for this event has closed.', placesRemaining: 1 } })],
    mine: [mine(), mine({ id: 'r2', status: 'WITHDRAWN', event: { id: 'e9', name: null, startsAt: null, endsAt: null, status: 'COMPLETED' } })] });
    await visit('/attend');
    const open = await screen.findByRole('list', { name: 'Events open for registration' });
    expect(within(open).getByText('Career fair')).toBeInTheDocument();
    expect(within(open).getByText('Registration open')).toBeInTheDocument();
    expect(within(open).getByText('3 places left')).toBeInTheDocument();
    expect(within(open).getByText('1 place left')).toBeInTheDocument();
    expect(within(open).getByText('You are registered')).toBeInTheDocument();
    expect(within(open).getByText('Untitled event')).toBeInTheDocument();
    expect(within(open).getByText('Registration for this event has closed.')).toBeInTheDocument();
    const own = screen.getByRole('list', { name: 'My registrations' });
    expect(within(own).getByText('Registered')).toBeInTheDocument();
    expect(within(own).getByText('Withdrawn')).toBeInTheDocument();
    expect(within(own).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/attend/e1', '/attend/e9']);
  });
  it('explains an empty state, a denied read and a failed load with a retry, and refreshes on request', async () => {
    stub({ events: [], mine: [] }); await visit('/attend');
    expect(await screen.findByText('No events are open for registration right now.')).toBeInTheDocument();
    expect(screen.getByText('You have not registered for any event yet.')).toBeInTheDocument();
    cleanup();
    vi.stubGlobal('fetch', vi.fn(async () => apiError(403, 'ACTION_FORBIDDEN', 'No.'))); await visit('/attend');
    expect(await screen.findByText(/unavailable or you do not have permission/)).toBeInTheDocument();
    cleanup();
    const failing = vi.fn(async (url: string) => failing.mock.calls.length <= 2 ? apiError(500, 'X', 'Server down') : json({ items: url.endsWith('events') ? [summary()] : [] }));
    vi.stubGlobal('fetch', failing); await visit('/attend');
    expect(await screen.findByText('Server down')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Career fair')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(failing.mock.calls.length).toBeGreaterThan(4));
  });
});

describe('KAN-14 the event page and registering', () => {
  it('KAN-14-AC1/AC101 shows the details, the venue, the conditions and no personal-data form', async () => {
    stub(); await visit('/attend/e1');
    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
    expect(screen.getByText(/Meet employers/)).toBeInTheDocument();
    expect(screen.getByText('A full day programme.')).toBeInTheDocument();
    expect(screen.getByText(/Harbour Hall · Level 2/)).toBeInTheDocument();
    expect(screen.getByText(/Step-free entrance/)).toBeInTheDocument();
    const conditionsList = screen.getByRole('list', { name: 'Registration conditions' });
    expect(conditionsList).toHaveTextContent('Opens 1 Oct 2026'); expect(conditionsList).toHaveTextContent('Closes 10 Jan 2031');
    expect(conditionsList).toHaveTextContent('3 of 10 places left'); expect(conditionsList).toHaveTextContent('No extra personal details are needed');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register for this event' })).toBeEnabled();
  });
  it('says so when the venue is not confirmed and when there is no limit, and omits missing optional details', async () => {
    stub({ detail: () => json(detail({ event: { ...detail().event, venues: [], purpose: null, description: null, accessibilityNeeds: null, name: null,
      registration: { ...conditions, opensAt: null, closesAt: null, capacity: null, placesRemaining: null } } })) });
    await visit('/attend/e1');
    expect(await screen.findByText(/The venue has not been confirmed yet/)).toBeInTheDocument();
    expect(screen.getByText('There is no limit on places.')).toBeInTheDocument();
    expect(screen.queryByText(/Opens /)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Event' })).toBeInTheDocument();
  });
  it('KAN-14-AC3 registers with an empty body, confirms it and shows the attendee\'s own status', async () => {
    const fetch = stub(); await visit('/attend/e1');
    await fireEvent.click(await screen.findByRole('button', { name: 'Register for this event' }));
    expect(await screen.findByText('You are registered. We have saved your place.')).toBeInTheDocument();
    const post = fetch.mock.calls.find(call => call[1]?.method === 'POST')!;
    expect(post[0]).toBe('/api/attendee/events/e1/register'); expect(post[1]!.body).toBe('{}');
    expect(screen.getByText(/Your registration:/)).toHaveTextContent('Registered since 29 Oct 2026');
    expect(screen.queryByRole('button', { name: 'Register for this event' })).not.toBeInTheDocument();
    expect(screen.getByText(/2 of 10 places left|3 of 10 places left/)).toBeInTheDocument();
  });
  it('KAN-14-AC4 shows an existing registration, and a withdrawn one, after a reload', async () => {
    stub({ detail: () => json(registered()) }); await visit('/attend/e1');
    expect(await screen.findByText(/Your registration:/)).toHaveTextContent('Registered');
    expect(screen.queryByRole('button', { name: 'Register for this event' })).not.toBeInTheDocument();
    expect(screen.queryByText('You are already registered for this event.')).not.toBeInTheDocument();
    cleanup();
    stub({ detail: () => json(detail({ registration: { id: 'r1', status: 'WITHDRAWN', registeredAt: '2026-10-01T00:00:00.000Z', withdrawnAt: '2026-10-02T00:00:00.000Z' } })) });
    await visit('/attend/e1');
    expect(await screen.findByText(/Your registration:/)).toHaveTextContent('Withdrawn');
    expect(screen.getByRole('button', { name: 'Register for this event' })).toBeEnabled();
  });
  it.each([
    ['full', { canRegister: false, reason: 'FULL', message: 'This event is full.', placesRemaining: 0 }],
    ['closed', { canRegister: false, reason: 'CLOSED', message: 'Registration for this event has closed.', placesRemaining: 4 }],
    ['not yet open', { canRegister: false, reason: 'NOT_YET_OPEN', message: 'Registration for this event has not opened yet.', placesRemaining: 4 }],
    ['not taking registrations', { canRegister: false, reason: 'REGISTRATION_DISABLED', message: 'This event does not take registrations.', placesRemaining: null }],
  ])('KAN-14-AC6 explains a %s event and offers no button', async (_name, availability) => {
    stub({ detail: () => json(detail({ availability: availability as never })) }); await visit('/attend/e1');
    expect(await screen.findByText(availability.message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register for this event' })).not.toBeInTheDocument();
  });
  it('KAN-14-AC5/AC6 shows the refusal when the event filled meanwhile, and reloads the current state', async () => {
    let reads = 0;
    const fetch = stub({ detail: () => (reads++ === 0 ? json(detail()) : json(detail({ availability: { canRegister: false, reason: 'FULL', message: 'This event is full.', placesRemaining: 0 } }))),
      post: () => apiError(409, 'REGISTRATION_FULL', 'This event is full.') });
    await visit('/attend/e1');
    await fireEvent.click(await screen.findByRole('button', { name: 'Register for this event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This event is full.');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Register for this event' })).not.toBeInTheDocument());
    expect(fetch.mock.calls.filter(call => call[1]?.method !== 'POST' && String(call[0]).endsWith('/e1'))).toHaveLength(2);
  });
  it('shows a connection failure without losing the button, and signs out locally on a 401', async () => {
    stub({ post: () => { throw new Error('offline'); } }); await visit('/attend/e1');
    await fireEvent.click(await screen.findByRole('button', { name: 'Register for this event' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register for this event' })).toBeEnabled();
    cleanup();
    stub({ post: () => apiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in.') }); await visit('/attend/e1');
    await fireEvent.click(await screen.findByRole('button', { name: 'Register for this event' }));
    await waitFor(() => expect(session.user).toBeNull());
  });
  it('prevents a second registration while one is in flight', async () => {
    let release!: (response: Response) => void;
    const fetch = stub({ post: () => new Promise<Response>(resolve => { release = resolve; }) }); await visit('/attend/e1');
    await fireEvent.click(await screen.findByRole('button', { name: 'Register for this event' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registering…' })).toBeDisabled());
    await fireEvent.click(screen.getByRole('button', { name: 'Registering…' }));
    expect(fetch.mock.calls.filter(call => call[1]?.method === 'POST')).toHaveLength(1);
    release(json({ ...registered(), changed: true }, 201));
    await screen.findByText(/You are registered/);
  });
  it('treats an unavailable event as unavailable, retries a server failure and offers nothing to retry for a missing event', async () => {
    stub({ detail: () => apiError(404, 'EVENT_NOT_FOUND', 'The event was not found.') }); await visit('/attend/e1');
    expect(await screen.findByText('This event is unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    cleanup();
    let tries = 0;
    stub({ detail: () => (tries++ === 0 ? apiError(500, 'X', 'Server down') : json(detail())) }); await visit('/attend/e1');
    expect(await screen.findByText('Server down')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
  });
  it('ignores a registration that finishes after the attendee opened another event', async () => {
    let release!: (response: Response) => void;
    stub({ post: () => new Promise<Response>(resolve => { release = resolve; }) });
    const view = await visit('/attend/e1');
    await fireEvent.click(await screen.findByRole('button', { name: 'Register for this event' }));
    await view.router.push('/attend/e2');
    await screen.findByRole('button', { name: 'Register for this event' });
    release(json({ ...registered(), changed: true }, 201));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('You are registered. We have saved your place.')).not.toBeInTheDocument();
  });
});
