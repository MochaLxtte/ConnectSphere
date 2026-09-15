# Requirements and scope

The first release covers the 20 core features below. This directory records the release scope, workflow requirements and team decisions.

The initial Jira workstreams were agreed at the planning meeting on 6 September 2026 and are recorded in the [Sprint 1 plan](../scrum/sprint-01/README.md). The stack is Vue 3 with TypeScript and Vite, Express with TypeScript, and PostgreSQL. Supabase hosts PostgreSQL and provides authentication. Express maps verified identities to application profiles and enforces roles, ownership and current coordinator assignment; see the [decision log](assumptions-and-questions.md).

The current implementation includes sign-in, coordinator review/decision pages, shared detail/status reads, and backend draft editing/submission. Draft creation and clarification APIs and organiser pages remain incomplete. KAN-16 needs an organiser-facing status/outcome interface and a list API that includes submitted and decided requests; the current organiser list returns drafts only. Venue, equipment, registration and notification features remain for later work. A module, table or passing automated check does not by itself establish story acceptance.

On 15 September, a manual approval through the webpage changed a synthetic request in Supabase from `SUBMITTED` to `APPROVED`. Rejection and the full organiser/coordinator acceptance workflow still require hosted checks. Detailed coverage and outstanding checks are maintained in [test evidence](../testing/test-evidence.md).

## First-release coverage

`CF-01`–`CF-20` are repository traceability identifiers, not customer or Jira identifiers. Jira references below cover only the initial stories discussed so far; they do not imply that the full feature fits into Sprint 1.

| ID    | Core feature                          | Initial Jira links          | Intended module              |
| ----- | ------------------------------------- | --------------------------- | ---------------------------- |
| CF-01 | User Authorisation and Authentication | KAN-25                      | Identity and access          |
| CF-02 | Event Request Creation                | KAN-31, KAN-6               | Events                       |
| CF-03 | Draft Event Requests                  | KAN-4, KAN-34               | Events                       |
| CF-04 | Event Review and Approval             | KAN-33, KAN-27, KAN-36      | Events                       |
| CF-05 | Coordinator Assignment                | KAN-29 (outside Sprint 1)   | Events                       |
| CF-06 | Event Status Management               | KAN-16                      | Events                       |
| CF-07 | Event Information Management          | KAN-34 (draft editing only) | Events                       |
| CF-08 | Venue Catalogue                       | To be linked                | Venues                       |
| CF-09 | Venue Availability Calendar           | To be linked                | Venues                       |
| CF-10 | Venue Search and Filtering            | To be linked                | Venues                       |
| CF-11 | Venue Suitability Checking            | To be linked                | Venues                       |
| CF-12 | Venue Booking Request                 | To be linked                | Venues                       |
| CF-13 | Venue Booking Approval                | To be linked                | Venues                       |
| CF-14 | Booking Conflict Detection            | To be linked                | Venues                       |
| CF-15 | Equipment Request Management          | To be linked                | Equipment                    |
| CF-16 | Equipment Availability Checking       | To be linked                | Equipment                    |
| CF-17 | Equipment Reservation                 | To be linked                | Equipment                    |
| CF-18 | Attendee Registration                 | To be linked                | Registrations                |
| CF-19 | Event Change Requests                 | To be linked                | Events with affected modules |
| CF-20 | Notification System                   | To be linked                | Notifications                |

KAN-24 is a separate 5-point database setup item in Sprint 1, supporting the customer-facing stories within the 32-point commitment. The ERD is supporting system design documentation maintained in the [architecture record](../architecture/README.md).

## Connected workflows

The release should support a request moving from draft through submission, coordinator assignment, review and clarification, approval, venue booking, equipment arrangements, and confirmation. Eligible attendees can then register or withdraw. Important changes can affect existing bookings, equipment reservations, registrations, and notifications. Treat this as workflow context: exact transitions and eligibility rules require the team's customer clarifications.

Authorization depends on the user's role **and relationship to the event**. The five roles are Event Organiser, Event Coordinator, Venue Staff, Technical Support Staff, and Attendee. Tests must include unrelated organisers and attendees attempting to access internal information.

The system should provide responsive usability, consistent related records, auditability, maintainability, reasonable operation times and capacity for growth. Quantitative performance targets remain to be agreed.

## Scope and decisions

Keep enhancements beyond the first release in the product backlog and select them through sprint planning. Examples include programme management, attachments, recurring events, waitlists, technical staff scheduling, and reporting. Some supporting data or rules may still be necessary for a coherent core workflow.

Record unresolved rules in [assumptions and questions](assumptions-and-questions.md). Use the team's section-specific customer clarifications to settle customer policy. Preserve the original source, the clarification date, and the resulting story or acceptance-criterion change. Illustrative status lists and implementation defaults remain proposals until clarified.

Use [traceability.csv](traceability.csv) to connect release features to stories, acceptance criteria, implementation and tests. Keep implementation coverage distinct from executed acceptance-test evidence and from formal story acceptance.
