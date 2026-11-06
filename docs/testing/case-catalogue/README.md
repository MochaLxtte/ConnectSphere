# Test case catalogue

Browse the 20 core features and the shared database cases below. Each specification identifies the inputs, actions, expected result and applicable criteria. Open its mapping to find the implementation and tests, then its execution record to see what happened on each build.

Several original case notes date their move between sprint task lists to **16 October**. On that date the administrative update recorded the work the team had allocated at **Sprint 3 planning on 4 October**. Case execution dates appear separately in the result records. [Planning and scope](../../scrum/sprint-03/planning.md#customer-change-chronology) · [16 October specification check](../test-evidence.md#16-october-2026-rebalanced-backlog-and-test-specification-validation)

**624 specifications** include **604 detailed cases** and **20 historical feature summaries**. All 624 IDs appear in the [230 traceability mappings](trace-index.md). The 1,214 execution-register entries include 717 Pass, 39 Fail, 1 Blocked and 457 Not executed. These are entries across builds, environments, failures and retests. Of the 604 detailed cases, **523 have at least one Pass, Fail or Blocked entry** and **81 have only preparation entries**. Feature-level summaries have no independent execution rows.

**31 October 2026 · Sprint 4 review.** Story owners reported passing all 75 checks: 72 manual cases in the sprint plan and three additional manual end-to-end procedures. Tristan later confirmed which cases each owner ran. The ledger and catalogue were updated on 6 November. The individual step observations, tested build and environment were not retained. [Case list, owners and confirmation](../sprint-4-manual-review.md) · [Review reports and source versions](../../scrum/review-testing.md)

**Pre-freeze verification.** The [case audit](../pre-freeze-case-audit.md) matched 12 whole-case results to retained automated runs. A separate [team-reported functional Pass for TC-06-32](results/cf-06.md#ex-r24-prefreeze-tc-06-32) includes R24 and is undated beyond the confirmation that it occurred before the freeze. These recovered results and the R24 report are separate from the 75 checks at the Sprint 4 review.

**Additional pre-freeze manual reports.** Tristan confirmed that the 21 cases in [the pre-freeze manual case list](../pre-freeze-manual-results.md) passed. Their test dates, builds, environments and individual step observations were not supplied. These reports add an outcome for 21 previously preparation-only cases. Each case is distinct from the earlier substantive results. The 31 October review, historical automated runs and R24 functional report stay separately identified.

| Feature | Detailed cases | Cases with a recorded outcome¹ | Preparation only | Attempts |
| --- | ---: | ---: | ---: | --- |
| [CF-01 · User Authorisation and Authentication](cf-01.md) | 14 | 14 | 0 | [Run history](results/cf-01.md) |
| [CF-02 · Event Request Creation](cf-02.md) | 33 | 33 | 0 | [Run history](results/cf-02.md) |
| [CF-03 · Draft Event Requests](cf-03.md) | 26 | 26 | 0 | [Run history](results/cf-03.md) |
| [CF-04 · Event Review and Approval](cf-04.md) | 42 | 42 | 0 | [Run history](results/cf-04.md) |
| [CF-05 · Coordinator Assignment](cf-05.md) | 51 | 51 | 0 | [Run history](results/cf-05.md) |
| [CF-06 · Event Status Management](cf-06.md) | 71 | 69 | 2 | [Run history](results/cf-06.md) |
| [CF-07 · Event Information Management](cf-07.md) | 7 | 7 | 0 | [Run history](results/cf-07.md) |
| [CF-08 · Venue Catalogue](cf-08.md) | 31 | 30 | 1 | [Run history](results/cf-08.md) |
| [CF-09 · Venue Availability Calendar](cf-09.md) | 20 | 11 | 9 | [Run history](results/cf-09.md) |
| [CF-10 · Venue Search and Filtering](cf-10.md) | 26 | 25 | 1 | [Run history](results/cf-10.md) |
| [CF-11 · Venue Suitability Checking](cf-11.md) | 16 | 16 | 0 | [Run history](results/cf-11.md) |
| [CF-12 · Venue Booking Request](cf-12.md) | 26 | 26 | 0 | [Run history](results/cf-12.md) |
| [CF-13 · Venue Booking Approval](cf-13.md) | 8 | 8 | 0 | [Run history](results/cf-13.md) |
| [CF-14 · Booking Conflict Detection](cf-14.md) | 44 | 42 | 2 | [Run history](results/cf-14.md) |
| [CF-15 · Equipment Request Management](cf-15.md) | 17 | 16 | 1 | [Run history](results/cf-15.md) |
| [CF-16 · Equipment Availability Checking](cf-16.md) | 20 | 20 | 0 | [Run history](results/cf-16.md) |
| [CF-17 · Equipment Reservation](cf-17.md) | 18 | 18 | 0 | [Run history](results/cf-17.md) |
| [CF-18 · Attendee Registration](cf-18.md) | 49 | 21 | 28 | [Run history](results/cf-18.md) |
| [CF-19 · Event Change Requests](cf-19.md) | 9 | 9 | 0 | [Run history](results/cf-19.md) |
| [CF-20 · Notification System](cf-20.md) | 70 | 33 | 37 | [Run history](results/cf-20.md) |
| [Database and integration infrastructure](infrastructure.md) | 6 | 6 | 0 | [Run history](results/infrastructure.md) |

¹ A recorded outcome includes a blocked case if an identified obstacle prevented the specified run. 28 Pass entries lack an execution date; they keep their recorded attribution and cannot be chronologically ranked against dated runs. TC-DB-206 appears under CF-08 because the source specification places it there.

## Following a case from a criterion to an outcome

| Scenario | What the evidence establishes |
| --- | --- |
| Normal workflow · [TC-17-01](cf-17.md#tc-17-01) | After the stale equipment request was refused, the operator refreshed the saved request and reserved the correct units. The 1 November connected attempt records the affected data, environment and result. [Recorded attempt](results/cf-17.md#ex-17-01-man-20261101-01-a1) |
| Invalid input · [TC-02-01](cf-02.md#tc-02-01) | In the 15 October audit a failed saved-draft submission showed a generic message. The 21 October retest verified that missing/invalid fields received specific feedback. Both results remain under one specification. [Failure and retest](results/cf-02.md#tc-02-01) |
| Boundary · [TC-11-01](cf-11.md#tc-11-01) | Attendance of zero initially produced an unknown capacity assessment. The retest distinguishes zero attendance from missing information across the rule, database and component checks. [Failure and retest](results/cf-11.md#tc-11-01) |
| Conflict · [TC-14-16](cf-14.md#tc-14-16) | The expiry/approval cases cover which transaction wins at the deadline and how competing holds affect occupancy. The 21 and 25 October executions identify the respective race scenarios. [Expiry and approval attempts](results/cf-14.md#tc-14-16) |
| Environment limitation · [TC-14-15](cf-14.md#tc-14-15) | Isolated expiry catch-up/replay passed on 21 October. The 25 October shared-environment attempt was blocked for the specified deployed schedule. Its row records the separate local behaviour observed. [Both environments](results/cf-14.md#tc-14-15) |

## Course method and source versions

The Week 4 **Test Cases & Software Architecture** slides 21–24 distinguish a reusable case from a run. The case pages follow the slide 22 order: ID, scenario, pre-conditions, steps, test data, expected result, creator and creation date. Each execution supplies the observed result, status, remarks, executor and execution date, with the run ID, build, environment and evidence added as required on slide 23. An unrecorded optional field is shown as recorded in the source.

Slides 26–32 begin with the user workflow and a successful path, then examine cross-cutting concerns, negative scenarios and values around a boundary. The examples above connect those decisions to specific cases. The Week 4 project instructions, folder 3 and “Testing and traceability” rubric, call for coverage of all core features and appropriate unit, integration and end-to-end tests of normal, boundary, conflict and failure behaviour. Week 6 *Automated Testing 1 and CI*, slide 37, treats measured coverage as a diagnostic. Week 9 *Automated Testing 2 and CD*, slides 10, 21 and 34, distinguishes an isolated unit check from an integration check with real collaborators and a small end-to-end smoke suite. The [testing report](../README.md) gives the measured percentages, denominators and remaining gaps.

The Week 7 *Guide to Managing Changes*, pp. 1–2, asks teams to revisit affected criteria and regression cases. The original notification cases TC-20-01–11 and the earlier release journey TC-06-19 retain their identifiers and scopes. The later notification split and final journey have separate specifications. All 427 identifiers from the 21 October combined register still exist in the catalogue; open a case’s source notes for its earlier fields, including the result as it stood in that snapshot. [Notification scope and transfers](../../scrum/sprint-03/sprint-backlog.md#notification-scope-preservation) · [Release walkthrough](../release-e2e-walkthrough.md)

The feature index shows the most recent dated statuses together when the register contains different outcomes on the same day. Within each case, the execution pages keep the register’s original order. The scope notes retain qualifications about reported manual checks, fixture browsers, real database tests and connected acceptance. TC-06-32 retains its preparation entry and its team-reported functional Pass. Formal release disposition is recorded separately. [Release record](../../submission/release-record.md#release-decision)

## Authoritative registers

[Case specifications](../test-cases.csv) · [Execution records](../test-executions.csv) · [Traceability](../../requirements/traceability.csv) · [Run evidence](../test-evidence.md) · [21 October historical register](../archive/test-cases-2026-10-21.csv). The catalogue reorganises those records for reading. It adds no case result, acceptance decision or new test run.
