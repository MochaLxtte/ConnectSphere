import { fireEvent, screen, within } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import type { AttendeeList } from '../api/registrations';
import { errorResponse, flush, jsonResponse, renderAt } from '../test-helpers';
import AttendeeListPanel from './AttendeeListPanel.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});

const list: AttendeeList = {
  eventRequestId: 'event-1',
  counts: { registered: 1, withdrawn: 1, capacity: 50, spotsLeft: 49 },
  items: [
    { registrationId: 'r1', displayName: 'Alice Tan', email: 'alice@example.com', status: 'REGISTERED', registeredAt: '2026-09-17T17:30:00Z', withdrawnAt: null },
    { registrationId: 'r2', displayName: 'Ben Lim', email: 'ben@example.com', status: 'WITHDRAWN', registeredAt: '2026-09-16T01:00:00Z', withdrawnAt: '2026-09-18T01:00:00Z' },
  ],
};

const renderPanel = (props: Record<string, unknown> = {}) => renderAt(AttendeeListPanel, '/events/event-1', {
  props: { eventRequestId: 'event-1', status: 'APPROVED', viewerRole: 'EVENT_ORGANISER', ...props },
});

describe('CF-18 attendee list panel', () => {
  it.each([
    [{ viewerRole: 'EVENT_ORGANISER', isOwner: true }], [{ viewerRole: 'EVENT_COORDINATOR' }],
    [{ status: 'CONFIRMED' }], [{ status: 'COMPLETED' }],
  ])('shows counts and attendees for %j', async (props) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(list));
    vi.stubGlobal('fetch', fetchMock);
    await renderPanel(props);

    const table = await screen.findByRole('table');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/registrations/events/event-1/attendees');
    expect(screen.getByRole('heading', { name: 'Attendees' })).toBeInTheDocument();
    expect(screen.getByText(/1 registered\s+of 50 places · 49 left\s+· 1 withdrawn/)).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent('Alice Tan');
    expect(within(rows[1]!).getByRole('link', { name: 'alice@example.com' })).toHaveAttribute('href', 'mailto:alice@example.com');
    expect(rows[1]).toHaveTextContent('Registered');
    expect(rows[2]).toHaveTextContent('Withdrawn');
    expect(rows[2]).toHaveTextContent(/18 Sept? 2026/);
  });

  it.each([
    [{ viewerRole: 'ATTENDEE' }], [{ viewerRole: 'VENUE_STAFF' }], [{ viewerRole: 'EVENT_ORGANISER', isOwner: false }],
    [{ status: 'DRAFT' }], [{ status: 'SUBMITTED' }], [{ status: 'REJECTED' }],
  ])('renders nothing and makes no request for %j', async (props) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await renderPanel(props);
    await flush();
    expect(screen.queryByRole('heading', { name: 'Attendees' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an empty message with unlimited capacity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      eventRequestId: 'event-1', counts: { registered: 0, withdrawn: 0, capacity: null, spotsLeft: null }, items: [],
    })));
    await renderPanel();
    expect(await screen.findByText('No one has registered for this event yet.')).toBeInTheDocument();
    expect(screen.getByText(/0 registered\s+· no limit/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('masks an unavailable list, and retries other failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errorResponse(503, 'SERVICE_UNAVAILABLE', 'Service unavailable.'))
      .mockResolvedValueOnce(errorResponse(404, 'EVENT_NOT_FOUND', 'The event was not found.'));
    vi.stubGlobal('fetch', fetchMock);
    await renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable.');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('The attendee list is unavailable for this event.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('reloads for a different event and aborts the pending read on unmount', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(list))
      .mockReturnValueOnce(new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const view = await renderPanel();
    await screen.findByRole('table');

    await view.rerender({ eventRequestId: 'event-2' });
    expect(screen.queryByText('Alice Tan')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/registrations/events/event-2/attendees');
    view.unmount();
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).signal?.aborted).toBe(true);
  });
});
