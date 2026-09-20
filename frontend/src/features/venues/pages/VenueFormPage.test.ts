import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { Venue } from '../api/venues';
import { errorBody, on, stubApi } from '../test-helpers';
import VenueFormPage from './VenueFormPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null; loading: boolean };
const venue: Venue = {
  id: 'venue-1', name: 'Grand Hall', description: 'Tiered seating.', location: 'Block A', capacity: 300,
  layouts: ['Theatre', 'Banquet'], facilities: ['Projector'], accessibilityFeatures: [], wheelchairAccessible: true,
  opensAt: '08:00', closesAt: '22:00', isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};

async function renderPage(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/venues/new', component: VenueFormPage },
      { path: '/venues/:id/edit', component: VenueFormPage },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  });
  await router.push(path);
  await router.isReady();
  return { router, ...render(VenueFormPage, { global: { plugins: [router] } }) };
}

beforeEach(() => { session.user = { id: 'staff-1', role: 'VENUE_STAFF' }; });

describe('CF-08 venue form page', () => {
  it('creates a venue from the entered fields and opens it', async () => {
    const { calls } = stubApi(on('POST', '/api/venues', { ...venue, id: 'venue-9' }, 201));
    const { router } = await renderPage('/venues/new');
    await fireEvent.update(screen.getByLabelText('Name'), ' Rooftop ');
    await fireEvent.update(screen.getByLabelText('Capacity'), '60');
    await fireEvent.update(screen.getByLabelText('Facilities'), 'Bar, PA system, Bar');
    await fireEvent.update(screen.getByLabelText('Opens'), '17:00');
    await fireEvent.update(screen.getByLabelText('Closes'), '23:00');
    await fireEvent.click(screen.getByLabelText('Wheelchair accessible'));
    await fireEvent.click(screen.getByRole('button', { name: 'Create venue' }));

    await waitFor(() => expect(router.currentRoute.value.path).toBe('/venues/venue-9'));
    expect(calls[0]!.body).toEqual({
      name: 'Rooftop', description: null, location: null, capacity: 60, layouts: [], facilities: ['Bar', 'PA system'],
      accessibilityFeatures: [], wheelchairAccessible: true, opensAt: '17:00', closesAt: '23:00', isActive: true,
    });
  });

  it('validates required fields and operating hours before saving', async () => {
    const { calls } = stubApi();
    await renderPage('/venues/new');
    await fireEvent.update(screen.getByLabelText('Opens'), '18:00');
    await fireEvent.update(screen.getByLabelText('Closes'), '09:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Create venue' }));
    expect(await screen.findByText('Enter the venue name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the capacity as a whole number of at least 1.')).toBeInTheDocument();
    expect(screen.getByText('The closing time must be later than the opening time.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
  });

  it('loads a venue for editing, saves with PATCH and reports a duplicate name on the field', async () => {
    let attempt = 0;
    const { calls } = stubApi(
      on('GET', '/api/venues/venue-1', venue),
      on('PATCH', '/api/venues/venue-1', () => (attempt++ === 0
        ? { status: 409, body: errorBody('VENUE_NAME_TAKEN', 'Another venue already uses this name.') }
        : { body: venue })),
    );
    const { router } = await renderPage('/venues/venue-1/edit');
    expect(await screen.findByLabelText('Name')).toHaveValue('Grand Hall');
    expect(screen.getByLabelText('Layouts')).toHaveValue('Theatre, Banquet');
    expect(screen.getByLabelText('Active and open for bookings')).toBeChecked();

    await fireEvent.update(screen.getByLabelText('Name'), 'Main Hall');
    await fireEvent.click(screen.getByLabelText('Active and open for bookings'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Another venue already uses this name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Main Hall');

    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/venues/venue-1'));
    expect(calls.at(-1)).toMatchObject({ method: 'PATCH', body: { name: 'Main Hall', isActive: false, capacity: 300 } });
  });

  it('refuses other roles and signed-out visitors without calling the API', async () => {
    const { calls } = stubApi();
    session.user = { id: 'organiser-1', role: 'EVENT_ORGANISER' };
    const first = await renderPage('/venues/new');
    expect(screen.getByRole('alert')).toHaveTextContent('Only venue staff can add or edit venues.');
    expect(screen.queryByRole('button', { name: 'Create venue' })).not.toBeInTheDocument();
    first.unmount();

    session.user = null;
    await renderPage('/venues/new');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(calls).toHaveLength(0);
  });
});
