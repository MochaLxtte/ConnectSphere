# Sprint 4 evidence register

**16 October 2026 update.** Final development sprint, planned 18–31 October. Jira id 68 is Future, not started; current selection is 15 parent items / 63 SP. No meeting or product acceptance is recorded by this preparation.

| ID | What | Captured date | File or link | Purpose / limits |
| --- | --- | --- | --- | --- |
| S4-E01 | Actual Jira board at sprint start | Not recorded | Not recorded | Capture the actual 18 October starting scope; do not substitute the earlier allocation snapshot |
| S4-E02 | Jira board at sprint end | Not recorded | Not recorded | Actual closing state and whole-story outcomes |
| S4-E03 | Sprint burndown at close | Not recorded | Not recorded | Observed scope/delivery changes, not an invented ideal curve |
| S4-E04 | Retrospective notes / board | Not recorded | Not recorded | Actual member feedback and agreed actions |
| S4-E05 | Pre-start administrative selection | 16 October 2026 | [Rebalanced Jira snapshot](../../sprint-03/evidence/jira-rebalanced-state-2026-10-16.json), [current CSV](../../../submission/1/jira-backlog-2026-10-16.csv), [master workbook](../../../submission/1/product-backlog.xlsx) | Current Future sprint with 15 To Do parents / 63 SP; not a starting board, meeting or acceptance result |
| S4-E06 | Customer-change and planning record | 16 October 2026 | [Change register](../../../requirements/change-requests.md), [planning](../planning.md), [story/test plan](../sprint-backlog.md) | Preserves 2 October user-reported receipt, recorded 16 October, and the 63/63 split; tests Not executed |

## Final-sprint recordings

The [recording register](../../final-sprint-recordings.md) must contain live recordings of planning, review, retrospective and one Daily Scrum, with actual dates, participants and accessible links. Never commit video files or fabricate retrospective recordings.

## Required at sprint close

- [ ] Actual start and end boards
- [ ] Observed burndown data and export
- [ ] Reviewed build, demonstration and acceptance record
- [ ] Retrospective feedback and actions
- [ ] Planning, review, retrospective and one Daily Scrum recording
- [ ] Current Jira export and master backlog workbook
- [ ] Coverage summary and relevant automated/hosted test evidence
- [ ] Final release traceability, diagrams and submission links

Current planning data is separate from product verification. Record actual document/export validation after the complete update; no validation result or test pass is pre-filled here.

## Planning artifact validation — 16 October 2026

**S4-E07.** [Shared validation summary](../../sprint-03/evidence/backlog-rebalance-validation-2026-10-16.json) covers the 63/63 plans, 23/23 workbook checks and 14/14 criterion/case/traceability checks. Sprint 4's 15 parents and 63 points match current Jira; future acceptance fields remain unfilled. This validates planning artifacts only and supplies no sprint meeting, product test or acceptance result.

## Self-selection follow-up — 16 October 2026

