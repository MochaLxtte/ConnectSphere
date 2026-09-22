# Sprint 2 estimation and capacity

## Agreed story estimates and comparative rationale

The selected nine new stories total **35 points**. The estimates and priorities below are recorded scope inputs. The comparative rationale is **proposed**, to be reviewed in refinement; an estimation method, votes, participants and discussion have not been recorded for Sprint 2.

| Story | Priority | New points | Proposed comparative rationale |
| --- | --- | ---: | --- |
| KAN-29 — Automatically Assign Event Coordinator | Must | 3 | Assignment uses preconfigured availability, fewest active events and a consistent ID/order. Defining the stored field, active statuses and no-eligible outcome, plus concurrent selection, remains implementation work. |
| KAN-50 — Maintain Venue Catalogue | Must | 5 | Staff maintenance of several related attributes, validation, persistence, access control and catalogue/detail integration. |
| KAN-51 — View Venue Availability Calendar | Must | 5 | Time-window presentation from bookings and operational blocks, internal-role access and refresh consistency. |
| KAN-12 — Search and Filter Venues | Must | 5 | Combined event-requirement filters, availability queries, boundary validation and useful empty states. |
| KAN-52 — Check Venue Suitability | Must | 3 | Explain a venue assessment against a selected event; reuses catalogue and availability information. |
| KAN-53 — Submit Venue Booking Request | Must | 3 | Persist an authorized request and status with validation, duplicate handling and staff-queue integration. |
| KAN-8 — Approve or Reject Venue Booking Request | Must | 3 | Staff decision and persisted outcome, eligibility checks and protection against repeated decisions. |
| KAN-54 — Detect Venue Booking Conflicts | Must | 5 | Correct overlap detection, meaningful feedback and transactional protection against simultaneous approvals. |
| KAN-55 — Block Venue for Operational Unavailability | Supporting | 3 | Staff-maintained blocked periods propagated to availability, suitability and booking checks. |
| **Total new scope** | | **35** | **32 Must + 3 Supporting** |

Existing implementation may reduce remaining tasks, but does not justify silently changing estimates or awarding Done points. First inspect what satisfies the agreed criteria; record any resulting estimate changes explicitly.

## Carry-over and Sprint 2 baseline

| Carried story | Original Sprint 1 points | Sprint 2 estimate | Remaining focus |
| --- | ---: | --- | --- |
| KAN-6 — Submit Event Request | 3 | 3, retained | S1-DEF-03 saved-draft submission and S1-DEF-04 required-field validation |
| KAN-33 — View Submitted Event Request | 2 | 2, retained | S1-DEF-02 approved-request navigation for the authorized coordinator |
| KAN-34 — Resume/Edit Draft Event Request | 3 | 3, retained | S1-DEF-01 registration capacity/window fields when enabling registration on an existing draft; KAN-31/KAN-4 touchpoints |
| **Total** | **8** | **8, retained** | See [Sprint 1 defect record](../sprint-01/review.md#review-defects-and-carry-over) |

The confirmed Sprint 2 baseline is **35 new points + 8 retained carry-over points = 43 points across 12 PBIs**. Preserve Sprint 1's original estimates and closure outcome; carrying a story into Sprint 2 does not retroactively complete it in Sprint 1. Do not add separate defect points on top of carried story estimates unless a distinct scope change is agreed.

## Workload target and availability

The target of roughly **six points per member** describes the 35 new points across six members: `35 ÷ 6 ≈ 5.8`. It is a distribution guide, not an individual assignment or a points-to-hours conversion. Including carry-over, total planned scope averages `43 ÷ 6 ≈ 7.2` points per member before considering uneven availability and specialist work.

| Member | Available development hours | Carry-over / integration allocation | New-story allocation | Review / ceremony allowance |
| --- | --- | --- | --- | --- |
| Ryan | Not recorded | To agree | To agree | Not recorded |
| Ernest | Not recorded | To agree | To agree | Not recorded |
| Kai Jie | Not recorded | KAN-6 / KAN-34 retained in Jira; integration allocation to agree | To agree | Not recorded |
| Irfan | Not recorded | KAN-33 retained in Jira; integration allocation to agree | To agree | Not recorded |
| Tristan | Not recorded | To agree | To agree | Not recorded |
| Arvin | Not recorded | To agree | To agree | Not recorded |

Record leave, coursework deadlines, working days, coordination, test execution and Scrum role responsibilities before judging feasibility. Arvin is Scrum Master and Irfan is Product Owner; both also develop, so include time for these duties within their availability. Points indicate relative scope; availability is recorded in hours separately. Sprint 1 closed with seven PBIs Done and 24 accepted points, leaving these three stories at 8 points. This is one observed sprint, not a stable capacity forecast; the 43-point Sprint 2 baseline exceeds that observed outcome and needs an explicit feasibility check.

## Refinement and commitment record

| Item | Record |
| --- | --- |
| Estimation date/time, participants and method | Not recorded |
| Reference stories and differing estimates | To record; Sprint 1 used KAN-33/KAN-16 as two-point references, but no Sprint 2 method is assumed |
| Questions affecting estimates | Availability/active-event definitions and assignment fallback, calendar detail visibility, suitability matching, concurrency, operational-block behavior and defect reproduction; assignment ordering and the three calendar roles are settled |
| Final carry-over estimate decision | Original 8 points retained: KAN-6 at 3, KAN-33 at 2 and KAN-34 at 3 |
| Final Sprint 2 point baseline | Confirmed: 43 points across 12 PBIs |
| Ownership and reviewers | Carry-over owners retained: Kai Jie (KAN-6/KAN-34), Irfan (KAN-33). Nine new-story owners and reviewers to agree. |
| Capacity decision and scope trade-offs | To record after availability and carry-over work are understood |
| Actual accepted points / unfinished points | Not yet assessed; complete at [review](review.md) |

At review, calculate accepted points only for stories meeting the Definition of Done. Show new work and carry-over separately, with the actual baseline and any dated changes. Partial implementation and successful individual test cases do not earn partial story points.
