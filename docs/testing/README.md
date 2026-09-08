# Testing and evidence

The scaffold checks application wiring: API health/error responses, database migration/seed/readiness behavior, and browser navigation through the scaffold. These checks do not demonstrate authentication, event processing, booking, equipment allocation, or registration.

Database checks live in [database.integration.test.ts](../../database/tests/database.integration.test.ts), and browser checks live in [scaffold.spec.ts](../../tests/e2e/scaffold.spec.ts). Business-story tests still need to be implemented and linked separately.

Run commands from the repository root using the setup in the [main README](../../README.md):

```sh
npm run check
npm run test:integration
npm run test:e2e
```

Follow the README for database and browser prerequisites. Treat the exit status and test report as evidence of an actual run; this document is not a stored passing result.

## Database environments

Supabase hosts the development PostgreSQL database following the [8 September technical decision](../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql). Keep database integration tests on an isolated test database: CI uses PostgreSQL 17, and Docker Compose provides an optional local test instance. Do not run tests that create or clean up fixtures against the shared development project or production.

Record hosted setup verification separately: project/environment, connection mode, verified TLS, migration and seed results, API readiness, disabled Data API setting and application-table RLS/privilege protections. Keep credentials out of evidence. Local or CI PostgreSQL results do not prove those hosted settings have been checked.

KAN-25's authentication approach is still to be agreed. Whatever the identity provider, tests must exercise Express role and event-relationship checks directly; database hosting and RLS configuration alone do not demonstrate application authorisation.

## Business-test planning

[test-cases.csv](test-cases.csv) contains scenario outlines for all 20 release features. Every row starts as **Not executed** and must be refined into concrete preconditions, actions, expected outcomes and acceptance-criterion links before it becomes a test case. Questions such as interval boundaries and registration eligibility must reference a recorded decision.

Sprint 1 has [33 proposed acceptance scenarios](../scrum/sprint-01/sprint-backlog.md#acceptance-test-plan), each linked to a specific acceptance criterion. Review these alongside the story cards, then link the implemented tests and actual results in the [test evidence record](test-evidence.md). The release-wide CSV remains the coverage index for all 20 core features.

Choose the test level for the behavior being verified:

- Unit tests for domain validation, permitted state transitions and suitability calculations.
- Integration tests for authorization on real requests, transaction boundaries, persistence, rollback and competing reservations.
- A small set of browser tests for complete user workflows and important failure feedback.

Reservation and registration limits need competing-request tests against PostgreSQL, not only sequential happy-path tests or mocked repositories. Significant event-change tests should verify the resulting reservations, registrations and notifications together. Test user access to records belonging to someone else, even when both users have the same role.

Add the actual test file and acceptance-criterion ID to [traceability.csv](../requirements/traceability.csv) when implementing a story. Split feature-level outlines into multiple cases as needed; retain stable IDs or record replacements. A test is not complete merely because its title repeats a requirement.

## Recording a test run

Keep concise evidence containing the date, commit SHA, environment, command or manual steps, actual result, report link, and any failures or exclusions. Link CI runs and store exports needed for the course submission. Do not commit credentials, attendee data, `node_modules`, or bulky generated browser artifacts.

Test documents, the traceability matrix and curated results are assembled into **submission folder 3**; Sprint 1 scenario details remain linked in folder 4. Executable test code is included with the software in folder 6. See the [submission checklist](../submission/checklist.md).

The excellent course rubric asks for 100% coverage unless infeasible and explained. Agree what coverage measures apply, report the measured result, and explain gaps. Line coverage alone cannot demonstrate all requirements or concurrency behavior; the release traceability matrix must also be complete.
