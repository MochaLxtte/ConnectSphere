# Sprint 2 planning and meeting record

## Sprint boundary and goal

| Field | Record |
| --- | --- |
| Sprint | 2; initialized in Jira after Sprint 1 closure |
| Period | 20 September–3 October 2026, inclusive |
| Timezone | Asia/Singapore |
| Jira boundary | 20 September 00:00–4 October 00:00; covers the inclusive 3 October final day. This is the sprint boundary, not a recorded meeting time. |
| Planning date | Sunday 20 September 2026; exact times and location not recorded |
| Scheduled review / next planning | Saturday 3 October / Sunday 4 October 2026 |
| Retrospective | Slot to confirm |
| Attendees, absences, facilitator and note taker | Not recorded |
| Record prepared | 21 September 2026; asynchronous implementation update added 28 September |
| Supporting meeting/Jira records | To attach in the [evidence register](evidence/README.md) |

**Sprint goal: Enable submitted requests to reach an assigned coordinator, and enable coordinators to identify suitable available venues from a maintained catalogue, request bookings, and receive Venue Staff decisions without conflicting bookings.**

The intended demonstration follows an event request through assignment, venue search and suitability, a booking request, and a Venue Staff decision, then shows the resulting calendar state and conflict protection. Carry-over work restores the reported organiser and coordinator paths needed to reach that demonstration.

## Recorded planning decisions

| Topic | Decision or status |
| --- | --- |
| Sprint transition | Tristan merged the team branches into `main`; Sprint 1 was closed in Jira and Sprint 2 initialized. |
| New scope | Nine stories, 35 points: eight Must stories at 32 points and KAN-55 Supporting at 3 points. |
| Carry-over | KAN-6, KAN-33 and KAN-34 remain unfinished and move into Sprint 2 at their retained original estimates, totaling 8 points. The confirmed combined baseline is 12 PBIs / 43 points. |
| Workload target | Approximately six new-story points per member across six members. Allocation has not been agreed; carry-over effort is additional. |
| Calendar users | Event Coordinators, Venue Staff and Technical Support Staff are the authorized internal calendar users. |
| Coordinator assignment | Coordinators may assign requests to themselves or another coordinator. Authority to hand over an already-assigned request still needs clarification. |
| KAN-29 boundary | Automatically assigning a submitted request to an available coordinator remains the selected story; the manual-assignment decision does not replace it. |
| Automatic assignment rule | Use preconfigured coordinator availability, select the available coordinator with the fewest active events, then break ties using a consistent ID/order. Define the stored availability field, active-event statuses and the no-eligible outcome. An availability-management interface is not required. |
| Ceremony cadence | Daily Scrums three times a week on Tuesday, Thursday and Saturday; review on the final Saturday of each two-week sprint; planning and the next sprint start on the following Sunday. |

The nine new story cards retain the **detailed planning version**, with stable repository criterion IDs for test traceability. The pre-edit export contained 77 criteria compared with 93 in that version. The six shorter Jira cards now include the missing checks and dated customer-rule refinements; KAN-29/KAN-50/KAN-51 already matched. Keep the repository IDs stable and use the [applied-change record](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied) when cross-referencing the wording. The cards remain a detailed planning/test version rather than a verbatim Jira export. Implementation tasks, extra robustness checks, estimation rationale and delivery sequence remain proposals.

## Team and accountabilities

| Member | Sprint 2 story ownership | Review responsibility | Development availability |
| --- | --- | --- | --- |
| Ryan | To agree | To agree | Not recorded |
| Ernest | To agree | To agree | Not recorded |
| Kai Jie | KAN-6 / KAN-34 carry-over; new stories to agree | To agree | Not recorded |
| Irfan | KAN-33 carry-over; new stories to agree | To agree | Not recorded |
| Tristan | KAN-29 automatic assignment (3 points), taken up 28 September | To agree | Not recorded |
| Arvin | To agree | To agree | Not recorded |

