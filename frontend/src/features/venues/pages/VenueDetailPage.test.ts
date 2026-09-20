import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import type { BusyInterval, Venue } from '../api/venues';
import { errorBody, on, stubApi } from '../test-helpers';
import VenueDetailPage from './VenueDetailPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null; loading: boolean };
const venue: Venue = {
  id: 'venue-1', name: 'Grand Hall', description: 'Tiered seating.', location: 'Block A', capacity: 300,
  layouts: ['Theatre'], facilities: ['Projector'], accessibilityFeatures: ['Hearing loop'], wheelchairAccessible: true,
  opensAt: '08:00', closesAt: '22:00', isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
};

function availability(busy: BusyInterval[]) {
  return {
    venueId: venue.id, from: '', to: '', timezone: 'Asia/Singapore',
    operatingHours: { opensAt: '08:00', closesAt: '22:00' }, busy,
  };
}

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/venues/:id', component: VenueDetailPage }, { path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });
  await router.push('/venues/venue-1');
  await router.isReady();
  return render(VenueDetailPage, { global: { plugins: [router] } });
}

beforeEach(() => {
  // Wednesday 7 October 2026, 10:00 Singapore time; the week starts Monday 5 October.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-07T02:00:00Z') });
  session.user = { id: 'organiser-1', role: 'EVENT_ORGANISER' };
});
afterEach(() => { vi.useRealTimers(); });

describe('CF-09 venue detail and availability page', () => {
  it('shows details and a week agenda without other people\'s event names', async () => {
    const { calls } = stubApi(
      on('GET', '/api/venues/venue-1/availability', availability([
        { kind: 'BOOKING', startsAt: '2026-10-06T02:00:00.000Z', endsAt: '2026-10-06T04:00:00.000Z' },
      ])),
      on('GET', '/api/venues/venue-1', venue),
    );
    await renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Grand Hall' })).toBeInTheDocument();
    expect(screen.getByText('300 people')).toBeInTheDocument();

    const tuesday = (await screen.findByRole('heading', { name: /Tuesday, 6 Oct 2026/ })).closest('li')!;
    expect(within(tuesday).getByText('10:00 to 12:00')).toBeInTheDocument();
    expect(within(tuesday).getByText('Booked')).toBeInTheDocument();
    expect(screen.getAllByText(/No bookings or blocks/)).toHaveLength(6);

    const range = new URL(calls.find((call) => call.url.includes('/availability'))!.url, 'http://localhost').searchParams;
    expect(range.get('from')).toBe('2026-10-04T16:00:00.000Z');
    expect(range.get('to')).toBe('2026-10-11T16:00:00.000Z');
    expect(screen.queryByRole('button', { name: 'Block period' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit venue' })).not.toBeInTheDocument();
  });

  it('moves between weeks', async () => {
    const { calls } = stubApi(
      on('GET', '/api/venues/venue-1/availability', availability([])),
      on('GET', '/api/venues/venue-1', venue),
    );
    await renderPage();
    await screen.findByRole('heading', { name: /Monday, 5 Oct 2026/ });
    expect(screen.getByRole('button', { name: 'This week' })).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(await screen.findByRole('heading', { name: /Monday, 12 Oct 2026/ })).toBeInTheDocument();
    expect(calls.at(-1)!.url).toContain('from=2026-10-11T16%3A00%3A00.000Z');
    await fireEvent.click(screen.getByRole('button', { name: 'This week' }));
    expect(await screen.findByRole('heading', { name: /Monday, 5 Oct 2026/ })).toBeInTheDocument();
  });

  it('lets venue staff block a period, shows a conflict, and remove a block', async () => {
    session.user = { id: 'staff-1', role: 'VENUE_STAFF' };
    let busy: BusyInterval[] = [];
    let refuse = true;
    const { calls } = stubApi(
      on('GET', '/api/venues/venue-1/availability', () => ({ body: availability(busy) })),
      on('GET', '/api/venues/venue-1', venue),
      on('POST', '/api/venues/venue-1/unavailability', () => {
        if (refuse) { refuse = false; return { status: 409, body: errorBody('VENUE_BLOCK_CONFLICT', 'This period overlaps an approved booking.') }; }
        busy = [{ kind: 'BLOCKED', id: 'block-1', reason: 'Deep clean', startsAt: '2026-10-08T01:00:00.000Z', endsAt: '2026-10-08T03:00:00.000Z' }];
        return { status: 201, body: { id: 'block-1' } };
      }),
      on('DELETE', '/api/venues/venue-1/unavailability/block-1', () => { busy = []; return { body: { deleted: true } }; }),
    );
    await renderPage();
    expect(await screen.findByRole('link', { name: 'Edit venue' })).toHaveAttribute('href', '/venues/venue-1/edit');
    await screen.findByRole('heading', { name: /Monday, 5 Oct 2026/ });

    await fireEvent.update(screen.getByLabelText('Starts'), '2026-10-08T09:00');
    await fireEvent.update(screen.getByLabelText('Ends'), '2026-10-08T11:00');
    await fireEvent.update(screen.getByLabelText('Reason (optional)'), 'Deep clean');
    await fireEvent.click(screen.getByRole('button', { name: 'Block period' }));
    expect(await screen.findByText('This period overlaps an approved booking.')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Block period' }));
    expect(await screen.findByText('The period has been blocked.')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST').at(-1)!.body).toEqual({
      startsAt: '2026-10-08T01:00:00.000Z', endsAt: '2026-10-08T03:00:00.000Z', reason: 'Deep clean',
    });
    expect(await screen.findByText('Deep clean')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: /Remove block 09:00 to 11:00/ }));
    expect(await screen.findByText('The blocked period has been removed.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Deep clean')).not.toBeInTheDocument());
  });

  it('masks a hidden venue, and keeps details when only the calendar fails', async () => {
    stubApi(on('GET', '/api/venues/venue-1', errorBody('VENUE_NOT_FOUND', 'The venue was not found.'), 404));
    const first = await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('This venue is unavailable or you do not have permission');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    first.unmount();

    let failures = 1;
    stubApi(
      on('GET', '/api/venues/venue-1/availability', () => (failures-- > 0
        ? { status: 500, body: errorBody('INTERNAL_ERROR', 'Unexpected.') } : { body: availability([]) })),
      on('GET', '/api/venues/venue-1', venue),
    );
    await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the availability calendar');
    expect(screen.getByText('300 people')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: /Monday, 5 Oct 2026/ })).toBeInTheDocument();
  });
});
