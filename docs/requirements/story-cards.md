# User stories and acceptance criteria

Each card gives the role, goal and value in assessor-facing wording prepared on 6 November. KAN-24 and KAN-60 use their engineering and correction objectives. Each example is one numbered condition from the linked sprint card. The [Sprint 1 crosswalk](../scrum/sprint-01/sprint-backlog.md#criterion-crosswalk--17-october-2026) maps the 79 original functional bullets and five database checks to local IDs and cases. Use the card for the full criteria, the workbook’s **Story specifications** for captured source wording, and **Criterion index** for the numbered criteria and their case references. The [case catalogue](../testing/test-cases.csv) defines the expected results. The [execution register](../testing/test-executions.csv) records actual runs.

The cards are grouped by the review that accepted the parent. Earlier sprint links identify its earlier scope or carry-over. Each example uses the latest documented wording in the linked card. The review decision applies to the story as a whole. Some refinements and checks were recorded after the review and are dated on the affected cards. [Master register and source history](product-backlog.md) · [Customer changes](change-requests.md) · [Requirements decisions](assumptions-and-questions.md)

| Acceptance review | Accepted parents | Points |
| --- | ---: | ---: |
| [Sprint 1 · 19 September 2026](#sprint-1) | 7 | 24 |
| [Sprint 2 · 3 October 2026](#sprint-2) | 7 | 24 |
| [Sprint 3 · 17 October 2026](#sprint-3) | 13 | 63 |
| [Sprint 4 · 31 October 2026](#sprint-4) | 15 | 63 |

## Sprint 1

Accepted on 19 September 2026. See the [story decisions and review qualifications](../scrum/sprint-01/review.md#story-decisions).

### KAN-4

**Save Draft Event Request** · CF-03 · High priority · 3 SP

As an event organiser, I want to save an incomplete request so that I can retain my progress before all submission details are available.

**KAN-4-AC2.** Given a successfully saved draft, when it is retrieved in a subsequent session, then its identifier and saved values are retained and it has not entered the submitted review workflow. Cases TC-03-202, TC-03-203.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-4--save-incomplete-drafts)

### KAN-16

**View Event Request Status** · CF-06 · Medium priority · 2 SP

As an event organiser, I want to see the current status of my request so that I know its progress and the outcome of review.

**KAN-16-AC2.** Given a successful submission or review decision, when the organiser reloads the request, then the latest persisted status and permitted review information are displayed. Cases TC-06-204, TC-06-205.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-16--view-event-request-status)

### KAN-24

**Setup Database** · Infrastructure · Highest priority · 5 SP

Provide a reproducible, protected database and API connection so that the request workflow can save and retrieve event records.

**KAN-24-AC3.** Given the migrated development database and application connection configuration, when the agreed database integration checks run, then the application connects successfully and representative synthetic records can be persisted and retrieved under the agreed schema constraints, with actual commands, commit and results linked as evidence. This checks database foundations, not completion of the dependent business workflows. Case TC-DB-204.

The 17 October crosswalk maps the fifth database check from 21 September to KAN-24-AC4 / TC-DB-205. The team included this 5-SP engineering foundation within the 32-SP first forecast. The business-story share of Sprint 1 acceptance is 19 SP.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-24--database-and-integration-infrastructure)

### KAN-25

**User Authorisation and Authentication** · CF-01 · Highest priority · 5 SP

As a ConnectSphere user, I want to authenticate and access only permitted functions and event information so that I can perform my role without exposing other users' information.

**KAN-25-AC3.** Given an authenticated user without permission for an action or event, when that user changes a request ID, role or owner value in a direct API call, then access remains denied under the agreed actor/event policy. Cases TC-01-204, TC-01-205.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-25--authentication-and-authorization)

### KAN-27

**Request Clarification on an Event Request** · CF-04 · Medium priority · 3 SP

As an event coordinator, I want to request clarification on an eligible event request so that the organiser can understand what additional information is needed for review.

**KAN-27-AC2.** Given a recorded clarification, when the owning organiser opens the request, then the clarification text and its context are visible within the agreed access rules. Cases TC-04-223, TC-04-224.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-27--request-clarification)

### KAN-31

**Create Event Request** · CF-02 · Medium priority · 3 SP

As an event organiser, I want to start a request and enter event information so that I can prepare an event for submission.

**KAN-31-AC2.** Given details entered in a new request, when the organiser chooses Save draft, then those details are passed to the shared draft-save flow and successful creation returns an identifiable request owned by the authenticated organiser. Cases TC-02-210, TC-02-211.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-31--start-a-new-event-request)

