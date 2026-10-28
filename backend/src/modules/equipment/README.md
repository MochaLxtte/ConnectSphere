# Equipment availability and reservations (KAN-9 / CF-16, KAN-26 / CF-17)

Technical Support Staff can assess equipment for an `APPROVED` or `CONFIRMED` event independently of venue confirmation. KAN-9 checks are read-only: they do not save requests, reserve stock, change event status, create history or send notifications. KAN-26 separately reserves complete saved requests or cancels existing reservations on an `APPROVED` event. Stock maintenance (KAN-18), request creation/editing/review (KAN-63), event cancellation (KAN-62) and completion (KAN-10) remain separate workflows.

| File | Responsibility |
| --- | --- |
| `availability-types.ts` | Minimal event/context DTOs, saved and what-if inputs, per-item advisory results |
| `availability-input.ts` | Strict input fields, genuine calendar dates, offsets, microsecond precision, positive integer quantities and safe duplicate aggregation |
| `availability-rules.ts` | Half-open simultaneous-reservation peak and operational/available/shortfall calculations |
| `availability-service.ts` | Role enforcement, parameterized single-statement SQL snapshots, source versions and saved-request reconciliation |
| `availability-router.ts` | Three authenticated routes, UUID checks and standard workflow error mapping |
| `reservation-types.ts`, `reservation-input.ts` | Saved-line/readiness DTOs and strict version/reason input validation |
| `reservation-service.ts` | Full saved-request reservation, reasoned cancellation, current-stock readiness, locking and same-transaction notifications |
| `reservation-router.ts` | Technical Support context, reserve and cancel endpoints |
| `equipment-service.ts` | KAN-63 coherent plan snapshots, opaque revisions, coordinator requests/cancellation/replacement and staff review using the KAN-26 reservation writer |
| `equipment-router.ts` | KAN-63 protected plan, catalogue, request, review, replacement and cancellation endpoints |

## API and permissions

The router is mounted at `/api/equipment/availability`. `GET /events` returns eligible event summaries; `GET /events/:id` returns minimal event fields, requirements text, saved non-cancelled lines, active catalogue entries and any inactive types referenced by those lines. It does not expose organiser/coordinator identities or grant general event-detail access. `POST /events/:id` returns `{ assessment }`. All routes and direct service entry points require `TECHNICAL_SUPPORT_STAFF`; missing/ineligible events share `404 EVENT_REQUEST_NOT_FOUND`. Responses use `Cache-Control: no-store`.

- **Saved:** `{ mode: "saved", requirementsVersion }`. Reload non-cancelled lines, sum duplicate types and require every line's period to match the current event exactly. Exclude only the exact `RESERVED` lines being assessed from competing demand; `REQUESTED` and `REJECTED` lines are demand without consuming existing stock. Empty saved requirements fail explicitly.
- **What-if:** `{ mode: "what-if", requirementsVersion, startsAt, endsAt, items: [{ equipmentTypeId, quantity }] }`. The explicit unsaved window/items are advisory. All overlapping reservations count, including the same event's existing reservations. Caller-supplied exclusion IDs and other unknown fields are rejected.

The source version hashes actual event and saved-line values, including periods, status, quantity and text. It does not rely on `updated_at`. Source drift returns `409 EQUIPMENT_CONTEXT_CHANGED`; mismatched saved periods return `409 EQUIPMENT_REQUEST_PERIOD_MISMATCH`. Stock or competing reservations changing since the context read are assessed using their latest values, rather than treated as an unchanged cached result. An inactive selected type remains in the result with zero operational capacity and a shortfall.

## Quantity and time rules

For each active type, `operational = total - damaged - maintenance`; inactive types have zero operational stock. `available = max(0, operational - peakReserved)` and `shortfall = max(0, requested - available)`. The peak uses only `RESERVED` lines in `[startsAt, endsAt)`: adjacent reservations do not overlap, and disjoint reservations are not summed as simultaneous demand. ISO input requires an offset and a real calendar date, with at most six fractional digits. Integer microsecond instants preserve PostgreSQL boundary precision. Requested quantities and their per-type aggregate are integers in `1..2147483647`.

One SQL statement reads the event, saved lines, catalogue and relevant reservations. Calculations run against that coherent snapshot without a reservation lock or write. Each result includes its mode, window, check time, `advisory: true`, and every requested/total/damaged/maintenance/operational/peak-reserved/available/shortfall quantity. `FULFILLABLE` requires every item's shortfall to be zero; otherwise the outcome is `SHORTFALL`.

## Migration and dependent integration

