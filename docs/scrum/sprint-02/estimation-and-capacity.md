# Sprint 2 estimation and capacity

The six members reviewed the listed estimates on **20 September** and kept **35 new + 8 carried = 43 SP**. They compared the larger venue stories to the two-point coordinator-view repair. The meeting records a collective discussion and retained values. Individual ballots and member-hour schedules were not supplied. [Planning account, cues 8–15 and 29–35](evidence/meetings/planning.docx)

<a id="team-input-needed"></a>

## Estimation evidence

| Field | Record from 20 September |
| --- | --- |
| Participants | Arvin reviewed all twelve values, Ernest reconciled new and carried points, Tristan grouped the 3-SP stories, Ryan explained the 5-SP comparisons, Kai Jie raised the carry-over workload and Irfan reconciled the full scope. |
| Reference | Ryan compared catalogue, calendar, search and conflict detection with the 2-SP KAN-33 request view. The historical estimate register also retains KAN-16 as a two-point example. |
| Reasoning | The four 5-SP stories combine attributes, queries, availability or concurrency. Assignment, booking submission, booking decision, suitability and operational blocks each retained 3 SP. |
| Carried work | KAN-6 (3), KAN-33 (2), KAN-34 (3). Familiarity might help, but all eight points and the remaining checks belonged in the forecast. |
| Agreement | Arvin asked for estimate challenges. Ernest recorded the listed values retained at 43 SP. No individual vote sequence is recorded. |

[Planning cues 8–15 and 29–35](evidence/meetings/planning.docx)

## Selected estimates

The nine new stories total 35 SP. The comparisons below explain which boundaries made each estimate larger or smaller. [Planning cues 16–35](evidence/meetings/planning.docx)

| Story | Priority | New points | Sizing rationale |
| --- | --- | ---: | --- |
| KAN-29 — Automatically Assign Event Coordinator | Must | 3 | Assignment combines coordinator availability, active workload and a consistent tie-break. The team needed to clarify how to count active events and what to display when nobody was eligible. |
| KAN-50 — Maintain Venue Catalogue | Must | 5 | Staff needed to save several related attributes with validation and access controls, then make the updated values available to search and suitability. On 9 October Irfan retained 5 SP after implementation. [Dated size comparison](archive/2026-11-05/estimation-and-capacity.md) |
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

Arvin described roughly six **new-story** points per person as a starting assumption. Nobody supplied a detailed hours/days breakdown. Comparing the **43-SP** forecast with Sprint 1’s **24 accepted SP** exposed the risk from unfinished integration and repairs. [Planning cues 8–15](evidence/meetings/planning.docx)

| Member | Planned bundle | Capacity consideration raised |
| --- | ---: | --- |
| Arvin | 5 SP | Calendar depended on bookings and blocks. He would monitor heavy bundles and coordinate the walkthrough. |
| Tristan | 9 SP | Three stories required handoffs. Started with assignment and booking decisions. |
| Ernest | 5 SP | Conflict checks needed booking and approval interfaces from two owners. |
| Ryan | 5 SP | Search depended on Irfan’s catalogue and the calendar’s availability rules. |
| Kai Jie | 12 SP | Six new points plus six in carried repairs. Familiarity helped, but context switching was an explicit risk. |
| Irfan | 7 SP | Five points for catalogue work and two for the carried coordinator-view repair. |

The table records story size and the dependencies members anticipated. Each person’s available or worked hours remain unrecorded. [Planning cues 36–49 and 56–62](evidence/meetings/planning.docx)

## Re-estimates and interpretation

No revised parent estimate appears in the planning, daily or review accounts. Five stories carried at their existing estimates. The 3 October review accepted 24 SP and carried 19 SP. Irfan’s 9 October check retained KAN-50 at 5 SP. Its later implementation and testing belong to their actual dates. [Review](review.md#story-decisions) · [Estimation history](archive/2026-11-05/estimation-and-capacity.md)

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