### KAN-36

**Approve/Reject Event Request** · CF-04 · Medium priority · 3 SP

As an event coordinator, I want to record an approval or rejection for an eligible request so that the organiser receives a clear review outcome.

**KAN-36-AC3.** Given an unauthorized reviewer or a disallowed request state, when a decision is attempted directly through the API, then no review record or state change is persisted. Cases TC-04-210, TC-04-217.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-36--approve-or-reject-requests)

## Sprint 2

Accepted on 3 October 2026. See the [story decisions and review qualifications](../scrum/sprint-02/review.md#story-decisions).

### KAN-8

**Approve or Reject Venue Booking Request** · CF-13 · High priority · 3 SP

As a Venue Staff member, I want to approve or reject a pending venue booking request so that venue usage can be managed appropriately.

**KAN-8-AC11.** Users who are not authorised as Venue Staff cannot approve or reject venue booking requests. Case TC-13-204.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-8--approve-or-reject-venue-booking-request)

### KAN-29

**Automatically Assign Event Coordinator** · CF-05 · Medium priority · 3 SP

As an Event Organiser, I want my submitted event request to be automatically assigned to an available Event Coordinator so that there is a clear internal staff member responsible for coordinating my event.

**KAN-29-AC1.** When an Event Organiser successfully submits an event request, the system automatically assigns an available Event Coordinator. Case TC-05-201.

Sprint 2 accepted automatic initial assignment. CR-5 replaces it for later submissions with KAN-79 and restricts reassignment under KAN-65.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-29--automatically-assign-event-coordinator)

### KAN-33

**View Submitted Event Request** · CF-04 · Medium priority · 2 SP

As an Event Coordinator, I want to see submitted requests assigned to me and reopen their decisions so that I can continue planning approved events.

**KAN-33-AC4.** Given no request is currently in a reviewable state, when an authorised coordinator opens the queue, then it returns an empty list rather than an error. Case TC-04-228.

The pending queue correctly excludes decided requests. The carry-over repair adds a supported way for the assigned coordinator to reopen a decision. The old blanket-denial assumption in AC5 is superseded.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-33--view-submitted-requests) · [Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#carry-over-repair-criteria-and-tasks)

### KAN-51

**View Venue Availability Calendar** · CF-09 · Medium priority · 5 SP

As an authorised internal user (Event Coordinator, Venue Staff, Technical Support Staff), I want to view venue availability across relevant dates and times so that I can identify when a venue may be requested.

**KAN-51-AC4.** Available and unavailable periods can be distinguished. Case TC-09-202.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-51--view-venue-availability-calendar)

### KAN-53

**Submit Venue Booking Request** · CF-12 · Medium priority · 3 SP

As an Event Coordinator, I want to submit a venue booking request for an event so that Venue Staff can assess whether the requested venue can be made available.

**KAN-53-AC7.** The booking request remains associated with the correct venue. Case TC-12-201.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-53--submit-venue-booking-request)

### KAN-54

**Detect Venue Booking Conflicts** · CF-14 · Medium priority · 5 SP

As an Event Coordinator or Venue Staff member, I want conflicting venue bookings to be identified so that the same venue is not inappropriately booked for overlapping events.

**KAN-54-AC4.** A non-overlapping booking for the same venue is not incorrectly identified as conflicting. Case TC-14-202.

The original conflict rule concerns actual booking time. CR-1 introduces buffered intervals and CR-4 explicitly managed holds. The repository added AC10 on 9 October, after the 3 October review. Its approved-bookings rule predates the separate, explicit hold workflow.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-54--detect-venue-booking-conflicts)

### KAN-55

**Block Venue for Operational Unavailability** · CF-09, CF-14 · Medium priority · 3 SP

As a Venue Staff member, I want to block a venue for a period when it is operationally unavailable so that Event Coordinators do not incorrectly treat the venue as available for event use.

**KAN-55-AC8.** The venue is shown as unavailable in the Venue Availability Calendar during the blocked period. Case TC-14-208.

Original operational blocks protect future requests. CR-2 adds the distinct requirement to record outages against existing bookings and recover affected arrangements.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-55--block-venue-for-operational-unavailability)

## Sprint 3

