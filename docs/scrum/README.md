# Scrum evidence

**Ownership update — 16 October 2026.** All 28 unfinished parent items are now unassigned in Jira. Team members will choose their own stories; independent reviewers and the integration lead are **To agree** after ownership is chosen. The scope remains **63 SP per sprint**, averaging **10.5 SP per member per sprint** and **21 SP per member across both**. Aim for roughly 10–11 SP each, retaining whole estimates and dependency order rather than forcing an exact split. Earlier named allocations are historical. Claim a Jira card and sync its sprint record before starting work.

**Current administration after rebalance — 16 October 2026.** Sprint 3 (id 67) is **Active, 13 parent items / 63 SP**, and Sprint 4 (id 68) is **Future, 15 parent items / 63 SP**. All 28 parents are To Do. Scope, estimates, owners/reviewers and the full customer-change backlog were selected under the recorded delegated planning method. The customer changes were received **2 October** (confirmed in chat on 16 October); the team intended to finish Sprint 2 against its original scope, then consider changes during Sprint 3 planning. The [change register](../requirements/change-requests.md) preserves the timeline, original rules and 97/29→63/63 allocation.

Sprint 2's original **43 points** and Sprint 1's reported **32/24/8** remain unchanged. Five unfinished S2 stories carry their full **19 points**; this administration does not manufacture missing acceptance/velocity. See the [Sprint 3](sprint-03/README.md), [Sprint 4](sprint-04/README.md) and [release accounting](release-burndown.md) records.

<details>
<summary>Earlier 16 October administration, before rebalance</summary>

**Current administration and selected plan — 16 October 2026.** Jira Sprint 2 (id 34) is now **Closed**, with actual administrative completion at **16 October 02:06 Singapore time**. Sprint 3 (id 67) is **Active**, configured for **4 October 00:00–17 October 23:59**, with **23 parent items / 97 SP, all To Do**. The delegated plan selected five outstanding Sprint 2 stories for completion/re-verification at their full original **19 SP**. Their current delivered credit is zero; the historical Sprint 2 acceptance/velocity remains **Not recorded**, and the other 24 points are not automatically accepted. The dated snapshots below retain their earlier administrative state.

