# Sprint 1 estimation and capacity

Sprint window: **6–19 September 2026 inclusive**, Asia/Singapore. Planning occurred on **Sunday 6 September**; review is scheduled for **Saturday 19 September**, and Sprint 2 planning for **Sunday 20 September**. Exact times remain to be confirmed in [planning](planning.md).

**Status: agreed 32-SP baseline; capacity details and supporting records to complete.** At Sprint Planning on 6 September, the team selected nine user stories totalling **27 SP**, including KAN-27, and **KAN-24 as a separate 5-SP infrastructure backlog item**. The sprint commitment is **10 items and 32 SP**. Estimates used relative sizing with KAN-33 and KAN-16 as 2-point anchors.

The [8 September decision to use Supabase for database hosting](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) does not change these estimates. KAN-24 retains 5 SP; hosted setup and verification remain part of its database-foundation work. Authentication design remains open under KAN-25.

This record documents the estimation method, comparative rationale, capacity calculation, scope decision and eventual velocity. The companion [sprint backlog](sprint-backlog.md) holds scope and acceptance criteria; [daily progress](daily-progress.md) records changes and completion evidence.

## Agreed estimation method

The team used **relative estimation**, comparing stories against **KAN-33 and KAN-16, each 2 SP**. The recorded sizes are 2, 3 and 5 SP. The comparison considered implementation effort, uncertainty, dependencies, integration and testing. Details of any voting procedure or wider point scale remain to be recorded.

Story points compare the overall size of delivering a story to the [definition of done](../definition-of-done.md): implementation effort, complexity, uncertainty, integration and testing. They are not hours, individual productivity scores or a guarantee of completion. Record the team's adoption or revision of the definition of done and any resulting estimate changes.

The two agreed anchors provide a comparison basis:

- **KAN-33, coordinator review, 2 SP:** a bounded view of an eligible request using agreed data and access contracts.
- **KAN-16, event status, 2 SP:** consistent status presentation within the shared workflow, using transitions implemented by the relevant action stories.

The table below records the estimates and their comparative rationale. Open dependencies remain visible for refinement. Preserve these estimates unless the team records a new scope or estimation decision.

For future estimation or scope changes, compare acceptance criteria, implementation, uncertainty, integration and testing against both anchors; discuss differences in assumptions and record the agreed decision. Split work if it cannot reasonably finish within the sprint. Preserve previous estimates and decision dates; do not resize completed work to improve reported velocity.

## Agreed story estimates and comparative rationale

The item selection and points below were **agreed at Sprint Planning on 6 September**. Scope labels summarise each item; attach a dated Jira export with the full titles and acceptance criteria. Customer-policy questions are linked where they affect implementation.

