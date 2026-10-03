# Sprint 2 backlog and acceptance test plan

The confirmed baseline is **12 PBIs and 43 points: nine new stories at 35 points plus three carried stories at their original 8 points**. Tristan owns KAN-29 (3 points) in this repository plan as of 28 September; the other eight new-story owners and all reviewers remain pending. No live Jira assignment change or recheck is claimed. Implementation presence, a merge and an existing test file do not establish Sprint 2 acceptance.

The nine new story cards retain the detailed planning version and stable `KAN-<story>-AC<number>` references. The pre-edit export contained **77 criteria**, compared with **93 planning criteria** below. The missing correctness checks in six shorter cards and the customer-rule refinements were added to live Jira on 21 September. Preserve these repository IDs and historical test references; use the [applied-change record](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied) for the current Jira work and remaining decisions. Customer rules and meeting refinements are recorded separately; technical tasks and additional robustness checks remain proposed delivery work.

## Committed backlog

| Jira item | Story | Priority / origin | Points | Sprint 2 owner / reviewer | Acceptance position |
| --- | --- | --- | ---: | --- | --- |
| KAN-29 | Automatically Assign Event Coordinator | Must / new | 3 | Tristan / To agree | Branch implementation and local automated checks; migration 006 applied and shared schema verified on 30 September; policy acceptance, coordinator opt-in, hosted manual checks, CI and peer review pending |
| KAN-50 | Maintain Venue Catalogue | Must / new | 5 | To agree / To agree | Tables retained; services/UI to implement and validate after the 26 September removal |
| KAN-51 | View Venue Availability Calendar | Must / new | 5 | To agree / To agree | Three internal roles specified; services/UI to implement and verify |
| KAN-12 | Search and Filter Venues | Must / new | 5 | To agree / To agree | Services/UI to implement and validate |
| KAN-52 | Check Venue Suitability | Must / new | 3 | To agree / To agree | Matching and warning policy to agree; services/UI to implement |
| KAN-53 | Submit Venue Booking Request | Must / new | 3 | To agree / To agree | Eligible event states to agree; services/UI to implement |
| KAN-8 | Approve or Reject Venue Booking Request | Must / new | 3 | To agree / To agree | Services/UI to implement and validate |
| KAN-54 | Detect Venue Booking Conflicts | Must / new | 5 | To agree / To agree | Database integrity guards retained; service/UI conflict handling and integrated validation pending |
| KAN-55 | Block Venue for Operational Unavailability | Supporting / new | 3 | To agree / To agree | Tables retained; service/UI block workflow to implement and validate |
| KAN-6 | Submit Event Request | Carry-over | 3 | Kai Jie / To agree | KAN-58 / S1-DEF-03 and KAN-59 / S1-DEF-04 require reproduction, repair and regression evidence |
| KAN-33 | View Submitted Event Request | Carry-over | 2 | Irfan / To agree | KAN-56 / S1-DEF-02 requires reproduction, navigation repair and regression evidence |
| KAN-34 | Resume/Edit Draft Event Request | Carry-over | 3 | Kai Jie / To agree | KAN-57 / S1-DEF-01 requires reproduction, form consistency and regression evidence |
| **Total** | **12 PBIs** | **35 new + 8 carried** | **43** | | **No Sprint 2 acceptance outcome recorded** |

The four corrective subtasks are included in their parents' retained estimates. KAN-60–KAN-67 are future-backlog work and are not part of this commitment.

## Story cards

The acceptance criteria below are the detailed planning criteria for the nine new stories. Tristan has taken up KAN-29; other new-story owners and reviewers remain to be agreed. The 21 September Jira snapshot retains Kai Jie on KAN-6/KAN-34 and Irfan on KAN-33. Proposed implementation work does not add points.

**Historical venue implementation references:** the venue task rows and robustness notes below preserve the 21 September planning inspection. `main` commit `dff42ed` removed those services, UI and tests on 26 September; their named files are historical references, not current implementation or test evidence. Migration tables and integrity guards remain. Rework those tasks against the retained schema when implementing the venue stories; the 93 acceptance criteria remain unchanged.

