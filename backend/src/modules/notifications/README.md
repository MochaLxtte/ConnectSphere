# Notifications (KAN-64, CF-20)

In-app inbox for request, assignment and venue outcomes. Email, push and external delivery are out of scope.

| File | Role |
| --- | --- |
| `trigger-matrix.ts` | The trigger/recipient matrix (one pure module) and message wording. The matrix is a team assumption marked **To agree** in the [decision log](../../../../docs/requirements/assumptions-and-questions.md) |
| `notify.ts` | `recordNotifications(client, items)`: one multi-row insert on the caller's transaction client, `ON CONFLICT (recipient_id, dedupe_key) DO NOTHING` |
| `inbox.ts` | Caller-scoped list, unread count, mark one read and mark all read. One SQL visibility rule is re-checked on every read |
| `inbox-router.ts` | `/api/notifications` routes for every signed-in role; see the [API contract](../../../../docs/architecture/api-contract.md#notifications-kan-64-cf-20) |

## Rules to keep

- Write notifications inside the business transaction, after the change succeeds. Never write them after commit and never swallow a notification error: a failed insert must roll the action back.
- Every notification has a `dedupeKey` of the form `TYPE:outcomeId` (review, clarification, assignment-history or booking id), so a retry cannot create a second one.
- Recipients follow each person's relationship to the outcome, not "everyone except the actor"; an actor who is also a recipient gets an acknowledgement.
- Reads re-check the caller's current access (organiser owns the event; coordinator is the current assignee and the event is not a draft; Venue Staff for bookings). The `COORDINATOR_REASSIGNED_AWAY` notice is the only one visible without access and must name nothing.
- To add a trigger (KAN-80 and the change stories), add a builder to `trigger-matrix.ts`, call `recordNotifications` from the service, extend the visibility rule if the new notification points to a new kind of target, and update the decision log and tests.

Migration `008_notification_inbox.sql` adds `venue_booking_id` and `dedupe_key`. Tests: `backend/test/notifications/`, `database/tests/notifications/notification-inbox.integration.test.ts`.

## KAN-81 outage notices — 21 October 2026

Saving a venue outage records `VENUE_OUTAGE_RECOVERY_REQUIRED` for each affected event's current coordinator
(`outageRecoveryNotifications` in `trigger-matrix.ts`), keyed per outage and event and linked to the first affected
booking. It is written in the outage's transaction from `venues/block-service.ts`.

## 25 October 2026 — Concurrent outcomes and recipient overlap verification

`notification-inbox.integration.test.ts` now proves actual simultaneous insert contention for the same outcome/recipient, uses a deferred trigger to fail after the booking decision and all notifications have been inserted, and verifies complete rollback. A valid organiser-to-coordinator role transition exercises overlapping recipient rules without inventing simultaneous application roles. Actor acknowledgements remain; each intended person receives one notice and an unrelated account receives none. These regressions complete the previously missing TC-20-18/19 scenario boundaries. TC-20-20's original-scope/CR ownership is checked in the change register; later KAN-80/82/84 triggers are not claimed implemented.
