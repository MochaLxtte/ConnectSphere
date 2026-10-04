# Venues

- `venue-search.ts` / `venue-router.ts`: KAN-12 coordinator search and filter options.
- `availability.ts` / `availability-router.ts`: KAN-51 read-only availability for
  coordinators, Venue Staff and Technical Support Staff. Approved bookings and operational
  blocks are unavailable; event names are shown only to the assigned coordinator.
- `booking-input.ts` / `booking-service.ts` / `venue-bookings-router.ts`: KAN-8 booking
  review and decisions, described below.
- `block-input.ts` / `block-service.ts` / `block-router.ts`: KAN-55 venue-unavailability
  blocks, described below.
- `suitability-input.ts` / `suitability-rules.ts` / `suitability-service.ts` /
  `suitability-router.ts`: KAN-52 read-only event-specific assessment, described below.

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

This feature does not submit bookings (KAN-53), change event status, send notifications,
or add cancellation/reassignment workflows. It uses the existing `venue_bookings` schema;
no new migration or historical SQL change is required. The separate KAN-51 calendar reads
approved bookings from the same table.

### Verification

- `backend/test/venues/booking-input.test.ts`: decision/reason/filter boundaries.
- `backend/test/venues/venue-bookings-router.test.ts`: login, roles, parameter validation,
  verified actor forwarding and error mapping.
- `database/tests/venues/venue-bookings.integration.test.ts`: real PostgreSQL persistence,
  event-state preservation, coordinator isolation, duplicate/concurrent decisions,
  overlap and block rejection, adjacent periods, rollback, calendar projection and runtime cookie/profile
  mapping. Token verification is injected only in the runtime fixture; this is not a
  hosted Supabase login check.

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
SUITABLE. Capacity, full-interval Singapore opening hours, active state, all approved
reservations and operational blocks are read fresh. Adjacent intervals do not overlap.

The source version hashes relevant event values, so direct dashboard changes are detected
even without an updated timestamp. A mismatch gives `409 SUITABILITY_CONTEXT_CHANGED`;
the UI reloads and resets interpretation. A valid result remains an observation at check
time, not a venue hold, event approval or permission to create a booking.

See the [full contract](../../../../docs/architecture/api-contract.md#venue-suitability-kan-52-cf-11)
for request/response fields and limits, [decision record](../../../../docs/requirements/assumptions-and-questions.md#4-october-2026--kan-52-venue-suitability)
for policy boundaries and [testing guidance](../../../../docs/testing/README.md#kan-52-hosted-verification)
for remaining hosted checks. Unit/HTTP tests are `backend/test/venues/suitability-*.test.ts`;
PostgreSQL tests are `database/tests/venues/venue-suitability.integration.test.ts`.
Record executed results separately in the shared test register.
