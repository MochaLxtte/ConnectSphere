import { fireEvent, render, screen, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import StatusHistoryPanel from './StatusHistoryPanel.vue';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const endpoint = `GET /api/events/${eventRequestId}/history`;
const entries = [
  { id: 'h1', fromStatus: null, toStatus: 'DRAFT', changedById: null, changedByName: null, createdAt: '2026-09-01T02:00:00.000Z' },
  { id: 'h2', fromStatus: 'DRAFT', toStatus: 'SUBMITTED', changedById: 'olive', changedByName: 'Olive', createdAt: '2026-09-02T02:00:00.000Z' },
];

describe('KAN-16 read-only status history', () => {
  it.each([
    ['DRAFT', 'Draft'], ['SUBMITTED', 'Submitted'], ['UNDER_REVIEW', 'Under review'],
    ['CLARIFICATION_REQUESTED', 'Clarification requested'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'],
    ['CONFIRMED', 'Confirmed'], ['CANCELLED', 'Cancelled'], ['COMPLETED', 'Completed'],
  ])('shows %s without lifecycle controls or mutation requests', async (status, label) => {
    const api = stubApi({ [endpoint]: { body: { items: entries } } });
    render(StatusHistoryPanel, { props: { eventRequestId, status } });
    const items = within(await screen.findByRole('list', { name: 'Status history' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Draft');
    expect(items[1]).toHaveTextContent('Submitted from Draft');
    expect(items[1]).toHaveTextContent('Olive');
    expect(screen.getByText(/Current status:/)).toHaveTextContent(`Current status: ${label}`);
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.key)).toEqual([endpoint]);
    expect(api.writes()).toEqual([]);
  });

  it('reloads history after review or clarification changes the current status', async () => {
    const api = stubApi({ [endpoint]: { body: { items: entries } } });
    const view = render(StatusHistoryPanel, { props: { eventRequestId, status: 'SUBMITTED' } });
    await screen.findByRole('list', { name: 'Status history' });
    api.set(endpoint, { body: { items: [...entries, {
      id: 'h3', fromStatus: 'SUBMITTED', toStatus: 'UNDER_REVIEW', changedById: 'casey', changedByName: 'Casey', createdAt: '2026-09-03T02:00:00.000Z',
    }] } });
    await view.rerender({ status: 'UNDER_REVIEW' });
    expect(await screen.findByText('Casey', { exact: false })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Status history' })).getAllByRole('listitem')).toHaveLength(3);
    expect(api.calls.map((call) => call.key)).toEqual([endpoint, endpoint]);
    expect(api.writes()).toEqual([]);
  });

  it('retries unavailable history with a read request and shows an empty result', async () => {
    const api = stubApi({ [endpoint]: apiError(500, 'INTERNAL_ERROR', 'History is unavailable.') });
    render(StatusHistoryPanel, { props: { eventRequestId, status: 'APPROVED' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('History is unavailable.');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    api.set(endpoint, { body: { items: [] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No status changes have been recorded.');
    expect(api.calls.map((call) => call.key)).toEqual([endpoint, endpoint]);
    expect(api.writes()).toEqual([]);
  });
});
