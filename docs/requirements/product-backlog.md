# Product backlog

This is the canonical release-scope index and the working acceptance criteria for the future backlog. It covers all 20 core features and the supporting work needed to connect them into an event workflow. A Jira link or an existing implementation does not establish acceptance. Record executed results in the [test evidence](../testing/test-evidence.md) and agreed rule changes in the [decision log](assumptions-and-questions.md).

**Refinement date:** 21 September 2026. Sprint 1 closed with **32 committed points, 24 Done points and 8 carried points**. Sprint 2 retains **12 PBIs / 43 points: 35 new plus 8 carried**. The future stories and corrective task below are outside that commitment. No additional estimate, owner, sprint commitment or completed acceptance test is established by this refinement.

## Release coverage

`CF-01`–`CF-20` are repository traceability identifiers. Each feature maps to a canonical story or a group of complementary stories; overlapping implementation and tests must not be counted as separate delivery.

| ID | Core feature | Canonical stories |
| --- | --- | --- |
| CF-01 | User Authorisation and Authentication | KAN-25; each later story also checks role and event relationship |
| CF-02 | Event Request Creation | KAN-31, KAN-6; corrective subtasks KAN-58/KAN-59 |
| CF-03 | Draft Event Requests | KAN-4, KAN-34; corrective subtask KAN-57 |
| CF-04 | Event Review and Approval | KAN-33, KAN-27, KAN-36; corrective subtask KAN-56 and task KAN-60 |
| CF-05 | Coordinator Assignment | KAN-29; KAN-65 reassignment |
| CF-06 | Event Status Management | KAN-16, KAN-61, KAN-62, KAN-10; submission/review/planning actions own their transitions |
| CF-07 | Event Information Management | KAN-66; KAN-15 handles significant changes |
| CF-08 | Venue Catalogue | KAN-50, including supported layouts |
| CF-09 | Venue Availability Calendar | KAN-51; KAN-55 supplies operational unavailability |
| CF-10 | Venue Search and Filtering | KAN-12 |
| CF-11 | Venue Suitability Checking | KAN-52 |
| CF-12 | Venue Booking Request | KAN-53 |
| CF-13 | Venue Booking Approval | KAN-8 |
| CF-14 | Booking Conflict Detection | KAN-54, with operational-block protection from KAN-55 |
| CF-15 | Equipment Request Management | KAN-63: coordinator request and Technical Support Staff review/update |
| CF-16 | Equipment Availability Checking | KAN-9, KAN-18 |
| CF-17 | Equipment Reservation | KAN-26 |
| CF-18 | Attendee Registration | KAN-14, KAN-17, KAN-67 |
| CF-19 | Event Change Requests | KAN-15; KAN-62 handles cancellation and arrangement release |
| CF-20 | Notification System | KAN-64, integrated with the actions in the other stories |

KAN-24 is the separate database setup item. It supports these features and is not a twenty-first customer feature. KAN-61 confirmation, KAN-62 cancellation and KAN-10 completion provide explicit lifecycle actions; there is no generic story allowing users to select any status arbitrarily.

## Sprint commitments and acceptance

### Sprint 1

The [Sprint 1 backlog](../scrum/sprint-01/sprint-backlog.md) retains the historical story cards, criterion IDs and task allocations. The [review](../scrum/sprint-01/review.md) records acceptance and reported defects.

| Jira item | Story | Points | Sprint 1 result / continuing ownership |
| --- | --- | ---: | --- |
| KAN-25 | User Authorisation and Authentication | 5 | Done — Ryan |
| KAN-31 | Create Event Request | 3 | Done — Ernest |
| KAN-4 | Save Draft Event Request | 3 | Done — Ernest |
| KAN-34 | Resume/Edit Draft Event Request | 3 | Carried to Sprint 2 — Kai Jie |
| KAN-6 | Submit an Event Request | 3 | Carried to Sprint 2 — Kai Jie |
| KAN-33 | View Submitted Event Request | 2 | Carried to Sprint 2 — Irfan |
| KAN-27 | Request Clarification on an Event Request | 3 | Done — Irfan |
| KAN-36 | Approve/Reject Event Request | 3 | Done — Tristan; later reason correction is KAN-60 |
| KAN-16 | View Event Request Status | 2 | Done — Tristan; later lifecycle coverage remains to verify |
| KAN-24 | Setup Database | 5 | Done — Arvin |

