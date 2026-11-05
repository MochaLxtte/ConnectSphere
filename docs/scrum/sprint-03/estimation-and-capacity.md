# Sprint 3 estimation and capacity

**Retained scope:** 13 stories / 63 SP. **Reported outcome:** 13 accepted / 63 SP; no carry-over, according to the team report.

## Team input needed

Workstream 5: edit [Estimation evidence](#estimation-evidence) and [Actual capacity](#actual-capacity). Use the [shared evidence checklist](../../submission/checklist.md#ws5-sprint-3-and-4) for missing sources and completion conditions. Preserve **Not recorded**, **To agree**, **Not executed** or **Not assessed** until a source supports a replacement.

## Estimation evidence

| Field | Supported record / team entry |
| --- | --- |
| Method and anchors | Relative sizing; KAN-33 and KAN-16 are retained 2-SP reference stories |
| Session date / participants | Not recorded for the sizing discussion separately from meeting attendance |
| Individual votes / disagreement evidence | Not recorded |
| Final agreement source | Retained point baseline below; missing original sizing evidence remains Not recorded |

The 63-SP allocation was recorded through the delegated 16 October planning process. Team planning-poker ballots and independent confirmation of the estimates remain **Not recorded / To agree** in the retained record. Equal sprint totals do not demonstrate equal effort or capacity.

## Selected estimates

The table retains the selected values and their recorded rationale. Rationale describing unfinished implementation is historical planning context; current verification is in the [testing report](../../testing/README.md). Earlier hosted-only evidence references are superseded by the [25 October local acceptance policy](../definition-of-done.md); they are retained here only as original estimate context.

| Jira | Story | SP | Rationale / estimate history |
| --- | --- | ---: | --- |
| KAN-6 | Submit an Event Request | 3 | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-12 | Search and Filter Venues | 5 | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-34 | Resume/Edit Draft Event Request | 3 | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-50 | Maintain Venue Catalog | 5 | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-52 | Check Venue Suitability | 3 | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-60 | Require a reason when rejecting an event request | 2 | Retain 2 SP: bounded rejection-reason correction, counted once and linked to KAN-36. |
| KAN-64 | Receive Request, Assignment and Venue Notifications | 5 | Unstarted original 8-SP notification scope split: 5 SP for usable inbox/delivery plus request/assignment/venue integrations; remaining trigger groups move to KAN-80 (3). |
| KAN-65 | Reassign Event Coordinator | 3 | Retain 3 SP: Lead-authorised reassignment, audit, race handling and access revocation; reuse KAN-79. |
| KAN-77 | Configure Venue Setup and Turnaround Durations | 2 | Retain 2 SP: bounded catalogue/persistence extension for two validated buffer settings. |
| KAN-78 | Apply Venue Buffers to Availability and Booking Conflicts | 8 | Retain 8 SP: shared interval calculation across venue consumers, existing-booking effects and races. |
| KAN-79 | Assign Submitted Events Through a Coordinator Lead Queue | 8 | Retain 8 SP: replacement submission policy, trusted Lead role, queue, assignment and oversight. |
| KAN-81 | Recover venue arrangements affected by operational unavailability | 8 | 8 SP: extends the 3-SP KAN-55 block and 3-SP KAN-8 decision workflows with affected-booking persistence, recovery links/UI, transactional notifications and approval/outage concurrency. Existing venue search and booking paths are reused; their original implementation is not estimated again. |
| KAN-83 | Manage temporary venue holds with expiry and automatic release | 8 | 8 SP: a new timed reservation state, database clock and replay-safe expiry worker, approval/expiry locking, all availability consumers, UI and transactional notices exceed the 3-SP KAN-8 decision scope while reusing the booking model. |
| **Total** | **13 parent items** | **63** | **Tests, documentation, independent review and hosted evidence belong to story completion** |

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

<a id="capacity"></a>

[Capacity](archive/2026-11-05/estimation-and-capacity.md#capacity)

<a id="estimation-session"></a>

[Estimation session](archive/2026-11-05/estimation-and-capacity.md#estimation-session)

<a id="re-estimates-during-the-sprint"></a>

[Re-estimates during the sprint](archive/2026-11-05/estimation-and-capacity.md#re-estimates-during-the-sprint)

<a id="superseded-planning-records"></a>

[Superseded planning records](archive/2026-11-05/estimation-and-capacity.md#superseded-planning-records)

<a id="sprint-3-estimation-and-capacity-1"></a>

[Sprint 3 estimation and capacity](archive/2026-11-05/estimation-and-capacity.md#sprint-3-estimation-and-capacity-1)

<a id="capacity-1"></a>

[Capacity](archive/2026-11-05/estimation-and-capacity.md#capacity-1)

<a id="estimation-session-1"></a>

[Estimation session](archive/2026-11-05/estimation-and-capacity.md#estimation-session-1)

<a id="selected-estimates-1"></a>

[Selected estimates](archive/2026-11-05/estimation-and-capacity.md#selected-estimates-1)

<a id="story-estimates-and-rationale"></a>

[Story estimates and rationale](archive/2026-11-05/estimation-and-capacity.md#story-estimates-and-rationale)

<a id="re-estimates-during-the-sprint-1"></a>

[Re-estimates during the sprint](archive/2026-11-05/estimation-and-capacity.md#re-estimates-during-the-sprint-1)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/estimation-and-capacity.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

</details>
