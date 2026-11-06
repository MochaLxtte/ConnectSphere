# Customer clarifications and team assumptions

**Section G7 · Release 1 · reconciled 6 November 2026.** The Week 1 Customer Briefing left operating rules open for section Q&A. The Week 4 instructions selected 20 core features. This register traces the G7 answers to the team’s Q-01–Q-14 and to the criteria the team used. Question IDs are the team’s index. A question appearing in the G7 sheet establishes what the section asked, without identifying the individual who asked it.

**How to check an answer.** The [G7 customer Q&A workbook](sources/g7-customer-clarifications.xlsx) identifies the sessions on `Sheet1`, rows 3 and 49. Column B holds questions and C holds answers. References below give the session date and row. Row 2 is labelled as an example. The [21 September reconciliation](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--customer-rules-reconciled-with-the-backlog) shows when the answers entered the backlog. The [six Week 7 changes](change-requests.md) received on 2 October take precedence for later scope. Meeting cues identify team discussions. Sprint cards, reviews and test results separately record criteria, acceptance and execution.

## What G7 clarified and what changed in the backlog

| Team question | G7 customer answer and source | Effect on the stories and criteria |
| --- | --- | --- |
| **Q-01 · Accounts and roles.** Who creates staff accounts? Can one person hold two roles? | **9 Sep, r51:** precreated internal accounts suffice for Release 1. **25 Aug, r8:** one organiser per event. The multi-role question at r67 has an empty answer cell. | KAN-25 checks identity, role and event relationship. The team used separate trusted accounts for distinct staff roles, including the later Lead and Safety Officer. Multi-role support remains a separate unanswered question. [Access rules](../scrum/sprint-01/sprint-backlog.md) |
| **Q-02 · Coordinator assignment.** Who gets a new request and which colleagues can see it? | **25 Aug, rr6, 41:** automate initial allocation to one coordinator. **9 Sep, rr57, 59:** the team may choose the selection rule and assume availability is already marked. | Original KAN-29 AC1–AC7 recorded one available coordinator and kept assignment distinct from approval. The team chose least active workload and a stable tie-break. CR-5 replaces automatic allocation for **new** submissions with the Lead’s queue and authorises Lead reassignment. KAN-79 and KAN-65 transfer responsibility and access together. [Original assignment](../scrum/sprint-02/sprint-backlog.md#kan-29--automatically-assign-event-coordinator) · [Lead queue](../scrum/sprint-03/sprint-backlog.md#kan-79--assign-submitted-events-through-a-coordinator-lead-queue) |
| **Q-03 · Draft versus submission.** Which omissions block submission? | **25 Aug, r5:** attendance and duration matter across event types. **9 Sep, r61:** date and headcount are mandatory; inapplicable needs can be recorded as None/Not Required. The remaining field rules were delegated. | KAN-4/KAN-34 permit an incomplete draft. KAN-6 validates submission and retains the draft on failure. KAN-6 AC101 requires field feedback from both submission paths. On 9 Oct Irfan retained zero as a supplied attendance value because the customer set no minimum. This is a PO interpretation. [Validation decision](archive/2026-11-05/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04) · [KAN-6 criteria](../scrum/sprint-03/sprint-backlog.md#kan-6--submit-an-event-request) |
| **Q-04 · Decisions and lifecycle.** Can the system reject automatically? Does approval confirm an event? | **25 Aug, rr23, 43–46:** rejection is manual; requests may be returned repeatedly, without a prescribed response time. The listed statuses describe the existing process. **9 Sep, r64:** event-request rejection requires a short reason. **25 Aug, r31:** check briefing steps 6–9 for essential arrangements before confirmation. | KAN-27 handles clarification and KAN-36 the initial decision. KAN-60 corrects empty event-rejection reasons under existing scope, with no state change for an invalid attempt. This answer concerns event requests; KAN-8’s venue-booking card permits a reason. KAN-61 checks venue/equipment readiness at final confirmation. Later CR-6 adds a separate preparation gate. [Reason criteria](../scrum/sprint-03/sprint-backlog.md#kan-60--require-a-reason-when-rejecting-an-event-request) · [Confirmation](../scrum/sprint-04/sprint-backlog.md#kan-61--confirm-event-after-planning-arrangements) |
| **Q-05/Q-11 · Edits and their consequences.** Who may change details, and when are arrangements reconsidered? | **25 Aug, r42:** the coordinator edits event details. **r47:** the organiser can modify a submitted request before approval. **rr20, 35:** change requests have no fixed cutoff; major changes affecting confirmed arrangements, such as attendance or duration, require cancellation and a new request. | The team reconciled the two edit answers by stage. KAN-66 AC101 permits the owning organiser to edit before initial approval with submission validation. AC102 restricts ordinary edits on approved/confirmed events to the current coordinator and to name/description. AC103 protects against stale writes. KAN-15 AC7–AC8 and AC101–AC103 govern significant changes and existing commitments. [Edit criteria](../scrum/sprint-04/sprint-backlog.md#kan-66--update-event-information-during-planning) · [Impact review](../scrum/sprint-04/sprint-backlog.md#kan-15--submit-and-review-event-change-requests) |
| **Q-06/Q-07 · Bookings, blocks and time.** What occupies a venue? What if it later becomes unusable? | **25 Aug, rr22, 25, 34:** assume no turnaround initially; a venue can be tentatively held during planning. **9 Sep, r62:** refuse a booking submission against an existing reservation. **r65:** the answer repeats the booking-submission rule and leaves the reverse operation unclear. **r53:** multi-session scheduling was outside this release. | KAN-51/53/54/55 distinguish an ordinary pending request from an occupied slot. CR-1 later adds configurable setup/turnaround. CR-2 allows staff to record a real outage affecting already-approved bookings and initiates recovery. CR-3 adds independently managed venues for one event, without introducing a session scheduler. CR-4 adds expiring holds; expiry releases only that hold’s claim. [Original venue criteria](../scrum/sprint-02/sprint-backlog.md) · [CR-1 to CR-4](change-requests.md) |
| **Q-08 · Search and suitability.** Does a matching search result make a venue suitable? | **25 Aug, rr11, 26, 33, 43:** the coordinator selects against the organiser’s needs, Venue Staff review, and additional matching rules can be chosen by the team. **9 Sep, rr54–56, 58:** the team can supply lists/layouts, a placeholder catalogue suffices, and suitability asks whether a venue fits a specific event. | KAN-50 retained staff maintenance as selected scope. KAN-12 filters candidates. KAN-52 checks current capacity, facilities, accessibility, layout and availability, with reasons for the result. The team distinguished unresolved needs from a proven mismatch. KAN-82 AC2 later applies the advisory check to one saved venue arrangement. [Suitability criteria](../scrum/sprint-03/sprint-backlog.md#kan-52--check-venue-suitability) · [Saved-arrangement decision](archive/2026-11-05/assumptions-and-questions.md#30-october-2026--sprint-4-acceptance-clarification-and-corrections) |
| **Q-09/Q-12 · Equipment and resource release.** Is stock counted? When can it be reserved and released? | **25 Aug, rr17, 30, 36:** no equipment turnover period, venue confirmation dependency or location restriction. **9 Sep, rr52, 63:** count equipment; cancellation/completion release reservations automatically, and authorised technical staff may adjust them. | KAN-9 calculates available stock across overlapping reservations. KAN-26 AC3/AC5/AC6 supports independent planning, automatic release and manual adjustment. KAN-62/KAN-10 handle cancellation/completion, preserve history and release once on retry. The team chose pooling by type, whole positive quantities and atomic reservation of a complete line. [Equipment reservation](../scrum/sprint-04/sprint-backlog.md#kan-26--reserve-equipment) |
| **Q-10 · Registration.** Who registers and what information is needed? | **25 Aug, rr19, 21:** account-based registration supports logging; the team may choose the attendee fields and information shown. **9 Sep, r50:** registration is individual. | KAN-14 AC101–AC103 uses the signed-in attendee account and checks the registration window/capacity. KAN-17 withdrawal releases one place. KAN-67 AC101–AC103 limits roster fields and access to the owning organiser and current coordinator. [Registration](../scrum/sprint-04/sprint-backlog.md#kan-14--register-for-an-event) · [Roster](../scrum/sprint-04/sprint-backlog.md#kan-67--view-event-registrations) |
| **Q-13 · Notifications.** Are email/SMS required? Who is informed? | **25 Aug, rr18, 48:** the organiser need not be included in every venue availability exchange. The customer delegated the delivery channel. | The team selected an in-app inbox with protected links. KAN-64 covers submission, assignment, venue notices and inbox access. KAN-80 covers equipment, lifecycle, significant changes and registration. CR stories own their additional triggers and reuse the same delivery mechanism. [Notification split](../scrum/sprint-03/sprint-backlog.md#notification-scope-preservation) · [KAN-80](../scrum/sprint-04/sprint-backlog.md#kan-80--receive-equipment-lifecycle-change-and-registration-notifications) |
| **Q-14 · Auditability.** Which actions, readers and retention period? | **Week 1 Customer Briefing §8(f), Auditability:** record what changed, who changed it and when where appropriate. The G7 workbook contains no general reader list or retention period. | The team recorded history within the relevant workflows, including status transitions, Lead reassignment and ordinary edits (KAN-16, KAN-65, KAN-66 AC103). The scope of any general audit viewer and retention policy remains unspecified. [Reassignment criteria](../scrum/sprint-03/sprint-backlog.md#kan-65--reassign-event-coordinator) · [Edit audit](archive/2026-11-05/assumptions-and-questions.md#26-october-2026--kan-66-planning-edit-implementation-decisions) |

## How the team used those answers

| Meeting or dated record | Question the team worked through | Decision and observable consequence |
| --- | --- | --- |
| **Sprint 1, 6–19 Sep.** [Planning cues 15–25](../scrum/sprint-01/evidence/meetings/planning.docx) · [12 Sep daily, cues 3–10](../scrum/sprint-01/evidence/meetings/current/daily.docx) · [review cues 4–16](../scrum/sprint-01/evidence/meetings/current/review.docx) | Ernest and Kai Jie separated creation, incomplete save and later editing. Irfan distinguished submission from saving an incomplete request. Ryan raised the risk of someone opening another organiser’s draft. | The team planned one field list across KAN-31/4/34/6, with ownership checks. Kai Jie’s 19 Sep review reported a registration toggle that failed to expose the fields, and inconsistent submission paths. The team carried KAN-6/34 and KAN-33 at their full eight points; G7’s field answer alone could not establish a pass. |
| **Sprint 2, 20 Sep–3 Oct.** [Planning cues 16–28](../scrum/sprint-02/evidence/meetings/current/planning.docx) · [24 Sep daily, cues 6–8](../scrum/sprint-02/evidence/meetings/current/daily.docx) · [review cues 3–10](../scrum/sprint-02/evidence/meetings/current/review.docx) | Tristan proposed available coordinators, then fewest active events and a stable tie-break. Ernest asked what counted as active and what happened without a candidate. Arvin and Irfan raised the difference between pending and approved bookings. Kai Jie flagged a block that overlaps an existing booking. | The original assignment fallback left the draft available for retry. Booking submission and approval used the same venue/time inputs and rechecked conflicts. The original calendar displayed bookings and blocks to three internal roles. The 3 Oct implementation used Singapore display time and allowed unbuffered bookings to touch; the workbook’s r2 timezone example supplied no G7 rule. [Assignment default](archive/2026-11-05/assumptions-and-questions.md#28-september-2026--kan-29-implementation-choices) · [Calendar default](archive/2026-11-05/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar) |
| **Sprint 3, 4–17 Oct.** [Planning cues 14–25](../scrum/sprint-03/evidence/meetings/current/planning.docx) · [review cues 8–10](../scrum/sprint-03/evidence/meetings/current/review.docx) | Irfan and Tristan distinguished linked new scope from an original missed criterion. Kai Jie split venue configuration from applying buffers. Ryan raised outages. Tristan identified the Lead’s replacement of automatic assignment. Irfan proposed holds with an expiry. | The team grouped buffers, outage recovery, holds and the Lead flow in Sprint 3. Independent arrangements and safety followed in Sprint 4. At review, Ryan asked whether expiry guaranteed availability. Irfan explained that another booking or outage can still block the slot. Later, the 25 Oct PO clarification distinguished releasing an overlapping **hold** from retaining and flagging an **approved booking**. [Outage clarification](archive/2026-11-05/assumptions-and-questions.md#25-october-2026--kan-81-holds-hit-by-an-outage-are-released-not-flagged) |
| **Sprint 4, 18–31 Oct.** [Planning cues 24–34](../scrum/sprint-04/evidence/meetings/current/planning.docx) · [22 Oct daily recording, 01:33–02:03](../scrum/final-sprint-recordings.md) · [review cues 8–12](../scrum/sprint-04/evidence/meetings/current/review.docx) | Irfan asked what happened after a safety-approved arrangement changed. Kai Jie explained why preparation needed both current approval and ready arrangements. Ryan asked about equipment becoming unavailable. The daily recorded an equipment-state response that blocked a connected preparation check. | KAN-61 checks confirmation readiness; KAN-84 AC9/AC10 requires renewed review after a safety-relevant change. On 1 Nov a targeted test showed that restoring old venue values could revive approval. The repair and connected retest verified approval stayed invalid until a fresh decision. This was a correction to existing scope. [Later execution evidence](../testing/evidence-index.md) |

## Remaining boundaries

* **Unanswered by the section:** G7 r67 asks whether one person can hold multiple roles. Release 1 provisions individual role accounts. The Week 1 auditability requirement has workflow-level evidence, but the customer did not specify a general audit reader or retention period. A further **dated G7 answer** would be needed to present either as customer policy.
* **Human staffing:** G7’s 25 Aug answers at rr14–15 permitted the team to assume staffing logistics were handled. Row 28 described automatic assignment of manpower, and r29 allowed sufficient manpower to be assumed. The team archived optional KAN-22/23 and retained equipment requests and Technical Support Staff decisions under KAN-63. The Week 4 core scope and KAN-61 AC6 support that release boundary. [Archived scope](archive/2026-11-05/assumptions-and-questions.md#archived-scope) · [Confirmation criteria](../scrum/sprint-04/sprint-backlog.md#kan-61--confirm-event-after-planning-arrangements)
* **Delegated choices:** the exact selection tie-break, venue matching, interval boundaries, registration fields and notification channel now have dated team rules and story criteria. The original KAN-55 implementation refused an operational block overlapping an approved booking. CR-2 subsequently required that the outage could be recorded, the event preserved and the coordinator notified. The ambiguous r65 remains intact as original evidence. [4 October implementation decision](archive/2026-11-05/assumptions-and-questions.md#4-october-2026--kan-55-block-venue-for-operational-unavailability)

## Historical records

[Preserved document before cleanup](archive/2026-11-05/assumptions-and-questions.md). These dated records remain supporting evidence.

<details>
<summary>Links retained for earlier references</summary>

<a id="8-september-2026--hosted-postgresql"></a>
[8 September 2026 — Hosted PostgreSQL](archive/2026-11-05/assumptions-and-questions.md#8-september-2026--hosted-postgresql)

<a id="11-september-2026--kan-33-review-queuedetail-scope"></a>
[11 September 2026 — KAN-33 review queue/detail scope](archive/2026-11-05/assumptions-and-questions.md#11-september-2026--kan-33-review-queuedetail-scope)

<a id="11-september-2026--coordinator-visibility-has-no-default-grant-kan-29q-02-still-open"></a>
[11 September 2026 — Coordinator visibility has no default grant (KAN-29/Q-02 still open)](archive/2026-11-05/assumptions-and-questions.md#11-september-2026--coordinator-visibility-has-no-default-grant-kan-29q-02-still-open)

<a id="11-september-2026--get-apieventsid-owner-collision"></a>
[11 September 2026 — `GET /api/events/:id` owner collision](archive/2026-11-05/assumptions-and-questions.md#11-september-2026--get-apieventsid-owner-collision)

<a id="11-september-2026--shared-request-detail-backend"></a>
[11 September 2026 — Shared request-detail backend](archive/2026-11-05/assumptions-and-questions.md#11-september-2026--shared-request-detail-backend)

<a id="13-september-2026--kan-6-submission-completeness-rule-q-03-still-open"></a>
[13 September 2026 — KAN-6 submission-completeness rule (Q-03 still open)](archive/2026-11-05/assumptions-and-questions.md#13-september-2026--kan-6-submission-completeness-rule-q-03-still-open)

<a id="15-september-2026--supabase-auth-and-assigned-coordinator-access"></a>
[15 September 2026 — Supabase Auth and assigned-coordinator access](archive/2026-11-05/assumptions-and-questions.md#15-september-2026--supabase-auth-and-assigned-coordinator-access)

<a id="15-september-2026--coordinator-decision-interface"></a>
[15 September 2026 — Coordinator decision interface](archive/2026-11-05/assumptions-and-questions.md#15-september-2026--coordinator-decision-interface)

<a id="15-september-2026--hosted-approval-check"></a>
[15 September 2026 — Hosted approval check](archive/2026-11-05/assumptions-and-questions.md#15-september-2026--hosted-approval-check)

<a id="16-september-2026--hosted-approval-follow-up"></a>
[16 September 2026 — Hosted approval follow-up](archive/2026-11-05/assumptions-and-questions.md#16-september-2026--hosted-approval-follow-up)

<a id="17-september-2026--organiser-outcome-display-and-refresh"></a>
[17 September 2026 — Organiser outcome display and refresh](archive/2026-11-05/assumptions-and-questions.md#17-september-2026--organiser-outcome-display-and-refresh)

<a id="19-september-2026--provisional-rules-for-the-remaining-first-release-features"></a>
[19 September 2026 — Provisional rules for the remaining first-release features](archive/2026-11-05/assumptions-and-questions.md#19-september-2026--provisional-rules-for-the-remaining-first-release-features)

<a id="19-september-2026--draft-customer-clarification-for-q-03"></a>
[19 September 2026 — Draft customer clarification for Q-03](archive/2026-11-05/assumptions-and-questions.md#19-september-2026--draft-customer-clarification-for-q-03)

<a id="21-september-2026--review-closure-and-sprint-2-planning-record"></a>
[21 September 2026 — Review closure and Sprint 2 planning record](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--review-closure-and-sprint-2-planning-record)

<a id="21-september-2026--sprint-2-criteria-alignment"></a>
[21 September 2026 — Sprint 2 criteria alignment](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--sprint-2-criteria-alignment)

<a id="21-september-2026--kan-29-and-kan-51-revision"></a>
[21 September 2026 — KAN-29 and KAN-51 revision](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--kan-29-and-kan-51-revision)

<a id="21-september-2026--customer-rules-reconciled-with-the-backlog"></a>
[21 September 2026 — Customer rules reconciled with the backlog](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--customer-rules-reconciled-with-the-backlog)

<a id="21-september-2026--jira-backlog-audit"></a>
[21 September 2026 — Jira backlog audit](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--jira-backlog-audit)

<a id="jira-changes-identified-in-the-pre-edit-audit"></a>
[Jira changes identified in the pre-edit audit](archive/2026-11-05/assumptions-and-questions.md#jira-changes-identified-in-the-pre-edit-audit)

<a id="criteria-versions-to-reconcile"></a>
[Criteria versions to reconcile](archive/2026-11-05/assumptions-and-questions.md#criteria-versions-to-reconcile)

<a id="21-september-2026--jira-updates-applied"></a>
[21 September 2026 — Jira updates applied](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--jira-updates-applied)

<a id="carry-over-and-corrective-work"></a>
[Carry-over and corrective work](archive/2026-11-05/assumptions-and-questions.md#carry-over-and-corrective-work)

<a id="existing-cards-refined"></a>
[Existing cards refined](archive/2026-11-05/assumptions-and-questions.md#existing-cards-refined)

<a id="future-release-stories-created"></a>
[Future release stories created](archive/2026-11-05/assumptions-and-questions.md#future-release-stories-created)

<a id="sprint-settings-and-remaining-team-work"></a>
[Sprint settings and remaining team work](archive/2026-11-05/assumptions-and-questions.md#sprint-settings-and-remaining-team-work)

<a id="21-september-2026--release-backlog-consolidated"></a>
[21 September 2026 — release backlog consolidated](archive/2026-11-05/assumptions-and-questions.md#21-september-2026--release-backlog-consolidated)

<a id="existing-scope-retained-and-clarified"></a>
[Existing scope retained and clarified](archive/2026-11-05/assumptions-and-questions.md#existing-scope-retained-and-clarified)

<a id="archived-scope"></a>
[Archived scope](archive/2026-11-05/assumptions-and-questions.md#archived-scope)

<a id="repository-and-test-alignment"></a>
[Repository and test alignment](archive/2026-11-05/assumptions-and-questions.md#repository-and-test-alignment)

<a id="29-september-2026--kan-56-coordinator-decided-request-history"></a>
[29 September 2026 — KAN-56 coordinator decided-request history](archive/2026-11-05/assumptions-and-questions.md#29-september-2026--kan-56-coordinator-decided-request-history)

<a id="1-october-2026--s1-def-01-and-s1-def-03-repaired-and-re-verified"></a>
[1 October 2026 — S1-DEF-01 and S1-DEF-03 repaired and re-verified](archive/2026-11-05/assumptions-and-questions.md#1-october-2026--s1-def-01-and-s1-def-03-repaired-and-re-verified)

<a id="3-october-2026--kan-51-venue-availability-calendar"></a>
[3 October 2026 — KAN-51 venue availability calendar](archive/2026-11-05/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar)

<a id="4-october-2026--kan-8-venue-booking-decisions"></a>
[4 October 2026 — KAN-8 venue booking decisions](archive/2026-11-05/assumptions-and-questions.md#4-october-2026--kan-8-venue-booking-decisions)

<a id="28-september-2026--kan-29-implementation-choices"></a>
[28 September 2026 — KAN-29 implementation choices](archive/2026-11-05/assumptions-and-questions.md#28-september-2026--kan-29-implementation-choices)

<a id="30-september-2026---sprint-1-and-sprint-2-application-boundary"></a>
[30 September 2026 - Sprint 1 and Sprint 2 application boundary](archive/2026-11-05/assumptions-and-questions.md#30-september-2026---sprint-1-and-sprint-2-application-boundary)

<a id="30-september-2026---firebase-migration-retirement"></a>
[30 September 2026 - Firebase migration retirement](archive/2026-11-05/assumptions-and-questions.md#30-september-2026---firebase-migration-retirement)

<a id="30-september-2026---shared-migration-verification"></a>
[30 September 2026 - Shared migration verification](archive/2026-11-05/assumptions-and-questions.md#30-september-2026---shared-migration-verification)

<a id="4-october-2026--kan-55-block-venue-for-operational-unavailability"></a>
[4 October 2026 — KAN-55 block venue for operational unavailability](archive/2026-11-05/assumptions-and-questions.md#4-october-2026--kan-55-block-venue-for-operational-unavailability)

<a id="4-october-2026--kan-52-venue-suitability"></a>
[4 October 2026 — KAN-52 venue suitability](archive/2026-11-05/assumptions-and-questions.md#4-october-2026--kan-52-venue-suitability)

<a id="4-october-2026--kan-53-venue-booking-submission"></a>
[4 October 2026 — KAN-53 venue booking submission](archive/2026-11-05/assumptions-and-questions.md#4-october-2026--kan-53-venue-booking-submission)

<a id="5-october-2026--venue-branch-integration"></a>
[5 October 2026 — venue branch integration](archive/2026-11-05/assumptions-and-questions.md#5-october-2026--venue-branch-integration)

<a id="9-october-2026--kan-59-submission-validation-rules-s1-def-04"></a>
[9 October 2026 — KAN-59 submission validation rules (S1-DEF-04)](archive/2026-11-05/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04)

<a id="9-october-2026--kan-50-venue-catalogue-maintenance-scope-and-implementation-choices"></a>
[9 October 2026 — KAN-50 venue catalogue maintenance: scope and implementation choices](archive/2026-11-05/assumptions-and-questions.md#9-october-2026--kan-50-venue-catalogue-maintenance-scope-and-implementation-choices)

<a id="15-october-2026--historical-baseline-and-week-7-preparation"></a>
[15 October 2026 — historical baseline and Week 7 preparation](archive/2026-11-05/assumptions-and-questions.md#15-october-2026--historical-baseline-and-week-7-preparation)

<a id="16-october-2026--reported-sprint-dates-availability-and-scope-proposal"></a>
[16 October 2026 — reported sprint dates, availability and scope proposal](archive/2026-11-05/assumptions-and-questions.md#16-october-2026--reported-sprint-dates-availability-and-scope-proposal)

<a id="16-october-2026--delegated-sprint-3-selection-and-jira-alignment"></a>
[16 October 2026 — delegated Sprint 3 selection and Jira alignment](archive/2026-11-05/assumptions-and-questions.md#16-october-2026--delegated-sprint-3-selection-and-jira-alignment)

<a id="16-october-2026--customer-receipt-confirmation-and-balanced-release-reconstruction"></a>
[16 October 2026 — customer receipt confirmation and balanced release reconstruction](archive/2026-11-05/assumptions-and-questions.md#16-october-2026--customer-receipt-confirmation-and-balanced-release-reconstruction)

<a id="cr-2--kan-81--delegated-operational-defaults"></a>
[CR-2 / KAN-81 — delegated operational defaults](archive/2026-11-05/assumptions-and-questions.md#cr-2--kan-81--delegated-operational-defaults)

<a id="cr-3--kan-82--delegated-operational-defaults"></a>
[CR-3 / KAN-82 — delegated operational defaults](archive/2026-11-05/assumptions-and-questions.md#cr-3--kan-82--delegated-operational-defaults)

<a id="cr-4--kan-83--delegated-operational-defaults"></a>
[CR-4 / KAN-83 — delegated operational defaults](archive/2026-11-05/assumptions-and-questions.md#cr-4--kan-83--delegated-operational-defaults)

<a id="cr-6--kan-84--delegated-operational-defaults"></a>
[CR-6 / KAN-84 — delegated operational defaults](archive/2026-11-05/assumptions-and-questions.md#cr-6--kan-84--delegated-operational-defaults)

<a id="16-october-2026--story-self-selection-and-document-attribution"></a>
[16 October 2026 — Story self-selection and document attribution](archive/2026-11-05/assumptions-and-questions.md#16-october-2026--story-self-selection-and-document-attribution)

<a id="16-october-2026--course-format-backlog-alignment"></a>
[16 October 2026 — Course-format backlog alignment](archive/2026-11-05/assumptions-and-questions.md#16-october-2026--course-format-backlog-alignment)

<a id="17-october-2026--submission-requirements-and-historical-crosswalk-reconciliation"></a>
[17 October 2026 — Submission requirements and historical crosswalk reconciliation](archive/2026-11-05/assumptions-and-questions.md#17-october-2026--submission-requirements-and-historical-crosswalk-reconciliation)

<a id="19-october-2026--kan-79-implementation-boundaries"></a>
[19 October 2026 — KAN-79 implementation boundaries](archive/2026-11-05/assumptions-and-questions.md#19-october-2026--kan-79-implementation-boundaries)

<a id="19-october-2026--kan-65-implementation-and-deferred-acceptance"></a>
[19 October 2026 — KAN-65 implementation and deferred acceptance](archive/2026-11-05/assumptions-and-questions.md#19-october-2026--kan-65-implementation-and-deferred-acceptance)

<a id="20-october-2026--kan-34-draft-date-time-format"></a>
[20 October 2026 — KAN-34 draft date-time format](archive/2026-11-05/assumptions-and-questions.md#20-october-2026--kan-34-draft-date-time-format)

<a id="21-october-2026--kan-64-notification-inbox-trigger-matrix-and-implementation-choices"></a>
[21 October 2026 — KAN-64 notification inbox: trigger matrix and implementation choices](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-64-notification-inbox-trigger-matrix-and-implementation-choices)

<a id="21-october-2026--kan-77-buffer-concurrency-and-ac6-dependency"></a>
[21 October 2026 — KAN-77 buffer concurrency and AC6 dependency](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-77-buffer-concurrency-and-ac6-dependency)

<a id="21-october-2026--kan-81-phase-1-outage-recovery-decisions"></a>
[21 October 2026 — KAN-81 phase 1 outage recovery decisions](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-81-phase-1-outage-recovery-decisions)

<a id="21-october-2026--kan-81-stale-refusal-review-correction"></a>
[21 October 2026 — KAN-81 stale-refusal review correction](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-81-stale-refusal-review-correction)

<a id="21-october-2026--kan-60-implementation-decisions"></a>
[21 October 2026 — KAN-60 implementation decisions](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-60-implementation-decisions)

<a id="21-october-2026--kan-81-phases-2-and-3-decisions"></a>
[21 October 2026 — KAN-81 phases 2 and 3 decisions](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-81-phases-2-and-3-decisions)

<a id="21-october-2026--kan-81-phase-3-replacement-rules"></a>
[21 October 2026 — KAN-81 phase 3 replacement rules](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-81-phase-3-replacement-rules)

<a id="21-october-2026--kan-83-implementation-decisions"></a>
[21 October 2026 — KAN-83 implementation decisions](archive/2026-11-05/assumptions-and-questions.md#21-october-2026--kan-83-implementation-decisions)

<a id="22-october-2026--sprint-3-integration-2-decisions"></a>
[22 October 2026 — sprint 3 integration 2 decisions](archive/2026-11-05/assumptions-and-questions.md#22-october-2026--sprint-3-integration-2-decisions)

<a id="25-october-2026--kan-81-outages-release-holds-by-their-buffered-interval"></a>
[25 October 2026 — KAN-81 outages release holds by their buffered interval](archive/2026-11-05/assumptions-and-questions.md#25-october-2026--kan-81-outages-release-holds-by-their-buffered-interval)

<a id="25-october-2026--kan-81-holds-hit-by-an-outage-are-released-not-flagged"></a>
[25 October 2026 — KAN-81 holds hit by an outage are released, not flagged](archive/2026-11-05/assumptions-and-questions.md#25-october-2026--kan-81-holds-hit-by-an-outage-are-released-not-flagged)

<a id="25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation"></a>
[25 October 2026 — Arvin KAN-78 and KAN-34 documentation reconciliation](archive/2026-11-05/assumptions-and-questions.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>
[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/assumptions-and-questions.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--closeout-fixes-and-approved-expiry-configuration"></a>
[25 October 2026 — Closeout fixes and approved expiry configuration](archive/2026-11-05/assumptions-and-questions.md#25-october-2026--closeout-fixes-and-approved-expiry-configuration)

<a id="25-october-2026--local-acceptance-and-repair-retest-confirmation"></a>
[25 October 2026 — Local acceptance and repair retest confirmation](archive/2026-11-05/assumptions-and-questions.md#25-october-2026--local-acceptance-and-repair-retest-confirmation)

<a id="26-october-2026--collective-review-decisions-and-evidence-follow-up"></a>
[26 October 2026 — Collective review decisions and evidence follow-up](archive/2026-11-05/assumptions-and-questions.md#26-october-2026--collective-review-decisions-and-evidence-follow-up)

<a id="26-october-2026--kan-9-equipment-availability-boundary"></a>
[26 October 2026 — KAN-9 equipment availability boundary](archive/2026-11-05/assumptions-and-questions.md#26-october-2026--kan-9-equipment-availability-boundary)

<a id="26-october-2026--kan-26-reservation-and-release-boundary"></a>
[26 October 2026 — KAN-26 reservation and release boundary](archive/2026-11-05/assumptions-and-questions.md#26-october-2026--kan-26-reservation-and-release-boundary)

<a id="28-october-2026--kan-81-ac9-readiness-split"></a>
[28 October 2026 — KAN-81-AC9 readiness split](archive/2026-11-05/assumptions-and-questions.md#28-october-2026--kan-81-ac9-readiness-split)

<a id="26-october-2026--kan-66-planning-edit-implementation-decisions"></a>
[26 October 2026 — KAN-66 planning-edit implementation decisions](archive/2026-11-05/assumptions-and-questions.md#26-october-2026--kan-66-planning-edit-implementation-decisions)

<a id="27-october-2026--kan-15-change-request-implementation-decisions"></a>
[27 October 2026 — KAN-15 change-request implementation decisions](archive/2026-11-05/assumptions-and-questions.md#27-october-2026--kan-15-change-request-implementation-decisions)

<a id="27-october-2026--kan-62--kan-63-merged-model-reconciliation"></a>
[27 October 2026 — KAN-62 / KAN-63 merged-model reconciliation](archive/2026-11-05/assumptions-and-questions.md#27-october-2026--kan-62--kan-63-merged-model-reconciliation)

<a id="28-october-2026--pr-63-correction-within-existing-criteria"></a>
[28 October 2026 — PR #63 correction within existing criteria](archive/2026-11-05/assumptions-and-questions.md#28-october-2026--pr-63-correction-within-existing-criteria)

<a id="29-october-2026--kan-10-completing-an-event-rules-and-notices"></a>
[29 October 2026 — KAN-10 completing an event: rules and notices](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-10-completing-an-event-rules-and-notices)

<a id="28-october-2026--kan-15-decision-d8-follow-up"></a>
[28 October 2026 — KAN-15 decision D8 follow-up](archive/2026-11-05/assumptions-and-questions.md#28-october-2026--kan-15-decision-d8-follow-up)

<a id="28-october-2026--kan-82-independent-venue-arrangement-decisions"></a>
[28 October 2026 — KAN-82 independent venue arrangement decisions](archive/2026-11-05/assumptions-and-questions.md#28-october-2026--kan-82-independent-venue-arrangement-decisions)

<a id="29-october-2026--kan-82-replacement-approval-lock-order-review-follow-up"></a>
[29 October 2026 — KAN-82 replacement approval lock order (review follow-up)](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-82-replacement-approval-lock-order-review-follow-up)

<a id="29-october-2026--kan-80-change-action-and-recipient-interpretation"></a>
[29 October 2026 — KAN-80 change-action and recipient interpretation](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-80-change-action-and-recipient-interpretation)

<a id="29-october-2026---pr-70-attendee-change-notification-scope"></a>
[29 October 2026 - PR #70 attendee-change notification scope](archive/2026-11-05/assumptions-and-questions.md#29-october-2026---pr-70-attendee-change-notification-scope)

<a id="29-october-2026--kan-14-attendee-registration-rules-and-what-attendees-may-see"></a>
[29 October 2026 — KAN-14 attendee registration: rules and what attendees may see](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-14-attendee-registration-rules-and-what-attendees-may-see)

<a id="29-october-2026--kan-18-stock-maintenance-shortfall-and-notice-rules"></a>
[29 October 2026 — KAN-18 stock maintenance: shortfall and notice rules](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-18-stock-maintenance-shortfall-and-notice-rules)

<a id="29-october-2026--kan-61-confirmation-implementation-decisions"></a>
[29 October 2026 — KAN-61 confirmation implementation decisions](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-61-confirmation-implementation-decisions)

<a id="29-october-2026--kan-61-review-fix-current-venue-conflicts-block-confirmation"></a>
[29 October 2026 — KAN-61 review fix: current venue conflicts block confirmation](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-61-review-fix-current-venue-conflicts-block-confirmation)

<a id="29-october-2026--kan-84-safety-review-implementation-decisions"></a>
[29 October 2026 — KAN-84 safety review implementation decisions](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-84-safety-review-implementation-decisions)

<a id="29-october-2026--kan-84-review-fixes-pr-78"></a>
[29 October 2026 — KAN-84 review fixes (PR #78)](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-84-review-fixes-pr-78)

<a id="29-october-2026--kan-61-d7-correction-current-operational-blocks"></a>
[29 October 2026 — KAN-61 D7 correction: current operational blocks](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-61-d7-correction-current-operational-blocks)

<a id="29-october-2026--kan-84-pr-78-follow-up-d12"></a>
[29 October 2026 — KAN-84 PR #78 follow-up (D12)](archive/2026-11-05/assumptions-and-questions.md#29-october-2026--kan-84-pr-78-follow-up-d12)

<a id="30-october-2026--sprint-4-acceptance-clarification-and-corrections"></a>
[30 October 2026 — Sprint 4 acceptance clarification and corrections](archive/2026-11-05/assumptions-and-questions.md#30-october-2026--sprint-4-acceptance-clarification-and-corrections)

<a id="1-november-2026--release-regressions-and-kan-84-restoration-correction"></a>
[1 November 2026 — release regressions and KAN-84 restoration correction](archive/2026-11-05/assumptions-and-questions.md#1-november-2026--release-regressions-and-kan-84-restoration-correction)

</details>
