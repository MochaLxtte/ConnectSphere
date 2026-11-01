# Test execution evidence

Record each relevant run with its commit, scope and result. Store concise report exports alongside this document and link the corresponding tests from the [traceability matrix](../requirements/traceability.csv). The [Sprint 1 acceptance test plan](../scrum/sprint-01/sprint-backlog.md#acceptance-test-plan) provides the initial scenario and acceptance-criterion IDs.

**Register format — 21 October 2026.** Reusable setup, steps, inputs and expected outcomes now live in
[test specifications](test-cases.csv). Append case-level actual results to
[test-executions.csv](test-executions.csv), retaining this document for run details, suite totals,
coverage, failures and retests. The [unchanged original register](archive/test-cases-2026-10-21.csv)
preserves the combined format and all its wording. This reorganisation is not a new product test run.

The 427 retained IDs comprise 407 detailed scenarios and 20 historical feature summaries
(`TC-01`–`TC-20`). The execution register imports the 30 explicitly recorded automated case passes
and five individual audit failures; 372 detailed cases remain **Not executed** placeholders.
The five failed feature summaries refer to those same five failures and are not extra executions.
Earlier partial manual checks and suite results remain in their original narratives below; newly
specified cases do not inherit passes from those records. Optional case authors, creation dates and
executors remain **Not recorded** where the original sources did not identify them.

Imported execution IDs ending `-R01` identify migrated case records, not the first attempt in the
original run. IDs ending `-P01` identify planning placeholders, with no run/date/build/environment or
observed result. Append a new uniquely identified row for each later attempt, and keep the original
placeholder/history. The 19 October narratives retain their initial failures and successful reruns;
the available source does not support fabricating additional case-specific attempt records.

## 15 October 2026 post-sprint implementation audit

**AUTO-20261015-01 — Recorded 15 October 2026.** The audit tested application source at `3bd64f8` on `docs/sprint-3-readiness-sync`, with documentation changes already in the working tree. It changed no application source. The date is after Sprint 2's 3 October boundary; these results do not establish earlier completion, review acceptance or velocity. The [pre-planning baseline and defect triage](../scrum/sprint-03/planning.md#pre-planning-baseline-and-defect-triage) separates existing defects, unfinished acceptance and new customer changes.

**Environment:** Windows, Node 24.21.0, npm 11.19.0, Vitest 4.1.11 and Playwright Chromium. Database checks used an isolated disposable PostgreSQL 17 container on localhost, with migrations and seed applied first. Tests used synthetic data and authentication fixtures; no shared Supabase login, data write or hosted acceptance run was performed. The container was removed and Docker Desktop stopped afterwards. The [retained summary](coverage-reports/2026-10-15-post-sprint-audit.txt) records commands, totals and measured coverage; original local command logs were inspected when preparing this entry.

| Command | Actual result |
| --- | --- |
| `npm.cmd run check` | Passed: type checks, 500 frontend tests in 29 files, 856 backend tests in 36 files, and both builds. |
| `npm.cmd run test:coverage` | Passed with the same 1,356 unit/component tests. Frontend: 94.18% statements, 91.09% branches, 96.42% functions, 96.50% lines. Backend: 79.65% statements, 83.98% branches, 76.00% functions, 80.64% lines. |
| `npm.cmd run db:migrate` and `npm.cmd run db:seed` | Passed against the disposable local database. No shared migration run. |
| `npm.cmd run test:integration` | Passed: 304 tests in 20 files. |
| `npm.cmd run test:e2e -- --workers=4` | Passed: 95 Chromium tests. Authenticated browser business flows predominantly use intercepted responses; these results do not replace real-account acceptance. |

Coverage above is the configured unit/component scope, not combined integration coverage or a percentage of satisfied requirements. Frontend authentication/router/shell files are excluded from the configured metric, and no coverage threshold or mutation-testing gate is configured. Existing passes did not detect the defects below.

### Confirmed defects and remaining regression work

The 15 October audit separately exercised the actual venue component and rule functions, the detail-page submission handler, and an HTTP draft update against the isolated database. Three scratch venue tests asserted the faulty behaviour and passed as **reproductions**; that is a failed product expectation, not feature acceptance. Scratch reproduction source was inspected again while recording this entry. Separate reproduction console logs were **Not recorded** in the repository; the table preserves the observed output reported during the audit and identifies the code to cover with permanent regression tests. No fixed-code retest has run.

| Case / story | Expected behaviour | Observed behaviour on 15 October | Source and regression follow-up |
| --- | --- | --- | --- |
| TC-08-01 / KAN-50 | A delayed save for venue A must not replace venue B after navigation; a subsequent edit on B must target B. | **Fail:** save A, navigate to B, resolve A's save; the page shows A while the URL remains B. The next save targets `/api/venues/catalogue/venue-a`. | [VenueCatalogueEditPage.vue](../../frontend/src/features/venues/pages/VenueCatalogueEditPage.vue); extend [page tests](../../frontend/src/features/venues/pages/VenueCatalogueEditPage.test.ts) with delayed-write navigation and session-change cases. |
| TC-02-01 / KAN-6, KAN-59 | Submitting an owned draft from its detail page must show the field-specific invalid-period message so it can be corrected. | **Fail:** `SubmissionInvalidError` falls through to “We could not confirm that the request was submitted. Refresh it before trying again.” The API's invalid-field information is hidden. | [EventRequestDetailPage.vue](../../frontend/src/features/events/pages/EventRequestDetailPage.vue), [submission API errors](../../frontend/src/features/events/api/event-requests.ts); extend [detail-page tests](../../frontend/src/features/events/pages/EventRequestDetailPage.test.ts). |
| TC-03-01 / KAN-34 | An impossible calendar date supplied to a draft update must be rejected as invalid input, with the draft unchanged. | **Fail:** `startsAt: "2026-02-30T09:00:00Z"` passes the input parser; real `PATCH /api/events/:id` returns `500 INTERNAL_ERROR` when PostgreSQL rejects it. The draft remains unchanged. | [draft-update-input.ts](../../backend/src/modules/events/draft-update-input.ts); add strict calendar-date cases to [input tests](../../backend/test/events/draft-update-input.test.ts) and [database update tests](../../database/tests/events/update-draft.integration.test.ts). |
| TC-10-01 / KAN-12 | Search must reject an impossible date rather than silently query a different period. | **Fail:** `2026-02-30T10:00:00+08:00` is accepted and normalized to `2026-03-02T02:00:00.000Z`. | [venue-search.ts](../../backend/src/modules/venues/venue-search.ts); extend [search tests](../../backend/test/venues/venue-search.test.ts) and input/API regression coverage. |
| TC-11-01 / KAN-52 | A permitted attendance value of 0 must be handled consistently with submission and the recorded 9 October Product Owner decision; all otherwise satisfied checks should remain assessable. | **Fail:** attendance 0 produces capacity `UNKNOWN` and overall `NEEDS_REVIEW`, despite explicit requirements confirmation and no other failure. | [suitability-rules.ts](../../backend/src/modules/venues/suitability-rules.ts); reconcile the positive-only test expectation in [rule tests](../../backend/test/venues/suitability-rules.test.ts) with the [recorded decision](../requirements/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04). |

These are existing-behaviour defects to triage before dependent Sprint 3 work. This audit records neither Jira reopening nor a remaining-work estimate; the team must confirm those decisions. Earlier Sprint 1 acceptance and dated Sprint 2 evidence remain unchanged.

**Separate future requirement — KAN-60:** `parseReviewInput({ decision: 'REJECTED' })` still returns `reason: null`, and the review panel permits an omitted reason. This known future-backlog gap is not a newly discovered Sprint 2 regression. TC-04-01 specifies the eventual API refusal and unchanged persisted state, but its full HTTP/database enforcement scenario is **Not executed** because the requirement has not been implemented. Existing [review-input tests](../../backend/test/events/review-input.test.ts) describe today's optional-reason behaviour; they do not demonstrate mandatory-reason enforcement.

**Acceptance still separate:** preserve the previously recorded shared-development checks below. Missing hosted suitability assessment, full draft registration/refresh paths, calendar-role coverage and review decisions are not supplied by this local audit. Outstanding evidence remains identified in the [Sprint 2 acceptance plan](../scrum/sprint-02/sprint-backlog.md#acceptance-test-plan).

## 11 October: reconciliation of existing evidence

**Record updated 11 October 2026.** This is a documentation reconciliation, not a new test run or a reconstructed Sprint 2 review. The original dated entries below are retained. Where an earlier “remaining” paragraph contradicts an executed run in the same section, use the run's recorded environment and scope and the clarification here.

| Area | Evidence already recorded | Current interpretation and remaining limits |
| --- | --- | --- |
| KAN-59 / S2-T22 | AUTO-20261009-KAN59-01 and MAN-20261009-KAN59-01 | The 12 new PostgreSQL cases passed. Irfan's signed-in shared-development check covered missing fields, direct-API invalid data, unchanged Draft state and correction/resubmission of that same draft. It was not an exhaustive execution of every S2-T22 role/state/conditional case. The attendance-0 question was resolved by the Product Owner on 9 October in the [decision log](../requirements/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04): 0 remains accepted; no minimum was specified by the customer documents. |
| KAN-50 / S2-T03–T04 | AUTO-20261009-KAN50-01, MAN-20261009-KAN50-01 and MAN-20261009-KAN50-02 | PostgreSQL integration and 17 catalogue browser cases passed. A real mapped Venue Staff test account was used for catalogue edits and restoration; organiser refusal and changed-data propagation to coordinator search/suitability context were also checked. The old “no Venue Staff account” and “walkthrough not executed” statements are superseded for these recorded paths. A suitability assessment itself and every non-maintainer role were not demonstrated by these manual runs. |
| KAN-12 / S2-T07–T08 | AUTO-20261009-KAN12-01 and MAN-20261009-KAN12-01 | Page, browser and PostgreSQL checks passed; real shared-development catalogue filters, availability exclusion, invalid periods, clearing and organiser refusal were inspected. Stale-response and failed-filter-list paths were covered by automated page tests, not the manual run. |
| KAN-54 / S2-T15–T16 | AUTO-20261009-KAN54-01 and MAN-20261009-KAN54-01 | Three new PostgreSQL cases passed. The shared-development run covered submission/approval clashes, another venue, adjacency, a block and refreshed search results. Concurrent/stale submissions were not manually exercised by this run; retain the dedicated automated evidence and recorded policy limits. |
| Connected workflow / S2-T23 | AUTO-20261009-S2T23-01 and MAN-20261009-S2T23-01 | An interactive run with organiser, coordinator and Venue Staff sign-ins exists; the older blanket claim that browser UI and real login were not exercised applies only to the automated stand-in. The manual run did not execute the suitability assessment or verify every cross-role refresh. S2-T23 therefore remains partial. |
| Calendar / S2-T05–T06 | MAN-20261006-KAN51-01, supplemented by MAN-20261009-S2T23-01 | The 6 October interactive run used an isolated PostgreSQL database and fixture JWTs, not Supabase email/password login. The 9 October run adds a shared-development booking/calendar path, not a complete five-role hosted calendar acceptance run. |

CI and peer-review evidence must be linked to the actual build before those checks are claimed; none is generated by this reconciliation. The [Sprint 2 review](../scrum/sprint-02/review.md) still needs the actual acceptance decision. Keep the leftover shared test data and cleanup notes in each original run; no shared data was changed here.

## 9 October: submission validation (KAN-59 / S1-DEF-04)

**AUTO-20261009-KAN59-01 — local automated verification, including PostgreSQL integration run later the same day.** Tested at `a8b2983` on `fix/KAN-59-submission-validation`, branched from `main` (`14ad0b2`), with Node 22.20.0 (the repository targets Node 24; `EBADENGINE` warnings only) on Windows. Verified locally before any push.

| Command / environment | Actual result |
| --- | --- |
| `npm run check` | Passed: tools/frontend/backend type checks, **376 frontend tests** in 24 files, **711 backend tests** in 32 files, and both production builds. |
| Defect reproduction: the old `submit-input.ts` from `14ad0b2` temporarily restored, then `npx vitest run test/events/submit-input.test.ts test/events/submit-request.test.ts` (backend) | **25 of the 58 tests failed**, reproducing the defect: whitespace-only mandatory text, an end not after the start and a reversed registration window were accepted. The fix was then restored exactly (`git status` clean for the file) and all 58 passed. |
| `npx vitest run test/events/submit-input.test.ts` (backend) | Passed: 37 tests (26 new): blank and whitespace-only name, purpose and venue requirements; end equal to, before and one millisecond after the start; offset versus UTC instants; unreadable dates; registration window ordering only while registration is required; every problem reported together; "None / Not Required" text accepted; attendance 0 still accepted. |
| `npx vitest run test/events/submit-request.test.ts` (backend) | Passed: 21 new tests with a fake connection: a valid draft commits once; registration times are read under the row lock; invalid drafts refuse without an `UPDATE`, roll back and release the connection; ownership is checked before completeness, so an unrelated organiser learns nothing; a failed rollback discards the connection. |
| `npx vitest run test/events/submitted-requests-router.test.ts` (backend) | Passed: 60 tests (2 new): `SUBMISSION_INVALID` with `fieldErrors`, and missing plus invalid together; the missing-only response keeps its original shape. |
| `npx vitest run src/features/events/api/event-requests.test.ts src/features/events/components/EventRequestForm.test.ts` (frontend) | Passed: 23 tests (4 new in the API client, 1 new in the form): typed error parsing, messages beside the inputs, focus on the first error, and fixing then resubmitting without creating a second draft. |
| Coverage of the changed files | Backend `submit-input.ts`: 100% of statements and branches. `submit-request.ts`: every added line covered; the file's remaining uncovered lines (60, 111, 120) are older defensive branches not touched here. Frontend: no uncovered statement or branch on any line added to `event-requests.ts` or `EventRequestForm.vue`. |
| `database/tests/events/submit-request.integration.test.ts` (12 new cases) | **Passed** with `npm run test:integration` (**267 tests in 18 files**) on a local PostgreSQL 17 test database (not the shared Supabase project). The cases cover real-schema behaviour: blank text of every whitespace kind, end equal to and before the start, reversed registration window only while required, a valid window, attendance 0, all problems in one error then correct and resubmit, and HTTP `SUBMISSION_INCOMPLETE` and `SUBMISSION_INVALID` with the draft unchanged. |
| Browser (`tests/e2e`) | `npx playwright test` (Chromium, local servers): **71 passed**, no new spec. The form's browser behaviour is covered by the component tests above. |

**MAN-20261009-KAN59-01 — interactive check against the shared development database.** Irfan signed in as the existing organiser test account in the in-app browser (the password was typed by Irfan) with the app running from `fix/KAN-59-submission-validation`; Claude drove the page and the signed-in session. Test data: one request named "KAN-59 manual test A".

| Step | Observed result |
| --- | --- |
| Fill only the name and click Submit for review (KAN-6-AC2, AC3) | Request stayed a DRAFT. Messages "Complete this before submitting." appeared beside Purpose, Starts, Ends, Expected attendance and Venue requirements; the banner said "Your draft is saved. Complete these details before submitting: Purpose, Starts, Ends, Expected attendance…"; focus moved to Purpose. |
| Fill all fields with an end before the start and submit | The form refused it before saving ("The end must be after the start."), as the form already did before this change. |
| Call the API directly from the signed-in session: save a whitespace-only purpose and an end before the start, then submit | HTTP 400 `SUBMISSION_INVALID` naming `purpose` as missing and `endsAt` as "The end must be after the start."; the request stayed a DRAFT. This is the server rule that did not exist before. |
| Open the saved draft, fix purpose and end, submit again | The same draft became SUBMITTED; no duplicate draft was created. |

**Side effect:** the submitted request was assigned automatically to a real coordinator and sits in their review queue; reject or ignore it. **Not covered:** the form hides server-only messages for most cases, so the `SUBMISSION_INVALID` field messages were verified through the API and the component tests rather than the page. Acceptance still belongs to the Product Owner.

**What this does not establish:** CI, a hosted walkthrough (S2-T22), peer review, or acceptance. The Jira KAN-6 and KAN-59 cards were not edited.

**Open question:** an expected attendance of 0 is still accepted at submission. See the [9 October decision](../requirements/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04).

**Remaining:** the first CI run of the integration cases (record its run ID here); the [hosted check](README.md#kan-59-hosted-verification); team confirmation of the validation rules; peer review. No Jira transition and no change to the **43-point** baseline is claimed; KAN-59 sits inside KAN-6's carried points.

## 9 October: booking conflict detection (KAN-54)

**AUTO-20261009-KAN54-01 — local automated verification, including PostgreSQL integration.** Tested at `0e373e5` on `feat/KAN-54-conflict-detection-verification`, branched from `main` (`14ad0b2`), Node 22.20.0 on Windows. KAN-54's logic already existed in `booking-service.ts`; this run adds the missing unit tests and two integration cases. No source change was needed.

| Command / environment | Actual result |
| --- | --- |
| `npm run check` | Passed: type checks, **371 frontend** and **683 backend tests** (21 new), both builds. |
| `npx vitest run backend/test/venues/booking-conflicts.test.ts` | Passed: 21 tests with a fake connection covering KAN-54-AC1–AC9 and repo-only AC10–AC11: the clash query is scoped to the one venue, counts only approved bookings and blocks, and uses half-open bounds; refusals insert or update nothing and roll back; clash data is read only after the venue lock; approval excludes its own row; rejection skips the check; settled bookings are not reassessed; database exclusion errors map to the same messages and unrelated ones pass through. |
| Mutation check | Temporarily changing the bounds to `<=`/`>=` and removing the own-row exclusion made 2 of the 21 tests fail; the file was restored (`git status` clean) and all 21 pass. |
| Coverage | The new file covers every conflict branch in `createVenueBooking` and `decideVenueBooking`. The remaining uncovered lines of `booking-service.ts` are the KAN-8 list and read paths, which other tests cover against PostgreSQL. |
| `npm run test:integration` against PostgreSQL 17.11 on this machine (local test database, not the shared Supabase project) | **Passed: 258 tests in 18 files**, including 3 new cases in `venue-bookings.integration.test.ts`. They cover an approved booking and a block at another venue (KAN-54-AC3, AC5) and a cancelled booking (KAN-54-AC1, AC4). |
| `npx playwright test` (Chromium, local servers) | **71 passed.** No new browser spec; conflict messages are covered by the booking panel and detail page tests. |

**MAN-20261009-KAN54-01 — interactive check against the shared development database.** Irfan signed in to the coordinator and Venue Staff test accounts (passwords typed by Irfan); Claude drove the page and the signed-in sessions. The shared database had no approved bookings or blocks, so the test created them at dates in January 2031 on the event "test 01" (already approved). Cleanup is listed at the end.

| Step | Observed result |
| --- | --- |
| Coordinator requests Orchid Seminar Room, 5 Jan 2031 10:00–12:00 (A), then an overlapping 11:00–13:00 (B) | Both saved as pending; pending requests do not reserve the venue (KAN-54-AC10). |
| Venue Staff approve A | Approved. |
| Venue Staff approve the overlapping B through the page (KAN-54-AC2, AC7, AC8) | Refused with "The venue already has an approved booking during this period. Review the current booking status before trying again."; B stayed pending; then rejected. |
| Coordinator requests the same venue for an exact overlap, a partial overlap and a period inside A (AC1, AC2, AC6) | All three refused with 409 `VENUE_BOOKING_CONFLICT`; nothing created. The coordinator's booking panel showed "The venue already has an approved booking during this period." (AC8). |
| Coordinator requests Harbour Hall for the same hours as A (AC3) | Accepted as pending. |
| Coordinator requests Orchid 12:00–14:00 and 08:00–10:00, directly after and before A (AC4) | Both accepted as pending; no buffer is required. |
| Venue Staff block Harbour Hall 6 Jan 2031 10:00–12:00; coordinator requests an overlapping period (AC5, AC7, AC8) | Refused with 409 `VENUE_UNAVAILABLE` ("The venue is blocked during this period."); a request directly after the block was accepted. |
| Coordinator search for the A period, the block period and a later period (AC6, AC9) | Orchid was absent during A, Harbour absent during the block, all venues present later; results followed the latest data. |

**Cleanup and what remains:** the four accepted pending requests were rejected and the block was removed. **One approved booking (A) remains**: Orchid Seminar Room, 5 Jan 2031 10:00–12:00 Singapore time, notes "KAN-54 manual test A (far-future)"; the app has no way to cancel it. Rejected rows remain for B and the four cleanup requests. Two pending bookings from other event requests were already in the queue and were not touched. Acceptance still belongs to the Product Owner.

**Limits:** hosted acceptance (S2-T15/T16) and CI are pending. Adjacency without a turnover buffer and pending requests not reserving a venue remain team assumptions until the customer confirms them.

## 9 October: venue search page tests (KAN-12)

**AUTO-20261009-KAN12-01 — local automated verification, including the browser spec and PostgreSQL integration.** Tested at `151a4c8` on `feat/KAN-12-search-page-tests`, branched from `main` (`14ad0b2`), Node 22.20.0 on Windows. KAN-12's page, query service and PostgreSQL tests were already merged; the page had no tests of its own. No source change was needed.

| Command / environment | Actual result |
| --- | --- |
| `npm run check` | Passed: type checks, **405 frontend** (34 new) and **662 backend tests**, both builds. |
| `npx vitest run src/features/venues/pages/VenueSearchPage.test.ts` (frontend) | Passed: 34 tests. Results and venue details (AC8, AC9, AC12); each of date/time, attendance, location, capacity, layout, accessibility and facilities reaching the query, alone and combined (AC1–AC7, AC10); changing and clearing filters, no-match versus empty catalogue (AC11); incomplete, reversed and equal periods refused before any request (AC14); earlier results hidden and stale responses ignored (AC15); filter-list failure, 401, 403 and retry (AC16); signed-out, session-loading and four other roles never request venue data (AC13). |
| Mutation check | Temporarily making an equal start and end acceptable and changing the opening-hours rule made 2 of the 34 tests fail; the file was restored (`git status` clean) and all 34 pass. |
| Coverage | `VenueSearchPage.vue`: 98.1% of statements, 94.9% of branches. The only uncovered line is the sign-in link inside the error panel, which cannot be reached because a cleared session shows the sign-in notice instead. `venues.ts`: 100% of statements, 93.8% of branches. |
| `tests/e2e/venue-search.spec.ts` (7 tests) | **Passed: 7 of 7** with `npx playwright test tests/e2e/venue-search.spec.ts` (Chromium, local servers). The first run had 1 failure from an ambiguous "Sign in" locator in the test (the page has two such links); it was scoped to the page content and the spec then passed. The full browser suite passed (78 tests) on a migrated local PostgreSQL 17. It covers the real server's 401 for both endpoints, narrowing, changing and clearing filters, a reversed period, signed-out and two other roles, and a 375 px screen with no sideways scrolling. |
| `database/tests/venues/venue-search.integration.test.ts` | Passed with the rest of `npm run test:integration` (**255 tests in 18 files**) on a local PostgreSQL 17 test database; unchanged. |

**MAN-20261009-KAN12-01 — interactive check against the shared development database (read-only).** Irfan signed in to the coordinator and organiser test accounts (passwords typed by Irfan); Claude drove the search page. Nothing was written. Catalogue: Harbour Hall (capacity 300), Orchid Seminar Room (40), Rooftop Terrace (120); the KAN-54 test booking at Orchid on 5 Jan 2031 10:00–12:00 existed.

| Step | Observed result |
| --- | --- |
| Open the page as the coordinator (KAN-12-AC8, AC12) | 3 venues, each named with capacity and details from the catalogue. |
| Minimum capacity 150 (AC4) | Harbour Hall only. |
| Expected attendance 100 (AC2) | Harbour Hall and Rooftop Terrace. |
| Location "Annex" (AC3) | Rooftop Terrace only. |
| Layout BOARDROOM (AC6) | Orchid Seminar Room only. |
| Wheelchair accessible (AC5) | Harbour Hall and Orchid Seminar Room. |
| Accessibility feature HEARING_LOOP alone, then HEARING_LOOP, STEP_FREE_ACCESS and ACCESSIBLE_TOILET together (AC5) | Harbour Hall only in both cases. |
| Facility STAGE (AC7) | Harbour Hall only. |
| Attendance 100 with layout THEATRE (AC9, AC10) | Harbour Hall only. |
| Event period overlapping the approved booking, directly after it, and a free day (AC1, AC10) | Orchid absent during the booking; all 3 venues directly after it and on the free day. |
| End before start; only a start entered (AC14) | "The end time must be after the start time." and "Enter both a start and an end time, or leave both empty."; the Search button was disabled for the first. |
| Capacity 5000 (AC11) | "0 venues found" and "No venue matches these filters". |
| Clear filters (AC11) | All fields emptied and all 3 venues returned. |
| As the organiser (AC13) | No Search Venues link; the page said "This page is for event coordinators." with no form; the search and filter-options calls returned HTTP 403. |

**Not covered by hand:** AC15 (stale responses) and AC16 (filter-list failure), which need a slow or failing network; the page tests cover them. Acceptance still belongs to the Product Owner.

**Limits:** results in the page tests and browser spec come from fixtures, so real filtering, availability exclusion and role enforcement rely on the existing backend and PostgreSQL tests. Hosted acceptance (S2-T07/T08) and CI are pending.

## 9 October: connected workflow test (S2-T23)

**AUTO-20261009-S2T23-01 — executed on a local PostgreSQL 17; passed after one fix.** Added at `8d7c587` on `test/S2-T23-connected-workflow`, branched from `main` (`14ad0b2`), Node 22.20.0 on Windows. This is an automated stand-in for part of the hosted S2-T23 walkthrough; it does not replace it.

| Command / environment | Actual result |
| --- | --- |
| `npm run check` | Passed: type checks (including the new file), 371 frontend and 662 backend tests, both builds. The new test is an integration test and is not part of this command. |
| `database/tests/workflow/sprint2-connected.integration.test.ts` (1 test) | **Passed** with `npm run test:integration` (**256 tests in 19 files**) on a local PostgreSQL 17 test database. The first run failed: submission returned `NO_AVAILABLE_COORDINATOR` (409) because the test's coordinator was not marked available. This was a test setup error, not a product defect; the test now sets `coordinator_available`. The full browser suite also passed (71 tests). |

**What it checks, through the real Express app with cookie sessions and database role mapping:** an organiser's complete draft is created and submitted (SUBMITTED, assigned to the only coordinator); organiser and venue staff are refused venue search; the coordinator finds the venue, approves the event and requests a booking, which is saved as pending without reserving the venue, changing the event or removing the venue from search; venue staff see it in their queue and approve it; the coordinator reads the same outcome; the event is unchanged; the availability calendar shows the period and search no longer offers the venue; a second request for the same period is refused with `VENUE_BOOKING_CONFLICT` and creates nothing.

**MAN-20261009-S2T23-01 — interactive walkthrough against the shared development database.** Irfan signed in to the organiser, coordinator and Venue Staff test accounts in turn (passwords typed by Irfan); Claude drove the pages and sessions. Event "S2-T23 manual walkthrough", 12 Jan 2031 10:00–12:00 Singapore time, expected attendance 60.

| Step | Observed result |
| --- | --- |
| Organiser fills the form and submits (KAN-6-AC1, KAN-29-AC1) | The request became SUBMITTED and was assigned automatically to `event_coordinator@connectsphere.com`, not approved. |
| Coordinator approves the event | Approved (HTTP 201). |
| Coordinator searches for 12 Jan 2031 10:00–12:00 for 60 people (KAN-12-AC8, AC9) | Harbour Hall and Rooftop Terrace; the 40-seat Orchid Seminar Room was excluded. |
| Coordinator opens the suitability data (KAN-52-AC1) | Loaded with attendance 60 and all three venues. The assessment itself was not run. |
| Coordinator requests Rooftop Terrace (KAN-53-AC5, AC8, AC9) | Saved as PENDING; the event stayed APPROVED; the calendar showed nothing booked. |
| Venue Staff approve the booking on the page (KAN-8-AC3, AC7) | "Venue booking approved."; stored APPROVED with the reason and decision time. |
| Calendar after approval (KAN-51-AC2) | Rooftop Terrace booked 12 Jan 2031 10:00–12:00. |
| Coordinator reads the outcome (KAN-8-AC9) | APPROVED with the staff reason; event still APPROVED; the calendar names the event. |
| Coordinator searches the same period again | Only Harbour Hall; Rooftop Terrace returned for the following two hours. |
| Second request for the same venue and period (KAN-54) | Refused, HTTP 409 `VENUE_BOOKING_CONFLICT`. |

**Data left in the shared database:** the event request "S2-T23 manual walkthrough" (APPROVED) and **one approved booking** at Rooftop Terrace on 12 Jan 2031 10:00–12:00; the app cannot cancel it. **Not covered:** running the suitability assessment, and a refresh-by-refresh check in the page rather than through the signed-in session. Acceptance still belongs to the Product Owner.

**Not covered:** suitability (KAN-52), the browser UI, refresh behaviour across roles and the real Supabase login. These need the hosted S2-T23 run, which is still pending along with CI.

## 9 October: venue catalogue maintenance (KAN-50)

**AUTO-20261009-KAN50-01 — local automated verification; integration and browser tests run later the same day.** Tested at `d193aaa` on `feat/KAN-50-maintain-venue-catalog`, branched from `main` (`14ad0b2`), with Node 22.20.0 (the repository targets Node 24; `EBADENGINE` warnings only) on Windows. Verified locally before any push.

| Command / environment | Actual result |
| --- | --- |
| `npm run check` | Passed: tools/frontend/backend type checks, **461 frontend tests** in 27 files, **786 backend tests** in 34 files, and both production builds. |
| `npx vitest run` on `venue-catalogue-input.test.ts`, `venue-catalogue-service.test.ts`, `venue-catalogue-router.test.ts` (backend), with coverage over `src/modules/venues/venue-catalogue-*.ts` | Passed: 124 tests (81 input, 25 service, 18 HTTP boundary). Coverage **100%**: statements 113/113, branches 80/80, functions 20/20, lines 95/95. |
| `npx vitest run` on `catalogue-form.test.ts`, `api/venue-catalogue.test.ts`, `VenueCataloguePage.test.ts`, `VenueCatalogueEditPage.test.ts` (frontend), with coverage over the four source files | Passed: 90 tests. Coverage: statements 98.99% (197/199), branches 98.68% (226/229), functions 100%, **lines 100% (166/166)**. |
| `database/tests/venues/venue-catalogue.integration.test.ts` (new) | **Passed** with `npm run test:integration` (**288 tests in 19 files**, 33 more than `main`) on a local PostgreSQL 17 test database (not the shared Supabase project). It covers KAN-50-AC1–AC21 against a real schema: active-only ordered listing, persistence and reload of every attribute, several layouts kept on the right venue, partial-update and null semantics, label normalisation, role refusal with the row unchanged, missing/inactive venue, invalid-input rejection (including a single hour change that would reverse the stored pair), concurrent edits to different and to the same field, propagation to venue search filters, search filter options and the suitability context, and existing bookings left unchanged. |
| `tests/e2e/venue-catalogue.spec.ts` (new) | **Passed: 17 of 17**; the full `npx playwright test` run passed **88 tests** (Chromium, local servers, local database migrated with `npm run db:migrate`). Covers real-server 401 for list and PATCH, sidebar link per role, direct-URL refusal for non-staff and signed-out users, view → edit → save → reload persistence, only-changed-fields payload, client validation, server rejection and the missing-venue message. |

**MAN-20261009-KAN50-01 — interactive check against the shared development database (Venue Staff).** Irfan signed in as the existing Venue Staff test account (password typed by Irfan) with the app running from `feat/KAN-50-maintain-venue-catalog`; Claude drove the page. Test venue: Rooftop Terrace; its original values were recorded first and restored afterwards.

| Step | Observed result |
| --- | --- |
| Open the catalogue | All 3 venues listed with location, capacity, layouts and facilities. |
| Open Rooftop Terrace | Form showed the saved values (location, capacity, facilities, accessibility, wheelchair, layouts, hours). |
| Capacity 0, then save | Refused: "Enter a whole number from 1 to 2147483647."; stored capacity stayed 120. |
| Opens 23:00, closes 22:00, then save | Refused: "Closing time must be after opening time."; stored hours stayed 10:00–22:00. |
| Change location, capacity (125), add a facility, an accessibility feature and a layout, tick wheelchair, opens 09:00; save | "Venue information saved."; reading the venue back showed every change, with name, description and closing time untouched. The catalogue list showed the new location, capacity, layouts and facilities; the other two venues were unchanged. |
| Restore every original value the same way | Reading back matched the originals exactly (only `updatedAt` differs). |
| Unauthenticated list and edit calls to the API | Both returned HTTP 401. |

**MAN-20261009-KAN50-02 — follow-up with the organiser and coordinator accounts (same session).** Irfan signed in to each account; Claude drove the page.

| Step | Observed result |
| --- | --- |
| As the organiser: sidebar, direct URLs and API (KAN-50-AC14) | No Venue catalogue link. Opening the list and edit URLs showed "The venue catalogue is for venue staff." with no form fields. The list, read and edit API calls (including an attempted capacity change to 1) returned HTTP 403, and the stored capacity stayed 120. |
| As Venue Staff: temporary edit of Rooftop Terrace (capacity 130, extra facility and layout) | Saved. |
| As the coordinator: search filter lists, capacity, facility and layout filters, the search page card (KAN-50-AC, search integration) | The filter lists offered the new facility and layout; the capacity filter 129 returned the venue at 130; the facility and layout filters returned only that venue; the card showed the new values. |
| As the coordinator: suitability context for the event "test 01" | Rooftop Terrace appeared with capacity 130 and the new facility and layout. |
| As Venue Staff: restore | Reading the venue back matched the original values exactly (only the last-updated time differs). |

**Result:** the Venue Staff-only rule and the propagation of catalogue edits to search and suitability were confirmed by hand. Acceptance still belongs to the Product Owner; hosted CI and peer review remain pending.

**Defect found by these tests and fixed before review:** Vue's `v-model` on a number input yields a number once the text parses, so the first version of the form crashed (`capacity.trim is not a function`) as soon as a capacity was typed. The helpers now accept a string or a number (commit `95534dc`), with unit and page tests for both forms.

**Coverage gap explained:** three statements and three branches in `VenueCatalogueEditPage.vue` (lines 32, 68 and 87) are TypeScript null-guards on `venue.value`. The form renders only after a venue has loaded, so they cannot be reached from the page; they are kept for type narrowing and are not covered by contrived tests.

**Remaining:** the first CI run of the integration and browser tests (record its run ID here); a hosted walkthrough with a real Venue Staff account — no Venue Staff account is known to be provisioned in the shared project, so this needs a provisioned account first; team confirmation of the [9 October scope choices](../requirements/assumptions-and-questions.md#9-october-2026--kan-50-venue-catalogue-maintenance-scope-and-implementation-choices); peer review. No acceptance, Jira Done transition for KAN-50, or change to the **43-point** baseline is claimed.

## 8 October: PR #27 conflict resolution

**AUTO-20261008-PR27-01 — local merge verification.** Tested the merge of `origin/main` at `1ed0332` into PR #27's `feat/KAN-52-venue-suitability` at `ae54ec7`. The only conflict was this evidence document: the 6 October KAN-51 walkthrough and the 5/4 October integration and suitability records are preserved verbatim. The calendar route/history fix and its regression tests merged without code conflicts.

| Command / environment | Actual result |
| --- | --- |
| `npm.cmd run check`; Windows, Node 24.21.0 | Passed tools/frontend/backend type checks, **371 frontend + 662 backend tests (1,033 total)**, and both production builds. |
| `npm.cmd run test:e2e -- tests/e2e/venue-availability.spec.ts tests/e2e/venue-bookings.spec.ts tests/e2e/venue-booking-submission.spec.ts tests/e2e/venue-suitability.spec.ts --workers=2`; Chromium, local Express/Vite | **39/39 passed**. Covers calendar access/navigation, booking submission and decisions, suitability, and narrow-screen layouts. |
| Conflict and whitespace checks | No unresolved Git paths; `git diff --cached --check` passed. Both branches' prior evidence sections were checked for exact preservation. |

**Limits:** browser feature responses use intercepted fixtures; login-required checks use the running backend. The test server used an unused local database URL and did not connect to shared Supabase. No database integration or coverage rerun was needed for this merge delta, which changes calendar UI and tests but no backend service or schema. Earlier database/coverage results remain historical records. Hosted acceptance and GitHub CI are separate checks; this entry records no Jira status change or PR approval.

## 6 October: KAN-51 interactive website walkthrough

**MAN-20261006-KAN51-01 — local interactive verification.** Codex walked through the website in a visible, temporary Chromium browser using the user-authorised Playwright fallback, inspecting rendered text and screenshots after each action. This was an interactive walkthrough rather than an execution of the browser test suite. Scope: KAN-51-AC1–AC6 only, on the working tree of `codex/kan-51-availability-plan` based on `ae2be66`, including the calendar route/history fix.

**Environment:** Windows, Node 24.21.0, Vite at `http://127.0.0.1:5173`, the real `createRuntimeApp` API at port 3000, and a disposable PostgreSQL 17 container at port 55451. All six migrations were applied to this isolated database. Synthetic profiles and locally signed fixture JWTs exercised the normal session-cookie verification and database role mapping; calendar API responses were not mocked. The dataset contained two active venues, one inactive venue, approved/pending/rejected/cancelled bookings, adjacent bookings, a block crossing the week boundary and a multi-day block. The displayed Singapore week was 5–11 October.

| Walkthrough | Observed result |
| --- | --- |
| Calendar access for Event Coordinator, Venue Staff and Technical Support Staff | All three roles obtained the calendar and the correct periods. |
| Signed-out, Event Organiser and Attendee access | Signed-out API returned 401 and the page offered sign-in; the other two roles received 403 and an access message. No calendar sidebar link or venue data appeared for these callers. |
| Availability labels, statuses and venue association | Available, Booked, Blocked and Closed were distinguishable in the legend, bars and text. Only approved bookings consumed availability; pending/rejected/cancelled bookings and the inactive venue were excluded. Switching venues showed their own periods. |
| Adjacent bookings and period boundaries | Adjacent 10:00–12:00 and 12:00–13:00 bookings appeared without an intervening free slot. A block starting before the week was clipped to Monday with its whole period in the text; a Friday-to-Sunday block appeared on all affected days. |
| Previous/next/this week, date jump and reload | Controls changed both the label and recorded periods. Jumping to 4 November showed 2–8 November. Reload retained the selected week and venue. |
| Same-page navigation and browser history | From next week's Orchid Seminar Room, clicking the calendar sidebar link restored this week's Harbour Hall. Browser Back restored the room and next week; Forward restored the hall and this week. |
| Refresh after fixture changes | A newly added Wednesday block and newly approved booking appeared after Refresh; a cancelled Monday booking disappeared and its interval became available. Only isolated fixture rows were changed. |
| Role-specific booking details | The assigned coordinator saw the event name/link for their own booking; another coordinator's booking stayed anonymous. Venue Staff and Technical Support Staff saw anonymous bookings. |
| Keyboard and mobile use | The venue picker worked with Arrow Down/Enter. At 390 × 844 pixels, labels and multi-day details wrapped legibly; document width was 375 pixels, with no horizontal overflow. |
| Empty catalogue | Temporarily inactivating the two fixture venues showed the empty state with no picker. Restoring them and clicking Refresh restored the selected venue. |
| Connection failure and retry | Offline Refresh hid the old calendar and showed the API connection error with Try again. Returning online and clicking Try again restored the correct venue. |
| Invalid window, sign-out and invalid session | A reversed API window returned 400 `INVALID_AVAILABILITY_WINDOW`. Sign out cleared the calendar and restored 401. Replacing the temporary browser's session with an invalid fixture token also removed the calendar, protected navigation and cached identity. |

**Result:** all 15 recorded checks passed; no functional or layout defects were found in the inspected KAN-51 flows. No browser `pageerror` events occurred. The original record identified screenshots and the detailed local result under ignored `test-results/kan51-manual/`: `results.json`, `02-venue-staff-calendar.png`, `07-coordinator-visibility.png` and `08-technical-support-mobile.png`. These were local files, not committed submission artifacts.

**Artifact availability checked 15 October 2026 (Codex):** `test-results/kan51-manual/` and those four original artifacts are not retained in the current checkout. Recover the original files from the original run location if available, then place and register them in the relevant sprint evidence directory. No replacement screenshots or test results were generated. The written 6 October observations above remain historical run evidence; the missing files cannot currently be inspected or included in the submission.

**Limits:** Supabase email/password sign-in, hosted S2-T05/S2-T06 acceptance, actual token-expiry timing and peer review were not exercised. Invalid-session recovery was inspected, not timed token expiry. The local walkthrough does not change Jira status or resolve the existing policy questions.

## 5 October: integrated venue search and booking submission

**AUTO-20261005-INTEGRATION-01 — local automated verification.** Combined source: `a093ca5` on `codex/KAN-52-venue-suitability`. Live fetches confirmed `origin/main` at `ae2be66`, KAN-12 at `a7e7bca` and KAN-53 at `87c2103`. Main and the other published team branches were already included. Merge `04ec1ce` adds KAN-12's three missing commits; merge `a093ca5` adds KAN-53's missing commit and resolves integration issues. The final ancestry check found **zero missing commits from every fetched remote branch tip**. Unpublished teammate changes are outside this statement; nothing was pushed or merged into remote main.

Search retains operational-block filtering and schema isolation while sharing KAN-52's continuous-interval opening-hours check. Booking submission now checks approved reservations and operational blocks after acquiring the venue lock, rejects impossible/ambiguous timestamps, and leaves refusals without a new booking row. The coordinator-only panel handles account/event changes, stale responses and uncertain saves. KAN-52, KAN-8 and KAN-55 remain connected without a new migration or future-sprint application feature.

| Command / environment | Actual result |
| --- | --- |
| `npm.cmd run check`; Windows, Node 24.21.0 | Passed tools/frontend/backend type checks, **368 frontend + 660 backend tests (1,028 total)**, and both production builds. |
| `npm.cmd run test:coverage` | Passed all **1,028** tests. Frontend statements/branches/functions/lines: **88% / 83.4% / 88.93% / 90.45%**; backend: **69.86% / 75.86% / 67.55% / 70.92%**. Separate database/browser suites are excluded from these measurements; they are not requirements coverage or mutation scores. |
| `npm.cmd run test:integration`; dedicated PostgreSQL **18.6** in WSL, isolated schemas | Final run at `a093ca5` passed **255 tests across 18 files**. Includes **44 booking submission/decision cases**, **9 search cases**, and the existing suitability, calendar, block, auth and event suites. CI's PostgreSQL **17** environment remains separate verification. |
| `npm.cmd run db:migrate` and `npm.cmd run db:seed`; explicit local application-database URLs | Passed: migrations already up to date; seed preserved existing local records. Shared Supabase was not used. |
| `npm.cmd run test:e2e -- --workers=2`; Chromium, local Express/Vite | Passed **71/71** cases in 1.1 minutes, including seven new KAN-53 cases for connected approval/rejection outcomes, both submission-conflict messages, uncertain-save recovery, organiser access and the running API's login requirement. |
| Documentation/schema consistency | All **93** Sprint 2 acceptance-criterion definitions remain identical to the pre-integration branch; both CSV registers retain **20** rows with consistent columns. The final pass checked **425** local Markdown file targets in modified documentation; all resolve. Migrations 001–006 are unchanged. `git diff --check` and staged whitespace checks passed. |

The PostgreSQL cases verify no persisted booking/event/history/notification change on a refused submission, adjacency, and a waiting submission seeing a reservation or block committed before it acquires the venue lock. Runtime tests exercise cookie handling, mapped roles, routing and SQL with a controlled token-verification fixture. Browser feature responses use explicit API fixtures; startup/readiness and unauthenticated API checks use the running backend. These results do not establish hosted Supabase login-to-booking acceptance.

**Remaining:** run [KAN-53 hosted verification](README.md#kan-53-hosted-verification), including staff decisions and coordinator outcomes, and the existing KAN-52 hosted checks. Confirm open booking eligibility/duplicate-pending policies, obtain peer review, and check CI after publication. No Jira Done transition, Sprint 2 review outcome or change to **43 points: 35 new + 8 carry-over** is claimed.

## 4 October: venue suitability

**AUTO-20261004-KAN52-01 — local automated verification.** Implemented on `codex/KAN-52-venue-suitability`, created from freshly fetched `origin/main` (`ae2be66`, including KAN-55). Code and tests through `6598ebf`: `68026e2` adds input/rules, `b51d6a8` adds the authenticated read-only API, `670d4f0` adds the interface, `8f78541` adds component coverage and clarifies displayed catalogue freshness, and `6598ebf` adds browser coverage. No pending feature branch was merged, and no shared Supabase data, migration or Jira status was changed.

| Command / environment | Actual result |
| --- | --- |
| `npm.cmd run check`; Windows, Node 24.21.0 | Passed: tools/frontend/backend type checks, **341 frontend + 572 backend tests (913 total)** and both production builds. |
| `npm.cmd run test:coverage` | Passed all **913** tests after the final display-copy/fixture clarification. Configured frontend statements/branches/functions/lines: **86.29% / 82.51% / 87.87% / 88.63%**; backend: **64.98% / 70.71% / 58.98% / 66.26%**. These measurements exclude the separate database/browser suites and are not requirements coverage or mutation scores. |
| `npm.cmd run test:integration`; dedicated local PostgreSQL **18.6** in WSL, isolated schemas | Passed **228 tests across 18 files**, including **33 KAN-52 cases** and the existing KAN-55 block suite. This local environment does not replace PostgreSQL **17** verification in GitHub CI. |
| `npm.cmd run db:migrate` and `npm.cmd run db:seed`; explicit local application-database URLs | Passed: migrations already up to date; local seed preserved existing rows. The test servers used this isolated application database, not shared Supabase. No KAN-52 migration is needed. |
| `npm.cmd run test:e2e -- --workers=2`; Chromium, local Express/Vite | Full run passed **64/64** browser cases. After the catalogue-refresh label and complete seven-check fixture were added, the focused KAN-52 rerun passed **8/8** in 11.3 seconds. |
| Visual inspection | Reviewed desktop and 390-pixel mobile assessment captures. Source text, interpretation inputs and result reasons remain legible; long requirements wrap without horizontal overflow. |
| Documentation consistency | **402** local Markdown file targets in the modified documents resolve; the initial documentation pass also checked their existing/new anchors. Both traceability/test-case CSVs retain **20** rows with consistent columns. All **93** Sprint 2 acceptance-criterion definition lines match `ae2be66` unchanged, as do all migration files. |

KAN-52 adds **60 input/rule tests**, **9 HTTP tests**, **41 component tests**, **33 PostgreSQL tests** and **8 browser cases**. The integration suite exercises current assignment and mapped runtime cookie authentication using local token fixtures, stale source rejection despite unchanged `updated_at`, fresh venue edits, exact capability matching, inactive venues, missing/invalid information, full-period Singapore opening hours, booking/block overlap and adjacency, and unchanged event/venue/booking/audit rows after assessment. Pure rules also check false/unconfirmed interpretation and capacity boundaries. Component/browser tests cover confirmation, current-data rechecks, source refresh, stale responses, account/role changes, access messages, navigation and mobile layout.

Browser feature responses are intercepted fixtures; unauthenticated API and startup/readiness checks use the running local backend. The PostgreSQL tests use real SQL and runtime routes with controlled authentication fixtures. Neither establishes hosted Supabase login-to-assessment acceptance. The UI's venue details are labelled as the last refreshed catalogue snapshot; assessment results always use a new database read. The final copy change does not alter the assessment calculation.

**Remaining:** execute [KAN-52 hosted checks](README.md#kan-52-hosted-verification), confirm remaining matching/eligibility policies with the team/customer, and obtain peer review and published CI. KAN-53 booking submission is not yet integrated into this branch/main; suitability neither reserves a venue nor rejects an event. No Done points, Sprint 2 review outcome or change to **43 points: 35 new + 8 carry-over** is claimed. All work is committed locally; nothing was pushed.

## 4 October: venue-unavailability blocks

**AUTO-20261004-KAN55-01 — local automated verification, integration not executed.** Tested on `feat/KAN-55-block-venue-unavailability`, branched from `main` (`667c4ef`), with Node 24 on Windows.

| Command / environment | Actual result |
| --- | --- |
| `npm run check` | Passed: tools/frontend/backend type checks, **300 frontend tests** (293 + 7 new `VenueBlocksPage.test.ts` cases), **503 backend tests** (472 + 20 new `block-input.test.ts` cases + 11 new `block-router.test.ts` cases), and both production builds. |
| `npx vitest run test/venues/block-input.test.ts` (backend, isolated) | Passed: 20 tests, including the mandatory-reason requirement, missing/invalid/out-of-order dates, and confirming `venueId` is not an accepted body field. |
| `npx vitest run test/venues/block-router.test.ts` (backend, isolated) | Passed: 11 tests covering authentication (401), role gate (403, Venue Staff only), venue/block UUID validation (400), the create/list/delete success paths forwarding verified actor/params/body to the service, and `WorkflowError`-to-HTTP mapping (409/404). |
| `npx vitest run src/features/venues/pages/VenueBlocksPage.test.ts` (frontend, isolated) | Passed: 7 tests covering venue-list loading, the non-staff read-only message with no fetch, block creation and reload, client-side time validation, block removal and reload, and load-error retry. |
| `database/tests/venues/venue-blocks.integration.test.ts` (new) | **Not executed in this original run.** `TEST_DATABASE_URL` was blank in `.env` and Docker was unavailable, so the [dedicated test database](README.md#database-environments) could not be created. The suite covers KAN-55-AC1–AC13 (association, role checks, venue eligibility, the booking-overlap conflict, listing, deletion). Its later passing execution is included in AUTO-20261004-KAN52-01 above. |
| `npm run test:e2e` | Not executed this session (same constraint: Playwright's `webServer` needs a migrated dev database). |

**Imported-record caveat, 5 October:** the stated 500 backend total above is preserved from the original branch, but its parenthetical calculation does not reconcile (472 + 28 + 9 = 509). It is not an independently recounted result. The organiser-list component fixture above also did not establish backend organiser permission; the integrated panel is coordinator-only. Subsequent combined-build runs are recorded separately.

This is automated-fixture coverage at the unit/component level only. It does not establish real PostgreSQL persistence/concurrency behaviour, a hosted Venue Staff walkthrough, CI or peer review for this branch.

**Remaining:** execute the integration suite against a dedicated test database; execute the browser suite; agree the [block-over-existing-booking implementation default](../requirements/assumptions-and-questions.md#4-october-2026--kan-55-block-venue-for-operational-unavailability) with the team/customer; obtain peer review and CI. No hosted acceptance, Jira Done transition, Sprint 2 review outcome or change to the **43-point** baseline is claimed. Nothing was pushed by this task.

## 4 October: venue booking submission

**AUTO-20261004-KAN53-01 — local automated verification, integration not executed.** Tested on `feat/KAN-53-submit-venue-booking-request`, branched from `main` (`667c4ef`, after PR #23 integrated KAN-29/KAN-8), with Node 24 on Windows.

| Command / environment | Actual result |
| --- | --- |
| `npm run check` | Passed: tools/frontend/backend type checks, **301 frontend tests** (293 + 8 new `VenueBookingPanel.test.ts` cases), **500 backend tests** (472 + 28 new `booking-input.test.ts` submission cases + 9 new `venue-booking-submission-router.test.ts` cases, less name collisions none), and both production builds. |
| `npx vitest run test/venues/booking-input.test.ts` (backend, isolated) | Passed: 32 tests, including the new KAN-53 submission input boundaries (missing fields, invalid venue UUID, invalid/out-of-order dates, optional layout/notes trimming, unknown fields rejected). |
| `npx vitest run test/venues/venue-booking-submission-router.test.ts` (backend, isolated) | Passed: 9 tests covering authentication (401), role gate (403, coordinator-only), event-id UUID validation (400), the 201 success path forwarding the verified actor/event id/body to the service, and `WorkflowError`-to-HTTP mapping (409/404). |
| `npx vitest run src/features/events/components/VenueBookingPanel.test.ts` (frontend, isolated) | Passed: 8 tests covering coordinator submission and list refresh, client-side end-after-start time validation, server-refusal display without emitting `changed`, the read-only list shown to the owning organiser, read-only rendering once the event is `REJECTED`/`CANCELLED`/`COMPLETED`, and load-error retry. |
| `database/tests/venues/venue-bookings.integration.test.ts` (new "KAN-53 venue booking submission against PostgreSQL" describe block) | **Not executed.** `TEST_DATABASE_URL` is blank in `.env` and Docker is unavailable in this environment, so the local fallback test database (see [dedicated test database](README.md#database-environments)) could not be created. The block was written to cover KAN-53-AC1–AC11 (association, visibility, eligible-state and venue-eligibility checks) but has no execution result yet. |
| `npm run test:e2e` | Not executed this session (same booking-independent constraint: Playwright's `webServer` needs a migrated dev database, not exercised here). |

**Imported-record caveat, 5 October:** the stated 500 backend total above is preserved from the original branch, but its parenthetical calculation does not reconcile (472 + 28 + 9 = 509). It is not an independently recounted result. The organiser-list component fixture above also did not establish backend organiser permission; the integrated panel is coordinator-only. Subsequent combined-build runs are recorded separately.

This is automated-fixture coverage at the unit/component level only. It does not establish real PostgreSQL persistence/concurrency behaviour, a hosted Supabase login-to-submission walkthrough, CI or peer review for this branch.

**Remaining:** execute the integration suite against a dedicated test database (local Docker fallback or a future dedicated Supabase test project) before claiming database-level verification; execute the browser suite; agree the [eligible-event-states and duplicate-request implementation defaults](../requirements/assumptions-and-questions.md#4-october-2026--kan-53-venue-booking-submission) with the team/customer; obtain peer review and CI. No hosted acceptance, Jira Done transition, Sprint 2 review outcome or change to the **43-point** baseline is claimed. Nothing was pushed by this task.

## 4 October: integrated venue booking decisions

**AUTO-20261004-KAN8-01 — local automated verification.** Tested code through `723804f` on `codex/KAN-29-automatic-coordinator-assignment`, with Node 24.21.0 on Windows. The live fetch included `origin/main` (`b981f11`), draft verification (`a2a77d7`), Ryan's venue search (`16b59f0`) and Ernest's availability calendar (`d33d18c`); their histories are retained in merge commits `1e6b0e1`, `9a6dfcf`, `2adea20` and `3629526`. The published scope-correction branch was already an ancestor. A second fetch confirmed the same heads. Unpublished teammate work is outside this statement.

Implementation commits: `77f2312` makes search honour operational blocks and the test schema; `0091d5f` adds authorised atomic booking decisions; `cd5568c` adds the staff/coordinator interface; `723804f` adds browser coverage and fixes route-leave reads. No migration SQL, applied history or shared Supabase data was changed.

| Command / environment | Actual result |
| --- | --- |
| `npm.cmd run check` | Passed: tools/frontend/backend type checks, **293 frontend tests**, **472 backend tests**, and both production builds. The final overlapping verification run emitted worker-shutdown timeout warnings after the backend tests passed; the separate coverage run below completed the same tests without those warnings. |
| `npm.cmd run test:coverage` | Passed with all **765** unit/component tests. Configured frontend statements/branches/functions/lines: **84.72% / 80.98% / 85.86% / 86.88%**. Backend: **63.76% / 65.96% / 57.77% / 65.35%**. These reports exclude the separate PostgreSQL and browser suites; they are not requirements coverage or mutation scores. |
| `npm.cmd run test:integration`; dedicated local PostgreSQL **18.6** in WSL, isolated schemas | Passed: **184 tests across 16 files**, including **23 KAN-8 database cases**, three new search regressions, and existing migration, assignment, event and calendar checks. Docker's PostgreSQL 17 service could not start in this session; this local fallback does not replace the repository's PostgreSQL 17 CI check. |
| `npm.cmd run db:migrate` and `npm.cmd run db:seed`; explicit local database URLs | Passed against a separate local application database used by the browser server. All current migrations 001–006 applied. Shared Supabase was not a test target. |
| `npm.cmd run test:e2e -- --workers=2`; Chromium, local Express/Vite | Final standalone run passed **56/56** cases in 53.5 seconds, including all **12** new KAN-8 cases. |
| Visual inspection | Inspected generated desktop approved-booking and 390-pixel mobile pending-booking captures. Decision/result sections remain legible; long event names, requirements and notes wrap without horizontal overflow. |

The booking integration tests exercise the real runtime HTTP/session mapping and PostgreSQL service, with local authentication fixtures. They cover staff/coordinator boundaries, ownership and role denials, pending-only decisions, correct actor/time/reason and association preservation, repeat/opposite/concurrent decisions, overlapping and adjacent periods, operational blocks, event/venue eligibility, rollback and calendar visibility. No decision changes the event status or inserts a notification. Unit/component cases additionally cover input limits, stale reads, account changes, uncertain saves and read-before-retry recovery.

The first targeted browser run caught route-leave requests to `/api/venue-bookings/undefined`; the detail/list route guards and four component regressions fix this without weakening the browser request assertions. The first full browser run while check/coverage were also running passed 54/56, with two older-page navigation timeouts before assertions. The standalone rerun result is recorded above; timeouts were not marked as functional passes. Feature browser scenarios use API/session fixtures, while unauthenticated API and startup/readiness cases use the running local backend. They do **not** prove real Supabase login-to-decision persistence.

**Remaining:** execute [KAN-8 manual checks](README.md#kan-8-hosted-verification) using provisioned staff/coordinator accounts and synthetic pending bookings; confirm the [documented policy defaults](../requirements/assumptions-and-questions.md#4-october-2026--kan-8-venue-booking-decisions), then obtain peer review and new GitHub CI. KAN-53 booking submission is not in the fetched work, so the complete submission-to-booking walkthrough remains pending. No hosted acceptance, Jira Done transition, Sprint 2 review outcome or change to the **43-point** baseline is claimed. Nothing was pushed by this task.

## 30 September: migration and hosted schema consistency

**DB-SCHEMA-20260930-01 - fresh local reproduction and read-only hosted comparison.** Audited migrations 001-006 at `b0fa959` after the shared migration run. Temporary local PostgreSQL 17.11 databases were created, migrated and removed; the hosted PostgreSQL 17.6 project was inspected only within read-only transactions. No shared schema, data or history was changed by this audit, and all six SQL files remain unchanged.

| Comparison | Actual result |
| --- | --- |
| Fresh migration run and rerun | All six files applied in order; rerunning returned no pending migrations. |
| Tables and columns | All 16 tables and 142 columns matched, including types, nullability, defaults, generated/identity settings and RLS flags. |
| Constraints and indexes | All 74 constraints and 40 indexes matched by name and definition, including validation/deferrability and index validity/readiness. |
| Project functions and triggers | All four project function definitions matched after normalizing CRLF/LF line endings; all five table triggers matched, including enabled state. |
| Policies and other public objects | Both had zero row policies and no non-extension views, materialized views, sequences, foreign tables or enums. |
| Access boundary | Every table had RLS enabled and no PUBLIC grant. All 48 hosted table/role combinations for `anon`, `authenticated` and `service_role` had no effective table or column access. Project functions had no PUBLIC execution grant. |
| Migration history | All six current-file checksums matched their current or recognised former hosted names. `006_automatic_coordinator_assignment.sql` is now recorded; its availability column, assignment method, nullable actor and method/actor check are present. Older applied names remain valid history. |
| Readiness metadata | Both databases contained `scaffold_version = 1`; readiness alone was not used as proof of schema equivalence. |
| Database regression suite | Passed: `npm.cmd run test:integration` against the dedicated local PostgreSQL database; 150 tests across 13 files, including all 11 migration/upgrade cases. |

The hosted project additionally has `public.rls_auto_enable()` and the enabled `ensure_rls` DDL event trigger for `CREATE TABLE`, `CREATE TABLE AS` and `SELECT INTO`. This environment helper enables RLS automatically; the project migrations already do so explicitly. It is not a missing application migration. The initial raw function comparison also showed Windows/Unix line-ending differences; the normalized definitions matched exactly.

The comparison covers application objects in `public`, not copies of business rows, login accounts or the Supabase-managed schemas, extensions, global roles, owners and default privileges. Historical migration names/timestamps can differ from a fresh database. These boundaries do not affect the verified application definitions above. No SQL rewrite or additional corrective migration is required.

This result supersedes earlier setup notes that migration 006 was pending. It does not establish hosted KAN-29 acceptance, coordinator availability policy, CI, peer approval or a Jira Done transition. Continue with [K29-M01-M10](README.md#kan-29-hosted-verification) and record their actual results separately.

## 30 September: Firebase migration retirement

**AUTO-20260930-MIGRATION-01 - local automated run.** Repository change on `codex/KAN-29-automatic-coordinator-assignment`, based on `cf84315`; implementation and this evidence are committed together. The unused Firebase migration is retired and the active files are renumbered 001-006. SQL contents are unchanged; the runner recognises exact former filenames, validates recorded checksums and preserves existing history. No shared schema, data or migration history is changed.

| Check | Actual result |
| --- | --- |
| `npm.cmd run check`; Windows Node 24.21.0 | Passed: tools/frontend/backend type checks, 203 frontend tests, 399 backend tests and both builds. |
| `npm.cmd run test:integration`; explicit dedicated local PostgreSQL 17 test database, isolated schemas | Passed: 150 tests across 13 files, including all eleven migration/upgrade cases. |
| Repository consistency | 502 local Markdown links and all implementation/test paths in the 20-row traceability CSV resolve. All 93 Sprint 2 acceptance definitions are unchanged; four renamed SQL files preserve their normalized contents. |
| Migration regression coverage | Eleven targeted migration cases passed. Fresh installs create only 001-006 history without the Firebase table. Old 001 upgrades and populated pre-assignment databases retain mappings, legacy identities, events, manual assignments and history. Databases with old 007 already applied skip its renamed 006 without inserting alias records. Both valid names skip safely; a mismatched checksum under either name rejects and rolls back pending writes. The separate dashboard-era record is not treated as an alias. Reruns apply nothing further. |

The cases are in [database.integration.test.ts](../../database/tests/database.integration.test.ts). No browser workflows changed, so the earlier scope-audit browser result remains separate; no new browser, hosted login, CI or KAN-29 acceptance result is claimed.

**Shared read-only inspection:** records under the original names 001, 002 and 004-006 matched the unchanged SQL checksums. The legacy identity table existed without the canonical Firebase history entry; `003_add_supabase_auth.sql` was a separate record with a different checksum. Automatic assignment (old 007, now 006) and its new columns were absent. This is a metadata observation, not a full hosted-schema equivalence check or a migration run. Retirement and aliases let the updated runner skip existing migrations without inventing history. See the [decision log](../requirements/assumptions-and-questions.md#30-september-2026---firebase-migration-retirement). A second read-only comparison after renumbering confirmed that current files 001-005 match existing original-name records and only new 006 is pending. Applying new 006, enabling real coordinator availability and hosted manual testing remain separate follow-ups.

**Historical numbering:** the earlier runs below retain the filenames and numbers used when executed. See the [old-to-current filename map](../../database/README.md#shared-schema-and-migrations) for today's 001-006 sequence.

## 30 September: sprint scope correction

**AUTO-20260930-SCOPE-01 - local automated run.** Audited and corrected the application against the Sprint 1/2 commitments on `codex/KAN-29-automatic-coordinator-assignment`, starting from `5570788`. Backend/database-test changes are in `93c9ce2`; frontend/browser changes are in `3d1511a`. This record supersedes the 28 September implementation's retention of handover; it does not change that earlier run's historical result.

| Command / environment | Actual result |
| --- | --- |
| `npm.cmd run check`; Node 24.21.0 on Windows | Passed: tool/frontend/backend type checks, 203 frontend tests, 399 backend tests and both production builds. Backend typecheck, its 399 tests and build also passed after the final manual-assignment status alignment. |
| `npm.cmd run test:integration`; PostgreSQL 17 in local Docker, dedicated `connectsphere_test`, isolated test schemas | Final full run passed: 141 tests across 13 files. The earlier 140-test run passed before adding the legacy Confirmed assignment-refusal case; the final total includes it. |
| `npm.cmd run db:migrate`, `npm.cmd run db:seed`, `npm.cmd run test:e2e`; explicit local database URLs, fresh local Express/Vite servers, Chromium | Local preparation passed; all 32 browser tests passed. Feature flows use API/session fixtures, with live local startup and database readiness smoke checks. |
| Repository scope and documentation checks | Seven migration files unchanged; all 93 Sprint 2 AC definitions and the 43-point baseline preserved. Traceability/test-case CSVs retain 20 rows each, with only CF-05/06/07/20 and TC-05/06/20 revised. Current code references updated. |

The regression coverage verifies:

- All 28 formerly exposed later-workflow endpoints return the generic `404 NOT_FOUND`, without database reads or transactions: [mounted application scope checks](../../backend/test/sprint-scope.test.ts).
- Initial assignment remains possible for unassigned Submitted, Under review, Clarification requested and Approved requests. Reassignment, conflicting active history and legacy Confirmed initial assignment are refused without changing the request/history. [Assignment integration](../../database/tests/events/assignment.integration.test.ts) and [automatic-assignment integration](../../database/tests/events/automatic-assignment.integration.test.ts) retain workload, rollback and concurrent manual/automatic initial-allocation checks.
- Clarification and initial assignment generate no notification rows. Seeding adds no new equipment examples and preserves existing rows; historical database guards continue to pass.
- Owners and assigned coordinators retain read-only status history, including stored later states: [history integration](../../database/tests/events/status-history.integration.test.ts). The [status panel tests](../../frontend/src/features/events/components/StatusHistoryPanel.test.ts) verify status refresh, retry and absence of mutations; [assignment panel tests](../../frontend/src/features/events/components/AssignmentPanel.test.ts) prevent handover even with missing history or stale host data.
- Browser fixtures answer only retained workflow reads. [Coordinator browser checks](../../tests/e2e/review-access.spec.ts) retain review controls without handover or later lifecycle controls.

**Boundaries and follow-up:** no applied migration, trigger, table or shared Supabase data was changed. Historical compatibility tests do not mean equipment, attendee registration or other deferred application features are delivered. No new hosted acceptance, GitHub CI result, coverage percentage, Jira transition or Done points are claimed. Venue application stories remain pending in this branch. KAN-29 still needs the documented hosted setup and [manual checks](README.md#kan-29-hosted-verification), peer review and CI. The separate KAN-33 decided-request-access branch was not merged by this audit. See the [scope matrix](../requirements/README.md#30-september-sprint-scope-audit).

## 28 September: KAN-29 automatic assignment

**AUTO-20260928-01 — local automated run.** Checked on 28 September 2026, approximately 04:32–04:35 Asia/Singapore, against the implementation committed through `45e53bd` on `codex/KAN-29-automatic-coordinator-assignment`. Baseline `main` was updated from GitHub to `dff42ed` before work began. Schema commit: `8ef8930`; backend: `e67cd9b`; frontend: `45e53bd`.

| Command / environment | Actual result |
| --- | --- |
| `npm.cmd run check`; Node 24.21.0 on Windows | Passed: tool/backend/frontend type checks, 196 frontend component tests, 373 backend unit/HTTP tests and both production builds. |
| `npm.cmd run test:integration`; PostgreSQL 17 in local Docker, dedicated `connectsphere_test` database and isolated test schemas | Passed on the final run: 145 tests across 13 suites, including 29 new automatic-assignment cases. |
| `npm.cmd run db:migrate`, `npm.cmd run db:seed`, `npm.cmd run test:e2e`; explicit local `DATABASE_URL` and `MIGRATION_DATABASE_URL`, fresh local Express/Vite servers, Chromium | Local test-database preparation passed; all 32 browser regressions passed. The browser suite uses API/session fixtures for feature flows and live local API/database smoke checks; it is not a hosted KAN-29 login-to-assignment test. |

The first full integration run returned one failure out of 145: the older authenticated submission fixture had no available coordinator and correctly received `409` instead of its expected `200`. The fixture now provisions and opts in a mapped coordinator. Its ownership denials remain, and it additionally checks the returned application ID, persisted assignment, absence of a review decision and selected-coordinator access. Its 15-test suite and then the full 145-test integration run passed.

Coverage of **KAN-29-AC1–AC7 / S2-T01 / local portions of S2-T02**:

- Available-only selection, unequal workloads, stable UUID ties and every counted/excluded request state.
- One automatic assignment on the correct request, null manual actor, organiser-attributed submission history, and no approval/rejection side effect.
- Real request-scoped API policy, mapped authenticated organiser/coordinator access and unchanged unauthorised requests.
- No candidates, no available candidates, incomplete submissions, preassigned drafts, repeated submission and injected write failure preserve the original data.
- Forced overlapping submissions of the same and different requests, plus a real manual handover competing with automatic selection, retain one current assignment and count the workload committed by the earlier allocation.
- Automatic history remains readable after manual handover; changing availability does not reassign existing requests.
- Component tests preserve draft editing/saving/retry for both allocation conflicts and display automatic history without inventing a human assigner.

Implementation and test entry points: [automatic assignment](https://github.com/MochaLxtte/ConnectSphere/blob/8f29d35d528d1bd265e435702b9a2db6aeb7046a/backend/src/modules/events/automatic-assignment.ts), [29 database cases](../../database/tests/events/automatic-assignment.integration.test.ts), [authenticated workflow](../../database/tests/events/authenticated-review.integration.test.ts), [assignment panel tests](../../frontend/src/features/events/components/AssignmentPanel.test.ts), [form tests](../../frontend/src/features/events/components/EventRequestForm.test.ts) and [detail tests](../../frontend/src/features/events/pages/EventRequestDetailPage.test.ts).

**Remaining:** migration 007 and coordinator availability setup in shared Supabase, [hosted manual cases K29-M01–M10](README.md#kan-29-hosted-verification), peer review, GitHub CI and review of the documented implementation defaults. No shared Supabase schema/data changes or live Jira transitions were made. S2-T23's venue workflow and future KAN-65 acceptance remain pending. Local passes do not mark KAN-29 Done or change the 43-point sprint baseline. Generated test reports remain ignored local artifacts.

## Sprint 1 closure and Sprint 2 follow-up, recorded 21 September

The Sprint 1 review held on **19 September** is recorded as **MAN-S1-REVIEW-01** below and in the [review run sheet](../scrum/sprint-01/review.md). DEMO-01, 03, 04, 05, 07, 08, 09, 10 and 11 passed their demonstrated paths. DEMO-02 exposed a draft registration-fields defect; DEMO-06 exposed missing coordinator navigation to approved requests. Additional saved-draft submission and mandatory-field validation failures remain to be reproduced against the exact entry paths, despite other submission/validation demonstrations passing.

Sprint 1 is closed in Jira: KAN-25, KAN-31, KAN-4, KAN-27, KAN-36, KAN-16 and KAN-24 are Done (**24 points**). KAN-6, KAN-33 and KAN-34 carry **8 points** into Sprint 2. These dispositions supersede earlier pending-closure notes, but do not turn unrecorded subcases into tests that were executed. The [Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md) retains the four defects and acceptance checks within its **43-point** baseline.

Exact review times, tested build, actor combinations and captures still need linking. Merge `db2c9db` occurred on 20 September, after the review, and records later integration rather than the demonstrated build. Earlier run results remain attached to their recorded commits. Updating these documents did not execute a new automated or hosted test run.

## Integration and KAN-16 checkpoint, 20 September (historical)

At this checkpoint the organiser creation, draft-editing and KAN-6 submission interfaces were integrated. The recorded organiser list/detail, refresh and browser access checks passed in MAN-20260917-01 through MAN-20260917-06. The notes still listed submission-to-status acceptance as outstanding because the review outcomes had not yet been reconciled into this record. The 19 September review results, recorded later above, include the demonstrated submission/status path, KAN-16's Done disposition and separate KAN-6 regressions carried forward. This later documentation does not move the review date or establish that every submission path passed.

A separate coordinator-page access defect was found in MAN-20260917-07: an organiser could open Review queue, which displayed their own draft. The frontend restriction and navigation fix passed automated regression checks in AUTO-20260917-07/08. The organiser queue recheck passed in MAN-20260918-01: the Review queue link was absent after reload and direct `/reviews` navigation showed `Coordinator access only`. The earlier organiser list/detail results remain valid.

**Update, 19 September:** the KAN-6 frontend (`EventDraftEditPage.vue`'s "Submit for review" action, see AUTO-20260919-03 below) is now connected, which *unblocks* the submission-to-status check described above — it does not itself complete it. That check still needs a hosted Supabase Auth account to submit a real draft through the running application and confirm the list/detail refresh to `Submitted`; no such account was available in the environment that did this frontend work.

The dated entries below preserve the results and gaps at the time of each run. Later entries resolve some earlier gaps; they do not imply new automated runs.

The integrated code also includes assignment, clarification, later lifecycle transitions, change requests, venue and equipment workflows, registration and notifications. Their source-commit automated results do not establish hosted acceptance of the combined workflow. The 20 September integration is outside Sprint 1's 6–19 September window and does not change its ten-PBI, 32-point baseline. No new run result or story closure is asserted by this summary.

The integration includes `main` at `d24691c` and the event-creation branch at `ffadfc8`. The newer shared create/save/submit form and transactional endpoint supersede the overlapping creation implementation; duplicate unused modules were removed. Coordinator access restrictions also cover the unassigned queue, and the decision panel now accepts eligible `UNDER_REVIEW` requests as well as `SUBMITTED` requests.

## Run register

The automated entries below preserve the results recorded for their implementation commits. Generated local reports are disposable; retain concise exports or link CI artifacts for the reviewed commit.

| Run ID / date | Commit and environment | Story / AC / scenario IDs | Command or manual steps | Actual result and failures | Report / CI run | Checked by |
| --- | --- | --- | --- | --- | --- | --- |
| AUTO-20261015-01 / 15 October 2026 | `3bd64f8`, documentation-only working-tree changes; Windows Node 24.21.0, isolated PostgreSQL 17 and Chromium | Current Sprint 1/2 implementation regression; TC-02-01/03-01/08-01/10-01/11-01 defect reproductions; KAN-60 gap inspection | Check, coverage, local migrate/seed, integration and E2E; separate scratch component/rule/HTTP reproductions | Existing suites passed: 1,356 unit/component, 304 integration and 95 browser tests. Five product expectations failed in separate reproductions; permanent regression/fix retests Not executed. No shared Supabase check. | [Retained summary](coverage-reports/2026-10-15-post-sprint-audit.txt); [audit scope and findings](#15-october-2026-post-sprint-implementation-audit). No current GitHub CI result claimed. | Automated audit (Codex) |
| DB-SCHEMA-20260930-01 / 30 September 2026 | Migrations at `b0fa959`; fresh PostgreSQL 17.11 and hosted 17.6 read-only metadata | Reproducible schema; KAN-25 mapping and KAN-29 migration readiness | Fresh `migrate()` plus rerun, catalog/checksum comparison and local integration suite | Application definitions and all six checksums match; migration 006 present. 150 integration tests passed. Hosted RLS helper is an environment difference. | [Schema comparison](#30-september-migration-and-hosted-schema-consistency); workflow acceptance pending | Automated audit |
| AUTO-20260930-MIGRATION-01 / 30 September 2026 | Firebase retirement and 001-006 renumbering based on `cf84315`; Windows Node 24.21.0 and isolated PostgreSQL 17 | Database setup/history preservation; KAN-25 mapping and KAN-29 upgrade compatibility | `npm.cmd run check`; `npm.cmd run test:integration` | Passed: 602 unit/component tests, 150 integration tests, type checks/builds. Fresh and populated legacy upgrades covered; no hosted migration run. | [Retirement evidence](#30-september-firebase-migration-retirement); CI pending | Automated local run |
| AUTO-20260930-SCOPE-01 / 30 September 2026 | `93c9ce2` + `3d1511a`; Windows Node 24.21.0, isolated PostgreSQL 17, Chromium | Sprint 1/2 scope boundary; KAN-29 initial allocation, KAN-16 history, KAN-27 clarification and shared access | `npm.cmd run check`, `npm.cmd run test:integration`, local preparation and `npm.cmd run test:e2e`; final backend recheck | Passed: 203 frontend + 399 backend tests, 141 integration tests, 32 browser tests, type checks/builds. Deferred endpoints/controls absent; existing assignments/history preserved. | [Scope correction evidence](#30-september-sprint-scope-correction); local reports remain ignored; hosted/CI evidence pending | Automated local run |
| MAN-S1-REVIEW-01 / review held 19 September 2026; closure record prepared 21 September; exact meeting times unrecorded | Application used for the team review; exact served build and fixture IDs not captured. Merge `db2c9db` on 20 September is later integration, not the reviewed build. | Sprint 1 DEMO-01–11; scenario reconciliation in the sprint backlog | Follow the review run sheet across authentication, creation/drafts, validation/submission, coordinator review, decisions/status, permissions, clarification and database setup | Nine demos passed (01, 03, 04, 05, 07, 08, 09, 10, 11); issues found in 02 and 06. Saved-draft submission and validation gaps also reported. Seven stories/PBIs closed Done at 24 points; three carried at 8 points. Individual subcase results and failures are qualified below. | [Completed review, defect register and closure](../scrum/sprint-01/review.md); [acceptance reconciliation](../scrum/sprint-01/sprint-backlog.md#review-acceptance-reconciliation); captures and Jira export to attach | Team review; individual operators/attendees not recorded |
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
| MAN-20260917-04 / 17 September 2026 | Local webpage and Supabase development project; working branch at `f134288`; exact served build/time not captured | KAN-16-AC3 / S1-T27; KAN-25-AC3 / S1-T03 unrelated-organiser read cases | Sign in as the second organiser, open the first organiser's request URL, then open Event requests | Passed: detail showed the unavailable/no-permission message without request or review information; the second organiser's list showed `No event requests yet` and none of the first organiser's requests. | Two browser captures reviewed; image files not retained in the repository; no HTTP response captured | Tristan |
| MAN-20260917-05 / 17 September 2026 | Local webpage and Supabase development project; working branch at `f3e1930`; exact served build/time not captured | KAN-16-AC3 signed-out list case; KAN-25-AC4 / S1-T04 sign-out UI portion | Sign out and navigate directly to `/events` | Passed: the page showed a sign-in prompt without request names or statuses. | Written observation below; no screenshot or HTTP response captured | Tristan |
| MAN-20260917-06 / 17 September 2026 | Local webpage and Supabase development project; working branch at `09c858e`; exact served build/time not captured | KAN-16-AC1 / S1-T25 list/detail label consistency and Draft/Submitted detail refresh | Open Event requests as the owning organiser, compare the four labels with the detail pages, and refresh the Draft and Submitted detail pages | Passed: Test Event Request 4 showed Draft; 3 Submitted; 2 Rejected; 1 Approved. The labels matched the detail pages. Draft/Submitted detail statuses and review messages remained correct after refresh. | List capture reviewed; image file not retained in the repository; refresh recorded as a manual observation; no HTTP response captured | Tristan |
| MAN-20260917-07 / 17 September 2026 | Local webpage and Supabase development project; working branch at `41fb395`; exact served build/time not captured | KAN-25-AC3 / S1-T03; KAN-33 coordinator-page access | Sign in as the organiser and open Review queue | Failed: coordinator navigation was visible and Review queue displayed the organiser's own draft. Automated fix verified below; hosted manual recheck pending. | Screenshot reviewed; image file not retained; no HTTP response captured | Tristan |
| AUTO-20260917-07 / 17 September 2026 | Coordinator-page access fix, parent `41fb395`; local Node 24; code and results recorded together in this commit | KAN-25-AC3/AC4; KAN-33/KAN-36 page access and session lifecycle; frontend regressions | `npm.cmd run test:coverage -w @connectsphere/frontend`; `npm.cmd run typecheck`; `npm.cmd run build` | Passed: 114 frontend tests including 23 new route-level access cases; workspace type checks and builds passed. Session/API fixtures cover denied roles, loading, sign-out/account changes, expiry and late read/write responses. | [Route access tests](../../frontend/src/features/reviews/pages/ReviewAccessPage.test.ts); local coverage output; CI link to add after push | Automated local run |
| AUTO-20260917-08 / 17 September 2026 | Same fix; local Playwright Chromium | KAN-25/KAN-33 navigation and page access; KAN-36 and KAN-16 browser regressions | Three targeted `npm.cmd run test:e2e -- ...` runs: review-access/review-queue/review-decision; scaffold; event-requests/event-request-detail | Passed: 27 browser checks (14 review, 5 scaffold, 8 organiser). The 10 new access cases verify navigation visibility, direct URL denial without event reads, coordinator access/sign-out and delayed session restoration. | [Access browser tests](../../tests/e2e/review-access.spec.ts); intercepted business APIs; hosted recheck and CI link pending | Automated local run |
| MAN-20260918-01 / 18 September 2026 | Local webpage and Supabase development project; working branch at `b2f0c2d`; exact served build/time not captured | KAN-25-AC3 / S1-T03; KAN-33 organiser queue access regression | Reload as the organiser, check navigation and open `/reviews` directly | Passed: Review queue was absent from navigation; direct `/reviews` showed `Coordinator access only` without review content. This resolves the organiser queue defect recorded in MAN-20260917-07. | Written observation below; no new screenshot or HTTP response captured | Tristan |
| AUTO-20260919-01 / 19 September 2026 | `f1d556f` (merged PR #7); GitHub Actions CI, isolated PostgreSQL 17 | KAN-34-AC1/AC2 frontend; S1-T11, S1-T12 | `npm run check` via CI (typecheck, unit/component tests, both builds) | Passed: 38 targeted frontend tests for `EventDraftEditPage.vue` covering form population from the shared GET response (including zero/false/null preservation), Singapore-local-time conversion to/from UTC, the not-editable state, PATCH save semantics and 400/401/404/409 error mapping; 99 frontend + 295 backend unit tests, typecheck and both builds all green. Component-level (jsdom) coverage only, not a hosted browser walkthrough. | [CI run 35380241176](https://github.com/MochaLxtte/ConnectSphere/actions/runs/35380241176); [EventDraftEditPage.test.ts](../../frontend/src/features/events/pages/EventDraftEditPage.test.ts) | Automated CI run |
| AUTO-20260919-02 / 19 September 2026 | `f1d556f` (merged PR #7); GitHub Actions CI, Playwright Chromium | KAN-16 organiser-list regression (a `DRAFT` row now links to `/events/:id/edit` instead of the read-only detail page) | `npm run test:e2e` via CI | Passed: 18 checks after fixing `event-requests.spec.ts`'s href assertion, which initially failed against the new draft-edit link during this same CI run's first attempt. | [CI run 35380241176](https://github.com/MochaLxtte/ConnectSphere/actions/runs/35380241176); [event-requests.spec.ts](../../tests/e2e/event-requests.spec.ts) | Automated CI run |
| AUTO-20260919-03 / 19 September 2026 | `f29da28` (merged PR #8); GitHub Actions CI, isolated PostgreSQL 17 | KAN-6-AC1–AC4 frontend; S1-T14, S1-T15; first CI-linked confirmation that `submit-request.integration.test.ts` and `update-draft.integration.test.ts` execute and pass against a real database | `npm run check` via CI, including `npm run test:integration` | Passed: 12 new frontend tests for the "Submit for review" action (save-then-submit request order, the server's own missing-fields message shown verbatim, no submit call when the preceding save fails, 401 handling) plus navigation to the read-only detail page; 103 frontend + 295 backend unit tests, typecheck, both builds and the full PostgreSQL integration suite all green. Component-level and CI-integration coverage only, not a hosted Supabase Auth browser walkthrough. | [CI run 35385702662](https://github.com/MochaLxtte/ConnectSphere/actions/runs/35385702662); [EventDraftEditPage.test.ts](../../frontend/src/features/events/pages/EventDraftEditPage.test.ts) | Automated CI run |
| AUTO-20260920-01 / 20 September 2026 | Branch `feat/KAN-24-core-feature-schema`; local Node 24.21.0; isolated local PostgreSQL 17 via Docker Compose | KAN-24-AC3 / S1-T33; schema constraints and concurrency guards for the first-release tables | `npm run test:integration` with `TEST_DATABASE_URL` set to the dedicated `connectsphere_test` database | Passed: 212 integration tests in 18 files. `core-schema.integration.test.ts` CORE-DB-01 to CORE-DB-06 cover attributed status history, overlapping venue-booking and blocked-period refusal, pooled equipment limits, registration capacity and uniqueness, one active coordinator assignment and non-empty change proposals. Separate concurrency cases confirm exactly one of two competing venue approvals, equipment reservations and registrations succeeds. | Local run; no CI run recorded for this branch yet | Automated local run |
| AUTO-20260920-02 / 20 September 2026 | Same branch and environment; local Playwright Chromium | Existing browser regressions after mounting the new routes, navigation and planning panels | `npm run typecheck`; `npm test`; `npm run build`; `npm run test:e2e` | Passed: type checks clean, 737 unit/component tests, both workspace builds, 17 browser checks. Browser fixtures answer the new panels' read calls from a shared helper so unexpected API calls still fail closed. | Local run; fixtures only, no hosted data | Automated local run |
| AUTO-20260920-03 / 20 September 2026 | Integrated branch at `2385beb`; local workspace | Unit/component regressions, TypeScript checks, builds and configured coverage after integration | `npm run check`; `npm run test:coverage` | Passed: both runs completed with 1,052 unit/component tests (315 frontend and 737 backend); type checks and both builds passed. Frontend coverage: statements 90.77%, branches 87.28%, functions 91.41%, lines 92.93%. Backend coverage: statements 63.58%, branches 65.46%, functions 57.70%, lines 64.62%; unit-only instrumentation excludes database integration tests. The frontend build reported a non-blocking 514 kB bundle warning. | Local run; these metrics are configured code coverage, not release acceptance coverage. Later code changes require their own applicable checks. | Automated local run |
| AUTO-20260920-04 / 20 September 2026 | Integrated branch at `2385beb`; isolated local PostgreSQL 17.11 | Migrated-schema and feature integration regressions | Apply migrations 001–006 and synthetic seed data to the isolated local database; `npm run test:integration` | Passed: 212 integration tests in 18 files. Setup and test writes were confined to the isolated local database; no Supabase writes or hosted manual acceptance checks were performed. | Local run; persistence and concurrency results do not establish hosted authentication or end-to-end acceptance. | Automated local run |
| AUTO-20260920-05 / 20 September 2026 | Integrated branch at `6635377`; local Chromium and isolated PostgreSQL 17.11 | Organiser status/outcome, coordinator access, initial decisions and application startup regressions | `npm run test:e2e -- --workers=2 --retries=0` | Final run passed: 32 browser checks without retries. The initial ten-worker run had eight navigation timeouts that passed on retry; seven traces showed unfinished external font stylesheet requests. A shared font fixture removed that dependency. The next run passed 31/32: the outcome selector also matched loading messages from planning panels. Scoping it to the Review outcome region resolved the failure before the final run. | Local Playwright report; business-flow APIs are intercepted fixtures, while startup/readiness checks use the running server and isolated database. No hosted workflow acceptance was performed. | Automated local run |
| MAN-20260920-01 / 20 September 2026 | Clean clone of `93bdd1a` into a new directory; Windows 11, Node 24.21.0 installed alongside the system Node 22; Supabase development project | KAN-24-AC1 / S1-T31; reproducible hosted setup | `npm ci`, `npm run setup`, fill `.env` with the session-pooler connection using `sslmode=verify-full` and a root certificate stored outside the repository, `npm run db:migrate`, `npm run dev`, then request `/api/health/ready` | Passed: migrations 003, 004 and 005 applied to the shared project, which had previously recorded only a dashboard-era `003_add_supabase_auth.sql`. The API connected over verified TLS and readiness returned `{"status":"ok","database":"connected"}` both directly and through the Vite proxy. | Command output reviewed in the working session; no screenshot retained | Arvin |
| MAN-20260920-02 / 20 September 2026 | Same clone and Supabase development project | KAN-24-AC2 / S1-T32; access boundary and non-destructive rerun | Inspect RLS and role privileges on every `public` table; call `/rest/v1/app_users` with the publishable key; rerun `db:migrate` | Partial: all 17 tables report row-level security enabled with no policies and no `anon`, `authenticated` or `service_role` privileges. The Data API call returned `503 PGRST002`, consistent with the Data API being disabled, but the project setting itself was not inspected in the dashboard, so this line is evidence rather than confirmation. Rerunning `db:migrate` reported the database up to date and changed no rows; `db:seed` uses `ON CONFLICT DO NOTHING` and its non-destructive behaviour is covered by SCF-DB-01/02. | Query output and HTTP response reviewed in the working session; dashboard setting not captured | Arvin |
| AUTO-20260929-01 / 29 September 2026 | Branch `feat/KAN-33-decided-request-access` off `dff42ed`, uncommitted working tree at time of run; local Node 22.20.0 (repo targets 24) | KAN-33 carry-over / KAN-56 / S1-DEF-02; S2-T20 automated layers | `npm run check`; targeted `vitest --coverage` on `submitted-requests.ts`, `submitted-requests-router.ts`, `ReviewQueuePage.vue` | Passed: type checks (including tools/integration tests), 391 backend and 193 frontend unit/component tests, both builds. New cases: `listFollowUpRequests` (non-coordinator, status set, disjoint from queue/no drafts, assignment filter, empty, policy failure), `GET /api/events?scope=history` (coordinator success, default queue unchanged, empty, 401, organiser 400, other roles 403, invalid/repeated scope 400, 500 without details), and the Decided requests section (links, labels, empty state, independent error and retry). Coverage: `submitted-requests.ts` 100%; `ReviewQueuePage.vue` 100% lines; uncovered router lines belong to other stories' handlers covered by their own suites. Not run locally: the new PostgreSQL case in `authenticated-review.integration.test.ts` (no local Docker; CI runs it) and browser specs (installed Chromium 1234 predates the repo's Playwright build 1243; CI runs them). | Local run | Automated local run (Claude, for Irfan) |
| MAN-20260929-01 / 29 September 2026 | `f67b86f` on `feat/KAN-33-decided-request-access`; local dev server, Supabase development project; Test Event Coordinator | KAN-33-AC1–AC3; KAN-56 / S1-DEF-02; S2-T20 | See "29 September: KAN-56 decided-request access (S2-T20)" below | **Passed** (steps 1–4, 6, 7): approval and rejection both leave the queue, are listed and reopenable under Decided requests after reload with no second decision; another coordinator and the organiser cannot see them. Step 5 inconclusive (401, signed out); the 409 path is covered by automated integration tests | Screenshots reviewed in session; not stored | Irfan |
| AUTO-20261001-01 / 1 October 2026 | `908e532` (PR #21, `feat/KAN-33-decided-request-access`); GitHub Actions CI, isolated PostgreSQL 17, Playwright Chromium | KAN-33 / KAN-56 / S1-DEF-02; S2-T20 automated layers; KAN-42 database integration evidence | `npm run check`, `npm run test:coverage`, `npm run db:migrate`, `npm run db:seed`, `npm run test:integration`, `npm run test:e2e` via CI | Passed: 391 backend and 193 frontend unit/component tests, type checks and builds; 121 PostgreSQL integration tests in 12 files, including the two new KAN-56 cases in `authenticated-review.integration.test.ts` (approved and rejected requests reachable through `scope=history`, repeat decision refused with 409, other coordinator and organiser excluded); 32 browser checks including the updated `review-access.spec.ts` and `review-queue.spec.ts`. Closes the local gaps noted in AUTO-20260929-01. | [CI run 36827526657](https://github.com/MochaLxtte/ConnectSphere/actions/runs/36827526657); [PR #21](https://github.com/MochaLxtte/ConnectSphere/pull/21) | Automated CI run |
| AUTO-20261003-01 / 3 October 2026 | `6ede774` on `feat/KAN-51-venue-availability-calendar` off `b981f11` (backend `4c89da9`, frontend `6ede774`); local macOS, Node 24.21.0; Docker Compose PostgreSQL 17.11; Playwright 1.63.0 Chromium, reusing the already-running local dev servers | KAN-51-AC1–KAN-51-AC6; S2-T05/S2-T06 automated layers; TC-09 | `npm run check`; `npm run test:coverage`; `npm run test:integration` against a dedicated local test database; `npm run test:e2e` | Passed: type checks and both builds; 424 backend tests (33 new: window parsing, role refusal before any query, response mapping and the HTTP boundary) and 228 frontend tests (35 new: Singapore-time day rules; page access, loading, error and empty states; venue and week changes; account changes; the review-page link); 127 PostgreSQL tests in 13 files, including 6 new KAN-51 cases through `createRuntimeApp` (all five roles and signed-out access, booking statuses, half-open boundaries, inactive venues, cross-venue isolation, coordinator-only event names, refresh after changes); 44 browser checks, including 12 new (navigation by role, denied paths, venue and week changes, reload, a 390px screen and the running server's 401). Coverage: backend venue module 100% on all measures; frontend `features/venues` 100% statements, functions and lines, 96.5% branches. Earlier same-day runs on this machine intermittently failed unrelated suites with `Parse Error: Expected HTTP/`: supertest's ephemeral servers collided with local Jupyter kernel sockets (confirmed by probing a kernel port), and clean reruns passed. Hosted Supabase sessions were not exercised. | Local run | Automated local run (Claude, for Ernest) |
| AUTO-20261003-02 / 3 October 2026 | `bd71de5` (PR #22, `feat/KAN-51-venue-availability-calendar`; code as of `6ede774`); GitHub Actions CI, Node 24.21.0, isolated PostgreSQL 17, Playwright Chromium (Chrome for Testing 153, build 1243) | KAN-51-AC1–KAN-51-AC6; S2-T05/S2-T06 automated layers; TC-09 | `npm run check`, `npm run test:coverage`, `npm run db:migrate`, `npm run db:seed`, `npm run test:integration`, `npm run test:e2e` via CI | Passed: 424 backend and 228 frontend unit/component tests, type checks and builds; frontend `features/venues` coverage 100% statements, functions and lines, 96.5% branches; migrations 001–006 and the seed applied; 127 PostgreSQL integration tests in 13 files, including the 6 KAN-51 cases; 44 browser checks, including the 12 in `venue-availability.spec.ts`. Repeats AUTO-20261003-01 on a clean runner. Hosted S2-T05/S2-T06 remain not executed. | [CI run 37126469278](https://github.com/MochaLxtte/ConnectSphere/actions/runs/37126469278); [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) | Automated CI run |

| AUTO-20261001-DRAFT-01 / 1 October 2026 | `dff42ed` (current main, after the 26 September KAN-24 over-scope revert); local Node 24 | S1-DEF-01 / KAN-57 and S1-DEF-03 / KAN-58 re-verification; KAN-34-AC1-AC3, KAN-6-AC1/AC4; supports S2-T19/S2-T21 | `npm run check`; targeted `npm test -w @connectsphere/frontend -- src/features/events/pages/EventDraftEditPage.test.ts src/features/events/components/EventRequestForm.test.ts` | Passed: both fixes (PR #17, #18, merged 20 September) still hold against current main after the revert. Full check: typecheck clean, 190 frontend + 372 backend unit tests, both builds. Targeted re-run: 23/23 tests (7 EventDraftEditPage + 16 EventRequestForm). Confirms registration capacity/opens/closes now appear when toggling a reopened draft's registration to Yes (S1-DEF-01), and that submitting from the saved-draft edit path no longer shows a false failure after a successful save (S1-DEF-03). Automated-fixture coverage only; no hosted Supabase Auth browser walkthrough performed for either fix. | Local run; no CI run recorded for this re-verification since no code changed | Kai Jie |

For manual cases, record preconditions, input values, expected and actual outcomes. For automated runs, link the test files and retain results that show the relevant cases. Track failed cases through their fixes and reruns.

## Sprint 1 review observations — MAN-S1-REVIEW-01

- **Passing demonstrations:** authentication/access, basic draft editing, one validation path, one submission/status path, approval/rejection outcomes, unauthorised access refusal, repeated/conflicting decision refusal, clarification and database setup. These are DEMO-01, 03, 04, 05, 07, 08, 09, 10 and 11 respectively. Record the exact inputs and actor/endpoint combinations when the supporting evidence is attached.
- **S1-DEF-01 / KAN-34:** changing registration from No to Yes while editing a saved draft did not expose the required capacity/date fields. Basic editing passing in DEMO-03 does not resolve this conditional-field failure found during DEMO-02.
- **S1-DEF-02 / KAN-33:** after approval, the request disappeared from the coordinator's available navigation, preventing the final confirmation step. Removal from the pending queue is expected; an accessible follow-up route to assigned approved requests is still needed. The shared detail and confirmation endpoint already exist, so this finding does not establish that confirmation itself is unimplemented.
- **S1-DEF-03 / KAN-6:** conversion of a saved draft to a submitted request was reported unavailable. Existing create/edit submission code and the passing DEMO-05 require reconciliation with the exact failed path/build. Keep the report open until reproduced and retested.
- **S1-DEF-04 / KAN-6:** some incomplete requests submitted without actionable mandatory-field errors. DEMO-04 passed a demonstrated validation path; it does not cover every invalid-field combination or entry path.
- **Closure scope:** KAN-16 and KAN-36 remain Done for their accepted status/outcome and decision slices. The unresolved submission, draft-field and coordinator-follow-up work remains with KAN-6, KAN-34 and KAN-33 in Sprint 2. No partial points were credited to those three stories.
- **Evidence limits:** exact tested build, review completion timestamp, fixture IDs, individual operators and detailed responses were not captured in these notes. A passing demo does not prove every negative case, database row count or concurrency case in the wider acceptance plan. Earlier automated and manual records retain their specific scope.

## 29 September: KAN-56 decided-request access (S2-T20)

- **Purpose:** verify the S1-DEF-02 repair on the hosted Supabase development project: an approved or rejected request leaves the pending queue but stays reachable by its assigned coordinator, while other users stay denied.
- **Preconditions:** local app on branch `feat/KAN-33-decided-request-access` connected to the Supabase development project; a coordinator account (Coordinator A), a second coordinator if available (Coordinator B), and the organiser who owns the test requests. Two synthetic `SUBMITTED` requests (R1 for approval, R2 for rejection) and one `DRAFT`.
- **Steps and expected outcomes:**
  1. As Coordinator A, open **Unassigned requests** (`/reviews/unassigned`) and assign R1 and R2 to yourself. Open **Review queue** (`/reviews`): R1 and R2 appear under the pending queue; the draft does not appear anywhere; **Decided requests** shows its empty state or only earlier decisions.
  2. Open R1 and approve it. Return to `/reviews` via the sidebar. Expected: R1 is no longer in the pending queue and appears under **Decided requests** labelled *Approved*.
  3. Click R1 in **Decided requests**. Expected: `/reviews/<R1 id>` shows the saved approval, no decision radio buttons, and the follow-up/lifecycle panel. Reload the page: the outcome and status persist.
  4. Repeat steps 2–3 with R2, rejecting it with a reason. Expected: listed as *Rejected*; the reason is shown after reload.
  5. Optional API check from the browser console on R1: `fetch('/api/events/<R1 id>/reviews', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({decision: 'REJECTED', reason: 'repeat'})}).then(r => r.status)`. Expected: `409`, and R1 still shows *Approved*.
  6. Sign out and sign in as Coordinator B (if available). Expected: R1/R2 are not in B's queue or Decided requests; opening `/reviews/<R1 id>` directly shows the unavailable message.
  7. Sign in as the organiser. Expected: no Review queue link; `/reviews` shows *Coordinator access only*; `/events` still lists R1/R2 with their outcomes. Optional console check: `fetch('/api/events?scope=history').then(r => r.status)` returns `400`.
- **Result (in progress, 29 September, Irfan):** served build `feat/KAN-33-decided-request-access` at `f67b86f` (code as of `2556e33`; commit IDs after the 1 October message rewrite, identical files), local dev server against the Supabase development project, signed in as Test Event Coordinator. The local dev server needed `NODE_EXTRA_CA_CERTS` set to the local antivirus root certificate to verify Supabase sign-in; this is a machine-specific setting, not an application change.
  - Step 1 — **Passed.** Review queue showed one assigned `SUBMITTED` request (`kj_test`, `dbc2a3f5-5a70-454f-95be-d48a5494f656`); Decided requests listed the coordinator's 6 approved and 2 rejected requests, previously unreachable from the UI. No drafts were listed. Unassigned requests was empty because every non-draft request already had a coordinator (confirmed by a read-only count query).
  - Step 2 — **Passed.** Approved `kj_test` with reason "KAN-56 manual test (irfan)". The page showed Request approved with no decision controls. Back on `/reviews`, the pending queue was empty and `kj_test` appeared first under Decided requests as *Approved*.
  - Step 3 — **Passed.** Opening `kj_test` from Decided requests showed status `APPROVED`, the saved outcome and reason, and no decision controls. A browser reload kept the approval, reason and absent controls.
  - Step 4 — **Passed.** As Test Event Organiser, created and submitted `irfan_kan56_reject` (200 expected attendance). As Test Event Coordinator it appeared under Unassigned requests (with organiser, date and attendance); assigning it to self showed a confirmation and emptied the list. Rejected it with reason "kan_56 reject test": the page showed Request rejected with the reason and no decision controls, and `/reviews` listed it first under Decided requests as *Rejected*.
  - Step 5 — **Inconclusive.** The console `POST /api/events/<kj_test>/reviews` returned `401`, because the browser session was not signed in at that moment (the preceding `/api/auth/me` also returned 401). The write was refused and nothing changed, but the already-decided `409` path was not reached manually. That path is covered by the PostgreSQL case in `authenticated-review.integration.test.ts` (KAN-56 test) and by DEMO-09 in Sprint 1.
  - Step 6 — **Passed.** As Test Event Coordinator 2, the pending queue showed only their own assigned request (`hehe`) and Decided requests showed "No decided requests yet." Opening `/reviews/<kj_test id>` directly showed "This event request is unavailable or you do not have permission to review it."
  - Step 7 — **Passed.** As Test Event Organiser, navigation showed only organiser links; `/reviews` showed *Coordinator access only* with a link to their event requests; the console `GET /api/events?scope=history` returned `400`.
  - **Overall:** S1-DEF-02 repair verified on the hosted development project. Decided requests leave the pending queue, stay listed and reopenable for the assigned coordinator after reload, offer no second initial decision, and remain hidden from another coordinator and from organisers. Step 5 can be re-run while signed in as Test Event Coordinator to capture the manual 409.
  - Note: `kj_test` was Kai Jie's shared test request; its status is now `APPROVED`.
- Screenshots were reviewed in the working session; image files are not stored in the repository.

## 3 October: KAN-51 venue availability calendar (S2-T05/S2-T06)

- **Purpose:** verify on the hosted Supabase development project that only Event Coordinators, Venue Staff and Technical Support Staff can open the calendar, and that it reflects confirmed bookings and blocked periods on the correct venue, day and time.
- **Preconditions:** local app on `feat/KAN-51-venue-availability-calendar` (or `main` after merge) connected to the Supabase development project, with mapped Event Coordinator, Venue Staff, Technical Support Staff, Event Organiser and Attendee accounts. Booking and blocking (KAN-53, KAN-8, KAN-55) are not built, so agree synthetic rows with Arvin before adding them in the dashboard: on one seeded venue in the current Singapore week, an `APPROVED` booking (with `decided_by` and `decided_at`) for an event assigned to the test coordinator, a `PENDING` booking at another time, and a `venue_unavailability` row with a reason. Remove the rows afterwards.
- **Steps and expected outcomes:**
  1. As each internal role, open **Venue availability** from the sidebar. Expected: the current week; the approved booking shows as Booked and the block as Blocked with its reason, both on the right day and time; the pending booking does not appear; the rest of the opening hours show as Available.
  2. Choose another venue. Expected: the first venue's periods do not appear.
  3. Select **Next week**, then reload. Expected: the same week and venue reopen.
  4. Compare roles. Expected: the event's assigned coordinator sees "Assigned to you" with a link to the request; Venue Staff and Technical Support Staff see an anonymous booking.
  5. As the Event Organiser and the Attendee. Expected: no Venue availability link; `/venues/availability` shows the access message without venue data. Optional console check: `fetch('/api/venues/availability?from=2026-10-04T16:00:00Z&to=2026-10-11T16:00:00Z').then(r => r.status)` returns `403`.
  6. Signed out. Expected: `/venues/availability` shows the sign-in prompt, and the same request returns `401`.
- **Result:** Not executed.

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

## 17 September: second organiser cannot read another organiser's requests

- **Tested by:** Tristan, signed in as `Test Event Organiser 2`, using the local webpage and Supabase development project.
- **Direct detail navigation:** Opening the first organiser's request URL displayed `This event request is unavailable or you do not have permission to view it.` No event fields, status or review outcome were displayed.
- **List:** Opening `/events` displayed `No event requests yet`. The first organiser's requests were absent from the second organiser's list.
- **Result:** Both browser ownership checks passed. This adds manual evidence for KAN-16-AC3 / S1-T27 and the unrelated-organiser read portion of KAN-25-AC3 / S1-T03. The existing isolated API tests remain separate evidence for server-side filtering and responses.
- **Boundary:** No HTTP status or response body, forged owner parameters, database-row comparison, write attempt or full role matrix was captured in this run. Draft/submitted list-label and refresh confirmation, signed-out list access and the submission-to-status workflow remain outstanding. No application code changed and no automated tests were rerun.

## 17 September: signed-out organiser list access

- **Tested by:** Tristan, using the local webpage and Supabase development project.
- **Action:** Signed out and opened `http://127.0.0.1:5173/events` directly.
- **Result:** The page showed a sign-in prompt without request names or statuses. This adds manual evidence for the signed-out list case of KAN-16-AC3 and the sign-out UI portion of KAN-25-AC4 / S1-T04.
- **Boundary:** No screenshot, HTTP response, token replay or session-expiry check was captured. Draft/submitted list labels and detail refresh, plus the submission-to-status workflow, still need verification. No application code changed and no automated tests were rerun.

## 17 September: organiser list labels and detail refresh

- **Tested by:** Tristan, signed in as `Test Event Organiser`, using the local webpage and Supabase development project.
- **List:** `/events` showed `Test Event Request 4` as `Draft`, `Test Event Request 3` as `Submitted`, `Test Event Request 2` as `Rejected` and `Test Event Request 1` as `Approved`.
- **Refresh:** The Draft and Submitted detail pages retained their correct status and review message after each page was refreshed.
- **Result:** The four list labels matched the detail-page statuses recorded in MAN-20260917-01/03, and Draft/Submitted detail refresh passed. This adds manual evidence for list/detail label consistency in KAN-16-AC1 / S1-T25.
- **Boundary:** The list capture and refresh observation do not establish a new submission-to-status transition; that remains the outstanding check on the current KAN-16 manual checklist and is awaiting KAN-6 frontend integration. No HTTP response or new database-row comparison was captured. No application code changed and no automated tests were rerun.

## 17 September: coordinator-page access defect and fix

- **Observed by:** Tristan, signed in as `Test Event Organiser`. Review queue was visible in the sidebar and opened a page showing `Test Event Request 4` with `DRAFT` under the submitted-request heading. The screenshot was reviewed but is not retained in the repository. No HTTP response was captured.
- **Cause:** Both review pages mounted for every role. The queue called the shared `GET /api/events` endpoint, whose organiser response correctly contains that organiser's drafts. The frontend rendered this response inside the coordinator page. This observation does not establish access to another organiser's data or permission to record a decision.
- **Fix:** Sidebar/dashboard review links now appear only for a resolved coordinator session. The shared parent for `/reviews` and `/reviews/:id` waits for session restoration and mounts review content only for coordinators. Other roles receive an access message; signed-out visitors receive a sign-in link.
- **Session handling:** Signing out or changing accounts removes the previous review page and aborts pending reads. Late read/decision responses cannot restore previous data or clear the new account's session. A current API 401 returns the page to sign-in. An already-sent decision can still complete on the server; discarding its old UI response does not undo a saved decision.
- **Validation:** The full frontend suite passed 114 tests, including 23 new route-level component cases. Type checks and workspace builds passed. All 27 browser checks passed across three targeted runs, including 10 new access/navigation cases. Browser business APIs use intercepted responses; these checks do not prove hosted login or database authorisation. Existing backend/API and schema behavior is unchanged, so the previously recorded PostgreSQL suite was not rerun.
- **Manual follow-up at this run:** Reload while signed in as the organiser: Review queue and the overview review card should be absent; direct `/reviews` and `/reviews/:id` navigation should show `Coordinator access only` without request data. These checks were pending on 17 September. The organiser queue link and direct `/reviews` recheck passed on 18 September below; this does not record manual verification of the overview card or `/reviews/:id`. The separate KAN-6 submission-to-status integration check is still outstanding.

## 18 September: organiser queue access recheck

- **Tested by:** Tristan, signed in as the event organiser after the fix in `b2f0c2d`.
- **Action and result:** Reloaded the application and checked navigation; Review queue was no longer shown. Opening `/reviews` directly showed `Coordinator access only` without review content. Both requested checks passed.
- **Scope:** This resolves the organiser queue defect from MAN-20260917-07. The overview card, direct `/reviews/:id`, other roles and session-change cases retain their automated evidence; this entry does not establish new manual results for them. The submission-to-status workflow still awaits KAN-6 frontend integration.
- **Evidence:** Written manual observation; no new screenshot, HTTP response or database-row comparison was captured. This follow-up changes documentation only; automated tests were not rerun.

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
| Coordinator route access, navigation and session changes | [ReviewAccessPage.test.ts](../../frontend/src/features/reviews/pages/ReviewAccessPage.test.ts), [review-access.spec.ts](../../tests/e2e/review-access.spec.ts) | AUTO-20260917-07/08; real route definitions with session/API fixtures, non-coordinator denial before event reads, sign-out, account changes, expiry and stale-response protection. MAN-20260918-01 separately passed organiser queue navigation/direct-URL checks; other hosted cases are not established by that recheck. |
| Organiser draft-editing and submit-for-review interface | [EventDraftEditPage.test.ts](../../frontend/src/features/events/pages/EventDraftEditPage.test.ts), [event-requests.spec.ts](../../tests/e2e/event-requests.spec.ts) | AUTO-20260919-01/02/03; response fixtures for form population, PATCH save semantics, not-editable states, the submit-for-review save-then-submit flow, server-message error mapping and the updated organiser-list draft link |
| S1-DEF-01/S1-DEF-03 repair re-verification (registration fields on an existing draft; submit-from-edit-page) | [EventDraftEditPage.test.ts](../../frontend/src/features/events/pages/EventDraftEditPage.test.ts), [EventRequestForm.test.ts](../../frontend/src/features/events/components/EventRequestForm.test.ts) | AUTO-20261001-DRAFT-01; re-run against current main after the 26 September revert, confirming both Sprint 1 carry-over defects are fixed at the component level |
| Venue booking decisions and coordinator outcomes | [booking input](../../backend/test/venues/booking-input.test.ts), [HTTP boundary](../../backend/test/venues/venue-bookings-router.test.ts), [PostgreSQL workflow](../../database/tests/venues/venue-bookings.integration.test.ts), [list components](../../frontend/src/features/venues/pages/VenueBookingsPage.test.ts), [detail components](../../frontend/src/features/venues/pages/VenueBookingDetailPage.test.ts), [browser checks](../../tests/e2e/venue-bookings.spec.ts) | AUTO-20261004-KAN8-01; isolated persistence/concurrency plus fixture UI coverage. Hosted checks and booking submission remain pending. |
| Venue search and approval/calendar integration | [venue search integration](../../database/tests/venues/venue-search.integration.test.ts), [venue availability integration](../../database/tests/venues/venue-availability.integration.test.ts), [availability browser checks](../../tests/e2e/venue-availability.spec.ts) | AUTO-20261004-KAN8-01; combined branch regression, reservation/block boundaries and role-scoped reads. Does not establish all KAN-12/KAN-51/KAN-54 acceptance. |

## Coverage and gaps

| Measurement date / commit | Coverage scope and metric | Measured result | Uncovered behaviour and reason | Follow-up / owner |
| --- | --- | --- | --- | --- |
| 15 October 2026 / `3bd64f8`, documentation-only working-tree changes | Configured unit/component coverage; post-sprint audit AUTO-20261015-01 | Frontend: 94.18% statements, 91.09% branches, 96.42% functions, 96.50% lines. Backend: 79.65%, 83.98%, 76.00%, 80.64% respectively. | Frontend auth/router/shell excluded. Integration and browser passes are separate, not combined coverage. Five independently reproduced defects were missed by existing suites; no mutation or coverage-threshold gate. This is not Sprint 1/2 close coverage. | [Retained summary](coverage-reports/2026-10-15-post-sprint-audit.txt); fixes, regression tests and ownership To agree in Sprint 3 planning |
| 15 September 2026 / `c14eaf4` | Requirements/acceptance coverage | Partial Sprint 1 coverage linked above; no release-wide percentage asserted | KAN-16 organiser list/detail UI and all-status list API remain unfinished. Broader hosted acceptance and later-release features remain outstanding. | Tristan for KAN-16 and review acceptance; respective story owners for remaining features |
| 17 September 2026 / KAN-16 list API change | KAN-16 backend list and regression coverage | AUTO-20260917-01/02 passed; all-status list API now implemented | Organiser list/detail UI and hosted browser acceptance remain unfinished. Backend results do not complete S1-T25/S1-T26 or the story. | Tristan |
| 17 September 2026 / KAN-16 list UI change | Configured frontend coverage subset; not release-wide requirements coverage | 94.93% statements; 91.04% branches; 100% functions; 96.56% lines | Includes events, reviews, system and API client patterns; authentication, shell and all backend code are outside these configured metrics. Remaining gaps include the creation placeholder and fallback error branches. Organiser detail and hosted acceptance remain unfinished. | Tristan for organiser detail; respective owners for other gaps |
| 17 September 2026 / KAN-16 detail UI change | Configured frontend coverage subset; not release-wide requirements coverage | 95.07% statements; 90.56% branches; 100% functions; 97.09% lines | Includes events, reviews, system and API client patterns; authentication, shell and backend code remain outside these metrics. Creation and fallback branches remain gaps. Organiser list/detail is implemented; hosted workflow acceptance is pending. | Tristan for hosted organiser acceptance; respective owners for other gaps |
| 17 September 2026 / `95cd43e` manual follow-up | KAN-16 organiser outcome and refresh portions of S1-T25/S1-T26 | MAN-20260917-01 passed for approved/rejected detail and refresh; rejection reason retained | Other workflow states, submission-to-status and unrelated-organiser/signed-out access remain unrecorded manually. No new automated coverage measurement. | Tristan |
| 17 September 2026 / `fdcf29b` manual follow-up | KAN-16 signed-out detail visibility; KAN-25 sign-out UI | MAN-20260917-02 passed: sign-in prompt shown and request/review information hidden | Signed-out list and unrelated-organiser reads remain unrecorded manually; previous-token reuse was not tested. Other status/submission checks remain pending. | Tristan |
| 17 September 2026 / `e6896f3` manual follow-up | KAN-16 draft/submitted detail portions of S1-T25 | MAN-20260917-03 passed: both statuses and review messages shown correctly | List/refresh checks for these requests, other workflow states, submission-to-status and remaining access checks are not established by the captures. | Tristan |
| 17 September 2026 / `f134288` manual follow-up | KAN-16 unrelated-organiser list/detail visibility; KAN-25 relationship access | MAN-20260917-04 passed: request details withheld and the other organiser's requests absent from the list | Direct API status/body and forged parameters were not captured manually. Draft/submitted list/refresh, signed-out list and submission-to-status checks remain pending. | Tristan |
| 17 September 2026 / `f3e1930` manual follow-up | KAN-16 signed-out list visibility; KAN-25 sign-out UI | MAN-20260917-05 passed: direct `/events` navigation showed a sign-in prompt without request names or statuses | No HTTP response, token replay or expiry check captured. Draft/submitted list/refresh and submission-to-status checks remain pending. | Tristan |
| 17 September 2026 / `09c858e` manual follow-up | KAN-16 list/detail labels and Draft/Submitted detail refresh | MAN-20260917-06 passed: four list labels matched the detail pages; Draft/Submitted status and review messages remained correct after refresh | The submission-to-status workflow is awaiting KAN-6 frontend integration. No new HTTP or database-row comparison. | Tristan |
| 17 September 2026 / coordinator-page access fix, parent `41fb395` | Configured frontend coverage subset; coordinator route/navigation regression coverage | AUTO-20260917-07/08 passed. 95.23% statements; 91.49% branches; 98.57% functions; 97.17% lines | Authentication, shell and backend code are outside the coverage metrics; browser tests separately exercise navigation. Template-only gate behavior is checked through assertions, not a separate coverage row. MAN-20260917-07 hosted recheck and KAN-6 submission-to-status integration remain pending. | Tristan for access recheck; Kai Jie/Tristan for integrated submission/status check |
| 18 September 2026 / `b2f0c2d` manual follow-up | KAN-25/KAN-33 organiser queue navigation and direct URL access | MAN-20260918-01 passed: Review queue link absent; direct `/reviews` showed the coordinator-only message without review content | No new automated coverage measurement. Other coordinator-page manual cases are outside this recheck. KAN-6 submission-to-status integration, peer review and CI remain outstanding. | Tristan and relevant story owners |
| 19 September 2026 / `f1d556f`, `f29da28` (KAN-34, KAN-6 frontend) | KAN-34/KAN-6 organiser interface coverage | AUTO-20260919-01/02/03 passed; draft-editing (`/events/:id/edit`) and "Submit for review" are now connected to their existing backend endpoints | Hosted Supabase Auth browser walkthrough not performed — no provisioned test credentials in this environment. Human code review of these two PRs is not confirmed in this record; both were merged immediately after CI went green. KAN-31 (new-request creation) remains a placeholder. | Kai Jie |
| 1 October 2026 / `dff42ed` (S1-DEF-01/03 re-verification) | KAN-34/KAN-6 carry-over repair coverage | AUTO-20261001-DRAFT-01 passed: 23/23 targeted tests and the full check suite still pass against current main after the 26 September revert; S1-DEF-01 (registration fields) and S1-DEF-03 (submit-from-edit-page) are fixed | This run did not assess S1-DEF-02 (KAN-33, Irfan); its separate KAN-56 result is recorded in MAN-20260929-01 and AUTO-20261001-01. S1-DEF-04 (KAN-6 mandatory-field validation) remains open. Hosted acceptance for S2-T19/S2-T21 is still outstanding — this is automated-fixture re-confirmation, not the Sprint 2 hosted walkthrough. | Kai Jie |
| To record at reviewed release | Statement/branch/function and acceptance-scenario metrics | Measured coverage report and agreed metric definitions to attach | Passing test counts are not a coverage percentage; explain exclusions against the release requirements. | Team to assign |

Include normal, boundary, permission, conflict and failure scenarios where relevant. Explain any coverage shortfall against the course rubric, and distinguish scaffold checks from tests of completed business features.

## 16 October 2026: rebalanced backlog and test-specification validation

**Run ID: AUTO-20261016-DOCS-01.** Environment: local Windows/Python, documentation working tree on `docs/sprint-3-readiness-sync`; parent commit `3bd64f8817b862285b0ba81332b023c3a45c8776`. This is documentation validation, not application execution or story acceptance.

- Compared current Sprint 3/4 cards with the verified 16 October Jira snapshot, checked 63 SP in each sprint, and validated every active criterion's functional-case and traceability links. The temporary read-only `validate-test-docs.py` validator passed **14/14 checks**: **28 active cards / 299 criteria**, **254 case rows** and **76 traceability rows**. Its inputs were the current CSV/Markdown files, the preserved pre-rebalance CSV and the verified Jira data.
- Preserved the original **26 aggregate/audit case rows** and all existing case IDs. The **68 newly specified cases** are **Not executed**. Superseded notification and integrated-journey specifications are explicitly historical; no prior Fail or missing outcome was turned into a Pass. KAN-64/KAN-80 account for **5 + 3 = 8 SP**, with all original notification criteria allocated explicitly.
- Ran the existing temporary `validate_docs.py` link/CSV validator: **927 relative links checked, no errors** at this run. `git -c core.safecrlf=false diff --check` on the changed backlog/test-case/traceability files passed after removing Jira-export trailing whitespace.
- **Boundary:** no product unit, integration, browser, coverage or hosted acceptance tests were run for this documentation change. New features, scheduled hold expiry and customer-change behavior still require implementation and their real test/evidence records.


## 16 October 2026 — Documentation handover and ownership sync

**Run ID: AUTO-20261016-DOCS-02.** Local Windows/Python and spreadsheet artifact-tool checks against documentation working tree on `docs/sprint-3-readiness-sync`, parent commit `3bd64f8817b862285b0ba81332b023c3a45c8776`. This update aligns course/project conventions, simplifies administrative attribution and syncs team self-selection; it is not a product test or acceptance run.

- Fresh Jira read: 68 issues, including 28 unfinished parents, all unassigned; S3 retains 13 parents / 63 SP and S4 retains 15 / 63. All 28 cleaned descriptions read back as the intended course-format cards. Status, points, sprint membership, priorities and assignments are unchanged by this cleanup; all 14 Done parent descriptions are preserved.
- The temporary read-only `validate_course_sync.py` validator passed **17/17 checks**, using the current Jira snapshot, canonical card drafts, exported CSV, sprint cards, functional cases and traceability. It covers **28 active cards / 299 criteria**, **256 cases** and **76 traceability rows**. Four condensed KAN-6/KAN-34 criteria explicitly restore original requirements; the original 254 case rows are preserved and two added specifications remain **Not executed**.
- Workbook source wording and current ownership were refreshed while preserving seven sheets and historical records. Saved readback, totals, native formatting, formulas and changed-view checks are recorded in the validation artifact below. Excel desktop **Not executed**.
- Final relative-link/CSV and whitespace results, current artifact hashes and preservation details are retained in the [handover validation](../scrum/sprint-03/evidence/handover-validation-2026-10-16.json). Earlier validation snapshots remain historical and contain the then-current hashes/owners.

No application source changed, no application suites or hosted acceptance checks were rerun, and no commit or push was performed. Earlier historical evidence gaps remain open.

**Commit preparation — 16 October 2026.** The same documentation was moved to `docs/sprint-3-handover` for the authorised local commit. All 59 staged paths are documentation. The staged whitespace check flags only preserved Jira Markdown hard line breaks inside the three dated CSV exports; their source descriptions are retained verbatim. The check excluding those exports passes. The 17 consistency checks and 971 relative-link checks passed again before staging. See the validation artifact for the exact check scope; no application tests were rerun.

## 17 October 2026 — Historical criteria and submitted backlog reconciliation

**Run ID: AUTO-20261017-DOCS-01.** Local Windows/Python and spreadsheet Artifact Tool verification against the uncommitted documentation on `docs/backlog-reconciliation`, base commit `e724cae97bed70e4cb40fd07ce13fd501168b1ab`. This verifies records and exports, not application behaviour or story acceptance.

- A complete live Jira read returned the same 68 issues and compared source fields as the retained 16 October CSV. No Jira cards or estimates changed. Current inventory remains 42 parents / 174 SP; Sprint 3 and Sprint 4 remain 63 SP each. Administrative Done status remains separate from historical acceptance.
- The dated Sprint 1 mapping covers 79 original functional criteria and five database checks; the Sprint 2 mapping covers 93 original criteria for the nine new stories, 12 refinements and two retained no-automatic-event-rejection safeguards. Historical wording and later customer changes remain distinguishable.
- The temporary read-only `validate_reconciliation.py` checker passed **21/21 checks**: source/export agreement, point totals, complete and unique case rows, criterion-to-case links, preserved results/evidence, existing code/test paths, current Jira wording and changed Markdown links. The current registers contain **398 cases / 95 traceability rows** and cover **301 active criteria** (299 Jira criteria plus two explicitly labelled repository safeguards). New specifications add **142 cases**, all **Not executed**, and 19 traceability rows. Missing legacy summary steps/results were completed as specifications; earlier execution narratives remain in their evidence cells. The original five failed audit cases remain Fail.
- The master workbook preserves all 689 original specification rows, adding three labelled repository supplements and 19 historical story references. Seven sheets, 11 tables, original formulas/styles and point totals were retained. **12/12 native workbook preservation checks passed**, no formula errors were found, and changed views were visually inspected. Excel desktop verification: **Not executed**.
- The [retained validation summary](../scrum/sprint-03/evidence/submission-reconciliation-validation-2026-10-17.json) contains the check results, artifact hashes and exact verification scope. Earlier dated validation artifacts describe their earlier versions.

No product unit, integration, browser, coverage or hosted tests were run. The new case rows are specifications, not 142 newly failed checks or 142 claimed passes. Historical review decisions, attendance, estimation and burndown evidence remain **Not recorded** where sources are unavailable. No application code, database or recorded sprint outcome changed.

## 19 October 2026 — KAN-79 Lead allocation

**Run ID: AUTO-20261019-01.** Branch `feat/KAN-79-lead-assignment`, code/test commit `b3329a78174c0f2e30e263b64436dfbd64c5f44b` (the tested working tree was committed without code changes). Base: `7a23714`, incorporating the approved documentation handover after updating main. Execution date: 19 October, Asia/Singapore. Environment: Windows, Node.js 24, Vitest, Playwright Chromium and a disposable PostgreSQL 17 container on loopback port 55479. Tests use synthetic profiles/data; shared Supabase and real login were not used. No shared migration or data changes were applied.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: tools/backend/frontend type checks; 564 frontend tests (32 files), 937 backend tests (37 files); both production builds |
| `npm run test:coverage` | Pass: the same 564 frontend and 937 backend tests; summary below |
| `npm run test:integration` with explicit disposable `TEST_DATABASE_URL` | Pass: 304 tests, 21 files, including fresh migration 007, upgrade/history preservation, real SQL transactions and signed-token profile mapping |
| `npm run test:e2e -- --workers=4` | Pass: 119 browser tests, including 27 KAN-79 scenarios; API responses use controlled fixtures, not hosted Supabase |

Backend core changed policy files (`auth/user-repository.ts`, `events/assignment.ts`, `events/assignment-router.ts`, `events/submit-request.ts`) have **100% statement, branch, function and line coverage**. Frontend allocation API `assignments.ts` also has 100% across all four metrics. AssignmentPanel, LeadOversightPage, LeadRequestPage and UnassignedRequestsPage each have **100% lines/functions**; branch coverage is respectively **92.59%, 93.33%, 92.77%, 93.06%**. Remaining branches are defensive early-return, null/error-label fallbacks and template combinations. AppShell and auth session are outside the existing coverage glob; explicit navigation/role tests exercise the new paths. `submitted-requests-router.ts` retains pre-existing generic error-forwarding branches (98.31% lines / 97.26% branches). Whole-workspace coverage includes existing unrelated gaps: frontend **94.70% statements / 91.73% branches / 96.60% functions / 97.09% lines**; backend **84.43% / 88.19% / 81.27% / 85.14%**. This is not a claim of complete mutation coverage. Retained summary: [2026-10-19-kan79.txt](coverage-reports/2026-10-19-kan79.txt).

**Behaviour verified:** new valid submissions remain unassigned Submitted even with no eligible coordinator; no automatic assignment/review is created. Trusted profile roles defeat client metadata role spoofing. Only Leads list unassigned Submitted/basic active-event oversight and assign available Event Coordinators. Drafts/closed events are excluded; Leads gain no ordinary review/venue privileges. Legacy coordinator self-allocation is denied. The selected coordinator gains access, unrelated coordinators do not. Concurrent Leads cannot overwrite each other; concurrent target role/availability changes serialize with the eligibility check. Injected failures roll back both current coordinator and history. Existing automatic/manual assignments and migration history are preserved. Browser tests cover explicit target choice, success/history, stale/uncertain outcomes, failed refresh, account/role/route changes and session expiry.

**Earlier failures and resolution:** the first full database run passed 303/304; one timestamp bound mixed Windows and Docker clocks and differed by 1 ms. The assertion now bounds the persisted timestamp using PostgreSQL's clock on both sides, retaining the actor/time checks. The complete rerun passed 304/304. The first full browser run passed 118/119; one existing KAN-16 initial navigation timed out before assertions, with no requests recorded. No product/test relaxation was made; the unchanged full rerun passed 119/119. Coverage and `check` were run again after the final test additions.

**Acceptance boundary:** automated AC1–8 and the local connected part of AC10 pass. AC9 (KAN-65 reassignment and KAN-64 notifications) remains **Not executed**. Hosted role provisioning, migration 007 deployment, real-login persistence, independent peer review, CI on the pushed commits and formal acceptance remain **Not executed** / **Not assessed** as applicable. KAN-79 stays In Progress. Existing future equipment/roster routes remain absent; no test claims those later integrations exist. Use the [KAN-79 hosted verification](README.md#kan-79-hosted-verification) and record a separate actual `MAN-YYYYMMDD-NN` run. Actual work on 19 October is not delivery evidence for the configured 17 October sprint end.

**Documentation/artifact verification:** 12/12 functional-case/traceability/document checks and 14/14 native workbook preservation checks passed; seven diagrams and six changed workbook regions were visually inspected. `npm run submission:prepare` passed. Results are retained in S3-E14. The workbook is a targeted KAN-79 update over the retained 16 October full-project snapshot; its other issue fields are not represented as newly queried. Excel desktop and hosted manual execution were **Not executed**.

## 19 October 2026 — KAN-65 coordinator reassignment

**Run ID: AUTO-20261019-02.** Branch `feat/KAN-65-coordinator-reassignment`, code/test commit `d8f3bc2aee19a608b1a3f57c87e7d5cc7d242d84` (tested working tree committed without code changes), based on `6eb6450` (KAN-79 plus approved documentation handover). Actual execution date: 19 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest, Playwright Chromium and disposable PostgreSQL 17 (`connectsphere-kan65-test`, loopback port 55465). Synthetic profiles/data and signed runtime sessions were used; the test database was not shared Supabase. No new migration or shared database mutation was made.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: tools/frontend/backend type checks, 604 frontend tests in 32 files, 1,035 backend tests in 39 files, both production builds |
| `npm run test:coverage` | Pass: the same 604 frontend and 1,035 backend tests; measured coverage below |
| `npm run test:integration` with explicit isolated `TEST_DATABASE_URL` | Pass: 341 tests in 22 files; new reassignment integration suite 37/37 |
| `npm run test:e2e -- --workers=2` | Pass: 132 tests, including all 13 new KAN-65 browser scenarios; controlled API fixtures, not hosted Supabase |

**Coverage:** frontend 94.79% statements / 92.08% branches / 96.66% functions / 97.14% lines; backend 85.34% / 88.54% / 83.07% / 85.92%. Backend `events/assignment.ts` and `assignment-router.ts` and frontend `api/assignments.ts` are 100% across all four metrics. The new shared-read transaction helper is exercised for success, read failure and connection cleanup; the surrounding workflow-support module retains pre-existing uncovered functions. AssignmentPanel is 95% statements / 96.58% branches / 100% functions and lines; LeadRequestPage 100% / 92.77% / 100% / 100%. ReviewRequestPage retains pre-existing unrelated gaps (86.2% / 88.11% / 90% / 87.5%); the added denied-write refresh path is tested. Remaining coverage gaps and limitations are documented below; these figures do not prove protection against every possible mutation. [Retained full coverage output](coverage-reports/2026-10-19-kan65.txt).

**Verified behaviour:** only a trusted Lead can reassign an existing active request to an available Event Coordinator. The server validates UUIDs, a trimmed nonempty reason (maximum 2,000 characters), and the active history UUID as expected version. All five eligible statuses pass. Draft, terminal, unassigned and inconsistent-history cases are refused. An atomic transaction closes the prior interval and records the replacement, actor, reason and one handover timestamp while preserving event information, review decisions, clarification and existing venue/equipment/registration records. Existing future-feature tables are preservation fixtures, not claims those workflows are implemented.

Same-current-coordinator calls return `changed:false` without duplicate history or event updates; stale versions are checked before this no-op, including A→B→A. Concurrent Leads, target availability/role changes, rollback and PostgreSQL timestamp boundaries are covered. Signed runtime tests verify that the old coordinator loses current-assignment reads/writes and the replacement gains event, review, clarification, venue-booking and suitability access. Six deterministic races verify history reads serialize with reassignment, preventing authorization checked against one assignment from exposing data read after another. Existing Lead restrictions on approval and venue decisions remain.

The interface requires a replacement and reason, agrees detail/history versions before enabling reassignment, preserves history after success, refreshes stale/unavailable target state, and prevents blind retries after uncertain responses. Account/role/route/logout changes discard stale feedback; denied old-coordinator review writes clear inaccessible details. Browser fixtures verify UI behaviour; real SQL/runtime tests verify authorization and concurrency independently.

**Earlier failures and resolution:** the first full database run passed 340/341 because a new test expected nonexistent DTO property `requestedById`; it was corrected to assert the stored `requested_by` value, and the full rerun passed 341/341. Tools typecheck initially rejected potentially undefined array entries in a browser fixture; the fixed two-entry tuple passed root typecheck. Concurrent unrestricted coverage/browser execution caused a 5-second component-test timeout and seven browser timeouts (125/132); failures included initial navigation in unchanged KAN-16/KAN-79 tests. The unchanged coverage rerun and full browser rerun with two workers passed. No product assertion or timeout threshold was relaxed. The focused browser run also corrected an ambiguous status locator before passing all 13 cases.

**Setup confirmation:** the user reported migration 007 applied to Supabase and Coordinator Lead login working. This is setup confirmation, not a recorded MAN workflow run or full deployment acceptance. No credentials were entered or shared data changed by this implementation.

**Acceptance boundary:** manual/hosted checks are deliberately deferred. KAN-79's reassignment dependency is integrated locally; KAN-64 notifications to the organiser and old/new coordinators remain unimplemented and Not executed. Accordingly notification-dependent KAN-65 AC8/AC104 and KAN-79 AC9 are not fully accepted. Peer review, pushed-build CI, merge and formal DoD assessment remain pending. KAN-65 and KAN-88/89/90 stay In Progress; 3 SP unchanged, no velocity credit. Actual 19 October implementation does not establish completion by the configured 17 October sprint end. Use [KAN-65 hosted verification](README.md#kan-65-hosted-verification) later and record the actual MAN date, build, executor, test data and results.

**Changed-code coverage gaps:** AssignmentPanel's remaining uncovered statements include defensive submit exits normally prevented by hidden/disabled controls and existing aborted-read, 401 and non-Error fallbacks. Tests assert that blocked controls cannot submit rather than directly invoke an unreachable Vue handler. LeadRequestPage's remaining branches are existing null-value rendering and error fallbacks. ReviewRequestPage's lower total mainly reflects its existing quiet-refresh helper (child workflow panels are stubbed in page tests); the added access-denial refresh is covered. The existing coverage configuration excludes some shell/auth files and does not merge browser/integration execution into unit coverage; no 100% whole-project claim is made.

**Documentation/artifact checks:** 15/15 functional-case, traceability and document checks passed (427 cases, 112 traceability rows, 579 changed-document file links); native workbook checks passed 16/16. Four updated diagram exports and six changed workbook regions were visually inspected. `npm run submission:prepare` passed; generated draft folders still require the team's evidence-completeness review. The disposable KAN-65 PostgreSQL container was removed after testing. See [S3-E15 validation](../scrum/sprint-03/evidence/kan65-validation-2026-10-19.json). No shared database cleanup was performed.

## 21 October 2026 — KAN-78 buffered venue intervals and KAN-34 draft dates

**AUTO-20261021-KAN78-01.** Executor: Codex in Arvin's approved implementation session. Branch: `feat/kan-78-kan-34`; base HEAD `aaee5498e8140526e6005c4fe5fce0bf95d95f40` plus uncommitted working-tree changes. No implementation commit exists yet. Local Windows, Node 24.21.0, Chromium and isolated PostgreSQL 17.11 on loopback port 55478; each integration file used a disposable schema. The shared Supabase database and existing development servers were not used for these checks.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks, 605 frontend + 1,049 backend tests, both builds |
| `npm run test:coverage` | Pass: frontend 94.84% statements / 91.53% branches / 97.19% lines; backend 85.46% / 88.49% / 86.03% |
| `npm run test:integration` | Pass: 23 files / 356 tests, including 11 KAN-78 real-database cases and strict-date HTTP/persistence tests |
| Playwright: draft editing, venue bookings, availability, search, suitability and booking submission | Pass: 48 Chromium cases, two workers; isolated API 3078 and web 5178 |

Browser response fixtures verify rendering, navigation, registration toggle/save/reload and occupied-time/warning displays; real database rules are verified separately by integration tests. Authentication-required browser cases also contact the normal API startup on the isolated ports. This is not hosted acceptance.

KAN-34 refuses impossible dates on all four editable date fields before writes; valid leap days and explicit clears remain supported. Earlier TC-03-01's 15 October failure remains historical; TC-03-301 is the permanent repaired-code regression. Existing ownership/state and registration-edit regressions were rerun.

KAN-78 checks one occupied-interval rule across five consumers; exact adjacency, buffer-only blocks, opening hours/cross-day limits, live warnings for both sides, unchanged historical rows, zero durations, unrelated venues, access/privacy and concurrent approvals/buffer edits passed. SQL functions and triggers are not instrumented by V8; their behavioural coverage comes from PostgreSQL integration cases. Unit coverage does not instrument every database-backed serialization/warning branch or every existing page path; no claim of 100% new-code coverage is made. The full integration run initially exposed old response/ledger fixtures and transient KAN-65 timing failures under concurrent load. Fixtures were updated for migration 008/additive response fields; the unchanged KAN-65 suite passed 37/37 alone, and the final full suite passed 356/356.

No shared data was created or left behind. Migration 008 was applied only to the disposable local test schemas. KAN-77's settings editor, team coordination/group-chat notice, independent review, hosted checks, final commit SHA and merge remain outstanding; no Done/velocity credit is claimed. The 8/3 SP estimates remain unchanged. No customer requirement was added.

## 21 October 2026 — KAN-78 review follow-up

**AUTO-20261021-KAN78-02.** The pre-commit packet review found that PostgreSQL Date values could lose milliseconds when passed to Date.parse in the extra search opening-hours check. Search now normalises occupied endpoints through iso() first. A permanent regression checks a 10:00:00.600 occupied start against 10:00:00.500 opening time. Backend coverage run passed 39 files / 1,050 tests; lines 86.03%, branches 88.58%. Backend type checking passed. Environment and uncommitted base SHA are unchanged from AUTO-20261021-KAN78-01. No SQL, API contract or browser behaviour was changed beyond preserving timestamp precision; earlier integration and browser runs remain applicable. Independent human review and hosted acceptance remain Not executed.

## 21 October 2026 — committed verification source

The source and tests exercised by AUTO-20261021-KAN78-01/02 are now committed as `0b08802` (KAN-34), `2396cce` (KAN-78 implementation) and `afea8cf` (KAN-78 tests). The combined implementation/test tree is `afea8cf`. Earlier uncommitted-state descriptions accurately record the state when the runs occurred; no test rerun is claimed solely for committing identical content. The documentation commit follows these source commits. Push, PR, Leo Kai Jie's independent review and hosted acceptance remain Not executed.

## 21 October 2026 — KAN-53 and KAN-55 automated evidence mapping (backfill for S2-T11/T12/T17/T18)

**Run ID: AUTO-20261021-01.** Branch `docs/KAN-53-KAN-55-evidence` at `main` commit `aaee549`, with no code changes. Actual execution date: 21 October 2026, Asia/Singapore. Local environment: Windows, Node.js 24, Vitest. PostgreSQL and browser layers are taken from the existing GitHub Actions run [39447691109](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39447691109) on the same commit `aaee549` (push to `main`, 20 October 2026 15:21 UTC), whose disposable PostgreSQL service is not shared Supabase. This entry runs and maps existing tests; it adds no tests and records no hosted or manual result.

| Command / check | Actual result |
| --- | --- |
| Local: `npm test -w @connectsphere/backend --` the six KAN-53/KAN-55/KAN-8 venue booking and block input, conflict and HTTP-boundary files in `backend/test/venues/` | Pass: 126 tests in 6 files |
| Local: `npm test -w @connectsphere/frontend -- VenueBookingPanel.test.ts VenueBlocksPage.test.ts` | Pass: 34 tests in 2 files |
| Local: `npm run check` | Pass: 604 frontend and 1,035 backend tests, type checks, both builds |
| CI 39447691109: `npm run test:integration` | Pass: 341 tests in 22 files, including `venue-bookings` (47), `venue-blocks` (11), `venue-availability` (6), `venue-search` (9), `venue-suitability` (33) and `sprint2-connected` (1) |
| CI 39447691109: `npm run test:e2e` | Pass: 132 browser tests, including all 7 in `venue-booking-submission.spec.ts` (controlled API fixtures) |

**KAN-53 criterion mapping** (`database/tests/venues/venue-bookings.integration.test.ts` unless stated):

| Criteria | Automated tests |
| --- | --- |
| AC1–AC7, AC9, AC10 | "creates a pending booking associated with the correct event and venue (AC1-AC7, AC9, AC10)"; "allows several pending requests for the same event and venue without auto-approving any (AC9)"; `VenueBookingPanel.test.ts` |
| AC8 | "becomes visible to venue staff review and to the coordinator, but not before approval (AC8)"; "shows staff pending requests with timing and requirements…"; browser "submitted booking reaches venue staff and its approved/rejected outcome returns to the coordinator" |
| AC11 | "refuses submission by an unrelated or unassigned coordinator with the same not-found response (AC11)"; organiser/venue staff/technical support/attendee role refusals; runtime "enforces mapped roles, current assignment and private errors"; HTTP-boundary role and unrelated-coordinator cases; browser "running API requires login" and "organiser detail does not mount the private booking panel" |
| S2-T12 robustness | Ineligible event states (rejected/cancelled/completed), missing/inactive venue, forged `decidedBy` refused by `booking-input.test.ts`, conflicting approved booking or operational block refused with no row and no event change, adjacent periods allowed, submission racing a committed approval or block (lock-wait test), browser conflict feedback and uncertain-result refresh without a second write |

**KAN-55 criterion mapping:**

| Criteria | Automated tests |
| --- | --- |
| AC1–AC7 | `venue-blocks.integration.test.ts` "creates a block associated with the correct venue and records the reason (AC1-AC7)", list and delete cases; `block-input.test.ts` (date normalisation, trimmed reason, 2,000-character limit, invalid input); `VenueBlocksPage.test.ts` create/reload/list |
| AC8 | `venue-availability.integration.test.ts` "shows confirmed bookings and blocked periods on the correct active venue to each internal role" and "reflects approved, cancelled and newly blocked periods on the next read" |
| AC9 | `venue-search.integration.test.ts` "KAN-12/KAN-51 search excludes operational blocks and allows adjacent periods" |
| AC10 | `venue-suitability.integration.test.ts` availability check FAIL naming the operational block, with half-open adjacency |
| AC11 | `venue-bookings.integration.test.ts` "rejects approval overlapping an operational block without writing any decision" and submission refusal over a block |
| AC12 | Adjacent-period cases in the blocks, search, suitability and bookings suites |
| AC13 | `venue-blocks.integration.test.ts` role refusals for organiser, coordinator, technical support and attendee (create and delete); `block-router.test.ts` role and authentication cases |

**Gaps (Not executed):** KAN-55 has no browser (e2e) test of the blocks page, so its UI is covered at component level only. There is no automated test of a block being created concurrently with a booking approval; both orders are tested sequentially. AC5's example reasons are free text, so only representative values (maintenance, renovation) are exercised. For both stories the hosted/manual cases (TC-12-201–203, TC-14-201/203/207–211) remain **Not executed** and need a signed-in run under AGENTS.md §5.12.

**Acceptance boundary:** this maps existing automated evidence to the criteria. It does not record a Sprint 2 review decision; acceptance for KAN-53 and KAN-55 remains **Not recorded**, and their Jira Done status and points are unchanged.

## 20 October 2026 — KAN-34 strict draft date validation

**Run ID: AUTO-20261020-01.** Branch `fix/KAN-34-strict-draft-dates`, code commit `1c0b6803a87d71bd8bb5c6670f54844591eb540c` and integration-test commit `97223e5` (tested working tree committed without code changes), based on `aaee549`. Actual execution date: 20 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest. No PostgreSQL test database was available on this machine (no Docker, blank `TEST_DATABASE_URL`), and the shared Supabase database was not used for tests. No migration or shared data change was made.

| Command / check | Actual result |
| --- | --- |
| `npm test -w @connectsphere/backend -- test/events/draft-update-input.test.ts` before the repair | Fail as expected: 15 of the new KAN-34-AC101 cases failed against the `Date.parse` check (impossible dates and non-offset values accepted) |
| `npm run check` | Pass: tools/backend/frontend type checks, 604 frontend tests in 32 files, 1,068 backend tests in 39 files, both production builds |
| `npm run test:coverage` | Pass: the same 604 frontend and 1,068 backend tests |
| `npm run test:integration` | **Not executed**: no isolated test database; the new `KAN-34-AC101` suite in `database/tests/events/update-draft.integration.test.ts` typechecks and is expected to run in the PR's CI build |
| `npm run test:e2e` | **Not executed**: no browser flow changed; CI runs the existing suite |

**Coverage:** `backend/src/modules/events/draft-update-input.ts` is 100% lines (50/50), branches (54/54) and functions (5/5). Workspace totals: frontend 94.79% statements / 92.08% branches / 96.66% functions / 97.14% lines; backend 85.40% / 88.63% / 83.07% / 85.97%, including existing unrelated gaps.

**Verified behaviour:** the parser rejects impossible dates (`2026-02-30`, `2027-02-29`, `1900-02-29`, `2026-04-31`, month 00/13, day 00/32), impossible times and offsets (hour 24, minute/second 60, `+24:00`, `+08:60`), and values that are not ISO 8601 date-times with an offset (no offset, date only, space separator, surrounding whitespace, expanded year, `+0800`, lowercase separators, free text). It accepts real values including `2028-02-29`, `2000-02-29`, `+08:00`, `-05:30`, milliseconds and minute precision, and applies the same rule to all four date fields on create and edit. The written integration case asserts HTTP 400 `INVALID_DRAFT_UPDATE` with the draft unchanged for `2026-02-30`, `2027-02-29` and month 13, and correct storage of `2028-02-29T09:00:00Z` and `2028-02-29T17:00:00+08:00`.

**Acceptance boundary:** KAN-34-AC101 has passing parser-level evidence only; TC-03-05's planned integration run remains Not executed until CI records it. KAN-34-AC1–AC3 hosted/manual cases (S3-T06), independent review and formal acceptance remain **Not executed** / **Not assessed**. KAN-34 stays In Progress at 3 SP with no velocity credit; actual 20 October work is not delivery by the configured 17 October sprint end.

**CI follow-up — 21 October 2026 (Asia/Singapore), PR #37.** GitHub Actions run [39454303308](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39454303308) on head `cc0e49f` (code `1c0b680` and `97223e5` plus documentation). Attempt 1: `npm run check`, migrate, seed and `npm run test:integration` passed, the last with **346/346 tests in 22 files, including the new KAN-34-AC101 HTTP/PostgreSQL suite**. That records TC-03-05 at its planned integration level. Attempt 1's `npm run test:e2e` failed 1 of 132: the existing KAN-79 test `lead-assignment.spec.ts:115` (stale assignment conflict) failed on its first run and on its retry. Playwright's strict mode found two `role="status"` elements, the conflict notice and the queue's "Loading unassigned requests…", during the page's reload. That test fulfils every `/api/` call in the browser and this branch changes no frontend or e2e file, so it does not exercise the KAN-34 change. Attempt 2, re-running only the failed job, passed all steps with 132/132 browser tests. The intermittent KAN-79 locator is reported for its owner and is not changed here.

## 20 October 2026 — KAN-6 detail-page submission field errors

**Run ID: AUTO-20261020-02.** Branch `fix/KAN-6-detail-field-errors`, code commit `2553c75c3d8f43d47bf718ec08c23bf46c81919c` (tested working tree committed without code changes), based on `aaee549`. Actual execution date: 20 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest with jsdom and Testing Library. Tests use synthetic fetch responses; no database, shared Supabase or real login was used.

| Command / check | Actual result |
| --- | --- |
| `npm test -w @connectsphere/frontend -- src/features/events/pages/EventRequestDetailPage.test.ts` before the repair | Fail as expected: 3 of the 4 new KAN-6-AC101 tests failed (the generic "could not confirm" message was shown instead of field errors); the fourth, corrected resubmission, already passed |
| Same file after the repair | Pass: 30 tests |
| `npm run check` | Pass: tools/backend/frontend type checks, 608 frontend tests in 32 files, 1,035 backend tests in 39 files, both production builds |
| `npm run test:coverage` | Pass: the same 608 frontend and 1,035 backend tests |
| `npm run test:integration`, `npm run test:e2e` | **Not executed** locally: no API, schema or database change; CI runs both suites on the PR |

**Coverage:** `EventRequestDetailPage.vue` rose from 87.34% statements / 85.10% branches / 92.85% functions / 90.62% lines to 89.01% / 85.71% / 94.73% / 92.00%; all added lines are covered. The remaining uncovered lines are the existing quiet-refresh helper after a panel save (child panels are stubbed in page tests) and the existing generic fallback for unexpected submission errors. Workspace totals: frontend 94.82% / 92.10% / 96.69% / 97.15%; backend 85.34% / 88.54% / 83.07% / 85.92%.

**Verified behaviour:** a `SUBMISSION_INVALID` response on saved-draft submission shows "Edit the draft to fix these details before submitting:" with one list item per problem, labelled with the detail page's field names (including registration open/close). Missing fields are listed with "Complete this before submitting." and invalid values with the server's message. An unknown field is shown by its key, and the server message is shown when no details are returned. The Draft status, displayed values, Edit draft link and enabled Submit button are retained, and the list clears when the corrected draft is submitted. Existing incomplete, 401, 404/409 and KAN-29 coordinator cases still pass unchanged.

**Acceptance boundary:** component-level evidence only. TC-02-03 (manual comparison of new-request and saved-draft paths against the real API) and the other S3-T05 cases remain **Not executed**; independent review and formal acceptance are **Not assessed**. KAN-6 stays In Progress at 3 SP with no velocity credit; actual 20 October work is not delivery by the configured 17 October sprint end.

## 21 October 2026 — Test documentation standardisation

**Run ID: AUTO-20261021-DOCS-01.** Documentation working tree on
`docs/test-case-standardisation`, based on `aaee5498e8140526e6005c4fe5fce0bf95d95f40`.
Environment: Windows, bundled Python standard library, Git and the existing Node submission script.
Preparation used AI-assisted restructuring and independent source-preservation reviews; the format
change, including AGENTS.md, was approved by Tristan in chat on 21 October. This is a documentation
verification run, not a product test or an acceptance decision.

- Preserved all **427 specification IDs** and original feature, scenario, level, criterion and
  expected-result fields. Separated preconditions, steps and input data using existing source
  wording; unknown authors/creation dates remain **Not recorded**.
- Retained the original combined register byte-for-byte in the
  [21 October archive](archive/test-cases-2026-10-21.csv). The 20 feature-level summaries have no
  execution rows. The 407 detailed-case records retain **30 automated Pass**, **5 audit Fail**
  and **372 Not executed**; no original detailed result or evidence cell was changed.
- Preserved every earlier dated narrative, including failed initial attempts, successful reruns
  and partial manual checks. Existing case-specific passes were imported from the case register,
  not inferred from aggregate suite totals. Unperformed placeholders contain no run/date/build,
  environment or actual outcome.
- Added three missing traceability mappings: current `TC-14-20` / S3-T27, planned `TC-06-32` /
  S4-T16 and explicitly superseded `TC-06-19` / S3-T24. All **427 IDs** now map through **115
  traceability rows**, preserving the 112 original rows. New mappings claim no execution.
- `python -X utf8 dist/test-docs-work/validate.py` passed **18/18 documentation checks** for
  source preservation, schemas, IDs, outcomes, metadata, all 20 core features, file links and
  whitespace. The temporary validator is a local verification helper; its retained results,
  scope and CSV hashes are in [S3-E17](../scrum/sprint-03/evidence/test-documentation-validation-2026-10-21.json).
  The first validator draft treated the five existing `TC-DB-*` infrastructure cases as
  invalid/missing core-feature mappings; that validator assumption was corrected without
  changing the existing infrastructure specifications.
- `npm run submission:prepare` passed. Readback confirmed folder 3 contains byte-identical
  specification, execution, traceability and archived registers. Final package review and
  evidence completeness remain separate from a successful packaging command.

**Not executed for this documentation change:** application unit/component, database integration,
browser, coverage and hosted acceptance tests. No application code, database, Jira fields, story
acceptance, sprint totals or historical completion dates changed. The remaining Not executed cases
include future and historical-baseline specifications as well as manual checks; their count is not
a count of missing implementations. Commit and push remain for separate authorisation.

## 21 October 2026 — KAN-79 test reliability and owned-story audit

**Integration reference correction — 21 October 2026.** The source branch at `599fee6`
used `AUTO-20261021-01` through `AUTO-20261021-07`; the independent KAN-53/KAN-55
record above also used `AUTO-20261021-01`. In the combined branch, this KAN-79 family
is referenced as `AUTO-20261021-KAN79-01` through `AUTO-20261021-KAN79-07`.
The suffixes map one-to-one to the original runs. Execution IDs, dates, outcomes and
raw report hashes are unchanged; S3-E18 retains the explicit alias map. These are
source-branch results, not a rerun of the combined branch.

**Build:** `b93d2cc2bfcac385d87975744650419840c6a4c0`. Tests ran against the working tree based on `259cd17`; the
subsequent test commit contains the same three tested source files. This branch also retains the
approved test-documentation standardisation commit. [S3-E18](../scrum/sprint-03/evidence/kan79-reliability-2026-10-21.json)
records source hashes, exact browser attempts, focused Vitest titles and aggregate results.

The KAN-79 conflict test used an unscoped `role=status` locator. During conflict recovery the
page legitimately renders both the conflict notice and a loading status. Holding the refresh
response reproduces the ambiguity deterministically. The repair scopes the conflict assertion,
checks the pending state, releases the response and waits for the final empty queue. The component
regression now also waits for refresh completion. KAN-79 and KAN-65 logout tests wait for browser
request cancellation and fixture-handler settlement before checking that private data and late
success remain absent. No sleeps, retries, increased timeouts, application changes or migrations
were introduced.

| Run | Command / method | Actual result |
| --- | --- | --- |
| AUTO-20261021-KAN79-01 | Playwright Lead conflict test, held refresh, **old** broad locator, one worker | **1 failed**: strict-mode locator resolved to conflict and loading status elements. This is the retained pre-fix test failure. |
| AUTO-20261021-KAN79-02 | Lead conflict + initial-allocation logout + reassignment logout; `--repeat-each=10 --workers=4` | **30/30 passed**, zero retries. |
| AUTO-20261021-KAN79-03 | Full browser suite; `--repeat-each=3 --workers=4` | **396/396 passed** (132 scenarios × 3), zero retries, skips or flaky results. |
| AUTO-20261021-KAN79-04 | `npm run check` | Types, **604 frontend + 1,035 backend tests** and both builds passed. |
| AUTO-20261021-KAN79-05 | `npm run test:coverage` | Same **1,639 tests passed**; [coverage table](coverage-reports/2026-10-21-kan79-reliability.txt). Frontend statements/branches **94.79% / 92.08%**, backend **85.34% / 88.54%**. |
| AUTO-20261021-KAN79-06 | `npm run test:integration` | **341/341** real PostgreSQL tests passed across 22 files. |
| AUTO-20261021-KAN79-07 | Focused Vitest JSON reports for six component files and `backend/test/venues/booking-input.test.ts` | **142 frontend + 55 backend tests passed**. Exact-title evidence supports the six newly documented existing regression cases. |

**Environment and commands:** Windows, Node 24, Vitest 4.1.11, Playwright Chromium,
disposable PostgreSQL 17. Browser runs used the existing configuration with only a temporary local
override for ports 3089/5189, isolated database connection and report/output locations; retries
remain zero and normal timeouts are unchanged. Local developer servers were left running.
The temporary override is not a project setup change. Commands were:

```sh
npx playwright test --config dist/kan79-reliability/playwright.config.ts tests/e2e/lead-assignment.spec.ts --grep 'stale assignment conflict' --workers=1
npx playwright test --config dist/kan79-reliability/playwright.config.ts tests/e2e/lead-assignment.spec.ts tests/e2e/coordinator-reassignment.spec.ts --grep 'stale assignment conflict|late in-flight|late handover' --repeat-each=10 --workers=4
npx playwright test --config dist/kan79-reliability/playwright.config.ts --repeat-each=3 --workers=4
npm run check
npm run test:coverage
npm run test:integration
npm test --workspace @connectsphere/frontend -- src/features/venues/pages/VenueBookingDetailPage.test.ts src/features/events/pages/EventRequestsPage.test.ts src/features/events/pages/EventRequestDetailPage.test.ts src/features/reviews/pages/ReviewRequestPage.test.ts src/features/reviews/components/ReviewDecisionPanel.test.ts src/features/reviews/pages/UnassignedRequestsPage.test.ts --reporter=json --outputFile=../dist/kan79-reliability/documented-frontend.json
npm test --workspace @connectsphere/backend -- test/venues/booking-input.test.ts --reporter=json --outputFile=../dist/kan79-reliability/documented-backend.json
```

The first database setup attempt preceded PostgreSQL readiness and failed with a connection
termination; after `pg_isready`, migrations 001–007 and seed succeeded. This was a local setup
retry, not a product-test failure. Suite runs were scheduled sequentially to avoid overlapping
full-suite CPU load. Shared Supabase was not used or changed.

**Owned-story audit:** live Jira on 21 October assigns KAN-8, KAN-16, KAN-29, KAN-36,
KAN-65 and KAN-79 to Tristan; KAN-52 was additionally inspected because of earlier implementation
work, although currently unassigned. Reviewed browser/component assertions, deferred-response
handling, teardown, database fixture isolation, deterministic race synchronization and
case/AC/file mappings. Besides the three browser scenarios and the component refresh assertion, no additional concrete timing defect
was identified in the reviewed files. The evidence artifact lists that bounded review scope.
KAN-29 automatic-allocation tests remain a historical baseline superseded by CR-5; current
compatibility tests verify unassigned submission and preservation of prior assignment history.

**Specification and execution changes:** added atomic cases TC-05-46–48 for the three browser
scenarios and TC-13-01/02, TC-06-33/34 and TC-04-07/08 for existing decision recovery,
validation and privacy regressions. Supporting mappings are limited to the assertions actually
present; they do not add customer requirements or establish every linked AC. All original 427
specifications, 115 traceability rows and 407 execution records remain unchanged. New execution
rows retain the pre-fix Fail and each browser repetition separately, plus six case-specific Vitest
passes. Aggregate feature rows and unrelated unperformed cases receive no new Pass.

**Limits:** finite repeated runs cannot guarantee freedom from flakes or all defects. Browser
API/session fixtures prove UI behavior, not hosted authentication or persistence; real database
tests establish their own isolated boundaries. The aborted-write checks do not prove server
rollback after cancellation. Unit coverage has existing exclusions and unexecuted branches;
no application code was added by this repair. Manual/hosted acceptance, KAN-64 integration and
the new branch's pushed-build CI/peer review remain **Not executed** / **Not assessed** as
applicable. No Jira status, story estimate, sprint acceptance or historical completion changed.

**Documentation verification:** 19/19 register, source-hash, attempt-mapping and file-link checks passed; 436 specifications map through 124 traceability rows. The 453 execution rows retain 372 Not executed placeholders, 75 passing attempts and six failed attempts (five earlier product audit cases plus this locator reproduction). These are attempt counts, not feature acceptance totals. Submission packaging passed. The initial helper was adjusted for Git/Windows line-ending normalization and preserved blank AC cells in old aggregate traceability rows; no historical records were rewritten. The disposable PostgreSQL container was removed after testing.

## 21 October 2026 — KAN-52 zero attendance suitability

**Run ID: AUTO-20261021-KAN52-01.** Branch `fix/KAN-52-zero-attendance-suitability`, base `aaee549` (main after PR #35). The tested working tree is committed without further code changes as `560de0e`. Execution: late evening 20 October to early 21 October Asia/Singapore (the runs crossed midnight and are dated by their completion; exact start and end times Not recorded). Environment: macOS arm64, Node.js 24.21.0, Vitest, Playwright 1.63.0 Chromium and a PostgreSQL 17.11 container from `npm run db:up`, using the dedicated `connectsphere_test` database. Tests use synthetic data; shared Supabase and real login were not used. No schema or shared-database change was made.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: tools, backend and frontend type checks; 605 frontend tests (32 files) and 1045 backend tests (39 files); both production builds |
| `npm run test:coverage` | Pass: the same 605 and 1045 tests; `suitability-rules.ts` 100% lines and functions, 98.3% statements, 99.15% branches |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 342 tests, 22 files, including the new KAN-52-AC101 PostgreSQL case |
| `npm run test:e2e` on spare ports (see limitations) | Pass: 132 browser tests; API responses use controlled fixtures, not hosted Supabase |

**Behaviour verified (KAN-52-AC101, TC-11-01, TC-11-07):** an expected attendance of 0 is a known value and is assessed against venue capacity (`Expected attendance (0) fits the venue capacity (N).`), where it previously produced an unknown capacity check and Needs review. A missing attendance still gives an unknown capacity check whose message differs from the 0 case. A negative, fractional or non-numeric value is still unknown. Zero attendance never makes a venue wrongly Suitable: a missing facility, an approved booking, an operational block or an inactive venue still gives Unsuitable, and unconfirmed requirements still give Needs review. Attendance above capacity still fails and exactly at capacity still passes. With a real PostgreSQL row, a stored 0 reaches the API as 0 and assesses Suitable, an approved overlapping booking then makes it Unsuitable, and a stored NULL gives the distinct unknown message. The page shows `0` rather than `Not provided`. The old rule test that grouped 0 with incomplete data was replaced by these cases.

**Changed-code coverage gaps:** none introduced. The two uncovered statements in `suitability-rules.ts` (line 52, an opening-hours edge) are unchanged by this work: coverage was measured before and after the change (98.24% to 98.3% statements, 99.15% branches both). The existing coverage configuration does not merge browser or integration execution into unit coverage; no 100% whole-project claim is made.

**Limitations:** the manual and hosted S3-T17 run (TC-11-07 as written, S2-T09/T10) was **Not executed**; no hosted Supabase session was used. The other S3-T17 criteria were not re-verified by this run beyond what the existing suites cover. Peer review, pushed-build CI and merge are pending. During the first browser attempt the developer's own `npm run dev` processes on ports 3000/5173 were found in a stopped state (`T`), so Playwright's default reuse of those servers waited indefinitely; the suite was rerun with a temporary configuration on ports 3100/5273 that was deleted afterwards and is not committed. Those processes were left untouched.

**Integration reference correction — 21 October 2026:** this source branch used `AUTO-20261021-01`. The combined branch qualifies it as `AUTO-20261021-KAN52-01` to distinguish independent source runs; the source execution dates, build, results and limitations above are retained.

## 21 October 2026 — KAN-6 saved-draft submission field errors

**Run ID: AUTO-20261021-KAN6-02.** Branch `fix/KAN-6-detail-submission-field-errors`, base `aaee549` (main after PR #35). The tested working tree is committed without further code changes as `5766ecb`. Execution: 21 October Asia/Singapore (exact start and end times Not recorded). Environment: macOS arm64, Node.js 24.21.0, Vitest, Playwright 1.63.0 Chromium and a PostgreSQL 17.11 container from `npm run db:up`, using the dedicated `connectsphere_test` database. Tests use synthetic data; shared Supabase and real login were not used. No schema or shared-database change was made.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: tools, backend and frontend type checks; 609 frontend tests (32 files) and 1035 backend tests (39 files); both production builds |
| `npm run test:coverage` | Pass: the same 609 and 1035 tests; `EventRequestDetailPage.vue` 91.89% lines, 88.88% statements, 94.11% functions, 85.71% branches |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 341 tests, 22 files, unchanged service and PostgreSQL submission suites |
| `npm run test:e2e` on spare ports (see limitations), two full runs | Each run: 132 passed, 1 failed. The failure is `lead-assignment.spec.ts` "handles a stale assignment conflict…" (KAN-79) in both runs. All other tests passed, including the new KAN-6-AC101 browser test |

**Behaviour verified (KAN-6-AC101, TC-02-01):** when a saved draft is submitted from its detail page and the server answers `SUBMISSION_INVALID`, the page lists each field's own message (for example `Ends: The end must be after the start.`), merged with any missing fields and shown missing first; a `SUBMISSION_INCOMPLETE` answer also gets one message per field. The draft stays a Draft with its saved values and both its Edit draft and Submit for review actions, nothing is reloaded or cleared, and a corrected resubmission clears the messages and shows Submitted. A field the page has no label for falls back to its raw name. Four of the five new component tests fail against the previous page component (checked), so they guard the repair. AC1–AC7 and attendance 0 were already enforced by the service and by the unit and PostgreSQL suites, which passed unchanged: competing and repeated submission, unrelated actor and wrong-state refusal, whitespace-only mandatory text, equal or reversed event times, and the registration window only while registration is required.

**Changed-code coverage gaps:** the page's uncovered statements are the same eight before and after this change, with only their line numbers shifted: defensive aborted-read exits, the quiet-refresh helper used after planning-panel saves, and the generic "could not confirm" failure fallback. None of the added lines is uncovered. Unit coverage does not merge browser or integration execution; no 100% whole-project claim is made.

**Flaky test found (not changed here):** `tests/e2e/lead-assignment.spec.ts:115` asserts `getByRole('status')` and fails by strict-mode violation while the Lead queue refresh briefly shows two status messages ("This request has changed…" and "Loading unassigned requests…"). It failed in both full runs on this branch and in 2 of 3 full runs on untouched `main` at `aaee549`, yet passed 10 of 10 repetitions alone on both. The KAN-52 full run (AUTO-20261021-KAN52-01, originally AUTO-20261021-01 on that source branch) happened to pass it. The cause is a timing-sensitive locator in the KAN-79 test, not product behaviour changed by KAN-6; it is not fixed by this change and needs its own owner.

**Limitations:** the manual and hosted S3-T05 cases (TC-02-02, -03, -04, -06, -09) were **Not executed**; no hosted Supabase session was used. Peer review, pushed-build CI and merge are pending. The developer's own `npm run dev` processes on ports 3000/5173 were in a stopped state, so the browser suite ran with a temporary configuration on ports 3100/5273 that was deleted afterwards and is not committed.

**Integration reference correction — 21 October 2026:** this source branch used `AUTO-20261021-02`. The combined branch qualifies it as `AUTO-20261021-KAN6-02` to distinguish independent source runs; the source execution dates, build, results and limitations above are retained.

## 21 October 2026 — KAN-64 in-app notification inbox

**Run ID: AUTO-20261021-KAN64-03.** Branch `feat/KAN-64-notification-inbox`, base `aaee549` (main after PR #35). The tested working tree is committed without further code changes as `0e96114`. Execution: 21 October Asia/Singapore (exact start and end times Not recorded). Environment: macOS arm64, Node.js 20.18.0 as reported by `node -v` (Vite warns that it prefers 20.19+; the build and tests still ran), Vitest, Playwright Chromium and a PostgreSQL 17 container from `npm run db:up`, using the dedicated `connectsphere_test` database. Tests use synthetic data; shared Supabase and real login were not used. Migration 008 was applied only to the isolated test schemas the integration suite creates; the shared database was not changed.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: tools, backend and frontend type checks; 635 frontend tests (34 files) and 1079 backend tests (43 files); both production builds |
| `npm run test:coverage` | Pass: the same 635 and 1079 tests; figures below |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 356 tests, 23 files, including the new 15-test notification suite |
| Browser suite (`playwright test`) on spare ports (see limitations) | 144 passed, 0 failed, including the 12 new `notifications.spec.ts` tests. The known intermittent KAN-79 stale-conflict test happened to pass in this run |

**Coverage:** frontend 94.89% statements / 92.13% branches / 96.87% functions / 97.33% lines; backend 86.04% / 89.26% / 84.66% / 86.65%. Backend `notifications/inbox.ts`, `notify.ts` and `trigger-matrix.ts` are 100% on lines and functions; `inbox-router.ts` is 100% lines and functions with 45 of 49 branches. Frontend `state.ts`, `api/notifications.ts` and `NotificationsPage.vue` are 100% on all four metrics; `NotificationBell.vue` 100% / 87.5% / 100% / 100% and `NotificationInbox.vue` 94.8% / 93.54% / 100% / 100%. The frontend coverage configuration did not list `src/features/notifications`, so one line was added to include it. Unit coverage does not merge browser or integration execution; no 100% whole-project claim is made.

**Behaviour verified (AC201 to AC208):** each outcome writes its notifications inside the same transaction as the business change. Submission acknowledges the organiser; a clarification request, an approval and a rejection reach the organiser; the first assignment reaches the organiser and the new coordinator; a reassignment reaches the organiser and the new coordinator and sends the previous coordinator a minimal notice with no event details and no link; a venue booking decision reaches the organiser, the event's current coordinator and the deciding Venue Staff member only. A unique key on recipient and outcome means a retry or an unchanged repeated action adds nothing. A rolled-back action (checked with temporary database triggers) leaves neither the change nor a notification. Every inbox query is scoped to the signed-in caller and re-checks what that caller may still see on every read; unreadable and absent notifications give the same 404. The bell shows the unread count, refreshes every 60 seconds while the page is visible, and the inbox lists newest first (limit 100) with mark one and mark all read. The top bar and inbox fit 320, 360 and 390 px without horizontal scrolling (probed on six routes).

**Mutation check:** the shared visibility rule in `inbox.ts` was broken on purpose and the PostgreSQL privacy tests failed as intended; the rule was then restored and the suite passed again.

**Existing tests changed on purpose:** unit, PostgreSQL and browser tests that asserted "no notifications are created" now assert the new rows (`submit-request`, `lead-assignment`, `reassignment`, assignment, automatic-assignment, clarification, status-history, reassignment and venue-booking suites). `backend/test/sprint-scope.test.ts` no longer lists the four notification routes as absent. Three existing browser specs needed a stub for the bell's `GET /api/notifications/unread-count`, because their fixtures refuse unexpected `/api/` requests; a shared helper `fulfilNotificationBell` was added.

**Earlier failures and resolution:** `LockedEventRequest` lacked the event name, which was added to its type, columns and test fixture. Some message wording and type errors in new tests were corrected. A 320 px overflow in the top bar (6 px) failed the new browser test; a narrower bell, smaller gap and a wrapping breadcrumb at 400 px and below fixed it. No assertion or timeout was relaxed.

**Limitations and acceptance boundary:** the manual and hosted S3-T22 cases were **Not executed**; no hosted Supabase session was used. Migration 008 is **not applied** to shared Supabase and must be coordinated with the team first. The trigger/recipient matrix is a team implementation assumption marked **To agree** in the decision log. AC209 (equipment, significant-change, final confirmation/cancellation and registration triggers) belongs to KAN-80 and is not implemented here. Peer review, pushed-build CI and merge are pending; Jira status Not recorded. The developer's own `npm run dev` processes on ports 3000/5173 were in a stopped state, so the browser suite ran with a temporary configuration on ports 3100/5273 that was deleted afterwards and is not committed.

**Integration reference correction — 21 October 2026:** this source branch used `AUTO-20261021-03`. The combined branch qualifies it as `AUTO-20261021-KAN64-03` to distinguish independent source runs; the source execution dates, build, results and limitations above are retained.

**Case-scope reconciliation — 21 October 2026.** The source CSV marked TC-20-18 and
TC-20-19 Pass. Inspection of the named tests supports sequential deduplication,
event-review/assignment rollback and actor acknowledgements, but does not establish
the complete specifications: TC-20-18 requires concurrent retries and venue-decision
rollback after insertion; TC-20-19 requires overlapping recipient identities.
Their full-case execution placeholders therefore remain **Not executed**. The source
claims remain in provenance; only the supported TC-20-17 privacy result is imported
as a case-level Pass.

## 21 October 2026 — documentation backfill (KAN-51, KAN-31 and KAN-4)

This section only links work that already happened to the current document set. No new test was run for it, and no result below is newer than the runs it cites.

**KAN-51 delivery trail (Ernest).** Commits `4c89da9` (backend), `6ede774` (frontend), `bd71de5` (decision, contract, tests and evidence) and `d33d18c` (CI evidence) were made on 3 October 2026 on `feat/KAN-51-venue-availability-calendar`. [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) was closed on 4 October at 00:55 Singapore time (3 October UTC) without being merged; the same four commits reached `main` in [PR #23](https://github.com/MochaLxtte/ConnectSphere/pull/23), merged as `667c4ef` on 4 October. Arvin's [PR #28](https://github.com/MochaLxtte/ConnectSphere/pull/28), merged 7 October at 01:29 Singapore time (6 October UTC), then fixed calendar navigation and venue selection. The retained 10 October Jira snapshot lists Arvin as assignee and Done; no new Jira check or acceptance is inferred here.

**KAN-51 functional cases.** The 17 October specification left TC-09-201 to TC-09-203 as "Not executed / Not recorded" although the runs below exist. They now cite those runs: AUTO-20261003-01 (local, 6 PostgreSQL cases and 12 browser checks), AUTO-20261003-02 (the same on CI) and MAN-20261006-KAN51-01 (15 interactive checks on an isolated database). The source backfill proposed marking the three cases Pass at that level; the integration correction below retains the full specifications as Not executed because their exact scenario matrix was not run. The runs used the 3 and 6 October fixtures, not the specification's exact values. The hosted Supabase role matrix, peer review and formal acceptance remain **Not executed** / **Not assessed**. The four screenshots and results file of MAN-20261006-KAN51-01 are not in the repository (see the 15 October availability note above).

**KAN-31 and KAN-4 (Sprint 1, Ernest).** Commit `25e7c91` ("Created create event and create draft flows", 19 September 2026, 5 files, +403/−14) added a create-event router and repository (`POST` creating a draft or a submitted request for Event Organisers only, 401 and 403 refusals, required-field check on direct submission), extended the submitted-requests router and the frontend event API, and built the new-request page `NewEventPage.vue` (event name, purpose, description, start and end, expected attendance, venue, accessibility and equipment needs, registration, with an error banner that keeps the entered values). Commit `93e221c` ("Install deps", `package.json` only) is a setup chore, not feature work. Both were brought into `main` by Tristan's [PR #12](https://github.com/MochaLxtte/ConnectSphere/pull/12) on 20 September. In the same PR, `2385beb` removed the superseded `create-event-router.ts` and `event-repository.ts`; creation and draft saving continued through the shared draft service and `NewEventPage.vue`. Tests written for this commit: none are present in it. The Sprint 1 results for these stories are those already recorded (KAN-31 and KAN-4 Done in Jira on review, S1-T05 to S1-T10 listed in the sprint backlog); this backfill adds no new pass result for them. Later behaviour is covered by the current draft and submission suites and by AUTO-20260915-01/02 and AUTO-20261009-KAN59-01 as cited in TC-02.

**Integration case-scope correction — 21 October 2026.** PR #44 originally marked TC-09-201–203 Pass from the earlier capability runs above. Those runs used October fixtures and do not establish the later January 2031 role/venue/period matrix in the complete specifications. The three current execution placeholders remain **Not executed**; earlier observed passes remain linked supporting evidence, not newly claimed executions. GitHub confirms PR #22 closed unmerged on 4 October at 00:55 Singapore time (3 October UTC); PR #28 merged on 7 October at 01:29 Singapore time (6 October UTC). No test date or earlier test outcome is changed.

## 21 October 2026 — KAN-77 venue setup and turnaround durations

**Run ID: AUTO-20261021-KAN77-02.** Branch `feat/KAN-77-venue-buffer-durations`, code commits `1c6851f2f10959a4b555868d0944a092f1f7b747` (backend), `0de505b` (frontend) and `d26f294` (PostgreSQL/browser tests), with the tested working tree committed without code changes, based on `0ce460c`. Actual execution date: 21 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest. No isolated PostgreSQL test database was available (no Docker, blank `TEST_DATABASE_URL`), and shared Supabase was not used for tests. Migration 008 was not applied to any shared database.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks (tools, backend, frontend), 626 frontend tests in 32 files, 1,078 backend tests in 39 files, both production builds |
| `npm run test:coverage` | Pass: the same tests |
| `npm run test:integration` | **Not executed** locally: the migration 008 upgrade test, the 16-case KAN-77 PostgreSQL suite and the updated migration lists in `database.integration.test.ts` typecheck and await the PR's CI |
| `npm run test:e2e` | **Not executed** locally: Playwright would start against shared Supabase, which lacks migration 008. The two new KAN-77 browser tests and updated catalogue fixtures await CI |

**New tests:** backend 43 (input 23, service 14, HTTP 6); frontend 22 (form 14, edit page 8). Seven existing fixtures gained the two fields, and one KAN-50 form-shape assertion now includes them.

**Coverage:** `venue-catalogue-input.ts` 100% lines (74/74), branches (80/80) and functions (10/10); `venue-catalogue-service.ts` 100% (31/31, 16/16, 10/10); `availability.ts` 100%. Frontend `catalogue-form.ts` and the catalogue API client 100%; `VenueCatalogueEditPage.vue` 100% lines and functions, 98.02% branches. Its three uncovered branches are pre-existing KAN-50 defensive guards. `suitability-service.ts` has no unit tests; its two added SQL fields are covered by the PostgreSQL suite. Workspace totals: frontend 94.84% statements / 92.15% branches / 96.67% functions / 97.17% lines; backend 85.56% / 88.72% / 83.33% / 86.14%.

**Verified behaviour (unit/component):** only Venue Staff reach the buffer update. Every other role is refused before any query. Values 0–1440 are accepted. Negatives, 1441, fractions, NaN, infinity, text, null, arrays and a missing expected value are refused with field feedback before a connection opens. A changed buffer is written only when its expected value matches the locked row. A stale value returns `409 VENUE_BUFFER_CONFLICT` and the transaction rolls back with no update. When one buffer is stale and the other is not, the whole request is refused. Edits without buffers are never refused for buffer changes. The edit page shows saved values, sends only changed buffers with their loaded values, explains invalid values per field and disables Save. After a conflict it keeps the typed value and offers a reload that clears the message.

**Gaps:** AC6 **Not executed** (depends on KAN-78; see the [21 October decision](../requirements/assumptions-and-questions.md#21-october-2026--kan-77-buffer-concurrency-and-ac6-dependency)); its only check confirms existing bookings are unchanged. PostgreSQL, migration-upgrade and browser layers await CI. Manual/hosted cases TC-08-15/18/19 are Not executed and need migration 008 applied to shared Supabase first. The `docs/architecture/exports/erd-planning.png` re-export was **Not executed**: a Mermaid CLI render did not match the existing export's styling and layout, so the image was left unchanged. The Mermaid source and `docs/database-diagram.md` are updated.

**Acceptance boundary:** KAN-77 stays In Progress at 2 SP with no velocity credit. Independent review, hosted checks and formal acceptance remain outstanding.

**Integration reference correction — 21 October 2026:** this source branch used `AUTO-20261021-02`. The combined branch qualifies it as `AUTO-20261021-KAN77-02` to distinguish independent source runs; the source execution dates, build, results and limitations above are retained.

**Integration migration reference correction — 21 October 2026:** the preceding KAN-77 source run used `008_venue_buffer_durations.sql`. In the combined branch it is `009_venue_buffer_durations.sql`, with identical SQL and an exact-checksum filename alias for existing developer history. KAN-64 keeps `008_notification_inbox.sql`; source execution claims remain attached to their original build. No shared database migration was applied.

## 21 October 2026 — combined team branch verification

**Activity:** local branch integration under AGENTS.md §7.1. Branch `feat/sprint-3-integration`
contains current main `0ce460c`, PRs #37, #38, #40, #41, #42, #43, #44 and #45,
and local test/documentation head `599fee6`. PR #45's follow-up `2612a07` was included
as `967938d`; it makes the same availability-response assertion change already verified
in `70e6e41`, and that merge has no file-content difference from its first parent.
PRs #37/#38 were still drafts when inspected. Inclusion is not independent review or acceptance.
Exact source heads, test titles, attempt results, timestamps and report hashes are retained in
[S3-E19](../scrum/sprint-03/evidence/team-integration-2026-10-21.json).

**Environment:** Windows, Node.js 24.21.0, Vitest 4.1.11, local Chromium/Playwright and
disposable PostgreSQL 17 (`connectsphere-team-integration`, loopback port 55490).
Browser servers used spare ports 3089/5189 with API fixtures for authenticated workflows;
running-server checks cover the unauthenticated boundary. No shared Supabase data, real
passwords or hosted acceptance were used. Runs occurred on 21 October in Singapore
(report UTC dates are 20 October).

| Run ID | Command / purpose | Actual result and build |
| --- | --- | --- |
| AUTO-20261021-INTEGRATION-01 | `npm run check`; `npm run test:coverage` | Pass on `4835a26`: type checks and both builds; 676 frontend tests / 35 files and 1,165 backend tests / 43 files. Coverage below. |
| AUTO-20261021-INTEGRATION-RED-01 | Focused notification component/state regression reproduction | 21 passed, six failed before the lifecycle repair. Exact HEAD was Not recorded; the reproduction used the merged notification implementation plus the new regression tests. The six failures are retained as execution records. |
| AUTO-20261021-INTEGRATION-02 | Focused notification API, page, bell and state tests | 39 passed after the repair, including eight newly specified lifecycle cases. Exact run HEAD was Not recorded; the final tested working-tree changes were subsequently committed in `2cc762f`. An intermediate 37-pass run preceded two additional unmount variants; it is not a substitute for the final 39-case report. |
| AUTO-20261021-INTEGRATION-03 | Initial database setup and integration before KAN-77 | Fresh 001–008 migration/fictional seed and 362 PostgreSQL tests passed at `cb8443b`; retained as earlier scope, not evidence for venue buffers. |
| AUTO-20261021-INTEGRATION-04 | `npm run test -w @connectsphere/frontend -- src/features/events/pages/EventRequestDetailPage.test.ts` (JSON reporter) | 36 passed on `70e6e41`; exact-title proof for TC-02-10, with both source PRs' server-error behaviours retained. |
| AUTO-20261021-INTEGRATION-RED-02 | Full PostgreSQL suite after adding venue buffers | 379 passed, one failed on `4835a26`. The strict availability-response expectation omitted the newly returned zero buffer fields. The response diff and failure title are retained. |
| AUTO-20261021-INTEGRATION-05 | `npm run test:integration` (JSON reporter, disposable database) | 380 passed / 23 files on `70e6e41`. Migration 009 upgraded the local 001–008 database; fresh, historical and original-filename migration fixtures passed. The availability test now asserts both buffer fields and preserves the full-object, period and role checks. |
| AUTO-20261021-INTEGRATION-06 | `npx playwright test --config dist/team-integration/playwright.config.ts --workers=4` | 147 passed, zero failed, zero retries, one full run. Started from `4835a26`; `70e6e41` was committed during the run, changing only the database test expectation, not application or browser-test files. The runner's completion metadata records `70e6e41`. |

**Coverage:** frontend statements 94.95% (2316/2439), branches 92.26% (2826/3063),
functions 96.9% (564/582), lines 97.34% (1944/1997); backend statements 86.31%
(1343/1556), branches 89.51% (990/1106), functions 84.87% (247/291), lines
86.92% (1223/1407). The changed unread-count state module is 100% across all four metrics.
`NotificationInbox.vue` is 94.31% statements, 93.69% branches and 100% functions/lines;
some compound early-return and error/refresh guard alternatives remain uncovered. The
new cases exercise old-account successes/401s, destroyed views, late unread-count responses
and reset/account changes; they do not claim all concurrency schedules are covered.
Database-only behaviour is verified separately by PostgreSQL tests and is not folded into
the unit coverage percentage. See the [retained coverage summary](coverage-reports/2026-10-21-team-integration.txt).

**Integration repairs and conflict decisions**

- KAN-6: combine PR #38's server-message fallback with PR #42's missing-first, deduplicated
  field list and registration-capacity label. Retain both sources' regression cases and add TC-02-10.
- KAN-64: prevent a pending bulk-read response or stale unread-count request from acting on
  a replacement account or destroyed view. Cancellation and account/version checks keep an
  old 401 from clearing the new session. TC-20-30–37 retain six observed failures plus
  eight successful final attempts; failures are not overwritten.
- Migration collision: keep `008_notification_inbox.sql`; rename the byte-identical venue
  migration to `009_venue_buffer_durations.sql`. The exact-checksum alias accepts an
  already-applied source `008_venue_buffer_durations.sql` without replaying its columns,
  deleting its history or fabricating an applied 009 row. TC-DB-206 covers that upgrade,
  idempotence and rejection of an altered alias checksum.
- Preserve separate test specifications/executions, all source rows and earlier failed/manual
  placeholders. Disambiguate independent source run IDs with KAN-qualified aliases while
  retaining their original IDs/builds in provenance. PR #44's earlier calendar observations
  support its capabilities but do not pass the complete later TC-09-201–203 matrix.

**Records and limits:** the current registers contain 446 specifications, 134 traceability rows
and 476 execution rows: 92 Pass, 12 Fail and 372 Not executed. Six new failures and ten
new passes were appended from exact test-title evidence; aggregate suite totals do not pass
the remaining specifications. Existing complete notification concurrency/overlapping-recipient
cases TC-20-18/19 and hosted TC-20-20 remain Not executed. KAN-79/KAN-65 notification
transactions and privacy now have isolated automated evidence, but their complete hosted
acceptance remains Not executed. KAN-64's recipient matrix is still **To agree**. KAN-77
AC6 and buffered interval/conflict behaviour depend on KAN-78 and remain incomplete.
Migrations 008/009 were not applied to shared Supabase; coordinate both before deployment.
No Jira Done change, sprint acceptance or velocity credit is inferred.

The current API/schema/module/setup documents were reconciled, and C3, class, Lead sequence
and planning ERD PNGs were regenerated and visually inspected. Render/source hashes are
retained with S3-E19. The local disposable container is removed after verification; no
shared test data is left behind. No push, remote merge or PR creation is performed by this run.

**Documentation validation:** 36/36 structural checks pass, including source ancestry, preserved execution metadata/placeholders, unique migration prefixes, CSV schemas/references and 628 local Markdown file links. `npm run submission:prepare` succeeds; all five checked specification/execution/traceability/archive/coverage copies in folder 3 match their repository bytes. This is draft packaging, not a complete submission. The task-owned local PostgreSQL container was removed after the suites.

## 21 October 2026 — KAN-77 source CI follow-up

**Run ID: AUTO-20261021-KAN77-CI-01.** Imported from PR #45 documentation follow-up `6d5af10`. The source narrative below refers to that PR's own migration008 and candidate, not the combined branch. GitHub job118781811818 was checked: all steps succeeded; logs show 626 frontend,1,078 backend,358 PostgreSQL and133 browser tests. CI ran Node24.22.0 and checked out `ea30f897f5f4067c7b041eb84c887b554b4a2cbf` (test merge of source `2612a07` into main `0ce460c`). The source run ID AUTO-20261021-02 is qualified as AUTO-20261021-KAN77-02 for its original local runs; this distinct CI run uses AUTO-20261021-KAN77-CI-01.

**CI follow-up — 21 October 2026 (Asia/Singapore), PR #45.** First run [39466720873](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39466720873) on head `26c78a2`: `npm run check` and coverage passed. `npm run test:integration` failed 1 of 358: the existing KAN-51 calendar test compares whole venue objects and did not expect the new `setupMinutes`/`turnaroundMinutes` fields (AC4 behaviour, not a defect). The other 357 passed, including the migration 008 upgrade test and the 16-case KAN-77 suite. CI stopped before browser tests. Commit `2612a07` added the two fields to that expectation. Re-run [39467271524](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39467271524) on head `2612a07` passed every step: 626 frontend and 1,078 backend tests, integration **358/358**, and browser **133/133**, including both new KAN-77 browser tests. TC-08-16 and TC-08-17 are now Pass at their planned integration level. TC-08-15/18/19 manual cases and AC6 remain Not executed.

**Combined-register scope assessment:** TC-08-17 receives a separate CI Pass execution: the named migration test compares all pre-existing venues, bookings and migration-history rows and verifies idempotence. TC-08-16 retains its complete-specification Not executed placeholder: source CI proves parser/form matrices and selected PostgreSQL/component/browser variants, but not the specification’s complete both-field UI/API boundary/invalid/no-partial-save matrix. Its source Pass claim is preserved above as narrower supporting evidence. No manual result changes. Final registers now contain 446 specifications,134 traceability rows and477 execution rows (93 Pass,12 Fail,372 Not executed). PR #38 is now closed unmerged; its useful behaviour remains integrated alongside #42.

## 21 October 2026 — KAN-81 phase 1 outage recovery

**Run ID: AUTO-20261021-08.** Branch `feat/KAN-81-outage-recovery`, code commits `2f74ede11c3537ed615406bd6d82e8ecd71f837c` (backend), `2f47413` (frontend) and `9e0758f` (PostgreSQL/browser tests), with the tested working tree committed without code changes, based on `4d36883` (sprint 3 integration, PR #46). Actual execution date: 21 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest. No isolated PostgreSQL database was available locally and shared Supabase was not used. Migration 010 was not applied to any shared database.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks, 686 frontend tests in 35 files and 1,205 backend tests in 44 files, both builds |
| `npm run test:coverage` | Pass: the same tests |
| `npm run test:integration` | **Not executed** locally: 18 KAN-81 PostgreSQL cases, the updated KAN-55 case and migration 010 in all migration expectations typecheck and await CI |
| `npm run test:e2e` | **Not executed** locally (Playwright would start against shared Supabase without migrations 008–010); one KAN-81 browser test awaits CI |

**New tests:** backend 40 (outage-impact and block-service 31, HTTP 9) and frontend 10 (blocks page). Updated for the new contract: three KAN-55 HTTP/page fixtures and one KAN-55 integration case (old overlap refusal superseded by CR-2).

**Coverage:** `outage-impact.ts`, `block-service.ts`, `block-router.ts` and `block-input.ts` 100% lines, branches and functions. `VenueBlocksPage.vue` 100% functions and 97.6% lines; its uncovered lines (venue-list failure and block-list 401) are pre-existing KAN-55 code. Workspace totals: frontend 95.19% statements / 92.53% branches / 97.11% functions / 97.63% lines; backend 88.22% / 90.51% / 87.86% / 88.80%.

**Verified behaviour (unit/component):** only Venue Staff create, remove or list recovery. Invalid period or blank reason is refused before a connection opens. Creation locks the venue, inserts the block, records impacts with an idempotent insert and commits, without reading or updating booking rows for a refusal. Removal locks the venue, clears only that block's open flags, deletes the block and reports cleared bookings; a missing block rolls back. The recovery filter accepts only the three states. The page shows affected arrangements and their state per block, a cross-venue recovery list, counts in save/remove messages and, after a network/5xx/unreadable response, refreshes instead of retrying.

**Gaps:** PostgreSQL behaviour (overlap boundaries, ended/pending/rejected/cancelled/other-venue exclusions, unchanged booking/event/history, idempotency and rollback, removal with overlapping outages, AC9 planning effects and both AC10 orders) is written and awaits CI. AC5, AC7, AC8, coordinator-side AC6/AC12, hold cases and the readiness half of AC9 are Not executed. Execution rows for TC-09-xx are added after CI runs the planned integration level.

**Acceptance boundary:** KAN-81 stays In Progress at 8 SP with no velocity credit.


## 21 October 2026 — KAN-81 PR47 review fixes and CI follow-up

**AUTO-20261021-KAN81-CI-01.** Verified [original PR47 CI run 39477344094](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39477344094), job 118816614837, executed 21 October in Asia/Singapore (20 October 18:44–18:51 UTC). Source head `e4ac4fff32720662180c3f82e11bfefa485334d7`; actual checkout/test merge `25c94c5501cd66bf62dcc88efd331f8d01f90e8d` into `4d3688371895c53b88a9379b4bf5256509bf08ec`. Ubuntu, Node 24.22.0, disposable PostgreSQL 17. `npm run check` and `npm run test:coverage`: 686 frontend and 1,205 backend tests, types and builds pass; `npm run test:integration`: 398/398, including the 18-test outage suite; `npm run test:e2e`: 148/148, including the one outage browser scenario. The browser scenario mocks every API: it proves staff rendering/write handling, not hosted integration. No shared database was used. Earlier local “await CI” statements above remain historical; these checked CI results supersede only that pending execution status.

**Case scope.** New reusable TC-09-13–16 specify the event-interval/exclusion, snapshot/idempotence/rollback, independent-removal-history and planning/approval-order behaviors actually exercised by the named PostgreSQL tests. Their case-level Pass rows are appended to `test-executions.csv`. Full TC-09-01–12 specifications remain Not executed: their manual steps, buffer/hold variants, equipment/multiple-arrangement checks, coordinator/replacement/notification/readiness behavior and complete races are not manufactured from suite totals. ACs and original specifications are unchanged; the new cases expose the implemented phase-1 boundary.

**AUTO-20261021-KAN81-REVIEW-01, original failure.** Review on head `e4ac4fff32720662180c3f82e11bfefa485334d7` added a temporary staff-page regression: after another staff member deleted a block, DELETE returned `404 VENUE_BLOCK_NOT_FOUND`; the assertion expected two block GETs but observed one, leaving the stale block visible. 17 existing tests passed, one reproduction failed. This failing attempt is retained as a TC-09-17 execution before its fixed retest.

**AUTO-20261021-KAN81-FIX-01, local retest.** Windows, Node 24.21.0, Vitest 4.1.11. Tested working-tree application/test bytes were committed unchanged as `18ac27d4e26580ef5f8aca519e5cd8ecbc2d1d51`. The change refreshes both blocks and recovery after stale 404/409 as well as uncertain write failures, retaining the definite refusal and submitted input, without retrying. Four permanent variants cover save/removal × 404/409; the focused page suite passes **21/21**. `npm run check` passes **690 frontend + 1,205 backend tests**, types and both builds. `npm run test:coverage` passes the same tests: frontend statements/branches/functions/lines **95.19/92.54/97.12/97.63%**; backend **88.22/90.51/87.86/88.80%**. Existing uncovered workspace code remains; this is not a claim of 100% workspace coverage. Full coverage output is retained in [coverage report](coverage-reports/2026-10-21-kan81-review.txt).

**Diagram and status.** Re-exported `erd-planning.png` directly from the planning Mermaid block with Mermaid CLI 12, neutral theme, white background, size 2600, scale 2; visually checked the recovery entity/relationships and legibility. S3-E20 records the source/export SHA-256 values and reproduction settings. Jira was observed To Do and transitioned to **In Progress** on 21 October; Kai Jie remains assignee and 8 SP is unchanged. No new schema/shared migration or Done/velocity credit. Phases 2/3, KAN-78 buffers, KAN-83 holds, readiness and hosted acceptance remain outstanding. Final pushed-head CI is required before merge; the GitHub check records that result separately from this original-head import.

## 21 October 2026 — KAN-60 required rejection reason

**Run ID: AUTO-20261021-KAN60-01.** Branch `fix/KAN-60-rejection-reason`, base `aaee549` (main after PR #35). The tested working tree was uncommitted at run time; it is committed without code changes and the commit list is in the pull request. Execution date: 21 October 2026, Asia/Singapore. Environment: Linux, Node.js 22.22.0, Vitest, a disposable local PostgreSQL 16.15 database and Playwright with Chromium build 1194. CI uses Node.js 24, PostgreSQL 17 and a newer Chromium build, so the pull request's CI run is the reference run for those versions. Tests use synthetic profiles and data; shared Supabase and real login were not used, and no shared schema or data changed. AI-assisted implementation and test writing; results below are the actual command outputs.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: tools/backend/frontend type checks; 614 frontend tests (32 files), 1054 backend tests (39 files); both production builds |
| `npm run test:coverage` | Pass: the same 614 frontend and 1054 backend tests; summary below |
| `npm run db:migrate`, `npm run db:seed` | Pass: migrations 001–007 applied to the disposable database; development sample data added |
| `npm run test:integration` | Pass: 349 tests, 22 files, including nine new KAN-60 PostgreSQL tests |
| `npm run test:e2e -- --workers=4` | 132 passed, 1 failed: the KAN-79 test `lead-assignment.spec.ts:115` (stale assignment conflict), which also failed in the 20 October `main` CI run for `aaee549` and passed on re-run. It asserts a single `status` element while the queue reload briefly shows a second one; it is unrelated to KAN-60. The new KAN-60 browser test passed. |

All changed KAN-60 files have **100% line and branch coverage**: `review-input.ts` 19/19 lines and 28/28 branches, `review-router.ts` 30/30 and 17/17, `ReviewDecisionPanel.vue` 59/59 lines and 116/116 branches, and the frontend `types.ts` constant. `workflow-support.ts` only gains an exported constant; its uncovered lines are pre-existing. Whole-workspace coverage includes existing unrelated gaps: frontend **94.84% statements / 92.12% branches / 96.69% functions / 97.17% lines**; backend **85.40% / 88.63% / 83.07% / 85.98%**. Retained summary: [2026-10-21-kan60.txt](coverage-reports/2026-10-21-kan60.txt).

**Behaviour verified:** a rejection with a missing, null, empty or whitespace-only reason is refused at the API with `400 INVALID_REVIEW_INPUT`, the message "Enter a reason to reject this event request." and `field: "reason"`, before any database connection is opened (AC1, AC101). In PostgreSQL, the refused rejection leaves the request status, review rows, status history and notifications unchanged (AC3, AC102). A reason longer than the shared 2,000-character workflow limit (`MAX_TEXT_LENGTH`) is refused for either decision with a field-specific error; exactly 2,000 characters after trimming is accepted (AC101). Approval without a reason still saves with `reason: null` (AC4). A decided request still returns `409 REVIEW_ALREADY_DECIDED` (AC102). A valid rejection saves the trimmed reason on the correct review, adds one status transition, and the detail read returns it (AC2). In the browser, Reject marks the reason as required, a blank reason shows an inline error, focuses the field and sends no request, and the corrected reason is shown again after a reload. Six existing integration tests that rejected without a reason were updated to supply one.

**Earlier failures and resolution:** the first integration run passed 347/349. Both failures were in this change's test assertions: one older assertion compared the extended state snapshot (now including history and notifications) with the earlier shape, and the new AC2 test did not allow for the fixture's own creation history row. The assertions were corrected without changing product code; the rerun passed 349/349. The first browser run could not launch Chromium because the local Playwright expected browser build 1243; the installed build 1194 was linked in its place, and the reruns above used it.

**Acceptance boundary:** automated coverage exists for AC1–AC5, AC101 and AC102. AC103 is a records check: KAN-60 remains the single 2-SP correction linked to KAN-36. Manual hosted cases TC-04-03, TC-04-04 and TC-04-05, independent peer review, CI on the pushed commits, merge and formal acceptance remain **Not executed** / **Not assessed**. KAN-60 stays In Progress. This work was carried out on 21 October, after the configured 17 October Sprint 3 end, and is not delivery evidence for that sprint window.

## 22 October 2026 — KAN-60 rebase onto main before the pull request

Branch `fix/KAN-60-rejection-reason` was rebased from `aaee549` onto `main` at `b2820e1` (after PR #47). Only documentation conflicted; the code applied unchanged. Main now keeps case results in `test-executions.csv`, so the KAN-60 TC-04-01 and TC-04-02 passes are recorded there as `EX-KAN60-01-*`, and `test-cases.csv` keeps main's specification-only layout. The run above is renamed **AUTO-20261021-KAN60-01** (it was AUTO-20261021-01, an ID already used by the KAN-53/KAN-55 evidence mapping).

| Command / check | Actual result (22 October 2026, Windows, Node.js 24) |
| --- | --- |
| `npm run check` | Pass: type checks; 700 frontend tests (35 files), 1224 backend tests (44 files); both production builds |
| `npm run test:integration`, `npm run test:e2e` | **Not executed** locally after the rebase (no disposable PostgreSQL available). The pull request's CI run is the reference for the rebased build |

No test case result is changed by this rebase.

## 21 October 2026 — KAN-81 phase 2 coordinator notice and recovery view

**Run ID: AUTO-20261021-09.** Branch `feat/KAN-81-phase-2-notifications`, stacked on the reviewed phase 1 (`30da68a`), code commits `f2491c2827b01a168498f59da807cd13f102b9a6` (backend), `dc24220` (frontend) and `b78f669` (PostgreSQL/browser fixtures), with the tested working tree committed without code changes. Actual execution date: 21 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest. No isolated PostgreSQL database locally; shared Supabase not used.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks, 696 frontend tests in 35 files and 1,210 backend tests in 44 files, both builds |
| `npm run test:coverage` | Pass: the same tests |
| `npm run test:integration` | **Not executed** locally: 5 new KAN-81 phase 2 PostgreSQL cases await CI |
| `npm run test:e2e` | **Not executed** locally; two booking browser fixtures gained `recovery: []` |

**New tests:** backend 5 (notice builder, transactional write, no-coordinator case, recovery serialisation) and frontend 6 (booking page for coordinator and staff, resolved/cleared, unaffected; venue panel marker). Updated for the new field: the KAN-64 notification-type list, the KAN-54 booking row fixture and three frontend booking fixtures.

**Coverage:** `trigger-matrix.ts`, `outage-impact.ts` and `block-service.ts` 100% lines, branches and functions. In `booking-service.ts` every changed line is covered; its uncovered lines are pre-existing read paths covered by PostgreSQL suites.

**Verified behaviour (unit/component):** one notice per affected event to its current coordinator, none for an event without one, multiple bookings of one event listed in one notice, notice written after the impacts and before commit with dedupe key `VENUE_OUTAGE_RECOVERY_REQUIRED:<outage>:<event>`. Booking recovery lists serialise to ISO timestamps. The booking page shows the outage list with role-specific guidance and distinguishes required, resolved and cleared; the coordinator panel marks bookings needing recovery.

**Gaps:** PostgreSQL cases (notice per event, dedupe on reprocessing, recovery visible to staff and assigned coordinator but not another coordinator, inbox link, cleared state after removal) await CI; execution rows will be added after CI. AC7/AC8 (phase 3), holds and readiness remain Not executed. KAN-81 stays In Progress.

**CI follow-up — 21 October 2026, PR #49 (KAN-81 phase 2).** Run [39492721585](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39492721585) (`AUTO-20261021-KAN81-P2-CI-01`, merge `92097c3` of head `8688bf6`) passed check, coverage (696 frontend, 1,210 backend) and migration/seed, but integration failed **402/403**: the new reprocessing case inserted an approved booking into a period it had just blocked at the same venue, which the `venue_bookings_conflict` trigger correctly refused. Browser tests did not run. Commit `f87b59d` moved that case to a second venue; feature code was unchanged. Run [39493384129](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39493384129) (`AUTO-20261021-KAN81-P2-CI-02`, merge `0dd8fb5`) passed every step: integration **403/403** (`venue-outage-recovery` 23/23) and browser **148/148**. Case results are recorded as scoped TC-09-18 (Fail, then Pass), TC-09-19 and TC-09-20 in `test-executions.csv`; the broader TC-09-05/06/12 remain unexecuted.

## 21 October 2026 — KAN-81 phase 3 replacement bookings

**Run ID: AUTO-20261021-10.** Branch `feat/KAN-81-phase-3-replacements`, stacked on phase 2, code commits `e8310367face54ecbec4ef71de4369a6957b5129` (backend), `ac9639e` (frontend) and `981f8ab` (PostgreSQL tests and fixtures), with the tested working tree committed without code changes. Actual execution date: 21 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest. No isolated PostgreSQL database locally; shared Supabase not used. Migration 011 not applied to any shared database.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks, 702 frontend tests in 35 files and 1,228 backend tests in 44 files, both builds |
| `npm run test:coverage` | Pass: the same tests |
| `npm run test:integration` | **Not executed** locally: 13 phase 3 PostgreSQL cases and migration 011 in every migration expectation await CI |
| `npm run test:e2e` | **Not executed** locally; booking browser fixtures gained `replacesBookingId: null`. No phase 3 browser test was added. |

**New tests:** backend 18 (input parsing; request checks and refusals; approval lock order, resolution, cancellation and refusal; rejection) and frontend 6 (replacement choice and request body, omitted field, refusal reload, list marker, booking page link).

**Coverage:** `booking-input.ts` and `outage-impact.ts` 100% lines and branches. In `booking-service.ts` every changed line and branch is covered; its remaining uncovered lines are pre-existing read and error paths covered by PostgreSQL suites. Workspace totals: frontend 95.27% statements / 92.65% branches / 97.16% functions / 97.64% lines; backend 88.65% / 90.84% / 88.60% / 89.12%.

**Gaps:** PostgreSQL cases (link and pending state, approval resolving and cancelling, rejection and retry, second replacement and removed outage refused, concurrent approvals, objective-check refusals, unassigned coordinator) await CI. There is no phase 3 browser test; the panel and page are covered at component level. `docs/architecture/exports/erd-planning.png` was re-rendered from the updated planning Mermaid block with the phase 1 settings (Mermaid CLI 12.0.0, neutral theme, white background, size 2600, scale 2; SHA-256 `ad82ed1d29edd413d4d78fc9baf166389cf67ac662714a87697b9541116b9c9e`) and visually checked: the new `replaces_booking_id` field and "replaced by" self-relationship appear, with no clipping. Holds (KAN-83), buffered intervals (KAN-78) and readiness (KAN-61/CR-6) remain outside KAN-81's implemented scope. KAN-81 stays In Progress.

**CI follow-up — 21 October 2026, PR #50 (KAN-81 phase 3).** Run [39496812442](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39496812442) (`AUTO-20261021-KAN81-P3-CI-01`, merge `cdac7f6` of head `e86cb05`) passed check and coverage (702 frontend, 1,228 backend) and all 35 `venue-outage-recovery` cases, but integration failed **414/415**: the KAN-77 migration-upgrade test compared existing booking rows with a pre-migration snapshot and now also saw the new null `replaces_booking_id` from migration 011. Commit `c0d164c` expects that column; feature code unchanged. Run [39497476638](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39497476638) (`AUTO-20261021-KAN81-P3-CI-02`, merge `fcf0074`) passed every step: integration **415/415** (`venue-outage-recovery` 35/35) and browser **148/148**. Recorded as TC-08-17 (Fail, then Pass) and scoped TC-09-21–23 in `test-executions.csv`; the broader TC-09-07/08/12 remain unexecuted.

## 21 October 2026 — KAN-78 / KAN-34 main reconciliation

**AUTO-20261021-90.** Codex, under Arvin's instruction to open the PR, reconciled `feat/kan-78-kan-34` (source commits through `6a5951c`) with merged main `4d36883`. These checks ran on the reconciled working tree before its merge commit; a later documentation commit is not a new test run. The original branch's migration 008 was never applied to shared Supabase. Shared 008/009 from PR #46 are preserved byte-for-byte; remaining occupied-interval objects now use **012_venue_occupied_intervals.sql**. KAN-34 retains main's already-merged strict offset/date validator, with this branch's extra regressions. KAN-64 notification writes remain inside the booking decision transaction.

Actual local results: `npm run check` passed (678 frontend / 1,180 backend tests, types and both builds); `npm run test:integration` passed 24 files / 395 tests; full Chromium suite passed 149/149 on isolated API 3078/web 5178. Frontend coverage passed with `--maxWorkers=2`: 95.00% statements, 91.75% branches, 97.40% lines. Backend coverage passed: 86.38% statements, 89.32% branches, 86.98% lines. Coverage gaps remain as described in the earlier KAN-78 record; SQL is behaviourally verified through PostgreSQL, not V8 instrumentation. One frontend test hit its 5-second timeout under concurrent coverage load; its final limited-worker coverage run and normal check passed. A warning-display test's text matcher and merged notification/ledger fixtures were corrected before final verification.

The merged KAN-77 editor now returns affected-booking IDs/warnings from the same buffer-save transaction and shows links after save. This is KAN-78's re-evaluation/reporting integration; editor field validation and concurrency policy stay as merged on main. The buffer-save integration case and component warning-display regression passed. Test specifications and case executions use main's separate CSV formats; both histories are retained, with original-source run IDs qualified by branch/build where needed.

Windows, Node 24.21.0, dedicated local PostgreSQL 17.11 on loopback 55478 with per-file disposable schemas, Chromium; response-fixture browser boundaries remain explicit. No test ran against shared Supabase. Migration 010 is **not applied** there. Hosted acceptance and Leo Kai Jie's independent review of this PR remain **Not executed**. No Done/velocity credit is claimed. Final logs are retained under `sprint-03/evidence/AUTO-20261021-90-*.txt`.

## 21 October — reconciled source committed and handed off

AUTO-20261021-90's verified implementation/test content is committed as `2d138be079a74b3714db1e63190591cd26b1f05c`. [PR #48](https://github.com/MochaLxtte/ConnectSphere/pull/48) is open against main with Leo Kai Jie requested. Jira KAN-78/KAN-34 are In Review. The subsequent handoff documentation commit changes records only; no new local test run or independent acceptance is claimed.

## 21 October 2026 — KAN-83 temporary venue holds

**Run ID: AUTO-20261021-KAN83-01.** Branch `feat/KAN-83-venue-holds`, base `aaee549` (main after PR #35). The tested working tree was uncommitted at run time; it is committed without code changes and the commit list is in the pull request. Execution date: 21 October 2026, Asia/Singapore. Environment: Linux, Node.js 22.22.0, Vitest, a disposable local PostgreSQL 16.15 database and Playwright with Chromium build 1194. CI uses Node.js 24, PostgreSQL 17 and a newer Chromium build, so the pull request's CI run is the reference run for those versions. Tests use synthetic profiles and data; shared Supabase, real login and the production `pg_cron` schedule were not used, and migration 008 was not applied to the shared database. AI-assisted implementation and test writing; results below are the actual command outputs.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: tools/backend/frontend type checks; 624 frontend tests (33 files), 1108 backend tests (41 files); both production builds |
| `npm run test:coverage` | Pass: the same tests; summary below |
| `npm run db:migrate`, `npm run db:seed` | Pass on a fresh database: migrations 001–008 applied; development sample data added |
| `npm run test:integration` | Pass: 382 tests, 23 files, including 41 new KAN-83 PostgreSQL tests in `database/tests/venues/venue-holds.integration.test.ts` |
| `npm run test:e2e -- --workers=4` | Pass: 137 browser tests, including 5 KAN-83 scenarios in `tests/e2e/venue-holds.spec.ts`; API responses use controlled fixtures, not hosted Supabase |

New files `occupancy.ts` and `hold-expiry-scheduler.ts` have **100% line and branch coverage**, and every line and branch added or changed in the other KAN-83 files is covered; their remaining gaps were already uncovered on `main` (listed in the retained summary). Migration 008's trigger and `expire_venue_holds()` are exercised by the PostgreSQL tests, which are outside unit coverage. Whole-workspace coverage: frontend **94.94% statements / 92.61% branches / 96.77% functions / 97.19% lines**; backend **87.30% / 89.72% / 86.26% / 87.83%**. Retained summary: [2026-10-21-kan83.txt](coverage-reports/2026-10-21-kan83.txt).

**Behaviour verified (PostgreSQL unless stated):**
- AC1: only Venue Staff place a hold, and only on a pending request. A missing, malformed, zone-less, past or after-start deadline is refused with `INVALID_HOLD_EXPIRY` and nothing is written; a deadline exactly at the booked start is accepted. The database clock decides "past".
- AC2/AC7: the hold keeps its creator, time and deadline; ordinary pending requests stay pending; the coordinator receives one `VENUE_HOLD_PLACED` notice with the deadline in Singapore time, in the same transaction; no notice is written when no coordinator is assigned.
- AC3: overlap with an approved booking (`VENUE_BOOKING_CONFLICT`), another live hold (`VENUE_HELD`) or a block (`VENUE_UNAVAILABLE`), an unapproved event, an inactive or too-small venue, and a period outside opening hours are refused without a hold or notice. A lapsed overlapping hold does not block. Two simultaneous holds for the same period leave exactly one held.
- AC4: a live hold blocks the calendar (shown with its deadline), search, suitability (message names the live hold), new request submission and approval of another request; the database trigger refuses an overlapping approval written directly. Once the deadline passes, before any expiry run, all five consumers treat the period as free and readers see `EXPIRED`.
- AC5/AC6/AC9: approval before the deadline converts the hold into the approved booking with one occupying row; rejection is allowed; after the deadline approval and rejection return `HOLD_EXPIRED` and nothing is revived; the event status never changes. An approval that waited on a row lock past the deadline is refused and expiry then marks the hold; an approval that commits first is not undone by a concurrent expiry run.
- AC8: `expire_venue_holds()` marks overdue holds `EXPIRED` once, including two held for different overdue periods (catch-up), writes one `VENUE_HOLD_EXPIRED` notice each and is unchanged by two further runs. The API scheduler runs it at startup and every minute, never overlaps runs and logs failures without details (unit tests).
- AC10: cancellation needs a trimmed nonempty reason, releases only that hold, keeps its history and notifies the coordinator; a lapsed hold cannot be cancelled; a new operational block releases an overlapping live hold with the reason "Venue unavailable: …".
- AC11/AC12: the assigned coordinator sees the deadline and the expired outcome; another coordinator gets `NOT_FOUND` and an empty list; Venue Staff no longer see expired holds in their queue; unauthenticated, wrong-role and malformed-ID HTTP calls are refused through the mounted runtime. Component and browser tests cover the staff hold and cancel forms, Singapore-time conversion, deadline-after-start guidance, conflict reload without retry, uncertain-outcome refresh and the coordinator's read-only view.

**Earlier failures and resolution:** after adding migration 008, 11 existing PostgreSQL and 9 unit tests failed only because they asserted the exact migration list, calendar period shape (new `heldUntil`) or clash SQL; their expectations were updated to the new contract without changing what they check. Two existing component tests and one browser test asserted the old empty-queue heading, now "No pending or held venue requests". In the new suite, one test used a fixed deadline that fell after its dynamically chosen booking start and was refused correctly; it now uses a relative deadline. One backend typecheck error in a test fake was fixed with a cast. The final reruns above passed. As in AUTO-20261021-01, Chromium build 1194 was linked in place of the expected build 1243.

**Acceptance boundary:** automated coverage exists for AC1–AC12. Not done: buffered occupancy (KAN-78 extends `occupancy.ts`; until then the requested interval is used), in-app display of the stored notices (KAN-64 inbox), migration 008 and the `pg_cron` schedule on shared Supabase (the team must be told first, AGENTS.md §7.3), manual hosted cases TC-14-09, TC-14-14, TC-14-18 and TC-14-19, independent peer review, CI on the pushed commits, merge and formal acceptance. KAN-83 stays In Progress. This work was carried out on 21 October, after the configured 17 October Sprint 3 end, and is not delivery evidence for that sprint window.

## 22 October 2026 — KAN-83 rebase onto main before the pull request

Branch `feat/KAN-83-venue-holds` was rebased from `aaee549` onto `main` at `b2820e1` (after PR #47, KAN-81 phase 1). Main now has migrations `008_notification_inbox.sql`, `009_venue_buffer_durations.sql` and `010_venue_outage_impacts.sql`, so the hold migration is renumbered **`011_venue_holds.sql`** (renumbered again to `013_venue_holds.sql` in the 22 October integration) with unchanged SQL; none of 008–010 redefines `prevent_venue_booking_conflict()` or the `venue_bookings` status check. The run above is renamed **AUTO-20261021-KAN83-01** (it was AUTO-20261021-02, an ID already used by another 21 October run). Code conflicts were resolved by keeping both sides: booking decisions keep the KAN-64 notification write and the KAN-83 hold checks, and operational blocks release overlapping live holds (KAN-83-AC10) before KAN-81 flags affected approved bookings. One KAN-83 unit-test fake was extended to answer the KAN-64 notification read.

| Command / check | Actual result (22 October 2026, Windows, Node.js 24) |
| --- | --- |
| `npm run check` | Pass: type checks; 710 frontend tests (36 files), 1278 backend tests (46 files); both production builds. The first run failed 2 KAN-83-AC5 unit tests because the fake did not answer the KAN-64 notification read; fixed in the test only |
| `npm run test:integration`, `npm run test:e2e` | **Not executed** locally after the rebase (no disposable PostgreSQL available). The pull request's CI run is the reference for the rebased build |

No test case result is changed by this rebase. `class.png` and `erd-planning.png` keep main's exports; re-exporting them with the KAN-83 hold states is **pending**.

## 22 October 2026 — sprint 3 integration 2 (PRs #48–#53)

**Run ID: AUTO-20261022-INTEGRATION2-01.** Branch `feat/sprint-3-integration2` from `main` `b2820e1`, merged in this order: #52 (`fix/KAN-60-rejection-reason`), #49 (`feat/KAN-81-phase-2-notifications`), #50 (`feat/KAN-81-phase-3-replacements`), #48 (`feat/kan-78-kan-34`), #53 (`feat/KAN-83-venue-holds`), #51 (`KAN-12-bug-fix`). Merge commits keep each PR's own commits. Windows, Node.js 24 for local checks; GitHub Actions (Ubuntu, Node.js 24, isolated PostgreSQL 17, Chromium) for the full run. AI-assisted (Claude) integration directed by Irfan.

| Command / check | Actual result |
| --- | --- |
| `npm run check` after #48 | First run failed 1 KAN-81 unit test that pinned the unbuffered outage condition; updated to the occupied interval |
| `npm run check` after #53 | First run: a type error in two KAN-83 fixtures missing KAN-81 fields, then 12 KAN-83 unit tests whose fake did not answer the buffered query; fixtures and fake updated |
| `npm run check` after #51 (`96fe6e6`) | Pass: type checks; 759 frontend tests (36 files), 1354 backend tests (46 files); both production builds |
| CI `verify` (check, coverage, migrate, PostgreSQL integration, browser E2E) | first run [39749788947](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39749788947) on `96fe6e6` failed 2 of 479 PostgreSQL tests (a KAN-78 test still expecting an outage over a turnaround buffer to be refused, and a KAN-81 closed-venue replacement reporting the buffered hours error); after fix `9094ee6`, run [39750396624](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39750396624) passed: 759 frontend and 1354 backend unit tests, coverage, migrations 001–013 on PostgreSQL 17, 479 integration tests and 156 browser tests |

The fix runs KAN-81 replacement suitability before the KAN-78 buffered check and updates the KAN-78 test to the KAN-81-AC2 rule (the outage is saved and the booking flagged).

**Conflict resolutions that change behaviour** are listed in the [22 October decisions](../requirements/assumptions-and-questions.md#22-october-2026--sprint-3-integration-2-decisions). Test changes made only to fit the combined code: `outage-impact.test.ts` (buffered condition), `venue-holds.test.ts` (fake answers the buffered check, KAN-81 fixture fields, parameter order), `database.integration.test.ts` (migration lists 012/013 and new empty booking columns), `VenueBookingHold.test.ts` and `venue-holds.spec.ts` (KAN-81 fixture fields), `venue-search.test.ts` (keeps the integrated tests plus #51's KAN-12-AC101 cases), and the staff-queue heading in `VenueBookingsPage.test.ts` and `venue-bookings.spec.ts`. KAN-78 run IDs are renamed `AUTO-20261021-KAN78-01/02`, including the evidence file names.

**Not executed / not done:** manual and hosted acceptance cases for every story; the combined `class.png`/`erd-planning.png` re-export (Mermaid CLI not available; main's exports kept); applying migrations 010–013 to shared Supabase. No case result in `test-executions.csv` is changed by this run.

## 25 October 2026 — KAN-81-AC3 hold release by buffered interval

**Run ID: AUTO-20261025-KAN81-01.** Branch `fix/KAN-81-hold-buffered-release` from `main` `f0ce5fa`. Actual execution date: 25 October 2026, Asia/Singapore. Environment: Windows, Node.js 24, Vitest. No isolated PostgreSQL database locally; shared Supabase not used. See the [25 October correction](../requirements/assumptions-and-questions.md#25-october-2026--kan-81-outages-release-holds-by-their-buffered-interval).

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks; 759 frontend tests (36 files), 1354 backend tests (46 files); both production builds |
| `npm run test:integration` (three new `KAN-81-AC3` cases in `venue-holds.integration.test.ts`: setup-only and turnaround-only outages release the hold; exactly adjacent outages leave it live) | **Not executed** locally (no disposable PostgreSQL). The pull request's CI run is the reference |

No test case result in `test-executions.csv` is changed by this run.

**CI follow-up — 25 October 2026, PR #55 (KAN-81 AC3 hold fix).** Run [40141272223](https://github.com/MochaLxtte/ConnectSphere/actions/runs/40141272223) (`AUTO-20261025-KAN81-CI-01`, merge `f2b1ece` of head `d870cf6`) passed every step: check and coverage, migrate, seed, integration **482/482** (`venue-holds` 44/44, including the three new `KAN-81-AC3` cases) and browser **156/156**. Recorded as scoped TC-09-24 in `test-executions.csv`; the broader TC-09-03 remains unexecuted.

## 25 October 2026 — KAN-60 and KAN-83 manual hosted runs

**Run IDs: MAN-20261025-KAN60-01 and MAN-20261025-KAN83-01.** Executed 25 October 2026, 18:05–18:35 Singapore time, by Irfan with AI assistance (Claude driving Chrome through the Claude in Chrome extension). Build: `main` at `2f056bf` (after PR #55), run locally with `npm run dev` (Vite on 5173, API on 3000) against the **shared Supabase development database**. A read-only check of `schema_migrations` showed migrations **001–013 already applied** there; `pg_cron` is **not** enabled. Accounts: the mapped test accounts for Organiser, Organiser 2, Coordinator Lead, Event Coordinator, Event Coordinator 2 and Venue Staff. Case results are in [test-executions.csv](test-executions.csv) (`EX-MAN60-01-*`, `EX-MAN83-01-*`).

**Synthetic data created (left in place, labelled):** events "TEST – Irfan manual QA – A (KAN-60 reject)", "– B (KAN-83 hold)", "– C (KAN-83 second event)" (all 10 March 2027, 14:00–16:00) and "– D (draft, KAN-60 guard)"; Rooftop Terrace bookings for B (one EXPIRED, one APPROVED) and C (one CANCELLED by staff, one PENDING for 10 March, one CANCELLED by outage for 11 March); their notifications. **Restored:** Rooftop Terrace setup/turnaround set to 30/30 for the run and returned to 0/0 (confirmed in the database); the test outage block (11 March 13:30–14:00) was removed through the Venue Blocks page.

**KAN-60 (S3-T07).** Organiser submitted A–C; the Lead assigned them to Event Coordinator.
1. Reject A with an empty reason, then spaces only (form fill and typed): "Enter a reason to reject this event request." shown, nothing written.
2. Reject A with a reason padded by spaces: saved trimmed; status history Draft → Submitted → Rejected only.
3. Approve B and C without a reason: saved with `reason` NULL.
4. Organiser reload: A shows Rejected with the reason; B shows Approved and "No reason provided."
5. Organiser 2 opening A, Coordinator 2 opening B's review, and any coordinator opening draft D: refused. Decided A offers no second decision. Database afterwards: A 1 review / 3 history rows; D 0 reviews / 1 history row.

Result: TC-04-03, TC-04-04 and TC-04-05 **Pass**. TC-04-06 (records check) remains Not executed.

**KAN-83 (S3-T26).** Coordinator requested Rooftop Terrace for B; Venue Staff set 30/30 buffers.
1. Hold deadline in the past and at 13:45 (after the 13:30 buffered start): refused. Deadline 18:16 accepted; booking shows Held with occupied 13:30–16:30.
2. Coordinator sees "Held until … 6:16 pm (Singapore time)" and a "Venue hold placed" notice with the deadline.
3. Event C request for 14:00–16:00 and for 16:00–17:00 (turnaround overlap only): refused with "The venue is temporarily held for another request during this period."
4. 18:16:00: B still HELD in the database but past its deadline; C's 14:00–16:00 request at 18:16:15 succeeded.
5. 18:16:58: the running API scheduler marked B EXPIRED; one "Venue hold expired" notice; staff and coordinator views show the expired outcome with no approval or renewal.
6. C held, then cancelled: Cancel hold disabled with an empty reason; with a reason, cancelled and shown.
7. B re-requested, held and approved: same row APPROVED, reserved buffers 30/30.
8. C requested for 11 March, held; an outage block 13:30–14:00 (setup only) cancelled the hold with "Venue unavailable: …" and notified the coordinator.
9. Organiser opening a booking page: refused.

Result: TC-14-08, -11, -12, -13, -14, -17, -19 **Pass (scoped)** and TC-14-18 **Pass**. Scoped means the steps listed in each row's remarks were not exercised, so the full case stays open. TC-14-15 **Blocked**: there is no deployed API and `pg_cron` is not enabled, so KAN-83-AC8's production schedule is not operational in the shared environment. TC-14-09, -10 and -16 were not executed in this run.

**Findings (not fixed in this run):**
- **KAN-81-AC3/AC7:** a hold released by an outage gets no `venue_outage_impacts` row; the Venue Blocks page shows "No bookings currently need recovery", so no replacement is offered for that event. PO decision needed: release only, or flag for recovery.
- **KAN-83 UI:** the hold deadline hint says "no later than the booking start (2:00 pm)" although the server limit is the buffered start (1:30 pm).
- **KAN-36/KAN-60 UI:** the coordinator review page shows proposed start/end as raw UTC ISO strings (for example `2027-03-10T06:00:00.000Z`).
- **KAN-78 UI:** the catalogue's affected-bookings list shows "— OUTSIDE_OPERATING_HOURS" with no event name.
- **Records:** migrations 010–013 are applied on shared Supabase, although earlier notes (including the 22 October integration record) say they are not.

**25 October 2026 — follow-up to MAN-20261025-KAN83-01:** the finding that an outage-released hold gets no KAN-81 recovery record is resolved by a PO clarification, not a code change: holds are released, only approved bookings are flagged (see the [decision log](../requirements/assumptions-and-questions.md#25-october-2026--kan-81-holds-hit-by-an-outage-are-released-not-flagged)). The observed behaviour in steps 8 of that run and TC-09-24 therefore matches the clarified KAN-81-AC3. No case result is changed.

## 25 October 2026 — re-verification on main and Sprint 3 record review

**Run ID: AUTO-20261025-01.** Branch `docs/KAN-6-KAN-52-KAN-64-records-backfill`, base `main` at `96a0d1001017f66281ad4828c48ac1a32109399b` (merge of PR #56), no code changes. Execution: 25 October 2026, started about 20:36 Singapore time (exact end Not recorded). Environment: macOS arm64, Node.js 24.21.0 (via nvm; the shell default is 20.18.0), Vitest, Playwright Chromium on spare ports 3100/5273 because the developer's own dev servers hold 3000/5173, and PostgreSQL 17 from `npm run db:up` (Compose, database `connectsphere_test`). Synthetic data only; no shared Supabase or real login. This run supplements AUTO-20261021-KAN64-03, which ran on Node 20.18.0.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks and both builds; 770 frontend tests (36 files) and 1354 backend tests (46 files) |
| `npm run test:coverage` | First run: 1353 of 1354 backend tests passed; `block-router.test.ts` "returns 404 for a missing block on delete" received 401 instead of 404. The file passed 5 of 5 times alone and the full rerun passed 770 and 1354. Cause **Not assessed**; the symptom differs from the earlier "Expected HTTP/" parse errors, and an answer from another local listener is plausible but unproven. Coverage of the passing run: frontend 95.32% statements / 92.42% branches / 97.48% functions / 97.57% lines; backend 89.56% / 91.48% / 89.44% / 89.89% |
| `npm run test:integration` with the local `TEST_DATABASE_URL` | Pass: 482 tests in 26 files |
| Browser suite on spare ports | Pass: 156 tests. The known intermittent KAN-79 stale-conflict test passed in this run |

**What this run credits at case level.** Two failures from the 15 October audit now have appended retest rows in `test-executions.csv`: TC-08-01 (KAN-50-AC101, Ryan's PR #56, component level with a mocked API) and TC-10-01 (KAN-12-AC101, Ryan's PR #51, unit and component level). Manual cases such as TC-08-14 stay **Not executed**.

**Why the other KAN-6, KAN-52 and KAN-64 cases stay Not executed.** Each case's steps were compared with the automated tests that exist. A suite pass does not establish a case (section 6.1), so only a test whose scenario matches the specification counts.

| Case | Planned level | Closest automated tests | Gap against the specification |
| --- | --- | --- | --- |
| TC-02-02, -04, -06, -09 (KAN-6) | manual | `submit-request` service and PostgreSQL suites, `submit-input.test.ts`, the KAN-6-AC101 component and browser tests | Specified as manual runs on a hosted build with named fixtures O1/O2; the automated tests prove rules, not that hosted run |
| TC-02-03 (KAN-6) | manual | `EventRequestForm.test.ts` (new-request path) and the KAN-6-AC101 detail-page component and browser tests | Both paths are covered with substituted API responses; the specified run on equivalent drafts against a real server, correcting and resubmitting once, is not done |
| TC-11-02, -04, -05, -06 (KAN-52) | manual | `suitability-rules.test.ts`, `venue-suitability.integration.test.ts`, `venue-suitability.spec.ts` | Manual assessment by a coordinator on a hosted build is the specification; the automated checks cover the rules and the stale-context refusal |
| TC-11-03 (KAN-52) | integration | `venue-suitability.integration.test.ts` (attendance 50 at capacity 50 is Suitable; capacity 49 fails) | The specified 51-against-50 over-capacity case is asserted in rules-level tests only, not through PostgreSQL |
| TC-11-07 (KAN-52) | manual | AC101 rules, PostgreSQL and component tests (AUTO-20261021-KAN52-01) | The manual run and the hosted check are not done |
| TC-20-12 to -16 (KAN-64) | manual | `notification-inbox.integration.test.ts` journey, `NotificationsPage.test.ts`, `NotificationBell.test.ts`, `notifications.spec.ts` | Manual hosted runs with fixtures O1, O2, C1, C2, L1 are not done; browser tests use substituted API responses |
| TC-20-18 (KAN-64) | integration | Rollback through temporary triggers, repeated outcome ignored | The specified concurrent retry of the same outcome key is not tested; the repeat in the tests is sequential |
| TC-20-19 (KAN-64) | integration | Recipient matrix unit tests and the PostgreSQL journey | Acknowledgements where the actor is the recipient are tested (submission, venue decision); one person matching two different recipient rules for the same outcome (for example the organiser who is also the event's coordinator) is not tested |
| TC-20-20 (KAN-64) | regression | none | A documentation trace against KAN-80 and the change stories was not performed |

**KAN-51 correction.** The 21 October backfill section above says TC-09-201 to TC-09-203 are Pass at local, CI and isolated level. The combined branch's scope assessment is the stricter and correct reading: they remain **Not executed** as complete specifications because the 3 and 6 October runs used different fixtures from the 12 January 2031 matrix. The run IDs cited there describe capability evidence only. No execution row was created for those three cases.

**KAN-31 and KAN-4 (Sprint 1).** Commit `25e7c91` (19 September 2026, 23:35 Singapore time) and `93e221c` are described in the 21 October backfill section. For the Sprint 1 cases TC-02-201 to TC-02-221 and TC-03-201 to TC-03-217, the sources show only a Jira Done status on 21 September and the 19 September review. The review's DEMO-02 (create and save an incomplete draft, reload, show persisted values) recorded the registration-toggle defect S1-DEF-01 and no separate pass for creation or saving, and S1-T05 to S1-T10 in the Sprint 1 backlog read "Not executed". No case-level result is therefore appended; the placeholders stay **Not executed**. Today's `create-draft` unit and PostgreSQL suites and `NewEventPage`/`EventRequestForm` component tests passed in this run, but they post-date Sprint 1 and are not credited to it.

**Ryan's pull requests (documentation added 25 October from git and GitHub).**
- **PR #51, KAN-12** `feat(KAN-12): Date Bug Fix and Changes For New ACs` by Ryan (`ryanc9029`), merged 22 October 2026 as `96fe6e6`. Commits `1ae595e`, `d8f7f5d`, `2d0fe72`, `2ce0aca`, `8031800` and merge `2f17629`; 5 files, +782/−499. It makes the search service refuse impossible calendar dates (30 February no longer becomes 2 March), adds per-field period errors and a pre-send period check to the search page and API client, and rewrites the venue-search tests as TC-VS-01 to 46 tagged by AC. The 22 October integration kept only its strict ISO 8601 validation; other changes in the PR were not taken (decision 6 in the 22 October decision log). Retest: TC-10-01 above.
- **PR #56, KAN-50** `feat(KAN-50): Bug fix for saving venue in Venue Catalogue` by Ryan, approved by Mochs and merged 25 October 2026 as `96a0d10`. Commits `a688fb1`, its revert `5fbd2d5` and the re-applied `6f62953`; 2 files, +240/−6. A late response from a save of venue A could replace venue B's editor and send the next save to A. `VenueCatalogueEditPage.vue` now fixes the target venue and payload before the request, gives each save its own abort controller, cancels it when another venue is opened, the page reloads, the account changes or the page is left, and lets only the current save clear the busy flag. `load()` now checks for cancellation before applying the venue. The server may still store A's change; only the interface response is discarded. 11 new `KAN-50-AC101` component tests. Retest: TC-08-01 above. The branch name and revert were left as found.
- Earlier commits by Ryan (authentication, KAN-12 search, 12 September to 4 October) are recorded in the 21 October attribution note in the Sprint 3 daily progress.
- Review outcome and Jira status for these pull requests beyond the GitHub approval on #56 are **Not recorded**.

## 25 October 2026 — Arvin KAN-78 and KAN-34 documentation reconciliation

**AUTO-20261025-ARVIN-01 — imported CI evidence, not a new local run.** Read back [main CI run 40192394546](https://github.com/MochaLxtte/ConnectSphere/actions/runs/40192394546) for `96a0d1001017f66281ad4828c48ac1a32109399b`. Its `verify` job ran **25 October 20:17:54–20:26:05 Singapore time**, on Ubuntu with Node 24, disposable PostgreSQL 17 and Chromium. All required steps passed: install, types/tests/builds, coverage, migrations 001–013, seed, integration and browser checks. The retained [CI excerpt](../scrum/sprint-03/evidence/AUTO-20261025-ARVIN-01-ci.txt) and [source metadata](../scrum/sprint-03/evidence/arvin-reconciliation-2026-10-25.json) identify the exact run; no shared database was accessed during this reconciliation.

| Measurement | Recorded result on the whole main build |
| --- | --- |
| Unit/component suites | 770 frontend and 1,354 backend tests passed |
| PostgreSQL | 482 passed; owned `venue-buffers.integration.test.ts` 11/11 and `update-draft.integration.test.ts` 19/19 |
| Browser | 156 passed; named KAN-34 registration-toggle/save/reopen/clear test passed |
| Frontend coverage | 95.32% statements, 92.42% branches, 97.48% functions, 97.57% lines |
| Backend coverage | 89.56% statements, 91.48% branches, 89.44% functions, 89.89% lines |

The totals cover the whole integrated build and are not attributed solely to Arvin. Case-level imports are limited to existing `TC-03-301/302` and `TC-14-301`–`TC-14-307`, whose assertions and passing source suites were inspected. The KAN-34 browser case substitutes API responses; its PostgreSQL suite separately verifies real persistence. Hosted groups S3-T06/S3-T19 remain **Not executed**; story acceptance **Not assessed**. SQL functions/triggers are tested behaviourally, not instrumented by V8. Configured coverage excludes some runtime areas and is below 100%; no claim of complete requirement or new-code coverage is made.

**Review and merge provenance.** Leo Kai Jie requested changes on PR #48 on 21 October 05:21 Singapore time. Irfan approved on 22 October 17:00 after resolving the migration collision, permitted outages, buffered recovery, queue filtering, run-ID collisions and replacement-check order in PR #54. PR #54 merged as `f0ce5fa`; PR #48's merge record is `708b6a0`, both on 22 October around 17:08. Leo's requested post-integration re-review is **Not recorded**, and the PR #54 review itself is not an additional independent approval. Earlier changes-requested, local runs and the failed integration run remain retained.

**Current contract.** Migration 009 supplies venue durations; 012 adds approval snapshots and interval/hours/warning helpers; 013 later extends occupancy/guards to live holds. KAN-81 permits outages over approved bookings and flags buffered overlaps. `TC-14-303` is clarified to distinguish that reverse write from refusing a new booking/approval against an existing outage. The 25 October hosted KAN-83 record reports migrations 001–013 applied to shared Supabase, but does not establish Arvin's complete hosted acceptance. Its KAN-78 affected-booking display finding (raw warning code, no event name) remains open.

This is scoped documentation reconciliation under Arvin's instruction, AI-assisted by Codex. It does not change criteria, estimates (8 + 3 SP), Jira, DoD, dates, acceptance or velocity. Actual work after the configured 17 October Sprint 3 end is not backdated. Original branch-only migration-number statements retain their historical context.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

**KAN-24 — infrastructure, Arvin, 5 SP.** [PR #10](https://github.com/MochaLxtte/ConnectSphere/pull/10) merged on **20 September 22:43 Singapore time**, after Sprint 1’s planned 19 September end. It supplied first-release database/schema, ERD and persistence work, but also introduced business workflows beyond the infrastructure story. Arvin subsequently removed uncommitted future-scope application features in [PR #19](https://github.com/MochaLxtte/ConnectSphere/pull/19), merged **26 September 18:54**; database migration history and required shared dependencies remained. The removed workflows are not delivery credit for KAN-24 or for other members’ stories. Initial scaffolding authored by Mochs is not attributed to Arvin.

The retained Jira Done entry and the original closure totals do not establish that this 20 September merge met the Definition of Done by 19 September. PR #10 was self-merged; neither #10 nor #19 has a submitted human review in the GitHub readback. PR-reported tests are historical reported results, not newly executed manual checks. Preserve `KAN-24-AC1`–`AC4`, `TC-DB-201`–`205` and `S1-T31`–`S1-T33`; reproducible setup, hosted security configuration and diagram verification must retain their existing evidence limits. No additional Done SP or revised velocity is asserted.

**KAN-51 — calendar, recorded owner Arvin, 5 SP.** Ernest’s original calendar rebuild in [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) remains his contribution. Arvin’s [PR #28](https://github.com/MochaLxtte/ConnectSphere/pull/28) corrected route/history synchronization, venue selection and server-side denial of spoofed roles; it merged **7 October 01:29 Singapore time**, after Sprint 2’s planned 3 October end. It added three component regressions and two API denial regressions. This is later delivery on a Sprint 2 story, not evidence of on-time Sprint 2 completion.

The existing **MAN-20261006-KAN51-01** walkthrough used a real local API with isolated PostgreSQL and locally signed fixture tokens: 15 checks passed as recorded. It did not exercise hosted Supabase password sign-in. The original ignored captures were not retained in this documentation checkout; no replacement screenshot is invented. GitHub readback records no submitted human approval for #28. `KAN-51-AC1`–`AC6`, `TC-09-201`–`203` and `S2-T05/T06` remain subject to their recorded scope and hosted acceptance gaps; the later shared buffers/holds requirements do not retroactively redefine the original checks. No new acceptance or velocity is inferred.

**Supporting contributions, separate from owned KAN-34 (3 SP) and KAN-78 (8 SP):**

- **12 October preparation:** Arvin’s consultation action list, C4 preparation record and submission runbook are retained as TXT source snapshots in this sprint’s evidence folder. They prepared Sprint 2 closure, Sprint 3 planning, capacity inputs, C4 exports and packaging; they do not establish that meetings occurred, votes were cast, artifacts were independently reviewed or instructor access was delivered. The original worktree remains untouched. Current committed design supersedes those historical C4 snapshots.
- **21 October 02:26:27 Singapore time — shared migrations 008/009:** Arvin authorized the reviewed rollout; Codex executed it from `cf65c05e5d7b91675d74f7281439d0e9c2b1a766`. The retained JSON records both ledger checksums, four columns, two indexes and zero venues with nonzero initial buffers. This is deployment verification, not KAN-64/KAN-77 authorship, hosted functional acceptance or a new team-wide decision. No fixture, booking or cleanup writes were part of that run.
- **21 October — KAN-81 PR #47 review and corrections:** Arvin requested changes, implemented stale 404/409 refresh corrections in `18ac27d`/`30da68a`, updated tests/evidence and then approved the phase-one work while disclosing his own fixes. His follow-up approval is not a second independent review of his corrections. Kai Jie remains KAN-81’s owner at 8 SP. Existing **S3-E20**, the KAN-81 review JSON and 21 October test narrative retain the scope and CI results.

Owned KAN-34/KAN-78 merge, CI and acceptance limits remain in the preceding 25 October reconciliation. Supporting work adds no story points and does not convert other members’ stories to Done.

Historical PR-reported checks (not re-executed or converted into new case-level Pass rows): PR #10 reports 737 unit, 212 integration and 17 browser passes; PR #19 reports 190 frontend, 372 backend, 119 PostgreSQL and 32 browser passes. Their CI references are [35517145750](https://github.com/MochaLxtte/ConnectSphere/actions/runs/35517145750) and [36237060903](https://github.com/MochaLxtte/ConnectSphere/actions/runs/36237060903). PR #28’s initial full-check totals predate its final additions; final targeted checks and the existing 15-check walkthrough retain their original scope. Its CI reference is [37503225237](https://github.com/MochaLxtte/ConnectSphere/actions/runs/37503225237). Suite totals do not prove every KAN-24/51 criterion; no missing dashboard/RLS, hosted-login or acceptance checks are marked passed by this backfill. The original execution register and failures remain preserved.

## 25 October 2026 — reported manual results for original stories

**Source and recording date:** confirmation from the test executor, Tristan, in the project conversation on **25 October 2026**. The report covers all manual scenarios for his original KAN-36, KAN-16, KAN-29, KAN-8, KAN-52, KAN-79 and KAN-65 implementations, grouped by their original sprint. He reports that all scenarios succeeded on **localhost**, on the sprint-review days, using local commits before pushing them later. The dates below are the reported review-day execution dates, not dates inferred from Git history or independently reconstructed runs. This entry records the report on 25 October; it does not backdate documentation.

| Report reference | Run reference | Reported execution date | Original story scope | Reported result |
| --- | --- | --- | --- | --- |
| REPORT-20261025-TRISTAN-S1 | MAN-20260919-01 | 19 September 2026 | KAN-36: TC-04-208–217, TC-04-230; KAN-16: TC-06-201–209 | 20 manual scenarios Pass, as reported |
| REPORT-20261025-TRISTAN-S2 | MAN-20261003-01 | 3 October 2026 | KAN-29: TC-05-201–203; KAN-8: TC-13-201–204; original KAN-52: TC-11-201–205 | 12 manual scenarios Pass, as reported |
| REPORT-20261025-TRISTAN-S3 | MAN-20261017-01 | 17 October 2026 | KAN-79: TC-05-01–05, TC-05-07–09; KAN-65: TC-05-10–14, TC-05-16 | 14 manual scenarios Pass, as reported; TC-05-09 is scoped to the local candidate |

**Execution metadata.** Executor: Tristan. Environment: localhost. Exact tested commit/branch, database target, browser version, actual account aliases and fixture values, detailed HTTP/database output, screenshots, and retained/restored test data: **Not recorded**. The reusable case specifications describe the scenario coverage; this retrospective report does not independently establish that every listed example input was used. Per-case observations are recorded as reported successful outcomes rather than copied expected-result text. No tests were rerun during this documentation update.

**Scope and version boundaries.** The original KAN-29 result concerns automatic initial assignment before CR-5; it is not a claim that current main automatically assigns new submissions. Original KAN-52 results belong to the Sprint 2 baseline and do not complete Ernest's later Sprint 3 correction or buffer/hold integration. Original KAN-36 results do not retrospectively establish the later KAN-60 rejection-reason requirement. KAN-79/KAN-65 permissions, conflict handling and notification scenarios are included in the executor's report. The two integration-labelled concurrency cases TC-05-06/15 and automated timing regressions TC-05-46–48 retain their separate evidence; no new automated result is inferred. TC-05-09 establishes only the reported local candidate workflow, not a deployed release or operational Lead coverage. The full cross-story venue/hold/outage journey TC-14-20 remains outside this report.

**Records.** Added 46 execution rows, EX-TRISTAN-20261025-S1-01–20, EX-TRISTAN-20261025-S2-01–12 and EX-TRISTAN-20261025-S3-01–14. The date within these execution IDs is the report-recording date; `date_of_execution` contains the separately reported run date. Original placeholders, observed failures and retests remain intact. The three sprint evidence registers link this report. Historical meeting/acceptance decisions and velocity are unchanged. Current Jira KAN-79/KAN-65 remain In Progress; recording successful manual scenarios does not supply a missing team acceptance decision or deployed-environment evidence.

## 25 October 2026 — Ryan story verification records

**Manual-report source.** Tristan reported on 25 October that Ryan (`ryanc9029`) completed all manual tests for his work on the sprint-review dates. The table below records that report; the dates and Pass outcomes were not independently observed. Exact tested commits, environment/URL/database, accounts and fixture values, individual responses/screenshots and data restoration are **Not recorded**. Earlier observations and failed runs remain intact. The report does not establish formal acceptance, a deployed-site check or sprint velocity, and does not change Jira.

| Report | Run | Reported execution date | Story version and cases | Result |
| --- | --- | --- | --- | --- |
| REPORT-20261025-RYAN-S1 | MAN-20260919-02 | 19 September 2026 | KAN-25 original authentication: TC-01-201–209 | 9 scenarios Pass, as reported |
| REPORT-20261025-RYAN-S2 | MAN-20261003-02 | 3 October 2026 | Original KAN-12 AC1–13: TC-10-201–206 | 6 scenarios Pass, as reported |
| REPORT-20261025-RYAN-S3 | MAN-20261017-02 | 17 October 2026 | Revised KAN-12: TC-10-02–12 and TC-10-210; KAN-50 AC101 repair: TC-08-14 | 13 scenarios Pass, as reported |

The specifications supply reusable steps/data, not a transcript of these runs. TC-01-209 formalises the existing S1-T02/DEMO-01 invalid-credential scenario on 25 October; it is not a newly invented historical observation. TC-10-10 explicitly separates UI and direct-API date validation, but the report has no captured per-input output. KAN-50's original catalogue implementation and Irfan's existing manual runs remain separately credited; Ryan's report covers its stale-save repair only. The isolated timing-harness case TC-10-208 is not converted into a manual run. Later calendar, hold, outage and full integrated-journey acceptance are not established by this report.

**Implementation and review chronology.** [PR #26](https://github.com/MochaLxtte/ConnectSphere/pull/26) contains Ryan's original search refinements. [PR #51](https://github.com/MochaLxtte/ConnectSphere/pull/51) contains the strict-date/search-page repair and was integrated on 22 October after Irfan's review; [PR #56](https://github.com/MochaLxtte/ConnectSphere/pull/56) contains the catalogue stale-save repair and was approved by Tristan and merged on 25 October. These later Git/review dates are preserved. The reported 17 October manual result has no identifiable local build and does not prove either later merged revision was tested then. A 25 October Jira read confirms KAN-25 and KAN-12 Done / Ryan, and KAN-50 In Progress / Ryan. No story transition or retrospective acceptance is inferred.

**KAN-12 source failure and integrated verification.** PR #51 head `2f1762936302f59dee8109bcd3ce495e16ff5308` had a failing [CI run 39532519646](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39532519646): check/coverage passed, PostgreSQL integration failed, and browser tests were skipped. Irfan's review identifies the older search implementation's lost block/buffer/hour rules and fixed public-schema prefixes; integration retained those safeguards while applying strict dates. The later passing [CI run 39750396624](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39750396624), totals and intermediate failure are already recorded under [AUTO-20261022-INTEGRATION2-01](#22-october-2026--sprint-3-integration-2-prs-4853). This is historical automated evidence, not a new test run or an erased failure.

**AUTO-20261025-KAN50-CI-01.** Existing [PR #56 CI run 40175958221](https://github.com/MochaLxtte/ConnectSphere/actions/runs/40175958221), job `121116563667`, inspected on 25 October. The log checks out PR test merge `89c2cb0`, combining head `6f629530f2f971b8ffde5bda6516e518f017c3c3` with base `5fbd2d53e7e30518f1cfb07498f7cc55f8235cf7`. Environment: GitHub Actions Ubuntu, Node.js 24, isolated PostgreSQL 17 and Chromium; shared Supabase was not used by this CI job.

| Check | Observed existing CI result |
| --- | --- |
| `npm run check` | Pass: types/builds, 770 frontend tests and 1,354 backend tests |
| `npm run test:coverage` | Pass; frontend statements/branches/functions/lines 95.32% / 92.42% / 97.48% / 97.57%; backend 89.56% / 91.48% / 89.44% / 89.89%. These are workspace totals, not a claim of 100% new-code coverage. |
| Migration/seed and `npm run test:integration` | Pass: 479 tests in 26 files |
| `npm run test:e2e` | Pass: 156 browser tests |
| KAN-50 component regression | `VenueCatalogueEditPage.test.ts` 52/52, including 11 added AC101/adjacent regression cases: delayed success/error/409/401, route/account changes, leaving the page, correct next save, and normal-save/data-retention regressions |

The actual component cases support a new scoped automated Pass for TC-08-01; its earlier Fail remains. The run does not manufacture case-level results for every test specification. The 28 reported manual rows are EX-RYAN-20261025-S1-01–09, S2-01–06 and S3-01–13; EX-RYAN-20261025-CI-01 records the separate automated retest. Documentation verification does not run the application again.

## 25 October 2026 — Team manual result reports

The supplied team report states that Arvin, Ernest, Irfan and Kai Jie completed all their manual scenarios successfully on the Sprint 1, 2 and 3 review dates. It also confirms that all six members attended planning, review and retrospective meetings. The report was supplied on **25 October 2026**; reported execution dates are **19 September, 3 October and 17 October 2026**. Existing Tristan and Ryan reports are retained separately. Run IDs below group this reported evidence; they do not claim a newly observed or independently executed run.

| Sprint / reported date | Report and manual run IDs | Executors / scope | Case rows |
| --- | --- | --- | --- |
| 1 / 19 September 2026 | REPORT-20261025-TEAM-S1; MAN-20260919-TEAM-01 | Ernest: KAN-31 / KAN-4; Kai Jie: KAN-6 / KAN-34; Irfan: KAN-27 / KAN-33; Arvin: KAN-24 | 60 reported Pass |
| 2 / 3 October 2026 | REPORT-20261025-TEAM-S2; MAN-20261003-TEAM-01 | Irfan: KAN-50 / KAN-33; Arvin: KAN-51; Ernest: KAN-54; Kai Jie: KAN-53 / KAN-55 / KAN-6 / KAN-34 | 52 reported Pass |
| 3 / 17 October 2026 | REPORT-20261025-TEAM-S3; MAN-20261017-TEAM-01 | Ernest: KAN-6 / KAN-52 / KAN-64; Arvin: KAN-34 / KAN-78; Kai Jie: KAN-77 / KAN-81; Irfan: KAN-60 / KAN-83; Team (reported): Integrated Sprint 3 journey | 41 reported Pass |

**Evidence limits.** Exact tested builds, environments, commands, fixture values, observed responses, screenshots and cleanup are **Not recorded**. The scenario-level outcomes below are reported Pass; expected results have not been copied into actual results as if independently observed. Sprint 1's recorded draft/submission/coordinator-navigation defects, its 24/8 closure disposition, subsequent carry-over, later implementation dates and the 25 October audit findings remain unchanged. Where those sources differ from the broad retrospective report, the build and precise paths needed to reconcile them are **Not recorded**. These reports do not establish acceptance, deployed-site checks, original Done dates or sprint velocity. Today's repairs need their own automated and manual retests.

**Selection boundaries.** Detailed manual or manual/integration specifications are selected by historical owner and story version. Sprint 1/2 use baseline specifications; Sprint 3 uses the narrowed notification scope and revised requirements. Historical summary TC-01…TC-20, superseded notification TC-20-01…11, automated-only cases, new October 25 regression cases and Sprint 4 lifecycle/registration/safety/readiness cases are excluded. KAN-81-AC9's final-confirmation/safety portion is not recorded as completed by this report. TC-04-05 bundles command-based regression layers, so this manual report does not establish its full outcome. KAN-24's later-added diagram criterion is not retrospectively marked passed in Sprint 1. Existing Not executed and Fail rows are retained; new rows are appended with unique execution IDs.

### Sprint 1 reported case selection

- **Ernest:** TC-02-201, TC-02-202, TC-02-203, TC-02-204, TC-02-205, TC-02-206, TC-02-207, TC-02-208, TC-02-209, TC-02-210, TC-02-211, TC-02-212, TC-02-221, TC-03-201, TC-03-202, TC-03-203, TC-03-204, TC-03-205, TC-03-206, TC-03-207, TC-03-217.
- **Kai Jie:** TC-03-208, TC-03-209, TC-03-210, TC-03-211, TC-03-212, TC-03-213, TC-03-214, TC-03-215, TC-03-216, TC-02-213, TC-02-214, TC-02-215, TC-02-216, TC-02-217, TC-02-218, TC-02-219, TC-02-220, TC-02-222, TC-02-223.
- **Irfan:** TC-04-201, TC-04-202, TC-04-203, TC-04-204, TC-04-205, TC-04-206, TC-04-207, TC-04-218, TC-04-219, TC-04-220, TC-04-221, TC-04-222, TC-04-223, TC-04-224, TC-04-225, TC-04-226, TC-04-227, TC-04-231.
- **Arvin:** TC-DB-201, TC-DB-203.

### Sprint 2 reported case selection

- **Irfan:** TC-08-201, TC-08-202, TC-08-203, TC-08-204, TC-08-205, TC-08-206, TC-08-207, TC-08-209, TC-08-210, TC-04-201, TC-04-202, TC-04-203, TC-04-204, TC-04-205, TC-04-206, TC-04-207, TC-04-228, TC-04-229.
- **Arvin:** TC-09-201, TC-09-202, TC-09-203.
- **Ernest:** TC-14-201, TC-14-202, TC-14-203, TC-14-205.
- **Kai Jie:** TC-12-201, TC-12-202, TC-12-203, TC-14-207, TC-14-208, TC-14-209, TC-14-210, TC-14-211, TC-03-208, TC-03-209, TC-03-210, TC-03-211, TC-03-212, TC-03-213, TC-03-214, TC-03-215, TC-03-216, TC-02-213, TC-02-214, TC-02-215, TC-02-216, TC-02-217, TC-02-218, TC-02-219, TC-02-220, TC-02-222, TC-02-223.

### Sprint 3 reported case selection

- **Ernest:** TC-02-02, TC-02-03, TC-02-04, TC-02-06, TC-02-09, TC-11-02, TC-11-04, TC-11-05, TC-11-06, TC-11-07, TC-11-205, TC-20-12, TC-20-13, TC-20-14, TC-20-15, TC-20-16.
- **Arvin:** TC-03-02, TC-03-03, TC-03-04, TC-03-06, TC-14-01, TC-14-02, TC-14-03, TC-14-04, TC-14-06, TC-14-07.
- **Kai Jie:** TC-08-15, TC-08-18, TC-08-19, TC-08-20, TC-09-02, TC-09-07, TC-09-12.
- **Irfan:** TC-04-03, TC-04-04, TC-04-06, TC-14-09, TC-14-14, TC-14-18, TC-14-19.
- **Team (reported):** TC-14-20.

**Follow-up.** Attach build/environment and any retained captures if available; reconcile reported passes with the dated defects; execute manual checks for the current fixes; record a separate story-by-story acceptance decision against the unchanged Definition of Done. Burndown artifacts will be supplied by the team; none are invented from these reported outcomes.

## 25 October 2026 — Sprint closeout reconciliation

**Build:** `fix/sprint-3-closeout`, based on `71e58b49077ea0666fafd26ad6ac4366665ee4ba`, with the uncommitted code/test files identified by [SHA-256 manifest](../scrum/sprint-03/evidence/closeout-build-20261025.json). **Executor:** Codex, Windows/Node 24, local synthetic fixtures. No commit, push or application deployment is asserted.

`AUTO-20261025-CLOSEOUT-BASELINE` retains three pre-fix findings on `96a0d10`: PostgreSQL-incompatible date bounds returned HTTP500 for8 inputs; a confirmed-event replacement had disabled staff approval; and a deterministic outage/failed-approval interleaving left a hold live. Latest main `71e58b4` differed from that source only in documentation. Repaired cases have separate Pass rows; failures remain.

### Automated repair verification — AUTO-20261025-CLOSEOUT-01

| Check | Observed result |
| --- | --- |
| `npm run check` | Pass: type checks, frontend 785, backend 1,364, both builds |
| `npm run test:coverage` | Pass: frontend 97.54% lines / 92.54% branches; backend 89.93% lines / 91.49% branches |
| KAN-34 dedicated parser coverage | 129 tests;100% statement/branch/function/line coverage |
| `npm run test:integration` | 499 Pass in26 files, isolated PostgreSQL 17 |
| `npm run test:e2e -- --workers=2` | 158 Pass, Chromium/API fixtures |
| Static second-agent review | No actionable venue-gate/permission/UI finding; not a human PR approval |

The readable [run summary](../scrum/sprint-03/evidence/closeout-test-summary-20261025.txt) and [coverage record](coverage-reports/2026-10-25-closeout.txt) retain counts and limits. Tests use explicit disposable `TEST_DATABASE_URL`; fixture schemas are cleaned there, never on shared Supabase. Browser tests substitute responses and do not establish live integrated acceptance. Existing bundle-size warnings do not fail the build. Whole-project coverage remains below 100%; the workspace coverage run excludes PostgreSQL integration instrumentation, and existing runtime/session/error paths remain uncovered.

Specific repaired cases: `TC-03-303` draft year/offset bounds; `TC-09-25` confirmed replacement controls; `TC-14-308` outage/hold ordering; `TC-14-309` buffered deadline; `TC-14-307` named/readable catalogue warnings; `TC-04-303` Singapore review times. `TC-20-18` now proves actual concurrent dedupe and post-insert rollback; `TC-20-19` proves overlapping recipients using a legitimate role transition. An initial notification fixture reused a unique synthetic venue name (17 Pass / 1 Fail); correcting the fixture produced 46/46 targeted Pass before the full 499 Pass. This test-fixture failure is retained, not reported as product success.

`DOC-20261025-NOTIFICATION-SPLIT-01` completes `TC-20-20` by tracing the original notification criteria to KAN-64 (5 SP), KAN-80 (3 SP) and CR-specific 81/82/83/84 owners. The source matrix, current trigger writer, both sprint cards and traceability agree on ownership; future trigger implementation is not claimed. See the [change record](../requirements/change-requests.md#25-october-2026--current-integration-and-notification-ownership).

### Shared expiry configuration — OPS-20261025-HOLD-EXPIRY-01

Team approval was supplied in chat. A read-only check verified the existing shared migration 013 checksum, expiry function and pg_cron availability before enabling extension 1.6.4 and creating only the named `connectsphere-expire-venue-holds` job. Job 1 is active every minute with `SELECT public.expire_venue_holds()` in database `postgres`. The first real scheduled run succeeded at **21:58:00 SGT**, followed by later successful ticks. Sanitized [job evidence](../scrum/sprint-03/evidence/supabase-hold-expiry-20261025.json) is retained. Return message `1 row` denotes one SQL result row, not one expired hold. No business fixture, cleanup suite, historical migration edit or application deployment was performed on shared Supabase. `TC-14-310` Pass is configuration/execution evidence; a held-booking/inbox journey remains a distinct check.

### Report reconciliation and remaining decisions

The pending Tristan/Ryan records were backed up and merged with the latest team documentation. Colliding evidence IDs were disambiguated without deleting their sources: Tristan reports use S1-E24/S2-E34/S3-E23, Ryan retains S1-E23/S2-E33/S3-E22, and the new team reports use S1-E25/S2-E36/S3-E24. Sprint 2's administrative snapshot uses S2-E35; the earlier audit remains S2-E30. Original executions and failures are retained.

The team report supplies manual Pass outcomes on the historical review dates, with exact builds/environments/details **Not recorded**. Earlier explicit unperformed/failing/later-executed records remain and are not overwritten. These historical reports cannot retest today's fixes or execute future Sprint 4 consumers. The [short current-build retest](README.md#25-october-2026--closeout-retest) remains **Not executed**. The deployed app/API URL, formal story acceptance decisions and remaining ceremony artifacts are **Not recorded**. The current DoD is confirmed unchanged; retrospective suggestions remain **To agree** and burndown artifacts will be supplied by the team. Jira statuses are current tracker values, not recreated review dates or velocity. No story was transitioned or re-estimated by this reconciliation.

### Supplementary specification verification — AUTO-20261025-CLOSEOUT-02

After the first full pass, a specification-to-test check identified narrower assertions in TC-14-10/16 and TC-11-03. Eleven tests were added to the hold suite (60/60 targeted Pass), and the existing suitability test was strengthened (34/34 targeted Pass). No additional product code changed. The complete isolated PostgreSQL suite was then rerun: **510/510 Pass in 26 files**, 40.88 seconds. `npm run test:integration` used the same explicit disposable test database. Types and whitespace checks also passed. The earlier 499-test run remains the original AUTO-01 result; this new run records the expanded test tree.

TC-14-10 now exercises exact setup/turnaround adjacency and one-minute buffer-only overlaps for both approved and held blockers. TC-14-16 exercises three real clock/lock orderings among approval, expiry and an overlapping new hold, with actual blocked-writer inspection and retries. Approval that was validly updated before its deadline can retain that decision when expiry waits for its commit; expiry rechecks committed state rather than overwriting it. TC-11-03 explicitly checks the 50/50 suitable and 51/50 unsuitable outcomes, explanation and unchanged state. Initial new hold-test failures were fixture-count/recipient-expectation mismatches; those assertions were corrected before the final passing runs. They were not hidden product failures or shared-data tests.

The current tested source is identified by the updated SHA-256 manifest. Frontend 785, backend 1,364, browser 158 and coverage from AUTO-01 remain applicable because the supplementary changes only strengthen database tests. Current-build manual retests and formal review acceptance remain separate.

## 25 October 2026 — Closeout retest confirmation

**Report ID:** `REPORT-20261025-CLOSEOUT-RETEST`. **Report received:** 25 October 2026. **Source:** Tristan's project-chat confirmation: “We have tested the fixes, you can document that the fixes work and are done.” This follows the current-fix smoke checklist, rather than the earlier reports for the sprint-review dates.

**Outcome:** the closeout fixes and integrated smoke follow-up are **complete, reported Pass**. Application deployment is not planned or required by the [current DoD](../scrum/definition-of-done.md#local-acceptance-policy--25-october-2026). The application testing context is localhost; the existing shared Supabase expiry configuration remains operational evidence in `OPS-20261025-HOLD-EXPIRY-01`.

| Specification | Reported scope / actual result |
| --- | --- |
| TC-03-303 | Draft invalid year/offset validation and unchanged-draft repair smoke passed. |
| TC-09-25 | Valid confirmed-event replacement controls and refreshed outcome work; ordinary confirmed-event restrictions retained. |
| TC-14-309 | Buffered hold deadline hint and boundary validation work. |
| TC-14-307 | Affected-booking warnings identify the event/period with readable explanations. |
| TC-04-303 | Review and clarification timestamps display Singapore time. |
| TC-14-311 | Integrated outage/hold release and scheduled-expiry/inbox smoke checks passed. |

These rows express the reported successful outcomes of the supplied checklist; individual observed output and exact inputs were not supplied. Actual execution date, individual executors, exact SHA, fixture identifiers, screenshots, cleanup and per-run database configuration are **Not recorded**. The documentation date is not used as an execution date or a dated MAN run ID. Six separate Pass rows are appended in `test-executions.csv`; earlier Not executed placeholders, failures and reported historical runs remain intact.

The TC-14-308 transaction barriers and concurrent-operation orderings remain supported by the isolated PostgreSQL runs; the manual smoke report does not claim those barriers were run by hand. TC-14-311 separates the observable local workflow from that deterministic race case and from the cron-configuration-only TC-14-310. The automated repair results and SHA manifest are unchanged; no new automated run is asserted in this documentation update.

This follow-up supersedes the earlier same-day pending repair-retest and deployed-URL actions. The fixes are complete locally. Commit/PR integration, explicit story review/closure decisions, team burndown evidence, agreed retrospective actions and the remaining Sprint 4 consumers retain their separate workflow and evidence requirements. No Jira status, historical Done date, story estimate or sprint velocity is changed here.

## 26 October 2026 — KAN-9 equipment availability

**Run:** AUTO-20261026-KAN9-01. **Branch:** `feat/KAN-9-equipment-availability`. **Source:** the full check source was captured in `5c0dc98dc3d4e0a55347415006c9d03008260f6f`; an additional mixed-type database regression was subsequently verified in the focused run and captured in `50e8ef983efddbe84baeaef8d165fa06ca593299`. The [summary and SHA-256 manifest](../scrum/sprint-04/evidence/kan9-20261026/summary.json) identify the final code/test files. Executor: Codex using automated tools on Windows, Node 24.21.0, Vitest 4.1.11, disposable local PostgreSQL 17 and Chromium. Database HTTP tests use real SQL with substituted authentication; browser cases substitute API responses. No shared database cleanup or real-login manual acceptance occurred.

| Command / scope | Observed result |
| --- | --- |
| `npm run check` | Pass: tools/backend/frontend types, frontend 881 tests, backend 1,451 tests and both builds |
| `npm run test:coverage` | Pass, same unit/component totals; [coverage record](coverage-reports/2026-10-26-kan9.txt) |
| `npm run test:integration` | 528 Pass in 27 files, 55.25 s; isolated database |
| Focused `database/tests/equipment/availability.integration.test.ts` | 18 Pass after adding the mixed-type equality/shortfall regression; the full suite was not rerun for this test-only addition |
| Focused `tests/e2e/equipment-availability.spec.ts` | 10 Pass |
| Initial `npm run test:e2e` (10 workers, concurrent with other checks) | 163 Pass / 5 Fail; all 10 new equipment tests passed |
| `npm run test:e2e -- --workers=2` | 168 Pass, 1.9 minutes; no product code changed before this rerun |

Equipment backend coverage is **100% statements, branches, functions and lines**. Equipment frontend is **100% statements/functions/lines, 98.04% branches (301/307)**; six defensive ready-state/non-Error fallback branches remain uncovered. The API client throws `Error` objects. Whole-project coverage is lower and is recorded separately; database integration is not instrumented by that command. The existing frontend bundle warning (526.56 kB minified) did not fail the build.

**Failures and retests.** The first focused database run was 30 Pass / 1 Fail because unrelated inactive catalogue items were visible. Filtering the context to active or saved-reference types corrected it; subsequent focused and full runs passed. Initial frontend work had two transient loading-selector failures and two test-only type errors; those were corrected. The first root check found a missing `.js` extension in a NodeNext type import; the final check passed. These earlier development failures are retained here; no case-level Pass is inferred from them.

The five full-browser failures were existing navigation cases: KAN-16 list retry/empty (`event-requests.spec.ts:102`), KAN-34 draft editing (`kan34-draft-edit.spec.ts:4`), two KAN-79 denial cases (`lead-assignment.spec.ts:189`, coordinator oversight and Technical Support `/lead`) and KAN-64 retry (`notifications.spec.ts:158`). They reported navigation timeouts / `net::ERR_ABORTED`. Concurrent load may have contributed, but the root cause is **Not assessed**. The [initial output](../scrum/sprint-04/evidence/kan9-20261026/browser-initial.txt) and [two-worker rerun](../scrum/sprint-04/evidence/kan9-20261026/browser-retest.txt) preserve both outcomes; no existing test was weakened or skipped.

**Case-level evidence.** TC-16-11–18 have specific automated results in the execution register: protected minimal context, no-write checks, saved/self-reservation handling, live data and stale source detection, invalid saved demand/inactive stock, UI response races, mixed-type deficits, and migration constraints. Original TC-16-06–10 planning records remain; this automated evidence does not overwrite their complete integrated/manual scenarios. In particular, **TC-16-09's reservation-write portion is Not executed pending KAN-26**.

**Remaining acceptance/setup.** Migration 014 application to shared Supabase and all integrated localhost manual checks are **Not executed**. KAN-9 remains In Progress, acceptance Not assessed, with independent human review pending. KAN-18 stock administration and KAN-63 request entry/review require integration when available. KAN-26 must enforce operational capacity under lock; the historical reservation trigger still checks total stock. Follow the [manual procedure](README.md#kan-9-integrated-local-verification), recording real test data, build, executor, outcomes and cleanup. No new equipment data was left in shared Supabase by this work.

**Presentation evidence.** The [desktop shortfall](../scrum/sprint-04/evidence/kan9-20261026/equipment-shortfall-desktop.png) and [mobile what-if form](../scrum/sprint-04/evidence/kan9-20261026/equipment-what-if-mobile.png) were captured by Playwright with synthetic API data and visually inspected. They show layout, not manual integrated acceptance.

## 26 October 2026 — KAN-26 equipment reservations

**Run:** AUTO-20261026-KAN26-01. **Branch:** `feat/KAN-26-equipment-reservations`, created from main `c849ebf134ba464a621e273ef2cd632712efe659` and then fast-forwarded to the approved local KAN-9 commits through `e64b226`. The [run summary/source manifest](../scrum/sprint-04/evidence/kan26-20261026/summary.json) identifies the exact KAN-26 code/test tree, captured in `b29dc1261937c4f66708ae35d043779737c99e2e`. Subsequent commits update documentation only. Executor: Codex through automated tools on Windows, Node 24.21.0, Vitest 4.1.11, disposable PostgreSQL 17 and Chromium. SQL integration uses real transactions with substituted authentication; authenticated browser APIs use fixtures. This is not a real-login manual acceptance run.

| Command / scope | Observed result |
| --- | --- |
| Initial `npm run check` | Pass: frontend 942 / backend 1,516, types/builds; subsequent test additions and recipient-role hardening were verified in the final run below |
| Final `npm run check` | Pass: tools/frontend/backend types, frontend **945** in 42 files, backend **1,518** in 52 files, both builds |
| Final `npm run test:coverage` | Pass with the same 945 / 1,518 totals; [coverage details](coverage-reports/2026-10-26-kan26.txt) |
| `npm run db:migrate` with explicit local database and migration URLs | All 15 migrations applied to disposable PostgreSQL; no shared migration application |
| Focused reservation backend | **67 Pass**; new reservation TypeScript 100% statements/branches/functions/lines |
| Focused equipment frontend | **153 Pass**; new client 100%, panel 100% lines/functions, remaining defensive branch gaps below |
| First full `npm run test:integration -- --reporter=verbose` | **554 Pass** in 28 files; includes 24 reservation tests and migration015 upgrade regression |
| Final full integration after adding post-success stale-replay regression | **555 Pass** in 28 files, 58.45 seconds; reservation file25/25 |
| Equipment browser fixture suites | **21 Pass**; screenshot workflow also passed with explicit isolated database configuration |
| Full `npm run test:e2e -- --workers=2` | **179 Pass**, 1.6 minutes, API explicitly configured to the migrated disposable database |

**Coverage and limits.** Whole frontend coverage is 95.85% statements/93.15% branches/97.74% functions/97.78% lines; whole backend 91.14%/92.83%/91.24%/91.31%. New reservation backend is 100% across 139 statements / 103 branches / 31 functions / 108 lines. Equipment frontend is 99.42% statements,97.48% branches, 100% functions/lines. Uncovered frontend paths are defensive empty-readiness and non-Error fallback/short-circuit branches plus the parent refresh identity guard already protected by child cancellation. No coverage exclusion or threshold was weakened. SQL is tested directly but not instrumented by TypeScript coverage. The existing frontend bundle-size advisory (536.02 kB minified) did not fail the build.

**Specific observed scenarios.** TC-17-02 and TC-17-101–110 link case-level Pass records to actual assertions: full saved allocation independent of venue, operational peak/adjacency/overflow, competing service/direct-SQL writes, same-line idempotency, rollback, recipient/role protection, manual and terminal release audits, immutable history, current-source version conflicts, readiness and response races. The final real-database regression proves both reserve and cancellation replay reject an old version after another saved line changes. Historical placeholders remain unchanged. Manual TC-17-01/03–08 and combined KAN-9 TC-16-09 remain **Not executed**.

**Development findings and execution boundaries.** The audit hardened PostgreSQL CHECK handling for null release causes and prevented released-row resurrection; it also added a locked current coordinator-role check so a new reservation cannot commit an undeliverable coordinator confirmation. Corresponding unit/database regressions pass. The integration test intentionally injects a deferred notification failure and logs `Unexpected API error.` while proving rollback; the suite passed. Two initial frontend typecheck attempts found unsupported Testing Library `{ exact: true }` helper options; the options were removed and subsequent checks passed. Component/browser assertions did not fail. Diagram export initially lacked a Puppeteer browser and rejected a semicolon in a sequence note; the installed Playwright Chromium and corrected note produced the inspected exports. Existing KAN-9/core fixtures were adjusted to APPROVED events with exact event periods without weakening their original assertions. Earlier full 554 and focused runs are retained alongside the final 555 run.

An initial focused browser run started the local API using the existing development environment. Its equipment calls used intercepted API fixtures and its live calls were unauthenticated checks; the API's existing startup hold-expiry scheduler could nevertheless run. Shared effects from that startup were **Not assessed**. A subsequent screenshot run explicitly used disposable PostgreSQL before its base schema was migrated and logged an expected scheduler retry; the root then applied all 15 migrations locally and ran the complete 179-test suite with both database connection variables explicitly local. No migration or cleanup-based test was pointed at shared Supabase. The final run does not erase this earlier environment limitation.

**Setup, dependencies and acceptance.** Migration 014 and test-account creation were reported complete by the user. Migration 015 remains unapplied to shared Supabase. KAN-63 owns request entry/revision and explicit Not Required handling; KAN-18 owns the stock editor; KAN-62/KAN-10 own the cancellation/completion UI/API journeys. This branch tests their release hook through real SQL transitions but cannot accept those absent user journeys. Only KAN-80's equipment-reserved notification slice is implemented here; other triggers and KAN-61's final-confirmation consumer are separate. KAN-26 remains In Progress, integrated acceptance **Not executed**, acceptance **Not assessed**, independent review/merge pending. Follow the [manual procedure](README.md#kan-26-integrated-local-verification) using fresh fixtures and preserved history.

**Presentation and document checks.** S4-E13 contains inspected desktop readiness, mobile cancellation/empty state and retained-history browser captures with synthetic API data. The master workbook retains 7 sheets / 11 tables / 18 formulas / 7 frozen panes and unrelated existing rows; its targeted updates and rendered cells were checked. Changed diagrams are re-exported. CSV IDs, AC/case/test-path mappings and preservation of earlier execution rows are validated in S4-E12. None of these document or image checks constitutes manual product acceptance.

## 26 October 2026 — KAN-66 planning edits automated runs

**Runs:** `AUTO-20261026-KAN66-01` (unit/component, `npm run check` and workspace coverage) and `AUTO-20261026-KAN66-02` (browser fixtures). **Executor:** Claude Code (AI agent) in Irfan's working session. **Build:** uncommitted working tree on `feat/KAN-66-planning-edits`, based on `c849ebf`; the commit SHA is added when committed. **Environment:** local Windows 11 workstation, Node 24. Full output summary: [coverage report](coverage-reports/2026-10-26-kan66.txt).

| Run | Command | Result |
| --- | --- | --- |
| AUTO-20261026-KAN66-01 | `npm run check`; `vitest run --coverage` per workspace | Pass — frontend 810 tests / 37 files, backend 1,414 / 48, typecheck and builds. Backend 91.17% statements / 92.80% branches; frontend 95.90% / 92.69%. |
| AUTO-20261026-KAN66-02 | `npx playwright test --workers=2` | 156 passed / 5 failed of 161. All 3 KAN-66 tests passed. Rerun of `coordinator-reassignment.spec.ts` + `kan66-planning-edits.spec.ts` with one worker: 16/16 passed. |
| PostgreSQL integration | `npm run test:integration` | **Not executed** — no isolated test database available locally (see below). |

**AUTO-20261026-KAN66-02 failures, not caused by KAN-66.** The three `scaffold.spec.ts` checks (SCF-E2E-01/03/04) need the API's live database health check to report "Connected". No reachable migrated test database was configured on this workstation, and the API dev server also logged a failed hold-expiry run. Two `coordinator-reassignment.spec.ts` cases timed out in `page.goto` (30 s) under load and passed when rerun alone. These are recorded as observed and not hidden.

**Coverage of new code.** `planning-edit-policy.ts`, `update-draft.ts`, `draft-update-input.ts`, `draft-eligibility.ts`, `review-input.ts` and `review-router.ts` are at 100% lines and branches; `EventDetailsEditPage.vue` at 100% lines / 92.69% branches. Remaining gaps in changed files are pre-existing lines (`event-request-detail.ts` date-null branches, router `next(error)` fallbacks, `workflow-support.ts` helpers). The `expectedRevision` checks added inside `review-decision.ts` and `clarifications.ts` are reached only by the PostgreSQL suite, so their execution is **Not executed** in this record.

**Case-level results.** `test-executions.csv` rows `EX-07-01-A01` to `EX-07-06-A01` record Pass at the stated unit/component or browser-fixture boundary only; each row states that boundary. `EX-07-06-P01` and `EX-07-07-P01` are new Not executed placeholders for the PostgreSQL run. Earlier `EX-07-0x-P01` placeholders are retained.

**Integration suite not executed.** The new `database/tests/events/planning-edits.integration.test.ts` (23 cases: migration 014 trigger and audit constraints, owner pre-approval edits, concurrent saves, significant-field refusals, venue-booking preservation, unauthorised edits, stale reviewer decision/start-review/clarification) has not run. Docker Desktop could not start an isolated PostgreSQL in reasonable time and was stopped. The shared Supabase database was not used: AGENTS.md §7.3 forbids cleanup-based tests there, and migration 013 re-schedules the named `pg_cron` hold-expiry job into each temporary test schema, which would break the live job once that schema is dropped. The suite runs in GitHub CI on the KAN-66 pull request.

**Limitations.** Unit tests use fake database clients and browser tests substitute API responses; neither proves PostgreSQL locking, migration 014 or live authentication. Local integrated acceptance (§5.12), independent review and AC8 assessment with KAN-15 remain outstanding. No story acceptance, Done SP or Jira transition follows from these runs.

## 27 October 2026 — KAN-66 regression re-run on the committed branch

**Run:** `AUTO-20261027-KAN66-03`. **Executor:** Claude Code (AI agent) in Irfan's working session. **Build:** `feat/KAN-66-planning-edits` at `3ac15d5`, on top of `main` `c849ebf`. The commits were rewritten that day to remove AI co-author trailers; the file tree is byte-identical to the earlier tip `d92e58f`. **Environment:** local Windows 11 workstation, Node 22.20.0 (the project specifies Node 24; npm reported `EBADENGINE` only), fresh `npm ci`.

| Run | Command | Result |
| --- | --- | --- |
| AUTO-20261027-KAN66-03 | `npm run check` | Pass — frontend 810 tests / 37 files, backend 1,414 / 48, typecheck and both builds. |
| AUTO-20261027-KAN66-03 | `npm run test:coverage` | Pass — backend 91.17% statements / 92.80% branches; frontend 95.90% / 92.69% (same as AUTO-20261026-KAN66-01). |
| PostgreSQL integration | `npm run test:integration` | **Not executed locally** — no Docker and no isolated database on this workstation. Runs in GitHub CI on the KAN-66 pull request; append the CI run here and to `test-executions.csv` (`EX-07-06`, `EX-07-07`) when it finishes. |
| Browser (Playwright) | `npm run test:e2e` | **Not re-run**; the 26 October result (`AUTO-20261026-KAN66-02`) stands. CI runs it on the pull request. |

This is a suite-level regression record. It adds no case-level Pass beyond `EX-07-0x-A01/A02`, and it does not establish integrated acceptance, independent review or Done.

**First PostgreSQL CI run — 27 October 2026 (`CI-20261027-KAN66-01`, GitHub Actions run 40498997687, PR #64, build `b878a2b`): Fail.** `npm run check` and coverage passed; `npm run test:integration` reported 519 passed / 14 failed of 533 (4 of 27 files), so the browser step did not run. All 14 failures were earlier tests asserting exact shapes that KAN-66 intentionally extends, not regressions: migration-upgrade checks (SCF-DB-03 ×2, KAN-79 migration) now see `revision = 1` on existing rows; KAN-65 handovers (×6) advance `revision` by one; request-detail actions (KAN-16/33/34/36, ×5) now include `canEditDetails`, `editMode` and `editableFields`, and the APPROVED detail differs by role because only the assigned coordinator gains planning edits (KAN-66-AC102). The expectations were updated to assert the new values explicitly. The 23 new `planning-edits.integration.test.ts` cases passed in this run. The re-run result is appended below when CI finishes.

**PostgreSQL CI re-run — 27 October 2026 (`CI-20261027-KAN66-02`, GitHub Actions run 40499977926, PR #64, build `27d5d84`): Pass.** Every CI step passed on PostgreSQL 17 in an isolated test database: `npm run check` (frontend 810/37 files, backend 1,414/48, typecheck, builds); `npm run test:coverage`; migrations and seed; `npm run test:integration` 533/533 in 27 files, including all 23 `planning-edits.integration.test.ts` cases; `npm run test:e2e` 161/161 in Chromium, including the three `kan66-planning-edits.spec.ts` tests (browser fixtures with substituted API responses). Case rows `EX-07-01-A03` to `EX-07-07-A03` record the PostgreSQL-level results. Still outstanding: local integrated acceptance with real sign-in after migration 014 reaches the shared database, independent review and AC8 with KAN-15.

## 27 October 2026 — KAN-15 change requests automated runs

**Run:** `AUTO-20261027-KAN15-01`. **Executor:** Claude Code (AI agent) in Irfan's working session. **Build:** working tree on `feat/KAN-15-change-requests`, stacked on `feat/KAN-66-planning-edits` at `2aa63fc` (main `c849ebf`); the commit SHA is added below once committed. **Environment:** local Windows 11 workstation, Node 22.20.0 (project specifies Node 24; `EBADENGINE` warning only). Summary: [coverage report](coverage-reports/2026-10-27-kan15.txt).

| Run | Command | Result |
| --- | --- | --- |
| AUTO-20261027-KAN15-01 | `npm run check`; `vitest run --coverage` per workspace | Pass — frontend 832 tests / 39 files, backend 1,459 / 51, typecheck and builds. New backend workflow 98.7% statements (two defensive rethrows uncovered); impact rules and notifications 100%; new page and panel 100% lines. |
| AUTO-20261027-KAN15-01 | `npx playwright test --workers=2` | Pass — 164/164, including the three `kan15-change-requests.spec.ts` tests (substituted API responses). |
| PostgreSQL integration | `npm run test:integration` | **Not executed locally** — no isolated database on this workstation; runs in GitHub CI on the pull request. Covers migration 017, the one-pending index, concurrent submissions and decisions, arrangement cancellation and access. |

**Case-level results.** `test-executions.csv` rows `EX-19-01-A01` to `EX-19-09-A01` (unit/component) and `EX-19-01-A02` to `EX-19-04-A02` (browser fixtures) record Pass at those boundaries only. The `EX-19-0x-P01` placeholders stay until the PostgreSQL and integrated runs are appended.

**Changes to existing tests.** `backend/test/sprint-scope.test.ts` no longer lists the four change-request routes as future scope; `database/tests/database.integration.test.ts` expects migration 017 in its migration lists; `tests/e2e/workspace-fixtures.ts` answers the new panel's empty read so other page fixtures keep failing only on unexpected requests.

**Limitations.** Unit tests use fake database clients and browser tests substitute API responses; neither proves migration 017, PostgreSQL locking or live authentication. Local integrated acceptance, independent review and the equipment cancellation model after #62/#63 (decision D8) remain outstanding. No story acceptance, Done SP or Jira transition follows from these runs.

**First PostgreSQL CI run — 27 October 2026 (`CI-20261027-KAN15-01`, GitHub Actions run 40508608570, PR #65, build `38aa3eb`): Fail.** `npm run check` and coverage passed; `npm run test:integration` reported 542 passed / 2 failed of 544, so the browser step did not run. Neither failure was a product defect: (1) the KAN-15 stale-page case sent `expectedRevision` 0 for a new event at revision 1, which is correctly refused as invalid input before the conflict check; the test now moves the event on with an unrelated rename and sends the older revision. (2) `CORE-DB-06` inserted change requests in the migration 004 shape; migration 017 requires `previous` and `base_revision`, so the empty-change insert failed on `NOT NULL` (23502) before the expected check (23514). The test now supplies both columns and still proves an empty change is refused. The other 10 KAN-15 PostgreSQL cases passed in this run. The re-run is appended below.

**PostgreSQL CI re-run — 27 October 2026 (`CI-20261027-KAN15-02`, GitHub Actions run 40509445003, PR #65, build `6c5043c`): Pass.** Every CI step passed on PostgreSQL 17 in an isolated test database: `npm run check` (frontend 832/39 files, backend 1,459/51, typecheck, builds); `npm run test:coverage`; migrations (including 017) and seed; `npm run test:integration` 544/544 in 28 files, including all 11 `change-requests.integration.test.ts` cases and the updated `CORE-DB-06`; `npm run test:e2e` 161+3 = 164/164 in Chromium, including the three `kan15-change-requests.spec.ts` tests (browser fixtures). Case rows `EX-19-01-A03` to `EX-19-09-A03` record the PostgreSQL-level results. Still outstanding: local integrated acceptance with real sign-in after migrations 014 and 017 reach the shared database, independent review, and the equipment cancellation model after #62/#63 (D8).

**CI after merging main — 27 October 2026 (`CI-20261027-KAN66-03`, GitHub Actions run 40516735213, PR #64, build `44f2dc3`): Fail.** After #62 merged, integration reported 576 passed / 2 failed of 578. The two KAN-9/KAN-26 migration-upgrade tests (merged from `main` without a textual conflict) expected only migrations 014 and 015 to run; KAN-66's renumbered 016 now runs after them. The tests now also expect 016, its `revision = 1` on existing event rows and its history row. No product code changed. The re-run is recorded below when it completes.

**CI re-run after merging main — 27 October 2026 (`CI-20261027-KAN66-04`, GitHub Actions run 40518429906, PR #64, build `a5d1a3a`): Pass.** With migrations 014, 015 (KAN-9/KAN-26) and 016 (KAN-66): `npm run check` (frontend 970/43 files, backend 1,568/54); coverage; `npm run test:integration` 578/578 in 29 files, including all 23 KAN-66 PostgreSQL cases and the updated KAN-9/KAN-26 upgrade tests; `npm run test:e2e` 182/182. KAN-66 behaviour is unchanged from `CI-20261027-KAN66-02`; this run confirms it alongside the merged equipment work.

**KAN-15 branch, same fix — 27 October 2026.** The KAN-9/KAN-26 upgrade tests on `feat/KAN-15-change-requests` also expect migration 017 after 016; carried over with the KAN-66 fix.

**CI on the merged branch — 27 October 2026 (`CI-20261027-KAN15-03`, GitHub Actions run 40518553292, PR #65, build `b74c7a7`): Pass.** With `main` (#62, KAN-9/KAN-26) and KAN-66 merged in and migrations running 014, 015, 016 and 017: `npm run check` (frontend 992/45 files, backend 1,613/57); coverage; `npm run test:integration` 589/589 in 30 files; `npm run test:e2e` 185/185. KAN-15 behaviour is unchanged from `CI-20261027-KAN15-02`; this run confirms it still passes alongside the equipment and planning-edit work.

## 27 October 2026 — KAN-62 / KAN-63 rebase corrections

Run ID: `AUTO-20261027-KAN62-63-01`. Executor: Codex in Ryan's local Windows workspace. The updated source tree was uncommitted and based on branch commit `0da0a3c`; a tested-change commit SHA is **Not recorded**. No shared database was accessed.

The first `npm run check` after inspecting the manual rebase failed two KAN-62/63 route-boundary assertions because the rebase result omitted both story routers from `backend/src/app.ts`. The cancellation endpoint, equipment API mounts and frontend equipment queue route were restored, and the command passed on rerun: 44 frontend test files / 947 tests; 53 backend test files / 1,527 tests; type checks and both production builds. The frontend bundle emitted a 547.69 kB chunk advisory; the build succeeded. `npm run test:coverage` passed: frontend 93.77% statements, 91.06% branches, 94.17% functions and 95.84% lines; backend 88.62% statements, 88.62% branches, 88.13% functions and 89.92% lines. The equipment request service is at 61.63% statements and event cancellation service at 90.90%; the new routes and UI retain uncovered paths, so 100% added-code coverage is not met.

Static review of `database/tests/events/cancellation-equipment.integration.test.ts` and `database/tests/database.integration.test.ts` checked the KAN-26 trigger order, terminal release metadata, migration ledger expectations, and reserved/requested/rejected line scenarios. The integration tests were updated but **not run**, as requested. No local integrated browser workflow, shared Supabase migration, or acceptance execution is claimed. The new migration is 018, reuses migration 015's `released_*` equipment fields, and protects `event_cancellations` with RLS/Data API privilege revocation. CI status, Jira status, review and merge are not recorded by this local run.

## 28 October 2026 — PR #63 review repair

**Run:** AUTO-20261028-PR63-01. **Build:** repair working tree based on main `1217cf3adcedcbf9caa76d61eeaa4d1eefc0326d`, merged with PR #63 head `f1d47d9773d8719daa6916df20bc15866586a718`. [Exact source hashes, totals and targeted coverage](../scrum/sprint-04/evidence/pr63-20261028/summary.json) identify the tested implementation; the resulting commit and CI are linked from [PR #63](https://github.com/MochaLxtte/ConnectSphere/pull/63).

**Environment:** Windows, Node 24.21.0, Vitest 4.1.11, Playwright Chromium. PostgreSQL 17 ran in disposable local container `connectsphere-pr63-test`, separate from Supabase. Migrations 001–018 and test seed were applied only locally. Database tests use isolated schemas and synthetic authenticated actors; browser/component tests substitute API responses/session fixtures. No real account password, shared data or hosted deployment was used.

| Check | Observed result | Evidence |
| --- | --- | --- |
| `npm run check` | Type checks, frontend 1,034 + backend 1,691 tests, both builds Pass | [check](../scrum/sprint-04/evidence/pr63-20261028/check.txt) |
| `npm run test:coverage` | Same tests Pass. Frontend statements 95.81%, branches 92.58%, functions 97.66%, lines 98.13%. Backend 93.33%, 94.12%, 91.86%, 93.24% respectively | [coverage](../scrum/sprint-04/evidence/pr63-20261028/coverage.txt) |
| `npm run test:integration` | 616 tests / 33 files Pass, including new lock races, stock recheck, cancellation rollback/privacy, migration preservation and KAN-15 invalidation | [PostgreSQL](../scrum/sprint-04/evidence/pr63-20261028/integration.txt) |
| `npm run test:e2e -- --workers=2 --retries=0` | 189 Pass with no retry; focused retest also 20/20 | [browser](../scrum/sprint-04/evidence/pr63-20261028/browser.txt), [focused](../scrum/sprint-04/evidence/pr63-20261028/browser-focused.txt) |

**Failure and retest trail.** The original remote PR head failed database CI before these repairs. An early local KAN-15 regression run had two test assertions reading `body.status` instead of the API's `body.plan.status`; the corrected full database run above passed ([initial](../scrum/sprint-04/evidence/pr63-20261028/integration-initial.txt)). Root type checking exposed a missing `.js` import extension in the browser-imported API client, corrected before the successful check ([initial check](../scrum/sprint-04/evidence/pr63-20261028/check-initial.txt)). The first full browser run had six failures and two first-attempt navigation timeouts that passed on retry: one equipment selector, an old no-cancellation-button assertion and four unscoped Reason selectors. The targeted assertions/selectors were corrected; a subsequent full run with two workers and retries disabled passed all 189 ([initial browser](../scrum/sprint-04/evidence/pr63-20261028/browser-initial.txt)). Prior failures remain evidence, not overwritten passes.

**Coverage limits.** The new equipment request service and shared KAN-26 reservation service have 100% statements/branches/functions/lines in focused coverage. Full-suite source counters are in the summary. Cancellation service, router and shared locks cover all lines/functions; cancellation's uncovered branches are defensive null SQL count/rowCount/audit fallbacks. The equipment panel has 98.05% lines / 87.83% branches, queue 97.87% / 83.33%, cancellation panel 100% / 93.06%; remaining frontend gaps include defensive non-ApiError/optional-data/aborted-completion paths and the unused convenience API reader. Full frontend composition is additionally exercised by browser fixtures; it is not 100% path coverage or proof against every mutation.

**Case records and manual boundary.** TC-15-101–107 and TC-06-101–105 link meaningful regression scenarios to actual files; the execution register records the identified assertions and retained browser failures/retests. Earlier manual cases TC-15-01–07 and TC-06-08–13 remain **Not executed** for this change. Connected localhost acceptance must still verify current coordinator submission → Technical Support reserve/reject → explicit replacement, stale retry, cancellation releases/audit and affected-attendee privacy with real authentication and shared development data. Coordinate missing migrations through 018 first; record/restore fixture values under §5.12. This run does not change Jira status, sprint acceptance or Done points.

**Documentation verification.** Current AC wording and ownership were read from Jira; archived sprint data was preserved. The workbook refresh changed only 18 cells, retaining seven sheets, 11 tables, seven frozen panes and 18 formulas; 14,104 other cells were checked unchanged. The affected architecture diagrams were regenerated and visually inspected. Source, case/file references, stable IDs and append-only execution history are checked in the accompanying document-validation artifact.

## 28 October 2026 — KAN-66 and KAN-15 integrated local acceptance

**Run:** `MAN-20261028-KAN66-KAN15-01`. **Executor:** Claude Code (AI agent) driving Irfan's Chrome (Claude in Chrome); Irfan signed in to every account himself and no credentials were typed or recorded. **Build:** `main` at `ac5cd8b` (PRs #64 and #65 merged), frontend and API from `npm run dev` on `http://127.0.0.1:5173` / `:3000`. **Database:** the shared Supabase development database, whose ledger shows migrations 016, 017 and 018 applied together at 2026-10-28 01:35 UTC (read-only check of `schema_migrations`; not applied by this session). **Accounts:** event_organiser2 (owner O1), event_organiser (unrelated organiser O2), coordinator_lead (Lead), event_coordinator (assigned coordinator C1), venue_staff (V1).

**Data created (retained in the shared database; removal needs team agreement):** event request `a5c973fa-cc55-47d9-aff1-295cd621bb96` "TEST – Irfan hands-on KAN-66/KAN-15 (28 Oct) – renamed by coordinator" (10 Feb 2031 10:00–14:00 SGT, APPROVED, attendance 80), its assignment, edit-audit and status-history rows, venue bookings `b0f83e4f` (Orchid Seminar Room, CANCELLED by the approved change request) and `1a7e59a9` (Harbour Hall, APPROVED), two change requests (one APPROVED, one REJECTED) and the related notifications. No existing team data was changed.

| Step | Actor | Action | Observed result |
| --- | --- | --- | --- |
| 1 | O1 | Created and submitted the event, then edited attendance 50 → 60 on `/events/:id/details` | Saved; status stayed SUBMITTED; revision 3; `event_request_edits` row (organiser, SUBMITTED). Pass |
| 2 | Lead | Assigned C1 from the event allocation page | "Event Coordinator is now the coordinator for this request." (revision 4). No automatic assignment occurred. |
| 3 | C1, then O1 | C1 opened `/reviews/:id` at revision 5 and left it open; O1 edited the purpose (revision 6) | Owner edit saved while SUBMITTED. Pass |
| 4 | C1 | Recorded an approval from the open tab | Refused: "The organiser changed this request after you opened it. Refresh it and review the latest details before deciding."; status unchanged. Pass |
| 5 | C1 | Refreshed, saw the new purpose, approved | APPROVED, revision 7. Pass |
| 6 | C1 | Edited the approved event | Page offered only name and description with a change-request explanation; rename saved (revision 8). Pass |
| 7 | C1 | Sent a start/end change for the approved event to `PATCH /api/events/:id` | `409 SIGNIFICANT_CHANGE_REQUIRED` naming `startsAt`, `endsAt`; dates unchanged. Pass |
| 8 | C1 | Requested Orchid Seminar Room for the event period | PENDING booking `b0f83e4f`. Setup |
| 9 | O1 | Request a change: attendance 60 → 80; then a second request | First saved PENDING with previous 60 and proposed 80, event still 60, page shows Awaiting review; second `409 CHANGE_REQUEST_ALREADY_PENDING`. Pass |
| 10 | C1 | Opened the Change requests panel and approved | Panel showed current 60 / requested 80 and listed the pending Orchid booking as cancelled on approval; approval set attendance 80 (revision 9), `cancelledArrangements` = Orchid, booking CANCELLED with the change-request reason. Pass, with observation O-1 |
| 11 | C1, V1 | Requested Harbour Hall for the same period; V1 approved it | Harbour Hall APPROVED. Setup |
| 12 | O1 | Requested a date change to 11 Feb 2031 | PENDING. Pass |
| 13 | C1 | Reviewed it | Panel: "This change cannot be approved because it affects confirmed venue or equipment arrangements…" naming Harbour Hall (approved); Approve and apply disabled; API approval `409 CANCEL_AND_RESUBMIT_REQUIRED`. Pass |
| 14 | C1 | Rejected with reason "Harbour Hall is already confirmed for 10 Feb. Cancel and resubmit if the date must move." | REJECTED with the reason; event dates and revision 9 unchanged; Harbour Hall still APPROVED. Pass |
| 15 | O2 | Opened `/events/:id`; read and submitted change requests; edited the event | Page: "This event request is unavailable or you do not have permission to view it."; GET event, GET/POST change requests and PATCH all 404. Pass |

**Observation O-1 (minor KAN-15 UI defect, follow-up):** immediately after **Approve and apply**, the Venue booking requests panel on the same coordinator page still showed the Orchid booking as Pending; **Refresh booking requests** then showed Cancelled with the reason. Persisted state and the Change requests panel were correct. The panel is not reloaded after a change-request decision. Not fixed in this run.

**Case mapping.** Steps 1–2 → TC-07-01; steps 3–5 (stale approval refused, then accepted after refresh) → TC-07-06; step 6 → TC-07-03; step 7 → TC-07-04; steps 9–15 → TC-19-01 to TC-19-05; step 10 → TC-19-08, for the attendance-change cancellation only. Harbour Hall (step 11) was requested after that approval, so this run does not show that a pre-existing unaffected arrangement is preserved, and no equipment line existed.

**Not covered here:** concurrent edits from the same revision (TC-07-05), notification contents for change requests (TC-19-06), the full significant-field matrix (TC-19-07), concurrent decisions (TC-19-09), arrangement preservation during an ordinary edit (TC-07-02), and the preservation and equipment parts of TC-19-08 were not exercised manually; their automated PostgreSQL evidence stands.

**Corrections, 29 October 2026 (PR #68 review by MochaLxtte).** The stale-approval observation was first recorded under TC-07-05 and is now `EX-07-06-M01`; `EX-07-05-M01` is Not executed. `EX-19-08-M01` is narrowed to the attendance-change cancellation. Not executed rows keep run, result, executor, date, build and environment as Not recorded (AGENTS.md §6.1), with the context in remarks. No observation was added or removed. Acceptance of KAN-66 and KAN-15 remains for the 31 October sprint review.

**Shared database rollout record (016–018):** read-only check on 28 October 2026 found `016_event_request_revisions.sql`, `017_event_change_requests.sql` and `018_event_cancellation_equipment_workflows.sql` in the shared ledger with `applied_at` 2026-10-28 01:35:56 UTC, after #64, #65 and #63 merged. Who ran `npm run db:migrate` is Not recorded.

## 28 October 2026 — KAN-82 independent venue arrangements automated runs

**Run:** `AUTO-20261028-KAN82-01`. **Executor:** Claude Code (AI agent) in Irfan's working session. **Build:** working tree on `feat/KAN-82-independent-venue-arrangements` from `main` `ac5cd8b`, committed unchanged as `a2a31f4`, `2339f3c` and `0b50c37` (code and tests). **Environment:** local Windows 11 workstation, Node 22.20.0 (project specifies Node 24; `EBADENGINE` warning only); disposable local PostgreSQL 17.11 cluster on `127.0.0.1:55482` for the database and browser runs, never shared Supabase. Summary: [coverage report](coverage-reports/2026-10-28-kan82.txt).

| Run | Command | Result |
| --- | --- | --- |
| AUTO-20261028-KAN82-01 | `npm run check`; `npm run test:coverage` | Pass — frontend 1,044 tests / 48 files, backend 1,723 / 61, typecheck and builds. New backend KAN-82 lines 100% covered; `VenueBookingPanel.vue` 98.21% lines (uncovered KAN-82 parts are in-flight click guards). |
| AUTO-20261028-KAN82-01 | `TEST_DATABASE_URL=… npm run test:integration` | Pass — 637/637 across 34 files, including 21 in `venue-arrangements.integration.test.ts` (three consecutive runs of that file, 21/21 each). |
| AUTO-20261028-KAN82-01 | `DATABASE_URL=… npx playwright test` | Pass — 191/191, including the two `kan82-independent-arrangements.spec.ts` tests (substituted API responses). |

**Case-level results.** `test-executions.csv` rows `EX-12-01-A02` to `EX-12-12-A03` record Pass at the unit/component (`A01`), PostgreSQL (`A02`) and browser-fixture (`A03`) boundaries only. The `EX-12-0x-P01` placeholders stay until the integrated local run is appended. TC-12-09 covers the readiness half of KAN-82-AC9; the safety-approval half is not applicable until KAN-84 stores safety approvals (decision D4).

**Regression found during development.** The first replacement change treated any `CANCELLED` original as a KAN-82 original. The existing KAN-81 suite failed two cases (a second replacement after recovery was resolved; two concurrent replacement approvals). The fix limits KAN-82 originals to explicitly cancelled rows (`cancelled_at` set) and adds an approval check under the original's lock (decision D2); the KAN-81 suite then passed in full.

**Changes to existing tests.** `backend/test/venues/booking-conflicts.test.ts` matches the changed original-booking queries; `venue-bookings-router.test.ts` mocks the new service; booking fixtures in four frontend tests and three browser specs include `replacedByBookingIds`.

**Limitations.** Unit tests use fake database clients, browser tests substitute API responses and the PostgreSQL suite uses synthetic verified identities; none uses live Supabase sign-in. GitHub CI, local integrated acceptance and independent review remain outstanding. No story acceptance, Done SP or Jira transition follows from these runs.

**GitHub CI — 28 October 2026 (`CI-20261028-KAN82-02`, GitHub Actions run 40684714674, PR #67, build `4414fde`): Pass.** The `verify` job ran on ubuntu-latest with Node from `.nvmrc` and a PostgreSQL 17 service holding an isolated test database: `npm run check` and coverage (frontend 1,044 / 48 files, backend 1,723 / 61), `npm run test:integration` 637/637 across 34 files including `venue-arrangements.integration.test.ts`, and `npx playwright test` 191/191 including `kan82-independent-arrangements.spec.ts`. Same counts as `AUTO-20261028-KAN82-01`. Rows `EX-12-01-A04` to `EX-12-12-A04` record the CI boundary per case. Local integrated acceptance with real sign-in remains **Not executed**; no acceptance is inferred.

## 28 October 2026 — KAN-15 observation O-1 fix

**Run:** `AUTO-20261028-KAN15-O1-01`. **Executor:** Claude Code (AI agent) in Irfan's working session. **Build:** `fix/KAN-15-venue-panel-refresh` working tree from `main` `ac5cd8b`. **Environment:** local Windows 11, Node 22.20; browser suite against a disposable local PostgreSQL 17 database, not shared Supabase.

**Defect.** Observation O-1 from `MAN-20261028-KAN66-KAN15-01`: after **Approve and apply** on a change request, the coordinator's Venue booking requests panel kept showing a booking cancelled by that approval as Pending until it was refreshed by hand. The approval advances the event revision; the equipment panel reloads on revision changes, but the venue panel only watched the event id, status and signed-in user.

**Fix.** `EventPlanningPanels.vue` keys the venue panel on the event revision, so it remounts and reloads its list when the revision advances. A new `EventPlanningPanels.test.ts` case checks that the list is fetched again when the revision changes and not when the parent refreshes with the same revision; it fails without the fix (one fetch instead of two).

| Command | Result |
| --- | --- |
| `npm run check` | Pass — frontend 1,035 tests / 49 files, backend 1,691 / 60, typecheck and builds |
| `npx playwright test` | Pass — 189/189 (disposable local database) |

**Not executed:** a manual re-check on localhost; planned with the KAN-82 hands-on run. TC-19-08's earlier Pass stands; this changes only when the panel reloads.

## 29 October 2026 — KAN-10 mark event as completed

**Run ID: AUTO-20261029-KAN10-01.** Branch `feat/KAN-10-complete-event`, base `main` at `409c43f` (merge of PR #69). The tested working tree is committed without further code changes as `65462578a0192bac44085be70eef7c8252472876`. Execution: 29 October 2026 Singapore time (exact start and end times Not recorded). Environment: macOS arm64, Node.js 24.21.0 (via nvm), Vitest, Playwright 1.63.0 Chromium on spare ports 3100/5273 and PostgreSQL 17.11 from `npm run db:up` with an isolated schema per integration file. Synthetic data only; no shared Supabase or real login. No migration was needed. Registered as [S4-E18](../scrum/sprint-04/evidence/README.md).

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks and both production builds; 1,054 frontend tests (50 files) and 1,716 backend tests (63 files) |
| `npm run test:coverage` | Pass: same totals. Frontend 95.94% statements / 92.96% branches / 97.7% functions / 98.26% lines; backend 93.44% / 94.19% / 91.99% / 93.35%. `completion.ts` 100% lines and functions (97.29% branches, line 78); `completion-router.ts` and the changed `trigger-matrix.ts` 100% lines and functions. `EventCompletionPanel.vue` 96% statements / 91.35% branches / 100% functions / 100% lines |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 639 tests in 34 files, including the 23 in `completion.integration.test.ts` |
| Browser suite on spare ports | Pass: 195 tests, including the 6 new `event-completion.spec.ts` tests |

**Behaviour verified (KAN-10-AC1 to AC5, AC101 to AC103).**
- Only the currently assigned Event Coordinator can complete an event (AC1, AC101). Another coordinator, an unassigned event and a coordinator reassigned away or demoted before the write all get the same 404 as a missing event; organiser, Lead, Venue Staff, Technical Support, Attendee and signed-out callers are refused (403 or 401). Nothing changes in any refused case.
- An ended CONFIRMED event becomes COMPLETED, recorded against that event with the actor and time in the status history, and no other event changes (AC2). The decision uses the database clock at the moment of the call: an event ending seconds ahead is refused with `EVENT_NOT_ENDED`, then accepted once the instant passes (AC101).
- The status survives a refresh for the organiser and the coordinator (`GET /api/events/:id` and `GET /api/events/:id/completion`); an unrelated organiser or coordinator gets 404 or null (AC3).
- Reserved equipment of this event only is released once, as `EVENT_COMPLETED` with the coordinator as releaser; requested and rejected lines and other events' reservations are untouched, the stock is available to others again, and a repeat call cannot release again (AC4, AC102). Approved venue bookings stay approved and readable, and registrations stay REGISTERED and readable.
- Approved, submitted, cancelled, rejected and draft events and an already-completed event are refused with nothing changed (AC5, AC103). Two simultaneous completions: exactly one wins; one history row, one release and one notice per person.
- The organiser and the coordinator each get one `EVENT_COMPLETED` notice, in the same transaction; a failing notice rolls back the status, the release and the history. Attendees and other users get none.
- Mutation check: ignoring the assignment check, the end-time check and the status check in turn made 2, 2 and 4 integration tests fail; the code was restored.

**Case-level results.** TC-06-18 passes and TC-06-15 passes with a stated scope (no controlled server clock, so the exact 1 ms before, at and after instants are not asserted), both in [test-executions.csv](test-executions.csv). TC-06-14, TC-06-16 and TC-06-17 are planned as manual runs; automated equivalents exist, but the manual cases stay **Not executed**.

**Failures and environment problems (none changed a test's meaning).** The existing sprint-scope test that listed `POST /api/events/:id/complete` as absent failed, as it should, and was updated. A notification-type registration I first wrote did not apply (the list on this branch differs from the KAN-18 branch), which the vocabulary test caught. A fake-database helper in my unit test did not match multi-line SQL and was corrected. Docker Desktop stopped during the work, a background run was lost when the session restarted and `/tmp` was cleared, and the verification was rerun; the credited results are from a single clean full run.

**Limitations:** not a hosted run. KAN-61 (confirmation) is not built, so the application cannot yet produce a CONFIRMED event; fixtures set the status directly, and an end-to-end hosted run is blocked until KAN-61 exists. Closing registration and withdrawal depends on KAN-14 and KAN-17 requiring a CONFIRMED event, so TC-06-17's "try registration" step cannot be shown on this branch alone. The rules, the notice recipients and the confirmation wording are team assumptions marked **To agree**. Peer review, CI on the pushed branch and merge are **Not assessed**; Jira status and assignee **Not recorded**. Unit coverage does not merge browser or integration execution; no 100% whole-project claim is made. The browser spec uses substituted API responses.

## 29 October 2026 — KAN-82 PR #67 review fixes

**Run:** `AUTO-20261029-KAN82-03`. **Executor:** Claude Code (AI agent) in Irfan's working session. **Build:** `feat/KAN-82-independent-venue-arrangements` at `dc75ce5` (after merging `main` `409c43f`) plus the uncommitted review fixes. The pre-fix attempts ran on the same commit with only the new tests added. **Environment:** local Windows 11 workstation, Node 22.20.0, Docker Compose PostgreSQL 17.11 on 127.0.0.1:5432 (`connectsphere_test` for integration, `connectsphere` migrated to 018 for the browser API server); not the shared Supabase database.

**Review findings (MochaLxtte, 28 October, changes requested).** (1) Cancelling an arrangement locked the original booking and then the event, while approving a replacement locked the event and then the original, so the two could deadlock across venues. (2) A refresh did not clear a replacement source that was still listed but no longer replaceable, so a hidden stale ID could be submitted. (3) `confirmCancel` and its button were not guarded by `needsRefresh`, so a cancel could be retried after a 409 or 500 before the required refresh.

**Fixes.** `decideVenueBooking` now locks a replacement's original booking right after the replacement's own row and before the event, matching the venue gate → booking → event order of arrangement cancellation and of `arrangement-locks.ts` (KAN-62, KAN-15). The original's checks are unchanged and still run under its lock. `VenueBookingPanel.vue` clears the selected replacement source on reload unless it is still in the replaceable list, and blocks both `confirmCancel` and the **Confirm cancellation** button while a refresh is required.

| Run | Command | Result |
| --- | --- | --- |
| Pre-fix, TC-12-13 | `npx vitest run --config vitest.integration.config.ts …venue-arrangements… -t "never deadlocks"` | **Fail** (expected): both scenarios rejected the cancel with PostgreSQL `40P01 deadlock detected` |
| Pre-fix, TC-12-14 | `npx vitest run …VenueBookingPanel.test.ts` (component without the fixes) | **Fail** (expected): 3 of 45 |
| After fixes | Venue integration suites, three consecutive runs | Pass — 285/285 each run |
| After fixes | `npm run check` | Pass — frontend 1,046 / 49 files, backend 1,723 / 61, typecheck and builds. The first attempt timed out in two unrelated tests (KAN-34 `EventDraftEditPage`, KAN-51 `VenueAvailabilityPage`) while Docker Desktop was starting; both passed alone (31/31) and in the full re-run. |
| After fixes | `npm run test:integration` | Pass — 639/639 across 34 files |
| After fixes | `npm run test:coverage` | Pass — frontend 98.26% lines, backend 93.4% lines (venues module 94.84%) |
| After fixes | `npx playwright test tests/e2e/kan82-independent-arrangements.spec.ts tests/e2e/venue- --workers=1` | Pass — 76/76 in 2.5 minutes (substituted API responses) |

**Case-level results.** `test-executions.csv` rows `EX-12-13-A01` (Fail) to `-A03`, `EX-12-14-A01` (Fail) and `-A02`, plus regressions `EX-12-10-A05` and `EX-12-12-A05`. New specifications TC-12-13 and TC-12-14 were added rather than changing TC-12-10 and TC-12-12, so their earlier runs stay comparable.

**Test design.** TC-12-13 holds the event row in a third session, lets the approval queue first, then the cancel, and waits on `pg_stat_activity` lock waits rather than timers. With the old order the approval obtains the event and then waits for the original that the cancel holds; with the new order the cancel waits for the original and is refused once the approval commits. The unit assertion in `booking-conflicts.test.ts` now expects the original's lock between the replacement's row and the event row.

**Limitations.** The browser run covered only the KAN-82 and venue specs, with one worker; the first full-suite attempt overloaded the workstation and was stopped by the user. The full browser suite runs in CI on push. Synthetic identities and substituted API responses only; no live Supabase sign-in. Local integrated acceptance (AGENTS.md §5.12) remains **Not executed**; acceptance **Not assessed**. No new coverage report file was saved.

## 29 October 2026 — KAN-17, KAN-67 and KAN-80 test specification expansion

This is test preparation under AGENTS.md §4 steps 9–12, approved by Arvin in chat and prepared with Codex. It is not an AUTO/MAN run, implementation delivery, meeting, review or acceptance decision. Sources: live [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17), [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) and [KAN-80](https://smu-g7-grp1.atlassian.net/browse/KAN-80), read through authenticated Jira MCP on 28 October 2026. All three were To Do / Arvin / Sprint 4 (Future), with unchanged 2/2/3 SP. KAN-14 supplies registration/re-entry prerequisites; KAN-64 is Done in Jira and supplies inbox infrastructure. A dependent card's status does not execute these cases. The current master guide at `ac5cd8bb442e45a5e1c5e32986132ce22ca25f12` uses integrated local acceptance; older hosted-only notes remain historical.

Added **61** reusable specifications: **17 KAN-17**, **14 KAN-67**, **30 KAN-80**. Every one of the **29 live ACs** has a separate traceability row linking relevant detailed cases. Existing grouped cases, IDs, source notes and execution results are preserved. New cases carry explicit proposed synthetic data, prerequisites, steps, observable results and normal/boundary/conflict/failure purpose. Execution rows are preparation placeholders: result Not executed; run ID, actual result, executor, execution date, build, environment and evidence Not recorded. No earlier case result transfers automatically to a new specification.

| Group | New cases | Main coverage |
| --- | --- | --- |
| S4-T09 / KAN-17 / CF-18 | TC-18-401–417 | Own withdrawal; cancel/confirm; persisted status; just before/exactly at/after start; close vs start; stale dialog; finite/unlimited capacity; concurrent/repeated requests; wrong owner/role; missing/inactive records; update/notice/commit failure; re-entry conditions; intended notices |
| S4-T10 / KAN-67 / CF-18 | TC-18-418–431 | Owner/current coordinator; event/status/count accuracy; committed and failed mutations; empty/inactive-only rosters; UI/API denial; field allowlist; immediate reassignment revocation; delayed route/account responses; load errors |
| S4-T13 / KAN-80 / CF-20 | TC-20-401–430 | Equipment confirmation/unavailability; significant change submission/action/decisions/affected attendees; confirmation/cancellation; registration/withdrawal; entities/links; recipient/read-state security; commit/rollback/replay/recipient overlap; actor acknowledgement; inbox reuse; separate CR responsibilities |

**Existing source mapping, inspected but not rerun:** TC-20-401 links `backend/test/equipment/reservation-notifications.test.ts` and `database/tests/equipment/reservations.integration.test.ts` to the equipment-confirmation slice (AC1/5). TC-20-404/406/407 link `backend/test/notifications/change-request-notifications.test.ts` and `database/tests/events/change-requests.integration.test.ts` to change submission and organiser outcome slices (AC2/5). TC-20-429 links the equipment notification test to its overlapping-recipient builder/writer slice (AC7/8); the mock writer assertion does not prove concurrent PostgreSQL uniqueness. The referenced implementation lives in `backend/src/modules/notifications/trigger-matrix.ts`, `change-request-notifications.ts`, `notify.ts`, equipment reservation service and event change-request service. Traceability lists these paths only on the relevant AC rows. Remaining cases have no confirmed permanent automated path; none is invented. Existing notification source tests do not prove full recipient matrices, every business trigger, protected target navigation or integrated acceptance.

**Execution boundaries and unresolved details:** notification requests for action use the recorded matrix; an unspecified exact recipient decision remains To agree. An attendee-relevant accepted change must be a legal KAN-15 transition; do not bypass major-change cancellation/new-request rules just to force a fixture. Any incompatible source condition is a dependency/policy gap, not a passing result. Read-state cases reuse supported KAN-64 behaviour and do not assume a new mark-unread endpoint. TC-20-422–425 are parameterised transaction specifications: record each trigger variation and fault separately; full-case Pass requires all specified variations. Static responsibility review TC-20-430 is not a functional test or a new story-point decision.

**Environment and cleanup:** concurrency, clock boundaries and fault injection require isolated PostgreSQL. UI response-order fixtures cover UI isolation only. Integrated manual acceptance uses localhost frontend/API, real authentication and the agreed development database with the person signing in; record originals and coordinate restoration. No shared database was mutated for this preparation. New test fixtures are proposed, not claimed to exist or have been run. No migrations, new requirements, estimate changes or Jira transitions are part of this scope.

**Verification of these documents — 29 October 2026:** structural validation passed for 61 new cases, 29 individual live AC rows, 61 Not executed placeholders and nine existing code/test paths. No missing AC links, orphan new cases or duplicate case/execution IDs were found. Every active criterion's wording was compared with a fresh authenticated Jira MCP read on 29 October and is unchanged. Historical CSV rows/narratives were compared against base `ac5cd8bb442e45a5e1c5e32986132ce22ca25f12` and preserved (ignoring Git line-ending conversion); backlog changes are limited to the approved case links and dated planning supplement. `git diff --check` passed. No application tests or coverage run is claimed. New application code coverage is not applicable because this change adds specifications only. Integrated acceptance and the newly specified cases remain Not executed; story acceptance remains Not assessed.

The following repeatable PowerShell/Python check validates the delivered register links, required fields, real paths, placeholder metadata, unchanged historical CSV rows and active backlog wording against that base. The separate live Jira comparison above requires authenticated Jira access; this command does not claim to query Jira or execute application cases.

```powershell
@'
import csv, io, re, subprocess
from pathlib import Path
root = Path.cwd()
base = 'ac5cd8bb442e45a5e1c5e32986132ce22ca25f12'
def rows(path, old=False):
    text = (subprocess.check_output(['git', 'show', base + ':' + path]).decode('utf-8-sig')
            if old else (root / path).read_text(encoding='utf-8-sig'))
    return list(csv.DictReader(io.StringIO(text)))
paths = ['docs/testing/test-cases.csv', 'docs/requirements/traceability.csv',
         'docs/testing/test-executions.csv']
for path in paths:
    before, after = rows(path, True), rows(path)
    assert after[:len(before)] == before, path
cases, traces, executions = map(rows, paths)
new = cases[len(rows(paths[0], True)):]
ids = {r['test_case_id'] for r in new}
assert len(new) == len(ids) == 61
assert all(None not in r and all(v and v.strip() for v in r.values()) for r in new)
assert len({r['test_case_id'] for r in cases}) == len(cases)
assert len({r['execution_id'] for r in executions}) == len(executions)
expected = {f'KAN-{story}-AC{ac}' for story in [17, 67, 80]
            for ac in (list(range(1, 10)) if story == 80 else list(range(1, 8)) + [101, 102, 103])}
selected = [r for r in traces if r['status'].startswith('29 October 2026 individual-AC specification;')]
assert len(selected) == 29 and {r['acceptance_criterion_ids'] for r in selected} == expected
by_id = {r['test_case_id']: r for r in new}
linked = set()
backlog = (root / 'docs/scrum/sprint-04/sprint-backlog.md').read_text(encoding='utf-8')
old_backlog = subprocess.check_output(['git', 'show', base + ':docs/scrum/sprint-04/sprint-backlog.md']).decode('utf-8')
for row in selected:
    ac = row['acceptance_criterion_ids']
    matches = re.findall(r'^\| \*\*' + re.escape(ac) + r'\*\* \| (.*?) \| (.*?) \|$', backlog, re.M)
    old = re.findall(r'^\| \*\*' + re.escape(ac) + r'\*\* \| (.*?) \| (.*?) \|$', old_backlog, re.M)
    assert len(matches) == len(old) == 1 and matches[0][0] == old[0][0]
    for ident in row['test_case_ids'].split('; '):
        assert ident in ids and ac in by_id[ident]['acceptance_criterion_ids'].split('; ')
        assert ident in matches[0][1].split(', ')
        linked.add(ident)
    for field in ['implementation_path', 'automated_test_path']:
        assert all(p == 'Not recorded' or (root / p).is_file() for p in row[field].split('; '))
assert linked == ids
planned = [r for r in executions if r['test_case_id'] in ids and r['result'] == 'Not executed']
assert len(planned) == 61 and {r['test_case_id'] for r in planned} == ids
for row in planned:
    assert row['result'] == 'Not executed'
    assert all(row[k] == 'Not recorded' for k in ['run_id', 'actual_result', 'executed_by',
               'date_of_execution', 'build', 'environment', 'evidence'])
subprocess.run(['git', 'diff', '--check'], check=True)
print('PASS: 61 specifications, 29 AC mappings, 61 unperformed placeholders; history preserved')
'@ | python -
```

## 29 October 2026 — KAN-17, KAN-67 and KAN-80 implementation verification

**Run:** `AUTO-20261029-KAN1780-01`, executed by Codex on Windows with Node 24.22.1, isolated local PostgreSQL 17 and synthetic accounts. Build: the implementation worktree based on `ac5cd8bb442e45a5e1c5e32986132ce22ca25f12`, subsequently committed without code changes as `1855ab588bfce3d44d0fceb57be03622cf5e053b`; documentation remained uncommitted during the run. The local database was created for this run and migration 019 was applied there only. No shared Supabase changes or user sign-in occurred.

| Check | Result and boundary |
| --- | --- |
| `npm run check` | Pass: 1,049 frontend and 1,726 backend tests, typechecks and builds. |
| `npm run test:coverage` | Pass: frontend 95.80% statements / 92.49% branches / 97.72% functions / 98.18% lines; backend 93.41% / 94.06% / 91.98% / 93.33%. Frontend registrations: 95.14% statements / 88.79% branches / 100% functions / 100% lines. Backend registration service: 100% lines; branch coverage is below 100%. These are whole-file figures, not proof of every AC. The final small-screen CSS adjustment was verified in a subsequent focused browser run. |
| `npm run test:integration` | Pass: 637 tests across 35 files against isolated PostgreSQL. Migration upgrade checks, authorization, concurrent withdrawal, rollback, notification persistence and reassignment are included. |
| `npm run test:e2e` | Pass: 191 Chromium tests. The registration browser tests substitute API responses; they verify UI, confirmation, refresh and responsive layout, not a live integrated product workflow. A later focused run of the two registration cases passed after the mobile layout adjustment. |

The initial full PostgreSQL run failed 12 migration-history expectations because migration 019 was not yet listed in the existing expected migrations. After updating those expectations, a second full run failed one KAN-15 assertion that selected an arbitrary decision recipient after a coordinator acknowledgement was added. The assertion was corrected to identify the organiser and separately verify the coordinator; its focused retest and the final full suite passed. The first focused browser attempt lacked `DATABASE_URL`; the next exposed an overbroad browser route fixture intercepting a frontend module. Both were corrected for the retest. A later first coverage attempt exposed a test fixture reusing a consumed `Response`; a fresh response per request fixed it. These were test/environment failures and are not recorded as failed product cases. Logs are registered as S3-E29.

**Supported case-level execution:** `TC-18-408`, Pass, is backed by the named real-PostgreSQL concurrent-withdrawal scenario in `database/tests/events/registrations.integration.test.ts`: one request changed the row, one replay did not, a replacement registration remained active, the original time was retained and exactly three withdrawal notices persisted. `TC-20-430`, Pass, is the separate static responsibility review `MAN-20261029-01` below. Other new specifications remain **Not executed** at the whole-case level unless a separate result is added. Unit, database and browser suites exercise additional subsets of KAN-17/67/80, but their aggregate Pass does not establish every detailed specification or a complete story acceptance.

**Coverage and dependency limits:** the API and service test suites do not cover every defensive branch. The browser layer uses substituted APIs; direct PostgreSQL/HTTP tests use synthetic authentication. Full registration creation and re-entry belong to KAN-14, final event confirmation to KAN-61, and stock editing to KAN-18; tests exercise their transaction hooks with isolated fixtures, not those unfinished user workflows. The KAN-15 attendee-change notice is tested for an allowed purpose change; other affected changes remain subject to KAN-15's cancel-and-resubmit policy. Whether KAN-80-AC2's request for action requires a distinct workflow, and its recipient details, remain **To agree** in the [decision log](../requirements/assumptions-and-questions.md#29-october-2026--kan-80-change-action-and-recipient-interpretation). Full connected local acceptance using real authentication and the agreed shared development database is **Not executed**; story acceptance is **Not assessed**. No review, merge, Done point or customer approval is claimed.

**Cutoff and recipient follow-up:** the source was corrected so an already-active registration on a non-terminal event can be withdrawn before start without requiring the event to be Confirmed, and an unchanged replay at or after start is refused. Focused unit (24 tests), isolated PostgreSQL registration (12 tests) and notification (9 tests) retests passed, followed by the 637-test integration run above. A different Technical Support actor who records an equipment shortfall also receives an acknowledgement in addition to the relevant original deciding staff member. This is interpretation of the existing KAN-17-AC101 and KAN-80-AC1/8, not a new acceptance criterion or team decision.

### MAN-20261029-01 — TC-20-430 static responsibility review

On 29 October Codex read the live Jira KAN-64/80/81/83/84 cards and repository split mapping and case register, using Arvin's authenticated Jira session. The [recorded observations](../scrum/sprint-03/evidence/kan1780-20261029/scope-review.txt) identify CR-2/4/6 notification criteria and their test cases, the original-scope split and the native 5 + 3 SP fields. **Pass** for the static mapping review only. No shared values or data were modified and no product workflow was executed; full KAN-80 integrated acceptance remains **Not executed**.

## 29 October 2026 - PR #70 review corrections

**Run:** `AUTO-20261029-KAN1780-02`, Codex on Windows / Node 24.22.1, merge commit `eca4cd1` plus the uncommitted review corrections. Isolated PostgreSQL 17 on localhost and synthetic accounts; browser API responses substituted. No shared Supabase or real login.

`npm run check` passed: 1,051 frontend and 1,727 backend tests, typechecks and builds. `npm run test:coverage` passed: frontend 95.95% statements / 92.86% branches / 97.83% functions / 98.28% lines; backend 93.39% / 93.99% / 92.01% / 93.34%. `npm run test:integration` passed 639 tests in 35 files. `npm run test:e2e` passed 192 tests, including the duplicate-name registration target, with substituted browser APIs. The targeted PostgreSQL cancellation and outcome suites passed 19 tests. Cancellation and inbox reached 100% line coverage; branch and SQL coverage remain incomplete.

The first full database attempt failed an older cancellation test expecting no attendee link. A subsequent check failed because the first test edit declared its fixture ID in the wrong test. Both test expectations were corrected; the targeted and final full retests passed. Two overlapping integration attempts were stopped after stalling; the final full run was restarted alone. These are test/fixture and execution issues, not recorded product-case failures. Logs are registered in S3-E29.

The real PostgreSQL scenarios assert that only current arrangement staff receive confirmation or cancellation, and that cancellation's single writer preserves the existing manager message. Purpose-change and browser/component scenarios check a recipient-scoped registration link, current purpose and duplicate event names. Notification labels cover venue requirements and accessibility needs without exposing their internal values. These are partial scenario results: TC-20-417 and other whole-case placeholders remain Not executed; no suite total is represented as connected or case-level acceptance. Real authentication, shared migration 019, KAN-14/18/61 dependencies, integrated acceptance and renewed review remain outstanding.

**Artifact readability:** the earlier S3-E29 PowerShell output files were converted from UTF-16 to UTF-8 with line-end whitespace normalized; the contents and reported outcomes were retained.

## 29 October 2026 — KAN-14 register for an event

**Run ID: AUTO-20261029-KAN14-01.** Branch `feat/KAN-14-register-for-event`, base `main` at `409c43f` (merge of PR #69). The tested working tree is committed without further code changes as `3940f921c849fc2ecaa6fc778927125819d035f8`. Execution: 29 October 2026 Singapore time (exact start and end times Not recorded). Environment: macOS arm64, Node.js 24.21.0 (via nvm), Vitest, Playwright 1.63.0 Chromium on spare ports 3100/5273 and PostgreSQL 17.11 from `npm run db:up` with an isolated schema per integration file. Synthetic data only; no shared Supabase or real login. No migration was needed. Registered as [S4-E19](../scrum/sprint-04/evidence/README.md).

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass on rerun: type checks and both production builds; 1,066 frontend tests (51 files) and 1,750 backend tests (64 files). The first run stopped at the type check because of type errors in my own new unit test; they were corrected and the full check passed |
| `npm run test:coverage` | Pass: same totals. Frontend 95.95% statements / 93.05% branches / 97.84% functions / 98.31% lines; backend 93.58% / 94.11% / 92.28% / 93.47%. New backend files `registration-rules.ts`, `registration-service.ts` and `registration-router.ts` are 100% on lines and functions and all branches. Frontend: `attendee-events.ts` and `AttendeeAccessPage.vue` 100% on all four measures, `AttendeeEventPage.vue` 94.11% / 93.8% / 100% / 100%, `AttendeeEventsPage.vue` 96.77% / 95.83% / 100% / 100%. One line was added to the frontend coverage configuration to include the new feature folder |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 649 tests in 34 files, including the 33 in `registration.integration.test.ts` |
| Browser suite on spare ports | Pass: 199 tests, including the 10 new `attendee-registration.spec.ts` tests |

**Behaviour verified (KAN-14-AC1 to AC8, AC101 to AC104).**
- An attendee sees a CONFIRMED event's name, purpose, description, time, approved venues, accessibility notes and registration conditions (window, capacity, places left) and nothing about people: no organiser, coordinator or other attendee appears in the response (AC1, AC101). No personal-data form exists; the signed-in account is the only input.
- Registration is accepted only for a CONFIRMED event that takes registrations, inside [opens, closes) by the database clock, before the event starts and with a place left; a null window is unbounded, a null capacity unlimited and capacity zero full (AC2, AC102). Approved, submitted, completed and cancelled events are not revealed to someone with no registration (404). A switched-off or undecided registration, a window not yet open or already closed, a started event and a full event each give their own 409 code and message and create no record (AC6).
- A registration is saved against the right attendee and event and is shown again, with its status, after a reload and in the attendee's own list, even after the event is completed (AC3, AC4). Another attendee sees no trace of it, and a body naming another attendee's id is refused (AC8).
- Capacity: exactly one of two simultaneous attendees gets the last place (three repeats), 8 attendees racing for 3 places gives exactly 3, and a request that waited on the event lock while a competitor committed is refused as full (AC5). The database capacity trigger remains the last line of defence and the service maps it to the same Full answer.
- A duplicate active registration is refused; a withdrawn attendee reuses the same record and one place, and is refused, unchanged, when the window has closed or the event is full (AC7, AC103). The record was marked WITHDRAWN through SQL because withdrawal (KAN-17) does not exist.
- The attendee gets a `REGISTRATION_CONFIRMED` notice and the organiser and coordinator each a `REGISTRATION_RECEIVED` notice carrying only the running count, in the same transaction; a failing notice rolls the registration back and frees the place (AC104). The attendee's notice links to `/attend/:id`; a stranger sees none.
- Only attendees can use any route: organiser, coordinator, Lead, Venue Staff and Technical Support get 403, signed-out callers 401, and an attendee whose role was removed before the write 403 (AC101).
- Mutation check: removing the "full" rule made 1 integration test fail. Reverting to a single locking read, which counts places before waiting for the lock, did **not** change any outcome, because the database capacity guard and its mapping return the same Full answer; the lock-wait test therefore documents the behaviour but cannot tell the two implementations apart.

**Case-level results.** TC-18-04 and TC-18-05 (integration) are recorded Pass in [test-executions.csv](test-executions.csv). TC-18-01, TC-18-02, TC-18-03 and TC-18-06 are planned as manual runs; their scenarios are reproduced by automated tests (details, the state/window/capacity matrix, success and persistence, and cross-attendee refusal), but the manual cases stay **Not executed**.

**Failures and problems found (none hidden).** A first version read the registration counts in the same statement that took the event lock; in a race the losing attendee got a 500 instead of a Full answer because the counts came from the snapshot taken before the wait. The service now takes the lock in one statement and reads the counts in the next, and maps the capacity trigger's error to the same Full answer. One list query passed an unused parameter and returned 500. A mock in my unit test mixed up which read it was answering, and several integration assertions wrongly assumed an attendee had no registrations from earlier tests in the same file; all were corrected in the tests. An unrelated flake class (`socket hang up`, `Parse Error: Expected HTTP/`) seen in earlier runs did not appear in the credited full runs.

**Limitations:** not a hosted run. KAN-61 (confirmation) is not built, so the application cannot yet produce a CONFIRMED event; fixtures set the status directly, and an end-to-end hosted run is blocked until KAN-61 exists. KAN-17 (withdrawal) is not built. The venue and conditions shown to attendees, the manager notices (running count, attendee not named) and the 100-event list limit are team assumptions marked **To agree**. Peer review, CI on the pushed branch and merge are **Not assessed**; Jira status and assignee **Not recorded**. Unit coverage does not merge browser or integration execution; no 100% whole-project claim is made. The browser spec uses substituted API responses.

### Rerun on the merged tree — AUTO-20261029-KAN14-02 (PR #76 review)

The review of PR #76 found that the isolated-branch run did not establish the integration: `registration-service.ts` wrote `REGISTRATION_CONFIRMED` / `REGISTRATION_RECEIVED` itself while main's migration 019 (`notify_registration_outcome`) already emits `REGISTRATION_CONFIRMED` to the attendee, organiser and coordinator, with different dedupe keys, so registration and re-registration produced duplicates. AUTO-20261029-KAN14-01 above therefore **no longer describes the delivered behaviour for notices**: its statements about `REGISTRATION_RECEIVED`, the `/attend/:id` notice link, and the unavailable withdrawal feature are superseded by this run.

**Run ID: AUTO-20261029-KAN14-02.** Commit `a37ddeb5067971f68bafd8454f0c1cf6f40f5ad1` (merge of `origin/main` at `ba869a8` into the KAN-14 branch; the later documentation commit changes no code). Environment as above (macOS arm64, Node.js 24.21.0, PostgreSQL 17.11 from `npm run db:up`, isolated schema per file, Playwright 1.63.0 Chromium on ports 3100/5273); synthetic data only, no shared Supabase or real login. The complete schema (migrations 001 to 019 as on main) is applied by the test fixture.

**Change made.** The service writes no notice. The `registrationNotifications` builder, the `REGISTRATION_RECEIVED` type and the `/attend/:id` inbox rule were removed, so there is one writer (migration 019) and attendees keep main's protected `/registrations?registration=<id>` link. Main's `service.ts` / `router.ts` (withdrawal and roster) were kept; both routers are mounted.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks and both production builds; 1,112 frontend tests (54 files) and 1,836 backend tests (69 files) |
| `npm run test:coverage` | Pass: same totals. Frontend 95.90% statements / 92.90% branches / 97.87% functions / 98.36% lines; backend 93.83% / 94.26% / 92.61% / 93.78%. Module-level only: backend `registrations` 100 / 98.76 / 100 / 100; frontend `registrations` 95.28 / 88.37 / 100 / 100 |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 719 tests in 38 files, including the 34 in `registration.integration.test.ts` |
| Browser suite on spare ports | Pass: 210 tests |

**Integration verified.** Registration → withdrawal through the real `POST /api/registrations/:id/withdraw` → replayed withdrawal → re-registration, against the complete schema: the attendee, organiser and coordinator each have exactly one `REGISTRATION_CONFIRMED` per outcome (dedupe keys `…:<registration id>:1` and `…:3`) and one `REGISTRATION_WITHDRAWN`; no `REGISTRATION_RECEIVED` exists; the replay and a refused duplicate add no notice (9 notices in total); the record is reused with no withdrawal time; a stranger's inbox shows nothing; a failing notice insert rolls the registration back and frees the place. The race, lock-wait and capacity tests also pass with the trigger as the only writer.

**Not done / limits.** I did not mutate the code to re-introduce a second writer; the exact-count assertions would fail on one, but that is reasoning, not a recorded mutation run. The earlier note about the single-statement lock still applies. The e2e specs use substituted API responses. Hosted/manual runs, CI on this merge, independent review and acceptance remain **Not executed / Not assessed**; KAN-61 is still not built, so tests set CONFIRMED in SQL.

## 29 October 2026 — KAN-18 equipment stock and operational status

**Run ID: AUTO-20261029-KAN18-01.** Branch `feat/KAN-18-equipment-stock-status`, base `main` at `409c43f` (merge of PR #69). The tested working tree is committed without further code changes as `b0ba1ce18d32e5a9e7482b60917e5acccb36493e`. Execution: 29 October 2026 Singapore time (exact start and end times Not recorded). Environment: macOS arm64, Node.js 24.21.0 (via nvm), Vitest, Playwright 1.63.0 Chromium on spare ports 3100/5273 (the developer's own dev servers hold 3000/5173) and PostgreSQL 17.11 from `npm run db:up`, using the dedicated `connectsphere_test` database with an isolated schema per integration file. Synthetic data only; no shared Supabase or real login. Migration 019 was applied only to those isolated schemas. Registered as [S4-E17](../scrum/sprint-04/evidence/README.md).

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks and both production builds; 1,068 frontend tests (51 files) and 1,761 backend tests (65 files) |
| `npm run test:coverage` | Pass on rerun: same totals. Frontend 95.83% statements / 92.95% branches / 97.75% functions / 98.3% lines; backend 93.67% / 94.35% / 92.44% / 93.57%. New backend files `stock-input.ts`, `stock-rules.ts`, `stock-router.ts` and `stock-service.ts` and the changed `trigger-matrix.ts` are 100% on statements, branches and functions. `EquipmentStockPage.vue` 92.45% statements / 92.26% branches / 96.77% functions / 99.1% lines (line 223 uncovered) |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 653 tests in 34 files, including the 37 in `stock.integration.test.ts` (32 behaviour tests and 5 that reproduce the TC-16-01 to TC-16-05 figures exactly) |
| Browser suite on spare ports (see limitations) | Pass: 200 tests, including the 11 new `equipment-stock.spec.ts` tests |

**Behaviour verified (KAN-18-AC1 to AC6, AC101 to AC103).**
- Technical Support Staff see every equipment type with total, damaged, maintenance, operational (usable) quantity, an Available / Partly unavailable / Unavailable status and a revision (AC1, AC3). Marking units damaged or under maintenance, or raising the total, saves with a new revision and an append-only history row holding actor, time and reason (AC2, AC3, AC101).
- Damaged and maintenance units are not counted by the KAN-9 availability check and cannot be newly reserved (AC4, AC5): both the service and the database guard `equipment_requests_within_pool` refuse a reservation the operational stock cannot cover. Restoring the quantities makes the next check and reservation succeed (AC6).
- Negative, fractional, text and over-limit quantities, a missing reason, a missing revision, damaged plus maintenance above the total and unknown fields are refused with nothing saved (AC101). Organiser, coordinator, Lead, Venue Staff and Attendee callers, a signed-out caller and a technician whose role was removed before the write are refused with nothing saved.
- A loss never cancels or edits a reservation. Events whose reservations exceed the new operational stock are listed with their gap, and each affected event's assigned coordinator gets one `EQUIPMENT_STOCK_SHORTFALL` notice per stock change, in the same transaction; events that stay covered, other coordinators and the technician get none. Restoring or raising stock sends nothing. New reservations stay blocked while the shortfall lasts (AC102).
- A stale form is refused with 409 and cannot overwrite newer quantities, including after the quantities returned to earlier values; exactly one of two simultaneous changes from the same form wins; a retry of a change that already committed returns the saved state once, with no second history row or notice; identical quantities record nothing (AC103). A failing notification rolls back the quantities and the history row. The history table is append-only and unreachable by the Data API roles.
- Mutation check: breaking the stale-revision check, the shortfall notification and the role check in turn made 4, 5 and 1 integration tests fail; the code was restored.

**Case-level results.** TC-16-01, TC-16-03 and TC-16-04 (integration cases) are recorded Pass in [test-executions.csv](test-executions.csv) against their stated figures. TC-16-02 and TC-16-05 are planned as manual runs; their figures are reproduced by automated tests in the same file (a 1-unit shortfall for 8 against 7 operational units; a 1-unit shortfall for E-A and none for the disjoint E-B), but the manual cases stay **Not executed**.

**Failures and environment problems during the run (none changed a test or the code under test).** A hand-written scenario test first expected a shortfall of 3 where the correct figure is 5, because the expected value was miscounted; the expectation was corrected. A frontend plural was wrong in the first version of the page ("3 coordinator were notified") and was fixed with a test. In the full backend run one test failed once with `socket hang up` and, in the integration run, individual tests failed intermittently with `Parse Error: Expected HTTP/, RTSP/ or ICE/`, in different files on different runs; the same files passed alone and on rerun, as with the earlier local port collisions. One integration run took 938 seconds on a single test and failed it, and another was killed (exit 137) when Docker Desktop stopped; both passed on rerun after restarting Docker. The last full runs above are the credited ones.

**Limitations:** this is not a hosted run; no shared Supabase, real login or deployed API was used, so hosted acceptance and the manual TC-16-02 and TC-16-05 remain **Not executed**. Migration 019 is not applied to shared Supabase and must be coordinated with the team first. The shortfall definition, who is notified, the 1,000,000 quantity limit and the 500-character reason limit are team assumptions marked **To agree** in the decision log. Peer review, CI on the pushed branch and merge are **Not assessed**; Jira status and assignee are **Not recorded**. Unit coverage does not merge browser or integration execution; no 100% whole-project claim is made. The browser spec uses substituted API responses; the database tests establish the arithmetic and guards.

### Rerun on the merged tree — AUTO-20261029-KAN18-02 (PR #74 review)

The review of PR #74 found, against the combined schema: (1) two notice writers for one stock loss, the service's `EQUIPMENT_STOCK_SHORTFALL` and main's migration 019 trigger `notify_equipment_shortfall` (`EQUIPMENT_UNAVAILABLE`); (2) a lock order of equipment pool then event (through the trigger's notice foreign keys) against the event then pool order of cancellation and completion; (3) a migration number that clashed with main's 019; and (4) evidence ID S4-E17, already KAN-82's. AUTO-20261029-KAN18-01 above therefore **no longer describes the delivered behaviour for notices**: its statements about `EQUIPMENT_STOCK_SHORTFALL`, a coordinator-only recipient and migration 019 are superseded by this run.

**Run ID: AUTO-20261029-KAN18-02.** Commit `c6269cf862c7363011e51a40d035a533c7f19e1e` (merge of `origin/main` at `ba869a8` into the KAN-18 branch; the later documentation commit changes no code). Environment as above (macOS arm64, Node.js 24.21.0, PostgreSQL 17.11 from `npm run db:up`, isolated schema per file, Playwright 1.63.0 Chromium on ports 3100/5273); synthetic data only, no shared Supabase or real login. The complete schema (migrations 001 to 020) is applied by the test fixture. Registered as [S4-E20](../scrum/sprint-04/evidence/README.md).

**Changes made.** The service no longer writes notices; `EQUIPMENT_STOCK_SHORTFALL`, its builder and its tests were removed, and `notifiedEvents` now counts the events the trigger told. The migration is `020_equipment_stock_changes.sql`. Stock editing locks the events that hold a reservation of the type, in id order, before the equipment pool; if a reservation commits between choosing the events and locking the pool it restarts (up to five attempts, then `409 EQUIPMENT_STOCK_BUSY`, never a 500). The page now says "Shortfall notices were sent for N affected events".

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks and both production builds; 1,114 frontend tests (54 files) and 1,852 backend tests (70 files) |
| `npm run test:coverage` | Pass: same totals. Frontend 95.78% statements / 92.81% branches / 97.78% functions / 98.36% lines; backend 93.94% / 94.32% / 92.81% / 93.88%. `stock-service.ts` 100 / 95.83 / 100 / 100 (uncovered branches at lines 85 and 251); `EquipmentStockPage.vue` 92.45 / 92.26 / 96.77 / 99.1 |
| `npm run test:integration` with `TEST_DATABASE_URL` | Pass: 727 tests in 38 files, including the 42 in `stock.integration.test.ts` (5 new) |
| Browser suite on spare ports | Pass: 211 tests |

**Verified against the complete schema.** For one stock loss, each affected event's coordinator and the Technical Support user who decided and changed the reservation get exactly one `EQUIPMENT_UNAVAILABLE` notice (one outcome id), a covered event gets none, no `EQUIPMENT_STOCK_SHORTFALL` row exists, and the API's reported shortfall events equal the notified events. A repeat of the request and a restore add nothing. A deterministic test pauses a real cancellation after it locks the event, starts the stock change, confirms it waits for the event lock and lets the cancellation take the pool: both finish, the line is released and no notice is written for the cancelled event. Eight concurrent stock-loss/cancellation rounds and eight stock-loss/completion rounds all returned 200 for both requests. A test restarts the attempt when a reservation commits between choosing the events and locking the pool, and the new event's coordinator is told.

**Mutation check.** I removed the event-first locking step: the deterministic lock-order test failed (the stock change never waited for the event lock) and both race tests failed with the stock request returning 500 ("Unexpected API error"); the code was restored. I did not mutate the notification consolidation; its exact-count assertions would fail on a second writer, but that is reasoning, not a recorded mutation run.

**Limits.** Not a hosted run; hosted acceptance and the manual TC-16-02 and TC-16-05 remain **Not executed**. Migration 020 was not applied to shared Supabase when this run was made; Ernest and Arvin then agreed and it was applied on 29 October 2026 with main's 019 (see database/README.md). The recipients (coordinator, deciding and acting Technical Support) are main's trigger's, and Ernest and Arvin agreed the KAN-18 rules afterwards (decision log, 29 October 2026). CI on this merge, independent review and acceptance are **Not assessed**; Jira status and assignee **Not recorded**.

## AUTO-20261029-KAN14-KAN18-MERGE — PR #76 integration with equipment stock

**Date:** 29 October 2026. **Build:** merge candidate combining KAN-14 head `ff9d9eb88c0ca7334d77bd5f16901e70b862baff` with main `43249ae38c6265590b1ed7ac04d7c264aea49da2` (PR #74). **Environment:** Windows, Node 24, isolated PostgreSQL 17 on localhost:55439, Chromium. No shared Supabase data was used or changed.

Both API mounts and separate frontend routes were retained. The seven documentation conflicts preserve both stories' original records. The execution register contains 1,002 rows with unique execution IDs; the four KAN-14 and six KAN-18 added rows remain intact.

| Command / check | Actual result |
| --- | --- |
| `npm run check` | Pass: type checks, 1,145 frontend tests in 56 files, 1,904 backend tests in 73 files, both production builds |
| `npm run db:migrate` and `npm run db:seed` | Pass on the isolated local database; migrations 001–020 applied |
| `npm run test:integration -- database/tests/equipment/stock.integration.test.ts database/tests/registrations/registration.integration.test.ts database/tests/events/registrations.integration.test.ts database/tests/database.integration.test.ts` | Pass: 104 tests in four files |
| `npm run test:e2e -- tests/e2e/equipment-stock.spec.ts tests/e2e/attendee-registration.spec.ts tests/e2e/registrations.spec.ts --workers=2` | Pass: 24 Chromium tests, no retries needed |
| Conflict-marker, whitespace and execution-ID checks | Pass |

**Limits:** Browser scenarios mainly substitute API responses; the unauthenticated API checks use the local running server. Database integration uses real isolated PostgreSQL with test identities. These results do not establish connected manual acceptance. No manual result or historical execution was changed. Coverage was not rerun locally for this merge; the fresh PR CI run remains the coverage/full-suite gate before merging. The existing large-frontend-chunk build warning remains non-blocking.

## 29 October 2026 — KAN-61 event confirmation verification

**Run:** `AUTO-20261029-KAN61-01`, executed by Claude Code (AI-assisted) for Kai Jie on Windows 11 with Node 24.11.1. Database: a disposable local PostgreSQL 17 container (the CI image) with synthetic accounts; migrations 001–019 applied there only. Build: branch `feat/KAN-61-confirm-event` based on main `2e0f895`, uncommitted at run time and committed without code changes afterwards. No shared Supabase change, no real sign-in.

| Check | Result and boundary |
| --- | --- |
| `npm run check` | Pass: 1,071 frontend and 1,785 backend tests, typechecks and builds. |
| `npm run test:coverage` | Pass: frontend 95.86% statements / 92.78% branches / 97.81% functions / 98.30% lines; backend 93.74% / 94.04% / 92.61% / 93.75%. `confirmation.ts`: 100% lines, 89.79% branches. `EventConfirmationPanel.vue`: 100% lines, 88.37% branches. Whole-file figures, not proof of every AC; uncovered branches are defensive fallbacks (missing rows, null counts). |
| `npm run test:integration` | Pass: 673 tests in 37 files, including 11 KAN-61 scenarios in `database/tests/events/confirmation.integration.test.ts`. |
| `npm run test:e2e` | Pass: 197 Chromium tests, including 3 in `tests/e2e/event-confirmation.spec.ts`. The KAN-61 browser tests substitute API responses; they verify the panel, acknowledgement, reload persistence, organiser view and narrow layout, not a live integrated workflow. |

**Failures and retests.** The first `npm run check` failed a backend typecheck in the new unit-test fixture (a literal widened to `string`); the fixture type was corrected. The first full browser run passed 197/197; a second full run failed the new coordinator confirmation test once. Cause: after a successful confirmation the host page refreshes the event status, and the panel's reset could clear the success message before it was read. The panel now keeps the outcome when only the status or revision changes for the same viewer and event; a component test covers it, and the spec then passed 15/15 with `--repeat-each=5` before the final runs above. Initial integration attempts failed on test setup only (change-request inserts missing `previous`/`base_revision`, an attempt to rewrite an immutable reserved equipment line, an unreleased aborted test connection); these were fixture corrections. Logs: S4-E18.

**Supported case-level execution:** TC-06-01, TC-06-02, TC-06-03, TC-06-04, TC-06-05 and TC-06-432 are each backed by named real-PostgreSQL scenarios (rows `EX-06-0x-AUTO-20261029-01`). The cutoff case was corrected from duplicate TC-06-08 to TC-06-432 on 29 October 2026; its original execution ID `EX-06-08-AUTO-20261029-01` and result are retained. These are scenario-level results with fixture-inserted arrangements and synthetic authentication. TC-06-06 (no staffing prerequisite) and TC-06-07 (registration schedule preserved) remain **Not executed**; the code reads no staffing data and does not modify registration fields, but no case-level run was recorded. Hosted acceptance with real sign-in remains **Not executed**; acceptance **Not assessed**.

## 29 October 2026 — KAN-61 PR #77 review fix verification

**Run:** `AUTO-20261029-KAN61-02`, Claude Code (AI-assisted) for Kai Jie, Windows 11 / Node 24.11.1, disposable local PostgreSQL 17 with synthetic accounts; build feat/KAN-61-confirm-event merge 4f23055 plus the uncommitted review fix (latest main including KAN-18 merged in). No shared Supabase change.

The review finding (P1, MochaLxtte) was that confirmation ignored current venue conflicts created by later catalogue edits. Three new real-PostgreSQL regressions — raised turnaround buffer, moved closing hours, and a buffer edit committed while confirmation waits — **failed without the fix and passed with it** (both runs recorded in this session). Full suites after the fix: `npm run check` Pass (1,154 frontend and 1,932 backend tests, typechecks, builds); `npm run test:coverage` Pass (`confirmation.ts` 100% lines / 91.22% branches); `npm run test:integration` Pass, 775 tests in 40 files (14 KAN-61 scenarios); `npm run test:e2e` Pass, 224 Chromium tests. Case retests: TC-06-03 and TC-06-05 (`EX-06-03/05-AUTO-20261029-02`). Logs: S4-E18 (`*-review-fix.txt`). Hosted acceptance remains **Not executed**.

## 29 October 2026 — KAN-84 safety review verification

**Run:** `AUTO-20261029-KAN84-01`, executed by Claude Code (AI-assisted) for Kai Jie on Windows 11 with Node 24.11.1 against a disposable local PostgreSQL 17 container (the CI image) with synthetic accounts; migrations 001–019 and 021 applied there only. Build: branch `feat/KAN-84-safety-review` based on `feat/KAN-61-confirm-event`, uncommitted at run time and committed without code changes afterwards. No shared Supabase change, no real sign-in, no Safety Officer account provisioned anywhere shared.

| Check | Result and boundary |
| --- | --- |
| `npm run check` | Pass: 1,101 frontend and 1,822 backend tests, typechecks and builds. |
| `npm run test:coverage` | Pass: frontend 95.45% statements / 91.80% branches / 97.30% functions / 98.01% lines; `features/safety` 84.78% / 72.30% / 87.80% / 88.17%. Backend 89.71% / 90.33% / 88.95% / 89.89%; `modules/safety/service.ts` 21.54% lines. **Coverage gap:** the backend coverage run counts only mocked unit/HTTP tests. The safety service's transactional rules (locks, fingerprint staleness, immutable rounds, notifications, preparation) are exercised against real PostgreSQL by the 9 scenarios in `database/tests/safety/safety-reviews.integration.test.ts`, which the coverage tool does not measure. Mocked unit tests of the same SQL were not added because they would not test the database rules that matter. |
| `npm run test:integration` | Pass: 705 tests in 39 files, including 9 KAN-84 scenarios and the migration-history suite updated for migration 021. |
| `npm run test:e2e` | Pass: 206 Chromium tests, including 3 in `tests/e2e/safety-review.spec.ts` (substituted APIs: coordinator submission and reload, officer queue → review → request changes on desktop and 390 px, preparation start and organiser blocked view). `--repeat-each=5` of that spec: 15/15. The web-server log line "Venue hold expiry run failed; it will be retried" came from the background hold-expiry job on the local database and did not affect any test. |

**Failures and retests.** The first migration-history run failed 6 expectations that compare rows before/after migrating (new empty preparation columns and `notifications.safety_review_id`); the expectations were extended. Three first-run component-test failures: two assertions read text before the re-read completed or matched a split text node (test corrections), and one real defect — the officer review page cleared the refusal message while reloading after a refused decision, so the officer never saw why; fixed so the outcome stays visible during the reload. Focused and full retests above passed. Logs: S4-E19.

**Supported case-level execution:** TC-06-20, TC-06-21, TC-06-23 to TC-06-30 are backed by named real-PostgreSQL scenarios (rows `EX-06-xx-AUTO-20261029-01`), with fixture-inserted arrangements and direct SQL for arrangement changes rather than the KAN-66/KAN-15/KAN-18 user workflows. TC-06-22 (reviewable context) and TC-06-31 (UI uncertainty) are covered by component and browser-fixture tests only and remain **Not executed** as cases. Hosted acceptance (migration 021 on the shared database, a provisioned Safety Officer, real sign-in) remains **Not executed**; acceptance **Not assessed**.

## 29 October 2026 — KAN-84 PR #78 review fix verification

**Run:** `AUTO-20261029-KAN84-02`, Claude Code (AI-assisted) for Kai Jie, Windows 11 / Node 24.11.1, disposable local PostgreSQL 17 with synthetic accounts; build feat/KAN-84-safety-review merge 69ffab8 plus the uncommitted review fixes (KAN-61 review fix and main with KAN-18 merged in). No shared Supabase change in this run.

Review findings (MochaLxtte): P1 venue hours/buffer changes did not invalidate safety approval; P2 requested technical changes could not be carried out on confirmed events. New real-PostgreSQL regressions: the P1 scenario **failed with the fingerprint change removed and passed with it**; the P2 scenario first failed at the service gate and then at the migration 015 reservation trigger, which led to the remediation-aware trigger copy in migration 021 (decision D10). Re-creating that function initially dropped its pinned `search_path` (caught by the KAN-26 migration test) and is now hardened as in migration 015. Full suites: `npm run check` Pass (1,167 frontend and 1,944 backend tests); `npm run test:coverage` Pass; `npm run test:integration` Pass, 786 tests in 41 files; `npm run test:e2e` Pass, 227 tests. **Migration rehearsal (D11):** on a local database migrated with the original 021 plus a SAFETY_OFFICER account, the one-off reversal script ran cleanly, `db:migrate` then applied only the reviewed 021 with ledger checksum equal to the file's SHA-256 (`598eed6b…`), and the account remained. Retest rows: TC-06-25, TC-06-26, TC-06-28 (`EX-06-2x-AUTO-20261029-02`). Logs: S4-E19 (`*-review-fix.txt`). Hosted acceptance remains **Not executed**.
## AUTO-20261029-PR77-REVIEW — operational-block readiness regression

**Date and executor:** 29 October 2026, Codex (AI-assisted PR review). **Build:** PR #77 head `d93ce6d6081669fa3b426c1bb4675696f6d61c49` plus the review changes, tested before commit and committed without code changes as `a31d2ef3cee6efdeacfc93b409e9eb5eb80cd3ab`. **Environment:** Windows, Node 24, Vitest 4.1.11, disposable PostgreSQL 17 container `connectsphere-pr77-78-review` at `127.0.0.1:55439/connectsphere_test`, with an isolated schema per test file and synthetic accounts. The fixture applied the migrations and removed its schema afterwards. No shared Supabase connection or migration was used.

**Finding and correction (KAN-61-AC101):** An operational block initially adjacent to an approved booking creates no outage impact. A later turnaround-buffer increase can make that booking overlap the block without adding a `RECOVERY_REQUIRED` row. Readiness therefore checks current `OPERATIONAL_BLOCK_OVERLAP` warnings as well as stored recovery flags, current approved-booking overlaps and operating-hours warnings. Confirmation retains the existing lock order and venue-row share locks. No migration or acceptance-criterion change was required.

**Failed reproduction retained:** At 21:10:38 Singapore time, the new named regression was run against the original PR head plus only the new test, using `npx vitest run --config vitest.integration.config.ts database/tests/events/confirmation.integration.test.ts -t 'buffer extended'`. It failed (1 failed, 14 skipped): `expected true to be false` at the `canConfirm` assertion. At 21:11:02, after the fix, the complete confirmation database file passed 15/15. These are observations from the captured command output; original console output was not saved as a separate log file. Earlier PR runs remain intact above.

| Command / check | Observed result |
| --- | --- |
| `npm run test -w @connectsphere/backend -- test/events/confirmation.test.ts test/events/confirmation-router.test.ts` | Pass: 30 tests, 2 files |
| `npm run test -w @connectsphere/frontend -- src/features/events/components/EventConfirmationPanel.test.ts` | Pass: 9 tests, 1 file |
| `npx vitest run --config vitest.integration.config.ts database/tests/events/confirmation.integration.test.ts` with the isolated `TEST_DATABASE_URL` | Pass: 15 tests, 1 file, including the new operational-block regression and existing catalogue-edit concurrency checks |
| `npm run check` | Pass: all type checks, 1,154 frontend tests in 57 files, 1,933 backend tests in 75 files, both production builds. The existing large frontend chunk warning is non-blocking. |
| `npm run test:coverage` | Pass: the same 1,154 frontend and 1,933 backend tests. Frontend: 95.71% statements / 92.81% branches / 97.77% functions / 98.36% lines. Backend: 94.30% / 94.38% / 93.41% / 94.28%. |
| Changed `confirmation.ts` coverage | 98.61% statements / 91.66% branches / 100% functions / 100% lines. Defensive missing-row/count fallbacks and some existing role/state branches remain uncovered; SQL behaviour is checked separately by the real PostgreSQL suite. |
| `git diff --check` | Pass |

**Case-level result:** TC-06-431 passed in the named scenario “a buffer extended into an existing operational block prevents confirmation without an outage flag” in `database/tests/events/confirmation.integration.test.ts`. The test creates the block and edits the catalogue through the real services. It verifies `canConfirm=false`, `EVENT_NOT_READY` with the operational-unavailability reason, unchanged APPROVED status and no CONFIRMED history or EVENT_CONFIRMED notices. Restoring the zero buffer permits confirmation. Execution row: `EX-06-431-AUTO-20261029-PR77-01`; evidence registration: S4-E21.

**Limits:** The backend and component checks use their existing test doubles; the targeted database file uses real PostgreSQL and synthetic identities. The full database and browser suites were not rerun in this follow-up. No new browser/full-system E2E or manual acceptance result is claimed. Shared Supabase and real-sign-in manual acceptance remain **Not executed**; story acceptance remains **Not assessed**. Existing manual placeholders, historical outcomes and Done points are unchanged.

## AUTO-20261029-PR78-REVIEW — safety remediation and forward upgrade

**Executed:** 29 October 2026, Codex (AI-assisted PR review). **Build:** PR #78 f3e29ad plus the KAN-61 review corrections and working changes, committed without application/SQL changes as c395a85; a later browser-fixture-only correction is 0d967bd. **Environment:** Windows, Node 24.21.0, disposable PostgreSQL 17 at 127.0.0.1:55439/connectsphere_test, synthetic identities and isolated integration schemas. Browser tests use substituted authenticated APIs; live backend startup used only this disposable database, migrated through 022 and seeded. No shared Supabase migration, real sign-in or manual acceptance was performed.

| Command / scope | Observed result |
| --- | --- |
| npm run check | Pass: 1,170 frontend and 1,947 backend tests; typechecks and builds. Existing bundle-size warning retained. |
| npm run test:coverage | Pass on rerun: 1,170 frontend and 1,947 backend tests. Frontend lines 98.09%, branches 91.90%; backend lines 90.25%, branches 90.31%. |
| npm run test:integration | Pass: 795 tests / 42 files, including five original-021 upgrade preservation/security/checksum cases. |
| npm run test:e2e -- --workers=4 | Pass: 227 Chromium tests, twice (before and after the safety route-cleanup correction). |
| npx playwright test tests/e2e/safety-review.spec.ts tests/e2e/kan66-planning-edits.spec.ts --workers=4 --repeat-each=3 | Pass: 18/18 after the final KAN-66 fixture correction. No application code changed after the full suite. |

**Earlier attempts retained:** the first check caught a terminal-state test-fixture TypeScript type error, corrected without changing the runtime type contract. A concurrent coverage attempt timed out one unchanged equipment workflow test at five seconds; the standalone coverage rerun passed, with no timeout increase. The first browser attempt ran no tests because DATABASE_URL was missing; after configuring the disposable database it ran 227 tests, with 217 passes and 10 navigation/assertion timeouts. Four-worker reruns passed. The safety persona-switch test had also removed the shared Google Fonts stub with unrouteAll; its trace showed an unresolved font request even though the expected page was rendered. It now replaces only its API route. Inspection found a KAN-66 fixture returning an items collection to the safety endpoint; the shared typed fixture and a no-page-error assertion correct that false-green case. Original failures remain in the registered logs rather than being replaced by Pass.

**Coverage limits:** safety/service.ts has 20.12% lines in the unit-only backend coverage report. Its transaction, remediation, concurrency and readiness rules are exercised by the separate real-PostgreSQL suite, which does not contribute to that percentage. No 100% coverage or connected acceptance claim is made. Named case results are added only for the specific scenarios exercised, under S4-E22.

**Migration outcome:** original 021 checksum preserved; 022 adds immutable area baselines and forward function replacements. Upgrade tests retain prior rounds, preparation, notices and ledger rows, reject unknown/revised checksums, and verify rerunning applies nothing. Shared rollout is **Not executed**. Existing CHANGES_REQUESTED decisions receive a conservative upgrade-time baseline; original decided records are not rewritten.

**Evidence:** [S4-E22 logs](../scrum/sprint-04/evidence/kan84-20261029/) named review-followup-*.txt. Temporary test schemas were removed by their test fixtures; only the disposable local container held synthetic browser startup data. Shared data was untouched. Integrated local E2E acceptance remains **Not executed** and story acceptance **Not assessed**.

## AUTO-20261030-S4-AC-FIXES — arrangement suitability, safety screen and notification clarification

**Executed:** 30 October 2026 (Singapore time), Codex automated run. **Build:** latest main `6b26503a306c7a56db5ba7b67f8b6537b2da0a27` plus the uncommitted changes on `fix/sprint-4-acceptance-gaps`; [source hashes and logs](../scrum/sprint-04/evidence/acceptance-fixes-20261030/) identify the tested application/test files. No commit, push or CI run is claimed. **Environment:** Windows, Node 24.21.0, Vitest 4.1.11, disposable local PostgreSQL 17 on loopback port 55440, Chromium. Integration fixtures use real isolated database schemas and synthetic identities; browser scenarios substitute authenticated API responses. Browser server startup used only the disposable database, migrated through 022 and seeded with synthetic data. No shared Supabase data, password entry or manual acceptance run was performed.

| Command / scope | Observed result |
| --- | --- |
| `npm run check` (final rerun) | Pass: typechecks, 1,208 frontend tests / 59 files, 1,959 backend tests / 76 files and both builds. Existing bundle-size warning remains. |
| `npm run test:coverage` | Pass with the same test totals. Frontend statements 95.67%, branches 92.37%, functions 97.55%, lines 98.28%. Backend statements 89.75%, branches 89.42%, functions 89.25%, lines 89.88%. |
| `npm run test:integration` with isolated `TEST_DATABASE_URL` | Pass: 814 tests / 42 files, including 52 suitability scenarios and the TC-20-405 notification link/current-access case. |
| `npm run test:e2e -- --workers=4 --retries=0` | Pass: 229 Chromium tests before the final safety UUID normalization. The added KAN-82 arrangement-link flow and KAN-84 delayed-decision navigation scenario use API substitutes and are browser/UI integration checks, not full-system E2E acceptance. |
| `npx playwright test tests/e2e/safety-review.spec.ts --workers=2 --retries=0` (final rerun) | Pass: all 4 safety browser checks after the final safety UUID normalization. No backend or other frontend source changed after the full integration/browser suites. |
| Focused suitability integration coverage | `suitability-service.ts`: 100% statements (45/45), branches (40/40), functions (9/9) and lines (39/39). Captured separately from the unit-only backend coverage; these percentages are not merged. |

**Case evidence:** TC-12-15–19 cover saved arrangement timing/layout/context, selected-booking-only occupancy exclusion, fresh source/state, current permissions and UI response ownership. TC-06-442–444 cover route/reviewer changes, delayed reads/writes, unmount, duplicate actions and uncertain-save reconciliation. The existing TC-20-405 now checks the clarified submission-to-review prompt, correct pending-change link and loss of access after reassignment. Each automated execution row is limited to these named scenarios; earlier rows are retained. The new connected manual journeys TC-12-20, TC-06-445 and TC-20-431 remain **Not executed**.

**Earlier development attempts and review:** the first focused suitability integration run passed 50/51; the rejected-booking test fixture omitted mandatory decision metadata. Correcting that synthetic fixture and adding the approved-state variation produced 52/52. This was a fixture error, not an application acceptance failure. Independent code review then found that an uppercase valid booking UUID was normalized by the API but compared without normalization in the UI; the URL normalization and its regression were added before the full runs above. The initial check/coverage runs passed 1,207 frontend and 1,959 backend tests. Final review found the analogous safety-route UUID comparison; normalization and one regression were added, followed by passing full check/coverage reruns with 1,208 frontend tests and the four safety browser checks. Initial and final logs are retained separately. The earlier two scratch safety reproductions prompted this repair; they are not relabelled as executed repository cases. Final runs passed without retries.

**Coverage limits:** the full coverage report gives `SafetyReviewPage.vue` 98.24% statements, 89.39% branches, 92.85% functions and 98.64% lines; the uncovered line 150 is existing readiness-list rendering, and remaining generated/template branches mean coverage is not 100%. The backend unit report covers only 7.69% of suitability-service lines because its SQL behavior is verified in the separate PostgreSQL run. Existing safety-service coverage is 20.12% lines in the backend unit report. Neither suite totals nor high coverage prove every acceptance criterion or real-login workflow.

**Documentation and acceptance:** KAN-80-AC2 is clarified in Jira and the repository: submission is the request for coordinator review. KAN-82 and KAN-84 remain within their existing criteria; no migration, estimate or booking capacity-refusal policy was added. S4-T13/T14/T15 retain **Not executed** for integrated manual acceptance and **Not assessed** for story acceptance. The user reports shared migrations 021 and 022 applied; that setup report is separate from this isolated run. Test schemas were removed by their fixtures; synthetic browser-startup data existed only in the owned disposable local container, which was stopped and removed after verification. The focused [manual instructions](README.md#30-october-2026--focused-local-e2e-acceptance-for-kan-80-kan-82-and-kan-84) identify what remains before acceptance.

## AUTO-20261031-MINOR-UI — Date entry consistency and review links

**31 October 2026; branch `fix/minor-ui-fixes`.** Tested build: latest main `54910211b4af9920af087e65e2c2ff15b9591b27` plus the working-tree source identified by SHA256 in [S4-E24](../scrum/sprint-04/evidence/README.md#minor-ui-fixes--31-october-2026). Windows, Node 24.21.0, Vitest 4.1.11 and Chromium. Automated execution used synthetic users and API response fixtures for the new browser cases; no shared Supabase writes or migration. Documentation was added after the tests and does not change the tested source.

All date-bearing input declarations, including dynamic event edit/change fields, now have the same four-digit-year bound as the existing event-request form. Equipment what-if controls now use native datetime pickers: untouched source instants retain microseconds, explicitly edited values support milliseconds, and exact retained times are shown when needed. Native time-only catalogue controls remain unchanged. Review shortcuts form a consistently underlined, keyboard-accessible action list, two columns on desktop and one on narrow screens. Destinations and permissions are unchanged.

| Command / check | Actual result |
| --- | --- |
| `npm run test -w @connectsphere/frontend -- src/features/equipment/pages/EquipmentAvailabilityPage.test.ts src/features/venues/pages/VenueSearchPage.test.ts src/features/reviews/pages/ReviewRequestPage.test.ts` | 135 passed across 3 files. |
| `npx playwright test tests/e2e/equipment-availability.spec.ts tests/e2e/venue-search.spec.ts tests/e2e/review-decision.spec.ts --workers=2 --reporter=line` | 28 passed. |
| `npm run check` | Typechecks/builds passed; 1,209 frontend + 1,959 backend tests passed. Existing Vite large-chunk warning remains. |
| `npm run test:coverage` | Passed with the same test totals. Frontend statements/branches/functions/lines: 95.68% / 92.38% / 97.56% / 98.28%; backend: 89.75% / 89.42% / 89.25% / 89.88%. |
| `npx playwright test --workers=2 --reporter=line` | 234/234 passed without retries. |
| Source inspection and visual inspection | All Vue input declarations checked, including dynamic types; inventory retained. Review shortcuts and equipment inputs inspected in retained desktop/mobile screenshots. This is not a keystroke run through every individual form. |

**Failures and retests:** the initial search regression reproduced six-digit years in both fields. The initial review test also failed because its broad API glob intercepted a Vite source import; that fixture was corrected before identifying the product failure. The corrected reproduction then found `View registrations` had no underline. The initial logs and corrected reproduction are retained separately. The focused three browser cases passed after the fix, followed by the targeted and full runs above. Case-level failures/retests are appended for TC-10-211 and TC-18-432; TC-16-19/20 have supported post-change results. No suite-wide pass was converted into results for unrelated cases.

**Coverage limits:** `EventEquipmentAvailabilityPage.vue` has 99.36% statements / 96.83% branches / 100% functions / 100% lines. Its new picker accessors are exercised, including the untouched positive one-microsecond interval. Whole-file `ReviewRequestPage.vue` is 88.23% lines / 88.67% branches and `VenueSearchPage.vue` is 92.92% lines / 85.62% branches; existing branches are not fully covered. Native segmentation and CSS are established by browser assertions, not line coverage. No 100% whole-project or every-browser claim is made. Real-database integration was not rerun because no API, persistence, transaction or migration source changed.

**Manual boundary:** TC-10-212 is **Not executed**; connected acceptance of this UI patch is **Not assessed**. The ongoing release walkthrough's earlier R01–R06 reports do not establish manual acceptance of these later changes, and R07 is still in progress. No story status, estimate, historical acceptance, sprint credit or manual-test date is changed.

## AUTO-20261031-UI-SPACING — Shared panel insets and visible text links

**31 October 2026; branch `fix/minor-ui-fixes`.** Tested base `8d48fda` plus the source hashes in [S4-E25](../scrum/sprint-04/evidence/README.md#shared-panel-spacing-and-text-links--31-october-2026). Windows, Node 24.21.0, Vitest 4.1.11 and Chromium; named browser cases substitute authentication/API responses. No shared database writes, migration or backend behavior change. Documentation was added after testing.

Shared `.panel` defaults now provide 24px padding (20px below 600px), safe wrapping and shrinkable grid content. Existing scoped padding continues to override the default. Plain text links are underlined; buttons, navigation and whole-card/row links retain their existing affordances. A shared `.sr-only` utility restores intended accessible-only headings/labels. Review queue and review-detail failure messages have space around retry controls; the booking filter shortcut has its own spacing.

| Command / inspection | Observed result |
| --- | --- |
| Pre-fix focused desktop reproductions | Both failed: queue minimum inset 0px; Show all venue booking requests had no underline. Retained in `before.txt`; later assertions did not run after each failure. |
| `npx playwright test tests/e2e/review-access.spec.ts tests/e2e/venue-bookings.spec.ts --grep "readable insets\|discoverable" --workers=2 --reporter=line` | 10/10 passed: queue populated/empty/error/loading at desktop/mobile; booking link underline, focus, Enter activation and filter clearing at both widths. |
| `npm run check` | Typechecks, builds, 1,209 frontend tests and 1,959 backend tests passed. Existing Vite large-chunk warning remains. |
| `npm run test:coverage` | Same test totals passed. Frontend statements/branches/functions/lines: 95.68% / 92.38% / 97.56% / 98.28%; backend: 89.75% / 89.42% / 89.25% / 89.88%. |
| `npx playwright test --workers=2 --reporter=line` with the retained temporary observation hook | 244/244 passed without retries. The hook only captured computed styles, dimensions and screenshots after each browser case and was restored afterwards; the two permanent regression files remain. |
| Broader source/layout inspection | 59 Vue files inspected; source inventory retained. 229 browser snapshots across 28 route patterns, widths 320/375/390/1280: 599 visible panel observations, 362 link observations including 213 plain links. No sampled panel below 12px inset, plain link missing an underline or document overflow above 1px. Targeted queue tests require at least 16px inset. |
| Visual review | Retained desktop/mobile queue and filtered-booking screenshots inspected, alongside the full review-detail layout. Long names wrap, card contents are inset and text links are visible. |

**Case results:** TC-04-232 and TC-13-205 retain separate failed reproductions and passing retests. No other case-level Pass is inferred from the full suite or broad observations. Audit data, source inventory, screenshots, logs, source hashes and the temporary hook are retained under `ui-spacing-20261031/`.

**Limits and manual follow-up:** CSS is not measured by JavaScript coverage; computed styles, layout assertions and screenshots provide its evidence. Browser fixtures use fallback fonts and substituted responses. The sample is not every transient state, browser or live account. Database integration was not rerun because no persistence/API/schema logic changed. Manual smoke TC-04-233 remains **Not executed** and acceptance of this patch **Not assessed**. R07 was subsequently reported passed with Harbour Hall and Rooftop Terrace approved; R08 remains in progress. These walkthrough reports do not establish manual verification of this later UI patch. No historical acceptance, estimate, story status or sprint credit changes.

## AUTO-20261101-BOOKING-FEEDBACK — Replacement guidance and local submission feedback

**1 November 2026; branch `fix/minor-ui-fixes`.** Tested base `be7d2b3` plus the source hashes in [S4-E26](../scrum/sprint-04/evidence/booking-feedback-20261101/summary.json). Windows, Node 24.21.0, Vitest 4.1.11 and Chromium. Named browser checks substitute authenticated API responses. No migration, backend change or shared database write. Documentation was added after verification.

The replacement shortcut now selects the source, scrolls to and focuses a labelled request heading, and explains which arrangement is being replaced and what to enter next. Submission errors/success appear below the submit button and receive focus; uncertain saves expose a nearby **Review current bookings** action. Cancellation feedback retains its existing location. Deferred focus respects the current event/account context. The request hint now points to the saved arrangement's own suitability check.

| Command / check | Observed result |
| --- | --- |
| Pre-fix desktop reproductions: `npx playwright test tests/e2e/venue-booking-submission.spec.ts --grep 'KAN-82.*1280px' --workers=2 --reporter=line` | Both failed: replacement form heading/focus missing; conflict alert outside the viewport. Each stopped at its first failed assertion. |
| `npx playwright test tests/e2e/venue-booking-submission.spec.ts --workers=2 --reporter=line` | 11/11 passed, including desktop/mobile long-history guidance, conflict/success feedback, uncertain-save reconciliation and existing submission/role checks. |
| `npm run check` | Typechecks, builds, 1,209 frontend tests / 59 files and 1,959 backend tests / 76 files passed. Existing Vite bundle-size warning remains. |
| `npm run test:coverage` | Same totals passed. Frontend statements/branches/functions/lines: 95.67% / 92.38% / 97.57% / 98.29%; backend: 89.75% / 89.42% / 89.25% / 89.88%. |
| `npx playwright test --workers=2 --reporter=line` | 248/248 passed without retries. |
| Visual inspection | Four retained desktop/mobile replacement and conflict screenshots inspected: original context, next-step guidance and nearby feedback are visible and wrap within the panel. |

**Failures and retests:** `before.txt` preserves both product reproductions. The first targeted component run passed 45/46; the new text assertion selected the nested **Replacing:** label rather than its containing paragraph. Correcting that selector produced a pass in the full check and coverage runs; no runtime change was needed for that assertion. `component-initial.txt` retains the failed attempt. Case-level Fail/Pass rows are appended for TC-12-21/22; no unrelated case results are inferred from suite totals.

**Coverage limits:** `VenueBookingPanel.vue` has 95% statements / 92.95% branches / 95.83% functions / 98.38% lines. Uncovered lines 172, 390 and 393 are an existing submission guard continuation and template bindings. Defensive/template branches are not fully covered; native scrolling and viewport geometry are verified in Chromium, not jsdom coverage. Database integration was not rerun because persistence, API, conflict rules and schema are unchanged. Browser substitutes do not establish real-authentication E2E acceptance.

**Manual follow-up:** TC-12-23 is **Not executed** and acceptance of this patch **Not assessed**. R01-R10 were reported passed; R11 is in progress and prompted these UI corrections. For the retained MAIN fixture, the deliberate buffered conflict is **16 November 2026 11:00-12:00**, followed by the valid 11:30-12:00 request. The reported 6 November input cannot establish a conflict with a 16 November booking; the actual server response for that user attempt was not captured. No historical acceptance, story status, estimate, sprint credit or manual-test date is changed.

## 1 November 2026 — Release walkthrough checkpoint

**Source and scope:** checkpoint recorded from the current project conversation and the browser agent's initial live observations. The earlier user-reported walkthrough outcomes below are separate from the new observed run `MAN-20261101-01`. This documentation date is not assigned as the execution date of the earlier checks. The [walkthrough](release-e2e-walkthrough.md) remains the reusable guide; its R labels are not test-case IDs.

| Earlier walkthrough scope | Reported result | Evidence and limits |
| --- | --- | --- |
| R01–R12 | Pass — user-reported | Source: the user's confirmations in the current project conversation. Actual execution dates, exact builds and individual role executors are **Not recorded** for these reports. No retained screenshots were supplied for these passes. No individual test-case Pass is inferred from the group reports. |
| R13 Part A | Pass — user-reported | The user reported saving the three-unit equipment request, the seven/eight-unit availability boundary, reserving three units and exclusion of the event's own reservation from its saved-demand check. Actual execution date, exact build and individual role executors are **Not recorded**; source is the current conversation, with no retained screenshots supplied. R13 as a whole is not complete. |

### MAN-20261101-01 — Live browser continuation, initial checkpoint

**Run state:** in progress. **Execution date:** 1 November 2026, Asia/Singapore; exact observation times **Not recorded**. **Executor:** Codex browser agent using the real Chrome UI; this is distinct from the earlier user-reported execution. No credentials are retained in this record.

| Run field | Recorded value |
| --- | --- |
| Frontend and environment | Chrome at `http://127.0.0.1:5173`, with the local API and agreed shared Supabase development environment. No substituted API responses are used for this continuation. |
| Local checkout | `fix/minor-ui-fixes`, HEAD `429397aef14be8e3773206eddc9583e56c1f05ad`; working tree clean when the checkpoint was prepared. |
| Runtime build | Exact served build is not exposed by the UI and is **Not recorded**. The checkout SHA identifies the local source; it is not independent proof of the running frontend/API build. |
| Database identifier, migrations and hold-expiry cadence | **Not recorded** in this initial observed checkpoint; no fresh verification is claimed. |
| Existing MAIN event | `a8e842bb-6581-4196-b0a8-641dc30adaa0`; displayed interval 16 November 2026, 10:00–12:00 Singapore time. |
| Business-data writes and cleanup | No business-data writes are included in this initial observed scope. MAIN and its reservation already existed; their creation or prior mutation is not attributed to this run. No cleanup was performed. |

| Initial live observation | Actual result |
| --- | --- |
| Technical Support access | The T1 login worked and the signed-in Technical Support view was accessible. This narrow observation does not re-execute all R01 role checks. |
| Existing MAIN equipment context | MAIN was visible as Approved, with a Wireless microphone line showing quantity 3 and RESERVED. This corroborates the displayed current state only; the browser agent did not execute the earlier reservation action in this checkpoint. |

| Remaining walkthrough scope | Status at this checkpoint | Actual result |
| --- | --- | --- |
| R13 Part B | Not executed | Not recorded |
| R14–R24 | Not executed | Not recorded |

**Evidence boundary and next recording:** the conversation is the source for the earlier reported passes and these initial browser observations; no screenshot artifact is registered by this checkpoint. Append subsequent observations with their actual identities, outcomes and evidence, retaining any failed attempt before a retest. Add case-level execution rows only where the observed scope supports the referenced specification; no such rows are created by this checkpoint. TC-06-32 is not passed by this partial walkthrough. Story acceptance and the release decision remain **Not assessed**; no Jira status, sprint closure, historical acceptance or sprint credit is changed.

### MAN-20261101-01 continuation — R13 availability observations, 16:44–16:45 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent in the live Chrome session above. These were read-only availability checks; no business data was written. The displayed Wireless microphone stock remained total 10, damaged 2, maintenance 1, giving 7 operational units.

| Mode and requested interval | Requested units | Observed peak reserved / available / shortfall | Observed result |
| --- | --- | --- | --- |
| MAIN saved-demand check; 16 November 10:00–12:00 | 3 | 0 / 7 / 0 | Fulfillable; the saved check excluded MAIN's own reservation. |
| Unsaved check using MAIN's 16 November 10:00–12:00 window | 4 | 3 / 4 / 0 | Fulfillable; the existing three-unit reservation reduced free stock to four. |
| Unsaved check using MAIN's 16 November 10:00–12:00 window | 5 | 3 / 4 / 1 | Unfulfillable with a one-unit shortfall. |
| Unsaved check for the adjacent interval, 16 November 12:00–13:00 | 7 | 0 / 7 / 0 | Fulfillable; the non-overlapping interval regained all seven operational units. |

The existing reservation `7dcc60ce-c098-4df0-893c-b358f718d646` remained RESERVED for 3 units. Its displayed recorded time was 1 November 2026, 04:31 Singapore time; that existing reservation timestamp is not the execution time of this continuation. MAIN displayed **Equipment ready — 1 of 1**.

**Artifact:** [overlapping-window five-unit shortfall screenshot](evidence/MAN-20261101-01/r13-overlap-shortfall.jpg). The other numeric observations are recorded from the live browser session; this single screenshot is not presented as evidence of every row.

**Scope still open:** these observations support the tested R13 availability calculations. The four/five-unit check used MAIN's unsaved mode, not a separately created eligible probe event. R13 Part B is therefore only partially observed; reservation cancellation/release, explicit Not Required, rejection/replacement, no-venue independence and stale-source handling remain **Not executed** in this continuation. R14–R24 remain **Not executed**. No complete R13 or case-wide Pass, acceptance decision or release approval is inferred.

### MAN-20261101-01 continuation — Fixture preparation and R13 stale request/release checks, 16:46–16:49 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent through the real UI and the connected API/shared Supabase environment. The agent created the following synthetic fixtures as O1, submitted both at 16:46, assigned them through the Coordinator Lead to C1 at 16:47, and approved them as C1 at 16:47–16:48. These business-data writes occurred after the read-only observations above; all new data and history listed here are retained.

| Fixture | Recorded details and state at this checkpoint |
| --- | --- |
| PROBE | `55e58c4a-8ab1-42c8-a572-69810743c14d`, named `REL-20261101-AGENT-PROBE`; 16 November 2026, 10:00–12:00 Singapore time; attendance 2; registration not required; no venue arrangement. Approved and assigned to C1. |
| END | `f65feb52-085b-4910-8331-904e9c69469c`, named `REL-20261101-AGENT-END`; 1 November 2026, 17:15–17:20 Singapore time; attendance 2; registration capacity 2, recorded opening time 00:00 and closing time 17:10 Singapore time. Approved and assigned to C1. Orchid classroom booking `88e97699-cf00-44e6-9735-85dfdec0f64e` was Pending; one microphone was Requested. The equipment-line ID is **Not recorded** in this checkpoint. END was not yet Confirmed and no R23 completion was attempted. |

**Assignment artifact:** [assigned test fixtures](evidence/MAN-20261101-01/test-fixtures-assigned.jpg). This screenshot supports the assignment observation, not every later equipment action.

| R13 action | Actual observed result |
| --- | --- |
| Open a stale reservation confirmation | C1 used the `127.0.0.1` Chrome context and T1 used the separate `localhost` Chrome context against the same application/API and shared database. T1 left confirmation open for PROBE's one-microphone request `98a19263-21b8-4470-bd99-4ffac46ae501`. |
| Change the saved source as C1 | C1 changed the requirement to two microphones, creating request `3af33c7e-d7ce-4f64-9a31-14464279a895`. The original one-unit request became CANCELLED with reason **Superseded by coordinator request**. |
| Confirm from T1's old context | The old confirmation was refused with feedback that the event or saved equipment requirements had changed and the refreshed saved requests must be reviewed. The obsolete one-unit request was not reserved. Screenshot capture of this stale attempt timed out; no stale-attempt screenshot file is claimed. |
| Reserve the fresh request, 16:49 | After refreshing the saved context, T1 reserved the full two-unit request. PROBE showed **Equipment ready — 1 of 1** despite having no venue arrangement. This directly observed reservation independence from venue approval. |
| Submit cancellation without a reason | The UI required a reason of 1–2000 characters. The two-unit request remained RESERVED; the invalid submission did not cancel it. |
| Cancel with a valid reason, 16:49 | With reason **R13 reservation-release test**, the two-unit reservation became CANCELLED and its history remained visible. T1 refreshed and C1 reloaded: both PROBE request rows remained cancelled, with no active equipment lines. Explicit **Not Required** had not yet been selected; empty active lines are not recorded as that decision. |

**Retained data and limits:** PROBE and END, their submitted/assigned/review history, END's pending booking and requested microphone, and both cancelled PROBE equipment-request rows are retained. Notification IDs and a post-release stock/availability measurement are **Not recorded** in this checkpoint. No cleanup or deletion occurred. The stale refusal, fresh reservation and cancellation observations support only their performed scope; they do not establish an exact concurrency race, uncertain-response recovery, full role matrix or all TC-17-05/08 variations. R13 remains in progress, with explicit Not Required and rejection/replacement still **Not executed**; R14–R24 remain **Not executed**. No acceptance or closure state is changed.

### MAN-20261101-01 continuation — R13 walkthrough completion, 16:51 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent, continuing with C1 and T1 in the real authenticated Chrome sessions. A new one-unit PROBE request was used for rejection; its request ID is **Not recorded** in this checkpoint.

| Action | Actual observed result |
| --- | --- |
| Reject without a reason | In T1's Equipment requests queue, **Reject request** was disabled while the reason was blank. No HTTP status is claimed from this UI observation. |
| Reject with a reason | T1 supplied **R13 rejection test**. The line became REJECTED; C1 reloaded and saw the same saved rejection reason. Equipment readiness was blocked with feedback that every active required line must be reserved. |
| Close the rejected line | C1 used **Cancel line** with reason **R13 finished rejection probe**; the line became CANCELLED. |
| Save an explicit equipment decision | C1 selected **No equipment is required**, saved and reloaded. Explicit **Not Required** persisted. Event confirmation showed Equipment ready / Not Required, while Venue remained not ready because PROBE had no approved venue. This is distinct from the preceding empty-active-lines state. |
| Recheck stock from the independent PROBE event | For 16 November 10:00–12:00, quantity 4 showed operational 7, peak reserved 3, available 4 and shortfall 0; quantity 5 showed shortfall 1. For 12:00–13:00, quantity 7 showed peak reserved 0, available 7 and shortfall 0. MAIN's existing three-unit reservation remained represented in the overlapping availability. |

**R13 walkthrough outcome:** Pass at 16:51 Singapore time, combining the user's earlier Part A report with the browser agent's observed Part B continuation. The checkpoint tally is **13 of 24 walkthrough groups complete, 11 remaining**. This tally does not establish a common tested build for the earlier reported groups, and it is not a Pass for every specification referenced by R13. R14–R24 remain **Not executed** at this checkpoint; TC-06-32 and story/release acceptance remain incomplete / **Not assessed** respectively.

**Case-level recording:** `EX-15-02-MAN-20261101-01-A1` records the observed persisted reservation/rejection outcomes for TC-15-02. `EX-17-01-MAN-20261101-01-A1` records the full saved PROBE reservation without venue confirmation for TC-17-01; actual fixture variation was two units with no venue, rather than the specification's illustrative three units with a pending venue. No network status, direct database inspection or unperformed variation is inferred. Broader cards such as TC-17-05, TC-17-08 and TC-15-05 retain their separate requirements: overlong cancellation reason and Confirmed-state restrictions; uncertain-response/idempotent-retry branches; and attempting Not Required while a rejected active requirement remains were not established by this continuation.

**Timed fixture update:** T1 reserved END's one-microphone request `a4e29f15-2b37-4586-8fa8-a7240e78f2db` at 16:50. V1 approved Orchid booking `88e97699-cf00-44e6-9735-85dfdec0f64e` at 16:51. END awaited C1's final confirmation; R23 completion was not yet performed. PROBE's cancelled request/rejection history and explicit Not Required decision, END's reservation and approved booking, and all prior fixture history are retained; no cleanup occurred.

**R15 prerequisite:** the user supplied a third attendee account, resolving the previously missing-account prerequisite. Its sign-in and role verification are **Not recorded** at this checkpoint; no credentials are retained in the evidence.

### MAN-20261101-01 continuation — R14 confirmation and R15 registration observations, 16:52–16:55 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent through C1, O1 and attendee A1/A2/A3 sessions. These observations continue the same live run and its recorded build limitations. R14 and R15 remain in progress; neither group is marked Pass by this checkpoint.

| Confirmation or setup action | Actual observed result |
| --- | --- |
| END final confirmation, 16:52:08 | C1 confirmed END while all displayed readiness areas were ready. This was before END's actual 17:15 start. The earlier event-review approval and this final confirmation were separate actions. |
| END safety submission, 16:52:15 | C1 submitted safety round 1 with notes **Both exits clear** / **One microphone cables secured** / **Two participants clear classroom aisles**. The round was awaiting the Safety Officer; the review ID is **Not recorded**. Submission is not safety approval or preparation start. |
| MAIN final confirmation, 16:52:25 | C1 confirmed MAIN. Reload showed one Confirmed-from-Approved transition with C1 as actor. O1's detail view showed Confirmed and C1's confirmation timestamp, without a confirmation control. This UI observation does not establish all direct-API or unrelated-role denial checks. |

**TC-06-02:** the initial approval followed by separate readiness-based confirmation is recorded as Pass in `EX-06-02-MAN-20261101-01-A1`. Confirmation role-denial variations and refusal once an event has started are still **Not executed** in this continuation; the full readiness-blocker matrix and unrelated-event audit comparison are not inferred from the two successful confirmations.

MAIN's manager roster initially showed zero registrations; see [empty MAIN roster](evidence/MAN-20261101-01/r15-empty-roster.jpg). Attendee discovery/detail showed the expected public event information without internal decisions or other attendees' personal information, registration opening 30 October 2026 at 09:00, closing 15 November 2026 at 18:00, and capacity 2. This screenshot alone does not establish every empty-roster/payload variation in TC-18-424.

| MAIN registration action | Actual observed result |
| --- | --- |
| A1 registers, 16:53:27 | Registration `10acf053-ebf3-4425-b33b-2abe679d2cdd` was created for A1. |
| A2 registers, 16:54:08 | Registration `e11f0f65-c8b5-4e64-9e57-21ea845d89b5` was created for A2; the manager roster showed 2 active registrations. |
| A3 opens the full event | The attendee view showed Full, with zero of two places available and no registration control. See [third attendee full-event view](evidence/MAN-20261101-01/r15-third-attendee-full.jpg). No attempted hidden/API registration or response status is claimed. |
| A1 tries protected registration views | The manager roster showed **Your role cannot view this registration page**. A link to A2's registration showed **The linked registration is unavailable for this account**. These are observed UI denials, not evidence of all API mutation/impersonation variations. |
| A1 chooses Keep registration | The withdrawal warning closed; the roster stayed at 2 active registrations. A comparison of every recipient's inbox after this cancelled action is **Not recorded**. |
| A1 confirms withdrawal, 16:55:02 | MAIN's active count fell to 1. |
| A1 re-enters, 16:55:19 | The active registration retained the original ID `10acf053-ebf3-4425-b33b-2abe679d2cdd` and showed the new registration timestamp; the roster returned to 2 active registrations. |
| A1 withdraws again, 16:55:33 | A1's registration became withdrawn again. |
| A3 registers, 16:55:43 | A3 took the freed place. MAIN then had A2 and A3 active, with A1 withdrawn, and active count 2. A3's registration ID is **Not recorded** in this checkpoint. |

**Observed attendee notices:** A1's registration/withdrawal notices linked to A1's same MAIN registration ID. A2's MAIN confirmation notice linked to A2's correct registration ID, and an END notice was also visible. Notification IDs, all manager/unrelated-recipient comparisons and unchanged-action replay checks are **Not recorded** here; the full notification matrix is not passed from these observations.

**Timed END registrations retained:** A1 registered during 16:53 as `18b6b4f0-ec65-4e5e-bb81-5632e52c61a6`; A2 registered during 16:54 as `99b1e9d9-578a-42fd-b553-80095253143d`. END was full at capacity 2. These active registrations are prepared for the real 17:10 registration-close and 17:15 event-start observations; those boundaries had not been reached at this checkpoint.

**Remaining scope:** R15 timed-window observations, unrelated O2/C2 access checks and the other required registration fixtures remain **Not executed**. No R15 case-wide Pass is added from this partial matrix. All named events, registrations, safety round, history and notices are retained; no cleanup occurred. The walkthrough tally remains 13 complete groups with R14/R15 in progress. Story acceptance, release decision and sprint closure are unchanged.

### MAN-20261101-01 continuation — R14/R15 access and boundary views, 16:56–16:57 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent. The existing STARTED and CAPZERO fixtures below were read only; this run did not create or mutate them. No HTTP status or refused server mutation is inferred from a missing UI control.

| Role and observation | Actual result |
| --- | --- |
| A1 revisits MAIN after A3 takes the freed seat | A1 remained Withdrawn. MAIN showed zero of two places left and **This event is full**, with no Register button. A1 did not regain A3's place. This supports the full-event re-entry portion of TC-18-414; the complete warning-wording assertion and a direct registration attempt are not recorded here. |
| C1 inspects existing `REL-1101 E-STARTED` | Event `bd60431a-f0b3-419b-80e8-d7a07df97d75` was APPROVED for 1 November 2026, 16:00–16:30 Singapore time. It had an approved Orchid arrangement, equipment Not Required and no pending change, with all displayed readiness areas ready. The UI stated **This event has already started, so it can no longer be confirmed** and provided no confirmation control. The event was not mutated. |
| A1 inspects existing CAPZERO | Event `3ff656b8-a67d-49f0-9e63-533da7d1313c` was Confirmed for 1 November 2026, 18:30–19:00, with registration window 13:00–18:00 Singapore time. The attendee view showed zero of zero places, Full and no registration control. |
| C2 opens MAIN review | The review was unavailable / permission denied. |
| C2 opens MAIN roster | The page showed **Event request not found** without MAIN's roster. |
| O2 opens MAIN roster | The page showed **Event request not found** without MAIN's roster. |
| Coordinator Lead opens MAIN review | The route showed a Coordinator-access-only page; Lead access did not grant the assigned coordinator's review control. |

**Scope at this checkpoint:** R14 remains in progress, including the pending-significant-change blocker to be observed during R17. R15 remains in progress, with real timed boundaries, not-yet-open and registration-disabled behavior outstanding. No whole role/API matrix, exact-time boundary specification or additional case-wide Pass is inferred from these UI observations. Existing fixtures and all data from prior checkpoints are retained; no cleanup or acceptance/closure update occurred.

**Supplementary observed warning detail:** before A1 chose Keep registration during the 16:55 sequence, the browser agent read: **Your place will be released. You may register again only if registration is still open and capacity is available. A place will not be saved for you.** The same warning appeared when the dialog was reopened before confirmation. This supplies the warning observation omitted from the earlier checkpoint. Together with A3 taking the released place and A1's subsequent Full view with no Register control, it supports TC-18-414, recorded as `EX-18-414-MAN-20261101-01-A1`. Actual fixture variation was capacity 2 with A2's place retained, rather than the specification's illustrative capacity 1; A3 took the one place released by A1. The refusal is evidenced at the UI boundary only; no network response status or direct API attempt is claimed.

### MAN-20261101-01 continuation — Branch fixtures and R16 ordinary edits, 16:58–17:00 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent. O1 created and submitted four further synthetic fixtures, and the Coordinator Lead assigned them to C1. All use the `REL-20261101-AGENT-` name prefix, expected attendance 20, venue requirements Classroom / projector / wheelchair access, and equipment-requirement text **Three wireless microphones if required**. They remained Submitted at this preparation checkpoint; assignment is not approval.

| Fixture suffix | Event ID | Period, Singapore time | Registration |
| --- | --- | --- | --- |
| CHANGE | `7acbfe26-413c-41a0-9fa4-a82d138cfd1c` | 22 November 2026, 09:00–10:00 | Not required |
| SAFETY-REJECT | `f5031e9b-99bb-4dde-9000-99f053a20f86` | 23 November 2026, 09:00–10:00 | Not required |
| REMEDIATE | `42209235-16a8-4f82-8e06-9938f0fcb740` | 24 November 2026, 09:00–10:00 | Not required |
| CANCEL | `74707e58-b63f-4751-8601-bb58eebddcb2` | 25 November 2026, 09:00–10:00 | Capacity 2; opens 1 November 2026 at 00:00, closes 24 November 2026 at 18:00 |

| R16 action | Actual observed result |
| --- | --- |
| O1 ordinary edit before approval, 16:59 | On Submitted CHANGE, O1 changed Description from **Isolated release fixture** to **R16 current revision: organiser confirmed arrival instructions** and saved it. |
| Save an older second-tab revision | The stale tab attempted **R16 stale revision that must not overwrite the latest saved value**. The page reported a newer version and that the changes were not saved. Reload retained **R16 current revision: organiser confirmed arrival instructions**. No screenshot of this stale error was retained at this checkpoint; the live observation is the evidence. No concurrent HTTP-response pair, response status or missing-revision probe is claimed. |
| O2 opens CHANGE's details editor | Direct `/events/<CHANGE-id>/details` access was permission denied. |
| C1 ordinary edit after confirmation | MAIN's editor exposed only name and description, with a notice that significant fields require reviewed changes. C1 saved Description **Arrival instructions: arrive 09:45**. |
| Compare MAIN after the ordinary edit | The period remained 16 November 2026, 10:00–12:00; expected attendance stayed 20 and purpose was unchanged. Both approved Harbour arrangements retained their saved intervals, the three-microphone line stayed RESERVED, and the roster stayed at two active registrations for A2/A3 with A1 withdrawn. Safety remained Not submitted. There was no existing safety approval to compare, so preservation of an approved safety round was not exercised. |
| O1 opens MAIN's details editor | The page stated **You cannot edit this confirmed request here.** |

**R16 walkthrough outcome:** Pass for the observed ordinary-edit journey. The tally is **14 of 24 walkthrough groups complete, 10 remaining**; R14/R15 retain their outstanding branches. No complete TC-07-01–07 execution is inferred: those cards additionally specify invalid submissions/audit comparisons, unrelated-event comparisons, direct actor/field/API probes, exact competing writes, stale review actions or unchanged-save/database revision behavior. Their observed portions are retained above without adding case-wide Pass rows.

**Retained changes:** the four new submitted fixtures and assignment histories, CHANGE's current description/edit history, and MAIN's current description/edit history remain. No cleanup occurred, and no story acceptance, release approval, Jira status or sprint closure changed.

### MAN-20261101-01 continuation — R17 significant changes and R18 safety, 17:01–17:05 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent through O1, C1 and S1. R17 is partially observed; the safety walkthrough R18 reached its recorded Pass below. All change requests, decisions, safety rounds, preparation records and notices are retained.

| MAIN significant-change branch | Actual observed result |
| --- | --- |
| Purpose proposal `06fed275-db12-4c15-8f78-60010ecf7014` | O1 submitted the purpose-only change. MAIN retained **Release acceptance workshop** before approval. C1 received **Change request to review** and its link opened this exact change ID; the preview said no existing arrangement was affected. C1 approved and applied it at 17:01, changing the purpose to **Workshop including a discussion session**. |
| Rejected purpose proposal `d3ae6c9f-6226-4a41-ab92-92ea74945240` | C1 rejected it at 17:02 with reason **R17 keep approved workshop purpose**. |
| Withdrawn proposal `ea95ab9b-1330-41ee-b450-b13328387120` | O1 withdrew it. C1's stale Approve action then reported that the proposal had already been decided or withdrawn; it was not applied. See [withdrawn-change refusal](evidence/MAN-20261101-01/r17-withdrawn-change-refused.jpg). |
| Time proposal `5c7fb898-c416-497b-9c3e-30cd31480a3c` | The proposed period was 16 November 2026, 11:00–13:00. The impact preview blocked approval because of the Confirmed event, two approved Harbour arrangements, three reserved microphones and active attendees. Approve and apply was disabled. O1 withdrew the proposal. No direct API approval attempt or response code is claimed. |
| Pending-change readiness | While a change was pending, the safety/readiness view was blocked with **Decide pending change before confirming** feedback. This records the displayed blocker; it does not claim a second confirmation attempt on the already Confirmed MAIN. |
| O1 notifications | Separate submitted, approved and rejected outcomes were visible for their corresponding change IDs. Full recipient/duplicate-notice checks are still outstanding. |

| Safety/preparation observation | Actual observed result |
| --- | --- |
| MAIN safety submission, 17:02:54 | Round 1 `4562f827-f75f-489f-b2c2-54ad0e21add0` was submitted after MAIN had no pending change. END's separate round ID was `f57b6d6d-d836-473f-a573-be5df874f033`. |
| S1 changes review context | On END, S1 selected Reject and drafted **UNSAVED A draft must not appear on B** without saving. S1 returned through the queue to MAIN. MAIN showed empty optional notes, no selected decision, Save disabled and no stale END message. This observed state is distinct from a controlled loading/saving or delayed-response test. |
| S1 inspects MAIN context | MAIN showed attendance 20; both Harbour arrangements with capacity 70, Theatre layout, opening hours 05:00–16:00, setup/turnaround 15/15 minutes and wheelchair access; three microphones; and the submitted safety notes. |
| S1 approves MAIN, 17:04:14 | Approval persisted on MAIN's round. Reload showed the saved actor/time and no editable decision form for that completed round. |
| C1 starts MAIN preparation, 17:04:27 | C1 started preparation. Reloaded C1 and O1 views agreed on Safety approved and the saved preparation actor/time. See [MAIN safety and preparation](evidence/MAN-20261101-01/r18-main-safety-preparation.jpg). The successful artifact is a viewport capture; an earlier full-page screenshot attempt timed out and is not claimed as an artifact. |
| S1 signs out from END | Protected review information disappeared; the page required sign-in to view. |
| END approval and preparation | END's safety approval was recorded at 17:04:29 and preparation started at 17:04:48. These are separate from MAIN's decision and preparation records. |
| C1 tries early END completion, 17:04–17:05 | Mark completed was refused because END had not ended. The displayed end was `09:20Z`, equivalent to 17:20 Singapore time on 1 November 2026. END remained Confirmed. No completion or resource release is claimed from this refused attempt. |

**R18 walkthrough outcome:** Pass; the tally is **15 of 24 walkthrough groups complete, 9 remaining**. R17's arrangement-impact branches and attendee/unrelated-recipient checks remain outstanding; R17 is not passed. The observed navigation and saved-round behavior supports portions of TC-06-445, but the loading/saving-disabled and controlled-response assertions are not inferred from an unselected Save control. TC-20-431 remains partial pending unrelated-account checks. No additional case-wide Pass row is added by this checkpoint. Formal acceptance, release approval and sprint closure remain unchanged.

### MAN-20261101-01 continuation — Real registration close and CHANGE equipment, 17:09–17:10 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent. END's actual registration close was 17:10, with event start 17:15 and end 17:20; no clock modification is used or claimed.

| Observation | Actual result |
| --- | --- |
| CHANGE equipment preparation, 17:09 | Equipment reservation `365205b4-b084-4f96-ad57-4d98acf078f3` for CHANGE `7acbfe26-413c-41a0-9fa4-a82d138cfd1c` showed one microphone RESERVED and Equipment ready — 1 of 1. This retained reservation prepares the R17 affected-venue/unaffected-equipment branch; that change decision had not yet been recorded. |
| A1 withdraws after END registration closes | At or after 17:10:14, while still before the 17:15 event start, A1 proceeded through the warning and Confirm withdrawal for END. The attendee detail then showed **Your registration: Withdrawn**, one of two places left and **Registration for this event has closed**, with no Register action. A1's previously recorded END registration ID is `18b6b4f0-ec65-4e5e-bb81-5632e52c61a6`. |
| A2 remains registered on END | A2's END registration `99b1e9d9-578a-42fd-b553-80095253143d` remained Active, reserved for the real after-start refusal check. No after-start attempt had occurred at this checkpoint. |

**Artifact:** [END registration closed after withdrawal](evidence/MAN-20261101-01/r15-registration-closed.jpg). The free place and closed-registration UI demonstrate that availability alone did not enable re-entry. No direct re-registration API attempt or response status is claimed. The exact confirmation-warning wording for this closed-window attempt is **Not recorded** in this checkpoint, so TC-18-415 is not marked fully passed from these observations alone.

**Remaining scope and retained data:** R15 remains in progress pending after-start withdrawal refusal and the not-yet-open/registration-disabled scenarios. The new CHANGE reservation and END's changed registration status/history are retained; A2 remains active on END. No cleanup, acceptance decision, release approval or sprint closure occurred.

**Supplementary after-close warning observation:** the browser agent read the same conditional warning used before closing: **Your place will be released. You may register again only if registration is still open and capacity is available. A place will not be saved for you.** It did not promise re-entry, but did not explicitly state that the current window was already closed. The successful withdrawal and unavailable re-entry with a free place are directly observed. Whether this general conditional warning meets TC-18-415's additional expectation that the warning reflects the closed window is **Not assessed**; no full-case Pass or product failure is inferred solely from that wording.

### MAN-20261101-01 continuation — R19 safety branches, R15 after-start view and R21 notice, 17:12–17:16 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent through C1, S1 and A2. R19 remains in progress; the replacement arrangement and technical remediation were not yet completed at this checkpoint.

| SAFETY-REJECT branch | Actual observed result |
| --- | --- |
| Confirmation | C1 confirmed SAFETY-REJECT `f5031e9b-99bb-4dde-9000-99f053a20f86` at 17:12:11. It had no equipment and an approved Orchid booking; the observed booking ID prefix was `2e028`, with full ID **Not recorded** here. |
| Round 1 missing information | S1 saw missing Crowd movement explicitly in round `98196cd6-c483-4980-9780-63cf3a6a8003`. With Reject selected and Notes blank, Save was disabled. |
| Rejection, 17:12:53 | S1 saved **Crowd movement plan is missing; clarify west exit before review.** The rejection was retained on round 1. |
| Corrected round 2 | C1 corrected all three safety notes and submitted a new round at 17:13:15; S1 approved it at 17:13:19. The earlier rejected round remained in history and the event/venue arrangement were unchanged. The new round ID and exact corrected notes are **Not recorded** in this checkpoint. |

| REMEDIATE branch | Actual observed result |
| --- | --- |
| Ready fixture | REMEDIATE `42209235-16a8-4f82-8e06-9938f0fcb740` was Confirmed, with three microphones RESERVED at 17:10 and an Orchid booking approved at 17:11. The original booking ID prefix was `25e4`; its full ID and equipment request ID are **Not recorded** here. |
| Round 1 | Safety round `57a6addc-f34c-49d6-96d3-aba5dee6e8c6` was submitted at 17:12:15. For Request changes with a reason but no selected area, Save remained disabled. |
| Request changes, 17:13:06 | S1 selected Venue and Technical and saved instructions to replace the venue arrangement and reduce microphones from three to two. |
| Description-only edit | C1's ordinary description edit persisted, but safety still required Venue and Technical updates. The view stated that notes alone could not complete the required changes and did not offer resubmission fields. The changed description text is **Not recorded** here. |
| Begin venue remediation | C1 cancelled the original `25e4` booking with reason **Safety remediation** and created linked replacement `845a47cd-769b-4e64-b401-0eeb67e591a4` at the same Orchid venue for 24 November 2026, 09:00–10:00, with BOARDROOM layout. The replacement was Pending. Its approval, technical replacement and safety resubmission were still outstanding. |

| Other walkthrough observation | Actual result |
| --- | --- |
| R15: A2 after END starts | At or after 17:15:09, A2's END registration remained Active. The page stated **Withdrawal is available only before event start**, with no Withdraw control for END. See [after-start withdrawal restriction](evidence/MAN-20261101-01/r15-withdrawal-after-start.jpg). No direct withdrawal request or HTTP refusal is claimed; the controlled-clock/API specification TC-18-407 is not marked passed from this UI gate alone. |
| R15: registration-disabled event | A2's attendee view of Confirmed SAFETY-REJECT stated **This event does not take registrations**, with no Register action. The not-yet-open fixture remains outstanding before R15's walkthrough group can be completed. |
| R21: A2 significant-change notice | A2 saw MAIN's **Event details changed** notice dated 1 November at 17:01. The link targeted `/registrations?registration=e11f0f65-c8b5-4e64-9e57-21ea845d89b5`. Mark as read persisted after reload; other observed notices were unchanged. Following the link opened A2's correct registration context. The notice ID is **Not recorded**; no all-type or cross-recipient read-state matrix is inferred. |

**Retained data and scope:** the rejected and approved SAFETY-REJECT rounds, REMEDIATE's request-changes round, cancelled original booking, pending replacement, existing three-unit equipment reservation and changed description are retained. A2 remains active on END; A2's identified notice now remains read. R19 and R21 are partial, and R15 still lacks the not-yet-open observation. No new case-wide Pass, formal acceptance, release approval or closure is added by this checkpoint.

### MAN-20261101-01 continuation — Combined remediation and attendance-change branch, 17:17–17:19 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent through the current fixture roles. The combined Venue/Technical remediation succeeded; the separate area-only branches remain unperformed.

| REMEDIATE action | Actual observed result |
| --- | --- |
| Approve replacement venue, 17:17 | Orchid replacement booking `845a47cd-769b-4e64-b401-0eeb67e591a4`, with BOARDROOM layout, became Approved. |
| Replace reserved equipment | The original three-microphone line became Cancelled, explicitly replaced by the coordinator. Its successor requested two microphones. Before Technical Support reserved the successor, safety/readiness was still blocked because every active required line had to be reserved. The original and successor equipment-line IDs are **Not recorded** here. |
| Reserve the successor, 17:17 | T1 reserved the full two-unit successor. Only then did the safety notes/resubmission fields become available. |
| Check area recipients | V1's **Safety changes requested** notice specified venue changes; T1's notice specified technical changes. Both identified the correct REMEDIATE event and change reason. Exact notification IDs are **Not recorded**. |
| Submit and review round 2 | C1 submitted at 17:17:55. S1 saw BOARDROOM, two RESERVED microphones, corrected safety notes and the old round history, then approved at 17:18:09. The second round ID is **Not recorded** in this checkpoint. |
| Start preparation, 17:18:11 | C1 started preparation after the new approval. See [approved remediation and preparation](evidence/MAN-20261101-01/r19-remediation-approved.jpg). |

**TC-06-26:** `EX-06-26-MAN-20261101-01-A1` records Pass for the observed actual-remediation/new-round scenario, connecting these observations to the earlier description-only edit that left both requested areas unresolved. The descriptive-only edit is the actual variation of the specification's comment-only step. The evidence is live UI readiness, saved arrangements and retained round history; no direct API status or controlled concurrent-write behavior is claimed. R19 as a whole remains partial because Venue-only and Technical-only branches have not run, and the closed technical-remediation window after resubmission has not yet been rechecked.

**R17 attendance branch, 17:18:** C1 approved CHANGE's requested attendance change from 20 to 22. The preview listed only its Pending Orchid booking for cancellation. After approval, attendance was 22, that venue booking was CANCELLED with an approved-change-request reason, and microphone reservation `365205b4-b084-4f96-ad57-4d98acf078f3` remained RESERVED for one unit. No SQL was used. The change-request ID and cancelled booking's full ID are **Not recorded** here. This is the observed affected-venue/unaffected-equipment branch, not the complete TC-19-08 date-change matrix.

| New retained fixture | Recorded preparation |
| --- | --- |
| `REL-20261101-AGENT-STALE` | Event `84a2d6ea-6336-44fd-a7c8-d03b3b489fe3`; 26 November 2026, 09:00–10:00 Singapore time; registration capacity 2, opens 2 November at 09:00 and closes 25 November at 18:00. Created and assigned by the Lead to C1 at 17:19; subsequent approval/confirmation and not-yet-open observations are not claimed here. |
| `REL-20261101-AGENT-CHANGE-EQ` | Event `88bb8a9e-e9f3-497d-ab8e-691f2d67312c`; 27 November 2026, 09:00–10:00 Singapore time; registration not required. Created and assigned by the Lead to C1 at 17:19; its significant-change branch is not yet recorded. |

**Additional retained registration:** A2 registered for CANCEL during 17:16, leaving one of two places available. Its registration ID is **Not recorded** here. All fixtures, registrations, replaced arrangements, decisions and notices remain; no cleanup occurred. The walkthrough tally remains 15 complete groups, with R17/R19 and other outstanding branches still in progress. No acceptance, release or closure decision is added.

### MAN-20261101-01 continuation — R15 complete, real END completion and further change checks, 17:20 onward

**Executed:** 1 November 2026 by the Codex browser agent. Exact times are given only where observed below; other observations in this checkpoint have no separately recorded timestamp.

| R15 / notification observation | Actual result |
| --- | --- |
| A3 opens not-yet-open STALE | STALE `84a2d6ea-6336-44fd-a7c8-d03b3b489fe3` was Confirmed, with registration opening 2 November at 09:00. A3 saw two of two places left and **Registration for this event has not opened yet**, with no Register action. |
| Compare A3's MAIN notice with A2's read state | A3's MAIN **Event details changed** notice dated 1 November at 17:01 remained Unread after A2 marked A2's corresponding notice read. A3's own MAIN registration ID is `374e0621-8eca-4034-901a-b48ff57fd895`. This directly compares the two recipients' observed read states; it does not establish every notification type or foreign-ID mutation case. |

**R15 walkthrough outcome:** Pass for the observed walkthrough scope. The tally is **16 of 24 walkthrough groups complete, 8 remaining**. The retained TC-18-415 warning qualification remains **Not assessed**: the closed-window behavior worked, while its generic conditional warning did not explicitly say the window was already closed. No exact-clock API matrix or broader case-wide Pass is inferred from the group result.

| R23 END observation | Actual result |
| --- | --- |
| Complete after the actual end | After the clock was observed at 17:20:08, C1 completed END `f65feb52-085b-4910-8331-904e9c69469c`. Reload showed Completed, an audit time of 1 November at 17:20, and one equipment reservation released. The saved seconds of the completion audit are **Not recorded**. |
| Preserve venue and lifecycle history | Orchid booking `88e97699-cf00-44e6-9735-85dfdec0f64e` remained Approved for 17:15–17:20. Status history contained one Completed-from-Confirmed transition. Completion was not represented as venue cancellation. |
| Preserve registrations | C1's roster retained A1 Withdrawn with withdrawal time 17:10:24 and A2 Active, unchanged by completion. These historical statuses are not a claim that either attendee can take a new action on the completed event. |
| Owner history | O1 saw Completed history without a completion action. See [END completed](evidence/MAN-20261101-01/r23-event-completed.jpg). |

R23 remains in progress pending the independent resource-availability probe and remaining authority checks. Its observed successful completion does not establish the controlled exact-end or concurrent-completion specifications, nor all completed-event registration-action restrictions.

**R17 equipment-only branch, 17:21:** CHANGE-EQ `88bb8a9e-e9f3-497d-ab8e-691f2d67312c` had an equipment-only change approved. Its requested one-microphone line became Cancelled and remained so on reload, while Pending Orchid booking `d919cf66-bdcf-41f5-88bc-c2b69792f903` was preserved. The equipment-line and change-request IDs are **Not recorded** here. This complements the earlier attendance-only venue cancellation; it does not execute TC-19-08's separate date-change branch.

**R20 live readiness:** while a purpose change was pending on REMEDIATE, preparation became blocked even though safety remained Approved. O1 withdrew the change. Reload restored the existing Preparation started state and its original 17:18:11 timestamp without a new start. The pending/withdrawn change ID is **Not recorded** here. The venue-rule stale-approval branch is **Blocked** pending creation or identification of a dedicated isolated test venue; user input was requested. No shared venue rule was changed for that branch at this checkpoint.

**Retained data and scope:** END's Completed transition and released equipment history, its unchanged venue and historical registrations, STALE's current Confirmed state, CHANGE-EQ's cancelled equipment line and preserved booking, and REMEDIATE's withdrawn change/history are retained. R17, R19, R20, R21, R22, R23 and R24 retain outstanding scope, alongside R14's remaining checks. No cleanup, case-wide Pass, formal acceptance, release approval or sprint closure is added by this checkpoint.

### MAN-20261101-01 continuation — R23 complete and R22 cancellation, 17:23 checkpoint

**Executed:** 1 November 2026 by the Codex browser agent. The cancellation audit time is exact as displayed below; the supplementary resource/access checks do not have separately recorded timestamps.

| R23 closing observation | Actual result |
| --- | --- |
| Independent equipment probe | As T1 on PROBE `55e58c4a-8ab1-42c8-a572-69810743c14d`, an unsaved seven-microphone check for END's 1 November 17:15–17:20 interval showed total 10, damaged 2, maintenance 1, operational 7, peak reserved 0, available 7 and shortfall 0. |
| Unrelated coordinator | C2's END review URL was unavailable / permission denied. O1's previously observed history exposed no completion action. |
| Reload completed history | END retained a single Completed-from-Confirmed transition with no repeat-completion control. This is UI/reload evidence, not an executed repeated API completion request. |

**R23 walkthrough outcome:** Pass for the observed completion journey. The tally is **17 of 24 walkthrough groups complete, 7 remaining**. The exact-end controlled-clock and competing-completion specifications remain distinct from this successful real-time completion.

| R22 CANCEL action | Actual observed result |
| --- | --- |
| Validate cancellation inputs | Cancel remained disabled with a blank reason, with whitespace plus the acknowledgement selected, and with a nonblank reason but acknowledgement unselected. These UI guards are not recorded as HTTP rejection attempts. |
| Cancel as C1, 17:23:01 | C1 cancelled CANCEL `74707e58-b63f-4751-8601-bb58eebddcb2` with reason **Release test cancellation**. The result persisted with one Cancelled-from-Confirmed history transition. The Orchid booking whose ID begins `db72` became Cancelled with the same reason; its full ID is **Not recorded** here. See [event cancelled](evidence/MAN-20261101-01/r22-event-cancelled.jpg). |
| A2 cancellation outcome | A2's notice said the event had been cancelled and **Your registration is no longer active**, without the internal cancellation reason. The registration showed Event cancelled with time 17:23:01. The event detail was not open for registration, showed two of two places available, and retained the old registration as Cancelled with event. |
| Attendee discovery | CANCEL and completed END were absent from active discovery. Their retained history was not represented as deleted. |
| Technical Support outcome | T1's CANCEL notice stated it was cancelled and no longer open for planning. A separate probe for 25 November 09:00–10:00 requested seven microphones and showed peak reserved 0 and available 7. |
| C2 access | C2 was denied access to CANCEL. O2, the Venue Staff calendar and owner-notice checks were still outstanding. |

**Further R19 observation:** T1 reloaded REMEDIATE after safety resubmission/approval and saw the two-unit successor RESERVED, the original three-unit line CANCELLED and retained history. The view stated **This event is confirmed. Reservations are read-only**, with no Cancel buttons. This confirms the observed post-resubmission state; an immediate observation while the new round was still pending is not claimed. Separate Venue-only and Technical-only remediation branches remain unperformed.

**Further R17/notification observation:** C2 was denied MAIN's review. A3's MAIN change notice linked to A3's own registration `374e0621-8eca-4034-901a-b48ff57fd895`, not A2's registration. No unobserved unrelated inbox comparison is inferred.

**Remaining scope:** R22 remains in progress for its listed access/calendar/owner-notice checks; R14, R17, R19, R20, R21 and R24 retain outstanding work. All synthetic events, arrangements, released/cancelled histories, registrations and notices are retained. No additional full-case Pass is recorded: for example, TC-17-04 also requires repeated mutation requests and full release-audit/unrelated-event comparisons, not just successful terminal transitions. No cleanup, acceptance decision, release approval or sprint closure occurred.

### MAN-20261101-01 continuation — Dedicated venue and stale safety approval, 17:25–17:27 Singapore time

**Executed:** 1 November 2026 by the Codex browser agent through C1, V1 and S1. The user designated existing venue `d1ba6133-20fb-4efb-b1ad-7fcd5d31718c`, now displayed as Classroom, for the isolated R20 observations. This resolved the earlier missing-venue blocker without claiming that the venue was created by this run.

**Recorded baseline:** capacity 30; CLASSROOM layout; opening hours 08:00–20:00 Singapore time; setup 15 minutes and turnaround 15 minutes; no listed accessibility features or equipment. Only the setup buffer was varied for this branch. Its final restored value is recorded below; no deletion or reset was performed.

| Action | Actual observed result |
| --- | --- |
| Move STALE to the designated venue | C1 cancelled STALE's Orchid booking whose ID begins `ed49`, with reason **Use dedicated classroom R20**. Replacement `3eef65bc-b2af-41cc-8542-70b7beba90eb` at Classroom was approved by V1. The original booking's full ID is **Not recorded** here. |
| Establish current safety/preparation | C1 submitted STALE round 1 at 17:25:47; S1 approved it at 17:25:53; preparation started at 17:26:12. The round ID is **Not recorded** in this checkpoint. |
| Ordinary text comparison | A description-only edit preserved the current approval and preparation state. The exact changed description is **Not recorded** here. |
| Change setup from 15 to 20 minutes | V1 saved the new buffer. C1 reloaded and saw Approval out of date with preparation blocked. |
| Submit round 2, then change the reviewed arrangements | C1 submitted round 2 at 17:27:16. Before S1 decided, V1 changed setup from 20 to 25 minutes. S1's round view showed that arrangements had changed and could not be approved; the Approve radio was disabled and the displayed buffers were 25/15. See [stale round approval disabled](evidence/MAN-20261101-01/r20-stale-round-approval-disabled.jpg). The round ID is **Not recorded**. |
| Reject the stale round, 17:27:32 | S1 rejected it with a reason identifying the setup-buffer change after submission and instructing resubmission of the current arrangements. |
| Restore the baseline | V1 saved setup 15 minutes; turnaround remained 15 throughout. C1 still saw Rejected and preparation blocked. Restoring the buffer did not automatically re-approve the rejected round. |

**Outstanding R20 observations:** submit and approve a fresh round for the restored arrangements and resume preparation only when permitted; independently cancel/replace an approved arrangement and compare unrelated allocations plus safety state; and observe an offline decision save/reconciliation on a separate undecided round. These steps remain **Not executed** at this checkpoint. The pending-purpose-change live-readiness observation and restoration of its original preparation timestamp remain recorded above.

**Retained state:** Classroom's setup/turnaround are restored to 15/15; STALE retains its replacement booking, earlier approval/preparation and rejected stale round. The original cancelled Orchid booking and description-edit history remain. R20 is in progress rather than blocked by venue availability. No additional case-wide Pass, cleanup, formal acceptance, release approval or sprint closure is recorded.

### MAN-20261101-01 continuation — R14 complete, fresh safety approval and cancellation follow-up

**Executed:** 1 November 2026 by the Codex browser agent. Specific times are recorded where supplied below; the further confirmation-panel/calendar observations have no separately recorded timestamp.

| Direct R14 confirmation-panel check | Actual observed result |
| --- | --- |
| Pending venue on Approved CHANGE | Classroom booking `765997fa-034d-4e28-bd3a-2b0cb28e2f02` was Pending. CHANGE's confirmation panel showed Venue not ready while its reserved microphone remained ready. |
| Pending significant change on Approved CHANGE | O1 submitted a purpose change. The confirmation panel showed Change not ready and **Decide the pending change request before confirming**. O1 then withdrew the proposal. Its change ID and exact proposed text are **Not recorded** here. |
| Unreserved equipment on Approved CHANGE-EQ | A new Portable projector request for one unit remained REQUESTED. Confirmation showed Equipment not ready because every active required line must be reserved; the Pending Orchid arrangement also remained not ready. The new projector request ID is **Not recorded**. |
| Outage recovery and operational block | V1 approved CHANGE's Classroom booking `765997fa-034d-4e28-bd3a-2b0cb28e2f02`, then created an isolated block on 22 November 2026, 09:15–09:30, with reason **R14 isolated confirmation readiness test**. The UI identified one affected approved booking requiring recovery. CHANGE's confirmation panel required resolution of one booking still requiring outage recovery and one overlap; equipment and changes were ready, but there was no confirmation control. See [outage blocks confirmation](evidence/MAN-20261101-01/r14-outage-blocks-confirmation.jpg). The block ID was not shown and is **Not recorded**. |

**R14 walkthrough outcome:** Pass for the direct UI readiness checks together with the earlier successful confirmation, role and started-event observations. The tally is **18 of 24 walkthrough groups complete, 6 remaining**. The specific exhaustive state/API matrix in TC-06-03 is not automatically passed from the walkthrough group, and no unobserved server response code is claimed.

**R20 recovery after restoration:** with Classroom's buffers restored to 15/15, C1 submitted STALE round 3 at 17:28:24. S1 approved at 17:29:42 and C1 used Resume preparation at 17:29:44. The new round ID is **Not recorded**. An attempt to open DevTools using F12 through DOM automation did not open DevTools. Browser offline mode was not established, and no offline save/reconciliation test was performed: that branch remains **Not executed**, not a failed product test. Independent approved-arrangement invalidation/replacement also remains outstanding.

| R22 / notification follow-up | Actual observed result |
| --- | --- |
| V1 venue calendar | In Orchid's week beginning 23 November, Wednesday 25 November was available 08:00–10:00, including CANCEL's released 09:00–10:00 interval. An unrelated 10:00–11:00 booking remained. REMEDIATE's Tuesday 24 November 09:00–10:00 booking also remained. These unaffected booking IDs are **Not recorded** here. |
| Venue Staff notice | V1 saw CANCEL's cancellation notice. |
| Owner notices | O1 saw CANCEL cancellation, confirmation and registration notices. O1 also saw END completion, registration and withdrawal notices. Exact notice IDs are **Not recorded** in this checkpoint; a complete duplicate/recipient matrix is not inferred. |

**Retained data and remaining scope:** CHANGE's newly approved Classroom arrangement and isolated operational block remain, with outage recovery unresolved; the block is not silently removed. CHANGE-EQ's requested Portable projector, withdrawn purpose proposal history and STALE's new approval/resume records are retained. R22 still requires the current coordinator notice and O2 denial. R19's area-only branches and R17's withdrawn/unrelated-recipient absence checks remain outstanding, alongside the remaining R20, R21 and R24 scope. No cleanup, additional case-wide Pass, formal acceptance, release approval or sprint closure is added.

### MAN-20261101-01 continuation — R17 and R22 walkthrough completion

**Executed:** 1 November 2026 by the Codex browser agent using UI views only; no SQL or direct browser API calls were used for these observations. The new inbox/access checks have no separately recorded execution time.

| Closing observation | Actual result |
| --- | --- |
| C1 lifecycle/registration notices | C1 saw CANCEL cancellation, registration acknowledgement, confirmation, venue approval and equipment reservation notices. END completion, withdrawal and safety notices were also visible. These complement the earlier O1, V1, T1 and attendee observations. |
| MAIN change notification identity after refresh | For change `06fed275-db12-4c15-8f78-60010ecf7014`, C1 saw one **Change request to review** and one **Change request approved**, each with the correct change link. Refresh retained the same two distinct outcome titles/links; they were not treated as duplicate notices. Database notification IDs were not exposed and are **Not recorded**. |
| Unrelated O2 | O2's CANCEL event URL was unavailable / permission denied. O2's inspected full inbox showed only O2's older test-event notices, with unread count 11 and no MAIN or `REL-20261101-AGENT-` notices. |
| Withdrawn attendee A1 | A1's full inbox showed 16 notices, 15 unread, including the recorded MAIN withdrawal outcomes. There was no MAIN purpose-change **Event details changed** notice for 17:01. The earlier A2/A3 observations each showed the corresponding active-attendee notice with the recipient's own registration link. |
| Reconfirm released venue interval and unrelated arrangements | V1's Orchid calendar showed 25 November 08:00–10:00 Available, including CANCEL's released interval, while the unrelated 10:00–11:00 booking remained Booked. REMEDIATE's 24 November 09:00–10:00 arrangement remained Booked. V1's cancellation notice and the owner/current-coordinator notices were observed. |

**R17 and R22 walkthrough outcomes:** Pass for their observed walkthrough scope. The tally is **20 of 24 walkthrough groups complete, 4 remaining: R19, R20, R21 and R24**. `EX-20-431-MAN-20261101-01-A1` records the connected significant-change submission/review-prompt case using the initial O1/C1 link observations and the current unrelated-recipient/access observations. The actual permitted change was purpose-only on Confirmed MAIN; no separate request-for-action transition occurred. UI notice counts/links are not represented as database notification IDs or transaction/rollback evidence.

**Remaining state:** STALE's round 3 approval at 17:29:42 and preparation resume at 17:29:44 remain recorded; Classroom setup/turnaround are restored to 15/15. R20 is still partial for independent-arrangement invalidation and offline save/reconciliation; the offline branch is **Not executed**. R19's combined branch is complete, but separate area-only branches remain **Not executed**. R21's wider action/recipient matrix and R24's final access/evidence/retained-data review remain open. All synthetic data and history are retained. No cleanup, formal acceptance, release approval or sprint closure is inferred from the group tally.

### MAN-20261101-01 continuation — Independent arrangement invalidation and browser-session checkpoint

**Source:** browser-agent observations from the preceding session segment, recorded when work resumed. These belong to the ongoing 1 November 2026 run; their exact observation times are **Not recorded**. The walkthrough tally remains **20 of 24 complete**.

| R20 observation | Actual result |
| --- | --- |
| Cancel one approved arrangement | On Confirmed, safety-approved REMEDIATE with preparation already started and two microphones RESERVED, C1 cancelled BOARDROOM booking `845a47cd-769b-4e64-b401-0eeb67e591a4` with reason **R20 independent arrangement replacement**. The parent event remained CONFIRMED and the two-unit microphone reservation remained unchanged. Safety became Approval out of date; preparation was blocked and no approved venue remained. |
| Approve the linked replacement | Linked Orchid booking `99e8ad8b-388a-4ba2-af3c-6e1580be0f78`, CLASSROOM layout for the same 24 November 09:00–10:00 interval, was approved by V1. Safety remained out of date. The replacement venue approval did not renew the event's safety approval. |
| Submit a current round | C1 submitted REMEDIATE round 3 with current notes. S1 loaded `/safety-reviews/4d8a94f1-b826-468b-b3c8-5a222eaf257d` and selected Approve but did not save it before the browser-control session ended. The round is not recorded as approved by this checkpoint. |
| Offline-test stopping point | A native automation safety check ended the browser-control session before offline mode was entered. No offline save or failed-response reconciliation was executed, and no product failure is claimed. |

**Retained state and next scope:** the cancelled BOARDROOM arrangement, approved CLASSROOM replacement, unchanged two-unit equipment reservation and submitted round 3 remain. The pending decision must be re-read before any resumed action; selecting Approve alone is not a saved decision. Independent-arrangement safety invalidation is now observed; the R20 offline save/reconciliation branch remains **Not executed**. R19, R20, R21 and R24 remain open. No other file, case-wide Pass, cleanup, acceptance decision, release approval or commit is added by this checkpoint.

### MAN-20261101-01 continuation — Resumed safety form and S1 notification checks

**Executed:** resumed browser-agent segment of the 1 November 2026 run; exact new observation times are **Not recorded**. The browser tab remained controllable. Native Chrome accessibility was unavailable, and a screenshot requested through the bound Chrome surface instead showed the active Excel application. No native inputs were made against that mismatched surface. Offline mode was not entered: the R20 offline branch remains **Not executed** because of this UI-control obstacle, without a product failure claim.

| Resumed observation | Actual result |
| --- | --- |
| Request Changes requires an explanation | On pending REMEDIATE round 3 `4d8a94f1-b826-468b-b3c8-5a222eaf257d`, S1 selected Request changes and Venue. Save remained disabled for empty Notes and for whitespace-only Notes. This observes the missing-explanation UI guard; it is not a saved Venue-only outcome or an HTTP refusal. |
| Restore an unsaved approval draft | Notes were cleared and Approve was selected. Save was not performed. Round 3 is still not recorded as approved by this checkpoint. |
| Inspect S1 safety-submission notices | S1's inbox showed the safety-submission notices for MAIN and the `REL-20261101-AGENT-` rounds. The specifically followed round 3 notice displayed 17:33 and linked to `/safety-reviews/4d8a94f1-b826-468b-b3c8-5a222eaf257d`. Other individual notice IDs are **Not recorded**. |
| Persist S1's read state | S1 marked that round 3 notice read. Reload showed neither Unread nor a Mark as read button for it; the displayed header count fell from 25 to 24. The database notice ID is **Not recorded**. |
| Follow the notice | Open event request led to the correct REMEDIATE round 3, still Pending, showing the two RESERVED microphones. See [safety notice destination](evidence/MAN-20261101-01/r21-safety-notice-destination.jpg). |

**Scope and retained state:** the S1 notice's read state is retained; the round 3 approval remains unsaved. R19's blank/whitespace explanation guard is now observed, but separate Venue-only and Technical-only remediation journeys remain unperformed. R21 has this additional submission-recipient/link/read-state evidence but is not fully passed. The tally stays **20 of 24 complete**, with R19/R20/R21/R24 open; no additional case-wide Pass or release/acceptance decision is inferred.

### MAN-20261101-01 continuation — Venue-only remediation branch and signed-out read

**Executed:** 1 November 2026 by the Codex browser agent. R19's Venue-only branch is now in progress; it is not yet a completed group or case result.

| Venue-only fixture action | Actual observed result |
| --- | --- |
| Prepare CHANGE-EQ | V1 approved Orchid booking `d919cf66-bdcf-41f5-88bc-c2b69792f903` at 17:42. T1 reserved one Portable projector under request `1bd20e55-ff84-4562-8334-3b746250a3b9` at 17:43. The event is CHANGE-EQ `88bb8a9e-e9f3-497d-ab8e-691f2d67312c`. |
| Submit and request Venue-only changes | C1 submitted round 1 `ff5602f0-c480-4060-b1f3-3277a39a1dac` at 17:43:39. S1 requested Venue changes only at 17:44:00, with note **R19 Venue-only: replace the classroom layout with a safer boardroom arrangement. Equipment changes alone do not address this request.** |
| Change only the unrequested technical area | C1 explicitly replaced the reserved projector with another one-unit request, changing its technical requirement to secure the cables along the east wall. The original became CANCELLED and the successor REQUESTED. Safety still explicitly required updating Venue arrangements before a new review; no resubmission fields were available. The unreserved successor also separately failed ordinary equipment readiness. |
| Begin the requested venue change | C1 cancelled the original Orchid booking with an R19 Venue-only reason and submitted linked BOARDROOM replacement `f05ad395-fafd-4498-bda1-964555dff09c` for the same 27 November 09:00–10:00 interval. The replacement was Pending. Its approval, successor equipment reservation and next safety round were not yet recorded. |

**Verified artifact:** [Venue-only requirement still unresolved after the technical change](evidence/MAN-20261101-01/r19-venue-only-still-unresolved.jpg). The image was visually inspected before linking: it shows the cancelled original projector, requested successor, separate equipment-readiness blocker and explicit instruction to update the requested Venue arrangements. It does not show the subsequent replacement approval or a completed remediation round.

**R24 signed-out observations:** signed-out navigation to the localhost `/reviews` page required sign-in. Direct browser navigation to the same localhost application's `/api/auth/me` showed `AUTHENTICATION_REQUIRED` and **Sign in to continue**. The HTTP status was not observed and is **Not recorded**; this body is not recorded as proof of a 401 response.

**Retained state:** the cancelled original venue/projector, requested projector successor, Pending BOARDROOM replacement and Venue-only request-changes round remain. The exact successor equipment ID and full cancellation-reason wording are **Not recorded** here. The tally stays **20 of 24 complete**; R19/R20/R21/R24 remain open, with no new case-wide Pass, cleanup or release/acceptance decision.

### MAN-20261101-01 continuation — Area-specific safety remediation and additional recipient evidence, 17:44–17:49

**Executed:** 1 November 2026 by the Codex browser agent. The two linked screenshots below were visually inspected and match the stated safety states. R19 is still in progress because REMEDIATE's latest round is pending.

| Venue-only CHANGE-EQ continuation | Actual result |
| --- | --- |
| Approve required venue replacement | V1 approved BOARDROOM booking `f05ad395-fafd-4498-bda1-964555dff09c` at 17:46. |
| Restore ordinary equipment readiness | T1 reserved the one-unit projector successor `bda1cbc2-091f-4dfd-ba41-e0b2e15902cc`. Its cancelled predecessor and earlier cancelled microphone line remained in history. |
| New safety round and preparation | C1 submitted round 2 at 17:48:14; S1 approved at 17:48:42. The retained screenshot shows C1 final confirmation at 17:49:04 and preparation start at 17:49:09, with the earlier Venue-only round still Changes requested. See [Venue-only remediation approved](evidence/MAN-20261101-01/r19-venue-only-approved.jpg). |

| Technical-only REMEDIATE branch | Actual result |
| --- | --- |
| Request Technical changes only, 17:45:18 | S1 decided REMEDIATE round 3 `4d8a94f1-b826-468b-b3c8-5a222eaf257d` as Request changes for Technical only: reduce microphones from two to one and secure cables; venue changes alone do not satisfy the request. This is a saved Request Changes decision, distinct from the earlier unsaved Approve selection. |
| Change only the unrequested venue area | C1 cancelled CLASSROOM booking `99e8ad8b-388a-4ba2-af3c-6e1580be0f78` and created BOARDROOM replacement `3fae1b8a-8402-4d0c-b08c-d3a94fe20ada`. V1 approved it at 17:46. After C1 reloaded, safety still explicitly required updating the requested Technical arrangements; the two-unit microphone reservation was unchanged. See [Technical-only requirement still unresolved](evidence/MAN-20261101-01/r19-technical-only-still-unresolved.jpg). |
| Perform the required technical change | C1 replaced the reserved two-unit line `117d2c4c-ef83-49e4-9579-7434d36bc7dd` with one-unit request `3a29ea17-cab9-4e3f-8db5-f317e2890b73`, with technical notes addressing clear aisles/cables. The previous two-unit and three-unit lines remained Cancelled in history. The remaining gate required all active lines to be reserved; T1 then reserved the one-unit successor. |
| Submit current round 4, 17:48:26 | C1 submitted `4fd6f5fc-3227-45eb-94fe-bd63a8116e07`. It remained Pending with one microphone RESERVED, awaiting the planned offline observation and subsequent decision/resume. No approval or preparation resume is claimed yet. |

| R21 newly observed recipient evidence | Actual result |
| --- | --- |
| V1 earlier venue rejections | V1 saw MAIN's 1 November 03:26 rejection notice linking booking `6bf96dc4-9915-42bf-8468-fff8893b5008`, reason **R11 rejection test**, and the original Orchid booking `5b14411d-d83b-40c3-b5fe-0b0c70ec8cf0` rejected on 31 October at 19:02, reason **Venue does not have Theatre layout**. These notice timestamps are not new execution times for those original decisions. |
| Venue-only routing | V1 saw CHANGE-EQ's 17:44 safety request with the specific venue instructions and original booking `d919cf66-bdcf-41f5-88bc-c2b69792f903` link. T1's inspected list did not show that Venue-only safety notice. |
| Technical-only routing | T1 saw REMEDIATE's 17:45 Technical-only safety request with the correct equipment link. V1's inspected filtered list did not show that Technical-only safety notice; V1 did receive the separate later venue replacement/cancellation/approval notices. These absences are limited to the inspected UI lists, not a database query. |
| Equipment rejection | T1 and C1 saw PROBE's Equipment request rejected outcome with **R13 rejection test**; T1's notice displayed 16:50 and linked to the correct equipment context. |
| Current coordinator safety/outage/allocation | C1 saw both area-specific safety instructions, STALE's 17:27 rejection and SAFETY-REJECT's 17:12 rejection with reasons. C1 also saw CHANGE's 17:30 venue-outage notice for 09:15–09:30 with the recorded reason and booking `765997fa-034d-4e28-bd3a-2b0cb28e2f02` link, plus allocation notices for all the `REL-20261101-AGENT-` fixtures. |
| Current coordinator change withdrawals | C1 saw MAIN withdrawal notices for `ea95ab9b-1330-41ee-b450-b13328387120` and `5c7fb898-c416-497b-9c3e-30cd31480a3c` at 17:02; REMEDIATE change `4c9f37d7-bdf7-49ca-9044-ed3a0bf365e7` at 17:21; and CHANGE proposal `128312a8-4e13-4c18-a383-0921a3127b41` at 17:30. |

**Inbox scope limitation:** C1's rendered inbox ended at 16:47 despite known older user fixtures, and showed no pagination controls. It is not recorded as the full historical inbox; no absence of older C1 notices is inferred. Business-entity IDs above identify linked bookings/changes/reviews, not unexposed database notification IDs.

**Retained state:** CHANGE-EQ is confirmed, safety-approved and preparation-started with its approved BOARDROOM and reserved projector. REMEDIATE retains the approved new BOARDROOM, one reserved microphone, earlier cancelled lines/bookings and pending round 4. All decisions/notices remain. R19/R20/R21/R24 stay open and the tally remains **20 of 24 complete**; no new full-case Pass, cleanup or release/acceptance decision is added.

### MAN-20261101-01 continuation — Offline stale-tab reconciliation and R19/R20 walkthrough completion

**Executed:** 1 November 2026 by the Codex browser agent, with the user operating Chrome's network-throttling setting. Two visually identical tabs had different connectivity/context. The sequence below preserves that distinction and does not claim that an offline write committed or that a lost response concealed a successful save.

| Attempt / observation | Actual result |
| --- | --- |
| Initial save on the original tab | The user reported setting Offline, but Save on original tab `1669297443` reached the server and approved REMEDIATE round 4 `4fd6f5fc-3227-45eb-94fe-bd63a8116e07` at 17:50:12. The user had opened a separate identical tab, `1669297472`, which still displayed Awaiting and was the offline tab. This first save is a successful separately recorded decision, not evidence of an offline mutation. |
| Save on the bound offline stale tab | After binding the actual offline tab, S1 selected Approve and Save. The view showed **Unable to reach the API. Check that the backend is running, then try again. The review could not be reloaded. Reload this page before trying again.** The decision form and protected round details were removed, with no false success. See [offline save requires reload](evidence/MAN-20261101-01/r20-offline-save-reload-required.jpg). |
| Restore connectivity and reconcile | The user restored No throttling. Reload on that tab showed the already-saved approval from 17:50:12 with no decision form or repeat Save action. See [reconciled approved round](evidence/MAN-20261101-01/r20-online-reconciled-approved.jpg). The earlier file [online reload loading state](evidence/MAN-20261101-01/r20-online-reconciled-decision.jpg) shows only **Loading the safety review**; it is retained as loading-state evidence and is not proof of the completed reconciliation. |

The screenshots were visually inspected. The supported scenario is **offline stale-tab reconciliation of a decision saved separately in another tab**. It establishes failure/reload behavior and authoritative reconciliation in that scenario, not that a timed-out response committed the attempted write.

**R20 walkthrough outcome:** Pass for the observed stale-safety, independent-arrangement, readiness and qualified offline/reconciliation scope; the tally reached **21 of 24**. Exact delayed-response orderings, transaction outcomes and concurrency assertions retain their separate controlled specifications.

**R19 completion:** C1 resumed REMEDIATE preparation at 17:51:53 after round 4 was approved. One microphone remained RESERVED; prior cancelled two-/three-unit lines and round 3 Changes requested remained in history. See [Technical-only remediation approved and preparation resumed](evidence/MAN-20261101-01/r19-technical-only-approved.jpg), visually verified to show round 4 approved at 17:50:12 and preparation at 17:51:53. Alongside the completed Venue-only and combined branches, **R19 walkthrough outcome is Pass**. The tally is now **22 of 24 complete**, with R21 and R24 still open.

| Further access/notification observation | Actual result |
| --- | --- |
| R21 new coordinator handover notice | C2's inbox contained the `REL-20261031-HANDOVER` reassignment notice dated 31 October at 17:40, linking `/reviews/acb06944-af6b-4088-b057-26d2df33cd8c`. Following it opened the correct Submitted event with coordinator decision controls. The notice date is the historical outcome's displayed timestamp, not the date of this observation. |
| Former coordinator access | C1's same handover-event URL was now unavailable / permission denied. This supports current-permission enforcement; the older C1/owner handover notices remain separate observations. |
| R24 C2 MAIN protected views | MAIN's suitability view was unavailable / not permitted to assess. MAIN's roster showed **The event request was not found** without protected data. |

**Remaining evidence boundary:** R21's earlier notices that fall outside C1's rendered range are not classified as failed deliveries. The visible history/pagination limitation is an evidence-access obstacle. R24's remaining access, runtime/setup/CI/review and retained-data assessment is still open. No overall release acceptance, formal story acceptance or sprint closure is granted by the 22/24 tally; all synthetic records and decisions remain retained.

### MAN-20261101-01 continuation — R21 mixed-source completion and final access observations

**Earlier notification outcomes confirmed by the user:** the user explicitly confirmed Pass for the older R03/R04/R09/R12 notification checks, including O1/former-C1 handover notices, clarification/reply, hold/expiry and equipment-shortfall notices. These are user-reported earlier outcomes, not observations made by the browser agent in the new run. Their individual execution dates, tested builds, role executors and retained screenshots are **Not recorded**; source is the current project conversation. The current reporting date does not replace those missing execution dates. No per-case Pass is inferred from this group report.

**Additional current browser observation:** O1's rendered inbox contained 100 rows, ending at 1 November 14:05, with no pagination controls. O1 saw the CHANGE-EQ and STALE initial-submission notices at 17:19, saying they awaited allocation, and the other `REL-20261101-AGENT-` submission notices at 16:46/16:58. SAFETY-REJECT's initial approval at 17:06 and allocation at 16:59 were visible, with the correct `/events/...` links. The 100-row view is not represented as the full historical inbox.

**R21 walkthrough outcome:** Pass using the explicitly separated earlier user report and current browser observations. The tally is **23 of 24 walkthrough groups complete**. R24 remains open; the mixed-source tally does not establish a single tested build/date for all earlier groups or pass every notification transaction/concurrency specification.

| R24 role / saved route | Actual browser observation |
| --- | --- |
| O2 on MAIN | Event detail unavailable; review and suitability limited to Coordinator access; roster not found; booking view limited to Venue Staff/coordinators; safety limited to Safety Officer. No protected event/roster content was shown. |
| A3 | CANCEL's event detail was unavailable. MAIN review/suitability required Coordinator access; roster said the role could not view it; booking access was role-limited; safety required Safety Officer. |
| Signed out on localhost | Saved event, review, suitability, booking, roster and safety pages required sign-in and showed no protected data. |
| Signed out on 127.0.0.1 | Direct navigation to `/api/auth/me` showed an `AUTHENTICATION_REQUIRED` JSON response. The HTTP status remains **Not recorded** while the user checks the browser Network view; no 401 is inferred from the response body. |

**Current candidate GitHub lookup:** read-only results for SHA `429397aef14be8e3773206eddc9583e56c1f05ad` returned an empty statuses list. The connector's PR-workflow-runs query returned an empty first page, and a `minor-ui` branch search returned no result. These limited queries do not establish a passing CI run or prove that no other run/PR exists. Current-candidate CI and independent review/merge remain pending evidence.

### 1 November 2026 — TC-18-415 warning qualification resolved against current criteria

A separate read-only review checked live [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) and the repository card. AC101 permits withdrawal after registration closes but before event start; AC102 requires explaining that re-entry depends on registration being open and capacity being available, without promising a saved place. AC2 requires the applicable re-registration restrictions to be disclosed. None requires a separate dynamic sentence saying that registration is already closed. The matching repository [AC101/AC102](../scrum/sprint-04/sprint-backlog.md) are at lines 638–639; the actual warning is in `frontend/src/features/registrations/RegistrationsPage.vue:117`, verified in this checkout.

The observed warning satisfies those current criteria. TC-18-415's phrase that the warning reflects closed registration is ambiguous specification wording, not an additional acceptance criterion. The earlier **Not assessed** notes remain as the historical qualification; this review resolves that wording concern. No code failure or release blocker is raised solely because the warning is general and conditional. A future wording clarification may make the specification more precise; `test-cases.csv` is unchanged in this run.

`EX-18-415-MAN-20261101-01-A1` records Pass for the observed UI scenario: A1 withdrew after END registration closed and before event start, the conditional warning did not promise re-entry, and the event showed a free place but closed registration with no Register action. No direct API re-entry attempt, HTTP response status or controlled exact-clock test is asserted.

**Additional safety case mapping:** `EX-06-25-MAN-20261101-01-A1` records the completed manual targeted-routing scenario: Venue-only on CHANGE-EQ; combined and Technical-only in distinct retained REMEDIATE review rounds; correct coordinator/area-staff instructions, wrong-area changes leaving the requested area unresolved, and preserved unrelated arrangements/history. These are the actual fixture variations. TC-06-433/434 remain separately specified automated PostgreSQL regressions, with no new full execution claimed: the supplied UI observations do not include every repeated-pending-submission/pre-request-replacement/window-boundary assertion in those specifications. The prior TC-06-26 actual-remediation result remains valid.

### MAN-20261101-01 — Consolidated retained-data ledger

This ledger consolidates the latest observations above; it is not a fresh database inventory. No cleanup or deletion was performed. Unknown full IDs remain **Not recorded** rather than being reconstructed. Immutable decisions, cancellations, replacements, submissions, assignment and edit histories are retained. Any later removal or restoration requires the agreed shared-data procedure.

| Event | ID | Latest observed state / retained outcome |
| --- | --- | --- |
| MAIN (pre-existing) | `a8e842bb-6581-4196-b0a8-641dc30adaa0` | Confirmed; current safety approval and preparation started 17:04:27. Purpose **Workshop including a discussion session**; description **Arrival instructions: arrive 09:45**. Two approved Harbour arrangements and three reserved microphones retained; A2/A3 active, A1 withdrawn. |
| PROBE | `55e58c4a-8ab1-42c8-a572-69810743c14d` | Approved, explicit equipment Not Required, no venue; no registration. All tested equipment lines cancelled with retained history. |
| END | `f65feb52-085b-4910-8331-904e9c69469c` | Completed after its real 1 November 17:20 end; one reservation released, venue retained Approved, historical registration states retained. |
| CHANGE | `7acbfe26-413c-41a0-9fa4-a82d138cfd1c` | Approved; attendance 22; description **R16 current revision: organiser confirmed arrival instructions**. One microphone reserved. New approved Classroom booking remains affected by the retained R14 operational block and unresolved recovery. |
| SAFETY-REJECT | `f5031e9b-99bb-4dde-9000-99f053a20f86` | Confirmed; rejected first safety round and approved second round retained; approved Orchid, no equipment noted, registration disabled. |
| REMEDIATE | `42209235-16a8-4f82-8e06-9938f0fcb740` | Confirmed; round 4 approved, preparation resumed 17:51:53; latest BOARDROOM approved and one microphone reserved. Previous venues, equipment and round outcomes retained. |
| CANCEL | `74707e58-b63f-4751-8601-bb58eebddcb2` | Cancelled 17:23:01 with **Release test cancellation**; venue/equipment released and A2 registration cancelled with event; history/notices retained. |
| STALE | `84a2d6ea-6336-44fd-a7c8-d03b3b489fe3` | Confirmed; round 3 approved, preparation resumed 17:29:44; dedicated Classroom arrangement retained. Registration opens 2 November 09:00; no registration was created by the not-yet-open check. |
| CHANGE-EQ | `88bb8a9e-e9f3-497d-ab8e-691f2d67312c` | Confirmed 17:49:04; round 2 approved, preparation started 17:49:09; approved BOARDROOM and one reserved projector. Registration disabled. |

| Venue bookings / shared setting | Retained records and current observed status |
| --- | --- |
| MAIN | Two Harbour arrangements remain Approved; their full booking IDs are **Not recorded** in this continuation. Earlier rejected bookings referenced by V1 notices: `6bf96dc4-9915-42bf-8468-fff8893b5008` and `5b14411d-d83b-40c3-b5fe-0b0c70ec8cf0`. |
| END | Orchid `88e97699-cf00-44e6-9735-85dfdec0f64e` remains Approved for 1 November 17:15–17:20. |
| CHANGE | Earlier pending Orchid booking cancelled by the attendance change, full ID **Not recorded**. Classroom `765997fa-034d-4e28-bd3a-2b0cb28e2f02` is Approved, with recovery/overlap unresolved. |
| SAFETY-REJECT | Approved Orchid, observed ID prefix `2e028`; full ID **Not recorded**. |
| REMEDIATE | Original Orchid prefix `25e4` cancelled; full ID **Not recorded**. BOARDROOM `845a47cd-769b-4e64-b401-0eeb67e591a4` cancelled for R20. CLASSROOM `99e8ad8b-388a-4ba2-af3c-6e1580be0f78` cancelled in the Technical-only wrong-area check. Current BOARDROOM `3fae1b8a-8402-4d0c-b08c-d3a94fe20ada` Approved. All use 24 November 09:00–10:00. |
| CANCEL | Orchid prefix `db72` Cancelled; full ID **Not recorded**. Released interval 25 November 09:00–10:00. |
| STALE | Original Orchid prefix `ed49` cancelled; full ID **Not recorded**. Classroom `3eef65bc-b2af-41cc-8542-70b7beba90eb` Approved for 26 November 09:00–10:00. |
| CHANGE-EQ | Orchid `d919cf66-bdcf-41f5-88bc-c2b69792f903` Cancelled; BOARDROOM replacement `f05ad395-fafd-4498-bda1-964555dff09c` Approved for 27 November 09:00–10:00. |
| Dedicated Classroom baseline/restoration | Existing venue `d1ba6133-20fb-4efb-b1ad-7fcd5d31718c`: capacity 30, CLASSROOM, 08:00–20:00, no listed accessibility features/equipment. Setup was varied 15 → 20 → 25 → 15; turnaround stayed 15. Final buffers restored to 15/15. |
| Retained operational block | Classroom, 22 November 09:15–09:30, **R14 isolated confirmation readiness test**; one affected approved CHANGE booking. Block ID not shown / **Not recorded**. This block was retained, not removed. |

| Equipment context | Retained lines |
| --- | --- |
| MAIN | Wireless microphone `7dcc60ce-c098-4df0-893c-b358f718d646`, 3 RESERVED. |
| PROBE | `98a19263-21b8-4470-bd99-4ffac46ae501`, 1 cancelled as superseded; `3af33c7e-d7ce-4f64-9a31-14464279a895`, 2 reserved then cancelled with **R13 reservation-release test**; separate 1-unit rejected then cancelled line, ID **Not recorded**. Explicit Not Required saved. |
| END | `a4e29f15-2b37-4586-8fa8-a7240e78f2db`, 1 microphone released on completion. |
| CHANGE | `365205b4-b084-4f96-ad57-4d98acf078f3`, 1 microphone RESERVED and preserved through attendance change. |
| REMEDIATE | Original 3-unit microphone line cancelled, ID **Not recorded**; 2-unit `117d2c4c-ef83-49e4-9579-7434d36bc7dd` Cancelled; current 1-unit `3a29ea17-cab9-4e3f-8db5-f317e2890b73` RESERVED. |
| CANCEL | Equipment release observed through cancellation and independent availability; line ID **Not recorded**. |
| CHANGE-EQ | Original requested 1-unit microphone cancelled by equipment-only change, ID **Not recorded**. Projector predecessor `1bd20e55-ff84-4562-8334-3b746250a3b9` Cancelled; current 1-unit projector `bda1cbc2-091f-4dfd-ba41-e0b2e15902cc` RESERVED. |
| Stock counters | Wireless microphone checks consistently used total 10, damaged 2, maintenance 1, operational 7. The browser-agent continuation did not change these catalogue counters. The earlier user R12 baseline/history is not reconstructed; other catalogue IDs/counters are **Not recorded**. |

| Event safety rounds | Retained outcomes |
| --- | --- |
| MAIN | Round 1 `4562f827-f75f-489f-b2c2-54ad0e21add0` Approved 17:04:14. |
| END | Round 1 `f57b6d6d-d836-473f-a573-be5df874f033` Approved 17:04:29. |
| SAFETY-REJECT | Round 1 `98196cd6-c483-4980-9780-63cf3a6a8003` Rejected 17:12:53; round 2 Approved 17:13:19, ID **Not recorded**. |
| REMEDIATE | Round 1 `57a6addc-f34c-49d6-96d3-aba5dee6e8c6` Changes requested, Venue + Technical. Round 2 Approved 17:18:09, ID **Not recorded**. Round 3 `4d8a94f1-b826-468b-b3c8-5a222eaf257d` Changes requested, Technical only, 17:45:18. Round 4 `4fd6f5fc-3227-45eb-94fe-bd63a8116e07` Approved 17:50:12. |
| STALE | Round 1 Approved 17:25:53; round 2 Rejected 17:27:32; round 3 Approved 17:29:42. All three round IDs **Not recorded**. |
| CHANGE-EQ | Round 1 `ff5602f0-c480-4060-b1f3-3277a39a1dac` Changes requested, Venue only, 17:44:00. Round 2 Approved 17:48:42, ID **Not recorded**. |

| Registration / significant-change history | Retained records |
| --- | --- |
| MAIN registrations | A1 `10acf053-ebf3-4425-b33b-2abe679d2cdd` Withdrawn after same-ID re-entry; A2 `e11f0f65-c8b5-4e64-9e57-21ea845d89b5` Active; A3 `374e0621-8eca-4034-901a-b48ff57fd895` Active. |
| END registrations | A1 `18b6b4f0-ec65-4e5e-bb81-5632e52c61a6` Withdrawn 17:10:24; A2 `99b1e9d9-578a-42fd-b553-80095253143d` retained Active historically after completion, with actions unavailable after start. |
| CANCEL registration | A2 Cancelled with event at 17:23:01; registration ID **Not recorded**. |
| MAIN changes | `06fed275-db12-4c15-8f78-60010ecf7014` Approved; `d3ae6c9f-6226-4a41-ab92-92ea74945240` Rejected; `ea95ab9b-1330-41ee-b450-b13328387120` and `5c7fb898-c416-497b-9c3e-30cd31480a3c` Withdrawn. |
| Other changes | CHANGE attendance change Approved, ID **Not recorded**; its purpose proposal `128312a8-4e13-4c18-a383-0921a3127b41` Withdrawn. CHANGE-EQ equipment-only change Approved, ID **Not recorded**. REMEDIATE purpose proposal `4c9f37d7-bdf7-49ca-9044-ed3a0bf365e7` Withdrawn. |
| Notifications / read state | Outcome notices remain. A2's MAIN change notice and S1's REMEDIATE round 3 submission notice were marked read and persisted. Database notification IDs are **Not recorded**. Current rendered-inbox limits and user-reported older checks remain as described above. |

Existing STARTED `bd60431a-f0b3-419b-80e8-d7a07df97d75`, CAPZERO `3ff656b8-a67d-49f0-9e63-533da7d1313c`, and HANDOVER `acb06944-af6b-4088-b057-26d2df33cd8c` were inspected without business-data mutation by this continuation. Earlier user-created R01–R12 fixtures/settings outside this ledger are **Not recorded** here; their deletion/restoration is not implied.

### MAN-20261101-01 — Remaining release gates at documentation checkpoint

| Gate | Current evidence / remaining action |
| --- | --- |
| Walkthrough | 23/24 groups Pass with stated source/scope limits; R24 open. TC-06-32 is not passed by this partial overall walkthrough. |
| Signed-out HTTP status | Protected-page sign-in gates and `AUTHENTICATION_REQUIRED` body observed. Actual HTTP 401 confirmation still **Not recorded** pending the user's Network observation. |
| Candidate identity | Local HEAD `429397aef14be8e3773206eddc9583e56c1f05ad`; exact served frontend/API build not exposed and **Not recorded**. Product files unchanged during this documentation check. |
| Automated evidence | S4-E26 records passing check/coverage (1,209 frontend + 1,959 backend) and 248 browser cases. Its three source/test hashes were rechecked and match this checkout. Browser API substitutes remain explicit. S4-E23 records 814 real disposable-PostgreSQL tests on the earlier candidate, not a new shared-database run. |
| Current CI and independent review/merge | Not established for the three later UI commits on `fix/minor-ui-fixes`. Limited GitHub queries returned no statuses/PR-workflow result; this is not a CI Pass. Local main remains `5491021`; current candidate review/merge evidence remains pending. |
| Shared migrations and job | Current full 001–022 ledger and job configuration not freshly verified in this run. Earlier 021/022 application was user-reported; OPS-20261025-HOLD-EXPIRY-01 records the every-minute job and successful ticks then. Older configuration evidence is not a current refresh. |
| Warning qualification | TC-18-415 wording concern resolved against live KAN-17; no code defect/release blocker solely from the general conditional warning. Future specification wording clarification may be useful. |
| Evidence and shared-data disposition | Run/screenshots registered as S4-E27; eight scoped case results appended. Ledger above records known retained data and restored 15/15 buffers. No cleanup/deletion; missing full IDs remain explicit. Documentation/screenshots are uncommitted. |
| Formal decision | Story acceptance, release/code-freeze decision, participants and approval date remain **Not assessed / Not recorded**. No sprint closure or release approval is performed by this run record. |

### MAN-20261101-01 — Signed-out HTTP status confirmed, 1 November 2026

After selecting the `me` request in Chrome Network, the user confirmed **HTTP 401** for `http://127.0.0.1:5173/api/auth/me`. This is a user-observed network status, paired with the browser agent's previously observed `AUTHENTICATION_REQUIRED` response body after sign-out. No copied token was supplied. The earlier pending-status checkpoints remain above as history; the HTTP-status confirmation is now complete. Exact observation time and a Network screenshot are **Not recorded**.

**Functional walkthrough progress:** no further functional browser checks remain in this walkthrough. R01–R23 are Pass with the source and scope qualifications recorded above, and R24's browser access/logout portion is complete. The group tally remains **23/24 complete, one release-review group open**: the final candidate's CI and independent review/merge, current migration/job verification, and the team's release/code-freeze decision still require evidence. This confirmation does not itself establish release approval or story acceptance.

**Case-level scope:** TC-01-208 is the relevant logout specification, but no full case Pass is added from this observation alone. Its explicit cookie-clearing inspection and additional known protected API read returning 401 were not separately recorded; protected UI denials are not substituted for those API/cookie assertions. The eight scoped execution rows already supported by this run remain unchanged. This update records the actual 401 observation in the run narrative and S4-E27 without extending it to unperformed checks.

## MAN-20261101-02 — Targeted release follow-up, 1 November 2026

**Scope:** Five checks selected from OPS-7, D-1/O-1, OBS-12, OBS-6 and OBS-8 after the full release walkthrough. This is a new regression run, not a replacement for MAN-20261101-01 or a full release acceptance decision. Results: **two UI failures, one safety-rule/design inconsistency reproduced, and two scoped passes**. The safety restoration case is recorded Fail against the existing AC9 re-review wording, with the conflicting fingerprint design stated explicitly. Release/code-freeze acceptance remains **Not assessed**.

**Executor and environment:** Codex browser agent using Chrome, real test-role authentication, local frontend/API at `http://127.0.0.1:5173` and `http://localhost:5173`, and the shared Supabase development database. Source checkout: `034a631bdb05309d4ba0ef4ed1ff9ba032d9df50` on `fix/minor-ui-fixes`; exact served frontend/API build is not exposed and **Not recorded**. All times below are 1 November 2026, Singapore time. No product code, migrations or Jira statuses were changed. Passwords, cookies and tokens are excluded from the evidence.

**Methods:** Browser checks used actual UI actions and rendered-page observations, with separate coordinator, Venue Staff and Safety Officer sessions. OBS-8 and the OBS-6 stored-reason comparison used a separate direct live HTTP probe with real test-account sessions; its statuses are HTTP observations, not Chrome Network captures. No API responses were substituted in those connected checks. A separate narrow automated test run used mocked boundaries, as described below.

### Targeted results and reproduction steps

| Check / case | Steps and observed result | Assessment |
| --- | --- | --- |
| **OPS-7 / TC-06-446** — restored venue rules after an approved safety round | STALE already showed Round 3 Safety approved, decided 17:29:42, with preparation started 17:29:44. Venue Staff changed the dedicated Classroom setup buffer from 15 to 20 minutes; coordinator reload showed Approval out of date and preparation blocked. Venue Staff restored setup to 15; coordinator reload again showed Safety approved and the same old preparation timestamp, with the same three rounds and no new officer decision. Turnaround stayed 15 throughout. | **Fail against KAN-84-AC9's require-re-review wording; design inconsistency remains unresolved.** The current fingerprint compares values and becomes equal again after restoration. This is not evidence of a new review or a fresh preparation write. |
| **D-1/O-1 / TC-06-447** — stale confirmation readiness | PROBE had one approved Orchid arrangement and equipment Not Required. Its confirmation panel was Ready. Without leaving the page, coordinator submitted a second Classroom request; the booking panel showed Pending but confirmation still claimed every live arrangement was approved. After checking the acknowledgement and selecting Confirm event, the server refused with “Resolve 1 venue arrangement awaiting approval before confirming.” The panel became Not ready and the event remained APPROVED. | **Fail for stale UI; server guard passed this attempt.** No erroneous confirmation was observed. The mutation's exact HTTP status was not captured. KAN-61-AC3/AC101/AC103 govern current prerequisites and refusal; automatic UI refresh is a derived usability regression expectation, not newly added Jira wording. |
| **OBS-6 / TC-15-108** — cancellation displays the old rejection reason | Reloaded PROBE's previously rejected-then-cancelled microphone line. UI showed `CANCELLED: R13 rejection test`. Live GET returned `decisionReason: R13 rejection test` and the distinct `releaseReason: R13 finished rejection probe`, with `releaseCause: MANUAL_CANCELLATION`. | **Fail for the displayed cancellation reason; saved data is correct.** KAN-63-AC5 requires the latest saved outcome visible after refresh. The prior rejection may remain separately labelled history, but must not be presented as the cancellation reason. No equipment mutation was needed in this run. |
| **OBS-12 / TC-06-448** — return through real links after officer decision | After both PROBE bookings were approved, coordinator submitted Round 1 at 18:44:12. Safety Officer approved at 18:44:51 in another session. The untouched coordinator tab still said Awaiting Safety Officer. Coordinator then clicked Review queue and the PROBE event link without a browser reload; the page loaded Safety approved with the saved round/time and said to confirm the event before preparation. | **Pass for actual link navigation under KAN-84-AC12.** No live-push/polling requirement is inferred for an untouched tab. The initially captured JPG contains a loading screen only; the final rendered observation in the JSON is the evidence of approval. |
| **OBS-8 / TC-06-449** — completion read contract/privacy | Direct live GET for completed END returned 200 and its completion to the assigned coordinator. The same GET as unrelated Organiser 2 returned 200 with `completion: null`; an invented valid event UUID also returned 200/null. Signed-out GET returned 401 `AUTHENTICATION_REQUIRED`. | **Pass against the documented read contract.** The 200/null convention is intentional; no completion details were exposed to the unrelated caller. KAN-10's completion-action permissions do not specify a 404 for this read endpoint. Other roles, malformed IDs and a full authorization matrix were not tested by this probe. |

**Safety expectation and implementation distinction:** Live KAN-84-AC9 says safety-relevant changes invalidate prior approval and require re-review before preparation starts or continues. Existing TC-06-28 carries that wording. The recorded D3/D9 design in [assumptions and questions](../requirements/assumptions-and-questions.md) instead uses the current arrangement fingerprint, including venue operating hours/buffers. `backend/src/modules/safety/service.ts` and migration 022 consequently allow the old approval to become current again when those values match. No explicit agreed exception for restoring values after an already-decided approval was found. TC-06-436 tests restoring values before a pending round's first decision; it does not settle this post-approval scenario. The restoration policy and any resulting code/AC correction are **To agree**; no new policy or customer decision is recorded by this test.

**UI diagnosis:** `EquipmentRequestPanel.vue` renders `decisionReason` beside every status, while the frontend equipment-line type does not expose the separate release fields already returned by `equipment-service.ts`. For confirmation, the saved new booking updates its own panel without refreshing the Ready summary; the current-data server refusal remains effective. These are reproduced presentation defects, not evidence that cancelled equipment lost its audit data or that an unready event was confirmed.

### Narrow automated contract check

Command: `npm.cmd run test --workspace @connectsphere/backend -- test/events/completion.test.ts test/events/completion-router.test.ts`.

**22 tests in 2 files passed.** These service/router tests use mocked database/authentication boundaries. They support the completion contract interpretation; they are separate from the connected HTTP probe and do not establish full-system acceptance. No coverage run, full suite or disposable-database integration suite was repeated for this documentation-only follow-up. Earlier automation remains in its original runs, not relabelled as today's result.

### Retained data and restoration

| Fixture / record | Final state and disposition |
| --- | --- |
| Dedicated Classroom `d1ba6133-20fb-4efb-b1ad-7fcd5d31718c` | Setup **15 → 20 → 15**, turnaround **15**; original 15/15 buffers restored through Venue Staff UI. No other catalogue fields intentionally changed. The pre-existing 22 November operational block remains. |
| STALE `84a2d6ea-6336-44fd-a7c8-d03b3b489fe3` | Confirmed; the original Round 3 and preparation record remain. No new safety submission, decision or preparation action was performed for OPS-7. |
| PROBE `55e58c4a-8ab1-42c8-a572-69810743c14d` | Still **APPROVED**, equipment Not Required, no registration; now has two approved synthetic venue arrangements and one approved safety round. No successful confirmation or preparation action. |
| New PROBE Orchid booking `a63b30e1-112b-4264-8c8b-29b08caac2c0` | 16 November 2026 10:00–11:00, CLASSROOM, Approved. Note: **MAN-20261101-02 confirmation-readiness baseline; synthetic PROBE event.** Decision note: **MAN-20261101-02 readiness baseline approved.** Retained. |
| New PROBE Classroom booking `cb026d3e-830c-43da-b576-63bf7377104a` | 16 November 2026 11:00–12:00, CLASSROOM, occupied 10:45–12:15 with buffers. Pending during D-1, then Approved for OBS-12. Note: **MAN-20261101-02 stale readiness probe; leave pending until tested.** Decision note: **MAN-20261101-02 prepare real-link safety refresh check.** Retained. |
| New PROBE safety review `ae8ca119-1bbf-4200-aa66-64cc83c49dc4` | Round 1 submitted 18:44:12, Approved 18:44:51. Emergency access: **MAN-20261101-02 synthetic review: keep both classroom exits clear.** Equipment placement: **No equipment required.** Crowd movement: **Two test attendees move between rooms using clear aisles.** Decision: **MAN-20261101-02 synthetic approval for navigation refresh verification.** Retained. |
| Existing PROBE equipment `144fb6b8-9d99-44a7-a740-46b6d76c1138` | Cancelled before this run. Both reasons above persisted; release time `2026-11-01T08:50:18.093734Z`. Read only in this run; its full ID supplements the earlier run's unknown-ID note. |
| END `f65feb52-085b-4910-8331-904e9c69469c` | Read only. Completion remains `2026-11-01T09:20:16.544Z`, Event Coordinator, one released equipment request. |
| Invented UUID `8d223776-d0fc-437e-ae3c-107ae75d110d` | Read probe only; no event created. |
| Sessions / notices | Browser coordinator and officer sessions were signed out at the end; separate HTTP probe sessions were logged out. Workflow notices/history from the synthetic bookings/review remain; their IDs/counts were not inventoried. No shared test data was deleted. |

New retained bookings occupy their respective test venues for the times above. Do not reuse those intervals for an unrelated acceptance fixture without accounting for them. Cleanup is separate and requires the team's agreed procedure.

### Evidence and follow-up

Registered as **S4-E28**. [Browser observations](evidence/MAN-20261101-02/browser-observations.json) retain the rendered states; [HTTP probe](evidence/MAN-20261101-02/live-http-probe.json) retains exact statuses and selected response fields. Six JPGs are registered in the Sprint 4 evidence index. The OBS-12 JPG is explicitly a loading-only capture, not approval proof. Five narrow specification/execution rows preserve the different outcomes without promoting broader historical cases to Pass.

Resolve the two UI defects and reconcile the post-approval restoration rule before treating these targeted checks as release-ready. Owners' triage/reopening, implementation and retests remain pending; no Jira edit, release approval, sprint-velocity change, commit or push was performed by this run. Earlier MAN-20261101-01 results remain historical observations; these later failures qualify the current release candidate.

## AUTO-20261101-RELEASE-REGRESSIONS — targeted repairs, 1 November 2026

**Scope:** KAN-61 stale confirmation/readiness, KAN-63 cancellation-reason display and KAN-84 post-approval restoration. Current Jira criteria were read before repair. The earlier connected `MAN-20261101-02` failures remain unchanged; OBS-12 actual-link navigation and OBS-8 documented completion-read behavior required no code change. These are corrections within the existing criteria, not new customer scope or historical acceptance.

**Build:** `fix/release-regressions`, base `034a631bdb05309d4ba0ef4ed1ff9ba032d9df50` plus the uncommitted repair. The branch was created from updated main `5491021` and retains the existing minor-UI/evidence commits. [summary.json](../scrum/sprint-04/evidence/release-regressions-20261101/summary.json) identifies repaired source using normalized-LF SHA-256 hashes. Reproduction logs ran against intermediate pre-repair working files; their exact snapshots are Not recorded. Executor: automated local runner. Environment: Windows, Node 24.21.0, Vitest 4.1.11, Playwright Chromium, disposable PostgreSQL 17 on loopback port 55439. No shared Supabase mutation, real login or new manual acceptance was performed by this repair.

### Repair and focused evidence

| Case | Before repair | After repair / boundary |
| --- | --- | --- |
| TC-06-450, KAN-84 | `safety-before.txt`: changing/restoring without a read revives old approval and unblocks preparation. | `safety-focused.txt`: 52 database tests in four files pass. Permanent invalidation, fresh-round recovery, pending restoration, rollback/no-op/unrelated changes, private immutable evidence, shared venues, buffered blocks, upgrade preservation and both venue/stock race orders are covered. |
| TC-06-451, KAN-61/KAN-84 | `confirmation-before.txt`: five failed assertions reproduce stale summaries/actions. Access-loss and delayed equipment readback probes add separate before-fix failures. | `confirmation-access-focused.txt`: 78 tests in four component files pass. `equipment-readback-focused.txt`: 35 equipment tests pass. `confirmation-browser.txt`: six browser tests pass. Summary reads clear old eligibility; refresh/error/retry and context changes are covered without remounting unrelated forms. Browser/API substitutes are explicit. |
| TC-06-452, KAN-84 | `safety-context-ui-before.txt`: three failed assertions show missing officer context. | `safety-context-ui-focused.txt`: 29 component tests pass. Facilities and equipment technical requirements are visible, including empty or omitted values. |
| TC-15-109, KAN-63 | `equipment-before.txt`: seven failed display tests reproduce missing/mislabelled release detail. | `equipment-focused.txt`: 25 initial reason cases pass; final equipment suite is 35. `equipment-browser.txt`: desktop 1280px and narrow 390px cases pass, including persistence on reload and no horizontal overflow. |

All logs and screenshots are in [release-regressions-20261101](../scrum/sprint-04/evidence/release-regressions-20261101/). Case execution rows retain Fail and Pass attempts separately. The two equipment screenshots and the pending-booking confirmation screenshot were visually inspected; the refreshed checklist shows Not ready and the cancelled line separates release and previous-review reasons.

### Full checks and coverage

| Command / attempt | Observed result |
| --- | --- |
| `npm run check`, final code | **Pass:** tools/frontend/backend typechecks, 1,246 frontend tests in 59 files, 1,959 backend tests in 76 files, both builds. `check-final.txt`. Vite retains its non-fatal >500kB bundle warning. |
| `npm run test:coverage --workspaces -- --pool=threads --maxWorkers=4` | **Pass:** the same 1,246/1,959 tests. `coverage-verified.txt`. Frontend statements/branches/functions/lines: **95.84/92.54/97.85/98.38%**. Backend: **89.75/89.14/89.25/89.88%**. |
| `TEST_DATABASE_URL=<isolated local database> npm run test:integration -- --pool=threads` | **Pass:** 831 tests in 43 files on the final source, `integration-verified.txt`. Disposable schemas only; no cleanup-based tests pointed at shared Supabase. |
| Initial `npm run check` and database run | `check.txt` passed an earlier intermediate frontend count (1,239) plus 1,959 backend tests; `integration.txt` passed 831. These do not replace final-source runs above. |
| Initial coverage attempts | `coverage.txt` failed seven frontend tests while additional regressions were being written/fixed, including one timeout; it is not a clean unchanged-source baseline. `coverage-final.txt` subsequently hit Windows fork-worker shutdown failures. Retained, not relabelled Pass. Thread-worker final run above passed. |
| Intermediate final database attempt | `integration-final.txt` hit fork-worker shutdown errors and was stopped. The earlier complete run and final thread-worker run passed; no database deadlock was observed. |
| Initial full browser run, four workers and zero retries | `browser.txt`: **250 passed, 3 failed**. KAN-65 initial navigation, KAN-66 click stability and KAN-36 reload timed out. Sanitized action/network timing metadata is preserved in `browser-failure-diagnostics.json`; no additional application defect was established. Host/browser contention is plausible, not proved. |
| Retest of all three affected browser files, one worker and zero retries | `browser-retest.txt`: **23 passed**. The original failures remain recorded. The later parallel and serial attempts are recorded below. |

**Coverage limits:** these are whole-workspace unit coverage values, not coverage of every SQL trigger or proof against all mutants. Confirmation and safety summary components have 100% line coverage in this run; equipment has 98.18%, venue-booking 98.44%, and the planning parent 53.84% (including existing forwarding/template handlers outside the focused cases). The new parent refresh behavior has component-integration regressions. Safety service unit instrumentation records 33/164 lines and 38/149 branches; its transaction/trigger behavior is exercised by the separate real-PostgreSQL tests, whose coverage is not combined into this percentage. SQL coverage percentage is Not recorded. No 100% new-code or full integrated-acceptance claim is made.

### Migration, documentation and acceptance boundary

Migration 023 keeps applied 001–022 unchanged and adds permanent invalidation plus supplemental facilities/technical context. Upgrade preserves review decisions, preparation and notifications; it captures detectable current invalidity. It cannot reconstruct changes already restored before upgrade, and older supplemental baselines are explicitly upgrade-time observations. Source locks and rollback behavior are covered in the database suite. The officer screen displays the newly versioned context.

Contracts, safety/events module guides, frontend/database setup, current schema and safety sequence were updated. Mermaid schema/sequence PNGs were regenerated and visually checked. Earlier interpretation D3 remains historical, with a dated AC9 correction appended. No estimate, historical velocity, acceptance or Jira status is silently changed.

**Still Not executed:** shared migration 023 and connected post-repair `TC-06-446`, `TC-06-447`, `TC-15-108`. Their planning rows have no invented run/date/executor/build. Follow the [three focused E2E retests](README.md#1-november-2026--release-regression-retests). This repair creates no shared test data; MAN-20261101-02's retained data remains as documented there. Release/code-freeze acceptance remains Not assessed. No commit, push or PR was performed in this repair.


**Final browser reconciliation:** the second four-worker, zero-retry run (`browser-verified.txt`) passed 251/253; different initial-navigation timeouts occurred in attendee-role protection and organiser venue-availability navigation, before scenario actions. `browser-failure-diagnostics-2.json` preserves sanitized trace metadata. The complete **one-worker, zero-retry** run (`browser-serial.txt`) then passed **253/253**. No product code was changed between these browser attempts. Both parallel failures remain evidence of runner/browser instability with an unproven cause; the serial pass does not relabel those runs or establish CI stability. All newly added browser regressions passed in each complete run.

**Final housekeeping:** the owned ephemeral PostgreSQL container was removed after the passing tests; shared Supabase was untouched. The reusable Markdown and Word walkthroughs now require 023 and include the readiness, release-reason and no-read restoration checks. The packaged renderer could not find LibreOffice, so Word COM exported a PDF and bundled PDFium rendered 19 pages for visual inspection. Every page was checked; no clipping/overlap was found, with readable table continuation in the final results form. QA PDFs/PNGs remain temporary, not submission artifacts. `summary.json` records source and walkthrough/export hashes. No commit or push was made.

## AUTO-20261101-TEST-HARDENING — coverage, browser isolation and documentation

**Date and scope:** 1 November 2026 release preparation. Expanded coverage measurement, regression gates, tests for previously omitted authentication/shared code, real-database safety guards, browser-run isolation and testing/design documentation. KAN-25's current authentication criteria were read; the session and queue fixes enforce existing access expectations, without adding token revocation or changing story scope. Existing KAN-61/63/84 repairs and migration 023 remain in this branch. Earlier failures, manual outcomes and sprint acceptance records are retained.

**Candidate and environment:** `fix/release-regressions`, base `034a631bdb05309d4ba0ef4ed1ff9ba032d9df50` plus uncommitted changes identified by [summary.json](../scrum/sprint-04/evidence/test-hardening-20261101/summary.json). Executor: automated local runner, Windows, Node 24.21.0, Vitest 4.1.11 and Playwright Chromium. Database tests use the owned disposable PostgreSQL 17 instance on loopback port 55439, database `connectsphere_test`, with migrations 001–023 and synthetic fixtures. Browser servers own ports 4173/4311. Shared Supabase, the user's ordinary development servers and manual acceptance were not used. Exact intermediate pre-fix source hashes are **Not recorded**; final hashes must not be attributed to those reproductions.

### Changes and case-specific verification

| Cases / boundary | Change and evidence |
| --- | --- |
| TC-01-210 — isolated session state and cookie-call ordering | Generation checks discard obsolete identity responses. Login/logout writes are serialized; an already-sent stale login is cleared before a later write, session restoration waits for pending writes, and cleanup failures remain visible. `auth-races-before.txt` retains 7 failures/9 passes; `session-cookie-order-before.txt` retains 10 failures/14 passes plus one cascading mock error. Final `session-cookie-order-after.txt` passes 63 session/LoginPage/router/AppShell tests, including all 27 session cases. This is per-tab/module ordering, not cross-tab coordination or token revocation. |
| TC-01-211 — verifier plus local key server | 28 cases use real ES256/HS256 signatures and loopback JWKS for claims, expiry, cache/rotation, malformed data and fail-closed retrieval. They replace hosted Supabase; no live-login acceptance is inferred. |
| TC-01-212 — login, routing and shared navigation | 36 LoginPage/router/AppShell cases cover pending/error/retry, role navigation and denied deep links with controlled session/API boundaries. The actual router has no new global permission guard; existing page/server checks remain authoritative. |
| TC-DB-207 — pool and browser environment | Six pool tests cover configuration/error handling without connecting; two Node tests reject unsafe database URLs and replace inherited database/auth configuration before imports. Full browser runs subsequently start the real API against the owned test database. |
| TC-06-453 — real PostgreSQL safety guards | Five added cases cover ineligible/already-approved submission, missing/malformed reviews, obsolete fingerprint/closed event, pending readiness and preparation waiting for approval. They pass inside the combined 2,868-test run. |
| TC-06-454 — queue loading/access feedback | A pending queue read followed by sign-out or role loss previously left Loading visible. `safety-queue-before.txt` retains 2 failures/32 passes. Resetting loading before the permission return makes sign-in/refusal feedback visible; `safety-queue-after.txt` passes all 34 tests, including five new queue scenarios. |
| TC-15-110 and TC-10-213 — HTTP/parser integration | 20 equipment and 19 venue-search cases exercise real Express routing/middleware and parser boundaries with substituted identities/services. Roles, IDs, envelopes, error propagation, no-store and exact filter limits are asserted. Persistence is covered separately. |
| Supporting shared helpers | 20 API-client and 11 workflow-panel cases cover read/write errors, cancellation, stale responses, duplicate-write prevention, retry and cleanup. They support existing cases; their suite pass does not independently pass every linked manual scenario. |

The 73 new backend cases comprise 28 verifier, 6 pool, 20 equipment and 19 venue-search tests. The registers append nine reusable cases and twelve execution records: eight scoped Pass records, three failed attempts and one **Not executed** connected authentication smoke. These are case records, not a count of all individual executable assertions. All logs are retained in [test-hardening-20261101](../scrum/sprint-04/evidence/test-hardening-20261101/).

### Final validation

| Command | Final result / retained log |
| --- | --- |
| `npm run check` | **Pass:** typechecks, 1,332 frontend tests in 63 files, 2,032 backend tests in 80 files, two browser-environment guards and both builds. `check-final.txt`. The existing >500kB Vite bundle warning remains non-fatal. |
| `npm run test:coverage` | **Pass:** all 1,332 frontend and 2,032 backend tests; all workspace and critical-file floors pass. `coverage-final.txt`. |
| `TEST_DATABASE_URL=<owned loopback test database> npm run test:coverage:backend` | **Pass:** 2,868 tests in 123 files, comprising the 2,032 backend tests and 836 real-PostgreSQL tests in 43 files; all 99/97/99/99 floors pass. `backend-combined-gated.txt`, 201.93 seconds. Backend tests are included here again, not additional unique cases. |
| `TEST_DATABASE_URL=<owned loopback test database> npm run test:e2e` — final run 1 | **Pass:** 253/253 across 31 spec files, two workers, zero retries/skips/flaky outcomes, exit 0, 79.782 seconds. `browser-final-1.txt` and native `browser-final-1.json`. |
| Same full browser command — final run 2 | **Pass:** 253/253 on unchanged final source, two workers, zero retries/skips/flaky outcomes, exit 0, 77.952 seconds. `browser-final-2.txt` and native `browser-final-2.json`. This repeats the same cases; it is not 506 distinct cases. |

Earlier passing `check.txt`, `coverage.txt`, `frontend-expanded-initial.txt`, `backend-combined-initial.txt`, `backend-combined-final.txt` and `browser-isolated-*` belong to intermediate versions. In particular, the two initial isolated-browser passes preceded the final session-write and queue-loading changes. The final-source runs above supersede them for this candidate, without deleting their evidence. `browser-final-summary.json` records source hashes and confirms owned server ports were released after teardown.

### Measured coverage and remaining gaps

Percentages below are **statements / branches / functions / lines**; they measure executable source, not AC acceptance.

| Measurement | Result | Enforced global floor |
| --- | --- | --- |
| Frontend, all owned source | **96.07 / 93.07 / 97.86 / 98.41%** | 95 / 92 / 97 / 98% |
| Backend isolated/HTTP suite | **90.62 / 89.98 / 91.02 / 90.75%** | 90 / 89 / 91 / 90% |
| Backend combined with real PostgreSQL | **99.24 / 97.88 / 99.72 / 99.46%** | 99 / 97 / 99 / 99% |

Session, Supabase client, LoginPage, router, AppShell, backend token verifier and pool each have **100% on all four metrics**, with per-file gates. API-client and workflow-panel helpers also measure 100%. Backend safety/remediation paths are measured through the combined database run: safety service has 100% lines/functions, 99.48% statements and 95.30% branches; remediation has 100% on all four. Low isolated-service coverage alone therefore does not describe the combined evidence. Router paths mounted through app-level tests count even when no separate test imports that router directly.

Frontend auth, routing and shared components now remain in the denominator. Backend runtime constants are included; four pure type files contain zero executable statements, rather than uncovered runtime logic. Only backend process entry `server.ts` is excluded: browser tests start it as a subprocess, whose coverage is not merged. Frontend bootstrap/composition and an unused placeholder remain included at their actual values. The three normalized coverage-summary JSON files preserve every measured file. [coverage-gaps.json](../scrum/sprint-04/evidence/test-hardening-20261101/coverage-gaps.json) lists the remaining 75 files with any uncovered executable metric, exact source locations and measurement limitations.

**The whole repository is not at 100%.** Floors prevent regression; they do not waive the course rubric. Remaining optional/error/legacy/template paths are disclosed, not all declared impossible or unreachable. SQL/trigger statement percentage, external provider coverage, mutation score, cross-tab session ordering and performance measurements are **Not recorded**. Meaningful rollback/race/authorization assertions support the measured code; percentages alone do not prove their completeness or protection against every mutant.

### Browser stability, documentation and acceptance boundary

The earlier parallel navigation failures remain in `AUTO-20261101-RELEASE-REGRESSIONS`. Their precise cause was not proved. The revised harness refuses inherited shared/non-loopback URLs, builds Vue once, starts its own API/static frontend, refuses existing servers and uses two workers with zero retries. No scenario expectation was weakened, timeout increased or retry added to hide a failure. Two unchanged final-source passes support improved repeatability, not a guarantee that a browser test can never flake. Most browser routes substitute API/auth data and are **frontend integration**, despite the `e2e` command name.

CI now runs workspace floors plus combined PostgreSQL-backed coverage, includes the browser-environment guards in `check`, and uploads coverage/browser artifacts even on failure for 14 days. Its timeout is 25 minutes to accommodate the measured combined job. This was verified locally; a remote run of this uncommitted candidate, required-check enforcement and independent PR approval are **Not recorded**.

The specification audit corrected 337 mixed level/method/purpose labels, preserving prior values and reasons in `test-level-classification.json`; IDs, scenarios and earlier outcomes remain intact. The current registers contain **622 specifications, 228 trace rows and 1,098 execution rows**. Historical aggregate cards/placeholders are retained and are not completed-case counts. Trace paths and AC references were checked. The README now gives a current release checkpoint without overwriting historical entries. Current C1/C2/C3/class views describe all seven roles, actual mounted services, database transactions, lifecycle/safety and design trade-offs; the four PNG exports were regenerated and visually checked. A second read-only review found no new implementation blocker and corrected two small authentication/role descriptions.

**Deferred:** apply migration 023 to shared development Supabase, then run connected repair cases **TC-06-446, TC-06-447 and TC-15-108**, plus new real-authentication smoke **TC-01-213**. These remain **Not executed**. No new migration was introduced by coverage hardening; the existing 023 was exercised only on the disposable test database. No shared data was created or cleaned up. Release/code-freeze acceptance remains **Not assessed**. No commit, push or Jira status change was made.

**Cleanup:** after validation, the owned `connectsphere-test-hardening` container was identified by its exact container ID and task label, then removed. Its disposable data was not retained. Browser ports 4173/4311 were released; ordinary development servers and shared Supabase were left unchanged. Evidence logs, normalized coverage summaries, source hashes and failed attempts remain in the repository artifact folder.

## AUTO-20261101-FREEZE-CANDIDATE — final local verification, 1 November 2026

**Scope and candidate:** follows the approved release-preparation work on `fix/release-regressions`, base `034a631bdb05309d4ba0ef4ed1ff9ba032d9df50` plus the source identified in [summary.json](../scrum/sprint-04/evidence/freeze-candidate-20261101/summary.json). Current KAN-16, KAN-12, KAN-61 and KAN-84 criteria were reread. No requirement, estimate or historical acceptance changed. Executor: automated local runner; Windows, Node 24.21.0, Vitest 4.1.11, Playwright Chromium and disposable PostgreSQL 17 on loopback port 55439. Browser tests used owned ports 4173/4311 and two workers with zero retries.

The focused follow-up found a real overlapping-read race: an older parent refresh could overwrite a newer event status, or an older failure could trigger a full reload that discarded unrelated notes. Both organiser and coordinator detail pages now use a refresh generation as well as their abort controller. The shared planning-panel callbacks are exercised. Venue-search tests cover identity expiry, obsolete responses, retry and unmount without a product-code change.

| Evidence | Actual outcome |
| --- | --- |
| Parent reproduction / TC-06-455 | Four failures and 72 passes in `parent-refresh-before.txt`; exact intermediate source snapshot Not recorded. The failures are retained, not replaced by the final source hashes. |
| Parent retest / TC-06-455 | 88/88 across three files, including 22 added cases; frontend typecheck passes. Six planning callbacks, current/stale failures, route/account changes and preserved notes are covered. APIs and identities are substituted. |
| Search follow-up / TC-10-214 | 68/68, including nine added cases. Current 401 clears protected state; obsolete responses cannot restore it; current failures offer retry; invalid-period filter clearing recovers. APIs and identities are substituted. |
| `npm run check` | Pass: 1,363 frontend tests / 63 files, 2,032 backend tests / 80 files, two browser-environment guards, types and both builds. Existing >500kB frontend bundle warning remains non-fatal. |
| `npm run test:coverage` | Pass: all workspace and critical-file floors. Frontend statements/branches/functions/lines **96.56/93.41/98.54/98.92%**; backend isolated/HTTP **90.62/89.98/91.02/90.75%**. |
| `npm run test:coverage:backend` | Pass: **2,868 tests / 123 files**, including 836 real-PostgreSQL tests / 43 files; **99.24/97.88/99.72/99.46%** and all combined floors. The 2,032 backend cases are repeated, not additional unique cases. |
| Full Playwright, run 1 and run 2 | **253/253 each**, two workers, zero retries, skips or flaky outcomes. Both native JSON reports and logs are retained. These repeat the same 253 cases. Most substitute API/auth responses and establish browser integration, not shared Supabase acceptance. |

All logs are in [freeze-candidate-20261101](../scrum/sprint-04/evidence/freeze-candidate-20261101/). The initial focused typecheck failure was a test-stub typing issue and was corrected before the passing full checks. Search-only diagnostic coverage disabled global floors for that narrow selection; it is not the gated full-workspace result. Earlier browser failures in other run IDs remain unchanged.

**Remaining measurement limits:** the [frontend inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-gaps.json) and [combined backend inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined-gaps.json) retain exact locations and denominators. Frontend has 40 uncovered lines, 17 functions and 413 branch arms; combined backend has 16 lines, two functions and 53 branch arms. Planning-panel forwarding is now 100% function/line coverage. Auth/session/client/router/shell, verifier and pool retain their 100% gates. Remaining testable gaps include venue-block access/catalogue failures, draft uncertain-submit feedback, form validation/error branches, stale clarification status and unexpected error/rollback paths. Optional display, bootstrap and retained unused helper code are distinguished. One negative V8 branch hit count is flagged as an instrumentation anomaly and remains uncovered. These are disclosed coverage gaps, not reproduced defects or a claim that testing them is impossible. SQL statement coverage, mutation score, external-provider implementation coverage, cross-tab ordering and performance remain Not recorded. The floors do not waive the rubric's 100% target.

A separate read-only review found no blocker in refresh generation, cookie-write ordering, permanent invalidation or dependent-panel wiring. This AI-assisted code review is not a teammate's GitHub approval. The connected run below is separate from these automated results. Remote CI and formal release disposition are recorded against the eventual pushed candidate; neither is inferred from local passes.

**Cleanup:** the owned `connectsphere-freeze-candidate` PostgreSQL container was verified by exact ID and task label, then removed after validation. Its disposable database was not retained. Browser ports 4173/4311 were released; the ordinary frontend/API on 5173/3000 remain available. Shared test data and audit records are listed in MAN-20261101-03 below.

## MAN-20261101-03 — connected repaired-candidate acceptance, 1 November 2026

**Environment and method:** complete local frontend at `http://127.0.0.1:5173` and `http://localhost:5173`, running API on port 3000, real Supabase authentication and the agreed shared development database. Browser execution used the in-app browser through computer-use tools; supplied test-account login was explicitly authorised in this session. Executor: Codex-assisted browser operator. Independent normal HTTP requests and read-only database snapshots supplement the browser observations; they are labelled separately. No API responses were substituted. Build: the same uncommitted candidate/source manifest as AUTO-20261101-FREEZE-CANDIDATE, not a claim about earlier sprint builds.

**Shared rollout:** only pending migration **023_safety_approval_invalidation.sql** was applied, at **2026-11-01T15:26:05.971Z** (23:26 Singapore). SHA-256: **d5a1b176b831b43009559153b45b03a7130539ad730fce98702096fd4facd70c**. Existing 001–022 checksums agreed before application; a second migration run applied nothing. All 30 original safety reviews and ten preparation records retained their pre-migration hashes; 30 supplemental baselines and one detectable existing invalidation were recorded. Both new tables have RLS enabled. The API watch process restarted and readiness reported its database connected. No seed or cleanup-based test was run against shared Supabase. Before/apply/after/repeat evidence is retained in the automated artifact folder.

| Case | Observed result |
| --- | --- |
| **TC-06-446 — Pass** | STALE began Confirmed with approved Round 3 and preparation recorded. Venue Staff changed the dedicated Classroom setup buffer **15 → 20 → 15**, retaining turnaround 15, without opening the safety view between edits. After reload the coordinator saw **Approval out of date** and **Preparation blocked**. Read-only snapshots prove exact fingerprints were restored while a permanent invalidation remained; original review decisions and preparation timestamp were unchanged at this point. New Round 4 was then submitted, approved by the test Safety Officer and used to resume preparation successfully. This stronger no-intermediate-read variant supplements the specification's intermediate-read route. |
| **TC-06-447 — Pass** | PROBE initially showed all readiness checks Ready. Submitting a new Orchid pending booking immediately cleared the confirmation controls while reloading, then displayed **Not ready / one arrangement awaiting approval**, without a page reload. No stale Confirm control remained to invoke. Cancelling only that new booking restored venue Ready; the event stayed APPROVED. The earlier server-refusal result remains in MAN-20261101-02; this run did not force a hidden API transition. |
| **TC-15-108 — Pass** | The existing cancelled microphone line displays **Release reason: R13 finished rejection probe** and separately **Previous review reason: R13 rejection test**. An authenticated browser visit to the actual equipment-request GET returned matching saved fields. This is repaired readback, not another rejection/cancellation mutation. |
| **TC-01-213 — Pass** | Organiser sign-in, permitted navigation, reload and server-returned identity agreed. Direct coordinator navigation was denied. Logout removed protected content and the browser's `/api/auth/me` returned AUTHENTICATION_REQUIRED. Subsequent coordinator sign-in/navigation/reload retained the coordinator identity. Invalid credentials showed a refusal and created no session; final reload remained signed out. Separate real HTTP sessions recorded login/me **200**, logout **204** with a clearing cookie and subsequent me **401** for both roles. HTTP status codes were measured in that independent probe, not inferred from browser text. Copied-token revocation and cross-tab race behavior are not claimed. |

### Retained test data and restoration

| Item | Final state |
| --- | --- |
| Dedicated venue `d1ba6133-20fb-4efb-b1ad-7fcd5d31718c` | Original catalogue settings restored, including setup/turnaround **15/15**. Its normal updated timestamp changed. Before/restoration/recovery snapshots cover three synthetic REL events using it; no unrelated venue edited. |
| STALE `84a2d6ea-6336-44fd-a7c8-d03b3b489fe3` | Remains CONFIRMED. Old review `c53afc1a-2e88-4521-aa7b-e2511a80d235` retains its decision plus the new invalidation. New approved Round 4 `cd6ddd87-b408-4baf-9e0a-69a8b0f072ea` is retained; submission 23:39:08, decision 23:40:02, resumed preparation **23:40:41 Singapore time**. Preparation now references the new round. |
| PROBE `55e58c4a-8ab1-42c8-a572-69810743c14d` | Remains APPROVED. New booking `a48d92b8-c68e-4db4-8787-142fa9367bbd`, Orchid 16 November 11:30–12:00 Singapore, is **CANCELLED** with reason **MAN-20261101-03 temporary readiness test completed**; it no longer occupies the venue. Original bookings remain approved. Its prior safety round is now correctly invalidated by the arrangement change; a future test needing approval must submit a new round. |
| Existing equipment line `144fb6b8-9d99-44a7-a740-46b6d76c1138` | Read only; both saved reasons and cancellation state remain unchanged. |
| Other state | Original reviews, baselines and invalidations remain unchanged; new audit/notification records from the synthetic workflow remain. No shared rows were deleted. Browser role sessions and independent HTTP sessions ended signed out. |

Evidence under [MAN-20261101-03](evidence/MAN-20261101-03/) includes rendered UI observations, live equipment readback, independent HTTP status results, before/after read-only database comparisons and screenshots. Registered as **S4-E32**; automated verification and migration artifacts are **S4-E31**. Earlier failures and planning placeholders are preserved, and these four case results do not relabel every linked scenario or historic acceptance.

**Release disposition:** connected repair acceptance is complete for these four cases. R24/TC-06-32 remains open for candidate integration, exact-commit CI, actual independent teammate review and the team's freeze decision. No new Scrum meeting, Done-point credit or collective release approval is recorded by this run.

## CI-20261102-199 — pushed release candidate

[PR #80](https://github.com/MochaLxtte/ConnectSphere/pull/80) was opened from `fix/release-regressions`. [CI run 199](https://github.com/MochaLxtte/ConnectSphere/actions/runs/41323715692), run ID `41323715692`, job `124899143896`, completed **successfully**. Head: `0384a3c5edb2b992e52f112edf3b0513134b5b32`; base main: `54910211b4af9920af087e65e2c2ff15b9591b27`; GitHub test-merge: `bb198fe37a42f0f6687902d26ee49e1e7634b943`. The UTC run crossed midnight in Singapore; completion/evidence capture is recorded on **2 November**, without changing the 1 November local and connected execution dates.

Ubuntu CI passed installation, `npm run check` (1,363 frontend, 2,032 backend and two harness tests, types/builds), workspace coverage, migration/seed on disposable PostgreSQL 17, combined coverage (2,868 tests including 836 database tests), and **253/253 browser tests** with two workers and zero retries. Coverage statements/branches/functions/lines: frontend **96.56/93.41/98.54/98.95%**, backend unit/HTTP **90.62/89.98/91.02/90.75%**, combined backend **99.24/97.88/99.72/99.46%**. The Linux frontend line denominator is 3,722 with 39 uncovered, versus the local report's 40 uncovered; both measurements are retained. No new case-level manual Pass is inferred.

Retained under [freeze-candidate-20261101](../scrum/sprint-04/evidence/freeze-candidate-20261101/): `ci-199.txt` (decoded complete job log), `ci-199.json` (run/jobs/artifact metadata) and three `ci-199-*-coverage.json` per-file summaries normalized to repository-relative paths. Artifact `13089869784` was downloaded and its SHA-256 matched GitHub: `b8745f5bffc84112f57787c05d27836efe9c8b398a6db2628b1affb7ce1b6288`. The full 671-entry ZIP is retained locally outside the repo; the GitHub archive expires 15 November. Essential results and per-file coverage remain committed after that expiry. Raw console spacing/ANSI output is retained. All 456 committed source hashes matched the tested local manifest.

Arvin (`arvinty`) and Ryan (`ryanc9029`) were requested as independent reviewers. No approval had been submitted when this record was prepared. This documentation-only evidence follow-up receives its own CI run; the PR Checks tab and final PR update identify that exact head's result. **R24/TC-06-32 remains open for independent review, merge and the team's formal freeze decision.** No self-approval, merge or team decision is claimed.


## CI-20261102-MAIN — merge readback and frozen-source verification

The subsequent GitHub readback corrected the earlier assumption that PR #80 remained open: the author (`MochaLxtte`) merged it at **2026-11-01 23:58:58 +08:00**, while candidate CI was still running. The merge commit is `fb6d8d93f721b114accc9857a05d62e859987e23`. Requested reviewers remained listed, but the review API returned no submitted reviews. This is an author merge without a recorded independent GitHub approval; it is not described as reviewed. The code commit itself was `55e2b61` at 23:55:42, before the 23:59 cutoff.

Both the candidate run above and the push-triggered [main CI run 41323940034](https://github.com/MochaLxtte/ConnectSphere/actions/runs/41323940034) subsequently passed. Main's `verify` check completed at **2 November 00:08:53 Singapore time** on the exact merge SHA. It reran installation, types/unit/builds, all coverage floors, migration/seed and combined PostgreSQL tests, then all 253 browser cases. [Main metadata](../scrum/sprint-04/evidence/freeze-candidate-20261101/main-ci.json) and the [full main job log](../scrum/sprint-04/evidence/freeze-candidate-20261101/main-ci.txt) are retained. The connector's commit-workflow listing only returns pull-request-triggered runs; the push-triggered main status was therefore read from GitHub's Actions/check-run API. This was a read-only verification.

Later commits contain documentation/evidence only. They are retained on `docs/release-freeze-evidence`, based on that main commit, because no new PR is wanted while documentation is still being updated. No new main change, application code, SQL, test or configuration edit was made after the cutoff. New findings must be reported without code changes. The editing freeze is in effect; **R24/TC-06-32 formal release acceptance remains Not assessed**, with the missing independent-review evidence explicitly recorded. No team ceremony or acceptance vote is inferred from the freeze instruction or green CI.
