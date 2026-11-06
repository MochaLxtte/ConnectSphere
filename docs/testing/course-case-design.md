# How the test cases were designed

The course starts with a user workflow and its acceptance criteria. Each test fixes the starting state, supplies concrete inputs and actions, and states an outcome that another tester can recognise. The examples below apply that approach to ConnectSphere. The design explanations were prepared on 6 November from the existing cards and runs.

## Course sources and the submitted format

| IS212 source | Teaching used in Folder 3 |
| --- | --- |
| Week 4, *Test Cases & Software Architecture*, PDF pp. 16, 21–26, 28–35, 40–43 | Slide 22 gives the specification fields in order: ID, scenario, preconditions, steps, data, expected result, optional author/date. Execution adds actual result, status, remarks and optional executor/date. Page 23 adds the build, environment and evidence for each run. Page 24 derives preconditions, action and expected result from Given/When/Then. Pages 26–32 cover the happy path, cross-cutting expectations, negative testing, equivalence partitioning and boundary values. |
| Week 6, *Automated Testing #1; Continuous Integration*, pp. 17–21, 36–46, and the Week 6 CI lab | Compare expected behaviour against the requirement, select a suitable level in the testing pyramid and use repeatable fixtures. Coverage counts executed code. An assertion about the returned state or persisted effect is also needed. The retained CI reports identify their builds, thresholds and measured source. |
| Week 9, *Automated Testing #2; Continuous Delivery*, pp. 10–14 and 20–33, and the Week 9 gated-release lab | Identify the real and substituted dependencies for each test. Verify writes against a real test database when persistence or concurrency matters. Use a small number of browser journeys for integrated behaviour. Record timeouts and retries so that a later green run can be interpreted in context. |
| Week 4 *Project Instructions*, Folder 3 and testing rubric; Week 7 *Guide to Managing Changes*, pp. 1–3 | Trace important criteria to meaningful unit, integration or end-to-end checks across all 20 features. Include normal, boundary, conflict and failure cases. Keep a changed rule linked to its former version and check affected behaviour for regressions. |

The [case catalogue](case-catalogue/README.md) follows the Week 4 fields and attaches the corresponding execution history. Stable case IDs join the original specifications to results and trace rows. Where an original record gives only a reported outcome, the catalogue preserves that level of detail. [Specifications](test-cases.csv) · [executions](test-executions.csv) · [requirement map](traceability-review.md)

## Selecting inputs and checking outcomes

| Design choice | ConnectSphere test | What the evidence establishes |
| --- | --- | --- |
| **Equivalence partitions** | For KAN-60, an assigned coordinator rejects a reviewable request. Missing, null, empty and whitespace-only reasons belong to the invalid class. A nonblank reason belongs to the valid class. The negative cases check both refusal and absence of side effects. | The automated run recorded HTTP 400 for each invalid input and unchanged request status, reviews, history and notifications. A nonblank reason saved. [TC-04-01](case-catalogue/cf-04.md#tc-04-01) |
| **Boundary values** | Venues A and B hold 100 and 50 people. Search with the other filters held constant. At 50 both should match, at 100 only A should match, and at 101 neither should match. The last two inputs distinguish “at least” from “greater than”. | The 3 October manual result was reported as a Pass. The individual returned IDs were not retained. They belong to the expected-result field, whereas the execution records the reported result. [TC-10-202](case-catalogue/cf-10.md#tc-10-202) |
| **Failure feedback** | A saved draft receives a submission response with duplicate missing fields and overlapping field errors. Check the three visible messages and their order, including retention of the server’s capacity message. | The component run recorded the three displayed messages. Its controlled error response isolates the UI behaviour. [TC-02-10](case-catalogue/cf-02.md#tc-02-10) |
| **Conflicting writes and adjacency** | Start two overlapping equipment reservations of three units each against stock of five, then exercise periods that meet at noon. Compare committed rows, occupied stock and notifications. | The 26 October run recorded one reservation and one conflict for the overlapping writes. Adjacent and disjoint periods succeeded without over-allocation. [TC-17-02](case-catalogue/cf-17.md#tc-17-02) · [PostgreSQL test](../../database/tests/equipment/reservations.integration.test.ts) |
| **Last-place registration** | Two eligible attendees request the one remaining place concurrently. A successful response must agree with stored capacity and the acknowledgement. Only the committed outcome should notify managers. | The case retains a preparation row and two subsequent automated Passes. Each attempt identifies its run, so a later rebuild does not count as a second designed case. [TC-18-04](case-catalogue/cf-18.md#tc-18-04) |
| **Change to a business rule** | The original assignment story selected a coordinator automatically. Under CR-5, an organiser can submit a complete request even if no coordinator is available. It should remain submitted and unassigned for the Lead. The two expected outcomes apply to different requirement versions. | The localhost result for the revised rule was reported as a Pass, with detailed output unrecorded. The original KAN-29 and changed KAN-79 have separate criteria. [TC-05-02](case-catalogue/cf-05.md#tc-05-02) · [change history](../requirements/change-requests.md) |
| **Regression after a state change** | Start with an approved safety round, change the venue setup buffer from 15 to 20 minutes, then restore it to 15. Preparation must still require a fresh officer decision even though the final numbers match the original values. | The first connected run revived the old approval. On the repaired candidate the same sequence, with no intervening read, kept preparation blocked until Round 4 was approved. [TC-06-446](case-catalogue/cf-06.md#tc-06-446) · [repair evidence](evidence-index.md#follow-a-defect-through-retest) |

## Where test design can go further

One practical next test is the uncertain outcome of submitting a saved draft. This is a **6 November design extension, unexecuted**. It exercises the retry rule in KAN-6-AC4 and a frontend branch identified in the coverage report. It adds no historical case, attempt or Pass to the registers. [Sprint 3 requirements](../scrum/sprint-03/sprint-backlog.md) · [uncovered frontend paths](../scrum/sprint-04/evidence/freeze-candidate-20261101/frontend-gaps.json)

| Specification field | Proposed follow-up |
| --- | --- |
| Test case ID and scenario | WS3-DESIGN-01 · A submit response is lost after the server has accepted a draft. |
| Preconditions | An authorised organiser owns one valid saved draft. Record its event ID, status and submission-history count. Use an isolated setup where a response can be withheld after the transaction commits. |
| Test steps | Open the saved draft, submit once, withhold the response and inspect the guidance. Reconnect and reopen the same event. Check its status and history. Attempt submission again through the authorised route and compare the stored state with the first readback. |
| Test data | One complete draft, one organiser and one event ID throughout. Withhold the first response only. |
| Expected result | The client communicates uncertainty and allows the organiser to check the saved outcome. The event shows the committed submission after reload. A repeat attempt produces no duplicate submission effects. |
| Actual result and execution status | Not executed. No run, build, date or executor is claimed for this variant. |

This example separates a testable branch from a known defect. The existing defect and retest examples above have actual execution records.
