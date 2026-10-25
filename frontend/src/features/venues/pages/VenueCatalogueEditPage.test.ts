import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { CatalogueVenue } from '../api/venue-catalogue';
import VenueCatalogueEditPage from './VenueCatalogueEditPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'VENUE_STAFF'): SignedInUser =>
  ({ id: 'staff-1', role, email: 'staff-1@example.test', displayName: 'Staff' });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const apiError = (code: string, message: string, status: number) => json({ error: { code, message } }, status);

const saved: CatalogueVenue = {
  id: 'venue-a', name: 'Harbour Hall', description: 'Main hall', location: 'Block B', capacity: 100,
  layouts: ['Theatre'], facilities: ['Projector'], accessibilityFeatures: ['Ramp'],
  wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00', setupMinutes: 0, turnaroundMinutes: 0,
  updatedAt: '2026-10-01T00:00:00.000Z',
};

/** GET returns the venue; PATCH echoes the saved venue merged with the sent fields unless overridden. */
function stubApi(options: { get?: Response; patch?: (body: Record<string, unknown>) => Response } = {}) {
  const fetchMock = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      return options.patch ? options.patch(body) : json({ venue: { ...saved, ...body } });
    }
    return options.get ?? json({ venue: saved });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const patchCalls = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');

async function renderPage(id = 'venue-a') {
  const router = createRouter({
    history: createMemoryHistory(), routes: [{ path: '/venue-catalogue/:id', component: VenueCatalogueEditPage }],
  });
  await router.push(`/venue-catalogue/${id}`);
  await router.isReady();
  return render(VenueCatalogueEditPage, { global: { plugins: [router] } });
}
const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save changes' });

beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-50 venue edit page: viewing (AC2, AC12)', () => {
  it('shows the current information recorded for the venue', async () => {
    const fetchMock = stubApi();
    await renderPage();
    expect(await screen.findByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
    expect(field('Location').value).toBe('Block B');
    expect(field('Maximum capacity').value).toBe('100');
    expect(field('Facilities').value).toBe('Projector');
    expect(field('Accessibility features').value).toBe('Ramp');
    expect(field('Wheelchair accessible').checked).toBe(true);
    expect(field('Supported room layouts').value).toBe('Theatre');
    expect(field('Opens').value).toBe('08:00');
    expect(field('Closes').value).toBe('22:00');
    expect(screen.getByText('Main hall')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/venues/catalogue/venue-a');
  });

  it('starts with nothing to save', async () => {
    stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
    expect(screen.getByText('There are no changes to save.')).toBeInTheDocument();
  });
});

