# Requirements and scope

The first release covers the 20 core features below. This directory records the release scope, workflow requirements and team decisions.

The [product backlog](product-backlog.md) is the consolidated index of retained stories, future acceptance criteria, dependencies and archived scope. It links the Sprint 1 and Sprint 2 records without changing their commitments or acceptance history. The 21 September refinement added KAN-65 reassignment, KAN-66 planning-information editing and KAN-67 registration viewing; these remain unestimated future work. KAN-21 was archived as a duplicate of KAN-55, and optional waitlist/human-staffing stories KAN-19, KAN-22 and KAN-23 were archived outside the core release.

The initial Jira workstreams were agreed at the planning meeting on 6 September 2026 and are recorded in the [Sprint 1 plan](../scrum/sprint-01/README.md). The stack is Vue 3 with TypeScript and Vite, Express with TypeScript, and PostgreSQL. Supabase hosts PostgreSQL and provides authentication. Express maps verified identities to application profiles and enforces roles, ownership and current coordinator assignment; see the [decision log](assumptions-and-questions.md).

Sprint 1 closed with **seven Done PBIs worth 24 points**: KAN-25, KAN-31, KAN-4, KAN-27, KAN-36, KAN-16 and the KAN-24 database item. KAN-6, KAN-33 and KAN-34 carry forward at their original **8 points**. The review recorded passes for DEMO-01, DEMO-03, DEMO-04, DEMO-05 and DEMO-07 through DEMO-11. DEMO-02 exposed the draft registration-toggle issue and DEMO-06 exposed navigation to approved requests for final confirmation. The validation defects qualify the DEMO-04/05 passes and keep KAN-6 open; see the [review defects and carry-over](../scrum/sprint-01/review.md#review-defects-and-carry-over).

**Sprint 2 runs from 20 September to 3 October 2026 with 12 PBIs and a 43-point baseline: nine new stories at 35 points plus the three carried stories at 8 points.** Scrum meetings are on Tuesday, Thursday and Saturday. The [Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md) retains 93 detailed planning criteria, KAN-29's assignment rule, implementation proposals and planned tests. The pre-edit export had 77 criteria across those nine stories. Live Jira now includes the six shorter cards' missing checks and the customer-rule refinements, recorded on 21 September. Existing criterion IDs remain stable for traceability. Sprint 1's current Jira descriptions and 79 functional criteria are now available for cross-reference with its historical cards. See the [backlog audit](assumptions-and-questions.md#21-september-2026--jira-backlog-audit) and [Sprint 2 refinement register](../scrum/sprint-02/planning.md#jira-refinements-to-record). The [applied Jira changes](assumptions-and-questions.md#21-september-2026--jira-updates-applied) record the corrective subtasks and future release stories. No new test results are established by this reconciliation.

## 30 September sprint scope audit

The current working branch implements only the application features selected for Sprint 1 and Sprint 2, including their supporting access control, validation and audit reads. This audit compares the mounted Express routes, reachable Vue pages/actions, services, data writes, seeds, tests and setup documentation against the committed backlog. It does not award story acceptance or merge unfinished work from other branches.

| Scope | Stories / boundary | Current application position |
| --- | --- | --- |
| Sprint 1 | KAN-25, KAN-31, KAN-4, KAN-34, KAN-6, KAN-33, KAN-36, KAN-16, KAN-27 and KAN-24 | Authentication, creation/drafts/submission, permitted review/decisions, status, clarification and database foundations remain. Carry-over defects and acceptance gaps keep their existing records. |
| Sprint 2 automatic assignment | KAN-29 | Available-only allocation, lowest active workload, UUID tie break, transactional submission/history and recoverable errors remain. |
| Sprint 2 venue work | KAN-50, KAN-51, KAN-12, KAN-52, KAN-53, KAN-8, KAN-54, KAN-55 | In scope. After this audit, KAN-51 availability and KAN-12 search were integrated from the team branches; the other venue services/UI remain to implement. Retained schema/guards support them. |
| Supporting initial assignment | Sprint 2 meeting refinement: a coordinator may assign an unassigned request to themselves or another coordinator | Retained for already-unassigned requests in Submitted, Under review, Clarification requested or Approved; it does not permit replacing an existing coordinator or bypass automatic selection on new submissions. |
| Later event transitions | KAN-61 confirmation, KAN-62 cancellation, KAN-10 completion | Confirmation/cancellation/completion services, API mutations and controls removed. Read-only status history retained for KAN-16. |
| Coordinator replacement | Future KAN-65 | Handover UI removed; the backend rejects replacement without changing the assignment or its history. |
| Notifications | Future KAN-64 | Notification writer and side effects removed from assignment/clarification. No inbox or delivery route. |
| Other future release workflows | Equipment requests/reservations, attendee registration/withdrawal, planning edits and significant change requests | No mounted application routes/pages. Draft registration settings remain part of the selected request/draft stories; they do not implement attendee registration. |

**Database boundary:** preserve stored migration history, records, historical tables and integrity constraints. The later 30 September [Firebase migration retirement](assumptions-and-questions.md#30-september-2026---firebase-migration-retirement) removes its obsolete active setup file and renumbers the remaining files to 001-006; existing database objects/history remain unchanged, the SQL retains its original bytes, and the runner recognises the former filenames. No migration is rewritten, no trigger is disabled, and no table or shared Supabase data is deleted. Equipment/registration guards in migrations 004/005 (formerly 005/006) and their tests remain database compatibility checks. Later event statuses remain readable and contribute to the documented KAN-29 workload rules where applicable; this does not expose later state-changing actions. Seeding no longer creates new equipment examples. Future backlog criteria and dated test/meeting evidence are retained as planning/history, with current implementation references updated.

Regression checks verify that deferred API endpoints return `404 NOT_FOUND`, existing coordinator assignments cannot be replaced, and notification rows are not generated by retained workflows. Frontend checks keep status history readable without later lifecycle or handover controls. Browser fixtures no longer silently answer future-domain API calls. Actual validation is recorded in [test evidence](../testing/test-evidence.md#30-september-sprint-scope-correction).

The current branch now includes the KAN-33/KAN-56 decided-request navigation from `origin/main`, plus KAN-51's read-only calendar and KAN-12 search. The calendar enforces Event Coordinator, Venue Staff and Technical Support Staff access; its remaining implementation choices are in the [3 October record](assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar). Venue Staff and Technical Support Staff need Supabase Auth accounts linked through `app_users.supabase_user_id`. No later event lifecycle writes or notification features are restored by this integration. The Sprint 1 closure record and Sprint 2 baseline of **43 points: 35 new + 8 carry-over** are unchanged.

Hosted approval and rejection checks passed on 15–16 September. On 17 September, Tristan verified that the organiser could retain the approved outcome after refresh and open a rejected request from Event requests with its status and reason retained after refresh (MAN-20260917-01). Reopening a request URL after sign-out showed a sign-in prompt without request details or the review reason (MAN-20260917-02). Draft and Submitted detail statuses and their no-decision messages passed in MAN-20260917-03. A second organiser was denied the first organiser's request details and saw an empty request list (MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). These dated observations retain their original scope in [test evidence](../testing/test-evidence.md); the Sprint 1 closure and carry-over above supersede the earlier pending-acceptance position.

## First-release coverage

`CF-01`–`CF-20` are repository traceability identifiers, not customer or Jira identifiers. Jira references below include the selected Sprint 1 and Sprint 2 stories. A linked story does not establish completion of the full release feature.

| ID    | Core feature                          | Jira links                  | Intended module              |
| ----- | ------------------------------------- | --------------------------- | ---------------------------- |
| CF-01 | User Authorisation and Authentication | KAN-25                      | Identity and access          |
| CF-02 | Event Request Creation                | KAN-31, KAN-6               | Events                       |
| CF-03 | Draft Event Requests                  | KAN-4, KAN-34               | Events                       |
| CF-04 | Event Review and Approval             | KAN-33, KAN-27, KAN-36; KAN-60 (correction) | Events                       |
| CF-05 | Coordinator Assignment                | KAN-29 (initial); KAN-65 (reassignment) | Events                       |
| CF-06 | Event Status Management               | KAN-16; KAN-61, KAN-62, KAN-10 (lifecycle) | Events                       |
| CF-07 | Event Information Management          | KAN-34 (draft); KAN-66 (planning); KAN-15 (significant changes) | Events                       |
| CF-08 | Venue Catalogue                       | KAN-50                     | Venues                       |
| CF-09 | Venue Availability Calendar           | KAN-51; KAN-55 (operational blocks) | Venues                |
| CF-10 | Venue Search and Filtering            | KAN-12                     | Venues                       |
| CF-11 | Venue Suitability Checking            | KAN-52                     | Venues                       |
| CF-12 | Venue Booking Request                 | KAN-53                     | Venues                       |
| CF-13 | Venue Booking Approval                | KAN-8                      | Venues                       |
| CF-14 | Booking Conflict Detection            | KAN-54; KAN-55 (block conflict support) | Venues             |
| CF-15 | Equipment Request Management          | KAN-63                | Equipment                    |
| CF-16 | Equipment Availability Checking       | KAN-9; KAN-18                | Equipment                    |
| CF-17 | Equipment Reservation                 | KAN-26                | Equipment                    |
| CF-18 | Attendee Registration                 | KAN-14; KAN-17; KAN-67        | Registrations                |
| CF-19 | Event Change Requests                 | KAN-15; KAN-62                | Events with affected modules |
| CF-20 | Notification System                   | KAN-64                | Notifications                |

KAN-24 is a separate 5-point database setup item in Sprint 1, supporting the customer-facing stories within the 32-point commitment. The ERD is supporting system design documentation maintained in the [architecture record](../architecture/README.md).

## Connected workflows

The release should support a request moving from draft through submission, coordinator assignment, review and clarification, approval, venue booking, equipment arrangements, and confirmation. Eligible attendees can then register or withdraw. Important changes can affect existing bookings, equipment reservations, registrations, and notifications. Treat this as workflow context: exact transitions and eligibility rules require the team's customer clarifications.

Authorization depends on the user's role **and relationship to the event**. The five roles are Event Organiser, Event Coordinator, Venue Staff, Technical Support Staff, and Attendee. Tests must include unrelated organisers and attendees attempting to access internal information.

The system should provide responsive usability, consistent related records, auditability, maintainability, reasonable operation times and capacity for growth. Quantitative performance targets remain to be agreed.

## Scope and decisions

Keep enhancements beyond the first release in the product backlog and select them through sprint planning. Examples include programme management, attachments, recurring events, waitlists, technical staff scheduling, and reporting. Some supporting data or rules may still be necessary for a coherent core workflow.

Record unresolved rules in [assumptions and questions](assumptions-and-questions.md). Use the team's section-specific customer clarifications to settle customer policy. Preserve the original source, the clarification date, and the resulting story or acceptance-criterion change. Illustrative status lists and implementation defaults remain proposals until clarified.

Use [traceability.csv](traceability.csv) to connect release features to stories, acceptance criteria, implementation and tests. Keep implementation coverage distinct from executed acceptance-test evidence and from formal story acceptance.
