# Sprint 3 estimation and capacity

On 4 October the team selected 13 stories for Sprint 3. Its 63-point forecast was a stretch. The team had accepted 24 points in each of the first two sprints. That pace projected **48 SP over the two sprints left**, against **126 SP allocated**, a gap of **78 SP**. Members expected extra evening and weekend sessions, existing sign-in and database foundations, and earlier work on the carried stories to reduce the effort still required. Integration, review and test execution remained in each estimate. [Planning account, cues 07–13 and 47–53](evidence/meetings/planning.docx)

<a id="team-input-needed"></a>

## Estimation evidence

The planning account records relative sizing on the 1, 2, 3, 5, 8 scale using KAN-33 and KAN-16 as **2-SP** anchors. Kai Jie sized configuration lower than common buffer enforcement and outage recovery. Irfan justified 8 SP for expiry, repeat processing and decision races. Tristan distinguished the new 8-SP Lead role and queue from 3-SP reassignment using that authority. Ryan and Kai Jie discussed the Sprint 4 independent venue and safety changes. The account records the discussion and forecast responses. Individual ballots and any response to the invitation for disagreement were not captured. The [planning chronology](planning.md#customer-change-chronology) identifies the dates of the forecast and its administrative entry. [Planning cues 40–53 and 75–81](evidence/meetings/planning.docx)

| Selected work | Stories | SP |
| --- | --- | ---: |
| Full Sprint 2 carry-over | KAN-6 (3), KAN-34 (3), KAN-12 (5), KAN-50 (5), KAN-52 (3) | 19 |
| Other original work | KAN-60 (2), KAN-65 (3), KAN-64 (5) | 10 |
| New customer requirements | KAN-77 (2), KAN-78 (8), KAN-79 (8), KAN-81 (8), KAN-83 (8) | 34 |
| **Sprint 3** | **13 parent stories** | **63** |

Across the release the six changes accounted for seven new stories and 47 SP. The remaining 13 new points belong to KAN-82 (5) and KAN-84 (8) in Sprint 4. [Planning cues 40–53](evidence/meetings/planning.docx) · [Change register](../../requirements/change-requests.md)

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
| **Total** | **13 parent items** | **63** | **Historical planning rationale for the selected scope** |

## Actual capacity

| Member | Capacity information in the planning account | Forecast bundle |
| --- | --- | ---: |
| Tristan | Protected more evening sessions around other commitments and expected to work with Ernest on the assignment handoff. | 11 SP |
| Kai Jie | Protected more weekend time, allowing for carry-over, repairs and shared checks. | 10 SP |
| Irfan | Expected existing database and sign-in foundations to free time for connected checks. | 10 SP |
| Ernest | Expected to build on five carried stories while allowing time for unfinished paths and testing. | 11 SP |
| Ryan | Proposed using Jira criteria through MCP and AI-assisted test drafts. Owners would verify the expected results and execute the cases. | 10 SP |
| Arvin | Considered the forecast feasible with the extra sessions, reusable work and earlier test preparation. Escalation to the Product Owner was planned if handoffs slipped. | 11 SP |

The source gives qualitative availability and each person's forecast response. Individual hours, days actually worked and absences were not recorded. In the retrospective, Tristan reported that protecting evenings and weekends helped, and Ernest reported faster preparation and uneven evidence capture. [Planning cues 07–13 and 75–81](evidence/meetings/planning.docx) · [Retrospective cues 02–07](evidence/meetings/retrospective.docx)

## Re-estimates and interpretation

| Change | Arithmetic | Rationale and dated accounting |
| --- | --- | --- |
| KAN-15 | 2 → 5 SP, net +3 | Review decisions and effects on venue/equipment arrangements expanded the existing story. The team allowed for the increase once in the 4 October release forecast and assigned KAN-15 to Sprint 4. The 16 October allocation record includes the same increase. |
| KAN-64 and KAN-80 | 8 → 5 + 3, net 0 | Sprint 3 owns the inbox and request, assignment and venue triggers. Sprint 4 owns equipment, lifecycle, change and registration triggers. |
| Carry-over | 19 SP retained | Moving five unfinished parents between sprints preserved their estimates. Earlier implementation reduced some work still required without earning partial Done credit. |

[Planning cues 47–53](evidence/meetings/planning.docx) · [Scope accounting](daily-progress.md#scope-change-log) · [Release accounting](../release-burndown.md)

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
