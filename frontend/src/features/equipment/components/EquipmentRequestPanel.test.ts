import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import { apiError, availabilityItem, equipmentRequest, jsonResponse, stubApi } from '../test-helpers';
import EquipmentRequestPanel from './EquipmentRequestPanel.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null };
const list = '/api/equipment-requests?eventRequestId=event-1';
const eventDetail = { id: 'event-1', startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z' };

interface PanelProps {
  eventRequestId: string; status: string; viewerRole: string; isOwner?: boolean;
  startsAt?: string | null; endsAt?: string | null;
}

function renderPanel(props: Partial<PanelProps> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  });
  return render(EquipmentRequestPanel, {
    props: { eventRequestId: 'event-1', status: 'APPROVED', viewerRole: 'EVENT_ORGANISER', isOwner: true, ...props },
    global: { plugins: [router] },
  });
}

beforeEach(() => { session.user = { id: 'organiser-1', role: 'EVENT_ORGANISER' }; });

describe('equipment request panel', () => {
  it('lists the event\'s requests with status, period and decision reason', async () => {
    stubApi({ [`GET ${list}`]: jsonResponse({ items: [
      equipmentRequest({ notes: 'Stage left' }),
      equipmentRequest({ id: 'request-2', equipmentName: 'Lectern', status: 'REJECTED', decisionReason: 'Out for repair' }),
    ] }) });
    renderPanel();
    expect(screen.getByText('Loading equipment requests…')).toBeInTheDocument();

    const rows = within(await screen.findByRole('list', { name: 'Equipment requests for this event' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('2 × Projector');
    expect(rows[0]).toHaveTextContent('Awaiting decision');
    expect(rows[0]).toHaveTextContent('1 Oct 2026');
    expect(rows[0]).toHaveTextContent('Stage left');
    expect(within(rows[0]!).getByRole('button', { name: 'Edit Projector request' })).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('Reason: Out for repair');
    expect(within(rows[1]!).queryByRole('button')).not.toBeInTheDocument();
  });

  it('adds a request using the event period and shows what is available in the picker', async () => {
    const api = stubApi({
      [`GET ${list}`]: [jsonResponse({ items: [] }), jsonResponse({ items: [equipmentRequest({ quantity: 3 })] })],
      'GET /api/events/event-1': jsonResponse(eventDetail),
      'GET /api/equipment/availability': jsonResponse({ items: [
        availabilityItem(), availabilityItem({ equipmentTypeId: 'type-2', name: 'Lectern', totalQuantity: 1, available: 0 }),
      ] }),
      'POST /api/equipment-requests': jsonResponse(equipmentRequest({ quantity: 3 }), 201),
    });
    const view = renderPanel();
    expect(await screen.findByText('No equipment has been requested for this event yet.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Request equipment' }));

    expect(await screen.findByRole('option', { name: 'Projector (3 of 4 available)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lectern (0 of 1 available)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Needed from')).toHaveValue('2026-10-01T09:00');
    expect(screen.getByLabelText('Needed until')).toHaveValue('2026-10-01T17:00');
    const lookup = new URL(api.requests('GET', '/api/equipment/availability')[0]!.url, 'http://localhost');
    expect(lookup.searchParams.get('from')).toBe(eventDetail.startsAt);
    expect(lookup.searchParams.get('to')).toBe(eventDetail.endsAt);

    await fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose the equipment you need.');

    await fireEvent.update(screen.getByLabelText('Equipment type'), 'type-1');
    await fireEvent.update(screen.getByLabelText('Quantity'), '3');
    await fireEvent.update(screen.getByLabelText(/Notes/), ' Stage left ');
    expect(screen.getByText(/3 of 4 available for this period/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText('Equipment request sent to technical support.')).toBeInTheDocument();
    expect(api.requests('POST', '/api/equipment-requests')[0]!.body).toEqual({
      eventRequestId: 'event-1', equipmentTypeId: 'type-1', quantity: 3,
      startsAt: eventDetail.startsAt, endsAt: eventDetail.endsAt, notes: 'Stage left',
    });
    expect(await screen.findByText('3 × Projector')).toBeInTheDocument();
    expect(view.emitted().changed).toHaveLength(1);
  });

  it('uses a supplied event period without reading the event, and keeps the form open on a conflict', async () => {
    const api = stubApi({
      [`GET ${list}`]: jsonResponse({ items: [] }),
      'GET /api/equipment/availability': jsonResponse({ items: [availabilityItem()] }),
      'POST /api/equipment-requests': apiError('EQUIPMENT_QUANTITY_EXCEEDS_POOL', 'Only 4 of this equipment exist in total.', 409),
    });
    const view = renderPanel({ startsAt: eventDetail.startsAt, endsAt: eventDetail.endsAt, viewerRole: 'EVENT_COORDINATOR', isOwner: false });
    await fireEvent.click(await screen.findByRole('button', { name: 'Request equipment' }));
    await screen.findByRole('option', { name: /Projector/ });
    expect(api.requests('GET', '/api/events')).toHaveLength(0);

    await fireEvent.update(screen.getByLabelText('Equipment type'), 'type-1');
    await fireEvent.update(screen.getByLabelText('Quantity'), '9');
    expect(screen.getByText(/may not be able to reserve it all/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only 4 of this equipment exist in total.');
    expect(screen.getByLabelText('Quantity')).toHaveValue(9);
    expect(view.emitted().changed).toBeUndefined();
  });

  it('edits a pending request', async () => {
    const api = stubApi({
      [`GET ${list}`]: [jsonResponse({ items: [equipmentRequest()] }), jsonResponse({ items: [equipmentRequest({ quantity: 1 })] })],
      'GET /api/equipment/availability': jsonResponse({ items: [availabilityItem()] }),
      'PATCH /api/equipment-requests/request-1': jsonResponse(equipmentRequest({ quantity: 1 })),
    });
    const view = renderPanel();
    await fireEvent.click(await screen.findByRole('button', { name: 'Edit Projector request' }));
    expect(screen.getByText('Editing Projector')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toHaveValue(2);

    await fireEvent.update(screen.getByLabelText('Quantity'), '1');
    await fireEvent.update(screen.getByLabelText('Needed until'), '2026-10-01T08:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The end must be later than the start.');

    await fireEvent.update(screen.getByLabelText('Needed until'), '2026-10-01T12:00');
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Equipment request updated.')).toBeInTheDocument();
    expect(api.requests('PATCH', '/api/equipment-requests/request-1')[0]!.body).toEqual({
      quantity: 1, startsAt: '2026-10-01T01:00:00.000Z', endsAt: '2026-10-01T04:00:00.000Z', notes: null,
    });
    expect(view.emitted().changed).toHaveLength(1);
  });

  it('cancels a reservation only after confirmation', async () => {
    const api = stubApi({
      [`GET ${list}`]: [
        jsonResponse({ items: [equipmentRequest({ status: 'RESERVED' })] }),
        jsonResponse({ items: [equipmentRequest({ status: 'CANCELLED' })] }),
      ],
      'POST /api/equipment-requests/request-1/cancel': jsonResponse(equipmentRequest({ status: 'CANCELLED' })),
    });
    const view = renderPanel();
    const cancel = await screen.findByRole('button', { name: 'Cancel Projector request' });
    expect(screen.queryByRole('button', { name: 'Edit Projector request' })).not.toBeInTheDocument();
    await fireEvent.click(cancel);
    expect(screen.getByText('This releases the reservation.')).toBeInTheDocument();
    expect(api.requests('POST', '/api/equipment-requests')).toHaveLength(0);

    await fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));
    expect(await screen.findByText('Cancelled the request for 2 × Projector.')).toBeInTheDocument();
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(view.emitted().changed).toHaveLength(1);
  });

  it('reports a failed cancellation and shows the refreshed list', async () => {
    stubApi({
      [`GET ${list}`]: [jsonResponse({ items: [equipmentRequest()] }), jsonResponse({ items: [equipmentRequest({ status: 'REJECTED' })] })],
      'POST /api/equipment-requests/request-1/cancel': apiError('EQUIPMENT_REQUEST_NOT_CANCELLABLE', 'Already rejected.', 409),
    });
    const view = renderPanel();
    await fireEvent.click(await screen.findByRole('button', { name: 'Cancel Projector request' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already been rejected or cancelled');
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(view.emitted().changed).toBeUndefined();
  });

  it('shows other people\'s requests read-only and hides adding until the event is approved', async () => {
    stubApi({ [`GET ${list}`]: jsonResponse({ items: [equipmentRequest({ requestedBy: 'coordinator-1' })] }) });
    const first = renderPanel({ status: 'SUBMITTED' });
    await screen.findByText('2 × Projector');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    first.unmount();

    stubApi({ [`GET ${list}`]: jsonResponse({ items: [] }) });
    renderPanel({ status: 'SUBMITTED' });
    expect(await screen.findByText('Equipment can be requested once the event request is approved.')).toBeInTheDocument();
  });

  it('renders nothing for roles without access and never calls the API', () => {
    const api = stubApi({});
    const { container } = renderPanel({ viewerRole: 'ATTENDEE' });
    expect(container.querySelector('section')).toBeNull();
    expect(api.calls).toHaveLength(0);
  });

  it('handles unavailable, failed and expired reads', async () => {
    stubApi({ [`GET ${list}`]: apiError('EVENT_REQUEST_NOT_FOUND', 'The event request was not found.', 404) });
    const hidden = renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable to you');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    hidden.unmount();

    stubApi({ [`GET ${list}`]: [apiError('INTERNAL_ERROR', 'Unexpected.', 500), jsonResponse({ items: [] })] });
    const failed = renderPanel();
    await fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    failed.unmount();

    stubApi({ [`GET ${list}`]: apiError('AUTHENTICATION_REQUIRED', 'Sign in.', 401) });
    renderPanel();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
  });
});