Accepted on 17 October 2026. See the [story decisions and review qualifications](../scrum/sprint-03/review.md#story-decisions).

### KAN-6

**Submit an Event Request** · CF-02 · High priority · 3 SP

As an Event Organiser, I want to submit my event request to ConnectSphere so that it can be reviewed and the event planning process can proceed.

**KAN-6-AC101.** Both new-request and saved-draft detail submission show server-supplied field errors for missing/invalid values, while retaining the entered data and Draft state on failure. Cases TC-02-03, TC-02-09.

Submission carried twice. The single 3-SP parent owns both the saved-draft path and field-specific validation feedback. The Lead queue appears in the later CR-5 workflow. The sprint card records the AC101 field-error repair on 20–21 October, after the 17 October review.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-6--submit-event-requests) · [Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#carry-over-repair-criteria-and-tasks) · [Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-6--submit-an-event-request)

### KAN-12

**Search and Filter Venues** · CF-10 · High priority · 5 SP

As an Event Coordinator, I want to search and filter venues using an event’s requirements so that I can identify potential venues efficiently.

**KAN-12-AC15.** Results from an earlier search never replace those of a newer one, and earlier results are hidden while a new search runs so they cannot be mistaken for the new filters. Case TC-10-11.

Sprint 2 recorded incomplete filters and differences from shared availability rules. Sprint 3 retains the same parent and estimate.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-12--search-and-filter-venues) · [Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-12--search-and-filter-venues)

### KAN-34

**Resume/Edit Draft Event Request** · CF-03, CF-07 · High priority · 3 SP

As an Event Organiser, I want to return to a previously saved draft event request and continue editing it so that I can complete my event request before submission.

**KAN-34-AC101.** Impossible calendar dates, including non-existent month/day combinations and invalid leap days, are refused by the API as validation errors rather than HTTP 500; the saved draft remains unchanged. Case TC-03-05.

The registration toggle on a reopened draft carried at 3 SP. Keep the Sprint 2 repair and later strict-date checks with the original draft story. The AC101 strict-date repair is dated 20 October.

[Sprint 1 criteria](../scrum/sprint-01/sprint-backlog.md#kan-34--resume-and-edit-drafts) · [Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#carry-over-repair-criteria-and-tasks) · [Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-34--resumeedit-draft-event-request)

### KAN-50

**Maintain Venue Catalog** · CF-08 · Highest priority · 5 SP

As a Venue Staff member, I want to maintain accurate information about ConnectSphere venues so that Event Coordinators and Venue Staff can use reliable venue information when planning events.

**KAN-50-AC101.** After navigating from venue A to venue B while A's save is pending, A's delayed success or error cannot replace B's editor or redirect a subsequent save; route/account changes invalidate stale writes in the UI. Case TC-08-14.

Sprint 2 carried this parent at 5 SP. Later stale-save and shared-screen checks add precision to the catalogue criteria. The 25 October record identifies the stale-save repair and review. That evidence postdates the sprint decision.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-50--maintain-venue-catalogue) · [Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-50--maintain-venue-catalog)

### KAN-52

**Check Venue Suitability** · CF-11 · High priority · 3 SP

As an Event Coordinator, I want to check whether a venue appears suitable for an event so that I can avoid selecting a venue that does not meet important event requirements.

**KAN-52-AC101.** Expected attendance 0 is a known permitted value and is assessed against venue capacity; it is not treated as missing. Missing attendance remains distinguishable. Other requirements/availability still determine overall suitability. Case TC-11-07.

Original suitability carried at 3 SP. The review distinguishes zero-attendance policy clarification from the directly testable over-capacity rule. The automated zero-attendance check in the sprint card is dated 21 October.

[Sprint 2 criteria](../scrum/sprint-02/sprint-backlog.md#kan-52--check-venue-suitability) · [Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-52--check-venue-suitability)

### KAN-60

**Require a reason when rejecting an event request** · CF-04 · High priority · 2 SP

Require a reason for an event rejection so that the organiser can understand the coordinator’s decision.

**KAN-60-AC1.** Reject missing, empty and whitespace-only rejection reasons in the API and UI. Case TC-04-02.

The G7 customer required a rejection reason on 9 September. The separately estimated corrective task refines the original review flow, outside the seven Week 7 change stories.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-60--require-a-reason-when-rejecting-an-event-request)

### KAN-64

