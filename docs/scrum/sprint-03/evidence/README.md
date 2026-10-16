# Sprint 3 evidence register

**Current selected scope is 13 parents / 63 SP; Sprint 4 has 15 parents / 63 SP.** S3-E05/E07 below retain the earlier 97-point snapshot and its actual validation. The later allocation is separately registered as S3-E08; a scope move is not product delivery.

The original `jira-sprint-state-2026-10-16.json` snapshot is preserved. The shared CSV/workbook links are refreshed working exports and now show the later allocation; use the separate snapshots to compare earlier and later states, rather than treating a refreshed workbook as an immutable historical capture.

Index of every captured artifact (screenshots, Jira exports, CI runs, transcripts). Store small files in this folder; link large ones. Never commit video files.

**15 October 2026 pre-planning inputs:** [current Jira export](../../../submission/1/jira-backlog-2026-10-15.csv), [AUTO-20261015-01](../../../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) and its [retained summary](../../../testing/coverage-reports/2026-10-15-post-sprint-audit.txt) support preparation only. The export and tests are not a Sprint 3 starting board or Sprint 1/2 close-day evidence. The reserved S3-E01–S3-E04 artifacts below remain missing; S3-E05 records the current administrative export separately.

| ID | What | Captured date | File or link | Used by |
| --- | --- | --- | --- | --- |
| S3-E01 | Jira board at sprint start | Not recorded | Not recorded; a later screenshot cannot establish 4 October board state | planning.md |
| S3-E02 | Jira board at sprint end | Not recorded | Not recorded | review.md |
| S3-E03 | Jira burndown chart at sprint end | Not recorded | Not recorded | daily-progress.md, release burndown |
| S3-E04 | Retrospective board or notes | Not recorded | Not recorded | retrospective.md |

## Required at sprint close

- [ ] Board at start and end
- [ ] Burndown chart
- [ ] Review notes
- [ ] Retrospective board
- [ ] Jira backlog export (for submission folder 1)


## Current administrative capture — 16 October 2026

Jira was read after the authorised edits. S3-E05 is a current export, not a sprint-start screenshot or a retrospective attendance/acceptance record.

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E05 | [Jira sprint-state snapshot](jira-sprint-state-2026-10-16.json), [Jira CSV](../../../submission/1/jira-backlog-2026-10-16.csv) and [master workbook](../../../submission/1/product-backlog.xlsx) | Live project KAN, all 63 issues: 37 parents / 26 subtasks; 145 parent SP. Sprint 3 id 67 Active with 23 To Do parents / 97 SP. Sprint 2 id 34 closed administratively 16 October 02:06 +08. | Current state only. No historical start/end board, acceptance or burndown is reconstructed. |
| S3-E06 | [Selected planning record](../planning.md) and [current story/test plans](../sprint-backlog.md) | Earlier planning allocation of owners/reviewers, estimates and policies; full Jira wording retained. | Not a six-person vote, actual implementation or executed acceptance test. |

Browser board capture was attempted on 16 October but reached the Atlassian sign-in page. Screenshot **Not recorded**; connector export verified independently. No credentials were entered. Capture a board screenshot after signing in and retain its actual capture date.

Twelve existing Done subtasks follow their reopened parents into Sprint 3. They retain evidence of earlier work, add no points and do not count as new Sprint 3 delivery. The 23 selected parent items remain To Do; their appended criteria specify the new completion/re-verification work.

## Documentation validation — 16 October 2026

**S3-E07.** The current Markdown register, Jira CSV and workbook reconcile to 37 parents / 145 SP and 23 Sprint 3 parents / 97 SP. Workbook data, formulas and retained structure passed 18/18 checks, with all seven sheets visually inspected. The 23 story cards map 248 stable criteria to 160 new planned functional cases; all new cases are Not executed. The earlier 26 test-case rows and 20 traceability rows are preserved. IDs, existing source/test paths, CSV structure and relative document links were checked; no errors were found. Git diff whitespace checks passed with the repository's normal Windows line-ending configuration.

This is document/export validation, not a product test run, a hosted demonstration or story acceptance. No application code or database changed, and no new AUTO/MAN product-run result is implied.

