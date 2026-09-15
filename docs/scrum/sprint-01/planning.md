# Sprint 1 planning and meeting record

## Sprint boundary and goal

| Field | Record |
| --- | --- |
| Sprint | 1 |
| Start | 6 September 2026; exact time to confirm |
| Last calendar date | 19 September 2026; exact end time to confirm |
| Duration | Two weeks; the next period starts 20 September |
| Timezone | Asia/Singapore |
| Document prepared | 7 September 2026 |
| Planning meeting date/time/location | Sunday, 6 September 2026; time/location to record |
| Meeting attendees and absences | Not recorded |
| Note taker and date notes were recorded | Not recorded |
| Meeting notes, board or meeting link | To attach in the [evidence index](evidence/README.md) |
| Planning outcome | Ten backlog items selected at 32 points; sprint dates and ceremony schedule agreed. Detailed acceptance criteria, tasks and working agreements remain for team review. |

**Sprint goal: Enable an Event Organiser to securely create, save and submit an event request, and allow an Event Coordinator to review and reach an outcome on the request.**

The planned demonstration follows one integrated path: an authenticated organiser creates a request, saves an incomplete draft, reopens and edits it, submits it, an authorised coordinator reviews it and records a decision, and the organiser can see the outcome. Clarification is included in the committed scope at 3 points. Any later deferral will be recorded as a scope change.

This record summarises the 6 September planning meeting. Supporting notes and dated Jira exports will be retained in the evidence folder. The [8 September Supabase decision](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) is a subsequent technical decision; it preserves the original 32-point commitment.

## Team and accountabilities

The team has six developers with the Sprint 1 responsibilities below. One developer also serves as Scrum Master and another as Product Owner; these two role holders remain to be confirmed. Review partners are proposed and remain to be agreed.

| Accountability or workstream | Person | Starting responsibility | Proposed review partner |
| --- | --- | --- | --- |
| Product Owner, also a developer | To confirm | Product goal, ordering and stakeholder needs | Team |
| Scrum Master, also a different developer | To confirm | Facilitation, impediments and process improvement | Team |
| Authentication and authorisation | Ryan | KAN-25 login/authentication, role-based access, protected routes and permission checks | Irfan or Tristan |
| Event creation and draft saving | Ernest | KAN-31 event form and creation flow; KAN-4 draft persistence | Kai Jie |
| Draft editing and submission | Kai Jie | KAN-34 reload/edit drafts; KAN-6 validation and Draft → Submitted transition | Ernest |
| Coordinator review and clarification | Irfan | KAN-33 coordinator review page; KAN-27 clarification requests and organiser visibility | Ryan or Tristan |
| Approval/rejection and status | Tristan | KAN-36 approval/rejection workflow; KAN-16 organiser-facing status and outcome | Irfan |
| Database and integration | Arvin | KAN-24 initial database/schema/configuration/seed data, then cross-feature integration, E2E testing and resolving integration issues | Ryan plus affected story owners |

Record the Product Owner and Scrum Master alongside their development workstreams, and include time for these responsibilities in the capacity plan.

## Scope and selection

The [sprint backlog](sprint-backlog.md) records the ten committed items and a proposed detailed task breakdown. The [estimation record](estimation-and-capacity.md) records the agreed **32-point baseline: 27 points across nine user stories plus KAN-24 as a separate 5-point infrastructure PBI**. The team used KAN-33 and KAN-16 as 2-point anchors for relative estimation. The dated backlog export and capacity calculation remain to be attached.

| Scope decision | Planning input | Decision and rationale |
| --- | --- | --- |
| Goal path | KAN-25, KAN-31, KAN-4, KAN-34, KAN-6, KAN-33, KAN-36, KAN-16 | Committed to support the organiser-to-coordinator workflow; 24 points |
| Clarification | KAN-27 | Committed so a coordinator can request further information; 3 points |
| Database/integration | KAN-24 supports the shared path; check existing scaffold against remaining needs | Committed as a separate 5-point PBI; completion and remaining work to verify |
| Coordinator assignment | KAN-29 conditional dependency if assignment is necessary for review authorization | Resolve Q-02 and decide scope; not automatically included |
| Later release work | Venue/equipment/registration/change/notification capabilities remain in the product backlog | Confirm no accidental removal from release scope |
| Account scope | Working planning assumption: suitable test accounts for the organiser/coordinator slice | Confirm provisioning, role coverage and boundaries of KAN-25 |
| Final committed items and baseline point total | Nine user stories plus KAN-24; 32 points | Agreed at Sprint Planning on 6 September; dated backlog export to attach |

Do not silently give every coordinator access to every event to bypass an assignment dependency. Record and implement the agreed event relationship policy. A narrower Sprint 1 slice does not complete the full five-role release requirement.

Maintain the ERD in the [system design documentation](../../architecture/README.md) so that it reflects the implemented schema and relationships.

## Proposed delivery sequence

These windows are a coordination proposal, not evidence that work happened on those dates or a commitment to work every weekend. Confirm the team's actual working days in the capacity record.

