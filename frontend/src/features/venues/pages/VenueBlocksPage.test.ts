import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
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
  reason: 'Scheduled maintenance', createdBy: 'staff-1', createdAt: '2026-10-04T00:00:00.000Z', affected: [],
};

function fetchRouter(routes: {
  availability?: typeof availability;
  blocks?: { status?: number; body: unknown }[];
  create?: { status?: number; body: unknown };
  remove?: { status?: number; body: unknown };
  recovery?: { status?: number; body: unknown }[];
}) {
  let blockCall = 0;
  let recoveryCall = 0;
  return vi.fn(async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (path.startsWith('/api/venues/availability')) {
      return json(routes.availability?.body ?? availability.body);
    }
    if (path.startsWith('/api/venues/recovery')) {
      const reply = routes.recovery?.[Math.min(recoveryCall, routes.recovery.length - 1)] ?? { body: { items: [] } };
      recoveryCall += 1;
      return json(reply.body, reply.status);
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
      const reply = routes.remove ?? { body: { id: block.id, clearedBookingIds: [] } };
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
      remove: { body: { id: block.id, clearedBookingIds: [] } },
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

describe('KAN-81 outage recovery on the venue blocks page', () => {
  const affected = {
    impactId: 'impact-1', status: 'RECOVERY_REQUIRED' as const, bookingId: 'booking-1', eventRequestId: 'event-1',
    eventName: 'Career fair', bookingStartsAt: '2026-12-01T03:00:00.000Z', bookingEndsAt: '2026-12-01T04:00:00.000Z',
  };
  const recoveryItem = {
    ...affected, blockId: block.id, venueId: 'venue-a', venueName: 'Harbour Hall',
    outageStartsAt: block.startsAt, outageEndsAt: block.endsAt, outageReason: 'Scheduled maintenance',
  };

  async function fillAndSave() {
    await fireEvent.update(screen.getByLabelText('Starts (Singapore time)'), '2026-12-01T10:00');
    await fireEvent.update(screen.getByLabelText('Ends (Singapore time)'), '2026-12-01T14:00');
    await fireEvent.update(screen.getByLabelText('Reason'), 'Scheduled maintenance');
    await fireEvent.click(screen.getByRole('button', { name: 'Save block' }));
  }

  it('saves a block over an approved booking and lists it as needing recovery (AC2-AC4, AC12)', async () => {
    const saved = { ...block, affected: [affected] };
    const fetchMock = fetchRouter({
      blocks: [{ body: { items: [] } }, { body: { items: [saved] } }],
      create: { body: { block: saved } },
      recovery: [{ body: { items: [] } }, { body: { items: [recoveryItem] } }],
    });
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    await fillAndSave();

    expect(await screen.findByText(
      'The venue block was saved. It affects 1 approved booking, now marked as needing recovery.',
    )).toBeInTheDocument();
    const affectedList = await screen.findByRole('list', { name: 'Bookings affected by this block' });
    expect(within(affectedList).getByText(/Career fair/)).toBeInTheDocument();
    expect(within(affectedList).getByText('Recovery required')).toBeInTheDocument();
    const recoveryPanel = screen.getByRole('region', { name: 'Bookings needing recovery' });
    expect(await within(recoveryPanel).findByText('Career fair — Harbour Hall')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([path]) => String(path).startsWith('/api/venues/recovery'))
      .map(([path]) => path)).toEqual([
      '/api/venues/recovery?status=RECOVERY_REQUIRED', '/api/venues/recovery?status=RECOVERY_REQUIRED',
    ]);
  });

  it('distinguishes cleared and resolved arrangements from those needing recovery', async () => {
    const item = { ...block, affected: [
      { ...affected, impactId: 'i-1', status: 'CLEARED' as const },
      { ...affected, impactId: 'i-2', status: 'RESOLVED' as const, eventName: '  ' },
    ] };
    vi.stubGlobal('fetch', fetchRouter({ blocks: [{ body: { items: [item] } }] }));
    render(VenueBlocksPage);
    await selectVenue();
    const list = await screen.findByRole('list', { name: 'Bookings affected by this block' });
    expect(within(list).getByText('Cleared')).toBeInTheDocument();
    expect(within(list).getByText('Resolved')).toBeInTheDocument();
    expect(within(list).getByText(/Untitled event/)).toBeInTheDocument();
  });

  it('says when a block affects no approved booking and when nothing needs recovery', async () => {
    vi.stubGlobal('fetch', fetchRouter({ blocks: [{ body: { items: [block] } }] }));
    render(VenueBlocksPage);
    expect(await screen.findByText('No bookings currently need recovery.')).toBeInTheDocument();
    await selectVenue();
    expect(await screen.findByText('No approved bookings are affected.')).toBeInTheDocument();
  });

  it('reports how many recovery flags a removal cleared (AC11)', async () => {
    vi.stubGlobal('fetch', fetchRouter({
      blocks: [{ body: { items: [{ ...block, affected: [affected] }] } }, { body: { items: [] } }],
      remove: { body: { id: block.id, clearedBookingIds: ['booking-1', 'booking-2'] } },
    }));
    render(VenueBlocksPage);
    await selectVenue();
    await fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('The venue block was removed. Its recovery flag was cleared for 2 approved bookings.'))
      .toBeInTheDocument();
  });

  it.each([
    ['a network failure', () => { throw new TypeError('Failed to fetch'); }],
    ['a server error', () => json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }, 500)],
  ])('after %s on save, refreshes current state instead of retrying (AC12)', async (_label, reply) => {
    const base = fetchRouter({ blocks: [{ body: { items: [] } }, { body: { items: [{ ...block, affected: [affected] }] } }] });
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) =>
      (init?.method === 'POST' ? reply() : base(path, init)));
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    await fillAndSave();

    expect(await screen.findByText(
      'We could not confirm whether the block was saved. The list below has been refreshed; check it before trying again.',
    )).toBeInTheDocument();
    expect(await screen.findByText(/Career fair/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('shows a definite refusal message without the uncertain-result wording', async () => {
    vi.stubGlobal('fetch', fetchRouter({
      create: { status: 409, body: { error: { code: 'VENUE_INACTIVE', message: 'This venue is no longer active.' } } },
    }));
    render(VenueBlocksPage);
    await selectVenue();
    await fillAndSave();
    expect(await screen.findByText('This venue is no longer active.')).toBeInTheDocument();
    expect(screen.queryByText(/could not confirm/)).not.toBeInTheDocument();
  });

  it('after an uncertain removal, refreshes rather than retrying, and signs out on 401', async () => {
    const base = fetchRouter({ blocks: [{ body: { items: [block] } }] });
    let deleteReply: () => Response = () => json({ error: { code: 'INTERNAL_ERROR', message: 'Boom' } }, 503);
    const fetchMock = vi.fn(async (path: string, init?: RequestInit) =>
      (init?.method === 'DELETE' ? deleteReply() : base(path, init)));
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    await selectVenue();
    await fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(await screen.findByText(/could not confirm whether the block was removed/)).toBeInTheDocument();

    deleteReply = () => json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in.' } }, 401);
    const removeAgain = await screen.findByRole('button', { name: 'Remove' });
    await waitFor(() => expect(removeAgain).toBeEnabled());
    await fireEvent.click(removeAgain);
    expect(await screen.findByText('Sign in to manage venue blocks.')).toBeInTheDocument();
  });

  it('shows a recovery-list failure with a retry', async () => {
    vi.stubGlobal('fetch', fetchRouter({
      recovery: [{ status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Recovery is unavailable.' } } },
        { body: { items: [recoveryItem] } }],
    }));
    render(VenueBlocksPage);
    expect(await screen.findByText('Recovery is unavailable.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Career fair — Harbour Hall')).toBeInTheDocument();
  });

  it('does not request recovery data for a non-staff user', async () => {
    session.user = user('EVENT_COORDINATOR');
    const fetchMock = fetchRouter({});
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBlocksPage);
    expect(await screen.findByText('Venue blocks are for venue staff.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([path]) => String(path).startsWith('/api/venues/recovery'))).toBe(false);
  });
});
