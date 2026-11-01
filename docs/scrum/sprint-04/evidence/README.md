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

## Minor UI fixes — 31 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E24 | [Logs, screenshots and source inventory](minor-ui-20261031/) (`check.txt`, `coverage.txt`, `browser.txt`, targeted and before-fix logs, `summary.json`, `date-input-inventory.json`, review desktop/mobile and equipment mobile images) | AUTO-20261031-MINOR-UI: 1,209 frontend + 1,959 backend tests, typechecks/builds/coverage and 234 Chromium tests pass. Search year and review underline failures/retests retained. Exact tested source identified by base commit and SHA256. | New browser tests use substituted authentication/API responses. Source inventory does not prove native keystrokes on every page/browser. Manual TC-10-212 Not executed; UI-patch acceptance Not assessed. No database writes or migration. |

## Shared panel spacing and text links — 31 October 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E25 | [Logs, screenshots, audit observations and source hashes](ui-spacing-20261031/) (`before.txt`, `focused.txt`, `check.txt`, `coverage.txt`, `browser.txt`, `summary.json`, `layout-audit.json`, `source-inventory.json`, `layout-audit-harness.txt`; desktop/mobile queue and booking images) | AUTO-20261031-UI-SPACING: two product failures reproduced, 10 focused cases passed, check/coverage passed with 1,209 frontend + 1,959 backend tests, 244 browser tests passed. 229 inspected snapshots across 28 route patterns had no flagged inset/link/overflow issues. | Synthetic browser authentication/API responses and fallback fonts; sampled states, not every browser/state. CSS verified through geometry/style assertions and visual inspection. TC-04-233 Not executed; patch acceptance Not assessed. No shared database writes or migration. |

## Booking replacement and feedback — 1 November 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E26 | [Logs, source hashes and desktop/mobile screenshots](booking-feedback-20261101/) (`before.txt`, `component-initial.txt`, `focused.txt`, `check.txt`, `coverage.txt`, `browser.txt`, `summary.json`, `document-validation.json`) | AUTO-20261101-BOOKING-FEEDBACK: two product failures reproduced; 11 focused and 248 full browser cases pass. Check/coverage pass with 1,209 frontend + 1,959 backend tests. Four screenshots visually inspected. | Synthetic browser authentication/API responses; no shared data writes or migration. TC-12-23 Not executed; patch acceptance Not assessed. Source hashes identify the tested candidate before documentation. |

## Connected release walkthrough — 1 November 2026

| ID | Artifact | Source / result | Limits |
| --- | --- | --- | --- |
| S4-E27 | [MAN-20261101-01 narrative and retained-data ledger](../../../testing/test-evidence.md), [eight scoped case execution rows](../../../testing/test-executions.csv), [retained screenshots](../../../testing/evidence/MAN-20261101-01/) | 23/24 walkthrough groups Pass; R24's functional browser access/logout checks complete, release review remains open. R01–R12 and R13 Part A, plus earlier R21 notices, are user-reported; their original execution dates/builds are Not recorded. Later observations were executed by the Codex browser agent through real role sessions on local frontend/API with shared Supabase development data. | Local source HEAD `429397aef14be8e3773206eddc9583e56c1f05ad`; exact served build not exposed. No automatic per-case extrapolation from group outcomes. User confirmed signed-out `/api/auth/me` HTTP 401 in Chrome Network on 1 November 2026. Current candidate CI, independent review/merge, current migration/job verification and formal release acceptance are not established. Test data retained; no cleanup. |

The screenshots below support the specific views described in the run narrative. They do not independently establish every step or persisted result. Prior user-reported passes have no retained screenshots in this run.

