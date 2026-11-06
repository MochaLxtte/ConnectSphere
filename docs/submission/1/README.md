# 1. Final product backlog and customer changes

The four sprint reviews accepted **42 parent items worth 174 story points (SP)**. No retained Release 1 parent was left pending at the last review. The inventory includes one technical item, KAN-24, for shared database and integration work. Four archived items appear separately so that a duplicate, an optional waiting list and two staffing requests can still be accounted for. [Master register](../../requirements/product-backlog.md) · [Backlog workbook](product-backlog.xlsx)

## Reading order and source boundaries

| Assessment question | Where to look |
| --- | --- |
| What did the customer need? | The [20-feature index](../../requirements/README.md#first-release-coverage) maps each Week 4 feature to stories and tests. The [G7 customer Q&A](../../requirements/sources/g7-customer-clarifications.xlsx) and [clarification register](../../requirements/assumptions-and-questions.md) distinguish the section’s answers from rules the team had to choose. |
| What did the team commit to and complete? | The [parent register](../../requirements/product-backlog.md) and [workbook](product-backlog.xlsx) give estimates, priorities, sprint history and disposition. [Story cards](../../requirements/story-cards.md) connect each role and goal to an observable criterion and its versioned source. |
| What changed on 2 October? | The [six change records](../../requirements/change-requests.md) identify original behavior, revised criteria, estimates, affected design and dated evidence. The [design report](../../architecture/README.md#customer-changes-and-design-impact) explains how the new roles and workflows fit the existing system. |
| What evidence supports a criterion? | In the workbook, select a story, then a test case ID on **Criterion index**. The [offline case guide](test-cases.html) opens that case’s steps, expected result, recorded attempts and mapped code. The [full test catalogue](../../testing/case-catalogue/README.md) and [requirement-to-result review](../../testing/traceability-review.md) give the underlying records and worked examples. |
| What did the team actually discuss or accept? | The meeting guide below points to the supplied speaker accounts. The four [sprint reviews and point reconciliation](../../scrum/release-burndown.md#reported-review-outcomes) record acceptance. The [formal frozen-release decision](../release-record.md#release-decision) has its own record. |

The Week 1 briefing describes the wider service. Week 4 selects the first-release features. The two G7 sessions record section-specific answers and the Week 7 update changes six requirements. For Scrum decisions, the written sources are the supplied *ConnectSphere Sprint N Planning Script*, *Daily Standup Collection*, *Review Script* and *Retrospective Script* for each sprint. The links below go to copies matched to the supplied files. Cite the numbered speaker cue within the represented meeting or standup. The accounts include staging notes and unanswered prompts. Elapsed video times are available separately for Sprint 4. A dated Jira export records the fields observed then, a sprint review records what the team accepted, and a test execution records what a particular check showed.

## How the backlog evolved

| Sprint | What changed in planning and refinement | What the review decided |
| --- | --- | --- |
| **1 · 6–19 Sep** | Ernest questioned the overlap between creating and saving. Kai Jie separated starting a request, saving it incomplete, and reopening it to edit. Irfan made submission a fourth action requiring complete data. Ryan raised ownership checks. The team used the 2-SP status view as an anchor, sized the four request-write stories at 3 SP each, and kept shared database work at 5 SP. The pencilled-in 48 SP was a capacity assumption. [Planning, cues 08–34](../../scrum/sprint-01/evidence/meetings/planning.docx) · [Provisional and selected estimates](../../scrum/sprint-01/estimation-and-capacity.md) | **7 of 10 items, 24 of 32 SP.** The missing registration fields on an edited draft, inconsistent submission validation and the lack of a route back to a decided request kept KAN-34, KAN-6 and KAN-33 open. All 8 points carried. [Review, cues 04–17](../../scrum/sprint-01/evidence/meetings/current/review.docx) |
| **2 · 20 Sep–3 Oct** | The team put the three repairs alongside nine new venue and assignment stories. Ryan questioned a 43-SP forecast after delivering 24. Ernest needed common venue and interval fields at request and approval, including a concurrent decision. Kai Jie and Tristan took that dependency out of the 24 September standup to settle it. [Planning, cues 08–35](../../scrum/sprint-02/evidence/meetings/current/planning.docx) · [Standups 02–03](../../scrum/sprint-02/evidence/meetings/current/daily.docx) | **7 of 12 stories, 24 of 43 SP.** The team accepted KAN-33’s authorised return path and original automatic assignment. KAN-6, 34, 50, 12 and 52 carried at their full 19 SP. Ernest reported that the original manual scenarios passed while these stories still had unfinished criteria. [Review, cues 03–13](../../scrum/sprint-02/evidence/meetings/current/review.docx) |
| **3 · 4–17 Oct** | Irfan prioritised Lead allocation, buffers, outage recovery and expiring holds together. Kai Jie proposed separating staff configuration from buffer enforcement. Arvin and Irfan worked through the interval needed by holds after the 8 October standup. Independent venue actions and safety moved to the final sprint. At planning on 4 October, the team selected 63 SP for Sprint 3 and forecast 63 SP for Sprint 4. The 16 October Jira records show the board moving from 97 SP in Sprint 3 to the planned 63 SP in each sprint. [Planning, cues 14–25 and 40–53](../../scrum/sprint-03/evidence/meetings/current/planning.docx) · [Standups 02–03](../../scrum/sprint-03/evidence/meetings/current/daily.docx) · [Allocation chronology](../../scrum/sprint-03/planning.md#customer-change-chronology) | **13 of 13 stories, 63 SP.** At review Ryan asked whether expiry alone made a venue available. Irfan explained that another booking or outage still blocks it. The first three reviews were confirmed collectively on 26 October. Their demonstrated builds were not retained. [Review, cues 09–13](../../scrum/sprint-03/evidence/meetings/current/review.docx) · [Sprint review record](../../scrum/sprint-03/review.md) |
| **4 · 18–31 Oct** | The team compared 63 SP with a prior three-sprint average of 37 and 150 available team hours including reviews and testing. For KAN-84, four members initially chose 8 and two chose 5. After discussing versioned safety approval and invalidation, all six chose 8. A missing equipment-readiness response blocked the connected preparation check on 22 October. Kai Jie reported it connected on the 24th. [Planning votes at 10:00 and 10:59](../../scrum/sprint-04/estimation-and-capacity.md#estimation-evidence) · [Standups 02–03](../../scrum/sprint-04/evidence/meetings/current/daily.docx) | **15 of 15 stories, 63 SP.** The recording identifies the bundle and captures group assent at 03:47–03:57. The team separately reported 75 passing procedures for that review. Subsequent failures, repairs and retests retain their own dates. [Recorded decision](../../scrum/final-sprint-recordings.md#review-decision-in-the-recording) · [Case roster and outcomes](../../testing/sprint-4-manual-review.md) |

## Scope and acceptance summary

| Count | Reconciliation |
| --- | --- |
| Unique Release 1 scope | 35 original-scope parent items / **127 SP** plus seven new parent stories / **47 SP** for six changes = **42 items / 174 SP**. KAN-15’s move from 2 to 5 SP is in original scope. Splitting KAN-64’s 8 SP into KAN-64 (5) and KAN-80 (3) added no points. |
| Selected work | 32 + 43 + 63 + 63 = **201 SP selected across four sprints**. The 8 SP carried into Sprint 2 and 19 into Sprint 3 account for the difference from 174. Each unfinished story earned zero in the sprint it left. |
| Accepted work | 24 + 24 + 63 + 63 = **174 SP**, from 7 + 7 + 13 + 15 distinct accepted parent items. Subtasks, archived items and repeat selections receive no additional credit. |
| Release evidence | The team reports a functional Pass for its final end-to-end case including R24. The formal release record reports **Not assessed**. [Release decision and evidence](../release-record.md#release-decision) |

## Following one requirement through a change

On 25 August G7 said the system should automatically assign one coordinator. On 9 September the customer allowed the team to choose the selection rule and assume availability had already been marked. Sprint 2 used least active workload and a deterministic tie-break. Its review accepted KAN-29 at 3 SP. [G7 Q&A, Sheet1 rows 6, 41, 57 and 59](../../requirements/sources/g7-customer-clarifications.xlsx) · [Original story](../../scrum/sprint-02/sprint-backlog.md#kan-29--automatically-assign-event-coordinator) · [Sprint 2 review](../../scrum/sprint-02/review.md#story-decisions)

CR-5 replaced the initial assignment rule. KAN-79 (8 SP) introduced the Lead’s unassigned queue, and existing KAN-65 (3 SP) applied Lead authority to reassignment. Both were accepted in Sprint 3. For one concrete check, KAN-79-AC3 led to TC-05-19, which checks whether both authorised Leads see the queue and eligible targets. The recorded automated Pass belongs to the 19 October run, after the sprint review. [Revised story and criteria](../../scrum/sprint-03/sprint-backlog.md#kan-79--assign-submitted-events-through-a-coordinator-lead-queue) · [Design impact](../../architecture/README.md#customer-changes-and-design-impact) · [Case specification](../../testing/case-catalogue/cf-05.md#tc-05-19) · [Execution EX-05-19-R01](../../testing/case-catalogue/results/cf-05.md#ex-05-19-r01)

## Workbook reconciliation

Open the [master workbook](product-backlog.xlsx) and start with a story ID.

| Worksheet | How to use it |
| --- | --- |
| **Product backlog** | Find any of the 42 retained parents. Read its goal, priority, agreed points, sprint allocation, dependencies and dated review outcome. Select its ID for the criteria or **Source wording** for the historical card. |
| **Criterion index** | Select any test case ID to open its case in the browser. Multiple cases have separate links. Longer lists continue on the next row under the same criterion ID. The index covers 416 IDs across versions. |
| **Story specifications** | Read the captured story wording and acceptance criteria. For a requirement that changed between sprints, follow the [story card](../../requirements/story-cards.md) to the relevant sprint version. |

The [20-feature map](../../requirements/README.md#first-release-coverage) connects customer needs to stories and case results. The [four sprint reviews](../../scrum/release-burndown.md#reported-review-outcomes) explain commitments, carry-over and acceptance. The [archived item register](../../requirements/product-backlog.md#archived-backlog-items) accounts for the four exclusions.

The dated Jira CSVs are archived in Folder 6 under `docs/archive/jira-exports/`. Older evidence logs may cite their former location in Folder 1. For Jira status, ownership and subtasks at a particular date, consult the [21 September](../../archive/jira-exports/jira-backlog-2026-09-21.csv), [11 October](../../archive/jira-exports/jira-backlog-2026-10-11.csv), [15 October](../../archive/jira-exports/jira-backlog-2026-10-15.csv) and [16 October](../../archive/jira-exports/jira-backlog-2026-10-16.csv) snapshots, plus the [targeted 25 October export](../../archive/jira-exports/jira-sprint3-targeted-20261025.csv). Later targeted updates have their own dates. An earlier board status can differ from the later sprint review outcome.

**Three-tab workbook check, 6 November 2026.** Codex matched all 42 parent items to the register, including their sprint history and review disposition. The 416 numbered criteria retain their previous wording, version and case references. The story specifications include all 442 saved acceptance-criterion rows belonging to those parents. Administrative placeholders, subtask descriptions and old follow-up prompts were removed from the workbook.

Desktop Excel recalculated the sprint totals as **24, 24, 63 and 63 SP**. On a disposable copy, moving a 3-SP item to Pending reduced the accepted total from 174 to 171, and restoring it returned 174.

**Week 13 Q&A.** Extract the submission, then open the workbook. Keep `test-cases.html` and the `case-links` folder beside it. The 738 case links open 444 distinct cases offline. Each case shows its specification and execution records. Select an implementation or test filename to read its source with line numbers. Where a direct file mapping is missing, related mappings are labelled separately. Superseded KAN-33-AC5 has no recorded case. Try [TC-18-04, two attendees competing for the last place](test-cases.html#tc-18-04).

## Documentation review and team inputs

**Outstanding team input for WS1.** DOC-101 awaits a different team member’s review of the final register and workbook. Record the reviewer’s name, actual date and any corrections here, then close the [checklist item](../checklist.md#ws1-backlog-and-customer-changes). The 6 November documentation check above records the work Codex performed.

**Customer questions with no further G7 answer.** Cell C67 contains no response on multi-role accounts. Week 1 calls for auditability, but the section records supply no general audit-reader list or retention period. The [clarification register](../../requirements/assumptions-and-questions.md#remaining-boundaries) records how Release 1 handled these boundaries. The supplied evidence is sufficient to document them as unresolved.

## Historical records

[Preserved document before cleanup](archive/2026-11-05/README.md). These dated records remain supporting evidence.

<details>
<summary>Links retained for earlier references</summary>

<a id="1-final-product-backlog"></a>
[1. Final product backlog](archive/2026-11-05/README.md#1-final-product-backlog)

<a id="submission-reconciliation--17-october-2026"></a>
[Submission reconciliation — 17 October 2026](archive/2026-11-05/README.md#submission-reconciliation--17-october-2026)

<a id="reconciliation-validation--17-october-2026"></a>
[Reconciliation validation — 17 October 2026](archive/2026-11-05/README.md#reconciliation-validation--17-october-2026)

<a id="current-export--16-october-2026-after-backlog-reconstruction"></a>
[Current export — 16 October 2026, after backlog reconstruction](archive/2026-11-05/README.md#current-export--16-october-2026-after-backlog-reconstruction)

<a id="course-format-and-ownership-validation--16-october-2026"></a>
[Course-format and ownership validation — 16 October 2026](archive/2026-11-05/README.md#course-format-and-ownership-validation--16-october-2026)

<a id="preserved-earlier-export-records"></a>
[Preserved earlier export records](archive/2026-11-05/README.md#preserved-earlier-export-records)

<a id="earlier-16-october-export--superseded-9729-allocation"></a>
[Earlier 16 October export — superseded 97/29 allocation](archive/2026-11-05/README.md#earlier-16-october-export--superseded-9729-allocation)

<a id="historical-export--15-october-2026"></a>
[Historical export — 15 October 2026](archive/2026-11-05/README.md#historical-export--15-october-2026)

<a id="historical-snapshot--11-october-2026"></a>
[Historical snapshot — 11 October 2026](archive/2026-11-05/README.md#historical-snapshot--11-october-2026)

<a id="historical-snapshot--21-september-2026"></a>
[Historical snapshot — 21 September 2026](archive/2026-11-05/README.md#historical-snapshot--21-september-2026)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>
[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/README.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--closeout-refresh"></a>
[25 October 2026 — Closeout refresh](archive/2026-11-05/README.md#25-october-2026--closeout-refresh)

<a id="28-october-2026--targeted-pr-63-backlog-refresh"></a>
[28 October 2026 — Targeted PR #63 backlog refresh](archive/2026-11-05/README.md#28-october-2026--targeted-pr-63-backlog-refresh)

</details>
