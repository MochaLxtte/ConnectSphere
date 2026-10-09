# Sprint 2 daily progress and burndown

Sprint 2 runs **20 September–3 October 2026**, Asia/Singapore. The starting baseline is **43 points across 12 PBIs**, comprising 35 new points and 8 carried points. Record actual observations below; an empty cell means not recorded, not zero work or a missed meeting.

## Cadence

Daily Scrums are scheduled **three times each week: Tuesday, Thursday and Saturday**. The Sprint 2 dates are **22, 24, 26 and 29 September; 1 and 3 October**. Exact times and participants remain to be recorded. Sprint Review is scheduled for Saturday 3 October; that day's Daily Scrum and review need separate records. Sprint 3 planning and the next sprint start fall on Sunday 4 October.

## Daily log

Scheduled dates do not establish that a meeting occurred. Capture actual meeting time, attendees, progress toward the goal, next steps, blockers and any adaptation. Add asynchronous development updates with their actual date and identify them as such.

| Scheduled Daily Scrum | Actual time / attendees | Progress toward goal | Next steps | Blocker / adaptation / owner | Evidence |
| --- | --- | --- | --- | --- | --- |
| 22 September | | | | | |
| 24 September | | | | | |
| 26 September | | | | | |
| 29 September | | | | | |
| 1 October | | | | | |
| 3 October | | | | | |

### 21 September backlog refinement

Asynchronous update, not a Daily Scrum: Jira criteria were refined, KAN-56–KAN-59 added under the three carried stories, KAN-60 added for mandatory event-rejection reasons, and KAN-61–KAN-64 added for future release coverage. KAN-21 was marked superseded by KAN-55. The live sprint still showed 12 PBIs / 43 points: 35 To Do, eight In Review and zero Done. No fixes or new test runs are recorded by this update. Exact observation time was not recorded.

Later backlog refinement on the same date added KAN-65 reassignment, KAN-66 ordinary planning edits and KAN-67 registration viewing as unestimated future stories. Existing registration, change-review, equipment and notification criteria were consolidated. KAN-21 was archived as a duplicate, and optional KAN-19/KAN-22/KAN-23 were archived with history retained. The sprint commitment remains unchanged. See the [product backlog](../../requirements/product-backlog.md) for scope and the archive register; this is documentation/backlog work, not a feature completion or test result.

### 28 September KAN-29 implementation

Asynchronous development update for Tristan, not a Daily Scrum or review: KAN-29 automatic initial assignment is implemented on the feature branch. Availability is explicit opt-in (`coordinator_available`, default false); active workload uses SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED and CONFIRMED. Selection uses lowest load then ascending application-profile UUID. Submission, coordinator linkage and automatic-history provenance commit together without an initial review decision. A lack of candidates returns `409 NO_AVAILABLE_COORDINATOR` and preserves an editable draft; preassigned drafts are preserved for investigation. Existing manual handover permissions remain unchanged.

Targeted local PostgreSQL checks passed: 29 automatic-assignment, 12 submission and 10 manual-assignment regression tests. [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment) records the tested environment and limitations. This update does not claim shared Supabase rollout, hosted manual acceptance, CI, peer review or a live Jira status/assignee change. The 43-point baseline is unchanged and no new burndown observation is recorded.

