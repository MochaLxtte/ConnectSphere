import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { VenueBlock } from '../api/venue-blocks';
import VenueBlocksPage from './VenueBlocksPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: SignedInUser | null; loading: boolean };
function user(role: UserRole = 'VENUE_STAFF', id = 'staff-1'): SignedInUser {
  return { id, role, email: `${id}@example.test`, displayName: id };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const availability = { body: { from: '', to: '', items: [{ id: 'venue-a', name: 'Harbour Hall', location: null, capacity: 200, opensAt: null, closesAt: null, unavailable: [] }] } };
const block: VenueBlock = {
  id: 'block-a', venueId: 'venue-a', venueName: 'Harbour Hall',
  startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
  reason: 'Scheduled maintenance', createdBy: 'staff-1', createdAt: '2026-10-04T00:00:00.000Z',
};

function fetchRouter(routes: {
  availability?: typeof availability;
  blocks?: { status?: number; body: unknown }[];
  create?: { status?: number; body: unknown };
  remove?: { status?: number; body: unknown };
}) {
  let blockCall = 0;
  return vi.fn(async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (path.startsWith('/api/venues/availability')) {
      return json(routes.availability?.body ?? availability.body);
    }
    if (method === 'GET' && path.includes('/unavailability')) {
      const reply = routes.blocks?.[Math.min(blockCall, routes.blocks.length - 1)] ?? { body: { items: [] } };
      blockCall += 1;
      return json(reply.body, reply.status);
    }
    if (method === 'POST') {
      const reply = routes.create ?? { body: { block } };
      return json(reply.body, reply.status);
    }
    if (method === 'DELETE') {
      const reply = routes.remove ?? { body: { id: block.id } };
      return json(reply.body, reply.status);
    }
    throw new Error(`No stub for ${method} ${path}`);
  });
}

beforeEach(() => { session.user = user(); session.loading = false; });

async function selectVenue() {
  await screen.findByRole('option', { name: 'Harbour Hall' });
  await fireEvent.update(screen.getByRole('combobox', { name: 'Venue' }), 'venue-a');
}

describe('KAN-55 venue blocks page', () => {
  it('loads the venue list for staff and shows an empty state before a venue is selected', async () => {
    const fetchMock = fetchRouter({});
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    expect(await screen.findByRole('option', { name: 'Harbour Hall' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recorded blocks' })).not.toBeInTheDocument();
  });

  it('shows a read-only message to a non-staff role without fetching', async () => {
    session.user = user('EVENT_COORDINATOR');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    expect(screen.getByRole('alert')).toHaveTextContent('Venue blocks are for venue staff.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists recorded blocks once a venue is selected', async () => {
    const fetchMock = fetchRouter({ blocks: [{ body: { items: [block] } }] });
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    expect(await screen.findByText('Scheduled maintenance')).toBeInTheDocument();
  });

  it('creates a block and shows it after reload', async () => {
    const fetchMock = fetchRouter({
      blocks: [{ body: { items: [] } }, { body: { items: [block] } }],
      create: { status: 201, body: { block } },
    });
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    await screen.findByText('No blocks are recorded for this venue yet.');

    await fireEvent.update(screen.getByLabelText('Starts (Singapore time)'), '2026-12-01T10:00');
    await fireEvent.update(screen.getByLabelText('Ends (Singapore time)'), '2026-12-01T14:00');
    await fireEvent.update(screen.getByLabelText('Reason'), 'Scheduled maintenance');
    await fireEvent.click(screen.getByRole('button', { name: 'Save block' }));

    expect(await screen.findByText('The venue block was saved.')).toBeInTheDocument();
    expect(await screen.findByText('Scheduled maintenance')).toBeInTheDocument();
    const createCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit)?.method === 'POST');
    expect(JSON.parse((createCall![1] as RequestInit).body as string)).toEqual({
      startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z', reason: 'Scheduled maintenance',
    });
  });

  it('shows a validation error when the end time is not after the start time', async () => {
    const fetchMock = fetchRouter({ blocks: [{ body: { items: [] } }] });
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    await fireEvent.update(await screen.findByLabelText('Starts (Singapore time)'), '2026-12-01T10:00');
    await fireEvent.update(screen.getByLabelText('Ends (Singapore time)'), '2026-12-01T09:00');
    expect(await screen.findByRole('alert')).toHaveTextContent('The end time must be after the start time.');
    expect(screen.getByRole('button', { name: 'Save block' })).toBeDisabled();
  });

  it('removes a block and reloads the list', async () => {
    const fetchMock = fetchRouter({
      blocks: [{ body: { items: [block] } }, { body: { items: [] } }],
      remove: { body: { id: block.id } },
    });
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    await fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('The venue block was removed.')).toBeInTheDocument();
    expect(await screen.findByText('No blocks are recorded for this venue yet.')).toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit)?.method === 'DELETE');
    expect(deleteCall![0]).toBe(`/api/venues/venue-a/unavailability/${block.id}`);
  });

  it('offers a read retry for the block list without losing the selected venue', async () => {
    const fetchMock = fetchRouter({ blocks: [{ status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } } }, { body: { items: [] } }] });
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No blocks are recorded for this venue yet.')).toBeInTheDocument();
  });
});