Done applies to the accepted Sprint 1 slices. Later clarifications and newly defined workflow criteria do not retrospectively establish a new pass or erase earlier observations.

### Sprint 2

The [Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md) is the detailed authority for its 93 planning criteria, technical tasks and planned cases. Keep those IDs stable when adding dated refinements; the criteria are not duplicated here. The nine new stories total 35 points, and KAN-6/KAN-33/KAN-34 add the carried eight points.

| Jira item | Story | Points |
| --- | --- | ---: |
| KAN-29 | Automatically Assign Event Coordinator | 3 |
| KAN-50 | Maintain Venue Catalogue | 5 |
| KAN-51 | View Venue Availability Calendar | 5 |
| KAN-12 | Search and Filter Venues | 5 |
| KAN-52 | Check Venue Suitability | 3 |
| KAN-53 | Submit Venue Booking Request | 3 |
| KAN-8 | Approve or Reject Venue Booking Request | 3 |
| KAN-54 | Detect Venue Booking Conflicts | 5 |
| KAN-55 | Block Venue for Operational Unavailability | 3 |

KAN-29 uses preconfigured coordinator availability, fewest active events and a consistent ID/order tie-break. Tristan implements this three-point story, the three-point KAN-8 booking decision story and the user-requested three-point KAN-52 suitability story (nine new-story points in total). This records implementation responsibility, not a new Jira assignee change or revised Sprint 2 planning commitment. The [28 September implementation choices](assumptions-and-questions.md#28-september-2026--kan-29-implementation-choices) define an explicit availability flag, counted statuses, UUID ordering and a retryable draft when nobody is available. These defaults await team review; local automated results do not establish hosted acceptance or Jira Done. KAN-51 permits Event Coordinators, Venue Staff and Technical Support Staff. Venue submission must refuse a period already reserved or operationally unavailable, and booking approval must recheck conflicts. Pending holds, interval boundaries and a new operational block overlapping an existing booking remain decisions to settle.

| Corrective subtask | Parent | Scope |
| --- | --- | --- |
| KAN-56 | KAN-33 | Restore authorised coordinator navigation to decided requests and verify access/queue regressions |
| KAN-57 | KAN-34 | Restore conditional registration fields when editing a saved draft; verify both toggle directions and persistence |
| KAN-58 | KAN-6 | Enable and verify saved-draft submission |
| KAN-59 | KAN-6 | Reject incomplete new-request and saved-draft submissions with field errors |

These subtasks are included in the carried parent estimates, not extra story points. Creating the tasks does not establish that the defects are fixed. Tristan's KAN-29/KAN-8 ownership and Ryan's KAN-12 and Ernest's KAN-51 implementations are recorded in the repository plan; remaining allocations, reviewers and live Jira assignments still need confirmation.

## Future backlog and corrective work

The cards below define the remaining scope before selection into a future sprint. Existing estimates shown for older stories were checked in Jira on 21 September and must be reviewed against the refined scope. They are not new estimates or capacity commitments. KAN-60–KAN-67 remain unestimated. The live future backlog contains 15 items: seven older stories with 26 existing points and eight unestimated items. The 26 points are not a complete future-sprint estimate. The refinement questions must be resolved or bounded before a story is considered ready. These working cards summarise the behaviour in Jira; their numbering is not a replacement for the retained sprint criterion IDs.

### KAN-10 — Mark Event as Completed

**User story:** As an Event Coordinator, I want to mark an eligible event as completed so that its final lifecycle state is clear and its equipment reservations are released.

**Existing estimate:** 3 points, to review before selection.

**Acceptance criteria**

1. An authorised coordinator can complete an event that meets the agreed lifecycle rules.
2. Completion records the correct event, actor and time, and persists after refresh.
3. The organiser and relevant internal users can view the completed status.
4. Completion automatically releases the event's equipment reservations without releasing another event's reservations.
5. Repeated, ineligible or unauthorised attempts do not create duplicate resource releases or alter unrelated records.

**Refinement:** Agree eligible prior states, whether the event must have ended and any effects on venue or registration records. Assigned-coordinator access and `CONFIRMED` after the event end are proposals, not settled customer rules.

### KAN-14 — Register for an Event

**User story:** As an Attendee, I want to view an event and register while registration is available so that I can secure a place and see my registration status.

**Existing estimate:** 5 points, to review before selection.

**Acceptance criteria**

1. An attendee can view appropriate event information and registration conditions before submitting a registration.
2. Registration is offered only when enabled for the event, the event is Confirmed, its registration window is open and capacity remains.
3. Valid registration is linked to the correct attendee and event, and provides confirmation.
4. The attendee can view their own saved registration status after refresh.
5. Registration immediately consumes a place; concurrent requests cannot exceed the permitted capacity.
6. Full, disabled, not-yet-open or closed registration is refused with useful feedback and no new active registration.
7. Duplicate active registration does not consume another place or create another active record.
8. Attendees cannot create registrations for another attendee or view another attendee's protected registration information.

**Refinement:** Confirm required attendee fields, registration-period boundaries, duplicate/re-registration behaviour and the final eligibility rules. Confirmed is retained from the existing story; any broader implementation eligibility needs an explicit decision. Withdrawal is KAN-17, organiser/coordinator visibility is KAN-67 and notifications are KAN-64. A waiting list is not a first-release dependency.

### KAN-17 — Withdraw Attendee Registration

**User story:** As an Attendee, I want to withdraw a registration I can no longer use so that I am no longer expected and the place becomes available.

**Existing estimate:** 2 points, to review before selection.

**Acceptance criteria**

1. An attendee can choose one of their own eligible registrations to withdraw.
2. The attendee confirms withdrawal, with any warning about re-registration accurately reflecting the agreed rules.
3. Withdrawal records the correct registration as withdrawn so that it is no longer counted as active.
4. The attendee can view the saved withdrawn status after refresh.
5. An active registration's place is released exactly once; repeated withdrawal cannot incorrectly increase availability.
6. Unauthorised attempts cannot withdraw another attendee's registration.
7. Invalid withdrawal attempts leave the registration unchanged and provide useful feedback.

**Refinement:** Agree withdrawal timing, ineligible-state handling and whether and when re-registration is allowed. KAN-67 provides updated organiser/coordinator visibility; keep notifications in the KAN-64 trigger matrix.

### KAN-18 — Update Equipment Availability Status

**User story:** As a Technical Support Staff member, I want to record equipment that is damaged, under maintenance or otherwise unavailable so that it is not offered for event use.

**Existing estimate:** 3 points, to review before selection.

**Acceptance criteria**

1. Authorised Technical Support Staff can view and update the operational availability of the correct equipment type or quantity.
2. Saved unavailability persists and reduces the quantity treated as available for relevant event periods.
3. Damaged, maintenance and other unavailable equipment is excluded from new availability and reservation decisions.
4. Unauthorised users cannot modify protected equipment availability information.
5. Authorised Technical Support Staff can restore operational availability when the equipment is usable again.

**Refinement:** Agree the operational-status model, whether unavailability has a time range, and the handling/notification of affected reservations. Proposed consistency checks should ensure that an operational change identifies affected reservations, restoring equipment does not erase commitments or count quantity twice, and invalid quantities do not corrupt totals. These additions still need to be adopted in Jira. Individual asset tracking is not implied by the quantity-based model.

### KAN-9 — Check Equipment Availability for an Event

**User story:** As a Technical Support Staff member, I want to check whether sufficient suitable equipment is available for an event's date and time so that I can assess its equipment request.

**Existing estimate:** 8 points, to review before selection.

**Acceptance criteria**

1. Authorised staff can check the requested equipment type and quantity against the correct event period.
2. The check considers quantities reserved for overlapping events and equipment recorded as operationally unavailable.
3. Equipment already committed to an incompatible event is not treated as freely available.
4. Only when all requested items meet demand does the result display a green Fulfillable indicator. Otherwise, Shortfall / Unfulfillable identifies each affected item and its quantity deficit.
5. Non-overlapping reservations do not incorrectly reduce availability for the requested period.
6. Checking availability does not itself reserve equipment, and does not require venue confirmation.
7. Protected availability information is limited to authorised users.

**Refinement:** Agree interval boundaries and reservation states that consume quantities. Availability is checked again when reserving; an earlier positive check is not a guarantee against intervening reservations. Equipment location does not restrict allocation under the recorded rule.

### KAN-26 — Reserve Equipment

**User story:** As a Technical Support Staff member, I want to reserve available equipment for an event so that its quantity remains committed to that event during the required period.

**Existing estimate:** 3 points, to review before selection.

**Acceptance criteria**

1. Authorised staff can reserve a valid equipment type and quantity for the correct event and period during planning.
2. Current availability is checked at reservation; concurrent attempts cannot overcommit equipment.
3. A saved reservation reduces available quantity for overlapping events and remains associated with its event.
4. Venue and equipment arrangements may proceed independently; final venue or event confirmation is not a blanket prerequisite.
5. The relevant coordinator can see the reservation outcome and receive the agreed notification.
6. Cancelling or completing an event releases its equipment reservations automatically and exactly once.
7. Authorised manual adjustments preserve valid quantities and availability; unauthorised or conflicting adjustments leave existing reservations intact.

**Refinement:** Agree eligible event states, partial fulfilment, edit/cancellation permissions and whether accepting an equipment request creates the reservation or precedes a separate action.

### KAN-15 — Submit and Review Event Change Requests

**User story:** As an Event Organiser, I want to request permitted changes to a submitted event and have its coordinator review them so that the event and its arrangements remain consistent.

**Existing estimate:** 2 points, to review before selection against the combined submission/review scope.

**Acceptance criteria**

1. An authorised organiser can submit a change request for their event, linked to the correct event and requested values; there is no general change-request cut-off under the recorded clarification.
2. Submission records a pending request and provides the organiser with acknowledgement through the chosen notification channel. Submitting the request does not itself apply the proposed values or alter existing arrangements.
3. The authorised coordinator can view the requested changes, the current values and the affected event arrangements.
4. The coordinator can record a permitted review outcome; the organiser can see that saved outcome after refresh.
5. Accepting a permitted change updates the correct event where appropriate; refusing it does not silently apply the proposed values.
6. Changes to timing, attendance, venue requirements or equipment requirements identify affected arrangements for reconsideration.
7. A significant change must not silently leave incompatible bookings or equipment reservations treated as valid; affected arrangements require reconsideration or revalidation.
8. Major changes affecting confirmed arrangements follow cancellation and a new request.
9. Unauthorised users cannot request or process changes for unrelated events; updates do not alter another event.
10. Relevant users receive the agreed change-request and review-outcome notifications through KAN-64, without duplicating the same notification obligation.

**Refinement:** Agree ordinary versus significant fields, review outcomes, prior-state permissions and how affected arrangements are resolved. Organiser editing before approval and coordinator-only general editing require an explicit boundary. Ordinary planning edits belong to KAN-66; draft edits remain KAN-34.

### KAN-60 — Require a Reason When Rejecting an Event Request

**Type:** Corrective task related to KAN-36; unestimated and outside Sprint 2.

**Purpose:** Apply the mandatory rejection-reason rule without changing Sprint 1's historical acceptance record.

**Acceptance criteria**

1. The UI and API refuse a rejection with a missing, blank or whitespace-only reason and provide useful feedback.
2. A valid rejection stores the reason with the decision for the correct request.
3. The relevant organiser can see the saved reason and Rejected outcome after refresh.
4. Invalid input creates no review record and does not change request status.
5. An approval reason remains optional, and existing role, assignment and already-decided protections remain enforced.

**Refinement:** Agree any length limit; do not apply a mandatory venue-booking rejection reason by implication. Verify both direct API and browser paths.

### KAN-61 — Confirm Event After Planning Arrangements

**User story:** As an Event Coordinator, I want to confirm an event once its essential arrangements are ready so that the organiser can rely on the final arrangements.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. Only a coordinator authorised for the event can confirm it.
2. Initial event-request approval under KAN-36 is distinct from final confirmation.
3. Required venue and equipment arrangements are checked. Unmet prerequisites prevent confirmation with useful feedback; an applicable Not Required equipment choice does not block confirmation.
4. Confirmation records the correct event, actor and time, persists after refresh and is visible to the organiser.
5. Repeated, ineligible or unauthorised attempts do not corrupt status or related arrangements.
6. Optional human technical-support requests or staff scheduling are not prerequisites of this first-release confirmation workflow.

**Refinement:** Agree prior states, the exact venue/equipment readiness checklist and registration-opening/notification effects under KAN-14/KAN-64. Confirmation must not imply that the event has already taken place.

### KAN-62 — Cancel Event and Release Its Arrangements

**User story:** As an authorised user, I want to cancel an eligible event so that its current status is clear and its arrangements no longer remain incorrectly committed.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised user can cancel an event that meets the agreed lifecycle rules.
2. Cancellation records the correct event, actor, time and any required reason, persists and is visible to relevant users.
3. Equipment reservations for the cancelled event are released automatically and exactly once.
4. Related venue bookings and registrations are handled under the agreed cancellation policy; none are silently left presented as valid arrangements for a continuing event.
5. Relevant users receive the agreed cancellation notifications without exposing unrelated events.
6. Repeated, ineligible or unauthorised cancellation does not release another event's resources or corrupt totals.
7. Major changes affecting confirmed arrangements can follow the cancellation-and-new-request process without changing the identity of the cancelled event.

**Refinement:** Agree who may request versus perform cancellation, eligible states, reason requirements, venue release, registration outcomes and recipient/channel rules. Automatic equipment release is agreed; the other effects need explicit decisions before implementation acceptance.

### KAN-63 — Submit and Review Event Equipment Requests

**User story:** As an Event Coordinator, I want to record equipment needs and have Technical Support Staff review and update the request so that suitable equipment arrangements can be made for the event.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised coordinator can create and save a request containing equipment type, valid quantity, relevant technical requirements and the event period.
2. The request remains linked to the correct event and is available to the appropriate Technical Support Staff.
3. Authorised Technical Support Staff can inspect the requested type, quantity, period and technical requirements.
4. Technical Support Staff can review and update permitted request/arrangement information and record the review outcome as planning progresses.
5. Saved information and outcomes persist on the correct request; the relevant coordinator can view the latest version.
6. Review uses KAN-9 to check current available quantities against event timing and equipment needs.
7. Reservations use KAN-26; request creation and review do not silently double-count or reserve quantities twice.
8. Changes to one request do not alter an unrelated event's equipment arrangements.
9. Unauthorised users cannot view or modify protected equipment requests or arrangements.
10. Equipment arrangements can proceed independently of venue confirmation. Events with no equipment requirement can retain Not Required without a dummy request.

**Refinement:** Agree request/review states, edit permissions, partial fulfilment and the boundary between review acceptance and reservation. This story covers equipment and technical requirements, not human technical-support staffing.

### KAN-64 — Notify Relevant Users About Event Workflow Updates

**User story:** As a user, I want to receive significant event updates relevant to my responsibilities or participation so that I know when action is needed or arrangements have changed.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. **Event requests:** notify the relevant organiser for successful submission, clarification requests and approval/rejection according to the agreed trigger/recipient matrix.
2. Notify relevant users when a coordinator is assigned or reassigned.
3. **Planning:** notify relevant internal users for venue-booking decisions, significant event changes and equipment arrangement updates.
4. Notify relevant users of event confirmation and cancellation where applicable.
5. **Registration:** notify appropriate users for significant registration updates, withdrawal and event changes affecting registered attendees where applicable.
6. Every notification identifies the correct event and relevant action or outcome, with enough information to understand the update.
7. Recipients are limited to users with a relevant role or relationship; notification details and linked pages do not disclose protected information about unrelated events or registrations.
8. Notifications reflect the saved action; a failed or rejected mutation does not generate a false success notification.
9. Deliver notifications through the chosen release channel; email is not mandatory.

**Refinement:** Agree the trigger/recipient/channel matrix and delivery, retry, duplicate and read-state behaviour. Reuse the notifications described in other stories so one agreed trigger is not implemented or counted twice. A notification epic is not mandatory. The three trigger groups are parts of this canonical story, not three additional duplicate stories.

### KAN-65 — Reassign Event Coordinator

**User story:** As an authorised internal user, I want to reassign an event to another Event Coordinator so that responsibility can change when staff responsibilities or availability change.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised user can view the event's current coordinator.
2. An authorised user can select a permitted replacement Event Coordinator.
3. Reassignment saves exactly one current coordinator against the correct event, records the actor and time, and persists after refresh.
4. The new coordinator can access the assigned event.
5. The previous coordinator no longer receives authority solely from the old assignment.
6. Reassignment retains the same event, its existing information, decisions and arrangements.
7. Relevant users can see the current coordinator and receive the agreed assignment notification.
8. Unauthorised or invalid changes leave the current assignment intact.

**Refinement:** Coordinators may assign to themselves or another coordinator, but authority to take over another coordinator's event is still open. Agree eligible replacement availability, reassignment states and concurrent-change behaviour. Automatic initial assignment remains KAN-29.

### KAN-66 — Update Event Information During Planning

**User story:** As an authorised user, I want to update permitted event information during planning so that the event record stays accurate as arrangements are made.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. An authorised user can view the current information and update fields permitted for their role, event relationship and lifecycle stage.
2. Valid ordinary edits save against the correct event and remain visible after refresh.
3. Unauthorised or invalid edits are refused without losing the saved event information.
4. Ordinary edits preserve unrelated information, decisions and arrangements, and do not change another event.
5. Changes to timing, expected attendance, venue requirements or equipment requirements are assessed against the agreed significant-change rules.
6. Changes affecting existing arrangements follow KAN-15 or the agreed cancellation/new-request process; ordinary editing cannot silently bypass those controls.

**Refinement:** Agree the editable-field/role/stage matrix and ordinary-versus-significant boundary. Resolve organiser edits before approval versus coordinator-only general editing. This is neither draft editing under KAN-34 nor a second implementation of change-request review.

### KAN-67 — View Event Registrations

**User story:** As an Event Organiser or Event Coordinator, I want to view registrations for events I manage so that I can understand the current attendee registrations.

**Estimate:** Not yet estimated.

**Acceptance criteria**

1. The relevant organiser or current authorised coordinator can view appropriate registration information for their event.
2. Registrations shown belong to the correct event, with active and withdrawn registrations distinguishable.
3. Registration information and relevant counts reflect a saved attendee registration or withdrawal after refresh.
4. An event with no registrations shows a clear empty state without exposing another event's records.
5. Unrelated users cannot access protected registration information, including by requesting another event's identifier directly.
6. Displayed information is restricted to fields needed by the authorised role; the exact personal-field list remains to agree.

**Refinement:** Agree the personal fields visible to each role and the counting/display rules. Exporting, waiting lists and attendance recording are outside this story. Attendee self-service remains KAN-14/KAN-17.

## Archived backlog items

The four items below were **archived in Jira on 21 September 2026**. Each archived card retains its history and offers Restore; none was permanently deleted. They had no child items or sprint membership when checked. Archiving removes them from the active backlog without changing Sprint 1's historical commitment or Sprint 2's 43-point baseline.

| Archived Jira item | Reason | Coverage or consequence |
| --- | --- | --- |
| KAN-21 — Block Venue for Maintenance | Duplicate of the broader KAN-55 operational-unavailability story | Mandatory reason, blocked period and calendar/conflict effects are retained in KAN-55; do not count both estimates |
| KAN-19 — Join Attendee Waiting List | Optional feature outside the selected first-release scope | KAN-14 keeps full-capacity refusal; a waiting list is not required for core registration |
| KAN-22 — Send Technical Support Requests | Optional human technical-support workflow outside the 20 core features | Equipment type, quantity and technical requirements remain covered by KAN-63 |
| KAN-23 — Assign Technical Support Staff | Optional human staffing/scheduling outside the selected first-release scope | Equipment reservation remains KAN-26; confirmation readiness must not depend on staffing assignment |

Archiving the optional stories narrows the selected release scope; it does not establish that the customer prohibited those broader features. KAN-14 retains registration and full-capacity refusal without a waiting-list dependency, and KAN-61 readiness checks in-scope venue/equipment arrangements without requiring human staffing. Restore an optional item only if the team later selects that scope and resolves its open rules. Historical Sprint 1 and carried stories, original estimates and evidence remain intact.

## Readiness and evidence

Before selecting future work, refine the open rules with the Product Owner, estimate the remaining work against existing implementation, assign an owner/reviewer and identify tests for normal, boundary, access, conflict and failure cases. Reuse shared modules and record cross-feature effects explicitly.

The release walkthrough should connect submission, assignment, review, venue booking, equipment arrangements, confirmation, registration and significant change/cancellation. Tests must show that event timing and current arrangements remain consistent across those steps. The [traceability register](traceability.csv) maps stories to implementation and tests; it does not replace executed acceptance evidence.

Export the final Jira backlog with completed and pending stories for submission. Keep the product backlog, sprint snapshots and historical acceptance records distinguishable; later refinements must not rewrite the original sprint baseline or invent completion dates.
