import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { Venue } from '../api/venues';
import { errorBody, on, stubApi } from '../test-helpers';
import VenueCataloguePage from './VenueCataloguePage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null; loading: boolean };
const hall: Venue = {
  id: 'venue-1', name: 'Grand Hall', description: null, location: 'Block A', capacity: 300,
  layouts: ['Theatre'], facilities: ['Projector', 'Stage'], accessibilityFeatures: [], wheelchairAccessible: true,
  opensAt: '08:00', closesAt: '22:00', isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};
const annex: Venue = { ...hall, id: 'venue-2', name: 'Old Annex', isActive: false, facilities: [], wheelchairAccessible: false };

function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: VenueCataloguePage }],
  });
  return render(VenueCataloguePage, { global: { plugins: [router] } });
}

beforeEach(() => { session.user = { id: 'organiser-1', role: 'EVENT_ORGANISER' }; });

describe('CF-08/CF-10 venue catalogue page', () => {
  it('lists venues with their key facts and no management controls for organisers', async () => {
    stubApi(on('GET', '/api/venues', { items: [hall] }));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading venues');
    expect(await screen.findByRole('heading', { name: 'Grand Hall' })).toBeInTheDocument();
    expect(screen.getByText('08:00 to 22:00')).toBeInTheDocument();
    expect(screen.getByText('Wheelchair accessible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Grand Hall details/ })).toHaveAttribute('href', '/venues/venue-1');
    expect(screen.queryByRole('link', { name: 'Add venue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Manage/ })).not.toBeInTheDocument();
  });

  it('gives venue staff manage controls and marks inactive venues', async () => {
    session.user = { id: 'staff-1', role: 'VENUE_STAFF' };
    stubApi(on('GET', '/api/venues', { items: [hall, annex] }));
    renderPage();
    expect(await screen.findByRole('link', { name: 'Manage Old Annex' })).toHaveAttribute('href', '/venues/venue-2/edit');
    expect(screen.getByRole('link', { name: 'Add venue' })).toHaveAttribute('href', '/venues/new');
    expect(screen.getByRole('link', { name: 'Booking requests' })).toHaveAttribute('href', '/venue-bookings');
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('sends every filter, converting availability from Singapore time', async () => {
    const { calls } = stubApi(on('GET', '/api/venues', { items: [] }));
    renderPage();
    await screen.findByText('No venues have been added yet');
    await fireEvent.update(screen.getByLabelText('Name, location or description'), ' hall ');
    await fireEvent.update(screen.getByLabelText('Minimum capacity'), '50');
    await fireEvent.update(screen.getByLabelText('Layout'), 'Theatre');
    await fireEvent.update(screen.getByLabelText('Required facilities'), 'Projector, Stage');
    await fireEvent.update(screen.getByLabelText('Accessibility features'), 'Hearing loop');
    await fireEvent.click(screen.getByLabelText('Wheelchair accessible only'));
    await fireEvent.update(screen.getByLabelText('Available from'), '2026-10-01T09:00');
    await fireEvent.update(screen.getByLabelText('Available until'), '2026-10-01T12:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Search venues' }));

    await waitFor(() => expect(calls).toHaveLength(2));
    const params = new URL(calls[1]!.url, 'http://localhost').searchParams;
    expect(Object.fromEntries(params)).toEqual({
      q: 'hall', minCapacity: '50', layout: 'Theatre', facilities: 'Projector,Stage',
      accessibilityFeatures: 'Hearing loop', wheelchairAccessible: 'true',
      availableFrom: '2026-10-01T01:00:00.000Z', availableTo: '2026-10-01T04:00:00.000Z',
    });
    expect(await screen.findByText('No venues match these filters')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2]!.url).toBe('/api/venues');
  });

  it('validates the availability period before calling the API', async () => {
    const { calls } = stubApi(on('GET', '/api/venues', { items: [hall] }));
    renderPage();
    await screen.findByRole('heading', { name: 'Grand Hall' });
    await fireEvent.update(screen.getByLabelText('Available from'), '2026-10-01T09:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Search venues' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter both a start and an end');
    await fireEvent.update(screen.getByLabelText('Available until'), '2026-10-01T08:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Search venues' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('must be later');
    expect(calls).toHaveLength(1);
  });

  it('offers sign-in when the session has expired and clears earlier results', async () => {
    stubApi(on('GET', '/api/venues', errorBody('AUTHENTICATION_REQUIRED', 'Sign in to view venues.'), 401));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view venues.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
  });

  it('offers a retry after a server failure', async () => {
    let attempts = 0;
    stubApi(on('GET', '/api/venues', () => (attempts++ === 0
      ? { status: 500, body: errorBody('INTERNAL_ERROR', 'An unexpected error occurred.') }
      : { body: { items: [hall] } })));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load venues');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Grand Hall' })).toBeInTheDocument();
  });
});
