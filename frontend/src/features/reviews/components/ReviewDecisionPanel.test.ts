import { fireEvent, render, screen, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ReviewDecisionPanel from './ReviewDecisionPanel.vue';
import type { RecordedReview, ReviewDecision, ReviewRequestSummary } from '../types';

const request: ReviewRequestSummary = { id: 'request-one', status: 'SUBMITTED' };
const review: RecordedReview = {
  reviewId: 'review-one', eventRequestId: request.id, reviewedBy: 'coordinator-one',
  decision: 'APPROVED', reason: 'Ready for planning.', createdAt: '2026-09-15T10:00:00.000Z',
};

function renderPanel() {
  return render(ReviewDecisionPanel, { props: { request, canMakeInitialDecision: true } });
}

async function choose(decision: ReviewDecision) {
  await fireEvent.click(screen.getByRole('radio', {
    name: decision === 'APPROVED' ? /^Approve request/ : /^Reject request/,
  }));
}

describe('KAN-36 coordinator decision panel', () => {
  it.each([
    ['APPROVED', '  Ready for planning.  ', 'Ready for planning.'],
    ['REJECTED', '  Unsuitable venue.  ', 'Unsuitable venue.'],
    ['APPROVED', '', null],
    ['REJECTED', '   ', null],
  ] as const)('emits %s with a trimmed optional reason', async (decision, reason, expectedReason) => {
    const view = renderPanel();
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeDisabled();
    await choose(decision);
    await fireEvent.update(screen.getByRole('textbox', { name: /Reason/ }), reason);
    await fireEvent.click(screen.getByRole('button', { name: /^Record (approval|rejection)$/ }));

    expect(view.emitted('submit')).toEqual([[{
      eventRequestId: request.id,
      input: { decision, reason: expectedReason },
    }]]);
    expect(screen.getByRole('status')).toHaveTextContent('Recording your decision');
    expect(screen.queryByText(/Request (approved|rejected)/)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Reason/ })).toBeDisabled();
    expect(screen.getAllByRole('radio').every((radio) => radio.matches(':disabled'))).toBe(true);
    expect(screen.getByRole('button', { name: /Recording decision/ })).toBeDisabled();
  });

  it('guards duplicate submissions before the parent supplies saving feedback', async () => {
    const view = renderPanel();
    await choose('APPROVED');
    const form = view.container.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(view.emitted('submit')).toHaveLength(1);
  });

  it.each(['APPROVED', 'REJECTED'] as const)('allows %s for an eligible request under review', async (decision) => {
    const view = render(ReviewDecisionPanel, {
      props: { request: { ...request, status: 'UNDER_REVIEW' }, canMakeInitialDecision: true },
    });
    await choose(decision);
    await fireEvent.update(screen.getByRole('textbox', { name: /Reason/ }), '  Review completed.  ');
    await fireEvent.click(screen.getByRole('button', { name: /^Record (approval|rejection)$/ }));

    expect(view.emitted('submit')).toEqual([[{
      eventRequestId: request.id, input: { decision, reason: 'Review completed.' },
    }]]);
    expect(screen.getByRole('button', { name: /Recording decision/ })).toBeDisabled();
  });

  it('disables all decision fields while the parent is saving', () => {
    render(ReviewDecisionPanel, {
      props: { request, canMakeInitialDecision: true, feedback: { eventRequestId: request.id, state: 'saving' } },
    });
    expect(screen.getByRole('group', { name: 'Choose a decision' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /Reason/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Recording decision/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Please wait');
  });

  it.each(['APPROVED', 'REJECTED'] as const)('shows success only after confirmed %s feedback', async (decision) => {
    const view = renderPanel();
    await choose(decision);
    await fireEvent.click(screen.getByRole('button', { name: /^Record (approval|rejection)$/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Recording your decision');

    await view.rerender({ feedback: { eventRequestId: request.id, state: 'saved', decision } });
    expect(screen.getByRole('status')).toHaveTextContent(
      decision === 'APPROVED' ? 'Request approved' : 'Request rejected',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it.each([
    { status: 'APPROVED', outcome: 'Request approved' },
    { status: 'REJECTED', outcome: 'Request rejected' },
    { status: 'SUBMITTED', review, outcome: 'Request approved' },
    { status: 'SUBMITTED', review: { ...review, decision: 'REJECTED' as const }, outcome: 'Request rejected' },
    { status: 'UNDER_REVIEW', review, outcome: 'Request approved' },
    { status: 'UNDER_REVIEW', review: { ...review, decision: 'REJECTED' as const }, outcome: 'Request rejected' },
  ])('prevents another decision for $status with $outcome', (state) => {
    const { outcome, ...savedRequest } = state;
    const view = render(ReviewDecisionPanel, {
      props: { request: { ...request, ...savedRequest }, canMakeInitialDecision: true },
    });
    expect(screen.getByRole('status')).toHaveTextContent(outcome);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(view.emitted('submit')).toBeUndefined();
  });

  it.each([false, undefined])('keeps a recorded outcome readable when decision eligibility is %s', (canMakeInitialDecision) => {
    render(ReviewDecisionPanel, {
      props: { request: { ...request, status: 'APPROVED', review }, canMakeInitialDecision },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Request approved');
    expect(screen.getByRole('status')).toHaveTextContent('Reason: Ready for planning.');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    { status: 'SUBMITTED', canMakeInitialDecision: false },
    { status: 'SUBMITTED', canMakeInitialDecision: undefined },
    { status: 'UNDER_REVIEW', canMakeInitialDecision: false },
    { status: 'UNDER_REVIEW', canMakeInitialDecision: undefined },
  ])('requires explicit eligibility for $status when the action is $canMakeInitialDecision', ({ status, canMakeInitialDecision }) => {
    const view = render(ReviewDecisionPanel, { props: { request: { ...request, status }, canMakeInitialDecision } });
    expect(screen.getByRole('status')).toHaveTextContent('You do not have permission to record an initial decision');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(view.emitted('submit')).toBeUndefined();
  });

  it('prevents submission when decision eligibility is revoked after making a selection', async () => {
    const view = renderPanel();
    await choose('APPROVED');
    const form = view.container.querySelector('form')!;
    await view.rerender({ canMakeInitialDecision: false });
    await fireEvent.submit(form);

    expect(screen.getByRole('status')).toHaveTextContent('You do not have permission');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(view.emitted('submit')).toBeUndefined();
  });

  it('displays the recorded rejection reason as text', () => {
    const reason = '<img src=x onerror="alert(1)"> Venue unavailable.\nChoose another venue.';
    const view = render(ReviewDecisionPanel, {
      props: {
        request: { ...request, status: 'REJECTED', review: { ...review, decision: 'REJECTED', reason } },
        canMakeInitialDecision: false,
      },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Request rejected');
    expect(screen.getByRole('status').textContent).toContain(reason);
    expect(view.container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('explains when the recorded decision has no reason', () => {
    render(ReviewDecisionPanel, {
      props: { request: { ...request, status: 'APPROVED', review: { ...review, reason: null } } },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Reason: No reason provided.');
  });

  it.each(['DRAFT', 'CLARIFICATION_REQUESTED', 'UNKNOWN_STATUS'])(
    'does not offer initial decisions for %s requests', (status) => {
      const view = render(ReviewDecisionPanel, { props: { request: { ...request, status }, canMakeInitialDecision: true } });
      expect(screen.getByRole('status')).toHaveTextContent(
        status === 'DRAFT' ? 'Draft requests cannot be approved or rejected' : 'not awaiting an initial review decision',
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(view.emitted('submit')).toBeUndefined();
    },
  );

  it('preserves input after a validation error and allows a corrected retry', async () => {
    const view = renderPanel();
    await choose('REJECTED');
    await fireEvent.update(screen.getByRole('textbox', { name: /Reason/ }), 'Needs a suitable venue.');
    await fireEvent.click(screen.getByRole('button', { name: 'Record rejection' }));
    await view.rerender({ feedback: { eventRequestId: request.id, state: 'error', code: 'INVALID_REVIEW_INPUT' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Check your decision and reason');
    expect(screen.getByRole('textbox', { name: /Reason/ })).toHaveValue('Needs a suitable venue.');
    expect(screen.getByRole('radio', { name: /^Reject request/ })).toBeChecked();
    await fireEvent.update(screen.getByRole('textbox', { name: /Reason/ }), 'Venue unavailable.');
    await fireEvent.click(screen.getByRole('button', { name: 'Record rejection' }));
    expect(view.emitted('submit')).toHaveLength(2);
    expect(view.emitted('submit')[1]).toEqual([{
      eventRequestId: request.id,
      input: { decision: 'REJECTED', reason: 'Venue unavailable.' },
    }]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['REVIEW_ALREADY_DECIDED', 'already has a decision'],
    ['REQUEST_NOT_REVIEWABLE', 'no longer awaiting an initial decision'],
    ['NETWORK_ERROR', 'could not confirm whether your decision was recorded'],
    ['INVALID_RESPONSE', 'could not confirm whether your decision was recorded'],
    ['INTERNAL_ERROR', 'could not confirm whether your decision was recorded'],
  ])('requires a refresh after %s instead of blindly resubmitting', async (code, message) => {
    const view = renderPanel();
    await choose('APPROVED');
    await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
    await view.rerender({ feedback: { eventRequestId: request.id, state: 'error', code } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Record/ })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh request' }));
    expect(view.emitted('refresh')).toEqual([[request.id]]);
    expect(view.emitted('submit')).toHaveLength(1);
  });

  it.each(['AUTHENTICATION_REQUIRED', 'REVIEW_FORBIDDEN', 'EVENT_REQUEST_NOT_FOUND'])(
    'hides controls and prior outcomes after %s', (code) => {
      render(ReviewDecisionPanel, {
        props: {
          request: { ...request, status: 'APPROVED', review },
          canMakeInitialDecision: true,
          feedback: { eventRequestId: request.id, state: 'error', code },
        },
      });
      expect(screen.getByRole('alert')).toHaveTextContent(
        code === 'AUTHENTICATION_REQUIRED' ? 'Sign in again' : 'unavailable or you no longer have permission',
      );
      expect(screen.queryByText('Request approved')).not.toBeInTheDocument();
      expect(screen.queryByText(/Ready for planning\./)).not.toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    },
  );

  it.each([
    { state: 'saving' },
    { state: 'saved', decision: 'REJECTED' },
    { state: 'error', code: 'REVIEW_FORBIDDEN' },
  ] as const)('resets when switching requests and ignores old $state feedback', async (lateFeedback) => {
    const view = renderPanel();
    await choose('REJECTED');
    await fireEvent.update(screen.getByRole('textbox', { name: /Reason/ }), 'Only for request one.');
    await fireEvent.click(screen.getByRole('button', { name: 'Record rejection' }));
    await view.rerender({ request: { id: 'request-two', status: 'SUBMITTED' } });
    await view.rerender({ feedback: { ...lateFeedback, eventRequestId: request.id } });

    expect(screen.getByRole('textbox', { name: /Reason/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /Reason/ })).toBeEnabled();
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Request rejected')).not.toBeInTheDocument();
    await choose('APPROVED');
    await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
    expect(view.emitted('submit')[1]).toEqual([{
      eventRequestId: 'request-two', input: { decision: 'APPROVED', reason: null },
    }]);
  });

  it('keeps the current submission locked when an earlier request reports a late result', async () => {
    const view = renderPanel();
    await choose('APPROVED');
    await fireEvent.click(screen.getByRole('button', { name: 'Record approval' }));
    await view.rerender({ request: { id: 'request-two', status: 'SUBMITTED' } });
    await choose('REJECTED');
    await fireEvent.click(screen.getByRole('button', { name: 'Record rejection' }));
    await view.rerender({ feedback: { eventRequestId: 'request-two', state: 'saving' } });

    for (const lateFeedback of [
      { eventRequestId: request.id, state: 'saved', decision: 'APPROVED' },
      { eventRequestId: request.id, state: 'error', code: 'INVALID_REVIEW_INPUT' },
    ] as const) {
      await view.rerender({ feedback: lateFeedback });
      expect(screen.getByRole('status')).toHaveTextContent('Recording your decision');
      expect(screen.getByRole('textbox', { name: /Reason/ })).toBeDisabled();
      expect(screen.getByRole('group', { name: 'Choose a decision' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Recording decision/ })).toBeDisabled();
      expect(screen.queryByText('Request approved')).not.toBeInTheDocument();
      await fireEvent.submit(view.container.querySelector('form')!);
      expect(view.emitted('submit')).toHaveLength(2);
    }

    await view.rerender({ feedback: { eventRequestId: 'request-two', state: 'saved', decision: 'REJECTED' } });
    expect(screen.getByRole('status')).toHaveTextContent('Request rejected');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('provides independent accessible labels and radio groups for multiple panels', () => {
    render({
      components: { ReviewDecisionPanel },
      template: '<ReviewDecisionPanel :request="first" can-make-initial-decision /><ReviewDecisionPanel :request="second" can-make-initial-decision />',
      setup: () => ({ first: request, second: { id: 'request-two', status: 'SUBMITTED' } }),
    });
    const panels = screen.getAllByRole('region', { name: 'Record a decision' });
    const reasons = panels.map((panel) => within(panel).getByRole('textbox', { name: 'Reason (optional)' }));
    expect(reasons[0].id).not.toBe(reasons[1].id);
    for (const reason of reasons) expect(reason).toHaveAccessibleDescription('Add an explanation to accompany the decision.');
    expect(within(panels[0]).getByRole('radio', { name: /^Approve request/ }).getAttribute('name'))
      .not.toBe(within(panels[1]).getByRole('radio', { name: /^Approve request/ }).getAttribute('name'));
  });
});
