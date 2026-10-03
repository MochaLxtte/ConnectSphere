# Testing and evidence

The suite covers application wiring, authentication/session handling, request creation, draft editing and submission, scoped request retrieval, approval/rejection, automatic and initial manual assignment, clarification and read-only status history. KAN-29 adds automatic allocation, workload balancing, rollback and concurrent allocation checks. The 26 September cleanup removed the broader venue, equipment, registration and change-request application suites. The 30 September audit additionally removes later lifecycle writes, reassignment and notification generation, and adds regression checks that deferred routes and controls stay unavailable. Retained database guards and compatibility tests do not establish those future application features. The 4 October integration brings back only the selected KAN-12 search, KAN-51 calendar and KAN-8 booking decision workflows. Recorded automated results and hosted acceptance are separate.

Infrastructure database checks live in [database.integration.test.ts](../../database/tests/database.integration.test.ts) and [core-schema.integration.test.ts](../../database/tests/core-schema.integration.test.ts); feature integration suites are grouped under `database/tests/` by module. Browser checks live in `tests/e2e/`, including [review-decision.spec.ts](../../tests/e2e/review-decision.spec.ts). The [test evidence register](test-evidence.md) records actual runs, manual observations and remaining gaps.

For KAN-29, use the [automatic-assignment integration tests](../../database/tests/events/automatic-assignment.integration.test.ts) and [manual checks](README.md#kan-29-hosted-verification). Tristan has applied migration 006 to shared Supabase; [30 September verification](test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirmed its fields and constraint, and all six current migration checksums matched hosted history through the recognised filename aliases. Confirm migration 006 in any other target environment and prepare explicitly available, provisioned coordinator profiles before hosted testing. Hosted manual checks, availability-policy acceptance, CI and peer review remain pending.

For KAN-8, input/HTTP tests are in `backend/test/venues/booking-input.test.ts` and `venue-bookings-router.test.ts`; transactional authorization, persistence, rollback and competing-decision checks are in [venue-bookings.integration.test.ts](../../database/tests/venues/venue-bookings.integration.test.ts). Vue suites sit beside `VenueBookingsPage.vue` and `VenueBookingDetailPage.vue`, with browser fixtures in `tests/e2e/venue-bookings.spec.ts`. These tests check KAN-51 availability after booking decisions as well as repeated/opposite decisions and denied actors. Use the [KAN-8 manual guide](README.md#kan-8-hosted-verification) for real account/persistence checks. KAN-53 submission is not implemented, so pending rows must already exist; fixture creation is setup, not acceptance of that story. No new migration is needed.

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

## KAN-29 hosted verification

These checks remain **pending until actual results are recorded** in [test evidence](test-evidence.md), with the commit, date, environment, tester, request/coordinator IDs, before/after data and any defects. Local automation and existing Sprint 1 results do not establish this hosted allocation path.

Prepare migration [006](../../database/migrations/006_automatic_coordinator_assignment.sql), an organiser and at least two real Supabase Auth coordinator accounts linked to `app_users`. Shared schema verification on 30 September is already recorded; coordinate other environments with Arvin using the migration runner rather than editing applied history. Set `coordinator_available = true` only for provisioned coordinators ready for work; the default is false and there is no availability-setting UI. Event ownership and assignment use **app_users.id**, not the Auth UUID.

Run `npm.cmd run dev` and use separate browser profiles or sign out between roles. Prepare valid drafts with name, purpose, start/end, attendance and venue requirements; keep registration off for these focused checks. Before selection tests, record each eligible coordinator's workload: assigned `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and legacy `CONFIRMED` requests count; drafts and closed requests do not. Ties use ascending application UUID.

Use an isolated project for controlled workloads, preassigned drafts and no-available-coordinator cases. A shared test needs a coordinated window and restoration of original availability flags; do not change teammates' live requests. A local Git branch does not isolate Supabase.

| ID | Check | Expected result |
| --- | --- | --- |
| K29-M01 | Submit separate valid drafts from the creation form, edit-draft form and saved detail action; refresh. | `SUBMITTED`, expected coordinator, one current `AUTOMATIC` assignment with `assigned_by = NULL` and `unassigned_at = NULL`, and no event review decision. |
| K29-M02 | Open the request and queue as the selected coordinator, then as another coordinator. | Selected coordinator retains access after refresh without manual assignment; unrelated coordinator cannot list/read it. |
| K29-M03 | Read the Assignment panel as organiser and assigned coordinator. | Matching coordinator, Current history and automatic timestamp; assignments API returns `AUTOMATIC` with null assigning actor/name. No handover control. |
| K29-M04 | Give exactly two eligible coordinators equal active loads; submit two drafts sequentially. | First selects the lower UUID, second selects the now-lower workload. Record counts before each submission; restore temporary flags. |
| K29-M05 | Opt the otherwise lowest-workload coordinator out, leaving another available. | New submission excludes the unavailable coordinator; existing assignments and access remain intact. Restore flags. |
| K29-M06 | Make all coordinators unavailable in the controlled environment; submit from form and detail, edit/save, then opt one in and retry. | `409 NO_AVAILABLE_COORDINATOR`; draft remains editable with no assignment or submitted history. Retry submits the same draft without duplication. |
| K29-M07 | As owner, repeat `POST /api/events/:id/submit` for M01's submitted request. | `409 REQUEST_NOT_SUBMITTABLE`; original status, coordinator, assignment ID/time and single active history row remain unchanged. |
| K29-M08 | As assigned and unrelated coordinators, send `PUT /api/events/:id/coordinator` with another application UUID in `coordinatorId`. | Assigned actor gets `409 REASSIGNMENT_NOT_AVAILABLE`; unrelated actor gets `404 EVENT_REQUEST_NOT_FOUND`. No history changes or handover UI. Initial manual assignment remains available only for unassigned Submitted, Under review, Clarification requested or Approved requests; reassignment is future KAN-65. |
| K29-M09 | Submit an isolated valid draft with an existing coordinator or active assignment row. | `409 DRAFT_ALREADY_ASSIGNED`; original draft/history preserved and UI permits edit/save. Reconcile test fixtures without clearing real history. |
| K29-M10 | Submit an incomplete owned draft; attempt another organiser's draft; attempt submission as coordinator. | Respectively `400 SUBMISSION_INCOMPLETE`, `404 EVENT_REQUEST_NOT_FOUND`, `403 SUBMIT_FORBIDDEN`; no allocation/status change. |

API checks use the browser's same-origin authenticated session and fictional request IDs. For every refusal, inspect both `event_status_history` and `coordinator_assignments` before/after; an HTTP error alone does not prove no write occurred. Record Passed, Failed or Not run per ID and restore temporary flags. CI, peer review and policy acceptance remain separate evidence.

## KAN-8 hosted verification

These checks also remain **pending**, separately from AUTO-20261004-KAN8-01's local results. Record the build, tester, date, fixture IDs, responses and persisted outcomes in [test evidence](test-evidence.md). Keep credentials, cookies and tokens out of evidence.

Run `npm.cmd run dev` and open `http://127.0.0.1:5173`. Provision Supabase Auth accounts mapped through `app_users.supabase_user_id`: Venue Staff, the event's assigned coordinator, another coordinator, an organiser and Technical Support Staff. Passwords belong in Supabase Authentication. KAN-8 uses migration 004's retained tables; **no new migration is required** and current 001–006 history stays intact.

**KAN-53 booking submission is not integrated.** Have Arvin prepare fictional pending rows in Table Editor against an active venue and an `APPROVED` event assigned to the coordinator. Populate current event timing, attendance, venue/accessibility requirements and descriptive fields. Fixture preparation is not acceptance of KAN-53; repeat the connected journey when that story is integrated.

| `venue_bookings` fields | Fixture values |
| --- | --- |
| `event_request_id`, `venue_id` | The approved test event and active venue IDs |
| `requested_by` | Assigned coordinator's **app_users.id**, not Auth UUID |
| `status` | `PENDING` |
| `starts_at`, `ends_at` | Explicit `+08:00` timestamps, end after start |
| `layout`, `notes` | Recognisable fictional requirements |
| `decided_by`, `decided_at`, `decision_reason` | NULL; the decision API fills these |
| Remaining UUID/timestamp fields | Use database defaults |

Prepare A/B with overlapping intervals at the same venue, C at a separate free interval, and D over a fictional operational block. If needed, Arvin prepares that block in `venue_unavailability` with venue/time/reason and the staff's application ID as `created_by`; KAN-55's block-creation UI is not implemented. Avoid real bookings and retain IDs before decided rows leave the pending queue.

| Check / acceptance link | Actions and expected outcome |
| --- | --- |
| Staff approval — S2-T13 | Open **Venue bookings** as staff. Verify pending A/B/C/D and correct booking/current-event details. On A select **Approve booking → Record decision**. Refresh: saved Approved outcome/time, no controls, absent from pending queue. Database attribution is the staff application ID; only A changes, its event/venue/interval stay intact, and event status stays `APPROVED`. |
| Coordinator and availability — S2-T13/S2-T15 | Assigned coordinator sees A's saved outcome/reason/time after refresh with no controls. Calendar marks A's venue/period booked and search excludes it. Adjacent intervals do not conflict. |
| Rejection — S2-T13 | On C select **Reject booking**, provide a reason and **Record decision**. Staff and assigned coordinator retain the Rejected outcome/reason/time after reload. C does not reserve availability. Reason is optional, trimmed, maximum 2,000 characters; a mandatory venue rejection reason has not been agreed. |
| Conflict and concurrency — S2-T14/S2-T15 | Approving B after A returns `409 VENUE_BOOKING_CONFLICT`; D returns `409 VENUE_UNAVAILABLE`. Each remains pending with null decision fields, A unchanged. Concurrent overlapping approvals allow only one success; automated PostgreSQL tests provide stronger race evidence than near-simultaneous clicks. |
| Repeat/opposite decision — S2-T14 | As staff, POST both `{ "decision": "APPROVED" }` and `{ "decision": "REJECTED" }` to `/api/venue-bookings/<A-id>/decision`. Both return `409 BOOKING_ALREADY_DECIDED`; original status, actor, time and reason remain unchanged. |
| Role/relationship access — S2-T14 | Organiser/Technical Support Staff see no booking navigation/data on direct list/detail URLs. Technical Support Staff keeps separate calendar access. Another coordinator cannot list A and receives 404 for its API detail. A coordinator/non-staff decision POST returns `403 ACTION_FORBIDDEN`, unchanged data. Signed-out list/detail/decision APIs return 401 and UI asks for login. |
| Stale state and recovery | Decide in one of two staff sessions; the other's write conflicts and reloads the saved outcome without replacing it. Failed reads offer retry. Offline/uncertain writes require **Refresh booking** before another decision; no automatic write retry. An unapproved event or inactive venue blocks approval without writes; rejection remains possible. |

Use the same-origin authenticated browser session for API requests, with `Content-Type: application/json` and the stated JSON bodies. Compare persisted data before/after refusals, not only HTTP responses. Approval eligibility, all-staff review scope, current requirements rather than a snapshot, optional reason and half-open reservation intervals remain [documented implementation choices](../requirements/assumptions-and-questions.md#4-october-2026--kan-8-venue-booking-decisions) awaiting team/customer review. Record actual failures and exclusions; CI on PostgreSQL 17, peer review, hosted acceptance and Sprint 2 acceptance are separate. Do not infer Done points or change the 43-point baseline from these instructions.
