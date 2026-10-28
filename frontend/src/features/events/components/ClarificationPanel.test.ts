import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ClarificationPanel from './ClarificationPanel.vue';
import { apiError, stubApi } from './test-api';

const eventRequestId = 'event-one';
const base = `/api/events/${eventRequestId}`;
const open = {
  id: 'c1', eventRequestId, requestedById: 'casey', requestedByName: 'Casey', message: 'Which hall do you need?',
  response: null, createdAt: '2026-09-15T02:00:00.000Z', respondedAt: null,
};
const answered = { ...open, id: 'c0', message: 'How many helpers?', response: 'Six.', respondedAt: '2026-09-16T02:00:00.000Z' };

const coordinatorProps = { eventRequestId, status: 'SUBMITTED', viewerRole: 'EVENT_COORDINATOR' };
const ownerProps = { eventRequestId, status: 'CLARIFICATION_REQUESTED', viewerRole: 'EVENT_ORGANISER', isOwner: true };

describe('CF-04 clarification panel', () => {
  it('lets the coordinator ask a trimmed question and emits changed', async () => {
    const api = stubApi({
      [`GET ${base}/clarifications`]: { body: { items: [] } },
      [`POST ${base}/clarifications`]: { status: 201, body: { clarificationId: 'c1', eventRequestId, status: 'CLARIFICATION_REQUESTED' } },
    });
    const view = render(ClarificationPanel, { props: coordinatorProps });
    expect(await screen.findByText('No clarification has been requested.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Request clarification' });
    expect(submit).toBeDisabled();

    await fireEvent.update(screen.getByRole('textbox', { name: 'Question for the organiser' }), '  Which hall?  ');
    api.set(`GET ${base}/clarifications`, { body: { items: [{ ...open, message: 'Which hall?' }] } });
    await fireEvent.click(submit);

    expect(await screen.findByText('Your question was sent to the organiser.')).toBeInTheDocument();
    expect(await screen.findByText('Awaiting answer')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: `POST ${base}/clarifications`, body: { message: 'Which hall?' } }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('lets the coordinator mark a submitted request as under review', async () => {
    const api = stubApi({
      [`GET ${base}/clarifications`]: { body: { items: [] } },
      [`POST ${base}/start-review`]: { body: { eventRequestId, status: 'UNDER_REVIEW' } },
    });
    const view = render(ClarificationPanel, { props: coordinatorProps });
    await fireEvent.click(await screen.findByRole('button', { name: 'Mark as under review' }));
    expect(await screen.findByText('The request is now under review.')).toBeInTheDocument();
    expect(api.writes().map((call) => call.key)).toEqual([`POST ${base}/start-review`]);
    expect(view.emitted('changed')).toHaveLength(1);

    await view.rerender({ status: 'UNDER_REVIEW' });
    expect(screen.queryByRole('button', { name: 'Mark as under review' })).not.toBeInTheDocument();
    // The panel stays busy until its own list has been refreshed.
    expect(await screen.findByRole('button', { name: 'Request clarification' })).toBeInTheDocument();
  });

  it('KAN-66-AC101 sends the displayed revision with reviewer actions and shows a stale refusal', async () => {
    const api = stubApi({
      [`GET ${base}/clarifications`]: { body: { items: [] } },
      [`POST ${base}/start-review`]: apiError(409, 'EVENT_REVISION_CONFLICT', 'This event request changed after you opened it.'),
      [`POST ${base}/clarifications`]: { status: 201, body: { clarificationId: 'c1', eventRequestId, status: 'CLARIFICATION_REQUESTED' } },
    });
    render(ClarificationPanel, { props: { ...coordinatorProps, revision: 4 } });
    await fireEvent.click(await screen.findByRole('button', { name: 'Mark as under review' }));
    expect(await screen.findByText('This event request changed after you opened it.')).toBeInTheDocument();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Question for the organiser' }), 'Which hall?');
    await fireEvent.click(screen.getByRole('button', { name: 'Request clarification' }));
    expect(await screen.findByText('Your question was sent to the organiser.')).toBeInTheDocument();
    expect(api.writes()).toEqual([
      { key: `POST ${base}/start-review`, body: { expectedRevision: 4 } },
      { key: `POST ${base}/clarifications`, body: { message: 'Which hall?', expectedRevision: 4 } },
    ]);
  });

  it('lets the owning organiser answer only the open question', async () => {
    const api = stubApi({
      [`GET ${base}/clarifications`]: { body: { items: [answered, open] } },
      [`POST ${base}/clarifications/c1/response`]: { body: { clarificationId: 'c1', eventRequestId, status: 'SUBMITTED' } },
    });
    const view = render(ClarificationPanel, { props: ownerProps });
    expect(await screen.findByText('Six.')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Request clarification' })).not.toBeInTheDocument();

    await fireEvent.update(screen.getByRole('textbox', { name: 'Your answer' }), ' The main hall. ');
    await fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    expect(await screen.findByText('Your answer was sent to the coordinator.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: `POST ${base}/clarifications/c1/response`, body: { response: 'The main hall.' } }]);
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('shows a refusal without emitting changed and keeps the typed answer', async () => {
    stubApi({
      [`GET ${base}/clarifications`]: { body: { items: [open] } },
      [`POST ${base}/clarifications/c1/response`]: apiError(409, 'CLARIFICATION_ALREADY_ANSWERED', 'This clarification has already been answered.'),
    });
    const view = render(ClarificationPanel, { props: ownerProps });
    await fireEvent.update(await screen.findByRole('textbox', { name: 'Your answer' }), 'Main hall');
    await fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already been answered');
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveValue('Main hall');
    expect(view.emitted('changed')).toBeUndefined();
  });

  it('shows no write controls to a coordinator while waiting, or to a non-owner', async () => {
    stubApi({ [`GET ${base}/clarifications`]: { body: { items: [open] } } });
    const view = render(ClarificationPanel, { props: { ...coordinatorProps, status: 'CLARIFICATION_REQUESTED' } });
    expect(await screen.findByText('Waiting for the organiser to answer.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await view.rerender({ viewerRole: 'EVENT_ORGANISER', isOwner: false });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
