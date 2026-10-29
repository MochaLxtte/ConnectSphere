# Venues

KAN-62 event cancellation releases active venue bookings within the event transaction and
retains each booking with cancellation actor/time/reason. No unrelated event booking changes.

- `venue-search.ts` / `venue-router.ts`: KAN-12 coordinator search and filter options.
- `availability.ts` / `availability-router.ts`: KAN-51 read-only availability for
  coordinators, Venue Staff and Technical Support Staff. Approved bookings and operational
  blocks are unavailable; event names are shown only to the assigned coordinator.
- `booking-input.ts` / `booking-service.ts` / `venue-bookings-router.ts`: KAN-53 submission
  and KAN-8 booking review and decisions, described below.
- `block-input.ts` / `block-service.ts` / `block-router.ts`: KAN-55 venue-unavailability
  blocks, described below.
- `venue-catalogue-input.ts` / `venue-catalogue-service.ts` / `venue-catalogue-router.ts`:
  KAN-50 Venue Staff catalogue maintenance, described below.
- `suitability-input.ts` / `suitability-rules.ts` / `suitability-service.ts` /
  `suitability-router.ts`: KAN-52 event-based and KAN-82 saved-arrangement read-only assessment, described below.

## Venue catalogue maintenance — KAN-50

`venue-catalogue-router.ts` is mounted at `/api/venues` and is Venue Staff only end to end;
the service re-checks the role for direct callers. Event Coordinators keep reading venue data
through KAN-12 search and KAN-52 suitability.

| Endpoint | Access and result |
| --- | --- |
| `GET /api/venues/catalogue` | Venue Staff only. Returns `{ items }`: every active venue, by name. |
| `GET /api/venues/catalogue/:venueId` | Venue Staff only. Returns `{ venue }`; a missing or inactive venue is `404 VENUE_NOT_FOUND`. |
| `PATCH /api/venues/catalogue/:venueId` | Venue Staff only. Updates the supplied fields and returns the saved `{ venue }`. |

### Rules

- Editable fields are `location`, `capacity`, `facilities`, `accessibilityFeatures`,
  `wheelchairAccessible`, `layouts`, `opensAt` and `closesAt`. Every field is optional, an
  omitted field is unchanged, at least one is required, and any other key (name, description,
  active flag, identifiers) is refused with `400 INVALID_VENUE_CATALOGUE_INPUT`.
- Labels are trimmed and deduplicated ignoring case (at most 100 characters, 30 distinct
  values per list); capacity is a whole number of at least 1; hours are `HH:MM` Singapore
  time with `null` meaning unrestricted. A single hour change is checked against the stored
  value, so closing can never be at or before opening.
- The update locks the venue row and runs in one transaction. Edits to different fields made
  at the same time both persist; the same field is last-writer-wins. An inactive venue is
  refused with `409 VENUE_INACTIVE`.
- Only `venues` columns are written (migration 004, no new migration). Search, filter options
  and the suitability context read those columns live, so a saved change is visible on the
  next request. Existing bookings are not altered. Creating, deleting or deactivating venues
  and per-venue setup/turnaround time are outside this story.

### Verification

- `backend/test/venues/venue-catalogue-input.test.ts`, `venue-catalogue-service.test.ts` and
  `venue-catalogue-router.test.ts`: input rules, transaction and role behaviour, HTTP mapping.
- `database/tests/venues/venue-catalogue.integration.test.ts`: real PostgreSQL persistence,
  concurrent edits and propagation to search and suitability.
- `frontend/src/features/venues/` (`catalogue-form.test.ts`, `api/venue-catalogue.test.ts`,
  `pages/VenueCataloguePage.test.ts`, `pages/VenueCatalogueEditPage.test.ts`) and
  `tests/e2e/venue-catalogue.spec.ts`.

## Venue setup and turnaround durations — KAN-77

Venue Staff record `setupMinutes` and `turnaroundMinutes` for each venue through the KAN-50
catalogue (`PATCH /api/venues/catalogue/:venueId`, `/venue-catalogue/:id`). Migration 008 stores them
on `venues`, defaulting to 0.

### Rules

- Each is a whole number of minutes from 0 to 1440, never null; the input parser and a database
  `CHECK` enforce the same range.