| Item | Scope summary | Agreed SP | Comparative rationale, uncertainty and testing |
| --- | --- | ---: | --- |
| KAN-25 | Authentication and authorization | 5 | Larger than the anchors because identity, server-side role/ownership checks and shared access contracts affect every workflow. Account provisioning and role assignment remain unresolved (Q-01, Q-02). Include allowed and denied access, invalid authentication and cross-user access tests. |
| KAN-31 | Create an event request | 3 | Adds input, validation, API and persistence beyond the review anchor. Agree event fields and the boundary with saving a draft (Q-03) so the same persistence work is not counted twice. Test successful creation, invalid input and ownership. |
| KAN-4 | Save a draft | 3 | Must preserve an incomplete request with rules distinct from submission. Uncertainty is which fields may remain incomplete (Q-03). Test incomplete saves, reload/persistence and access restrictions; share the creation contract with KAN-31. |
| KAN-34 | Edit a draft | 3 | Requires loading and updating an owned draft, preserving existing values and enforcing edit eligibility. Clarify permitted edits and states (Q-04, Q-05). Test save/reload, invalid edits, another user's draft and a request that is no longer editable. |
| KAN-6 | Submit an event request | 3 | Introduces complete validation and an authorized lifecycle transition, integrating draft work with review. Required fields and transitions remain unresolved (Q-03, Q-04). Test valid submission, incomplete data, invalid current state and denied access. |
| KAN-33 | Coordinator review | 2 | Agreed anchor: display eligible submitted request details using established data/identity contracts. Eligibility and assignment visibility remain unresolved (Q-02). Test visible details, an inaccessible request and no eligible requests. Workflow mutations belong to the linked clarification/decision stories. |
| KAN-27 | Request clarification | 3 | Adds a coordinator action, feedback persistence and a clarification transition, making it larger than read-only review. Resolve requester visibility and resubmission behavior (Q-04); notification channels are not assumed included. Test valid feedback, invalid state and unauthorized action. |
| KAN-36 | Approve or reject a request | 3 | Implements alternative authorized decisions and their resulting states. Agree eligible actors, prerequisite states and required rejection information (Q-02, Q-04). Test both decisions, denied access and invalid transitions; integrate with KAN-16. |
| KAN-16 | Display/manage event status within the agreed Sprint 1 workflow | 2 | Agreed anchor: assumes a shared state model and status presentation using transitions implemented by the action stories. Test status consistency across list/detail views and after submission, clarification and decisions. If this item instead owns additional transitions or history, record the scope and estimate impact (Q-04). |
| **Agreed business-story baseline** | **Nine stories, including KAN-27** | **27** | **5 + 3 + 3 + 3 + 3 + 2 + 3 + 3 + 2. Agreed on 6 September.** |

Question IDs refer to [customer questions](../../requirements/assumptions-and-questions.md). Link any answer to the affected acceptance criteria and estimate decision.

### Agreed infrastructure estimate

| Item | Agreed treatment / scope rationale | Effect on totals |
| --- | --- | --- |
| KAN-24, database and integration | **Separate infrastructure backlog item, agreed at 5 SP.** Shared persistence foundations, migration/seed/setup reproducibility and integration across workstreams involve more breadth and coordination than either 2-SP anchor. Review its acceptance criteria and test the shared foundation and application connection points. | **27 business-story SP + 5 infrastructure SP = 32 SP.** KAN-24 covers shared database foundations; story-specific behavior and tests stay with their functional stories. Its subtasks receive no extra points. |

The scaffold was committed on **7 September**. KAN-24 completion will be assessed against its adopted acceptance criteria and setup/test evidence. Existing scaffold components provide a starting point for the functional stories.

## Estimation-session record

The estimates were agreed during Sprint Planning on **6 September**. Add the participant details and supporting notes below. Any later estimate changes should have their own dated decision record.

| Field | Record |
| --- | --- |
| Session date/time and timezone | Sunday 6 September 2026, Asia/Singapore; exact time pending |
| Facilitator and participants | Pending |
| Absent participants and follow-up | Pending |
| Method and reference stories | Relative estimation; KAN-33 = 2 SP and KAN-16 = 2 SP |
| Wider point scale and voting procedure, if used | To record |
| Definition of done and backlog version reviewed | Pending |
| Assumptions/customer answers considered | Pending |
| Decision meeting | Sprint Planning, 6 September 2026 |
| Supporting notes or estimation-tool export | To attach |

| Item | Agreed SP | Team discussion / disagreement record | Evidence status |
| --- | ---: | --- | --- |
| KAN-25 | 5 | Further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-31 | 3 | Further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-4 | 3 | Further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-34 | 3 | Further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-6 | 3 | Further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-33 | 2 | Reference story. Post-implementation justification (Irfan, 11 September): matches the anchor definition — one scoped read query (list) plus one scoped read query (detail), no state mutation and no cross-table write. Complexity comes from *authorization*, not mechanics: every row must pass an explicit visibility policy (KAN-29/Q-02 still unresolved), and drafts/already-decided requests must be masked identically to unauthorized ones so a client can't distinguish "doesn't exist," "not yours," and "not reviewable yet." That masking logic and its edge cases (empty queue, draft, approved, rejected, non-coordinator actor, malformed ID) are what the 2 SP anchor is meant to represent — bounded scope, but not trivial. Confirmed no re-estimate needed once implemented. | Agreed 6 September; implementation justification added 11 September |
| KAN-27 | 3 | Further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-36 | 3 | Further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-16 | 2 | Reference story; further discussion notes to add | Agreed 6 September; supporting notes to attach |
| KAN-24 | 5 | Separate infrastructure item; further discussion notes to add | Agreed 6 September; supporting notes to attach |

