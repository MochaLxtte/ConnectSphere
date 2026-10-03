# Requirements and scope

The first release covers the 20 core features below. This directory records the release scope, workflow requirements and team decisions.

The [product backlog](product-backlog.md) is the consolidated index of retained stories, future acceptance criteria, dependencies and archived scope. It links the Sprint 1 and Sprint 2 records without changing their commitments or acceptance history. The 21 September refinement added KAN-65 reassignment, KAN-66 planning-information editing and KAN-67 registration viewing; these remain unestimated future work. KAN-21 was archived as a duplicate of KAN-55, and optional waitlist/human-staffing stories KAN-19, KAN-22 and KAN-23 were archived outside the core release.

The initial Jira workstreams were agreed at the planning meeting on 6 September 2026 and are recorded in the [Sprint 1 plan](../scrum/sprint-01/README.md). The stack is Vue 3 with TypeScript and Vite, Express with TypeScript, and PostgreSQL. Supabase hosts PostgreSQL and provides authentication. Express maps verified identities to application profiles and enforces roles, ownership and current coordinator assignment; see the [decision log](assumptions-and-questions.md).

Sprint 1 closed with **seven Done PBIs worth 24 points**: KAN-25, KAN-31, KAN-4, KAN-27, KAN-36, KAN-16 and the KAN-24 database item. KAN-6, KAN-33 and KAN-34 carry forward at their original **8 points**. The review recorded passes for DEMO-01, DEMO-03, DEMO-04, DEMO-05 and DEMO-07 through DEMO-11. DEMO-02 exposed the draft registration-toggle issue and DEMO-06 exposed navigation to approved requests for final confirmation. The validation defects qualify the DEMO-04/05 passes and keep KAN-6 open; see the [review defects and carry-over](../scrum/sprint-01/review.md#review-defects-and-carry-over).

**Sprint 2 runs from 20 September to 3 October 2026 with 12 PBIs and a 43-point baseline: nine new stories at 35 points plus the three carried stories at 8 points.** Scrum meetings are on Tuesday, Thursday and Saturday. The [Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md) retains 93 detailed planning criteria, KAN-29's assignment rule, implementation proposals and planned tests. The pre-edit export had 77 criteria across those nine stories. Live Jira now includes the six shorter cards' missing checks and the customer-rule refinements, recorded on 21 September. Existing criterion IDs remain stable for traceability. Sprint 1's current Jira descriptions and 79 functional criteria are now available for cross-reference with its historical cards. See the [backlog audit](assumptions-and-questions.md#21-september-2026--jira-backlog-audit) and [Sprint 2 refinement register](../scrum/sprint-02/planning.md#jira-refinements-to-record). The [applied Jira changes](assumptions-and-questions.md#21-september-2026--jira-updates-applied) record the corrective subtasks and future release stories. No new test results are established by this reconciliation.

The current implementation includes sign-in, coordinator review and clarification, organiser request creation and draft saving, draft editing/submission, and KAN-16's organiser list and detail pages. The organiser list uses `GET /api/events?scope=all` to include submitted and decided requests; the default list retains draft-only behaviour. The integrated code also contains manual coordinator assignment, and later lifecycle transitions with status history. Their automated results remain recorded against their original source commits in the [test evidence](../testing/test-evidence.md). The venue, equipment, registration, notification and change-request workflows were removed on 26 September 2026 so the team builds those stories itself; migration 005 keeps their tables and integrity guards, and Sprint 2 commits the venue stories as build work rather than verification of existing code. KAN-51's read-only venue availability calendar was built on 3 October; see the [decision log](assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar). Sprint 1 story acceptance covers the agreed story slices, not all 20 release features or the new Sprint 2 policies.

Sprint 2 must implement automatic assignment by filtering available coordinators, selecting the one with the fewest active events and breaking ties by consistent ID/order. Availability may be preconfigured; its management UI is outside this story. It must also align calendar access with the three roles explicitly named in KAN-51: Event Coordinator, Venue Staff and Technical Support Staff. Current assignment is manual. The KAN-51 calendar API built on 3 October admits only those three roles; the earlier API that admitted other authenticated roles was removed on 26 September. The carried work covers the existing-draft registration controls, a route from the coordinator list to approved requests, and submission validation. These code observations guide the work; they are not new acceptance-test results. The [customer-rule reconciliation](assumptions-and-questions.md#21-september-2026--customer-rules-reconciled-with-the-backlog) also records mandatory event-rejection reasons, minimum submission fields and blocking venue-booking submission for already reserved periods. Venue Staff, Technical Support Staff and Attendee accounts require Supabase Auth profiles linked through `app_users.supabase_user_id`; `database/seed.ts` supplies fictional venues and equipment types.

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