Migration `014_equipment_operational_quantities.sql` adds nonnegative, non-null damaged and maintenance quantities with default zero and a combined loss limit against total stock. It preserves existing records. Automated checks used disposable PostgreSQL schemas. The user subsequently reported 014 and test-account setup complete; manual acceptance remains **Not executed**. Coordinate with the team before applying it and use a provisioned Technical Support Supabase login mapped to `app_users`.

Migration `015_equipment_reservations.sql` replaces the historical migration-005 total-capacity trigger with live operational-capacity protection, adds release audit fields and a notification link, and releases reservations on terminal event transitions. An advisory KAN-9 result is never permission to reserve later without another check. Migration 014/account setup is reported complete. Shared 015 application and connected manual acceptance are **Not executed**; coordinate 015 before using the matching API. KAN-18/KAN-63 integration remains pending.

## Saved reservations (KAN-26)

`GET /api/equipment/reservations/events/:id` returns the same minimal eligible-event projection, `requirementsVersion`, all saved `requests` including retained `CANCELLED` rows, and `readiness`. It adds decision/release metadata and `canReserve`/`canCancel` flags without granting general event-detail access. `CONFIRMED` events are read-only.

- `POST /api/equipment/reservations/events/:id/requests/:requestId/reserve` accepts only `{ requirementsVersion }`. It changes one `REQUESTED` line to `RESERVED` for its full positive whole saved quantity and exact current event period. The event must be `APPROVED` and have an assigned profile whose current role is `EVENT_COORDINATOR`. Venue state is not a precondition. Unsaved what-if inputs are never accepted here.
- `POST /api/equipment/reservations/events/:id/requests/:requestId/cancel` accepts only `{ requirementsVersion, reason }`; a trimmed reason of 1–2,000 characters is required. It changes one `RESERVED` line to `CANCELLED`, preserving its original allocation and decision while adding release actor/time/reason/cause. Editing quantity, period, type, stock or rejection is outside these endpoints.
- Both return `{ changed, context }`. A repeat returns `changed: false` only when its version matches the current source or the exact reconstructed pre-action source; cancellation must also repeat the recorded reason. An intervening source change still returns `409 EQUIPMENT_CONTEXT_CHANGED`. A retry never adds stock or sends another notice.

Writes lock and validate the trusted Technical Support profile inside the transaction, then lock event → assigned coordinator profile (reserve only) → equipment pools in UUID order → saved lines in UUID order. The coordinator role is rechecked under its profile lock before a new reservation. Operational capacity and competing reservations are read **after** the locks. Availability uses peak half-open overlap and current losses/activation. Stock conflict returns `409 EQUIPMENT_STOCK_CONFLICT` with no partial reservation. A notification insert failure rolls back the reservation. The database trigger independently protects new reservations, including SQL callers.

Readiness is derived on every read: `NO_REQUIREMENTS` for zero active lines (not an explicit Not Required decision); `INVALID_REQUIREMENTS` for invalid/mismatched saved quantities or periods; `SHORTFALL` if current operational stock cannot cover all active demand; `PENDING` until every active line is reserved; otherwise `READY`. `REQUESTED` and `REJECTED` lines remain active demand; `CANCELLED` lines are excluded. Existing reservations are retained after stock loss, so an all-reserved event can still report `SHORTFALL`.

Migration 015's event-status trigger changes only live `RESERVED` rows to `CANCELLED` when an event actually transitions to `CANCELLED` or `COMPLETED`. Release time/cause/reason are retained; the actor comes from the transaction's `app.actor_id` when supplied. Repeating the terminal status does nothing, and no stock counter is incremented. Old cancellations keep their original null metadata. KAN-62/KAN-10 must connect their future lifecycle APIs to this existing trigger; their user workflows are not implemented by KAN-26.

The KAN-80 slice here is `EQUIPMENT_RESERVED`: the assigned coordinator and acting Technical Support user each receive one in-app notice in the same transaction. The Technical Support link goes only to `/equipment/availability/:id` while the event is eligible; after a terminal transition its acknowledgement remains with no link. Other equipment/lifecycle notification triggers remain KAN-80 work.

## Verification

- `backend/test/equipment/`: input, interval/quantity rules, service snapshots, permissions, errors and HTTP contracts.
- `database/tests/equipment/availability.integration.test.ts`: real PostgreSQL and HTTP with substituted trusted identity; calculations, source/stock/deactivation changes, exact microseconds, saved exclusions, refusals and no-write checks, including a PostgreSQL read-only session.
- `database/tests/database.integration.test.ts`: migration 014 fresh/upgrade defaults, retained records/history, constraints and unchanged Data API restrictions.
- `frontend/src/features/equipment/`: API, form and component tests; `tests/e2e/equipment-availability.spec.ts`: browser flows with substituted API responses.
- `backend/test/equipment/reservation-*.test.ts`: reservation input/service/HTTP and transactional notification rules; `database/tests/equipment/reservations.integration.test.ts`: real stock races, atomic writes, history, idempotency, terminal release and notification visibility. `tests/e2e/equipment-reservations.spec.ts` covers the saved-reservation UI with explicitly mocked authenticated API responses and separate live unauthenticated refusal checks.