**Customer-rule refinements:** Coordinator availability may be preconfigured. No turnover buffer is required. Venue-booking submission must be refused for an already reserved period, in addition to approval-time conflict protection. Submission validation must require event date and attendance while allowing None / Not Required for inapplicable optional needs. These rules are now recorded in the affected Jira cards. Retain the [remaining questions](planning.md#dependencies-and-open-decisions), including pending/tentative reservations and new operational blocks over existing bookings.

### KAN-29 — Automatically Assign Event Coordinator

As an Event Organiser, I want my submitted event request to be automatically assigned to an available Event Coordinator so that there is a clear internal staff member responsible for coordinating my event.

**Owner / proposed reviewer:** Tristan / To agree. Repository allocation recorded 28 September; live Jira assignment not changed or verified here.

**Acceptance criteria (planning version)**

Ensure that:

- **KAN-29-AC1:** When an Event Organiser successfully submits an event request, the system automatically assigns an available Event Coordinator.
- **KAN-29-AC2:** An event is assigned to only one Event Coordinator at a time.
- **KAN-29-AC3:** The assigned Event Coordinator is recorded against the correct event.
- **KAN-29-AC4:** The assigned Event Coordinator can view the event request they have been assigned.
- **KAN-29-AC5:** No manual administrator action is required for the initial assignment.
- **KAN-29-AC6:** Automatic assignment does not approve or reject the event request.
- **KAN-29-AC7:** The assignment remains in place unless the Event Coordinator is subsequently reassigned.

**Assignment rule:** Filter to available Event Coordinators → assign the coordinator with the fewest active events → if tied, choose the first by a consistent ID/order.

The selection rule is agreed and availability may be preconfigured. On 28 September the branch implements `app_users.coordinator_available` with default `false` and explicit opt-in for provisioned coordinators. Active workload counts `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED`; the lowest count wins, then ascending application-profile UUID. No eligible coordinator returns `409 NO_AVAILABLE_COORDINATOR` with the saved draft unchanged and editable for retry. No availability-management UI is added. These detailed choices await team/customer acceptance; they are not newly recorded meeting decisions.

Submission and one automatic assignment commit together without a review decision. Automatic history uses `assignmentMethod: 'AUTOMATIC'` and null assigning-actor fields. A preassigned draft returns `409 DRAFT_ALREADY_ASSIGNED` without replacing its existing data; repeated submission cannot allocate again. **30 September schema follow-up:** Tristan has applied migration 006 to shared Supabase. [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirms its fields and constraint, with all six current migration checksums matching hosted history through the recognised filename aliases. Confirm real-coordinator opt-in and follow the [manual checks](../../testing/kan29-manual-checks.md). Hosted manual acceptance, availability-policy acceptance, CI and peer review remain pending.

**Meeting refinement:** Event Coordinators may initially assign an unassigned request to themselves or another coordinator. This complements automatic initial assignment. **30 September scope correction:** replacing an existing coordinator is deferred under KAN-65; handover is removed from the API/UI. This supersedes the earlier branch implementation, not the unchanged KAN-29-AC7 wording.

| Local task | Proposed technical work |
| --- | --- |
| S2-29-01 | Implemented locally: [automatic selection](../../../backend/src/modules/events/automatic-assignment.ts), [submission transaction](../../../backend/src/modules/events/submit-request.ts), [migration 006](../../../database/migrations/006_automatic_coordinator_assignment.sql), UI allocation-error recovery and automatic-history display. [Automatic-assignment tests](../../../database/tests/events/automatic-assignment.integration.test.ts), [submission tests](../../../database/tests/events/submit-request.integration.test.ts) and [manual-assignment regression](../../../database/tests/events/assignment.integration.test.ts) passed 29 + 12 + 10 targeted PostgreSQL checks. See [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment). S2-T01/T02 hosted checks, policy acceptance, CI and peer review remain pending; S2-T23 is not executed. 30 September correction: only initial manual assignment of unassigned requests remains; KAN-65 handover is removed. The linked 28 September test totals are historical. |

### KAN-50 — Maintain Venue Catalogue

As a Venue Staff member, I want to maintain accurate information about ConnectSphere venues so that Event Coordinators and Venue Staff can use reliable venue information when planning events.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

Ensure that Venue Staff can:

- **KAN-50-AC1:** View the venues recorded in the venue catalogue.
- **KAN-50-AC2:** View the current information recorded for a venue.
- **KAN-50-AC3:** Record and update a venue's location.
- **KAN-50-AC4:** Record and update a venue's maximum capacity.
- **KAN-50-AC5:** Record and update the facilities available at a venue.
- **KAN-50-AC6:** Record and update accessibility information for a venue.
- **KAN-50-AC7:** Record and update one or more supported room layouts for a venue.
- **KAN-50-AC8:** Record and update relevant operating information for a venue.
- **KAN-50-AC9:** Save changes made to venue information.

Ensure that:

- **KAN-50-AC10:** Supported room layouts remain associated with the correct venue.
- **KAN-50-AC11:** A venue can support more than one room layout where applicable.
- **KAN-50-AC12:** Updated venue information is displayed when the venue is subsequently viewed.
- **KAN-50-AC13:** Updated venue information is available to the venue search and suitability-checking functionality.
- **KAN-50-AC14:** Users who are not authorised to maintain venue information cannot modify the venue catalogue.

| Local task | Proposed technical work |
| --- | --- |
| S2-50-01 | Inspect `backend/src/modules/venues/venue-input.ts` (historical), `backend/src/modules/venues/venue-service.ts` (historical) and `frontend/src/features/venues/pages/VenueFormPage.vue` (historical); verify viewing and updating the listed venue attributes, multiple layouts, persistence, authorization and propagation to search/suitability. Reuse `database/tests/venues/venue-catalogue.integration.test.ts` (historical) for S2-T03/T04. Venue creation, deletion and inactivation are not explicit criteria for this story; refine any requested extension separately. |

### KAN-51 — View Venue Availability Calendar

As an authorised internal user (Event Coordinator, Venue Staff, Technical Support Staff), I want to view venue availability across relevant dates and times so that I can identify when a venue may be requested.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

- **KAN-51-AC1:** Authorised internal users can view venue availability for relevant dates and times.
- **KAN-51-AC2:** Confirmed venue bookings are reflected as unavailable during the corresponding period.
- **KAN-51-AC3:** Recorded periods of venue unavailability are reflected.
- **KAN-51-AC4:** Available and unavailable periods can be distinguished.
- **KAN-51-AC5:** Availability information corresponds to the correct venue.
- **KAN-51-AC6:** Unauthorised users cannot access protected venue-planning information.

The three internal roles are now explicit in the story. Permitted event labels and block details remain to be clarified; calendar access alone does not grant booking or catalogue-edit permissions.

| Local task | Proposed technical work |
| --- | --- |
| S2-51-01 | Reconcile `backend/src/modules/venues/venues-router.ts` (historical), `backend/src/modules/venues/venue-service.ts` (historical) and `frontend/src/features/venues/pages/VenueDetailPage.vue` (historical). The current API admits authenticated roles beyond the agreed internal group; Technical Support Staff currently receive generic busy details. Replace outdated role expectations in `backend/test/venues/venues-router.test.ts` (historical) and `database/tests/venues/venue-catalogue.integration.test.ts` (historical), and add the `TECHNICAL_SUPPORT_STAFF` case. Run S2-T05/T06. |

### KAN-12 — Search and Filter Venues

As an Event Coordinator, I want to search and filter venues using an event's requirements so that I can efficiently identify potential venues for the event.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

Ensure that the Event Coordinator can search or filter venues using relevant criteria including:

- **KAN-12-AC1:** Proposed event date and time.
- **KAN-12-AC2:** Expected attendance.
- **KAN-12-AC3:** Venue location.
- **KAN-12-AC4:** Venue capacity.
- **KAN-12-AC5:** Accessibility requirements.
- **KAN-12-AC6:** Supported room layout.
- **KAN-12-AC7:** Required facilities.

Ensure that:

- **KAN-12-AC8:** Search results use the current information recorded in the Venue Catalogue.
- **KAN-12-AC9:** Search results correspond to the search and filter criteria selected by the Event Coordinator.
- **KAN-12-AC10:** Venues that do not satisfy a selected filter are not incorrectly presented as satisfying that filter.
- **KAN-12-AC11:** The Event Coordinator can clear or change the selected filters and perform another search.
- **KAN-12-AC12:** Search results identify the corresponding venue clearly.
- **KAN-12-AC13:** Users who are not authorised to perform venue planning cannot access protected venue-search functionality.

| Local task | Proposed technical work |
| --- | --- |
| S2-12-01 | Inspect the `frontend/src/features/venues/pages/VenueCataloguePage.vue` (historical), input parsing and database filters against all seven listed criteria, including expected attendance and location. Reconcile the current all-authenticated catalogue query with the protected venue-planning access requirement. Agree whether event values prefill the search or are entered manually; verify authorization, current catalogue values, combined filters and clear/change behavior with S2-T07/T08 and `database/tests/venues/venue-catalogue.integration.test.ts` (historical). |

### KAN-52 — Check Venue Suitability

As an Event Coordinator, I want to check whether a venue appears suitable for an event so that I can avoid selecting a venue that does not meet important event requirements.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

Ensure that:

- **KAN-52-AC1:** A venue can be assessed using the relevant requirements of the selected event.
- **KAN-52-AC2:** A venue is not treated as suitable when the event's expected attendance exceeds the venue's maximum capacity.
- **KAN-52-AC3:** A venue is not treated as suitable when a required facility is unavailable at that venue.
- **KAN-52-AC4:** Accessibility requirements are considered when determining suitability where applicable.
- **KAN-52-AC5:** Required room layouts are considered when determining suitability where applicable.
- **KAN-52-AC6:** The venue's availability for the event's proposed date and time is considered when determining suitability.
- **KAN-52-AC7:** The Event Coordinator can identify which relevant requirement caused a venue to be considered unsuitable.
- **KAN-52-AC8:** A venue that satisfies the applicable checked requirements is not incorrectly marked unsuitable.
- **KAN-52-AC9:** Suitability checking uses the latest relevant event and venue information.

| Local task | Proposed technical work |
| --- | --- |
| S2-52-01 | Inspect `backend/src/modules/venues/suitability.ts` (historical), `backend/src/modules/venues/event-access.ts` (historical) and `frontend/src/features/venues/components/VenueBookingPanel.vue` (historical). Add the missing facility and room-layout comparisons, and match applicable accessibility requirements rather than treating any accessibility provision as sufficient. Verify capacity and availability checks; resolve structured requirement matching and whether an unsuitable result warns or blocks later actions. Run S2-T09/T10 using `backend/test/venues/suitability.test.ts` (historical) and catalogue integration coverage as starting points. |

### KAN-53 — Submit Venue Booking Request

As an Event Coordinator, I want to submit a venue booking request for an event so that Venue Staff can assess whether the requested venue can be made available.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

Ensure that the Event Coordinator can:

- **KAN-53-AC1:** Select a venue for an event that they are authorised to coordinate.
- **KAN-53-AC2:** Create a venue booking request for the selected venue.
- **KAN-53-AC3:** Include the relevant event date and time in the booking request.
- **KAN-53-AC4:** Include relevant venue requirements required by Venue Staff to assess the booking.
- **KAN-53-AC5:** Submit the venue booking request for review.

Ensure that:

- **KAN-53-AC6:** The booking request remains associated with the correct event.
- **KAN-53-AC7:** The booking request remains associated with the correct venue.
- **KAN-53-AC8:** A successfully submitted booking request becomes available to the appropriate Venue Staff for review.
- **KAN-53-AC9:** Submitting a venue booking request does not automatically approve the booking.
- **KAN-53-AC10:** A submitted booking request can be distinguished from an approved or rejected booking.
- **KAN-53-AC11:** Users who are not authorised to coordinate the event cannot submit a venue booking request for it.

| Local task | Proposed technical work |
| --- | --- |
| S2-53-01 | Inspect `backend/src/modules/venues/booking-service.ts` (historical), `backend/src/modules/venues/booking-input.ts` (historical) and the booking panel. Trace relevant event venue requirements and accessibility needs through the request and staff review view, alongside the existing layout/notes; agree whether staff assess a submitted snapshot or the latest event requirements. Confirm eligible event states and close integration gaps. Run S2-T11/T12 with `backend/test/venues/venue-bookings-router.test.ts` (historical) and `database/tests/venues/venue-bookings.integration.test.ts` (historical). |

### KAN-8 — Approve or Reject Venue Booking Request

As a Venue Staff member, I want to approve or reject a pending venue booking request so that venue usage can be managed appropriately.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

Ensure that Venue Staff can:

- **KAN-8-AC1:** View pending venue booking requests that they are authorised to review.
- **KAN-8-AC2:** Open a pending booking request and view the relevant event timing and venue requirements.
- **KAN-8-AC3:** Approve a pending venue booking request.
- **KAN-8-AC4:** Reject a pending venue booking request.
- **KAN-8-AC5:** Provide relevant information or a reason when rejecting a booking request.

Ensure that:

- **KAN-8-AC6:** The approval or rejection decision is recorded against the correct booking request.
- **KAN-8-AC7:** The Event Coordinator can view the booking decision.
- **KAN-8-AC8:** An approved venue booking remains associated with the corresponding event and venue.
- **KAN-8-AC9:** An approved venue booking affects the venue's availability for the corresponding period.
- **KAN-8-AC10:** A rejected booking is not treated as a confirmed venue booking.
- **KAN-8-AC11:** Users who are not authorised as Venue Staff cannot approve or reject venue booking requests.

| Local task | Proposed technical work |
| --- | --- |
| S2-8-01 | Inspect `frontend/src/features/venues/pages/VenueBookingQueuePage.vue` (historical) and `backend/src/modules/venues/booking-service.ts` (historical); verify the ability to provide relevant information or a reason on rejection, staff review access and event/coordinator visibility. Whether a non-empty rejection reason is mandatory remains a refinement question. Run S2-T13/T14, then calendar/conflict regression, using booking HTTP and persistence tests. |

### KAN-54 — Detect Venue Booking Conflicts

As an Event Coordinator or Venue Staff member, I want conflicting venue bookings to be identified so that the same venue is not inappropriately booked for overlapping events.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

Ensure that:

- **KAN-54-AC1:** Existing confirmed bookings for a venue are considered when another booking request for that venue is assessed.
- **KAN-54-AC2:** Two bookings for the same venue with incompatible overlapping periods are identified as conflicting.
- **KAN-54-AC3:** A booking for a different venue is not incorrectly treated as conflicting solely because its time overlaps.
- **KAN-54-AC4:** A non-overlapping booking for the same venue is not incorrectly identified as conflicting.
- **KAN-54-AC5:** Recorded operational-unavailability periods are considered when assessing whether a venue can be booked.
- **KAN-54-AC6:** A venue with a confirmed booking is not treated as freely available during the conflicting booking period.
- **KAN-54-AC7:** A venue booking that would create an inappropriate conflict cannot be confirmed.
- **KAN-54-AC8:** The relevant user is informed when a booking cannot proceed because of a detected conflict.
- **KAN-54-AC9:** Conflict detection uses the latest confirmed booking and venue-unavailability information.

**Example scenario**

> Given Venue A has a confirmed booking for an existing event,
> When another booking for Venue A is requested for an incompatible overlapping period,
> Then the system identifies the conflict and prevents the second booking from being confirmed.

| Local task | Proposed technical work |
| --- | --- |
| S2-54-01 | Inspect `backend/src/modules/venues/booking-service.ts` (historical), related [database migrations](../../../database/migrations/) and existing overlap/transaction coverage. Agree the interval and status policy, then run S2-T15/T16 against PostgreSQL and through the UI. `database/tests/venues/venue-bookings.integration.test.ts` (historical) already contain simultaneous-approval scenarios; results for the reviewed build still need to be recorded. |

### KAN-55 — Block Venue for Operational Unavailability

As a Venue Staff member, I want to block a venue for a period when it is operationally unavailable so that Event Coordinators do not incorrectly treat the venue as available for event use.

**Owner / proposed reviewer:** To agree / To agree.

**Acceptance criteria (planning version)**

Ensure that Venue Staff can:

- **KAN-55-AC1:** Select a venue that needs to be made unavailable.
- **KAN-55-AC2:** Specify the date of the venue-unavailability period.
- **KAN-55-AC3:** Specify the start and end time of the venue-unavailability period.
- **KAN-55-AC4:** Record an appropriate reason for the venue being unavailable.
- **KAN-55-AC5:** Record unavailability for reasons such as maintenance, renovation, safety restrictions, internal activities, or other operational reasons.
- **KAN-55-AC6:** Save the venue-unavailability period.

Ensure that:

- **KAN-55-AC7:** The blocked period remains associated with the correct venue.
- **KAN-55-AC8:** The venue is shown as unavailable in the Venue Availability Calendar during the blocked period.
- **KAN-55-AC9:** The venue is not treated as available when searching for venues for an overlapping event period.
- **KAN-55-AC10:** The venue is not treated as suitable for an event whose required date and time conflicts with the blocked period.
- **KAN-55-AC11:** A venue booking cannot be confirmed for a period that conflicts with the recorded venue block.
- **KAN-55-AC12:** The venue remains available outside the recorded blocked period where no other booking or unavailability applies.
- **KAN-55-AC13:** Users who are not authorised as Venue Staff cannot create venue-unavailability blocks.

| Local task | Proposed technical work |
| --- | --- |
| S2-55-01 | Inspect block/unblock operations in `backend/src/modules/venues/venue-service.ts` (historical) and the venue detail UI; confirm conflict/removal policy and run S2-T17/T18. Reuse catalogue integration tests, including block-versus-booking conflict cases. |

## Proposed additional robustness checks

These checks support implementation quality and need refinement where behavior is unspecified. They are not additional Jira acceptance criteria and do not change the story estimates. The acceptance test plan distinguishes these proposals from tests of the criteria above.

| Story | Proposed check or unresolved policy |
| --- | --- |
| KAN-29 | Local automation covers the implemented opt-in availability, active statuses, UUID tie-break, no-eligible rollback, retries, write failures and concurrent submissions. Accept the detailed policy and complete hosted verification. Regression checks preserve initial manual assignment and refuse replacement of an existing coordinator. KAN-65 handover implementation is removed; its future refinement stays separate. |
| KAN-50 | Invalid capacity/operating values, duplicate venue naming and failed-save recovery. Creation, deletion and inactivation require separate scope clarification if requested. |
| KAN-51 | Interval endpoints, Singapore-time conversion, pending-request display, role-specific labels and loading/error recovery. Confirm how the Jira term confirmed booking maps to the implemented booking status. |
| KAN-12 | Invalid or incomplete filters, empty results, exact capacity/time boundaries and stale-result recovery. Define how expected attendance differs from a venue-capacity filter and how selected filters combine. |
| KAN-52 | Define structured facility/layout/accessibility matching, handling of missing event requirements, and warning versus blocking effects on booking. Opening-hour and inactive-state checks already in code are additional behavior to review. |
| KAN-53 | Eligible event states, duplicate/repeated requests, failed-save recovery, forged identity/status and concurrent submission. Clarify the venue requirements needed for staff assessment. |
| KAN-8 | Whether rejection requires non-empty information/reason, repeated or simultaneous decisions, changed event eligibility and failure recovery. |
| KAN-54 | Document incompatible overlap and adjacency without turnover buffers, and define transactional behavior for competing approvals or block creation. Clarify pending-request warnings and cancelled/rejected booking treatment. |
| KAN-55 | Invalid periods, a new block overlapping an already-confirmed booking, concurrent block/approval, and any amendment/removal behavior. Verify reason handling for operational categories and authorization on retained removal functionality. |

## Carry-over repair criteria and tasks

The [Sprint 1 review defect register](../sprint-01/review.md#review-defects-and-carry-over) holds the reported observations. The successful Sprint 1 DEMO-03/04/05 paths remain recorded; these defects concern additional paths and require reproduction. Their Jira subtasks are **S1-DEF-01 → KAN-57; S1-DEF-02 → KAN-56; S1-DEF-03 → KAN-58; S1-DEF-04 → KAN-59**. Existing KAN-34-AC1–KAN-34-AC3, KAN-6-AC1–KAN-6-AC4 and applicable KAN-33 criteria retain their [Sprint 1 definitions](../sprint-01/sprint-backlog.md#story-cards); KAN-33-AC5 remains superseded. The repair refinements below do not renumber those criteria.

| Story / defect | Proposed acceptance criteria for the repair | Proposed implementation and verification work |
| --- | --- | --- |
| KAN-34 / S1-DEF-01 | Reopen a saved draft with registration disabled, enable registration, and obtain the required capacity and registration-window controls. Save, reload and submit with those settings preserved and validated. Confirm disabling registration clears or ignores dependent settings consistently. | Reproduce the existing-draft path; reconcile [draft editor](../../../frontend/src/features/events/pages/EventDraftEditPage.vue) with [shared event form](../../../frontend/src/features/events/components/EventRequestForm.vue), update semantics and KAN-31/KAN-4 touchpoints. Run S2-T19, then regression on new-request and incomplete-draft saving. |
| KAN-33 / S1-DEF-02 | After approval, the authorized coordinator can discover and reopen the request through a supported UI path, including after reload, to reach the later workflow. Other users remain restricted and an initial review decision cannot be applied again. | Reproduce navigation after approval; inspect [submitted-request query](../../../backend/src/modules/events/submitted-requests.ts), [shared detail](../../../backend/src/modules/events/event-request-detail.ts) and review navigation. The pending queue excludes approved requests while direct detail/status-history support exists; verify the reported discovery path. Run S2-T20. Approval/rejection itself is not reported broken; full final-confirmation acceptance is not added to this carried story. **29 Sept (Irfan):** reproduced on `dff42ed` (queue excludes decided statuses; no UI route back). Repair on `feat/KAN-33-decided-request-access`: coordinator `GET /api/events?scope=history` plus a Decided requests section on `/reviews`; see the [29 September decision](../../requirements/assumptions-and-questions.md#29-september-2026--kan-56-coordinator-decided-request-history). Added checks (also on the KAN-56 Jira card): history also lists CONFIRMED/CANCELLED/COMPLETED requests; it follows the current assignment only (other coordinators' and unassigned requests never listed); organisers are refused `scope=history`; a history load failure does not hide the pending queue. |
| KAN-6 / S1-DEF-03 | A valid saved draft submits successfully from its supported edit path, persists the submitted state and reaches the correct organizer/coordinator views after reload. Failed submission retains the draft and gives an actionable result. | Record exact data, route, role, build and observed failure; inspect draft save-then-submit and [submission service](../../../backend/src/modules/events/submit-request.ts). Run S2-T21 and preserve the previously successful demo path as a regression. |
| KAN-6 / S1-DEF-04 | Missing/blank mandatory fields and invalid required combinations are rejected by UI and direct API without changing the draft to submitted; valid required values permit submission. | Agree the required-field/validation matrix, reproduce the bypass and inspect [submission input](../../../backend/src/modules/events/submit-input.ts) plus shared/draft forms. Run S2-T22, including refresh and server-enforced validation. |

## Acceptance test plan

S2-T01/T02 have local automated coverage recorded in [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment); their hosted portions and policy acceptance remain pending. Other cases below, including the integrated S2-T23, remain **Not executed** in this record. Criterion IDs refer to the unchanged planning version; current Jira wording requires reconciliation. Separately identified customer refinements supplement those references. Retain the actual build/commit, role, synthetic data, environment, steps, expected/actual outcome and artifact for each executed case. Fixture tests and isolated database runs do not replace hosted authentication/UI acceptance.

Criterion ranges include every numbered criterion between their endpoints. A broad test case needs evidence for each listed observation; one successful step does not establish the entire case or story as passed.

| Case | Criteria / refinement | Verification layer | Proposed scenario and expected observation | Status |
| --- | --- | --- | --- | --- |
| S2-T01 | KAN-29-AC1–KAN-29-AC7; assignment rule | Service + database + hosted UI | Submit a valid request with available/unavailable candidates at unequal loads: select the available coordinator with the fewest active events, even if an unavailable coordinator has fewer. Repeat with tied eligible loads and verify the documented consistent ID/order wins. Verify one coordinator on the correct event, assigned-coordinator access, no administrator action, unchanged review outcome and persistence until reassignment. | Local automation covered; hosted checks and policy acceptance pending (AUTO-20260928-01) |
| S2-T02 | KAN-29-AC2, KAN-29-AC7; assignment rule and manual-assignment meeting refinement | Database concurrency + API authorization + UI | Verify one current assignment after automatic or permitted initial manual assignment to self/another coordinator. Refuse handover without changing stored data; KAN-65 is outside the sprint. Proposed robustness: no eligible coordinator, retries, write failures and simultaneous submissions follow explicitly agreed behavior, with consistent workload counts and no duplicate active assignment. | Local automation covered; hosted checks and policy acceptance pending (AUTO-20260928-01) |
| S2-T03 | KAN-50-AC1–KAN-50-AC13 | Database + Venue Staff UI + search/suitability integration | View the catalogue/current venue; update location, capacity, facilities, accessibility, multiple supported layouts and operating information. Save and reopen; verify the right venue retains all values/layouts and search/suitability uses the changes. | Not executed |
| S2-T04 | KAN-50-AC14; proposed validation/failure checks | Input/API + database + UI | Non-maintainer roles cannot modify catalogue information through UI or direct API. Proposed robustness: invalid capacity/hours, duplicate names and save failures produce useful feedback without an unintended stored change. | Not executed |
| S2-T05 | KAN-51-AC1, KAN-51-AC6 | API + hosted sessions/UI | Check all five roles and signed-out access via navigation, direct URL and API; only Event Coordinators, Venue Staff and Technical Support Staff obtain the calendar. Check label/detail visibility after the separate internal-data policy is agreed. | Not executed |
| S2-T06 | KAN-51-AC1–KAN-51-AC5 | Database + UI | View relevant dates/times for two venues; distinguish available and unavailable periods, including confirmed bookings and operational blocks associated with the correct venue. Supporting regression checks cover unaffected periods, refresh after booking/block changes, timezone boundaries and empty/failed-load behavior. | Not executed |
| S2-T07 | KAN-12-AC1–KAN-12-AC10, KAN-12-AC12 | Query integration + coordinator UI | Search/filter by event date/time, expected attendance, location, capacity, accessibility, room layout and facilities individually and in agreed combinations. Confirm current catalogue data, clearly identified venues, matching results and exclusion of venues that fail a selected filter. | Not executed |
| S2-T08 | KAN-12-AC11, KAN-12-AC13; proposed filter validation | Input/API + hosted UI | Change and clear filters, then search again; verify protected venue search is inaccessible to unauthorized users. Proposed robustness: no matches, invalid counts, incomplete/reversed periods and stale-result recovery. | Not executed |
| S2-T09 | KAN-52-AC1–KAN-52-AC8 | Rules + database + API/UI | Assess a selected event against venues that pass all applicable checks and venues that separately fail capacity, required facilities, accessibility, required layout or availability. Each relevant failure prevents a suitable result and identifies its cause; a fitting venue is not wrongly rejected. | Not executed |
| S2-T10 | KAN-52-AC9; proposed missing-input and workflow checks | Integrated UI + persistence | Change relevant event and venue information, including capacity, facilities/layouts and availability, then reassess using current data. Proposed robustness: missing requirements and the agreed warning/blocking effect on booking actions. | Not executed |
| S2-T11 | KAN-53-AC1–KAN-53-AC10 | Database + two-role hosted UI | Coordinator selects a venue for an authorized event, creates a request with event timing and relevant venue requirements, and submits it. Verify correct event/venue associations, visibility to appropriate staff, a distinct submitted status and no automatic approval. | Not executed |
| S2-T12 | KAN-53-AC11; proposed request validation/concurrency | API + database concurrency + UI | Unrelated or unauthorized users cannot submit a booking for the event. Proposed robustness: duplicate/repeated requests, invalid period, ineligible state, forged identity/status and failed/concurrent saves follow agreed rules without invalid or duplicate records. | Not executed |
| S2-T13 | KAN-8-AC1–KAN-8-AC10 | Two-role hosted UI + database | Authorized Venue Staff list/open pending requests with timing and venue requirements; approve one and reject another while providing relevant information/reason. Verify decisions on the correct requests, coordinator visibility, retained event/venue associations, approval blocking the booked period and rejection not becoming a confirmed booking. | Not executed |
| S2-T14 | KAN-8-AC11; proposed decision validation/concurrency | API + database concurrency | Non-Venue Staff cannot approve/reject through UI or API. Proposed robustness: repeated decisions, simultaneous approve/reject, changed event eligibility and mandatory-reason handling, if agreed, preserve a valid outcome. | Not executed |
| S2-T15 | KAN-54-AC1, KAN-54-AC2, KAN-54-AC5–KAN-54-AC9; booking-submission customer rule | PostgreSQL + API/UI; proposed concurrency regression | Attempt submission against an already reserved period: refuse it with useful feedback and no booking request created. Assess the latest confirmed bookings and operational blocks again at approval, preventing incompatible confirmation. Repeat after changing blocking data; proposed robustness includes competing approvals and stale views. | Not executed |
| S2-T16 | KAN-54-AC3, KAN-54-AC4; proposed boundary/status checks | Rules + database | An overlapping booking for another venue and a non-overlapping booking for the same venue are not falsely flagged. No turnover buffer is required. Proposed robustness: documented adjacency, timezone and cancelled/rejected/pending-status rules. | Not executed |
| S2-T17 | KAN-55-AC1–KAN-55-AC12 | Integrated UI + database | Venue Staff select the venue, set the date/start/end and an appropriate reason, and save. Use maintenance, renovation, safety restriction, internal activity and other operational reason fixtures. Verify correct venue association, calendar/search/suitability exclusion and prevented conflicting booking confirmation; unaffected periods remain available absent other conflicts. | Not executed |
| S2-T18 | KAN-55-AC11, KAN-55-AC13; proposed block validation/concurrency | PostgreSQL + API/UI | Non-Venue Staff cannot create a block, and a booking conflicting with a saved block cannot be confirmed. Proposed robustness: simultaneous block/approval, invalid periods, creating a block over an already-confirmed booking and authorized amendment/removal behavior if retained. | Not executed |
| S2-T19 | KAN-34-AC1–KAN-34-AC3; S1-DEF-01 | Hosted UI + direct API persistence | Existing owned draft: No → Yes registration, fill capacity/window, save/reopen/submit; then check Yes → No handling and compare the new-request path. Recheck unauthorized or disallowed-state edits remain denied without stored changes. | Not executed |
| S2-T20 | KAN-33-AC1–KAN-33-AC3; S1-DEF-02 follow-up navigation | Hosted UI + API authorization | Assigned coordinator approves, returns to navigation, reloads and reopens the request through the supported later-workflow path. Pending queue eligibility remains correct, detail data persists and unrelated users remain denied. | Passed 29 Sept: automated layers (AUTO-20260929-01; CI incl. PostgreSQL and browser tests AUTO-20261001-01, PR #21) and hosted walkthrough MAN-20260929-01 (manual repeat-decision 409 inconclusive, covered by automated test) |
| S2-T21 | KAN-6-AC1, KAN-6-AC4; S1-DEF-03 | Hosted UI + database | Save/reopen a complete draft, submit, refresh and inspect organiser/coordinator status; compare the earlier successful demo path. Repeated/competing submission follows the agreed behavior without duplicate effects. Automatic assignment is separately verified by S2-T01. | Not executed |
| S2-T22 | KAN-6-AC2, KAN-6-AC3; S1-DEF-04; submission-field customer rule | Input/API + database + hosted UI | Reject missing date or attendance and each other agreed invalid mandatory/conditional value through UI/API; feedback is actionable and saved data remains Draft. Accept None / Not Required for inapplicable optional needs. Recheck unrelated actors and disallowed source states cannot submit. | Not executed |
| S2-T23 | KAN-6-AC1; KAN-29-AC1, KAN-29-AC4, KAN-29-AC6; assignment rule; KAN-12-AC8, KAN-12-AC9; KAN-52-AC1, KAN-52-AC9; KAN-53-AC5, KAN-53-AC8, KAN-53-AC9; KAN-8-AC3, KAN-8-AC7, KAN-8-AC9; KAN-51-AC2 | Hosted acceptance walkthrough | Repaired draft → submission/automatic assignment without event approval → search/suitability → venue booking request without automatic booking approval → staff approval → coordinator decision visibility and changed calendar availability. Retain evidence across roles and refreshes; verify additional story criteria in their dedicated cases. | Not executed |

Each story closes only when its Jira criteria, recorded refinements, appropriate tests, review, integration and evidence satisfy the [Definition of Done](../definition-of-done.md). Record actual results in [test evidence](../../testing/test-evidence.md) and link them from the [Sprint 2 evidence register](evidence/README.md) and [review](review.md). Proposed checks become acceptance requirements only through an explicit refinement decision.