**Voting record, if applicable:** attach any votes captured during estimation, including the item, date, participants, differing assumptions and final estimate. If estimates were agreed through discussion without voting, record `Not applicable`.

## Capacity for 6–19 September

The team has **six developers: Ryan, Ernest, Kai Jie, Irfan, Tristan and Arvin**. One also serves as Scrum Master and another as Product Owner; these two role holders remain to be confirmed. Members are available on Saturday/Sunday for the agreed review and planning events. Record development hours separately, taking other coursework, employment, leave and realistic working slots across the **14 calendar days** into account.

Use one consistent calculation per member:

**Usable delivery hours = gross project availability − meeting hours within that availability − absence/unavailable hours within that availability.**

Meeting and absence deductions must not overlap. If an unavailable period was already excluded from gross availability, do not deduct it again. Include ceremonies and other project meetings once. Keep the initial capacity plan and dated updates so that changes in availability remain visible.

| Workstream | Member name | Gross availability (h) | Meetings (h) | Absences/unavailable time not already excluded (h) | Usable delivery hours | Availability basis / constraints |
| --- | --- | --- | --- | --- | --- | --- |
| Authentication and authorisation | Ryan | Pending | Pending | Pending | Pending | Pending |
| Event creation and draft saving | Ernest | Pending | Pending | Pending | Pending | Pending |
| Draft editing and submission | Kai Jie | Pending | Pending | Pending | Pending | Pending |
| Coordinator review and clarification | Irfan | Pending | Pending | Pending | Pending | Pending |
| Approval/rejection and status | Tristan | Pending | Pending | Pending | Pending | Pending |
| Database and integration | Arvin | Pending | Pending | Pending | Pending | Pending |
| **Team total** | **Six developers** | **Pending** | **Pending** | **Pending** | **Pending** | **Calculate after development availability is recorded** |

Code review, integration, testing, fixing defects and maintaining required evidence are delivery work that must fit within usable hours. Make room for them when selecting tasks; do not allocate every hour to feature coding. Record any explicit contingency reserve below as part of the usable total, so it is not deducted a second time.

| Capacity decision | Actual team decision |
| --- | --- |
| Event availability | Saturday/Sunday for agreed review/planning events; exact durations to confirm |
| Development availability confirmed by each member, with date | Pending |
| Scrum Master / Product Owner duties within the six developers' availability | Role-holder names and time allowance pending; count these duties once |
| Integration/testing/review arrangements and contingency within usable hours | Pending |
| Support needed for database, authorization or another shared dependency | Pending |
| Task-level workload check against the available hours, if used | Pending |
| What makes the selected scope feasible for this team's experience and availability | Pending |

As this is Sprint 1, there is **no measured sprint velocity yet**. The 32-SP commitment is the team's initial forecast and should be checked against tasks, availability and dependencies. Story points measure relative size; any task-hour estimates are a separate planning aid.

## Scope and commitment decision

The team agreed **10 backlog items at 32 SP: nine business stories at 27 SP, including KAN-27, plus KAN-24 at 5 SP**. The capacity calculation remains open. Complete the availability and dependency checks in [planning](planning.md), then record any resulting scope adjustment against the original baseline.

| Committed scope | Total | Status |
| --- | ---: | --- |
| Nine agreed business stories | 27 SP | Agreed at planning; KAN-27 is included. |
| KAN-24, separate infrastructure backlog item | 5 SP | Agreed at planning; detailed acceptance criteria remain for review. |
| **Accepted Sprint 1 baseline, 10 items** | **32 SP** | **Agreed on 6 September; capacity details to complete. Completion will be assessed at sprint close.** |

