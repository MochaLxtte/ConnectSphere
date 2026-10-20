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

## KAN-79 implementation verification — 19 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E14 | [AUTO-20261019-01](../../../testing/test-evidence.md#19-october-2026--kan-79-lead-allocation), [coverage summary](../../../testing/coverage-reports/2026-10-19-kan79.txt), [design exports](../../../architecture/exports/) and [master workbook](../../../submission/1/product-backlog.xlsx) | Local checks: 564 frontend, 937 backend, 304 isolated PostgreSQL and 119 browser tests pass. Code/test commit `b3329a78174c0f2e30e263b64436dfbd64c5f44b`. Seven Mermaid exports regenerated; workbook targeted KAN-79 ownership/status/evidence update. | No shared Supabase migration, hosted/manual acceptance, remote CI or independent peer approval. KAN-65/KAN-64 remain pending. Actual 19 October work does not establish delivery by 17 October. |

Workbook source: KAN-79 and KAN-85/86/87 live Jira fields from 19 October, with other issues retained from the labelled 16 October full export. Historical source/acceptance/estimate rows are preserved. [Native workbook and document validation](kan79-validation-2026-10-19.json) passed: 14/14 workbook checks and 12/12 documentation checks (410 cases, 101 traceability rows, 672 local file links at validation). Seven diagrams and six changed workbook regions were visually inspected; Excel desktop was Not executed. `npm run submission:prepare` also passed, generating draft folders 1–7; evidence completeness and instructor access still require team review. No missing historical records are filled by these technical checks.

## KAN-65 reassignment verification — 19 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E15 | [AUTO-20261019-02](../../../testing/test-evidence.md#19-october-2026--kan-65-coordinator-reassignment), [coverage](../../../testing/coverage-reports/2026-10-19-kan65.txt), [validation](kan65-validation-2026-10-19.json), [design exports](../../../architecture/exports/) and [master workbook](../../../submission/1/product-backlog.xlsx) | Local checks pass: 604 frontend, 1,035 backend, 341 isolated database and 132 browser tests. KAN-65 and KAN-88/89/90 In Progress; 3 SP unchanged. KAN-79 reassignment integration verified locally. | KAN-64 notifications and manual/hosted workflow checks Not executed; acceptance Not assessed. User-reported migration 007 application and Lead login are setup confirmation only. No peer approval, pushed-build CI, merge or historical velocity credit. |

The workbook retains its labelled 16 October full-project source and prior 19 October KAN-79 update. This targeted update adds KAN-65 ownership/status/branch evidence and three unestimated subtasks; other source fields, specifications, historical acceptance and estimates remain preserved. Four changed diagram exports and six changed workbook regions were visually inspected. Native workbook validation passed 16/16 checks. Final case/traceability/link checks and artifact hashes are retained in the linked validation file. Excel desktop and manual/hosted testing are Not executed.

KAN-65 code/test commit: `d8f3bc2aee19a608b1a3f57c87e7d5cc7d242d84`. Documentation checks passed 15/15, covering 427 cases, 112 traceability rows and 579 file links. The isolated test container was removed after the passing runs; no shared Supabase cleanup occurred.

## PR #34 CI and merge — 20 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E16 | [GitHub Actions CI run 39159683818](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39159683818) and [PR #34](https://github.com/MochaLxtte/ConnectSphere/pull/34) | CI `verify` passed on 19 October 03:38 Singapore time for head `36d410d5aa67e6bc42669d68ea94627bd0080ce3`, the commit merged. PR approved by Irfan and merged into `main` as `3ddba2b` on 20 October 23:01 Singapore time. | Approval relied on CI and merge state; template, AC and Definition of Done review Not executed. Manual/hosted acceptance and KAN-64 notifications Not executed; acceptance Not assessed. No velocity credit. |

## Test documentation standardisation — 21 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E17 | [Validation results and CSV hashes](test-documentation-validation-2026-10-21.json), [AUTO-20261021-DOCS-01](../../../testing/test-evidence.md#21-october-2026--test-documentation-standardisation), [original register](../../../testing/archive/test-cases-2026-10-21.csv) | 18/18 documentation checks; all 427 IDs retained and linked through 115 traceability rows. Separate execution records preserve 30 automated passes, five detailed audit failures and 372 Not executed placeholders; 20 feature summaries excluded from run counts. Submission packaging/readback passed. | Documentation working tree based on `aaee549`; no new application or manual runs, no invented metadata or acceptance. Original failure/retest narratives remain historical. |

## KAN-79 test reliability and owned-story audit — 21 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E18 | [Run attempts, hashes and audit scope](kan79-reliability-2026-10-21.json), [AUTO-20261021-KAN79-01–07](../../../testing/test-evidence.md#21-october-2026--kan-79-test-reliability-and-owned-story-audit), [coverage](../../../testing/coverage-reports/2026-10-21-kan79-reliability.txt) | Preserved failing locator reproduction; fixed tests pass 30 focused repetitions and 396 full-browser executions. Check/coverage: 604 frontend + 1,035 backend; PostgreSQL: 341. Focused exact-title reports: 142 frontend + 55 backend. Nine new mapped specifications; original registers retained. | Fixture browser checks and isolated PostgreSQL are separate from hosted acceptance. No application/schema changes, Jira Done, velocity credit or guarantee of zero future flakes. KAN-64 and manual/hosted checks remain Not executed. |
