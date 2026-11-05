# Sprint 1 estimation and capacity

**Retained scope:** 10 PBIs / 32 SP. **Reported outcome:** 7 accepted / 24 SP; KAN-6, KAN-33 and KAN-34 carried / 8 SP.

## Team input needed

Workstream 4: edit [Estimation evidence](#estimation-evidence) and [Actual capacity](#actual-capacity). Use the [shared evidence checklist](../../submission/checklist.md#ws4-sprint-1-and-2) for missing sources and completion conditions. Preserve **Not recorded**, **To agree**, **Not executed** or **Not assessed** until a source supports a replacement.

## Estimation evidence

| Field | Supported record / team entry |
| --- | --- |
| Method and anchors | Relative sizing; KAN-33 and KAN-16 are retained 2-SP reference stories |
| Session date / participants | Not recorded for the sizing discussion separately from meeting attendance |
| Individual votes / disagreement evidence | Not recorded |
| Final agreement source | Retained point baseline below; missing original sizing evidence remains Not recorded |

The newly supplied [planning notes, pp. 3–4](evidence/documentation-tasks-20261105.pdf) describe Fibonacci planning poker, View event status = 2, and the 8-versus-10 SP/person discussion. Their provisional figures differ from the final baseline. This supplies method/discussion evidence, not individual ballots or authority to replace final estimates. See [the discrepancy record](planning.md#supplied-planning-notes--5-november-2026).

## Selected estimates

The table retains the selected values and their recorded rationale. Rationale describing unfinished implementation is historical planning context; current verification is in the [testing report](../../testing/README.md). Earlier hosted-only evidence references are superseded by the [25 October local acceptance policy](../definition-of-done.md); they are retained here only as original estimate context.

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

### Infrastructure estimate

| Item | Agreed treatment / scope rationale | Effect on totals |
| --- | --- | --- |
| KAN-24, database and integration | **Separate infrastructure backlog item, agreed at 5 SP.** Shared persistence foundations, migration/seed/setup reproducibility and integration across workstreams involve more breadth and coordination than either 2-SP anchor. Review its acceptance criteria and test the shared foundation and application connection points. | **27 business-story SP + 5 infrastructure SP = 32 SP.** KAN-24 covers shared database foundations; story-specific behavior and tests stay with their functional stories. Its subtasks receive no extra points. |

The scaffold was committed on **7 September**. KAN-24 completion will be assessed against its adopted acceptance criteria and setup/test evidence. Existing scaffold components provide a starting point for the functional stories.

## Actual capacity

Fill from retained availability discussions or a clearly dated team report. Points are relative size, not hours; the planning heuristic does not establish actual availability.

| Member | Available hours / days | Known absence or constraint | Source and date |
| --- | --- | --- | --- |
| Arvin | Not recorded | Not recorded | Not recorded |
| Ernest | Not recorded | Not recorded | Not recorded |
| Irfan | Not recorded | Not recorded | Not recorded |
| Kai Jie | Not recorded | Not recorded | Not recorded |
| Ryan | Not recorded | Not recorded | Not recorded |
| Tristan | Not recorded | Not recorded | Not recorded |

## Re-estimates and interpretation

Preserve existing estimates. Record a supported revision as old value → new value, reason, participants, date and evidence; missing agreement stays **To agree**. Original values and earlier allocation discussions remain in the history below.

| Story | Old → new SP | Reason | Participants / agreement date | Evidence |
| --- | --- | --- | --- | --- |
| Additional revision | Not recorded | Not recorded | To agree | Not recorded |

Use the [review disposition](review.md) for accepted/carry-over totals and the [release accounting](../release-burndown.md) for cross-sprint interpretation. Missing daily observations cannot be derived from final totals.

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/estimation-and-capacity.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="agreed-estimation-method"></a>

[Agreed estimation method](archive/2026-11-05/estimation-and-capacity.md#agreed-estimation-method)

<a id="agreed-story-estimates-and-comparative-rationale"></a>

[Agreed story estimates and comparative rationale](archive/2026-11-05/estimation-and-capacity.md#agreed-story-estimates-and-comparative-rationale)

<a id="agreed-infrastructure-estimate"></a>

[Agreed infrastructure estimate](archive/2026-11-05/estimation-and-capacity.md#agreed-infrastructure-estimate)

<a id="estimation-session-record"></a>

[Estimation-session record](archive/2026-11-05/estimation-and-capacity.md#estimation-session-record)

<a id="capacity-for-619-september"></a>

[Capacity for 6–19 September](archive/2026-11-05/estimation-and-capacity.md#capacity-for-619-september)

<a id="scope-and-commitment-decision"></a>

[Scope and commitment decision](archive/2026-11-05/estimation-and-capacity.md#scope-and-commitment-decision)

<a id="completion-velocity-and-interpretation"></a>

[Completion, velocity and interpretation](archive/2026-11-05/estimation-and-capacity.md#completion-velocity-and-interpretation)

<a id="closeout-and-sprint-2-planning-implications--21-september"></a>

[Closeout and Sprint 2 planning implications — 21 September](archive/2026-11-05/estimation-and-capacity.md#closeout-and-sprint-2-planning-implications--21-september)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/estimation-and-capacity.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

</details>
