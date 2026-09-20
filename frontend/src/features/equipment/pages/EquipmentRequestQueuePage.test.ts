import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { authSession } from '../../auth/session.js';
import { apiError, equipmentRequest, jsonResponse, stubApi } from '../test-helpers';
import EquipmentRequestQueuePage from './EquipmentRequestQueuePage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const session = authSession as { user: { id: string; role: string } | null };
const queue = '/api/equipment-requests?status=';

function queueItem(overrides: Record<string, unknown> = {}) {
  return equipmentRequest({
    eventName: 'Open day', organiserName: 'Olivia Organiser', requesterName: 'Olivia Organiser',
    totalQuantity: 4, reservedPeak: 1, available: 3, ...overrides,
  });
}

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: EquipmentRequestQueuePage }],
  });
  await router.push('/equipment/requests');
  await router.isReady();
  return render(EquipmentRequestQueuePage, { global: { plugins: [router] } });
}

beforeEach(() => {
  session.user = { id: 'staff-1', role: 'TECHNICAL_SUPPORT_STAFF' };
});

describe('equipment request queue page', () => {
  it('lists requests awaiting a decision with event, organiser and availability', async () => {
    const api = stubApi({ [`GET ${queue}`]: jsonResponse({ items: [
      queueItem({ notes: 'Stage left' }),
      queueItem({ id: 'request-2', equipmentName: 'Lectern', quantity: 5, available: 3, requesterName: 'Cody Coordinator' }),
    ] }) });
    await renderPage();
    expect(screen.getByText('Loading equipment requests…')).toBeInTheDocument();

    const rows = within(await screen.findByRole('list', { name: 'Equipment requests' })).getAllByRole('listitem');
    expect(api.requests('GET', queue)[0]!.url).toBe(`${queue}REQUESTED`);
    expect(rows[0]).toHaveTextContent('2 × Projector');
    expect(rows[0]).toHaveTextContent('Open day');
    expect(rows[0]).toHaveTextContent('Organiser: Olivia Organiser');
    expect(rows[0]).toHaveTextContent('3 of 4 available');
    expect(rows[0]).toHaveTextContent('Stage left');
    expect(rows[0]).not.toHaveTextContent('Requested by');
    expect(rows[1]).toHaveTextContent('Requested by Cody Coordinator');
    expect(rows[1]).toHaveTextContent('Only 3 free in this period');
  });

  it('reserves a request and reloads the queue', async () => {
    const api = stubApi({
      [`GET ${queue}`]: [jsonResponse({ items: [queueItem()] }), jsonResponse({ items: [] })],
      'POST /api/equipment-requests/request-1/decision': jsonResponse(equipmentRequest({ status: 'RESERVED' })),
    });
    await renderPage();
    await fireEvent.click(await screen.findByRole('button', { name: 'Reserve 2 Projector' }));

    expect(await screen.findByText('No requests are awaiting a decision')).toBeInTheDocument();
    expect(screen.getByText('Reserved 2 × Projector for Open day.')).toBeInTheDocument();
    expect(api.requests('POST', '/api/equipment-requests/request-1/decision')[0]!.body).toEqual({ decision: 'RESERVED' });
  });

  it('requires a reason before rejecting', async () => {
    const api = stubApi({
      [`GET ${queue}`]: [jsonResponse({ items: [queueItem()] }), jsonResponse({ items: [] })],
      'POST /api/equipment-requests/request-1/decision': jsonResponse(equipmentRequest({ status: 'REJECTED' })),
    });
    await renderPage();
    await fireEvent.click(await screen.findByRole('button', { name: 'Reject 2 Projector' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a reason');
    expect(api.requests('POST', '/api/equipment-requests')).toHaveLength(0);

    await fireEvent.update(screen.getByLabelText('Reason for rejecting'), '  Out for repair ');
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    expect(await screen.findByText('Rejected the request for 2 × Projector.')).toBeInTheDocument();
    expect(api.requests('POST', '/api/equipment-requests/request-1/decision')[0]!.body)
      .toEqual({ decision: 'REJECTED', reason: 'Out for repair' });
  });

  it('explains an EQUIPMENT_UNAVAILABLE conflict and refreshes availability', async () => {
    const api = stubApi({
      [`GET ${queue}`]: [jsonResponse({ items: [queueItem()] }), jsonResponse({ items: [queueItem({ available: 1 })] })],
      'POST /api/equipment-requests/request-1/decision': apiError(
        'EQUIPMENT_UNAVAILABLE', 'Not enough equipment is free in this period: 1 available, 2 requested.', 409,
      ),
    });
    await renderPage();
    await fireEvent.click(await screen.findByRole('button', { name: 'Reserve 2 Projector' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('1 available, 2 requested');
    expect(await screen.findByText('1 of 4 available')).toBeInTheDocument();
    expect(api.requests('GET', queue)).toHaveLength(2);
  });

  it('switches to another status without decision controls', async () => {
    const api = stubApi({
      [`GET ${queue}REQUESTED`]: jsonResponse({ items: [] }),
      [`GET ${queue}REJECTED`]: jsonResponse({ items: [queueItem({
        status: 'REJECTED', decisionReason: 'Out for repair', decidedAt: '2026-09-20T02:00:00.000Z',
      })] }),
    });
    await renderPage();
    await screen.findByText('No requests are awaiting a decision');
    await fireEvent.update(screen.getByLabelText('Show'), 'REJECTED');

    expect(await screen.findByText('Reason: Out for repair')).toBeInTheDocument();
    expect(api.requests('GET', `${queue}REJECTED`)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Reserve/ })).not.toBeInTheDocument();
  });

  it('handles forbidden, failed and expired reads', async () => {
    stubApi({ [`GET ${queue}`]: apiError('EQUIPMENT_REQUEST_FORBIDDEN', 'Forbidden.', 403) });
    const forbidden = await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('This page is for technical support staff.');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    forbidden.unmount();

    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const failed = await renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    failed.unmount();

    stubApi({ [`GET ${queue}`]: apiError('AUTHENTICATION_REQUIRED', 'Sign in.', 401) });
    await renderPage();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(session.user).toBeNull();
  });
});
