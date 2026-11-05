# Sprint 2 estimation and capacity

**Retained scope:** 12 stories / 43 SP (35 new + 8 carried). **Reported outcome:** 7 accepted / 24 SP; KAN-6, KAN-34, KAN-50, KAN-12 and KAN-52 carried / 19 SP.

## Team input needed

Workstream 4: edit [Estimation evidence](#estimation-evidence) and [Actual capacity](#actual-capacity). Use the [shared evidence checklist](../../submission/checklist.md#ws4-sprint-1-and-2) for missing sources and completion conditions. Preserve **Not recorded**, **To agree**, **Not executed** or **Not assessed** until a source supports a replacement.

## Estimation evidence

| Field | Supported record / team entry |
| --- | --- |
| Method and anchors | Relative sizing; KAN-33 and KAN-16 are retained 2-SP reference stories |
| Session date / participants | Not recorded for the sizing discussion separately from meeting attendance |
| Individual votes / disagreement evidence | Not recorded |
| Final agreement source | Retained point baseline below; missing original sizing evidence remains Not recorded |

## Selected estimates

The table retains the selected values and their recorded rationale. Rationale describing unfinished implementation is historical planning context; current verification is in the [testing report](../../testing/README.md). Earlier hosted-only evidence references are superseded by the [25 October local acceptance policy](../definition-of-done.md); they are retained here only as original estimate context.

| Story | Priority | New points | Proposed comparative rationale |
| --- | --- | ---: | --- |
| KAN-29 — Automatically Assign Event Coordinator | Must | 3 | Assignment uses preconfigured availability, fewest active events and a consistent ID/order. The branch now defines the field, active statuses, no-eligible outcome and concurrent selection; policy acceptance and hosted verification remain. Original estimate unchanged. |
| KAN-50 — Maintain Venue Catalogue | Must | 5 | Staff maintenance of several related attributes, validation, persistence, access control and catalogue/detail integration. **Post-implementation check, 9 October (Irfan): 5 points still hold; no re-estimate.** Against the 2-point anchors (KAN-33 one scoped read, KAN-16 status display) this is larger because it is a write path over eight related attributes: a validation layer, a transactional locked update, a Venue Staff-only boundary, a list-and-edit interface and tests at four levels. Against KAN-12 and KAN-51 (5 each) it is comparable: no schema change and no cross-table query make it smaller, while form state, changed-field updates and concurrent edits make it larger. Seven edge cases found during the build (KAN-50-AC15–AC21) fitted within the estimate. Venue creation/deactivation and per-venue setup/turnaround time (Week 7 customer change 1) are outside this story, which is why 5 remains valid. Effort in hours was not tracked. |
| KAN-51 — View Venue Availability Calendar | Must | 5 | Time-window presentation from bookings and operational blocks, internal-role access and refresh consistency. |
| KAN-12 — Search and Filter Venues | Must | 5 | Combined event-requirement filters, availability queries, boundary validation and useful empty states. |
| KAN-52 — Check Venue Suitability | Must | 3 | Explain a venue assessment against a selected event; reuses catalogue and availability information. |
| KAN-53 — Submit Venue Booking Request | Must | 3 | Persist an authorized request and status with validation, duplicate handling and staff-queue integration. |
| KAN-8 — Approve or Reject Venue Booking Request | Must | 3 | Staff decision and persisted outcome, eligibility checks and protection against repeated decisions. |
| KAN-54 — Detect Venue Booking Conflicts | Must | 5 | Correct overlap detection, meaningful feedback and transactional protection against simultaneous approvals. |
| KAN-55 — Block Venue for Operational Unavailability | Supporting | 3 | Staff-maintained blocked periods propagated to availability, suitability and booking checks. |
| **Total new scope** | | **35** | **32 Must + 3 Supporting** |


The nine new stories total **35 SP**. KAN-6 (3), KAN-33 (2) and KAN-34 (3) add **8 carried SP**, making the **43-SP** commitment.

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

<a id="agreed-story-estimates-and-comparative-rationale"></a>

[Agreed story estimates and comparative rationale](archive/2026-11-05/estimation-and-capacity.md#agreed-story-estimates-and-comparative-rationale)

<a id="carry-over-and-sprint-2-baseline"></a>

[Carry-over and Sprint 2 baseline](archive/2026-11-05/estimation-and-capacity.md#carry-over-and-sprint-2-baseline)

<a id="workload-target-and-availability"></a>

[Workload target and availability](archive/2026-11-05/estimation-and-capacity.md#workload-target-and-availability)

<a id="refinement-and-commitment-record"></a>

[Refinement and commitment record](archive/2026-11-05/estimation-and-capacity.md#refinement-and-commitment-record)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/estimation-and-capacity.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

</details>
