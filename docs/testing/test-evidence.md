# Test execution evidence

Record each relevant run with its commit, scope and result. Store concise report exports alongside this document and link the corresponding tests from the [traceability matrix](../requirements/traceability.csv). The [Sprint 1 acceptance test plan](../scrum/sprint-01/sprint-backlog.md#acceptance-test-plan) provides the initial scenario and acceptance-criterion IDs.

## Run register

The automated entries below preserve the results recorded for their implementation commits. Generated local reports are disposable; retain concise exports or link CI artifacts for the reviewed commit.

| Run ID / date | Commit and environment | Story / AC / scenario IDs | Command or manual steps | Actual result and failures | Report / CI run | Checked by |
| --- | --- | --- | --- | --- | --- | --- |
| AUTO-20260915-01 / 15 September 2026 | `c14eaf4`; local Node 24, Vue/Express | KAN-25/KAN-33/KAN-34/KAN-6/KAN-36 and shared infrastructure; see linked suites below | `npm run check` | Passed: 337 unit/component tests, type checks and builds. Component/HTTP doubles do not establish hosted acceptance. | Commit-linked summary; retained console export and CI run link to add | Automated local run |
| AUTO-20260915-02 / 15 September 2026 | `8334f94`; isolated local PostgreSQL | S1-T18, S1-T20–S1-T24, S1-T27; authentication, draft and submission integration | `npm run test:integration` | Passed: 59 integration tests. Review cases exercise real transactions, access checks, conflicting decisions and rollback. Authenticated HTTP cases use locally signed tokens and local profiles. | Commit-linked summary; retained console export and CI run link to add | Automated local run |
| AUTO-20260915-03 / 15 September 2026 | `c14eaf4`; local Playwright Chromium | KAN-33/KAN-36 interface plus application startup/navigation | `npm run test:e2e` | Passed: 9 checks. Decision cases use intercepted API responses to check approval/rejection, reason/outcome after reload and absent decision controls when permission is false. | [Decision browser tests](../../tests/e2e/review-decision.spec.ts); retained report and CI run link to add | Automated local run |
| MAN-20260915-01 / 15 September 2026 | Local webpage and Supabase development project; working branch at `c14eaf4`; exact served build/time not captured | KAN-25 login; partial S1-T21 / KAN-36-AC1 | Sign in; open the assigned synthetic submitted request; record approval; inspect its status in Supabase | Login succeeded. After approval on the webpage, Supabase showed `SUBMITTED` → `APPROVED`. See the scope and exclusions below. | Written observation below; screenshot/recording not captured | Tristan |
| MAN-20260916-01 / 16 September 2026 | Local webpage and Supabase development project; working branch at `00f5168`; exact served build/time not captured | S1-T21 / KAN-36-AC1; approval persistence and queue removal | Reload the approved request; inspect its matching review row and reviewer; return to the review queue | Passed: approval persisted on reload, reason display behaved as expected where supplied, and decision controls were absent. The matching review row recorded `APPROVED` with the coordinator's application ID. The approved request was absent from the queue. | Written observation below; screenshot/recording not captured | Tristan |
| MAN-20260916-02 / 16 September 2026 | Local webpage and Supabase development project; working branch at `2661219`; exact served build/time not captured | S1-T22 / KAN-36-AC2; rejection persistence and queue removal | Reject a separate assigned submitted request with a reason; inspect its request/review rows; reload the webpage and return to the queue | Passed: status and review decision were `REJECTED`; the reason and reviewer were correct. Rejection and reason remained after reload, decision controls were absent, and the request left the queue. | Written observation below; screenshot/recording not captured | Tristan |
| MAN-20260916-03 / 16 September 2026 | Local webpage and Supabase development project; working branch at `2c5f3e8`; exact served build/time not captured | S1-T23 / KAN-36-AC3; organiser role case | Sign in as the owning organiser; open the rejected request; directly POST an approval from the browser console | Passed: the outcome was readable without decision controls. The direct POST returned `403 REVIEW_FORBIDDEN`; the original rejection and review row remained unchanged. | Console capture shows HTTP 403 and `REVIEW_FORBIDDEN`; screenshot file not stored in the repository | Tristan |
| MAN-20260916-04 / 16 September 2026 | Local webpage and Supabase development project; working branch at `039bed8`; exact served build/time not captured | S1-T20 / KAN-33-AC3 and S1-T23 / KAN-36-AC3; unassigned coordinator case | Sign in as a coordinator; open a separate submitted request with no assigned coordinator; directly POST an approval from the browser console | Passed: the page withheld the request and decision controls. The POST returned `404 EVENT_REQUEST_NOT_FOUND`; the request remained `SUBMITTED` with no review created. | Console capture shows HTTP 404 and `EVENT_REQUEST_NOT_FOUND`; screenshot file not stored in the repository | Tristan |
| MAN-20260916-05 / 16 September 2026 | Local webpage and Supabase development project; working branch at `18e8dea`; exact served build/time not captured | S1-T23 / KAN-36-AC3; assigned draft case | Sign in as the assigned coordinator; open a separate draft with no recorded review; directly POST an approval from the browser console | Passed: the page withheld the draft details and decision controls. The POST returned `409 REQUEST_NOT_REVIEWABLE`; the request remained `DRAFT` with no review created. | Console capture shows HTTP 409 and `REQUEST_NOT_REVIEWABLE`; screenshot file not stored in the repository | Tristan |
| AUTO-20260917-01 / 17 September 2026 | KAN-16 list API change, parent `ad55358`; local Node 24; implementation and results recorded together in this commit | KAN-16-AC1/AC3 backend list boundary; existing feature regression suites | `npm run check` | Passed: 356 unit/component tests (61 frontend and 295 backend), type checks and builds. New cases cover scope validation, trusted actor selection, forbidden roles and response shape. | Local run; no CI run recorded for this commit | Automated local run |
| AUTO-20260917-02 / 17 September 2026 | Same KAN-16 change; isolated local PostgreSQL 17 with locally signed authentication fixtures | KAN-16-AC1/AC2/AC3 backend portions of S1-T25–S1-T27; existing integration regressions | `npm run test:integration` | Passed: 64 integration tests. All six owned statuses, other-owner exclusion, newest-first ordering, draft-list compatibility, empty lists, role restrictions and list refresh after approval/rejection passed. | [Authenticated event tests](../../database/tests/events/authenticated-review.integration.test.ts); local run | Automated local run |
| AUTO-20260917-03 / 17 September 2026 | KAN-16 organiser list UI change, parent `96188b5`; local Node 24; implementation and results recorded together in this commit | KAN-16-AC1/AC2 list display and refresh; access/error recovery | `npm run test:coverage -w @connectsphere/frontend`; `npm run typecheck`; `npm run build` | Passed: 73 frontend tests, including 12 organiser-list cases; workspace type checks and builds passed. Coverage includes the events feature. | [List component tests](../../frontend/src/features/events/pages/EventRequestsPage.test.ts); local coverage output | Automated local run |
| AUTO-20260917-04 / 17 September 2026 | Same UI change; local Playwright Chromium | KAN-16 list UI and existing browser regressions | `npm run test:e2e` | Passed: 13 checks. Organiser cases cover all status labels, refreshed status, retry/empty state, 390px layout and returning to the login form after session expiry. | [Organiser browser tests](../../tests/e2e/event-requests.spec.ts); generated screenshots visually checked locally | Automated local run |
| AUTO-20260917-05 / 17 September 2026 | KAN-16 organiser detail UI change, parent `2261a8b`; local Node 24; implementation and results recorded together in this commit | KAN-16-AC1/AC2/AC3 detail display, refresh and access-error recovery | `npm run test:coverage -w @connectsphere/frontend`; `npm run typecheck`; `npm run build` | Passed: 91 frontend tests, including 18 detail cases; workspace type checks and builds passed. Cases cover both outcomes, plain-text reasons, missing values, read-only controls, expiry and stale request/account responses. | [Detail component tests](../../frontend/src/features/events/pages/EventRequestDetailPage.test.ts); local coverage output | Automated local run |
| AUTO-20260917-06 / 17 September 2026 | Same detail UI change; local Playwright Chromium | KAN-16 list-to-detail navigation, outcomes and existing browser regressions | `npm run test:e2e` | Passed: 17 checks. Four new scenarios cover approval/rejection through list-detail-reload navigation, mobile multiline reasons and denied access. | [Detail browser tests](../../tests/e2e/event-request-detail.spec.ts); generated desktop/mobile screenshots visually checked locally | Automated local run |
| MAN-20260917-01 / 17 September 2026 | Local webpage and Supabase development project; working branch at `95cd43e`; exact served build/time not captured | KAN-16-AC1/AC2; approval/rejection portions of S1-T25/S1-T26 | As the owning organiser, refresh an approved request; open a rejected request from Event requests, check its status/reason and refresh | Passed: approved outcome remained after refresh; rejected status and reason were visible and remained after refresh. The approval capture shows the recorded decision time and `No reason provided.` | Written observations below; approval screen capture reviewed, image file not retained in the repository; rejection capture not recorded | Tristan |
| MAN-20260917-02 / 17 September 2026 | Local webpage and Supabase development project; working branch at `fdcf29b`; exact served build/time not captured | KAN-16-AC3 signed-out detail case; KAN-25-AC4 / S1-T04 sign-out UI portion | Copy the request URL, sign out and reopen that URL | Passed: the page showed a sign-in prompt without request details or the review reason. | Written observation below; no screenshot or HTTP response captured | Tristan |
| MAN-20260917-03 / 17 September 2026 | Local webpage and Supabase development project; working branch at `e6896f3`; exact served build/time not captured | KAN-16-AC1 / S1-T25 draft and submitted detail display | As the organiser, open the existing draft and submitted test requests | Passed: the draft showed `Draft` and explained that it had not been submitted; the submitted request showed `Submitted` and no recorded approval/rejection. | Two detail-page captures reviewed; image files not retained in the repository; scope below | Tristan |

For manual cases, record preconditions, input values, expected and actual outcomes. For automated runs, link the test files and retain results that show the relevant cases. Track failed cases through their fixes and reruns.

## 15 September: hosted approval check

- **Preconditions:** a mapped coordinator account and a synthetic request in `SUBMITTED`, assigned using `event_requests.coordinator_id = app_users.id`. Read-only setup checks found a valid organiser, assigned coordinator and login mapping, with no existing decision.
- **Action:** Tristan signed in and approved the request through the webpage, then inspected the corresponding request in Supabase.
- **Expected and observed:** the request status changed from `SUBMITTED` to `APPROVED` in Supabase.
- **Limit:** this records the approval/status path only. The review row and reviewer identity, reason persistence, browser reload, removal from the queue, rejection, unauthorised attempts and organiser-facing outcome have not been demonstrated by this manual check. It does not complete S1-T21 or close KAN-36.
- **Follow-up:** Approval persistence, rejection, organiser write denial, unassigned-coordinator denial and draft refusal were checked on 16 September below. Remaining hosted checks and the organiser outcome workflow are listed below.

## 16 September: approval persistence and queue checks

- **Tested by:** Tristan, using the previously approved synthetic request and its assigned coordinator account.
- **Reload:** The webpage retained `APPROVED`, displayed the reason as expected if supplied, and offered no further approval/rejection controls. No specific reason text was recorded for this check.
- **Stored review:** The `event_reviews` row matched the request's `event_request_id`, recorded `APPROVED`, and had `reviewed_by` matching the coordinator's `app_users.id`.
- **Queue:** The approved request no longer appeared in the review queue.
- **Result:** S1-T21 passed across the approval and follow-up checks. The subsequent rejection check is recorded below; access checks and the organiser outcome acceptance shared with KAN-16 remain outstanding.

## 16 September: rejection persistence and queue checks

- **Tested by:** Tristan, using a separate submitted synthetic request assigned to the coordinator.
- **Action:** Selected Reject request, entered a reason and recorded the rejection through the webpage.
- **Stored result:** The request status and matching review decision were `REJECTED`. The supplied reason and coordinator's application ID were recorded correctly.
- **Reload and queue:** Rejection and its reason remained visible after refreshing, decision controls were absent, and the rejected request no longer appeared in the pending queue.
- **Result:** S1-T22 passed. Both approval and rejection now have manual persistence and reload evidence. The exact reason text and screenshot were not captured in this record.
- **Follow-up:** The organiser write-denial, unassigned-coordinator and assigned-draft cases passed below. Continue KAN-16 implementation and organiser outcome acceptance; remaining hosted checks are listed below.

## 16 September: organiser cannot record a decision

- **Tested by:** Tristan, signed in as the organiser who owns the previously rejected request. The console script checked `/api/auth/me` for `EVENT_ORGANISER` before sending the write.
- **Read access:** The organiser could read their request's outcome through the shared detail page, with no approval/rejection controls.
- **Direct write:** A POST to `/api/events/:id/reviews` with `{"decision":"APPROVED"}` returned HTTP `403` and error code `REVIEW_FORBIDDEN`, as shown in the console capture.
- **Stored result:** The original rejection and review row remained unchanged.
- **Result:** The organiser role case in S1-T23 passed. This verifies server enforcement beyond hiding the buttons. It does not demonstrate coordinator assignment denial, signed-out access or draft-state refusal in the hosted environment; isolated tests cover those cases separately.
- **Follow-up:** The unassigned-coordinator check passed below. KAN-16 still needs its organiser list/status interface and the list API extension beyond drafts.

## 16 September: coordinator cannot review an unassigned request

- **Tested by:** Tristan, using a separate synthetic request in `SUBMITTED` with `coordinator_id = NULL` and no recorded review. The console script checked `/api/auth/me` for `EVENT_COORDINATOR` before sending the write.
- **Read access:** Opening `/reviews/:id` showed the unavailable/no-permission message without request details or decision controls.
- **Direct write:** A POST to `/api/events/:id/reviews` with `{"decision":"APPROVED"}` returned HTTP `404` and error code `EVENT_REQUEST_NOT_FOUND`, as shown in the console capture.
- **Stored result:** The request remained `SUBMITTED` and unassigned, with no review created.
- **Result:** The unassigned-request cases in S1-T20 and S1-T23 passed. Coordinator role alone did not grant read or decision access. The 404 deliberately uses the same response as a missing request.
- **Scope:** This checks an unassigned request, not one assigned to another coordinator. Hosted checks for a different coordinator and signed-out access remain unrecorded; isolated tests cover those cases separately. The assigned-draft refusal check passed below. KAN-16 organiser list/status implementation and acceptance remain outstanding.

## 16 September: assigned coordinator cannot decide a draft

- **Tested by:** Tristan, using a separate synthetic request in `DRAFT`, assigned through `coordinator_id` to the signed-in coordinator's `app_users.id`, with no recorded review. The console script checked `/api/auth/me` for `EVENT_COORDINATOR` before sending the write.
- **Read access:** Opening `/reviews/:id` withheld draft details and decision controls.
- **Direct write:** A POST to `/api/events/:id/reviews` with `{"decision":"APPROVED"}` returned HTTP `409` and error code `REQUEST_NOT_REVIEWABLE`, as shown in the console capture.
- **Stored result:** The request remained `DRAFT`, with no review created.
- **Result:** The assigned-draft case in S1-T23 passed. Assignment was valid, so this exercised the draft-state restriction separately from the unassigned-request denial.
- **Scope and next work:** Approval, rejection, organiser denial, unassigned-coordinator denial and assigned-draft refusal now have manual evidence. Other negative cases remain covered by isolated automation; this run does not establish hosted checks for every role, assignment or state. Continue KAN-16's organiser list API and status/outcome interface before completing the organiser workflow acceptance.

## 17 September: organiser list API across statuses

- **Change:** `GET /api/events?scope=all` returns only the authenticated organiser's requests across all stored statuses, ordered by latest update. Omitting scope or using `scope=drafts` preserves draft-only results; the coordinator queue still requires scope to be omitted.
- **Validation:** The targeted list service/router run passed 57 tests before the complete check above. The PostgreSQL suite exercised the same runtime authentication and routing used by the server with local account/token fixtures, including reading the updated organiser list after real approval and rejection transactions.
- **Boundary:** No schema migration or frontend change was needed. KAN-16's organiser list/detail interface and hosted browser acceptance remain unfinished. Playwright was not rerun for this backend-only step; its previous results remain dated separately above.

## 17 September: organiser request list interface

- **Change:** `/events` displays owned request names, readable status labels and Singapore-time updates through `scope=all`. Refresh obtains current values. Loading, empty results, retryable failures and access errors are distinct states.
- **Session handling:** Signout/account changes clear earlier results and cancel pending reads. On 401, cached identity is cleared so the sign-in link reaches a usable login form. Component and browser checks cover this recovery.
- **Validation fixes:** Type checking identified an unchecked test-fixture array lookup; its guaranteed index is now explicit. The expiry browser test initially classified the optional font stylesheet as an unexpected authentication request; an empty stylesheet fixture fixed that test setup. Type checks, builds and the complete browser rerun passed after these fixes.
- **Visual check:** Desktop and 390px screenshots were inspected. Long unbroken request names and the clarification label fit without horizontal overflow. Screenshots are generated in ignored `test-results/`, not retained submission evidence.
- **Boundary:** Organiser browser scenarios use API response fixtures. They do not demonstrate hosted sign-in, ownership or persisted review outcomes. The existing server startup check still exercises unauthenticated API denial. No backend/schema changes were made; the 64 PostgreSQL tests from the API commit were not rerun. Detail links, review reasons and hosted organiser acceptance remain next.

## 17 September: organiser request details and review outcome

- **Change:** Request titles in `/events` link to the read-only `/events/:id` page. It uses the existing shared detail API for event fields, current status, saved approval/rejection, reason and recorded time. List and detail share status labels and Singapore-time formatting.
- **Missing information:** Drafts and pending requests have explicit review messages. Missing reasons display `No reason provided.`; a final status with no review displays `Review details are unavailable.`. The page does not infer a decision record from the status or add editing/decision controls.
- **Access and refresh:** Refresh removes earlier details while rechecking the API. Route/account changes and signout cancel old reads; late responses cannot restore previous data. Expired sessions offer sign-in, and missing/forbidden requests share a generic message without private fields.
- **Validation:** AUTO-20260917-05/06 passed. Desktop and 390px screenshots were inspected; long titles wrap and multiline HTML-looking reasons remain plain text. Screenshots are generated in ignored `test-results/`, not retained submission evidence.
- **Boundary:** Organiser browser tests use intercepted API responses, so hosted organiser login, ownership and list/detail persistence still need acceptance checks. No backend/schema changes were needed, and the previously recorded PostgreSQL suite was not rerun for this frontend step. S1-T25/S1-T26 remain partial until the integrated workflow is verified.

## 17 September: organiser outcome and refresh checks

- **Tested by:** Tristan, signed in as the owning organiser, using the existing approved and rejected synthetic requests in the Supabase development project.
- **Approval:** The organiser detail page for `Test Event Request 1` displayed `Approved` for both status and review outcome, `No reason provided.`, and the recorded decision time. Refresh retained the approved outcome.
- **Rejection:** Opening a rejected request from Event requests displayed its rejected status and rejection reason. Both remained visible after refresh. The exact request name and reason text were not captured in this record.
- **Result:** The approved/rejected outcome and refresh portions of S1-T25/S1-T26 passed with a real organiser account. These observations are separate from the earlier API-response-fixture tests.
- **Remaining checks:** Other workflow states, a newly submitted request's status, another organiser's list/detail access and signed-out access have not been verified by this manual run. S1-T25/S1-T26 remain partial; S1-T27 retains its isolated automated result. This run does not mark KAN-16 or the full release feature Done.
- **Evidence:** The approval screen capture was reviewed, but no screenshot file is stored in the repository. Refresh and rejection results are recorded as manual observations; no new database-row comparison or automated run was performed for this documentation update.

## 17 September: signed-out request detail access

- **Tested by:** Tristan, using the local webpage and Supabase development project after viewing an owned request as the organiser.
- **Action:** Copied the request URL, signed out, and opened the copied URL again.
- **Expected and observed:** The page showed a sign-in prompt. Request details and the review reason were not displayed.
- **Result:** The signed-out detail-page check passed. This adds manual evidence for KAN-16-AC3 and the sign-out UI portion of KAN-25-AC4; it does not verify reuse of a previously issued token or complete S1-T04.
- **Boundary:** No HTTP status, direct API response, token replay, session-expiry behaviour or signed-out list read was captured. Another organiser's list/detail access and the remaining status/submission checks still need manual verification. No application code changed and no automated tests were rerun for this documentation update.

## 17 September: draft and submitted request details

- **Tested by:** Tristan, signed in as Test Event Organiser, viewing existing synthetic requests in the Supabase development project.
- **Draft:** `Test Event Request 4` showed status `Draft` and the message `This request is still a draft and has not been submitted for review.`
- **Submitted:** `Test Event Request 3` showed status `Submitted` and the message `No approval or rejection has been recorded yet.`
- **Result:** Both detail pages displayed the expected status and review message without a recorded decision. This adds manual evidence for the draft/submitted detail portions of KAN-16-AC1 / S1-T25.
- **Boundary:** The captures show detail pages only; list labels and refresh persistence have not yet been recorded for these two requests. Reading an existing submitted request does not verify a new submission-to-status transition. Other workflow states, unrelated-organiser reads and signed-out list access remain outside this check. No application code changed and no automated tests were rerun.

## Executable evidence map

| Scope | Test files | Recorded run and boundary |
| --- | --- | --- |
| Review input, eligibility and HTTP responses | [review-input.test.ts](../../backend/test/events/review-input.test.ts), [review-eligibility.test.ts](../../backend/test/events/review-eligibility.test.ts), [review-router.test.ts](../../backend/test/events/review-router.test.ts) | AUTO-20260915-01; unit/HTTP tests |
| Atomic review persistence and conflicts | [review-decision.integration.test.ts](../../database/tests/events/review-decision.integration.test.ts) | AUTO-20260915-02; isolated PostgreSQL, including rollback and competing decisions |
| Authenticated assigned-coordinator workflow | [authenticated-review.integration.test.ts](../../database/tests/events/authenticated-review.integration.test.ts) | AUTO-20260915-02; real HTTP/cookies and PostgreSQL with local token fixtures, including invalid authentication, assignment changes, denied access and both decisions |
| Shared role-aware request detail | [event-request-detail.integration.test.ts](../../database/tests/events/event-request-detail.integration.test.ts) | AUTO-20260915-02; owner/coordinator visibility, status/outcome and caller-specific actions |
| Organiser list across statuses | [submitted-requests.test.ts](../../backend/test/events/submitted-requests.test.ts), [submitted-requests-router.test.ts](../../backend/test/events/submitted-requests-router.test.ts), [authenticated-review.integration.test.ts](../../database/tests/events/authenticated-review.integration.test.ts) | AUTO-20260917-01/02; ownership filtering, scope validation, default draft/coordinator behaviour and current persisted status |
| Organiser request list interface | [EventRequestsPage.test.ts](../../frontend/src/features/events/pages/EventRequestsPage.test.ts), [event-requests.spec.ts](../../tests/e2e/event-requests.spec.ts) | AUTO-20260917-03/04; HTTP response fixtures for status labels, refresh, account changes, expiry recovery and mobile layout |
| Organiser detail and saved outcome | [EventRequestDetailPage.test.ts](../../frontend/src/features/events/pages/EventRequestDetailPage.test.ts), [event-request-detail.spec.ts](../../tests/e2e/event-request-detail.spec.ts) | AUTO-20260917-05/06; response fixtures for saved decisions/reasons, read-only details, navigation, refresh, access/session errors and stale-response protection |
| Coordinator decision interface | [ReviewRequestPage.test.ts](../../frontend/src/features/reviews/pages/ReviewRequestPage.test.ts), [ReviewDecisionPanel.test.ts](../../frontend/src/features/reviews/components/ReviewDecisionPanel.test.ts), [review-decision.spec.ts](../../tests/e2e/review-decision.spec.ts) | AUTO-20260915-01 and AUTO-20260915-03; response fixtures, including failed refresh and repeat-decision prevention |

## Coverage and gaps

| Measurement date / commit | Coverage scope and metric | Measured result | Uncovered behaviour and reason | Follow-up / owner |
| --- | --- | --- | --- | --- |
| 15 September 2026 / `c14eaf4` | Requirements/acceptance coverage | Partial Sprint 1 coverage linked above; no release-wide percentage asserted | KAN-16 organiser list/detail UI and all-status list API remain unfinished. Broader hosted acceptance and later-release features remain outstanding. | Tristan for KAN-16 and review acceptance; respective story owners for remaining features |
| 17 September 2026 / KAN-16 list API change | KAN-16 backend list and regression coverage | AUTO-20260917-01/02 passed; all-status list API now implemented | Organiser list/detail UI and hosted browser acceptance remain unfinished. Backend results do not complete S1-T25/S1-T26 or the story. | Tristan |
| 17 September 2026 / KAN-16 list UI change | Configured frontend coverage subset; not release-wide requirements coverage | 94.93% statements; 91.04% branches; 100% functions; 96.56% lines | Includes events, reviews, system and API client patterns; authentication, shell and all backend code are outside these configured metrics. Remaining gaps include the creation placeholder and fallback error branches. Organiser detail and hosted acceptance remain unfinished. | Tristan for organiser detail; respective owners for other gaps |
| 17 September 2026 / KAN-16 detail UI change | Configured frontend coverage subset; not release-wide requirements coverage | 95.07% statements; 90.56% branches; 100% functions; 97.09% lines | Includes events, reviews, system and API client patterns; authentication, shell and backend code remain outside these metrics. Creation and fallback branches remain gaps. Organiser list/detail is implemented; hosted workflow acceptance is pending. | Tristan for hosted organiser acceptance; respective owners for other gaps |
| 17 September 2026 / `95cd43e` manual follow-up | KAN-16 organiser outcome and refresh portions of S1-T25/S1-T26 | MAN-20260917-01 passed for approved/rejected detail and refresh; rejection reason retained | Other workflow states, submission-to-status and unrelated-organiser/signed-out access remain unrecorded manually. No new automated coverage measurement. | Tristan |
| 17 September 2026 / `fdcf29b` manual follow-up | KAN-16 signed-out detail visibility; KAN-25 sign-out UI | MAN-20260917-02 passed: sign-in prompt shown and request/review information hidden | Signed-out list and unrelated-organiser reads remain unrecorded manually; previous-token reuse was not tested. Other status/submission checks remain pending. | Tristan |
| 17 September 2026 / `e6896f3` manual follow-up | KAN-16 draft/submitted detail portions of S1-T25 | MAN-20260917-03 passed: both statuses and review messages shown correctly | List/refresh checks for these requests, other workflow states, submission-to-status and remaining access checks are not established by the captures. | Tristan |
| To record at reviewed release | Statement/branch/function and acceptance-scenario metrics | Measured coverage report and agreed metric definitions to attach | Passing test counts are not a coverage percentage; explain exclusions against the release requirements. | Team to assign |

Include normal, boundary, permission, conflict and failure scenarios where relevant. Explain any coverage shortfall against the course rubric, and distinguish scaffold checks from tests of completed business features.
