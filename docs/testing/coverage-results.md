# Test coverage and execution results

## Requirements, cases and outcomes

Tristan identified the 31 October review roster and confirmed that each story owner ran their cases as written. The execution register records **75 team-reported manual Passes** for that meeting: 72 cases labelled manual in the sprint plan and three separately listed end-to-end procedures. These dated entries give 48 cases their first substantive result and add a review result to 27 existing histories. They link 37 additional AC IDs to a case with a recorded outcome. Build, environment, case captures and individual step observations remain unrecorded. [Roster and attribution](sprint-4-manual-review.md) · [Review and recording sources](../scrum/review-testing.md)

Of the 115 detailed cases with only preparation rows after the 31 October roster reconciliation, **12** now have a Pass mapped to an original pre-freeze automated run. Each mapping identifies the test, relevant assertions, build, environment and retained run output. The team also reported a functional Pass for the final end-to-end test including R24 (TC-06-32). Its exact execution date, build and individual observations were unrecorded. These 13 results bring 6 further AC IDs into the attempted-case measure. At the close of that audit, **102** detailed cases still lacked a case-level outcome. [Case-by-case audit](pre-freeze-case-audit.md) · [Reported functional result](test-evidence.md#report-prefreeze-r24--functional-release-walkthrough) · [Formal release decision](../submission/release-record.md#release-decision)

Tristan’s separate pre-freeze follow-up identifies **21 individually reported manual Passes**. Sixteen cases were selected from manual labels or named smoke procedures and five from explicit hosted/manual procedures. Tristan confirmed the manual outcomes, and executor attribution follows the documented story ownership. Two cross-story smoke checks list the relevant owners without identifying the individual operator. The team places the runs before the freeze but did not retain exact dates, tested builds, environments or case-specific step records. The ledger preserves their unknown execution dates rather than assigning them to the 31 October review or treating them as automated runs. [Manual follow-up and owner reports](pre-freeze-manual-results.md) · [Execution register](test-executions.csv)

These reports add outcomes to 21 previously preparation-only detailed cases and link four further registered AC IDs to cases with recorded outcomes. The 115-case audit records what the automated artifacts and separate functional report supported at the earlier checkpoint.

| Question | Measure | Interpretation |
| --- | ---: | --- |
| Which requirements have a mapped case? | 20/20 core features and 6/6 customer changes | Every requirement has a traceable example. A feature or change can have additional unexecuted cases. |
| Which named acceptance criteria have a mapped specification? | 415/416 across-version card IDs (99.76%) | The unmatched ID is the superseded KAN-33-AC5. The denominator includes identifiable current and historical ACs in the four sprint backlogs. |
| Which registered criteria link to an attempted case? | 396/415 registered AC IDs (95.42%) | At least one linked specification has a recorded outcome. A case can check only part of the criterion. |
| How many detailed cases have an outcome? | 523/604 (86.59%) | These cases have a Pass, Fail or Blocked entry. 81 have preparation rows only. The 20 historical summaries are outside this denominator. |
| What was the last supported result per case? | 521 Pass, 1 Fail, 1 Blocked among 523 | TC-03-01 retains the only latest Fail. The repaired regression has its own ID. TC-14-15 retains a Blocked result for the specified environment. The Pass total includes 23 cases supported only by an undated report. |
| How often did a conclusive execution row pass? | 717/756 Pass (94.84%) | The denominator is 717 Pass + 39 Fail across builds, methods and retests. One Blocked and 457 preparation rows bring the ledger to 1,214. This rate can count a case more than once. |

The largest counts of preparation-only cases are Notification System (**37/70 CF-20 cases**), Attendee Registration (**28/49 CF-18 cases**). Each specification contributes to its primary feature. [Feature-by-feature analysis](traceability-review.md#core-feature-checks)

## Code coverage on the frozen candidate

The frozen local candidate covered **3,685 / 3,725 frontend lines (98.92%)** and **2,981 / 2,997 backend lines (99.46%)** when the real PostgreSQL suites were included. The remaining 40 frontend and 16 backend lines are visible in the per-file inventories. All three configured coverage floors passed. No measured layer reached 100% on all four metrics. [Local verification manifest](../scrum/sprint-04/evidence/freeze-candidate-20261101/summary.json) · [Coverage ledger](test-evidence.md#auto-20261101-freeze-candidate--final-local-verification-1-november-2026)

On 6 November 2026 the documentation review independently summed the covered and total values for every per-file entry in the six retained local/candidate-CI summary files and checked them against their reported total. The analysis reused existing output and ran no application suite. It used the frozen-candidate inventories rather than mutable working-directory coverage output. [Traceability and case outcomes](traceability-review.md)

## Coverage by instrumented scope

Cells show **covered / measurable (reported percentage)**. Instrumentation counts executable statements, branch arms, functions and source lines. The backend scopes measure the same source twice under different suites.

| Retained measurement | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| [Frontend · local, Windows](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-coverage-summary.json) | 4,751 / 4,920 (96.56%) | 5,862 / 6,275 (93.41%) | 1,155 / 1,172 (98.54%) | 3,685 / 3,725 (98.92%) |
| [Backend unit/HTTP · local](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-unit-coverage-summary.json) | 3,123 / 3,446 (90.62%) | 2,254 / 2,505 (89.98%) | 669 / 735 (91.02%) | 2,720 / 2,997 (90.75%) |
| [Backend + PostgreSQL · local](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined-coverage-summary.json) | 3,420 / 3,446 (99.24%) | 2,452 / 2,505 (97.88%) | 733 / 735 (99.72%) | 2,981 / 2,997 (99.46%) |
| [Frontend · candidate CI, Linux](../scrum/sprint-04/evidence/freeze-candidate-20261101/ci-199-frontend-coverage.json) | 4,751 / 4,920 (96.56%) | 5,862 / 6,275 (93.41%) | 1,155 / 1,172 (98.54%) | 3,683 / 3,722 (98.95%) |
| [Backend unit/HTTP · candidate CI](../scrum/sprint-04/evidence/freeze-candidate-20261101/ci-199-backend-unit-coverage.json) | 3,123 / 3,446 (90.62%) | 2,254 / 2,505 (89.98%) | 669 / 735 (91.02%) | 2,720 / 2,997 (90.75%) |
| [Backend + PostgreSQL · candidate CI](../scrum/sprint-04/evidence/freeze-candidate-20261101/ci-199-backend-combined-coverage.json) | 3,420 / 3,446 (99.24%) | 2,452 / 2,505 (97.88%) | 733 / 735 (99.72%) | 2,981 / 2,997 (99.46%) |

Only one frontend file accounts for the local-versus-Linux line difference. DashboardPage.vue measured 32/33 lines locally and 30/30 in candidate CI. All four metrics in each backend scope agree between the retained local and candidate-CI summaries. The exact-main run passed its configured gates on merge SHA `fb6d8d9`. The file-level numbers above belong to the explicitly linked local or candidate-CI artifacts. [Dashboard page](../../frontend/src/features/system/pages/DashboardPage.vue) · [Main CI metadata](../scrum/sprint-04/evidence/freeze-candidate-20261101/main-ci.json) · [Source-hash and CI readback](test-evidence.md#ci-20261102-main--merge-readback-and-frozen-source-verification)

## What the runs measured

| Scope | Suites and denominator | Measured floors in statements / branches / functions / lines |
| --- | --- | --- |
| Frontend | 1,363 tests across 63 test files. V8 reports executable TypeScript/Vue in 94 source-file entries. The configuration excludes declarations, test files and setup/fixture helpers. | **95 / 92 / 97 / 98**. Stricter 100% rules apply to session, client, login, router and shell files. [Frontend config](../../frontend/vite.config.ts) |
| Backend isolated | 2,032 tests across 80 files. Includes unit and HTTP tests with controlled dependencies, measured against 95 backend source-file entries. Process bootstrap `src/server.ts` is excluded from instrumentation. | **90 / 89 / 91 / 90**. Supabase verifier and database pool have stricter 100% gates. [Backend config](../../backend/vitest.config.ts) |
| Backend with real PostgreSQL | 2,868 tests across 123 files, comprising the same 2,032 backend tests plus 836 tests across 43 PostgreSQL files. The 95-entry backend denominator is identical to the isolated run. | **99 / 97 / 99 / 99**. Migration, SQL and auth-provider code are outside this TypeScript instrumented denominator. [Combined config](../../vitest.backend-coverage.config.ts) |

Adding the isolated PostgreSQL suites exercised **297 more statements, 198 more branch arms, 64 more functions and 261 more lines** relative to the isolated backend run. This is the observed difference across the same instrumented source. Do not add the suite counts to obtain a project testing total. The 253 Chromium tests passed in two repetitions with two workers and zero retries. Their largely substituted API/auth boundaries supplement the coverage runs and the separate connected manual evidence. [Candidate manifest and logs](../scrum/sprint-04/evidence/freeze-candidate-20261101/)

## Where coverage falls short

| Scope | Files below 100% on at least one metric | Uncovered statements | Uncovered branch arms | Uncovered functions | Uncovered lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frontend, local | 52 of 94 | 169 | 413 | 17 | 40 |
| Backend isolated, local | 29 of 95 | 323 | 251 | 66 | 277 |
| Backend with PostgreSQL, local | 23 of 95 | 26 | 53 | 2 | 16 |

The local frontend gap inventory identifies practical missing branches in request-form validation and feedback. EventRequestForm.vue has **31 uncovered branch arms and six lines**, including invalid numeric input, 400/403 feedback and optional updates. VenueBookingPanel.vue has **25 arms and three lines**. The safety review page has **20 arms and one line**, including rendering its readiness-problem list. One negative instrumentation count in EquipmentReservationPanel.vue is retained as uncovered per the source summary. It does not represent a negative execution count. [Frontend gap inventory with source locations](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-gaps.json)

On the backend, adding database suites reduced uncovered safety-service lines from **131 to zero**, with **seven branch arms** still uncovered. The combined inventory also identifies unreachable-by-current-caller or unexercised guards, error handling and rollback paths. Examples include four lines of the current `readEventRequest` helper and unexercised clarification-state and unrelated-cookie paths. These are measurable gaps, not evidence that the behaviors failed or are impossible to exercise. [Combined gap inventory with source locations](../scrum/sprint-04/evidence/freeze-candidate-20261101/backend-combined-gaps.json)

## Unmeasured boundaries and release position

Coverage percentages describe V8-instrumented source execution. SQL migration/trigger statement coverage, the external Supabase implementation, mutation score, load characteristics and cross-device/session ordering have no comparable percentage in these reports. Browser fixtures do not exercise the external authentication provider. A passing 100% file floor also cannot establish all requirement assertions, deployment behavior or personal review. [Coverage inventories](../scrum/sprint-04/evidence/freeze-candidate-20261101/) · [Test levels](README.md#test-levels-and-environments)

The 1 November connected retest records scoped Pass results for safety approval after restoration, confirmation readiness refresh, saved cancellation reasons and real-authentication smoke. R01–R23 are separately recorded within their walkthrough boundaries. Tristan reports the final end-to-end test, including R24, passed before freeze. TC-06-32 now has an undated team-reported functional Pass. Formal sign-off on the frozen release remains open in WS6. The 31 October team acceptance of 15 Sprint 4 stories is documented in its own review. [Connected retest](evidence/MAN-20261101-03/) · [Sprint review](../scrum/sprint-04/review.md) · [Formal release record](../submission/release-record.md#release-decision)
