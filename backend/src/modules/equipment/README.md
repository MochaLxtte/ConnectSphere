# Equipment availability (KAN-9 / CF-16)

Technical Support Staff can assess equipment for an `APPROVED` or `CONFIRMED` event independently of venue confirmation. The implementation is read-only. It does not save requests, reserve stock, change event status, create history or send notifications. Stock maintenance (KAN-18), request editing/review (KAN-63) and operational-capacity reservation writes (KAN-26) remain separate pending workflows.

| File | Responsibility |
| --- | --- |
| `availability-types.ts` | Minimal event/context DTOs, saved and what-if inputs, per-item advisory results |
| `availability-input.ts` | Strict input fields, genuine calendar dates, offsets, microsecond precision, positive integer quantities and safe duplicate aggregation |
| `availability-rules.ts` | Half-open simultaneous-reservation peak and operational/available/shortfall calculations |
| `availability-service.ts` | Role enforcement, parameterized single-statement SQL snapshots, source versions and saved-request reconciliation |
| `availability-router.ts` | Three authenticated routes, UUID checks and standard workflow error mapping |

## API and permissions

The router is mounted at `/api/equipment/availability`. `GET /events` returns eligible event summaries; `GET /events/:id` returns minimal event fields, requirements text, saved non-cancelled lines, active catalogue entries and any inactive types referenced by those lines. It does not expose organiser/coordinator identities or grant general event-detail access. `POST /events/:id` returns `{ assessment }`. All routes and direct service entry points require `TECHNICAL_SUPPORT_STAFF`; missing/ineligible events share `404 EVENT_REQUEST_NOT_FOUND`. Responses use `Cache-Control: no-store`.

- **Saved:** `{ mode: "saved", requirementsVersion }`. Reload non-cancelled lines, sum duplicate types and require every line's period to match the current event exactly. Exclude only the exact `RESERVED` lines being assessed from competing demand; `REQUESTED` and `REJECTED` lines are demand without consuming existing stock. Empty saved requirements fail explicitly.
- **What-if:** `{ mode: "what-if", requirementsVersion, startsAt, endsAt, items: [{ equipmentTypeId, quantity }] }`. The explicit unsaved window/items are advisory. All overlapping reservations count, including the same event's existing reservations. Caller-supplied exclusion IDs and other unknown fields are rejected.

The source version hashes actual event and saved-line values, including periods, status, quantity and text. It does not rely on `updated_at`. Source drift returns `409 EQUIPMENT_CONTEXT_CHANGED`; mismatched saved periods return `409 EQUIPMENT_REQUEST_PERIOD_MISMATCH`. Stock or competing reservations changing since the context read are assessed using their latest values, rather than treated as an unchanged cached result. An inactive selected type remains in the result with zero operational capacity and a shortfall.

## Quantity and time rules

For each active type, `operational = total - damaged - maintenance`; inactive types have zero operational stock. `available = max(0, operational - peakReserved)` and `shortfall = max(0, requested - available)`. The peak uses only `RESERVED` lines in `[startsAt, endsAt)`: adjacent reservations do not overlap, and disjoint reservations are not summed as simultaneous demand. ISO input requires an offset and a real calendar date, with at most six fractional digits. Integer microsecond instants preserve PostgreSQL boundary precision. Requested quantities and their per-type aggregate are integers in `1..2147483647`.

One SQL statement reads the event, saved lines, catalogue and relevant reservations. Calculations run against that coherent snapshot without a reservation lock or write. Each result includes its mode, window, check time, `advisory: true`, and every requested/total/damaged/maintenance/operational/peak-reserved/available/shortfall quantity. `FULFILLABLE` requires every item's shortfall to be zero; otherwise the outcome is `SHORTFALL`.

## Migration and dependent integration

Migration `014_equipment_operational_quantities.sql` adds nonnegative, non-null damaged and maintenance quantities with default zero and a combined loss limit against total stock. It preserves existing records. It has been tested only on disposable PostgreSQL schemas; shared application and manual acceptance are **Not executed**. Coordinate with the team before applying it and use a provisioned Technical Support Supabase login mapped to `app_users`.

The historical migration-005 reservation trigger still protects total quantity. KAN-26 must implement a fresh operational-capacity check under the equipment-pool lock before reserving. An advisory KAN-9 result is never permission to reserve later without another check. KAN-18/KAN-63/KAN-26 integration remains pending.

## Verification

- `backend/test/equipment/`: input, interval/quantity rules, service snapshots, permissions, errors and HTTP contracts.
- `database/tests/equipment/availability.integration.test.ts`: real PostgreSQL and HTTP with substituted trusted identity; calculations, source/stock/deactivation changes, exact microseconds, saved exclusions, refusals and no-write checks, including a PostgreSQL read-only session.
- `database/tests/database.integration.test.ts`: migration 014 fresh/upgrade defaults, retained records/history, constraints and unchanged Data API restrictions.
- `frontend/src/features/equipment/`: API, form and component tests; `tests/e2e/equipment-availability.spec.ts`: browser flows with substituted API responses.

Run the root check/coverage commands and dedicated-database integration/browser commands from [AGENTS.md](../../../../AGENTS.md). [Test evidence](../../../../docs/testing/test-evidence.md) records `AUTO-20261026-KAN9-01` and its actual boundaries. Mocked browser flows do not establish connected local acceptance; use the maintained manual specifications and append actual executions separately.