**Receive Request, Assignment and Venue Notifications** · CF-20 · High priority · 5 SP

As a relevant organiser or internal user, I want request, assignment and venue updates in my inbox so that I can understand the outcome and take action.

**KAN-64-AC207.** Persist notifications in the successful business transaction using a unique outcome/recipient identifier. Failed or rolled-back actions produce none; retry or unchanged repeated actions create no duplicate notification. Case TC-20-18.

Original notifications were sized at 8 SP. This 5-SP slice owns the shared inbox and request, assignment and venue triggers. KAN-80 takes the other 3 SP. The [pre-split card](archive/2026-11-05/product-backlog.md#kan-64--notify-relevant-users-about-event-workflow-updates) preserves the earlier scope. The workbook marks AC1–9 and AC101–106 as historical and identifies the split scope under AC201–209.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-64--receive-request-assignment-and-venue-notifications)

### KAN-65

**Reassign Event Coordinator** · CF-05 · High priority · 3 SP

As the Event Coordinator Lead, I want to reassign an event to another available coordinator so that responsibility and access follow the current assignment.

**KAN-65-AC101.** Under CR-5, only EVENT_COORDINATOR_LEAD may reassign; this supersedes the earlier self/other-coordinator handover proposal. The role alone does not permit event approval. Cases TC-05-13, TC-05-34.

AC101 limits reassignment to the Coordinator Lead under CR-5. The retained 3-SP parent still covers access transfer and history.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-65--reassign-event-coordinator)

### KAN-77

**Configure Venue Setup and Turnaround Durations** · CF-08; CR-1 · High priority · 2 SP

As a Venue Staff member, I want to maintain setup and turnaround durations for each venue so that planning can account for the time needed before and after each booking.

**KAN-77-AC2.** Both durations are whole minutes from 0 to 1440 inclusive. Invalid, negative, fractional or missing required values receive field feedback and do not save. Case TC-08-16.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-77--configure-venue-setup-and-turnaround-durations)

### KAN-78

**Apply Venue Buffers to Availability and Booking Conflicts** · CF-09–CF-14; CR-1 · High priority · 8 SP

As an Event Coordinator or Venue Staff member, I want venue availability and booking decisions to include setup and turnaround time so that adjacent events leave enough operational time.

**KAN-78-AC1.** For a booking [start,end), the occupied interval is [start-setupMinutes,end+turnaroundMinutes) using the venue's current durations; a 10:00-12:00 event with 30/45-minute durations occupies 09:30-12:45. Case TC-14-01.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-78--apply-venue-buffers-to-availability-and-booking-conflicts)

### KAN-79

**Assign Submitted Events Through a Coordinator Lead Queue** · CF-01, CF-02, CF-04, CF-05; CR-5 · High priority · 8 SP

As an Event Coordinator Lead, I want newly submitted requests to enter an unassigned queue that I can oversee and allocate so that responsibility is assigned deliberately and coordinators manage only their own events.

**KAN-79-AC7.** Concurrent assignments produce only one current coordinator; stale attempts fail clearly without replacing a newer assignment or duplicating history. Case TC-05-06.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-79--assign-submitted-events-through-a-coordinator-lead-queue)

### KAN-81

**Recover venue arrangements affected by operational unavailability** · CF-09, CF-12, CF-13, CF-14, CF-20; CR-2 · High priority · 8 SP

As Venue Staff, I want to record operational unavailability even when future bookings exist and inform the affected coordinators, so that replacement venues can be arranged without losing the event or its unaffected arrangements.

**KAN-81-AC3.** The saved outage identifies every non-ended approved booking for the same venue whose buffered occupied interval overlaps the outage, using half-open interval boundaries, and flags it for recovery; unrelated venues and exact adjacency are unaffected. A live tentative hold whose buffered occupied interval overlaps the outage is released instead (cancelled with the outage reason, its history kept) and its assigned coordinator is notified, as in KAN-83-AC10; it is not flagged for recovery. *Clarified 25 October 2026 by the PO (Irfan); see the decision log.* Case TC-09-03.

Irfan clarified the distinct outage treatment for held and approved arrangements on 25 October. On 28 October the readiness portion of AC9 moved to KAN-61 and KAN-84.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-81--recover-venue-arrangements-affected-by-operational-unavailability)

### KAN-83

**Manage temporary venue holds with expiry and automatic release** · CF-09, CF-12, CF-13, CF-14, CF-20; CR-4 · High priority · 8 SP

