# Scrum evidence

Collect evidence from the first sprint onward. This folder contains the team's planning decisions, sprint records and reusable templates. Update progress, test results and meeting outcomes as the sprint proceeds.

Use the Scrum process and estimation practices taught in class. Decide sprint dates and commitments using actual team capacity and, when available, observed velocity. Four two-week sprints is a course example, not a required schedule. The final sprint must end by Friday Week 12.

For each sprint, retain the starting goal, selected backlog and tasks, estimates and rationale, relevant daily updates, ending board and burndown, review outcomes, retrospective actions and follow-up. Export evidence from Jira or other tools for the final submission; instructors will not inspect a live Jira project in place of the deliverables.

| Sprint | Planned dates | Scope and outcome | Records |
| --- | --- | --- | --- |
| 1 | 6–19 September 2026 | Closed in Jira: 10 PBIs / 32 points committed; 7 Done / 24 points; 3 unfinished / 8 points carried into Sprint 2. | [Sprint 1](sprint-01/README.md) |
| 2 | 20 September–3 October 2026 | 12 PBIs / 43 points: 9 new stories / 35 points and 3 carry-over stories / 8 points. New story owners still to be selected. | [Sprint 2](sprint-02/README.md) |
| 3 | To record (planning not yet held) | Not recorded. Includes the Week 7 customer changes ([change requests](../requirements/change-requests.md)). | [Sprint 3](sprint-03/README.md) |

The [release burndown](release-burndown.md) tracks remaining release points across all sprints.

Sprint 1 planning took place on **6 September**, followed by its review and retrospective on **19 September**. Sprint 2 planning took place on **20 September**. **Arvin is Scrum Master and Irfan is Product Owner; both also work as developers.** Sprint planning and the start of each two-week sprint fall on Sunday; review falls on the final Saturday. Sprint 2 review is planned for **3 October**, followed by the next planning session on **4 October**. Sprint 2 Daily Scrums are scheduled on **Tuesday, Thursday and Saturday**. Meeting times and actual attendance remain to be recorded. Preserve Sprint 1's original planned cadence and dated observations rather than backfilling attendance or daily progress.

Start each new sprint by copying [the sprint templates](templates/sprint/) into `sprint-0N/`, following [AGENTS.md](../../AGENTS.md), and review the [definition of done](definition-of-done.md). Link records to Jira items, pull requests and test evidence to show how feedback changed the implementation. Closure totals are distinct from missing daily observations and do not establish the date each item became Done.

## Record structure and conventions

Both sprint folders use the same eight Markdown records: `README.md`, `planning.md`, `estimation-and-capacity.md`, `sprint-backlog.md`, `daily-progress.md`, `review.md`, `retrospective.md` and `evidence/README.md`. The evidence folder also holds any retained artifacts. Completed sprints retain actual outcomes and dated history; active sprints retain planned checks and unfilled outcome fields until those events happen.

- Each story card separates the user story, acceptance criteria and implementation tasks. Use `KAN-<number>-AC<number>` as the repository reference for a criterion; these labels are not Jira issue keys. Copy current Jira wording without silently adding technical proposals as agreed requirements.
- Use `S1-Txx` / `S2-Txx` for planned test scenarios and the run register for executed results. Link the criterion, test, result and relevant implementation; a planned test is not a passing result.
- Record meeting decisions separately from proposed refinements. Preserve original sprint scope, estimates, dated failures and later retests.
- Use **Not recorded**, **To agree**, **Not executed** and **Not assessed** for the different gaps. A completed document structure or Jira sprint closure does not establish a complete evidence package.

The [Sprint 1 completion checklist](sprint-01/README.md#documentation-and-evidence-completeness) identifies the remaining evidence. The [Sprint 2 refinement register](sprint-02/planning.md#jira-refinements-to-record) identifies decisions still to carry into Jira.

The final sprint additionally needs recordings of planning, review, retrospective and one daily standup. Store links to large unlisted recordings; do not commit the recordings or put video files into the submission ZIP. Use access settings appropriate to the course's submission requirements.

These records belong in **folder 4** of the final submission. The [submission checklist](../submission/checklist.md) explains how to assemble all seven deliverables.