| Scope | Retained images |
| --- | --- |
| Assigned fixtures | [Assigned test fixtures](../../../testing/evidence/MAN-20261101-01/test-fixtures-assigned.jpg) |
| R13 availability | [Overlapping shortfall](../../../testing/evidence/MAN-20261101-01/r13-overlap-shortfall.jpg), [adjacent interval](../../../testing/evidence/MAN-20261101-01/r13-adjacent-availability.jpg) |
| R14 confirmation | [Outage blocks confirmation](../../../testing/evidence/MAN-20261101-01/r14-outage-blocks-confirmation.jpg) |
| R15 registration | [Empty roster](../../../testing/evidence/MAN-20261101-01/r15-empty-roster.jpg), [third attendee sees full](../../../testing/evidence/MAN-20261101-01/r15-third-attendee-full.jpg), [registration closed](../../../testing/evidence/MAN-20261101-01/r15-registration-closed.jpg), [withdrawal unavailable after start](../../../testing/evidence/MAN-20261101-01/r15-withdrawal-after-start.jpg) |
| R17 change review | [Withdrawn change refused](../../../testing/evidence/MAN-20261101-01/r17-withdrawn-change-refused.jpg) |
| R18 safety/preparation | [MAIN safety approval and preparation](../../../testing/evidence/MAN-20261101-01/r18-main-safety-preparation.jpg) |
| R19 remediation | [Combined remediation approved](../../../testing/evidence/MAN-20261101-01/r19-remediation-approved.jpg), [Venue-only unresolved](../../../testing/evidence/MAN-20261101-01/r19-venue-only-still-unresolved.jpg), [Venue-only approved](../../../testing/evidence/MAN-20261101-01/r19-venue-only-approved.jpg), [Technical-only unresolved](../../../testing/evidence/MAN-20261101-01/r19-technical-only-still-unresolved.jpg), [Technical-only approved and preparation resumed](../../../testing/evidence/MAN-20261101-01/r19-technical-only-approved.jpg) |
| R20 stale/offline review | [Changed arrangements disable approval](../../../testing/evidence/MAN-20261101-01/r20-stale-round-approval-disabled.jpg), [offline save requires reload](../../../testing/evidence/MAN-20261101-01/r20-offline-save-reload-required.jpg), [online reconciled approval](../../../testing/evidence/MAN-20261101-01/r20-online-reconciled-approved.jpg). [Earlier loading capture](../../../testing/evidence/MAN-20261101-01/r20-online-reconciled-decision.jpg) is retained but does **not** evidence approval. Offline test was stale-tab reconciliation of a decision saved separately, not proof of a committed write with a lost response. |
| R21 notification | [Safety notice destination](../../../testing/evidence/MAN-20261101-01/r21-safety-notice-destination.jpg) |
| R22 cancellation | [Event cancelled](../../../testing/evidence/MAN-20261101-01/r22-event-cancelled.jpg) |
| R23 completion | [Event completed after actual end](../../../testing/evidence/MAN-20261101-01/r23-event-completed.jpg) |

## Targeted release regressions — 1 November 2026