Run the root check/coverage commands and dedicated-database integration/browser commands from [AGENTS.md](../../../../AGENTS.md). [Test evidence](../../../../docs/testing/test-evidence.md) records `AUTO-20261026-KAN9-01` and its actual boundaries. Mocked browser flows do not establish connected local acceptance; use the maintained manual specifications and append actual executions separately.

## KAN-63 request workflow and KAN-62 event release — 27 October 2026

KAN-63 request creation, coordinator revision, Technical Support review and full-line reservation
are implemented in `equipment-service.ts` and `equipment-router.ts`. Manual cancellation and
explicit replacement use migration 015's `released_*` metadata with cause
`MANUAL_CANCELLATION`; no parallel `cancelled_*` equipment fields exist. KAN-62 updates the event
status first in the same transaction. Migration 015's trigger releases RESERVED rows with cause
`EVENT_CANCELLED`; the KAN-62 service then cancels only remaining REQUESTED/REJECTED lines,
recording release audit data without updating those reserved rows twice. Migration 018 adds the
KAN-63 request fields and KAN-62 outcome records. These routes and local unit tests pass; database
integration and connected acceptance remain **Not executed**.

## 28 October 2026 — KAN-63 concurrency and reservation integration

This section updates the 27 October checkpoint above. `GET /api/events/:id/equipment-requests`
returns `{ plan }` containing `eventRequestId`, plan `status`, `eventStatus`, exact event dates,
`items` and an opaque SHA-256 `revision`. The revision includes event values/revision and every
saved line's values and decision/release metadata, so KAN-26 decisions invalidate stale KAN-63
forms even when the legacy integer line revision did not change. Each returned line carries
the same plan revision. Reads use one SQL snapshot; coordinators see only currently assigned
eligible events, while Technical Support sees eligible equipment plans without organiser details.

Every KAN-63 mutation requires that opaque revision: save `{ lines, notRequired?, revision }`,
review `{ decision, reason?, revision }`, replacement `{ replacement, revision }`, and pending-line
cancellation `{ reason, revision }`. Missing/malformed versions are invalid input; mismatches
return `409 STALE_EQUIPMENT_REQUEST`. Unknown fields, duplicate types, nonpositive/out-of-range
quantities, invalid dates and line periods that differ from the event are refused. Exact periods
retain PostgreSQL microseconds. Technical requirements are also stored in `notes` for the existing
KAN-9/KAN-26 context. Not Required is an explicit empty plan with no active lines; merely deleting
or cancelling lines does not make that declaration.

Writes require APPROVED status and lock current actor profile → event → assigned coordinator
profile for Technical Support → equipment pools in UUID order → saved lines in UUID order.
Reservation calls the shared `reserveEquipmentInTransaction` from `reservation-service.ts`, so
KAN-26 and KAN-63 apply identical full-quantity, current-coordinator and operational-capacity
checks and transactional `EQUIPMENT_RESERVED` notices. KAN-63 maps a stock refusal to
`409 EQUIPMENT_UNAVAILABLE`. Rejection requires a reason and records coordinator/staff notices.
CONFIRMED plans remain readable but cannot be mutated.

Coordinator saves supersede pending lines while retaining their release history. They cannot
silently alter a decided line. Explicit replacement cancels one RESERVED line and inserts a new
REQUESTED line atomically; the new line needs a fresh staff decision. Pending/rejected cancellation
retains any original decision. All paths preserve migration 015's immutable allocation/release
records and roll back fully if validation, persistence or notifications fail.

KAN-62 locks pools/lines in the same order and its audit counts both trigger-released reservations
and service-cancelled pending/rejected lines. KAN-15 resets a previous Not Required declaration
when approved changes affect equipment/timing and records release metadata for invalidated pending
lines. No additional migration is required beyond the integrated 001–018 sequence.

Regression locations: `backend/test/equipment/request-service.test.ts`,
`database/tests/equipment/request-workflow.integration.test.ts`,
`database/tests/equipment/reservations.integration.test.ts`, and the cancellation integration
files under `database/tests/events/`. Coverage includes stale saves, KAN-26 source changes,
stock-lock waits, competing reservations, replacement/cancellation races and rollback. Executed
results belong in [test evidence](../../../../docs/testing/test-evidence.md); these disposable
PostgreSQL tests do not establish shared-Supabase or manual acceptance.
