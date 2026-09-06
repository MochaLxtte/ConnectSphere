# Requirements and scope

The first release must cover the 20 core features in **Week 4 Project Instructions.docx**. **Week 1 Customer Briefing.docx** describes a broader product and supplies workflow context. The source documents remain outside this repository; this directory records a summary and working decisions, not replacement customer instructions.

The [shared sprint-planning conversation](https://chatgpt.com/share/6a9da8d8-0dcc-83ec-925e-d798f4974edb) supplies the initial Jira workstreams. Its latest mapping is recorded in [Sprint 1 preparation](../scrum/sprint-01/README.md). The user selected Vue 3 with TypeScript and Vite, Express with TypeScript, and PostgreSQL. The course brief does not mandate this stack; further architecture choices are implementation decisions.

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

KAN-24 supports the database and integration work across features. KAN-30 is an optional ERD task in the planning conversation; neither is an additional customer feature.

## Connected workflows

The release should support a request moving from draft through submission, coordinator assignment, review and clarification, approval, venue booking, equipment arrangements, and confirmation. Eligible attendees can then register or withdraw. Important changes can affect existing bookings, equipment reservations, registrations, and notifications. Treat this as workflow context: exact transitions and eligibility rules require the team's customer clarifications.

Authorization depends on the user's role **and relationship to the event**. The five roles are Event Organiser, Event Coordinator, Venue Staff, Technical Support Staff, and Attendee. Tests must include unrelated organisers and attendees attempting to access internal information.

The Week 1 brief also asks for responsive usability, consistent related records, auditability, maintainability, reasonable operation times, and growth capacity. It supplies no quantitative performance target.

## Scope and decisions

Keep broader Week 1 ideas in the product backlog without automatically adding them to the first sprint. Examples include programme management, attachments, recurring events, waitlists, technical staff scheduling, and reporting. Some supporting data or rules may still be necessary for a coherent core workflow.

Record unresolved rules in [assumptions and questions](assumptions-and-questions.md). Only this team's section-specific customer clarifications can settle customer policy. Preserve the original source, the clarification date, and the resulting story or acceptance-criterion change. Do not treat an illustrative status list or generated implementation default as customer approval.

Use [traceability.csv](traceability.csv) to connect release features to stories, acceptance criteria, implementation, and tests. The initial rows are planning records, not completed test evidence.