| Window | Focus | Observable integration result |
| --- | --- | --- |
| 6–7 September | Planning, setup, common field/API/access decisions and current scaffold verification | Team can reproduce startup and agrees how an authenticated actor reaches event services |
| 8–10 September | Authentication, create/save/reopen/edit draft | One organiser can persist and recover a draft; another organiser cannot access it |
| 11–13 September | Submission and authorised coordinator retrieval | Valid submission enters the review path; drafts and unrelated requests remain protected |
| 14–16 September | Decision/status and clarification integration | Coordinator outcome and clarification requests are persisted and visible to the correct organiser |
| 17–18 September | Resolve integrated defects, check acceptance criteria and prepare evidence | Reproducible goal path and failure cases with linked test results |
| 19 September | Scheduled review; retrospective proposed after the review | Actual outcomes, feedback, unfinished work and Sprint 2 improvements recorded |

Review and testing will run throughout these windows, with 17–18 September reserved for resolving remaining integration problems and preparing evidence. Sprint Review is scheduled for **Saturday 19 September**, and Sprint 2 Planning for **Sunday 20 September**. Members are available on Saturday/Sunday for these events. Exact times and the retrospective slot remain to confirm. Development availability is recorded separately in the capacity plan.

## Dependencies and open decisions

| ID | Dependency or risk | Next decision/action | Proposed coordination lead | Resolution/evidence |
| --- | --- | --- | --- | --- |
| S1-R01 | Authentication and actor identity affect every protected endpoint | Complete hosted access acceptance and account-administration decisions; Q-01/Q-02 | Ryan with Irfan | 15 September: Supabase Auth and assigned-coordinator enforcement connected; local automated checks and hosted login/approval observation linked in [test evidence](../../testing/test-evidence.md). Broader acceptance remains outstanding. |
| S1-R02 | Several developers touch the same draft fields and schema | Agree shared DTO, update semantics and migration order before conflicting changes | Ernest, Kai Jie and Arvin | Not recorded |
| S1-R03 | Submission requirements are not fully specified | Resolve Q-03; separate incomplete draft validation from submission validation | Kai Jie with customer liaison | Not recorded |
| S1-R04 | Review and clarification transitions may be interpreted differently | Resolve Q-04 and agree one transition policy; approval is not full event confirmation | Irfan and Tristan | Not recorded |
| S1-R05 | No verified historical velocity is available | Use real availability and uncertainty to select a feasible first scope; inspect daily | All Developers | Not recorded |
| S1-R06 | Scaffold exists but feature completion remains unverified | Verify setup and remaining KAN-24 work; do not mark business stories Done from infrastructure checks | Arvin and story owners | Not recorded |
| S1-R07 | Planning exports and supporting meeting records are not yet attached | Collect dated notes and Jira snapshots; record export dates in the evidence index | Note taker/Scrum Master to confirm | Not recorded |
| S1-R08, added 8 September | Shared Supabase development database requires coordinated schema and fixture changes | Verify hosted TLS connection and project settings; agree migration ownership/order and keep automated tests isolated | Arvin with affected story owners | Database hosting selected; setup verification pending |

Record customer answers in the shared [clarification log](../../requirements/assumptions-and-questions.md) with the team's own section as the source. Carry affected acceptance criteria, estimates, tests and design documents forward together.

## Planning decisions and follow-up

Use the following checklist to complete planning details and guide refinement:

1. Confirm the goal, sprint boundary, attendees, availability and Definition of Done.
2. Discuss each candidate story's acceptance criteria, dependencies and uncertainties.
3. Record any further estimation discussion against the two 2-point anchors, including changes in assumptions or estimates.
4. Complete the capacity calculation and document any adjustment needed to the 32-point plan.
5. Break down tasks, agree coordination/review partners and identify first integration points.
6. Capture the baseline backlog, task board, estimation evidence, known risks and action owners.

| Topic/decision | Details to complete | Decision/rationale | Participants | Meeting date and supporting records |
| --- | --- | --- | --- | --- |
| Nine user stories and KAN-24 selected | Capacity rationale and alternatives considered | 27 story points plus 5 infrastructure points; total 32 | To record | 6 September; Jira snapshot to attach |
| Relative estimation anchors | Any differing assumptions raised during sizing | KAN-33 and KAN-16 each 2 points | To record | 6 September; estimation notes to attach |
| Recurring ceremony schedule | Exact times and retrospective slot | Sprint 1 review 19 September; Sprint 2 planning 20 September; members available Sat/Sun | Planning participants to record | 6 September; schedule recorded above |

| Follow-up action | Owner | Due date | Status and evidence |
| --- | --- | --- | --- |
| To record from actual meeting | | | |

## Working agreement to adopt or revise

- The team plans two standups per week to inspect progress toward the goal and adapt the plan. Record the actual days, times, location and participants; development updates between meetings do not establish meeting attendance.
- Use focused Jira branches and reviewed PRs as described in [CONTRIBUTING.md](../../../CONTRIBUTING.md). Surface shared-contract and migration changes early.
- Adopt or revise the shared [Definition of Done](../definition-of-done.md), recording its version/date. Task completion and a merged stub are not equivalent to a Done story.
- Run relevant checks and link actual results. Existing scaffold tests establish infrastructure behavior, not the business acceptance criteria proposed in the backlog.
- Record meaningful use of AI, the contributor's verification and design rationale in PR notes. Each contributor should be able to explain the work.
- Keep the original scope snapshot. Log additions, removals, blockers and adaptations in [daily progress](daily-progress.md); do not rewrite the starting commitment to make outcomes appear better.

Working agreement and Definition of Done adoption date, participants and changes: **To record**. The committed scope and ceremony dates above were agreed at Sprint Planning.
