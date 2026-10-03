# KAN-8 manual checks: venue booking decisions

These are **pending hosted checks**, not recorded passes. Use fictional data and record the actual build, tester, date, request IDs and results in [test evidence](test-evidence.md). Local automation is recorded separately under AUTO-20261004-KAN8-01.

## Prepare once

1. Start this branch with `npm.cmd run dev` and open `http://127.0.0.1:5173`.
2. Use provisioned Supabase Auth test accounts mapped through `app_users.supabase_user_id`: one `VENUE_STAFF`, the event's assigned `EVENT_COORDINATOR`, another coordinator, an organiser and `TECHNICAL_SUPPORT_STAFF`. Set passwords in Supabase Authentication, not in `app_users`. Keep credentials out of Git and screenshots.
3. KAN-8 uses the existing `venue_bookings`, `venues` and `event_requests` schema from migration **004**. There is **no new KAN-8 migration**. Keep the existing 001–006 migration history intact.
4. The merged remote branches supply search and calendar, but **KAN-53's booking-submission interface/API is not published in these branches yet**. For this independent test, have Arvin prepare fictional pending rows using Supabase Table Editor. This does not test booking submission; repeat the full user journey when KAN-53 is integrated.
5. Choose an active venue and an `APPROVED` fictional event assigned to the test coordinator. Populate the event's timing, attendance, venue requirements and accessibility needs so the staff detail can be checked. Use a venue/time without existing bookings or blocks. Record the IDs.

For each new `venue_bookings` row, enter:

| Column | Value |
| --- | --- |
| `event_request_id` | The approved test event's `id` |
| `venue_id` | The active test venue's `id` |
| `requested_by` | The assigned coordinator's **app_users.id**, not their Auth UUID |
| `status` | `PENDING` |
| `starts_at`, `ends_at` | Explicit timestamps with `+08:00`; end after start |
| `layout`, `notes` | Fictional requirements that are easy to recognise |
| `decided_by`, `decided_at`, `decision_reason` | Leave NULL; the API records these |

Let UUID/timestamp defaults fill the other columns. Prepare A and B with overlapping intervals, C at a separate free interval, and D overlapping an existing operational block. Use the same venue for A/B. Save their IDs before testing; decided rows leave the staff's pending queue.

If there is no suitable fictional operational block for D, have Arvin create one in `venue_unavailability` with its `venue_id`, explicit `starts_at`/`ends_at`, a test `reason` and the staff's application ID in `created_by`. Keep it separate from real bookings. KAN-55's block-creation interface is not implemented; this fixture setup does not test that story.

## 1. Staff queue, detail and approval (S2-T13)

- Sign in as Venue Staff and open **Venue bookings**. A/B/C/D should be pending; decided requests should not be in this queue.
- Open A. Verify the correct event, venue, requested booking times, event times, attendance, venue/accessibility requirements, layout and notes. Requirements are read from the current event, not a submitted snapshot.
- Select **Approve booking**, then **Record decision**. The result must show Approved and the recorded time. Reload: the result remains and decision controls are gone. A no longer appears in the pending queue.
- In Table Editor confirm A alone changed to `APPROVED`, `decided_by` is the staff application profile ID, `decided_at` is populated, and its event/venue IDs and interval are unchanged. The event's status remains `APPROVED`; booking approval does not confirm the event.

## 2. Coordinator outcome and calendar (S2-T13 / S2-T15)

- Sign in as the assigned coordinator. Open **Venue bookings** and A. Its Approved outcome, reason (if any) and timestamp should persist after reload. There are no decision controls.
- Open **Venue availability** for A's date/week. The venue is booked during A's interval. Search venues for the same interval: it is excluded. A booking ending exactly at another request's start does not conflict.

## 3. Reject with information (S2-T13)

- Sign in as Venue Staff, open C, select **Reject booking**, enter `Venue does not meet the requested layout`, then select **Record decision**.
- C becomes Rejected with that reason, staff ID and decision time. Reload and check the assigned coordinator's view shows the same result.
- C alone does not block the venue on the calendar/search. There may be other legitimate bookings or blocks, so use the prepared free interval.
- A reason is currently **optional**, with a 2,000-character limit. A mandatory venue rejection reason is not an agreed customer rule; it must not be inferred from event-request rejection.

## 4. Conflicts preserve the pending request (S2-T14 / S2-T15)

- As Venue Staff, try to approve B after A succeeded. Expect a conflict explaining that the venue is already booked. B remains `PENDING`, with decision fields NULL; A is unchanged.
- Try to approve D over the recorded operational block. Expect an unavailable-period conflict and the same unchanged pending state. Staff may reject B/D with an explanation.
- For a concurrency check, open two different overlapping pending requests in two staff sessions and approve nearly together. Exactly one may succeed. Automated PostgreSQL tests cover this race; a manual near-simultaneous click is supplementary evidence.

## 5. Repeated and opposite decisions are refused (S2-T14)

While signed in as Venue Staff on A's detail page, run this in browser DevTools Console. It uses the current page's booking ID and same-origin session:

```js
(async () => {
  const session = await fetch('/api/auth/me').then(r => r.json());
  if (session.user?.role !== 'VENUE_STAFF') return console.log('Sign in as Venue Staff first.');
  const bookingId = location.pathname.split('/').pop();
  for (const decision of ['APPROVED', 'REJECTED']) {
    const response = await fetch(`/api/venue-bookings/${bookingId}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason: 'Repeat-decision test' }),
    });
    console.log(decision, response.status, await response.json());
  }
})();
```

Both must return **409 `BOOKING_ALREADY_DECIDED`**. Verify A's original status, staff attribution, time and reason remain unchanged. The API does not replace a decision.

## 6. Role and relationship boundaries (S2-T14)

- As an organiser or Technical Support Staff, direct `/venue-bookings` and `/venue-bookings/<A-id>` show an access message with no booking data. Venue bookings navigation is hidden. Technical Support Staff still retains the separately authorised availability calendar.
- As another coordinator, A is absent from the list and its direct detail is unavailable. A direct GET to `/api/venue-bookings/<A-id>` returns 404, as for a missing record.
- While signed in as the assigned coordinator, POST an approval to a **pending** fixture through DevTools. Expect **403 `ACTION_FORBIDDEN`** and unchanged data. Organisers and other non-staff roles are also denied.
- Sign out and reopen list/detail URLs: a sign-in prompt replaces private data. Direct API list/detail/decision calls return **401** without a session.

## 7. Stale state and recovery

- Keep a pending detail open in two staff sessions. Decide in the first; submit from the second. It must show the conflict and reload the saved outcome, without replacing it.
- Temporarily stop the local backend or use DevTools offline. A failed read offers retry. An uncertain save asks you to refresh before another decision, since the first write may have reached the server. Restore connectivity and refresh; no write is automatically retried.
- Approval is currently limited to pending bookings for an `APPROVED` event and an active venue. A stale booking on another event status or inactive venue must refuse approval without changing it; rejection remains possible. These are documented implementation defaults awaiting team/customer review.

## Before pushing / acceptance

Record passes and failures separately. Have a teammate review the policy choices and code. After pushing, confirm the GitHub **PostgreSQL 17** CI and browser jobs pass. Supabase acceptance, CI, KAN-53 submission integration and a Sprint 2 acceptance decision are not established by local tests or these instructions. Update Jira only from the team's actual acceptance decision; do not change the 43-point baseline or invent review results.