- A changed buffer must be sent with `expectedSetupMinutes` / `expectedTurnaroundMinutes`, the
  value the editor loaded. Under the existing row lock, a mismatch refuses the whole request with
  `409 VENUE_BUFFER_CONFLICT` and writes nothing. Other fields keep KAN-50's rules, so a request
  that changes no buffer is never refused for buffer changes made meanwhile.
- Catalogue, search (`venue-search.ts`), suitability context (`suitability-service.ts`) and the
  availability calendar (`availability.ts`) return both values. They do not yet change any
  interval, search filter, suitability result or conflict check: KAN-78 applies the buffers, and
  KAN-77-AC6's re-evaluation of existing bookings waits for it.

### Verification

Unit/HTTP: `backend/test/venues/venue-catalogue-input.test.ts`, `venue-catalogue-service.test.ts`,
`venue-catalogue-router.test.ts` (KAN-77 suites). PostgreSQL: `database/tests/venues/venue-catalogue.integration.test.ts`
and the migration test in `database/tests/database.integration.test.ts`. Browser:
`tests/e2e/venue-catalogue.spec.ts`. Results are recorded as `AUTO-20261021-02` in the test evidence.

## Venue-unavailability blocks — KAN-55

`block-router.ts` is mounted at `/api/venues` and is Venue Staff only end to end; the
service re-checks the role for direct callers.

| Endpoint | Access and result |
| --- | --- |
| `GET /api/venues/:venueId/unavailability` | Venue Staff only. Returns `{ items }`, earliest first, for one venue. |
| `POST /api/venues/:venueId/unavailability` | Venue Staff only; accepts `{ startsAt, endsAt, reason }` (reason is mandatory, unlike KAN-8's optional decision reason). Returns `201` with the saved `{ block }`. |
| `DELETE /api/venues/:venueId/unavailability/:blockId` | Venue Staff only; removes the block. Returns `{ id }`. Amendment/removal is implementation scope beyond KAN-55's listed acceptance criteria. |

### Rules

- `venueId` must be an active venue, or the call fails with `404 VENUE_NOT_FOUND` /
  `409 VENUE_INACTIVE` before any row is written.
- A new block that overlaps an existing `APPROVED` `venue_bookings` row is refused with
  `409 VENUE_BOOKING_CONFLICT`: an existing reservation must not be silently displaced by a
  later block (open policy question, see the decision record). This is an application-level
  check only; no new migration/trigger guards the reverse direction the way migration 004's
  `venue_bookings_conflict` trigger already guards a booking against an existing block.
- This reuses the existing `venue_unavailability` table from migration 004; no new migration
  is required. KAN-51's calendar, KAN-12's search and KAN-8's approval-time recheck already
  read this table, so a saved block is immediately reflected everywhere that already reads it
  for calendar/search/approval. KAN-52 now also reads these blocks for suitability;
  those downstream checks need their own evidence. Only creation/removal (AC1–AC7, AC13)
  is new in the KAN-55 module.

### Verification

- `backend/test/venues/block-input.test.ts`: submission input boundaries.
- `backend/test/venues/block-router.test.ts`: login, roles, parameter validation, verified
  actor forwarding and error mapping.
- `database/tests/venues/venue-blocks.integration.test.ts`: real PostgreSQL persistence,
  role checks, venue eligibility, the booking-overlap conflict, listing and deletion.

Run integration tests with `TEST_DATABASE_URL` pointing to a dedicated local test database.

## Outage recovery — KAN-81 (phase 1)

CR-2 replaces KAN-55's refusal of a block that overlaps an approved booking. `createVenueBlock` now
saves the outage and, inside the same venue-locked transaction, records each affected arrangement in
`venue_outage_impacts` (migration 010) through `outage-impact.ts`.

### Rules

- Affected means a non-ended `APPROVED` booking at the venue whose event interval overlaps the outage,
  half-open. `AFFECTED_BOOKING_CONDITION` is the single place to change when KAN-78 adds buffers.
- Booking and event rows are never updated (the `venue_bookings_conflict` trigger re-checks every
  update of an approved booking against blocks). Reprocessing an outage adds nothing.
- Block creation, booking submission and approval share the venue row lock, so an outage and an
  approval never interleave. Removal locks the venue, marks that block's open flags `CLEARED` and
  deletes the block; other outages' flags are unchanged.
- `GET /api/venues/recovery` lists affected arrangements for Venue Staff. Phase 2: each affected
  event's current coordinator gets one notice per outage (KAN-64 writer, same transaction), and every
  booking response carries its `recovery` list.
- Phase 3: a request with `replacesBookingId` must target a same-event booking that still needs
  recovery, for an approved or confirmed event, and pass capacity and opening-hours checks. Approving
  it locks the original right after the replacement's own row and before the event (booking ->
  original -> event -> venue, since the KAN-82 review on 29 October 2026, so it cannot deadlock with
  a cancel of that original), refuses if recovery is no longer needed, then
  resolves the original's flags and cancels it (migration 011).

