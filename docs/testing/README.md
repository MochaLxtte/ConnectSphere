# Testing report and editing guide

This is the reading guide for submission folder **3**. It explains the test strategy, the latest retained verification and how to find the supporting cases and results. Documentation reconciled **5 November 2026**; no new test run is claimed by this cleanup.

## Team input needed

**Workstream 3:** use the [shared evidence checklist](../submission/checklist.md#ws3-testing-and-traceability) for outstanding inputs and the [team editing home](../README.md#ws3-testing-and-traceability) for ownership. Review this report against its linked records. Supply any actual missing review or acceptance evidence through the destination named in that checklist. Existing records do not require another full walkthrough merely because this report has been reorganised.

| Report review field | Value to fill |
| --- | --- |
| Reviewed by / actual review date | Not recorded |
| Corrections or evidence supplied | Not recorded |

Formal release acceptance belongs in the release/Sprint 4 review records. It is **Not assessed** in the retained evidence; a documentation editor must not infer it from passing tests.

## Read in this order

1. [Current release position](#current-release-position) and [automated results](#latest-retained-automated-results).
2. [Test levels and environments](#test-levels-and-environments) and [coverage](#measured-coverage-and-limitations).
3. [Requirement-to-result examples](#following-a-requirement-to-its-result) and the reusable [full release walkthrough](release-e2e-walkthrough.md).
4. [Editing specifications and results](#editing-specifications-and-results), when supplying supported information.
5. [Evidence and historical records](#evidence-and-historical-records), for detailed logs and earlier checkpoints.

## Current release position

| Evidence boundary | Recorded position |
| --- | --- |
| Frozen application source | Last code commit `55e2b61`, 1 November **23:55:42 SGT**. The code-editing cutoff is after **1 November 23:59 SGT**. Only documentation/evidence changes are permitted after it. |
| Integrated release candidate | PR #80 was author-merged at **1 November 23:58:58 SGT** into `fb6d8d93f721b114accc9857a05d62e859987e23`. No independent submitted GitHub review was present in the retained 2 November readback. |
| Exact-commit CI | Candidate CI and merge-commit main CI passed. The main verification completed **2 November 00:08:53 SGT**. The earlier statement that remote CI/merge was pending is superseded by that recorded readback. |
| Connected walkthrough | `MAN-20261101-01` records R01–R23 passed within their recorded scope. R24's browser checks completed, but its formal release decision remains **Not assessed**. The 24-group journey `TC-06-32` is not recorded as a complete Pass. |
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

The [frontend gap inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-gaps.json) and [combined backend gap inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined-gaps.json) identify exact uncovered locations and denominators. Remaining testable paths include venue-block access/catalogue failures, uncertain draft-submit feedback, form error branches, stale clarification state, and unexpected error/rollback branches. Optional display/bootstrap paths and one V8 negative-hit anomaly are identified separately. These are disclosed gaps; the report does not claim all are impossible to test.

**Not recorded:** SQL/trigger statement coverage, mutation score, external-provider implementation coverage, cross-tab ordering guarantees and load/performance measurements. PostgreSQL assertions cover locking, constraints, rollback and races; real-signature tests use loopback JWKS. Those boundaries do not establish provider internals or complete live Supabase behavior. Under the code freeze, later findings are reported without source/test changes.

## Following a requirement to its result

The [traceability register](../requirements/traceability.csv) has **230 rows covering all 20 core features**. The [walkthrough coverage map](release-e2e-walkthrough.md#coverage-map-for-the-team) additionally connects the 24 release groups to the 20 features and six customer changes. These mappings support navigation; row counts do not establish that every AC has adequate passing acceptance evidence.

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

The current registers contain **624 specifications**, including 20 historical `TC-01`–`TC-20` feature summaries and **604 detailed cases**. All detailed cases have an execution or preparation row. The **1,105** execution rows comprise **608 Pass, 39 Fail, 457 Not executed and one Blocked**. These are historical attempts/placeholders, not 1,105 distinct tests, 457 outstanding cases or 608 accepted requirements. Original feature summaries have no execution rows; their aggregate outcomes stay in historical evidence.

### Coverage required by IS212

Submission folder 3 must cover all 20 core features and applicable customer changes with traceable normal, boundary, conflict and failure cases. The course expects appropriate unit, integration and/or E2E tests, and 100% coverage unless an exception is explained. Report measured scope and gaps explicitly. Use the [course-source index](../requirements/README.md), Week 4 Project Instructions (deliverable 3/rubric), Week 4 testing slides and Week 9 testing/CI slides. Template fields and specification/execution separation matter; the sample colours are not required formatting.

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