## Rebalanced allocation — 16 October 2026

This supersedes the earlier current-state allocation while preserving its record.

| ID | Artifact | Source / purpose | Limits |
| --- | --- | --- | --- |
| S3-E08 | [Rebalanced Jira snapshot](jira-rebalanced-state-2026-10-16.json), [current CSV](../../../submission/1/jira-backlog-2026-10-16.csv), [master workbook](../../../submission/1/product-backlog.xlsx) | Current administrative selection: Sprint 3 id 67 Active, 13 parents / 63 SP; Sprint 4 id 68 Future, 15 parents / 63 SP. Master inventory 42 parents / 174 SP plus 26 subtasks. | All selected parents To Do; no hosted test, story acceptance, start-board reconstruction or historical velocity is implied. |
| S3-E09 | [Change chronology](../../../requirements/change-requests.md) and [current planning](../planning.md) | Receipt on 2 October, confirmed on 16 October; backlog reconstruction, notification split and 63/63 allocation | User-reported receipt and current refinement provenance; not a six-member vote or evidence that the final allocation existed on 4 October. |

Re-run document/export validation after all changes are complete and record the actual results separately. S3-E07's earlier 18/18 workbook and criterion counts do not validate this later snapshot automatically. No application tests have been executed by this planning update.

## Final documentation/export validation — 16 October 2026

**S3-E10.** [Retained validation summary and artifact hashes](backlog-rebalance-validation-2026-10-16.json): workbook **23/23** checks, no formula errors, all seven sheets visually inspected and formula recalculation exercised; case/traceability consistency **14/14**, covering **28 active cards / 299 criteria**, **254 case rows** and **76 traceability rows**. All 68 new specifications remain Not executed. The current repo link/CSV validator and whitespace checks passed. See `AUTO-20261016-DOCS-01` in [test evidence](../../../testing/test-evidence.md). No product tests or hosted acceptance were performed by this documentation update.

## Self-selection follow-up — 16 October 2026

Current story ownership is unassigned for team selection; reviewers and integration lead are To agree. Earlier captured Jira JSON/validation artifacts retain the assignments observed when captured. Their owner fields are historical evidence, not the current allocation. The 63/63 scope and existing test results are unchanged. See [planning](../planning.md) for the selection rule and [record preparation](../../README.md#record-preparation) for the preparation method.

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E11 | [Current ownership snapshot](jira-ownership-state-2026-10-16.json) | Live Jira read on 16 October: all 28 unfinished parent stories are unassigned; Sprint 3 remains 13 parents / 63 SP and Sprint 4 remains 15 parents / 63 SP. Historical Done subtasks KAN-57/KAN-58 also have unassigned metadata. | Assignee metadata changed; story/subtask states, estimates and acceptance did not. Earlier rebalanced snapshot remains preserved. |
| S3-E12 | [Handover validation](handover-validation-2026-10-16.json) | Course-format Jira/export/card/case checks 17/17; 28 active cards, 299 criteria, 256 cases and 76 traceability rows. Workbook source refresh, saved readback, formulas, preserved formatting and changed views passed. Final link/whitespace results are in the artifact. | Documentation handover only; no new product test or hosted acceptance. |

## Submitted backlog reconciliation — 17 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E13 | [Reconciliation validation and artifact hashes](submission-reconciliation-validation-2026-10-17.json) | Current Jira fields unchanged from the retained 16 October CSV; documentation checks 21/21 and native workbook preservation checks 12/12. Dated Sprint 1/2 mappings cover 84 and 107 source/supplement entries. Current registers contain 398 cases, 95 traceability rows and 301 active criteria. | The 142 added specifications remain Not executed. This is documentation/export verification, not application tests, historical acceptance or a reconstructed sprint-close artifact. |

See [AUTO-20261017-DOCS-01](../../../testing/test-evidence.md#17-october-2026--historical-criteria-and-submitted-backlog-reconciliation) for the verification scope. The workbook labels repository supplements separately from retained Jira wording, and the [change register](../../../requirements/change-requests.md) explains intentional differences between original and revised requirements.