### Verification

Unit/HTTP: `backend/test/venues/outage-impact.test.ts`, `block-router.test.ts`. PostgreSQL:
`database/tests/venues/venue-outage-recovery.integration.test.ts`. Browser:
`tests/e2e/venue-outage-recovery.spec.ts`. Results: `AUTO-20261021-08` in the test evidence.

## Venue booking submission — KAN-53

`POST /api/events/:id/venue-bookings` lets the event's currently assigned, non-draft
coordinator request a venue. It is mounted under `/api/events` (`createVenueBookingSubmissionRouter`,
separate from `createVenueBookingsRouter` below) so its `:id` always means the event request,
never a booking. Accepts `{ venueId: string, startsAt: string, endsAt: string, layout?: string | null,
notes?: string | null }` (ISO date-times, `endsAt` after `startsAt`) and returns `201` with the
created `{ booking }`, status `PENDING`.

- Only `EVENT_COORDINATOR` may call it; the service re-checks this and the event relationship
  (`requireRelation`, `['ASSIGNED_COORDINATOR']`) even for direct callers. An unrelated coordinator
  or a draft event gets the same `404 EVENT_REQUEST_NOT_FOUND` as a missing request.
- Refused with `409 EVENT_NOT_ELIGIBLE` once the event is `REJECTED`, `CANCELLED` or `COMPLETED`.
  Every other non-draft state currently accepts a request; this is a documented implementation
  default (S2-T11/S2-T12), not an agreed acceptance criterion — see the 4 October decision record.
- Refused with `404 VENUE_NOT_FOUND` or `409 VENUE_INACTIVE` for a missing or inactive venue.
- After locking the venue, a fresh query rechecks overlapping `APPROVED` bookings and
  operational blocks. A reserved interval returns `409 VENUE_BOOKING_CONFLICT`; a block
  returns `409 VENUE_UNAVAILABLE`. Neither refusal persists a new booking. Intervals are
  half-open, so exact adjacency is allowed. This submission check and the approval-time
  recheck protect separate moments; a pending request still holds no availability.
- The frontend supplies ISO timestamps from Singapore time inputs. The API requires valid
  ISO date-times with an explicit `Z` or numeric timezone offset and a real calendar day.
  Optional layout/notes are trimmed and limited to 2,000 characters by the API; the panel
  limits layout to 100 characters and notes to 2,000.
- Submitting never approves the booking (KAN-53-AC9): the row is created `PENDING` and only
  `decideVenueBooking` (KAN-8, below) changes it. Several pending requests for the same event and
  venue, even overlapping ones, are allowed; only an `APPROVED` booking consumes availability.
- Venue requirements shown to staff (KAN-53-AC4) still come from the event's own
  `venue_requirements` field, already joined into every booking read; a booking's own `notes`
  is separate free text for that specific request.

## Booking decisions — KAN-8

`venue-bookings-router.ts` uses the runtime's verified session and `app_users` role. The
booking service also enforces roles for direct callers; browser headers and submitted
user IDs never determine authority.

| Endpoint | Access and result |
| --- | --- |
| `GET /api/venue-bookings` | Venue Staff see pending bookings. Coordinators see all booking statuses for their currently assigned, non-draft events. Returns `{ items }`. |
| `GET /api/venue-bookings/:id` | Staff may revisit a saved decision; the assigned coordinator can read the outcome. Returns `{ booking }`. Other coordinators receive 404. |
| `POST /api/venue-bookings/:id/decision` | Venue Staff only; accepts `{ decision: "APPROVED" \| "REJECTED", reason?: string \| null }`, returns the saved `{ booking }`. |

The list accepts one optional UUID `eventRequestId` filter. It does not broaden access.
Both response forms include booking/event/venue IDs, names, statuses, requested timing,
event timing and requirements, layout, notes, decision author/time/reason and timestamps.
Dates are ISO strings. Nullable event data stays null rather than being invented.

