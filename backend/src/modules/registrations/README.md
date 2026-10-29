# Attendee registration (KAN-14, CF-18)

Attendees see CONFIRMED events that take registrations and register for them. Withdrawal (KAN-17) and the manager view (KAN-67) are separate stories.

| File | Responsibility |
| --- | --- |
| `registration-rules.ts` | Pure decision: whether registration is open, from facts the database already compared by its own clock (CONFIRMED, switched on, inside [opens, closes), before the start, a place left, not already registered) |
| `registration-types.ts` | What an attendee may see of an event, their own record and the list items |
| `registration-service.ts` | List, read and register for the caller only; the event lock, fresh counts, reuse of a WITHDRAWN record and same-transaction notices |
| `registration-router.ts` | The four `/api/attendee` routes, attendee role only |

## Rules to keep

- The attendee is always the signed-in caller. The register body must be empty; never add a field that names a person.
- Take the event row lock in its own statement, then read the counts. A single locking SELECT counts places on the snapshot taken before the wait.
- Show an attendee only what they need: no organiser, coordinator, other attendee, equipment or internal note. A non-CONFIRMED event is hidden unless the caller holds a registration for it.
- The database trigger `event_registrations_within_capacity` stays as the last guard; the service maps its error to the same Full answer.
- Notices: `REGISTRATION_CONFIRMED` to the attendee and `REGISTRATION_RECEIVED` to the organiser and assigned coordinator, with only the running count. The rules are **To agree** in the decision log (29 October 2026). No migration.

Contract: [API contract](../../../../docs/architecture/api-contract.md#attendee-registration-kan-14-cf-18--29-october-2026). Tests: `backend/test/registrations/`, `database/tests/registrations/registration.integration.test.ts`.
