# Sprint 1 evidence register

Sprint: **6–19 September 2026**, inclusive, Asia/Singapore. Last updated: **7 September 2026**. This register tracks the records needed for Sprint 1, their locations and outstanding captures.

Use the [submission checklist](../../../submission/checklist.md) to prepare the seven deliverable folders. Collect Scrum process evidence for every sprint. Recordings of planning, review, retrospective and one daily standup are required for the **final sprint only**; Sprint 1 recordings are optional. Include recording links in the submission, with large recordings uploaded as unlisted videos, rather than video files.

## Register

Replace planned filenames with the captured artifact's relative path or stable link. Record its owner, capture time and relevant version using the metadata below.

| ID | Evidence artifact | Rubric / assessment purpose | When to capture | Intended location / source | Current status |
| --- | --- | --- | --- | --- | --- |
| E01 | Sprint-planning notes, goal, participants, decisions and attendance | Scrum process and evidence; estimation and planning | Planning held 6 September | [Planning record](../planning.md) plus original notes/export | Meeting decisions recorded; original notes, times and attendance to attach |
| E02 | Product/sprint backlog with priorities, story wording and acceptance criteria | Backlog quality and sprint planning | Baseline and material refinements | [Sprint backlog](../sprint-backlog.md); dated Jira export | Sprint scope recorded; detailed criteria awaiting team review; Jira export to attach |
| E03 | Estimation method, initial estimates/votes if used, discussion of differences, revised estimates and agreed points | Estimation and planning | Planning held 6 September | [Estimation record](../estimation-and-capacity.md); original estimation/meeting evidence | 32-point commitment recorded, using KAN-33/KAN-16 at 2 points as relative sizing anchors; supporting estimation notes to attach |
| E04 | Named availability, leave/other commitments and capacity calculation | Estimation and planning | Planning and dated capacity changes | [Estimation and capacity](../estimation-and-capacity.md) | Six developers, including SM/PO, available on weekends for review/planning; names and development capacity to complete |
| E05 | Start board/sprint report with selected stories and starting estimates | Original commitment and progress baseline | Sprint start | `YYYY-MM-DD-HHMM+0800_start-board.<ext>` and tracker export | Original start snapshot to attach |
| E06 | Story task breakdown, named owners, status/estimate changes and blocker history | Task-level planning, participation and progress visibility | At planning and during implementation | [Sprint backlog](../sprint-backlog.md); Jira issue history/export | Draft task breakdown available; named owners and Jira history to add |
| E07 | Dated daily Scrum notes, participants, next steps, impediments and follow-up | Daily inspection and adaptation | Each actual meeting/check-in | [Daily progress](../daily-progress.md); original meeting notes where available | Planned — actual daily records not attached |
| E08 | Dated burndown source data and chart, including scope-change annotations | Tracking actual progress and responding to variance | Agreed daily checkpoint and sprint closure | [Daily progress](../daily-progress.md); tracker export/chart | Planned — actual burndown not attached |
| E09 | Dated changes to scope, requirements, estimates or capacity with reasons and decisions | Adaptation, transparent planning and traceable decisions | Whenever a change is agreed | Planning/backlog change records; original ticket/customer evidence | No scope changes recorded |
| E10 | Implementation commits, PR discussions/reviews and actual CI runs | Code quality and CI; accountability and explainability; working software | During implementation and for the reviewed commit | Actual Git/PR/Actions links and retained result exports | Planned — sprint implementation/PR/CI evidence not attached |
| E11 | Story/acceptance-criterion-linked normal, boundary, conflict and failure test cases, executed results and relevant failure traces | Testing and traceability | On tested builds, including the reviewed increment | [Testing records](../../../testing/README.md); actual reports/commands/commit | Planned — business-story test evidence not attached |
| E12 | End board, completed/unfinished scope and actual velocity calculation | Sprint outcome and transparent completion reporting | Actual sprint end, before next sprint changes the board | `YYYY-MM-DD-HHMM+0800_end-board.<ext>`; [review](../review.md) | Planned — sprint has not closed |
| E13 | Sprint review notes, demo outcomes, stakeholder feedback and backlog decisions | Scrum process and evidence; user stories and customer needs; working software | Review scheduled 19 September; later feedback as received | [Review record](../review.md); supporting artifacts/optional recording link | Scheduled; agenda and demo run sheet prepared |
| E14 | Retrospective observations, supporting evidence, selected causes and owned improvement actions | Scrum process and evidence; accountability and explainability | Proposed 19 September; bring actions to 20 September Sprint 2 Planning and follow up during Sprint 2 | [Retrospective](../retrospective.md); supporting notes/optional recording link | Agenda prepared; meeting date/time to confirm |
| E15 | C4 design at relevant commit and significant design decisions | System design consistent with implemented increment | After material design changes and sprint closure | [Architecture records](../../../architecture/README.md); versioned source/export | Planned — confirm actual Sprint 1 design version at closure |
| E16 | Optional Sprint 1 planning/review/retro/standup recording links with dates and participants | Supporting meeting records | If meetings are recorded | [Add stable links and access details; no video files in Git] | Optional; no recordings attached |
| E17 | Local scaffold commit | Starting technical baseline | Git metadata captured 7 September | [Captured Git metadata](2026-09-07-repository-baseline.txt): commit `db6930d`, timestamp `2026-09-07T02:58:37+08:00`, message `chore: scaffold ConnectSphere project` | Captured locally; remote presence, PR review and CI result to verify |
| E18 | Actual owner walkthrough notes connecting a requirement to code/tests and explaining design trade-offs and any AI contributions | Accountability and Explainability | During reviews and preparation for sprint/course Q&A | [Add dated notes or PR discussion links and named contributors] | Planned — owner explanations not attached |

