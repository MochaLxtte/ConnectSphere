# Sprint 2

**Period:** 20 September–3 October 2026, inclusive, Asia/Singapore. **Planning:** Sunday 20 September. **Scheduled review:** Saturday 3 October. **Sprint 3 planning/start:** Sunday 4 October. Daily Scrums are scheduled on Tuesdays, Thursdays and Saturdays. Exact meeting times, attendance and the Sprint 2 retrospective slot are not recorded.

## Sprint goal

Enable submitted requests to reach an assigned coordinator, and enable coordinators to identify suitable available venues from a maintained catalogue, request bookings, and receive Venue Staff decisions without conflicting bookings.

Sprint 2 has been initialized in Jira. The confirmed baseline is **12 PBIs and 43 points**: **nine new stories worth 35 points**, plus unfinished Sprint 1 stories KAN-6, KAN-33 and KAN-34 retaining their original **8 points**. The approximately six-point target per member refers to the **35 new points** only.

Tristan merged the team branches into `main`, and Sprint 1 was closed in Jira. The venue services, UI and their tests described in the original planning inspection were removed from `main` on 26 September (`dff42ed`); their migration tables remain. Those earlier inspection notes are historical planning context. Manual assignment remains implemented; on 28 September Tristan added KAN-29 automatic initial assignment on a feature branch. Neither implementation presence nor a merge establishes acceptance of a Sprint 2 story.

**30 September scope correction:** the [repository audit](../../requirements/README.md#30-september-sprint-scope-audit) removes final confirmation/cancellation/completion, notification generation and coordinator handover from the current application. Initial manual assignment of an unassigned request, automatic allocation, clarification and read-only status history remain. Applied database history and integrity guards are preserved. This supersedes earlier implementation statements that retained handover; KAN-65 remains future work. The 43-point commitment, acceptance criteria and historical results are unchanged.

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
| Manual assignment decision | Coordinators may initially assign an unassigned request to themselves or another coordinator; replacing an existing coordinator is deferred to future KAN-65 |
| Automatic assignment | Branch choices implemented 28 September: `coordinator_available` defaults false with explicit opt-in; count `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `CONFIRMED`; choose least load then ascending profile UUID. No eligible coordinator returns 409 with the draft unchanged. Team/customer acceptance of these details remains pending. |
| Team and allocation | Ryan, Ernest, Kai Jie, Irfan, Tristan and Arvin. Tristan owns KAN-29 and KAN-8 (3 points each, 6 new points) in the repository plan; Ryan implements KAN-12 and Ernest implements KAN-51. No Jira assignee change or live recheck is claimed. The 21 September Jira snapshot retains Kai Jie for KAN-6/KAN-34 and Irfan for KAN-33. Remaining ownership and all review responsibilities require confirmation. |
| Capacity and Scrum roles | Arvin is Scrum Master and Irfan is Product Owner; both also work as developers. Individual development hours and time for Scrum responsibilities remain to be recorded. |
| Acceptance criteria and refinements | The backlog retains 93 detailed planning criteria. The pre-edit export had 77. Six shorter Jira cards now include the missing checks as dated refinements; KAN-29/KAN-50/KAN-51 already matched. Customer rules add submission conflict protection, minimum event-submission fields and preconfigured availability. Existing criterion IDs remain stable. KAN-29 local automation is recorded in AUTO-20260928-01; hosted checks and Sprint 2 review outcomes remain pending. |

The carry-over work targets four reported paths in the [Sprint 1 defect record](../sprint-01/review.md#review-defects-and-carry-over): registration fields after enabling registration on an existing draft, coordinator navigation after approval, saved-draft submission, and mandatory-field validation. Preserve the successful Sprint 1 demo observations while reproducing these paths separately.

The [21 September Jira update](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied) links KAN-56–KAN-59 to the carried stories and KAN-60 to the event-rejection correction. The [product backlog](../../requirements/product-backlog.md) covers future release work including KAN-61–KAN-67. KAN-60–KAN-67 remain unestimated outside this sprint; archiving KAN-19/KAN-21/KAN-22/KAN-23 does not change the 43-point commitment.

**KAN-29 handoff, 28 September:** automatic selection, atomic submission/history and recoverable allocation errors are implemented locally. The targeted PostgreSQL run passed 29 new automatic-assignment, 12 submission and 10 existing manual-assignment tests; see [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment) for the exact environment and limits. Coordinate migration 006 and provisioned-coordinator opt-in with Arvin before hosted testing, then follow the [manual guide](../../testing/README.md#kan-29-hosted-verification). Shared Supabase rollout, hosted acceptance, CI and peer review are not completed by this record. KAN-29 remains unaccepted and the baseline stays 43 points.

**30 September schema follow-up:** Tristan has since applied migration 006 to shared Supabase. [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirms the required fields and constraint, and all six current migration checksums match hosted history through the recognised filename aliases. The 28 September handoff above retains its original evidence boundary. Confirm provisioned-coordinator opt-in and complete the hosted manual checks, availability-policy acceptance, CI and peer review. No story acceptance or change to the 43-point baseline is recorded.

**4 October integration and KAN-8:** the latest fetched team changes are integrated locally, including coordinator decided-request history, draft verification, KAN-12 search and KAN-51 availability. Tristan implemented pending venue booking decisions and assigned-coordinator outcomes. Use the [KAN-8 manual guide](../../testing/README.md#kan-8-hosted-verification) with existing synthetic pending bookings; KAN-53 submission is not implemented. Approval-time conflicts and calendar refresh are included, but catalogue maintenance, suitability, submission and block creation remain separate stories. AUTO-20261004-KAN8-01 in [test evidence](../../testing/test-evidence.md) records local runs. This update does not establish a 3 October review result, a Jira transition or Done points; the baseline remains 43.

## Next actions

1. Record available development hours and meeting details before judging the feasibility of the 43-point baseline.
2. Agree story owners/reviewers and reserve time for carry-over, integration, review and evidence capture.
3. Review the implemented automatic-assignment choices, resolve remaining venue policy questions, and record accepted decisions and allocation in Jira.
4. Complete hosted draft-repair verification and the remaining mandatory-field defect; preserve KAN-56's recorded hosted result. Run KAN-8 staff/coordinator manual checks and integrate KAN-53 before claiming the complete booking workflow.
5. Capture the actual Jira baseline, meeting records and executed acceptance evidence as they become available.
