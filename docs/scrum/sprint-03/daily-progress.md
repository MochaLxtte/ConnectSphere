# Sprint 3 daily progress and burndown

**Current selected scope: 13 parents / 63 SP after the 16 October rebalance.** Earlier 84/97-point statements below are dated planning snapshots. No implementation completion is claimed by changing scope.

**Current ownership:** unassigned for members to choose; reviewers and integration lead To agree. Earlier named allocation entries below are historical.

Daily Scrums: Tuesday, Thursday, Saturday. Each person writes their own row; any one member adds the burndown checkpoint the same day. Notes written outside a meeting go under "Development updates" and say so.

## Daily Scrum log

| Date / time | Attendees | Member | Done since last | Next | Blockers |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Development updates

Dated notes per story: what was finished, evidence IDs, what remains.

**15 October 2026 — preparation outside a Daily Scrum.** Reconciled original sprint records, current Jira/backlog exports, retained the post-sprint audit as `AUTO-20261015-01`, and prepared the [defect triage](planning.md#pre-planning-baseline-and-defect-triage) and [customer change register](../../requirements/change-requests.md). No repair was implemented, no Jira story was reopened, and no Sprint 3 goal, owner, estimate or commitment was agreed by this work. Actual planning/acceptance evidence and the team's decisions remain outstanding. This is not a member's standup row.

**16 October 2026 — schedule and scope refinement outside a Daily Scrum.** The confirmed sprint window is 4–17 October, with planning on 4 October but no finalised scope or Sprint 3 work started at that point. All six members intend two full days of focused work, 16–17 October. Sprint 4 is final development, projected 18–31 October; Week 12 is 2–8 November, giving a Friday 6 November submission deadline. The current scope proposal is documented in [planning](planning.md), with estimates **To agree**. No implementation, acceptance or team vote is recorded by this note; it is not a member's standup row.

The broad proposal covers all 15 future items, five additional repairs and CR-1/CR-5 in Sprint 3 (84 provisional SP), followed by the remaining four customer changes in Sprint 4 (29 provisional SP). These proposed values are not entered in the agreed scope/burndown tables below; they await team agreement, votes and ownership. The current Jira estimates and statuses are unchanged.

**16 October 2026 — selected plan and evidence review outside a Daily Scrum.** The selected carry-over covers KAN-6, KAN-34, KAN-50, KAN-12 and KAN-52 at full original points for completion/re-verification. The selected Sprint 3 scope is **97 SP = 60 future + 19 carried + 18 new** across 23 items. This supersedes the initial 84-SP proposal's 6-SP repair allowance; no original carry-over estimate is reduced to zero. The five currently outstanding stories earn no delivered credit in the present disposition, while historical Sprint 2 acceptance and velocity remain **Not recorded**. The remaining 24 points are not automatically accepted by subtraction.

Selected ownership/review: Arvin 19/Kai Jie, Kai Jie 19/Tristan, Ernest 12/Ryan, Tristan 23/Irfan, Ryan 11/Arvin and Irfan 13/Ernest. Arvin coordinates integration. KAN-15 changes from 2 to 5 SP with rationale in [estimation](estimation-and-capacity.md#re-estimates-during-the-sprint); KAN-60 is the one 2-SP rejection-reason correction and does not duplicate KAN-36. Jira verification confirms KAN-77 (2), KAN-78 (8) and KAN-79 (8) for the three new change stories. Sprint 3 id 67 is Active with 23 parents / 97 SP, all To Do. Sprint 2 id 34 was administratively closed on 16 October at 02:06 Singapore time; no historical acceptance outcome is inferred. The [plan](planning.md) includes dependency order, implementation defaults and two-day checkpoints. This update records planning, not six individual votes, a Daily Scrum, executed tests or implementation completion.

**16 October 2026 — balanced release reconstruction outside a Daily Scrum.** Receipt of the Week 7 changes on 2 October was confirmed, together with the plan to finish the original Sprint 2 scope before considering changes at Sprint 3 planning. The confirmation is recorded now; original implementation dates, missing acceptance and the 43-point Sprint 2 baseline remain unchanged. Current planning creates a complete linked customer-change backlog and allocates **63 SP to each remaining sprint**. Move 12 unstarted existing parents / 47 SP to Sprint 4, split KAN-64 8 into KAN-64 5 + KAN-80 3, and bring CR-2 (KAN-81, 8) and CR-4 (KAN-83, 8) into Sprint 3. CR-3 (KAN-82, 5) and CR-6 (KAN-84, 8) remain in Sprint 4. Full original carry-over remains 19 SP. Ownership/review is redistributed in [planning](planning.md); no six-member vote, standup, test execution or earlier commitment is claimed.

**16 October 2026 — self-selection follow-up outside a Daily Scrum.** Stories are unassigned for team members to choose; the earlier named allocation is superseded. Target roughly 10–11 SP each per 63-SP sprint and 21 SP across the 126-SP release remainder, without splitting or changing story estimates merely to equalise loads. Select independent reviewers after ownership and agree an integration lead. Scope, criteria, test outcomes and historical assignments are unchanged. This is a planning update, not a standup or meeting record.

**Documentation update — 17 October 2026, outside a Daily Scrum.** Reconciled the submitted backlog and original Sprint 1/2 criteria with current stories and the recorded customer changes. Added dated criterion crosswalks, 142 unexecuted functional specifications and 19 traceability rows; restored the existing search/suitability no-automatic-event-rejection rules and explicitly mapped the database-diagram check. The workbook preserves its Jira source rows alongside labelled repository supplements. Documentation consistency passed 21/21 checks and native workbook preservation passed 12/12; see [AUTO-20261017-DOCS-01](../../testing/test-evidence.md#17-october-2026--historical-criteria-and-submitted-backlog-reconciliation) and S3-E13. Scope remains 63 SP per remaining sprint. No Jira change, application test, story acceptance or member standup is recorded by this update.

**19 October 2026 — KAN-79 development outside a Daily Scrum.** Implemented trusted Event Coordinator Lead provisioning, unassigned submission, the Lead queue/oversight interface and transactional initial allocation. Added normal, boundary, failure and concurrent-write tests, including profile eligibility changes during assignment. `AUTO-20261019-01` and S3-E14 record automated results and coverage; the master workbook and contracts now describe this branch. KAN-79 and KAN-85/86/87 are In Progress; no parent points are delivered. Remaining: coordinate migration 007 and mapped Lead test accounts, run hosted checks, integrate KAN-65/KAN-64, obtain independent review, merge and assess DoD. Sprint membership is retained while Jira Sprint 3 remains Active; this actual 19 October work is not backdated into the configured 4–17 October window.

**19 October 2026 — KAN-65 development outside a Daily Scrum.** Integrated KAN-79 and implemented Lead-only reassignment with reason/version validation, atomic history, safe stale/no-op handling and immediate current-assignment authorization. Added frontend recovery, signed-runtime/database concurrency checks and browser coverage. `AUTO-20261019-02` / S3-E15: 604 frontend, 1,035 backend, 341 isolated PostgreSQL and 132 browser tests pass; contracts, diagrams, cases, traceability and master workbook updated. KAN-65 and KAN-88/89/90 remain In Progress; 3 SP unchanged. User-reported migration 007 application and Lead login supersede the earlier setup gap; full manual/hosted testing, KAN-64 notifications, review, merge and DoD assessment remain pending. This actual 19 October work is not delivery evidence by 17 October and is not a member Daily Scrum row.

**20 October 2026 — KAN-79 and KAN-65 merged outside a Daily Scrum.** [PR #34](https://github.com/MochaLxtte/ConnectSphere/pull/34) was approved by Irfan and merged into `main` as `3ddba2b` at 23:01 Singapore time. The approval was based on the passing CI `verify` run for head `36d410d` (S3-E16) and a conflict-free merge state; a check of the PR template against the diff and of the code against the ACs and Definition of Done (`AGENTS.md` §5.11 steps 1–2) was **Not executed**. The merge also brought the `docs/team-agents-guide` commits and the 16–17 October documentation reconciliation into `main`. Manual/hosted workflow checks and KAN-64 notifications remain **Not executed**, so neither story meets the Definition of Done; KAN-79 (8 SP) and KAN-65 (3 SP) deliver no points and remain In Progress in the repository records. Jira status, subtask and comment updates are **Not recorded**. This is not a member Daily Scrum row.

**21 October 2026 — KAN-53 and KAN-55 evidence backfill outside a Daily Scrum.** Mapped existing automated tests to every KAN-53 and KAN-55 criterion and recorded the run as `AUTO-20261021-01`: local unit and component suites plus the `main` CI run 39447691109 on `aaee549` for PostgreSQL and browser layers. TC-12 now passes at integration level, and dated backfill notes were added to Sprint 2's S2-T11/T12/T17/T18. Gaps: KAN-55 has no blocks-page browser test or concurrent block/approval test. Hosted/manual cases remain Not executed, and Sprint 2 acceptance for both stories remains Not recorded. No code, Jira status or points changed.

**20 October 2026 — KAN-34 development outside a Daily Scrum.** Repaired KAN-34-AC101 on `fix/KAN-34-strict-draft-dates`: draft date-times must be ISO 8601 with an offset and a real calendar date, so impossible dates return a 400 validation error instead of HTTP 500. `AUTO-20261020-01`: `npm run check` and `npm run test:coverage` pass, with `draft-update-input.ts` at 100% lines, branches and functions. The integration case awaits CI; AC1–AC3 hosted checks (S3-T06), independent review and acceptance remain outstanding. KAN-34 stays at 3 SP with no velocity credit.

**20 October 2026 — KAN-6 development outside a Daily Scrum.** Repaired KAN-6-AC101 on `fix/KAN-6-detail-field-errors`: saved-draft submission from the detail page now lists the server's per-field errors instead of a generic uncertain-result message, keeping the draft and its actions. `AUTO-20261020-02`: `npm run check` and `npm run test:coverage` pass, and the new component suite failed before the repair. TC-02-03 manual comparison and other S3-T05 hosted checks, independent review and acceptance remain outstanding. KAN-6 stays at 3 SP with no velocity credit.

**21 October 2026 — attribution of Ryan's earlier commits outside a Daily Scrum.** Source: `git log --all --author=ryanc9029` on the repository and `gh pr list --author ryanc9029`, checked 21 October. The record lists 18 commits by `ryanc9029` between 12 September and 4 October, all contained in `main`; they changed 43 files, with the line totals inflated by `package-lock.json` churn from the Firebase-to-Supabase switch. Commits made under any other git identity are **Not recorded**. Jira assignee history, review outcomes and test runs for this work are **Not recorded** and are not inferred from authorship.

| Date | Work | Commits |
| --- | --- | --- |
| 12 September | Authentication on Firebase: environment keys, login/logout/`me` endpoints, migration `003_add_firebase_identities.sql`, session creation and login page, dependencies, auth README, database integration test | `cfbd94c`, `660d1c4`, `ec8ccab`, `988d06e`, `950e5fc`, `643f0ae`, `3550ce9` |
| 13 September | Authentication switched to Supabase (`supabase.ts`, `supabase-client.ts`); the Firebase environment-key and integration-test commits were reverted; Supabase keys and auth README added | `3d5bd49`, `0f05d54`, `4f5620d`, `90d8a5c`, `bc824ec` |
| 3 October | KAN-12 venue search: routes and router links, backend search and router (`venue-search.ts`, `venue-router.ts`), frontend `VenueSearchPage.vue` and API client | `f920791`, `7c1ca1e`, `16b59f0` |
| 4 October | KAN-12: stricter date-range search, module test-case list, design note `venue-search.md` and `venue-search.test.ts` | `fa26f8e`, `44224c3`, `a7e7bca` |

The KAN-12 commits were merged to `main` through [PR #26](https://github.com/MochaLxtte/ConnectSphere/pull/26) on 7 October. Two commit-hygiene gaps are retained as found and history is not rewritten: the authentication commits do not name a KAN id (`AGENTS.md` §7.1), and `venue-search.test.ts` was committed under the `docs(KAN-12)` commit `a7e7bca`. The 12–13 September commits fall in Sprint 1, the 3 October commits in Sprint 2 and the 4 October commits on the first day of Sprint 3 (see the [sprint table](../README.md)); the Sprint 1 and 2 records are not edited. No application test was run for this note and no story status or points change. This is not a member's Daily Scrum row.

**21 October 2026 — test documentation outside a Daily Scrum.** Standardised the existing case
register into reusable specifications and separate execution records following the Week 4 template.
Preserved all 427 IDs, original source content and dated evidence; 407 detailed-case records retain
30 automated passes, five audit failures and 372 Not executed placeholders. The 20 historical
feature summaries are excluded from execution counts. Added three missing journey mappings and
updated AGENTS.md, testing/submission guidance and the PR checklist. `AUTO-20261021-DOCS-01` / S3-E17
records 18/18 documentation checks and successful submission packaging. No application or hosted
tests were run and no acceptance status or sprint points changed. This is actual 21 October
documentation work while Sprint 3 remains administratively Active, not work backdated into its
configured 4–17 October window or a member's standup row.


**21 October 2026 — test reliability repair outside a Daily Scrum.** Fixed the KAN-79
conflict-test locator race using a held queue refresh; strengthened refresh-completion and
KAN-79/KAN-65 logout assertions. Reviewed the assigned KAN-8/16/29/36/65/79 tests plus earlier
KAN-52 work. AUTO-20261021-KAN79-01 retains the failing reproduction; runs 02–07 / S3-E18 record
30 focused browser repetitions, 396 full-browser executions, 1,639 unit/component tests,
341 isolated PostgreSQL tests, coverage and focused case evidence. Added nine regression
specifications with separate actual attempts and traceability; unperformed cases remain
Not executed. No application/schema, estimate, acceptance or Jira status changed. Hosted
checks and KAN-64 remain pending. This records actual 21 October work, not delivery within
the configured 4–17 October sprint window.

**21 October 2026 — KAN-52 zero-attendance repair (Ernest), outside a Daily Scrum.** Branch `fix/KAN-52-zero-attendance-suitability` repairs the audit failure TC-11-01 (KAN-52-AC101): an expected attendance of 0 is now assessed against venue capacity instead of being treated as unknown, while missing attendance stays distinguishable and other checks still decide the outcome. Automated layers passed (check, coverage, 342 PostgreSQL tests, 132 browser tests: AUTO-20261021-KAN52-01). Remaining: manual/hosted S3-T17 run, independent peer review, CI on the pushed branch and the Jira status/assignment, none of which this work changed. No estimate change (3 SP unchanged). This is not a member's standup row.

**21 October 2026 — KAN-6 saved-draft submission feedback (Ernest), outside a Daily Scrum.** Branch `fix/KAN-6-detail-submission-field-errors` repairs the audit failure TC-02-01 (KAN-6-AC101): the saved-draft detail page now shows the server's per-field errors, both missing and invalid, instead of a generic message, and keeps the draft. AC1–AC7 were already enforced and covered, so no backend change was needed. Automated layers passed (AUTO-20261021-KAN6-02). One unrelated KAN-79 browser test (`lead-assignment.spec.ts`, stale assignment conflict) fails intermittently in full runs, also on untouched `main`; it is recorded in the evidence and not changed here. Remaining: manual/hosted S3-T05 run, peer review, CI on the pushed branch and Jira status/assignment, none of which this work changed. No estimate change (3 SP unchanged). This is not a member's standup row.

**21 October 2026 — KAN-64 in-app notification inbox (Ernest), outside a Daily Scrum.** Branch `feat/KAN-64-notification-inbox` adds the inbox: migration 008 (venue-booking link and a unique recipient/outcome key), a notification module whose writes happen inside the existing request, clarification, review, assignment, reassignment and venue-decision transactions, four authenticated API routes, a `/notifications` page and a top-bar bell with an unread count. Access is checked on every read, so a coordinator who has been reassigned keeps only a minimal notice with no event details. Automated layers passed (AUTO-20261021-KAN64-03). KAN-80 triggers are untouched. Remaining: coordinate migration 008 with the team before shared Supabase, manual/hosted S3-T22 run, peer review, CI on the pushed branch and Jira status/assignment, none of which this work changed. KAN-64 is 5 SP in the planning record and its owner there is Irfan; assignment in Jira is Not recorded. This is not a member's standup row.

**21 October 2026 — KAN-77 development outside a Daily Scrum.** Implemented KAN-77-AC1–AC5 on `feat/KAN-77-venue-buffer-durations`: migration 008 adds setup and turnaround minutes (0–1440, default 0). Venue Staff edit them in the catalogue, stale buffer edits return `409 VENUE_BUFFER_CONFLICT`, and catalogue, search, suitability and calendar responses include both values. `AUTO-20261021-KAN77-02`: `npm run check` and coverage pass, and the changed backend services are at 100%. PostgreSQL and browser suites await CI. AC6 is deferred until KAN-78 exists. Migration 008 needs team agreement before it is applied to shared Supabase. KAN-77 stays In Progress at 2 SP.

**21 October 2026 — team branch integration outside a Daily Scrum.**
Combined latest main, PRs #37/#38/#40–45 and the local KAN-79 reliability/test-documentation
commits on `feat/sprint-3-integration`. The KAN-6 overlapping fixes retain both behaviours;
notification late-response guards now isolate account/view lifetimes. Notifications keep migration
008; venue buffers use unchanged SQL under 009 with a checked historical-name alias.
PR #45's later availability-contract test correction is also included.
`AUTO-20261021-INTEGRATION-01/05/06` pass 676 frontend, 1,165 backend, 380 PostgreSQL
and 147 browser tests (zero retries); [S3-E19](evidence/README.md) retains exact attempts,
failures, coverage and source heads. Ten supporting specifications and sixteen execution rows
were appended; manual placeholders and earlier failures remain. Current contracts and four
diagram exports were reconciled. PRs #37/#38 are included as drafts, not accepted work.
Next: push this branch for independent review; coordinate shared migrations 008/009 and
execute the hosted cases. Recipient matrix To agree; KAN-78/AC6 incomplete.
No hosted acceptance, Jira status change, sprint completion or velocity credit is recorded.

**21 October 2026 — KAN-81 phase 1 development outside a Daily Scrum.** Implemented outage recovery phase 1 on `feat/KAN-81-outage-recovery`, rebased on the sprint 3 integration (`4d36883`): outages over approved bookings are saved and the affected arrangements flagged (migration 010), removal clears only that outage's flags, and Venue Staff get a recovery list. `AUTO-20261021-08`: check and coverage pass; PostgreSQL and browser suites await CI. Phases 2 (notifications, coordinator view) and 3 (replacements) follow. Migration 010 needs team agreement before shared Supabase. KAN-81 stays In Progress at 8 SP.

**21 October 2026 — KAN-81 PR47 review remediation outside a Daily Scrum.** Codex under Arvin’s direction fixed stale 404/409 staff writes and added four regressions. `AUTO-20261021-KAN81-FIX-01`: 21 page tests; check/coverage 690 frontend + 1,205 backend pass. `AUTO-20261021-KAN81-CI-01` imports the verified original-head CI (398 database/148 browser tests) with scoped case executions; S3-E20 registers evidence, coverage and the visually checked planning ERD. Original full TC-09-01–12 and hosted acceptance remain Not executed/Not assessed. Jira corrected to In Progress, Kai Jie, 8 SP; phases/dependencies remain outstanding and no velocity is earned.

**21 October 2026 — KAN-83 development outside a Daily Scrum.** KAN-83 moved to In Progress with subtasks KAN-98/99/100. Implemented explicit Venue Staff holds with a database-checked deadline, a single occupancy rule shared by calendar, search, suitability, request creation, approval and blocks, hold approval/rejection/cancellation, idempotent expiry (`expire_venue_holds()`, `pg_cron` where enabled, plus an API scheduler) and stored coordinator notices; migration 008 is additive. Automated run `AUTO-20261021-KAN83-01` passed check, coverage, 382 integration tests (41 new) and 137 browser tests (5 new). Remaining: KAN-78 buffers in `occupancy.ts`, KAN-64 inbox display, applying migration 008 to shared Supabase after telling the team, manual hosted cases, independent review, PR CI and merge. This work is after the configured 17 October sprint end and is not counted as Sprint 3 delivery.

## Impediments

| Raised | Impediment | Owner | Action | Status |
| --- | --- | --- | --- | --- |
| 16 October 2026 | Existing historical acceptance/DoD provenance and starting evidence are incomplete | Collection owner To agree; actual sources needed from the team | Retain gaps; review current implementation against ACs, capture new evidence with its actual date, and keep historical acceptance distinct | Not recorded |
| 16 October 2026 | Shared contracts and migrations touch parallel workstreams | Integration lead To agree; selected story owners | Use the first integration checkpoint in planning; publish contracts before dependent implementation and avoid editing applied migrations | Not executed |

## Scope change log

| Date | Added / removed / re-estimated | SP delta | New total | Reason / who agreed |
| --- | --- | ---: | ---: | --- |
| Baseline | No story selection finalised at the reported 4 October planning | — | Not recorded | Confirmed planning record; do not turn the later initial proposal into a starting commitment |
| 16 October 2026 | Selected 15 existing future items, five full-point carry-over stories and three new change stories | +97 selected scope | 97 | The planning selection includes the five confirmed carry-over parents; detailed estimates/owners in planning and estimation |
| 16 October 2026 | KAN-15 estimate 2 → 5; included in the 97 above | +3 versus previous Jira estimate, already included | 97 | Reviewed change workflow and arrangement effects are larger than the original 2-SP read-only anchor; no second addition to scope |
| 16 October 2026 | Five carry-over stories retain original 19 rather than initial proposal's 6-SP repair allowance | +13 versus initial 84-SP proposal, already included | 97 | Full-point carry-over disposition; this changes the proposal accounting, not the original Jira story estimates |
| 16 October 2026, rebalance | Move KAN-9, KAN-10, KAN-14, KAN-15, KAN-17, KAN-18, KAN-26, KAN-61, KAN-62, KAN-63, KAN-66, KAN-67 (12 unstarted parents) to Sprint 4 | -47 | 50 | Dependency-coherent release rebalance; estimates and ACs preserved |
| 16 October 2026, rebalance | Split KAN-64 8 → KAN-64 5 plus KAN-80 3 in Sprint 4 | -3 | 47 | Preserve full original notification coverage; separate usable current triggers from later trigger integration |
| 16 October 2026, rebalance | Add KAN-81 / CR-2 outage recovery (8) and KAN-83 / CR-4 expiring holds (8) from earlier Sprint 4 forecast | +16 | 63 | Cohesive venue workflow completes this sprint; total remaining allocation remains 126 SP |
| 16 October 2026, self-selection | Earlier named owner/reviewer allocation withdrawn; members choose whole stories | 0 | 63 | Self-selection update; target roughly 10–11 SP each this sprint / 21 across both; independent reviewers and integration lead To agree |


## Burndown data

`remaining = scope total − Done SP`. Count a story only when it meets the Definition of Done; no partial points.

| Date | Scope total | Done SP (cumulative) | Remaining SP | Ideal remaining | Source / time |
| --- | ---: | ---: | ---: | ---: | --- |
| 16 October 2026 | 97 | 0 selected Sprint 3 points evidenced complete | 97 | Not assessed | Verified 16 October Jira snapshot: active Sprint 3 id 67, 23 parents all To Do. Actual observation, not a reconstructed 4 October baseline |
| 16 October 2026, after rebalance | 63 | 0 selected parent points evidenced complete | 63 | Not assessed | Current administrative snapshot: Sprint 3 id 67, 13 selected To Do parents; scope reduction is reallocation, not completed work |

At sprint close: export the Jira burndown chart, save it in `evidence/`, register it, and update `../release-burndown.md`.
