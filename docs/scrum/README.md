# Scrum evidence

**26 October 2026 KAN-9 development:** the authorised Sprint4 equipment checker is implemented on a local feature branch. KAN-9 is In Progress / Tristan; KAN-26 is To Do / Tristan. [S4-E10](sprint-04/evidence/README.md#kan-9-equipment-availability--26-october-2026) records automated verification and unperformed integrated acceptance. This targeted development update does not replace the dated administrative snapshots or claim a new sprint ceremony.

## Acceptance and closure inputs — 26 October 2026

Acceptance decisions are now supplied. All six members — Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan — are reported to have collectively agreed against the stories' ACs and Definition of Done at each sprint review. These historical decisions were confirmed on 26 October; the confirmation is not a newly held review or a historical artifact. Reviewed build/commit/branch identifiers were not retained and stay **Not recorded**.

| Sprint / review | Reported review outcome | Current record |
| --- | --- | --- |
| 1 / 19 September | 7 accepted / 24 SP; KAN-6, KAN-33 and KAN-34 carried / 8 SP | [Review](sprint-01/review.md#current-acceptance-and-closure--26-october-2026) |
| 2 / 3 October | Seven non-carried stories accepted / 24 SP; five original-scope completion stories / 19 SP remain the recorded carry-over disposition. Customer-change additions do not revoke original acceptance. | [Review and carry-over classification](sprint-02/review.md#current-acceptance-and-closure--26-october-2026) |
| 3 / 17 October | All 13 stories / 63 SP accepted; no carry-over, according to the team report | [Review and evidence reconciliation](sprint-03/review.md#current-acceptance-and-closure--26-october-2026) |

Later audit failures, repairs, PRs and test runs retain their dates. In particular, the Sprint 3 report does not resolve whether the failures reproduced on 25 October existed in the unknown 17 October build. The review report and its evidence limitation both remain visible; historical DoD compliance is not inferred from the later passing candidate.

**The team will supply these three items for each sprint:**

1. **Closing board:** screenshot or export, with its capture date and file/link. A newly captured board is labelled current; it does not become an original sprint-end screenshot.
2. **Review feedback:** feedback raised, affected story if any, and each agreed action with owner and target date. Say explicitly if there was no feedback or no agreed action. Retrospective feedback/actions are separate; existing proposed retrospective actions remain To agree until confirmed.
3. **Burndown chart and source data:** the chart export and the dated scope/remaining-point observations used to produce it, including scope changes. The team prepares these. Keep reported review totals and actual observation dates distinct; no daily data is generated here.

Place files in the relevant `sprint-01/evidence/`, `sprint-02/evidence/` or `sprint-03/evidence/` folder and provide the paths. Each evidence register will link the supplied artifact with its source/capture date. Until supplied, the artifact and feedback details remain **Not recorded**. The missing reviewed builds are recorded as unavailable and are not a repeated request.

The [26 October Jira metadata](sprint-03/evidence/jira-sprint-metadata-20261026.json) confirms Sprint 1 and Sprint 2 Closed, Sprint 3 Active and Sprint 4 Future. Administrative closure remains separate from reported acceptance; no Jira changes were made. There is no public application-deployment requirement and no request to repeat all manual tests.

**25 October 2026 closeout reconciliation.** The latest repair smoke checks are reported **Pass** in [REPORT-20261025-CLOSEOUT-RETEST](../testing/test-evidence.md#25-october-2026--closeout-retest-confirmation). The report was supplied on 25 October; actual execution date, tested build, individual executor, captures and cleanup details are **Not recorded**. Sprint 1–3 historical results, current ownership and full meeting attendance reports remain preserved. Local automated checks pass, and the approved Supabase hold-expiry job has run successfully. Formal story review/closure, missing process artifacts, burndown charts and agreed retrospective actions remain separate; historical sprint dates and velocity are unchanged.

**Acceptance environment clarified — 25 October 2026.** The application will run locally; public app/API deployment and a deployed URL are not required. The [Definition of Done](definition-of-done.md) permits acceptance through the integrated local frontend/API with real mapped authentication and the shared development database. Reproducible connected workflows and operational Supabase setup remain required. Earlier dated hosted/deployed wording below records previous checkpoints and is superseded for the current acceptance environment.

**25 October scoped readback — Arvin:** KAN-34 (3 SP) and KAN-78 (8 SP) were integrated through PR #48/#54 on 22 October. The [Sprint 3 backlog](sprint-03/sprint-backlog.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) distinguishes Arvin's ownership, independent review history, latest automated evidence and remaining hosted acceptance. Other stories and sprint administration were not re-audited; no sprint-end delivery or velocity is inferred.

**Ryan story verification records — 25 October 2026.** Tristan reports that Ryan completed the original KAN-25 manual scenarios on **19 September**, original KAN-12 scenarios on **3 October**, and revised KAN-12 plus the KAN-50 stale-save repair on **17 October 2026**. The [reported results](../testing/test-evidence.md#25-october-2026--ryan-story-verification-records) distinguish these reported execution dates from the 25 October documentation date; tested builds, environments, fixtures and captures are **Not recorded**. KAN-25 and KAN-12 are currently Done / Ryan in Jira; KAN-50 remains In Progress / Ryan. The KAN-50 report covers AC101 only. Later PR/CI dates, original acceptance records and sprint velocity are unchanged.

**KAN-79 / KAN-65 manual-test report — 25 October 2026.** Tristan reports that the manual scenarios for both Sprint 3 stories passed on localhost on **17 October 2026**, using local work before it was pushed. [REPORT-20261025-TRISTAN-S3](../testing/test-evidence.md#25-october-2026--reported-manual-results-for-original-stories) and [S3-E23](sprint-03/evidence/README.md#reported-kan-79-and-kan-65-manual-results--25-october-2026) retain this reported date; the tested builds are **Not recorded**. KAN-64 integration and the PR #34 merge remain documented on their actual recorded dates. Both stories remain In Progress in Jira, with acceptance and Definition of Done **Not assessed**; the report does not establish a deployed-site test or change historical velocity.

**KAN-65 follow-up — 19 October 2026.** KAN-65 and subtasks KAN-88/89/90 are In Progress / Tristan; the estimate remains 3 SP. Branch `feat/KAN-65-coordinator-reassignment` includes KAN-79 and implements Lead-only reassignment with a required reason, assignment-version checks, atomic audit history and current-assignment permissions. `AUTO-20261019-02` records local verification. KAN-64 notifications, manual/hosted workflow checks, independent review and acceptance remain pending. The earlier KAN-79 dependency notes below describe that earlier implementation stage. This targeted update does not change sprint scope, historical evidence or velocity.

**KAN-79 implementation update — 19 October 2026.** KAN-79 is assigned to Tristan and In Progress in Jira, with subtasks KAN-85/86/87 In Progress. Its 8 SP and Sprint 3 membership are unchanged. The branch implements trusted Lead access, unassigned submission, oversight and initial allocation; automated verification is recorded as `AUTO-20261019-01`. KAN-65/KAN-64 integration, hosted checks, independent review and acceptance remain outstanding. Other stories retain their last dated snapshot; this is a targeted update, not a fresh project-wide export. Sprint 3 remains administratively Active despite its configured 17 October end; this work is recorded on its actual 19 October date and is not counted as delivery by 17 October.

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

**17 October submission reconciliation.** The [master backlog](../requirements/product-backlog.md#master-backlog-register) distinguishes the current plan from closed-sprint history and [documented customer changes](../requirements/change-requests.md). Sprint 1/2 criterion crosswalks and functional-case specifications improve traceability without altering original sprint totals or acceptance. Historical snapshots below/within sprint documents retain their date; current metadata comes from the latest labelled register.

Planning, backlog reconciliation and document checks were AI-assisted. Scope and estimate selections used delegated chat planning; no independent six-member vote is recorded. Sources, dates and actual test execution methods are retained. Include the assistance and checks in the pull request.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

Arvin’s cross-sprint contribution register is in the [master backlog](../requirements/product-backlog.md). Sprint 1/2 records now contain dated factual backfills for KAN-24/KAN-51; Sprint 3 also records supporting preparation, rollout and KAN-81 review work. Historical sprint status and closure dates are preserved.
