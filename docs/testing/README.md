# Testing report and editing guide

This is the reading guide for submission folder **3**. It explains the test strategy, the latest retained verification and how to find the supporting cases and results. Documentation reconciled **5 November 2026**; no new test run is claimed by this cleanup. The [evidence review](#evidence-review--6-november-2026) of **6 November 2026** also reran no suite and added no result.

## Team input needed

**Workstream 3:** use the [shared evidence checklist](../submission/checklist.md#ws3-testing-and-traceability) for outstanding inputs and the [team editing home](../README.md#ws3-testing-and-traceability) for ownership. Review this report against its linked records. Supply any actual missing review or acceptance evidence through the destination named in that checklist. Existing records do not require another full walkthrough merely because this report has been reorganised.

| Report review field | Value to fill |
| --- | --- |
| Reviewed by / actual review date | Not recorded |
| Corrections or evidence supplied | 6 November 2026: [evidence review](#evidence-review--6-november-2026) corrections, prepared for independent review |

Formal release acceptance belongs in the release/Sprint 4 review records. It is **Not assessed** in the retained evidence; a documentation editor must not infer it from passing tests.

## Read in this order

1. [Current release position](#current-release-position) and [automated results](#latest-retained-automated-results).
2. [Test levels and environments](#test-levels-and-environments) and [coverage](#measured-coverage-and-limitations).
3. [Requirement-to-result examples](#following-a-requirement-to-its-result) and the reusable [full release walkthrough](release-e2e-walkthrough.md).
4. [Editing specifications and results](#editing-specifications-and-results), when supplying supported information.
5. [Evidence review](#evidence-review--6-november-2026), for checked figures, spot checks, unsupported claims and remaining gaps.
6. [Evidence and historical records](#evidence-and-historical-records), for detailed logs and earlier checkpoints.

## Current release position

| Evidence boundary | Recorded position |
| --- | --- |
| Frozen application source | Last code commit `55e2b61`, 1 November **23:55:42 SGT**. The code-editing cutoff is after **1 November 23:59 SGT**. Only documentation/evidence changes are permitted after it. |
| Integrated release candidate | PR #80 was author-merged at **1 November 23:58:58 SGT** into `fb6d8d93f721b114accc9857a05d62e859987e23`. No independent submitted GitHub review was present in the retained 2 November readback. |
| Exact-commit CI | Candidate CI and merge-commit main CI passed. The main verification completed **2 November 00:08:53 SGT**. The earlier statement that remote CI/merge was pending is superseded by that recorded readback. |
| Connected walkthrough | R01–R23 are recorded as Pass within their stated scope. R01–R12 and R13 Part A are user reports: execution dates, builds, individual executors and screenshots are **Not recorded**. `MAN-20261101-01` observed R13 Part B onward in the browser at local checkout `429397a`; the exact served build is **Not recorded**. R24's browser checks completed, but its formal release decision remains **Not assessed**. The 24-group journey `TC-06-32` is not recorded as a complete Pass. |
| Walkthrough versus frozen source | Between `429397a` and `55e2b61`, 30 files changed under `backend/src`, `frontend/src` and `database/migrations`: 14 non-test files, including migration 023, and 16 test files. No complete connected repeat on the frozen source is recorded. Connected evidence for those changes is the four `MAN-20261101-03` cases below; other evidence for them is automated. |
| Connected repair acceptance | `MAN-20261101-03` records Pass for `TC-06-446`, `TC-06-447`, `TC-15-108` and `TC-01-213`, with real local frontend/API, Supabase authentication and the shared development database. Migration 023 was applied and verified in that run. |
| Formal acceptance | The recorded test results do not establish an independent teammate review, collective release decision, a new ceremony, or historical sprint delivery dates. Those inputs remain separate in the shared checklist. |

Sources: [merged-main readback](test-evidence.md#ci-20261102-main--merge-readback-and-frozen-source-verification), [candidate CI](test-evidence.md#ci-20261102-199--pushed-release-candidate), [connected repaired-candidate run](test-evidence.md#man-20261101-03--connected-repaired-candidate-acceptance-1-november-2026), and [walkthrough evidence ledger](test-evidence.md).

## Test levels and environments

Manual/automated describes **execution method**. Normal, boundary, conflict, failure and regression describe **scenario coverage or purpose**. Neither is a substitute for the test level.

| Level / boundary | What it establishes | Location and limits |
| --- | --- | --- |
| Unit / isolated component | Validation, calculations, transitions, errors and component behavior with controlled dependencies | `backend/test/` and frontend `*.test.ts`. Component and service suites may substitute API/database/session dependencies; they do not prove persistence or live authentication. |
| HTTP/component integration | Collaboration across routing, middleware, parsing and application/component contracts | Tests under `backend/test/` and frontend suites. Report substituted identities/services explicitly; an HTTP response test with a mocked repository does not establish real database behavior. |
| Real PostgreSQL integration | Constraints, authorization scope, transactions, rollback, concurrent requests and resource conflicts | `database/tests/`, using isolated PostgreSQL 17 with synthetic fixtures. Provider/authentication substitutes remain identified in each suite. |
| Browser integration | Navigation, rendering, feedback, stale responses and UI interaction in Chromium | `tests/e2e/` includes mostly API/auth-substituted scenarios. A directory or command called E2E does not make these complete real-authentication journeys. |
| Connected manual E2E acceptance | Important workflows across real local frontend/API, Supabase authentication, persisted data and relevant jobs | [Release walkthrough](release-e2e-walkthrough.md), with execution in the registers. Localhost acceptance is permitted by the [Definition of Done](../scrum/definition-of-done.md#local-acceptance-policy--25-october-2026); application deployment is not required. |
| Static analysis / inspection | Schema, contracts, documentation or configuration assertions | Identify the inspected source and limitation; inspection is not an executed user journey. |

Each meaningful AC scenario can have a test card at any appropriate level. Multi-level labels in the specification register describe distinct variants; read the actual test and execution boundaries before combining their results. The [classification audit](../scrum/sprint-04/evidence/test-hardening-20261101/test-level-classification.json) preserves the earlier labels and rationale.

## Latest retained automated results

Use one coherent run per measurement. Do not add backend tests counted in both workspace and combined runs, or count repeated browser runs as new cases.

| Layer | Final local candidate, 1 November 2026 | Evidence |
| --- | --- | --- |
| Types, workspace tests and builds | `npm run check`: Pass; **1,363 frontend tests / 63 files**, **2,032 backend tests / 80 files**, two browser-environment guards and both builds | [AUTO-20261101-FREEZE-CANDIDATE](test-evidence.md#auto-20261101-freeze-candidate--final-local-verification-1-november-2026) |
| Workspace coverage | `npm run test:coverage`: Pass; all workspace and critical-file floors | Same run; [retained artifacts](../scrum/sprint-04/evidence/freeze-candidate-20261101/) |
| Combined backend/database | `npm run test:coverage:backend`: Pass; **2,868 tests / 123 files**, comprising the 2,032 backend tests plus **836 PostgreSQL tests / 43 files** | Same run; isolated PostgreSQL 17, migrations 001–023 |
| Full Chromium suite | **253/253**, twice; two workers, zero retries, skips or flaky outcomes in those two runs | Same run; each repetition executes the same 253 cases |
| Remote verification | Candidate CI and exact merge-commit main CI passed check/build, workspace coverage, migrate/seed, combined PostgreSQL coverage and all 253 browser tests | [Candidate CI](https://github.com/MochaLxtte/ConnectSphere/actions/runs/41323715692), [main CI](https://github.com/MochaLxtte/ConnectSphere/actions/runs/41323940034), [retained main metadata](../scrum/sprint-04/evidence/freeze-candidate-20261101/main-ci.json) |

The local candidate was originally recorded as base `034a631…` plus the source manifest in [summary.json](../scrum/sprint-04/evidence/freeze-candidate-20261101/summary.json). The pushed candidate head was `0384a3c…`; CI used its test-merge commit `bb198fe…`. Main CI ran on `fb6d8d9…`. The retained CI import verified all **456** committed source hashes against the tested local manifest. These build identities are kept distinct from the later documentation snapshot.

Earlier parallel browser navigation timeouts remain failed attempts in `AUTO-20261101-RELEASE-REGRESSIONS`. Later owned-server/two-worker runs passed; this does not erase the failures or guarantee that no future run can flake. The existing >500 kB frontend bundle warning is recorded as non-fatal.

## Measured coverage and limitations

| Measurement | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Frontend, final local run | 96.56% | 93.41% | 98.54% | 98.92% |
| Frontend, retained candidate CI | 96.56% | 93.41% | 98.54% | 98.95% |
| Backend isolated/HTTP | 90.62% | 89.98% | 91.02% | 90.75% |
| Backend combined with PostgreSQL | 99.24% | 97.88% | 99.72% | 99.46% |

Sources: [final local verification](test-evidence.md#auto-20261101-freeze-candidate--final-local-verification-1-november-2026) and [candidate CI import](test-evidence.md#ci-20261102-199--pushed-release-candidate). Linux frontend coverage has 39 uncovered lines of 3,722; the local report has 40 uncovered lines. Preserve each measurement rather than average the percentages.

The enforced statements/branches/functions/lines floors are **95/92/97/98 frontend**, **90/89/91/90 isolated backend**, and **99/97/99/99 combined backend**. Selected authentication/session/client/router/shell, Supabase-verifier and pool files have 100% gates. Thresholds prevent measured regression; they do not waive the rubric's 100% target or prove all requirements, assertions or mutants are covered.

All executable frontend `.ts`/`.vue` source is measured, excluding tests, setup, test-only API fixtures and declarations. Backend measurement includes source except the process entry `server.ts`. That entry is exercised as a browser-harness subprocess whose coverage is not merged into V8. Frontend bootstrap/composition and the retained unused placeholder remain included at their measured values.

The [frontend gap inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-gaps.json) and [combined backend gap inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined-gaps.json) identify exact uncovered locations and denominators. Remaining testable paths include venue-block access/catalogue failures, a signed-in account change while editing a draft, uncertain draft-submit feedback, form error branches, stale clarification state, and unexpected error/rollback branches. Optional display/bootstrap paths and one V8 negative-hit anomaly are identified separately. These are disclosed gaps; the report does not claim all are impossible to test.

| Gap inventory | Files with a gap | Uncovered lines | Uncovered statements | Uncovered functions | Uncovered branch arms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frontend, final local run | 52 | 40 | 169 | 17 | 413 |
| Backend combined with PostgreSQL | 23 | 16 | 26 | 2 | 53 |

**Not recorded:** SQL/trigger statement coverage, mutation score, external-provider implementation coverage, cross-tab ordering guarantees and load/performance measurements. PostgreSQL assertions cover locking, constraints, rollback and races; real-signature tests use loopback JWKS. Those boundaries do not establish provider internals or complete live Supabase behavior. Under the code freeze, later findings are reported without source/test changes.

## Following a requirement to its result

The [traceability register](../requirements/traceability.csv) has **230 rows**: 228 cover all 20 core features and two are `Infrastructure`. One feature row spans CF-06, CF-19 and CF-20, and seven older rows have no versioned criterion IDs. The [evidence review](#evidence-review--6-november-2026) follows one chain per feature and customer change. The [walkthrough coverage map](release-e2e-walkthrough.md#coverage-map-for-the-team) additionally connects the 24 release groups to the 20 features and six customer changes. These mappings support navigation; row counts do not establish that every AC has adequate passing acceptance evidence.

Use this sequence: **core feature → applicable story/AC version → test specification → executable test or manual steps → scoped execution → retained evidence**. Source/test paths inside CSV cells resolve from the repository root, or submission folder `6/`.

| Example | Specification and implementation/test route | Supported outcome |
| --- | --- | --- |
| CF-01 / KAN-25 AC1–4: connected authentication | `TC-01-213`; [LoginPage](../../frontend/src/features/auth/pages/LoginPage.vue), [auth router](../../backend/src/modules/auth/router.ts), manual steps in the specification; no complete automated path claimed | `MAN-20261101-03`: real sign-in/reload/logout/role denial/invalid-login smoke Pass, supplemented by measured HTTP 200/204/401. Does not claim copied-token revocation or every cross-tab race. |
| CF-06 / KAN-84 AC9: safety approval remains invalid after restoration | `TC-06-446`; [safety service](../../backend/src/modules/safety/service.ts), [migration 023](../../database/migrations/023_safety_approval_invalidation.sql), [PostgreSQL safety tests](../../database/tests/safety/safety-reviews.integration.test.ts) | `MAN-20261101-02`: Fail; `MAN-20261101-03`: scoped Pass after migration 023, including no-intermediate-read restoration and a fresh approved round. Original failure retained. |
| CF-15 / KAN-63 AC5: cancellation reason | `TC-15-108`; [equipment panel tests](../../frontend/src/features/events/components/EquipmentRequestPanel.test.ts), connected saved-field readback | Original UI failure and later repaired Pass are separate attempts. The retest verified the existing fixture rather than claiming another rejection/cancellation mutation. |
| Full current release | `TC-06-32` / `S4-T16`; [R01–R24 manual steps](release-e2e-walkthrough.md) and related story suites | R01–R23 and targeted repairs have scoped results; formal R24/release acceptance remains Not assessed. A single full-journey automated test is Not recorded. |

Some register `status`/specification notes retain dated preparation or failure wording. Consult the execution register and later run narrative for the case's actual attempts. A preparation note does not override a later observed result, and a narrow automated Pass does not replace an unperformed connected variant.

## Connected walkthrough and repair evidence

Use the [Markdown walkthrough](release-e2e-walkthrough.md) for its 24 ordered groups, role/data setup, expected outcomes and blank results form. The [Word export](release-e2e-walkthrough.docx) is a sharing format, not a separate execution record. Its blank result cells are reusable preparation fields.

| Evidence | What it establishes |
| --- | --- |
| `MAN-20261101-01` in the [run ledger](test-evidence.md) | R01–R23 observations, with browser-operator and user-reported portions distinguished; R24 browser cleanup checked, formal decision open |
| [MAN-20261101-02](test-evidence.md#man-20261101-02--targeted-release-follow-up-1-november-2026) | Three reproduced regressions: restored safety approval, stale confirmation readiness and cancelled-line reason display; other targeted checks retain their own outcomes |
| [AUTO-20261101-RELEASE-REGRESSIONS](test-evidence.md#auto-20261101-release-regressions--targeted-repairs-1-november-2026) | Repair tests and earlier browser failures; shared acceptance was still pending at that checkpoint |
| [MAN-20261101-03](test-evidence.md#man-20261101-03--connected-repaired-candidate-acceptance-1-november-2026) | Connected Pass for `TC-06-446`, `TC-06-447`, `TC-15-108`, `TC-01-213`; migration 023 and retained/restored synthetic data documented |

The repair run recorded original values, read-only database comparisons, restored venue settings and retained immutable reviews/notifications. Do not delete shared test data without agreement. Later documentation edits do not change an execution date or infer a sprint review outcome.

## Editing specifications and results

The reusable card follows the Week 4 template. The corresponding execution record is separate. Keep the existing stable IDs and preserve failures when appending retests.

| Record | Edit only for |
| --- | --- |
| [test-cases.csv](test-cases.csv) | A new or corrected specification: scenario, preconditions, steps, data and expected result. Do not enter actual results here. |
| [test-executions.csv](test-executions.csv) | A supported case-level attempt, with actual outcome, run, date, executor, build, environment and evidence. Append; do not overwrite previous attempts. |
| [test-evidence.md](test-evidence.md) | The actual run narrative, aggregate suite results, commands, environment, limitations and cleanup. Suite totals do not automatically create case Passes. |
| [traceability.csv](../requirements/traceability.csv) | Requirement → case → implementation/test-path mappings, retaining historical criterion versions and dated qualifications. |
| This report | The concise current summary and links, after the supporting records justify a change. |

### Specification template

Use `test_case_id`, `feature_id`, `scenario_outline`, `planned_level`, `acceptance_criterion_ids`, `preconditions`, `test_steps`, `test_data`, `expected_result`, `created_by`, `date_of_creation` and `specification_notes`. A meaningful AC-level scenario can link to executable fixture steps; every low-level assertion does not need its own manual card. Unknown optional author/date metadata remains **Not recorded**.

### Execution-record template

Use `execution_id`, `test_case_id`, `run_id`, `actual_result`, `result`, `remarks`, `executed_by`, `date_of_execution`, `build`, `environment` and `evidence`. Results are **Pass / Fail / Not executed / Blocked**. A Not executed placeholder has no invented run/date/result details. Blocked requires a recorded obstacle to an attempted check.

### Recording a test run

For a supported run, record its actual narrative first, then append only the case-level outcomes established by that source. Identify substituted dependencies, original/restored fixture state, retained data and failures/retests. Update the matching sprint acceptance evidence only within its demonstrated scope. Missing metadata remains **Not recorded**. Follow [AGENTS.md §6.1](../../AGENTS.md#61-test-specifications-and-execution-records).

The current registers contain **624 specifications**, including 20 historical `TC-01`–`TC-20` feature summaries and **604 detailed cases**. All detailed cases have an execution or preparation row. The **1,105** execution rows comprise **608 Pass, 39 Fail, 457 Not executed and one Blocked**. These are historical attempts/placeholders, not 1,105 distinct tests, 457 outstanding cases or 608 accepted requirements. Of the 604 detailed cases, 440 have at least one Pass row, 163 have only Not executed rows and `TC-03-01` has only a Fail row. Original feature summaries have no execution rows; their aggregate outcomes stay in historical evidence.

### Coverage required by IS212

Submission folder 3 must cover all 20 core features and applicable customer changes with traceable normal, boundary, conflict and failure cases. The course expects appropriate unit, integration and/or E2E tests, and 100% coverage unless an exception is explained. Report measured scope and gaps explicitly. Use the [course-source index](../requirements/README.md), Week 4 Project Instructions (deliverable 3/rubric), Week 4 testing slides and Week 9 testing/CI slides. Template fields and specification/execution separation matter; the sample colours are not required formatting.

## Evidence review — 6 November 2026

This review compares the report with the retained logs, JSON artifacts and registers. It reran no suite, added no execution result and changed no register. Earlier failed attempts and Not executed placeholders stand as recorded. Scripted register checks and manual reading were AI-assisted. Independent review is still needed, so DOC-301, DOC-302 and DOC-303 remain unticked in the [shared checklist](../submission/checklist.md#ws3-testing-and-traceability).

### Run figures and build identity (DOC-301)

| Claim checked | Compared with | Outcome |
| --- | --- | --- |
| Local suite counts | `check.txt`, `coverage.txt`, `backend-combined.txt`, `browser-1.json`, `browser-2.json` in the [freeze-candidate folder](../scrum/sprint-04/evidence/freeze-candidate-20261101/) | Match: 1,363/63, 2,032/80, two harness tests, 2,868/123 and 253/253 twice, with zero skipped, unexpected or flaky. The 836/43 PostgreSQL figure is the combined run minus the backend run; 43 integration files exist at the frozen commit. |
| CI suite counts | `ci-199.txt`, `main-ci.txt` | Both match the local counts, with 253 browser tests passed and migrations through 023 applied. |
| Coverage percentages and denominators | Three local and three candidate-CI summary JSON files; main CI job log | Match. Uncovered counts recompute from the denominators, including 40 of 3,725 local and 39 of 3,722 CI frontend lines. Main CI per-file JSON is not in the repository; its log shows the candidate-CI percentages. Both GitHub artifact archives expire on 15 November 2026. |
| Coverage floors and 100% file gates | `frontend/vite.config.ts`, `backend/vitest.config.ts`, `vitest.backend-coverage.config.ts`, per-file summaries | Match. The five frontend gated files and two backend gated files measure 100% on all four metrics. |
| Source identity | All 456 hashes in `summary.json`, recomputed from Git with CRLF normalised to LF | No mismatch at `55e2b61`, `0384a3c`, `fb6d8d9` or this documentation branch's base. No code, SQL, test or configuration file changed between `55e2b61` and `fb6d8d9`. |
| Merge and CI times | `main-ci.json`; GitHub PR readback on 6 November 2026 | Match. PR #80 still shows no submitted reviews. |
| Connected walkthrough scope | [Run ledger](test-evidence.md#1-november-2026--release-walkthrough-checkpoint) | **Corrected in [Current release position](#current-release-position).** The earlier summary attributed R01–R23 to `MAN-20261101-01` and did not identify its checkout or the later source changes. |

### What the Pass rows represent

These rows come from the [execution register](test-executions.csv). They are grouped by run prefix and recorded environment text. This is a reading aid, not an acceptance measure, and repeated runs of the same case each count.

| Evidence type | Pass rows |
| --- | ---: |
| Automated or operational run, PostgreSQL recorded in the environment (may also use browser or API substitutes) | 265 |
| Automated run, browser environment without PostgreSQL recorded | 19 |
| Automated, operational or documentation-check run, other recorded environment, such as component or CI checks | 55 |
| Manual run, shared development database or Supabase recorded | 35 |
| Manual run, other recorded environment, such as `Localhost; database target Not recorded` | 47 |
| Manual team report, build and environment Not recorded | 181 |
| Reported closeout outcome with no run ID | 6 |
| **Total** | **608** |

Across these rows, build is Not recorded on 233, environment on 181 and executor on 37. In 230 Pass rows the case ID does not appear in the run ledger. Their support is the row's recorded result and cited artifact. The sampled rows below were followed; individual review of the other rows is **Not assessed**.

### Core-feature spot check (DOC-302)

| Feature | Detailed cases | With a Pass | Placeholder only | Linked criteria | Criteria with any Pass | Criteria with a manual Pass | Chain followed: case / trace row / run | Recorded boundary |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| CF-01 | 14 | 14 | 0 | 18 | 18 | 9 | `TC-01-213` / 224 / `MAN-20261101-03` | Connected, repaired candidate |
| CF-02 | 33 | 33 | 0 | 12 | 12 | 10 | `TC-02-05` / 26 / `AUTO-20261021-KAN6-02` | Real PostgreSQL |
| CF-03 | 26 | 25 | 0 | 7 | 7 | 6 | `TC-03-302` / 137 / `AUTO-20261025-ARVIN-01` | Real PostgreSQL; browser APIs substituted |
| CF-04 | 42 | 41 | 1 | 21 | 21 | 18 | `TC-04-08` / 122 / `AUTO-20261021-KAN79-07` | Component fixtures |
| CF-05 | 51 | 50 | 1 | 27 | 27 | 25 | `TC-05-47` / 124 / `AUTO-20261021-KAN79-03` | Chromium with API/session fixtures |
| CF-06 | 71 | 55 | 16 | 56 | 47 | 17 | `TC-06-446` / 212 / `MAN-20261101-03` | Connected, repaired candidate |
| CF-07 | 7 | 7 | 0 | 26 | 26 | 21 | `TC-07-07` / 36 / `CI-20261027-KAN66-02` | Real PostgreSQL on CI |
| CF-08 | 31 | 17 | 14 | 28 | 26 | 25 | `TC-08-17` / 40 / `AUTO-20261021-KAN77-CI-01` | Real PostgreSQL on CI |
| CF-09 | 20 | 11 | 9 | 51 | 50 | 39 | `TC-09-14` / 74 / `AUTO-20261021-KAN81-CI-01` | Real PostgreSQL on CI |
| CF-10 | 26 | 22 | 4 | 26 | 26 | 25 | `TC-10-213` / 229 / `AUTO-20261101-TEST-HARDENING` | HTTP integration, synthetic identities |
| CF-11 | 16 | 15 | 1 | 35 | 35 | 22 | `TC-12-17` / 197 / `AUTO-20261030-S4-AC-FIXES` | Real PostgreSQL |
| CF-12 | 26 | 25 | 1 | 55 | 54 | 31 | `TC-12-22` / 211 / `AUTO-20261101-BOOKING-FEEDBACK` | Chromium with synthetic API responses |
| CF-13 | 8 | 8 | 0 | 55 | 54 | 31 | `TC-13-02` / 118 / `AUTO-20261021-KAN79-07` | Parser and component fixtures |
| CF-14 | 44 | 41 | 3 | 70 | 66 | 43 | `TC-12-16` / 196 / `AUTO-20261030-S4-AC-FIXES` | Real PostgreSQL |
| CF-15 | 17 | 11 | 6 | 28 | 27 | 7 | `TC-15-108` / 214 / `MAN-20261101-03` | Connected, repaired candidate |
| CF-16 | 20 | 13 | 7 | 21 | 12 | 0 | `TC-16-20` / 207 / `AUTO-20261031-MINOR-UI` | Chromium with API fixtures |
| CF-17 | 18 | 12 | 6 | 28 | 28 | 7 | `TC-17-102` / 25 / `AUTO-20261026-KAN26-01` | Real PostgreSQL |
| CF-18 | 49 | 6 | 43 | 32 | 10 | 2 | `TC-18-414` / 164 / `MAN-20261101-01` | Connected at `429397a` |
| CF-19 | 9 | 9 | 0 | 50 | 49 | 16 | `TC-19-02` / 70 / `MAN-20261028-KAN66-KAN15-01` | Connected, build `ac5cd8b` |
| CF-20 | 70 | 22 | 48 | 79 | 58 | 27 | `TC-06-104` / 155 / `AUTO-20261028-PR63-01` | Real PostgreSQL |

Each followed chain was checked for these links: the case and its criteria, the trace row, any listed test or implementation path at `fb6d8d9`, the execution row and the run's ledger entry or cited artifact. No chain link was broken. Across the whole register, every execution row references a known case, every detailed case appears in traceability, and criterion IDs match between the specifications and traceability (415 each).

Cases are counted under their own `feature_id`. Criteria are counted under every feature in their trace rows, so criteria totals overlap between features. "Manual Pass" includes team reports with no recorded environment. A low figure means no case-level result was recorded, not that the behaviour is untested: automated suites and walkthrough narratives may still exercise it. The registers have no scenario-type field, so normal, boundary, conflict and failure coverage per feature is **Not assessed**.

### Customer-change spot check (DOC-302)

| Change | Stories | Criteria | With any Pass | With a manual Pass | Manual Pass with shared/Supabase recorded | Placeholder-only cases | Chain followed | Walkthrough groups and source |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| CR-1 | KAN-77, KAN-78 | 14 | 13 | 11 | 0 | `TC-08-16`, `TC-14-05`, historical `TC-06-19` | `TC-08-17` / 40 / `AUTO-20261021-KAN77-CI-01` | R05–R08, user-reported |
| CR-2 | KAN-81 | 12 | 11 | 4 | 0 | `TC-09-01`, `TC-09-03`–`06`, `TC-09-08`–`11` | `TC-09-14` / 74 / `AUTO-20261021-KAN81-CI-01` | R10 user-reported; R18–R20 observed |
| CR-3 | KAN-82 | 12 | 12 | 0 | 0 | `TC-06-32`, `TC-12-20`, `TC-12-23` | `TC-12-17` / 197 / `AUTO-20261030-S4-AC-FIXES` | R07, R11 user-reported; R20 observed |
| CR-4 | KAN-83 | 12 | 12 | 9 | 8 | None; `TC-14-15` is Blocked | `TC-14-12` / 83 / `MAN-20261025-KAN83-01` | R09–R10, user-reported |
| CR-5 | KAN-79, KAN-65 | 22 | 22 | 20 | 0 | `TC-05-15`, historical `TC-06-19` | `TC-05-47` / 124 / `AUTO-20261021-KAN79-03` | R02–R03, user-reported |
| CR-6 | KAN-84 | 13 | 13 | 4 | 4 | `TC-06-22`, `TC-06-31`, `TC-06-32`, `TC-06-445` | `TC-06-446` / 212 / `MAN-20261101-03` | R18–R20, observed |

Walkthrough groups come from the [coverage map](release-e2e-walkthrough.md#coverage-map-for-the-team). The manual Passes for CR-1 and CR-2 are `MAN-20261017-TEAM-01` team reports. CR-5's are mainly `MAN-20261017-01`, recorded as `Localhost; database target Not recorded`. These figures use recorded environment text, so a zero means the connected environment is not recorded at case level, not that the check was disproved.

### Unsupported or qualified claims (DOC-302)

| Item | What the records support | Treatment |
| --- | --- | --- |
| "`MAN-20261101-01` records R01–R23 passed" | R01–R12 and R13 Part A are earlier user reports without dates, builds, individual executors or screenshots. Live observation covers R13 Part B onward at `429397a`, and only eight case-level rows came from that run. | Corrected above; the ledger is unchanged |
| Criteria with no case-level Pass | 66 of 415: 15 superseded KAN-64 criteria, two KAN-24 infrastructure criteria and 49 others: KAN-9 (5), KAN-10 (3), KAN-14 (8), KAN-17 (6), KAN-18 (4), KAN-50 (1), KAN-54 (3), KAN-61 (2), KAN-62 (1), KAN-63 (1), KAN-67 (8), KAN-77 (1), KAN-80 (5), KAN-81 (1). | Disclosed; no Pass inferred from suite totals or walkthrough groups |
| Criteria with no manual Pass | 176 of 415, including all 21 linked to CF-16 and 30 of 32 linked to CF-18. | Disclosed; walkthrough narrative is not converted into case rows |
| Placeholder-only cases | 163 of 604 detailed cases, 12 of them marked superseded or historical in their notes. Another 294 Not executed rows sit on cases that also have performed attempts. | Placeholders preserved |
| `TC-03-01` | Its only row is a Fail from 15 October, with no retest of that case. The ledger names `TC-03-301` as the repaired-code regression, and it has three Pass rows. | Original Fail preserved |
| `TC-14-15` | Latest manual attempt is Blocked because no deployed API existed and `pg_cron` was then not enabled. An earlier Pass (`AUTO-20261021-KAN83-01`) covers catch-up and replay at automated layers only. `TC-14-310` later records the job configured and running. | Blocked row preserved |
| `TC-03-303`, `TC-09-25`, `TC-14-308` | Their Fail rows appear after Pass rows in the register but are pre-fix baselines from the same date. Register order does not show which attempt came last; read the remarks. | Recorded here; rows unchanged |
| Traceability status wording | Keyword screen: 28 rows still read as pending or Not executed although a linked case has a later Pass: 23, 24, 25, 29, 73, 88–94, 106, 112, 113, 115, 153–155, 160, 163–165, 185, 205, 211, 212, 224. | Dated wording kept; use the execution register for outcomes |
| Traceability row quality | Rows 8 and 16–21 have no versioned criterion IDs. Row 8 has prose in `test_case_ids`. In row 5, `TC-04-01` shares no criterion ID with the row, and in row 73, `TC-17-103` does not either. The 74 `S#-Txx` references are sprint test IDs, not `test-cases.csv` entries. | Disclosed; rows unchanged |
| Coverage inventories | Both list "live connected Supabase acceptance for this patch" as unmeasured. That describes coverage measurement at generation time, 23:40:44; `MAN-20261101-03` records the connected repair result separately. | Artifacts unchanged |

### Remaining coverage and acceptance gaps (DOC-303)

| Gap | Current position | Where it is resolved |
| --- | --- | --- |
| Whole-repository coverage | Not 100% on any metric in any measurement above. Retained evidence shows no approved blanket exception. Not every gap is claimed to be impossible to test. | Disclosed here; the code freeze prevents new tests |
| Unmeasured areas | SQL/trigger statement coverage, mutation score, external-provider internals, cross-tab ordering and load/performance are **Not recorded**. | Disclosed here |
| Connected run on frozen source | No complete R01–R24 connected repeat is recorded. The repaired candidate has four connected cases plus automated suites. | Team release decision |
| Shared expiry job | Last recorded verification is `OPS-20261025-HOLD-EXPIRY-01`, 25 October. The 1 November gate says the job configuration was not freshly verified, and no later readback is recorded. `MAN-20261101-03` verified migration checksums, not the job. | Team release decision |
| Independent review | PR #80 was author-merged with no submitted GitHub review. Requested reviewers are not reviewers. | [DOC-603](../submission/checklist.md#ws6-submission-integration); a historic approval cannot be created |
| Formal release acceptance | R24 and `TC-06-32` remain **Not assessed** and Not executed respectively. Passing tests do not decide them. | [DOC-603](../submission/checklist.md#ws6-submission-integration) |

## Evidence and historical records

- [Full run ledger](test-evidence.md): retained narratives, failed attempts, retests and qualifications. Search by run ID; it is supporting evidence, not the current editing guide.
- [Final local/CI artifact directory](../scrum/sprint-04/evidence/freeze-candidate-20261101/) and [connected repair captures](evidence/MAN-20261101-03/).
- [Sprint 4 evidence register](../scrum/sprint-04/evidence/README.md): S4-E31/S4-E32 and associated records.
- [Coverage report index](coverage-reports/README.md): earlier measurements retain their actual dates and scopes.
- [Historical testing guide](archive/2026-11-05/README.md): complete pre-cleanup README with older progress checkpoints and story-specific verification plans.
- [Original combined CSV snapshot](archive/test-cases-2026-10-21.csv): unchanged historical source, superseded by separate specification/execution registers.

The unchanged submission preparation command copies testing documents and traceability into folder 3 and executable test source into folder 6. It does not run tests or establish acceptance. See the [shared submission checklist](../submission/checklist.md).

## Historical link index

Established links below continue to resolve to the preserved source sections. Their dated pending/hosted guidance describes its original checkpoint; the current release position above takes precedence for this report.

<details>
<summary>Earlier checkpoints and story-specific verification guides</summary>

<a id="testing-and-evidence"></a>

- [Testing and evidence](archive/2026-11-05/README.md#testing-and-evidence)

<a id="current-release-checkpoint--1-november-2026"></a>

- [Current release checkpoint — 1 November 2026](archive/2026-11-05/README.md#current-release-checkpoint--1-november-2026)

<a id="coverage-gates-and-remaining-exceptions--1-november-2026"></a>

- [Coverage gates and remaining exceptions — 1 November 2026](archive/2026-11-05/README.md#coverage-gates-and-remaining-exceptions--1-november-2026)

<a id="test-level-execution-method-and-purpose"></a>

- [Test level, execution method and purpose](archive/2026-11-05/README.md#test-level-execution-method-and-purpose)

<a id="full-sprints-1-to-4-manual-e2e-release-walkthrough"></a>

- [Full Sprints 1 to 4 manual E2E release walkthrough](archive/2026-11-05/README.md#full-sprints-1-to-4-manual-e2e-release-walkthrough)

<a id="current-test-document-structure--21-october-2026"></a>

- [Current test-document structure — 21 October 2026](archive/2026-11-05/README.md#current-test-document-structure--21-october-2026)

<a id="reading-the-case-and-evidence-registers--17-october-2026"></a>

- [Reading the case and evidence registers — 17 October 2026](archive/2026-11-05/README.md#reading-the-case-and-evidence-registers--17-october-2026)

<a id="browser-regression-reliability"></a>

- [Browser regression reliability](archive/2026-11-05/README.md#browser-regression-reliability)

<a id="database-environments"></a>

- [Database environments](archive/2026-11-05/README.md#database-environments)

<a id="business-test-planning"></a>

- [Business-test planning](archive/2026-11-05/README.md#business-test-planning)

<a id="kan-79-integrated-local-verification"></a>

- [KAN-79 integrated local verification](archive/2026-11-05/README.md#kan-79-integrated-local-verification)

<a id="kan-65-hosted-verification"></a>

- [KAN-65 hosted verification](archive/2026-11-05/README.md#kan-65-hosted-verification)

<a id="kan-29-hosted-verification"></a>

- [KAN-29 hosted verification](archive/2026-11-05/README.md#kan-29-hosted-verification)

<a id="kan-53-hosted-verification"></a>

- [KAN-53 hosted verification](archive/2026-11-05/README.md#kan-53-hosted-verification)

<a id="kan-8-hosted-verification"></a>

- [KAN-8 hosted verification](archive/2026-11-05/README.md#kan-8-hosted-verification)

<a id="kan-52-hosted-verification"></a>

- [KAN-52 hosted verification](archive/2026-11-05/README.md#kan-52-hosted-verification)

<a id="kan-59-hosted-verification"></a>

- [KAN-59 hosted verification](archive/2026-11-05/README.md#kan-59-hosted-verification)

<a id="kan-50-hosted-verification"></a>

- [KAN-50 hosted verification](archive/2026-11-05/README.md#kan-50-hosted-verification)

<a id="rebalanced-release-1-verification-plan--16-october-2026"></a>

- [Rebalanced Release 1 verification plan — 16 October 2026](archive/2026-11-05/README.md#rebalanced-release-1-verification-plan--16-october-2026)

<a id="kan-34-hosted-verification"></a>

- [KAN-34 hosted verification](archive/2026-11-05/README.md#kan-34-hosted-verification)

<a id="kan-78-hosted-verification"></a>

- [KAN-78 hosted verification](archive/2026-11-05/README.md#kan-78-hosted-verification)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

- [25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/README.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--closeout-retest"></a>

- [25 October 2026 — Closeout retest](archive/2026-11-05/README.md#25-october-2026--closeout-retest)

<a id="kan-9-integrated-local-verification"></a>

- [KAN-9 integrated local verification](archive/2026-11-05/README.md#kan-9-integrated-local-verification)

<a id="setup"></a>

- [Setup](archive/2026-11-05/README.md#setup)

<a id="manual-scenarios"></a>

- [Manual scenarios](archive/2026-11-05/README.md#manual-scenarios)

<a id="kan-26-integrated-local-verification"></a>

- [KAN-26 integrated local verification](archive/2026-11-05/README.md#kan-26-integrated-local-verification)

<a id="setup-and-migration"></a>

- [Setup and migration](archive/2026-11-05/README.md#setup-and-migration)

<a id="checks-to-perform"></a>

- [Checks to perform](archive/2026-11-05/README.md#checks-to-perform)

<a id="kan-61--kan-84-review-follow-up-manual-e2e-acceptance"></a>

- [KAN-61 / KAN-84 review-follow-up manual E2E acceptance](archive/2026-11-05/README.md#kan-61--kan-84-review-follow-up-manual-e2e-acceptance)

<a id="30-october-2026--focused-local-e2e-acceptance-for-kan-80-kan-82-and-kan-84"></a>

- [30 October 2026 — Focused local E2E acceptance for KAN-80, KAN-82 and KAN-84](archive/2026-11-05/README.md#30-october-2026--focused-local-e2e-acceptance-for-kan-80-kan-82-and-kan-84)

<a id="1-november-2026--release-regression-retests"></a>

- [1 November 2026 — release regression retests](archive/2026-11-05/README.md#1-november-2026--release-regression-retests)

<a id="kan-79-hosted-verification"></a>

- [Legacy kan-79-hosted-verification](archive/2026-11-05/README.md#kan-79-hosted-verification)

</details>
