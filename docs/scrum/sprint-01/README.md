# Sprint 1

**Period:** 6–19 September 2026, inclusive (Asia/Singapore). **Planning:** Sunday 6 September. **Review:** Saturday 19 September. **Sprint 2 planning:** Sunday 20 September. Meeting times are to be recorded in the planning document.

## Sprint goal

Enable an Event Organiser to securely create, save and submit an event request, and allow an Event Coordinator to review and reach an outcome on the request.

At Sprint Planning on 6 September, the team selected **ten backlog items totalling 32 story points**: nine user stories worth 27 points and KAN-24 database setup worth 5 points. KAN-27 clarification is included at 3 points. Record subsequent scope changes in the [daily progress log](daily-progress.md) while preserving this starting baseline.

## Sprint records

| Document | Purpose | Update when |
| --- | --- | --- |
| [Planning and meeting record](planning.md) | Goal, scope decisions, roles, dependencies, delivery plan and meeting notes | Complete attendance and assignments; add later decisions as dated entries |
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
| Team | Six developers; one also serves as Scrum Master and another as Product Owner. Names and Dev 1–6 mapping are to be added. |
| Stack | Vue, Express and PostgreSQL. Supabase selected for database hosting on 8 September; [technical decision](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql). Authentication approach remains to be agreed. |
| Scope | Ten committed items, 32 points. KAN-30 ERD work is optional and outside this baseline. |
| Estimation | Relative estimation, using KAN-33 and KAN-16 as 2-point reference stories. Individual votes or a voting method have not been recorded. |
| Availability | Members are available on Saturdays and Sundays for review and planning. Individual development hours remain to be recorded. |
| Repository baseline | Initial scaffold commit `db6930d`, 7 September 2026 at 02:58:37 +08:00; see the evidence register. |
| Planning attendance | Names, meeting times and supporting meeting artifacts remain to be added. |
| Detailed criteria and tasks | Drafts for team review in the sprint backlog. |
| Execution and closure | Update daily progress during the sprint; complete review results and retrospective findings at the respective meetings. |

Record missing details as **To confirm** or **Not recorded**, and tests without a recorded run as **Not executed**. These statuses do not count as completion or as a failed test.

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

1. Add names, Scrum accountabilities, attendance and meeting times.
2. Review the detailed acceptance criteria and tasks; record development capacity and the estimation discussion supporting the 32-point commitment.
3. Export the planning backlog and board. Label each export with its actual capture time; note any missing start-of-sprint snapshot.
4. Agree the Definition of Done and link tasks and acceptance criteria to PRs and tests.
5. Maintain daily records and capture review and retrospective outcomes when the meetings take place.
