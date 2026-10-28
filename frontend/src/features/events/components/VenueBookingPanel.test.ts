import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSession, type SignedInUser } from '../../auth/session.js';
import VenueBookingPanel from './VenueBookingPanel.vue';
import type { VenueBooking } from '../../venues/api/venue-bookings';
import { apiError, stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const coordinator = { id: 'coordinator-a', role: 'EVENT_COORDINATOR' as const, email: 'coordinator@example.test', displayName: 'Coordinator' };
beforeEach(() => { session.user = { ...coordinator }; session.loading = false; });

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}`;
const venues = { body: { items: [
  { id: 'hall', name: 'Main Hall', description: null, location: null, capacity: 200, layouts: [], facilities: [],
    accessibilityFeatures: [], wheelchairAccessible: false, opensAt: null, closesAt: null, updatedAt: '2026-09-01T00:00:00.000Z' },
] } };
const pending: VenueBooking = {
  id: 'b1', eventRequestId, eventName: 'Open day', eventStatus: 'APPROVED', venueId: 'hall', venueName: 'Main Hall',
  status: 'PENDING', startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z',
  layout: 'Theatre', notes: 'Projector required', decidedBy: null, decidedAt: null, decisionReason: null,
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  eventStartsAt: null, eventEndsAt: null, purpose: null, description: null, expectedAttendance: null,
  venueRequirements: null, accessibilityNeeds: null,
  recovery: [],
  replacesBookingId: null, replacedByBookingIds: [],
  holdExpiresAt: null, heldBy: null, heldAt: null, expiredAt: null,
  cancelledBy: null, cancelledAt: null, cancellationReason: null,
};

const coordinatorProps = { eventRequestId, status: 'APPROVED', viewerRole: 'EVENT_COORDINATOR' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
async function settle(pendingResponse: ReturnType<typeof deferred>, response: Response) {
  pendingResponse.resolve(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function fillAndSubmit() {
  await fireEvent.update(await screen.findByRole('combobox', { name: 'Venue' }), 'hall');
  await fireEvent.update(screen.getByLabelText('Starts (Singapore time)'), '2026-12-01T10:00');
  await fireEvent.update(screen.getByLabelText('Ends (Singapore time)'), '2026-12-01T14:00');
  await fireEvent.click(screen.getByRole('button', { name: 'Request this venue' }));
}

describe('KAN-53 venue booking request panel', () => {
  it('lets the coordinator submit a request and shows it after reload', async () => {
    const api = stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: { status: 201, body: { booking: pending } },
    });
    const view = render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByText('No venue has been requested for this event yet.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Request this venue' });
    expect(submit).toBeDisabled();

    api.set(`GET /api/venue-bookings?eventRequestId=${eventRequestId}`, { body: { items: [pending] } });
    await fillAndSubmit();

    expect(await screen.findByText('A venue booking request for Main Hall was submitted for review.')).toBeInTheDocument();
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getAllByText('Main Hall').length).toBeGreaterThan(0);
    expect(api.writes()).toEqual([{
      key: `POST ${base}/venue-bookings`,
      body: { venueId: 'hall', startsAt: '2026-12-01T02:00:00.000Z', endsAt: '2026-12-01T06:00:00.000Z', layout: null, notes: null },
    }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('shows a validation error when the end time is not after the start time', async () => {
    stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fireEvent.update(await screen.findByRole('combobox', { name: 'Venue' }), 'hall');
    await fireEvent.update(screen.getByLabelText('Starts (Singapore time)'), '2026-12-01T10:00');
    await fireEvent.update(screen.getByLabelText('Ends (Singapore time)'), '2026-12-01T09:00');
    expect(await screen.findByRole('alert')).toHaveTextContent('The end time must be after the start time.');
    expect(screen.getByRole('button', { name: 'Request this venue' })).toBeDisabled();
  });

  it('shows a server refusal without emitting changed', async () => {
    stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: apiError(409, 'EVENT_NOT_ELIGIBLE', 'A venue booking cannot be requested for this event.'),
    });
    const view = render(VenueBookingPanel, { props: coordinatorProps });
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('A venue booking cannot be requested for this event.');
    expect(view.emitted('changed')).toBeUndefined();
  });

  it('lists existing requests with their decision outcome for the coordinator', async () => {
    const decided: VenueBooking = { ...pending, status: 'REJECTED', decidedBy: 'staff', decisionReason: 'No capacity.' };
    const api = stubApi({ [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [decided] } } });
    render(VenueBookingPanel, { props: { ...coordinatorProps, status: 'REJECTED' } });
    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Decision note: No capacity.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]);
  });

  it.each(['REJECTED', 'CANCELLED', 'COMPLETED'])('is read-only for a coordinator once the event is %s', async (status) => {
    const api = stubApi({ [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } } });
    render(VenueBookingPanel, { props: { ...coordinatorProps, status } });
    await screen.findByText('No venue has been requested for this event yet.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]);
  });

  it('offers a read retry without exposing the request form when the list cannot be loaded', async () => {
    const api = stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'),
      'GET /api/venues/search-venues': venues,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    api.set(`GET /api/venue-bookings?eventRequestId=${eventRequestId}`, { body: { items: [] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('No venue has been requested for this event yet.')).toBeInTheDocument());
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)(
    'does not expose or request booking information for %s even with coordinator props', async (role) => {
      session.user = { ...coordinator, role };
      const api = stubApi({});
      render(VenueBookingPanel, { props: coordinatorProps });
      await nextTick();
      expect(screen.queryByRole('heading', { name: 'Venue booking requests' })).not.toBeInTheDocument();
      expect(api.calls).toEqual([]);
    },
  );

  it('does not fetch for organiser props, an unresolved session, a visitor or a draft', async () => {
    const api = stubApi({});
    const view = render(VenueBookingPanel, { props: { ...coordinatorProps, viewerRole: 'EVENT_ORGANISER' } });
    session.loading = true;
    await view.rerender(coordinatorProps);
    session.user = null; session.loading = false;
    await nextTick();
    await view.rerender({ ...coordinatorProps, status: 'DRAFT' });
    session.user = { ...coordinator };
    await nextTick();
    expect(api.calls).toEqual([]);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it.each(['VENUE_BOOKING_CONFLICT', 'VENUE_UNAVAILABLE'])(
    'keeps the form and shows %s without claiming a save', async (code) => {
      const api = stubApi({
        [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
        'GET /api/venues/search-venues': venues,
        [`POST ${base}/venue-bookings`]: apiError(409, code, 'This period is unavailable.'),
      });
      const view = render(VenueBookingPanel, { props: coordinatorProps });
      await fillAndSubmit();
      expect(await screen.findByRole('alert')).toHaveTextContent('This period is unavailable.');
      expect(screen.getByRole('combobox', { name: 'Venue' })).toHaveValue('hall');
      expect(view.emitted('changed')).toBeUndefined();
      expect(api.writes()).toHaveLength(1);
    },
  );

  it('offers a catalogue retry and does not treat a failed read as an empty catalogue', async () => {
    const api = stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': apiError(500, 'INTERNAL_ERROR', 'Unavailable'),
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByRole('alert')).toHaveTextContent('The venue catalogue could not be loaded');
    api.set('GET /api/venues/search-venues', venues);
    await fireEvent.click(screen.getByRole('button', { name: 'Retry venue catalogue' }));
    expect(await screen.findByRole('option', { name: 'Main Hall' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('requires a list refresh after an uncertain save instead of automatically retrying the write', async () => {
    const api = stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: apiError(500, 'INTERNAL_ERROR', 'Unavailable'),
    });
    const view = render(VenueBookingPanel, { props: coordinatorProps });
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm whether the booking request was saved');
    expect(screen.getByRole('button', { name: 'Request this venue' })).toBeDisabled();
    api.set(`GET /api/venue-bookings?eventRequestId=${eventRequestId}`, { body: { items: [pending] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh booking requests' }));
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Venue' })).toHaveValue('');
    expect(view.emitted('changed')).toBeUndefined();
    expect(api.writes()).toHaveLength(1);
  });

  it.each(['unmount', 'event change', 'account change', 'sign out', 'role change'])(
    'ignores a pending save after %s and never reloads its old context', async (change) => {
      const save = deferred();
      const fetchMock = vi.fn((url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return save.promise;
        return Promise.resolve(json(url.includes('search-venues') ? venues.body : { items: [] }));
      });
      vi.stubGlobal('fetch', fetchMock);
      const view = render(VenueBookingPanel, { props: coordinatorProps });
      await fillAndSubmit();
      expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
      const postSignal = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')![1]!.signal;
      if (change === 'unmount') view.unmount();
      if (change === 'event change') await view.rerender({ ...coordinatorProps, eventRequestId: 'event-two' });
      if (change === 'account change') session.user = { ...coordinator, id: 'coordinator-b' };
      if (change === 'sign out') session.user = null;
      if (change === 'role change') session.user = { ...coordinator, role: 'EVENT_ORGANISER' };
      await nextTick();
      const readsAfterChange = fetchMock.mock.calls.length;
      await settle(save, json({ booking: pending }, 201));
      expect(postSignal?.aborted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(readsAfterChange);
      expect(view.emitted('changed')).toBeUndefined();
      expect(screen.queryByText(/was submitted for review/)).not.toBeInTheDocument();
    },
  );

  it.each(['list', 'catalogue'] as const)('ignores a pending %s response after losing coordinator access', async (source) => {
    const response = deferred();
    const fetchMock = vi.fn((url: string) => {
      const catalogue = url.includes('search-venues');
      if ((source === 'catalogue') === catalogue) return response.promise;
      return Promise.resolve(json(catalogue ? venues.body : { items: [] }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(VenueBookingPanel, { props: coordinatorProps });
    session.user = null;
    await settle(response, json(source === 'catalogue' ? venues.body : { items: [pending] }));
    expect(screen.queryByText('Main Hall')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Venue booking requests' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 404])('clears private information when a submission returns %s', async (status) => {
    stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [pending] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: apiError(status, 'EVENT_REQUEST_NOT_FOUND', 'Unavailable'),
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fillAndSubmit();
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    if (status === 401) expect(session.user).toBeNull();
    else expect(screen.getByRole('alert')).toHaveTextContent('no longer have access');
  });
});

describe('KAN-81 phase 2: recovery in the coordinator venue panel (AC12)', () => {
  const recovery = (status: 'RECOVERY_REQUIRED' | 'CLEARED') => [{
    impactId: 'i-1', status, outageStartsAt: '2026-12-01T03:00:00.000Z', outageEndsAt: '2026-12-01T05:00:00.000Z',
    outageReason: 'Burst pipe',
  }];

  it('marks an approved booking that needs recovery and explains what to do', async () => {
    stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: {
        body: { items: [{ ...pending, status: 'APPROVED', recovery: recovery('RECOVERY_REQUIRED') }] },
      },
      'GET /api/venues/search-venues': venues,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByText('Recovery required')).toBeInTheDocument();
    expect(screen.getByText(/The venue is unavailable for part of this booking/)).toBeInTheDocument();
  });

  it('shows no recovery marker once the outage is cleared', async () => {
    stubApi({
      [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: {
        body: { items: [{ ...pending, status: 'APPROVED', recovery: recovery('CLEARED') }] },
      },
      'GET /api/venues/search-venues': venues,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.queryByText('Recovery required')).not.toBeInTheDocument();
  });
});

describe('KAN-81 phase 3: requesting a replacement venue from the panel (AC7, AC12)', () => {
  const affected = {
    ...pending, id: 'affected-1', status: 'APPROVED' as const, venueName: 'Old Hall',
    recovery: [{ impactId: 'i-1', status: 'RECOVERY_REQUIRED' as const, outageStartsAt: '2026-12-01T03:00:00.000Z',
      outageEndsAt: '2026-12-01T05:00:00.000Z', outageReason: 'Burst pipe' }],
  };
  const list = `GET /api/venue-bookings?eventRequestId=${eventRequestId}`;

  it('offers only bookings needing recovery and sends the chosen one as replacesBookingId', async () => {
    const api = stubApi({
      [list]: { body: { items: [affected, { ...pending, id: 'unaffected', status: 'APPROVED' }] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: { status: 201, body: { booking: { ...pending, replacesBookingId: 'affected-1' } } },
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    const select = await screen.findByLabelText(/This request replaces/);
    expect([...(select as HTMLSelectElement).options].map((option) => option.value)).toEqual(['', 'affected-1']);
    await fireEvent.update(select, 'affected-1');
    await fillAndSubmit();
    await screen.findByText('A venue booking request for Main Hall was submitted for review.');
    expect(api.writes()[0]!.body).toMatchObject({ venueId: 'hall', replacesBookingId: 'affected-1' });
  });

  it('does not offer a replacement choice when nothing needs recovery, and omits the field', async () => {
    const api = stubApi({
      [list]: { body: { items: [] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: { status: 201, body: { booking: pending } },
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    await screen.findByText('No venue has been requested for this event yet.');
    expect(screen.queryByLabelText(/This request replaces/)).not.toBeInTheDocument();
    await fillAndSubmit();
    await screen.findByText('A venue booking request for Main Hall was submitted for review.');
    expect(api.writes()[0]!.body).not.toHaveProperty('replacesBookingId');
  });

  it('explains a replacement that is no longer needed and reloads the current bookings', async () => {
    const api = stubApi({
      [list]: { body: { items: [affected] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: apiError(409, 'REPLACEMENT_NOT_NEEDED',
        'The booking being replaced no longer needs recovery. Refresh to see its current state.'),
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fireEvent.update(await screen.findByLabelText(/This request replaces/), 'affected-1');
    api.set(list, { body: { items: [{ ...affected, status: 'CANCELLED', recovery: [{ ...affected.recovery[0]!, status: 'RESOLVED' as const }] }] } });
    await fillAndSubmit();
    expect(await screen.findByText(/no longer needs recovery/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText(/This request replaces/)).not.toBeInTheDocument());
    expect(api.calls.filter((call) => call.key === list)).toHaveLength(2);
  });

  it('marks a replacement booking in the list', async () => {
    stubApi({
      [list]: { body: { items: [{ ...pending, replacesBookingId: 'affected-1' }] } },
      'GET /api/venues/search-venues': venues,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByText('Replacement for an outage-affected booking.')).toBeInTheDocument();
  });
});

describe('KAN-83 hold details for the coordinator', () => {
  it('KAN-83-AC11 shows the live hold deadline, an expired outcome and a cancellation reason', async () => {
    stubApi({ [`GET /api/venue-bookings?eventRequestId=${eventRequestId}`]: { body: { items: [
      { ...pending, id: 'h1', status: 'HELD', holdExpiresAt: '2026-11-28T10:00:00.000Z' },
      { ...pending, id: 'h2', status: 'EXPIRED', holdExpiresAt: '2026-11-20T10:00:00.000Z' },
      { ...pending, id: 'h3', status: 'CANCELLED', cancellationReason: 'Venue unavailable: Burst pipe' },
    ] } } });
    render(VenueBookingPanel, { props: { ...coordinatorProps, status: 'REJECTED' } });
    expect(await screen.findByText(/^Held until 28 Nov 2026, 6:00 pm \(Singapore time\)\. Venue staff must approve it before then/))
      .toBeInTheDocument();
    expect(screen.getByText(/^The hold expired at 20 Nov 2026, 6:00 pm and the venue period was released\./)).toBeInTheDocument();
    expect(screen.getByText('Cancellation reason: Venue unavailable: Burst pipe')).toBeInTheDocument();
    expect(screen.getByText('Hold expired')).toHaveClass('tag-negative');
  });
});

describe('KAN-82 managing one arrangement at a time', () => {
  const list = `GET /api/venue-bookings?eventRequestId=${eventRequestId}`;
  const approved = { ...pending, id: 'a1', status: 'APPROVED' as const, venueName: 'Main Hall' };
  const other = { ...pending, id: 'a2', status: 'APPROVED' as const, venueName: 'Studio' };
  const cancelled = { ...approved, status: 'CANCELLED' as const, cancelledBy: 'coordinator-a',
    cancelledAt: '2026-10-28T00:00:00.000Z', cancellationReason: 'Too small' };

  it('KAN-82-AC4/AC12 confirms the exact arrangement, needs a reason and updates only that row', async () => {
    const api = stubApi({
      [list]: { body: { items: [approved, other] } },
      'GET /api/venues/search-venues': venues,
      'POST /api/venue-bookings/a1/cancel': { body: { booking: cancelled } },
    });
    const { emitted } = render(VenueBookingPanel, { props: coordinatorProps });
    const buttons = await screen.findAllByRole('button', { name: 'Cancel arrangement' });
    expect(buttons).toHaveLength(2);
    await fireEvent.click(buttons[0]!);
    const form = screen.getByRole('form', { name: 'Cancel Main Hall' });
    expect(form).toHaveTextContent('Cancel approved arrangement: Open day at Main Hall, 1 Dec 2026');
    expect(form).toHaveTextContent('releases this venue period straight away');
    const confirm = screen.getByRole('button', { name: 'Confirm cancellation' });
    expect(confirm).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Reason for cancelling'), '   ');
    expect(confirm).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Reason for cancelling'), '  Too small ');
    await fireEvent.click(confirm);
    expect(await screen.findByText(/was cancelled and its venue period released\. Other arrangements are unchanged/)).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: 'POST /api/venue-bookings/a1/cancel', body: { reason: 'Too small' } }]);
    expect(screen.getByText('Cancellation reason: Too small')).toBeInTheDocument();
    // The other arrangement keeps its action; no reload was needed.
    expect(screen.getAllByRole('button', { name: 'Cancel arrangement' })).toHaveLength(1);
    expect(api.calls.filter((call) => call.key === list)).toHaveLength(1);
    expect(emitted().changed).toHaveLength(1);
  });

  it('KAN-82-AC12 can back out of a cancellation without writing anything', async () => {
    const api = stubApi({ [list]: { body: { items: [approved] } }, 'GET /api/venues/search-venues': venues });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fireEvent.click(await screen.findByRole('button', { name: 'Cancel arrangement' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Keep arrangement' }));
    expect(screen.queryByRole('form', { name: 'Cancel Main Hall' })).not.toBeInTheDocument();
    expect(api.writes()).toEqual([]);
  });

  it.each([
    ['a stale conflict', apiError(409, 'BOOKING_ALREADY_CANCELLED', 'This arrangement is already cancelled.'),
      /already cancelled\. Refresh booking requests to see the current state\./],
    ['an unconfirmed result', apiError(500, 'INTERNAL', 'Boom'), /could not confirm whether the arrangement was cancelled/],
  ])('KAN-82-AC12 after %s asks for a refresh and blocks further cancels until it reloads', async (_label, reply, message) => {
    const api = stubApi({
      [list]: { body: { items: [approved, other] } },
      'GET /api/venues/search-venues': venues,
      'POST /api/venue-bookings/a1/cancel': reply,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fireEvent.click((await screen.findAllByRole('button', { name: 'Cancel arrangement' }))[0]!);
    await fireEvent.update(screen.getByLabelText('Reason for cancelling'), 'Too small');
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cancel arrangement' })
      .every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    api.set(list, { body: { items: [cancelled, other] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh booking requests' }));
    await screen.findByText('Cancellation reason: Too small');
    expect(screen.queryByRole('form', { name: 'Cancel Main Hall' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel arrangement' })).toBeEnabled();
  });

  it('KAN-82-AC5/AC6 offers a linked replacement for a cancelled arrangement and explains it stays cancelled', async () => {
    const api = stubApi({
      [list]: { body: { items: [cancelled, other] } },
      'GET /api/venues/search-venues': venues,
      [`POST ${base}/venue-bookings`]: { status: 201, body: { booking: { ...pending, id: 'r1', replacesBookingId: 'a1' } } },
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByText('Cancelled; not replaced. This arrangement no longer reserves the venue.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Request replacement' }));
    const select = screen.getByLabelText(/This request replaces/) as HTMLSelectElement;
    expect(select.value).toBe('a1');
    expect(select.selectedOptions[0]!.textContent).toContain('(cancelled)');
    expect(screen.getByText(/The cancelled arrangement stays cancelled\./)).toBeInTheDocument();
    await fillAndSubmit();
    await screen.findByText('A venue booking request for Main Hall was submitted for review.');
    expect(api.writes()[0]!.body).toMatchObject({ replacesBookingId: 'a1' });
  });

  it('KAN-82-AC8 shows replacement links both ways and stops offering a replacement while one is live', async () => {
    stubApi({
      [list]: { body: { items: [
        { ...cancelled, replacedByBookingIds: ['r1'] },
        { ...pending, id: 'r1', venueName: 'Studio', replacesBookingId: 'a1' },
      ] } },
      'GET /api/venues/search-venues': venues,
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    expect(await screen.findByText(/^Replaced by Studio, 1 Dec 2026.*\(Pending\)\.$/)).toBeInTheDocument();
    expect(screen.getByText(/^Replaces the cancelled arrangement Main Hall, 1 Dec 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request replacement' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/This request replaces/)).not.toBeInTheDocument();
  });

  it('KAN-82-AC12 a refresh drops a confirmation and a replacement choice that no longer match the current list', async () => {
    const api = stubApi({ [list]: { body: { items: [approved, cancelled, other] } }, 'GET /api/venues/search-venues': venues });
    const twoCancelled = [approved, { ...cancelled, id: 'c1' }, other];
    api.set(list, { body: { items: twoCancelled } });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fireEvent.click(await screen.findByRole('button', { name: 'Request replacement' }));
    expect((screen.getByLabelText(/This request replaces/) as HTMLSelectElement).value).toBe('c1');
    await fireEvent.click(screen.getAllByRole('button', { name: 'Cancel arrangement' })[0]!);
    expect(screen.getByRole('form', { name: 'Cancel Main Hall' })).toBeInTheDocument();
    // Someone else cancelled a1 meanwhile, and c1 is no longer listed.
    api.set(list, { body: { items: [{ ...cancelled, id: 'a1' }, other] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh booking requests' }));
    expect((await screen.findByLabelText(/This request replaces/) as HTMLSelectElement).value).toBe('');
    expect(screen.queryByRole('form', { name: 'Cancel Main Hall' })).not.toBeInTheDocument();
  });

  it('KAN-82-AC10 a cancel refused because access was lost hides the panel content', async () => {
    stubApi({
      [list]: { body: { items: [approved] } },
      'GET /api/venues/search-venues': venues,
      'POST /api/venue-bookings/a1/cancel': apiError(404, 'VENUE_BOOKING_NOT_FOUND', 'The venue booking request was not found.'),
    });
    render(VenueBookingPanel, { props: coordinatorProps });
    await fireEvent.click(await screen.findByRole('button', { name: 'Cancel arrangement' }));
    await fireEvent.update(screen.getByLabelText('Reason for cancelling'), 'Too small');
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByText(/no longer have access to its venue bookings/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel arrangement' })).not.toBeInTheDocument();
  });

  it.each(['SUBMITTED', 'CANCELLED'])('KAN-82-AC4 offers no per-arrangement actions for a %s event', async (status) => {
    stubApi({ [list]: { body: { items: [approved, cancelled] } }, 'GET /api/venues/search-venues': venues });
    render(VenueBookingPanel, { props: { ...coordinatorProps, status } });
    await screen.findAllByText('Main Hall');
    expect(screen.queryByRole('button', { name: 'Cancel arrangement' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request replacement' })).not.toBeInTheDocument();
  });
});

