# Product backlog

The final release backlog contains **42 retained parent items, totalling 174 SP**. The four sprint reviews accepted all 42. The master table links every parent to its user goal, acceptance criteria and review decision. Four archived items are identified separately below. The [portable workbook](../submission/1/product-backlog.xlsx) opens on **Product backlog**. Each story ID leads to its numbered criteria and test case references in **Criterion index**. **Story specifications** preserves the captured card wording.

## How to read status and criteria

| Assessment question | Record |
| --- | --- |
| What did the customer need? | [Requirements guide](README.md), [customer decisions and assumptions](assumptions-and-questions.md), and [six change requests](change-requests.md) |
| What goal and checks define each story? | [Story cards](story-cards.md) give the role, goal, value, an example check and links to the full sprint cards. The workbook keeps historical source wording separate from the numbered criteria. |
| Who accepted the story, and when? | The recorded sprint review supplies the disposition. Published summaries cover the reported review dates, including later confirmations. |
| Which checks ran on a particular build? | [Case specifications](../testing/test-cases.csv) and the [execution register](../testing/test-executions.csv) identify expected and observed behaviour separately. [Release decision](../submission/release-record.md#release-decision) records the formal decision independently. |
| What was on the board at the time? | The [historical Jira fields](#historical-jira-fields) and [dated exports](../submission/1/README.md#workbook-reconciliation) preserve the status, owner and issue relationships observed at each snapshot. A sprint review supplies the acceptance decision. |

## From the customer brief to the sprint backlog

| Planning decision | Why the team made it | Where to inspect the decision |
| --- | --- | --- |
| **6 September · select the smallest complete request journey** | Irfan described sign-in, draft, submission, review and organiser feedback. The team kept automatic assignment outside Sprint 1. View Status supplied the 2-SP comparison. Nine business stories totalled 27 SP and the shared database work added 5 SP. The rough suggestion of 8 SP per member was a capacity discussion. | [Sprint 1 planning, cues 04–13 and 23–35](../scrum/sprint-01/evidence/meetings/planning.docx) · [estimates](../scrum/sprint-01/estimation-and-capacity.md) |
| **20 September · fix incomplete stories before expanding into venues** | Kai Jie separated the saved-draft and invalid-submission failures. The team retained the three unfinished stories at 8 SP. Tristan compared focused booking decisions with larger work. Ryan cited the filter combinations in search and timing/concurrency in conflicts to explain 5 SP. The 43-SP forecast exceeded the previous 24-SP delivery. | [Sprint 2 planning, cues 08–17 and 29–35](../scrum/sprint-02/evidence/meetings/current/planning.docx) · [review](../scrum/sprint-02/review.md#story-decisions) |
| **4 October · estimate the change and preserve original work** | Kai Jie separated the 2-SP venue settings from the 8-SP cross-workflow enforcement. Irfan kept hold expiry and decision races together in KAN-83. The team selected 13 Sprint 3 stories worth 63 SP, including the Lead queue and venue rules. It forecast 63 SP for Sprint 4, including independent venue arrangements and safety. KAN-15 increased from 2 to 5 SP for impact review. KAN-64 split into 5 + 3 SP with KAN-80. | [Sprint 3 planning, cues 14–25 and 40–53](../scrum/sprint-03/evidence/meetings/current/planning.docx) · [change decisions](change-requests.md) |
| **18 October · challenge the final forecast** | The three-sprint average was 37 SP and the team forecast 150 hours including reviews and tests. The initial KAN-84 estimates differed over the work required to invalidate stale safety approvals. After discussion, all six participants chose 8 SP. The team kept the 15-story / 63-SP selection, with a workload checkpoint for Irfan’s 13-SP bundle. | [Sprint 4 planning, cues 11–19, 35–44 and 49–54](../scrum/sprint-04/evidence/meetings/current/planning.docx) · [vote evidence at 10:00 and 10:59](../scrum/sprint-04/estimation-and-capacity.md) |

## Sprint commitments and acceptance

| Sprint | Committed SP | Reported accepted SP | Carry-out | Source and qualification |
| --- | ---: | ---: | ---: | --- |
| 1, 6–19 September | 32 | 24 | 8 to Sprint 2 | Seven accepted stories; collective review report confirmed 26 October; demonstrated build not retained. [Review](../scrum/sprint-01/review.md) |
| 2, 20 September–3 October | 43 = 35 new + 8 carried | 24 | 19 to Sprint 3 | Seven accepted stories; five original-scope carry-overs. New customer changes do not revoke earlier original-scope acceptance. [Review](../scrum/sprint-02/review.md) |
| 3, 4–17 October | 63 | 63 | 0 reported | Thirteen accepted stories according to the 26 October report; later failures/fixes retain their own dates and historical build limitations. [Review](../scrum/sprint-03/review.md) |
| 4, 18–31 October | 63 | 63 | 0 | The team accepted the 15 selected stories together at the 31 October review. [Review](../scrum/sprint-04/review.md) |

Carry-over is counted at full original points in the next sprint without increasing unique release scope. The 201 SP of sprint commitments include 27 SP selected again (8 + 19). The accepted parent sets are disjoint (7 + 7 + 13 + 15 = 42), so their 24 + 24 + 63 + 63 points total the same 174 SP as the unique inventory. The final original-scope estimate is 127 SP, including the KAN-15 revision, plus 47 SP for seven new change stories. [Release accounting](../scrum/release-burndown.md)

## Master backlog register

Story IDs open the course-format card and its full criteria. **Allocation** shows every sprint that selected the parent. **Completed** means accepted at the linked review. Priority is the retained board field. All review dates are in 2026.

| ID | Parent story | Requirement / area | Priority | SP | Allocation | Final disposition and review |
| --- | --- | --- | --- | ---: | --- | --- |
| [KAN-4](story-cards.md#kan-4) | Save Draft Event Request | CF-03 | High | 3 | S1 | [Completed · S1, 19 Sep](../scrum/sprint-01/review.md#story-decisions) |
| [KAN-6](story-cards.md#kan-6) | Submit an Event Request | CF-02 | High | 3 | S1 → S2 → S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-8](story-cards.md#kan-8) | Approve or Reject Venue Booking Request | CF-13 | High | 3 | S2 | [Completed · S2, 3 Oct](../scrum/sprint-02/review.md#story-decisions) |
| [KAN-9](story-cards.md#kan-9) | Check Equipment Availability for an Event | CF-16 | High | 8 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-10](story-cards.md#kan-10) | Mark Event as Completed | CF-06 | High | 3 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-12](story-cards.md#kan-12) | Search and Filter Venues | CF-10 | High | 5 | S2 → S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-14](story-cards.md#kan-14) | Register for an Event | CF-18 | High | 5 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-15](story-cards.md#kan-15) | Submit and Review Event Change Requests | CF-07, CF-19 | High | 5 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-16](story-cards.md#kan-16) | View Event Request Status | CF-06 | Medium | 2 | S1 | [Completed · S1, 19 Sep](../scrum/sprint-01/review.md#story-decisions) |
| [KAN-17](story-cards.md#kan-17) | Withdraw Attendee Registration | CF-18 | High | 2 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-18](story-cards.md#kan-18) | Update Equipment Availability Status | CF-16 | High | 3 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-24](story-cards.md#kan-24) | Setup Database | Infrastructure | Highest | 5 | S1 | [Completed · S1, 19 Sep](../scrum/sprint-01/review.md#story-decisions) |
| [KAN-25](story-cards.md#kan-25) | User Authorisation and Authentication | CF-01 | Highest | 5 | S1 | [Completed · S1, 19 Sep](../scrum/sprint-01/review.md#story-decisions) |
| [KAN-26](story-cards.md#kan-26) | Reserve Equipment | CF-17 | High | 3 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-27](story-cards.md#kan-27) | Request Clarification on an Event Request | CF-04 | Medium | 3 | S1 | [Completed · S1, 19 Sep](../scrum/sprint-01/review.md#story-decisions) |
| [KAN-29](story-cards.md#kan-29) | Automatically Assign Event Coordinator | CF-05 | Medium | 3 | S2 | [Completed · S2, 3 Oct](../scrum/sprint-02/review.md#story-decisions) |
| [KAN-31](story-cards.md#kan-31) | Create Event Request | CF-02 | Medium | 3 | S1 | [Completed · S1, 19 Sep](../scrum/sprint-01/review.md#story-decisions) |
| [KAN-33](story-cards.md#kan-33) | View Submitted Event Request | CF-04 | Medium | 2 | S1 → S2 | [Completed · S2, 3 Oct](../scrum/sprint-02/review.md#story-decisions) |
| [KAN-34](story-cards.md#kan-34) | Resume/Edit Draft Event Request | CF-03, CF-07 | High | 3 | S1 → S2 → S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-36](story-cards.md#kan-36) | Approve/Reject Event Request | CF-04 | Medium | 3 | S1 | [Completed · S1, 19 Sep](../scrum/sprint-01/review.md#story-decisions) |
| [KAN-50](story-cards.md#kan-50) | Maintain Venue Catalog | CF-08 | Highest | 5 | S2 → S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-51](story-cards.md#kan-51) | View Venue Availability Calendar | CF-09 | Medium | 5 | S2 | [Completed · S2, 3 Oct](../scrum/sprint-02/review.md#story-decisions) |
| [KAN-52](story-cards.md#kan-52) | Check Venue Suitability | CF-11 | High | 3 | S2 → S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-53](story-cards.md#kan-53) | Submit Venue Booking Request | CF-12 | Medium | 3 | S2 | [Completed · S2, 3 Oct](../scrum/sprint-02/review.md#story-decisions) |
| [KAN-54](story-cards.md#kan-54) | Detect Venue Booking Conflicts | CF-14 | Medium | 5 | S2 | [Completed · S2, 3 Oct](../scrum/sprint-02/review.md#story-decisions) |
| [KAN-55](story-cards.md#kan-55) | Block Venue for Operational Unavailability | CF-09, CF-14 | Medium | 3 | S2 | [Completed · S2, 3 Oct](../scrum/sprint-02/review.md#story-decisions) |
| [KAN-60](story-cards.md#kan-60) | Require a reason when rejecting an event request | CF-04 | High | 2 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-61](story-cards.md#kan-61) | Confirm Event After Planning Arrangements | CF-06 | High | 3 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-62](story-cards.md#kan-62) | Cancel Event and Release Its Arrangements | CF-06, CF-19 | High | 5 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-63](story-cards.md#kan-63) | Submit and Review Event Equipment Requests | CF-15 | High | 5 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-64](story-cards.md#kan-64) | Receive Request, Assignment and Venue Notifications | CF-20 | High | 5 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-65](story-cards.md#kan-65) | Reassign Event Coordinator | CF-05 | High | 3 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-66](story-cards.md#kan-66) | Update Event Information During Planning | CF-07 | High | 3 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-67](story-cards.md#kan-67) | View Event Registrations | CF-18 | High | 2 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-77](story-cards.md#kan-77) | Configure Venue Setup and Turnaround Durations | CF-08; CR-1 | High | 2 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-78](story-cards.md#kan-78) | Apply Venue Buffers to Availability and Booking Conflicts | CF-09–CF-14; CR-1 | High | 8 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-79](story-cards.md#kan-79) | Assign Submitted Events Through a Coordinator Lead Queue | CF-01, CF-02, CF-04, CF-05; CR-5 | High | 8 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-80](story-cards.md#kan-80) | Receive Equipment, Lifecycle, Change and Registration Notifications | CF-20 | High | 3 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-81](story-cards.md#kan-81) | Recover venue arrangements affected by operational unavailability | CF-09, CF-12, CF-13, CF-14, CF-20; CR-2 | High | 8 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-82](story-cards.md#kan-82) | Manage each venue arrangement independently for an event | CF-11, CF-12, CF-13, CF-14, CF-19; CR-3 | High | 5 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |
| [KAN-83](story-cards.md#kan-83) | Manage temporary venue holds with expiry and automatic release | CF-09, CF-12, CF-13, CF-14, CF-20; CR-4 | High | 8 | S3 | [Completed · S3, 17 Oct](../scrum/sprint-03/review.md#story-decisions) |
| [KAN-84](story-cards.md#kan-84) | Review operational safety before event preparation | CF-01, CF-06, CF-11, CF-15, CF-17, CF-19, CF-20; CR-6 | High | 8 | S4 | [Completed · S4, 31 Oct](../scrum/sprint-04/review.md#story-decisions) |

### Historical Jira fields

The dated fields below retain board observations. The 16 October [first snapshot](../scrum/sprint-03/evidence/jira-sprint-state-2026-10-16.json) showed 97 SP assigned to Sprint 3. The [later snapshot](../scrum/sprint-03/evidence/jira-rebalanced-state-2026-10-16.json) showed 63 SP in each sprint, matching the team’s 4 October planning decision. The [Folder 1 guide](../submission/1/README.md#workbook-reconciliation) links to the dated exports and targeted updates archived in Folder 6. The Jira resolution date records board administration. The review date above records story acceptance.

<details>
<summary>Retained priorities, status, ownership, resolution dates and related items</summary>

| Priority | Jira | Story | Core feature | SP | Last recorded Jira status | Sprint(s) | Jira resolution date (+08:00) | Last recorded owner | Related Jira item |
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
| High | [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | Reserve Equipment | CF-17 | 3 | In Progress | Sprint 4 | Not resolved | Tristan | is blocked by: KAN-9; relates to: KAN-63; blocks: KAN-61; relates to: KAN-84; relates to: KAN-80 |
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
| High | [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | Cancel Event and Release Its Arrangements | CF-06, CF-19 | 5 | To Do | Sprint 4 | Not resolved | Ryan | relates to: KAN-61; relates to: KAN-82; relates to: KAN-80 |
| High | [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | Submit and Review Event Equipment Requests | CF-15 | 5 | To Do | Sprint 4 | Not resolved | Ryan | relates to: KAN-26; relates to: KAN-84 |
| High | [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | Receive Request, Assignment and Venue Notifications | CF-20 | 5 | Done | Sprint 3 | Not resolved | Ernest | relates to: KAN-79; relates to: KAN-15; blocks: KAN-80; blocks: KAN-81; blocks: KAN-83 |
| High | [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | Reassign Event Coordinator | CF-05 | 3 | In Progress | Sprint 3 | Not resolved | Tristan | relates to: KAN-29; relates to: KAN-79 |
| High | [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | Update Event Information During Planning | CF-07 | 3 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-15 |
| High | [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | View Event Registrations | CF-18 | 2 | To Do | Sprint 4 | Not resolved | Unassigned | relates to: KAN-14; relates to: KAN-17; is blocked by: KAN-14 |
| High | [KAN-77](https://smu-g7-grp1.atlassian.net/browse/KAN-77) | Configure Venue Setup and Turnaround Durations | CF-08; CR-1 | 2 | To Do | Sprint 3 | Not resolved | Kai Jie | relates to: KAN-50; relates to: KAN-78 |
| High | [KAN-78](https://smu-g7-grp1.atlassian.net/browse/KAN-78) | Apply Venue Buffers to Availability and Booking Conflicts | CF-09–CF-14; CR-1 | 8 | In Review | Sprint 3 | Not resolved | Arvin | relates to: KAN-77; relates to: KAN-51; relates to: KAN-12; relates to: KAN-52; relates to: KAN-53; relates to: KAN-8; relates to: KAN-54; relates to: KAN-55; blocks: KAN-81; blocks: KAN-83 |
| High | [KAN-79](https://smu-g7-grp1.atlassian.net/browse/KAN-79) | Assign Submitted Events Through a Coordinator Lead Queue | CF-01, CF-02, CF-04, CF-05; CR-5 | 8 | In Progress | Sprint 3 | Not resolved | Tristan | relates to: KAN-29; relates to: KAN-25; relates to: KAN-6; relates to: KAN-65; relates to: KAN-64 |
| High | [KAN-80](https://smu-g7-grp1.atlassian.net/browse/KAN-80) | Receive Equipment, Lifecycle, Change and Registration Notifications | CF-20 | 3 | In Progress | Sprint 4 | Not resolved | Arvin | is blocked by: KAN-64; relates to: KAN-84; relates to: KAN-18; relates to: KAN-26; relates to: KAN-15; relates to: KAN-61; relates to: KAN-62; relates to: KAN-14; relates to: KAN-17 |
| High | [KAN-81](https://smu-g7-grp1.atlassian.net/browse/KAN-81) | Recover venue arrangements affected by operational unavailability | CF-09, CF-12, CF-13, CF-14, CF-20; CR-2 | 8 | In Progress | Sprint 3 | Not resolved | Kai Jie | is blocked by: KAN-64; is blocked by: KAN-78; relates to: KAN-55; relates to: KAN-51; relates to: KAN-53; relates to: KAN-8; relates to: KAN-54; relates to: KAN-83; relates to: KAN-82 |
| High | [KAN-82](https://smu-g7-grp1.atlassian.net/browse/KAN-82) | Manage each venue arrangement independently for an event | CF-11, CF-12, CF-13, CF-14, CF-19; CR-3 | 5 | In Progress | Sprint 4 | Not resolved | Irfan | relates to: KAN-53; relates to: KAN-8; relates to: KAN-52; relates to: KAN-15; relates to: KAN-62; relates to: KAN-81; relates to: KAN-83; relates to: KAN-84 |
| High | [KAN-83](https://smu-g7-grp1.atlassian.net/browse/KAN-83) | Manage temporary venue holds with expiry and automatic release | CF-09, CF-12, CF-13, CF-14, CF-20; CR-4 | 8 | In Review | Sprint 3 | Not resolved | Irfan | is blocked by: KAN-64; is blocked by: KAN-78; relates to: KAN-53; relates to: KAN-8; relates to: KAN-51; relates to: KAN-54; relates to: KAN-81; relates to: KAN-82 |
| High | [KAN-84](https://smu-g7-grp1.atlassian.net/browse/KAN-84) | Review operational safety before event preparation | CF-01, CF-06, CF-11, CF-15, CF-17, CF-19, CF-20; CR-6 | 8 | To Do | Sprint 4 | Not resolved | Kai Jie | relates to: KAN-25; relates to: KAN-16; relates to: KAN-61; relates to: KAN-63; relates to: KAN-26; relates to: KAN-15; relates to: KAN-52; relates to: KAN-80; relates to: KAN-82 |

</details>

## Release coverage

The [coverage table](README.md#first-release-coverage) maps the 20 required core features to the parent inventory. The [change register](change-requests.md) maps the six changes to seven new stories (47 SP) and identifies affected original stories. KAN-82 also contributes to CF-20 through its AC11 protected notification. The table preserves its primary source tags. KAN-24 is an engineering enabler. KAN-60 is an original-scope correction. The KAN-64/KAN-80 split preserves the original 8 SP.

## Archived backlog items

The following items were archived on 21 September 2026. Their history is retained, and none contributes to the 42-parent / 174-SP release inventory.

| Archived Jira item | Reason | Coverage or consequence |
| --- | --- | --- |
| KAN-21 — Block Venue for Maintenance | Duplicate of the broader KAN-55 operational-unavailability story | Mandatory reason, blocked period and calendar/conflict effects are retained in KAN-55; do not count both estimates |
| KAN-19 — Join Attendee Waiting List | Optional feature outside the selected first-release scope | KAN-14 keeps full-capacity refusal; a waiting list is not required for core registration |
| KAN-22 — Send Technical Support Requests | Optional human technical-support workflow outside the 20 core features | Equipment type, quantity and technical requirements remain covered by KAN-63 |
| KAN-23 — Assign Technical Support Staff | Optional human staffing/scheduling outside the selected first-release scope | Equipment reservation remains KAN-26; confirmation readiness must not depend on staffing assignment |

## Workbook reconciliation — 6 November 2026

The **Product backlog** worksheet calculates accepted parent counts and points from the individual story rows. It includes agreed estimates, sprint allocations, dependencies and dated review outcomes. **Criterion index** gives each numbered criterion’s wording, version and test case references. **Story specifications** retains the original wording alongside recorded supplements. The [Folder 1 guide](../submission/1/README.md#workbook-reconciliation) explains how to follow these records into the feature map, sprint history, test evidence and dated exports.

On 5 November, the earlier workbook’s Sprint 1 formula was corrected to match the seven rows labelled “Accepted 19 Sep (reported 26 Oct)”. The historical total was 24 SP. The [Sprint 1 review decisions](../scrum/sprint-01/review.md#story-decisions) identify the seven accepted items.

## Historical records

[Preserved document before cleanup](archive/2026-11-05/product-backlog.md). These dated records remain supporting evidence.

<details>
<summary>Links retained for earlier references</summary>

<a id="earlier-16-october-selection--superseded-9729-allocation"></a>
[Earlier 16 October selection — superseded 97/29 allocation](archive/2026-11-05/product-backlog.md#earlier-16-october-selection--superseded-9729-allocation)

<a id="historical-master-snapshot-and-initial-proposal--1516-october-2026"></a>
[Historical master snapshot and initial proposal — 15–16 October 2026](archive/2026-11-05/product-backlog.md#historical-master-snapshot-and-initial-proposal--1516-october-2026)

<a id="sprint-2-parent-and-subtask-reconciliation--15-october-2026"></a>
[Sprint 2 parent and subtask reconciliation — 15 October 2026](archive/2026-11-05/product-backlog.md#sprint-2-parent-and-subtask-reconciliation--15-october-2026)

<a id="sprint-2-parent-and-subtask-reconciliation--11-october-2026"></a>
[Sprint 2 parent and subtask reconciliation — 11 October 2026](archive/2026-11-05/product-backlog.md#sprint-2-parent-and-subtask-reconciliation--11-october-2026)

<a id="sprint-1"></a>
[Sprint 1](archive/2026-11-05/product-backlog.md#sprint-1)

<a id="sprint-2"></a>
[Sprint 2](archive/2026-11-05/product-backlog.md#sprint-2)

<a id="original-future-backlog-wording-and-corrective-work-history"></a>
[Original future-backlog wording and corrective-work history](archive/2026-11-05/product-backlog.md#original-future-backlog-wording-and-corrective-work-history)

<a id="kan-10--mark-event-as-completed"></a>
[KAN-10 — Mark Event as Completed](archive/2026-11-05/product-backlog.md#kan-10--mark-event-as-completed)

<a id="kan-14--register-for-an-event"></a>
[KAN-14 — Register for an Event](archive/2026-11-05/product-backlog.md#kan-14--register-for-an-event)

<a id="kan-17--withdraw-attendee-registration"></a>
[KAN-17 — Withdraw Attendee Registration](archive/2026-11-05/product-backlog.md#kan-17--withdraw-attendee-registration)

<a id="kan-18--update-equipment-availability-status"></a>
[KAN-18 — Update Equipment Availability Status](archive/2026-11-05/product-backlog.md#kan-18--update-equipment-availability-status)

<a id="kan-9--check-equipment-availability-for-an-event"></a>
[KAN-9 — Check Equipment Availability for an Event](archive/2026-11-05/product-backlog.md#kan-9--check-equipment-availability-for-an-event)

<a id="kan-26--reserve-equipment"></a>
[KAN-26 — Reserve Equipment](archive/2026-11-05/product-backlog.md#kan-26--reserve-equipment)

<a id="kan-15--submit-and-review-event-change-requests"></a>
[KAN-15 — Submit and Review Event Change Requests](archive/2026-11-05/product-backlog.md#kan-15--submit-and-review-event-change-requests)

<a id="kan-60--require-a-reason-when-rejecting-an-event-request"></a>
[KAN-60 — Require a Reason When Rejecting an Event Request](archive/2026-11-05/product-backlog.md#kan-60--require-a-reason-when-rejecting-an-event-request)

<a id="kan-61--confirm-event-after-planning-arrangements"></a>
[KAN-61 — Confirm Event After Planning Arrangements](archive/2026-11-05/product-backlog.md#kan-61--confirm-event-after-planning-arrangements)

<a id="kan-62--cancel-event-and-release-its-arrangements"></a>
[KAN-62 — Cancel Event and Release Its Arrangements](archive/2026-11-05/product-backlog.md#kan-62--cancel-event-and-release-its-arrangements)

<a id="kan-63--submit-and-review-event-equipment-requests"></a>
[KAN-63 — Submit and Review Event Equipment Requests](archive/2026-11-05/product-backlog.md#kan-63--submit-and-review-event-equipment-requests)

<a id="kan-64--notify-relevant-users-about-event-workflow-updates"></a>
[KAN-64 — Notify Relevant Users About Event Workflow Updates](archive/2026-11-05/product-backlog.md#kan-64--notify-relevant-users-about-event-workflow-updates)

<a id="kan-65--reassign-event-coordinator"></a>
[KAN-65 — Reassign Event Coordinator](archive/2026-11-05/product-backlog.md#kan-65--reassign-event-coordinator)

<a id="kan-66--update-event-information-during-planning"></a>
[KAN-66 — Update Event Information During Planning](archive/2026-11-05/product-backlog.md#kan-66--update-event-information-during-planning)

<a id="kan-67--view-event-registrations"></a>
[KAN-67 — View Event Registrations](archive/2026-11-05/product-backlog.md#kan-67--view-event-registrations)

<a id="readiness-and-evidence"></a>
[Readiness and evidence](archive/2026-11-05/product-backlog.md#readiness-and-evidence)

<a id="21-october-2026--targeted-kan-78--kan-34-implementation-snapshot"></a>
[21 October 2026 — targeted KAN-78 / KAN-34 implementation snapshot](archive/2026-11-05/product-backlog.md#21-october-2026--targeted-kan-78--kan-34-implementation-snapshot)

<a id="21-october--reviewer-selection-follow-up"></a>
[21 October — reviewer selection follow-up](archive/2026-11-05/product-backlog.md#21-october--reviewer-selection-follow-up)

<a id="21-october--kan-78--kan-34-review-handoff"></a>
[21 October — KAN-78 / KAN-34 review handoff](archive/2026-11-05/product-backlog.md#21-october--kan-78--kan-34-review-handoff)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>
[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/product-backlog.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="28-october-2026--kan-62--kan-63-pr-review-repair"></a>
[28 October 2026 — KAN-62 / KAN-63 PR review repair](archive/2026-11-05/product-backlog.md#28-october-2026--kan-62--kan-63-pr-review-repair)

</details>