### Decision rules

- Only `PENDING` bookings can be decided. Repeated and opposite decisions return
  `409 BOOKING_ALREADY_DECIDED`; they do not overwrite the first decision.
- A decision records the verified staff member's `app_users.id`, time, outcome and optional
  trimmed reason (maximum 2,000 characters). Rejection information is supported; mandatory
  rejection text has not been agreed for KAN-8.
- Approval currently requires an `APPROVED` event and an active venue. These are documented
  implementation defaults, not additional customer acceptance criteria. A stale pending
  booking can still be rejected when either condition is no longer true.
- The current schema has no per-venue staff assignment. Every verified `VENUE_STAFF`
  account may review venue booking requests; coordinators remain restricted by current
  event assignment. Organisers, attendees and technical support cannot read these records
  or make decisions through this API.
- Approved bookings consume availability. Pending/rejected bookings do not. Intervals
  are half-open (`start < otherEnd && end > otherStart`), permitting adjacent bookings
  without a turnover buffer. Overlapping approved bookings and recorded operational
  blocks prevent approval with `VENUE_BOOKING_CONFLICT` or `VENUE_UNAVAILABLE` (409).

### Transactions and scope

`decideVenueBooking` locks the booking first. Approval then locks the event and venue,
and performs a separate conflict query after acquiring the venue lock so it sees
concurrent approvals that committed while waiting. Status and all decision metadata
are saved in one transaction. Existing database conflict triggers remain a second guard;
their known conflict errors also become 409 responses. Failure rolls back the decision.

This feature does not change event status or add cancellation/reassignment
workflows. Since KAN-64 a decision also writes in-app notifications in the same transaction
(organiser, current coordinator and the deciding staff member). It uses the existing
`venue_bookings` schema; no new migration or historical SQL change is required for bookings. The separate KAN-51 calendar reads approved bookings from the same table.

### Verification

- `backend/test/venues/booking-input.test.ts`: decision/reason/filter and KAN-53 submission
  input boundaries.
- `backend/test/venues/venue-bookings-router.test.ts`: login, roles, parameter validation,
  verified actor forwarding and error mapping for the decision router.
- `backend/test/venues/venue-booking-submission-router.test.ts`: the same HTTP-boundary coverage
  for `POST /api/events/:id/venue-bookings`.
- `frontend/src/features/events/components/VenueBookingPanel.test.ts`: the coordinator request
  form and its coordinator-only booking list, with role/session changes and stale-result protection.
- `database/tests/venues/venue-bookings.integration.test.ts`: real PostgreSQL persistence,
  event-state preservation, coordinator isolation, duplicate/concurrent decisions,
  overlap and block rejection, adjacent periods, rollback, calendar projection, runtime cookie/profile
  mapping, and (KAN-53) submission association, eligibility and venue checks. Token verification
  is injected only in the runtime fixture; this is not a hosted Supabase login check.

Run integration tests with `TEST_DATABASE_URL` pointing to a dedicated local test database.
Manual acceptance is tracked in `docs/testing/README.md#kan-8-hosted-verification` after shared deployment.

## Venue suitability — KAN-52

`GET /api/events/:id/venue-suitability` returns the current source event, requirements
version and active venue capabilities. `POST` on the same route returns an explained
assessment without writing data. The service rechecks the verified coordinator role and
current assignment; draft, absent and unrelated events are unavailable. No schema change
or persisted interpretation is involved.

The coordinator supplies an explicit interpretation of free-text needs: facilities,
accessibility labels, one layout, wheelchair requirement, confirmation and unresolved
requirements. Labels match by case-insensitive trimmed equality, including unlisted
requirements. Each applicable check reports PASS/FAIL/UNKNOWN; the overall result is
UNSUITABLE for a definite failure, otherwise NEEDS_REVIEW for any unknown, otherwise
SUITABLE. Capacity, full-interval Singapore opening hours, active state, approved
reservations, live holds and operational blocks are read fresh. Current setup/turnaround
buffers define the occupied interval; exact buffered adjacency does not overlap.

Expected attendance `0` is a known value, as submission accepts it (KAN-52-AC101): the capacity
check passes it against capacity like any count. A missing attendance, or an unusable value such as a
negative or fractional number, leaves the capacity check UNKNOWN with a different message, so the two
stay distinguishable. A zero-attendance event is never SUITABLE on that basis alone: other failing or
unknown checks still decide the overall result.

