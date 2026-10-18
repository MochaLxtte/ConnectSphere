# Sprint 3 backlog and acceptance test plan

**KAN-65 follow-up — 19 October 2026.** KAN-65 and subtasks KAN-88/89/90 are In Progress / Tristan; the estimate remains 3 SP. Branch `feat/KAN-65-coordinator-reassignment` includes KAN-79 and implements Lead-only reassignment with a required reason, assignment-version checks, atomic audit history and current-assignment permissions. `AUTO-20261019-02` records local verification. KAN-64 notifications, manual/hosted workflow checks, independent review and acceptance remain pending. The earlier KAN-79 dependency notes below describe that earlier implementation stage. This targeted update does not change sprint scope, historical evidence or velocity.

**KAN-79 implementation update — 19 October 2026.** KAN-79 is assigned to Tristan and In Progress in Jira, with subtasks KAN-85/86/87 In Progress. Its 8 SP and Sprint 3 membership are unchanged. The branch implements trusted Lead access, unassigned submission, oversight and initial allocation; automated verification is recorded as `AUTO-20261019-01`. KAN-65/KAN-64 integration, hosted checks, independent review and acceptance remain outstanding. Other stories retain their last dated snapshot; this is a targeted update, not a fresh project-wide export. Sprint 3 remains administratively Active despite its configured 17 October end; this work is recorded on its actual 19 October date and is not counted as delivery by 17 October.

**16 October 2026 update.** Selected scope: **13 parents / 63 SP**. Sprint window: **4–17 October 2026**. Jira: **Active (ID 67)**. All selected parents are To Do; tests **Not executed** and acceptance **Not assessed**.

This rebalanced allocation replaces the earlier 97/29 split with **63/63**, without dropping criteria or increasing the 126 remaining release points. Customer changes were received **2 October**, as confirmed on 16 October; Sprint 2 is assessed against its original scope. The five selected carried stories retain **19 SP**; their current unfinished disposition does not invent historical acceptance or reduce Jira estimates to zero.

[Planning](planning.md) and [estimation](estimation-and-capacity.md) record the allocation and recorded decisions. Active criteria below retain the Jira wording. Expandable source descriptions are preserved snapshots from before the self-selection update; old administrative owner/reviewer labels in those snapshots are historical. Notification work is an explicit **KAN-64 5 + KAN-80 3** split, not hidden unpointed preparation. S3 delivers all of its narrowed inbox and trigger scope; S4 adds the separately tracked remaining triggers.

