# Sprint 1

**Period:** 6–19 September 2026, inclusive (Asia/Singapore). **Planning:** Sunday 6 September. **Review and retrospective:** Saturday 19 September. **Closeout notes updated:** 21 September. Meeting times and attendance remain to be recorded in the planning document.

**Sprint 1 review is complete and the sprint is closed in Jira. Sprint 2 is initialized.** Seven PBIs are Done, giving a closure velocity of **24 points**; KAN-6, KAN-33 and KAN-34 carry forward with **8 points**. This reconciles the original 32-point commitment and matches the current Jira snapshot. Its later resolution timestamps are recorded separately from the 19 September review; they do not establish when each item was accepted during the sprint.

## Sprint goal

Enable an Event Organiser to securely create, save and submit an event request, and allow an Event Coordinator to review and reach an outcome on the request.

At Sprint Planning on 6 September, the team selected **ten backlog items totalling 32 story points**: nine user stories worth 27 points and KAN-24 database setup worth 5 points. KAN-27 clarification is included at 3 points. Record subsequent scope changes in the [daily progress log](daily-progress.md) while preserving this starting baseline.

## Sprint records

| Document | Purpose | Update when |
| --- | --- | --- |
| [Planning and meeting record](planning.md) | Goal, scope decisions, roles, dependencies, delivery plan and meeting notes | Complete meeting times and attendance; add later decisions as dated entries |
| [Estimation and capacity](estimation-and-capacity.md) | Relative estimates, rationale, availability and scope selection | Complete capacity details; record changes and compare with actual outcomes |
| [Sprint backlog](sprint-backlog.md) | Committed items, local implementation criteria, current Jira reconciliation, tasks and test links | Cross-reference current Jira criteria to retained IDs and evidence; record the adopted version |
| [Daily progress and burndown](daily-progress.md) | Progress, blockers, scope changes and remaining work | On agreed working days; export the chart at sprint end |
| [Sprint review](review.md) | Demonstration results, feedback, unfinished work and velocity | Review completed; attach closing evidence and reproduce outstanding defects |
| [Retrospective](retrospective.md) | Process reflection and improvements for Sprint 2 | Meeting held 19 September; attach discussion notes and record agreed actions |
| [Evidence register](evidence/README.md) | Screenshots, exports, test records and rubric coverage | As each artifact is captured |

### Documentation and evidence completeness