The source version hashes relevant event values, so direct dashboard changes are detected
even without an updated timestamp. A mismatch gives `409 SUITABILITY_CONTEXT_CHANGED`;
the UI reloads and resets interpretation. A valid result remains an observation at check
time, not a venue hold, event approval or permission to create a booking.

**30 October 2026 — KAN-82 saved arrangement assessment.** GET accepts optional
`?bookingId=<UUID>`; POST accepts optional `bookingId` alongside all existing explicit
requirement fields. Omitting it preserves event-based assessment. The query/body identifier
is a single UUID string, normalized to lowercase; invalid, null or repeated values return
`400 INVALID_SUITABILITY_INPUT`.

GET returns the parent `event` unchanged and adds `arrangement` with `id`, `venueId`,
nullable ISO `startsAt`/`endsAt`, nullable `layout`/`notes`, and effective `status`. A hold
past its database deadline is already reported as `EXPIRED`; a fresh advisory assessment
of that expired arrangement is permitted. The active catalogue also includes the selected
saved venue when inactive, allowing an explained `venueActive` failure. POST returns
`assessment.bookingId` and uses the saved arrangement's interval and layout, with current
venue buffers, hours, capabilities and availability. Only that booking ID is excluded from
occupancy checks; another booking or live hold of the same event still conflicts.

The coordinator confirms facilities and accessibility against both the saved arrangement
notes and parent requirements. There is no automatic prose interpretation; the parent
attendance remains the capacity input. Venue and layout are fixed to the saved arrangement
in the UI. The POST venue must match it and its layout must match ignoring case/outer
whitespace, otherwise `409 SUITABILITY_CONTEXT_CHANGED`; actual saved values drive the
assessment. The layout limit is 2,000 characters for saved arrangements, matching booking
creation, and remains 100 for event interpretation. Other input limits are unchanged;
caller-supplied timing, notes, status or attendance overrides are rejected.

The service rechecks coordinator role, current event assignment and exact booking/event
association on every read. Missing/cross-event bookings return `404 VENUE_BOOKING_NOT_FOUND`
after event authorization; a missing/draft/unassigned event returns
`404 EVENT_REQUEST_NOT_FOUND`. Arrangement freshness hashes actual parent requirements,
saved arrangement values/effective status, parent status and hold deadline, so edits and
approval/expiry transitions invalidate confirmation even without an `updated_at` change.
`CANCELLED`/`REJECTED` arrangements and `CANCELLED`/`REJECTED`/`COMPLETED` parent events are
refused with `409 SUITABILITY_CONTEXT_CHANGED` in arrangement mode. The UI refreshes after
a stale assessment and requires new interpretation/confirmation. Current venue changes
are evaluated afresh. Both modes use one SQL read snapshot, take no row locks and write
nothing; this addition creates no booking capacity/suitability gate and requires no migration.

