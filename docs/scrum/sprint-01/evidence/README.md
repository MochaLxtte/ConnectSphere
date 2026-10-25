# Sprint 1 evidence register

## Preservation check — 15 October 2026

**Record updated 15 October 2026.** This folder retains the [scaffold Git metadata](2026-09-07-repository-baseline.txt) and the register below. Historical test observations are in [test evidence](../../../testing/test-evidence.md); most original meeting, board, burndown and demo captures are **Not recorded**. The dated register remains a record of what was available then, not a current tracker snapshot.

| ID | Later artifact | Evidence boundary |
| --- | --- | --- |
| S1-E20 | [AUTO-20261015-01](../../../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit); [15 October coverage summary](../../../testing/coverage-reports/2026-10-15-post-sprint-audit.txt) | Later automated verification of the integrated application. It is not a Sprint 1 closure run, hosted acceptance, or evidence that a case passed by 19 September. No historical `sprint-01.txt` coverage summary is retained. |
| S1-E21 | [Sprint 2 baseline and later delivery register](../../sprint-02/review.md#baseline-and-later-delivery-register--15-october-2026) | Follow-up to carried KAN-6/KAN-33/KAN-34 and their included defect subtasks; Sprint 1 remains 32 committed / 24 Done / 8 carried. |

## Historical register context

Sprint: **6–19 September 2026**, inclusive, Asia/Singapore. Last updated: **21 September 2026**. Sprint 1 review is complete and the sprint is closed in Jira; Sprint 2 is initialized. This register distinguishes the recorded closure outcome from supporting artifacts still to capture.

Closure outcome: **7 Done PBIs / 24 points; 3 carried PBIs / 8 points; original commitment 32 points**. The 24 points comprise 19 business-story points and 5 infrastructure points. The current Jira snapshot corroborates statuses, points and owners. KAN-16 has a recorded resolution at **20 September, 23:06**; the other six Done stories at **21 September, 00:26**. These timestamp fields do not state a timezone and describe later tracker updates, separate from the **19 September review and retrospective**. The original export, closing report and daily burndown remain to be preserved; the snapshot does not reconstruct daily acceptance or completion observations. See the [Jira audit](../../../requirements/assumptions-and-questions.md#21-september-2026--jira-backlog-audit).

Use the [submission checklist](../../../submission/checklist.md) to prepare the seven deliverable folders. Collect Scrum process evidence for every sprint. Recordings of planning, review, retrospective and one daily standup are required for the **final sprint only**; Sprint 1 recordings are optional. Include recording links in the submission, with large recordings uploaded as unlisted videos, rather than video files.

## Register

Replace planned filenames with the captured artifact's relative path or stable link. Record its owner, capture time and relevant version using the metadata below.

| ID | Evidence artifact | Rubric / assessment purpose | When to capture | Intended location / source | Current status |
| --- | --- | --- | --- | --- | --- |
| E01 | Sprint-planning notes, goal, participants, decisions and attendance | Scrum process and evidence; estimation and planning | Planning held 6 September | [Planning record](../planning.md) plus original notes/export | Meeting decisions recorded; original notes, times and attendance to attach |
| E02 | Product/sprint backlog with priorities, story wording and acceptance criteria | Backlog quality and sprint planning | Baseline and material refinements | [Sprint backlog](../sprint-backlog.md#current-jira-reconciliation--21-september); dated Jira export | Current Jira descriptions and 79 functional-story criteria reviewed; points, owners and statuses match. Preserve the reviewed original export with capture metadata, cross-reference local criteria/test IDs and record the adopted version. KAN-24 received five explicit checks on 21 September; retain their refinement date and complete criterion-to-evidence and diagram/hosted checks. |
| E03 | Estimation method, initial estimates/votes if used, discussion of differences, revised estimates and agreed points | Estimation and planning | Planning held 6 September | [Estimation record](../estimation-and-capacity.md); original estimation/meeting evidence | 32-point commitment recorded, using KAN-33/KAN-16 at 2 points as relative sizing anchors; supporting estimation notes to attach |
| E04 | Named availability, leave/other commitments and capacity calculation | Estimation and planning | Planning and dated capacity changes | [Estimation and capacity](../estimation-and-capacity.md) | Six named developers available on weekends for review/planning; Arvin is Scrum Master and Irfan Product Owner. Historical development capacity remains to complete. |
| E05 | Start board/sprint report with selected stories and starting estimates | Original commitment and progress baseline | Sprint start | `YYYY-MM-DD-HHMM+0800_start-board.<ext>` and tracker export | Original start snapshot to attach |
| E06 | Story task breakdown, named owners, status/estimate changes and blocker history | Task-level planning, participation and progress visibility | At planning and during implementation | [Sprint backlog](../sprint-backlog.md); Jira issue history/export | Local task breakdown and current Jira owners/statuses reviewed. KAN-42 integration testing and KAN-43 code review remain In Progress under KAN-33. Full issue-change/blocker history remains to add. |
| E07 | Dated daily Scrum notes, participants, next steps, impediments and follow-up | Daily inspection and adaptation | Each actual meeting/check-in | [Daily progress](../daily-progress.md); original meeting notes where available | Sprint 1 originally planned two standups per week; actual meeting records still to add. Development updates include the 15 September review work and 17–18 September KAN-16/access checks. These updates and the 21 September closeout summary are not standup minutes. Sprint 2's agreed cadence is Saturday, Tuesday and Thursday. |
| E08 | Dated burndown source data and chart, including scope-change annotations | Tracking actual progress and responding to variance | Agreed daily checkpoint and sprint closure | [Daily progress](../daily-progress.md); tracker export/chart | Planned — actual burndown not attached |
| E09 | Dated technical decisions and changes to scope, requirements, estimates or capacity | Adaptation, transparent planning and traceable decisions | Whenever a change is agreed | [Daily progress and decisions](../daily-progress.md); linked technical and backlog records | Supabase hosting selected 8 September; Supabase Auth and assigned-coordinator enforcement connected by 15 September. KAN-16's all-status organiser list and shared read-only detail were connected. Preserve these dated decisions. Closeout carries KAN-6/33/34 forward at 8 points; Sprint 1's original 32-point baseline is unchanged. See dated technical records and review findings. |
| E10 | Implementation commits, PR discussions/reviews and actual CI runs | Code quality and CI; accountability and explainability; working software | During implementation and for the reviewed commit | Actual Git/PR/Actions links and retained result exports | Implementation commits include `8334f94` (authenticated assigned-coordinator access), `c14eaf4` (review permissions and outcomes), `96188b5` (KAN-16 all-status list API), `2261a8b` (organiser status list) and `95cd43e` (organiser details and outcomes). Tristan integrated the branches into `main`: [PR #12](https://github.com/MochaLxtte/ConnectSphere/pull/12), merge `db2c9db`, 20 September 23:30:37 +08:00 in local Git. Exact demo build and corresponding peer-review/CI records remain to attach. Earlier executed runs retain their own links in test evidence. |
| E11 | Story/acceptance-criterion-linked normal, boundary, conflict and failure test cases, executed results and relevant failure traces | Testing and traceability | On tested builds, including the reviewed increment | [Testing records](../../../testing/README.md); actual reports/commands/commit | Preserve the dated automated results and MAN-20260917-01 through MAN-20260917-06 covering organiser outcomes/refresh, signed-out access, other-organiser isolation and status labels; also preserve MAN-20260918-01's review-access recheck. MAN-S1-REVIEW-01 records review observations: nine passing demos and the reported draft/submission/coordinator issues. Exact reproduction, reviewed build, curated exports and CI links remain to add. |
| E12 | End board, completed/unfinished scope and actual velocity calculation | Sprint outcome and transparent completion reporting | Actual sprint close; record any later export date separately | `YYYY-MM-DD-HHMM+0800_end-board.<ext>`; [review](../review.md) | Current snapshot corroborates seven Done PBIs / 24 points and three In Review carry-over PBIs / 8 points, with later 20–21 September resolution updates noted above. Preserve the original reviewed export and add the actual closing report/board. This snapshot is not the closing report or daily burndown. |
| E13 | Sprint review notes, demo outcomes, stakeholder feedback and backlog decisions | Scrum process and evidence; user stories and customer needs; working software | Review held 19 September; closeout notes prepared 21 September | [Review record](../review.md); supporting artifacts/optional recording link | Review completed. DEMO-01/03/04/05/07/08/09/10/11 passed; DEMO-02/06 exposed issues, with further saved-draft submission and required-field validation reports retained. Meeting times, attendees, reviewed commit and supporting captures remain to attach. |
| E14 | Retrospective observations, supporting evidence, selected causes and owned improvement actions | Scrum process and evidence; accountability and explainability | Retrospective held 19 September; writeup prepared 21 September | [Retrospective](../retrospective.md); supporting notes/optional recording link | Tristan owns the writeup. Meeting date, review-derived observations and proposed improvements recorded; meeting times, attendance, discussion notes, votes and agreed root causes are not recorded. Agreed improvement actions, owners and target dates remain to record. |
| E15 | C4 design at relevant commit and significant design decisions | System design consistent with implemented increment | After material design changes and sprint closure | [Architecture records](../../../architecture/README.md); versioned source/export | Planned — confirm actual Sprint 1 design version at closure |
| E16 | Optional Sprint 1 planning/review/retro/standup recording links with dates and participants | Supporting meeting records | If meetings are recorded | [Add stable links and access details; no video files in Git] | Optional; no recordings attached |
| E17 | Local scaffold commit | Starting technical baseline | Git metadata captured 7 September | [Captured Git metadata](2026-09-07-repository-baseline.txt): commit `db6930d`, timestamp `2026-09-07T02:58:37+08:00`, message `chore: scaffold ConnectSphere project` | Captured locally; remote presence, PR review and CI result to verify |
| E18 | Actual owner walkthrough notes connecting a requirement to code/tests and explaining design trade-offs and any AI contributions | Accountability and Explainability | During reviews and preparation for sprint/course Q&A | [Add dated notes or PR discussion links and named contributors] | Planned — owner explanations not attached |
| E19 | Sprint 2 handoff, carryover, baseline and story-selection actions | Adaptation and continuity between sprints | Closeout notes prepared 21 September; attach Jira captures with actual export times | [Sprint 2](../../sprint-02/README.md); [planning handoff](../planning.md#closeout-and-sprint-2-handoff--recorded-21-september) | Current Jira snapshot matches 43 points: nine new stories / 35 points plus KAN-6/33/34 / 8 points. New stories remain unassigned; Kai Jie retains KAN-6/34 and Irfan KAN-33. Three weekly Daily Scrums agreed for Saturday, Tuesday and Thursday. Preserve the reviewed export with its actual capture metadata. |

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

The sprint's Jira closure is complete. The evidence checklist below remains open because completion of the sprint and completeness of its retained artifacts are separate facts. Attach missing originals with their true capture dates; preserve historical test limitations and the conflicting successful/unsuccessful submission observations until their exact paths are reconciled.

- [ ] Meeting records, estimates and completed stories link to supporting evidence; outstanding records are identified.
- [ ] The baseline, scope changes, daily observations, final board and velocity reconcile without counting unfinished work as Done.
- [ ] Planning, review and retrospective decisions identify actual participants and follow-up owners.
- [ ] All internal links resolve and external links are checked for the intended assessors before submission.
- [ ] Missing evidence and its impact are recorded; notes completed later show their preparation date and source.

At final submission, include this sprint's process records and evidence in numbered folder **4 (Scrum evidence)**. The full final backlog goes in **1**, C4 in **2**, test cases/results in **3**, the self-contained PDF deck using the prescribed template in **5**, working code and CI scripts in **6**, and repository README/access details in **7**. Check the [submission checklist](../../../submission/checklist.md) for the complete release requirements.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

**S1-E22 — Arvin historical contribution readback, registered 25 October.**

**KAN-24 — infrastructure, Arvin, 5 SP.** [PR #10](https://github.com/MochaLxtte/ConnectSphere/pull/10) merged on **20 September 22:43 Singapore time**, after Sprint 1’s planned 19 September end. It supplied first-release database/schema, ERD and persistence work, but also introduced business workflows beyond the infrastructure story. Arvin subsequently removed uncommitted future-scope application features in [PR #19](https://github.com/MochaLxtte/ConnectSphere/pull/19), merged **26 September 18:54**; database migration history and required shared dependencies remained. The removed workflows are not delivery credit for KAN-24 or for other members’ stories. Initial scaffolding authored by Mochs is not attributed to Arvin.

The retained Jira Done entry and the original closure totals do not establish that this 20 September merge met the Definition of Done by 19 September. PR #10 was self-merged; neither #10 nor #19 has a submitted human review in the GitHub readback. PR-reported tests are historical reported results, not newly executed manual checks. Preserve `KAN-24-AC1`–`AC4`, `TC-DB-201`–`205` and `S1-T31`–`S1-T33`; reproducible setup, hosted security configuration and diagram verification must retain their existing evidence limits. No additional Done SP or revised velocity is asserted.

The retained [GitHub metadata](../../sprint-03/evidence/arvin-contributions-github-2026-10-25.json) contains authors, commits, merge timestamps and submitted reviews. Readback date is distinct from actual delivery dates; no new tests were run.