describe('KAN-50 venue edit page: saving (AC3-AC9, AC11, AC12)', () => {
  it('sends only the changed fields and shows the saved values afterwards', async () => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Location'), 'Level 4');
    await fireEvent.update(field('Maximum capacity'), '150');
    await fireEvent.click(saveButton());

    expect(await screen.findByRole('status')).toHaveTextContent('Venue information saved.');
    expect(patchCalls(fetchMock)).toHaveLength(1);
    expect(JSON.parse(String(patchCalls(fetchMock)[0]![1]!.body))).toEqual({ location: 'Level 4', capacity: 150 });
    expect(field('Location').value).toBe('Level 4');
    expect(field('Maximum capacity').value).toBe('150');
    expect(saveButton()).toBeDisabled();
  });

  it('records more than one supported layout and the other list fields', async () => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Supported room layouts'), 'Theatre\nClassroom\nBanquet');
    await fireEvent.update(field('Facilities'), 'Projector\nMic');
    await fireEvent.update(field('Accessibility features'), '');
    await fireEvent.click(field('Wheelchair accessible'));
    await fireEvent.click(saveButton());

    await screen.findByText('Venue information saved.');
    expect(JSON.parse(String(patchCalls(fetchMock)[0]![1]!.body))).toEqual({
      layouts: ['Theatre', 'Classroom', 'Banquet'], facilities: ['Projector', 'Mic'],
      accessibilityFeatures: [], wheelchairAccessible: false,
    });
  });

  it('updates operating hours and can clear a location and an hour with null', async () => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Opens'), '09:30');
    await fireEvent.update(field('Closes'), '');
    await fireEvent.update(field('Location'), '   ');
    await fireEvent.click(saveButton());
    await screen.findByText('Venue information saved.');
    expect(JSON.parse(String(patchCalls(fetchMock)[0]![1]!.body)))
      .toEqual({ opensAt: '09:30', closesAt: null, location: null });
  });

  it('shows the server-saved values, which may differ from what was typed', async () => {
    stubApi({ patch: () => json({ venue: { ...saved, layouts: ['Theatre', 'Banquet'] } }) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Supported room layouts'), 'theatre\nBanquet\nBANQUET');
    await fireEvent.click(saveButton());
    await screen.findByText('Venue information saved.');
    expect(field('Supported room layouts').value).toBe('Theatre\nBanquet');
  });

  it('discards unsaved edits and restores the saved values', async () => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Location'), 'Somewhere else');
    expect(saveButton()).toBeEnabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(field('Location').value).toBe('Block B');
    expect(saveButton()).toBeDisabled();
    expect(patchCalls(fetchMock)).toHaveLength(0);
  });

  it('disables the form while saving to prevent a double submit', async () => {
    let release: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn(async (_path: string, init?: RequestInit) => init?.method === 'PATCH'
      ? new Promise<Response>((resolve) => { release = resolve; })
      : json({ venue: saved }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Location'), 'Level 9');
    await fireEvent.click(saveButton());
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(field('Location')).toBeDisabled();
    release(json({ venue: { ...saved, location: 'Level 9' } }));
    await screen.findByText('Venue information saved.');
    expect(patchCalls(fetchMock)).toHaveLength(1);
  });
});

describe('KAN-50 venue edit page: validation and failures', () => {
  it.each(['0', '-3', '1.5', 'abc', ''])('refuses capacity %j without calling the server', async (capacity) => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Maximum capacity'), capacity);
    expect(await screen.findByText(/Enter a whole number from 1 to/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(patchCalls(fetchMock)).toHaveLength(0);
  });

  it('explains an over-long location, accessibility entry and layout entry next to each field', async () => {
    stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Location'), 'a'.repeat(201));
    await fireEvent.update(field('Accessibility features'), 'b'.repeat(101));
    await fireEvent.update(field('Supported room layouts'), 'c'.repeat(101));
    expect(await screen.findByText('Location must be at most 200 characters.')).toBeInTheDocument();
    expect(screen.getAllByText('Each entry must be at most 100 characters.')).toHaveLength(2);
    expect(saveButton()).toBeDisabled();
  });

  it('shows no description line when the venue has none', async () => {
    stubApi({ get: json({ venue: { ...saved, description: null } }) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(screen.queryByText('Main hall')).not.toBeInTheDocument();
  });

  it('falls back to a generic message when a save fails with something other than an Error', async () => {
    vi.resetModules();
    vi.doMock('../api/venue-catalogue', () => ({
      fetchCatalogueVenue: vi.fn().mockResolvedValue(saved),
      updateCatalogueVenue: vi.fn().mockRejectedValue('unexpected'),
    }));
    const { authSession: fresh } = await import('../../auth/session.js');
    (fresh as { user: SignedInUser | null }).user = user();
    const { default: Page } = await import('./VenueCatalogueEditPage.vue');
    const router = createRouter({
      history: createMemoryHistory(), routes: [{ path: '/venue-catalogue/:id', component: Page }],
    });
    await router.push('/venue-catalogue/venue-a');
    await router.isReady();
    render(Page, { global: { plugins: [router] } });
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Location'), 'Level 4');
    await fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('The changes could not be saved.');
    vi.doUnmock('../api/venue-catalogue');
  });

  it('refuses a closing time that is not after the opening time', async () => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Closes'), '07:00');
    expect(await screen.findByText('Closing time must be after opening time.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(patchCalls(fetchMock)).toHaveLength(0);
  });

  it('refuses more than 30 distinct entries in a list', async () => {
    stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Facilities'), Array.from({ length: 31 }, (_, i) => `Item ${i}`).join('\n'));
    expect(await screen.findByText('Enter at most 30 facilities.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('shows a server validation message and keeps what was typed so it can be corrected', async () => {
    stubApi({ patch: () => apiError('INVALID_VENUE_CATALOGUE_INPUT', 'closesAt must be after opensAt.', 400) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Location'), 'Level 4');
    await fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('closesAt must be after opensAt.');
    expect(field('Location').value).toBe('Level 4');
    expect(saveButton()).toBeEnabled();
  });

  it('explains when the venue became inactive while editing and keeps the form for reference', async () => {
    stubApi({ patch: () => apiError('VENUE_INACTIVE', 'This venue is no longer active.', 409) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Maximum capacity'), '90');
    await fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('This venue is no longer active.');
    expect(screen.queryByText('Venue information saved.')).not.toBeInTheDocument();
  });

  it('shows a clear message with a way back when the venue is not in the active catalogue', async () => {
    stubApi({ get: apiError('VENUE_NOT_FOUND', 'The venue was not found in the active catalogue.', 404) });
    await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('This venue is not in the active catalogue.');
    expect(screen.getByRole('link', { name: 'Back to the catalogue' })).toHaveAttribute('href', '/venue-catalogue');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('offers a retry after a load failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiError('INTERNAL_ERROR', 'An unexpected error occurred.', 500))
      .mockResolvedValueOnce(json({ venue: saved }));
    vi.stubGlobal('fetch', fetchMock);
    await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
  });

  it('signs the user out locally when loading finds the session has expired', async () => {
    stubApi({ get: apiError('AUTHENTICATION_REQUIRED', 'Sign in to maintain the venue catalogue.', 401) });
    await renderPage();
    await waitFor(() => expect(session.user).toBeNull());
  });

  it('ignores a response or a failure that arrives after the page has been left', async () => {
    let settle: (response: Response) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { settle = resolve; })));
    const first = await renderPage();
    first.unmount();
    settle(json({ venue: saved }));
    let fail: (reason: Error) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((_resolve, reject) => { fail = reject; })));
    const second = await renderPage();
    second.unmount();
    fail(new Error('network down'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Harbour Hall' })).not.toBeInTheDocument();
  });

  it('falls back to a generic message when something other than an Error is thrown', async () => {
    vi.resetModules();
    vi.doMock('../api/venue-catalogue', () => ({ fetchCatalogueVenue: vi.fn().mockRejectedValue('unexpected') }));
    const { authSession: fresh } = await import('../../auth/session.js');
    (fresh as { user: SignedInUser | null }).user = user();
    const { default: Page } = await import('./VenueCatalogueEditPage.vue');
    const router = createRouter({
      history: createMemoryHistory(), routes: [{ path: '/venue-catalogue/:id', component: Page }],
    });
    await router.push('/venue-catalogue/venue-a');
    await router.isReady();
    render(Page, { global: { plugins: [router] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('The venue could not be loaded. Please try again.');
    vi.doUnmock('../api/venue-catalogue');
  });

  it('signs the user out locally when saving finds the session has expired', async () => {
    stubApi({ patch: () => apiError('AUTHENTICATION_REQUIRED', 'Sign in to maintain the venue catalogue.', 401) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field('Location'), 'Level 4');
    await fireEvent.click(saveButton());
    await waitFor(() => expect(session.user).toBeNull());
  });
});

describe('KAN-50 venue edit page: access (AC14)', () => {
  it.each(['EVENT_COORDINATOR', 'EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'tells %s the catalogue is for venue staff without requesting the venue', async (role) => {
      session.user = user(role);
      const fetchMock = stubApi();
      await renderPage();
      expect(screen.getByRole('alert')).toHaveTextContent('The venue catalogue is for venue staff.');
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('waits for the session to resolve before deciding what to show or request', async () => {
    session.loading = true;
    const fetchMock = stubApi();
    await renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks a signed-out visitor to sign in', async () => {
    session.user = null;
    const fetchMock = stubApi();
    await renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to maintain the venue catalogue.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('KAN-77 venue edit page: buffer durations', () => {
  it('KAN-78 displays affected booking warnings returned by a buffer save', async () => {
    stubApi({ patch: () => json({ venue: { ...saved, setupMinutes: 30,
      affectedBookings: [{ id: 'booking-1', warnings: ['APPROVED_BOOKING_OVERLAP'] }] } }) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(screen.getByLabelText(/Setup before each booking/), '30');
    await fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByRole('link', { name: 'Review affected booking' })).toHaveAttribute('href', '/venue-bookings/booking-1'));
    expect(screen.getByLabelText('Affected bookings')).toHaveTextContent('APPROVED_BOOKING_OVERLAP');
  });
  it('shows the saved buffers and saves a changed one with its loaded value (AC4, AC5)', async () => {
    const fetchMock = stubApi({ get: json({ venue: { ...saved, setupMinutes: 15, turnaroundMinutes: 30 } }) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    expect(field(/Setup before each booking/).value).toBe('15');
    expect(field(/Turnaround after each booking/).value).toBe('30');

    await fireEvent.update(field(/Setup before each booking/), '45');
    await fireEvent.click(saveButton());

    expect(await screen.findByRole('status')).toHaveTextContent('Venue information saved.');
    expect(JSON.parse(String(patchCalls(fetchMock)[0]![1]!.body))).toEqual({ setupMinutes: 45, expectedSetupMinutes: 15 });
    expect(field(/Setup before each booking/).value).toBe('45');
  });

  it.each(['', '-5', '1441', '2.5'])('refuses %j without sending anything (AC2)', async (minutes) => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field(/Turnaround after each booking/), minutes);

    expect(await screen.findByText('Enter a whole number of minutes from 0 to 1440.')).toBeInTheDocument();
    expect(field(/Turnaround after each booking/)).toHaveAttribute('aria-invalid', 'true');
    expect(saveButton()).toBeDisabled();
    expect(patchCalls(fetchMock)).toHaveLength(0);
  });

  it('explains a stale buffer conflict, keeps the typed value and reloads on request (AC5)', async () => {
    const fetchMock = stubApi({
      patch: () => json({ error: { code: 'VENUE_BUFFER_CONFLICT', message: 'Another change was saved.' } }, 409),
    });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field(/Setup before each booking/), '20');
    await fireEvent.click(saveButton());

    expect(await screen.findByText(/Someone else changed the setup or turnaround time/)).toBeInTheDocument();
    expect(field(/Setup before each booking/).value).toBe('20');
    fetchMock.mockImplementation(async () => json({ venue: { ...saved, setupMinutes: 35 } }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reload current values' }));

    await waitFor(() => expect(field(/Setup before each booking/).value).toBe('35'));
    expect(screen.queryByText(/Someone else changed/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload current values' })).not.toBeInTheDocument();
  });

  it('shows other save errors without the reload prompt', async () => {
    stubApi({ patch: () => json({ error: { code: 'VENUE_INACTIVE', message: 'This venue is no longer active.' } }, 409) });
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field(/Setup before each booking/), '20');
    await fireEvent.click(saveButton());

    expect(await screen.findByText('This venue is no longer active.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload current values' })).not.toBeInTheDocument();
  });
});

describe('KAN-77 venue edit page: setup validation', () => {
  it('explains an invalid setup time next to its field and keeps the save disabled (AC2)', async () => {
    const fetchMock = stubApi();
    await renderPage();
    await screen.findByRole('heading', { name: 'Harbour Hall' });
    await fireEvent.update(field(/Setup before each booking/), '-1');

    expect(field(/Setup before each booking/)).toHaveAttribute('aria-invalid', 'true');
    expect(field(/Setup before each booking/)).toHaveAccessibleDescription('Enter a whole number of minutes from 0 to 1440.');
    expect(field(/Turnaround after each booking/)).toHaveAttribute('aria-invalid', 'false');
    expect(saveButton()).toBeDisabled();
    expect(patchCalls(fetchMock)).toHaveLength(0);
  });
});