See the [full contract](../../../../docs/architecture/api-contract.md#venue-suitability-kan-52-cf-11)
for request/response fields and limits, [decision record](../../../../docs/requirements/assumptions-and-questions.md#4-october-2026--kan-52-venue-suitability)
for policy boundaries and [testing guidance](../../../../docs/testing/README.md#kan-52-hosted-verification)
for remaining hosted checks. Unit/HTTP tests are `backend/test/venues/suitability-*.test.ts`;
PostgreSQL tests are `database/tests/venues/venue-suitability.integration.test.ts`.
Record executed results separately in the shared test register.

## KAN-78 buffered planning — 21 October 2026

Migration 008 supplies SQL occupied-interval functions, `venue_booking_intervals`, approval snapshots and `venue_booking_warnings(uuid)`. Search, availability, suitability, booking submission/approval and block creation consume these rules. Views/functions returning booking data are internal, with public/anon/authenticated access revoked. The API enforces existing roles and current assignment.

Calendar bars use occupied times and return event timing separately. Booking detail and the staff queue expose live overlap/block/hour warnings; the queue also includes affected approved bookings. Warnings are computed, so KAN-77's future editor gets current re-evaluation after a venue-row update without changing bookings. It should use the same venue lock and consume the warning function. KAN-77's editor and field-aware stale-save rules remain separate work.

Verification: `database/tests/venues/venue-buffers.integration.test.ts` covers the calculator across consumers, boundaries, blocks/hours, preserved history, existing conflicts, privacy and races. `tests/e2e/venue-bookings.spec.ts` verifies occupied-time/warning display. See AUTO-20261021-KAN78-01; hosted acceptance remains Not executed.

## Main integration follow-up — 21 October 2026

KAN-77 configuration is now merged. Buffer saves use its existing field-aware concurrency rules and return `affectedBookings` from KAN-78 warning evaluation within the save transaction; the editor displays their links/warnings. Shared duration storage is migration 009, and KAN-78 snapshots/view/functions/guards are migration 010. Earlier pending-editor notes remain historical.

## Temporary venue holds — KAN-83

`occupancy.ts` is the single rule for when a booking occupies its venue: `APPROVED`, or `HELD` with `hold_expires_at` still in the future. `availability.ts`, `venue-search.ts`, `suitability-service.ts`, `booking-service.ts` (request creation and approval) and `block-service.ts` all use it, applied to KAN-78's buffered occupied interval (`venue_booking_intervals`); a hold deadline may be no later than the buffered occupied start. Readers use `now()`; writers that have just taken a lock use `clock_timestamp()` so a hold that lapsed while they waited no longer counts.

`booking-service.ts` adds `placeVenueHold` (Venue Staff, pending request, deadline checked against the database clock, booking → event → venue locks, notice to the coordinator), `cancelVenueHold` and the shared `releaseHold`, extends `decideVenueBooking` to approve or reject a live hold, and wraps `expire_venue_holds()` as `expireVenueHolds`. `block-service.ts` releases every overlapping live hold after acquiring the shared venue planning gate; it waits for matching rows rather than skipping a hold that an approval may later roll back. `hold-expiry-scheduler.ts` runs expiry at API startup and every minute (`server.ts`). Routes: `POST /api/venue-bookings/:id/hold` and `/hold/cancel` in `venue-bookings-router.ts`. Contract: [api-contract](../../../../docs/architecture/api-contract.md#temporary-venue-holds-kan-83-cr-4); rollout: [database setup](../../../../database/README.md#kan-83-venue-holds-rollout--21-october-2026).

## 25 October 2026 — Venue write serialization and display corrections

`lockVenuePlanning` takes a transaction-scoped advisory gate keyed by the canonical lowercase venue UUID before booking/event/venue row locks. Create, decide, hold, cancel-hold and create/delete-outage paths share it. This serializes one venue's mutations without changing the schema. The expiry function remains idempotent and independent of the gate; locked hold selection rechecks current state/deadline. Outage-first cancels the live hold and sends one cancellation notice; approval-first retains the approved booking and records recovery. Failed approvals release the transaction gate. Five deterministic PostgreSQL interleavings cover both writer orders and rollback; no timing-only race assertion is used.

Catalogue PATCH affected-booking entries include `eventName`, ISO `startsAt`/`endsAt`, IDs and warning codes under existing Venue Staff authorization. The editor renders names (booking-ID fallback), Singapore periods and readable warnings. Buffer edits do not cancel/move bookings. Hold entry validates its deadline against `occupiedStartsAt` (fallback `startsAt` for older responses), allowing the exact boundary. Booking-detail decision controls allow `CONFIRMED` only for a linked replacement, matching the backend and preserving role/state restrictions.

Current full-suite and shared scheduler evidence: `AUTO-20261025-CLOSEOUT-01` / `OPS-20261025-HOLD-EXPIRY-01`. No historical migration was edited. The current fixes still require the short manual retest listed in the testing README.

## 28 October 2026 — KAN-82 independent arrangements

`cancelVenueArrangement` in `booking-service.ts` lets the event's current coordinator cancel one pending, live held or approved booking with a reason (venue gate → booking → event locks, like decisions). `assertReplaceable` now also accepts an explicitly cancelled original (`cancelled_at` set) with at most one live replacement; a KAN-81-resolved original (cancelled without `cancelled_at`) stays a recovery original. Approval of a replacement checks under the original's lock that no other replacement already holds the venue. `venueArrangementReadiness` derives venue readiness for KAN-61/KAN-84 from the current rows. Responses carry `replacedByBookingIds`. Notices are in `../notifications/arrangement-notifications.ts`, outside the KAN-64 matrix. No migration.
