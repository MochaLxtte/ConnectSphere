# 1. Final product backlog

**Targeted KAN-79 update — 19 October 2026.** The [workbook](product-backlog.xlsx) and [master register](../../requirements/product-backlog.md) now record KAN-79 as In Progress / Tristan, still 8 SP in Sprint 3, and the three new unestimated subtasks KAN-85/86/87. The 16 October CSV remains an unchanged historical full-project snapshot. Other issues have not been re-exported in this update. Branch implementation and `AUTO-20261019-01` are recorded separately from implementation on main, hosted acceptance and DoD. Parent totals remain 42 / 174 SP; no delivery or velocity credit is added. See S3-E14 for the current verification and pending integration/deployment checks.

## Submission reconciliation — 17 October 2026

Use the [master workbook](product-backlog.xlsx) and [Markdown master register](../../requirements/product-backlog.md#master-backlog-register) as the submitted backlog. They include original Sprint 1/2 work, later completion/carry-over, the current Sprint 3/4 plan, and the six documented customer changes. The [change register](../../requirements/change-requests.md) explains which original rules are retained, extended or superseded. Different historical and current criteria are intentional where that change is documented.

A live read on 17 October returned the same 68 Jira issues and compared fields as the [16 October CSV](jira-backlog-2026-10-16.csv); the CSV retains its original date and contents. Repository supplements are explicitly labelled in the workbook and sprint cards: KAN-12-AC102 and KAN-52-AC102 restore existing no-automatic-event-rejection rules omitted from current Jira, and KAN-24-AC4 identifies the existing database-diagram check. These are documentation corrections, not additional stories or estimates. No Jira cards were changed during this cleanup.

The dated [Sprint 1 crosswalk](../../scrum/sprint-01/sprint-backlog.md) and [Sprint 2 reconciliation](../../scrum/sprint-02/sprint-backlog.md) connect source requirements, stable local criteria and the [functional case register](../../testing/test-cases.csv). The workbook links these detailed mappings rather than duplicating every test procedure. Added cases are specifications with **Not executed** results; existing dated passing/failing observations remain in [test evidence](../../testing/test-evidence.md). Current reconciliation does not supply missing historical review/retrospective records, acceptance, burndown evidence or test runs.

Current parent totals remain **42 items / 174 SP**: 48 administrative Done, 63 selected for Sprint 3 and 63 for Sprint 4. Sprint 1's **32/24/8** reported outcome and Sprint 2's **43 = 35 + 8** commitment remain unchanged. The sections below are the preserved earlier export and validation records; their hashes and criterion counts apply to those versions.

## Reconciliation validation — 17 October 2026

The source export below is retained with its original date. The current workbook's later reconciliation is verified separately here: [17 October validation and hashes](../../scrum/sprint-03/evidence/submission-reconciliation-validation-2026-10-17.json). Documentation checks passed **21/21**, with **398 functional cases / 95 traceability rows**; workbook native preservation passed **12/12**, retaining seven sheets, 11 tables and 689 original specification rows. Three labelled supplements and 19 historical story references have been added. Changed workbook views were visually inspected; Excel desktop was **Not executed**. These checks do not replace product tests or historical acceptance evidence.

## Current export — 16 October 2026, after backlog reconstruction

The [master workbook](product-backlog.xlsx), [Jira CSV](jira-backlog-2026-10-16.csv) and [Markdown master register](../../requirements/product-backlog.md#master-backlog-register) use the live Jira snapshot after backlog reconstruction, self-selection and course-format cleanup. They include completed Sprint 1 work, Sprint 2 history and the remaining release stories. Project scope and deliverables follow the project instructions and rubric; the [course references](../../requirements/README.md#course-and-project-conventions) explain the story and Scrum formats.

| Current export record | Value |
| --- | --- |
| Source | Live KAN project, JQL `project = KAN ORDER BY key ASC`; full descriptions, parent links, estimates, assignments, relationships and sprint/resolution metadata retained. |
| Scope | 68 issues: 42 parents (41 stories and corrective task KAN-60) plus 26 subtasks. Four historical exclusions remain separate; subtasks add no story points. |
| Current estimates/status | 174 parent SP: 14 Jira Done parents / 48 SP and 28 To Do parents / 126 SP. No unestimated parents. These administrative statuses are not historical sprint acceptance or velocity. |
| Sprint 3 | Active id 67, 4–17 October: 13 parent items / 63 SP. Includes the five full-point carry-over stories (19 SP), Lead assignment, buffered venue planning, outage recovery, expiring holds and the first notification slice. |
| Sprint 4 | Future id 68, 18–31 October: 15 parent items / 63 SP. Includes equipment, lifecycle, registration, event changes, independent venue arrangements, safety review and later notification triggers. Reforecast actual unfinished Sprint 3 work explicitly. |
| Customer-change chronology | Changes received 2 October, as confirmed in chat on 16 October. The team intended to finish the original Sprint 2 scope and consider the changes in Sprint 3 planning. Source assessment recorded 15 October; backlog reconstruction/rebalance recorded 16 October. These are separate dates. |
| Change allocation | CR-1: KAN-77/78; CR-2: KAN-81; CR-3: KAN-82; CR-4: KAN-83; CR-5: KAN-79 plus existing KAN-65; CR-6: KAN-84. All six changes now have Jira mappings. |
| Point reconciliation | The former 29-SP forecast is now four Jira stories and is not added again. KAN-64 splits from 8 SP into 5 SP plus KAN-80 at 3 SP, with no release-scope increase. The previous 97/29 allocation is superseded by 63/63; remaining scope stays 126 SP. |
| Historical baseline | Sprint 1 remains 32 committed / 24 reported Done / 8 carried. Sprint 2 remains 43 = 35 new + 8 carry; five stories carry 19 SP at full estimates. Sprint 2 historical acceptance/velocity remains **Not recorded**. Its administrative closure was 16 October 02:06 +08. |
| Workbook | All seven existing tabs retained. Current Jira wording, allocation and earlier evidence are separate. The 28 unfinished items use concise user stories/objectives and 299 stable ACs; superseded full-scope notification wording remains in repository history. The former 23-item / 97-SP selection remains a labelled historical table outside current totals. |
| Validation | Current Jira/export/card/case reconciliation passed 17/17 checks: 68 issues, 28 active parent cards, 299 criteria, 256 case rows and 76 traceability rows. Workbook, link and whitespace verification details are retained in the latest validation below; the earlier 23/23 result describes the pre-cleanup workbook. Excel desktop was not launched. |
| Evidence boundary | This update performs workbook/document checks, not application tests or hosted acceptance. Estimates and allocation follow the recorded planning method; no six-member vote, earlier finalisation or completed review is invented. |

The CSV omits account identifiers, emails, comments and attachments. It is a portable scope snapshot, not a full Jira backup. Earlier dated exports remain historical. Refresh the current workbook/export at actual sprint review and before submission.

## Course-format and ownership validation — 16 October 2026

The workbook and CSV reflect self-selection: all 28 remaining parents are unassigned, with independent reviewers To agree. Current descriptions contain the user story (or technical objective), acceptance criteria and related requirements; estimates, priorities, assignments and sprints remain native fields. Four KAN-6/KAN-34 criteria explicitly retain original requirements that were condensed in earlier summaries; TC-02-09 and TC-03-06 are new specifications and remain **Not executed**. The 14 Done parent descriptions are unchanged.

Totals remain 63/63 and 174 parent SP. The team still needs to confirm estimates and capacity; the equal-point target is guidance, not a quota. The [latest validation and hashes](../../scrum/sprint-03/evidence/handover-validation-2026-10-16.json) supersede earlier artifact hashes for these refreshed files. Excel desktop was not run.

## Preserved earlier export records

The following entries describe earlier snapshots. Their current/future wording and totals are historical and are superseded by the export above. The workbook and 16 October CSV links now open the latest export; use the dated narrative and preserved historical workbook table to understand the earlier allocation.

**Preserved initial proposal note — 16 October:** the [initial Sprint 3/Sprint 4 proposals](../../scrum/sprint-03/planning.md#proposed-scope-and-release-split--16-october) used 84/29 SP before delegated selection and full-point carry-over. That proposal is superseded by the current export below: 97 selected Sprint 3 SP and a separate 29-SP Sprint 4 forecast.

## Earlier 16 October export — superseded 97/29 allocation

[product-backlog.xlsx](product-backlog.xlsx), [jira-backlog-2026-10-16.csv](jira-backlog-2026-10-16.csv) and the [Markdown master register](../../requirements/product-backlog.md#master-backlog-register) reflect the final live Jira read after authorised Sprint 3 planning changes.

| Current export record | Value |
| --- | --- |
| Source | Live KAN project, JQL `project = KAN ORDER BY key ASC`; full descriptions, parent links, estimates and sprint/resolution metadata retained. |
| Scope | 63 issues: 37 parents (36 stories and KAN-60) plus 26 subtasks; no subtask double counting. |
| Current estimates/status | 145 parent SP; 14 Done parents / 48 SP and 23 To Do parents / 97 SP; no unestimated parents. Administrative status is not historical acceptance. |
| Sprint 3 | Active id 67, 4–17 October; 23 selected items / 97 SP, named owners/reviewers. KAN-77/78/79 add 18 SP; KAN-15 explicitly 2→5 SP. |
| Sprint 2 | Administratively closed 16 October 02:06 +08; original 43 SP = 35 new + 8 carry. Five original stories carry 19 SP at full estimates; actual historical acceptance/velocity **Not recorded**. |
| Sprint 1 | Original 32 committed / 24 reported Done / 8 carried preserved. |
| Sprint 4 forecast | CR-2/3/4/6 total 29 SP, outside current Jira 145 SP and not yet Jira stories. |
| Workbook | Seven views: Product backlog, Story specifications, Delivery evidence, Subtasks and archive, Feature coverage, Sprint record, Review notes. Full wording and historical/current evidence remain separate. |
| Validation | 18/18 structural/data/native-feature checks passed. Formula changes recalculated and restored, zero formula errors. All seven tabs plus new-story and forecast regions visually inspected. Excel desktop was not launched. CSV has 63 rows and 18 fields, checked against source. |
| Evidence boundary | This update runs no application tests, supplies no team vote and records no historical acceptance. The current review assessment retains missing evidence. |

The CSV excludes account IDs, emails, comments and attachments. It is a portable scope snapshot, not a full Jira backup. Earlier dated exports and records below remain historical. Refresh again at actual Sprint 3/4 review and before submission.

## Historical export — 15 October 2026

**Current snapshot: 15 October 2026, 18:11 +08:00. Recorded 15 October 2026.** Use the [master workbook](product-backlog.xlsx), [current Jira CSV](jira-backlog-2026-10-15.csv) and [Markdown master register](../../requirements/product-backlog.md#master-backlog-register). They include completed Sprint 1 work, Sprint 2 and all future backlog items. Refresh before final submission.

| Current export record | Value |
| --- | --- |
| Source / retrieval | Live KAN Jira query `project = KAN ORDER BY key ASC`; all 60 results returned, 15 October 2026 at 18:11:33 +08:00. Board 2 sprint metadata read separately. |
| Scope | 34 parent items (33 stories and one corrective task) plus 26 subtasks. Four historical exclusions stay outside the totals. |
| Current state | 19 parents Done and 15 future parents To Do. All 26 subtasks are Done, including KAN-57/KAN-58/KAN-76 resolved on 15 October. Current status is separate from acceptance evidence. |
| Estimates | 93 known parent points; eight unestimated items. Done parents contain 67 points; future parents contain 26 known points. No subtask double counting. |
| Sprint baseline | Sprint 1: 32 committed, 24 historically accepted, eight carried. Sprint 2: 43 committed (35 new + eight carried), still active in Jira. Actual Sprint 2 review acceptance/velocity is **Not recorded**. No Sprint 3 exists in Jira at retrieval. |
| Full specifications | Seven workbook tabs retain 610 specification rows: 593 live Jira segments, 16 labelled repository refinements and one superseded historical criterion. Current Jira descriptions match the 11 October snapshot exactly. |
| Validation | Saved workbook: 17/17 data and formula checks passed. All seven tabs visually checked, including changed evidence rows. Formula recalculation checked in Artifact Tool with temporary input changes restored; Excel was not launched. CSV: all 60 rows and 18 fields round-trip checked against the source response. |
| Evidence boundary | `AUTO-20261015-01` records current local verification and uncovered defects. The workbook distinguishes these post-sprint results from historical hosted tests, peer review and formal acceptance. |
| Remaining work | Reconcile the [completion evidence](../../requirements/product-backlog.md#sprint-2-parent-and-subtask-reconciliation--15-october-2026), confirm the [Sprint 2 review](../../scrum/sprint-02/review.md), and classify [repair candidates](../../scrum/sprint-03/planning.md#pre-planning-baseline-and-defect-triage) separately from [customer changes](../../requirements/change-requests.md). |

The CSV has 18 columns: key, title, type, status, priority, assignee display name, estimate, sprint membership/history, full description, parent key/title, relationships, created/updated timestamps, resolution timestamp, status-category timestamp, Jira rank and URL. It omits account identifiers, emails, comments and attachments. Earlier CSVs and dated records remain historical evidence; Jira resolution dates have not been backdated.

## Historical snapshot — 11 October 2026

The entry below describes the earlier export. Its references to open subtasks are superseded by the 15 October snapshot above. The workbook is the current view; use the [11 October CSV](jira-backlog-2026-10-11.csv) for that date's issue fields.

**Current snapshot: 11 October 2026; refresh again before final submission.** The [master workbook](product-backlog.xlsx), [current Jira CSV](jira-backlog-2026-10-11.csv) and [Markdown master register](../../requirements/product-backlog.md#master-backlog-register) cover completed Sprint 1 work, Sprint 2 and the future backlog. Four previously archived items remain separate in the [scope register](../../requirements/product-backlog.md#archived-backlog-items).

| Current export record | Value |
| --- | --- |
| Retrieved | 11 October 2026; exact retrieval time **Not recorded** |
| Source | Live KAN Jira project, `project = KAN ORDER BY key ASC`; all results returned |
| Portable files | [product-backlog.xlsx](product-backlog.xlsx); [jira-backlog-2026-10-11.csv](jira-backlog-2026-10-11.csv) |
| Scope | 60 unique records: 33 stories, one corrective task, 26 subtasks. The master register contains the 34 top-level items; subtasks do not add points. |
| Estimates | 93 known parent points and eight unestimated items. Current Done parents: 19 / 67 points. Future: 15 items / 26 estimated points plus eight unestimated. These are current totals, not sprint velocity. |
| Sprint accounting | Sprint 1 historical acceptance: 24 of 32 points, eight carried. Sprint 2 commitment: 43 points (35 new + eight carried); all 12 parents currently Done in Jira, but the sprint remains active and formal closure/acceptance records are incomplete. |
| CSV fields | Key, title, type, status, priority, assignee name, estimate, sprint membership/history, full description/criteria, parent key/title, issue relationships, created/updated times, Jira resolution time, status-category change time, rank and Jira URL |
| Validation | 60 unique keys; all exported values round-trip checked against the live response. Full descriptions retained. No estimates, dates or workflow states changed. |
| Outstanding reconciliation | KAN-57/KAN-58 hosted refresh checks; KAN-76 peer review and AI-assistance note. See the [subtask reconciliation](../../requirements/product-backlog.md#sprint-2-parent-and-subtask-reconciliation--11-october-2026). |

The workbook provides seven views: Product backlog, Story specifications, Delivery evidence, Subtasks and archive, Feature coverage, Sprint record and Review notes. Jira descriptions are source wording; repository refinements and verification limits are labelled separately. Current assignees are not evidence of who attended planning or performed every contribution. A Jira resolution timestamp is not a sprint acceptance date. Blank estimates remain unestimated.

Account identifiers, email addresses, watchers, attachments and comments are omitted from the CSV; it is a portable scope snapshot, not a full project backup. Jira comments consulted for the open subtasks are summarised and attributed in the master register. The 21 September export is retained unchanged as historical evidence.

## Historical snapshot — 21 September 2026

The [21 September Jira snapshot](jira-backlog-2026-09-21.csv) includes the 51 records retained at that time: 33 stories, one corrective task and 17 subtasks. The following provenance describes that earlier export, not the current state.

Export the final backlog and story details from Jira into this folder. Include each story's key, title, user-story description, acceptance criteria, status, priority, estimate where used, sprint and relevant dependencies. Keep completed and pending items in the export. Separate infrastructure items such as KAN-24 from customer-facing stories.

The [product backlog](../../requirements/product-backlog.md), [requirements summary](../../requirements/README.md), [Sprint 1 backlog](../../scrum/sprint-01/sprint-backlog.md) and [Sprint 2 backlog](../../scrum/sprint-02/sprint-backlog.md) support the export but do not replace it. Instructors will not access the live Jira project.

| Export record | Value |
| --- | --- |
| Export date and time | 21 September 2026, 03:59 +08:00 |
| Jira project / filter and included scope | KAN project List, all retained work items including Done and subtasks; archived KAN-19/KAN-21/KAN-22/KAN-23 excluded |
| Export file(s) | [jira-backlog-2026-09-21.csv](jira-backlog-2026-09-21.csv) |
| Retained fields | Key, title, type, status, priority, assignee, estimate, sprint membership/history, complete description/criteria, parent, related links and created/updated times |
| Validation | 51 unique keys; 33 stories + one task + 17 subtasks; all 14 selected field values checked against the native export; CSV round-trip passed |
| Review | Technical consistency checks completed on 21 September; Product Owner review of future policy choices and estimates remains open |

This portable extract retains the complete Jira description text, including Jira's formatting syntax. Repeated Sprint and relationship columns are combined without dropping values. Account identifiers, watchers, attachments and comments are omitted from this scope document; it is not a full project backup. The four archived records retain their history in Jira and are described in the scope register.

The snapshot records the state after the 21 September refinement. It does not reconstruct the 6 September baseline, the 19 September closing board or daily burndown observations. Sprint 2 remains 43 points; the future backlog has seven older estimates totalling 26 points plus eight unestimated items. Refresh this snapshot before final submission and verify its scope again.

Before packaging, open the export locally and check that story descriptions, acceptance criteria and completed/pending statuses are readable without Jira access.
