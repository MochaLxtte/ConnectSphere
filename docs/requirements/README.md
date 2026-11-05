# Requirements and scope

This is the reading guide for Release 1 requirements. Read the scope below, then the [master backlog](product-backlog.md), [customer changes](change-requests.md) and the relevant sprint's story cards. The [workbook](../submission/1/product-backlog.xlsx) is the portable submission view.

## Team input needed

Use [WS1 in the shared checklist](../submission/checklist.md#ws1-backlog-and-customer-changes) for the remaining decisions and evidence. Choose the owner/reviewer in the [team workstream table](../README.md#ws1-backlog-and-customer-changes). Edit the master register and source story cards before refreshing the workbook; do not maintain independent versions of the same criteria.

## Release scope

- The Week 4 project instructions identify **20 core features**. The six Week 7 customer changes were received on **2 October 2026** and are required in Release 1.
- The retained parent backlog contains **42 items / 174 SP**: 127 original-scope points and 47 additional customer-change points. Subtasks and archived optional/duplicate items do not add points.
- Sprint 1–3 review outcomes are reported in the [Scrum records](../scrum/README.md). Sprint 4 formal acceptance and the final release decision remain **Not assessed**. Implementation and test evidence are linked from the [testing report](../testing/README.md); a story mapping alone is not acceptance.
- The code-editing cutoff is **1 November 2026, 23:59 SGT**. Current work prepares documentation for the **6 November 2026, 23:59 SGT** submission.

## First-release coverage

`CF-01`–`CF-20` are stable repository traceability identifiers. Each row links the customer feature to its original and changed story scope. Numbered acceptance criteria live in the relevant sprint cards and [traceability register](traceability.csv).

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
| CF-11 | Venue Suitability Checking | KAN-52, KAN-78, KAN-82 (saved arrangement advisory), KAN-84 | Venues |
| CF-12 | Venue Booking Request | KAN-53, KAN-78, KAN-81, KAN-82, KAN-83 | Venues |
| CF-13 | Venue Booking Approval | KAN-8, KAN-78, KAN-81, KAN-82, KAN-83 | Venues |
| CF-14 | Booking Conflict Detection | KAN-54; KAN-55 (block conflict support), KAN-78, KAN-81, KAN-82, KAN-83 | Venues |
| CF-15 | Equipment Request Management | KAN-63, KAN-84 | Equipment |
| CF-16 | Equipment Availability Checking | KAN-9; KAN-18 | Equipment |
| CF-17 | Equipment Reservation | KAN-26, KAN-84 | Equipment |
| CF-18 | Attendee Registration | KAN-14; KAN-17; KAN-67 | Registrations |
| CF-19 | Event Change Requests | KAN-15; KAN-62, KAN-82, KAN-84 | Events with affected modules |
| CF-20 | Notification System | KAN-64, KAN-80, KAN-81, KAN-82, KAN-83, KAN-84 | Notifications |

## Connected workflows

The release workflow joins organiser submission, Lead assignment, coordinator review, venue and equipment arrangements, safety review/preparation, confirmation, registration and terminal event actions. Important changes can affect existing arrangements and require renewed checks. Follow the [full manual E2E walkthrough](../testing/release-e2e-walkthrough.md) and its separate execution evidence.

Original KAN-29 automatic allocation is retained as Sprint 2 history. CR-5 introduces the Lead queue for the later workflow. Original venue checks without setup/turnaround buffers are likewise distinguished from CR-1's buffered occupancy. The [change register](change-requests.md) identifies all six changes and their affected criteria.

## Course and project conventions

Project scope comes from the Week 1 Customer Briefing, Week 4 Project Instructions and rubric, the section's customer clarifications, and Week 7 Customer Changes. Teaching materials determine the story, testing and Scrum conventions. Source files are held in the team's IS212 course folder; file names and relevant page locators are retained below.

| Source | Convention used here | Repository record |
| --- | --- | --- |
| Week 2 User Stories, PDF p.23 (printed slide 25); Week 2 Product Backlog in Jira lab, p.3 | Short title; As a role, I want a goal, so that a benefit; Acceptance Criteria. Priority and estimates use native Jira fields. | [Master backlog](product-backlog.md) and sprint cards |
| Week 2 User Stories, PDF p.28 | Checklist criteria, Given/When/Then, or a mixture are acceptable; criteria must state observable outcomes. | Stable criterion IDs in sprint cards and [traceability](traceability.csv) |
| Week 3 Estimation/Scrum Events, pp.44–46 and 57; Sprint Backlogs in Jira lab, pp.1–4 | The team owns estimates and reviews capacity; members voluntarily pick work and add implementation/testing/review subtasks. Equal point targets are guidance, not individual quotas. | [Sprint 3 estimation](../scrum/sprint-03/estimation-and-capacity.md) and [planning](../scrum/sprint-03/planning.md) |
| Week 7 Guide to Managing Changes, pp.1–3 | Distinguish new requirements, clarifications and defects; track their effects on stories, criteria, estimates, design, tests and release scope. | [Change register](change-requests.md) and [release burndown](../scrum/release-burndown.md) |
| Week 4 Project Instructions, deliverables and assessment rubric | Submit the full completed/pending backlog, design, tests, all-sprint evidence, slide PDF, software and access information. Jira itself is not the submitted evidence. | [Seven-folder submission checklist](../submission/checklist.md), [backlog export](../submission/1/README.md) and [rubric-oriented slide record](../submission/5/README.md) |

## Editing and evidence

Preserve story and criterion IDs. Show earlier criteria as historical when a later customer rule replaces them. Use the [decision register](assumptions-and-questions.md) for the dated source and rationale. Keep reported review acceptance, administrative Jira status, implementation evidence and actual test execution distinct. Historical exports retain their original dates.

## Historical records

[Preserved document before cleanup](archive/2026-11-05/README.md). These dated records remain supporting evidence.

<details>
<summary>Links retained for earlier references</summary>

<a id="current-planning-baseline--16-october-2026"></a>
[Current planning baseline — 16 October 2026](archive/2026-11-05/README.md#current-planning-baseline--16-october-2026)

<a id="historical-baseline--15-october-2026"></a>
[Historical baseline — 15 October 2026](archive/2026-11-05/README.md#historical-baseline--15-october-2026)

<a id="original-scope-and-dated-implementation-history"></a>
[Original scope and dated implementation history](archive/2026-11-05/README.md#original-scope-and-dated-implementation-history)

<a id="30-september-sprint-scope-audit"></a>
[30 September sprint scope audit](archive/2026-11-05/README.md#30-september-sprint-scope-audit)

<a id="scope-and-decisions"></a>
[Scope and decisions](archive/2026-11-05/README.md#scope-and-decisions)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>
[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/README.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

</details>