Current story ownership is unassigned for team selection; reviewers and integration lead are To agree. Earlier captured Jira JSON/validation artifacts retain the assignments observed when captured. Their owner fields are historical evidence, not the current allocation. The 63/63 scope and existing test results are unchanged. See [planning](../planning.md) for the selection rule and [record preparation](../../README.md#record-preparation) for the preparation method.

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E08 | [Current ownership snapshot](../../sprint-03/evidence/jira-ownership-state-2026-10-16.json) | Live Jira read on 16 October: all 28 unfinished parents are unassigned; Sprint 4 remains Future with 15 parents / 63 SP. Historical Done subtasks KAN-57/KAN-58 also have unassigned metadata. | Assignment metadata only; no sprint start, implementation, acceptance or estimate change. Earlier named allocation is history. |
| S4-E09 | [Handover validation](../../sprint-03/evidence/handover-validation-2026-10-16.json) | Course-format Jira/export/card/case checks 17/17; 28 active cards, 299 criteria, 256 cases and 76 traceability rows. Workbook source refresh, saved readback, formulas, preserved formatting and changed views passed. Final link/whitespace results are in the artifact. | Planning artifacts only; future product tests and acceptance remain unexecuted/unassessed. |

## KAN-9 implementation verification — 26 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E10 | [Run summary and source hashes](kan9-20261026/summary.json), [check](kan9-20261026/check.txt), [coverage](kan9-20261026/coverage.txt), [PostgreSQL](kan9-20261026/integration.txt), [initial browser failures](kan9-20261026/browser-initial.txt), [browser retest](kan9-20261026/browser-retest.txt) | AUTO-20261026-KAN9-01: frontend 881/backend 1,451; full PostgreSQL 528 plus focused 18 after a test-only addition; final browser 168 Pass. See [run narrative](../../../testing/test-evidence.md#26-october-2026--kan-9-equipment-availability). | Full source captured in 5c0dc98; supplemental test hash retained. Real isolated SQL, substituted authentication and browser APIs. Shared migration/manual acceptance Not executed. Earlier failed attempts are preserved. |
| S4-E11 | [Desktop shortfall](kan9-20261026/equipment-shortfall-desktop.png), [mobile what-if form](kan9-20261026/equipment-what-if-mobile.png) | Automated Chromium captures, visually inspected for readable layout. | Synthetic fixtures/API responses; not shared Supabase or manual acceptance evidence. |

KAN-9 is In Progress / Tristan (8 SP), with KAN-101/102/103 subtasks; KAN-26 is To Do / Tristan (3 SP). These are targeted development updates to the earlier ownership snapshot. No sprint-start ceremony, Done points or review acceptance is recorded.

The [document validation](kan9-20261026/document-validation.json) checks stable CSV IDs, all 12 criterion mappings, existing test paths, preservation of earlier executions and added file links. Workbook formulas/native structures and diagram rendering were checked separately. These checks validate records, not integrated product acceptance.

## KAN-26 implementation verification — 26 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E12 | [Summary/source hashes](kan26-20261026/summary.json), [check](kan26-20261026/check.txt), [coverage](kan26-20261026/coverage.txt), [migration](kan26-20261026/migrate-local.txt), [first full database run](kan26-20261026/integration-first.txt), [final database run](kan26-20261026/integration.txt), [browser](kan26-20261026/browser.txt), [workbook validation](kan26-20261026/workbook-validation.json), [document validation](kan26-20261026/document-validation.json) | AUTO-20261026-KAN26-01:945 frontend / 1,518 backend; 555 isolated PostgreSQL; 179 browser tests Pass. New reservation backend 100% coverage. | Authentication/browser boundaries, earlier browser environment limitation and dependencies are detailed in the [run narrative](../../../testing/test-evidence.md#26-october-2026--kan-26-equipment-reservations). Shared migration 015/manual acceptance Not executed. |
| S4-E13 | [Desktop readiness](kan26-20261026/equipment-reservations-ready-desktop.png), [mobile cancellation](kan26-20261026/equipment-cancellation-confirmation-mobile-detail.png), [history](kan26-20261026/equipment-reservation-history.png), [mobile empty state](kan26-20261026/equipment-reservation-empty-mobile.png) | Playwright fixture captures visually inspected for readable controls and retained outcomes. | Synthetic authenticated API responses; not shared Supabase or manual acceptance. |

KAN-26 is In Progress / Tristan (3 SP), with unestimated KAN-104–106 In Progress. KAN-9 local commits are included; migration 014 and account setup are reported ready. Migration 015 shared application, dependent KAN-18/63/62/10 UI acceptance, independent review and merge remain pending. Scope and Done points are unchanged.

## KAN-66 automated verification — 26 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E14 | [KAN-66 coverage and run summary](../../../testing/coverage-reports/2026-10-26-kan66.txt) | `AUTO-20261026-KAN66-01` unit/component Pass with coverage; `AUTO-20261026-KAN66-02` browser fixtures, KAN-66 tests Pass, 156/161 overall with five environment/timing failures and a passing rerun of the timed-out spec | Uncommitted working tree on base `c849ebf`; PostgreSQL integration Not executed; no live authentication or acceptance |

## KAN-15 automated verification — 27 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E15 | [KAN-15 coverage and run summary](../../../testing/coverage-reports/2026-10-27-kan15.txt) | `AUTO-20261027-KAN15-01`: unit/component Pass with coverage; browser fixtures 164/164 including 3 KAN-15 tests | Local Windows run on Node 22; PostgreSQL integration Not executed locally (CI); no live authentication or acceptance |

## PR #63 review repair — 28 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E16 | [Summary/source hashes](pr63-20261028/summary.json), [check](pr63-20261028/check.txt), [coverage](pr63-20261028/coverage.txt), [database](pr63-20261028/integration.txt), [browser](pr63-20261028/browser.txt), [initial browser](pr63-20261028/browser-initial.txt), [workbook validation](pr63-20261028/workbook-validation.json), [document validation](pr63-20261028/document-validation.json) | AUTO-20261028-PR63-01: 1,034 frontend / 1,691 backend; 616 isolated PostgreSQL; 189 browser tests Pass. Earlier failed attempts and focused retests retained in the same folder. | Synthetic sessions and browser API substitutes; no shared migration or manual acceptance. Review repair for KAN-62/KAN-63 with KAN-15/KAN-26 regression protection. |
| S4-E18 | [Check](kan10-20261029/check.txt), [coverage](kan10-20261029/coverage.txt), [integration](kan10-20261029/integration.txt), [browser](kan10-20261029/browser.txt); [AUTO-20261029-KAN10-01](../../../testing/test-evidence.md#29-october-2026--kan-10-mark-event-as-completed) | KAN-10 local automated results, 29 October 2026, Node 24.21.0 and PostgreSQL 17.11. Not a hosted run; acceptance Not assessed. |
| S4-E19 | [Check](kan14-20261029/check.txt), [coverage](kan14-20261029/coverage.txt), [integration](kan14-20261029/integration.txt), [browser](kan14-20261029/browser.txt); [AUTO-20261029-KAN14-02](../../../testing/test-evidence.md#29-october-2026--kan-14-register-for-an-event) | KAN-14 rerun on the tree merged with main (migrations 001–019, KAN-17/67/80, KAN-10), 29 October 2026, Node 24.21.0 and PostgreSQL 17.11. These files replace the isolated-branch outputs of AUTO-20261029-KAN14-01, which remain in commit 3940f92. Not a hosted run; acceptance Not assessed. |
| S4-E20 | [Check](kan18-20261029/check.txt), [backend coverage](kan18-20261029/backend-coverage.txt), [frontend coverage](kan18-20261029/frontend-coverage.txt), [integration](kan18-20261029/integration.txt), [browser](kan18-20261029/browser.txt); [AUTO-20261029-KAN18-02](../../../testing/test-evidence.md#29-october-2026--kan-18-equipment-stock-and-operational-status) | KAN-18 rerun on the tree merged with main (migrations 001–020), 29 October 2026, Node 24.21.0 and PostgreSQL 17.11. S4-E17 is KAN-82's; these files replace the isolated-branch outputs of AUTO-20261029-KAN18-01, which remain in commit b0ba1ce. Not a hosted run; acceptance Not assessed. |


## KAN-82 automated verification — 28 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E17 | [KAN-82 coverage and run summary](../../../testing/coverage-reports/2026-10-28-kan82.txt) | `AUTO-20261028-KAN82-01`: unit/component Pass with coverage; PostgreSQL integration 637/637 including 21 KAN-82 tests; browser fixtures 191/191 including 2 KAN-82 tests | Local Windows run on Node 22 with a disposable PostgreSQL 17 database; no live authentication, CI or acceptance |

## KAN-61 automated verification — 29 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E18 | [KAN-61 run logs](kan61-20261029/) (`check.txt`, `coverage.txt`, `integration.txt`, `e2e.txt`, `e2e-initial.txt`; PR #77 review retest `*-review-fix.txt`, run `AUTO-20261029-KAN61-02`) | `AUTO-20261029-KAN61-01`: check and coverage Pass; PostgreSQL integration 673/673 including 11 KAN-61 tests; browser fixtures 197/197 including 3 KAN-61 tests; `e2e-initial.txt` keeps the earlier flaky failure that led to the panel fix | Local Windows run, Node 24.11.1, disposable PostgreSQL 17; synthetic accounts; browser APIs substituted; no live authentication, CI or acceptance |

| S4-E18 | [KAN-61 run logs](kan61-20261029/) (`check.txt`, `coverage.txt`, `integration.txt`, `e2e.txt`, `e2e-initial.txt`) | `AUTO-20261029-KAN61-01`: check and coverage Pass; PostgreSQL integration 673/673 including 11 KAN-61 tests; browser fixtures 197/197 including 3 KAN-61 tests; `e2e-initial.txt` keeps the earlier flaky failure that led to the panel fix | Local Windows run, Node 24.11.1, disposable PostgreSQL 17; synthetic accounts; browser APIs substituted; no live authentication, CI or acceptance |

## KAN-84 automated verification — 29 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E19 | [KAN-84 run logs](kan84-20261029/) (`check.txt`, `coverage.txt`, `integration.txt`, `e2e.txt`, `e2e-repeat.txt`; PR #78 review retest `*-review-fix.txt`, run `AUTO-20261029-KAN84-02`) | `AUTO-20261029-KAN84-01`: check and coverage Pass; PostgreSQL integration 705/705 including 9 KAN-84 tests; browser fixtures 206/206 including 3 KAN-84 tests; KAN-84 spec repeated 15/15 | Local Windows run, Node 24.11.1, disposable PostgreSQL 17; synthetic accounts; browser APIs substituted; backend coverage excludes the integration-tested safety service; no live authentication, CI or acceptance |
## KAN-61 PR #77 operational-block review follow-up — 29 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E21 | [AUTO-20261029-PR77-REVIEW](../../../testing/test-evidence.md#auto-20261029-pr77-review--operational-block-readiness-regression), execution `EX-06-431-AUTO-20261029-PR77-01` | TC-06-431 failed before the fix and passed afterwards; 15/15 confirmation PostgreSQL tests; check and coverage Pass with 1,154 frontend and 1,933 backend tests. Tested code committed unchanged as `a31d2ef`. | Captured console results recorded in the run narrative; no separate raw log file retained. Disposable local PostgreSQL with synthetic identities, no shared Supabase or manual E2E acceptance; full database/browser suites not rerun for this follow-up. |

## KAN-84 PR #78 follow-up — 29 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E22 | [Review follow-up logs](kan84-20261029/) (review-followup-check.txt, review-followup-coverage.txt, review-followup-integration.txt, review-followup-browser.txt, review-followup-browser-isolation.txt and initial-attempt logs) | AUTO-20261029-PR78-REVIEW: check/coverage 1,170 frontend + 1,947 backend; PostgreSQL 795/795 including five upgrade tests; browser 227/227 and final targeted repeat 18/18. Case-level mappings/results in the testing registers. | Windows/Node 24.21.0, disposable PostgreSQL17, synthetic identities; browser APIs substituted. Retains initial check/coverage/startup/browser failures. No shared 022 rollout or manual acceptance. Backend safety service unit-report coverage remains limited; separate database coverage is not merged into that percentage. |

## Sprint 4 acceptance corrections — 30 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E23 | [Run logs and source hashes](acceptance-fixes-20261030/) (`check-final.txt`, `coverage-final.txt`, `integration.txt`, `browser.txt`, `safety-browser-final.txt`, `summary.json`, `document-validation.json`, `workbook-validation.json`; initial `check.txt` / `coverage.txt` retained); [run narrative](../../../testing/test-evidence.md#auto-20261030-s4-ac-fixes--arrangement-suitability-safety-screen-and-notification-clarification) | AUTO-20261030-S4-AC-FIXES: final check/coverage 1,208 frontend + 1,959 backend; real PostgreSQL 814/814; Chromium 229/229, followed by 4/4 safety browser checks after the final safety-route UUID normalization. No retries. Targeted suitability-service integration coverage 100%; reusable specifications, case results and workbook aligned. | Latest main 6b26503 plus uncommitted fix/sprint-4-acceptance-gaps changes, identified by source hashes. Synthetic auth and browser API substitutes; connected manual acceptance Not executed, acceptance Not assessed. No new migration or shared database writes. |
