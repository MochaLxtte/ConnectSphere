# Requirements and scope

**Arvin implementation evidence — 25 October 2026.** KAN-34's draft persistence/date regressions and KAN-78's existing CR-1 buffered venue criteria are integrated in main `96a0d10`; their feature/story mappings and estimates are unchanged. [Scoped evidence](../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) separates current automated verification from complete hosted acceptance (Not executed) and story acceptance (Not assessed). Earlier dated planning-only statements remain historical; this update covers no other story.

**19 October 2026 implementation follow-up:** KAN-79 Lead allocation and KAN-65 reassignment are implemented and tested locally on `feat/KAN-65-coordinator-reassignment`. Lead role provisioning/migration 007 and login were reported working by the user; full workflow acceptance remains separate. KAN-64 notifications and hosted/manual checks are pending. CF-05 maps to the preserved original KAN-29 requirement, replacement KAN-79 initial allocation and KAN-65 handover. No additional requirement or story points are introduced.

**Current branch implementation — 19 October 2026.** KAN-79 implements the sixth trusted role, Event Coordinator Lead, and replaces automatic initial allocation with a Lead queue. Existing KAN-29 assignment history remains intact; the dated Sprint 1/2 scope below is historical. Shared deployment and acceptance are pending; Safety Officer remains future KAN-84 scope. KAN-65/KAN-64 integration is pending. See [CR-5](change-requests.md), [current criteria](../scrum/sprint-03/sprint-backlog.md#kan-79--assign-submitted-events-through-a-coordinator-lead-queue) and [test evidence](../testing/test-evidence.md#19-october-2026--kan-79-lead-allocation).

**Submission reading guide — 17 October 2026.** Start with the [master backlog](product-backlog.md#master-backlog-register) for the current release inventory and the [change register](change-requests.md) for before/after customer requirements. Sprint 1 and Sprint 2 retain their dated baseline cards; their new reconciliation sections map the original requirements to explicit functional cases without changing historical acceptance. Current Sprint 3/4 cards govern later work. The [submission workbook notes](../submission/1/README.md) distinguish the unchanged Jira source snapshot from repository supplements. Differences caused by recorded customer changes are intentional; omissions and unmapped criteria are corrected separately.

**Ownership update — 16 October 2026.** All 28 unfinished parent items are now unassigned in Jira. Team members will choose their own stories; independent reviewers and the integration lead are **To agree** after ownership is chosen. The scope remains **63 SP per sprint**, averaging **10.5 SP per member per sprint** and **21 SP per member across both**. Aim for roughly 10–11 SP each, retaining whole estimates and dependency order rather than forcing an exact split. Earlier named allocations are historical. Claim a Jira card and sync its sprint record before starting work.

The first release covers the 20 core features below. This directory records the release scope, workflow requirements and team decisions.

## Current planning baseline — 16 October 2026

The complete estimated release inventory is **174 SP across 42 parent items**: **48 administrative Done**, **63 To Do in active Sprint 3 (13 parents)** and **63 To Do in future Sprint 4 (15 parents)**. All six customer changes are actual linked Jira stories. The [master register](product-backlog.md#master-backlog-register), [change register](change-requests.md), [Sprint 3](../scrum/sprint-03/sprint-backlog.md), [Sprint 4](../scrum/sprint-04/sprint-backlog.md) and [exports](../submission/1/README.md) align. This is planning, not implementation or acceptance evidence.

The customer changes arrived **2 October 2026**, confirmed in chat on 16 October. The team intended to complete Sprint 2 against its existing **43-point** scope, then consider the changes during Sprint 3 planning. Current reconstruction/rebalancing is recorded on 16 October; no earlier finalised selection is claimed. Sprint 1's reported 32/24/8 and Sprint 2's unresolved historical acceptance remain preserved.

CR-1/2/4/5 are allocated to Sprint 3; CR-3/6 to Sprint 4. KAN-64's original 8 points split into KAN-64 5 and KAN-80 3 with all original notification triggers retained. New customer scope totals **47 SP**, not duplicated by carry-over or splitting. Role extensions are trusted **Event Coordinator Lead** (KAN-79) and **Safety Officer** (KAN-84); together with the original five roles, the target release has seven. Current deployed code is not claimed to support those new roles yet.

The defaults and estimates form the recorded planning baseline; team estimation/capacity review remains To agree. They are not customer quotations or team voting records. The earlier 97/29 allocation remains in the change and sprint history.


## Historical baseline — 15 October 2026

The original Sprint 1 outcome remains **32 committed / 24 reported Done / 8 carried**; the original Sprint 2 commitment remains **43 points (35 new + 8 carried)**. All 12 Sprint 2 parents and KAN-57/KAN-58/KAN-76 are now Done in Jira, but Sprint 2 is still active and its actual review acceptance/velocity remain **Not recorded**. Consult the [current master register](product-backlog.md#master-backlog-register) and [Sprint 2 baseline](../scrum/sprint-02/review.md) rather than treating dated summaries below as current statuses.

The [15 October implementation audit](../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) passed existing automated suites and separately identified concrete defects. The [Sprint 3 preparation](../scrum/sprint-03/planning.md#pre-planning-baseline-and-defect-triage) records those repair candidates. It does not create a new sprint commitment or establish historical acceptance.

The [Week 7 change register](change-requests.md) separately records six source requirements and their pre-change behaviour. Proposed classifications, new Jira breakdown, points and selection remain **To agree**. In particular, the new Lead assignment queue replaces the original automatic allocation policy, and the Safety Officer adds a separate approval gate. The original five-role scope and story criteria below describe the pre-change baseline; they must not be silently rewritten as if the new roles existed in Sprint 1 or 2.

## Original scope and dated implementation history

The [product backlog](product-backlog.md) is the consolidated index of retained stories, future acceptance criteria, dependencies and archived scope. It links the Sprint 1 and Sprint 2 records without changing their commitments or acceptance history. The 21 September refinement added KAN-65 reassignment, KAN-66 planning-information editing and KAN-67 registration viewing; these remain unestimated future work. KAN-21 was archived as a duplicate of KAN-55, and optional waitlist/human-staffing stories KAN-19, KAN-22 and KAN-23 were archived outside the core release.

The initial Jira workstreams were agreed at the planning meeting on 6 September 2026 and are recorded in the [Sprint 1 plan](../scrum/sprint-01/README.md). The stack is Vue 3 with TypeScript and Vite, Express with TypeScript, and PostgreSQL. Supabase hosts PostgreSQL and provides authentication. Express maps verified identities to application profiles and enforces roles, ownership and current coordinator assignment; see the [decision log](assumptions-and-questions.md).

Sprint 1 closed with **seven Done PBIs worth 24 points**: KAN-25, KAN-31, KAN-4, KAN-27, KAN-36, KAN-16 and the KAN-24 database item. KAN-6, KAN-33 and KAN-34 carry forward at their original **8 points**. The review recorded passes for DEMO-01, DEMO-03, DEMO-04, DEMO-05 and DEMO-07 through DEMO-11. DEMO-02 exposed the draft registration-toggle issue and DEMO-06 exposed navigation to approved requests for final confirmation. The validation defects qualify the DEMO-04/05 passes and keep KAN-6 open; see the [review defects and carry-over](../scrum/sprint-01/review.md#review-defects-and-carry-over).

**Sprint 2 runs from 20 September to 3 October 2026 with 12 PBIs and a 43-point baseline: nine new stories at 35 points plus the three carried stories at 8 points.** Scrum meetings are on Tuesday, Thursday and Saturday. The [Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md) retains 93 detailed planning criteria, KAN-29's assignment rule, implementation proposals and planned tests. The pre-edit export had 77 criteria across those nine stories. Live Jira now includes the six shorter cards' missing checks and the customer-rule refinements, recorded on 21 September. Existing criterion IDs remain stable for traceability. Sprint 1's current Jira descriptions and 79 functional criteria are now available for cross-reference with its historical cards. See the [backlog audit](assumptions-and-questions.md#21-september-2026--jira-backlog-audit) and [Sprint 2 refinement register](../scrum/sprint-02/planning.md#jira-refinements-to-record). The [applied Jira changes](assumptions-and-questions.md#21-september-2026--jira-updates-applied) record the corrective subtasks and future release stories. No new test results are established by this reconciliation.

## 30 September sprint scope audit

**11 October reconciliation:** KAN-50 catalogue maintenance is now merged through PR #33 and has linked automated/manual evidence; the dated audit below describes earlier states. The [current master register](product-backlog.md#master-backlog-register), [workbook](../submission/1/product-backlog.xlsx) and [Jira export](../submission/1/jira-backlog-2026-10-11.csv) record all 34 parents plus their 26 subtasks. All 12 Sprint 2 parents are currently Done in Jira, while Sprint 2 remains active and KAN-57/KAN-58/KAN-76 retain outstanding verification or review work. This refresh does not change the 43-point commitment or award formal sprint acceptance. See the [Sprint 2 review](../scrum/sprint-02/review.md) for current evidence and remaining gaps.

The current working branch implements only the application features selected for Sprint 1 and Sprint 2, including their supporting access control, validation and audit reads. This audit compares the mounted Express routes, reachable Vue pages/actions, services, data writes, seeds, tests and setup documentation against the committed backlog. It does not award story acceptance or merge unfinished work from other branches.

| Scope | Stories / boundary | Current application position |
| --- | --- | --- |
| Sprint 1 | KAN-25, KAN-31, KAN-4, KAN-34, KAN-6, KAN-33, KAN-36, KAN-16, KAN-27 and KAN-24 | Authentication, creation/drafts/submission, permitted review/decisions, status, clarification and database foundations remain. Carry-over defects and acceptance gaps keep their existing records. |
| Sprint 2 automatic assignment | KAN-29 | Available-only allocation, lowest active workload, UUID tie break, transactional submission/history and recoverable errors remain. |
| Sprint 2 venue work | KAN-50, KAN-51, KAN-12, KAN-52, KAN-53, KAN-8, KAN-54, KAN-55 | In scope. After this audit, KAN-51 availability and KAN-12 search were integrated from team branches, and KAN-8 staff decisions/coordinator outcomes were implemented. KAN-52 adds read-only assessment and KAN-55 block management is integrated. KAN-53 submission is integrated into this branch on 5 October with submission-time booking/block refusal, alongside the existing approval-time recheck. KAN-50 catalogue maintenance remains absent. These implementations do not establish the full KAN-54 acceptance result; current verification, hosted checks and policy acceptance remain separate. |
| Supporting initial assignment | Sprint 2 meeting refinement: a coordinator may assign an unassigned request to themselves or another coordinator | Retained for already-unassigned requests in Submitted, Under review, Clarification requested or Approved; it does not permit replacing an existing coordinator or bypass automatic selection on new submissions. |
| Later event transitions | KAN-61 confirmation, KAN-62 cancellation, KAN-10 completion | Confirmation/cancellation/completion services, API mutations and controls removed. Read-only status history retained for KAN-16. |
| Coordinator replacement | Future KAN-65 | Handover UI removed; the backend rejects replacement without changing the assignment or its history. |
| Notifications | Future KAN-64 | Notification writer and side effects removed from assignment/clarification. No inbox or delivery route. |
| Other future release workflows | Equipment requests/reservations, attendee registration/withdrawal, planning edits and significant change requests | No mounted application routes/pages. Draft registration settings remain part of the selected request/draft stories; they do not implement attendee registration. |

**Database boundary:** preserve stored migration history, records, historical tables and integrity constraints. The later 30 September [Firebase migration retirement](assumptions-and-questions.md#30-september-2026---firebase-migration-retirement) removes its obsolete active setup file and renumbers the remaining files to 001-006; existing database objects/history remain unchanged, the SQL retains its original bytes, and the runner recognises the former filenames. No migration is rewritten, no trigger is disabled, and no table or shared Supabase data is deleted. Equipment/registration guards in migrations 004/005 (formerly 005/006) and their tests remain database compatibility checks. Later event statuses remain readable and contribute to the documented KAN-29 workload rules where applicable; this does not expose later state-changing actions. Seeding no longer creates new equipment examples. Future backlog criteria and dated test/meeting evidence are retained as planning/history, with current implementation references updated.

Regression checks verify that deferred API endpoints return `404 NOT_FOUND`, existing coordinator assignments cannot be replaced, and notification rows are not generated by retained workflows. Frontend checks keep status history readable without later lifecycle or handover controls. Browser fixtures no longer silently answer future-domain API calls. Actual validation is recorded in [test evidence](../testing/test-evidence.md#30-september-sprint-scope-correction).

The current branch now includes the KAN-33/KAN-56 decided-request navigation from `origin/main`, plus KAN-51's read-only calendar, KAN-12 search, KAN-8 decisions for existing pending bookings, KAN-55 block management and the KAN-52 suitability implementation. The calendar enforces Event Coordinator, Venue Staff and Technical Support Staff access; its remaining implementation choices are in the [3 October record](assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar). Venue Staff and Technical Support Staff need Supabase Auth accounts linked through `app_users.supabase_user_id`. No later event lifecycle writes or notification features are restored by this integration. The Sprint 1 closure record and Sprint 2 baseline of **43 points: 35 new + 8 carry-over** are unchanged.

Hosted approval and rejection checks passed on 15–16 September. On 17 September, Tristan verified that the organiser could retain the approved outcome after refresh and open a rejected request from Event requests with its status and reason retained after refresh (MAN-20260917-01). Reopening a request URL after sign-out showed a sign-in prompt without request details or the review reason (MAN-20260917-02). Draft and Submitted detail statuses and their no-decision messages passed in MAN-20260917-03. A second organiser was denied the first organiser's request details and saw an empty request list (MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). These dated observations retain their original scope in [test evidence](../testing/test-evidence.md); the Sprint 1 closure and carry-over above supersede the earlier pending-acceptance position.

## First-release coverage

`CF-01`–`CF-20` are repository traceability identifiers, not customer or Jira identifiers. Jira references below include the selected Sprint 1 and Sprint 2 stories. A linked story does not establish completion of the full release feature.

| ID    | Core feature                          | Jira links                  | Intended module              |
| ----- | ------------------------------------- | --------------------------- | ---------------------------- |
| CF-01 | User Authorisation and Authentication | KAN-25, KAN-79, KAN-84 | Identity and access |
| CF-02 | Event Request Creation | KAN-31, KAN-6, KAN-79 | Events |
| CF-03 | Draft Event Requests | KAN-4, KAN-34 | Events |
| CF-04 | Event Review and Approval | KAN-33, KAN-27, KAN-36; KAN-60 (correction), KAN-79 | Events |
| CF-05 | Coordinator Assignment | KAN-29 (original); KAN-79 (Lead replacement); KAN-65 (reassignment) | Events |
| CF-06 | Event Status Management | KAN-16; KAN-61, KAN-62, KAN-10 (lifecycle), KAN-84 | Events |
| CF-07 | Event Information Management | KAN-34 (draft); KAN-66 (planning); KAN-15 (significant changes) | Events |
| CF-08 | Venue Catalogue | KAN-50; KAN-77 | Venues |
| CF-09 | Venue Availability Calendar | KAN-51; KAN-55 (operational blocks), KAN-78, KAN-81, KAN-83 | Venues |
| CF-10 | Venue Search and Filtering | KAN-12, KAN-78 | Venues |
| CF-11 | Venue Suitability Checking | KAN-52, KAN-78, KAN-84 | Venues |
| CF-12 | Venue Booking Request | KAN-53, KAN-78, KAN-81, KAN-82, KAN-83 | Venues |
| CF-13 | Venue Booking Approval | KAN-8, KAN-78, KAN-81, KAN-82, KAN-83 | Venues |
| CF-14 | Booking Conflict Detection | KAN-54; KAN-55 (block conflict support), KAN-78, KAN-81, KAN-82, KAN-83 | Venues |
| CF-15 | Equipment Request Management | KAN-63, KAN-84 | Equipment |
| CF-16 | Equipment Availability Checking | KAN-9; KAN-18 | Equipment |
| CF-17 | Equipment Reservation | KAN-26, KAN-84 | Equipment |
| CF-18 | Attendee Registration | KAN-14; KAN-17; KAN-67 | Registrations |
| CF-19 | Event Change Requests | KAN-15; KAN-62, KAN-82, KAN-84 | Events with affected modules |
| CF-20 | Notification System | KAN-64, KAN-80, KAN-81, KAN-82, KAN-83, KAN-84 | Notifications |

KAN-78 applies CR-1's buffered occupancy consistently across CF-09–CF-14. New mappings are selected scope, not evidence of delivery.

KAN-24 is a separate 5-point database setup item in Sprint 1, supporting the customer-facing stories within the 32-point commitment. The ERD is supporting system design documentation maintained in the [architecture record](../architecture/README.md).

## Connected workflows

The planned release flow is draft → submission → Coordinator Lead assignment → review/clarification → approval → venue and equipment arrangements → event confirmation. Venue planning includes setup/turnaround buffers, temporary holds with expiry, recovery from operational unavailability, and independent actions for each venue arrangement. Eligible attendees can register or withdraw after confirmation.

Before preparation starts, a current Safety Officer approval and valid planning arrangements are required in addition to event confirmation. Safety review is a separate gate; confirmation alone does not permit preparation. Significant changes can require renewed venue/technical checks and invalidate a previous safety approval. Notifications follow the relevant event, recipient and current authorization. These are planned target workflows, not a claim that the new roles, gates or integrations already exist. The current story criteria and [change register](change-requests.md) define the detailed boundaries.

Authorization depends on the user's role **and relationship to the event**. The original five roles are Event Organiser, Event Coordinator, Venue Staff, Technical Support Staff and Attendee. The revised Release 1 plan adds Event Coordinator Lead (KAN-79) and Safety Officer (KAN-84), for seven target roles; those additions remain planned until implemented and verified. Tests must include unrelated organisers and attendees attempting to access internal information.

The system should provide responsive usability, consistent related records, auditability, maintainability, reasonable operation times and capacity for growth. Quantitative performance targets remain to be agreed.

## Scope and decisions

Keep enhancements beyond the first release in the product backlog and select them through sprint planning. Examples include programme management, attachments, recurring events, waitlists, technical staff scheduling, and reporting. Some supporting data or rules may still be necessary for a coherent core workflow.

Record unresolved rules in [assumptions and questions](assumptions-and-questions.md). Use the team's section-specific customer clarifications to settle customer policy. Preserve the original source, the clarification date, and the resulting story or acceptance-criterion change. Illustrative status lists and implementation defaults remain proposals until clarified.

Use [traceability.csv](traceability.csv) to connect release features to stories, acceptance criteria, implementation and tests. Keep implementation coverage distinct from executed acceptance-test evidence and from formal story acceptance.


## Course and project conventions

Project scope and assessment follow **Week 4 Project Instructions.docx** and its rubric, the original customer briefing and the required **Week 7 Customer Changes.pdf**. The course lectures and labs guide the working formats; they do not replace the project requirements. All 20 core features and all six required changes are mapped above and in the [change register](change-requests.md). Implementation and acceptance still require their own evidence.

| Source | Convention used here | Repository record |
| --- | --- | --- |
| Week 2 User Stories, PDF p.23 (printed slide 25); Week 2 Product Backlog in Jira lab, p.3 | Short title; As a role, I want a goal, so that a benefit; Acceptance Criteria. Priority and estimates use native Jira fields. | [Master backlog](product-backlog.md) and sprint cards |
| Week 2 User Stories, PDF p.28 | Checklist criteria, Given/When/Then, or a mixture are acceptable; criteria must state observable outcomes. | Stable criterion IDs in sprint cards and [traceability](traceability.csv) |
| Week 3 Estimation/Scrum Events, pp.44–46 and 57; Sprint Backlogs in Jira lab, pp.1–4 | The team owns estimates and reviews capacity; members voluntarily pick work and add implementation/testing/review subtasks. Equal point targets are guidance, not individual quotas. | [Sprint 3 estimation](../scrum/sprint-03/estimation-and-capacity.md) and [planning](../scrum/sprint-03/planning.md) |
| Week 7 Guide to Managing Changes, pp.1–3 | Distinguish new requirements, clarifications and defects; track their effects on stories, criteria, estimates, design, tests and release scope. | [Change register](change-requests.md) and [release burndown](../scrum/release-burndown.md) |
| Week 4 Project Instructions, deliverables and assessment rubric | Submit the full completed/pending backlog, design, tests, all-sprint evidence, slide PDF, software and access information. Jira itself is not the submitted evidence. | [Seven-folder submission checklist](../submission/checklist.md), [backlog export](../submission/1/README.md) and [rubric-oriented slide record](../submission/5/README.md) |

Jira descriptions hold the user story and current acceptance criteria. Planning history, dated evidence and submission records live in the repository; they are not repeated as card commentary. Current point values remain the planning baseline until the team records its estimation/capacity review. Historical acceptance, votes and meeting outcomes are not supplied by formatting a card.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

The [master backlog](product-backlog.md) now indexes KAN-24 infrastructure, KAN-51 calendar fixes, KAN-34/KAN-78 and Arvin’s supporting work. Core-feature ownership and customer requirements are unchanged; removed PR #10 workflows are not counted as implemented feature scope.
