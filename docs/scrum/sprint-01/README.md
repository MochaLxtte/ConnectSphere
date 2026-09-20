# Sprint 1

**Period:** 6–19 September 2026, inclusive (Asia/Singapore). **Planning:** Sunday 6 September. **Review:** Saturday 19 September. **Sprint 2 planning:** Sunday 20 September. Meeting times are to be recorded in the planning document.

## Sprint goal

Enable an Event Organiser to securely create, save and submit an event request, and allow an Event Coordinator to review and reach an outcome on the request.

At Sprint Planning on 6 September, the team selected **ten backlog items totalling 32 story points**: nine user stories worth 27 points and KAN-24 database setup worth 5 points. KAN-27 clarification is included at 3 points. Record subsequent scope changes in the [daily progress log](daily-progress.md) while preserving this starting baseline.

## Sprint records

| Document | Purpose | Update when |
| --- | --- | --- |
| [Planning and meeting record](planning.md) | Goal, scope decisions, roles, dependencies, delivery plan and meeting notes | Complete attendance and Scrum role holders; add later decisions as dated entries |
| [Estimation and capacity](estimation-and-capacity.md) | Relative estimates, rationale, availability and scope selection | Complete capacity details; record changes and compare with actual outcomes |
| [Sprint backlog](sprint-backlog.md) | Committed items, draft acceptance criteria, tasks and test links | Review detailed criteria; update execution status as work progresses |
| [Daily progress and burndown](daily-progress.md) | Progress, blockers, scope changes and remaining work | On agreed working days; export the chart at sprint end |
| [Sprint review](review.md) | Demonstration results, feedback, unfinished work and velocity | At the Sprint 1 review |
| [Retrospective](retrospective.md) | Process reflection and improvements for Sprint 2 | At the Sprint 1 retrospective |
| [Evidence register](evidence/README.md) | Screenshots, exports, test records and rubric coverage | As each artifact is captured |

Use the shared [Definition of Done](../definition-of-done.md), [release requirements](../../requirements/README.md), [customer questions](../../requirements/assumptions-and-questions.md), [architecture](../../architecture/README.md) and [test guidance](../../testing/README.md) alongside these records.

## Planning decisions and outstanding details

| Area | Record |
| --- | --- |
| Team | Ryan, Ernest, Kai Jie, Irfan, Tristan and Arvin; workstreams and item ownership are recorded in [planning](planning.md#team-and-accountabilities) and the [sprint backlog](sprint-backlog.md). One developer also serves as Scrum Master and another as Product Owner; these two role holders remain to be confirmed. |
| Stack | Vue, Express and PostgreSQL. Supabase hosts PostgreSQL and provides authentication; Express enforces sessions and event access. See the [technical decisions](../../requirements/assumptions-and-questions.md). |
| Scope | Ten committed items, 32 points: nine user stories at 27 points and KAN-24 database setup at 5 points. |
| Estimation | Relative estimation, using KAN-33 and KAN-16 as 2-point reference stories. Individual votes or a voting method have not been recorded. |
| Availability | Members are available on Saturdays and Sundays for review and planning. Individual development hours remain to be recorded. |
| Repository baseline | Initial scaffold commit `db6930d`, 7 September 2026 at 02:58:37 +08:00; see the evidence register. |
| Planning attendance | Names, meeting times and supporting meeting artifacts remain to be added. |
| Detailed criteria and tasks | Drafts for team review in the sprint backlog. |
| Execution and closure | KAN-16 organiser list/detail pages are implemented. Organiser approval/rejection display and refresh, signed-out detail access, Draft/Submitted detail states, and another organiser's denied detail access and empty list passed on 17 September (MAN-20260917-01 through MAN-20260917-04). Opening `/events` directly after signing out also showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). The remaining submission-to-status check is in [test evidence](../../testing/test-evidence.md). Story acceptance, peer review and integration remain outstanding. Complete review results and retrospective findings at the respective meetings. |

Record missing details as **To confirm** or **Not recorded**, and tests without a recorded run as **Not executed**. These statuses do not count as completion or as a failed test.

**Current integration note, 20 September:** creation, draft saving/editing, submission and clarification interfaces are now integrated with the organiser status and coordinator review pages. The hosted submission-to-status acceptance check remains open. Assignment and later release features are also present in code; this work is outside the Sprint 1 window and does not change its ten-PBI, 32-point baseline, establish a completed review meeting or award Done points. See the current [test evidence](../../testing/test-evidence.md) and [backlog note](sprint-backlog.md) for the remaining acceptance and review boundaries.

## Project rubric coverage

The project rubric covers the full release and the process across all sprints. Sprint 1 starts the evidence collection below; add results and follow-up as work progresses.

| Rubric area | Sprint 1 record | Supporting evidence |
| --- | --- | --- |
| Scrum process and evidence | Planning, daily progress, review and retrospective | Meeting notes and attendance, board snapshots, problems identified and actions taken |
| Estimation and planning | Estimation/capacity and sprint backlog | Estimates and discussion, availability, selection rationale, original scope and actual outcomes |
| User stories and customer needs | Sprint backlog and clarification log | Agreed acceptance criteria, dated customer answers and resulting changes |
| System design | C4/ERD/API documents and planning decisions | Diagrams matching implementation, design tradeoffs and affected stories |
| Working software | Review demonstration and story closure | Reproducible organiser-to-coordinator workflow and relevant failure scenarios |
| Testing and traceability | Sprint test plan and review results | Acceptance criteria linked to tests, run results, commits and coverage gaps |
| Code quality and CI | PR and check evidence | Reviewed code, relevant checks, refactoring decisions and CI run records |
| Accountability and explainability | Contributions, PR notes and retrospective | Named reviewers, design rationale and validation of assisted work |

For submission, these sprint records and their supporting exports go into **folder 4**, together with records from every later sprint. The [seven-folder submission checklist](../../submission/checklist.md) covers the other deliverables. Recordings of planning, review, retrospective and one daily standup are required for the **final sprint only**; include links rather than video files.

## Next actions

1. Confirm the Scrum Master and Product Owner, and record meeting attendance and times.
2. Review the detailed acceptance criteria and tasks; record development capacity and the estimation discussion supporting the 32-point commitment.
3. Export the planning backlog and board. Label each export with its actual capture time; note any missing start-of-sprint snapshot.
4. Agree the Definition of Done and link tasks and acceptance criteria to PRs and tests.
5. Maintain daily records and capture review and retrospective outcomes when the meetings take place.
