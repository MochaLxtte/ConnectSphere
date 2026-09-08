# Requirements and scope

The first release covers the 20 core features below. This directory records the release scope, workflow requirements and team decisions.

The initial Jira workstreams were agreed at the planning meeting on 6 September 2026 and are recorded in the [Sprint 1 plan](../scrum/sprint-01/README.md). The stack is Vue 3 with TypeScript and Vite, Express with TypeScript, and PostgreSQL. On 8 September 2026, the team selected Supabase to host PostgreSQL; see the [dated database decision](assumptions-and-questions.md#8-september-2026--hosted-postgresql). The authentication approach remains to be agreed under KAN-25.

This repository starts with infrastructure and health checks. **None of the business features below is implemented by the scaffold.** A module folder, route placeholder, database table, or passing health check is not evidence that a story is complete.

## First-release coverage

`CF-01`–`CF-20` are repository traceability identifiers, not customer or Jira identifiers. Jira references below cover only the initial stories discussed so far; they do not imply that the full feature fits into Sprint 1.

| ID    | Core feature                          | Initial Jira links          | Intended module              |
| ----- | ------------------------------------- | --------------------------- | ---------------------------- |
| CF-01 | User Authorisation and Authentication | KAN-25                      | Identity and access          |
| CF-02 | Event Request Creation                | KAN-31, KAN-6               | Events                       |
| CF-03 | Draft Event Requests                  | KAN-4, KAN-34               | Events                       |
| CF-04 | Event Review and Approval             | KAN-33, KAN-27, KAN-36      | Events                       |
| CF-05 | Coordinator Assignment                | To be linked                | Events                       |
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

KAN-24 is a separate 5-point database setup item in Sprint 1. KAN-30 is an optional ERD task outside the 32-point commitment; neither is an additional customer feature.

## Connected workflows

The release should support a request moving from draft through submission, coordinator assignment, review and clarification, approval, venue booking, equipment arrangements, and confirmation. Eligible attendees can then register or withdraw. Important changes can affect existing bookings, equipment reservations, registrations, and notifications. Treat this as workflow context: exact transitions and eligibility rules require the team's customer clarifications.

Authorization depends on the user's role **and relationship to the event**. The five roles are Event Organiser, Event Coordinator, Venue Staff, Technical Support Staff, and Attendee. Tests must include unrelated organisers and attendees attempting to access internal information.

The system should provide responsive usability, consistent related records, auditability, maintainability, reasonable operation times and capacity for growth. Quantitative performance targets remain to be agreed.

## Scope and decisions

Keep enhancements beyond the first release in the product backlog and select them through sprint planning. Examples include programme management, attachments, recurring events, waitlists, technical staff scheduling, and reporting. Some supporting data or rules may still be necessary for a coherent core workflow.

Record unresolved rules in [assumptions and questions](assumptions-and-questions.md). Use the team's section-specific customer clarifications to settle customer policy. Preserve the original source, the clarification date, and the resulting story or acceptance-criterion change. Illustrative status lists and implementation defaults remain proposals until clarified.

Use [traceability.csv](traceability.csv) to connect release features to stories, acceptance criteria, implementation, and tests. The initial rows are planning records, not completed test evidence.