All eight Sprint 1 documents are present and the closure outcome is recorded. **Sprint 1 is closed in Jira, but its evidence record is not yet complete.** Current Jira descriptions and 79 functional-story criteria have been reviewed; their cross-reference to the retained local criteria and the version adopted at planning/review still need reconciliation. Missing historical records stay identified below; the recorded 24-point closure outcome does not fill those gaps. See the [Jira audit](../../requirements/assumptions-and-questions.md#21-september-2026--jira-backlog-audit).

| Document | Known record | Missing to finish |
| --- | --- | --- |
| [Sprint overview](README.md) | Goal, original 32-point scope, 24 Done / 8 carried and Sprint 2 handoff | Keep this index aligned as the remaining evidence and follow-up decisions are recorded. |
| [Planning](planning.md) | Meeting date, Scrum roles, original scope, named workstreams, dependencies and closeout decisions | Actual meeting times/attendance, working-agreement/DoD adoption and original planning records. |
| [Estimation and capacity](estimation-and-capacity.md) | Relative anchors, original estimates and 24-point closure calculation; current Jira points/statuses corroborate the totals | Historical availability/capacity, estimation discussion and participants, and evidence connecting acceptance to the reviewed increment. |
| [Sprint backlog](sprint-backlog.md) | Ten story/PBI cards, test plan, closure dispositions, carryover and review of current Jira descriptions/79 functional criteria | Adopted AC version and current-Jira-to-local-criterion/test/PR/CI cross-reference; cross-reference the five KAN-24 checks added 21 September and link diagram/hosted evidence. |
| [Daily progress](daily-progress.md) | Dated development updates, decisions, defects and unchanged baseline | Actual standup records and dated board observations; burndown data/chart. Leave unsupported dates blank. |
| [Sprint review](review.md) | Meeting held 19 September; eleven demo outcomes, four defects, seven Done PBIs and three carried items | Meeting times/attendance, reviewed build/fixtures, closing Jira report, acceptance decision record and supporting captures. |
| [Retrospective](retrospective.md) | Meeting held 19 September; Tristan's writeup, review observations, coordination decisions and proposed improvements | Meeting times/participation, discussion notes, and agreed improvement owners, dates, measures and follow-up. |
| [Evidence register](evidence/README.md) | Artifact locations, existing test/Git records, reviewed current Jira snapshot and explicit gaps | Preserve the reviewed original export in the evidence collection; add closing report/board, remaining originals, capture metadata, reviewed-version links and access checks. |

Use the shared [Definition of Done](../definition-of-done.md), [release requirements](../../requirements/README.md), [customer questions](../../requirements/assumptions-and-questions.md), [architecture](../../architecture/README.md) and [test guidance](../../testing/README.md) alongside these records.

## Planning decisions and outstanding details

| Area | Record |
| --- | --- |
| Team | Ryan, Ernest, Kai Jie, Irfan, Tristan and Arvin; workstreams and item ownership are recorded in [planning](planning.md#team-and-accountabilities) and the [sprint backlog](sprint-backlog.md). Arvin is Scrum Master and Irfan is Product Owner; both also work as developers. |
| Stack | Vue, Express and PostgreSQL. Supabase hosts PostgreSQL and provides authentication; Express enforces sessions and event access. See the [technical decisions](../../requirements/assumptions-and-questions.md). |
| Scope | Ten committed items, 32 points: nine user stories at 27 points and KAN-24 database setup at 5 points. |
| Estimation | Relative estimation, using KAN-33 and KAN-16 as 2-point reference stories. Individual votes or a voting method have not been recorded. |
| Availability | Members are available on Saturdays and Sundays for review and planning. Individual development hours remain to be recorded. |
| Repository baseline | Initial scaffold commit `db6930d`, 7 September 2026 at 02:58:37 +08:00; see the evidence register. |
| Planning attendance | Names, meeting times and supporting meeting artifacts remain to be added. |
| Detailed criteria and tasks | Current Jira wording is available. The sprint backlog retains local implementation IDs and historical tests; cross-reference all 79 functional Jira criteria and record the adopted version. KAN-24 now has five explicit Jira checks added on 21 September. KAN-56–KAN-59 track carry-over defects and KAN-60 tracks the later mandatory-rejection-reason correction. |
| Historical validation | KAN-16 organiser list/detail pages were implemented. Organiser approval/rejection display and refresh, signed-out detail access, Draft/Submitted detail states, and another organiser's denied detail access and empty list passed on 17 September (MAN-20260917-01 through MAN-20260917-04). Opening `/events` directly after signing out also showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). Preserve these results alongside the later review findings in [test evidence](../../testing/test-evidence.md). |
| Review and closure | Review completed; Sprint 1 closed in Jira and Sprint 2 initialized. DEMO-01, DEMO-03, DEMO-04, DEMO-05, DEMO-07, DEMO-08, DEMO-09, DEMO-10 and DEMO-11 passed. Draft registration fields, submission validation and approved-request visibility need follow-up. KAN-25, KAN-31, KAN-4, KAN-27, KAN-36, KAN-16 and KAN-24 are Done: 24 points. See the [review](review.md). |
| Integration handoff | Tristan merged all team branches into `main`; [PR #12](https://github.com/MochaLxtte/ConnectSphere/pull/12) is recorded locally as merge commit `db2c9db`, 20 September at 23:30 +08:00. The exact demo build and closing Jira report still need linking. The current snapshot records KAN-16 resolved 20 September at 23:06 and the other six Done stories 21 September at 00:26, with no timezone stated; retain these as later tracker updates in the [evidence register](evidence/README.md). |

Record missing details as **To confirm** or **Not recorded**, and tests without a recorded run as **Not executed**. These statuses do not count as completion or as a failed test.

**Integration note recorded 20 September:** creation, draft saving/editing, submission and clarification interfaces had been integrated with the organiser status and coordinator review pages. The review also reported that submitting a saved draft was not implemented and that some requests with missing required fields were accepted. DEMO-04/05 were reported as working, so the exact paths, test data and reproduction steps need to be reconciled. Preserve both observations. Assignment and later release features present in code do not change the Sprint 1 ten-PBI, 32-point baseline or establish acceptance. See the [review](review.md) for the complete results and carryover.

## Handoff to Sprint 2

Sprint 2 focuses on the venue catalogue, venue calendar and coordinator assignment. KAN-6 (3 points), KAN-33 (2) and KAN-34 (3) carry over. Nine new stories total 35 points; the agreed combined Sprint 2 baseline is **43 points**, retaining the 8 carryover points. The approximate six-point target per member applies to the 35 points of new work. The nine new stories remain unassigned in Jira; carried KAN-6/KAN-34 remain assigned to Kai Jie and KAN-33 to Irfan. Balance new selections with that existing workload.

Sprint 2 planning took place on 20 September, starting the 20 September–3 October sprint window, with review on Saturday 3 October and Sprint 3 planning/start on Sunday 4 October. Daily Scrums will run on Saturday, Tuesday and Thursday; exact times and actual attendance remain to record. Tristan owns the retrospective writeup. See [Sprint 2](../sprint-02/README.md) for the developing plan.

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

1. Preserve the reviewed current Jira export, then attach the closing report and completion evidence for the seven Done PBIs and 24-point closure velocity. Cross-reference the current criteria without renumbering historical tests.
2. Reproduce the draft/submission findings without discarding DEMO-04/05's successful observations.
3. Complete the review meeting time, attendance and supporting evidence; retain missing planning/capacity records as gaps.
4. Record Sprint 2 owners after each member selects stories within the 43-point baseline, and set exact ceremony times.
5. Review Tristan's retrospective writeup and agree measurable improvement actions, owners and follow-up dates.
