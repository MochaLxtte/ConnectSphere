# Sprint 2 evidence register

Sprint 2 covers **20 September–3 October 2026**, Asia/Singapore, with a confirmed starting scope of **43 points: 35 new + 8 carried**. This register identifies what exists and what still needs capture. Documentation drafts, implementation references and scheduled meetings are not executed acceptance evidence.

## Artifact register

| ID | Artifact / purpose | Location | Current evidence position |
| --- | --- | --- | --- |
| S2-E01 | Planning goal, selected scope, meeting decisions and dependencies | [Planning](../planning.md) | Planning held 20 September; written record prepared 21 September. Scrum Master Arvin and Product Owner Irfan recorded; original meeting notes, attendance and exact times not attached. |
| S2-E02 | Jira start backlog and board, including retained carry-over estimates | [Backlog](../sprint-backlog.md); [21 September snapshot](../../../submission/1/jira-backlog-2026-09-21.csv) | Historical snapshot: 12 PBIs / 43 points, carry-over assignees retained, nine new stories unassigned. Exported 21 September at 03:59 +08:00 after refinement; this does not replace the original start-board capture, which remains missing. Tristan's later KAN-29 repository allocation is not a live Jira update or recheck. |
| S2-E03 | Estimation discussion, method, participants and capacity | [Estimation and capacity](../estimation-and-capacity.md) | Estimates recorded; comparative rationale proposed, hours/allocation and meeting discussion not recorded |
| S2-E04 | Detailed criteria, task refinement and owner/reviewer agreement | [Backlog and acceptance test plan](../sprint-backlog.md) | 93 planning criteria retain stable KAN-prefixed IDs. The pre-edit export had 77; six shorter cards now include missing checks and customer-rule refinements. Tristan takes KAN-29 in the repository plan on 28 September; other eight new owners and all reviewers remain pending. Implemented automatic-allocation details await team/customer acceptance; handover is deferred to future KAN-65 and removed from the application by the 30 September correction. |
| S2-E05 | Sprint 1 closure and carry-over observations | [Sprint 1 review](../../sprint-01/review.md#review-defects-and-carry-over) | Four defect references now map to KAN-56–KAN-59 under the three carried stories; Sprint 2 reproduction/retest records pending |
| S2-E06 | Implementation starting points and requirement gaps | [Planning implementation boundaries](../planning.md#existing-implementation-and-integration-boundaries), story-level code/test links | Venue inspection references are historical: services/UI/tests removed from main on 26 September, migration tables retained. KAN-29 is now implemented on a branch; no hosted or story acceptance claimed. |
| S2-E07 | Tuesday/Thursday/Saturday Daily Scrum notes | [Daily progress](../daily-progress.md) | Six dates scheduled; actual attendance, notes and follow-up records not supplied |
| S2-E08 | Actual burndown source data and chart | [Daily progress](../daily-progress.md#burndown-data), Jira export to attach | Baseline 43; 21 September live inspection recorded 0 Done / 43 remaining. Exact time and portable capture were not retained; further observations and chart still needed |
| S2-E09 | Dated changes to scope, estimates, policy, capacity and architecture | [Scope change log](../daily-progress.md#scope-change-log), [clarification log](../../../requirements/assumptions-and-questions.md) | Record actual decisions and participants as they occur |
| S2-E10 | Reviewed commits, PRs and CI for the increment | Verified Git/PR/CI links to attach | Team branches merged into `main` by Tristan at the sprint transition; Sprint 2 story-specific review/CI acceptance links pending |
| S2-E11 | Criterion-linked executed test cases and exact environments | [Acceptance plan](../sprint-backlog.md#acceptance-test-plan), [test evidence](../../../testing/test-evidence.md) | S2-T01/T02 have local automated coverage in AUTO-20260928-01 and the corrected scope in AUTO-20260930-SCOPE-01; hosted portions and policy acceptance pending. S2-T23 and other planned cases remain unexecuted in this record. |
| S2-E12 | Final board, accepted/unfinished stories and velocity | [Review](../review.md) | Future closure record; no Sprint 2 accepted-point total yet |
| S2-E13 | Review demonstration and stakeholder feedback | [Review](../review.md) | Scheduled 3 October; Not executed |
| S2-E14 | Retrospective observations and owned actions | [Retrospective](../retrospective.md) | Template prepared; actual meeting/outcomes not recorded |
| S2-E15 | Updated architecture/API/ERD for accepted behavior | [Architecture](../../../architecture/README.md) | Verify against reviewed implementation, especially assignment and venue relationships |
| S2-E16 | Owner explanations and implementation/test reasoning | Dated review notes/PR discussions to attach | Not recorded |
| S2-E17 | Live Jira refinement and new issue map, 21 September | [Consolidated backlog](../../../requirements/product-backlog.md); [portable export and metadata](../../../submission/1/README.md) | Saved changes and four reversible archives verified in Jira. Portable snapshot retains 51 records at 03:59 +08:00, including complete descriptions/criteria. New future scope and archive register do not change the 43-point sprint baseline. |
| S2-E18 | KAN-29 local implementation, allocation and automated checks, 28 September | [AUTO-20260928-01](../../../testing/test-evidence.md#28-september-kan-29-automatic-assignment); [asynchronous progress](../daily-progress.md#28-september-kan-29-implementation); [manual checks](../../../testing/kan29-manual-checks.md) | Targeted local PostgreSQL tests: 29 automatic assignment + 12 submission + 10 existing manual assignment = 51 passed. Scope and 93 planning IDs unchanged. Shared migration, real-account manual checks, policy acceptance, CI and peer review remain pending; no live Jira state/assignee change or new burndown checkpoint claimed. |
| S2-E19 | Sprint 1/2 application scope correction, 30 September | [Scope audit](../../../requirements/README.md#30-september-sprint-scope-audit); [AUTO-20260930-SCOPE-01](../../../testing/test-evidence.md#30-september-sprint-scope-correction) | Removed later lifecycle actions, coordinator replacement and notification writes; preserved all migrations and historical data. Passed 602 unit/component, 141 integration and 32 browser tests plus type checks/builds. No hosted acceptance, CI, live Jira or new Done-point claim. |

## Capture rules

1. Use actual event/observation and capture/export timestamps separately, with the timezone. Later reconstruction must identify its source and gaps.
2. Name artifacts using the actual capture time, for example `YYYY-MM-DD-HHMM+0800_start-board.png`; no placeholder artifact is an attached result.
3. Preserve Jira scope/filter, story IDs, participant/contributor names where recorded, and the tested commit/build and environment.
4. Keep scheduled meetings separate from actual attendance. The 3 October Daily Scrum and review are separate events.
5. Preserve the 43-point baseline. Carry-over is already included; log genuine later scope changes and reconcile them with the final board and velocity.
6. Label fixture/component checks, isolated PostgreSQL runs, hosted authentication checks, CI and manual review observations by their actual coverage.
7. Retain specific failure/reproduction/retest evidence alongside successful paths. A successful broad demo does not replace an unverified edge-path check.
8. Link external artifacts with stable accessible URLs; use relative repository links. Keep secrets, personal production data, database dumps and video files out of Git.

## Artifact metadata

```text
Evidence ID and title:
Event/observation date and time (timezone):
Capture/export date and time (timezone):
Captured by / meeting participants, when applicable:
Source tool and sprint/filter:
Jira story / acceptance criterion / test case:
Git commit/build and environment:
Synthetic fixture and role / reproduction steps:
Expected outcome / actual outcome / status:
Original artifact location and readable extract:
Limitations and remaining checks:
Access verified by / date / audience:
```

## Closure and submission

At closure, check that story acceptance, executed tests, board state, scope changes and velocity agree. Record missing evidence explicitly and carry unfinished work into the next planning record. Include these records and retained evidence in submission **folder 4 (Scrum evidence)**; use the shared [submission checklist](../../../submission/checklist.md). Final-sprint recording requirements remain in the [recordings guidance](../../final-sprint-recordings.md); no recording is claimed here.