The selected plan includes **KAN-77 (2)** venue buffer settings, **KAN-78 (8)** buffered availability/conflicts and **KAN-79 (8)** Coordinator Lead allocation. See [Sprint 3 planning](sprint-03/planning.md#selected-scope-and-release-allocation) for 97-point accounting, six owner/reviewer assignments and shared policies. The remaining four customer changes are allocated to Sprint 4 at **29 forecast points**. This is a scope plan, not recorded implementation completion or a six-member estimation vote.


</details>

**Schedule update — 16 October 2026. Schedule confirmation in chat.** Sprint 3 actually started on 4 October and ends on 17 October; planning was on 4 October but did not finalise scope. Sprint 4 is the final development sprint, projected for 18–31 October. Week 12 is 2–8 November, making the course's Friday submission deadline **6 November 2026 at 23:59, Singapore time**. Final verification/submission preparation on 1–6 November is proposed. The 15 October inspection and earlier dated records below remain historical snapshots.

**Submission cleanup — 15 October 2026.** Sprint 1/2 now distinguish original scope, historical observations, later delivery and current administrative state. Their evidence packages remain incomplete where original records are unavailable. Use the [Sprint 1 completion checklist](sprint-01/README.md#documentation-and-evidence-completeness) and [Sprint 2 baseline and later delivery register](sprint-02/review.md#baseline-and-later-delivery-register--15-october-2026) before selecting carry-over, existing-story repairs and new customer changes for Sprint 3.

Collect evidence from the first sprint onward. This folder contains the team's planning decisions, sprint records and reusable templates. Update progress, test results and meeting outcomes as the sprint proceeds.

Use the Scrum process and estimation practices taught in class. Decide sprint dates and commitments using actual team capacity and, when available, observed velocity. Four two-week sprints is a course example, not a required schedule. The final sprint must end by Friday Week 12.

For each sprint, retain the starting goal, selected backlog and tasks, estimates and rationale, relevant daily updates, ending board and burndown, review outcomes, retrospective actions and follow-up. Export evidence from Jira or other tools for the final submission; instructors will not inspect a live Jira project in place of the deliverables.

| Sprint | Dates | Scope and outcome | Records |
| --- | --- | --- | --- |
| 1 | 6–19 September 2026 | Closed in Jira: 10 PBIs / 32 points committed; 7 Done / 24 points; 3 unfinished / 8 points carried into Sprint 2. | [Sprint 1](sprint-01/README.md) |
| 2 | 20 September–3 October 2026 | Original 12 PBIs / 43 points: 35 new + 8 carried. Jira id 34 administratively closed 16 October 02:06 Singapore time. Five outstanding parents / 19 original points carried into Sprint 3; other seven parents / 24 points remain Jira Done, not automatically historically accepted. Historical review acceptance/velocity Not recorded. | [Sprint 2](sprint-02/README.md) |
| 3 | 4–17 October 2026 | Active id 67; 13 parents / 63 SP, all To Do at 16 October snapshot. Five full-point carry-overs, request/venue notifications and CR-1/2/4/5. Original start-board evidence Not recorded. | [Sprint 3](sprint-03/README.md) |
| 4 | 18–31 October 2026 | Future id 68; 15 parents / 63 SP. Equipment, lifecycle, registration, changes, remaining notifications and CR-3/6. Planning allocation prepared; actual meetings and outcomes not yet recorded. Final development sprint. | [Sprint 4](sprint-04/README.md) |

The [release burndown](release-burndown.md) tracks remaining release points across all sprints.

Sprint 1 planning took place on **6 September**, followed by its review and retrospective on **19 September**. Sprint 2 planning took place on **20 September**. **Arvin is Scrum Master and Irfan is Product Owner; both also work as developers.** The agreed cadence places planning/start on Sunday and review on the final Saturday of each two-week sprint. It scheduled Sprint 2 review for **3 October** and the next planning for **4 October**. The 16 October update confirms Sprint 3 planning on 4 October with no scope finalised; it does not supply the actual Sprint 2 review/retrospective outcomes. Those outcomes remain **Not recorded** and current Sprint 3 selection is recorded separately in the 16 October delegated plan. Sprint 2 Daily Scrums were scheduled on **Tuesday, Thursday and Saturday**; actual attendance remains **Not recorded**. Preserve Sprint 1's original cadence and dated observations.

Start each new sprint by copying [the sprint templates](templates/sprint/) into `sprint-0N/`, following [AGENTS.md](../../AGENTS.md), and review the [definition of done](definition-of-done.md). Link records to Jira items, pull requests and test evidence to show how feedback changed the implementation. Closure totals are distinct from missing daily observations and do not establish the date each item became Done.

**Record updated 11 October 2026.** The 11 October Jira/repository reconciliation updates current status and ownership only. It does not backdate completion, change planned sprint windows or fill missing meeting decisions. See [Sprint 2 reconciliation](sprint-02/README.md#11-october-reconciliation).

## Record structure and conventions

Both sprint folders use the same eight Markdown records: `README.md`, `planning.md`, `estimation-and-capacity.md`, `sprint-backlog.md`, `daily-progress.md`, `review.md`, `retrospective.md` and `evidence/README.md`. The evidence folder also holds any retained artifacts. Completed sprints retain actual outcomes and dated history; active sprints retain planned checks and unfilled outcome fields until those events happen.

- Each story card separates the user story, acceptance criteria and implementation tasks. Use `KAN-<number>-AC<number>` as the repository reference for a criterion; these labels are not Jira issue keys. Copy current Jira wording without silently adding technical proposals as agreed requirements.
- Use `S1-Txx` / `S2-Txx` for planned test scenarios and the run register for executed results. Link the criterion, test, result and relevant implementation; a planned test is not a passing result.
- Record meeting decisions separately from proposed refinements. Preserve original sprint scope, estimates, dated failures and later retests.
- Use **Not recorded**, **To agree**, **Not executed** and **Not assessed** for the different gaps. A completed document structure or Jira sprint closure does not establish a complete evidence package.

The [Sprint 1 completion checklist](sprint-01/README.md#documentation-and-evidence-completeness) identifies the remaining evidence. The [Sprint 2 refinement register](sprint-02/planning.md#jira-refinements-to-record) identifies decisions still to carry into Jira.

The final sprint additionally needs recordings of planning, review, retrospective and one daily standup. Store links to large unlisted recordings; do not commit the recordings or put video files into the submission ZIP. Use access settings appropriate to the course's submission requirements.

These records belong in **folder 4** of the final submission. The [submission checklist](../submission/checklist.md) explains how to assemble all seven deliverables.

## Record preparation

Planning, backlog reconciliation and document checks were AI-assisted. Scope and estimate selections used delegated chat planning; no independent six-member vote is recorded. Sources, dates and actual test execution methods are retained. Include the assistance and checks in the pull request.
