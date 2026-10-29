# Event proposal workstream

## 29 October 2026 — KAN-80 notification integration

Allowed KAN-15 attendee-relevant approved changes create active-attendee notifications within the decision transaction, without bypassing its cancel-and-resubmit checks. Change submissions, decisions and withdrawals retain their change-request ID on notifications; decision acknowledgements include the current coordinator. Migration 019 handles final confirmation outcomes in the event status transaction. KAN-62 is the single cancellation-outcome writer and notifies staff for arrangements released by that cancellation. The KAN-61 confirmation workflow remains a separate dependency and is not supplied by this hook. See [API contract](../../../../docs/architecture/api-contract.md#29-october-2026--kan-17-kan-67-and-kan-80-registration-outcomes).

## KAN-62 event cancellation

`POST /api/events/:id/cancel` accepts `{ "reason": "...", "confirmAffectedArrangements": true }`.
Only the owning organiser or currently assigned coordinator may cancel an event in
SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED or CONFIRMED. The transaction
rechecks the acting profile, locks venue gates and booking rows before the event, then locks
equipment pools and lines in UUID order. It cancels active venue bookings and equipment lines, closes active
registrations, stores immutable cancellation details, records the status transition, and
writes organiser/coordinator/attendee inbox notifications through KAN-64. Attendee messages
contain the outcome and omit the internal reason; attendee inbox reads require the matching
cancelled registration, return no event DTO or planning link, and link only to the recipient's own registration. `GET /api/events/:id/cancellation` returns
the saved organiser/coordinator outcome. Repeated, draft, rejected and completed actions
write nothing.
If a new booking appears between the initial booking snapshot and the event lock,
`409 EVENT_ARRANGEMENTS_CHANGED` rolls back the action; reload before retrying. The stored
equipment-release count includes RESERVED rows released by migration 015's trigger and the
REQUESTED/REJECTED rows cancelled by the service. Original allocation and decision history stays intact.
The organiser/coordinator detail page includes the cancellation form and displays the saved
reason/time after reload; attendee inbox notices state the outcome without exposing the reason.

## KAN-63 equipment request workflow

`POST /api/events/:id/equipment-requests` lets the assigned coordinator of an APPROVED event
save REQUESTED lines with equipment type, positive quantity, period and technical requirements.
The request body includes the required opaque `revision` from
`GET /api/events/:id/equipment-requests`. It hashes the current event and all saved line/audit
values, including changes made through KAN-26; it is not the integer equipment-line revision.
Set `notRequired: true` with an empty `lines` list only when no non-cancelled required line
exists. `GET /api/equipment-requests` is available to Technical Support Staff and assigned
coordinators; `eventId` narrows the list. Technical Support Staff review a line at
`POST /api/equipment-requests/:id/review` with `RESERVED` or `REJECTED` and a required rejection
reason and the current opaque revision. Reservation reuses KAN-26's full-line writer, checks
current operational stock after locking, and records the same coordinator/Technical Support
notifications in the transaction. The database trigger remains the final capacity guard.
A reserved line is immutable; the assigned coordinator must use
`POST /api/equipment-requests/:id/replace` with the current plan revision and a replacement line.
The old reservation is cancelled atomically and the replacement returns to REQUESTED for staff
review. The routes use verified-session identity and request-specific access checks.
Coordinators use the event planning panel; Technical Support Staff use the request queue. Both
views reload persisted request lines and review outcomes from the API.
`POST /api/equipment-requests/:id/cancel` requires `{ reason, revision }` and permits only
REQUESTED/REJECTED lines; reserved lines use explicit replacement or KAN-26 cancellation.
All writes require an APPROVED event, exact current event periods and current assignment/role.
Stale plans return `409 STALE_EQUIPMENT_REQUEST` without saving. CONFIRMED plans are read-only.

Ernest owns event creation and draft saving; Kai Jie owns draft editing and submission. Irfan owns coordinator review and clarification; Tristan owns approval/rejection, organiser-facing status and the KAN-29 automatic-assignment implementation. These workstreams share this directory, with Arvin supporting database setup and cross-feature integration. Coordinate the field names in `types.ts` with the frontend event forms and database migrations before changing a contract.

The normal server exposes organiser lists, shared request details, owned-draft updates and submission, the assigned coordinator's review queue, and approval/rejection. For organisers, `GET /api/events` preserves the own-draft list; `GET /api/events?scope=all` includes all of their request statuses, newest update first, and supplies the organiser page at `/events`. The shared detail GET returns `review` and caller-specific `actions` alongside the event fields. The coordinator interface consumes these fields, and KAN-16's request titles link to a read-only organiser view at `/events/:id` using the same GET. It displays status and any recorded outcome, reason and time without exposing write controls. No additional handler or schema change is needed for this view. Hosted organiser checks cover outcome display/refresh, signed-out detail access, Draft/Submitted detail states and another organiser's denied detail access and empty list (MAN-20260917-01 through MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). The remaining submission-to-status check is in [test evidence](../../../../docs/testing/test-evidence.md).

`submitted-requests-router.ts` owns the shared GET, draft PATCH and submit routes; `review-router.ts` owns decision writes. Services validate runtime input, enforce ownership/assignment and lock rows during state changes. Review creation and the matching status update commit together. TypeScript interfaces do not validate untrusted HTTP input. Preserve parameterized queries, server-derived identity and transaction boundaries when adding features; preserve `false` and `0` as values when handling nullable fields.

The schema supports `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `REJECTED`, `CONFIRMED`, `CANCELLED` and `COMPLETED`. Draft creation/editing/submission, review start, clarification and initial decisions are implemented. KAN-62 adds cancellation for eligible states through the endpoint above; migration 015 releases RESERVED equipment automatically when the event becomes terminal, and migration 018 records cancellation and equipment planning data. An existing decision prevents another initial decision. Decided requests leave the pending queue but remain readable to the owning organiser and currently assigned coordinator.

All editable fields allow `null` for incomplete drafts. Submission currently requires `name`, `purpose`, `startsAt`, `endsAt`, `expectedAttendance` and `venueRequirements` under the team's provisional rule; customer clarification remains open. Initial decisions currently permit an optional reason; the API contract separately records the required correction for rejection reasons. Access to assigned work compares `coordinator_id` with the verified coordinator's application ID.

## KAN-79 Lead allocation — 19 October 2026

`submit-request.ts` validates the owned draft and changes its status to `SUBMITTED` in one transaction, with `coordinator_id` still null. It does not select a coordinator, insert assignment history, approve/reject the event or depend on an available staff profile. A draft with an unexpected coordinator or active history still returns `409 DRAFT_ALREADY_ASSIGNED`; the existing data is preserved for investigation. The previous automatic selection helper was removed from current application code.

`assignment-router.ts` and `assignment.ts` enforce `EVENT_COORDINATOR_LEAD` at both the HTTP and service boundaries. `GET /api/events/unassigned` lists only submitted/unassigned requests. `GET /api/events/oversight` lists all active non-draft events and their current coordinator; `GET /api/events/oversight/:id` returns basic allocation information with `actions.canAssignCoordinator`. Active states are `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED`. Drafts and closed events are excluded. Lead reads are separate from the shared organiser/coordinator detail response and never confer review, clarification, venue or roster authority.

The target list contains only available `EVENT_COORDINATOR` profiles. `PUT /api/events/:id/coordinator` locks the event, checks its current state and assignment history, then locks and rechecks the selected profile before saving its link and a `MANUAL` history row with the acting Lead. A concurrent winner causes a stale attempt to receive `409 COORDINATOR_ALREADY_ASSIGNED`; no history is replaced or duplicated. Invalid/unavailable targets return `400 INVALID_COORDINATOR`, while inconsistent active history returns `409 ASSIGNMENT_HISTORY_CONFLICT`. Failed persistence rolls the transaction back. There is no reassignment or notification side effect in this story.

Owners and assigned coordinators retain read-only assignment history. Leads may read it for active events; ordinary coordinators cannot read unassigned or unrelated events. Historical `AUTOMATIC` records keep their null actor and original timestamps, and existing current assignments remain unchanged. Initial allocation remains visible after success through Lead oversight and the assigned coordinator's ordinary review pages.

Deploy migration [007](../../../../database/migrations/007_add_coordinator_lead.sql), trusted Lead provisioning and the changed UI/API together; see [database rollout](../../../../database/README.md#kan-79-lead-assignment-rollout). KAN-65 adds Lead reassignment and KAN-64 supplies assignment notifications separately. Their combined acceptance check remains pending. Local automation and the remaining hosted cases are in [test evidence](../../../../docs/testing/test-evidence.md); no shared migration or hosted acceptance is implied by code completion.

The focused service tests are [lead-assignment.test.ts](../../../test/events/lead-assignment.test.ts); HTTP boundaries are in [workflow-routers.test.ts](../../../test/events/workflow-routers.test.ts). Submission regressions retain KAN-6/KAN-59 validation coverage in [submit-request.test.ts](../../../test/events/submit-request.test.ts). PostgreSQL [Lead assignment tests](../../../../database/tests/events/lead-assignment.integration.test.ts) exercise real row locks and runtime authentication; historical automatic data is seeded explicitly in the retained [submission-policy regression suite](../../../../database/tests/events/automatic-assignment.integration.test.ts). These paths identify coverage locations; actual run outcomes belong in the test evidence record.

**21 October integration follow-up:** the initial-assignment behavior above describes KAN-79 at its 19 October implementation checkpoint. KAN-64 now writes organiser/new-coordinator notices in that same transaction, and KAN-65 performs handovers through its separate endpoint below. Submission, clarification and review services also write their organiser notices before committing. A failed notification insert rolls back the action; keyed outcomes suppress duplicates. KAN-64 requires migration 008, whose shared application remains pending. The [notification module](../notifications/README.md) describes recipients and current-access filtering. Local implementation does not establish hosted acceptance.

## KAN-65 coordinator reassignment — 19 October 2026

`POST /api/events/:id/coordinator/reassign` is separate from initial allocation. Both the router and service require a trusted `EVENT_COORDINATOR_LEAD`. The body is exactly `{ coordinatorId, reason, expectedAssignmentVersion }`: IDs must be UUIDs; reason is trimmed, nonempty plain text of at most 2,000 characters. Active states match KAN-79. Drafts are concealed with `404 EVENT_REQUEST_NOT_FOUND`; Rejected, Cancelled and Completed return `409 ASSIGNMENT_NOT_ALLOWED`.

The Lead detail now includes `assignmentVersion` and `actions.canReassignCoordinator`. The version is the UUID of the single active `coordinator_assignments` row matching `event_requests.coordinator_id`; it is null when this relationship is absent or inconsistent. A consistent unassigned request must use initial allocation (`409 COORDINATOR_NOT_ASSIGNED` on reassignment). Missing/mismatched active history fails closed with `409 ASSIGNMENT_HISTORY_CONFLICT`; the API preserves historical data for reconciliation.

`reassignCoordinator` locks the event and active history, checks the expected UUID, then locks/rechecks the new target's current role and availability. A stale version returns `409 ASSIGNMENT_VERSION_CONFLICT`, including an A → B → A sequence. With a current version, choosing the current coordinator returns `changed: false` without changing timestamps or creating history; their current availability does not matter because no new assignment occurs. An actual handover closes the old interval, inserts a MANUAL row containing the Lead and reason, and updates the current linkage together. The old end/new start use one PostgreSQL timestamp captured after lock waits, without losing database precision. Any failure rolls everything back; event status, decisions, clarifications and bookings are retained. Success returns `{ eventRequestId, assignmentId, coordinatorId, previousCoordinatorId, changed }`.

Current assignment remains the access boundary. Existing review, start-review, clarification and venue-submission writers check it under an event lock. `inEventReadTransaction` additionally protects assignment, clarification and status-history reads with `FOR SHARE` until their authorisation and data query finish: a concurrent handover either waits for that read, or the former coordinator is denied. Booking/suitability reads and queue/detail policies also use the current assignment. Lead oversight still grants no review or venue-decision authority.

No schema change is needed. Migration 007 application and Lead login were reported successful on 19 October; hosted workflow acceptance is deferred. KAN-64 now writes the handover notifications in the same transaction (organiser, new coordinator, and a minimal notice to the previous coordinator); hosted verification of them is still pending. Service/HTTP coverage is in [reassignment.test.ts](../../../test/events/reassignment.test.ts), [workflow-routers.test.ts](../../../test/events/workflow-routers.test.ts) and [reassignment-access.test.ts](../../../test/events/reassignment-access.test.ts); persistence, concurrent handovers and old/new access checks are in [reassignment.integration.test.ts](../../../../database/tests/events/reassignment.integration.test.ts). Actual results are recorded in [AUTO-20261019-02](../../../../docs/testing/test-evidence.md#19-october-2026--kan-65-coordinator-reassignment).

## KAN-29 automatic assignment on submission

**Historical policy, superseded for new submissions by KAN-79 on 19 October 2026.** The following implementation and 30 September schema evidence remain the original record. The former helper is available in [the earlier implementation](https://github.com/MochaLxtte/ConnectSphere/blob/8f29d35/backend/src/modules/events/automatic-assignment.ts); it is not called or retained as an active allocation path.

`submit-request.ts` calls `automatic-assignment.ts` after checking ownership, draft status and completeness. The same transaction selects a coordinator, records assignment history and changes the request to `SUBMITTED`. No approval/rejection record is created. A repeated submission fails the existing non-draft check and cannot select a replacement coordinator or add another initial assignment.

Candidates have role `EVENT_COORDINATOR` and `app_users.coordinator_available = true`. Migration [006](../../../../database/migrations/006_automatic_coordinator_assignment.sql) adds this explicit availability flag with default `false`; provisioning and opt-in are described in [database setup](../../../../database/README.md#kan-29-automatic-assignment-setup). Workload counts `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED` requests. The smallest count wins, with ascending application-profile UUID as the tie-break. Assignment writers lock coordinator rows consistently and count workload after acquiring the locks, so concurrent allocations see committed prior allocations.

`409 NO_AVAILABLE_COORDINATOR` leaves the saved request as an editable draft with no allocation; both organiser submission interfaces show the explanation and allow saving and retrying. `409 DRAFT_ALREADY_ASSIGNED` preserves any pre-existing draft coordinator or active assignment history for investigation. It does not silently replace manually prepared data. Existing submitted requests are not backfilled. Manual initial assignment remains available only for unassigned requests in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED` or `APPROVED`, as supporting Sprint 2 planning behavior. Later legacy states remain readable but cannot be assigned through this action. Existing assignments cannot be handed over: the assigned coordinator receives `409 REASSIGNMENT_NOT_AVAILABLE` and other coordinators retain the generic unavailable response. Automatic availability does not restrict the initial manual target list. Notification side effects are removed. Status-history reads remain in `status-history.ts`/`status-history-router.ts`.

Assignment-history responses contain `assignmentMethod: 'AUTOMATIC' | 'MANUAL'`. Automatic entries have null `assignedById`/`assignedByName` and display as "Assigned automatically"; manual entries retain the acting staff member. The owning organiser sees the assignment read-only and the assigned coordinator can access their queue and request details.

**30 September schema follow-up:** Tristan has applied migration 006 to shared Supabase. The [schema verification](../../../../docs/testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirmed its fields and constraint, and all six current migration checksums matched hosted history through the recognised filename aliases. Confirm provisioned-coordinator opt-in and follow the [manual checks](../../../../docs/testing/README.md#kan-29-hosted-verification). Hosted manual acceptance, availability-policy acceptance, CI and peer review remain pending; retain existing dated evidence separately.

See the [API contract](../../../../docs/architecture/api-contract.md) and [decision log](../../../../docs/requirements/assumptions-and-questions.md) before changing these rules. Add a migration if the stored vocabulary changes. Future venue, equipment, attendance and scheduling work should have their own modules as those stories enter a sprint.

**KAN-60 — 21 October 2026.** `review-input.ts` requires a trimmed nonblank reason for rejection and applies the shared `MAX_TEXT_LENGTH` (2,000 characters, exported by `workflow-support.ts`) to every review reason. `ReviewInputError.field` names the offending field, and `review-router.ts` returns it as `field` in `400 INVALID_REVIEW_INPUT`. Validation runs before the decision transaction opens, so a refused rejection writes nothing. Approval without a reason is unchanged.

## KAN-34 date validation — 21 October 2026

`draft-update-input.ts` validates the actual calendar day before a draft create/update reaches SQL; `Date.parse` alone normalises impossible dates. All four editable date fields retain explicit timezone offsets and nullable clears. Unit cases include leap/century boundaries; PostgreSQL HTTP regressions verify 400 and unchanged storage. Form/browser regressions verify saved registration toggles and explicit clearing. AUTO-20261021-KAN78-01 records local results; hosted acceptance remains Not executed.

## 25 October 2026 — PostgreSQL-compatible draft date bounds

The shared create/update parser additionally refuses year `0000` and offsets beyond `±15:59`. Valid four-digit AD years and supported offsets retain their ISO input; null clears and omitted fields keep their existing behavior. Unit tests cover both create/update paths; real PostgreSQL HTTP tests cover all four editable date fields, valid edges and unchanged drafts after HTTP 400. The dedicated parser coverage is 100%; full verification is recorded as `AUTO-20261025-CLOSEOUT-01`. Review decision and clarification times use the shared Singapore formatter in the review page.

## KAN-66 planning edits — 26 October 2026

`planning-edit-policy.ts` holds the edit rules: `editPermissionFor` (what this viewer may edit now, used by the detail response) and `assertCanEditFields` (the write-time check, with the refusal reason). `update-draft.ts` exports `updateEventRequest`, which replaces `updateOwnedDraft`: it locks the row, applies the policy, requires `expectedRevision` after submission, skips unchanged values, re-runs submission validation for non-draft edits and writes an `event_request_edits` row in the same transaction. `draft-update-input.ts` separates `expectedRevision` from the field changes. `workflow-support.ts` adds `revision` to `LockedEventRequest` plus `parseExpectedRevision` and `assertExpectedRevision`; `review-decision.ts` and `clarifications.ts` use them for the optional reviewer revision check. Migration 014 supplies the column, trigger and audit table. Contract: [API contract](../../../../docs/architecture/api-contract.md#kan-66-planning-edits-and-revisions--26-october-2026). Significant fields after approval are refused for KAN-15 to handle; KAN-15 is not yet implemented.

## KAN-15 change requests — 27 October 2026

`change-requests.ts` holds the workflow (`submitChangeRequest`, `listChangeRequests`, `decideChangeRequest`, `withdrawChangeRequest`); `change-request-impact.ts` is the pure field-to-arrangement rule set (`assessChangeImpact`) used for the coordinator's preview and rechecked under lock at decision time; `change-request-router.ts` mounts the routes under `/api/events/:id/change-requests`. Approval reuses KAN-66's `sameValue`, column map and `event_request_edits` audit. Notices live in `../notifications/change-request-notifications.ts`, outside the KAN-64 matrix.

## 28 October 2026 — cancellation, equipment and change-request integration

`arrangement-locks.ts` supplies the shared venue gate → booking → event locking protocol for
KAN-62 cancellation and KAN-15 approval, including a post-event-lock check for newly created
bookings. KAN-15 marks affected REQUESTED equipment lines cancelled with release actor/time,
reason, `MANUAL_CANCELLATION` cause and a new line revision. An approved change affecting
equipment or timing resets `equipment_plan_status` to `REQUIRED`, so an earlier Not Required
declaration does not survive changed requirements. Confirmed arrangements still require the
existing cancel-and-resubmit path. These repairs use migrations 015–018; no extra migration is added.

The KAN-66 migration mentioned as 014 in its historical 26 October entry is now
`016_event_request_revisions.sql`; KAN-15 is implemented in migration 017 and its routes above.
The current cancellation/request rules supersede the initial 27 October contract in the
[API history](../../../../docs/architecture/api-contract.md#28-october-2026--kan-62kan-63-repaired-contract).

Cancellation unit/HTTP cases are in `backend/test/events/KAN-62-63-arrangements.test.ts` and
`backend/test/events/cancellation-safety.test.ts`; real PostgreSQL coverage is in
`database/tests/events/cancellation-equipment.integration.test.ts` and
`database/tests/events/cancellation-safety.integration.test.ts`. They cover venue-decision and
equipment-reservation races, new-booking conflicts, rollback, release counts, replay and attendee
privacy. Equipment and change-request tests are recorded in their module/contract sections;
the run outcomes and manual acceptance boundaries remain in [test evidence](../../../../docs/testing/test-evidence.md).
