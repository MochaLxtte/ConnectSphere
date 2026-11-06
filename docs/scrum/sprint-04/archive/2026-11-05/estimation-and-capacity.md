> Historical source snapshot retained during the 5 November 2026 documentation cleanup. Statements below describe their original dates; use the [current editing page](../../estimation-and-capacity.md) for the supported summary. Original prose and headings are retained; relative links are rebased.

# Sprint 4 estimation and capacity

**Estimation status:** The current 63-SP allocation is a planning baseline. Team confirmation of relative estimates, capacity and the sprint commitment is **To agree**; no planning-poker vote is recorded. The 10 to 11 SP selection target is guidance, not an individual quota. Keep existing estimates until a team-agreed change is logged.

**Current selected allocation: 15 parent items / 63 SP.** Relative anchors remain KAN-33 and KAN-16 at 2 SP. Points are not hours and equal sprint totals do not demonstrate equal elapsed effort or guaranteed completion.

Scope and estimates follow the recorded planning decisions. Stories are unassigned for team members to choose. Planning votes and meeting attendance are **Not recorded**; see [record preparation](../../../README.md#record-preparation).

**16 October ownership update:** stories are unassigned for team members to choose, targeting roughly **10–11 SP each per sprint / 21 SP across both**. Keep whole estimates and dependencies; choose another member to review. The integration lead is **To agree**. See the [selection rules](../../planning.md#selected-backlog).

## Capacity

| Work pool | Unclaimed SP | Selection target | Capacity record |
| --- | ---: | --- | --- |
| Current sprint | 63 | Roughly 10–11 SP per member across six members | Individual hours and absences Not recorded |
| Sprints 3 and 4 combined | 126 | Roughly 21 SP per member; whole stories | Adjust for dependencies, review and integration effort |

Sprint 4's planned window is 18–31 October. Increased effort is planned to finish the release; individual available hours and absences remain Not recorded. Confirm them at the actual 18 October planning meeting and include final-sprint recordings, review, integration, testing and submission preparation.

Velocity reference: Sprint 1 reported 24 SP; historical Sprint 2 acceptance/velocity is **Not recorded**. No valid two-sprint average is asserted. The 63-point selection is a planned release allocation, not measured velocity. Review the actual prior-sprint outcome before treating it as a forecast supported by delivery evidence.

## Estimation session

| Field | Value |
| --- | --- |
| Recorded date / method | 16 October 2026; chat-based planning and backlog refinement |
| Participants | Relative estimates adopted through the recorded planning decisions; preparation method documented centrally; individual votes Not recorded |
| Planning-poker / disagreement resolution | Not recorded; no six-member vote is claimed |

## Selected estimates

| Jira | Story | SP | Owner | Rationale / estimate history |
| --- | --- | ---: | --- | --- |
| KAN-9 | Check Equipment Availability for an Event | 8 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-10 | Mark Event as Completed | 3 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-14 | Register for an Event | 5 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-15 | Submit and Review Event Change Requests | 5 | Unassigned — team member to choose | Retain selected 5 SP; earlier 2 → 5 re-estimate records decision/review and arrangement-impact complexity. |
| KAN-17 | Withdraw Attendee Registration | 2 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-18 | Update Equipment Availability Status | 3 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-26 | Reserve Equipment | 3 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-61 | Confirm Event After Planning Arrangements | 3 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-62 | Cancel Event and Release Its Arrangements | 5 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-63 | Submit and Review Event Equipment Requests | 5 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-66 | Update Event Information During Planning | 3 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-67 | View Event Registrations | 2 | Unassigned — team member to choose | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-80 | Receive Equipment, Lifecycle, Change and Registration Notifications | 3 | Unassigned — team member to choose | 3 SP split from KAN-64; add equipment/lifecycle/change/registration trigger integrations to the existing shared inbox, without re-estimating infrastructure. |
| KAN-82 | Manage each venue arrangement independently for an event | 5 | Unassigned — team member to choose | 5 SP: comparable to KAN-53 booking submission plus controlled cancellation/replacement, aggregation and isolation regressions; existing request creation, approval and suitability are reused rather than reimplemented. General event-wide significant changes remain KAN-15. |
| KAN-84 | Review operational safety before event preparation | 8 | Unassigned — team member to choose | 8 SP: new trusted role, authorized queue/detail, revision-bound review records, three outcomes, targeted return-to-planning and preparation gating across venue/equipment/lifecycle consumers. Reuses the 2-SP KAN-33 detail and 3-SP KAN-36 decision patterns but adds readiness and invalidation complexity. |
| **Total** | **15 parent items** | **63** | **Unassigned pool** | **Tests, documentation, independent review and hosted evidence belong to story completion** |

**Point reconciliation:** the earlier Sprint 3 selection was 97 SP. Move 12 existing parents (KAN-9, KAN-10, KAN-14, KAN-15, KAN-17, KAN-18, KAN-26, KAN-61, KAN-62, KAN-63, KAN-66, KAN-67) at **47 SP** to Sprint 4; split unstarted KAN-64's **8 SP** into **KAN-64 5 SP** for request/assignment/venue notifications and **KAN-80 3 SP** for equipment/lifecycle/change/registration notifications; move **KAN-81 / CR-2 8 SP** and **KAN-83 / CR-4 8 SP** forward from the earlier Sprint 4 forecast. Thus Sprint 3 is **97 - 47 - 3 + 16 = 63** and Sprint 4 is **29 + 47 + 3 - 16 = 63**. KAN-64/KAN-80 together retain every original notification obligation; shared delivery is estimated only once. Moving the 12 unstarted stories is scope reallocation, not failed Sprint 3 delivery or a completed-sprint carry-over. No other story estimate is changed by this rebalance.

## Re-estimates during the sprint

| Recorded date | Jira / scope | Previous | Current | Reason / authority |
| --- | --- | --- | --- | --- |
| 16 October 2026 | KAN-15 | 2 SP before earlier selection | 5 SP, retained | Review and arrangement effects exceed read-only anchors; earlier recorded re-estimate retained, not repeated by balancing |
| 16 October 2026 | KAN-64 and KAN-80 | KAN-64 8 SP for all original notifications | KAN-64 5 + KAN-80 3 = 8 | Split unstarted scope along implemented trigger groups so each sprint has independently completable notification acceptance; Recorded backlog reconstruction and balancing |
| 16 October 2026 | Five original carry-over stories | 19 SP original estimates | 19 SP unchanged | No zeroing or partial delivery credit; movement is separate from historical acceptance |

No other estimate changes in this rebalance. Unassigning stories for self-selection and moving sprint membership do not alter relative size. Record further scope/estimate changes with a new dated row.