As an Event Coordinator, I want a temporary venue hold to have a visible deadline and be released when that deadline is not met, so that availability remains accurate and an expired hold never becomes a confirmed booking.

**KAN-83-AC6.** At or after expiry an uncompleted hold becomes expired and releases its reservation. No scheduler, read request or elapsed time can automatically approve a booking or event, and an expired hold cannot be revived by a late approval. Case TC-14-13.

[Sprint 3 criteria](../scrum/sprint-03/sprint-backlog.md#kan-83--manage-temporary-venue-holds-with-expiry-and-automatic-release)

## Sprint 4

Accepted on 31 October 2026. See the [story decisions and review qualifications](../scrum/sprint-04/review.md#story-decisions).

### KAN-9

**Check Equipment Availability for an Event** · CF-16 · High priority · 8 SP

As a Technical Support Staff member, I want to check whether sufficient suitable equipment is available for an event's requested date and time, so that I can determine if the event's technical requirements can be fulfilled.

**KAN-9-AC101.** Availability uses quantity pools and half-open periods: exclude damaged/maintenance quantities and the peak simultaneous RESERVED quantity, without summing disjoint reservations as concurrent demand. Case TC-16-07.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-9--check-equipment-availability-for-an-event)

### KAN-10

**Mark Event as Completed** · CF-06 · High priority · 3 SP

As an Event Coordinator, I want to mark an event as completed so that its final status is recorded and reserved equipment can be released.

**KAN-10-AC103.** An early, stale, repeated or unauthorised completion must not duplicate release or notifications or modify another event. Case TC-06-18.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-10--mark-event-as-completed)

### KAN-14

**Register for an Event** · CF-18 · High priority · 5 SP

As an Attendee, I want to view relevant event information and register while registration is open and capacity remains so that I can make an informed choice and secure my place.

**KAN-14-AC5.** Successful registrations count towards capacity immediately; concurrent attempts cannot exceed capacity or claim the same last place. Case TC-18-04.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-14--register-for-an-event)

### KAN-15

**Submit and Review Event Change Requests** · CF-07, CF-19 · High priority · 5 SP

As an Event Organiser, I want to submit significant changes to my event for review by the authorised Event Coordinator so that feasible changes can be agreed without leaving incompatible arrangements in place.

**KAN-15-AC103.** Before approving, show affected arrangements and registrations. A change affecting an already confirmed arrangement or active registrations requires cancellation and a new event request, not in-place approval. Case TC-19-04.

Re-estimated from 2 to 5 SP for review decisions and impacts on arrangements. KAN-82 owns individual venue actions.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-15--submit-and-review-event-change-requests)

### KAN-17

**Withdraw Attendee Registration** · CF-18 · High priority · 2 SP

As an Attendee, I want to withdraw my registration for an event I can no longer attend so that I am no longer expected and my place becomes available.

**KAN-17-AC103.** Withdrawal changes the existing record once, releases its capacity contribution once and uses KAN-80 (using KAN-64 infrastructure) for attendee/manager notifications; repeated requests cannot release another place. Cases TC-18-10, TC-18-408.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-17--withdraw-attendee-registration)

### KAN-18

**Update Equipment Availability Status** · CF-16 · High priority · 3 SP

As a Technical Support Staff member, I want to update the operational status of unavailable equipment so that damaged or maintained equipment is not incorrectly treated as available for event use.

**KAN-18-AC102.** A newly recorded operational loss preserves existing reservations and identifies affected shortfalls, notifies relevant assigned coordinators through KAN-80 (using KAN-64 infrastructure), and prevents further over-allocation until resolved. Case TC-16-05.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-18--update-equipment-availability-status)

### KAN-26

**Reserve Equipment** · CF-17 · High priority · 3 SP

As a Technical Support Staff member, I want to reserve equipment for an event being planned so that the required quantities are secured without double-booking.

**KAN-26-AC103.** Cancellation/completion release by recorded reservation state exactly once, preserve history and never increment a separate stock counter repeatedly. Case TC-17-04.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-26--reserve-equipment)

### KAN-61

**Confirm Event After Planning Arrangements** · CF-06 · High priority · 3 SP

As an Event Coordinator, I want to confirm an event once its required arrangements are ready so that the organiser knows the event can proceed.