**16 October ownership update:** stories are unassigned for team members to choose, targeting roughly **10–11 SP each per sprint / 21 SP across both**. Keep whole estimates and dependencies; choose another member to review. The integration lead is **To agree**. See the [selection rules](planning.md#selected-backlog).

## Selected backlog

| Jira | Story | SP | Owner | Independent reviewer | Origin | Test |
| --- | --- | ---: | --- | --- | --- | --- |
| [KAN-6](https://smu-g7-grp1.atlassian.net/browse/KAN-6) | Submit an Event Request | 3 | Unassigned — team member to choose | To agree after owner chosen | Sprint 2 carry-over: full original points | S3-T05 |
| [KAN-34](https://smu-g7-grp1.atlassian.net/browse/KAN-34) | Resume/Edit Draft Event Request | 3 | Unassigned — team member to choose | To agree after owner chosen | Sprint 2 carry-over: full original points | S3-T06 |
| [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) | Require a reason when rejecting an event request | 2 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S3-T07 |
| [KAN-50](https://smu-g7-grp1.atlassian.net/browse/KAN-50) | Maintain Venue Catalog | 5 | Unassigned — team member to choose | To agree after owner chosen | Sprint 2 carry-over: full original points | S3-T15 |
| [KAN-12](https://smu-g7-grp1.atlassian.net/browse/KAN-12) | Search and Filter Venues | 5 | Unassigned — team member to choose | To agree after owner chosen | Sprint 2 carry-over: full original points | S3-T16 |
| [KAN-52](https://smu-g7-grp1.atlassian.net/browse/KAN-52) | Check Venue Suitability | 3 | Unassigned — team member to choose | To agree after owner chosen | Sprint 2 carry-over: full original points | S3-T17 |
| [KAN-77](https://smu-g7-grp1.atlassian.net/browse/KAN-77) | Configure Venue Setup and Turnaround Durations | 2 | Unassigned — team member to choose | To agree after owner chosen | CR-1 | S3-T18 |
| [KAN-78](https://smu-g7-grp1.atlassian.net/browse/KAN-78) | Apply Venue Buffers to Availability and Booking Conflicts | 8 | Unassigned — team member to choose | To agree after owner chosen | CR-1 | S3-T19 |
| [KAN-79](https://smu-g7-grp1.atlassian.net/browse/KAN-79) | Assign Submitted Events Through a Coordinator Lead Queue | 8 | Tristan | To agree | CR-5; In Progress | S3-T20 |
| [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | Reassign Event Coordinator | 3 | Tristan | To agree | In Progress; KAN-79 integrated locally | S3-T21 |
| [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | Receive Request, Assignment and Venue Notifications | 5 | Unassigned — team member to choose | To agree after owner chosen | Explicit original notification split | S3-T22 |
| [KAN-81](https://smu-g7-grp1.atlassian.net/browse/KAN-81) | Recover venue arrangements affected by operational unavailability | 8 | Unassigned — team member to choose | To agree after owner chosen | Customer change CR-2 | S3-T25 |
| [KAN-83](https://smu-g7-grp1.atlassian.net/browse/KAN-83) | Manage temporary venue holds with expiry and automatic release | 8 | Unassigned — team member to choose | To agree after owner chosen | Customer change CR-4 | S3-T26 |
| **Total** | **13 parents** | **63** | | | | |

## Shared test data and execution rules

These are specifications, **Not executed**, with acceptance **Not assessed**. The original 26 aggregate/audit rows and historical dated evidence remain unchanged; a past Fail is not replaced by a planned repair Pass.

- Use synthetic **O1/O2** organisers, **C1/C2** coordinators, **T** Technical Support, **V** Venue Staff, **L1/L2** Leads, **A1/A2** attendees and **S** Safety Officer. Record real mapped account aliases at execution; a person signs in themselves and no credentials are recorded.
- **E-A/E-B**, venues **A/B** and equipment **EQ-A/EQ-B** are separate fixtures. Default future period: **12 January 2031, 10:00–12:00 Asia/Singapore**. Each case sets specific boundaries, quantities, statuses, revisions and clocks.
- Use isolated PostgreSQL and a controlled database clock for destructive setup, races, injected failures and expiry processing. Reset each case so prior reservations/registrations/blocks do not contaminate it. Never point cleanup-based tests at shared Supabase.
- Hosted checks use coordinated synthetic data: record original values, restore them and identify anything retained. Compare UI/API with persisted state, then refresh. Do not invent UI paths for unimplemented features.
- An action mentioned in a case is a requirement, not proof an endpoint or scheduler exists. Add actual code/test paths to [traceability](../../requirements/traceability.csv) when implemented; baseline paths for carry-over are only regression targets.
- Record each real run with its actual date, build SHA, environment, command/steps, fixture identities, outcomes and gaps in [test evidence](../../testing/test-evidence.md). Independent review and hosted checks are still required for Done.

## Acceptance test plan

Every row requires its complete active criterion set plus applicable Definition of Done. Normal, boundary, conflict and failure cases in the CSV remain specifications until an actual run is recorded.

| Test | Story / active criteria | Functional cases | Result / evidence |
| --- | --- | --- | --- |
| S3-T05 | KAN-6: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC101 | TC-02-02, TC-02-03, TC-02-04, TC-02-05, TC-02-06, TC-02-07, TC-02-08, TC-02-09 | **Not executed** / Not recorded |
| S3-T06 | KAN-34: AC1, AC2, AC3, AC101 | TC-03-02, TC-03-03, TC-03-04, TC-03-05, TC-03-06 | **Not executed** / Not recorded |
| S3-T07 | KAN-60: AC1, AC2, AC3, AC4, AC5, AC101, AC102, AC103 | TC-04-02, TC-04-03, TC-04-04, TC-04-05, TC-04-06 | **Not executed** / Not recorded |
| S3-T15 | KAN-50: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15, AC16, AC17, AC18, AC19, AC20, AC21, AC101 | TC-08-02, TC-08-03, TC-08-04, TC-08-05, TC-08-06, TC-08-07, TC-08-08, TC-08-09, TC-08-10, TC-08-11, TC-08-12, TC-08-13, TC-08-14 | **Not executed** / Not recorded |
| S3-T16 | KAN-12: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15, AC16, AC101, AC102 | TC-10-02, TC-10-03, TC-10-04, TC-10-05, TC-10-06, TC-10-07, TC-10-08, TC-10-09, TC-10-10, TC-10-11, TC-10-12, TC-10-210 | **Not executed** / Not recorded |
| S3-T17 | KAN-52: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC101, AC102 | TC-11-02, TC-11-03, TC-11-04, TC-11-05, TC-11-06, TC-11-07, TC-11-205 | **Not executed** / Not recorded |
| S3-T18 | KAN-77: AC1, AC2, AC3, AC4, AC5, AC6 | TC-08-15, TC-08-16, TC-08-17, TC-08-18, TC-08-19, TC-08-20 | **Not executed** / Not recorded |
| S3-T19 | KAN-78: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8 | TC-14-01, TC-14-02, TC-14-03, TC-14-04, TC-14-05, TC-14-06, TC-14-07 | **Not executed** / Not recorded |
| S3-T20 | KAN-79: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10 | TC-05-01, TC-05-02, TC-05-03, TC-05-04, TC-05-05, TC-05-06, TC-05-07, TC-05-08, TC-05-09, TC-05-17–28 | Automated AC1–8/local AC10 pass: AUTO-20261019-01; AC9 reassignment locally verified by AUTO-20261019-02; KAN-64 and hosted workflow checks **Not executed**; acceptance **Not assessed** |
| S3-T21 | KAN-65: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC101, AC102, AC103, AC104 | TC-05-10–16; automated cases linked in traceability | Automated reassignment checks pass: AUTO-20261019-02; KAN-64 notifications and manual/hosted checks **Not executed**; acceptance **Not assessed** |
| S3-T22 | KAN-64: AC201, AC202, AC203, AC204, AC205, AC206, AC207, AC208, AC209 | TC-20-12, TC-20-13, TC-20-14, TC-20-15, TC-20-16, TC-20-17, TC-20-18, TC-20-19, TC-20-20 | **Not executed** / Not recorded |
| S3-T25 | KAN-81: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12 | TC-09-01, TC-09-02, TC-09-03, TC-09-04, TC-09-05, TC-09-06, TC-09-07, TC-09-08, TC-09-09, TC-09-10, TC-09-11, TC-09-12 | **Not executed** / Not recorded |
| S3-T26 | KAN-83: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12 | TC-14-08, TC-14-09, TC-14-10, TC-14-11, TC-14-12, TC-14-13, TC-14-14, TC-14-15, TC-14-16, TC-14-17, TC-14-18, TC-14-19 | **Not executed** / Not recorded |
| S3-T27 | Integrated request/venue/Lead/recovery/hold workflow | TC-14-20 | **Not executed** / Not recorded |

## Selected story cards

### KAN-6 — Submit an Event Request

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 3 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T05

**User story:** As an Event Organiser, I want to submit my event request to ConnectSphere so that it can be reviewed and the event planning process can proceed.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-6-AC1** | Given an owned draft satisfying the agreed submission rules, when the organiser submits it, then submission is persisted and the request becomes eligible for the agreed review workflow. The Event Organiser can tell when the event request has been successfully submitted. A successfully submitted request is no longer treated as a draft. A successfully submitted request is identified as Submitted. The information provided by the Event Organiser is retained with the submitted request. An organiser can open their saved draft and submit it successfully once the required information is valid. | TC-02-02, TC-02-09 |
| **KAN-6-AC2** | Given a draft that fails an agreed submission rule, when submission is attempted, then field-specific or actionable validation feedback is returned, saved draft data is retained, and no submission transition occurs. Event date and expected attendance are mandatory. Missing required values prevent submission and produce useful field-level feedback. Inapplicable accessibility, equipment, registration and special needs can be recorded as None / Not Required. The same submission validation applies to a new request and a saved draft. A failed submission retains the entered data and leaves the request in Draft. Expected attendance 0 is allowed. | TC-02-03, TC-02-09 |
| **KAN-6-AC3** | Given an unrelated actor or a request in a state that cannot be submitted, when submission is attempted directly through the API, then the action is refused without changing the request. | TC-02-04 |
| **KAN-6-AC4** | Given repeated or competing submission attempts for the same draft, when they are processed, then the agreed repeat-request behavior is applied and no duplicate submission effects or inconsistent state are produced. | TC-02-05 |
| **KAN-6-AC5** | A mandatory text field (event name, purpose, venue requirements) that is blank or only whitespace is treated as missing by any client; the request stays a draft and the field is listed. | TC-02-06 |
| **KAN-6-AC6** | An event end that is not after its start is refused at submission with a message for the end field; the request stays a draft. | TC-02-07 |
| **KAN-6-AC7** | When registration is required and the registration close is not after its open, submission is refused with a message for the close field. A blank capacity still means no limit, and the window is ignored while registration is not required. | TC-02-08 |
| **KAN-6-AC101** | Both new-request and saved-draft detail submission show server-supplied field errors for missing/invalid values, while retaining the entered data and Draft state on failure. | TC-02-03, TC-02-09 |

**Implementation location:** backend/src/modules/events/submit-request.ts; backend/src/modules/events/submit-input.ts; frontend/src/features/events/pages/EventRequestDetailPage.vue. **Automated test files:** backend/test/events/submit-input.test.ts; database/tests/events/submit-request.integration.test.ts; frontend/src/features/events/pages/EventRequestDetailPage.test.ts. These are existing baseline locations to extend; no new fixed-code result is claimed.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 3 SP. Owner: Kai Jie; independent reviewer: Tristan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

**Title**
Submit Event Request

**User Story**
As an Event Organiser, I want to submit my event request to ConnectSphere so that it can be reviewed and the event planning process can proceed.

**Acceptance Criteria**

Ensure that the Event Organiser:

* Can submit an event request once it satisfies the confirmed requirements for submission.
* Can tell when the event request has been successfully submitted.
* Is informed of any information that prevents submission where a confirmed validation rule is not satisfied.

Ensure that:

* A successfully submitted request is no longer treated as a draft.
* A successfully submitted request is identified as Submitted.
* The information provided by the Event Organiser is retained with the submitted request.
* A successfully submitted request becomes available to the appropriate Event Coordinator review workflow.
* A request that does not satisfy confirmed submission rules is not submitted.

### Submission validation — 21 September 2026

* Event date and expected attendance are mandatory. Missing required values prevent submission and produce useful field-level feedback.
* Inapplicable accessibility, equipment, registration and special needs can be recorded as None / Not Required.
* The same submission validation applies to a new request and a saved draft. A failed submission retains the entered data and leaves the request in Draft.
* An organiser can open their saved draft and submit it successfully once the required information is valid.

**Refinement before acceptance:** Agree the complete required-field list, valid timing/attendance ranges and registration-dependent capacity/date rules. Test both submission paths against that checklist.

**Sprint 1 carry-over:** S1-DEF-03 — saved-draft submission was reported unavailable; S1-DEF-04 — requests with missing mandatory information could submit. Reproduce, repair and record regression evidence before closing this story. Successful demo paths remain valid evidence for those specific paths.

### Server-side validation detail — 9 October 2026 (S1-DEF-04 / KAN-59)

* **KAN-6-AC5:** A mandatory text field (event name, purpose, venue requirements) that is blank or only whitespace is treated as missing by any client; the request stays a draft and the field is listed.
* **KAN-6-AC6:** An event end that is not after its start is refused at submission with a message for the end field; the request stays a draft.
* **KAN-6-AC7:** When registration is required and the registration close is not after its open, submission is refused with a message for the close field. A blank capacity still means no limit, and the window is ignored while registration is not required.

Delivered by PR #29 (merged 10 October). Evidence: AUTO-20261009-KAN59-01 and MAN-20261009-KAN59-01 in docs/testing/test-evidence.md. Expected attendance 0 is still accepted: the customer documents set no minimum.

### Sprint 3 selected scope and verification

Owner: Kai Jie. Independent reviewer: Tristan. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Tristan selected this story for completion and verification in Sprint 3 with its full original 3 SP. Sprint 2 acceptance was not recorded; the current audit does not establish historical acceptance timing. No estimate is set to zero. Retain earlier passed evidence; new regression/fixed-code acceptance is still required.

Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-6-AC101:** Both new-request and saved-draft detail submission show server-supplied field errors for missing/invalid values, while retaining the entered data and Draft state on failure.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-34 — Resume/Edit Draft Event Request

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 3 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T06

**User story:** As an Event Organiser, I want to return to a previously saved draft event request and continue editing it so that I can complete my event request before submission.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-34-AC1** | Given an owned saved draft, when the organiser selects it, then the edit form is populated with the persisted values. The Event Organiser can view event requests that they previously saved as drafts and can open a draft event request. | TC-03-02, TC-03-06 |
| **KAN-34-AC2** | Given changes to permitted draft fields, when the organiser saves and reloads, then the changed values persist, omitted fields remain unchanged, and permitted explicitly cleared fields are cleared under the agreed update contract. The request remains in Draft status after changes are saved unless it is subsequently submitted. Saving changes to a draft does not automatically submit the request. Changing the registration choice updates the corresponding form fields and validation consistently with the new-request form. Saving and reopening the draft preserves the registration choice and associated values. Both No to Yes and Yes to No changes are supported. | TC-03-03, TC-03-06 |
| **KAN-34-AC3** | Given a request the organiser cannot edit because of ownership or workflow state, when an edit is attempted through the API, then the request is refused and stored data remains unchanged. | TC-03-04 |
| **KAN-34-AC101** | Impossible calendar dates, including non-existent month/day combinations and invalid leap days, are refused by the API as validation errors rather than HTTP 500; the saved draft remains unchanged. | TC-03-05 |

**Implementation location:** backend/src/modules/events/draft-update-input.ts; backend/src/modules/events/update-draft.ts; frontend/src/features/events/pages/EventDraftEditPage.vue. **Automated test files:** backend/test/events/draft-update-input.test.ts; database/tests/events/update-draft.integration.test.ts; frontend/src/features/events/pages/EventDraftEditPage.test.ts. These are existing baseline locations to extend; no new fixed-code result is claimed.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 3 SP. Owner: Kai Jie; independent reviewer: Tristan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

**Title**
Resume/Edit Draft Event Request

**User Story**
As an Event Organiser, I want to return to a previously saved draft event request and continue editing it so that I can complete my event request before submission.

**Acceptance Criteria**

Ensure that the Event Organiser:

* Can view event requests that they previously saved as drafts.
* Can open a draft event request.
* Can view the information previously saved in the draft.
* Can edit information in a draft that they are authorised to modify.
* Can save changes made to the draft.
* Sees the latest saved information when the draft is reopened.

Ensure that:

* The request remains in Draft status after changes are saved unless it is subsequently submitted.
* Saving changes to a draft does not automatically submit the request.
* Users who are not authorised to modify the draft cannot edit it.

### Sprint 1 carry-over — 21 September 2026

**S1-DEF-01:** Changing registration from No to Yes while editing a saved draft did not reveal the required registration capacity and date fields.

* Changing the registration choice updates the corresponding form fields and validation consistently with the new-request form.
* Saving and reopening the draft preserves the registration choice and associated values.
* Check both No → Yes and Yes → No, then submission through KAN-6. Record the actual field rules and regression results before closing.

### Sprint 3 selected scope and verification

Owner: Kai Jie. Independent reviewer: Tristan. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Tristan selected this story for completion and verification in Sprint 3 with its full original 3 SP. Sprint 2 acceptance was not recorded; the current audit does not establish historical acceptance timing. No estimate is set to zero. Retain earlier passed evidence; new regression/fixed-code acceptance is still required.

Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-34-AC101:** Impossible calendar dates, including non-existent month/day combinations and invalid leap days, are refused by the API as validation errors rather than HTTP 500; the saved draft remains unchanged.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-60 — Require a reason when rejecting an event request

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 2 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T07

**User story:** Require an event-rejection explanation, linked to the original KAN-36 workflow.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-60-AC1** | Reject missing, empty and whitespace-only rejection reasons in the API and UI. | TC-04-02 |
| **KAN-60-AC2** | Persist the reason against the correct review and show it to the owning organiser after refresh. | TC-04-03 |
| **KAN-60-AC3** | Leave status and review records unchanged when validation fails. | TC-04-02 |
| **KAN-60-AC4** | Continue allowing approval without a reason. | TC-04-04 |
| **KAN-60-AC5** | Add input, endpoint and UI regression coverage and record the tested build. | TC-04-05 |
| **KAN-60-AC101** | Use the existing shared review reason length limit and trimmed nonempty validation for rejection, with a field-specific error; approval remains reason-optional. | TC-04-02 |
| **KAN-60-AC102** | Keep the initial-decision state and assignment checks unchanged; invalid rejection writes neither decision nor status/history/notification. | TC-04-05 |
| **KAN-60-AC103** | This item is the single tracked rejection-reason correction linked to KAN-36; do not create a second pointed repair for the same criterion. | TC-04-06 |

**Implementation location:** backend/src/modules/events/review-input.ts. **Automated test files:** backend/test/events/review-input.test.ts. These are existing baseline locations to extend; no new fixed-code result is claimed.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 2 SP. Owner: Kai Jie; independent reviewer: Tristan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

Follow-up to KAN-36, refined on 21 September 2026. The current approval/rejection UI and API allow an empty reason, but event-request rejection requires a short explanation.

Acceptance checks:

* Reject missing, empty and whitespace-only rejection reasons in the API and UI.
* Persist the reason against the correct review and show it to the owning organiser after refresh.
* Leave status and review records unchanged when validation fails.
* Continue allowing approval without a reason.
* Add input, endpoint and UI regression coverage and record the tested build.

Keep KAN-36’s historical Sprint 1 Done record intact. This correction is unestimated future backlog work; it is not included in the current 43-point Sprint 2 commitment.

### Sprint 3 selected scope and verification

Owner: Kai Jie. Independent reviewer: Tristan. Selected estimate: 2 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-60-AC101:** Use the existing shared review reason length limit and trimmed nonempty validation for rejection, with a field-specific error; approval remains reason-optional.
* **KAN-60-AC102:** Keep the initial-decision state and assignment checks unchanged; invalid rejection writes neither decision nor status/history/notification.
* **KAN-60-AC103:** This item is the single tracked rejection-reason correction linked to KAN-36; do not create a second pointed repair for the same criterion.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-50 — Maintain Venue Catalog

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 5 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T15

**User story:** As a Venue Staff member, I want to maintain accurate information about ConnectSphere venues so that Event Coordinators and Venue Staff can use reliable venue information when planning events.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-50-AC1** | View the venues recorded in the venue catalogue. | TC-08-02 |
| **KAN-50-AC2** | View the current information recorded for a venue. | TC-08-02 |
| **KAN-50-AC3** | Record and update a venue's location. | TC-08-03 |
| **KAN-50-AC4** | Record and update a venue's maximum capacity. | TC-08-03 |
| **KAN-50-AC5** | Record and update the facilities available at a venue. | TC-08-04 |
| **KAN-50-AC6** | Record and update accessibility information for a venue. | TC-08-04 |
| **KAN-50-AC7** | Record and update one or more supported room layouts for a venue. | TC-08-05 |
| **KAN-50-AC8** | Record and update relevant operating information for a venue. | TC-08-06 |
| **KAN-50-AC9** | Save changes made to venue information. | TC-08-07 |
| **KAN-50-AC10** | Supported room layouts remain associated with the correct venue. | TC-08-05 |
| **KAN-50-AC11** | A venue can support more than one room layout where applicable. | TC-08-05 |
| **KAN-50-AC12** | Updated venue information is displayed when the venue is subsequently viewed. | TC-08-07 |
| **KAN-50-AC13** | Updated venue information is available to the venue search and suitability-checking functionality. | TC-08-08 |
| **KAN-50-AC14** | Users who are not authorised to maintain venue information cannot modify the venue catalogue. | TC-08-09 |
| **KAN-50-AC15** | A save that supplies no field, or a field Venue Staff may not change (name, description, active status, identifiers), is refused with a validation error and the venue is unchanged. | TC-08-09 |
| **KAN-50-AC16** | Changing only one operating-hour endpoint is checked against the saved value; a result where closing is at or before opening is refused. A blank endpoint means no restriction at that end of the day. | TC-08-06 |
| **KAN-50-AC17** | Facility, accessibility and layout entries are trimmed, case-insensitive duplicates are removed, each entry is at most 100 characters and each list holds at most 30 distinct values. Capacity is a whole number of at least 1. | TC-08-10 |
| **KAN-50-AC18** | When two Venue Staff edit different fields of the same venue at the same time, both changes are kept; the same field resolves to the last save. | TC-08-11 |
| **KAN-50-AC19** | A venue that is inactive or no longer exists is reported as not in the active catalogue, and nothing is changed. | TC-08-12 |
| **KAN-50-AC20** | Changing capacity or supported layouts does not alter existing bookings; it applies to later searches and suitability assessments. | TC-08-08 |
| **KAN-50-AC21** | Only the fields that were actually changed are sent on save, and a failed save keeps the entered values for correction. | TC-08-13 |
| **KAN-50-AC101** | After navigating from venue A to venue B while A's save is pending, A's delayed success or error cannot replace B's editor or redirect a subsequent save; route/account changes invalidate stale writes in the UI. | TC-08-14 |

**Implementation location:** frontend/src/features/venues/pages/VenueCatalogueEditPage.vue; backend/src/modules/venues/venue-catalogue-service.ts. **Automated test files:** frontend/src/features/venues/pages/VenueCatalogueEditPage.test.ts; database/tests/venues/venue-catalogue.integration.test.ts; tests/e2e/venue-catalogue.spec.ts. These are existing baseline locations to extend; no new fixed-code result is claimed.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 5 SP. Owner: Ernest; independent reviewer: Ryan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As a Venue Staff member, I want to maintain accurate information about ConnectSphere venues so that Event Coordinators and Venue Staff can use reliable venue information when planning events.

### Acceptance Criteria

Ensure that Venue Staff can:

* View the venues recorded in the venue catalogue.
* View the current information recorded for a venue.
* Record and update a venue's location.
* Record and update a venue's maximum capacity.
* Record and update the facilities available at a venue.
* Record and update accessibility information for a venue.
* Record and update one or more supported room layouts for a venue.
* Record and update relevant operating information for a venue.
* Save changes made to venue information.

Ensure that:

* Supported room layouts remain associated with the correct venue.
* A venue can support more than one room layout where applicable.
* Updated venue information is displayed when the venue is subsequently viewed.
* Updated venue information is available to the venue search and suitability-checking functionality.
* Users who are not authorised to maintain venue information cannot modify the venue catalogue.

### Acceptance detail — 9 October 2026

* A save that supplies no field, or a field Venue Staff may not change (name, description, active status, identifiers), is refused with a validation error and the venue is unchanged.
* Changing only one operating-hour endpoint is checked against the saved value; a result where closing is at or before opening is refused. A blank endpoint means no restriction at that end of the day.
* Facility, accessibility and layout entries are trimmed, case-insensitive duplicates are removed, each entry is at most 100 characters and each list holds at most 30 distinct values. Capacity is a whole number of at least 1.
* When two Venue Staff edit different fields of the same venue at the same time, both changes are kept; the same field resolves to the last save.
* A venue that is inactive or no longer exists is reported as not in the active catalogue, and nothing is changed.
* Changing capacity or supported layouts does not alter existing bookings; it applies to later searches and suitability assessments.
* Only the fields that were actually changed are sent on save, and a failed save keeps the entered values for correction.

**Refinement:** Creating, deleting or deactivating venues and per-venue setup/turnaround time (Week 7 customer change 1) are not part of this story's pre-change scope.

### Sprint 3 selected scope and verification

Owner: Tristan. Independent reviewer: Irfan. Selected estimate: 5 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Tristan selected this story for completion and verification in Sprint 3 with its full original 5 SP. Sprint 2 acceptance was not recorded; the current audit does not establish historical acceptance timing. No estimate is set to zero. Retain earlier passed evidence; new regression/fixed-code acceptance is still required.

Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-50-AC101:** After navigating from venue A to venue B while A's save is pending, A's delayed success or error cannot replace B's editor or redirect a subsequent save; route/account changes invalidate stale writes in the UI.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-12 — Search and Filter Venues

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 5 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T16

**User story:** As an Event Coordinator, I want to search and filter venues using an event’s requirements so that I can identify potential venues efficiently.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-12-AC1** | Date and time. | TC-10-02 |
| **KAN-12-AC2** | Expected attendance. | TC-10-03 |
| **KAN-12-AC3** | Location. | TC-10-04 |
| **KAN-12-AC4** | Capacity. | TC-10-03 |
| **KAN-12-AC5** | Accessibility. | TC-10-05 |
| **KAN-12-AC6** | Supported room layout. | TC-10-06 |
| **KAN-12-AC7** | Required facilities. | TC-10-06 |
| **KAN-12-AC8** | Search results reflect the current venue catalogue information. | TC-10-07 |
| **KAN-12-AC9** | Search results correspond to the filters selected. | TC-10-07 |
| **KAN-12-AC10** | Venues that fail an applied filter are excluded from its matching results; the system clearly indicates when no venue matches. | TC-10-07 |
| **KAN-12-AC11** | The coordinator can change or clear filters and see the updated results. | TC-10-08 |
| **KAN-12-AC12** | Each result clearly identifies its venue. | TC-10-08 |
| **KAN-12-AC13** | Users not authorised to perform venue planning cannot access protected planning functionality. | TC-10-09 |
| **KAN-12-AC14** | An incomplete period (only a start or only an end) or an end that is not after the start is refused with a clear message before any search is sent. | TC-10-10 |
| **KAN-12-AC15** | Results from an earlier search never replace those of a newer one, and earlier results are hidden while a new search runs so they cannot be mistaken for the new filters. | TC-10-11 |
| **KAN-12-AC16** | If the layout, facility or accessibility lists cannot be loaded, the other filters still work and the user is told what is missing. A search with no matches explains that no venue meets every filter, which is different from an empty catalogue. | TC-10-12 |
| **KAN-12-AC101** | Impossible calendar dates are refused with field feedback instead of silently normalising to another date, through both the interface and direct API requests. | TC-10-10 |
| **KAN-12-AC102** | No venue match does not automatically reject the event request. Search supports the coordinator’s manual planning decision. | TC-10-210 |

**Implementation location:** backend/src/modules/venues/venue-search.ts; frontend/src/features/venues/pages/VenueSearchPage.vue. **Automated test files:** backend/test/venues/venue-search.test.ts; database/tests/venues/venue-search.integration.test.ts; frontend/src/features/venues/pages/VenueSearchPage.test.ts; tests/e2e/venue-search.spec.ts. These are existing baseline locations to extend; no new fixed-code result is claimed.

**17 October reconciliation:** This criterion restores the original 21 September no-automatic-event-rejection guardrail, retained in the historical source below but omitted from the current Jira cleanup. Its stable ID supports traceability; no scope or estimate is added. Jira mirroring remains pending. See the [Sprint 2 reconciliation](../sprint-02/sprint-backlog.md#acceptance-reconciliation--17-october-2026). New specification: **Not executed**; evidence: **Not recorded**.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 5 SP. Owner: Tristan; independent reviewer: Irfan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Coordinator, I want to search and filter venues using an event’s requirements so that I can identify potential venues efficiently.

### Acceptance Criteria

Ensure that the Event Coordinator can search/filter venues using relevant criteria including:

* Date and time.
* Expected attendance.
* Location.
* Capacity.
* Accessibility.
* Supported room layout.
* Required facilities.

Ensure that:

* Search results reflect the current venue catalogue information.
* Search results correspond to the filters selected.
* Users not authorised to perform venue planning cannot access protected planning functionality.

### Acceptance detail — 21 September 2026

* The coordinator can change or clear filters and see the updated results.
* Each result clearly identifies its venue.
* Venues that fail an applied filter are excluded from its matching results; the system clearly indicates when no venue matches.

No venue match does not automatically reject the event request. Search supports the coordinator’s manual planning decision.

### Acceptance detail — 9 October 2026 (verification)

* **KAN-12-AC14:** An incomplete period (only a start or only an end) or an end that is not after the start is refused with a clear message before any search is sent.
* **KAN-12-AC15:** Results from an earlier search never replace those of a newer one, and earlier results are hidden while a new search runs so they cannot be mistaken for the new filters.
* **KAN-12-AC16:** If the layout, facility or accessibility lists cannot be loaded, the other filters still work and the user is told what is missing. A search with no matches explains that no venue meets every filter, which is different from an empty catalogue.

Verified by PR #31 (merged 10 October; 34 page tests and a 7-test browser spec added, no source change). Evidence: AUTO-20261009-KAN12-01 and MAN-20261009-KAN12-01 in docs/testing/test-evidence.md.

### Sprint 3 selected scope and verification

Owner: Tristan. Independent reviewer: Irfan. Selected estimate: 5 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Tristan selected this story for completion and verification in Sprint 3 with its full original 5 SP. Sprint 2 acceptance was not recorded; the current audit does not establish historical acceptance timing. No estimate is set to zero. Retain earlier passed evidence; new regression/fixed-code acceptance is still required.

Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-12-AC101:** Impossible calendar dates are refused with field feedback instead of silently normalising to another date, through both the interface and direct API requests.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-52 — Check Venue Suitability

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 3 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T17

**User story:** As an Event Coordinator, I want to check whether a venue appears suitable for an event so that I can avoid selecting a venue that does not meet important event requirements.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-52-AC1** | A venue can be assessed using the relevant requirements of an event. | TC-11-02 |
| **KAN-52-AC2** | A venue is not treated as suitable when expected attendance exceeds its capacity. | TC-11-03 |
| **KAN-52-AC3** | A venue is not treated as suitable when a required facility is unavailable. | TC-11-04 |
| **KAN-52-AC4** | Required accessibility needs are considered where applicable. | TC-11-04 |
| **KAN-52-AC5** | Required room layouts are considered where applicable. | TC-11-04 |
| **KAN-52-AC6** | Venue availability is considered when determining suitability. | TC-11-05 |
| **KAN-52-AC7** | The Event Coordinator can identify why a venue has been marked unsuitable. | TC-11-04 |
| **KAN-52-AC8** | A venue that meets the applicable event requirements is not incorrectly marked unsuitable. | TC-11-02 |
| **KAN-52-AC9** | The assessment uses the current event requirements, venue information and relevant availability. | TC-11-06 |
| **KAN-52-AC101** | Expected attendance 0 is a known permitted value and is assessed against venue capacity; it is not treated as missing. Missing attendance remains distinguishable. Other requirements/availability still determine overall suitability. | TC-11-07 |
| **KAN-52-AC102** | Suitability informs venue selection; an unsuitable venue does not automatically reject the event request. | TC-11-205 |

**Implementation location:** backend/src/modules/venues/suitability-rules.ts; backend/src/modules/venues/suitability-service.ts; frontend/src/features/venues/pages/VenueSuitabilityPage.vue. **Automated test files:** backend/test/venues/suitability-rules.test.ts; database/tests/venues/venue-suitability.integration.test.ts; tests/e2e/venue-suitability.spec.ts. These are existing baseline locations to extend; no new fixed-code result is claimed.

**17 October reconciliation:** This criterion restores the original 21 September no-automatic-event-rejection guardrail, retained in the historical source below but omitted from the current Jira cleanup. Its stable ID supports traceability; no scope or estimate is added. Jira mirroring remains pending. See the [Sprint 2 reconciliation](../sprint-02/sprint-backlog.md#acceptance-reconciliation--17-october-2026). New specification: **Not executed**; evidence: **Not recorded**.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 3 SP. Owner: Ernest; independent reviewer: Ryan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Coordinator, I want to check whether a venue appears suitable for an event so that I can avoid selecting a venue that does not meet important event requirements.

### Acceptance Criteria

* A venue can be assessed using the relevant requirements of an event.
* A venue is not treated as suitable when expected attendance exceeds its capacity.
* A venue is not treated as suitable when a required facility is unavailable.
* Required accessibility needs are considered where applicable.
* Required room layouts are considered where applicable.
* Venue availability is considered when determining suitability.
* The Event Coordinator can identify why a venue has been marked unsuitable.

### Acceptance detail — 21 September 2026

* A venue that meets the applicable event requirements is not incorrectly marked unsuitable.
* The assessment uses the current event requirements, venue information and relevant availability.

Suitability informs venue selection; an unsuitable venue does not automatically reject the event request. Confirm any additional suitability rules before implementation and keep reasons understandable to the coordinator.

### Sprint 3 selected scope and verification

Owner: Tristan. Independent reviewer: Irfan. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Tristan selected this story for completion and verification in Sprint 3 with its full original 3 SP. Sprint 2 acceptance was not recorded; the current audit does not establish historical acceptance timing. No estimate is set to zero. Retain earlier passed evidence; new regression/fixed-code acceptance is still required.

Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-52-AC101:** Expected attendance 0 is a known permitted value and is assessed against venue capacity; it is not treated as missing. Missing attendance remains distinguishable. Other requirements/availability still determine overall suitability.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-77 — Configure Venue Setup and Turnaround Durations

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 2 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T18

**User story:** As a Venue Staff member, I want to maintain setup and turnaround durations for each venue so that planning can account for the time needed before and after each booking.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-77-AC1** | Only Venue Staff can create or change setupMinutes and turnaroundMinutes for the correct venue; unauthorised API and interface attempts are refused. | TC-08-15 |
| **KAN-77-AC2** | Both durations are whole minutes from 0 to 1440 inclusive. Invalid, negative, fractional or missing required values receive field feedback and do not save. | TC-08-16 |
| **KAN-77-AC3** | Existing venues receive zero durations through a new migration; existing booking records and migration history are preserved. | TC-08-17 |
| **KAN-77-AC4** | Saved durations persist after refresh and are included in authorised venue detail, planning and calendar inputs. | TC-08-18 |
| **KAN-77-AC5** | Buffer saves send only changed fields and use field-aware concurrency checks: unrelated catalogue-field edits are preserved, while a conflicting stale edit to the same buffer field is refused without overwriting the newer value. This new buffer-field rule does not replace KAN-50's existing policy for other catalogue fields. | TC-08-19 |
| **KAN-77-AC6** | A successful duration change triggers the linked CR1-B re-evaluation of non-ended bookings and reports affected-booking warnings without deleting or silently cancelling bookings. | TC-08-20 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 2 SP. Owner: Ernest; independent reviewer: Ryan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As a Venue Staff member, I want to maintain setup and turnaround durations for each venue so that planning can account for the time needed before and after each booking.

### Acceptance Criteria

1. Only Venue Staff can create or change setupMinutes and turnaroundMinutes for the correct venue; unauthorised API and interface attempts are refused.
2. Both durations are whole minutes from 0 to 1440 inclusive. Invalid, negative, fractional or missing required values receive field feedback and do not save.
3. Existing venues receive zero durations through a new migration; existing booking records and migration history are preserved.
4. Saved durations persist after refresh and are included in authorised venue detail, planning and calendar inputs.
5. Buffer saves send only changed fields and use field-aware concurrency checks: unrelated catalogue-field edits are preserved, while a conflicting stale edit to the same buffer field is refused without overwriting the newer value. This new buffer-field rule does not replace KAN-50's existing policy for other catalogue fields.
6. A successful duration change triggers the linked CR1-B re-evaluation of non-ended bookings and reports affected-booking warnings without deleting or silently cancelling bookings.

### Planning and traceability

Source: Week 7 Customer Changes, CR-1. Core features: CF-08. Related existing stories: KAN-50, CR-1.

Selected for Sprint 3 (4–17 October). Owner: Tristan; independent reviewer: Irfan. Estimate: 2 SP. Scope, estimate and release defaults selected by Codex under Tristan's explicit delegated authority; this is not a record of a six-member estimation vote or customer approval of implementation defaults.

Dependencies: CR1-B supplies effective-interval calculation and affected-booking warning results; integrate before declaring this story Done.

Design work: New numbered migration, catalogue UI/API, revision policy, data model and API documentation.

Delivery requires implementation, automated and hosted acceptance checks, independent review and updated contracts/diagrams/test evidence. No implementation or acceptance is claimed by this planning card.

</details>

### KAN-78 — Apply Venue Buffers to Availability and Booking Conflicts

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 8 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T19

**User story:** As an Event Coordinator or Venue Staff member, I want venue availability and booking decisions to include setup and turnaround time so that adjacent events leave enough operational time.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-78-AC1** | For a booking [start,end), the occupied interval is [start-setupMinutes,end+turnaroundMinutes) using the venue's current durations; a 10:00-12:00 event with 30/45-minute durations occupies 09:30-12:45. | TC-14-01 |
| **KAN-78-AC2** | Search, availability calendar, suitability assessment, booking submission and staff approval use the same effective-interval rule and distinguish event time from occupied time. | TC-14-02 |
| **KAN-78-AC3** | Approved bookings reserve occupied intervals; pending/rejected/cancelled requests do not reserve time. Exact adjacency of occupied intervals is permitted. | TC-14-03 |
| **KAN-78-AC4** | Operational-unavailability overlap and operating-hour eligibility consider the full occupied interval, including buffers; invalid or unsupported cross-day operating windows return clear feedback. | TC-14-04 |
| **KAN-78-AC5** | Submission and approval recheck current durations, bookings and operational blocks transactionally; concurrent buffer changes or approvals cannot permit a new conflicting reservation. | TC-14-05 |
| **KAN-78-AC6** | Changing buffers re-evaluates non-ended existing bookings and identifies each affected overlap or operational violation without deleting, cancelling or silently moving them; completed historical records remain unchanged. | TC-14-06 |
| **KAN-78-AC7** | Relevant authorised staff can identify affected bookings and their warnings. Newly attempted conflicting bookings are refused even while historical conflicts await resolution. | TC-14-06 |
| **KAN-78-AC8** | Zero buffers preserve the original interval behaviour and unrelated venues remain unaffected; all existing event/venue access restrictions remain enforced. | TC-14-07 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 8 SP. Owner: Tristan; independent reviewer: Irfan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Coordinator or Venue Staff member, I want venue availability and booking decisions to include setup and turnaround time so that adjacent events leave enough operational time.

### Acceptance Criteria

1. For a booking \[start,end), the occupied interval is \[start-setupMinutes,end+turnaroundMinutes) using the venue's current durations; a 10:00-12:00 event with 30/45-minute durations occupies 09:30-12:45.
2. Search, availability calendar, suitability assessment, booking submission and staff approval use the same effective-interval rule and distinguish event time from occupied time.
3. Approved bookings reserve occupied intervals; pending/rejected/cancelled requests do not reserve time. Exact adjacency of occupied intervals is permitted.
4. Operational-unavailability overlap and operating-hour eligibility consider the full occupied interval, including buffers; invalid or unsupported cross-day operating windows return clear feedback.
5. Submission and approval recheck current durations, bookings and operational blocks transactionally; concurrent buffer changes or approvals cannot permit a new conflicting reservation.
6. Changing buffers re-evaluates non-ended existing bookings and identifies each affected overlap or operational violation without deleting, cancelling or silently moving them; completed historical records remain unchanged.
7. Relevant authorised staff can identify affected bookings and their warnings. Newly attempted conflicting bookings are refused even while historical conflicts await resolution.
8. Zero buffers preserve the original interval behaviour and unrelated venues remain unaffected; all existing event/venue access restrictions remain enforced.

### Planning and traceability

Source: Week 7 Customer Changes, CR-1. Core features: CF-09, CF-10, CF-11, CF-12, CF-13, CF-14. Related existing stories: KAN-51, KAN-12, KAN-52, KAN-53, KAN-8, KAN-54, KAN-55, CR-1.

Selected for Sprint 3 (4–17 October). Owner: Tristan; independent reviewer: Irfan. Estimate: 8 SP. Scope, estimate and release defaults selected by Codex under Tristan's explicit delegated authority; this is not a record of a six-member estimation vote or customer approval of implementation defaults.

Dependencies: CR1-A duration configuration; KAN-51/12/52/53/8/54/55 baseline APIs and tests.

Design work: Shared occupied-interval service; new persisted warning/version representation if needed; booking locks, current-contract updates and regression tests.

Delivery requires implementation, automated and hosted acceptance checks, independent review and updated contracts/diagrams/test evidence. No implementation or acceptance is claimed by this planning card.

</details>

### KAN-79 — Assign Submitted Events Through a Coordinator Lead Queue

**Owner:** Tristan · **Independent reviewer:** To agree · **Estimate:** 8 SP · **Jira status:** In Progress · **Acceptance:** Not assessed · **Test group:** S3-T20

**User story:** As an Event Coordinator Lead, I want newly submitted requests to enter an unassigned queue that I can oversee and allocate so that responsibility is assigned deliberately and coordinators manage only their own events.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-79-AC1** | Trusted provisioning supports EVENT_COORDINATOR_LEAD. Ordinary users cannot self-grant the role. | TC-05-01 |
| **KAN-79-AC2** | A successful new submission remains SUBMITTED with no coordinator and enters the Lead queue; it does not automatically allocate, approve or reject the event. No available coordinator does not prevent submission. | TC-05-02 |
| **KAN-79-AC3** | All Leads in this deployment can list unassigned submitted requests and inspect basic event information needed for allocation; drafts are excluded. | TC-05-03 |
| **KAN-79-AC4** | Only a Lead may initially assign an active non-draft request to an EVENT_COORDINATOR marked available for assignment; the initial assignment is recorded against the correct event with actor/time and history. | TC-05-04 |
| **KAN-79-AC5** | Leads can oversee active non-draft events and their current assignments. Lead supervision does not itself grant event-review, venue-decision, equipment-decision or attendee-roster authority. | TC-05-03 |
| **KAN-79-AC6** | An assignment gives the selected coordinator event-specific access; other coordinators cannot access unassigned or unrelated events or allocate requests to themselves through an older API. | TC-05-05 |
| **KAN-79-AC7** | Concurrent assignments produce only one current coordinator; stale attempts fail clearly without replacing a newer assignment or duplicating history. | TC-05-06 |
| **KAN-79-AC8** | Preserve existing assignments, historical automatic-assignment records and the original KAN-29 acceptance history; the new workflow explicitly supersedes the old initial allocation rule. | TC-05-07 |
| **KAN-79-AC9** | Integrate KAN-65 for Lead-only reassignment and KAN-64 for organiser/new-coordinator notifications (plus old coordinator on reassignment), without duplicating their story points. | TC-05-08 |
| **KAN-79-AC10** | Deploy the submission policy change, trusted Lead access, queue and allocation controls together so new unassigned submissions are not stranded. | TC-05-09 |

**Implementation — 19 October 2026:** `database/migrations/007_add_coordinator_lead.sql`; trusted roles in `backend/src/modules/auth/`; submission, assignment and Lead routes in `backend/src/modules/events/`; `/lead`, `/lead/oversight` and `/lead/oversight/:id` in `frontend/src/features/reviews/pages/`. Initial allocation is separate from KAN-65 reassignment; no notification implementation is claimed.

**Automated evidence:** `backend/test/events/lead-assignment.test.ts`, `backend/test/events/submit-request.test.ts`, `database/tests/events/lead-assignment.integration.test.ts`, `database/tests/events/automatic-assignment.integration.test.ts`, `frontend/src/features/reviews/pages/LeadAccessPage.test.ts`, `frontend/src/features/events/components/AssignmentPanel.test.ts`, and `tests/e2e/lead-assignment.spec.ts`. See `AUTO-20261019-01` and S3-E14. AC1–8 and the local connected portion of AC10 pass automated checks. AC9 integration and hosted AC10 remain **Not executed**; story acceptance remains **Not assessed**. The original KAN-29 history is retained.

**Subtasks:** KAN-85 backend/policy, KAN-86 interface, KAN-87 verification/documentation; all In Progress, no extra story points. Independent reviewer **To agree**. The approved implementation plan retains the 8-SP estimate and leaves KAN-65/KAN-64 integration pending.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 8 SP. Owner: Ryan; independent reviewer: Arvin. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Coordinator Lead, I want newly submitted requests to enter an unassigned queue that I can oversee and allocate so that responsibility is assigned deliberately and coordinators manage only their own events.

### Acceptance Criteria

1. Trusted provisioning supports EVENT_COORDINATOR_LEAD. Ordinary users cannot self-grant the role.
2. A successful new submission remains SUBMITTED with no coordinator and enters the Lead queue; it does not automatically allocate, approve or reject the event. No available coordinator does not prevent submission.
3. All Leads in this deployment can list unassigned submitted requests and inspect basic event information needed for allocation; drafts are excluded.
4. Only a Lead may initially assign an active non-draft request to an EVENT_COORDINATOR marked available for assignment; the initial assignment is recorded against the correct event with actor/time and history.
5. Leads can oversee active non-draft events and their current assignments. Lead supervision does not itself grant event-review, venue-decision, equipment-decision or attendee-roster authority.
6. An assignment gives the selected coordinator event-specific access; other coordinators cannot access unassigned or unrelated events or allocate requests to themselves through an older API.
7. Concurrent assignments produce only one current coordinator; stale attempts fail clearly without replacing a newer assignment or duplicating history.
8. Preserve existing assignments, historical automatic-assignment records and the original KAN-29 acceptance history; the new workflow explicitly supersedes the old initial allocation rule.
9. Integrate KAN-65 for Lead-only reassignment and KAN-64 for organiser/new-coordinator notifications (plus old coordinator on reassignment), without duplicating their story points.
10. Deploy the submission policy change, trusted Lead access, queue and allocation controls together so new unassigned submissions are not stranded.

### Planning and traceability

Source: Week 7 Customer Changes, CR-5. Core features: CF-01, CF-02, CF-04, CF-05. Related existing stories: KAN-25, KAN-6, KAN-29, KAN-33, KAN-65, KAN-64, CR-5.

Selected for Sprint 3 (4–17 October). Owner: Ryan; independent reviewer: Arvin. Estimate: 8 SP. Scope, estimate and release defaults selected by Codex under Tristan's explicit delegated authority; this is not a record of a six-member estimation vote or customer approval of implementation defaults.

Dependencies: KAN-65 reassignment; KAN-64 notifications; trusted test-account provisioning for Lead.

Design work: New role migration/auth mapping, read-only oversight and allocation API/UI, changed submit transaction; update affected permissions across all current event-related endpoints.

Delivery requires implementation, automated and hosted acceptance checks, independent review and updated contracts/diagrams/test evidence. No implementation or acceptance is claimed by this planning card.

</details>

### KAN-65 — Reassign Event Coordinator

**Owner:** Tristan · **Independent reviewer:** To agree · **Estimate:** 3 SP · **Jira status:** In Progress · **Acceptance:** Not assessed · **Test group:** S3-T21

**User story:** As an authorised internal user, I want to reassign an event to another Event Coordinator so that responsibility can change when staff responsibilities or availability change.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-65-AC1** | An authorised user can view the event’s current coordinator and select another Event Coordinator. | TC-05-10; TC-05-29, TC-05-43, TC-05-45 |
| **KAN-65-AC2** | Successful reassignment records the new coordinator against the correct existing event; only one coordinator is current at a time. | TC-05-10; TC-05-30, TC-05-39, TC-05-40, TC-05-45 |
| **KAN-65-AC3** | The previous coordinator is no longer treated as the main coordinator and loses permissions derived solely from that assignment. | TC-05-11; TC-05-31, TC-05-42, TC-05-45 |
| **KAN-65-AC4** | The new coordinator can access the event they are authorised to coordinate. | TC-05-11; TC-05-31, TC-05-45 |
| **KAN-65-AC5** | Reassignment retains event information and prior decisions, without creating a duplicate event. | TC-05-12; TC-05-32, TC-05-40 |
| **KAN-65-AC6** | Relevant authorised users see the current coordinator after saving and refreshing. | TC-05-10; TC-05-33, TC-05-43 |
| **KAN-65-AC7** | Users without reassignment authority cannot change the assignment, including by direct API calls. | TC-05-13; TC-05-34, TC-05-44 |
| **KAN-65-AC8** | Record the assignment change with actor and time; relevant assignment notifications are covered by KAN-64. | TC-05-12; TC-05-35 |
| **KAN-65-AC101** | Under CR-5, only EVENT_COORDINATOR_LEAD may reassign; this supersedes the earlier self/other-coordinator handover proposal. The role alone does not permit event approval. | TC-05-13; TC-05-34, TC-05-36, TC-05-44 |
| **KAN-65-AC102** | Allow reassignment in SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED or CONFIRMED to an available EVENT_COORDINATOR; refuse drafts and terminal events. | TC-05-14; TC-05-30, TC-05-37 |
| **KAN-65-AC103** | Require a trimmed nonempty reason and expected assignment version; record prior/new coordinator, actor and time atomically while retaining a single current assignment. | TC-05-15; TC-05-35, TC-05-38, TC-05-39, TC-05-40, TC-05-43 |
| **KAN-65-AC104** | Current-assignee requests are unchanged without duplicate history/notifications. KAN-64 notifies the organiser and old/new coordinators; old assignment-derived read/write permissions are revoked immediately. | TC-05-16; TC-05-31, TC-05-41, TC-05-42 |

**Implementation — 19 October 2026:** `backend/src/modules/events/assignment.ts` and `assignment-router.ts`; protected history reads in `workflow-support.ts`, `clarifications.ts` and `status-history.ts`; `frontend/src/features/events/api/assignments.ts`, `AssignmentPanel.vue` and `LeadRequestPage.vue`. No new migration: the active assignment history UUID is the expected version. Existing event/review/arrangement records are preserved.

**Automated verification:** `backend/test/events/reassignment.test.ts`, `reassignment-access.test.ts`, existing Lead/router suites, `database/tests/events/reassignment.integration.test.ts`, adjacent frontend tests and `tests/e2e/coordinator-reassignment.spec.ts`; see AUTO-20261019-02 and S3-E15. Full suites: 604 frontend, 1,035 backend, 341 database and 132 browser tests pass. Audit/no-op portions of AC8/AC104 pass locally; their KAN-64 notification portions remain Not executed. Manual/hosted acceptance is deferred.

**Subtasks:** KAN-88 backend/access, KAN-89 interface/recovery, KAN-90 verification/documents; all In Progress, unestimated. Original 3 SP retained. Independent review, KAN-64 integration, hosted verification and DoD assessment remain outstanding.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 3; 3 SP. Owner: Ryan; independent reviewer: Arvin. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Retained in Sprint 3 for the request/venue workflow. KAN-64 now covers request, assignment and venue notifications at 5 SP; later-workflow triggers move to KAN-80 at 3 SP.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

User Story
As an authorised internal user, I want to reassign an event to another Event Coordinator so that responsibility can change when staff responsibilities or availability change.

Acceptance Criteria

1. An authorised user can view the event’s current coordinator and select another Event Coordinator.
2. Successful reassignment records the new coordinator against the correct existing event; only one coordinator is current at a time.
3. The previous coordinator is no longer treated as the main coordinator and loses permissions derived solely from that assignment.
4. The new coordinator can access the event they are authorised to coordinate.
5. Reassignment retains event information and prior decisions, without creating a duplicate event.
6. Relevant authorised users see the current coordinator after saving and refreshing.
7. Users without reassignment authority cannot change the assignment, including by direct API calls.
8. Record the assignment change with actor and time; relevant assignment notifications are covered by KAN-64.

Refinement before selection
KAN-29 covers automatic initial assignment. Coordinators may assign to themselves or other coordinators, but authority to take over an already-assigned event is still to agree. Define eligible event states, selectable/available coordinator rules and concurrent-handover behaviour. Do not assume all internal roles may reassign.

Added 21 September 2026. Unestimated, unassigned future backlog outside Sprint 2’s 43 points.

### Sprint 3 selected scope and verification

Owner: Ryan. Independent reviewer: Arvin. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
This CR-5 Lead-only policy supersedes the older coordinator self/other-assignment refinement above; KAN-79 replaces automatic initial assignment without rewriting KAN-29 history.

Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-65-AC101:** Under CR-5, only EVENT_COORDINATOR_LEAD may reassign; this supersedes the earlier self/other-coordinator handover proposal. The role alone does not permit event approval.
* **KAN-65-AC102:** Allow reassignment in SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED or CONFIRMED to an available EVENT_COORDINATOR; refuse drafts and terminal events.
* **KAN-65-AC103:** Require a trimmed nonempty reason and expected assignment version; record prior/new coordinator, actor and time atomically while retaining a single current assignment.
* **KAN-65-AC104:** Current-assignee requests are unchanged without duplicate history/notifications. KAN-64 notifies the organiser and old/new coordinators; old assignment-derived read/write permissions are revoked immediately.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-64 — Receive Request, Assignment and Venue Notifications

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 5 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T22

**User story:** As a relevant organiser or internal user, I want request, assignment and venue updates in my inbox so that I can understand the outcome and take action.

**Active scope is AC201–AC209 at 5 SP.** Original AC1–AC9/AC101–AC106 and 8-SP scope are historical, mapped below; KAN-80 owns the transferred 3-SP original trigger groups. No original requirement is deleted or counted twice.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-64-AC201** | The relevant organiser receives submission, clarification/amendment-request, and initial approval/rejection notifications for their event request. | TC-20-12 |
| **KAN-64-AC202** | The organiser and newly assigned coordinator receive initial assignment notifications; reassignment also informs the previous coordinator without exposing event details after access is removed. | TC-20-13 |
| **KAN-64-AC203** | Venue booking decisions notify the organiser and current assigned coordinator, and relevant Venue Staff receive the outcome needed for their arrangement responsibilities. | TC-20-14 |
| **KAN-64-AC204** | Provide a complete authenticated in-app inbox with read/unread state. Email, push and external delivery workers are not required. | TC-20-15 |
| **KAN-64-AC205** | Every notification identifies the correct event and related request/booking, with enough information to understand the outcome and required action. | TC-20-16 |
| **KAN-64-AC206** | Only intended recipients can list/read or change read state; protected links recheck current role and event permissions, including after reassignment. An old coordinator may retain only a minimal reassignment notice. | TC-20-17 |
| **KAN-64-AC207** | Persist notifications in the successful business transaction using a unique outcome/recipient identifier. Failed or rolled-back actions produce none; retry or unchanged repeated actions create no duplicate notification. | TC-20-18 |
| **KAN-64-AC208** | Use the documented trigger/recipient matrix and include acknowledgements where the actor is also a recipient; do not apply blanket actor exclusion. | TC-20-19 |
| **KAN-64-AC209** | Original equipment, significant-change, final event confirmation/cancellation and registration/withdrawal triggers transfer to KAN-80. CR-2 outage, CR-4 hold and CR-6 safety triggers remain in their respective change stories and reuse this infrastructure without duplicated scope. | TC-20-20 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files during implementation; these planned tests are not completion evidence.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Current scope after split — 16 October 2026

As a relevant organiser or internal user, I want request, assignment and venue updates in my inbox so that I can understand the outcome and take action.

Owner: Irfan; independent reviewer: Ernest. Sprint 3; 5 SP. 5 SP delivers the complete reusable authenticated inbox, read/unread, transaction/deduplication, recipient authorization and request/assignment/venue integrations. Remaining domain triggers move to KAN-80 at 3 SP; combined total stays 8.

### Active acceptance criteria (new stable IDs)

* **KAN-64-AC201:** The relevant organiser receives submission, clarification/amendment-request, and initial approval/rejection notifications for their event request.
* **KAN-64-AC202:** The organiser and newly assigned coordinator receive initial assignment notifications; reassignment also informs the previous coordinator without exposing event details after access is removed.
* **KAN-64-AC203:** Venue booking decisions notify the organiser and current assigned coordinator, and relevant Venue Staff receive the outcome needed for their arrangement responsibilities.
* **KAN-64-AC204:** Provide a complete authenticated in-app inbox with read/unread state. Email, push and external delivery workers are not required.
* **KAN-64-AC205:** Every notification identifies the correct event and related request/booking, with enough information to understand the outcome and required action.
* **KAN-64-AC206:** Only intended recipients can list/read or change read state; protected links recheck current role and event permissions, including after reassignment. An old coordinator may retain only a minimal reassignment notice.
* **KAN-64-AC207:** Persist notifications in the successful business transaction using a unique outcome/recipient identifier. Failed or rolled-back actions produce none; retry or unchanged repeated actions create no duplicate notification.
* **KAN-64-AC208:** Use the documented trigger/recipient matrix and include acknowledgements where the actor is also a recipient; do not apply blanket actor exclusion.
* **KAN-64-AC209:** Original equipment, significant-change, final event confirmation/cancellation and registration/withdrawal triggers transfer to KAN-80. CR-2 outage, CR-4 hold and CR-6 safety triggers remain in their respective change stories and reuse this infrastructure without duplicated scope.

### Split mapping and history

The original full 8-SP description below is preserved as history, not the current acceptance checklist. Original AC1/2 stay here; AC3 is split into venue decisions here and equipment/significant changes in KAN-80; AC4/5 move to KAN-80; AC6-9 and AC101/102/104/105 safeguards apply to both domains; AC103 scope is partitioned by the new active criteria; AC106 keeps CR-specific triggers in their own stories. Both parts require independent verification, review and hosted checks before Done. This is backlog decomposition of original scope, not a new customer requirement. Decision: Codex under Tristan's delegated planning authority in chat; no team vote or test result is claimed.

---

### Historical combined KAN-64 scope — superseded by the split above

### User Story

As a relevant organiser, internal staff member or attendee, I want to receive notifications about significant workflow updates that affect me so that I can understand what happened and take any required action.

### Acceptance Criteria

1. The relevant organiser is notified when an event request is successfully submitted, clarification or amendment is requested, or the request is approved or rejected.
2. Relevant users are notified when a coordinator is assigned or reassigned to their event.
3. Relevant internal users receive notifications for venue booking decisions, significant changes affecting arrangements, and equipment confirmation or unavailability.
4. Relevant users receive notifications for final event confirmation or cancellation.
5. Relevant attendees and authorised event managers receive significant registration or withdrawal updates as appropriate. Registered attendees are notified of event changes that affect them.
6. Each notification identifies the correct event, and the correct request or registration where applicable, with enough information to understand the change and any action required.
7. Only relevant authorised recipients can access a notification and its protected details. Unrelated events or users do not receive it.
8. A notification reflects a successfully recorded business outcome. Failed or rolled-back operations do not produce success notifications.
9. The notification channel is a release implementation choice; email is not mandatory.

### Delivery tasks and refinement

Break implementation and tests into event-request updates, internal planning updates and registration updates. These are three trigger groups within this story, not three additional pointed stories. Reuse notification behaviour required by KAN-15, KAN-26 and other workflow stories.

Before estimation, agree a trigger/recipient/channel matrix, delivery and retry behaviour, duplicate handling, retention and read-state needs. Inspect existing in-app notifications and test actual coverage rather than assuming completion from code presence. Changes in recipient assignment must not leak protected event information.

Refined 21 September 2026. Unestimated future backlog outside Sprint 2’s 43-point commitment.

### Sprint 3 selected scope and verification

Owner: Irfan. Independent reviewer: Ernest. Selected estimate: 8 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-64-AC101:** Provide an authenticated in-app inbox with read/unread state; email, push and external delivery workers are not required.
* **KAN-64-AC102:** Persist notifications in the business transaction with unique outcome/recipient identifiers; failed outcomes produce none and retried successful outcomes do not duplicate.
* **KAN-64-AC103:** Cover all original trigger groups: request submission/clarification/decision, assignment/reassignment, venue/equipment outcomes, significant changes, final confirmation/cancellation, registration and withdrawal.
* **KAN-64-AC104:** Use the documented trigger/recipient matrix and include requester acknowledgements even where the actor is a recipient; do not apply a blanket actor-exclusion rule.
* **KAN-64-AC105:** Recipients may read only their own notifications; linked protected details require current event permissions, including after reassignment. Retain minimal reassignment notices without leaking the newly assigned event's protected information.
* **KAN-64-AC106:** CR-2/CR-4/CR-6 add their new recovery/expiry/safety triggers in their own stories and do not duplicate this story's infrastructure estimate.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-81 — Recover venue arrangements affected by operational unavailability

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 8 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T25

**User story:** As Venue Staff, I want to record operational unavailability even when future bookings exist and inform the affected coordinators, so that replacement venues can be arranged without losing the event or its unaffected arrangements.

**Source:** CR-2, received 2 October 2026 with receipt confirmed on 16 October. Sprint 2 retains its original scope. New linked story for a revised customer workflow; preserve the original KAN-55 rule and evidence as the pre-change baseline.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-81-AC1** | Only verified Venue Staff can create operational unavailability for a valid active venue; a real ordered time interval and trimmed nonempty reason are required, with field-level errors and no partial write for invalid input. | TC-09-01 |
| **KAN-81-AC2** | An operational-unavailability record can be saved when it overlaps an existing approved venue booking; the old refusal solely because that booking exists is explicitly replaced for this workflow. | TC-09-02 |
| **KAN-81-AC3** | The saved outage identifies every non-ended approved booking or live tentative hold for the same venue whose buffered occupied interval overlaps the outage, using half-open interval boundaries; unrelated venues and exact adjacency are unaffected. | TC-09-03 |
| **KAN-81-AC4** | Affected arrangements retain their original event association and decision/hold history and are visibly marked as requiring recovery. The event, its information, equipment and unrelated venue arrangements are not automatically cancelled or deleted. | TC-09-04 |
| **KAN-81-AC5** | Saving the outage and its affected-arrangement flags atomically records one in-app notice per affected event/current assigned coordinator with outage period, reason and a protected recovery link. Retries do not duplicate a notice and a rolled-back outage sends none. | TC-09-05 |
| **KAN-81-AC6** | Venue Staff and the currently assigned coordinator can view the affected arrangement and its recovery state; another coordinator or an unauthorised user cannot read protected recovery details or request a replacement for that event. | TC-09-06 |
| **KAN-81-AC7** | The assigned coordinator can search and request a replacement for an affected arrangement on an APPROVED or CONFIRMED event. The replacement is a separate pending booking linked to the affected original; it must pass current suitability, buffered availability and booking checks and still requires the normal Venue Staff decision. | TC-09-07 |
| **KAN-81-AC8** | An approved replacement resolves the linked recovery item only after current validity is checked; rejected, cancelled or expired replacements leave recovery outstanding and allow another attempt. The original affected booking remains in history, and unrelated arrangements remain unchanged. | TC-09-08 |
| **KAN-81-AC9** | Calendar, search, suitability, new hold/request creation and approval use the saved operational block immediately. Affected or unresolved arrangements cannot be counted as valid venue readiness by event confirmation or the later safety/preparation gate. | TC-09-09 |
| **KAN-81-AC10** | Outage creation and competing booking approval/hold creation serialize on the same venue state: an approval cannot commit as usable while missing a concurrently committed outage; a booking approved first is recorded as affected by the subsequent outage. | TC-09-10 |
| **KAN-81-AC11** | Repeated outage processing is idempotent. Removing a block re-evaluates affected arrangements against all remaining blocks, bookings, holds and current buffers; it does not manufacture a new approval, delete recovery history or silently reactivate an expired hold. | TC-09-11 |
| **KAN-81-AC12** | The staff and coordinator interfaces distinguish unaffected, recovery-required and resolved arrangements, show recoverable API/network failures, and refresh current state after a stale conflict or an uncertain write response without retrying a mutation blindly. | TC-09-12 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files during implementation; these planned tests are not completion evidence.

**Dependencies:** KAN-78 buffered occupancy calculation; KAN-64 persisted notification delivery and current-assignment recipient lookup; Existing KAN-53/KAN-8 booking creation and decision workflows.

**Design impact:** Planned additive migration for outage-to-arrangement impact/recovery links; reuse venue_unavailability and booking identities, one venue-lock order, current-assignment authorization, notification outbox/in-app transaction, recovery UI, shared readiness check and sequence/API/ERD updates. None is claimed implemented.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### User Story

As Venue Staff, I want to record operational unavailability even when future bookings exist and inform the affected coordinators, so that replacement venues can be arranged without losing the event or its unaffected arrangements.

### Acceptance Criteria

1. Only verified Venue Staff can create operational unavailability for a valid active venue; a real ordered time interval and trimmed nonempty reason are required, with field-level errors and no partial write for invalid input.
2. An operational-unavailability record can be saved when it overlaps an existing approved venue booking; the old refusal solely because that booking exists is explicitly replaced for this workflow.
3. The saved outage identifies every non-ended approved booking or live tentative hold for the same venue whose buffered occupied interval overlaps the outage, using half-open interval boundaries; unrelated venues and exact adjacency are unaffected.
4. Affected arrangements retain their original event association and decision/hold history and are visibly marked as requiring recovery. The event, its information, equipment and unrelated venue arrangements are not automatically cancelled or deleted.
5. Saving the outage and its affected-arrangement flags atomically records one in-app notice per affected event/current assigned coordinator with outage period, reason and a protected recovery link. Retries do not duplicate a notice and a rolled-back outage sends none.
6. Venue Staff and the currently assigned coordinator can view the affected arrangement and its recovery state; another coordinator or an unauthorised user cannot read protected recovery details or request a replacement for that event.
7. The assigned coordinator can search and request a replacement for an affected arrangement on an APPROVED or CONFIRMED event. The replacement is a separate pending booking linked to the affected original; it must pass current suitability, buffered availability and booking checks and still requires the normal Venue Staff decision.
8. An approved replacement resolves the linked recovery item only after current validity is checked; rejected, cancelled or expired replacements leave recovery outstanding and allow another attempt. The original affected booking remains in history, and unrelated arrangements remain unchanged.
9. Calendar, search, suitability, new hold/request creation and approval use the saved operational block immediately. Affected or unresolved arrangements cannot be counted as valid venue readiness by event confirmation or the later safety/preparation gate.
10. Outage creation and competing booking approval/hold creation serialize on the same venue state: an approval cannot commit as usable while missing a concurrently committed outage; a booking approved first is recorded as affected by the subsequent outage.
11. Repeated outage processing is idempotent. Removing a block re-evaluates affected arrangements against all remaining blocks, bookings, holds and current buffers; it does not manufacture a new approval, delete recovery history or silently reactivate an expired hold.
12. The staff and coordinator interfaces distinguish unaffected, recovery-required and resolved arrangements, show recoverable API/network failures, and refresh current state after a stale conflict or an uncertain write response without retrying a mutation blindly.

### Customer source and chronology

Week 7 Customer Changes.pdf, page 1, item 2: permit operational unavailability after booking, identify affected arrangements, inform responsible coordinators, preserve the event and enable replacement-venue requests.

Received 2 October 2026, confirmed by Tristan in chat on 16 October. The team intended to finish Sprint 2 against its original scope and consider these changes during Sprint 3 planning. Source inspection recorded 15 October; backlog reconstruction recorded 16 October. These dates are distinct; no earlier finalisation or customer approval of implementation defaults is claimed.

Classification: New linked story for a revised customer workflow; preserve the original KAN-55 rule and evidence as the pre-change baseline.

### Delegated release defaults

* Approved booking means the existing venue-booking APPROVED state, not a new event-status transition.
* Include live holds from CR-4 in outage impact so a provisional reservation cannot remain falsely usable.
* Keep the event lifecycle state unchanged; expose an explicit recovery/readiness condition instead of automatically cancelling the event.
* A linked replacement for recovery is supported here even though general independent arrangement management is a separate CR-3 story.
* Notifications use the shared in-app mechanism; no additional email channel or duplicate notification feature is introduced.

### Planning and delivery

Selected Sprint 3; 8 SP. Owner: Irfan; independent reviewer: Ernest. Codex selected scope/estimates/defaults under Tristan's explicit delegated authority in chat; no independent six-member vote is claimed.

Estimate rationale: 8 SP: extends the 3-SP KAN-55 block and 3-SP KAN-8 decision workflows with affected-booking persistence, recovery links/UI, transactional notifications and approval/outage concurrency. Existing venue search and booking paths are reused; their original implementation is not estimated again.

Core features: CF-09, CF-12, CF-13, CF-14, CF-20. Related stories: KAN-55, KAN-51, KAN-53, KAN-8, KAN-54, KAN-78, KAN-64.
Dependencies: KAN-78 buffered occupancy calculation; KAN-64 persisted notification delivery and current-assignment recipient lookup; Existing KAN-53/KAN-8 booking creation and decision workflows.

Design impact: Planned additive migration for outage-to-arrangement impact/recovery links; reuse venue_unavailability and booking identities, one venue-lock order, current-assignment authorization, notification outbox/in-app transaction, recovery UI, shared readiness check and sequence/API/ERD updates. None is claimed implemented.

Test plan:

* AC1/AC2: Staff creates a valid outage overlapping an approved booking; invalid dates/blank reason and organiser/coordinator write attempts fail atomically.
* AC3/AC4: Outage overlaps two approved bookings and one live hold after buffers; adjacent and other-venue rows remain unchanged; event and equipment are preserved.
* AC5/AC6: Verify current coordinator notice, recipient deduplication, rollback, reassignment before save and denied cross-event recovery access.
* AC7/AC8/AC9: Request then reject a replacement, retry with another venue and approve it; recovery remains open until valid approval, with original history and unrelated bookings intact.
* AC10/AC11: Race outage with approval/hold creation; replay processing; remove one of two overlapping blocks; no missed conflict or spontaneous approval/hold revival.
* AC12: Browser recovery panel, stale state, network failure and reload show the committed result without duplicate replacement mutations.

Update contracts/diagrams, test cases, traceability, actual run evidence and sprint acceptance status during implementation. All new tests Not executed; acceptance Not assessed. Change history: docs/requirements/change-requests.md.

</details>

### KAN-83 — Manage temporary venue holds with expiry and automatic release

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 8 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T26

**User story:** As an Event Coordinator, I want a temporary venue hold to have a visible deadline and be released when that deadline is not met, so that availability remains accurate and an expired hold never becomes a confirmed booking.

**Source:** CR-4, received 2 October 2026 with receipt confirmed on 16 October. Sprint 2 retains its original scope. New linked hold lifecycle; existing pending requests remain non-reserving unless Venue Staff explicitly creates a hold.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-83-AC1** | Only verified Venue Staff can explicitly place a tentative hold on an eligible pending venue request, using a visible expiry instant strictly after current server time and no later than its buffered occupied start. Invalid or missing expiry is refused without creating a hold. | TC-14-08 |
| **KAN-83-AC2** | An ordinary pending request does not become a hold automatically. The saved hold is linked to the correct event, venue and request, retains its creator and creation time, and is visibly distinguished from pending, approved and expired arrangements. | TC-14-09 |
| **KAN-83-AC3** | Creating a hold rechecks event/venue eligibility, suitability, operating hours, buffered occupancy, operational blocks, approved bookings and other live holds in the same venue transaction. Conflicts cannot create a provisional reservation. | TC-14-10 |
| **KAN-83-AC4** | While server time is strictly earlier than expiry, a live hold reserves its buffered interval consistently in calendar, search, suitability, request creation and booking approval. At or after expiry it no longer blocks availability even if background cleanup is delayed. | TC-14-11 |
| **KAN-83-AC5** | The required completion action is an explicit Venue Staff approval before expiry. Approval locks the hold, checks current eligibility and conflicts excluding only that same hold, and atomically replaces its provisional reservation with the approved booking without a double reservation. | TC-14-12 |
| **KAN-83-AC6** | At or after expiry an uncompleted hold becomes expired and releases its reservation. No scheduler, read request or elapsed time can automatically approve a booking or event, and an expired hold cannot be revived by a late approval. | TC-14-13 |
| **KAN-83-AC7** | The current assigned coordinator receives an in-app notice when the hold is created, showing the exact deadline in Singapore time. This is the required pre-expiry notice; expiry also produces a distinct once-only notice when processed. Notification records and state changes commit together. | TC-14-14 |
| **KAN-83-AC8** | Expiry processing is restart-safe and replay-safe, catches up overdue holds after downtime, and deduplicates expiry history and notifications. The documented production scheduling mechanism is operational and its database clock is authoritative; users do not need to open a page for a hold to expire. | TC-14-15 |
| **KAN-83-AC9** | Approval and expiry racing at the deadline resolve to one valid result under current locked state: approval committed while still valid or expiry, never both and never a late approval. Concurrent requests or holds cannot overbook the released interval. | TC-14-16 |
| **KAN-83-AC10** | Venue Staff can explicitly cancel a held arrangement with a trimmed nonempty reason, releasing only that hold and retaining its history. Rejection or an operational outage releases or invalidates the hold according to the associated workflow; an affected hold cannot remain usable or satisfy readiness. Later whole-event and coordinator arrangement-cancellation stories reuse this held-state release operation. | TC-14-17 |
| **KAN-83-AC11** | A coordinator can see the hold deadline, remaining eligibility and expired outcome for their assigned event. To try again after expiry they create a new request/hold through the normal checks; there is no silent automatic renewal or privileged client-controlled extension. | TC-14-18 |
| **KAN-83-AC12** | Wrong-role or wrong-assignment clients cannot create/approve holds or access protected hold details. The UI displays stale/deadline conflicts and refreshes committed state after uncertain writes, without pretending a locally displayed countdown guarantees a reservation. | TC-14-19 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files during implementation; these planned tests are not completion evidence.

**Dependencies:** KAN-78 common buffered occupancy; KAN-64 persisted notification delivery; Existing KAN-53 request and KAN-8 decision workflows; CR-2 outage interaction.

**Design impact:** Planned additive hold state/deadline/audit migration and conflict-constraint updates, explicit create-hold API, approval transition, expiry-aware availability queries, trusted scheduled expiry job, in-app notifications and UI; document deployment/scheduler operation and all clock/race tests.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### User Story

As an Event Coordinator, I want a temporary venue hold to have a visible deadline and be released when that deadline is not met, so that availability remains accurate and an expired hold never becomes a confirmed booking.

### Acceptance Criteria

1. Only verified Venue Staff can explicitly place a tentative hold on an eligible pending venue request, using a visible expiry instant strictly after current server time and no later than its buffered occupied start. Invalid or missing expiry is refused without creating a hold.
2. An ordinary pending request does not become a hold automatically. The saved hold is linked to the correct event, venue and request, retains its creator and creation time, and is visibly distinguished from pending, approved and expired arrangements.
3. Creating a hold rechecks event/venue eligibility, suitability, operating hours, buffered occupancy, operational blocks, approved bookings and other live holds in the same venue transaction. Conflicts cannot create a provisional reservation.
4. While server time is strictly earlier than expiry, a live hold reserves its buffered interval consistently in calendar, search, suitability, request creation and booking approval. At or after expiry it no longer blocks availability even if background cleanup is delayed.
5. The required completion action is an explicit Venue Staff approval before expiry. Approval locks the hold, checks current eligibility and conflicts excluding only that same hold, and atomically replaces its provisional reservation with the approved booking without a double reservation.
6. At or after expiry an uncompleted hold becomes expired and releases its reservation. No scheduler, read request or elapsed time can automatically approve a booking or event, and an expired hold cannot be revived by a late approval.
7. The current assigned coordinator receives an in-app notice when the hold is created, showing the exact deadline in Singapore time. This is the required pre-expiry notice; expiry also produces a distinct once-only notice when processed. Notification records and state changes commit together.
8. Expiry processing is restart-safe and replay-safe, catches up overdue holds after downtime, and deduplicates expiry history and notifications. The documented production scheduling mechanism is operational and its database clock is authoritative; users do not need to open a page for a hold to expire.
9. Approval and expiry racing at the deadline resolve to one valid result under current locked state: approval committed while still valid or expiry, never both and never a late approval. Concurrent requests or holds cannot overbook the released interval.
10. Venue Staff can explicitly cancel a held arrangement with a trimmed nonempty reason, releasing only that hold and retaining its history. Rejection or an operational outage releases or invalidates the hold according to the associated workflow; an affected hold cannot remain usable or satisfy readiness. Later whole-event and coordinator arrangement-cancellation stories reuse this held-state release operation.
11. A coordinator can see the hold deadline, remaining eligibility and expired outcome for their assigned event. To try again after expiry they create a new request/hold through the normal checks; there is no silent automatic renewal or privileged client-controlled extension.
12. Wrong-role or wrong-assignment clients cannot create/approve holds or access protected hold details. The UI displays stale/deadline conflicts and refreshes committed state after uncertain writes, without pretending a locally displayed countdown guarantees a reservation.

### Customer source and chronology

Week 7 Customer Changes.pdf, page 2, item 4: tentative holds have expiry, an unmet deadline releases availability, the coordinator is notified before or at expiry, and expiry must never imply confirmation.

Received 2 October 2026, confirmed by Tristan in chat on 16 October. The team intended to finish Sprint 2 against its original scope and consider these changes during Sprint 3 planning. Source inspection recorded 15 October; backlog reconstruction recorded 16 October. These dates are distinct; no earlier finalisation or customer approval of implementation defaults is claimed.

Classification: New linked hold lifecycle; existing pending requests remain non-reserving unless Venue Staff explicitly creates a hold.

### Delegated release defaults

* Venue Staff choose an explicit deadline; no arbitrary fixed hold duration or renewal period is attributed to the customer.
* Expiry must be strictly future and at or before buffered occupation begins; at the exact expiry instant the hold is expired.
* Use a trusted scheduled expiry job plus expiry-aware reads. A delayed worker may delay the expiry follow-up notice, but the creation notice already communicates the deadline before expiry and availability releases on time.
* Approval is the explicit completion action. No separate coordinator acknowledgement automatically turns a hold into an approved booking.
* New schema/state constraints and existing database conflict triggers must be reconciled through additive migrations, not editing applied history.

### Planning and delivery

Selected Sprint 3; 8 SP. Owner: Arvin; independent reviewer: Kai Jie. Codex selected scope/estimates/defaults under Tristan's explicit delegated authority in chat; no independent six-member vote is claimed.

Estimate rationale: 8 SP: a new timed reservation state, database clock and replay-safe expiry worker, approval/expiry locking, all availability consumers, UI and transactional notices exceed the 3-SP KAN-8 decision scope while reusing the booking model.

Core features: CF-09, CF-12, CF-13, CF-14, CF-20. Related stories: KAN-53, KAN-8, KAN-51, KAN-54, KAN-78, KAN-64.
Dependencies: KAN-78 common buffered occupancy; KAN-64 persisted notification delivery; Existing KAN-53 request and KAN-8 decision workflows; CR-2 outage interaction.

Design impact: Planned additive hold state/deadline/audit migration and conflict-constraint updates, explicit create-hold API, approval transition, expiry-aware availability queries, trusted scheduled expiry job, in-app notifications and UI; document deployment/scheduler operation and all clock/race tests.

Test plan:

* AC1/AC2/AC3: Place a staff hold on a valid pending request; reject absent/past/after-occupation deadline, wrong role and a conflicting live reservation; ordinary pending requests remain non-reserving.
* AC4/AC6: Freeze server time just before, exactly at and after expiry; all venue consumers agree, including when the worker is paused.
* AC5/AC9: Approve before expiry and race approval against expiry and another hold; assert one valid outcome and no double booking or late approval.
* AC7/AC8: Verify creation deadline notice and once-only expiry notice; crash/restart worker, replay work and force transaction rollback; no lost reservation release or duplicate records.
* AC10/AC11: Outage, reject and cancel active holds; late approval fails; a fresh request is independently checked without resurrecting the original hold.
* AC12: Old coordinator and wrong role cannot access/mutate holds; browser handles countdown expiry, stale response and network uncertainty by reading current state.

Update contracts/diagrams, test cases, traceability, actual run evidence and sprint acceptance status during implementation. All new tests Not executed; acceptance Not assessed. Change history: docs/requirements/change-requests.md.

</details>

## Notification scope preservation

Original KAN-64 was one 8-SP story. Rebalance explicitly replaces its active scope with 5-SP KAN-64 AC201–209 plus 3-SP KAN-80 AC1–9. Original TC-20-01–11 remain **historical, never-executed specifications**, not active criteria or evidence of passing. Active replacements have new case IDs; no old ID is reused.

| Original KAN-64 criterion | Current acceptance owner |
| --- | --- |
| AC1 request submission/clarification/amendment/decision | KAN-64-AC201 |
| AC2 assignment/reassignment | KAN-64-AC202 |
| AC3 venue decisions | KAN-64-AC203 |
| AC3 equipment confirmation/unavailability | KAN-80-AC1 |
| AC3 significant arrangement changes | KAN-80-AC2 |
| AC4 final confirmation/cancellation | KAN-80-AC3 |
| AC5 registration/withdrawal and attendee-relevant changes | KAN-80-AC4 and AC2 |
| AC6 correct associated record/action | KAN-64-AC205 and KAN-80-AC5 |
| AC7 recipient authorization | KAN-64-AC206 and KAN-80-AC6 |
| AC8 successful outcome only | KAN-64-AC207 and KAN-80-AC7 |
| AC9 / AC101 in-app inbox/read state | KAN-64-AC204; reused and verified by KAN-80-AC8 |
| AC102 transaction and deduplication | KAN-64-AC207 and KAN-80-AC7 |
| AC103 complete original matrix | Union of KAN-64-AC201–203 and KAN-80-AC1–4; scope recorded in KAN-64-AC209 |
| AC104 actor acknowledgement and recipient matrix | KAN-64-AC208 and KAN-80-AC8 |
| AC105 own inbox and current protected-link access | KAN-64-AC206 and KAN-80-AC6 |
| AC106 new customer triggers are owned separately | KAN-64-AC209 / KAN-80-AC9; KAN-81 outage, KAN-83 holds and KAN-84 safety own their new trigger tests |

## Test-group transfer register

Old test identifiers are preserved as history; their current location is explicit. A move does not create a Pass or revise past execution dates.

| Earlier group | Current group | Story / reason |
| --- | --- | --- |
| S3-T01 | S4-T01 | KAN-18; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T02 | S4-T02 | KAN-9; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T03 | S4-T03 | KAN-63; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T04 | S4-T04 | KAN-26; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T08 | S4-T05 | KAN-61; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T09 | S4-T06 | KAN-62; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T10 | S4-T07 | KAN-10; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T11 | S4-T08 | KAN-14; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T12 | S4-T09 | KAN-17; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T13 | S4-T10 | KAN-67; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T14 | S4-T11 | KAN-66; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T23 | S4-T12 | KAN-15; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T22 (original combined 8-SP scope) | S3-T22 (narrowed 5-SP scope) + S4-T13 (3-SP transferred triggers) | KAN-64 / KAN-80; old AC/case mapping retained above |
| S3-T24 (old complete-release journey) | S4-T16 | Original TC-06-19 remains historical; new current journey has a distinct case ID |

S3-T25/T26 are new customer-change groups; S3-T27 is the current integrated Sprint 3 journey. S4-T14/T15 cover CR-3/CR-6. No test-group identifier from the previous selected plan is reassigned to another story.

## Superseded 97-SP selected-scope snapshot

The earlier same-day allocation is retained for traceability. **It is not the current sprint commitment.** Its story cards now live under the selected Sprint 3 or Sprint 4 locations above; criteria and old functional case IDs were retained unless explicitly split by the notification mapping. All acceptance rows below were Not executed.

<details>
<summary>Earlier 23-item / 97-SP allocation and acceptance groups</summary>


| Jira | Story | SP | Owner | Independent reviewer | Origin | Test |
| --- | --- | ---: | --- | --- | --- | --- |
| [KAN-18](https://smu-g7-grp1.atlassian.net/browse/KAN-18) | Update Equipment Availability Status | 3 | Arvin | Kai Jie | Existing future backlog | S3-T01 |
| [KAN-9](https://smu-g7-grp1.atlassian.net/browse/KAN-9) | Check Equipment Availability for an Event | 8 | Arvin | Kai Jie | Existing future backlog | S3-T02 |
| [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | Submit and Review Event Equipment Requests | 5 | Arvin | Kai Jie | Existing future backlog | S3-T03 |
| [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | Reserve Equipment | 3 | Arvin | Kai Jie | Existing future backlog | S3-T04 |
| [KAN-6](https://smu-g7-grp1.atlassian.net/browse/KAN-6) | Submit an Event Request | 3 | Kai Jie | Tristan | Sprint 2 carry-over: full original points | S3-T05 |
| [KAN-34](https://smu-g7-grp1.atlassian.net/browse/KAN-34) | Resume/Edit Draft Event Request | 3 | Kai Jie | Tristan | Sprint 2 carry-over: full original points | S3-T06 |
| [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) | Require a reason when rejecting an event request | 2 | Kai Jie | Tristan | Existing future backlog | S3-T07 |
| [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) | Confirm Event After Planning Arrangements | 3 | Kai Jie | Tristan | Existing future backlog | S3-T08 |
| [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | Cancel Event and Release Its Arrangements | 5 | Kai Jie | Tristan | Existing future backlog | S3-T09 |
| [KAN-10](https://smu-g7-grp1.atlassian.net/browse/KAN-10) | Mark Event as Completed | 3 | Kai Jie | Tristan | Existing future backlog | S3-T10 |
| [KAN-14](https://smu-g7-grp1.atlassian.net/browse/KAN-14) | Register for an Event | 5 | Ernest | Ryan | Existing future backlog | S3-T11 |
| [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) | Withdraw Attendee Registration | 2 | Ernest | Ryan | Existing future backlog | S3-T12 |
| [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | View Event Registrations | 2 | Ernest | Ryan | Existing future backlog | S3-T13 |
| [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | Update Event Information During Planning | 3 | Ernest | Ryan | Existing future backlog | S3-T14 |
| [KAN-50](https://smu-g7-grp1.atlassian.net/browse/KAN-50) | Maintain Venue Catalog | 5 | Tristan | Irfan | Sprint 2 carry-over: full original points | S3-T15 |
| [KAN-12](https://smu-g7-grp1.atlassian.net/browse/KAN-12) | Search and Filter Venues | 5 | Tristan | Irfan | Sprint 2 carry-over: full original points | S3-T16 |
| [KAN-52](https://smu-g7-grp1.atlassian.net/browse/KAN-52) | Check Venue Suitability | 3 | Tristan | Irfan | Sprint 2 carry-over: full original points | S3-T17 |
| [KAN-77](https://smu-g7-grp1.atlassian.net/browse/KAN-77) | Configure Venue Setup and Turnaround Durations | 2 | Tristan | Irfan | New CR-1 story | S3-T18 |
| [KAN-78](https://smu-g7-grp1.atlassian.net/browse/KAN-78) | Apply Venue Buffers to Availability and Booking Conflicts | 8 | Tristan | Irfan | New CR-1 story | S3-T19 |
| [KAN-79](https://smu-g7-grp1.atlassian.net/browse/KAN-79) | Assign Submitted Events Through a Coordinator Lead Queue | 8 | Ryan | Arvin | New CR-5 replacement | S3-T20 |
| [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | Reassign Event Coordinator | 3 | Ryan | Arvin | Existing future backlog | S3-T21 |
| [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | Notify Relevant Users About Event Workflow Updates | 8 | Irfan | Ernest | Existing future backlog | S3-T22 |
| [KAN-15](https://smu-g7-grp1.atlassian.net/browse/KAN-15) | Submit and Review Event Change Requests | 5 | Irfan | Ernest | Existing future backlog | S3-T23 |
| **Total** | **23 parents** | **97** | | | **19 carried + 78 other selected work** | |



Each row groups the complete criterion-specific cases for one parent. Normal, boundary, conflict and failure scenarios are explicit in the CSV; row completion requires all applicable linked criteria and the Definition of Done, not merely a happy-path screenshot.

| Test | Story / full criterion set | Functional cases | Verification scope | Result / evidence |
| --- | --- | --- | --- | --- |
| S3-T01 | KAN-18: AC1, AC2, AC3, AC4, AC5, AC6, AC101, AC102, AC103 | TC-16-01, TC-16-02, TC-16-03, TC-16-04, TC-16-05 | Operational stock, damaged/maintenance exclusions, restoration, permissions and stale updates | **Not executed** / Not recorded |
| S3-T02 | KAN-9: AC1, AC2, AC3, AC4, AC5, AC101, AC102, AC103 | TC-16-06, TC-16-07, TC-16-08, TC-16-09, TC-16-10 | Requested quantities, peak overlaps, shortages, invalid inputs and advisory-result recheck | **Not executed** / Not recorded |
| S3-T03 | KAN-63: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC101, AC102, AC103, AC104 | TC-15-01, TC-15-02, TC-15-03, TC-15-04, TC-15-05, TC-15-06, TC-15-07 | Coordinator requests, staff review, association, whole-line reservation and explicit Not Required | **Not executed** / Not recorded |
| S3-T04 | KAN-26: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC101, AC102, AC103, AC104 | TC-17-01, TC-17-02, TC-17-03, TC-17-04, TC-17-05, TC-17-06, TC-17-07 | Atomic reservation, concurrent demand, notifications and once-only lifecycle release | **Not executed** / Not recorded |
| S3-T05 | KAN-6: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC101 | TC-02-02, TC-02-03, TC-02-04, TC-02-05, TC-02-06, TC-02-07, TC-02-08 | Both submission paths, field errors, ownership, state, required data and repeat/race behavior, TC-02-09 | **Not executed** / Not recorded |
| S3-T06 | KAN-34: AC1, AC2, AC3, AC101 | TC-03-02, TC-03-03, TC-03-04, TC-03-05 | Reopen/edit persistence, registration toggles, ownership/state and real calendar dates, TC-03-06 | **Not executed** / Not recorded |
| S3-T07 | KAN-60: AC1, AC2, AC3, AC4, AC5, AC101, AC102, AC103 | TC-04-02, TC-04-03, TC-04-04, TC-04-05, TC-04-06 | Mandatory rejection reason, limits, owner outcome and unchanged initial-decision guards | **Not executed** / Not recorded |
| S3-T08 | KAN-61: AC1, AC2, AC3, AC4, AC5, AC6, AC101, AC102, AC103, AC104 | TC-06-01, TC-06-02, TC-06-03, TC-06-04, TC-06-05, TC-06-06, TC-06-07 | Complete current readiness, authorised confirmation, audit, races and registration independence | **Not executed** / Not recorded |
| S3-T09 | KAN-62: AC1, AC2, AC3, AC4, AC5, AC6, AC101, AC102, AC103, AC104 | TC-06-08, TC-06-09, TC-06-10, TC-06-11, TC-06-12, TC-06-13 | Cancellation authority/reason, atomic resource effects, notifications and retries | **Not executed** / Not recorded |
| S3-T10 | KAN-10: AC1, AC2, AC3, AC4, AC5, AC101, AC102, AC103 | TC-06-14, TC-06-15, TC-06-16, TC-06-17, TC-06-18 | End-time completion, rights, history and once-only release | **Not executed** / Not recorded |
| S3-T11 | KAN-14: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC101, AC102, AC103, AC104 | TC-18-01, TC-18-02, TC-18-03, TC-18-04, TC-18-05, TC-18-06 | Event eligibility, timing/capacity, own status, duplicates, last-place races and privacy | **Not executed** / Not recorded |
| S3-T12 | KAN-17: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC101, AC102, AC103 | TC-18-07, TC-18-08, TC-18-09, TC-18-10, TC-18-11 | Confirmation, cutoffs, re-entry warning, persistent withdrawal and capacity once | **Not executed** / Not recorded |
| S3-T13 | KAN-67: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC101, AC102, AC103 | TC-18-12, TC-18-13, TC-18-14, TC-18-15, TC-18-16, TC-18-17 | Event-specific rosters/counts, limited fields, refresh, reassignment and stale-session protection | **Not executed** / Not recorded |
| S3-T14 | KAN-66: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC101, AC102, AC103 | TC-07-01, TC-07-02, TC-07-03, TC-07-04, TC-07-05 | Role/state/field edit matrix, ordinary/significant boundary and concurrency | **Not executed** / Not recorded |
| S3-T15 | KAN-50: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15, AC16, AC17, AC18, AC19, AC20, AC21, AC101 | TC-08-02, TC-08-03, TC-08-04, TC-08-05, TC-08-06, TC-08-07, TC-08-08, TC-08-09, TC-08-10, TC-08-11, TC-08-12, TC-08-13, TC-08-14 | All catalogue fields, persistence/propagation, access, data validation and stale-save regression | **Not executed** / Not recorded |
| S3-T16 | KAN-12: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15, AC16, AC101, AC102 | TC-10-02, TC-10-03, TC-10-04, TC-10-05, TC-10-06, TC-10-07, TC-10-08, TC-10-09, TC-10-10, TC-10-11, TC-10-12, TC-10-210 | All filters, current results, access, invalid dates, stale response and failed options | **Not executed** / Not recorded |
| S3-T17 | KAN-52: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC101, AC102 | TC-11-02, TC-11-03, TC-11-04, TC-11-05, TC-11-06, TC-11-07, TC-11-205 | Applicable suitability requirements, current context, capacity/capabilities, availability and explicit zero | **Not executed** / Not recorded |
| S3-T18 | KAN-77: AC1, AC2, AC3, AC4, AC5, AC6 | TC-08-15, TC-08-16, TC-08-17, TC-08-18, TC-08-19, TC-08-20 | Authorised bounded durations, additive migration, propagation and field-aware conflicts | **Not executed** / Not recorded |
| S3-T19 | KAN-78: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8 | TC-14-01, TC-14-02, TC-14-03, TC-14-04, TC-14-05, TC-14-06, TC-14-07 | Effective intervals across consumers, boundaries/blocks, existing flags and concurrent writes | **Not executed** / Not recorded |
| S3-T20 | KAN-79: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10 | TC-05-01, TC-05-02, TC-05-03, TC-05-04, TC-05-05, TC-05-06, TC-05-07, TC-05-08, TC-05-09, TC-05-17–28 | Trusted Lead role, unassigned queue, allocation/oversight, preservation and integrated rollout | Automated AC1–8/local AC10 pass: AUTO-20261019-01; AC9 and hosted checks **Not executed**; acceptance **Not assessed** |
| S3-T21 | KAN-65: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC101, AC102, AC103, AC104 | TC-05-10, TC-05-11, TC-05-12, TC-05-13, TC-05-14, TC-05-15, TC-05-16 | Lead handover, eligible targets/states, current permissions, audit, no-op and races | **Not executed** / Not recorded |
| S3-T22 | KAN-64: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC101, AC102, AC103, AC104, AC105, AC106 | TC-20-01, TC-20-02, TC-20-03, TC-20-04, TC-20-05, TC-20-06, TC-20-07, TC-20-08, TC-20-09, TC-20-10, TC-20-11 | Complete original trigger/recipient matrix, inbox/read state, privacy, rollback and deduplication | **Not executed** / Not recorded |
| S3-T23 | KAN-15: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC101, AC102, AC103, AC104, AC105 | TC-19-01, TC-19-02, TC-19-03, TC-19-04, TC-19-05, TC-19-06, TC-19-07, TC-19-08, TC-19-09 | Owned pending request, review/impact, atomic outcomes, significant fields and cancellation/new-request boundary | **Not executed** / Not recorded |
| S3-T24 | Integrated journey; linked cases in TC-06-19 | TC-06-19 | Real mapped accounts, Lead allocation through planning/registration/change/lifecycle and notifications; unrelated access and refresh | **Not executed** / Not recorded |


</details>

<details>
<summary>Original combined KAN-64 8-SP card and Jira wording, superseded by the explicit split</summary>

### KAN-64 — Notify Relevant Users About Event Workflow Updates

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 8 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S3-T22

**User story:** As a relevant organiser, internal staff member or attendee, I want to receive notifications about significant workflow updates that affect me so that I can understand what happened and take any required action.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-64-AC1** | The relevant organiser is notified when an event request is successfully submitted, clarification or amendment is requested, or the request is approved or rejected. | TC-20-01 |
| **KAN-64-AC2** | Relevant users are notified when a coordinator is assigned or reassigned to their event. | TC-20-02 |
| **KAN-64-AC3** | Relevant internal users receive notifications for venue booking decisions, significant changes affecting arrangements, and equipment confirmation or unavailability. | TC-20-03 |
| **KAN-64-AC4** | Relevant users receive notifications for final event confirmation or cancellation. | TC-20-04 |
| **KAN-64-AC5** | Relevant attendees and authorised event managers receive significant registration or withdrawal updates as appropriate. Registered attendees are notified of event changes that affect them. | TC-20-05 |
| **KAN-64-AC6** | Each notification identifies the correct event, and the correct request or registration where applicable, with enough information to understand the change and any action required. | TC-20-06 |
| **KAN-64-AC7** | Only relevant authorised recipients can access a notification and its protected details. Unrelated events or users do not receive it. | TC-20-07 |
| **KAN-64-AC8** | A notification reflects a successfully recorded business outcome. Failed or rolled-back operations do not produce success notifications. | TC-20-08 |
| **KAN-64-AC9** | The notification channel is a release implementation choice; email is not mandatory. | TC-20-09 |
| **KAN-64-AC101** | Provide an authenticated in-app inbox with read/unread state; email, push and external delivery workers are not required. | TC-20-09 |
| **KAN-64-AC102** | Persist notifications in the business transaction with unique outcome/recipient identifiers; failed outcomes produce none and retried successful outcomes do not duplicate. | TC-20-08 |
| **KAN-64-AC103** | Cover all original trigger groups: request submission/clarification/decision, assignment/reassignment, venue/equipment outcomes, significant changes, final confirmation/cancellation, registration and withdrawal. | TC-20-10 |
| **KAN-64-AC104** | Use the documented trigger/recipient matrix and include requester acknowledgements even where the actor is a recipient; do not apply a blanket actor-exclusion rule. | TC-20-11 |
| **KAN-64-AC105** | Recipients may read only their own notifications; linked protected details require current event permissions, including after reassignment. Retain minimal reassignment notices without leaking the newly assigned event's protected information. | TC-20-07 |
| **KAN-64-AC106** | CR-2/CR-4/CR-6 add their new recovery/expiry/safety triggers in their own stories and do not duplicate this story's infrastructure estimate. | TC-20-10 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Full current Jira description, including retained earlier wording</summary>

### User Story

As a relevant organiser, internal staff member or attendee, I want to receive notifications about significant workflow updates that affect me so that I can understand what happened and take any required action.

### Acceptance Criteria

1. The relevant organiser is notified when an event request is successfully submitted, clarification or amendment is requested, or the request is approved or rejected.
2. Relevant users are notified when a coordinator is assigned or reassigned to their event.
3. Relevant internal users receive notifications for venue booking decisions, significant changes affecting arrangements, and equipment confirmation or unavailability.
4. Relevant users receive notifications for final event confirmation or cancellation.
5. Relevant attendees and authorised event managers receive significant registration or withdrawal updates as appropriate. Registered attendees are notified of event changes that affect them.
6. Each notification identifies the correct event, and the correct request or registration where applicable, with enough information to understand the change and any action required.
7. Only relevant authorised recipients can access a notification and its protected details. Unrelated events or users do not receive it.
8. A notification reflects a successfully recorded business outcome. Failed or rolled-back operations do not produce success notifications.
9. The notification channel is a release implementation choice; email is not mandatory.

### Delivery tasks and refinement

Break implementation and tests into event-request updates, internal planning updates and registration updates. These are three trigger groups within this story, not three additional pointed stories. Reuse notification behaviour required by KAN-15, KAN-26 and other workflow stories.

Before estimation, agree a trigger/recipient/channel matrix, delivery and retry behaviour, duplicate handling, retention and read-state needs. Inspect existing in-app notifications and test actual coverage rather than assuming completion from code presence. Changes in recipient assignment must not leak protected event information.

Refined 21 September 2026. Unestimated future backlog outside Sprint 2’s 43-point commitment.

### Sprint 3 selected scope and verification

Owner: Irfan. Independent reviewer: Ernest. Selected estimate: 8 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-64-AC101:** Provide an authenticated in-app inbox with read/unread state; email, push and external delivery workers are not required.
* **KAN-64-AC102:** Persist notifications in the business transaction with unique outcome/recipient identifiers; failed outcomes produce none and retried successful outcomes do not duplicate.
* **KAN-64-AC103:** Cover all original trigger groups: request submission/clarification/decision, assignment/reassignment, venue/equipment outcomes, significant changes, final confirmation/cancellation, registration and withdrawal.
* **KAN-64-AC104:** Use the documented trigger/recipient matrix and include requester acknowledgements even where the actor is a recipient; do not apply a blanket actor-exclusion rule.
* **KAN-64-AC105:** Recipients may read only their own notifications; linked protected details require current event permissions, including after reassignment. Retain minimal reassignment notices without leaking the newly assigned event's protected information.
* **KAN-64-AC106:** CR-2/CR-4/CR-6 add their new recovery/expiry/safety triggers in their own stories and do not duplicate this story's infrastructure estimate.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are implementation defaults, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

</details>

## Superseded initial proposal retained for history


The following 84-SP proposal preceded the selected full-point carry-over decision. Its To agree wording and proposal labels are historical and do not override the current 63-SP selected cards above (the intervening 97-SP snapshot is also superseded). Its never-executed workflow-group labels are displayed as **S3-PROP-T01–T10** here to distinguish them from the selected per-story S3-T01–T23 plan. No executed evidence relied on those proposal IDs.

<details>
<summary>Initial scope and candidate cards</summary>

One card per committed story. Jira is the source of truth for wording; keep this copy in sync. New edge cases found while building become new ACs here **and** on the Jira card.

**Commitment: To agree.** Confirmed on 16 October that the 4 October planning did not finalise scope and requested the broad proposal below. It was prepared on **16 October 2026**, not a reconstructed 4 October selection; preparation method is recorded centrally. Owners, reviewers, estimates and classification remain **To agree**. Existing Jira story wording was read on 16 October; concise summaries here do not replace the live criteria or the retained [portable descriptions](../../submission/1/jira-backlog-2026-10-15.csv). Copy agreed numbered ACs into committed cards once selection and changes are confirmed.

## Proposed existing backlog — 16 October

| Jira | Existing user story, summarised for selection | Proposed SP |
| --- | --- | ---: |
| [KAN-18](https://smu-g7-grp1.atlassian.net/browse/KAN-18) | As Technical Support Staff, I want to record equipment's operational availability so unavailable equipment is excluded from use. | 3 |
| [KAN-9](https://smu-g7-grp1.atlassian.net/browse/KAN-9) | As Technical Support Staff, I want to check equipment type and quantity against the event period so I can identify fulfilment or specific shortfalls. | 8 |
| [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | As a coordinator, I want to submit equipment needs for staff review so suitable arrangements can be made for my event. | 5 |
| [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | As Technical Support Staff, I want to reserve equipment for an event so quantities are secured without over-allocation. | 3 |
| [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) | As a coordinator, I want to confirm an event once required arrangements are ready so the organiser knows it can proceed. | 3 |
| [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | As an authorised event manager, I want to cancel an eligible event and release arrangements so obsolete commitments do not remain. | 5 |
| [KAN-10](https://smu-g7-grp1.atlassian.net/browse/KAN-10) | As a coordinator, I want to complete an eligible event so its final state is recorded and reserved equipment released. | 3 |
| [KAN-14](https://smu-g7-grp1.atlassian.net/browse/KAN-14) | As an attendee, I want to register for an eligible event so I can secure a place and see my registration status. | 5 |
| [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) | As an attendee, I want to withdraw my registration so the place becomes available again. | 2 |
| [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | As an organiser or coordinator, I want to view permitted registrations for my event so I can understand current attendance registrations. | 2 |
| [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | As an authorised user, I want to update permitted event information during planning so the record stays accurate without bypassing arrangement controls. | 3 |
| [KAN-15](https://smu-g7-grp1.atlassian.net/browse/KAN-15) | As an organiser, I want to request changes and receive my coordinator's decision so event information and arrangements remain consistent. | 5, proposed from current 2 |
| [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) | As a relevant user, I want notifications of saved workflow updates affecting me so I know what happened and what action to take. | 8 |
| [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) | As an authorised internal user, I want to reassign an event so responsibility can change. Proposed CR-5 refinement: the authorised user is the Coordinator Lead. | 3 |
| [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) / KAN-36 repair | Existing corrective task: require and retain a rejection explanation for the relevant organiser, while approval may omit a reason. Reconcile one tracking path before implementation. | 2 |

**Subtotal: 60 proposed SP across 14 stories and one corrective task.** Proposed estimates and scope refinements have not been written to Jira. KAN-64 must deliver all its original trigger groups before it is Done; a shared inbox/service alone is insufficient. KAN-26 includes automatic release on cancellation/completion and the coordinator notification, so its acceptance depends on working integration with KAN-62/KAN-10/KAN-64. KAN-63's accepted arrangements integrate with real reservations rather than a stubbed success.

## Proposed repairs to existing stories

| Original story | Repair outcome | Proposed repair SP | Existing audit case |
| --- | --- | ---: | --- |
| KAN-50 | A delayed response for venue A cannot replace venue B's editor or redirect its next save | 2 | TC-08-01 |
| KAN-6 | Both submission entry points show useful field feedback and preserve invalid drafts | 1 | TC-02-01 |
| KAN-34 | Impossible calendar dates produce input errors rather than database failures, preserving the draft | 1 | TC-03-01 |
| KAN-12 | Impossible search dates are refused rather than normalised to another day | 1 | TC-10-01 |
| KAN-52 | Zero attendance is assessed consistently with the accepted submission rule, separately from missing attendance | 1 | TC-11-01 |

**Subtotal: 6 proposed repair SP.** Preserve original estimates and history. Reopen accepted stories under the team's defect workflow after confirming the original criterion and disposition. KAN-60/KAN-36 is already included in the preceding table and is not counted again here. Existing failed runs remain failed records until a new, separately dated run verifies a fix.

## Proposed new stories — 16 October

The three labels below identify proposals only; Jira keys, owners and reviewers are **To agree**. Classification as linked new/replacement requirements requires team confirmation. Source: [Week 7 change register](../../requirements/change-requests.md), CR-1 and CR-5. Candidate ACs are not represented as already-agreed Jira criteria.

### CR1-A — Maintain venue setup and turnaround durations — proposed 2 SP

**User story:** As Venue Staff, I want to configure the setup and turnaround time for a venue so that its occupied time reflects preparation and reset needs.

**Candidate acceptance criteria:**

1. Authorised Venue Staff can view and edit both durations for the correct venue through the catalogue interface.
2. Valid changes persist and remain visible after refresh; they do not change another venue or the event's advertised start/end.
3. Invalid duration input is refused with field feedback and no partial save. Proposed format: nonnegative whole minutes; maximum values remain To agree.
4. Unauthorised users cannot change durations through the UI or direct API calls.
5. Existing venues migrate using an agreed default (proposed zero); existing bookings and their history are retained.
6. The values are consumed by CR1-B; configuration alone is not evidence that the complete buffered-booking requirement is delivered.

**Dependencies/design:** new numbered migration and catalogue/API/diagram updates; coordinate with the KAN-50 stale-save repair. Acceptance includes validation, permissions, persistence and cross-venue isolation.

### CR1-B — Apply buffered venue availability and conflict checks — proposed 8 SP

**User story:** As an Event Coordinator or Venue Staff member, I want venue availability and booking checks to include setup and turnaround time so that event arrangements do not overlap during preparation or reset.

**Candidate acceptance criteria:**

1. Occupied time is event/booking start minus setup through end plus turnaround; 10:00–12:00 with 30/45-minute buffers occupies 09:30–12:45.
2. Calendar, search, suitability, booking submission and approval use the same effective interval; operational unavailability is considered consistently. Actual event times remain unchanged.
3. An overlapping confirmed commitment or operational block is not offered/approved as freely available; current data is rechecked during the relevant write transaction.
4. Boundary rules are agreed and tested. Proposed half-open intervals allow exact adjacency after buffers are applied, not adjacency of the unbuffered event times.
5. Updating buffer configuration identifies existing bookings that now conflict, preserving their records and flagging the affected arrangements without silent cancellation.
6. Concurrent submissions/approvals and buffer edits cannot bypass the agreed conflict rules; failures leave saved records consistent.
7. Existing permissions, event/venue associations and unrelated bookings remain protected.

**Dependencies/design:** CR1-A, one shared effective-interval policy, protected existing-booking impact view and cross-workflow regressions. Agree whether existing bookings use current or snapshotted buffer values and the operational-hours rule before implementation. CR-4's expiring holds are later work, not claimed here.

### CR5-A — Lead-controlled assignment queue and initial allocation — proposed 8 SP

**User story:** As an Event Coordinator Lead, I want to review an unassigned event queue and allocate requests to coordinators so that internal responsibility is deliberately assigned and can be supervised.

**Candidate acceptance criteria:**

1. The new Lead role has protected navigation and server-enforced permissions; other roles cannot perform Lead-only allocation.
2. Valid new submission records the request as submitted and unassigned, with organiser data preserved. It does not apply KAN-29's superseded automatic initial allocation rule.
3. The Lead can inspect the queue's basic event information and assign an eligible coordinator; the correct event has exactly one current coordinator.
4. The assigned coordinator gains the appropriate event access, while unrelated coordinators cannot manage it. Initial allocation does not approve/reject the event.
5. The Lead can oversee assignments and active events within an agreed scope; assignment actor/time are recorded and survive refresh.
6. Initial allocation notifies the relevant users through KAN-64. Failed or conflicting allocation does not publish a false success; concurrent allocation cannot silently replace a newer assignment.
7. Existing assignments are handled by an agreed migration policy (proposed preservation). Submission is not switched to an unassigned queue until the complete Lead allocation path is usable.
8. Reassignment is delivered once through KAN-65 with the new Lead authority; previous assignment-derived permissions are revoked and event data, decisions and arrangements are retained.

**Dependencies/design:** role provisioning, submission/authentication changes, queue/oversight UI, assignment auditing, KAN-65 and KAN-64. Preserve historical KAN-29 evidence. The new story estimates initial allocation/role/queue/oversight; reassignment and shared notification infrastructure are already estimated in their existing stories.

**Proposed Sprint 3 total: 60 + 6 + 2 + 8 + 8 = 84 SP.** See [planning](planning.md#proposed-scope-and-release-split--16-october) for workstreams and [estimation](estimation-and-capacity.md#story-estimates-and-rationale) for proposed versus current values. No selection or points are final until the team agrees.

## Acceptance test plan

The rows below are proposed workflow groups, all **Not executed** for this scope. Expand into AC-linked functional test cases and concrete test files during story implementation. Historical checks do not prove the replacement Lead policy or buffered intervals.

| Test | Story / ACs | Scenario (normal / boundary / conflict / failure) | Level | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| S3-PROP-T01 | KAN-50, KAN-6, KAN-34, KAN-12, KAN-52 repairs | Reproduce each failure, fix it and check unchanged/invalid/racing paths | component/API/integration/e2e | Not executed | New run required; retain AUTO-20261015-01 failures |
| S3-PROP-T02 | KAN-60 / KAN-36 repair | Blank rejection reasons refused; valid rejection persists; approval remains optional; permissions intact | unit/API/component/e2e | Not executed | Not recorded |
| S3-PROP-T03 | CR1-A / CR1-B | Buffer persistence, zero/invalid values, effective boundaries, operational blocks, existing-booking flags and concurrent writes | unit/integration/component/e2e | Not executed | Not recorded |
| S3-PROP-T04 | KAN-18, KAN-9, KAN-63, KAN-26 | Unavailable/overlapping stock, shortfalls, review/reserve flow, concurrent reservations and correct event association | unit/integration/e2e | Not executed | Not recorded |
| S3-PROP-T05 | KAN-61, KAN-62, KAN-10 | Readiness, authorised transitions and exactly-once arrangement release after cancellation/completion | API/integration/e2e | Not executed | Not recorded |
| S3-PROP-T06 | KAN-14, KAN-17, KAN-67 | Registration eligibility/capacity, duplicate/racing requests, withdrawal and protected manager views | API/integration/e2e | Not executed | Not recorded |
| S3-PROP-T07 | KAN-15, KAN-66 | Ordinary edits versus reviewed changes; invalid/unauthorised actions and affected-arrangement handling | API/integration/e2e | Not executed | Not recorded |
| S3-PROP-T08 | CR5-A, KAN-65 | Unassigned submission, Lead allocation/reassignment, race handling, access revocation and preserved event data | API/integration/e2e | Not executed | Not recorded |
| S3-PROP-T09 | KAN-64 and all trigger-owning stories | Original trigger matrix, correct recipients, no unrelated-user access or false notification after rollback | unit/integration/e2e | Not executed | Not recorded |
| S3-PROP-T10 | Combined release journey | Hosted login → submit → Lead assignment → review → venue/equipment planning → confirm → register/change/withdraw → complete/cancel | manual hosted/e2e | Not executed | Actual accounts, build and outcomes required |

</details>
