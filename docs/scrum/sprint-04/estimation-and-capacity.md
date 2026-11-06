# Sprint 4 estimation and capacity

The team retained the **15-story / 63-SP** baseline after checking all estimates against **150 forecast hours**. KAN-84 received two rounds of estimation. The individual forecasts and votes below are reported in the supplied planning account. [Planning cues 11–19, 35–44 and 82–90](evidence/meetings/planning.docx)

<a id="team-input-needed"></a>

## Estimation evidence

The 16 October administrative snapshot recorded the candidate scope for Sprint 4 following the 4 October Sprint 3 planning decision. At the 18 October planning discussion, Arvin facilitated relative sizing using KAN-33 and KAN-16 as 2-SP references. The team retained existing values where the scope held. For KAN-9, Tristan confirmed its 8 SP already included overlapping demand and concurrency. [Planning cues 35–44](evidence/meetings/planning.docx)

| KAN-84 ballot | Arvin | Tristan | Ernest | Ryan | Kai Jie | Irfan |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| First reveal | 8 | 8 | 5 | 8 | 8 | 5 |
| Second reveal | 8 | 8 | 8 | 8 | 8 | 8 |

Ernest and Irfan expected to reuse screens and permissions. Kai Jie explained the new Safety Officer role, approval revisions, invalidation and cross-feature tests. All six then chose 8. Ernest recorded the rationale and confirmed 15 stories / 63 SP. This affirmed the existing estimate. The planning recording shows the first reveal at 10:00 and all six voting 8 in the second reveal at 10:59. [Planning cues 35–44](evidence/meetings/planning.docx) · [First reveal](evidence/meetings/planning-votes-001000.png) · [Second reveal, cropped](evidence/meetings/planning-votes-001059.jpg)

## Selected estimates

The table retains the selected values and their recorded rationale. Rationale describing unfinished implementation is historical planning context; current verification is in the [testing report](../../testing/README.md). Earlier hosted-only evidence references are superseded by the [25 October local acceptance policy](../definition-of-done.md); they are retained here only as original estimate context.

| Jira | Story | SP | Rationale / estimate history |
| --- | --- | ---: | --- |
| KAN-9 | Check Equipment Availability for an Event | 8 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-10 | Mark Event as Completed | 3 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-14 | Register for an Event | 5 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-15 | Submit and Review Event Change Requests | 5 | Retain selected 5 SP; earlier 2 → 5 re-estimate records decision/review and arrangement-impact complexity. |
| KAN-17 | Withdraw Attendee Registration | 2 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-18 | Update Equipment Availability Status | 3 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-26 | Reserve Equipment | 3 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-61 | Confirm Event After Planning Arrangements | 3 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-62 | Cancel Event and Release Its Arrangements | 5 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-63 | Submit and Review Event Equipment Requests | 5 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-66 | Update Event Information During Planning | 3 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-67 | View Event Registrations | 2 | Retain existing selected estimate; move the whole unstarted story with its ACs and integration obligations, without inflating points to equalise sprints. |
| KAN-80 | Receive Equipment, Lifecycle, Change and Registration Notifications | 3 | 3 SP split from KAN-64; add equipment/lifecycle/change/registration trigger integrations to the existing shared inbox, without re-estimating infrastructure. |
| KAN-82 | Manage each venue arrangement independently for an event | 5 | 5 SP: comparable to KAN-53 booking submission plus controlled cancellation/replacement, aggregation and isolation regressions; existing request creation, approval and suitability are reused rather than reimplemented. General event-wide significant changes remain KAN-15. |
| KAN-84 | Review operational safety before event preparation | 8 | 8 SP: new trusted role, authorized queue/detail, revision-bound review records, three outcomes, targeted return-to-planning and preparation gating across venue/equipment/lifecycle consumers. Reuses the 2-SP KAN-33 detail and 3-SP KAN-36 decision patterns but adds readiness and invalidation complexity. |
| **Total** | **15 parent items** | **63** | **Estimate total includes implementation, testing, independent review and evidence** |

## Actual capacity

Members reported the following availability at planning. The reserved time is included in each forecast. Actual hours worked were not supplied. [Planning cues 13–19 and 84–90](evidence/meetings/planning.docx)

| Member | Forecast | Included allowance | Availability / dependency |
| --- | ---: | --- | --- |
| Arvin | 20 h | 4 h coordination and recording | Monday evening unavailable. Needs notification outcomes from each owner. |
| Tristan | 26 h | 6 h review, testing and integration | Daytime classes. Needs request fields and Ryan’s cancellation flow. |
| Ernest | 24 h | 6 h testing, review and evidence | Coursework early in the week. Available evenings and weekend. Needs confirmation, withdrawal and release handoffs. |
| Ryan | 26 h | 6 h review and integration | Tuesday afternoon unavailable. Coordinates integration and needs owners ready for checkpoints. |
| Kai Jie | 26 h | 6 h reviews and tests across roles | Wednesday evening unavailable. Confirmation and safety depend on agreed readiness states. |
| Irfan | 28 h | 7 h scope, reviews and integration | Mainly evenings and weekends. The team scheduled an early check of his 13 SP on 24 October. |
| **Total** | **150 h** | **35 h included above** | Points measure relative story size. |

## Re-estimates and interpretation

The 18 October team vote confirmed KAN-84 at its existing 8 SP. No change to the sprint total resulted. The estimates table retains earlier changes, including KAN-15’s 2 → 5 SP and the KAN-64/KAN-80 notification split. No additional in-sprint re-estimate was reported in the six daily accounts. The review accepted all 15 stories at the selected 63 SP. [Planning cues 35–44](evidence/meetings/planning.docx) · [Daily account](evidence/meetings/daily.docx) · [Review](review.md)

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

</details>
