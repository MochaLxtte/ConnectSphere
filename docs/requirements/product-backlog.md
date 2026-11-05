# Product backlog

This register is the authoritative inventory for the submitted backlog. Use it with the full story/AC cards, the [customer-change register](change-requests.md), and the [portable workbook](../submission/1/product-backlog.xlsx). The release inventory is **42 parent items / 174 SP**; archived items and unestimated subtasks are recorded separately.

## Team input needed

Complete [WS1 in the shared checklist](../submission/checklist.md#ws1-backlog-and-customer-changes). The remaining acceptance decision belongs in the [Sprint 4 review](../scrum/sprint-04/review.md), then its supported outcome can be reflected here and in the workbook. Owner/reviewer selection is in the [team workstream table](../README.md#ws1-backlog-and-customer-changes).

## How to read status and criteria

| Record | Meaning | Authoritative detail |
| --- | --- | --- |
| Story inventory, estimates, priority and relationships | Retained backlog with the last available Jira observations; **not a new live Jira export** | Master table below; dated sources in the workbook |
| Original criteria and amendments | Criterion IDs retain their original meaning; later scope identifies what it adds or supersedes | [Sprint 1](../scrum/sprint-01/sprint-backlog.md), [Sprint 2](../scrum/sprint-02/sprint-backlog.md), [Sprint 3](../scrum/sprint-03/sprint-backlog.md), [Sprint 4](../scrum/sprint-04/sprint-backlog.md) |
| Implementation and execution evidence | Later merges, repairs and checks are dated separately from sprint review reports | [Testing report](../testing/README.md) and unchanged [execution register](../testing/test-executions.csv) |
| Acceptance and velocity | Requires the recorded review decision and its evidence qualification | [Sprint reviews and release accounting](../scrum/README.md) |

The table's Jira status, owner and resolution values combine the 16 October whole-project snapshot and subsequent targeted updates. They must not be read as the present implementation state. For example, old In Progress/To Do values can coexist with later implementation and manual evidence. No administrative resolution or acceptance date is inferred from a commit.

## Sprint commitments and acceptance

| Sprint | Committed SP | Reported accepted SP | Carry-out | Source and qualification |
| --- | ---: | ---: | ---: | --- |
| 1, 6–19 September | 32 | 24 | 8 to Sprint 2 | Seven accepted stories; collective review report confirmed 26 October; demonstrated build not retained. [Review](../scrum/sprint-01/review.md) |
| 2, 20 September–3 October | 43 = 35 new + 8 carried | 24 | 19 to Sprint 3 | Seven accepted stories; five original-scope carry-overs. New customer changes do not revoke earlier original-scope acceptance. [Review](../scrum/sprint-02/review.md) |
| 3, 4–17 October | 63 | 63 | 0 reported | Thirteen accepted stories according to the 26 October report; later failures/fixes retain their own dates and historical build limitations. [Review](../scrum/sprint-03/review.md) |
| 4, 18–31 October | 63 | Not assessed | Not assessed | Fifteen selected stories; formal acceptance/closure needs a recorded team decision. [Review](../scrum/sprint-04/review.md) |

Carry-over is counted at full original points in the next sprint without increasing unique release scope. These reports do not reconstruct missing daily burndown observations.

## Master backlog register

| Priority | Jira | Story | Core feature | SP | Last recorded Jira status | Sprint(s) | Jira resolution date (+08:00) | Last recorded owner | Related Jira item |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| High | [KAN-4](https://smu-g7-grp1.atlassian.net/browse/KAN-4) | Save Draft Event Request | CF-03 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| High | [KAN-6](https://smu-g7-grp1.atlassian.net/browse/KAN-6) | Submit an Event Request | CF-02 | 3 | Done | Sprint 1, Sprint 2, Sprint 3 | Not resolved | Ernest | relates to: KAN-79 |
| High | [KAN-8](https://smu-g7-grp1.atlassian.net/browse/KAN-8) | Approve or Reject Venue Booking Request | CF-13 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83; relates to: KAN-82 |
| High | [KAN-9](https://smu-g7-grp1.atlassian.net/browse/KAN-9) | Check Equipment Availability for an Event | CF-16 | 8 | In Progress | Sprint 4 | Not resolved | Tristan | is blocked by: KAN-18; blocks: KAN-26 |
| High | [KAN-10](https://smu-g7-grp1.atlassian.net/browse/KAN-10) | Mark Event as Completed | CF-06 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-61 |
| High | [KAN-12](https://smu-g7-grp1.atlassian.net/browse/KAN-12) | Search and Filter Venues | CF-10 | 5 | Done | Sprint 2, Sprint 3 | Not recorded | Ryan | relates to: KAN-78 |
| High | [KAN-14](https://smu-g7-grp1.atlassian.net/browse/KAN-14) | Register for an Event | CF-18 | 5 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-67; is blocked by: KAN-61; blocks: KAN-17; blocks: KAN-67; relates to: KAN-80 |
| High | [KAN-15](https://smu-g7-grp1.atlassian.net/browse/KAN-15) | Submit and Review Event Change Requests | CF-07, CF-19 | 5 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-66; relates to: KAN-64; relates to: KAN-82; relates to: KAN-84; relates to: KAN-80 |
| Medium | [KAN-16](https://smu-g7-grp1.atlassian.net/browse/KAN-16) | View Event Request Status | CF-06 | 2 | Done | Sprint 1 | 2026-09-20 | Tristan | relates to: KAN-84 |
| High | [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) | Withdraw Attendee Registration | CF-18 | 2 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-67; is blocked by: KAN-14; relates to: KAN-80 |
| High | [KAN-18](https://smu-g7-grp1.atlassian.net/browse/KAN-18) | Update Equipment Availability Status | CF-16 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | blocks: KAN-9; relates to: KAN-80 |
| Highest | [KAN-24](https://smu-g7-grp1.atlassian.net/browse/KAN-24) | Setup Database | Infrastructure | 5 | Done | Sprint 1 | 2026-09-21 | Arvin | None recorded |
| Highest | [KAN-25](https://smu-g7-grp1.atlassian.net/browse/KAN-25) | User Authorisation and Authentication | CF-01 | 5 | Done | Sprint 1 | 2026-09-21 | Ryan | relates to: KAN-79; relates to: KAN-84 |
| High | [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | Reserve Equipment | CF-17 | 3 | In Progress | Sprint 4 | Not resolved | Tristan | is blocked by: KAN-9; relates to: KAN-63; blocks: KAN-61; relates to: KAN-84; relates to: KAN-80 |
| Medium | [KAN-27](https://smu-g7-grp1.atlassian.net/browse/KAN-27) | Request Clarification on an Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Irfan | None recorded |
| Medium | [KAN-29](https://smu-g7-grp1.atlassian.net/browse/KAN-29) | Automatically Assign Event Coordinator | CF-05 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | relates to: KAN-65; relates to: KAN-79 |
| Medium | [KAN-31](https://smu-g7-grp1.atlassian.net/browse/KAN-31) | Create Event Request | CF-02 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| Medium | [KAN-33](https://smu-g7-grp1.atlassian.net/browse/KAN-33) | View Submitted Event Request | CF-04 | 2 | Done | Sprint 1, Sprint 2 | 2026-10-01 | Irfan | None recorded |
| High | [KAN-34](https://smu-g7-grp1.atlassian.net/browse/KAN-34) | Resume/Edit Draft Event Request | CF-03, CF-07 | 3 | In Review | Sprint 1, Sprint 2, Sprint 3 | Not resolved | Arvin | None recorded |
| Medium | [KAN-36](https://smu-g7-grp1.atlassian.net/browse/KAN-36) | Approve/Reject Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Tristan | relates to: KAN-60 |
| Highest | [KAN-50](https://smu-g7-grp1.atlassian.net/browse/KAN-50) | Maintain Venue Catalog | CF-08 | 5 | In Progress | Sprint 2, Sprint 3 | Not recorded | Ryan | relates to: KAN-77 |
| Medium | [KAN-51](https://smu-g7-grp1.atlassian.net/browse/KAN-51) | View Venue Availability Calendar | CF-09 | 5 | Done | Sprint 2 | 2026-10-10 | Arvin | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83 |
| High | [KAN-52](https://smu-g7-grp1.atlassian.net/browse/KAN-52) | Check Venue Suitability | CF-11 | 3 | Done | Sprint 2, Sprint 3 | Not recorded | Ernest | relates to: KAN-78; relates to: KAN-82; relates to: KAN-84 |
| Medium | [KAN-53](https://smu-g7-grp1.atlassian.net/browse/KAN-53) | Submit Venue Booking Request | CF-12 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83; relates to: KAN-82 |
| Medium | [KAN-54](https://smu-g7-grp1.atlassian.net/browse/KAN-54) | Detect Venue Booking Conflicts | CF-14 | 5 | Done | Sprint 2 | 2026-10-10 | Ernest | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83 |
| Medium | [KAN-55](https://smu-g7-grp1.atlassian.net/browse/KAN-55) | Block Venue for Operational Unavailability | CF-09, CF-14 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | is duplicated by: KAN-21; relates to: KAN-78; relates to: KAN-81 |
| High | [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) | Require a reason when rejecting an event request | CF-04 | 2 | In Review | Sprint 3 | Not resolved | Irfan | relates to: KAN-36 |
| High | [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) | Confirm Event After Planning Arrangements | CF-06 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | is blocked by: KAN-26; blocks: KAN-14; relates to: KAN-62; relates to: KAN-10; relates to: KAN-84; relates to: KAN-80 |
| High | [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | Cancel Event and Release Its Arrangements | CF-06, CF-19 | 5 | To Do | Sprint 4 | Not resolved | Ryan | relates to: KAN-61; relates to: KAN-82; relates to: KAN-80 |
| High | [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | Submit and Review Event Equipment Requests | CF-15 | 5 | To Do | Sprint 4 | Not resolved | Ryan | relates to: KAN-26; relates to: KAN-84 |
| High | [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | Receive Request, Assignment and Venue Notifications | CF-20 | 5 | Done | Sprint 3 | Not resolved | Ernest | relates to: KAN-79; relates to: KAN-15; blocks: KAN-80; blocks: KAN-81; blocks: KAN-83 |
| High | [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | Reassign Event Coordinator | CF-05 | 3 | In Progress | Sprint 3 | Not resolved | Tristan | relates to: KAN-29; relates to: KAN-79 |
| High | [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | Update Event Information During Planning | CF-07 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-15 |
| High | [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | View Event Registrations | CF-18 | 2 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-14; relates to: KAN-17; is blocked by: KAN-14 |
| High | [KAN-77](https://smu-g7-grp1.atlassian.net/browse/KAN-77) | Configure Venue Setup and Turnaround Durations | CF-08; CR-1 | 2 | To Do | Sprint 3 | Not resolved | Kai Jie | relates to: KAN-50; relates to: KAN-78 |
| High | [KAN-78](https://smu-g7-grp1.atlassian.net/browse/KAN-78) | Apply Venue Buffers to Availability and Booking Conflicts | CF-09–CF-14; CR-1 | 8 | In Review | Sprint 3 | Not resolved | Arvin | relates to: KAN-77; relates to: KAN-51; relates to: KAN-12; relates to: KAN-52; relates to: KAN-53; relates to: KAN-8; relates to: KAN-54; relates to: KAN-55; blocks: KAN-81; blocks: KAN-83 |
| High | [KAN-79](https://smu-g7-grp1.atlassian.net/browse/KAN-79) | Assign Submitted Events Through a Coordinator Lead Queue | CF-01, CF-02, CF-04, CF-05; CR-5 | 8 | In Progress | Sprint 3 | Not resolved | Tristan | relates to: KAN-29; relates to: KAN-25; relates to: KAN-6; relates to: KAN-65; relates to: KAN-64 |
| High | [KAN-80](https://smu-g7-grp1.atlassian.net/browse/KAN-80) | Receive Equipment, Lifecycle, Change and Registration Notifications | CF-20 | 3 | In Progress | Sprint 4 | Not resolved | Arvin | is blocked by: KAN-64; relates to: KAN-84; relates to: KAN-18; relates to: KAN-26; relates to: KAN-15; relates to: KAN-61; relates to: KAN-62; relates to: KAN-14; relates to: KAN-17 |
| High | [KAN-81](https://smu-g7-grp1.atlassian.net/browse/KAN-81) | Recover venue arrangements affected by operational unavailability | CF-09, CF-12, CF-13, CF-14, CF-20; CR-2 | 8 | In Progress | Sprint 3 | Not resolved | Kai Jie | is blocked by: KAN-64; is blocked by: KAN-78; relates to: KAN-55; relates to: KAN-51; relates to: KAN-53; relates to: KAN-8; relates to: KAN-54; relates to: KAN-83; relates to: KAN-82 |
| High | [KAN-82](https://smu-g7-grp1.atlassian.net/browse/KAN-82) | Manage each venue arrangement independently for an event | CF-11, CF-12, CF-13, CF-14, CF-19; CR-3 | 5 | In Progress | Sprint 4 | Not resolved | Irfan | relates to: KAN-53; relates to: KAN-8; relates to: KAN-52; relates to: KAN-15; relates to: KAN-62; relates to: KAN-81; relates to: KAN-83; relates to: KAN-84 |
| High | [KAN-83](https://smu-g7-grp1.atlassian.net/browse/KAN-83) | Manage temporary venue holds with expiry and automatic release | CF-09, CF-12, CF-13, CF-14, CF-20; CR-4 | 8 | In Review | Sprint 3 | Not resolved | Irfan | is blocked by: KAN-64; is blocked by: KAN-78; relates to: KAN-53; relates to: KAN-8; relates to: KAN-51; relates to: KAN-54; relates to: KAN-81; relates to: KAN-82 |
| High | [KAN-84](https://smu-g7-grp1.atlassian.net/browse/KAN-84) | Review operational safety before event preparation | CF-01, CF-06, CF-11, CF-15, CF-17, CF-19, CF-20; CR-6 | 8 | To Do | Sprint 4 | Not resolved | Kai Jie | relates to: KAN-25; relates to: KAN-16; relates to: KAN-61; relates to: KAN-63; relates to: KAN-26; relates to: KAN-15; relates to: KAN-52; relates to: KAN-80; relates to: KAN-82 |

## Release coverage

All 20 mandatory features map to this inventory in the [requirements guide](README.md#first-release-coverage). The [change register](change-requests.md) explains the 47-point customer-change increment and the KAN-64/KAN-80 notification split. The split retains its original combined 8 SP; it is not an additional customer change.

## Archived backlog items

The following items were archived on 21 September 2026. Their history is retained, and none contributes to the 42-parent / 174-SP release inventory.

| Archived Jira item | Reason | Coverage or consequence |
| --- | --- | --- |
| KAN-21 — Block Venue for Maintenance | Duplicate of the broader KAN-55 operational-unavailability story | Mandatory reason, blocked period and calendar/conflict effects are retained in KAN-55; do not count both estimates |
| KAN-19 — Join Attendee Waiting List | Optional feature outside the selected first-release scope | KAN-14 keeps full-capacity refusal; a waiting list is not required for core registration |
| KAN-22 — Send Technical Support Requests | Optional human technical-support workflow outside the 20 core features | Equipment type, quantity and technical requirements remain covered by KAN-63 |
| KAN-23 — Assign Technical Support Staff | Optional human staffing/scheduling outside the selected first-release scope | Equipment reservation remains KAN-26; confirmation readiness must not depend on staffing assignment |

## Workbook reconciliation — 5 November 2026

The workbook's 42 parent IDs, estimates, Jira statuses and assignees match this register's retained snapshot values. The workbook remains a mixed-date repository export, not a fresh Jira read. Its Sprint 1 accepted-points summary incorrectly matched only the exact text `Accepted`, while its source rows say `Accepted 19 Sep (reported 26 Oct)`. The affected formula is corrected to match the recorded accepted labels and returns **24**. No story estimate, underlying review result, criterion or historical date changes.

Workbook context labels identify the dated source and direct readers to current evidence. Validation details are recorded in [submission folder 1](../submission/1/README.md#workbook-reconciliation).

## Historical records

[Preserved document before cleanup](archive/2026-11-05/product-backlog.md). These dated records remain supporting evidence.

<details>
<summary>Links retained for earlier references</summary>

<a id="earlier-16-october-selection--superseded-9729-allocation"></a>
[Earlier 16 October selection — superseded 97/29 allocation](archive/2026-11-05/product-backlog.md#earlier-16-october-selection--superseded-9729-allocation)

<a id="historical-master-snapshot-and-initial-proposal--1516-october-2026"></a>
[Historical master snapshot and initial proposal — 15–16 October 2026](archive/2026-11-05/product-backlog.md#historical-master-snapshot-and-initial-proposal--1516-october-2026)

<a id="sprint-2-parent-and-subtask-reconciliation--15-october-2026"></a>
[Sprint 2 parent and subtask reconciliation — 15 October 2026](archive/2026-11-05/product-backlog.md#sprint-2-parent-and-subtask-reconciliation--15-october-2026)

<a id="sprint-2-parent-and-subtask-reconciliation--11-october-2026"></a>
[Sprint 2 parent and subtask reconciliation — 11 October 2026](archive/2026-11-05/product-backlog.md#sprint-2-parent-and-subtask-reconciliation--11-october-2026)

<a id="sprint-1"></a>
[Sprint 1](archive/2026-11-05/product-backlog.md#sprint-1)

<a id="sprint-2"></a>
[Sprint 2](archive/2026-11-05/product-backlog.md#sprint-2)

<a id="original-future-backlog-wording-and-corrective-work-history"></a>
[Original future-backlog wording and corrective-work history](archive/2026-11-05/product-backlog.md#original-future-backlog-wording-and-corrective-work-history)

<a id="kan-10--mark-event-as-completed"></a>
[KAN-10 — Mark Event as Completed](archive/2026-11-05/product-backlog.md#kan-10--mark-event-as-completed)

<a id="kan-14--register-for-an-event"></a>
[KAN-14 — Register for an Event](archive/2026-11-05/product-backlog.md#kan-14--register-for-an-event)

<a id="kan-17--withdraw-attendee-registration"></a>
[KAN-17 — Withdraw Attendee Registration](archive/2026-11-05/product-backlog.md#kan-17--withdraw-attendee-registration)

<a id="kan-18--update-equipment-availability-status"></a>
[KAN-18 — Update Equipment Availability Status](archive/2026-11-05/product-backlog.md#kan-18--update-equipment-availability-status)

<a id="kan-9--check-equipment-availability-for-an-event"></a>
[KAN-9 — Check Equipment Availability for an Event](archive/2026-11-05/product-backlog.md#kan-9--check-equipment-availability-for-an-event)

<a id="kan-26--reserve-equipment"></a>
[KAN-26 — Reserve Equipment](archive/2026-11-05/product-backlog.md#kan-26--reserve-equipment)

<a id="kan-15--submit-and-review-event-change-requests"></a>
[KAN-15 — Submit and Review Event Change Requests](archive/2026-11-05/product-backlog.md#kan-15--submit-and-review-event-change-requests)

<a id="kan-60--require-a-reason-when-rejecting-an-event-request"></a>
[KAN-60 — Require a Reason When Rejecting an Event Request](archive/2026-11-05/product-backlog.md#kan-60--require-a-reason-when-rejecting-an-event-request)

<a id="kan-61--confirm-event-after-planning-arrangements"></a>
[KAN-61 — Confirm Event After Planning Arrangements](archive/2026-11-05/product-backlog.md#kan-61--confirm-event-after-planning-arrangements)

<a id="kan-62--cancel-event-and-release-its-arrangements"></a>
[KAN-62 — Cancel Event and Release Its Arrangements](archive/2026-11-05/product-backlog.md#kan-62--cancel-event-and-release-its-arrangements)

<a id="kan-63--submit-and-review-event-equipment-requests"></a>
[KAN-63 — Submit and Review Event Equipment Requests](archive/2026-11-05/product-backlog.md#kan-63--submit-and-review-event-equipment-requests)

<a id="kan-64--notify-relevant-users-about-event-workflow-updates"></a>
[KAN-64 — Notify Relevant Users About Event Workflow Updates](archive/2026-11-05/product-backlog.md#kan-64--notify-relevant-users-about-event-workflow-updates)

<a id="kan-65--reassign-event-coordinator"></a>
[KAN-65 — Reassign Event Coordinator](archive/2026-11-05/product-backlog.md#kan-65--reassign-event-coordinator)

<a id="kan-66--update-event-information-during-planning"></a>
[KAN-66 — Update Event Information During Planning](archive/2026-11-05/product-backlog.md#kan-66--update-event-information-during-planning)

<a id="kan-67--view-event-registrations"></a>
[KAN-67 — View Event Registrations](archive/2026-11-05/product-backlog.md#kan-67--view-event-registrations)

<a id="readiness-and-evidence"></a>
[Readiness and evidence](archive/2026-11-05/product-backlog.md#readiness-and-evidence)

<a id="21-october-2026--targeted-kan-78--kan-34-implementation-snapshot"></a>
[21 October 2026 — targeted KAN-78 / KAN-34 implementation snapshot](archive/2026-11-05/product-backlog.md#21-october-2026--targeted-kan-78--kan-34-implementation-snapshot)

<a id="21-october--reviewer-selection-follow-up"></a>
[21 October — reviewer selection follow-up](archive/2026-11-05/product-backlog.md#21-october--reviewer-selection-follow-up)

<a id="21-october--kan-78--kan-34-review-handoff"></a>
[21 October — KAN-78 / KAN-34 review handoff](archive/2026-11-05/product-backlog.md#21-october--kan-78--kan-34-review-handoff)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>
[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/product-backlog.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="28-october-2026--kan-62--kan-63-pr-review-repair"></a>
[28 October 2026 — KAN-62 / KAN-63 PR review repair](archive/2026-11-05/product-backlog.md#28-october-2026--kan-62--kan-63-pr-review-repair)

</details>
