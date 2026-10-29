# Registrations (CF-18)

## Withdrawal and roster (KAN-17 / KAN-67)

`router.ts` mounts an attendee-owned list and confirmed withdrawal plus an organiser/current-coordinator event roster. `service.ts` rechecks the trusted stored role; withdrawal locks the event before the owned registration, rechecks event start using the database clock, saves `WITHDRAWN` once and preserves the existing row. Roster authorization and field-limited reads share an event lock so coordinator reassignment cannot race the authorization check. Migration 019 generates outcome notices in the same actor transaction; its outcome version distinguishes a future KAN-14 re-registration from an unchanged replay.

The routes are documented in the [API contract](../../../../docs/architecture/api-contract.md#29-october-2026--kan-17-kan-67-and-kan-80-registration-outcomes). KAN-14 owns registration creation and re-entry; this module supplies the later withdrawal and manager view. Unit/HTTP tests are in `backend/test/registrations/`; PostgreSQL behavior in `database/tests/events/registrations.integration.test.ts`; component/browser tests in `frontend/src/features/registrations/` and `tests/e2e/registrations.spec.ts`. Shared migration and integrated acceptance are Not executed.

Attendee links select an owned registration by ID, so identical event names remain distinguishable. The own-list projection includes current purpose and event times; the inbox identifies changed categories without exposing internal change-request values.

## Attendee registration (KAN-14)

Attendees see CONFIRMED events that take registrations and register for them. Withdrawal and the manager view are in `router.ts`/`service.ts` above.

| File | Responsibility |
| --- | --- |
| `registration-rules.ts` | Pure decision: whether registration is open, from facts the database already compared by its own clock (CONFIRMED, switched on, inside [opens, closes), before the start, a place left, not already registered) |
| `registration-types.ts` | What an attendee may see of an event, their own record and the list items |
| `registration-service.ts` | List, read and register for the caller only; the event lock, fresh counts and reuse of a WITHDRAWN record. It writes no notices |
| `registration-router.ts` | The four `/api/attendee` routes, attendee role only |

## Rules to keep

- The attendee is always the signed-in caller. The register body must be empty; never add a field that names a person.
- Take the event row lock in its own statement, then read the counts. A single locking SELECT counts places on the snapshot taken before the wait.
- Show an attendee only what they need: no organiser, coordinator, other attendee, equipment or internal note. A non-CONFIRMED event is hidden unless the caller holds a registration for it.
- The database trigger `event_registrations_within_capacity` stays as the last guard; the service maps its error to the same Full answer.
- **One notice writer.** Migration 019's `notify_registration_outcome` trigger emits `REGISTRATION_CONFIRMED` to the attendee, organiser and coordinator inside the registering transaction; its `outcome_version` key makes a re-registration after a withdrawal a new outcome. Never add a second writer in the service. No migration of KAN-14's own.

Contract: [API contract](../../../../docs/architecture/api-contract.md#attendee-registration-kan-14-cf-18--29-october-2026). Tests: `backend/test/registrations/`, `database/tests/registrations/registration.integration.test.ts`.
