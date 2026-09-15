# Sprint 1 review and closure

Sprint: **6–19 September 2026**, inclusive, Asia/Singapore. **Status: scheduled.** Complete the meeting details, demo results and backlog decisions during the review on 19 September.

| Meeting detail | Record |
| --- | --- |
| Scheduled date | Saturday 19 September 2026; time to confirm |
| Actual date, start/end time and timezone | [Record after meeting] |
| Facilitator and note taker | [Names] |
| Attendees and roles | [Names and roles; identify stakeholders actually present] |
| Absent stakeholders and feedback follow-up | [Names, follow-up owner/date, or none] |
| Reviewed application version | [Git commit, environment and test data version] |
| Review evidence | [Link E13 in the evidence register; recording optional for Sprint 1] |

## Purpose and agenda

Inspect the integrated increment against the Sprint 1 goal recorded in [planning](planning.md): an organiser can authenticate, create, save and edit a draft, submit it for coordinator review, receive clarification and view the resulting approval or rejection. Review feedback will inform Sprint 2 Planning on **Sunday 20 September**.

Suggested 45-minute agenda: recap goal and scope (5 minutes), demonstrate working stories and important failure cases (20 minutes), discuss stakeholder feedback and unfinished work (15 minutes), and agree backlog follow-ups (5 minutes). Record the actual timing, participation and decisions.

## Demo preparation

- [ ] Record the exact build/commit and run the repository setup and checks documented in the root README. Link the actual results.
- [ ] Confirm authentication, coordinator visibility, mandatory submission fields and legal transitions against the accepted story criteria and recorded customer clarifications.
- [ ] Prepare fictional test users: Organiser A, Organiser B who has no relationship to A's event, a permitted Coordinator, and an Attendee. Keep credentials outside committed evidence.
- [ ] Prepare separate fictional requests for draft, approval and rejection scenarios, with no venue/equipment bookings or other real-world effects. Record reproducible fixture IDs and reset instructions: [link].
- [ ] Ensure the coordinator is eligible to review the demonstrated request under the agreed access policy. If assignment is outside this sprint, document the agreed demo setup rather than claiming assignment functionality is complete.
- [ ] Link every demonstrated story to acceptance criteria, implementation and executed tests. Include failures and limitations in the review.