KAN-27 is committed Sprint 1 work. Any later deferral is a dated change to the agreed sprint scope and must preserve traceability to the release requirement.

| Baseline decision | Record |
| --- | --- |
| Recorded sprint goal | Enable an organiser to securely create, save and submit a request and a coordinator to review and reach an outcome; see [planning](planning.md) |
| Actual commitment date/time and participants | Planning held 6 September; exact time and named participants pending |
| Accepted item IDs and estimates | Nine business stories plus KAN-24 listed above, agreed on 6 September; dated Jira snapshot to attach |
| **Original committed total, P0** | **32 SP = 27 business-story SP + 5 infrastructure SP** |
| Capacity-based rationale, constraints and fallback | Pending |
| Meeting and backlog records | Sprint Planning decisions on 6 September; supporting notes and Jira snapshot to attach |

Preserve the first accepted backlog and estimates. Record additions, removals, splits and estimate changes in the [daily progress scope-change log](daily-progress.md), including actual date, reason, agreed impact on the goal and before/after SP. Supporting tasks remain visible even when unpointed. Do not silently replace the baseline with the latest scope.

## Completion, velocity and interpretation

At sprint close, count an item only when its full agreed acceptance criteria and definition of done are met, with evidence in the [review](review.md). Do not award partial points for a half-finished story, merged placeholder or passing scaffold check. Return unfinished work to the product backlog and record the next decision; it is not automatically committed to Sprint 2.

| Metric | Definition | Sprint 1 actual |
| --- | --- | --- |
| Original commitment, P0 | Sum of agreed SP in the first accepted sprint baseline. Keep the business-story and infrastructure components visible. | **32 SP: 27 business-story SP + 5 infrastructure SP** |
| Scope movement | Dated additions, removals and estimate changes, each shown separately in the same unit. | Pending |
| Latest agreed scope, Pclose | Original baseline adjusted by the logged scope movements at close. | Pending |
| Completed original commitment, D0 | Sum of original baseline estimates for baseline PBIs fully Done by close, including KAN-24 if Done; show splits and mappings explicitly. Removed or unfinished original scope is not completed commitment. | Pending |
| Original commitment completed | D0 / P0 × 100%, only when P0 is known and nonzero. State the denominator. | Pending |
| Completed agreed scope, Dclose | SP for whole Done items in the agreed sprint scope, including accepted additions. Explain estimate changes and the counting basis. | Pending |
| Latest scope completed | Dclose / Pclose × 100%, only when Pclose is known and nonzero. Show this separately from original commitment completion. | Pending |
| Business-story velocity | SP of fully Done business stories accepted into Sprint 1, counted once. Report separately from infrastructure so the delivered customer behavior is visible. | Pending — measured after close |
| Infrastructure points completed | KAN-24's 5 SP only if the whole accepted infrastructure item meets its definition of done; no extra points for its subtasks. | Pending — measured after close |
| **Actual combined Sprint 1 velocity** | **Total SP of fully Done accepted backlog items, counted once: business-story velocity + completed infrastructure points. Normally Dclose; explain any reconciliation with scope changes. Compare it with the combined 32-SP baseline, not the 27-SP story-only denominator.** | **Pending — measured after close** |
| Unfinished work | IDs, remaining acceptance criteria, blockers and backlog disposition; no partial-SP credit. | Pending |

For progress reporting, show the starting baseline, scope changes and dated completion records. Annotate removals separately from completed work. Leave unrecorded results as `Pending`; enter zero when supported by the board or completion record.

Use the observed Sprint 1 velocity, capacity differences, carryover and dependency issues in the [retrospective](retrospective.md) to inform Sprint 2. Keep the treatment of infrastructure and the relative scale consistent across sprints, reporting business-story and combined totals transparently. One sprint is an initial observation, not a stable delivery rate. Link the actual notes, backlog snapshots and calculations through the [evidence index](evidence/README.md).