Next: coordinate schema/history reconciliation and migration 007 with Arvin, enable availability only for provisioned coordinators, review the implementation choices with the team/customer and execute the [manual checks](../../testing/README.md#kan-29-hosted-verification). Select a peer reviewer and record CI for the published branch. Venue services/UI/tests were removed from `main` on 26 September (`dff42ed`); earlier venue implementation observations are historical planning context, not current feature availability.

### 30 September repository scope correction

Asynchronous development update, not a Daily Scrum: audited mounted routes, Vue controls, services, seed behavior, tests and documentation against the Sprint 1/2 commitments. Removed later lifecycle actions, coordinator handover and notification writes. Kept initial manual assignment of unassigned requests, automatic assignment, clarification and read-only status history. Preserved all applied migrations, historical database objects and existing data. No shared Supabase change, live Jira transition, new Done points or burndown observation is recorded. Local validation passed: 602 unit/component tests, 141 PostgreSQL integration tests, 32 browser tests and type checks/builds; see [AUTO-20260930-SCOPE-01](../../testing/test-evidence.md#30-september-sprint-scope-correction).

The [scope audit](../../requirements/README.md#30-september-sprint-scope-audit) records boundaries; [test evidence](../../testing/test-evidence.md#30-september-sprint-scope-correction) records actual validation. Earlier dated test results remain historical. Next: peer review and hosted checks of the scoped build, then integrate the separate KAN-33 decided-request navigation work.

### 30 September Firebase migration retirement

Retired the unused Firebase setup file from the active migration sequence. Fresh databases use Supabase authentication without creating its legacy identity table; existing tables, data and migration records remain untouched. The runner retains checksum validation for an already-recorded Firebase 003. Renumbered active files to 001-006 without changing their SQL; historical filename aliases prevent rerunning existing changes. This resolves the pending-file collision found during read-only inspection of shared Supabase without modifying hosted history or claiming that KAN-29 migration 006 (formerly 007) has been applied. The 43-point baseline and acceptance records are unchanged. Local checks passed: 602 unit/component tests, 150 integration tests and type checks/builds ([AUTO-20260930-MIGRATION-01](../../testing/test-evidence.md#30-september-firebase-migration-retirement)). See the [retirement decision](../../requirements/assumptions-and-questions.md#30-september-2026---firebase-migration-retirement).

### 30 September migration and hosted schema consistency

Asynchronous follow-up, not a Daily Scrum: Tristan has applied migration 006 to shared Supabase. Read-only verification confirmed the required fields and constraint, and all six current migration checksums matched hosted history through the recognised filename aliases. The earlier scope-correction and Firebase-retirement entries retain their original execution boundaries. See [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) for the schema comparison and its limits.

Next: confirm availability only for provisioned coordinators, record team/customer acceptance of the availability policy, execute the hosted [manual checks](../../testing/README.md#kan-29-hosted-verification), and complete CI and peer review. Schema verification does not accept KAN-29, change the 43-point baseline or record Done points, a Jira transition or a new burndown observation.

### 29 September development update — Irfan (KAN-33 / KAN-56)

Asynchronous development update, not a Daily Scrum record. KAN-56 assigned to Irfan and moved to In Progress; KAN-33 moved from In Review back to In Progress while its carry-over repair is worked. S1-DEF-02 reproduced statically on `dff42ed`: the coordinator queue lists only pending statuses and `/reviews` offered no route back to a decided request. Repair implemented on `feat/KAN-33-decided-request-access` (coordinator `scope=history` list plus a Decided requests section; [decision record](../../requirements/assumptions-and-questions.md#29-september-2026--kan-56-coordinator-decided-request-history)). Automated checks passed locally (AUTO-20260929-01); hosted walkthrough MAN-20260929-01, CI integration/browser runs and peer review remain before Done. KAN-42/KAN-43 are to be closed with this PR's CI evidence and review. No story points are completed by this update.

### 1 October re-verification: S1-DEF-01 and S1-DEF-03 fixed

Asynchronous update, not a Daily Scrum: re-checked the two Sprint 1 carry-over defects assigned to Kai Jie against current `main` (`dff42ed`, after the 26 September KAN-24 revert). Both S1-DEF-01 (KAN-57, registration fields on a reopened draft) and S1-DEF-03 (KAN-58, submitting from the saved-draft edit path) are already fixed — merged as PR #17/#18 on 20 September, before this daily log existed. `npm run check` passes on current main (typecheck, 190 frontend + 372 backend tests, both builds); the two affected test files (23 tests) also pass in isolation. This is automated-fixture coverage only, not the hosted S2-T19/S2-T21 walkthrough. See the [dated record](../../requirements/assumptions-and-questions.md#1-october-2026--s1-def-01-and-s1-def-03-repaired-and-re-verified) and updated rows in [traceability.csv](../../requirements/traceability.csv) and [test-evidence.md](../../testing/test-evidence.md). This update did not assess S1-DEF-02 (KAN-33, Irfan); its separate KAN-56 repair, hosted result and CI are recorded in MAN-20260929-01 and AUTO-20261001-01. S1-DEF-04 (KAN-6 validation, Kai Jie) remains open.

### 3 October development update — Ernest (KAN-51)

Asynchronous development update, not a Daily Scrum record. KAN-51 was built on `feat/KAN-51-venue-availability-calendar` (`4c89da9` backend, `6ede774` frontend) as a new read-only module, because the earlier venue code was removed on 26 September: `GET /api/venues/availability` for Event Coordinators, Venue Staff and Technical Support Staff, and the `/venues/availability` week calendar. Provisional rules are in the [3 October decision](../../requirements/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar). Automated layers passed locally (AUTO-20261003-01), and [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) passed CI (AUTO-20261003-02); peer review is pending. The hosted S2-T05/S2-T06 checks still need Venue Staff and Technical Support Staff accounts and synthetic bookings and blocks, because the booking and blocking stories are not built yet. Jira status is not recorded by this update.

### 4 October integration and KAN-8 — Tristan

Asynchronous development update after the planned 3 October sprint boundary, not a Daily Scrum or review record. The branch now includes the latest fetched team work: `main` with KAN-56 decided-request access, Kai Jie's draft-verification documentation, KAN-12 venue search and Ernest's KAN-51 calendar. Local KAN-29, the Sprint 1/2 scope correction and the 001–006 migration/history compatibility work were preserved. No push or shared Supabase mutation is part of this update.

KAN-8 now supplies a staff pending-booking queue/detail and approval/rejection, with assigned-coordinator outcome visibility. Decisions are atomic and pending-only. Approval requires an approved event and active venue, then rechecks reserved/blocked periods; repeated/competing decisions preserve the first outcome. Staff see current event requirements and may supply an optional reason. The [4 October choices](../../requirements/assumptions-and-questions.md#4-october-2026--kan-8-venue-booking-decisions) remain subject to team/customer confirmation. Local test commands/results are recorded in AUTO-20261004-KAN8-01 in [test evidence](../../testing/test-evidence.md), separately from hosted checks.

Next: Tristan follows the [manual guide](../../testing/README.md#kan-8-hosted-verification), then publishes for CI/peer review. KAN-53 booking submission is still absent, so existing synthetic pending booking rows are needed; that setup does not accept the complete submission-to-booking path. KAN-8's three points plus KAN-29's three points give Tristan six new-story points. No Done points, live Jira state, review outcome, burndown observation or change to the 43-point baseline is claimed.

### 4 October development update — Kai Jie (KAN-55)

Asynchronous development update after the planned 3 October sprint boundary, not a Daily Scrum or review record, on `feat/KAN-55-block-venue-unavailability` (branched from `main`, separately from the still-open KAN-53 PR). Picked up after KAN-53, since no teammate had claimed it in the repository plan; Jira separately shows KAN-54 (Detect Venue Booking Conflicts) assigned to Ernest, which this update does not touch. Implemented `POST/GET/DELETE /api/venues/:venueId/unavailability`, letting Venue Staff record a mandatory-reason unavailability period for one venue, list a venue's blocks and remove one; and a Venue Staff-only `VenueBlocksPage` (`/venue-blocks`). A new block overlapping an existing `APPROVED` booking is refused (`409 VENUE_BOOKING_CONFLICT`) so an existing reservation is never silently displaced — a documented team default, not agreed policy; see the [4 October decision](../../requirements/assumptions-and-questions.md#4-october-2026--kan-55-block-venue-for-operational-unavailability). KAN-55-AC8–AC12 needed no new code: KAN-51's calendar, KAN-12's search and KAN-8's approval-time recheck already read `venue_unavailability`.

Local checks: `npm run check` passes (typecheck, 503 backend + 300 frontend unit tests, both builds). New unit/component tests cover the input parser, the HTTP boundary and the page. A `database/tests/venues/venue-blocks.integration.test.ts` covering KAN-55-AC1–AC13 against real PostgreSQL was written but **not executed**: this environment has no `TEST_DATABASE_URL` and no Docker, the same limitation recorded for KAN-53. This is automated-fixture coverage only; S2-T17/T18, policy acceptance, peer review and CI remain pending. No Done points, live Jira state, review outcome, burndown observation or change to the 43-point baseline is claimed.

Next: run the integration suite against a real test database; agree the block-over-existing-booking policy with the team; publish for CI/peer review.

### 4 October KAN-52 — Tristan

Asynchronous development update, not a Daily Scrum or review result: started `codex/KAN-52-venue-suitability` from current `origin/main` (`ae2be66`), including KAN-55's staff block management. Implemented assigned-coordinator suitability context/assessment and the event-linked UI. The user confirmed per-assessment interpretation of free-text event needs; the app explicitly checks that interpretation against current catalogue and availability data, shows reasons and preserves Needs review for unresolved inputs. Rechecking uses current information and refuses a stale requirement version. No migration or event/booking mutation is included.

Local verification passed: 913 unit/component tests, 228 PostgreSQL integration tests, 64 browser cases, type checks, builds and coverage reporting; see [AUTO-20261004-KAN52-01](../../testing/test-evidence.md#4-october-venue-suitability) for environments and boundaries. Next: perform [hosted S2-T09/T10 checks](../../testing/README.md#kan-52-hosted-verification), review the remaining [policy choices](../../requirements/assumptions-and-questions.md#4-october-2026--kan-52-venue-suitability), and obtain peer review/CI after publication. KAN-53 booking creation is not in this main baseline. Tristan's three implementations total nine existing new-story points; this does not reallocate Jira, change the 43-point baseline, award Done points or reconstruct the planned 3 October review.

### 4 October development update — Kai Jie (KAN-53)

Asynchronous development update after the planned 3 October sprint boundary, not a Daily Scrum or review record, on `feat/KAN-53-submit-venue-booking-request`. KAN-53 was the remaining unclaimed Sprint 2 item after reviewing the committed backlog's owner column; it was also the dependency the 4 October KAN-8 entry above flagged ("KAN-53 booking submission is still absent"). Implemented `POST /api/events/:id/venue-bookings`, letting the event's currently assigned, non-draft coordinator create a `PENDING` venue booking (venue, timing, optional layout/notes); and a coordinator-facing `VenueBookingPanel` added to `EventPlanningPanels`, alongside the existing assignment and clarification panels. Eligible event states (`REJECTED`/`CANCELLED`/`COMPLETED` refused; everything else accepted) and allowing duplicate pending requests are documented team implementation defaults, not agreed criteria — see the [4 October decision](../../requirements/assumptions-and-questions.md#4-october-2026--kan-53-venue-booking-submission).

Local checks: `npm run check` passes (typecheck, 500 backend + 301 frontend unit tests, both builds). New unit/component tests cover the input parser, the HTTP boundary and the panel. A `database/tests/venues/venue-bookings.integration.test.ts` describe block covering KAN-53-AC1–AC11 against real PostgreSQL was written but **not executed**: this environment has no `TEST_DATABASE_URL` and no Docker, so the local fallback test database could not be created. This is automated-fixture coverage only, not integration, hosted or CI evidence; S2-T11/T12, policy acceptance, peer review and CI remain pending. No Done points, live Jira state, review outcome, burndown observation or change to the 43-point baseline is claimed.

Next: run the integration suite against a real test database (local Docker or a dedicated Supabase test project) before claiming database-level verification; agree the eligible-event-states and duplicate-request policy with the team; publish for CI/peer review.

## Impediments and adaptations

| Reference | Current planning position | Next inspection | Action owner / resolution |
| --- | --- | --- | --- |
| Scope baseline | 35 new + 8 retained carry-over points = 43. Tristan implements KAN-29/KAN-8/KAN-52 (9), Ryan KAN-12, Ernest KAN-51 and Kai Jie KAN-55; this does not establish revised planning or live Jira allocation. Remaining owners, reviewers and actual capacity need confirmation. The 21 September Jira snapshot retains Kai Jie on KAN-6/KAN-34 and Irfan on KAN-33. | Allocate total work, including repair, integration and review; align Jira after confirming allocation | To agree |
| S2-Q01/02 | KAN-29 availability field, active statuses, UUID ordering and no-eligible failure are implemented as dated branch choices; migration 006 is applied and its shared schema verified on 30 September. Team/customer acceptance and hosted manual checks remain pending. The scope correction removes handover; initial manual assignment remains. | Review documented definitions, confirm provisioned-coordinator availability and execute manual checks | Tristan implementation; Arvin schema coordination; reviewer to agree |
| S2-Q03 | KAN-51 enforces the three internal calendar roles; event names are shown only to the assigned coordinator and block reasons to all three. KAN-12 search is coordinator-only; KAN-8 booking reads are staff or assigned coordinator, and writes staff-only. | Confirm provisional detail visibility and execute hosted role checks; calendar access does not grant booking permissions | Team/customer policy confirmation and hosted checks pending |
| S1-DEF-01–04 | Four carry-over paths require reproduction and regression evidence | Capture route, data, role and build; preserve successful Sprint 1 demo observations | To agree |
| S2-Q04–07, S2-Q10/11 | Venue interval/status, booking information, rejection reasons and block/catalogue lifecycle policies need refinement. KAN-52 uses user-confirmed coordinator interpretation with no schema change; its matching defaults still need policy acceptance | Agree the remaining rules while retaining Jira's existing suitability checks | To agree |
| Criteria reconciliation | Six shorter cards now include the missing checks and customer-rule refinements; the detailed planning version retains 93 stable IDs. | Complete detailed criterion/test cross-references and settle remaining policies before acceptance | Jira edits applied 21 September; remaining decisions to agree |

These are known planning dependencies, not a record that work was blocked on a particular day. Add dated observations and actions when they occur.

## Scope change log

| Decision date | Added / removed / re-estimated scope | Point delta | New total | Reason / participants | Evidence |
| --- | --- | ---: | ---: | --- | --- |
| Baseline | Nine new stories plus KAN-6, KAN-33 and KAN-34 at retained estimates | — | 43 | Starting scope; meeting participants not recorded | [Backlog](sprint-backlog.md) and [estimation](estimation-and-capacity.md) |

Carry-over is already included in the starting 43 points. Add only actual later changes; do not add the same defect work again as separate points without an explicit scope decision.

## Burndown data

| Date | Scope total at checkpoint | Actual cumulative Done points | Actual remaining points | Observation time / source / notes |
| --- | ---: | ---: | ---: | --- |
| 20 September | | | | Starting commitment: 43 points; actual checkpoint not recorded |
| 21 September | 43 | 0 | 43 | Live Jira inspection after refinement; 35 To Do / 8 In Review / 0 Done. Exact observation time and portable board capture not recorded. |
| 22 September | | | | |
| 23 September | | | | |
| 24 September | | | | |
| 25 September | | | | |
| 26 September | | | | |
| 27 September | | | | |
| 28 September | | | | |
| 29 September | 43 | 0 | 43 | Live Jira inspection by Irfan at about 18:40 +08:00: 0 Done. KAN-6/KAN-34 In Review; KAN-33 and subtask KAN-56 In Progress; KAN-8, KAN-12, KAN-29 and KAN-50–KAN-55 To Do, with KAN-50–KAN-55 unassigned. No portable capture retained. |
| 30 September | | | | |
| 1 October | | | | |
| 2 October | | | | |
| 3 October | | | | |

For each verified checkpoint, record `remaining = current scope total − accepted Done points`. Count a story only when it meets the Definition of Done; code presence, merged work and partial test passes do not burn its points. Historical observations recovered later must identify their source and capture date. Leave unsupported days blank.

## Produce and interpret the chart

Export the actual Jira burndown and retain its source/filter/date in the [evidence register](evidence/README.md). If producing a separate chart, use the verified table values, preserve gaps and annotate dated scope changes. Any ideal line should be labeled as a plan and use the agreed calendar/working-day convention. No actual burndown chart or trend is recorded yet.

### 5 October development update — published venue-branch integration

Tristan's KAN-52 branch now combines the published KAN-12 date-filter updates and Kai Jie's KAN-53 submission with KAN-8 decisions and KAN-55 blocks. Integration adds submission-time refusal of current approved reservations/blocks after the venue lock, coordinator-only panel access and stale/uncertain-request recovery. KAN-12 shares KAN-52's continuous-interval Singapore opening-hours rule. No migration is added.

The dated 4 October records above describe their original branch states and test environments. [AUTO-20261005-INTEGRATION-01](../../testing/test-evidence.md#5-october-integrated-venue-search-and-booking-submission) records the combined local result at `a093ca5`: type checks/builds, 1,028 unit/component tests, 255 database tests and 71 browser tests passed. All fetched remote branch tips are included; nothing was pushed. Next: verify the connected [coordinator submission](../../testing/README.md#kan-53-hosted-verification) → [staff decision and coordinator outcome](../../testing/README.md#kan-8-hosted-verification) journey with hosted accounts, then peer review and CI after publication. Eligibility, duplicate-pending and snapshot policies still need confirmation. Remote main, Jira assignments/statuses, review outcomes and the 43-point baseline are unchanged by this local integration.

### 9 October development update — Irfan (KAN-59 / S1-DEF-04)

The mandatory-field validation defect carried from Sprint 1 (Jira subtask KAN-59, inside KAN-6's carried points) was reproduced and repaired on `fix/KAN-59-submission-validation`, branched from `main` at `14ad0b2`, in small commits. KAN-59 had no assignee and its card was not edited.

- **Reproduction:** the browser form already trims text and checks the end time and registration window, but the server accepted whitespace-only mandatory text, an end that was not after the start, and a registration window that closed before it opened, so a direct API call could submit them. Restoring the old code made 25 of the new tests fail.
- **Fix:** blank mandatory text now counts as missing; invalid values return `400 SUBMISSION_INVALID` with per-field messages and leave the request a draft; the form shows those messages beside the inputs. The rules and the open attendance-0 question are in the [9 October decision](../../requirements/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04).
- **Criteria:** KAN-6-AC5–AC7 were added in the repository [sprint backlog](sprint-backlog.md) only; the Jira KAN-6 card needs its owner or the Product Owner to mirror them.
- **Verification:** `npm run check` passed at `a8b2983`; evidence is in [AUTO-20261009-KAN59-01](../../testing/test-evidence.md#9-october-submission-validation-kan-59--s1-def-04).
- **Not done:** the 12 PostgreSQL integration cases passed later the same day on a local PostgreSQL 17 (267 tests), but there is no hosted walkthrough (S2-T22), no peer review, CI run or PR. The 43-point baseline is unchanged and no points are claimed.

### 9 October development update — Irfan (KAN-54 verification)

KAN-54 (Detect Venue Booking Conflicts) was already implemented in `booking-service.ts` with PostgreSQL tests but had no unit tests and no case for another venue or a cancelled booking. On `feat/KAN-54-conflict-detection-verification` (local only, from `main` at `14ad0b2`) I added 21 unit tests and 3 integration cases, two repo-only criteria (KAN-54-AC10, AC11) and linked everything in CF-14, TC-14 and S2-T15/T16. No defect was found, so no source changed. Evidence: [AUTO-20261009-KAN54-01](../../testing/test-evidence.md#9-october-booking-conflict-detection-kan-54), register row S2-E25. Not done: PostgreSQL run, hosted check, push, Jira update (card belongs to Ernest).
