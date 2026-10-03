# Venues

- `venue-search.ts` / `venue-router.ts`: KAN-12 coordinator search and filter options.
- `availability.ts` / `availability-router.ts`: KAN-51 read-only availability for
  coordinators, Venue Staff and Technical Support Staff. Approved bookings and operational
  blocks are unavailable; event names are shown only to the assigned coordinator.
- `booking-input.ts` / `booking-service.ts` / `venue-bookings-router.ts`: KAN-53 submission
  and KAN-8 booking review and decisions, described below.

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

This feature does not change event status, send notifications, or add cancellation/reassignment
workflows. It uses the existing `venue_bookings` schema; no new migration or historical SQL
change is required. The separate KAN-51 calendar reads approved bookings from the same table.

### Verification

- `backend/test/venues/booking-input.test.ts`: decision/reason/filter and KAN-53 submission
  input boundaries.
- `backend/test/venues/venue-bookings-router.test.ts`: login, roles, parameter validation,
  verified actor forwarding and error mapping for the decision router.
- `backend/test/venues/venue-booking-submission-router.test.ts`: the same HTTP-boundary coverage
  for `POST /api/events/:id/venue-bookings`.
- `frontend/src/features/events/components/VenueBookingPanel.test.ts`: the coordinator request
  form and the shared read-only list shown to the organiser.
- `database/tests/venues/venue-bookings.integration.test.ts`: real PostgreSQL persistence,
  event-state preservation, coordinator isolation, duplicate/concurrent decisions,
  overlap and block rejection, adjacent periods, rollback, calendar projection, runtime cookie/profile
  mapping, and (KAN-53) submission association, eligibility and venue checks. Token verification
  is injected only in the runtime fixture; this is not a hosted Supabase login check.

Run integration tests with `TEST_DATABASE_URL` pointing to a dedicated local test database.
Manual acceptance is tracked in `docs/testing/README.md#kan-8-hosted-verification` after shared deployment.
