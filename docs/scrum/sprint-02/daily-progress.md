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

Next: coordinate schema/history reconciliation and migration 007 with Arvin, enable availability only for provisioned coordinators, review the implementation choices with the team/customer and execute the [manual checks](../../testing/kan29-manual-checks.md). Select a peer reviewer and record CI for the published branch. Venue services/UI/tests were removed from `main` on 26 September (`dff42ed`); earlier venue implementation observations are historical planning context, not current feature availability.

### 30 September repository scope correction

Asynchronous development update, not a Daily Scrum: audited mounted routes, Vue controls, services, seed behavior, tests and documentation against the Sprint 1/2 commitments. Removed later lifecycle actions, coordinator handover and notification writes. Kept initial manual assignment of unassigned requests, automatic assignment, clarification and read-only status history. Preserved all applied migrations, historical database objects and existing data. No shared Supabase change, live Jira transition, new Done points or burndown observation is recorded. Local validation passed: 602 unit/component tests, 141 PostgreSQL integration tests, 32 browser tests and type checks/builds; see [AUTO-20260930-SCOPE-01](../../testing/test-evidence.md#30-september-sprint-scope-correction).

The [scope audit](../../requirements/README.md#30-september-sprint-scope-audit) records boundaries; [test evidence](../../testing/test-evidence.md#30-september-sprint-scope-correction) records actual validation. Earlier dated test results remain historical. Next: peer review and hosted checks of the scoped build, then integrate the separate KAN-33 decided-request navigation work.

### 30 September Firebase migration retirement

Retired the unused Firebase setup file from the active migration sequence. Fresh databases use Supabase authentication without creating its legacy identity table; existing tables, data and migration records remain untouched. The runner retains checksum validation for an already-recorded Firebase 003. Renumbered active files to 001-006 without changing their SQL; historical filename aliases prevent rerunning existing changes. This resolves the pending-file collision found during read-only inspection of shared Supabase without modifying hosted history or claiming that KAN-29 migration 006 (formerly 007) has been applied. The 43-point baseline and acceptance records are unchanged. Local checks passed: 602 unit/component tests, 150 integration tests and type checks/builds ([AUTO-20260930-MIGRATION-01](../../testing/test-evidence.md#30-september-firebase-migration-retirement)). See the [retirement decision](../../requirements/assumptions-and-questions.md#30-september-2026---firebase-migration-retirement).

### 30 September migration and hosted schema consistency

Asynchronous follow-up, not a Daily Scrum: Tristan has applied migration 006 to shared Supabase. Read-only verification confirmed the required fields and constraint, and all six current migration checksums matched hosted history through the recognised filename aliases. The earlier scope-correction and Firebase-retirement entries retain their original execution boundaries. See [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) for the schema comparison and its limits.

Next: confirm availability only for provisioned coordinators, record team/customer acceptance of the availability policy, execute the hosted [manual checks](../../testing/kan29-manual-checks.md), and complete CI and peer review. Schema verification does not accept KAN-29, change the 43-point baseline or record Done points, a Jira transition or a new burndown observation.

### 29 September development update — Irfan (KAN-33 / KAN-56)

Asynchronous development update, not a Daily Scrum record. KAN-56 assigned to Irfan and moved to In Progress; KAN-33 moved from In Review back to In Progress while its carry-over repair is worked. S1-DEF-02 reproduced statically on `dff42ed`: the coordinator queue lists only pending statuses and `/reviews` offered no route back to a decided request. Repair implemented on `feat/KAN-33-decided-request-access` (coordinator `scope=history` list plus a Decided requests section; [decision record](../../requirements/assumptions-and-questions.md#29-september-2026--kan-56-coordinator-decided-request-history)). Automated checks passed locally (AUTO-20260929-01); hosted walkthrough MAN-20260929-01, CI integration/browser runs and peer review remain before Done. KAN-42/KAN-43 are to be closed with this PR's CI evidence and review. No story points are completed by this update.

## Impediments and adaptations

| Reference | Current planning position | Next inspection | Action owner / resolution |
| --- | --- | --- | --- |
| Scope baseline | 35 new + 8 retained carry-over points = 43; Tristan takes KAN-29 (3) in this plan. Other eight new owners, reviewers and capacity remain pending. The 21 September Jira snapshot retains Kai Jie on KAN-6/KAN-34 and Irfan on KAN-33. | Allocate total work, including repair, integration and review; align Jira after confirming allocation | To agree |
| S2-Q01/02 | KAN-29 availability field, active statuses, UUID ordering and no-eligible failure are implemented as dated branch choices; migration 006 is applied and its shared schema verified on 30 September. Team/customer acceptance and hosted manual checks remain pending. The scope correction removes handover; initial manual assignment remains. | Review documented definitions, confirm provisioned-coordinator availability and execute manual checks | Tristan implementation; Arvin schema coordination; reviewer to agree |
| S2-Q03 | Historical venue inspection found broader calendar access; those routes were removed 26 September. Technical Support Staff detail policy still needs clarification for the new implementation. | Implement the agreed UI/API role matrix and tests | To agree |
| S1-DEF-01–04 | Four carry-over paths require reproduction and regression evidence | Capture route, data, role and build; preserve successful Sprint 1 demo observations | To agree |
| S2-Q04–07, S2-Q10/11 | Venue interval/status, requirement matching, booking information, rejection reasons and block/catalogue lifecycle policies need refinement | Agree the remaining rules while retaining Jira's existing suitability checks | To agree |
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