Repository: `https://github.com/MochaLxtte/ConnectSphere.git`. Add verified commit, PR and CI links as implementation progresses. Record instructor access checks in submission folder 7.

## Capture and preservation rules

1. Record meeting/observation time and capture/export time separately when they differ, including the timezone. Use filenames such as `2026-09-07-1830+0800_daily-scrum.md` with the actual capture date.
2. Retain source artifacts alongside readable summaries: tracker export and board screenshot, burndown data and chart, meeting notes and minutes, test report and result summary.
3. Record the contributor, sprint/filter/time period, related story IDs and relevant commit. Include useful status and date context in screenshots.
4. Attach the original 6 September planning notes and start-board snapshot when available. For a baseline recovered from tracker history, record the export date, source timestamps and any gaps.
5. Preserve the 32-point commitment. Log additions, removals and estimate changes with dates, reasons and participants, and reconcile them with the burndown and review.
6. Record the team's actual daily cadence and leave missing observations blank. Retain notes on skipped meetings or alternative check-ins where relevant.
7. Link executed tests to the tested commit, date, command/environment and result. Keep planned cases, scaffold checks and executed business-feature tests clearly identified, including failures and their resolution.
8. Use relative links for repository artifacts and stable URLs for external evidence. Check that assessors can access linked evidence and record the verification date.
9. Keep credentials, `.env` contents, real personal-data fixtures, database dumps and video files out of Git. Include recording links in the final ZIP.

## Artifact metadata to copy

```text
Evidence ID:
Artifact title:
Event/observation date and time (timezone):
Capture/export date and time (timezone):
Captured by:
Source tool/file and filter/sprint:
Related Jira IDs / acceptance criteria:
Git commit / environment, if relevant:
Original artifact location:
Readable extract / screenshot location:
Limitations or missing context:
Access verified by / date / intended audience:
```

## Sprint closure and final submission handoff

- [ ] Meeting records, estimates and completed stories link to supporting evidence; outstanding records are identified.
- [ ] The baseline, scope changes, daily observations, final board and velocity reconcile without counting unfinished work as Done.
- [ ] Planning, review and retrospective decisions identify actual participants and follow-up owners.
- [ ] All internal links resolve and external links are checked for the intended assessors before submission.
- [ ] Missing evidence and its impact are recorded; notes completed later show their preparation date and source.

At final submission, include this sprint's process records and evidence in numbered folder **4 (Scrum evidence)**. The full final backlog goes in **1**, C4 in **2**, test cases/results in **3**, the self-contained PDF deck using the prescribed template in **5**, working code and CI scripts in **6**, and repository README/access details in **7**. Check the [submission checklist](../../../submission/checklist.md) for the complete release requirements.