| ID | Artifact | Result / evidence boundary |
| --- | --- | --- |
| S4-E28 | [MAN-20261101-02](../../../testing/test-evidence.md#man-20261101-02--targeted-release-follow-up-1-november-2026), [case executions](../../../testing/test-executions.csv), [browser observations](../../../testing/evidence/MAN-20261101-02/browser-observations.json), [live HTTP results](../../../testing/evidence/MAN-20261101-02/live-http-probe.json) | Five targeted checks on source `034a631bdb05309d4ba0ef4ed1ff9ba032d9df50`: two UI failures; restored safety approval reproduces an AC9/design inconsistency, recorded Fail against AC9; two scoped passes. Exact served build Not recorded. Real local frontend/API/Supabase sessions; the direct HTTP probe is distinct from browser observations and 22 passing mocked completion tests. Venue buffers restored 15/15; two new PROBE bookings and one safety round retained. No product repair or release acceptance. |

| Check | Captures and limitations |
| --- | --- |
| OPS-7 | [Changed buffer blocks preparation](../../../testing/evidence/MAN-20261101-02/ops7-buffer-change-blocked.jpg); [restoring buffer revives original approval](../../../testing/evidence/MAN-20261101-02/ops7-restored-original-approval.jpg). Same Round 3/preparation time; no new decision. |
| D-1/O-1 | [Stale Ready after pending request](../../../testing/evidence/MAN-20261101-02/d1-stale-ready-after-request.jpg); [server refusal and Not ready](../../../testing/evidence/MAN-20261101-02/d1-server-refuses-stale-confirmation.jpg). Event stayed APPROVED; exact mutation HTTP status Not recorded. |
| OBS-6 | [Cancelled line shows rejection reason](../../../testing/evidence/MAN-20261101-02/obs6-cancelled-shows-rejection-reason.jpg). Separate live HTTP artifact proves the correct cancellation reason is preserved. |
| OBS-12 | [Initial navigation loading screen](../../../testing/evidence/MAN-20261101-02/obs12-navigation-loading.jpg) is **not approval evidence**. The final actual-link navigation result is recorded in `browser-observations.json`, entry **OBS-12 actual queue link return no reload**. |

## Release regression repairs — 1 November 2026

| ID | Artifact | Result / evidence boundary |
| --- | --- | --- |
| S4-E29 | [AUTO-20261101-RELEASE-REGRESSIONS](../../../testing/test-evidence.md#auto-20261101-release-regressions--targeted-repairs-1-november-2026), [summary and source hashes](release-regressions-20261101/summary.json), [logs](release-regressions-20261101/) | Before-fix Fail and automated retest Pass for KAN-61/63/84. Final check: 1,246 frontend + 1,959 backend; coverage: 98.38/89.88% lines; database: 831. Browser:253/253 Pass with one worker/zero retries; two parallel attempts had different navigation timeouts and remain recorded. Worker-shutdown failures also retained. API-substituted browser tests and isolated PostgreSQL do not establish shared connected acceptance. Shared 023 and three connected retests Not executed. |

Screenshots: [corrected equipment reasons, desktop](release-regressions-20261101/equipment-reasons-1280.png), [narrow](release-regressions-20261101/equipment-reasons-390.png), [pending venue makes confirmation Not ready](release-regressions-20261101/confirmation-pending-booking.png), [uncertain save reconciliation](release-regressions-20261101/confirmation-uncertain-save.png), [failed read offers retry](release-regressions-20261101/confirmation-read-retry.png). These captures use synthetic API/auth fixtures. Regenerated design exports: [safety sequence](../../../architecture/exports/seq-safety-review.png), [invalidation relationships](../../../architecture/exports/erd-safety-invalidation.png).

## Coverage, browser isolation and documentation — 1 November 2026

| ID | Artifact | Result / evidence boundary |
| --- | --- | --- |
| S4-E30 | [AUTO-20261101-TEST-HARDENING](../../../testing/test-evidence.md#auto-20261101-test-hardening--coverage-browser-isolation-and-documentation), [final candidate manifest](test-hardening-20261101/summary.json), [logs](test-hardening-20261101/), [coverage gaps](test-hardening-20261101/coverage-gaps.json), [level-classification audit](test-hardening-20261101/test-level-classification.json) | Final check and workspace coverage pass: 1,332 frontend + 2,032 backend tests, two harness guards, types and builds. Combined backend/database coverage passes 2,868 tests and 99/97/99/99 floors. Final browser runs both pass 253/253 with two workers and zero retries. Reproduced auth sequencing and queue-loading failures/retests are retained. No live Supabase acceptance, remote candidate CI, commit or push; shared 023 and four connected retests remain Not executed. |

Coverage statements/branches/functions/lines: frontend **96.07/93.07/97.86/98.41%**, backend isolated **90.62/89.98/91.02/90.75%**, backend combined **99.24/97.88/99.72/99.46%**. Exact denominators and per-file values are retained in the three `*-coverage-summary.json` files. The gaps report states what remains untested; floors do not replace the rubric's 100% target or establish acceptance. SQL and external provider coverage are not measured.

Native [browser run 1](test-hardening-20261101/browser-final-1.json), [run 2](test-hardening-20261101/browser-final-2.json) and their [summary/source hashes](test-hardening-20261101/browser-final-summary.json) cover the final session and safety-queue fixes. Earlier `browser-isolated-*` passes precede those final changes. [Confirmation screenshot](test-hardening-20261101/browser-confirmation-not-ready.png) shows a synthetic fixture, not a new manual result. Current design exports were regenerated and visually inspected: [C1](../../../architecture/exports/c1-context.png), [C2](../../../architecture/exports/c2-containers.png), [C3](../../../architecture/exports/c3-components.png), [class](../../../architecture/exports/class.png).

## Final-candidate verification and shared rollout — 1 November 2026

| ID | Artifact | Result / boundary |
| --- | --- | --- |
| S4-E31 | [AUTO-20261101-FREEZE-CANDIDATE](../../../testing/test-evidence.md#auto-20261101-freeze-candidate--final-local-verification-1-november-2026), [manifest](freeze-candidate-20261101/summary.json), [logs and exact coverage inventories](freeze-candidate-20261101/) | Check/coverage pass: 1,363 frontend + 2,032 backend, two harness guards, types/builds; combined backend/database 2,868. Browser 253/253 twice, two workers and zero retries. Four parent-refresh reproduction failures and passing retest retained. Migration 023 applied to shared development, checksums/preservation verified, repeat no-op. No actual teammate approval or remote CI is inferred. |
| S4-E32 | [MAN-20261101-03](../../../testing/test-evidence.md#man-20261101-03--connected-repaired-candidate-acceptance-1-november-2026), [browser/API/database evidence](../../../testing/evidence/MAN-20261101-03/) | Four scoped connected Pass results: permanent safety invalidation/re-review, readiness refresh, cancellation-reason readback and real-auth smoke. Dedicated venue restored; temporary booking cancelled; new review/audit history retained. Formal release decision remains separate. |

Connected captures: [baseline](../../../testing/evidence/MAN-20261101-03/probe-before.jpg), [pending venue removes Ready](../../../testing/evidence/MAN-20261101-03/pending-readiness.jpg), [restored venue still requires review](../../../testing/evidence/MAN-20261101-03/safety-restored-stale.jpg), [new review restores preparation](../../../testing/evidence/MAN-20261101-03/safety-recovered.jpg), [organiser denied coordinator page](../../../testing/evidence/MAN-20261101-03/auth-wrong-role.jpg). These use real role sessions and shared development persistence; no credentials are retained.


## Pushed-candidate CI — 2 November 2026

| ID | Artifact | Result / boundary |
| --- | --- | --- |
| S4-E33 | [CI run 199](https://github.com/MochaLxtte/ConnectSphere/actions/runs/41323715692), [metadata](freeze-candidate-20261101/ci-199.json), [full log](freeze-candidate-20261101/ci-199.txt), [frontend coverage](freeze-candidate-20261101/ci-199-frontend-coverage.json), [backend unit coverage](freeze-candidate-20261101/ci-199-backend-unit-coverage.json), [combined coverage](freeze-candidate-20261101/ci-199-backend-combined-coverage.json) | Pass on PR #80 head `0384a3c`, test-merge `bb198fe`: all checks/coverage/database suites and 253 browser cases, zero retries. Archive digest verified. These results do not replace the connected run or establish teammate approval. Documentation-only follow-up CI is linked from the PR. |
