# Notifications (KAN-64, CF-20)

## 29 October 2026 — KAN-80 later outcomes

Migration 019 adds optional registration/change targets and emits registration, final-event and affected-equipment-shortfall notices within actor transactions, reusing the recipient/outcome unique index. Registration outcome versions distinguish re-entry from a replay. KAN-15 writes allowed attendee-relevant change notices and current-coordinator decision acknowledgements through `recordNotifications`. Attendee inboxes expose only their own safe registration/outcome messages and `/registrations`; organiser/coordinator registration notices lead to the protected roster. Change notices link to the identified change on a currently authorized event. Source services must still recheck role/ownership and use `inActorTransaction`; the hooks do not implement KAN-14, KAN-18 or KAN-61. CR-2/4/6 remain separate. Local automated evidence is in [test evidence](../../../../docs/testing/test-evidence.md#29-october-2026--kan-17-kan-67-and-kan-80-implementation-verification); shared migration and integrated acceptance remain Not executed.

In-app inbox for request, assignment, venue and equipment-reservation outcomes. Email, push and external delivery are out of scope.

| File | Role |
| --- | --- |
| `trigger-matrix.ts` | The trigger/recipient matrix (one pure module) and message wording. The matrix is a team assumption marked **To agree** in the [decision log](../../../../docs/requirements/assumptions-and-questions.md) |
| `notify.ts` | `recordNotifications(client, items)`: one multi-row insert on the caller's transaction client, `ON CONFLICT (recipient_id, dedupe_key) DO NOTHING` |
| `inbox.ts` | Caller-scoped list, unread count, mark one read and mark all read. One SQL visibility rule is re-checked on every read |
| `inbox-router.ts` | `/api/notifications` routes for every signed-in role; see the [API contract](../../../../docs/architecture/api-contract.md#notifications-kan-64-cf-20) |

## Rules to keep

- Write notifications inside the business transaction, after the change succeeds. Never write them after commit and never swallow a notification error: a failed insert must roll the action back.
- Every notification has a `dedupeKey` of the form `TYPE:outcomeId` (review, clarification, assignment-history, booking or equipment-request id), so a retry cannot create a second one.
- Recipients follow each person's relationship to the outcome, not "everyone except the actor"; an actor who is also a recipient gets an acknowledgement.
- Reads re-check the caller's current access (organiser owns the event; coordinator is the current assignee and the event is not a draft; Venue Staff for bookings). Technical Support can read its own linked equipment notice without broader event-detail access. A `COORDINATOR_REASSIGNED_AWAY` notice remains visible after event access is lost and must name nothing. KAN-62 grants an affected attendee only its own generic cancellation outcome, as described below.
- To add a trigger (KAN-80 and the change stories), add a builder to `trigger-matrix.ts`, call `recordNotifications` from the service, extend the visibility rule if the new notification points to a new kind of target, and update the decision log and tests.

Migration `008_notification_inbox.sql` adds `venue_booking_id` and `dedupe_key`. Tests: `backend/test/notifications/`, `database/tests/notifications/notification-inbox.integration.test.ts`.

## KAN-81 outage notices — 21 October 2026

Saving a venue outage records `VENUE_OUTAGE_RECOVERY_REQUIRED` for each affected event's current coordinator
(`outageRecoveryNotifications` in `trigger-matrix.ts`), keyed per outage and event and linked to the first affected
booking. It is written in the outage's transaction from `venues/block-service.ts`.

## 25 October 2026 — Concurrent outcomes and recipient overlap verification

`notification-inbox.integration.test.ts` now proves actual simultaneous insert contention for the same outcome/recipient, uses a deferred trigger to fail after the booking decision and all notifications have been inserted, and verifies complete rollback. A valid organiser-to-coordinator role transition exercises overlapping recipient rules without inventing simultaneous application roles. Actor acknowledgements remain; each intended person receives one notice and an unrelated account receives none. These regressions complete the previously missing TC-20-18/19 scenario boundaries. TC-20-20's original-scope/CR ownership is checked in the change register; later KAN-80/82/84 triggers are not claimed implemented.

## KAN-26 equipment-reserved notices — 26 October 2026

`equipmentReservationNotifications` adds the `EQUIPMENT_RESERVED` slice of KAN-80. After a saved request becomes reserved, the current assigned coordinator and acting Technical Support user receive notices keyed `EQUIPMENT_RESERVED:<equipment-request-id>`. `recordNotifications` runs on the reservation transaction client; a notification failure rolls back the reservation. Idempotent repeats return without inserting notices. This implements neither cancellation/release notifications nor every KAN-80 trigger.

Migration `015_equipment_reservations.sql` adds the nullable `notifications.equipment_request_id` foreign key and a partial index. Existing notification rows are preserved. The inbox joins the linked request to its correct event. A Technical Support recipient receives a narrow equipment link while the event is `APPROVED`/`CONFIRMED`, with `event: null` and `booking: null`; it never receives the generic event-detail link. For a terminal event its own acknowledgement remains readable, with no link and an explanatory message. A former coordinator loses event-linked visibility after reassignment. Unrelated recipients and users whose role no longer permits access cannot read or mark the protected notice.

The existing inbox DTO and frontend need no new target fields. Automated reservation/notification integration tests cover delivery, rollback, duplicate suppression, current-access checks and the Technical Support target. Shared migration application and connected inbox acceptance remain **Not executed**.

## 28 October 2026 — KAN-62 cancellation and KAN-63 equipment review

KAN-62 writes `EVENT_CANCELLED` in the cancellation transaction for the owning organiser,
current coordinator and attendees whose REGISTERED rows were cancelled. Keys are
`EVENT_CANCELLED:<event-id>` per recipient. A failure rolls back the event, booking/equipment
releases, registration outcomes, audit and every notice. Repeated cancellation is a conflict
and adds no notices.

The inbox visibility rule now admits an ATTENDEE only when the notice is addressed to that user,
its type is EVENT_CANCELLED, the event is CANCELLED, and the user's matching registration is
CANCELLED with a recorded cancellation outcome timestamp. List, unread count, read-one and
read-all use this same rule. The returned title/message are reconstructed as a generic outcome,
even if stored text contains an internal reason. The attendee receives `event: null`,
`booking: null` and `link: null`; cancellation-history APIs remain organiser/coordinator-only.
Another attendee's notices, unrelated event notices and cancellation notices without an affected
registration stay inaccessible.

KAN-63 reservations reuse KAN-26's writer and the existing `EQUIPMENT_RESERVED` recipient/dedupe
rules. A rejected equipment request records `EQUIPMENT_REJECTED:<request-id>` for the assigned
coordinator, when present, and acting Technical Support user, with the rejection reason. The
existing equipment target visibility rule protects these notices; no generic event access is granted.

`backend/test/notifications/inbox.test.ts` checks safe DTOs; the real PostgreSQL list/count/read,
cross-user refusal and transactional failure scenarios are in
`database/tests/events/cancellation-safety.integration.test.ts`. Equipment delivery is covered in
`database/tests/equipment/request-workflow.integration.test.ts`. Run results are kept in
[test evidence](../../../../docs/testing/test-evidence.md); manual integrated acceptance remains separate.
