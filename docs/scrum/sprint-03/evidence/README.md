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

## 21 October — KAN-78 / KAN-34 local verification

S3-E-KAN78-01: [AUTO-20261021-KAN78-01](../../../testing/test-evidence.md#21-october-2026--kan-78-buffered-venue-intervals-and-kan-34-draft-dates). Reproducible test files are linked from the story cards and traceability register. Architecture exports are under `docs/architecture/exports/`. Results are local automated evidence; no CI, independent review or hosted acceptance is claimed. Final implementation SHA: Not recorded (uncommitted working tree).

Retained final command output: [check](AUTO-20261021-KAN78-01-check.txt), [coverage](AUTO-20261021-KAN78-01-coverage.txt), [PostgreSQL integration](AUTO-20261021-KAN78-01-integration.txt), [Chromium](AUTO-20261021-KAN78-01-browser.txt). Earlier failed attempts are described in the run record; these files hold the final passing runs.

AUTO-20261021-KAN78-02: [backend coverage output](AUTO-20261021-KAN78-02-coverage.txt) records the pre-commit timestamp precision regression fix: 1,050 backend tests passed; type checking passed.

## Test documentation standardisation — 21 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E17 | [Validation results and CSV hashes](test-documentation-validation-2026-10-21.json), [AUTO-20261021-DOCS-01](../../../testing/test-evidence.md#21-october-2026--test-documentation-standardisation), [original register](../../../testing/archive/test-cases-2026-10-21.csv) | 18/18 documentation checks; all 427 IDs retained and linked through 115 traceability rows. Separate execution records preserve 30 automated passes, five detailed audit failures and 372 Not executed placeholders; 20 feature summaries excluded from run counts. Submission packaging/readback passed. | Documentation working tree based on `aaee549`; no new application or manual runs, no invented metadata or acceptance. Original failure/retest narratives remain historical. |

## KAN-79 test reliability and owned-story audit — 21 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E18 | [Run attempts, hashes and audit scope](kan79-reliability-2026-10-21.json), [AUTO-20261021-KAN79-01–07](../../../testing/test-evidence.md#21-october-2026--kan-79-test-reliability-and-owned-story-audit), [coverage](../../../testing/coverage-reports/2026-10-21-kan79-reliability.txt) | Preserved failing locator reproduction; fixed tests pass 30 focused repetitions and 396 full-browser executions. Check/coverage: 604 frontend + 1,035 backend; PostgreSQL: 341. Focused exact-title reports: 142 frontend + 55 backend. Nine new mapped specifications; original registers retained. | Fixture browser checks and isolated PostgreSQL are separate from hosted acceptance. No application/schema changes, Jira Done, velocity credit or guarantee of zero future flakes. KAN-64 and manual/hosted checks remain Not executed. |

## Combined team branch — 21 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E19 | [Integration source heads, exact test results and hashes](team-integration-2026-10-21.json), [run narratives](../../../testing/test-evidence.md#21-october-2026--combined-team-branch-verification), [coverage](../../../testing/coverage-reports/2026-10-21-team-integration.txt) | Main plus PRs #37/#38/#40–45 and local `599fee6`. Check/coverage: 676 frontend + 1,165 backend; final PostgreSQL: 380; browser: 147, zero retries. Includes failed notification reproduction, final 39-case focused run, failed/full database retest, exact case mappings, migration alias and refreshed diagram hashes. | Application/check build `4835a26`, final database/component build `70e6e41`; history-only PR45 follow-up merge `967938d`. Earlier notification run HEAD not separately recorded. Isolated/fixture evidence only; complete manual cases Not executed, acceptance Not assessed. KAN-64 recipient matrix To agree; KAN-78/KAN-77 AC6 incomplete. No shared migration or push. |

**S3-E19 follow-up:** PR #45 head `6d5af10` adds verified [CI run39467271524](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39467271524) on its separate source candidate (358 database,133 browser tests). `AUTO-20261021-KAN77-CI-01` and the JSON retain actual checkout/build and case-scope qualifications. TC-08-17 receives one appended CI Pass; full TC-08-16 and hosted cases remain Not executed. PR #38 was subsequently closed unmerged; its reconciled changes remain in this branch.


## KAN-81 phase-1 review remediation — 21 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E20 | [CI/local metadata and diagram hashes](kan81-review-2026-10-21.json), [run narratives](../../../testing/test-evidence.md#21-october-2026--kan-81-pr47-review-fixes-and-ci-follow-up), [coverage](../../../testing/coverage-reports/2026-10-21-kan81-review.txt), [planning ERD](../../../architecture/exports/erd-planning.png), [original CI](https://github.com/MochaLxtte/ConnectSphere/actions/runs/39477344094) | Original CI: 398 PostgreSQL and 148 browser tests; TC-09-13–16 scoped Pass. Retained failing stale-removal reproduction; corrected TC-09-17: 21 page tests, check/coverage 690 frontend + 1,205 backend. ERD rendered from current source and visually checked. | Original CI checkout `25c94c5501cd66bf62dcc88efd331f8d01f90e8d`; local application/test build `18ac27d4e26580ef5f8aca519e5cd8ecbc2d1d51`. Browser APIs are mocked; isolated PostgreSQL and unit/component evidence do not establish hosted acceptance or the unfinished full TC-09-01–12. No shared migration, story Done or velocity credit. |

## 21 October — reconciled KAN-78 / KAN-34 verification

AUTO-20261021-90: [check](AUTO-20261021-90-check.txt), [PostgreSQL integration](AUTO-20261021-90-integration.txt), [Chromium](AUTO-20261021-90-browser.txt), [frontend coverage](AUTO-20261021-90-frontend-coverage.txt), [backend coverage](AUTO-20261021-90-backend-coverage.txt). These supersede the earlier branch-only results for the current merged tree. Hosted acceptance remains Not executed.

## Arvin delivery reconciliation — 25 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S3-E21 | [Source metadata and validation](arvin-reconciliation-2026-10-25.json), [retained CI excerpt](AUTO-20261025-ARVIN-01-ci.txt), [run narrative](../../../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation), [coverage](../../../testing/coverage-reports/2026-10-25-kan78-kan34-ci.txt), [PR #48](https://github.com/MochaLxtte/ConnectSphere/pull/48) / [integration #54](https://github.com/MochaLxtte/ConnectSphere/pull/54) | `AUTO-20261025-ARVIN-01` imports successful current-main CI at `96a0d10`: 770 frontend / 1,354 backend, 482 PostgreSQL, 156 browser; owned interval 11/11 and draft persistence 19/19. Nine existing permanent cases receive supported automated readback rows. Leo requested changes; Irfan approved integration. Current class/planning ERD/sequence exports refreshed. | Not a new local or hosted run, full manual group, fresh Jira export, Leo re-review, held review or sprint-close report. Acceptance Not assessed; no estimates, points, dates or velocity changed. Earlier failing integration and original branch runs retained. |

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

**Supporting contributions, separate from owned KAN-34 (3 SP) and KAN-78 (8 SP):**

- **12 October preparation:** Arvin’s consultation action list, C4 preparation record and submission runbook are retained as TXT source snapshots in this sprint’s evidence folder. They prepared Sprint 2 closure, Sprint 3 planning, capacity inputs, C4 exports and packaging; they do not establish that meetings occurred, votes were cast, artifacts were independently reviewed or instructor access was delivered. The original worktree remains untouched. Current committed design supersedes those historical C4 snapshots.
- **21 October 02:26:27 Singapore time — shared migrations 008/009:** Arvin authorized the reviewed rollout; Codex executed it from `cf65c05e5d7b91675d74f7281439d0e9c2b1a766`. The retained JSON records both ledger checksums, four columns, two indexes and zero venues with nonzero initial buffers. This is deployment verification, not KAN-64/KAN-77 authorship, hosted functional acceptance or a new team-wide decision. No fixture, booking or cleanup writes were part of that run.
- **21 October — KAN-81 PR #47 review and corrections:** Arvin requested changes, implemented stale 404/409 refresh corrections in `18ac27d`/`30da68a`, updated tests/evidence and then approved the phase-one work while disclosing his own fixes. His follow-up approval is not a second independent review of his corrections. Kai Jie remains KAN-81’s owner at 8 SP. Existing **S3-E20**, the KAN-81 review JSON and 21 October test narrative retain the scope and CI results.

Owned KAN-34/KAN-78 merge, CI and acceptance limits remain in the preceding 25 October reconciliation. Supporting work adds no story points and does not convert other members’ stories to Done.

### Retained Arvin contribution sources

| Artifact | Provenance / limitation |
| --- | --- |
| [GitHub contribution metadata](arvin-contributions-github-2026-10-25.json) | PR authors, commits, merges and submitted reviews read back on 25 October |
| [All-sprint reconciliation and validation](arvin-all-sprints-reconciliation-2026-10-25.json) | Four owned stories, supporting contributions, source hashes and documentation checks |
| [Shared migration 008/009 readback](shared-migrations-008-009-20261021.json) | Exact retained rollout JSON from the migration worktree; deployment checks only |
| [12 October consultation preparation](arvin-consultation-preparation-20261012.txt) | Original uncommitted source snapshot; preparation rather than ceremony outcomes |
| [12 October C4 preparation](arvin-c4-preparation-20261012.txt) | Historical source snapshot; independent review and delivery not recorded |
| [12 October submission preparation](arvin-submission-preparation-20261012.txt) | Historical runbook snapshot; not final submission approval |
