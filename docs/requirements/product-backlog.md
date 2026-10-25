# Product backlog

**26 October 2026 equipment update:** KAN-9 is In Progress / Tristan (8 SP), with local implementation and AUTO-20261026-KAN9-01 verification. KAN-26 is selected by Tristan and remains To Do (3 SP). Subtasks KAN-101/102/103 are In Progress and unestimated. AC104–107 clarify the approved read-only/saved/unsaved boundary; see the [Sprint 4 card](../scrum/sprint-04/sprint-backlog.md#kan-9--check-equipment-availability-for-an-event). Manual acceptance, migration 014 on shared Supabase, review and merge remain pending. The174SP parent inventory, sprint totals, historical records and Done dates are unchanged.

**Acceptance confirmation — 26 October 2026:** [current review records](../scrum/README.md#acceptance-and-closure-inputs--26-october-2026) now contain the team's collective review decisions: Sprint 1 24 accepted / 8 carried SP; Sprint 2 24 accepted / 19 carried SP; Sprint 3 all 13 stories / 63 SP accepted with no carry-over. The report dates and historical decision dates are separate. Sprint 3's later reproduced failures and repairs remain visible; its historical reviewed build and independent DoD assessment remain unavailable. Jira snapshot statuses, original estimates and administrative resolution dates below are preserved rather than overwritten with reported acceptance dates. Closing-board evidence, review feedback and team-prepared charts remain to be supplied.

**Latest closeout follow-up — 25 October 2026.** The repaired behaviour has passed the reported local smoke checks in [REPORT-20261025-CLOSEOUT-RETEST](../testing/test-evidence.md#25-october-2026--closeout-retest-confirmation). The fixes are complete locally. Public application deployment is not required under the amended DoD; earlier retest/deployed-URL blockers below are superseded. Tracker status, explicit story acceptance, historical velocity and Sprint 4 scope are unchanged.

**Current Sprint 3 reconciliation — 25 October 2026.** The 13 parent cards were read from Jira again: four Done, four In Review, four In Progress and one To Do; their current status and owner are reflected in the first master table. This is a targeted read, not a new full-project export or an acceptance decision. Scope remains 63 SP. All Sprint 3 implementations are present; the closeout repairs and verification are recorded in [test evidence](../testing/test-evidence.md#25-october-2026--sprint-closeout-reconciliation). Team-reported historical manual results retain their supplied dates and limitations; the later same-day report above confirms the repair smoke passed. Final confirmation/safety integration belongs to Sprint 4. Earlier dated snapshots, administrative resolution dates and velocity remain unchanged.

**Scoped ownership and delivery reconciliation — 25 October 2026.** Arvin owns KAN-34 **3 SP** and KAN-78 **8 SP**. Leo Kai Jie supplied the requested-changes review; Irfan recorded integration approval on PR #48/#54 on 22 October. Leo's later re-review is Not recorded. [The current evidence](../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) records automated main verification, not hosted acceptance or a planning meeting. The last recorded Jira state is In Review (21 October); no new Jira read is claimed. Estimates, sprint scope and dates are unchanged; the historical unassigned rows below are superseded only for these two stories.

**Ryan story verification — 25 October 2026.** Successful manual scenarios were reported by Tristan on Ryan's behalf for KAN-25 on 19 September, original KAN-12 on 3 October, and revised KAN-12 plus the KAN-50 stale-save repair on 17 October. These are the reported test dates; the actual tested builds, environments, fixtures and cleanup details are **Not recorded**. The [verification record](../testing/test-evidence.md#25-october-2026--ryan-story-verification-records) retains `REPORT-20261025-RYAN-S1`, `REPORT-20261025-RYAN-S2` and `REPORT-20261025-RYAN-S3`. Ryan's KAN-50 report covers **AC101 / TC-08-14 only**; the original catalogue implementation and Sprint 2 evidence remain attributed to Irfan.

The 25 October Jira read confirms **KAN-25 Done / Ryan**, **KAN-12 Done / Ryan** and **KAN-50 In Progress / Ryan**. The current KAN-12/KAN-50 rows and matching workbook are refreshed; their current resolution dates are **Not recorded**. Code evidence is dated separately: KAN-12's [PR #51](https://github.com/MochaLxtte/ConnectSphere/pull/51) was integrated on 22 October through [PR #54](https://github.com/MochaLxtte/ConnectSphere/pull/54), retaining its failed source integration run and later passing integrated CI; KAN-50's [PR #56](https://github.com/MochaLxtte/ConnectSphere/pull/56) merged on 25 October after Tristan's approval and passing CI. These later commits and CI results do not establish which builds were manually tested on the reported dates. Earlier dated findings remain historical; no estimate, sprint acceptance or velocity is changed, and no Jira transition is made by this documentation update.

**Targeted manual-result and Jira reconciliation — 25 October 2026.** Tristan reported successful manual scenarios for his original KAN-36/KAN-16 work on 19 September, KAN-29/KAN-8/KAN-52 work on 3 October, and KAN-79/KAN-65 work on 17 October. The reported environment was localhost, using local commits before pushing. The exact tested revisions, database configuration and fixture/cleanup details are **Not recorded**. The reports are retained as `REPORT-20261025-TRISTAN-S1`, `REPORT-20261025-TRISTAN-S2` and `REPORT-20261025-TRISTAN-S3` in the [manual-result record](../testing/test-evidence.md#25-october-2026--reported-manual-results-for-original-stories). These are reported results for the original work, not a rerun against the latest integrated build; the reported dates do not establish acceptance of later commits or customer-change criteria. KAN-29's automatic-assignment baseline remains historical after CR-5, and the original KAN-52 report does not cover Ernest's later Sprint 3 revision.

The 25 October Jira read confirms KAN-8, KAN-16, KAN-29 and KAN-36 **Done / Tristan**, KAN-52 **Done / Ernest**, and KAN-65/KAN-79 **In Progress / Tristan**. The current KAN-52 row below is refreshed; its resolution date was not included in this read and remains **Not recorded**. Other rows retain their latest labelled snapshots. KAN-64 allocation and reassignment notifications are integrated in `main`; their earlier pending notes remain dated history. The manual reports do not change Jira, story estimates, sprint acceptance or velocity. The matching targeted workbook refresh is recorded in [the submission register](../submission/1/README.md); unrelated workbook rows retain their labelled snapshot dates.

**KAN-79 and KAN-65 merge — 20 October 2026.** [PR #34](https://github.com/MochaLxtte/ConnectSphere/pull/34) merged both stories into `main` as `3ddba2b` after Irfan's approval, based on passing CI (S3-E16). Manual/hosted workflow checks and KAN-64 notifications remain Not executed, so neither story meets the Definition of Done; the register rows below stay In Progress, Not resolved, with 8 SP and 3 SP unchanged. Jira changes after the merge are Not recorded, and the master workbook is not updated by this note.

**KAN-65 follow-up — 19 October 2026.** KAN-65 and subtasks KAN-88/89/90 are In Progress / Tristan; the estimate remains 3 SP. Branch `feat/KAN-65-coordinator-reassignment` includes KAN-79 and implements Lead-only reassignment with a required reason, assignment-version checks, atomic audit history and current-assignment permissions. `AUTO-20261019-02` records local verification. KAN-64 notifications, manual/hosted workflow checks, independent review and acceptance remain pending. The earlier KAN-79 dependency notes below describe that earlier implementation stage. This targeted update does not change sprint scope, historical evidence or velocity.

**KAN-79 implementation update — 19 October 2026.** KAN-79 is assigned to Tristan and In Progress in Jira, with subtasks KAN-85/86/87 In Progress. Its 8 SP and Sprint 3 membership are unchanged. The branch implements trusted Lead access, unassigned submission, oversight and initial allocation; automated verification is recorded as `AUTO-20261019-01`. KAN-65/KAN-64 integration, hosted checks, independent review and acceptance remain outstanding. Other stories retain their last dated snapshot; this is a targeted update, not a fresh project-wide export. Sprint 3 remains administratively Active despite its configured 17 October end; this work is recorded on its actual 19 October date and is not counted as delivery by 17 October.

This is the canonical release-scope index and the working acceptance criteria for the future backlog. It covers all 20 core features and the supporting work needed to connect them into an event workflow. A Jira link or an existing implementation does not establish acceptance. Record executed results in the [test evidence](../testing/test-evidence.md) and agreed rule changes in the [decision log](assumptions-and-questions.md).

**Refinement date:** 21 September 2026. Sprint 1 closed with **32 committed points, 24 Done points and 8 carried points**. Sprint 2 retains **12 PBIs / 43 points: 35 new plus 8 carried**. The future stories and corrective task below are outside that commitment. No additional estimate, owner, sprint commitment or completed acceptance test is established by this refinement.

## Master backlog register

**Submission reconciliation — 17 October 2026.** This repository is the submitted requirements and evidence record. Read the current register below together with the current Sprint 3/4 cards, the dated Sprint 1/2 criterion crosswalks, and the [customer-change register](change-requests.md). Historical cards describe the requirements at that stage; documented changes do not require rewriting them to match the latest workflow.

The live Jira recheck returned the same **68 issues**, titles, descriptions, statuses, estimates, priorities, assignments and sprint memberships as the retained 16 October export. That CSV remains an unchanged source snapshot. The workbook additionally identifies repository reconciliation material; it is not presented as a verbatim Jira export. Existing no-automatic-event-rejection rules for KAN-12 and KAN-52 are retained as **AC102** on their current repository cards, despite their omission from the latest Jira descriptions. KAN-24's existing database-diagram check is cross-referenced as **AC4** in the dated Sprint 1 addendum. These restore/document existing requirements and add no stories or points.

The [Sprint 1 crosswalk](../scrum/sprint-01/sprint-backlog.md) and [Sprint 2 reconciliation](../scrum/sprint-02/sprint-backlog.md) distinguish source wording, retained local criterion IDs and functional cases. Test specifications and mapped test files do not establish execution or acceptance. The original sprint totals, historical outcomes, current carry-over, administrative resolution dates and unrecorded evidence remain separate.

**Ownership update — 16 October 2026.** All 28 unfinished parent items are now unassigned in Jira. Team members will choose their own stories; independent reviewers and the integration lead are **To agree** after ownership is chosen. The scope remains **63 SP per sprint**, averaging **10.5 SP per member per sprint** and **21 SP per member across both**. Aim for roughly 10–11 SP each, retaining whole estimates and dependency order rather than forcing an exact split. Earlier named allocations are historical. Claim a Jira card and sync its sprint record before starting work.

**Current verified Jira snapshot — 16 October 2026, after reconstruction/rebalance.** **68 issues = 42 parents (41 stories and KAN-60) + 26 subtasks; 174 estimated parent SP = 48 current Jira Done + 63 Sprint 3 To Do + 63 Sprint 4 To Do.** Subtasks add no points. Sprint 3 (id 67) is Active, 4–17 October; Sprint 4 (id 68) is Future, 18–31 October and has not been started. All 28 remaining parents are To Do. This covers completed Sprint 1, Sprint 2 history, both remaining sprints and all six customer changes, with archived optional/duplicate items retained below.

Customer changes were received **2 October**, confirmed in chat on **16 October**; the team intended to retain Sprint 2's original scope and consider them during Sprint 3 planning. The [change register](change-requests.md) distinguishes receipt, source inspection, decisions, new requirements, superseded rules and the KAN-64/80 split. Current [Sprint 3](../scrum/sprint-03/planning.md) and [Sprint 4](../scrum/sprint-04/planning.md) records supersede the earlier 97/29 allocation below. Scope and estimates use the recorded planning method; no six-member vote is recorded. Current ownership follows the later self-selection decision.

Jira Done/resolution dates are administrative values, not proof of acceptance or historical velocity. Sprint 1 retains 32 committed / 24 reported Done / 8 carried; Sprint 2 retains **43 = 35 new + 8 carried**. Its five outstanding stories retain their original 19 points in S3; historical acceptance of the other 24 points remains separately evidenced. The [portable CSV](../submission/1/jira-backlog-2026-10-16.csv) and [workbook](../submission/1/product-backlog.xlsx) use the same current read. No future change forecast is added again beyond the 174-point inventory.

| Priority | Jira | Story | Core feature | SP | Jira status | Sprint(s) | Jira resolution date (+08:00) | Owner | Related Jira item |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| High | [KAN-4](https://smu-g7-grp1.atlassian.net/browse/KAN-4) | Save Draft Event Request | CF-03 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| High | [KAN-6](https://smu-g7-grp1.atlassian.net/browse/KAN-6) | Submit an Event Request | CF-02 | 3 | Done | Sprint 1, Sprint 2, Sprint 3 | Not resolved | Ernest | relates to: KAN-79 |
| High | [KAN-8](https://smu-g7-grp1.atlassian.net/browse/KAN-8) | Approve or Reject Venue Booking Request | CF-13 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83; relates to: KAN-82 |
| High | [KAN-9](https://smu-g7-grp1.atlassian.net/browse/KAN-9) | Check Equipment Availability for an Event | CF-16 | 8 | In Progress | Sprint 4 | Not resolved | Tristan | is blocked by: KAN-18; blocks: KAN-26 |
| High | [KAN-10](https://smu-g7-grp1.atlassian.net/browse/KAN-10) | Mark Event as Completed | CF-06 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-61 |
| High | [KAN-12](https://smu-g7-grp1.atlassian.net/browse/KAN-12) | Search and Filter Venues | CF-10 | 5 | Done | Sprint 2, Sprint 3 | Not recorded | Ryan | relates to: KAN-78 |
| High | [KAN-14](https://smu-g7-grp1.atlassian.net/browse/KAN-14) | Register for an Event | CF-18 | 5 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-67; is blocked by: KAN-61; blocks: KAN-17; blocks: KAN-67; relates to: KAN-80 |
| High | [KAN-15](https://smu-g7-grp1.atlassian.net/browse/KAN-15) | Submit and Review Event Change Requests | CF-07, CF-19 | 5 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-66; relates to: KAN-64; relates to: KAN-82; relates to: KAN-84; relates to: KAN-80 |
| Medium | [KAN-16](https://smu-g7-grp1.atlassian.net/browse/KAN-16) | View Event Request Status | CF-06 | 2 | Done | Sprint 1 | 2026-09-20 | Tristan | relates to: KAN-84 |
| High | [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) | Withdraw Attendee Registration | CF-18 | 2 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-67; is blocked by: KAN-14; relates to: KAN-80 |
| High | [KAN-18](https://smu-g7-grp1.atlassian.net/browse/KAN-18) | Update Equipment Availability Status | CF-16 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | blocks: KAN-9; relates to: KAN-80 |
| Highest | [KAN-24](https://smu-g7-grp1.atlassian.net/browse/KAN-24) | Setup Database | Infrastructure | 5 | Done | Sprint 1 | 2026-09-21 | Arvin | None recorded |
| Highest | [KAN-25](https://smu-g7-grp1.atlassian.net/browse/KAN-25) | User Authorisation and Authentication | CF-01 | 5 | Done | Sprint 1 | 2026-09-21 | Ryan | relates to: KAN-79; relates to: KAN-84 |
| High | [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | Reserve Equipment | CF-17 | 3 | To Do | Sprint 4 | Not resolved | Tristan | is blocked by: KAN-9; relates to: KAN-63; blocks: KAN-61; relates to: KAN-84; relates to: KAN-80 |
| Medium | [KAN-27](https://smu-g7-grp1.atlassian.net/browse/KAN-27) | Request Clarification on an Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Irfan | None recorded |
| Medium | [KAN-29](https://smu-g7-grp1.atlassian.net/browse/KAN-29) | Automatically Assign Event Coordinator | CF-05 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | relates to: KAN-65; relates to: KAN-79 |
| Medium | [KAN-31](https://smu-g7-grp1.atlassian.net/browse/KAN-31) | Create Event Request | CF-02 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| Medium | [KAN-33](https://smu-g7-grp1.atlassian.net/browse/KAN-33) | View Submitted Event Request | CF-04 | 2 | Done | Sprint 1, Sprint 2 | 2026-10-01 | Irfan | None recorded |
| High | [KAN-34](https://smu-g7-grp1.atlassian.net/browse/KAN-34) | Resume/Edit Draft Event Request | CF-03, CF-07 | 3 | In Review | Sprint 1, Sprint 2, Sprint 3 | Not resolved | Arvin | None recorded |
| Medium | [KAN-36](https://smu-g7-grp1.atlassian.net/browse/KAN-36) | Approve/Reject Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Tristan | relates to: KAN-60 |
| Highest | [KAN-50](https://smu-g7-grp1.atlassian.net/browse/KAN-50) | Maintain Venue Catalog | CF-08 | 5 | In Progress | Sprint 2, Sprint 3 | Not recorded | Ryan | relates to: KAN-77 |
| Medium | [KAN-51](https://smu-g7-grp1.atlassian.net/browse/KAN-51) | View Venue Availability Calendar | CF-09 | 5 | Done | Sprint 2 | 2026-10-10 | Arvin | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83 |
| High | [KAN-52](https://smu-g7-grp1.atlassian.net/browse/KAN-52) | Check Venue Suitability | CF-11 | 3 | Done | Sprint 2, Sprint 3 | Not recorded | Ernest | relates to: KAN-78; relates to: KAN-82; relates to: KAN-84 |
| Medium | [KAN-53](https://smu-g7-grp1.atlassian.net/browse/KAN-53) | Submit Venue Booking Request | CF-12 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83; relates to: KAN-82 |
| Medium | [KAN-54](https://smu-g7-grp1.atlassian.net/browse/KAN-54) | Detect Venue Booking Conflicts | CF-14 | 5 | Done | Sprint 2 | 2026-10-10 | Ernest | relates to: KAN-78; relates to: KAN-81; relates to: KAN-83 |
| Medium | [KAN-55](https://smu-g7-grp1.atlassian.net/browse/KAN-55) | Block Venue for Operational Unavailability | CF-09, CF-14 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | is duplicated by: KAN-21; relates to: KAN-78; relates to: KAN-81 |
| High | [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) | Require a reason when rejecting an event request | CF-04 | 2 | In Review | Sprint 3 | Not resolved | Irfan | relates to: KAN-36 |
| High | [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) | Confirm Event After Planning Arrangements | CF-06 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | is blocked by: KAN-26; blocks: KAN-14; relates to: KAN-62; relates to: KAN-10; relates to: KAN-84; relates to: KAN-80 |
| High | [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | Cancel Event and Release Its Arrangements | CF-06, CF-19 | 5 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-61; relates to: KAN-82; relates to: KAN-80 |
| High | [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | Submit and Review Event Equipment Requests | CF-15 | 5 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-26; relates to: KAN-84 |
| High | [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | Receive Request, Assignment and Venue Notifications | CF-20 | 5 | Done | Sprint 3 | Not resolved | Ernest | relates to: KAN-79; relates to: KAN-15; blocks: KAN-80; blocks: KAN-81; blocks: KAN-83 |
| High | [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | Reassign Event Coordinator | CF-05 | 3 | In Progress | Sprint 3 | Not resolved | Tristan | relates to: KAN-29; relates to: KAN-79 |
| High | [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | Update Event Information During Planning | CF-07 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-15 |
| High | [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | View Event Registrations | CF-18 | 2 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-14; relates to: KAN-17; is blocked by: KAN-14 |
| High | [KAN-77](https://smu-g7-grp1.atlassian.net/browse/KAN-77) | Configure Venue Setup and Turnaround Durations | CF-08; CR-1 | 2 | To Do | Sprint 3 | Not resolved | Kai Jie | relates to: KAN-50; relates to: KAN-78 |
| High | [KAN-78](https://smu-g7-grp1.atlassian.net/browse/KAN-78) | Apply Venue Buffers to Availability and Booking Conflicts | CF-09–CF-14; CR-1 | 8 | In Review | Sprint 3 | Not resolved | Arvin | relates to: KAN-77; relates to: KAN-51; relates to: KAN-12; relates to: KAN-52; relates to: KAN-53; relates to: KAN-8; relates to: KAN-54; relates to: KAN-55; blocks: KAN-81; blocks: KAN-83 |
| High | [KAN-79](https://smu-g7-grp1.atlassian.net/browse/KAN-79) | Assign Submitted Events Through a Coordinator Lead Queue | CF-01, CF-02, CF-04, CF-05; CR-5 | 8 | In Progress | Sprint 3 | Not resolved | Tristan | relates to: KAN-29; relates to: KAN-25; relates to: KAN-6; relates to: KAN-65; relates to: KAN-64 |
| High | [KAN-80](https://smu-g7-grp1.atlassian.net/browse/KAN-80) | Receive Equipment, Lifecycle, Change and Registration Notifications | CF-20 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | is blocked by: KAN-64; relates to: KAN-84; relates to: KAN-18; relates to: KAN-26; relates to: KAN-15; relates to: KAN-61; relates to: KAN-62; relates to: KAN-14; relates to: KAN-17 |
| High | [KAN-81](https://smu-g7-grp1.atlassian.net/browse/KAN-81) | Recover venue arrangements affected by operational unavailability | CF-09, CF-12, CF-13, CF-14, CF-20; CR-2 | 8 | In Progress | Sprint 3 | Not resolved | Kai Jie | is blocked by: KAN-64; is blocked by: KAN-78; relates to: KAN-55; relates to: KAN-51; relates to: KAN-53; relates to: KAN-8; relates to: KAN-54; relates to: KAN-83; relates to: KAN-82 |
| High | [KAN-82](https://smu-g7-grp1.atlassian.net/browse/KAN-82) | Manage each venue arrangement independently for an event | CF-12, CF-13, CF-14, CF-19; CR-3 | 5 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-53; relates to: KAN-8; relates to: KAN-52; relates to: KAN-15; relates to: KAN-62; relates to: KAN-81; relates to: KAN-83; relates to: KAN-84 |
| High | [KAN-83](https://smu-g7-grp1.atlassian.net/browse/KAN-83) | Manage temporary venue holds with expiry and automatic release | CF-09, CF-12, CF-13, CF-14, CF-20; CR-4 | 8 | In Review | Sprint 3 | Not resolved | Irfan | is blocked by: KAN-64; is blocked by: KAN-78; relates to: KAN-53; relates to: KAN-8; relates to: KAN-51; relates to: KAN-54; relates to: KAN-81; relates to: KAN-82 |
| High | [KAN-84](https://smu-g7-grp1.atlassian.net/browse/KAN-84) | Review operational safety before event preparation | CF-01, CF-06, CF-11, CF-15, CF-17, CF-19, CF-20; CR-6 | 8 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-25; relates to: KAN-16; relates to: KAN-61; relates to: KAN-63; relates to: KAN-26; relates to: KAN-15; relates to: KAN-52; relates to: KAN-80; relates to: KAN-82 |


<details>
<summary>Earlier 16 October master snapshot (superseded allocation; preserved history)</summary>

### Earlier 16 October selection — superseded 97/29 allocation

**Current Jira snapshot — 16 October 2026.** Live Jira contains **63 issues: 37 parents (36 stories and KAN-60) plus 26 subtasks**. All parent estimates are populated: **145 SP = 48 SP on 14 current Done parents + 97 SP on 23 To Do parents**. These are current administrative totals, not historical velocity. The [portable CSV](../submission/1/jira-backlog-2026-10-16.csv), [workbook](../submission/1/product-backlog.xlsx) and table below are aligned to the same final Jira read.

Sprint 3 (id 67) is **Active, 4–17 October**, with all **23 selected items / 97 SP** still To Do. Scope, estimates, owners, reviewers and implementation defaults were selected through **the recorded delegated planning method**, not a six-member estimation vote. The [selected plan](../scrum/sprint-03/planning.md#selected-scope-and-release-allocation) and [current story cards](../scrum/sprint-03/sprint-backlog.md) supersede the older proposals below. KAN-15 changes from 2 to 5 SP with a recorded rationale; KAN-60 is the existing correction, counted once; KAN-77/78/79 add CR-1 and CR-5.

Sprint 2 was administratively closed on **16 October at 02:06 Singapore time**. Its original **43 SP (35 new + 8 carried)** remain the historical baseline. KAN-6/34/50/12/52 carry their full original **19 SP** into Sprint 3 for completion and re-verification, with no delivered credit assigned to them in the current disposition. The user reports acceptance was not recorded: neither this change nor the other seven currently Done S2 parents (24 SP) establishes historical acceptance or velocity.

The Jira resolution field below is an administrative timestamp, not an acceptance date. Reopened issues may retain a prior resolution timestamp; status controls the current open/closed interpretation. Table order follows Jira key, not priority rank. Subtasks add no points.

| Priority | Jira | Story | Core feature | SP | Jira status | Sprint(s) | Jira resolution date (+08:00) | Owner | Related Jira item |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| High | [KAN-4](https://smu-g7-grp1.atlassian.net/browse/KAN-4) | Save Draft Event Request | CF-03 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| High | [KAN-6](https://smu-g7-grp1.atlassian.net/browse/KAN-6) | Submit an Event Request | CF-02 | 3 | To Do | Sprint 1, Sprint 2, Sprint 3 | Not resolved | Kai Jie | relates to: KAN-79 |
| High | [KAN-8](https://smu-g7-grp1.atlassian.net/browse/KAN-8) | Approve or Reject Venue Booking Request | CF-13 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | relates to: KAN-78 |
| High | [KAN-9](https://smu-g7-grp1.atlassian.net/browse/KAN-9) | Check Equipment Availability for an Event | CF-16 | 8 | To Do | Sprint 3 | Not resolved | Arvin | is blocked by: KAN-18; blocks: KAN-26 |
| High | [KAN-10](https://smu-g7-grp1.atlassian.net/browse/KAN-10) | Mark Event as Completed | CF-06 | 3 | To Do | Sprint 3 | Not resolved | Kai Jie | relates to: KAN-61 |
| High | [KAN-12](https://smu-g7-grp1.atlassian.net/browse/KAN-12) | Search and Filter Venues | CF-10 | 5 | To Do | Sprint 2, Sprint 3 | Not resolved | Tristan | relates to: KAN-78 |
| High | [KAN-14](https://smu-g7-grp1.atlassian.net/browse/KAN-14) | Register for an Event | CF-18 | 5 | To Do | Sprint 3 | Not resolved | Ernest | relates to: KAN-67; is blocked by: KAN-61; blocks: KAN-17; blocks: KAN-67 |
| High | [KAN-15](https://smu-g7-grp1.atlassian.net/browse/KAN-15) | Submit and Review Event Change Requests | CF-07, CF-19 | 5 | To Do | Sprint 3 | Not resolved | Irfan | relates to: KAN-66; relates to: KAN-64 |
| Medium | [KAN-16](https://smu-g7-grp1.atlassian.net/browse/KAN-16) | View Event Request Status | CF-06 | 2 | Done | Sprint 1 | 2026-09-20 | Tristan | None recorded |
| High | [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) | Withdraw Attendee Registration | CF-18 | 2 | To Do | Sprint 3 | Not resolved | Ernest | relates to: KAN-67; is blocked by: KAN-14 |
| High | [KAN-18](https://smu-g7-grp1.atlassian.net/browse/KAN-18) | Update Equipment Availability Status | CF-16 | 3 | To Do | Sprint 3 | Not resolved | Arvin | blocks: KAN-9 |
| Highest | [KAN-24](https://smu-g7-grp1.atlassian.net/browse/KAN-24) | Setup Database | Infrastructure | 5 | Done | Sprint 1 | 2026-09-21 | Arvin | None recorded |
| Highest | [KAN-25](https://smu-g7-grp1.atlassian.net/browse/KAN-25) | User Authorisation and Authentication | CF-01 | 5 | Done | Sprint 1 | 2026-09-21 | Ryan | relates to: KAN-79 |
| High | [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | Reserve Equipment | CF-17 | 3 | To Do | Sprint 3 | Not resolved | Arvin | is blocked by: KAN-9; relates to: KAN-63; blocks: KAN-61 |
| Medium | [KAN-27](https://smu-g7-grp1.atlassian.net/browse/KAN-27) | Request Clarification on an Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Irfan | None recorded |
| Medium | [KAN-29](https://smu-g7-grp1.atlassian.net/browse/KAN-29) | Automatically Assign Event Coordinator | CF-05 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | relates to: KAN-65; relates to: KAN-79 |
| Medium | [KAN-31](https://smu-g7-grp1.atlassian.net/browse/KAN-31) | Create Event Request | CF-02 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| Medium | [KAN-33](https://smu-g7-grp1.atlassian.net/browse/KAN-33) | View Submitted Event Request | CF-04 | 2 | Done | Sprint 1, Sprint 2 | 2026-10-01 | Irfan | None recorded |
| High | [KAN-34](https://smu-g7-grp1.atlassian.net/browse/KAN-34) | Resume/Edit Draft Event Request | CF-03, CF-07 | 3 | To Do | Sprint 1, Sprint 2, Sprint 3 | Not resolved | Kai Jie | None recorded |
| Medium | [KAN-36](https://smu-g7-grp1.atlassian.net/browse/KAN-36) | Approve/Reject Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Tristan | relates to: KAN-60 |
| Highest | [KAN-50](https://smu-g7-grp1.atlassian.net/browse/KAN-50) | Maintain Venue Catalog | CF-08 | 5 | To Do | Sprint 2, Sprint 3 | Not resolved | Tristan | relates to: KAN-77 |
| Medium | [KAN-51](https://smu-g7-grp1.atlassian.net/browse/KAN-51) | View Venue Availability Calendar | CF-09 | 5 | Done | Sprint 2 | 2026-10-10 | Arvin | relates to: KAN-78 |
| High | [KAN-52](https://smu-g7-grp1.atlassian.net/browse/KAN-52) | Check Venue Suitability | CF-11 | 3 | To Do | Sprint 2, Sprint 3 | Not resolved | Tristan | relates to: KAN-78 |
| Medium | [KAN-53](https://smu-g7-grp1.atlassian.net/browse/KAN-53) | Submit Venue Booking Request | CF-12 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | relates to: KAN-78 |
| Medium | [KAN-54](https://smu-g7-grp1.atlassian.net/browse/KAN-54) | Detect Venue Booking Conflicts | CF-14 | 5 | Done | Sprint 2 | 2026-10-10 | Ernest | relates to: KAN-78 |
| Medium | [KAN-55](https://smu-g7-grp1.atlassian.net/browse/KAN-55) | Block Venue for Operational Unavailability | CF-09, CF-14 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | is duplicated by: KAN-21; relates to: KAN-78 |
| High | [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) | Require a reason when rejecting an event request | CF-04 | 2 | To Do | Sprint 3 | Not resolved | Kai Jie | relates to: KAN-36 |
| High | [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) | Confirm Event After Planning Arrangements | CF-06 | 3 | To Do | Sprint 3 | Not resolved | Kai Jie | is blocked by: KAN-26; blocks: KAN-14; relates to: KAN-62; relates to: KAN-10 |
| High | [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | Cancel Event and Release Its Arrangements | CF-06, CF-19 | 5 | To Do | Sprint 3 | Not resolved | Kai Jie | relates to: KAN-61 |
| High | [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | Submit and Review Event Equipment Requests | CF-15 | 5 | To Do | Sprint 3 | Not resolved | Arvin | relates to: KAN-26 |
| High | [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | Notify Relevant Users About Event Workflow Updates | CF-20 | 8 | To Do | Sprint 3 | Not resolved | Irfan | relates to: KAN-79; relates to: KAN-15 |
| High | [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | Reassign Event Coordinator | CF-05 | 3 | To Do | Sprint 3 | Not resolved | Ryan | relates to: KAN-29; relates to: KAN-79 |
| High | [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | Update Event Information During Planning | CF-07 | 3 | To Do | Sprint 3 | Not resolved | Ernest | relates to: KAN-15 |
| High | [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | View Event Registrations | CF-18 | 2 | To Do | Sprint 3 | Not resolved | Ernest | relates to: KAN-14; relates to: KAN-17; is blocked by: KAN-14 |
| High | [KAN-77](https://smu-g7-grp1.atlassian.net/browse/KAN-77) | Configure Venue Setup and Turnaround Durations | CF-08; CR-1 | 2 | To Do | Sprint 3 | Not resolved | Tristan | relates to: KAN-50; relates to: KAN-78 |
| High | [KAN-78](https://smu-g7-grp1.atlassian.net/browse/KAN-78) | Apply Venue Buffers to Availability and Booking Conflicts | CF-09–CF-14; CR-1 | 8 | To Do | Sprint 3 | Not resolved | Tristan | relates to: KAN-77; relates to: KAN-51; relates to: KAN-12; relates to: KAN-52; relates to: KAN-53; relates to: KAN-8; relates to: KAN-54; relates to: KAN-55 |
| High | [KAN-79](https://smu-g7-grp1.atlassian.net/browse/KAN-79) | Assign Submitted Events Through a Coordinator Lead Queue | CF-01, CF-05; CR-5 | 8 | To Do | Sprint 3 | Not resolved | Ryan | relates to: KAN-29; relates to: KAN-25; relates to: KAN-6; relates to: KAN-65; relates to: KAN-64 |

**Release forecast:** four additional Sprint 4 changes (CR-2/3/4/6) have a **29-SP planning forecast**, outside current Jira totals and not yet created as Jira stories. The resulting planning inventory is 174 SP; 48 current Jira Done + 97 selected S3 + 29 forecast S4. It is not a reconstructed release burndown. Original Sprint 1 reported outcome remains **32 committed / 24 Done / 8 carried**.


</details>

### Historical master snapshot and initial proposal — 15–16 October 2026

The following original snapshot/proposal is retained for history. Its current-status, unestimated and “To agree” statements are superseded by the current register and selected Sprint 3 plan above.


**Planning note — 16 October 2026:** all 34 top-level Jira items were read again for planning; the 15 future items remain To Do. [Sprint 3's broad proposal](../scrum/sprint-03/planning.md#proposed-scope-and-release-split--16-october) covers those items, five repairs and CR-1/CR-5; Sprint 4 is proposed to cover the remaining four changes. Proposed 84/29-point totals and the possible KAN-15 re-estimate are **To agree**. The master register below remains the actual Jira snapshot, not the proposed commitment. Refresh Jira, this register and the workbook together after the team confirms classification, story creation, estimates and selection.

**Current Jira snapshot: 15 October 2026, 18:11 +08:00. Recorded 15 October 2026.** This register includes all 34 retained top-level items: 33 stories and the KAN-60 corrective task. The [Excel workbook](../submission/1/product-backlog.xlsx) includes the full story specifications, delivery evidence and a separate subtask register; the [current portable Jira CSV](../submission/1/jira-backlog-2026-10-15.csv) retains all 60 issues and complete descriptions. The [11 October CSV](../submission/1/jira-backlog-2026-10-11.csv) and dated reconciliation below remain historical snapshots. Refresh the current views together after planning/review or a scope change.

**How to read this table:** status, priority, owner, sprint membership and resolution date are Jira fields as retrieved today. A Jira resolution date is an administrative workflow timestamp, **not a sprint acceptance date**. Current Done status does not reconstruct completion within a sprint window. Blank estimates are **To agree**, not zero; no estimates have been changed. Rows are in key order, not a newly agreed delivery priority. Exact Jira rank and timestamps are retained in the CSV.

| Priority | Jira | Story | Core feature | SP | Jira status | Sprint(s) | Jira resolution date (+08:00) | Owner | Related Jira item |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| High | [KAN-4](https://smu-g7-grp1.atlassian.net/browse/KAN-4) | Save Draft Event Request | CF-03 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| High | [KAN-6](https://smu-g7-grp1.atlassian.net/browse/KAN-6) | Submit an Event Request | CF-02 | 3 | Done | Sprint 1, Sprint 2 | 2026-10-04 | Kai Jie | None recorded |
| High | [KAN-8](https://smu-g7-grp1.atlassian.net/browse/KAN-8) | Approve or Reject Venue Booking Request | CF-13 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | None recorded |
| Medium | [KAN-9](https://smu-g7-grp1.atlassian.net/browse/KAN-9) | Check Equipment Availability for an Event | CF-16 | 8 | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| High | [KAN-10](https://smu-g7-grp1.atlassian.net/browse/KAN-10) | Mark Event as Completed | CF-06 | 3 | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| High | [KAN-12](https://smu-g7-grp1.atlassian.net/browse/KAN-12) | Search and Filter Venues | CF-10 | 5 | Done | Sprint 2 | 2026-10-10 | Ryan | None recorded |
| High | [KAN-14](https://smu-g7-grp1.atlassian.net/browse/KAN-14) | Register for an Event | CF-18 | 5 | To Do | Not allocated | Not resolved | Unassigned | relates to: KAN-67 |
| High | [KAN-15](https://smu-g7-grp1.atlassian.net/browse/KAN-15) | Submit and Review Event Change Requests | CF-07, CF-19 | 2 | To Do | Not allocated | Not resolved | Unassigned | relates to: KAN-66 |
| Medium | [KAN-16](https://smu-g7-grp1.atlassian.net/browse/KAN-16) | View Event Request Status | CF-06 | 2 | Done | Sprint 1 | 2026-09-20 | Tristan | None recorded |
| Medium | [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) | Withdraw Attendee Registration | CF-18 | 2 | To Do | Not allocated | Not resolved | Unassigned | relates to: KAN-67 |
| Medium | [KAN-18](https://smu-g7-grp1.atlassian.net/browse/KAN-18) | Update Equipment Availability Status | CF-16 | 3 | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| Highest | [KAN-24](https://smu-g7-grp1.atlassian.net/browse/KAN-24) | Setup Database | Infrastructure | 5 | Done | Sprint 1 | 2026-09-21 | Arvin | None recorded |
| Highest | [KAN-25](https://smu-g7-grp1.atlassian.net/browse/KAN-25) | User Authorisation and Authentication | CF-01 | 5 | Done | Sprint 1 | 2026-09-21 | Ryan | None recorded |
| Medium | [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | Reserve Equipment | CF-17 | 3 | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| Medium | [KAN-27](https://smu-g7-grp1.atlassian.net/browse/KAN-27) | Request Clarification on an Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Irfan | None recorded |
| Medium | [KAN-29](https://smu-g7-grp1.atlassian.net/browse/KAN-29) | Automatically Assign Event Coordinator | CF-05 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | relates to: KAN-65 |
| Medium | [KAN-31](https://smu-g7-grp1.atlassian.net/browse/KAN-31) | Create Event Request | CF-02 | 3 | Done | Sprint 1 | 2026-09-21 | Ernest | None recorded |
| Medium | [KAN-33](https://smu-g7-grp1.atlassian.net/browse/KAN-33) | View Submitted Event Request | CF-04 | 2 | Done | Sprint 1, Sprint 2 | 2026-10-01 | Irfan | None recorded |
| Medium | [KAN-34](https://smu-g7-grp1.atlassian.net/browse/KAN-34) | Resume/Edit Draft Event Request | CF-03, CF-07 | 3 | Done | Sprint 1, Sprint 2 | 2026-10-04 | Kai Jie | None recorded |
| Medium | [KAN-36](https://smu-g7-grp1.atlassian.net/browse/KAN-36) | Approve/Reject Event Request | CF-04 | 3 | Done | Sprint 1 | 2026-09-21 | Tristan | relates to: KAN-60 |
| Medium | [KAN-50](https://smu-g7-grp1.atlassian.net/browse/KAN-50) | Maintain Venue Catalog | CF-08 | 5 | Done | Sprint 2 | 2026-10-10 | Irfan | None recorded |
| Medium | [KAN-51](https://smu-g7-grp1.atlassian.net/browse/KAN-51) | View Venue Availability Calendar | CF-09 | 5 | Done | Sprint 2 | 2026-10-10 | Arvin | None recorded |
| Medium | [KAN-52](https://smu-g7-grp1.atlassian.net/browse/KAN-52) | Check Venue Suitability | CF-11 | 3 | Done | Sprint 2 | 2026-10-04 | Tristan | None recorded |
| Medium | [KAN-53](https://smu-g7-grp1.atlassian.net/browse/KAN-53) | Submit Venue Booking Request | CF-12 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | None recorded |
| Medium | [KAN-54](https://smu-g7-grp1.atlassian.net/browse/KAN-54) | Detect Venue Booking Conflicts | CF-14 | 5 | Done | Sprint 2 | 2026-10-10 | Ernest | None recorded |
| Medium | [KAN-55](https://smu-g7-grp1.atlassian.net/browse/KAN-55) | Block Venue for Operational Unavailability | CF-09, CF-14 | 3 | Done | Sprint 2 | 2026-10-04 | Kai Jie | is duplicated by: KAN-21 |
| Medium | [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) | Require a reason when rejecting an event request | CF-04 | To agree | To Do | Not allocated | Not resolved | Unassigned | relates to: KAN-36 |
| Medium | [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) | Confirm Event After Planning Arrangements | CF-06 | To agree | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| Medium | [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | Cancel Event and Release Its Arrangements | CF-06, CF-19 | To agree | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| Medium | [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | Submit and Review Event Equipment Requests | CF-15 | To agree | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| Medium | [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | Notify Relevant Users About Event Workflow Updates | CF-20 | To agree | To Do | Not allocated | Not resolved | Unassigned | None recorded |
| Medium | [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | Reassign Event Coordinator | CF-05 | To agree | To Do | Not allocated | Not resolved | Unassigned | relates to: KAN-29 |
| Medium | [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | Update Event Information During Planning | CF-07 | To agree | To Do | Not allocated | Not resolved | Unassigned | relates to: KAN-15 |
| Medium | [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | View Event Registrations | CF-18 | To agree | To Do | Not allocated | Not resolved | Unassigned | relates to: KAN-14; relates to: KAN-17 |

The 34 parents contain **93 estimated points**, with eight items (KAN-60–KAN-67) still unestimated: 19 currently Done parents have 67 points; the 15 future items have 26 estimated points plus the eight unestimated items. These are current release-backlog totals, not sprint velocity.

### Sprint 2 parent and subtask reconciliation — 15 October 2026

Recorded 15 October 2026. Read-only Jira query `project = KAN ORDER BY key ASC` returned all 60 retained issues. All 34 parent metadata rows and full descriptions remain unchanged from 11 October. All 26 subtasks are now **Done**; the three changes below supersede their earlier administrative statuses, without supplying the missing acceptance evidence.

| Subtask | Parent | Current Jira state / resolution (+08:00) | Evidence still to reconcile |
| --- | --- | --- | --- |
| [KAN-57](https://smu-g7-grp1.atlassian.net/browse/KAN-57) | KAN-34 | Done; 15 October 2026, 16:11:14 | Both saved-draft registration toggle directions, save/reopen and refresh in hosted `S2-T19`. The retained 10 October comment does not record a later run. |
| [KAN-58](https://smu-g7-grp1.atlassian.net/browse/KAN-58) | KAN-6 | Done; 15 October 2026, 16:11:26 | `MAN-20261009-KAN59-01` records reopening, correction and submission. The subsequent refresh and remaining `S2-T21` checks are **Not recorded**. |
| [KAN-76](https://smu-g7-grp1.atlassian.net/browse/KAN-76) | KAN-50 | Done; 15 October 2026, 16:11:39 | PR #33 still has no submitted peer review in the 15 October check. Required AI-assistance disclosure evidence is **Not recorded**. A later review must carry its actual date. |

The original **43-point Sprint 2 commitment** is unchanged. All 12 parents are Done in Jira, but Sprint 2 is still active and only Sprints 1 and 2 exist there. Sprint 3 selection, estimates and acceptance decisions remain **To agree**. Jira resolutions on 4–15 October must not be presented as evidence of completion or acceptance by 3 October. The [Sprint 2 review baseline](../scrum/sprint-02/review.md) separates original scope, later delivery and remaining evidence.

The 15 October code audit (`AUTO-20261015-01`) passed the existing suites while separate reproductions exposed defects in venue editing (KAN-50), submission error display (KAN-6/KAN-59), draft/search date validation (KAN-34/KAN-12), and a zero-attendance suitability inconsistency (KAN-52). Passing existing tests does not close these defects. The [Sprint 3 pre-planning register](../scrum/sprint-03/planning.md#pre-planning-baseline-and-defect-triage) lists repair candidates separately from the six [new customer changes](change-requests.md). Reopening, classification, estimates and owners are **To agree**; no new story, point allocation or historical acceptance is created by this reconciliation.

### Sprint 2 parent and subtask reconciliation — 11 October 2026

**Historical snapshot:** the following entry records the 11 October state. Its To Do values are superseded by the 15 October reconciliation above; its remaining evidence gaps are retained until actual results are supplied.

All 12 Sprint 2 parents are currently Done in Jira, totalling **43 points: 35 new + 8 carry-over**. Jira Sprint 2 is still active. Historical Sprint 1 acceptance remains **24 of 32 points**, with eight carried; neither current statuses nor resolution timestamps replace the [historical review](../scrum/sprint-01/review.md). The Sprint 2 review/retrospective and velocity still require their actual outcomes; see the [Sprint 2 review](../scrum/sprint-02/review.md) and [release burndown](../scrum/release-burndown.md).

KAN-57, KAN-58 and KAN-76 are nested **subtasks**, not extra Sprint 2 stories. Their current To Do statuses were retained because these checks remain outstanding:

| Subtask | Parent / sprint membership | Implemented or verified | Remaining evidence |
| --- | --- | --- | --- |
| [KAN-57](https://smu-g7-grp1.atlassian.net/browse/KAN-57) | KAN-34; Sprint 1 and Sprint 2 | Draft registration-field repair and component tests: `AUTO-20261001-DRAFT-01` | Saved values and both No→Yes / Yes→No transitions, including refresh, in the hosted walkthrough (`S2-T19`). Irfan's 10 October Jira comment explicitly leaves hosted acceptance outstanding. |
| [KAN-58](https://smu-g7-grp1.atlassian.net/browse/KAN-58) | KAN-6; Sprint 1 and Sprint 2 | Saved-draft submission repair and automated checks; `MAN-20261009-KAN59-01` records reopening, correcting and submitting a saved draft | Record the post-submission refresh result required by this subtask; the broader `S2-T21` walkthrough remains incomplete. Irfan's 10 October Jira comment retains the open status. |
| [KAN-76](https://smu-g7-grp1.atlassian.net/browse/KAN-76) | KAN-50; Sprint 2 | [PR #33](https://github.com/MochaLxtte/ConnectSphere/pull/33) merged; [CI run 37957538659](https://github.com/MochaLxtte/ConnectSphere/actions/runs/37957538659) passed; catalogue manual runs recorded | Peer review and the card's required AI-assistance note remain outstanding. PR #33 had no submitted reviews when checked on 11 October. |

Subtasks are already included in their parent estimates and add no story points. No Jira dates, statuses or sprint memberships were changed by this documentation reconciliation. The agreed calendar remains Sunday starts and Saturday reviews; actual meeting and completion evidence must be recorded separately.

## Release coverage

`CF-01`–`CF-20` are repository traceability identifiers. Each feature maps to a canonical story or a group of complementary stories; overlapping implementation and tests must not be counted as separate delivery.

| ID | Core feature | Canonical stories |
| --- | --- | --- |
| CF-01 | User Authorisation and Authentication | KAN-25; each later story also checks role and event relationship, KAN-79, KAN-84 |
| CF-02 | Event Request Creation | KAN-31, KAN-6; corrective subtasks KAN-58/KAN-59, KAN-79 |
| CF-03 | Draft Event Requests | KAN-4, KAN-34; corrective subtask KAN-57 |
| CF-04 | Event Review and Approval | KAN-33, KAN-27, KAN-36; corrective subtask KAN-56 and task KAN-60, KAN-79 |
| CF-05 | Coordinator Assignment | KAN-29 original policy; KAN-79 Lead queue replaces it under CR-5; KAN-65 reassignment |
| CF-06 | Event Status Management | KAN-16, KAN-61, KAN-62, KAN-10; submission/review/planning actions own their transitions, KAN-84 |
| CF-07 | Event Information Management | KAN-66; KAN-15 handles significant changes |
| CF-08 | Venue Catalogue | KAN-50, including supported layouts; KAN-77 buffer configuration (CR-1) |
| CF-09 | Venue Availability Calendar | KAN-51; KAN-55 supplies operational unavailability, KAN-78, KAN-81, KAN-83 |
| CF-10 | Venue Search and Filtering | KAN-12, KAN-78 |
| CF-11 | Venue Suitability Checking | KAN-52, KAN-78, KAN-84 |
| CF-12 | Venue Booking Request | KAN-53, KAN-78, KAN-81, KAN-82, KAN-83 |
| CF-13 | Venue Booking Approval | KAN-8, KAN-78, KAN-81, KAN-82, KAN-83 |
| CF-14 | Booking Conflict Detection | KAN-54, with operational-block protection from KAN-55, KAN-78, KAN-81, KAN-82, KAN-83 |
| CF-15 | Equipment Request Management | KAN-63: coordinator request and Technical Support Staff review/update, KAN-84 |
| CF-16 | Equipment Availability Checking | KAN-9, KAN-18 |
| CF-17 | Equipment Reservation | KAN-26, KAN-84 |
| CF-18 | Attendee Registration | KAN-14, KAN-17, KAN-67 |
| CF-19 | Event Change Requests | KAN-15; KAN-62 handles cancellation and arrangement release, KAN-82, KAN-84 |
| CF-20 | Notification System | KAN-64 (request/venue), KAN-80 (later workflows); CR-specific triggers in KAN-81/82/83/84, KAN-82, KAN-83, KAN-84 |

KAN-78 (CR-1) adds buffered occupancy and regression coverage across CF-09–CF-14, preserving the original stories' history.

KAN-24 is the separate database setup item. It supports these features and is not a twenty-first customer feature. KAN-61 confirmation, KAN-62 cancellation and KAN-10 completion provide explicit lifecycle actions; there is no generic story allowing users to select any status arbitrarily.

## Sprint commitments and acceptance

### Sprint 1

The [Sprint 1 backlog](../scrum/sprint-01/sprint-backlog.md) retains the historical story cards, criterion IDs and task allocations. The [review](../scrum/sprint-01/review.md) records acceptance and reported defects.

| Jira item | Story | Points | Sprint 1 result / continuing ownership |
| --- | --- | ---: | --- |
| KAN-25 | User Authorisation and Authentication | 5 | Done — Ryan |
| KAN-31 | Create Event Request | 3 | Done — Ernest |
| KAN-4 | Save Draft Event Request | 3 | Done — Ernest |
| KAN-34 | Resume/Edit Draft Event Request | 3 | Carried to Sprint 2 — Kai Jie |
| KAN-6 | Submit an Event Request | 3 | Carried to Sprint 2 — Kai Jie |
| KAN-33 | View Submitted Event Request | 2 | Carried to Sprint 2 — Irfan |
| KAN-27 | Request Clarification on an Event Request | 3 | Done — Irfan |
| KAN-36 | Approve/Reject Event Request | 3 | Done — Tristan; later reason correction is KAN-60 |
| KAN-16 | View Event Request Status | 2 | Done — Tristan; later lifecycle coverage remains to verify |
| KAN-24 | Setup Database | 5 | Done — Arvin |

Done applies to the accepted Sprint 1 slices. Later clarifications and newly defined workflow criteria do not retrospectively establish a new pass or erase earlier observations.

### Sprint 2

The [Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md) is the detailed authority for its 93 planning criteria, technical tasks and planned cases. Keep those IDs stable when adding dated refinements; the criteria are not duplicated here. The nine new stories total 35 points, and KAN-6/KAN-33/KAN-34 add the carried eight points.

| Jira item | Story | Points |
| --- | --- | ---: |
| KAN-29 | Automatically Assign Event Coordinator | 3 |
| KAN-50 | Maintain Venue Catalogue | 5 |
| KAN-51 | View Venue Availability Calendar | 5 |
| KAN-12 | Search and Filter Venues | 5 |
| KAN-52 | Check Venue Suitability | 3 |
| KAN-53 | Submit Venue Booking Request | 3 |
| KAN-8 | Approve or Reject Venue Booking Request | 3 |
| KAN-54 | Detect Venue Booking Conflicts | 5 |
| KAN-55 | Block Venue for Operational Unavailability | 3 |

KAN-29 uses preconfigured coordinator availability, fewest active events and a consistent ID/order tie-break. Tristan implements this three-point story, the three-point KAN-8 booking decision story and the user-requested three-point KAN-52 suitability story (nine new-story points in total). This records implementation responsibility, not a new Jira assignee change or revised Sprint 2 planning commitment. The [28 September implementation choices](assumptions-and-questions.md#28-september-2026--kan-29-implementation-choices) define an explicit availability flag, counted statuses, UUID ordering and a retryable draft when nobody is available. These defaults await team review; local automated results do not establish hosted acceptance or Jira Done. KAN-51 permits Event Coordinators, Venue Staff and Technical Support Staff. Venue submission must refuse a period already reserved or operationally unavailable, and booking approval must recheck conflicts. Pending holds, interval boundaries and a new operational block overlapping an existing booking remain decisions to settle.

| Corrective subtask | Parent | Scope |
| --- | --- | --- |
| KAN-56 | KAN-33 | Restore authorised coordinator navigation to decided requests and verify access/queue regressions |
| KAN-57 | KAN-34 | Restore conditional registration fields when editing a saved draft; verify both toggle directions and persistence |
| KAN-58 | KAN-6 | Enable and verify saved-draft submission |
| KAN-59 | KAN-6 | Reject incomplete new-request and saved-draft submissions with field errors |

These subtasks are included in the carried parent estimates, not extra story points. The historical 11 October ownership snapshot was Tristan (KAN-29/KAN-8/KAN-52), Irfan (KAN-50/KAN-33), Arvin (KAN-51), Ryan (KAN-12), Ernest (KAN-54), and Kai Jie (KAN-53/KAN-55/KAN-6/KAN-34). It is not a reconstruction of original planning allocations. Use the [current master register](#master-backlog-register) for subsequent Sprint 3 reassignments. Historical contributions and original story estimates remain unchanged; the reconciliation above separates repair evidence from acceptance gaps.

## Original future-backlog wording and corrective-work history

**Historical wording preserved from 21 September.** Current points, owners, sprint assignments and active criteria are in the master table and Sprint 3/4 cards above. In particular, the combined KAN-64 wording below is archived after its explicit split; it is not the current five-point acceptance checklist.

**Historical working definitions — 21 September, retained for traceability.** The cards and unestimated/proposal statements below predate Sprint 3 selection. Current selected estimates, owners, original Jira wording and AC101+ refinements are in the [Sprint 3 cards](../scrum/sprint-03/sprint-backlog.md). The current register above supersedes these cards for administrative status and estimates; earlier source requirements remain visible.

The cards below define the remaining scope before selection into a future sprint. Existing estimates shown for older stories were checked in Jira on 21 September and must be reviewed against the refined scope. They are not new estimates or capacity commitments. KAN-60–KAN-67 remain unestimated. The live future backlog contains 15 items: seven older stories with 26 existing points and eight unestimated items. The 26 points are not a complete future-sprint estimate. The refinement questions must be resolved or bounded before a story is considered ready. These working cards summarise the behaviour in Jira; their numbering is not a replacement for the retained sprint criterion IDs.

### KAN-10 — Mark Event as Completed

**User story:** As an Event Coordinator, I want to mark an eligible event as completed so that its final lifecycle state is clear and its equipment reservations are released.

**Existing estimate:** 3 points, to review before selection.

**Acceptance criteria**

1. An authorised coordinator can complete an event that meets the agreed lifecycle rules.
2. Completion records the correct event, actor and time, and persists after refresh.
3. The organiser and relevant internal users can view the completed status.
4. Completion automatically releases the event's equipment reservations without releasing another event's reservations.
5. Repeated, ineligible or unauthorised attempts do not create duplicate resource releases or alter unrelated records.

**Refinement:** Agree eligible prior states, whether the event must have ended and any effects on venue or registration records. Assigned-coordinator access and `CONFIRMED` after the event end are proposals, not settled customer rules.

### KAN-14 — Register for an Event

**User story:** As an Attendee, I want to view an event and register while registration is available so that I can secure a place and see my registration status.

**Existing estimate:** 5 points, to review before selection.

**Acceptance criteria**

1. An attendee can view appropriate event information and registration conditions before submitting a registration.
2. Registration is offered only when enabled for the event, the event is Confirmed, its registration window is open and capacity remains.
3. Valid registration is linked to the correct attendee and event, and provides confirmation.
4. The attendee can view their own saved registration status after refresh.
5. Registration immediately consumes a place; concurrent requests cannot exceed the permitted capacity.
6. Full, disabled, not-yet-open or closed registration is refused with useful feedback and no new active registration.
7. Duplicate active registration does not consume another place or create another active record.
8. Attendees cannot create registrations for another attendee or view another attendee's protected registration information.

**Refinement:** Confirm required attendee fields, registration-period boundaries, duplicate/re-registration behaviour and the final eligibility rules. Confirmed is retained from the existing story; any broader implementation eligibility needs an explicit decision. Withdrawal is KAN-17, organiser/coordinator visibility is KAN-67 and notifications are KAN-64. A waiting list is not a first-release dependency.

### KAN-17 — Withdraw Attendee Registration

**User story:** As an Attendee, I want to withdraw a registration I can no longer use so that I am no longer expected and the place becomes available.

**Existing estimate:** 2 points, to review before selection.

**Acceptance criteria**

1. An attendee can choose one of their own eligible registrations to withdraw.
2. The attendee confirms withdrawal, with any warning about re-registration accurately reflecting the agreed rules.
3. Withdrawal records the correct registration as withdrawn so that it is no longer counted as active.
4. The attendee can view the saved withdrawn status after refresh.
5. An active registration's place is released exactly once; repeated withdrawal cannot incorrectly increase availability.
6. Unauthorised attempts cannot withdraw another attendee's registration.
7. Invalid withdrawal attempts leave the registration unchanged and provide useful feedback.

**Refinement:** Agree withdrawal timing, ineligible-state handling and whether and when re-registration is allowed. KAN-67 provides updated organiser/coordinator visibility; keep notifications in the KAN-64 trigger matrix.

### KAN-18 — Update Equipment Availability Status

**User story:** As a Technical Support Staff member, I want to record equipment that is damaged, under maintenance or otherwise unavailable so that it is not offered for event use.

**Existing estimate:** 3 points, to review before selection.

**Acceptance criteria**

1. Authorised Technical Support Staff can view and update the operational availability of the correct equipment type or quantity.
2. Saved unavailability persists and reduces the quantity treated as available for relevant event periods.
3. Damaged, maintenance and other unavailable equipment is excluded from new availability and reservation decisions.
4. Unauthorised users cannot modify protected equipment availability information.
5. Authorised Technical Support Staff can restore operational availability when the equipment is usable again.

**Refinement:** Agree the operational-status model, whether unavailability has a time range, and the handling/notification of affected reservations. Proposed consistency checks should ensure that an operational change identifies affected reservations, restoring equipment does not erase commitments or count quantity twice, and invalid quantities do not corrupt totals. These additions still need to be adopted in Jira. Individual asset tracking is not implied by the quantity-based model.

### KAN-9 — Check Equipment Availability for an Event

**User story:** As a Technical Support Staff member, I want to check whether sufficient suitable equipment is available for an event's date and time so that I can assess its equipment request.

**Existing estimate:** 8 points, to review before selection.

**Acceptance criteria**

1. Authorised staff can check the requested equipment type and quantity against the correct event period.
2. The check considers quantities reserved for overlapping events and equipment recorded as operationally unavailable.
3. Equipment already committed to an incompatible event is not treated as freely available.
4. Only when all requested items meet demand does the result display a green Fulfillable indicator. Otherwise, Shortfall / Unfulfillable identifies each affected item and its quantity deficit.
5. Non-overlapping reservations do not incorrectly reduce availability for the requested period.
6. Checking availability does not itself reserve equipment, and does not require venue confirmation.
7. Protected availability information is limited to authorised users.

**Refinement:** Agree interval boundaries and reservation states that consume quantities. Availability is checked again when reserving; an earlier positive check is not a guarantee against intervening reservations. Equipment location does not restrict allocation under the recorded rule.

### KAN-26 — Reserve Equipment

**User story:** As a Technical Support Staff member, I want to reserve available equipment for an event so that its quantity remains committed to that event during the required period.

**Existing estimate:** 3 points, to review before selection.

**Acceptance criteria**

1. Authorised staff can reserve a valid equipment type and quantity for the correct event and period during planning.
2. Current availability is checked at reservation; concurrent attempts cannot overcommit equipment.
3. A saved reservation reduces available quantity for overlapping events and remains associated with its event.
4. Venue and equipment arrangements may proceed independently; final venue or event confirmation is not a blanket prerequisite.
5. The relevant coordinator can see the reservation outcome and receive the agreed notification.
6. Cancelling or completing an event releases its equipment reservations automatically and exactly once.
7. Authorised manual adjustments preserve valid quantities and availability; unauthorised or conflicting adjustments leave existing reservations intact.

**Refinement:** Agree eligible event states, partial fulfilment, edit/cancellation permissions and whether accepting an equipment request creates the reservation or precedes a separate action.

### KAN-15 — Submit and Review Event Change Requests

**User story:** As an Event Organiser, I want to request permitted changes to a submitted event and have its coordinator review them so that the event and its arrangements remain consistent.

**Existing estimate:** 2 points, to review before selection against the combined submission/review scope.

**Acceptance criteria**

1. An authorised organiser can submit a change request for their event, linked to the correct event and requested values; there is no general change-request cut-off under the recorded clarification.
2. Submission records a pending request and provides the organiser with acknowledgement through the chosen notification channel. Submitting the request does not itself apply the proposed values or alter existing arrangements.
3. The authorised coordinator can view the requested changes, the current values and the affected event arrangements.
4. The coordinator can record a permitted review outcome; the organiser can see that saved outcome after refresh.
5. Accepting a permitted change updates the correct event where appropriate; refusing it does not silently apply the proposed values.
6. Changes to timing, attendance, venue requirements or equipment requirements identify affected arrangements for reconsideration.
7. A significant change must not silently leave incompatible bookings or equipment reservations treated as valid; affected arrangements require reconsideration or revalidation.
8. Major changes affecting confirmed arrangements follow cancellation and a new request.
9. Unauthorised users cannot request or process changes for unrelated events; updates do not alter another event.
10. Relevant users receive the agreed change-request and review-outcome notifications through KAN-64, without duplicating the same notification obligation.

**Refinement:** Agree ordinary versus significant fields, review outcomes, prior-state permissions and how affected arrangements are resolved. Organiser editing before approval and coordinator-only general editing require an explicit boundary. Ordinary planning edits belong to KAN-66; draft edits remain KAN-34.

### KAN-60 — Require a Reason When Rejecting an Event Request

**Type:** Corrective task related to KAN-36; unestimated and outside Sprint 2.

**Purpose:** Apply the mandatory rejection-reason rule without changing Sprint 1's historical acceptance record.

**Acceptance criteria**

1. The UI and API refuse a rejection with a missing, blank or whitespace-only reason and provide useful feedback.
2. A valid rejection stores the reason with the decision for the correct request.
3. The relevant organiser can see the saved reason and Rejected outcome after refresh.
4. Invalid input creates no review record and does not change request status.
5. An approval reason remains optional, and existing role, assignment and already-decided protections remain enforced.

**Refinement:** Agree any length limit; do not apply a mandatory venue-booking rejection reason by implication. Verify both direct API and browser paths.

### KAN-61 — Confirm Event After Planning Arrangements

**User story:** As an Event Coordinator, I want to confirm an event once its essential arrangements are ready so that the organiser can rely on the final arrangements.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. Only a coordinator authorised for the event can confirm it.
2. Initial event-request approval under KAN-36 is distinct from final confirmation.
3. Required venue and equipment arrangements are checked. Unmet prerequisites prevent confirmation with useful feedback; an applicable Not Required equipment choice does not block confirmation.
4. Confirmation records the correct event, actor and time, persists after refresh and is visible to the organiser.
5. Repeated, ineligible or unauthorised attempts do not corrupt status or related arrangements.
6. Optional human technical-support requests or staff scheduling are not prerequisites of this first-release confirmation workflow.

**Refinement:** Agree prior states, the exact venue/equipment readiness checklist and registration-opening/notification effects under KAN-14/KAN-64. Confirmation must not imply that the event has already taken place.

### KAN-62 — Cancel Event and Release Its Arrangements

**User story:** As an authorised user, I want to cancel an eligible event so that its current status is clear and its arrangements no longer remain incorrectly committed.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised user can cancel an event that meets the agreed lifecycle rules.
2. Cancellation records the correct event, actor, time and any required reason, persists and is visible to relevant users.
3. Equipment reservations for the cancelled event are released automatically and exactly once.
4. Related venue bookings and registrations are handled under the agreed cancellation policy; none are silently left presented as valid arrangements for a continuing event.
5. Relevant users receive the agreed cancellation notifications without exposing unrelated events.
6. Repeated, ineligible or unauthorised cancellation does not release another event's resources or corrupt totals.
7. Major changes affecting confirmed arrangements can follow the cancellation-and-new-request process without changing the identity of the cancelled event.

**Refinement:** Agree who may request versus perform cancellation, eligible states, reason requirements, venue release, registration outcomes and recipient/channel rules. Automatic equipment release is agreed; the other effects need explicit decisions before implementation acceptance.

### KAN-63 — Submit and Review Event Equipment Requests

**User story:** As an Event Coordinator, I want to record equipment needs and have Technical Support Staff review and update the request so that suitable equipment arrangements can be made for the event.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised coordinator can create and save a request containing equipment type, valid quantity, relevant technical requirements and the event period.
2. The request remains linked to the correct event and is available to the appropriate Technical Support Staff.
3. Authorised Technical Support Staff can inspect the requested type, quantity, period and technical requirements.
4. Technical Support Staff can review and update permitted request/arrangement information and record the review outcome as planning progresses.
5. Saved information and outcomes persist on the correct request; the relevant coordinator can view the latest version.
6. Review uses KAN-9 to check current available quantities against event timing and equipment needs.
7. Reservations use KAN-26; request creation and review do not silently double-count or reserve quantities twice.
8. Changes to one request do not alter an unrelated event's equipment arrangements.
9. Unauthorised users cannot view or modify protected equipment requests or arrangements.
10. Equipment arrangements can proceed independently of venue confirmation. Events with no equipment requirement can retain Not Required without a dummy request.

**Refinement:** Agree request/review states, edit permissions, partial fulfilment and the boundary between review acceptance and reservation. This story covers equipment and technical requirements, not human technical-support staffing.

### KAN-64 — Notify Relevant Users About Event Workflow Updates

**User story:** As a user, I want to receive significant event updates relevant to my responsibilities or participation so that I know when action is needed or arrangements have changed.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. **Event requests:** notify the relevant organiser for successful submission, clarification requests and approval/rejection according to the agreed trigger/recipient matrix.
2. Notify relevant users when a coordinator is assigned or reassigned.
3. **Planning:** notify relevant internal users for venue-booking decisions, significant event changes and equipment arrangement updates.
4. Notify relevant users of event confirmation and cancellation where applicable.
5. **Registration:** notify appropriate users for significant registration updates, withdrawal and event changes affecting registered attendees where applicable.
6. Every notification identifies the correct event and relevant action or outcome, with enough information to understand the update.
7. Recipients are limited to users with a relevant role or relationship; notification details and linked pages do not disclose protected information about unrelated events or registrations.
8. Notifications reflect the saved action; a failed or rejected mutation does not generate a false success notification.
9. Deliver notifications through the chosen release channel; email is not mandatory.

**Refinement:** Agree the trigger/recipient/channel matrix and delivery, retry, duplicate and read-state behaviour. Reuse the notifications described in other stories so one agreed trigger is not implemented or counted twice. A notification epic is not mandatory. The three trigger groups are parts of this canonical story, not three additional duplicate stories.

### KAN-65 — Reassign Event Coordinator

**User story:** As an authorised internal user, I want to reassign an event to another Event Coordinator so that responsibility can change when staff responsibilities or availability change.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised user can view the event's current coordinator.
2. An authorised user can select a permitted replacement Event Coordinator.
3. Reassignment saves exactly one current coordinator against the correct event, records the actor and time, and persists after refresh.
4. The new coordinator can access the assigned event.
5. The previous coordinator no longer receives authority solely from the old assignment.
6. Reassignment retains the same event, its existing information, decisions and arrangements.
7. Relevant users can see the current coordinator and receive the agreed assignment notification.
8. Unauthorised or invalid changes leave the current assignment intact.

**Refinement:** Coordinators may assign to themselves or another coordinator, but authority to take over another coordinator's event is still open. Agree eligible replacement availability, reassignment states and concurrent-change behaviour. Automatic initial assignment remains KAN-29.

### KAN-66 — Update Event Information During Planning

**User story:** As an authorised user, I want to update permitted event information during planning so that the event record stays accurate as arrangements are made.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised user can view the current information and update fields permitted for their role, event relationship and lifecycle stage.
2. Valid ordinary edits save against the correct event and remain visible after refresh.
3. Unauthorised or invalid edits are refused without losing the saved event information.
4. Ordinary edits preserve unrelated information, decisions and arrangements, and do not change another event.
5. Changes to timing, expected attendance, venue requirements or equipment requirements are assessed against the agreed significant-change rules.
6. Changes affecting existing arrangements follow KAN-15 or the agreed cancellation/new-request process; ordinary editing cannot silently bypass those controls.

**Refinement:** Agree the editable-field/role/stage matrix and ordinary-versus-significant boundary. Resolve organiser edits before approval versus coordinator-only general editing. This is neither draft editing under KAN-34 nor a second implementation of change-request review.

### KAN-67 — View Event Registrations

**User story:** As an Event Organiser or Event Coordinator, I want to view registrations for events I manage so that I can understand the current attendee registrations.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. The relevant organiser or current authorised coordinator can view appropriate registration information for their event.
2. Registrations shown belong to the correct event, with active and withdrawn registrations distinguishable.
3. Registration information and relevant counts reflect a saved attendee registration or withdrawal after refresh.
4. An event with no registrations shows a clear empty state without exposing another event's records.
5. Unrelated users cannot access protected registration information, including by requesting another event's identifier directly.
6. Displayed information is restricted to fields needed by the authorised role; the exact personal-field list remains to agree.

**Refinement:** Agree the personal fields visible to each role and the counting/display rules. Exporting, waiting lists and attendance recording are outside this story. Attendee self-service remains KAN-14/KAN-17.

## Archived backlog items

The four items below were **archived in Jira on 21 September 2026**. Each archived card retains its history and offers Restore; none was permanently deleted. They had no child items or sprint membership when checked. Archiving removes them from the active backlog without changing Sprint 1's historical commitment or Sprint 2's 43-point baseline.

| Archived Jira item | Reason | Coverage or consequence |
| --- | --- | --- |
| KAN-21 — Block Venue for Maintenance | Duplicate of the broader KAN-55 operational-unavailability story | Mandatory reason, blocked period and calendar/conflict effects are retained in KAN-55; do not count both estimates |
| KAN-19 — Join Attendee Waiting List | Optional feature outside the selected first-release scope | KAN-14 keeps full-capacity refusal; a waiting list is not required for core registration |
| KAN-22 — Send Technical Support Requests | Optional human technical-support workflow outside the 20 core features | Equipment type, quantity and technical requirements remain covered by KAN-63 |
| KAN-23 — Assign Technical Support Staff | Optional human staffing/scheduling outside the selected first-release scope | Equipment reservation remains KAN-26; confirmation readiness must not depend on staffing assignment |

Archiving the optional stories narrows the selected release scope; it does not establish that the customer prohibited those broader features. KAN-14 retains registration and full-capacity refusal without a waiting-list dependency, and KAN-61 readiness checks in-scope venue/equipment arrangements without requiring human staffing. Restore an optional item only if the team later selects that scope and resolves its open rules. Historical Sprint 1 and carried stories, original estimates and evidence remain intact.

## Readiness and evidence

Before selecting future work, refine the open rules with the Product Owner, estimate the remaining work against existing implementation, assign an owner/reviewer and identify tests for normal, boundary, access, conflict and failure cases. Reuse shared modules and record cross-feature effects explicitly.

The release walkthrough should connect submission, assignment, review, venue booking, equipment arrangements, confirmation, registration and significant change/cancellation. Tests must show that event timing and current arrangements remain consistent across those steps. The [traceability register](traceability.csv) maps stories to implementation and tests; it does not replace executed acceptance evidence.

Export the final Jira backlog with completed and pending stories for submission. Keep the product backlog, sprint snapshots and historical acceptance records distinguishable; later refinements must not rewrite the original sprint baseline or invent completion dates.


**21 October 2026 — KAN-81 targeted status correction.** Jira To Do was corrected to In Progress during PR47 review remediation; Kai Jie is the observed assignee, estimate 8 SP. Only the KAN-81 row is refreshed; other rows retain their dated snapshots. Phase-1 merge does not complete the parent story, confer velocity or establish hosted acceptance.

## 21 October 2026 — targeted KAN-78 / KAN-34 implementation snapshot

KAN-78 (8 SP) and KAN-34 (3 SP) are In Progress / Arvin in Jira on `feat/kan-78-kan-34`; Sprint 3 membership is unchanged. Subtasks: KAN-94/95 under KAN-78; KAN-96/97 under KAN-34. Local automated verification passed (AUTO-20261021-KAN78-01). Independent review, hosted acceptance and Done date remain Not recorded / Not executed as applicable. KAN-77 remains separately assigned to Kai Jie; this branch supplies shared buffer storage/evaluation, not its editor. Earlier allocations and historical acceptance are preserved.

### 21 October — reviewer selection follow-up

Independent reviewer for KAN-78 and KAN-34: Leo Kai Jie, selected by Arvin in chat. Review execution and approval remain Not recorded. Story status, estimates and sprint membership are unchanged.

## 21 October — KAN-78 / KAN-34 review handoff

KAN-78 (8 SP) and KAN-34 (3 SP), Arvin, are now **In Review** in Jira; both transitions were confirmed by the Jira response. [PR #48](https://github.com/MochaLxtte/ConnectSphere/pull/48) targets main from `feat/kan-78-kan-34`, source `2d138be`. Leo Kai Jie (`NahIts-Leo`) is requested on GitHub. Review and hosted acceptance remain Not executed; no Done date, estimate, sprint or delivered credit changed.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

| Sprint / actual delivery | Arvin’s evidenced contribution | Source / boundary |
| --- | --- | --- |
| Sprint 1 story; 20 September merge | KAN-24 infrastructure, 5 SP: database/schema, ERD and persistence | PR #10; after planned sprint end; broader feature work later removed |
| Sprint 2; 26 September | Corrected KAN-24 scope by removing premature application features | PR #19; no additional story or points |
| Sprint 2 story; 6–7 October | KAN-51, 5 SP: calendar navigation/selection and access fixes | PR #28; Ernest retains original calendar implementation; hosted acceptance gaps remain |
| Sprint 3; 12 October | Consultation, planning/closure, capacity, C4 and submission preparation | Historical preparation snapshots; not completed ceremonies or approved decisions |
| Sprint 3; 21 October | Authorized shared migration 008/009 rollout, executed by Codex | Retained ledger/checksum/schema readback; no new feature acceptance |
| Sprint 3; 21 October | KAN-81 review and stale-write refresh corrections | PR #47; Kai Jie retains story ownership and 8 SP |
| Sprint 3; 22 October integration | KAN-34 (3 SP), KAN-78 (8 SP) | PR #48 via #54; automated evidence imported separately; hosted acceptance and Jira Done not inferred |

The 21 SP across the four owned stories is their estimate total, **not accepted velocity**. Source evidence is registered in the sprint evidence indexes and in `docs/scrum/sprint-03/evidence/arvin-contributions-github-2026-10-25.json`. No fresh Jira export was obtained; historical CSV/workbook snapshots remain unchanged.