**KAN-61-AC102.** Equipment is explicitly Not Required or every active required equipment line is RESERVED and currently fulfilable; a rejected or unresolved required line blocks confirmation. Case TC-06-03.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-61--confirm-event-after-planning-arrangements)

### KAN-62

**Cancel Event and Release Its Arrangements** · CF-06, CF-19 · High priority · 5 SP

As the owning Event Organiser or currently assigned Event Coordinator, I want to cancel an eligible event with a reason so that its arrangements are released and affected users are informed.

**KAN-62-AC103.** Affected users receive transactional KAN-80 (using KAN-64 infrastructure) notifications. Attendees see a cancellation outcome without internal-only reasons. Case TC-06-11.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-62--cancel-event-and-release-its-arrangements)

### KAN-63

**Submit and Review Event Equipment Requests** · CF-15 · High priority · 5 SP

As an Event Coordinator, I want to record an event’s equipment request and have Technical Support Staff review and update its arrangements so that suitable equipment can be provided.

**KAN-63-AC102.** Explicit Not Required is available only when there are no active required equipment lines; unresolved or rejected required lines do not count as ready. Case TC-15-05.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-63--submit-and-review-event-equipment-requests)

### KAN-66

**Update Event Information During Planning** · CF-07 · High priority · 3 SP

As an owning Event Organiser before approval or the assigned Event Coordinator after approval, I want to update the fields permitted at that stage so that the event record stays accurate.

**KAN-66-AC103.** Changes must preserve audit information and use an expected revision to reject stale overwrites; unauthorised fields are refused server-side, even if a client sends them. Case TC-07-05.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-66--update-event-information-during-planning)

### KAN-67

**View Event Registrations** · CF-18 · High priority · 2 SP

As an Event Organiser or Event Coordinator, I want to view registration information for events I manage so that I can understand current attendee registrations.

**KAN-67-AC103.** After reassignment, the former coordinator loses roster access immediately; current-data refresh must not retain another event's roster after route/account changes. Cases TC-18-17, TC-18-425.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-67--view-event-registrations)

### KAN-80

**Receive Equipment, Lifecycle, Change and Registration Notifications** · CF-20 · High priority · 3 SP

As a relevant organiser, internal staff member or attendee, I want equipment, event lifecycle, change and registration updates in my inbox so that I can act on outcomes that affect me.

**KAN-80-AC7.** All added trigger notifications persist atomically with the recorded business outcome using the KAN-64 outcome/recipient uniqueness mechanism; rollback creates none and retry creates no duplicate. Cases TC-20-27, TC-20-403.

This 3-SP continuation completes the former 8-SP notification scope alongside KAN-64. Outage, hold and safety notices are estimated in their respective change stories.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-80--receive-equipment-lifecycle-change-and-registration-notifications)

### KAN-82

**Manage each venue arrangement independently for an event** · CF-11, CF-12, CF-13, CF-14, CF-19; CR-3 · High priority · 5 SP

As an Event Coordinator, I want to manage multiple venue arrangements independently for one event, so that changing or cancelling one arrangement does not silently alter the others.

**KAN-82-AC5.** Changing a selected arrangement is an explicit cancel-and-resubmit workflow: the interface explains that the original reservation is released, records the cancellation, and creates a separately validated replacement request linked to that arrangement. The replacement starts pending and must undergo the usual Venue Staff approval. Case TC-12-05.

This 5-SP change adds independent cancel/replace behaviour to existing multiple booking records. AC11 also supports CF-20 through the protected cancellation or replacement notice (TC-12-11).

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-82--manage-each-venue-arrangement-independently-for-an-event)

### KAN-84

**Review operational safety before event preparation** · CF-01, CF-06, CF-11, CF-15, CF-17, CF-19, CF-20; CR-6 · High priority · 8 SP

As a Safety Officer, I want to review confirmed venue and technical arrangements and approve, reject or request changes, so that preparation starts only when the current operational arrangements have safety approval.

**KAN-84-AC6.** Request Changes identifies venue, technical or both planning areas and the changes required, returns the workflow to those planning tasks for the assigned coordinator and relevant staff, and keeps unrelated arrangements and previous decision history intact. Case TC-06-25.

Safety review received two rounds of estimation. The team retained 8 SP after discussing the new role, revision-specific decisions and invalidated approvals.

[Sprint 4 criteria](../scrum/sprint-04/sprint-backlog.md#kan-84--review-operational-safety-before-event-preparation)
