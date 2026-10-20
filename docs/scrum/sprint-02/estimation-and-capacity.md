# Sprint 2 estimation and capacity

**Record check — 15 October 2026:** preserve **35 new + 8 carried = 43 committed points** and the original estimates. All 12 parents are currently Done in Jira, but accepted points by the 3 October boundary and the actual review outcome are **Not recorded**; do not use 43 as a verified velocity. Historical estimate discussion/votes, capacity and allocation-decision participants remain **Not recorded**. The [review register](review.md#baseline-and-later-delivery-register--15-october-2026) separates later work and administrative dates for Sprint 3 planning.

## Agreed story estimates and comparative rationale

The selected nine new stories total **35 points**. The estimates and priorities below are recorded scope inputs. The comparative rationale is **proposed**, to be reviewed in refinement; an estimation method, votes, participants and discussion have not been recorded for Sprint 2.

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

**Record updated 11 October 2026.** Current assignments below are reconciled from Jira; the original six-point target, estimates and unknown actual capacity are unchanged. No retrospective estimate vote or planning decision is inferred.

| Member | Available development hours | Carry-over / integration allocation | New-story allocation | Review / ceremony allowance |
| --- | --- | --- | --- | --- |
| Ryan | Not recorded | Not recorded | KAN-12, 5 points | Not recorded |
| Ernest | Not recorded | Not recorded | KAN-54, 5 points | Not recorded |
| Kai Jie | Not recorded | KAN-6 / KAN-34, 6 points; integration hours Not recorded | KAN-53 / KAN-55, 6 points | Not recorded |
| Irfan | Not recorded | KAN-33, 2 points; integration hours Not recorded | KAN-50, 5 points | Not recorded |
| Tristan | Not recorded | Integration hours Not recorded | KAN-29 / KAN-8 / KAN-52, 9 points | Not recorded |
| Arvin | Not recorded | Not recorded | KAN-51, 5 points | Not recorded |

Record leave, coursework deadlines, working days, coordination, test execution and Scrum role responsibilities before judging feasibility. Arvin is Scrum Master and Irfan is Product Owner; both also develop, so include time for these duties within their availability. Points indicate relative scope; availability is recorded in hours separately. Sprint 1 closed with seven PBIs Done and 24 accepted points, leaving these three stories at 8 points. This is one observed sprint, not a stable capacity forecast; the 43-point Sprint 2 baseline exceeds that observed outcome and needs an explicit feasibility check.

## Refinement and commitment record

| Item | Record |
| --- | --- |
| Estimation date/time, participants and method | Not recorded |
| Reference stories and differing estimates | Not recorded; Sprint 1 used KAN-33/KAN-16 as two-point references, but no Sprint 2 method is assumed |
| Questions affecting estimates | Team/customer acceptance of KAN-29's implemented availability/active-status/fallback choices; calendar detail visibility, suitability matching, concurrency, operational-block behavior and defect reproduction. Assignment ordering and the three calendar roles are settled. |
| Final carry-over estimate decision | Original 8 points retained: KAN-6 at 3, KAN-33 at 2 and KAN-34 at 3 |
| Final Sprint 2 point baseline | Confirmed: 43 points across 12 PBIs |
| Ownership and reviewers | Current Jira assignees checked 11 October: Ryan KAN-12; Ernest KAN-54; Kai Jie KAN-53/KAN-55/KAN-6/KAN-34; Irfan KAN-50/KAN-33; Tristan KAN-29/KAN-8/KAN-52; Arvin KAN-51. Reviewers To agree; original allocation decision participants/method Not recorded. |
| Capacity decision and scope trade-offs | Not recorded |
| Actual accepted points / unfinished points | Not assessed; actual decision to record in [review](review.md) |

At review, calculate accepted points only for stories meeting the Definition of Done. Show new work and carry-over separately, with the actual baseline and any dated changes. Partial implementation and successful individual test cases do not earn partial story points.

**28 September allocation update:** KAN-29's three points are assigned to Tristan in this plan. Local automated evidence is [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment); it does not award Done points, establish actual development hours or alter the 43-point commitment. Hosted acceptance, peer review and CI remain pending. The prior venue implementation was removed from `main` on 26 September; its historical presence must not be treated as reduced remaining work without a fresh implementation assessment.

**4 October allocation update:** Tristan took up KAN-8, keeping his new-story allocation at 3 + 3 = 6 points. This implementation update is after the planned 3 October boundary; it does not change the sprint dates, record review acceptance or award points. Actual review/closure and any carry-over decision still require team records.

**4 October KAN-52 responsibility update:** Tristan requested this three-point implementation after KAN-29 and KAN-8, making nine new-story points across his three implementations. The original roughly six-point target remains a historical distribution guide. No point estimate, 43-point baseline, Jira assignee, review outcome or Done count changes through this record. Reconcile capacity and formal allocation with the team.
