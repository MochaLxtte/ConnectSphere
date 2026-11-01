import { fireEvent, render, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { authSession, type SignedInUser } from '../../auth/session.js';
import type { EquipmentLine, EquipmentPlan } from '../api/arrangements';
import EquipmentRequestPanel from './EquipmentRequestPanel.vue';
import { apiError, stubApi } from './test-api';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const authSession = reactive({ user: null, loading: false });
  return { authSession, clearLocalSession: () => { authSession.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const coordinator = { id: 'coord', email: 'coord@example.test', displayName: 'Coord', role: 'EVENT_COORDINATOR' as const };
const eventId = 'event-one', planPath = '/api/events/event-one/equipment-requests';
const revision = 'a'.repeat(64), nextRevision = 'b'.repeat(64);
const startsAt = '2031-01-01T01:00:00.000Z', endsAt = '2031-01-01T03:00:00.000Z';
const line = (patch: Partial<EquipmentLine> = {}): EquipmentLine => ({
  id: 'line-one', eventRequestId: eventId, eventName: 'Event one', equipmentTypeId: 'projector',
  equipmentType: 'Projector', quantity: 2, startsAt, endsAt, technicalRequirements: 'HDMI',
  status: 'REQUESTED', eventStatus: 'APPROVED', revision, decisionReason: null, ...patch,
});
const plan = (patch: Partial<EquipmentPlan> = {}): EquipmentPlan => ({
  eventRequestId: eventId, status: 'REQUIRED', items: [], revision,
  eventStatus: 'APPROVED', eventStartsAt: startsAt, eventEndsAt: endsAt, ...patch,
});
const catalogue = { body: { items: [{ id: 'projector', name: 'Projector', category: null }, { id: 'speaker', name: 'Speaker', category: null }] } };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function setup(initial = plan()) {
  let current = initial;
  const api = stubApi({
    ['GET ' + planPath]: () => ({ body: { plan: current } }),
    'GET /api/equipment-types': catalogue,
  });
  return { ...api, setPlan: (value: EquipmentPlan) => { current = value; } };
}
beforeEach(() => { session.user = { ...coordinator }; session.loading = false; });

describe('KAN-63/KAN-26 coordinator equipment request panel', () => {
  it('records Not Required with the loaded revision and reloads the saved result', async () => {
    const api = setup();
    api.set('POST ' + planPath, () => {
      api.setPlan(plan({ status: 'NOT_REQUIRED', revision: nextRevision }));
      return { status: 201, body: { request: { status: 'NOT_REQUIRED', lines: [] } } };
    });
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByLabelText('No equipment is required'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    expect(await screen.findByText('No equipment is required for this event.')).toBeInTheDocument();
    expect(api.writes()).toEqual([{ key: 'POST ' + planPath, body: { lines: [], notRequired: true, revision } }]);
    expect(view.emitted('changed')).toHaveLength(1);
    expect(view.emitted('refresh')).toBeUndefined();
  });

  it('invalidates sibling readiness as soon as a save succeeds, before a delayed equipment readback', async () => {
    const pending = deferred<{ body: { plan: EquipmentPlan } }>();
    const api = setup();
    api.set('POST ' + planPath, () => {
      api.set('GET ' + planPath, () => pending.promise);
      return { body: { request: { status: 'NOT_REQUIRED', lines: [] } } };
    });
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByLabelText('No equipment is required'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    try {
      expect(await screen.findByText('Loading equipment requests…')).toBeInTheDocument();
      expect(view.emitted('changed')).toHaveLength(1);
      expect(screen.queryByText('Equipment marked Not Required.')).not.toBeInTheDocument();
      expect(api.writes()).toHaveLength(1);
    } finally {
      pending.resolve({ body: { plan: plan({ status: 'NOT_REQUIRED', revision: nextRevision }) } });
    }
    expect(await screen.findByText('Equipment marked Not Required.')).toBeInTheDocument();
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('does not display the prior save outcome after an account change during readback', async () => {
    const pending = deferred<{ body: { plan: EquipmentPlan } }>();
    const api = setup();
    api.set('POST ' + planPath, () => {
      api.set('GET ' + planPath, () => pending.promise);
      return { body: { request: { status: 'NOT_REQUIRED', lines: [] } } };
    });
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByLabelText('No equipment is required'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    try {
      await screen.findByText('Loading equipment requests…');
      expect(view.emitted('changed')).toHaveLength(1);
      api.set('GET ' + planPath, apiError(403, 'FORBIDDEN', 'Not assigned'));
      session.user = { ...coordinator, id: 'different-coordinator' };
      await nextTick();
    } finally {
      pending.resolve({ body: { plan: plan({ status: 'NOT_REQUIRED', revision: nextRevision }) } });
    }
    expect(await screen.findByRole('alert')).toHaveTextContent('Not assigned');
    expect(screen.queryByText('Equipment marked Not Required.')).not.toBeInTheDocument();
    expect(screen.queryByText('No equipment is required for this event.')).not.toBeInTheDocument();
    expect(view.emitted('changed')).toHaveLength(1);
  });

  it('refreshes dependent summaries on an explicit equipment reload but never loops on initial reads', async () => {
    const api = setup();
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await screen.findByLabelText('Equipment type');
    expect(view.emitted('refresh')).toBeUndefined();
    api.setPlan(plan({ status: 'NOT_REQUIRED', revision: nextRevision }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reload equipment' }));
    expect(await screen.findByText('No equipment is required for this event.')).toBeInTheDocument();
    expect(view.emitted('refresh')).toHaveLength(1);
    expect(view.emitted('changed')).toBeUndefined();
    expect(api.calls.filter(call => call.key === 'GET ' + planPath)).toHaveLength(2);
    expect(api.writes()).toHaveLength(0);
  });

  it.each([409, 403, 404, 500, 'network'])('reconciles dependent summaries after an uncertain or stale equipment save: %s', async failure => {
    const api = setup();
    api.set('POST ' + planPath, typeof failure === 'number'
      ? apiError(failure, 'SAVE_FAILED', 'Check current equipment before trying again.')
      : () => { throw new TypeError('Connection lost'); });
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.update(await screen.findByLabelText('Equipment type'), 'projector');
    await fireEvent.update(screen.getByLabelText('Quantity'), '3');
    await fireEvent.update(screen.getByLabelText('Technical requirements'), 'Retain the draft');
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    await screen.findByRole('alert');
    expect(view.emitted('refresh')).toHaveLength(1);
    expect(view.emitted('changed')).toBeUndefined();
    expect(api.writes()).toHaveLength(1);
    if (failure !== 403 && failure !== 404) {
      expect(screen.getByLabelText('Quantity')).toHaveValue(3);
      expect(screen.getByLabelText('Technical requirements')).toHaveValue('Retain the draft');
      expect(screen.getByRole('button', { name: 'Save equipment request' })).toBeDisabled();
    }
  });

  it.each([400, 422])('retains editable input without refreshing unrelated summaries for validation HTTP %s', async status => {
    const api = setup();
    api.set('POST ' + planPath, apiError(status, 'INVALID_REQUEST', 'Correct this equipment request.'));
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.update(await screen.findByLabelText('Equipment type'), 'projector');
    await fireEvent.update(screen.getByLabelText('Technical requirements'), 'Retain the draft');
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    await screen.findByRole('alert');
    expect(view.emitted('refresh')).toBeUndefined();
    expect(view.emitted('changed')).toBeUndefined();
    expect(screen.getByLabelText('Technical requirements')).toHaveValue('Retain the draft');
    expect(screen.getByRole('button', { name: 'Save equipment request' })).toBeEnabled();
    expect(api.writes()).toHaveLength(1);
  });

  it('revises a requested type using the event period while preserving other requested lines', async () => {
    const speaker = line({ id: 'speaker-line', equipmentTypeId: 'speaker', equipmentType: 'Speaker', quantity: 3 });
    const api = setup(plan({ items: [line({ technicalRequirements: null, notes: 'Legacy HDMI notes' }), speaker] }));
    api.set('POST ' + planPath, { body: { request: { status: 'REQUIRED', lines: [] } } });
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.update(await screen.findByLabelText('Equipment type'), 'projector');
    expect(screen.getByLabelText('Quantity')).toHaveValue(2);
    expect(screen.getByLabelText('Technical requirements')).toHaveValue('Legacy HDMI notes');
    await fireEvent.update(screen.getByLabelText('Quantity'), '4');
    await fireEvent.update(screen.getByLabelText('Technical requirements'), '  New HDMI requirements  ');
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    await vi.waitFor(() => expect(api.writes()).toHaveLength(1));
    expect(api.writes()[0]?.body).toEqual({ revision, notRequired: false, lines: [
      { equipmentTypeId: 'projector', quantity: 4, startsAt, endsAt, technicalRequirements: 'New HDMI requirements' },
      { equipmentTypeId: 'speaker', quantity: 3, startsAt, endsAt, technicalRequirements: 'HDMI' },
    ] });
    expect(screen.queryByLabelText('Starts (Singapore time)')).not.toBeInTheDocument();
  });

  it('blocks stale saves until an explicit reload and sends the new revision only on deliberate retry', async () => {
    const api = setup();
    api.set('POST ' + planPath, apiError(409, 'STALE_EQUIPMENT_REQUEST', 'Equipment changed. Reload first.'));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByLabelText('No equipment is required'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Equipment changed');
    expect(screen.getByRole('button', { name: 'Save equipment request' })).toBeDisabled();
    expect(api.writes()).toHaveLength(1);
    api.setPlan(plan({ revision: nextRevision }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reload equipment' }));
    await fireEvent.click(await screen.findByLabelText('No equipment is required'));
    expect(api.writes()).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    await vi.waitFor(() => expect(api.writes()).toHaveLength(2));
    expect(api.writes()[1]?.body).toEqual({ lines: [], notRequired: true, revision: nextRevision });
  });

  it('requires explicit reservation replacement and never silently saves over a reserved line', async () => {
    const api = setup(plan({ items: [line({ status: 'RESERVED' })] }));
    api.set('POST /api/equipment-requests/line-one/replace', { body: { replacement: {} } });
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByRole('button', { name: 'Replace reserved line' }));
    const confirm = screen.getByRole('button', { name: 'Confirm replacement' });
    expect(confirm).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Quantity'), '5');
    await fireEvent.click(screen.getByRole('checkbox', { name: /Release the existing reservation/ }));
    await fireEvent.click(confirm);
    await vi.waitFor(() => expect(api.writes()).toHaveLength(1));
    expect(api.writes()[0]).toEqual({ key: 'POST /api/equipment-requests/line-one/replace',
      body: { revision, replacement: { equipmentTypeId: 'projector', quantity: 5, startsAt, endsAt, technicalRequirements: 'HDMI' } } });
  });

  it.each(['REQUESTED', 'REJECTED'])('cancels a %s line and displays its saved release reason separately from the prior review', async status => {
    const decisionReason = status === 'REJECTED' ? 'No compatible stock' : null;
    const api = setup(plan({ items: [line({ status, decisionReason })] }));
    api.set('POST /api/equipment-requests/line-one/cancel', () => {
      const cancelled = line({ status: 'CANCELLED', decisionReason, releaseReason: 'No longer needed' });
      api.setPlan(plan({ items: [cancelled], revision: nextRevision }));
      return { body: { request: cancelled } };
    });
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByRole('button', { name: 'Cancel line' }));
    expect(screen.getByRole('button', { name: 'Confirm line cancellation' })).toBeDisabled();
    await fireEvent.update(screen.getByLabelText('Cancellation reason'), '  No longer needed  ');
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm line cancellation' }));
    expect(await screen.findByText(/CANCELLED/)).toBeInTheDocument();
    expect(screen.getByText('Release reason: No longer needed')).toBeInTheDocument();
    if (decisionReason) {
      expect(screen.getByText('Previous review reason: No compatible stock')).toBeInTheDocument();
      expect(screen.queryByText(/CANCELLED: No compatible stock/)).not.toBeInTheDocument();
    } else {
      expect(screen.queryByText(/Previous review reason:/)).not.toBeInTheDocument();
    }
    expect(screen.getByText('Projector', { selector: 'strong' })).toBeInTheDocument();
    expect(api.writes()[0]?.body).toEqual({ reason: 'No longer needed', revision });
    await fireEvent.click(screen.getByRole('button', { name: 'Reload equipment' }));
    expect(await screen.findByText('Release reason: No longer needed')).toBeInTheDocument();
    expect(api.writes()).toHaveLength(1);
  });

  it.each(['REQUESTED', 'RESERVED', 'REJECTED'])('keeps the current %s outcome distinct from release history', async status => {
    const decisionReason = status === 'REJECTED' ? 'No compatible stock' : null;
    const api = setup(plan({ items: [line({ status, decisionReason })] }));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    expect(await screen.findByText(decisionReason ? `— ${status}: ${decisionReason}` : `— ${status}`)).toBeInTheDocument();
    expect(screen.queryByText(/Release reason:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Previous review reason:/)).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it.each(['Event cancelled', 'Event completed'])('shows the saved lifecycle release reason %s without inventing an earlier review', async releaseReason => {
    const api = setup(plan({ items: [line({ status: 'CANCELLED', releaseReason })] }));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    expect(await screen.findByText(`Release reason: ${releaseReason}`)).toBeInTheDocument();
    expect(screen.getByText('— CANCELLED')).toBeInTheDocument();
    expect(screen.queryByText(/Previous review reason:/)).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it.each([undefined, null, ''])('does not substitute an old rejection when the release reason is %s', async releaseReason => {
    const api = setup(plan({ items: [line({ status: 'CANCELLED', decisionReason: 'No compatible stock', releaseReason })] }));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    expect(await screen.findByText('Release reason: Not recorded')).toBeInTheDocument();
    expect(screen.getByText('Previous review reason: No compatible stock')).toBeInTheDocument();
    expect(screen.queryByText(/CANCELLED: No compatible stock/)).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it('reloads a no-equipment plan when an approved KAN-15 change advances the event revision', async () => {
    const api = setup(plan({ status: 'NOT_REQUIRED' }));
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED', revision: 1 } });
    expect(await screen.findByText('No equipment is required for this event.')).toBeInTheDocument();
    api.setPlan(plan({ revision: nextRevision }));
    await view.rerender({ eventRequestId: eventId, status: 'APPROVED', revision: 2 });
    expect(await screen.findByText('No active equipment request lines have been saved.')).toBeInTheDocument();
    expect(screen.getByLabelText('No equipment is required')).not.toBeChecked();
    expect(api.writes()).toHaveLength(0);
  });

  it('ignores old route responses and clears the old form immediately', async () => {
    const old = deferred<{ body: unknown }>();
    const api = setup();
    api.set('GET ' + planPath, () => old.promise);
    api.set('GET /api/events/event-two/equipment-requests', { body: { plan: plan({ eventRequestId: 'event-two' }) } });
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await view.rerender({ eventRequestId: 'event-two', status: 'APPROVED' });
    expect(await screen.findByLabelText('Equipment type')).toBeInTheDocument();
    old.resolve({ body: { plan: plan({ items: [line({ equipmentType: 'Private old equipment' })] }) } });
    await nextTick(); await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Private old equipment')).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it('ignores a late write after switching accounts and does not emit success or leak old details', async () => {
    const pending = deferred<{ body: unknown }>();
    const api = setup();
    api.set('POST ' + planPath, () => pending.promise);
    const view = render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await fireEvent.click(await screen.findByLabelText('No equipment is required'));
    await fireEvent.click(screen.getByRole('button', { name: 'Save equipment request' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    session.user = { ...coordinator, id: 'different-coordinator' };
    api.set('GET ' + planPath, apiError(403, 'FORBIDDEN', 'Not assigned'));
    await nextTick();
    pending.resolve({ body: { request: { status: 'NOT_REQUIRED', lines: [] } } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText('Equipment marked Not Required.')).not.toBeInTheDocument();
    expect(view.emitted('changed')).toBeUndefined();
  });

  it.each(['CONFIRMED', 'APPROVED'])('shows Technical Support read-only equipment for %s events', async status => {
    session.user = { ...coordinator, role: 'TECHNICAL_SUPPORT_STAFF' };
    const api = setup(plan({ eventStatus: status, items: [line()] }));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status } });
    expect(await screen.findByText('Projector')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save equipment request' })).not.toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it('keeps confirmed coordinator arrangements read-only', async () => {
    setup(plan({ eventStatus: 'CONFIRMED', items: [line({ status: 'RESERVED', eventStatus: 'CONFIRMED' })] }));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'CONFIRMED' } });
    expect(await screen.findByText('Projector')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replace reserved line' })).not.toBeInTheDocument();
  });

  it('KAN-84-AC6/AC7: reopens a confirmed plan while the safety review requests technical changes', async () => {
    setup(plan({ eventStatus: 'CONFIRMED', technicalRemediation: true, items: [line({ status: 'RESERVED', eventStatus: 'CONFIRMED' })] }));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'CONFIRMED' } });
    expect(await screen.findByRole('button', { name: 'Replace reserved line' })).toBeInTheDocument();
  });

  it('does not fetch protected information for an unauthorised role', () => {
    session.user = { ...coordinator, role: 'ATTENDEE' };
    const api = setup();
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    expect(api.calls).toHaveLength(0);
    expect(screen.queryByText('Equipment arrangements')).not.toBeInTheDocument();
  });

  it.each([403, 500])('does not show an empty plan or editable form after HTTP %s load failure', async status => {
    const api = setup(); api.set('GET ' + planPath, apiError(status, 'FAILED', 'Cannot load plan'));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot load plan');
    expect(screen.queryByText('No active equipment request lines have been saved.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save equipment request' })).not.toBeInTheDocument();
  });

  it('clears the session when access expires', async () => {
    const api = setup(); api.set('GET ' + planPath, apiError(401, 'UNAUTHENTICATED', 'Session expired'));
    render(EquipmentRequestPanel, { props: { eventRequestId: eventId, status: 'APPROVED' } });
    await vi.waitFor(() => expect(session.user).toBeNull());
    expect(screen.queryByText('Equipment arrangements')).not.toBeInTheDocument();
  });
});