The shared status model includes `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, and `REJECTED`. The implemented initial-decision path allows the assigned coordinator to approve/reject a `SUBMITTED` request without a recorded decision, with an optional reason. Broader review/clarification transitions remain open questions. Follow the [API contract](../../architecture/api-contract.md) and update story criteria if the policy changes.

The 15 September [development test record](../../testing/test-evidence.md) includes a hosted approval/status check. It is separate from the scheduled review and does not fill any demonstration outcome below.

## Demo run sheet

Demo outcomes are **NOT EXECUTED** until the review. Record PASS, FAIL, BLOCKED or NOT DEMONSTRATED with the observed behavior and supporting evidence. Assess completion separately against the acceptance criteria and Definition of Done.

| ID / story | Actions and expected behavior, subject to agreed criteria | Actual outcome / observation / evidence |
| --- | --- | --- |
| DEMO-01 / KAN-25 | Sign in as Organiser A using a valid account. Confirm authenticated identity; use an invalid login and check that no session is created. End the session and verify a protected operation is denied. | NOT EXECUTED |
| DEMO-02 / KAN-31, KAN-4 | As Organiser A, create a fictional "Community Welcome Session" request with an intentionally incomplete permitted field set. Save it as `DRAFT`; reload and show persisted values and ownership. | NOT EXECUTED |
| DEMO-03 / KAN-34 | Reopen A's draft, edit a permitted field, save, then reload and show the change. Confirm omitted fields remain unchanged under the agreed edit contract. | NOT EXECUTED |
| DEMO-04 / KAN-6 | Omit a field that the team/customer has confirmed is mandatory at submission. Attempt submission; show actionable validation and that the request remains `DRAFT`. Record the exact tested field and source of its rule. | NOT EXECUTED |
| DEMO-05 / KAN-6 | Complete all agreed mandatory fields and submit. Show persisted `SUBMITTED` status and that the request enters the permitted coordinator's review scope. | NOT EXECUTED |
| DEMO-06 / KAN-33 | As the permitted Coordinator, inspect the submitted request and the available review details. Confirm the incomplete draft from a separate fixture does not enter the review queue. Show `UNDER_REVIEW` only if that transition is agreed and implemented. | NOT EXECUTED |
| DEMO-07 / KAN-36, KAN-16 | Approve one submitted/reviewable fixture; reject a separate one, recording a reason if required by the agreed criteria. Sign in as the corresponding organiser and show the persisted `APPROVED` or `REJECTED` outcome and permitted decision details. | NOT EXECUTED |
| DEMO-08 / KAN-25 and affected event stories | Attempt direct event retrieval/edit/submission/review as an unauthenticated caller and as Organiser B or an unrelated Attendee. Show the agreed denied response without leaking event details or changing data. Include API evidence, not only hidden UI controls. | NOT EXECUTED |
| DEMO-09 / KAN-36 | Repeat a completed decision request and attempt a conflicting second decision. Show the agreed idempotent or rejected result and verify no duplicate/conflicting decision or unintended status change. Record the chosen contract. | NOT EXECUTED |
| DEMO-10 / KAN-27 | Coordinator requests clarification, organiser can see it, and the agreed next step works. Use `CLARIFICATION_REQUESTED` only if confirmed as the workflow contract. KAN-27 is committed Sprint 1 scope. | NOT EXECUTED |

If a rule remains unresolved, mark the affected scenario BLOCKED and record a customer question. Do not change the expected outcome after a failure solely to make the demo pass. Connect demo evidence to the formal test results in [testing](../../testing/README.md); a manual review is not a substitute for test coverage.

## Inspect the sprint outcome

Assess completion against the team's adopted [definition of done](../definition-of-done.md), recording its version here: [link/version]. Record review feedback and Product Owner acceptance separately.

| Story / task | Agreed scope at start / change reference | Done, unfinished, removed or not selected | Acceptance criteria and DoD evidence | Remaining work / backlog link |
| --- | --- | --- | --- | --- |
| KAN-25 — authentication and authorization | Committed, 5 points | [Unassessed] | [Evidence] | [Record] |
| KAN-31 — event creation | Committed, 3 points | [Unassessed] | [Evidence] | [Record] |
| KAN-4 — saving a draft | Committed, 3 points | [Unassessed] | [Evidence] | [Record] |
| KAN-34 — editing a draft | Committed, 3 points | [Unassessed] | [Evidence] | [Record] |
| KAN-6 — submitting a request | Committed, 3 points | [Unassessed] | [Evidence] | [Record] |
| KAN-33 — coordinator review | Committed, 2 points | [Unassessed] | [Evidence] | [Record] |
| KAN-27 — clarification | Committed, 3 points | [Unassessed] | [Evidence] | [Record] |
| KAN-36 — approval and rejection | Committed, 3 points | [Unassessed] | [Evidence] | [Record] |
| KAN-16 — organiser event status | Committed, 2 points | [Unassessed] | [Evidence] | [Record] |
| KAN-24 — database/integration PBI | Separately committed, 5 points | [Unassessed] | [Evidence] | [Record] |
| KAN-29 — conditional item | Not committed; conditional | Not selected unless a dated scope change is agreed | [If later selected] | [Record] |

The commitment agreed at Sprint Planning on 6 September is **10 PBIs, 32 points**: nine user stories totalling 27 points and KAN-24 estimated separately at 5 points. Attach the original Jira backlog export and check its titles against this record. Add any scope changes with links to the decisions, and link owners and reviewers to their tasks and PRs.

| Measure | Actual value / evidence |
| --- | --- |
| Sprint goal outcome | [Achieved / partially achieved / not achieved, with demonstrated evidence and limitations] |
| Original committed points | **32 points across 10 PBIs**, agreed at Sprint Planning on 6 September; see estimation and capacity record |
| Added and removed unfinished PBI points | [Separate cumulative amounts and dated change references; retain completed items in scope history] |
| Net estimate changes | [Cumulative signed differences for agreed revisions to unfinished items; separate from additions/removals] |
| Final in-scope PBI points | [32 + added − removed unfinished + net estimate changes] |
| Done PBI points / actual velocity | [Blank until closure; sum only Done PBIs using each item's latest agreed estimate before completion] |
| Unfinished in-scope points | [Final in-scope − Done, reconciled to PBI rows] |
| Technical PBI and supporting task completion | [KAN-24 earns its separately committed 5 points only if Done; do not add points again for its subtasks. KAN-29 requires a recorded scope decision and estimate to count.] |
| Remaining defects or limitations | [Issue links, impact and disposition] |

Reconcile scope, estimates and velocity with [estimation and capacity](estimation-and-capacity.md), the [daily burndown](daily-progress.md) and the [sprint backlog](sprint-backlog.md). Keep the original commitment at 32 points. Estimates normally remain stable; count any agreed revision once as a signed difference, and report completion of the original commitment separately using its original estimates. Return unfinished work to the product backlog for consideration at Sprint 2 Planning on **Sunday 20 September**.

## Stakeholder feedback and backlog decisions

| Feedback ID | Actual contributor / date | Observation, request or question | Affected story / evidence | Team response and backlog change | Follow-up owner / date |
| --- | --- | --- | --- | --- | --- |
| [Add after review] | [Record] | [Record, distinguish quote from paraphrase] | [Link] | [Accepted, deferred, clarified or declined with reason] | [Record] |

Stakeholder assessment of the demonstrated increment: [Record feedback]. If stakeholders cannot attend, record the follow-up route, owner and due date.

## Closure checklist

- [ ] Record the actual review date, participants, reviewed commit and results.
- [ ] Capture the end-of-sprint board and dated burndown before starting the next sprint; preserve the original baseline.
- [ ] Reconcile Done/unfinished stories, scope changes and actual velocity against the tracking tool.
- [ ] Link executed tests, CI and demo evidence; record any checks that were not run.
- [ ] Put unfinished work and stakeholder requests into the product backlog with an owner for refinement.
- [ ] Update the [evidence register](evidence/README.md), requirement traceability and relevant architecture records.
- [ ] Carry factual process observations into the [retrospective](retrospective.md).