Irfan is Product Owner and Arvin is Scrum Master; both also work as developers. Allow time for these responsibilities in the capacity plan. Sprint 1 ownership identifies useful implementation context; it does not establish Sprint 2 allocation. Confirm each member's carry-over, integration and review responsibilities alongside the new stories.

The table records the repository allocation for KAN-29. Its live Jira assignee has not been changed or rechecked by this implementation; the other eight new-story owners and all reviewers remain pending. The original planning decisions above retain their meeting-time context; the dated choices below are implementation details awaiting team/customer acceptance, not reconstructed meeting decisions.

## Existing implementation and integration boundaries

- **26 September baseline change:** `main` commit `dff42ed` removed the venue services, UI and associated tests so the team can implement the selected venue stories. Migration 005 retains their tables and integrity guards. Earlier descriptions of existing venue pages, broad role access, suitability gaps and booking-note projections are historical inspection findings; they do not describe current implemented features.
- KAN-29 now uses [automatic selection](../../../backend/src/modules/events/automatic-assignment.ts) inside the [submission transaction](../../../backend/src/modules/events/submit-request.ts). [Migration 007](../../../database/migrations/007_automatic_coordinator_assignment.sql) adds availability defaulting to false and automatic/manual history provenance. Opt in provisioned coordinators explicitly; do not enable fictional seeds.
- **28 September implementation choices, awaiting team/customer acceptance:** count `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `CONFIRMED`; choose the fewest active events, then ascending application-profile UUID. No eligible candidate returns `409 NO_AVAILABLE_COORDINATOR` without submitting or allocating; the draft stays editable for retry. A preassigned draft returns `409 DRAFT_ALREADY_ASSIGNED` and preserves its data. Assignment does not make an initial review decision.
- Existing [manual assignment/handover](../../../backend/src/modules/events/assignment.ts) retains its current permissions and target list. No new handover policy is adopted by KAN-29. Automatic history has a null assigning actor; manual history retains the actor. Existing submitted requests are not backfilled or automatically reallocated.
- Venue implementation still needs the agreed calendar role matrix, complete suitability matching and a requirements path into staff booking review. Preserve these planned requirements when implementing the currently absent services/UI.
- Preserve one shared event-detail contract across draft editing, coordinator review and organiser status. Carry-over repairs should keep authorization, action flags, persistence and UI navigation consistent.
- [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment) records local automated KAN-29 coverage, including 51 targeted PostgreSQL checks (29 automatic, 12 submission, 10 manual assignment). Hosted rollout/manual checks, CI and peer review remain outstanding. Follow the [manual guide](../../testing/kan29-manual-checks.md) after coordinating shared schema/history reconciliation and migration 007 with Arvin; no shared migration is claimed here.

## Proposed delivery sequence

| Proposed window | Focus | Observable checkpoint |
| --- | --- | --- |
| 20–22 September | Agree allocation and policy questions; reproduce carry-over paths; inspect existing code | Reproduction records, agreed criteria and a reconciled backlog baseline |
| 23–25 September | Carry-over repairs, automatic assignment, catalogue and calendar access | Saved draft can reach the authorized coordinator; venue data and calendar roles agree |
| 26–28 September | Search, suitability, booking and staff decisions | One connected request-to-booking path persists across refresh |
| 29 September–2 October | Conflict/concurrency checks, operational blocks and integrated regression | Accepted normal, boundary, permission and failure cases with retained evidence |
| 3 October | Planned review and retrospective slot to confirm | Actual acceptance, unfinished work and process actions recorded |

These are proposed coordination windows, not actual progress or an agreement to work every day. Review and testing should run throughout the sprint.

## Dependencies and open decisions

| ID | Question or risk | Needed outcome | Owner / due date |
| --- | --- | --- | --- |
| S2-Q01 | Are the 28 September implementation choices accepted? | `coordinator_available` defaults false, explicit opt-in; active means SUBMITTED/UNDER_REVIEW/CLARIFICATION_REQUESTED/APPROVED/CONFIRMED; least load then UUID ascending; no eligible candidate gives `409 NO_AVAILABLE_COORDINATOR`, preserving the editable draft. Verify hosted retry/concurrency behaviour without changing the agreed fewest-active rule. | Tristan implementation; team/customer acceptance and hosted verification pending |
| S2-Q02 | Who may hand over an already-assigned request? | Distinguish KAN-29 automatic initial assignment from KAN-65 reassignment. The latter is future work outside Sprint 2; reconcile current code and the self/other-assignment decision without adding scope implicitly. | Handover authority to agree |
| S2-Q03 | What calendar information may each internal role see, and who may use protected venue search? | Calendar roles are settled; agree labels/block reasons and separately define KAN-12 search permissions. The removed search implementation accepted any authenticated role; that historical behaviour must not become the new access policy. Calendar access does not itself grant search, booking, edit or approval rights. | To agree |
| S2-Q04 | What are the remaining booking-time and availability boundaries? | An already reserved period must prevent submission, as well as conflicting confirmation. The current booking status is APPROVED, distinct from event CONFIRMED. No turnover buffer is required. Define pending/tentative treatment and document adjacency and Singapore-time rules; current overlap checks allow adjacent periods. | Submission protection and no turnover settled; remaining boundaries to agree |
| S2-Q05 | How are the required event needs represented and matched, and what follows an unsuitable result? | Jira already requires capacity, required facilities, applicable accessibility/layout and availability checks. Define structured event needs, matching rules and handling of missing inputs; distinguish an unsuitable verdict from whether a request may still be sent for staff assessment. | To agree |
| S2-Q06 | Which event states and actor relationships allow booking requests and staff review? | Define eligible event states, authorized coordinator/event relationships and whether all Venue Staff or only staff responsible for that venue may review. The removed implementation allowed organiser booking; retaining that behaviour would need an explicit scope decision, because the selected story grants coordinator booking. | To agree |
| S2-Q07 | How do operational blocks interact with existing bookings? | Clarify whether creating the new block is refused for an existing pending/confirmed reservation. The customer answer does not unambiguously identify the refused operation; do not infer automatic cancellation or displacement. | To clarify |
| S2-Q08 | Can capacity support new work plus carry-over? | Actual availability and allocation for the confirmed 43-point baseline; explicit priority adjustments if needed | To agree |
| S2-Q09 | Four reported carry-over paths coexist with successful Sprint 1 demos | Reproduce exact paths and record differences in data, route, role and build before diagnosing | To agree |
| S2-Q10 | What information accompanies a venue booking and its rejection? | The retained schema can store layout/notes; the removed implementation displayed them and required a rejection reason. Define the new staff information path, current values versus a submission snapshot, the mandatory-reason policy and what the coordinator sees. | To agree |
| S2-Q11 | Does catalogue maintenance include adding, retiring or deleting venues? | KAN-50 currently specifies viewing and updating venue information. Decide whether additional lifecycle operations belong in this story or later scope; do not assume them from the existing implementation. | To agree |

## Jira refinements to record

The selected nine stories cover the venue workflow. Live Jira was refined on 21 September; the table distinguishes the recorded changes from decisions still needed. No points were added. See the [complete change record](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied).

| Affected story | Recorded change / remaining refinement | Repository record / status |
| --- | --- | --- |
| KAN-51; KAN-12 | Three-role calendar access is explicit in the revised story. Specify permitted labels/details and define protected-search permissions separately. | Calendar role wording aligned; S2-Q03 tracks the remaining detail visibility and search policy. |
| KAN-29 | Review and record the implemented availability field, counted statuses and no-eligible failure policy, plus Tristan's allocation. A successful submission cannot silently remain unassigned. | Implementation choices are documented on 28 September; S2-Q01 tracks their team/customer acceptance. No availability-management UI or live Jira assignee/policy update is claimed by this implementation. |
| KAN-29 / KAN-65 reassignment | Record the agreed self/other-coordinator option and who can reassign an already assigned request. | KAN-65 now records reassignment as an unestimated future story outside Sprint 2. KAN-29 remains automatic initial assignment; S2-Q02 handover authority remains open. |
| KAN-51, KAN-53, KAN-54, KAN-55 | Explicitly block booking submission against an already reserved period. Define pending/tentative treatment and document adjacent intervals and timezone with no turnover buffer. Clarify new blocks overlapping existing bookings. | S2-Q04/Q07. Refusing a later confirmation alone does not satisfy the booking-submission rule. |
| KAN-52, KAN-53, KAN-8 | Define how event facilities/layout/accessibility needs reach suitability checks and the staff booking view; clarify rejection-reason requirements. | S2-Q05/Q10. Facilities and applicable layouts are already required checks, not optional additions. |
| KAN-6, KAN-33, KAN-34 | Add linked bug/subtask records with reproducible steps and acceptance checks for S1-DEF-01–04, retaining the successful review paths. | Created KAN-56 (KAN-33 / S1-DEF-02), KAN-57 (KAN-34 / S1-DEF-01), and KAN-58/KAN-59 (KAN-6 / S1-DEF-03/04). These unestimated subtasks remain within the carried stories' eight points; fixes and retests remain open. |
| KAN-6 | Write the submission field checklist: event date and attendance are mandatory; optional needs may be None / Not Required. Define remaining fields and conditional registration requirements. | Minimum requirements now settled; connect the checklist to S1-DEF-03/04. |
| KAN-21 / KAN-55 | Consolidate duplicate operational-block scope, transferring the mandatory-reason rule. | KAN-21 is archived and retains its duplicate link to KAN-55. KAN-55 includes the mandatory reason and retains its three Sprint 2 points. |
| KAN-12, KAN-52, KAN-53, KAN-8, KAN-54, KAN-55 | Reconcile shorter Jira wording with the detailed planning cards; keep meaningful correctness checks either as explicit criteria or linked test cases. | The pre-edit export had 77 criteria versus 93 planning criteria. Missing correctness checks are now recorded in the six Jira cards. Existing repository IDs and evidence remain stable; detailed cross-referencing and the remaining policy choices are still required. |

The [product backlog](../../requirements/product-backlog.md) consolidates future release work. KAN-60 tracks the rejection-reason correction; KAN-61–KAN-64 cover confirmation, cancellation, equipment-request review and notifications; KAN-65–KAN-67 cover reassignment, ordinary planning edits and registration viewing. KAN-15 includes significant-change submission and review. KAN-19/KAN-22/KAN-23 are archived optional waitlist/human-staffing scope. These refinements do not change the 43-point baseline; future prioritisation, policy decisions and estimates still need team agreement.

Tristan owns KAN-29 in this repository plan. Assign the remaining eight new stories and record reviewers, dependencies and capacity for the full 43-point scope. The 21 September Jira snapshot retains Kai Jie on KAN-6/KAN-34 and Irfan on KAN-33; no new live snapshot is claimed. Simultaneous booking approvals, stale availability and repeated submissions can be supporting implementation/test work rather than extra pointed stories. Any genuine added scope needs an agreed estimate and a scope-change entry.

Record answers and rationale in the [shared clarification log](../../requirements/assumptions-and-questions.md), then update affected criteria, tests, estimates and architecture together.

## Working agreement and records

Use [daily progress](daily-progress.md) for actual check-ins and adaptations. Daily Scrums are scheduled for 22, 24, 26 and 29 September, and 1 and 3 October. Exact times and attendees are not recorded; the 3 October Daily Scrum and review need separate meeting records. Use reviewed PRs, coordinated database migrations and the shared [Definition of Done](../definition-of-done.md). Record any unresolved adoption details before story acceptance.
