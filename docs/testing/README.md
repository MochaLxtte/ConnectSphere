# Testing and requirements traceability

ConnectSphere must keep event decisions, bookings and notifications consistent across roles. A refusal matters as much as a successful request. If two people claim the last place, or a venue change invalidates an approval, a correct response must agree with the stored state and the notices sent to users.

Folder 3 covers all **20 core features and six customer changes**. Its 624 reusable specifications include 604 detailed cases and 20 historical feature summaries. The connected walkthrough records scoped results for R01–R23. Tristan confirms that the team ran the final end-to-end test, including R24, before the freeze and it passed. Formal acceptance of the frozen release remains with WS6. [Requirements and results](traceability-review.md) · [final test report](test-evidence.md#report-prefreeze-r24--functional-release-walkthrough) · [release decision](../submission/release-record.md#release-decision)

**The full configured automated suites passed locally on 1 November before the 23:59 SGT code freeze.** The run covered the frontend, backend, PostgreSQL integration, browser-environment guards and Chromium tests. CI repeated the checks on the frozen merge and finished at 00:08:53 SGT on 2 November. These run totals count executable tests. The case register below counts written scenarios with individually recorded results, including manual checks. [Freeze run and suite counts](#latest-retained-automated-results) · [original run report](../scrum/sprint-04/evidence/freeze-candidate-20261101/summary.json)

At the **31 October Sprint 4 review**, the team reports that all **75 manual cases** on the identified checklist passed. Ryan reported the result at review and Ernest confirmed it in the retrospective. Tristan subsequently identified the roster and confirmed that each story owner performed their cases. The register now lists the individual results, including the three manual end-to-end procedures. The demonstrated build and case-level captures remain unrecorded. [75 cases and executors](sprint-4-manual-review.md) · [Meeting accounts and recording](../scrum/review-testing.md)

**Of 604 detailed cases, 523 have a recorded outcome.** The other 81 comprise 69 active cases with partial evidence and 12 superseded specifications. The 523 outcomes are 521 Pass, one Fail and one Blocked. [Coverage and retest rules](coverage-results.md) · [Case-by-case evidence](pre-freeze-case-audit.md) · [Additional manual results](pre-freeze-manual-results.md)

## Read in this order

| To assess | Open | What it contains |
| --- | --- | --- |
| Test design and quality | [Course methods and worked cases](course-case-design.md) · [complete case catalogue](case-catalogue/README.md) | Week 4 fields, concrete inputs, expected results and dated attempts for each case where available. |
| Scope and outcomes | [Traceability review](traceability-review.md) · [coverage and results](coverage-results.md) | All 20 features and six changes, relevant AC versions, case-to-run links, status counts and denominators. |
| Which preparation entries already had supporting runs? | [Pre-freeze audit of 115 cases](pre-freeze-case-audit.md) · [filterable list](pre-freeze-case-audit.csv) | Each case identifies its scenario, the strongest retained evidence, the run or team report that establishes a Pass, or the part still unverified. |
| Testing during the project | [Testing across four sprints](testing-across-sprints.md) | Named meeting discussions and how early defects changed the team's test selection, handoffs and later regression checks. |
| Supporting evidence | [Evidence index](evidence-index.md) | Local and CI results, screenshots and observations, original failures, repaired-candidate results and the R24 decision boundary. |

## Test levels and environments

The tests use different environments because each can answer a different question. Functional describes the behaviour checked. Manual and automated describe how a check was performed. A regression test repeats a previously relevant check after a change.

| Question | Method and environment | What to inspect |
| --- | --- | --- |
| Does one validation, calculation or state update follow its rule? | Vitest isolated backend and frontend component tests. Controlled inputs and test doubles permit invalid data, delayed responses and error branches to be exercised repeatably. | Compare expected state or messages with the observed result. For example, the saved-draft component checks the order and deduplication of field errors. [Draft example](course-case-design.md#selecting-inputs-and-checking-outcomes) |
| Does a request reach the right handler with the right permissions? | HTTP/router and component integration exercise middleware, parsing and service contracts. A substituted identity or repository narrows what the result establishes. | For a refusal, check both the response and the absence of an unintended write. Where persistence matters, follow the case into the database tests. [Cases by feature](case-catalogue/README.md) |
| Do competing writes preserve the business rule? | Isolated PostgreSQL 17 with migrations and synthetic fixtures exercises transactions, locks, constraints and rollback. Two concurrent requests can succeed individually in a unit test and still conflict when they share one stock pool. | Compare committed reservations and notifications after both transactions finish. [Equipment reservations](../../database/tests/equipment/reservations.integration.test.ts) · [combined results](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined.txt) |
| Does the UI navigate, show the right feedback and recover? | Automated Chromium integration exercises navigation and rendering. Many cases substitute API or authentication responses to control timing and failures. | The two local runs repeated the same 253 cases. Real sign-in and persisted state have separate evidence. [Browser reports and boundaries](evidence-index.md#from-a-question-to-the-record) |
| Does the workflow hold across real roles and saved data? | Connected manual checks used the local frontend, running API, real Supabase authentication and shared development database. Operators reloaded records under different roles. Independent HTTP probes and read-only database comparisons supplied additional observations. | The run narratives distinguish direct observations from results reported by teammates. They record fixture changes and restoration. [Connected failures and retests](evidence-index.md#follow-a-defect-through-retest) |

The course's testing pyramid guided the interpretation of these levels. Short deterministic checks isolate the cause of a failure. Database tests check consequences across components. Connected runs check that the resulting workflow is usable under real role and session boundaries. The Week 4 case-design examples and the Week 6 and 9 worked examples are identified in the [course methods guide](course-case-design.md#course-sources-and-the-submitted-format).

## Following a requirement to its result

**CR-6, Safety Officer review.** KAN-84-AC9 requires a fresh safety review after a relevant arrangement change. TC-06-446 starts with a confirmed event and approved Round 3, changes the setup buffer from 15 to 20 minutes and back to 15, then asks whether preparation can continue. The first connected attempt failed because restoring the values brought the old approval back. On the repaired build, the original decision remained in the history, preparation stayed blocked, and a new Round 4 decision enabled it. This traces one customer change through its AC, scenario, implementation, failure and observed recovery. [Change register](../requirements/change-requests.md) · [case and both attempts](case-catalogue/cf-06.md#tc-06-446) · [safety service](../../backend/src/modules/safety/service.ts) · [database integration test](../../database/tests/safety/safety-reviews.integration.test.ts) · [before and after evidence](evidence-index.md#follow-a-defect-through-retest)

For the remaining features and changes, the matrix identifies a concrete route into the cases and executions. The preserved CSV records use repository-relative source paths, which start in Folder 6 of the package. [All requirements](traceability-review.md) · [trace register](../requirements/traceability.csv)

## Latest retained automated results

| Run | Result and build | Source |
| --- | --- | --- |
| Local workspace checks, 1 November | 1,363 frontend tests across 63 files, 2,032 backend tests across 80 files, two browser-environment guards, type checks and builds passed. Local candidate was base `034a631` plus the recorded source manifest. | [Workspace log](../scrum/sprint-04/evidence/freeze-candidate-20261101/check.txt) · [manifest](../scrum/sprint-04/evidence/freeze-candidate-20261101/summary.json) |
| Local combined backend/database, 1 November | 2,868 tests across 123 files, including the 2,032 backend tests and 836 additional PostgreSQL tests across 43 files. | [Combined log](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined.txt) |
| Local browser runs, 1 November | 253/253 passed on each of two runs, with two workers, zero retries, zero skips and zero unexpected or flaky results in those runs. Earlier parallel navigation timeout failures are preserved. | [First](../scrum/sprint-04/evidence/freeze-candidate-20261101/browser-1.json) · [second](../scrum/sprint-04/evidence/freeze-candidate-20261101/browser-2.json) · [earlier attempts](test-evidence.md#auto-20261101-release-regressions--targeted-repairs-1-november-2026) |
| Candidate and merged-main CI | PR head `0384a3c` was tested at merge candidate `bb198fe`. Main CI tested the frozen merge `fb6d8d9` and passed the builds, coverage gates, migration/seed, combined tests and 253 browser cases. Main verification completed on 2 November at 00:08:53 SGT. The retained comparison matched 456 source hashes. | [Candidate record](../scrum/sprint-04/evidence/freeze-candidate-20261101/ci-199.json) · [merged-main record and log](evidence-index.md#from-a-question-to-the-record) |

## Measured coverage and limitations

The coverage tool counts instrumented source statements, branches, functions and lines. The table gives its reported percentages and the raw line denominator for each run. Requirement mapping, case execution and pass rates are separate measures in the [coverage and results report](coverage-results.md).

| Measured code | Statements | Branches | Functions | Lines | Lines covered / measured |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frontend, local | 96.56% | 93.41% | 98.54% | 98.92% | 3,685 / 3,725 |
| Frontend, candidate CI | 96.56% | 93.41% | 98.54% | 98.95% | 3,683 / 3,722 |
| Backend, unit/HTTP | 90.62% | 89.98% | 91.02% | 90.75% | 2,720 / 2,997 |
| Backend, combined with PostgreSQL | 99.24% | 97.88% | 99.72% | 99.46% | 2,981 / 2,997 |

The frontend local and CI measurements have different executable-line denominators. Both are preserved, with no averaging. Adding the database suite exercises transaction paths that isolated tests miss. The combined backend still has 16 uncovered lines and 53 uncovered branch arms. [Frontend local](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-coverage-summary.json) · [frontend CI](../scrum/sprint-04/evidence/freeze-candidate-20261101/ci-199-frontend-coverage.json) · [backend isolated](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-unit-coverage-summary.json) · [backend combined](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined-coverage-summary.json)

**Why the measured coverage falls short of 100%.** The local frontend report has 40 uncovered lines and 413 uncovered branch arms, including venue-block access failures, uncertain draft-submit feedback and form validation paths. The backend inventory identifies error handling and rollback paths. Some gaps are practical test candidates, including the explicitly unexecuted draft-submit variant in the design guide. Others reflect what the tools measured: the backend process entry runs as a subprocess whose coverage is outside the combined V8 report. SQL statement coverage, external-provider internals, mutation score and load/performance measurements were not recorded. A passing configurable threshold establishes only that measurement's floor. [Frontend gap inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-gaps.json) · [backend gap inventory](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined-gaps.json) · [proposed case](course-case-design.md#where-test-design-can-go-further)

## Connected walkthrough and repair evidence

On 1 November the release walkthrough combined earlier team-reported results with real-role browser observations. R01–R23 have scoped Passes. R24's functional access/logout checks also have evidence. A follow-up run exposed three problems: restoring venue settings revived an old safety approval, a pending booking left a stale Ready panel, and a cancelled equipment line displayed its old rejection reason. Later connected checks recorded repaired Passes on those three cases and verified an authentication smoke case. The original failures and their builds remain visible. [Walkthrough sources](evidence-index.md) · [four repaired-candidate checks](test-evidence.md#man-20261101-03--connected-repaired-candidate-acceptance-1-november-2026)

## Current release position

The team accepted 15 stories and 63 SP at the 31 October Sprint 4 review. The frozen merge subsequently passed CI. **TC-06-32 has a team-reported functional Pass**, including R24, before the freeze. The report does not identify the exact time or build. The earlier preparation row remains in its history. **Formal release decision: Not assessed.** The release record carries the outstanding independent review and team decision. [Full-case reconciliation](evidence-index.md#reconciling-the-full-release-case) · [Sprint 4 decision](../scrum/sprint-04/review.md) · [WS6/DOC-603](../submission/release-record.md#release-decision)

## Evidence and historical records

The [specification register](test-cases.csv), [execution register](test-executions.csv), [traceability register](../requirements/traceability.csv) and [run ledger](test-evidence.md) preserve the historical records. The [21 October combined register](archive/test-cases-2026-10-21.csv) and [earlier coverage reports](coverage-reports/README.md) retain the original checkpoints. The [walkthrough](release-e2e-walkthrough.md) and its [Word copy](release-e2e-walkthrough.docx) are reusable procedures. The [evidence index](evidence-index.md) identifies where actual observations were recorded.

## Documentation review and team handover

The 6 November WS3 documentation review checked the course examples, case and execution IDs, requirement versions, retained run logs, native coverage summaries, browser reports and CI metadata. Codex prepared the catalogue, traceability analysis and evidence cross-checks from these sources. [Workstream checklist](../submission/checklist.md#ws3-testing-and-traceability)

| Review record | Status |
| --- | --- |
| Evidence and calculations | Reviewed by Codex, 6 November 2026, using the retained records above. |
| Different team reviewer, actual date and corrections | Awaiting the team's review under DOC-301. The reviewer can check the build, suite totals, raw coverage denominators and R24 disposition using the [evidence index](evidence-index.md). |

<a id="testing-report-and-editing-guide"></a>
<a id="team-input-needed"></a>
<a id="editing-specifications-and-results"></a>
<a id="specification-template"></a>
<a id="execution-record-template"></a>
<a id="recording-a-test-run"></a>
<a id="coverage-required-by-is212"></a>

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
