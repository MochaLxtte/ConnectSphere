# Testing and evidence

**Current audit, 15 October 2026:** [AUTO-20261015-01](test-evidence.md#15-october-2026-post-sprint-implementation-audit) records 1,356 passing unit/component tests, 304 PostgreSQL integration tests and 95 browser tests, plus measured coverage. Separate reproductions found five defects that those suites missed; the record names each failure and required regression. The [retained summary](coverage-reports/2026-10-15-post-sprint-audit.txt) is a post-sprint result, not a Sprint 1/2 closure or hosted acceptance record.

The suite covers application wiring, authentication/session handling, request creation, draft editing and submission, scoped request retrieval, approval/rejection, automatic and initial manual assignment, clarification and read-only status history. KAN-29 adds automatic allocation, workload balancing, rollback and concurrent allocation checks. The 26 September cleanup removed the broader venue, equipment, registration and change-request application suites. The 30 September audit additionally removes later lifecycle writes, reassignment and notification generation, and adds regression checks that deferred routes and controls stay unavailable. Retained database guards and compatibility tests do not establish those future application features. The 4 October integration brings back only the selected KAN-12 search, KAN-51 calendar and KAN-8 booking decision workflows. KAN-55 block management is also integrated from current main, and KAN-52 adds read-only suitability with explicit coordinator interpretation. The 5 October integration adds KAN-53 coordinator booking submission and the latest KAN-12 continuous-interval date filtering. Recorded automated results and hosted acceptance are separate.

Infrastructure database checks live in [database.integration.test.ts](../../database/tests/database.integration.test.ts) and [core-schema.integration.test.ts](../../database/tests/core-schema.integration.test.ts); feature integration suites are grouped under `database/tests/` by module. Browser checks live in `tests/e2e/`, including [review-decision.spec.ts](../../tests/e2e/review-decision.spec.ts). The [test evidence register](test-evidence.md) records actual runs, manual observations and remaining gaps.

For KAN-29, use the [automatic-assignment integration tests](../../database/tests/events/automatic-assignment.integration.test.ts) and [manual checks](README.md#kan-29-hosted-verification). Tristan has applied migration 006 to shared Supabase; [30 September verification](test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirmed its fields and constraint, and all six current migration checksums matched hosted history through the recognised filename aliases. Confirm migration 006 in any other target environment and prepare explicitly available, provisioned coordinator profiles before hosted testing. Hosted manual checks, availability-policy acceptance, CI and peer review remain pending.

For KAN-8, input/HTTP tests are in `backend/test/venues/booking-input.test.ts` and `venue-bookings-router.test.ts`; transactional authorization, persistence, rollback and competing-decision checks are in [venue-bookings.integration.test.ts](../../database/tests/venues/venue-bookings.integration.test.ts). Vue suites sit beside `VenueBookingsPage.vue` and `VenueBookingDetailPage.vue`, with browser fixtures in `tests/e2e/venue-bookings.spec.ts`. These tests check KAN-51 availability after booking decisions as well as repeated/opposite decisions and denied actors. Use the [KAN-8 manual guide](README.md#kan-8-hosted-verification) for real account/persistence checks. KAN-53 submission is integrated on this branch; create synthetic pending rows through the coordinator review panel and verify the connected workflow using [submission checks](#kan-53-hosted-verification). No new migration is needed.

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

The original `TC-01`–`TC-20` rows remain aggregate feature summaries with their dated evidence. Case-specific rows such as `TC-08-01` identify individual regression scenarios, steps and expected results. The 15 October additions record five observed **Fail** results and one future KAN-60 **Not executed** scenario; they do not claim that permanent regression tests or fixed-code retests already exist. Existing test files in [traceability.csv](../requirements/traceability.csv) are labelled as regression targets where a new case is still missing.

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

## KAN-53 hosted verification

Use KAN-53-AC1–AC11, S2-T11/T12 and the submission-conflict portions of S2-T15. These checks are **pending until actual results are recorded** with the build, environment, tester, fixture IDs, HTTP result and persisted data. The original branch's unit/component evidence is [AUTO-20261004-KAN53-01](test-evidence.md#4-october-venue-booking-submission); it is not the integrated hosted workflow.

Prepare an active synthetic venue, a non-draft event assigned to a provisioned coordinator, another coordinator, organiser and Venue Staff accounts. Use an Approved event for the connected staff-approval journey. On `/reviews/<event-id>`, find **Venue booking requests**, choose the venue, enter **Starts (Singapore time)** / **Ends (Singapore time)** and optional **Room layout** / **Notes for Venue Staff**, then choose **Request this venue**. Booking timing is entered separately from the event's timing; assess any difference explicitly. KAN-52's assessment does not reserve the venue or automatically limit this picker.

| Check / acceptance link | Expected result |
| --- | --- |
| Submit and retain — S2-T11; AC1–AC10 | A free interval saves one Pending request, shows a success message and survives **Refresh booking requests** and page reload. The row has the correct event, venue, coordinator application ID, interval and trimmed layout/notes, with null decision fields. Event status remains unchanged. |
| Staff handoff — S2-T11; AC4/AC8 | Venue Staff sees the new request in **Venue bookings**, with current event requirements and saved booking interval/layout/notes. Complete [KAN-8](#kan-8-hosted-verification) approval/rejection and coordinator outcome checks separately. Submission alone creates no reservation. |
| Existing reservation or block — S2-T15; customer refinement | Submit against an approved booking or operational block: respectively `409 VENUE_BOOKING_CONFLICT` / `409 VENUE_UNAVAILABLE`, useful feedback and no new row. An exactly adjacent free interval is accepted; another venue is independent. |
| Pending requests — S2-T12 policy | Two overlapping pending requests may be created before either is approved; neither reserves availability. Once one is approved, a later conflicting submission is refused and the other's approval must be refused. This is the current documented default, not confirmed duplicate/hold policy. |
| Input and eligibility — S2-T12 | Invalid UUID, impossible calendar date, missing timezone, end at/before start, unknown identity/status fields or text over the API limit return 400 with no row. Missing/inactive venue gives 404/409. Rejected/Cancelled/Completed event gives `409 EVENT_NOT_ELIGIBLE`; draft/missing/unrelated event gives `404 EVENT_REQUEST_NOT_FOUND`. API layout/notes limit is 2,000; UI layout limit is 100. |
| Role and relationship — AC11; S2-T12 | An unrelated coordinator cannot create a booking for this event. Organisers, Venue Staff and Technical Support Staff cannot submit (403) and do not mount the coordinator panel. Signed-out calls get 401. Verify no new row or forged requesting actor. |
| Recovery and navigation — S2-T12 robustness | Read/catalogue failures offer retry. Server refusals retain editable input without a success message. After an uncertain write, **Request this venue** stays disabled until **Refresh booking requests** succeeds; inspect the list before retrying because the first write may have committed. Changing account/event or leaving the page discards stale responses. |

API checks use the same-origin authenticated session and `POST /api/events/<event-id>/venue-bookings`; the [contract](../architecture/api-contract.md#venue-booking-submission-kan-53-cf-12) defines the body and errors. Store no cookies, credentials or real personal data in evidence. Check database rows before/after refusals, not only response codes. There is no automatic duplicate-submission idempotency guarantee. Eligible states, pending holds/duplicates, current requirements versus a snapshot, and any future suitability gate remain open policy choices. Hosted acceptance, policy confirmation, peer review and CI are distinct from local implementation.

## KAN-8 hosted verification

These checks also remain **pending**, separately from AUTO-20261004-KAN8-01's local results. Record the build, tester, date, fixture IDs, responses and persisted outcomes in [test evidence](test-evidence.md). Keep credentials, cookies and tokens out of evidence.

Run `npm.cmd run dev` and open `http://127.0.0.1:5173`. Provision Supabase Auth accounts mapped through `app_users.supabase_user_id`: Venue Staff, the event's assigned coordinator, another coordinator, an organiser and Technical Support Staff. Passwords belong in Supabase Authentication. KAN-8 uses migration 004's retained tables; **no new migration is required** and current 001–006 history stays intact.

Use the integrated KAN-53 panel to prepare fictional pending bookings against an active venue and an `APPROVED` test event assigned to the coordinator. Fill the event timing, attendance, venue/accessibility needs and descriptive fields first. From `/reviews/<event-id>`, use **Venue booking requests** and **Request this venue**; follow [the submission checks](#kan-53-hosted-verification). The service sets `requested_by` to the coordinator's application ID, status to Pending and decision fields to null. There is no new migration.

Prepare A/B with overlapping free intervals at the same venue, C at another free interval, and D at a third free interval. **Create both A/B before approving either. Create D before adding its operational block** through `/venue-blocks` as staff. Submission against an already approved reservation/block is now refused, so those would not produce the pending fixtures needed for the separate approval-time checks. Pending overlaps are permitted. Avoid real bookings and retain IDs before decided rows leave the pending queue; restore synthetic fixture changes in a coordinated environment.

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

## KAN-52 hosted verification

Use S2-T09/T10 and KAN-52-AC1–AC9. These are instructions, not recorded passes. Record commit, date, tester, environment, synthetic IDs, inputs, expected/actual results and defects in [test evidence](test-evidence.md). No migration is required. Local automated tests do not establish hosted login, authorization or customer acceptance.

Prepare an assigned, non-draft synthetic event and active venues with known capacity, facilities, layouts, accessibility and opening hours. Provision mapped accounts for the assigned coordinator, another coordinator and a non-coordinator. Use an isolated project or coordinate dashboard fixture changes with Arvin and restore original values; a Git branch does not isolate Supabase. KAN-55 can create synthetic blocks through the staff page. For an approved-reservation fixture, create a synthetic request through KAN-53 as its assigned coordinator, then approve it as Venue Staff through KAN-8; the event must be Approved for that decision. Avoid changing real requests/bookings.

Run `npm.cmd run dev`, sign in as the assigned coordinator, open the event from review queue/history and choose **Check venue suitability**. Inspect the source event text, timing/attendance and selected venue capabilities. Enter one required facility/accessibility label per line, one layout where applicable, the wheelchair requirement and any unresolved needs. Confirm only after reviewing the source: blank fields mean none required only when explicitly confirmed.

| Check / criterion link | Expected result |
| --- | --- |
| Matching venue — AC1/AC8; S2-T09 | With sufficient capacity, every required capability and a free period inside opening hours, confirm and choose **Check suitability**, then **Recheck suitability**. Suitable shows the correct venue, check time and explanations. Exact capacity equality passes; case/outer whitespace differences do not create false label mismatches. |
| Individual mismatches — AC2–AC5/AC7; S2-T09 | Separately exceed capacity, require a missing facility, unsupported layout, missing accessibility feature and unavailable wheelchair access. Reconfirm after each edit. Each mismatch gives Unsuitable and identifies its cause. A different accessibility feature must not satisfy a missing one; unlisted requirements can be entered. |
| Unknown/inapplicable needs — AC1/AC8; S2-T10 robustness | Before confirmation the Check button is disabled. An unresolved requirement keeps the result Needs review unless another check definitely fails. Missing/invalid attendance or timing is unknown, never Suitable. Explicitly confirmed inapplicable needs do not falsely fail; source prose is not guessed or parsed. |
| Availability — AC6/AC7; S2-T09 | An overlapping approved booking or operational block gives Unsuitable with a reason; an adjacent interval remains eligible. Pending/rejected bookings do not reserve. The same event's own booking still reserves. Crossing closed overnight/intervening hours fails even when endpoint clock times look valid. No turnover buffer is added. |
| Current data — AC9; S2-T10 | Change a synthetic venue capability/capacity or create/remove a block, then recheck to see the new result. Change relevant event source fields while open: the next check gets `409 SUITABILITY_CONTEXT_CHANGED`, refreshes source data and requires a new interpretation. **Refresh event and venues** also reloads current data. |
| Access/recovery — S2-T10 robustness | Another coordinator gets 404, non-coordinators 403 and signed-out API calls 401 with UI sign-in. Failed reads/checks, expired sessions and account/event changes do not retain a stale successful result or expose another event. Retry after recovery. |
| Read-only boundary — S2-T09/T10 | Compare event/status and booking rows before/after both successful and unsuccessful assessments. No event rejection, requirement update, booking, reservation or stored decision is created. An assessment is an observation at check time, not a guaranteed booking. |

For API checks, use the authenticated same-origin session: GET `/api/events/<event-id>/venue-suitability`, then POST to the same route with every explicit field and the returned version; see [the request body/errors](../architecture/api-contract.md#venue-suitability-kan-52-cf-11). Unconfirmed/unresolved input must never manufacture Suitable. Keep cookies and credentials out of evidence.

Automated suites: `backend/test/venues/suitability-input.test.ts`, `suitability-rules.test.ts`, `suitability-router.test.ts`, `database/tests/venues/venue-suitability.integration.test.ts`, `frontend/src/features/venues/pages/VenueSuitabilityPage.test.ts` and `tests/e2e/venue-suitability.spec.ts`. [AUTO-20261004-KAN52-01](test-evidence.md#4-october-venue-suitability) records the passing local runs. Hosted checks, peer review, published CI and [remaining policy acceptance](../requirements/assumptions-and-questions.md#4-october-2026--kan-52-venue-suitability) remain separate from implementation and do not award Done points automatically.

## KAN-59 hosted verification

Use S2-T22, KAN-6-AC2/AC3 and KAN-6-AC5–AC7. These are instructions, not recorded passes. Record commit, date, tester, environment, synthetic IDs, inputs, expected/actual results and defects in [test evidence](test-evidence.md). No migration is required. Local automated tests do not establish hosted login, authorization or customer acceptance.

Provision a mapped Event Organiser, a second organiser, and at least one opted-in coordinator (`coordinator_available = true`) so a valid submission can be allocated. Use an isolated project or coordinate dashboard fixture changes with Arvin and restore them afterwards.

Run `npm.cmd run dev`, sign in as the organiser and use **Submit for review** from `/events/new` and from a reopened saved draft (`/events/:id/edit`). For direct API checks, call `POST /api/events/<draft-id>/submit` from the signed-in browser session (for example with `fetch` from the developer console on the same origin); see [the error table](../architecture/api-contract.md#kan-29-automatic-assignment-on-submission).

| Check / criterion link | Expected result |
| --- | --- |
| Missing mandatory fields — AC2; S2-T22 | A draft without name, purpose, start, end, attendance or venue requirements is refused with the missing fields listed (`400 SUBMISSION_INCOMPLETE`). The draft is saved, stays `DRAFT`, has no coordinator, and the form marks each field. |
| Blank text — AC5; S2-T22 robustness | Through the API, set `name`, `purpose` or `venueRequirements` to `""`, spaces, or a tab/newline and submit: each is treated as missing and refused. In the form, blank text is stored as empty and is also refused. |
| End not after start — AC6; S2-T22 | Set the end equal to, then before, the start (API; the form blocks it earlier). Submission is refused with `400 SUBMISSION_INVALID` and an `endsAt` message; the draft is unchanged. |
| Registration window — AC7; S2-T22 | With registration required, set the close equal to or before the open: refused with a `registrationClosesAt` message. With registration not required, the same dates are ignored. A blank capacity submits (no limit). |
| Several problems at once — AC2/AC5/AC6 | A blank name plus a bad end reports both together. After correcting both, the same request submits and shows `SUBMITTED` with an assigned coordinator after reload. |
| Optional needs — S2-T22 | Description, accessibility needs and equipment requirements may be left blank or set to "None" / "Not Required"; submission is not blocked. |
| Access — AC3; S2-T22 | A second organiser gets 404 for the first organiser's draft whether or not it is complete; a coordinator gets 403; signed-out callers get 401. None of them can learn from the response whether the draft is complete. |
| Open question | An expected attendance of 0 currently submits. Record the Product Owner's or customer's decision. |

Automated suites: `backend/test/events/submit-input.test.ts`, `submit-request.test.ts`, `submitted-requests-router.test.ts`, `database/tests/events/submit-request.integration.test.ts`, `frontend/src/features/events/api/event-requests.test.ts` and `components/EventRequestForm.test.ts`. [AUTO-20261009-KAN59-01](test-evidence.md#9-october-submission-validation-kan-59--s1-def-04) records which have been executed.

## KAN-50 hosted verification

Use S2-T03/S2-T04 and KAN-50-AC1–AC21. These are instructions, not recorded passes. Record commit, date, tester, environment, synthetic IDs, inputs, expected/actual results and defects in [test evidence](test-evidence.md). No migration is required. Local automated tests do not establish hosted login, authorization or customer acceptance.

Prepare two or three synthetic active venues with known values and one inactive one. Provision mapped accounts (a Supabase user plus an `app_users` row with `supabase_user_id`; accounts are provisioned manually, Q-01) for **two Venue Staff members**, an Event Coordinator, an Event Organiser and a Technical Support Staff member. Use an isolated project or coordinate dashboard fixture changes with Arvin and restore the original values afterwards; a Git branch does not isolate the shared database.

Run `npm.cmd run dev` (with `NODE_EXTRA_CA_CERTS` set if a TLS-intercepting antivirus is installed), sign in as Venue Staff and choose **Venue catalogue** in the sidebar.

| Check / criterion link | Expected result |
| --- | --- |
| View — AC1/AC2/AC12; S2-T03 | Every active venue is listed by name with location, capacity, layouts and facilities; the inactive venue is absent. **Edit** opens one venue showing exactly the values stored in the database. |
| Update each attribute — AC3–AC9/AC11/AC12; S2-T03 | Change location, capacity, facilities, accessibility features, the wheelchair flag, two or more layouts and both operating hours; save. The success message appears, the form shows the saved values, and a full reload and the list page show them too. Only the chosen venue changed; its name and description did not. |
| Layouts stay with the venue — AC10/AC11; S2-T03 | Give venue A two layouts and venue B different ones; save both. Each venue keeps only its own after a reload. |
| Search and suitability use the change — AC13/AC20; S2-T03 | As the coordinator, search venues by the new capacity, layout and facility: the edited venue now appears (and stops appearing when capacity is lowered). Open a suitability check for an event and see the new values. An existing approved booking is unchanged. |
| Validation — AC15–AC17; S2-T04 robustness | Capacity 0, a negative or decimal capacity, closing at or before opening, an entry over 100 characters, more than 30 distinct entries and a blank form are each refused with a clear message and nothing is saved. Entries that differ only by case or surrounding spaces are stored once. |
| Single hour change — AC16; S2-T04 robustness | With stored hours 08:00–22:00, setting only opening to 23:00 or only closing to 07:00 is refused; clearing one endpoint leaves the other and means no restriction at that end. |
| Concurrent edits — AC18; S2-T04 robustness | Open the same venue in two Venue Staff sessions. Change capacity in one and facilities in the other, saving each. Reload: both changes are present. Changing the same field in both keeps the last save. |
| Access — AC14; S2-T04 | Coordinator, organiser and technical support see no Venue catalogue link; opening `/venue-catalogue` or `/venue-catalogue/<id>` directly shows the staff-only message and requests no venue data. `GET`/`PATCH /api/venues/catalogue…` return 403 for them and 401 when signed out. A `PATCH` containing `name` returns 400 and the stored name is unchanged. |
| Inactive or missing venue — AC19; S2-T04 robustness | Deactivate a synthetic venue in the dashboard: it leaves the list, its direct page shows "not in the active catalogue", and a `PATCH` returns 409 `VENUE_INACTIVE`. Restore it afterwards. |
| Save failure — AC21; S2-T04 robustness | Interrupt the connection or expire the session while saving: a clear message appears, the entered values stay, and nothing is reported as saved. |

For API checks, use the authenticated same-origin session; see [the routes, body rules and errors](../architecture/api-contract.md#venue-catalogue-maintenance-kan-50-cf-08). Keep cookies and tokens out of evidence.

Automated suites: `backend/test/venues/venue-catalogue-input.test.ts`, `venue-catalogue-service.test.ts`, `venue-catalogue-router.test.ts`, `database/tests/venues/venue-catalogue.integration.test.ts`, the four files under `frontend/src/features/venues/` named `catalogue-form`, `api/venue-catalogue`, `VenueCataloguePage` and `VenueCatalogueEditPage`, and `tests/e2e/venue-catalogue.spec.ts`. [AUTO-20261009-KAN50-01](test-evidence.md#9-october-venue-catalogue-maintenance-kan-50) records which have been executed.

## Rebalanced Release 1 verification plan — 16 October 2026

[Sprint 3](../scrum/sprint-03/sprint-backlog.md) and [Sprint 4](../scrum/sprint-04/sprint-backlog.md) allocate all active criteria after the 63/63 rebalance. Transferred tests retain their existing case IDs; old combined KAN-64 cases are labelled historical and its active AC201–209 plus KAN-80 have separate cases. CR-1–CR-6 trace to the 2 October receipt and later refinement in the [change register](../requirements/change-requests.md). New case specifications are Not executed, not passing evidence. The five original failed audit cases retain their dated failures until an actual fixed-code run is recorded.

S3 connected verification ends with usable request/venue decisions, Lead access, buffers, outage recovery and expiring holds with notifications. S4 extends this through equipment, event lifecycle/registration, independent arrangements, safety/preparation and the remaining notification matrix. Expiry tests need a controlled clock, worker restart/replay and race checks; safety tests need current arrangement revisions and three outcomes. These checks are acceptance requirements for implementation, not results from this documentation update.
