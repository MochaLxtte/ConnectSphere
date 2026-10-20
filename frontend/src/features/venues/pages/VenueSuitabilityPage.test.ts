import { fireEvent, render, screen, within } from '@testing-library/vue';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { authSession, type SignedInUser, type UserRole } from '../../auth/session.js';
import type { VenueSuitabilityAssessment, VenueSuitabilityContext } from '../api/venue-suitability';
import VenueSuitabilityPage from './VenueSuitabilityPage.vue';

vi.mock('../../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: UserRole = 'EVENT_COORDINATOR', id = 'coordinator-a'): SignedInUser =>
  ({ id, role, email: `${id}@example.test`, displayName: id });
const context: VenueSuitabilityContext = {
  event: {
    id: 'event-a', name: 'Career fair', startsAt: '2026-10-05T02:00:00Z', endsAt: '2026-10-05T04:00:00Z',
    expectedAttendance: 120, venueRequirements: 'A hall with a projector and theatre seating.',
    accessibilityNeeds: 'Step-free access and a hearing loop.',
  },
  requirementsVersion: 'a'.repeat(64),
  venues: [{
    id: 'venue-a', name: 'Harbour Hall', capacity: 200,
    facilities: ['Projector', 'Wi-Fi'], accessibilityFeatures: ['Hearing loop', 'Lift'], layouts: ['Theatre', 'Banquet'],
    wheelchairAccessible: true, opensAt: '08:00:00', closesAt: '22:00:00',
  }, {
    id: 'venue-b', name: 'Garden Room', capacity: 60, facilities: [], accessibilityFeatures: [], layouts: [],
    wheelchairAccessible: false, opensAt: null, closesAt: null,
  }],
};
const result: VenueSuitabilityAssessment = {
  eventId: 'event-a', eventName: 'Career fair', venueId: 'venue-a', venueName: 'Harbour Hall',
  checkedAt: '2026-10-04T02:00:00Z', outcome: 'SUITABLE',
  checks: [
    { key: 'venueActive', status: 'PASS', message: 'The venue is active.' },
    { key: 'capacity', status: 'PASS', message: 'Capacity 200 meets expected attendance 120.' },
    { key: 'facilities', status: 'PASS', message: 'The required facilities are available.' },
    { key: 'accessibility', status: 'PASS', message: 'The accessibility requirements are met.' },
    { key: 'layout', status: 'PASS', message: 'The requested layout is supported.' },
    { key: 'availability', status: 'PASS', message: 'No approved booking or operational block overlaps this event.' },
    { key: 'requirements', status: 'PASS', message: 'The requirement interpretation was confirmed.' },
  ],
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const apiError = (status: number, code: string, message = 'The request could not be completed.') =>
  json({ error: { code, message } }, status);
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
async function settle(pending: ReturnType<typeof deferred>, response: Response) {
  pending.resolve(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
}
async function open(id = 'event-a') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/reviews/:id/venue-suitability', component: VenueSuitabilityPage },
    { path: '/reviews/:id', component: { template: '<h1>Event review destination</h1>' } },
    { path: '/reviews', component: { template: '<h1>Review queue destination</h1>' } },
    { path: '/:pathMatch(.*)*', component: { template: '<h1>Other destination</h1>' } },
  ] });
  await router.push(`/reviews/${id}/venue-suitability`);
  await router.isReady();
  return { ...render(RouterView, { global: { plugins: [router] } }), router };
}
async function selectVenue(id = 'venue-a') {
  await fireEvent.update(await screen.findByRole('combobox', { name: 'Venue to assess' }), id);
}
async function confirm() {
  await fireEvent.click(screen.getByRole('checkbox', { name: /^I have reviewed the event requirements/ }));
}
async function check() {
  await selectVenue();
  await confirm();
  await fireEvent.click(screen.getByRole('button', { name: 'Check suitability' }));
}

beforeEach(() => { session.user = user(); session.loading = false; });

