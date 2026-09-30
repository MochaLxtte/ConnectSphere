# Testing and evidence

The suite covers application wiring, authentication/session handling, request creation, draft editing and submission, scoped request retrieval, approval/rejection, automatic and initial manual assignment, clarification and read-only status history. KAN-29 adds automatic allocation, workload balancing, rollback and concurrent allocation checks. The 26 September cleanup removed the broader venue, equipment, registration and change-request application suites. The 30 September audit additionally removes later lifecycle writes, reassignment and notification generation, and adds regression checks that deferred routes and controls stay unavailable. Retained database guards and compatibility tests do not establish those future application features. Recorded automated results and hosted acceptance are separate.

Infrastructure database checks live in [database.integration.test.ts](../../database/tests/database.integration.test.ts) and [core-schema.integration.test.ts](../../database/tests/core-schema.integration.test.ts); feature integration suites are grouped under `database/tests/` by module. Browser checks live in `tests/e2e/`, including [review-decision.spec.ts](../../tests/e2e/review-decision.spec.ts). The [test evidence register](test-evidence.md) records actual runs, manual observations and remaining gaps.

For KAN-29, use the [automatic-assignment integration tests](../../database/tests/events/automatic-assignment.integration.test.ts) and [manual checks](kan29-manual-checks.md). Tristan has applied migration 006 to shared Supabase; [30 September verification](test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirmed its fields and constraint, and all six current migration checksums matched hosted history through the recognised filename aliases. Confirm migration 006 in any other target environment and prepare explicitly available, provisioned coordinator profiles before hosted testing. Hosted manual checks, availability-policy acceptance, CI and peer review remain pending.

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

KAN-25 uses Supabase Auth. Express verifies the session and maps the Supabase identity to `app_users`, then enforces role, ownership and assigned-coordinator access. Local authenticated integration tests exercise this boundary with local tokens/profiles; they do not establish real Supabase login or hosted acceptance. The 15 September manual login/approval observation is recorded separately in [test evidence](test-evidence.md).

## Business-test planning

[test-cases.csv](test-cases.csv) indexes scenario outlines for all 20 release features. Rows with linked partial evidence do not establish full feature acceptance; remaining outlines must be refined into concrete preconditions, actions, expected outcomes and acceptance-criterion links. Questions such as interval boundaries and registration eligibility must reference a recorded decision.

Use the [product backlog](../requirements/product-backlog.md) for future-story scope and dependencies. KAN-65 reassignment, KAN-66 planning edits and KAN-67 registration viewing require their own acceptance evidence. Historical KAN-34 draft-edit results do not accept KAN-66; retained draft evidence belongs to TC-03 and its original result entries.

Sprint 1 has [33 proposed acceptance scenarios](../scrum/sprint-01/sprint-backlog.md#acceptance-test-plan), each linked to a specific acceptance criterion. Review these alongside the story cards, then link the implemented tests and actual results in the [test evidence record](test-evidence.md). The release-wide CSV remains the coverage index for all 20 core features.

Sprint 2 has a [criterion-linked acceptance plan](../scrum/sprint-02/sprint-backlog.md#acceptance-test-plan) covering the nine new Jira stories and three carried stories. New-story criteria use `KAN-<number>-AC<number>` labels; proposed robustness and policy checks are identified separately. The plan is not an executed test report. Keep actual results linked to their tested build and retain failed/retested paths from the Sprint 1 review.

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
