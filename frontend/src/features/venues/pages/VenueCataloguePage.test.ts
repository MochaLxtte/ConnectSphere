import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { CatalogueVenue } from '../api/venue-catalogue';
import VenueCataloguePage from './VenueCataloguePage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'VENUE_STAFF'): SignedInUser =>
  ({ id: 'staff-1', role, email: 'staff-1@example.test', displayName: 'Staff' });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const venue = (overrides: Partial<CatalogueVenue> = {}): CatalogueVenue => ({
  id: 'venue-a', name: 'Harbour Hall', description: null, location: 'Block B', capacity: 200,
  layouts: ['Theatre', 'Classroom'], facilities: ['Projector'], accessibilityFeatures: [],
  wheelchairAccessible: true, opensAt: '08:00', closesAt: '22:00', updatedAt: '2026-10-01T00:00:00.000Z', ...overrides,
});

function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: VenueCataloguePage }],
  });
  return render(VenueCataloguePage, { global: { plugins: [router] } });
}

beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-50 venue catalogue list page (AC1, AC14)', () => {
  it('lists each venue with its location, capacity, layouts and facilities, and links to its edit page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [
      venue(), venue({ id: 'venue-b', name: 'Studio', location: null, layouts: [], facilities: [] }),
    ] }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading the venue catalogue');
    expect(await screen.findByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
    expect(screen.getByText('Block B · Capacity 200')).toBeInTheDocument();
    expect(screen.getByText('Layouts: Theatre, Classroom')).toBeInTheDocument();
    expect(screen.getByText('Facilities: Projector')).toBeInTheDocument();
    expect(screen.getByText('No location recorded · Capacity 200')).toBeInTheDocument();
    expect(screen.getAllByText('Layouts: None recorded')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Edit Harbour Hall' })).toHaveAttribute('href', '/venue-catalogue/venue-a');
    expect(screen.getByRole('link', { name: 'Edit Studio' })).toHaveAttribute('href', '/venue-catalogue/venue-b');
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/venues/catalogue');
  });

  it('shows an empty state, not an error, when the catalogue has no venues', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ items: [] })));
    renderPage();
    expect(await screen.findByText('No venues are recorded in the catalogue yet.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a retryable error when the catalogue cannot be loaded', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }, 500))
      .mockResolvedValueOnce(json({ items: [venue()] }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Harbour Hall' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['EVENT_COORDINATOR', 'EVENT_ORGANISER', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'tells %s the catalogue is for venue staff without requesting any venue data', (role) => {
      session.user = user(role);
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      renderPage();
      expect(screen.getByRole('alert')).toHaveTextContent('The venue catalogue is for venue staff.');
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('asks a signed-out visitor to sign in without requesting venue data', () => {
    session.user = null;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to maintain the venue catalogue.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for the session to resolve before deciding what to show', () => {
    session.loading = true;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs the user out locally when the server reports an expired session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to maintain the venue catalogue.' } }, 401),
    ));
    renderPage();
    await waitFor(() => expect(session.user).toBeNull());
  });
});