describe('KAN-52 venue suitability page', () => {
  it('shows the current event and selected venue capabilities without making an assessment yet', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await selectVenue();
    for (const value of ['Career fair', context.event.venueRequirements!, context.event.accessibilityNeeds!,
      '5 Oct 2026, 10:00 am', '120', '200', 'Projector, Wi-Fi', 'Hearing loop, Lift', 'Theatre, Banquet', 'Yes']) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Check suitability' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/events/event-a/venue-suitability');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends explicit interpretation, including requirements not offered by the venue', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ assessment: {
      ...result, outcome: 'UNSUITABLE', checks: [
        { key: 'facilities', status: 'FAIL', message: 'Missing required facilities: Swimming pool.' },
        { key: 'requirements', status: 'UNKNOWN', message: 'Some event requirements still need manual review.' },
      ],
    } }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await selectVenue();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Required facilities' }), ' Projector \nSwimming pool\nprojector\n');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Required accessibility features' }), ' Hearing loop\nLift ');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Required room layout' }), ' Theatre ');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Wheelchair access is required' }));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Requirements that still need clarification' }), ' Clarify lighting. ');
    await confirm();
    await fireEvent.click(screen.getByRole('button', { name: 'Check suitability' }));
    expect(await screen.findByRole('heading', { name: 'Unsuitable' })).toBeInTheDocument();
    const request = fetchMock.mock.calls[1]!;
    expect(request[0]).toBe('/api/events/event-a/venue-suitability');
    expect((request[1] as RequestInit).method).toBe('POST');
    expect(JSON.parse((request[1] as RequestInit).body as string)).toEqual({
      venueId: 'venue-a', requirementsVersion: context.requirementsVersion,
      facilities: ['Projector', 'Swimming pool'], accessibility: ['Hearing loop', 'Lift'], layout: 'Theatre',
      wheelchairRequired: true, requirementsConfirmed: true, unresolvedRequirements: 'Clarify lighting.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('distinguishes confirmed empty requirements from an unanswered form', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ assessment: result }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await check();
    await screen.findByRole('heading', { name: 'Suitable' });
    expect(JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string)).toMatchObject({
      facilities: [], accessibility: [], layout: null, wheelchairRequired: false,
      requirementsConfirmed: true, unresolvedRequirements: null,
    });
  });

  it.each([
    ['SUITABLE', 'Suitable', 'PASS', 'All objective and interpreted requirements are met.'],
    ['UNSUITABLE', 'Unsuitable', 'FAIL', 'The venue does not offer the required hearing loop.'],
    ['NEEDS_REVIEW', 'Needs review', 'UNKNOWN', 'Expected attendance has not been provided.'],
  ] as const)('displays %s and explains the individual check result', async (outcome, label, status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(context))
      .mockResolvedValueOnce(json({ assessment: { ...result, outcome, checks: [{ key: 'capacity', status, message }] } })));
    await open();
    await check();
    const assessment = await screen.findByRole('region', { name: 'Suitability assessment' });
    expect(within(assessment).getByRole('heading', { name: label })).toBeInTheDocument();
    expect(within(assessment).getByText(message)).toBeInTheDocument();
    expect(within(assessment).getByText(/4 Oct 2026, 10:00 am/)).toBeInTheDocument();
    expect(screen.getByText(/does not reserve a venue or change the event request/)).toBeInTheDocument();
  });

  it.each(['facilities', 'accessibility', 'layout', 'wheelchair', 'unresolved', 'venue'])(
    'clears the previous assessment and confirmation after changing %s', async (field) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ assessment: result })));
      await open();
      await check();
      await screen.findByRole('region', { name: 'Suitability assessment' });
      if (field === 'facilities') await fireEvent.update(screen.getByRole('textbox', { name: 'Required facilities' }), 'Projector');
      if (field === 'accessibility') await fireEvent.update(screen.getByRole('textbox', { name: 'Required accessibility features' }), 'Lift');
      if (field === 'layout') await fireEvent.update(screen.getByRole('combobox', { name: 'Required room layout' }), 'Theatre');
      if (field === 'wheelchair') await fireEvent.click(screen.getByRole('checkbox', { name: 'Wheelchair access is required' }));
      if (field === 'unresolved') await fireEvent.update(screen.getByRole('textbox', { name: 'Requirements that still need clarification' }), 'Check entrance width.');
      if (field === 'venue') await selectVenue('venue-b');
      expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /^I have reviewed the event requirements/ })).not.toBeChecked();
      expect(screen.getByRole('button', { name: 'Check suitability' })).toBeDisabled();
    },
  );

  it('invalidates the result when confirmation is withdrawn', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ assessment: result })));
    await open();
    await check();
    await screen.findByRole('heading', { name: 'Suitable' });
    await confirm();
    expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check suitability' })).toBeDisabled();
  });

  it.each([
    ['Required facilities', Array.from({ length: 31 }, (_, index) => `Facility ${index}`).join('\n'), 'at most 30'],
    ['Required accessibility features', 'x'.repeat(101), 'at most 100'],
    ['Requirements that still need clarification', 'x'.repeat(2001), 'at most 2,000'],
  ])('validates %s before any assessment request', async (field, value, message) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await selectVenue();
    await fireEvent.update(screen.getByRole('textbox', { name: field }), value);
    await confirm();
    expect(screen.getByRole('alert')).toHaveTextContent(message!);
    expect(screen.getByRole('button', { name: 'Check suitability' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes source context and clears interpretation and old results', async () => {
    const updated = { ...context, requirementsVersion: 'b'.repeat(64), event: { ...context.event, expectedAttendance: 250 } };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ assessment: result }))
      .mockResolvedValueOnce(json(updated));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await check();
    await screen.findByRole('heading', { name: 'Suitable' });
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh event and venues' }));
    expect(await screen.findByText('250')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Venue to assess' })).toHaveValue('');
    await selectVenue();
    expect(screen.getByRole('textbox', { name: 'Required facilities' })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /^I have reviewed the event requirements/ })).not.toBeChecked();
  });

  it('rechecks current data rather than reusing a prior suitable assessment', async () => {
    const unavailable = { ...result, outcome: 'UNSUITABLE', checks: [
      { key: 'availability', status: 'FAIL', message: 'A new operational block overlaps the event.' },
    ] };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ assessment: result }))
      .mockResolvedValueOnce(json({ assessment: unavailable }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await check();
    await screen.findByRole('heading', { name: 'Suitable' });
    await fireEvent.click(screen.getByRole('button', { name: 'Recheck suitability' }));
    expect(await screen.findByRole('heading', { name: 'Unsuitable' })).toBeInTheDocument();
    expect(screen.getByText('A new operational block overlaps the event.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2);
  });

  it('reloads changed requirements after 409 and requires a fresh interpretation', async () => {
    const updated = { ...context, requirementsVersion: 'c'.repeat(64), event: { ...context.event, venueRequirements: 'A pool and changing facilities.' } };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context))
      .mockResolvedValueOnce(apiError(409, 'SUITABILITY_CONTEXT_CHANGED'))
      .mockResolvedValueOnce(json(updated)).mockResolvedValueOnce(json({ assessment: result }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await selectVenue();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Required facilities' }), 'Projector');
    await confirm();
    await fireEvent.click(screen.getByRole('button', { name: 'Check suitability' }));
    expect(await screen.findByText('A pool and changing facilities.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('event requirements have changed');
    expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
    await selectVenue();
    expect(screen.getByRole('textbox', { name: 'Required facilities' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Check suitability' })).toBeDisabled();
    await confirm();
    await fireEvent.click(screen.getByRole('button', { name: 'Check suitability' }));
    await screen.findByRole('heading', { name: 'Suitable' });
    expect(JSON.parse((fetchMock.mock.calls[3]![1] as RequestInit).body as string).requirementsVersion).toBe(updated.requirementsVersion);
  });

  it('shows missing event values and a Needs review assessment', async () => {
    const incomplete = { ...context, event: { ...context.event, startsAt: null, expectedAttendance: null, venueRequirements: null, accessibilityNeeds: null } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(incomplete)).mockResolvedValueOnce(json({ assessment: {
      ...result, outcome: 'NEEDS_REVIEW', checks: [{ key: 'capacity', status: 'UNKNOWN', message: 'Expected attendance is missing.' }],
    } })));
    await open();
    await check();
    expect(await screen.findByRole('heading', { name: 'Needs review' })).toBeInTheDocument();
    expect(screen.getAllByText('Not provided')).toHaveLength(4);
    expect(screen.getByText('Expected attendance is missing.')).toBeInTheDocument();
  });

  it('KAN-52-AC101 shows an expected attendance of 0 as a value, not as "Not provided"', async () => {
    const zero = { ...context, event: { ...context.event, expectedAttendance: 0 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(zero)).mockResolvedValueOnce(json({ assessment: {
      ...result, checks: result.checks.map((item) => item.key === 'capacity'
        ? { ...item, message: 'Expected attendance (0) fits the venue capacity (200).' } : item),
    } })));
    await open();
    await check();

    expect(await screen.findByRole('heading', { name: 'Suitable' })).toBeInTheDocument();
    const attendance = screen.getByText('Expected attendance', { selector: 'dt' }).parentElement!;
    expect(within(attendance).getByText('0')).toBeInTheDocument();
    expect(within(attendance).queryByText('Not provided')).not.toBeInTheDocument();
    expect(screen.getByText('Expected attendance (0) fits the venue capacity (200).')).toBeInTheDocument();
  });

  it('shows a useful empty catalogue state without a requirement form', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ ...context, venues: [] })));
    await open();
    expect(await screen.findByText(/No active venues are available to assess/)).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('retries a failed context load without showing private stale information', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Offline')).mockResolvedValueOnce(json(context)));
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Career fair' })).toBeInTheDocument();
  });

  it('shows an assessment error and permits a manual retry without retaining the old result', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ assessment: result }))
      .mockRejectedValueOnce(new TypeError('Offline')).mockResolvedValueOnce(json({ assessment: result }));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await check();
    await screen.findByRole('heading', { name: 'Suitable' });
    await fireEvent.click(screen.getByRole('button', { name: 'Recheck suitability' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Check suitability' }));
    expect(await screen.findByRole('heading', { name: 'Suitable' })).toBeInTheDocument();
  });

  it('ignores a pending assessment after interpretation changes', async () => {
    const pending = deferred();
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockReturnValueOnce(pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    await open();
    await check();
    expect(screen.getByRole('button', { name: 'Checking suitability…' })).toBeDisabled();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Required facilities' }), 'New requirement');
    await settle(pending, json({ assessment: result }));
    expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check suitability' })).toBeDisabled();
    expect((fetchMock.mock.calls[1]![1] as RequestInit).signal?.aborted).toBe(true);
  });

  it('ignores a pending assessment after navigating to another event', async () => {
    const pending = deferred();
    const other = { ...context, event: { ...context.event, id: 'event-b', name: 'Dinner' } };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(json(other));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await open();
    await check();
    await router.push('/reviews/event-b/venue-suitability');
    await screen.findByRole('heading', { name: 'Dinner' });
    await settle(pending, json({ assessment: result }));
    expect(screen.getByRole('heading', { name: 'Dinner' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Venue to assess' })).toHaveValue('');
  });

  it.each(['/reviews', '/reviews/event-a', '/reviews/event-b'])('does not read another context while leaving for %s', async (path) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(context));
    vi.stubGlobal('fetch', fetchMock);
    const { router } = await open();
    await screen.findByRole('heading', { name: 'Career fair' });
    await router.push(path);
    await nextTick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
  });

  it('discards an old account context response when the account changes', async () => {
    const pending = deferred();
    const fetchMock = vi.fn().mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(apiError(404, 'EVENT_REQUEST_NOT_FOUND'));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    session.user = user('EVENT_COORDINATOR', 'coordinator-b');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable or you do not have permission');
    await settle(pending, json(context));
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
  });

  it.each(['sign out', 'switch account', 'lose coordinator role'] as const)(
    'discards a pending assessment after the user chooses to %s', async (change) => {
      const pending = deferred();
      const fetchMock = vi.fn().mockResolvedValueOnce(json(context)).mockReturnValueOnce(pending.promise);
      if (change === 'switch account') fetchMock.mockResolvedValueOnce(apiError(404, 'EVENT_REQUEST_NOT_FOUND'));
      vi.stubGlobal('fetch', fetchMock);
      await open();
      await check();
      session.user = change === 'sign out' ? null
        : change === 'switch account' ? user('EVENT_COORDINATOR', 'coordinator-b') : user('EVENT_ORGANISER');
      await nextTick();
      expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
      await settle(pending, json({ assessment: result }));
      expect(screen.queryByRole('region', { name: 'Suitability assessment' })).not.toBeInTheDocument();
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
      expect((fetchMock.mock.calls[1]![1] as RequestInit).signal?.aborted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(change === 'switch account' ? 3 : 2);
    },
  );

  it.each(['read', 'assessment'] as const)('clears the session and private data after 401 during %s', async (when) => {
    const fetchMock = vi.fn();
    if (when === 'assessment') fetchMock.mockResolvedValueOnce(json(context));
    fetchMock.mockResolvedValueOnce(apiError(401, 'AUTHENTICATION_REQUIRED'));
    vi.stubGlobal('fetch', fetchMock);
    await open();
    if (when === 'assessment') await check();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(session.user).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
  });

  it.each([403, 404])('removes context when the assessment returns %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(context))
      .mockResolvedValueOnce(apiError(status, status === 404 ? 'EVENT_REQUEST_NOT_FOUND' : 'ACTION_FORBIDDEN')));
    await open();
    await check();
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable or you do not have permission');
    expect(screen.queryByRole('heading', { name: 'Career fair' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it.each(['EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'] as const)('does not read event requirements for %s', async (role) => {
    session.user = user(role);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(screen.getByRole('alert')).toHaveTextContent("event's assigned coordinator");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('waits for the session and asks signed-out visitors to sign in without fetching', async () => {
    session.loading = true;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await open();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    session.user = null;
    session.loading = false;
    await nextTick();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
