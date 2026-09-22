# Sprint 2

**Period:** 20 September–3 October 2026, inclusive, Asia/Singapore. **Planning:** Sunday 20 September. **Scheduled review:** Saturday 3 October. **Sprint 3 planning/start:** Sunday 4 October. Daily Scrums are scheduled on Tuesdays, Thursdays and Saturdays. Exact meeting times, attendance and the Sprint 2 retrospective slot are not recorded.

## Sprint goal

Enable submitted requests to reach an assigned coordinator, and enable coordinators to identify suitable available venues from a maintained catalogue, request bookings, and receive Venue Staff decisions without conflicting bookings.

Sprint 2 has been initialized in Jira. The confirmed baseline is **12 PBIs and 43 points**: **nine new stories worth 35 points**, plus unfinished Sprint 1 stories KAN-6, KAN-33 and KAN-34 retaining their original **8 points**. The approximately six-point target per member refers to the **35 new points** only.

Tristan merged the team branches into `main`, and Sprint 1 was closed in Jira. Existing venue and manual-assignment implementation is available for inspection. Merge status and existing code do not establish acceptance of the new Sprint 2 stories. In particular, manual assignment does not satisfy KAN-29's automatic-assignment requirement.

## Sprint records

| Document | Purpose | Update when |
| --- | --- | --- |
| [Planning and meeting record](planning.md) | Goal, meeting decisions, dependencies, proposed sequence and open questions | Record actual meeting details, allocation and dated decisions |
| [Estimation and capacity](estimation-and-capacity.md) | New-story estimates, carry-over treatment, workload target and availability | Complete capacity and estimation discussion; record agreed changes |
| [Sprint backlog and acceptance test plan](sprint-backlog.md) | Selected scope, Jira criteria, proposed technical tasks/checks and test traceability | Assign owners/reviewers, reconcile refinements with Jira and link actual results |
| [Daily progress and burndown](daily-progress.md) | Actual updates, impediments, scope changes and remaining points | At actual check-ins and dated board observations |
| [Sprint review](review.md) | Planned demonstration and future acceptance/closure record | Prepare the reviewed build; record actual review outcomes on 3 October |
| [Retrospective](retrospective.md) | Future process review and improvement actions | At the actual retrospective and subsequent action follow-up |
| [Evidence register](evidence/README.md) | Artifact index, capture requirements and evidence gaps | As each artifact is captured or verified |

Use the shared [Definition of Done](../definition-of-done.md), [requirements](../../requirements/README.md), [clarification log](../../requirements/assumptions-and-questions.md), [architecture](../../architecture/README.md) and [testing guidance](../../testing/README.md).

## Planning decisions and outstanding details

| Area | Record |
| --- | --- |
| New Must stories | KAN-29, KAN-50, KAN-51, KAN-12, KAN-52, KAN-53, KAN-8 and KAN-54: 32 points |
| New Supporting story | KAN-55: 3 points |
| Carry-over | KAN-6, KAN-33 and KAN-34 retain 3, 2 and 3 points respectively; 8 points included in the 43-point baseline |
| Calendar access decision | Internal users: Event Coordinators, Venue Staff and Technical Support Staff |
| Manual assignment decision | Coordinators may assign a request to themselves or another coordinator; handover authority for an already-assigned request still needs clarification |
| Automatic assignment | Use preconfigured availability, select the available coordinator with the fewest active events and break ties by consistent ID/order. Define the stored field, active-event statuses and the no-eligible outcome. |
| Team and allocation | Ryan, Ernest, Kai Jie, Irfan, Tristan and Arvin. Current Jira assignees: Kai Jie for KAN-6/KAN-34 and Irfan for KAN-33. Nine new-story owners and all review responsibilities remain to agree. |
| Capacity and Scrum roles | Arvin is Scrum Master and Irfan is Product Owner; both also work as developers. Individual development hours and time for Scrum responsibilities remain to be recorded. |
| Acceptance criteria and refinements | The backlog retains 93 detailed planning criteria. The pre-edit export had 77. Six shorter Jira cards now include the missing checks as dated refinements; KAN-29/KAN-50/KAN-51 already matched. Customer rules add submission conflict protection, minimum event-submission fields and preconfigured availability. Existing criterion IDs remain stable; no Sprint 2 test runs or review outcomes are recorded. |

The carry-over work targets four reported paths in the [Sprint 1 defect record](../sprint-01/review.md#review-defects-and-carry-over): registration fields after enabling registration on an existing draft, coordinator navigation after approval, saved-draft submission, and mandatory-field validation. Preserve the successful Sprint 1 demo observations while reproducing these paths separately.

The [21 September Jira update](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied) links KAN-56–KAN-59 to the carried stories and KAN-60 to the event-rejection correction. The [product backlog](../../requirements/product-backlog.md) covers future release work including KAN-61–KAN-67. KAN-60–KAN-67 remain unestimated outside this sprint; archiving KAN-19/KAN-21/KAN-22/KAN-23 does not change the 43-point commitment.

## Next actions

1. Record available development hours and meeting details before judging the feasibility of the 43-point baseline.
2. Agree story owners/reviewers and reserve time for carry-over, integration, review and evidence capture.
3. Resolve automatic-assignment and venue-policy questions, record the remaining decisions in Jira, and agree the technical tasks and shared contracts.
4. Reproduce the four carry-over defects and inspect existing implementation against the new story criteria.
5. Capture the actual Jira baseline, meeting records and executed acceptance evidence as they become available.
