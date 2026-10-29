import { describe, expect, it, vi } from 'vitest';
import { fetchAttendeeEvent, fetchAttendeeEvents, fetchOwnRegistrations, registerForEvent, registrationStatusLabel } from './attendee-events';

describe('KAN-14 attendee API client', () => {
  it('uses the attendee endpoints, encodes ids, passes signals and sends an empty body to register', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'a' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'r' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ event: { id: 'a/b' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ changed: true })));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await fetchAttendeeEvents(signal)).toEqual([{ id: 'a' }]);
    expect(await fetchOwnRegistrations(signal)).toEqual([{ id: 'r' }]);
    expect(await fetchAttendeeEvent('a/b', signal)).toEqual({ event: { id: 'a/b' } });
    expect(await registerForEvent('a/b', signal)).toEqual({ changed: true });
    expect(fetch.mock.calls.map(call => call[0])).toEqual(['/api/attendee/events', '/api/attendee/registrations', '/api/attendee/events/a%2Fb', '/api/attendee/events/a%2Fb/register']);
    expect(fetch.mock.calls[3]?.[1]).toMatchObject({ method: 'POST', body: '{}' });
    for (const call of fetch.mock.calls) expect(call[1].signal).toBe(signal);
  });
  it('preserves structured refusals such as a full event', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'REGISTRATION_FULL', message: 'This event is full.' } }), { status: 409 })));
    await expect(registerForEvent('a')).rejects.toMatchObject({ status: 409, code: 'REGISTRATION_FULL', message: 'This event is full.' });
  });
  it('labels each own-registration state in plain words', () => {
    expect(registrationStatusLabel).toEqual({ REGISTERED: 'Registered', WITHDRAWN: 'Withdrawn', CANCELLED: 'Cancelled with the event' });
  });
});
