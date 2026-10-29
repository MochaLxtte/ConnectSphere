# API contract

## 29 October 2026 — KAN-17, KAN-67 and KAN-80 registration outcomes

These endpoints require the verified application session and set `Cache-Control: no-store`. Migration 019 must be applied to the target database before using this version; it has only been applied to an isolated local test database. KAN-14 owns event discovery, registration creation and re-entry.

| Method / route | Actor | Result |
| --- | --- | --- |
| `GET /api/registrations/mine` | Attendee | `{ items }` for the caller only. Items contain registration/event IDs, event name and status, event start and end, purpose, registration/withdrawal/cancellation timestamps and `canWithdraw`. |
| `POST /api/registrations/:id/withdraw` | Owning attendee | Body `{ "confirm": true }`; returns `{ changed, registration }`. The existing row is marked `WITHDRAWN` under event → registration locks, before event start; a replay before that cutoff returns `changed: false` without a second release or notice. A request at or after start is refused. |
| `GET /api/events/:id/registrations` | Owning organiser or current coordinator | `{ eventId, eventName, activeCount, items }`; each item exposes only display name, email, status, registration time, withdrawal time and cancellation time. Only `REGISTERED` counts toward capacity. The event is locked for the authorization and read. |

Unauthenticated callers receive 401; wrong roles 403; missing or unrelated registrations/events 404; invalid IDs or missing confirmation 400; ineligible or started events 409. Errors do not mutate registration or capacity. Withdrawal is allowed after the registration window closes but before event start. The UI explains that re-entry requires the normal KAN-14 registration rules and does not reserve a place.

Migration 019 versions each registration state transition and records `REGISTRATION_CONFIRMED` / `REGISTRATION_WITHDRAWN` to attendee, organiser and current coordinator in the same actor transaction. It stores optional registration and change-request references on notifications. KAN-80 records confirmation and equipment-shortfall outcomes in actor transactions; KAN-62 is the sole cancellation-outcome writer and includes only affected current arrangement staff; KAN-15 records accepted attendee-relevant changes. The inbox rechecks the intended recipient and current event relationship, supplies an attendee-only `/registrations?registration=<id>` link with safe change-category text and current own-registration details, and links a manager to a specific change request only while currently authorized. No email channel is required. KAN-14, KAN-18 and KAN-61 remain separate dependencies; their source workflows must use the actor transaction and must not independently duplicate these hooks.

**Current closeout contract — 25 October 2026.** Draft creation/edit date-times reject year `0000` and timezone offsets outside PostgreSQL's supported `±15:59`, in addition to invalid calendar days; all four date fields return the existing field-specific HTTP 400 and preserve the draft. Staff catalogue buffer saves now return `venue.affectedBookings: { id: string, eventName: string | null, startsAt: string, endsAt: string, warnings: string[] }[]` (ISO date-times). The staff UI shows event identity, Singapore booking periods and readable warning reasons. Booking submission/decisions/holds and outage writes share a venue transaction gate before row locks. An outage that wins cancels a live hold; a subsequent decision returns `409 BOOKING_ALREADY_DECIDED`. A valid linked replacement may be decided for a `CONFIRMED` event; an ordinary confirmed-event booking cannot. These corrections supersede the dated display/locking gaps below; no endpoint, role grant or migration is added.

**25 October 2026 verification update.** The [original-story report](../testing/test-evidence.md#25-october-2026--reported-manual-results-for-original-stories) records reported localhost success for KAN-36/KAN-16, historical KAN-29, KAN-8/original KAN-52, and KAN-79/KAN-65. It preserves the reported test dates and unknown exact local builds. The current Lead allocation/reassignment and KAN-64 notification contracts are implemented; a local manual result does not establish deployment acceptance. Earlier dated pending statements remain historical checkpoints. Original KAN-52 verification is separate from Ernest's later revision.

**25 October 2026 — Ryan's verification records.** The [story verification report](../testing/test-evidence.md#25-october-2026--ryan-story-verification-records) separates KAN-25 authentication, original KAN-12 venue search and its Sprint 3 repair, and the KAN-50 stale-save repair. `REPORT-20261025-RYAN-S1/S2/S3` retain Tristan's report of Ryan's manual passes on 19 September, 3 October and 17 October respectively; the tested builds and environments are **Not recorded**. These reports do not change the implementation timeline or establish team acceptance.

## Implemented endpoints

All responses are JSON. Development uses a same-origin Vite proxy at `/api`. Express connects to Supabase PostgreSQL through `pg`; this hosting choice does not change the HTTP routes or expose application tables through Supabase's Data API.

| Method / route          | Result                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /api/health`       | 200: `{"status":"ok","service":"connectsphere-api"}`                                               |
| `GET /api/health/ready` | 200: `{"status":"ok","database":"connected"}` only when the migrated scaffold metadata can be read |
| Unknown route           | 404 with `NOT_FOUND`                                                                               |

Readiness returns 503 with `DATABASE_UNAVAILABLE` for an unreachable database, missing schema, or unexpected scaffold version. Liveness can succeed while readiness fails. Neither endpoint reads or returns event/user data.

Error envelope:

```json
{
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database is not ready. Run the migrations and check the database connection."
  }
}
```

Malformed JSON returns 400 (`INVALID_JSON`), oversized JSON returns 413 (`PAYLOAD_TOO_LARGE`), and unexpected errors return a generic 500 (`INTERNAL_ERROR`). Server-side logs and clients must not reveal passwords or connection strings.

## Sprint 1 routes

The normal server mounts Supabase authentication, event listing, draft creation, shared detail, draft editing, submission and decision writing through `createRuntimeApp` in `backend/src/runtime-app.ts`. The coordinator review page consumes the shared detail, decision permissions and saved outcomes; the organiser detail page consumes the same response for status, outcome and permitted draft actions, with planning panels after submission. Draft creation and clarification were added on 19 September with the [first-release routes](#first-release-routes-cf-02-to-cf-07) below; "Implemented" in this table means the handler is mounted; actual test runs and hosted acceptance are recorded separately in the [test evidence](../testing/test-evidence.md). Organiser approval/rejection display and refresh passed with a real account in MAN-20260917-01. The signed-out detail page showed a sign-in prompt without request details or the review reason in MAN-20260917-02; draft/submitted detail status and review messages also passed in MAN-20260917-03. Later manual results and the outstanding submission-to-status integration check are tracked in the test evidence.

| Owner | Method / route | Purpose | State |
| --- | --- | --- | --- |
| Ryan, KAN-25 | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Establish, end and inspect authenticated identity | Implemented |
| Ernest, KAN-31 / KAN-4 | `POST /api/events` | Save an incomplete draft for the authenticated organiser | Implemented 19 September; hosted acceptance outstanding |
| Kai Jie / Irfan / Tristan, KAN-34 / KAN-33 / KAN-16 | `GET /api/events/:id` | Shared details, status and recorded decision | Implemented; coordinator and organiser detail pages connected |
| Kai Jie, KAN-34 | `PATCH /api/events/:id` | Update an owned draft | Implemented |
| Kai Jie / Tristan, KAN-6 / KAN-79 | `POST /api/events/:id/submit` | Validate and atomically submit to the Lead queue without a coordinator | KAN-79 replaces the earlier KAN-29 allocation policy on this branch; migration 007 and mapped Lead rollout required; hosted acceptance pending |
| Irfan / Kai Jie / Tristan, KAN-33 / KAN-34 / KAN-16 | `GET /api/events` | Assigned coordinator queue, or the organiser's own drafts; organiser `?scope=all` includes all owned statuses; coordinator `?scope=history` lists assigned decided requests (KAN-56); pagination pending | Implemented; organiser list page connected |
| Irfan, KAN-27 | `POST /api/events/:id/clarifications` | Request clarification and make it visible to the organiser | Implemented 19 September; hosted acceptance outstanding |
| Tristan, KAN-36 | `POST /api/events/:id/reviews` | Record an approval/rejection and update status atomically | Implemented |

Use camelCase in JSON and snake_case in SQL. IDs are UUID strings. Dates over HTTP should be ISO 8601 timestamps with an offset; PostgreSQL stores `timestamptz`. The expected display timezone is provisionally Asia/Singapore. Missing draft fields are nullable; PATCH omission leaves a field unchanged, and explicit null clears an allowed field. Preserve these conventions in new handlers.

Never accept organiser identity, acting role, arbitrary status, or reviewer identity from an untrusted request body. Derive them from the authenticated session and service action. Filter in repositories as well as enforcing service access rules. Assigned-coordinator access remains in force; KAN-79 implements the [CR-5 customer change](../requirements/change-requests.md) for Lead-only initial allocation, replacing the earlier unassigned-triage assumption in Q-02. Client navigation is not access control.

Supabase Auth handles sign-in. Express verifies the access token and resolves `app_users.supabase_user_id` to the application profile and trusted role. `POST /api/auth/login` accepts `{ "accessToken": "..." }` and sets the verified token in an HttpOnly session cookie; `GET /api/auth/me` returns the mapped profile, and `POST /api/auth/logout` clears the cookie. Accounts must be provisioned before login; an unmapped account receives `403 ACCOUNT_NOT_PROVISIONED`. See the [authentication workstream](../../backend/src/modules/auth/README.md) for configuration and identity mapping. When adopting a significant contract change, keep this document, the corresponding UI, service and integration tests consistent in the implementation PR.

## KAN-79 submission and Lead allocation — 19 October 2026

**Current branch contract:** the new submission policy, trusted Lead role, queue and allocation interface ship together. Coordinate migration [007](../../database/migrations/007_add_coordinator_lead.sql), a mapped Lead profile and the frontend/backend rollout using the [database deployment sequence](../../database/README.md#kan-79-lead-assignment-rollout). No shared migration or hosted acceptance is claimed by this contract update. KAN-29 remains the historical baseline below; its automatic allocation rule is superseded for new submissions by CR-5.

`EVENT_COORDINATOR_LEAD` is an application-profile role added by migration 007. Only trusted provisioning may grant it. Login accepts an access token and resolves the verified Supabase subject to `app_users`; client role fields, headers and authentication metadata cannot elevate a user. The current application role is read again on each authenticated request. Lead authority is confined to allocation and active-event oversight; it does not grant shared organiser/coordinator detail, review, clarification, venue-decision, equipment-decision or roster authority.

### Submission response

`POST /api/events/:id/submit` keeps the existing verified-organiser, ownership, draft-state and completeness checks. Under the event-row lock it checks for an inconsistent pre-existing draft assignment/history, then writes `SUBMITTED` without selecting a coordinator. The successful flat `EventRecord` has `coordinatorId: null`; no assignment-history row or approval/rejection is created. No eligible coordinator does not prevent submission. Previously assigned requests and historical records are unchanged.

| Response | Meaning |
| --- | --- |
| `200` | Valid owned draft submitted with `status: "SUBMITTED"`, `coordinatorId: null`; visible in the Lead queue. |
| `400 INVALID_EVENT_REQUEST_ID` | The route ID is not a UUID. |
| `400 SUBMISSION_INCOMPLETE` | Required data is missing; `missingFields` lists the fields and the request stays Draft. |
| `400 SUBMISSION_INVALID` | Invalid present values; `fieldErrors` and `missingFields` provide feedback and the request stays Draft. |
| `401 AUTHENTICATION_REQUIRED` | No verified session. |
| `403 SUBMIT_FORBIDDEN` | The verified account is not an Event Organiser, including a Lead. |
| `404 EVENT_REQUEST_NOT_FOUND` | Missing request or another organiser's draft; no protected data disclosed. |
| `409 REQUEST_NOT_SUBMITTABLE` | The request is no longer a draft, including a repeat/concurrent submission. |
| `409 DRAFT_ALREADY_ASSIGNED` | The draft has a coordinator or active assignment history; preserve and investigate it rather than erasing that data. |
| `500 INTERNAL_ERROR` | Unexpected failure; the submission transaction rolls back. |

`NO_AVAILABLE_COORDINATOR` is no longer returned by the submission path. A failed submit does not undo draft changes saved successfully by an earlier separate request.

### Lead read shapes and authority

`GET /api/events/unassigned` returns `{ items }` with only `SUBMITTED` events whose `coordinator_id` is null, sorted by oldest `updatedAt`, then ID. Each item contains `id`, nullable `name`, `status`, `organiserName`, nullable `startsAt`/`endsAt`, nullable `expectedAttendance`, and `updatedAt`. Dates are ISO timestamps; zero attendance remains zero.

`GET /api/events/oversight` returns `{ items }` with those same fields plus nullable `coordinatorId` and `coordinatorName`, sorted by newest `updatedAt`, then ID. All Leads share the deployment's active non-draft events: `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `CONFIRMED`. Draft, Rejected, Cancelled and Completed records are excluded. An assigned event remains in this oversight view after it leaves the unassigned queue.

`GET /api/events/oversight/:id` returns one flat oversight item plus nullable `purpose`, `description`, `venueRequirements`, `accessibilityNeeds`, `equipmentRequirements`, `registrationRequired`, and allocation capabilities. KAN-65 extends the original shape with `assignmentVersion: string | null` and `actions: { canAssignCoordinator: boolean, canReassignCoordinator: boolean }`. Initial allocation is allowed only when the active event has neither a current coordinator nor an active assignment-history row. Reassignment is allowed only when one active history row matches the current coordinator; its UUID supplies the version, otherwise the version is null. This DTO does not return review records, registration rosters or workflow decision actions. Writes still recheck everything; capabilities do not guarantee that a target remains available. Missing/out-of-scope events return the same `404 EVENT_REQUEST_NOT_FOUND`.

`GET /api/events/coordinators` returns `{ items: [{ id, displayName, email }] }`, restricted to `EVENT_COORDINATOR` profiles with `coordinator_available = true`, sorted by case-insensitive display name then ID. Lead profiles are not eligible targets. All four reads require a Lead; other authenticated roles receive `403 ACTION_FORBIDDEN` before any allocation data is queried.

### Initial allocation, races and dependent stories

`PUT /api/events/:id/coordinator` accepts `{ coordinatorId, note? }`. The coordinator ID must be a UUID. The optional note is trimmed plain text, at most 2000 characters; null/blank means no note. Extra fields are refused. Only a Lead may write, and only for an active non-draft event with no current coordinator or active assignment history. The transaction locks the event first, then the selected profile, rechecks target role/availability, inserts a `MANUAL` assignment-history row with the Lead's ID and timestamp, and updates the current event linkage. It does not change event status or create a review decision.

Success returns `200 { eventRequestId, assignmentId, coordinatorId, previousCoordinatorId: null }`. A second/stale attempt receives `409 COORDINATOR_ALREADY_ASSIGNED`, including selecting the same coordinator again. The winner's assignment and history remain intact. Invalid/unavailable targets return `400 INVALID_COORDINATOR`; a conflicting active history returns `409 ASSIGNMENT_HISTORY_CONFLICT`; an inactive event returns `409 ASSIGNMENT_NOT_ALLOWED`. Draft/missing requests return `404 EVENT_REQUEST_NOT_FOUND`. Database failures roll back both history and linkage.

`GET /api/events/:id/assignments` retains owner/current-coordinator read access and additionally allows Leads for active events. It no longer allows an ordinary coordinator to inspect an unassigned request. Historical `AUTOMATIC` entries preserve their null actor and original times; migration 007 changes none of those records. Initial assignment does not replace an existing assignment. KAN-65 supplies Lead reassignment. **21 October integration:** KAN-64 now writes organiser/new-coordinator notifications in the assignment transaction and a minimal previous-coordinator notice on handover. A successful write commits those rows with the assignment; it does not establish that a recipient read the inbox. Shared workflow acceptance remains pending.

## KAN-65 coordinator reassignment — 19 October 2026

This extends the Lead allocation workflow above without changing initial-assignment semantics or adding a migration. Migration 007 application and Lead login were reported successful; the [verification record](../testing/test-evidence.md#19-october-2026--kan-65-coordinator-reassignment) separates that setup report from local automated checks and deferred manual acceptance. KAN-64 was pending at that implementation checkpoint; the 21 October integration below adds its transactional notifications.

`POST /api/events/:id/coordinator/reassign` requires a verified `EVENT_COORDINATOR_LEAD`. The body contains exactly:

```json
{
  "coordinatorId": "40000000-0000-4000-8000-000000000001",
  "reason": "Covering the current coordinator's leave.",
  "expectedAssignmentVersion": "50000000-0000-4000-8000-000000000001"
}
```

Both identifiers must be UUIDs; UUID casing is normalised. `reason` is required plain text, trimmed, nonempty and at most 2,000 characters after trimming. Unknown fields are rejected. The expected version is the current active assignment-history UUID returned by Lead detail, not the coordinator UUID or event `updatedAt`. The event must be in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` or `CONFIRMED`, with one active history row matching its current coordinator.

The transaction locks the event, then its current assignment row. It checks the version before considering a same-coordinator request, so stale A → B → A changes are rejected. A current-version request targeting the current coordinator returns `changed: false` and preserves all timestamps/history without checking that coordinator's availability; no new assignment occurs. For an actual change, the selected target must still be an available `EVENT_COORDINATOR` when its profile is locked. The old interval closes and the new MANUAL interval starts at one database timestamp captured after the lock waits, preserving PostgreSQL precision. The new row stores the Lead's ID and trimmed reason; its start also becomes the event's `updatedAt`. Current linkage and both history changes commit together. A failure rolls them all back.

Success is `200 { eventRequestId, assignmentId, coordinatorId, previousCoordinatorId, changed }`. `assignmentId` identifies the new active row when changed, or the existing row for an unchanged response; `previousCoordinatorId` is the pre-command coordinator, equal to `coordinatorId` for an unchanged result. No event is duplicated. Status, requirements, existing decisions, clarifications and venue arrangements are retained.

| Response | Meaning |
| --- | --- |
| `400 INVALID_EVENT_REQUEST_ID` | The route ID is not a UUID. |
| `400 INVALID_INPUT` | Non-object/unknown fields, missing/blank reason, wrong reason type or reason exceeding 2,000 trimmed characters. |
| `400 INVALID_ASSIGNMENT_INPUT` | `coordinatorId` or `expectedAssignmentVersion` is not a UUID. |
| `400 INVALID_COORDINATOR` | The new target is missing, unavailable or not an Event Coordinator. |
| `401 AUTHENTICATION_REQUIRED` | No verified session. |
| `403 ACTION_FORBIDDEN` | The verified actor is not a Lead; the HTTP gate refuses the request before persistence. The service additionally uses `ASSIGNMENT_FORBIDDEN` for direct unauthorised calls. |
| `404 EVENT_REQUEST_NOT_FOUND` | Missing event or draft; the same response conceals drafts. |
| `409 ASSIGNMENT_NOT_ALLOWED` | The event is Rejected, Cancelled or Completed. |
| `409 COORDINATOR_NOT_ASSIGNED` | The event has neither a current coordinator nor active history; refresh and use initial allocation. |
| `409 ASSIGNMENT_HISTORY_CONFLICT` | Current linkage and active history do not agree, including missing history on an assigned legacy event. Preserve the records and reconcile them explicitly. |
| `409 ASSIGNMENT_VERSION_CONFLICT` | Another change replaced the expected assignment; refresh before attempting a new handover. |
| `500 INTERNAL_ERROR` | Unexpected persistence failure; internal details are concealed. Refresh before retrying because the client may not know whether a response was lost after commit. |

Every response uses `Cache-Control: no-store`; malformed JSON and payload-size errors follow the common contract. A handover immediately changes which coordinator may make subsequent protected reads/writes. Review, clarification and venue-submission writes recheck current assignment under the event lock. Assignment, clarification and status-history reads hold `FOR SHARE` on the event through the relationship check and protected data query: a concurrent handover waits for an authorised read to finish, or that read sees the replacement and denies the former coordinator. Other scoped reads use current coordinator linkage. Prior access does not authorise later access, while the owning organiser and Leads retain their existing scopes.

The Lead interface only offers reassignment when its detail version and exactly one active history row agree. It requires a target and reason, disables duplicate saves, refreshes after conflicts and blocks retries after uncertain responses until current state is reconciled. **21 October integration:** KAN-64 adds organiser/new-coordinator notifications and a minimal previous-coordinator notice in this transaction. An unchanged response creates no notice; a notification write failure rolls the handover back. Combined hosted acceptance remains pending.

## KAN-29 automatic assignment on submission

**Historical contract, superseded for new submissions by KAN-79 on 19 October 2026.** The dated baseline and schema follow-up below remain evidence of the previous rule. They are not the current API behavior. The former automatic-selection helper is preserved in [the historical implementation](https://github.com/MochaLxtte/ConnectSphere/blob/8f29d35/backend/src/modules/events/automatic-assignment.ts).

**Branch implementation, 28 September 2026:** `POST /api/events/:id/submit` retains its owned-draft, completeness and verified-organiser checks. It now allocates one coordinator as part of the submission transaction. This is not a hosted acceptance record: migration [006](../../database/migrations/006_automatic_coordinator_assignment.sql) has not been applied to the shared Supabase project by this work. Coordinate its rollout with Arvin through the [database setup](../../database/README.md#kan-29-automatic-assignment-setup).

**30 September schema follow-up:** Tristan has since applied migration 006 to shared Supabase. [DB-SCHEMA-20260930-01](../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirms its fields and constraint, with all six current migration checksums matching hosted history through the recognised filename aliases. The earlier implementation record remains dated evidence; provisioned-coordinator opt-in, hosted manual checks, availability-policy acceptance, CI and peer review remain separate follow-ups.

An eligible candidate has application role `EVENT_COORDINATOR` and `app_users.coordinator_available = true`. The new availability flag defaults to `false`; opt in only provisioned coordinator profiles that are ready for work. Fictional seed accounts remain opted out. Selection counts requests in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED`, chooses the smallest count, and breaks ties using ascending `app_users.id` UUID order. Availability is independent of current login state and does not revoke existing assignments when turned off.

Submission locks the event, then coordinates with other automatic and manual allocations through consistently ordered coordinator-row locks. It counts committed workload after acquiring those locks. The `SUBMITTED` status, `event_requests.coordinator_id` and one `AUTOMATIC` assignment-history row commit together. Failure rolls all three changes back. No approval/rejection record is created. Changing assignment or availability later does not cause a submitted request to be automatically reallocated.

| Response | Meaning |
| --- | --- |
| `200` | Existing flat `EventRecord` response, now with `status: "SUBMITTED"` and the selected non-null `coordinatorId`. |
| `400 INVALID_EVENT_REQUEST_ID` | The route ID is not a UUID. |
| `400 SUBMISSION_INCOMPLETE` | Required submission data is missing, including blank or whitespace-only name, purpose and venue requirements; the error supplies `missingFields`. No allocation occurs and the request stays a draft. |
| `400 SUBMISSION_INVALID` | A present value is not acceptable (KAN-59): the end is not after the start, the registration close is not after its open while registration is required, or a date cannot be read. The error supplies `fieldErrors` (field to message) and also `missingFields` (possibly empty). No allocation occurs and the request stays a draft. |
| `401 AUTHENTICATION_REQUIRED` | No verified session. |
| `403 SUBMIT_FORBIDDEN` | The verified caller is not an event organiser. |
| `404 EVENT_REQUEST_NOT_FOUND` | The request is missing or belongs to another organiser; no assignment details are revealed. |
| `409 REQUEST_NOT_SUBMITTABLE` | The owned request is no longer a draft, including repeated submission. Status, coordinator and history stay unchanged. |
| `409 NO_AVAILABLE_COORDINATOR` | No opted-in coordinator is available. The saved request remains an editable draft with no new assignment. |
| `409 DRAFT_ALREADY_ASSIGNED` | The draft already has a coordinator or active assignment-history row. Preserve the existing data and investigate it before submission; automatic selection does not overwrite it. |
| `500 INTERNAL_ERROR` | An unexpected failure; the submission transaction is rolled back. |

`NO_AVAILABLE_COORDINATOR` uses the message: "No event coordinator is currently available. Your request is still a draft. Please try again later." The create/edit form and saved-draft detail page show this explanation, retain draft editing and allow retry. `DRAFT_ALREADY_ASSIGNED` displays its specific explanation and retains editing; the existing assignment must be checked before submission can succeed. The form saves draft changes before calling submit, so a rolled-back submission does not undo an earlier successful draft save. Clients cannot choose the coordinator through submission input.

The [manual check guide](../testing/README.md#kan-29-hosted-verification) covers account access, workload selection, recovery and refusal of out-of-scope reassignment. Previously submitted requests are not backfilled. Manual initial assignment remains a separate operation only for unassigned requests; the automatic availability flag does not restrict manual targets.

## Shared request detail: backend, coordinator and organiser pages connected

**Status:** The shared backend handler for KAN-34, KAN-33 and KAN-16 uses Ryan's verified session and the Sprint 1 assigned-coordinator policy. The coordinator page uses its action flags and displays saved outcomes; the organiser page displays request details and saved outcomes with permitted draft and planning actions. Organiser approval/rejection display and refresh passed in MAN-20260917-01, followed by the signed-out detail-page check in MAN-20260917-02. Draft/submitted detail display passed in MAN-20260917-03. Second-organiser detail denial and list isolation passed in MAN-20260917-04. Signed-out list navigation showed a sign-in prompt without request names or statuses in MAN-20260917-05. Draft/Submitted/Rejected/Approved list labels matched the detail pages and Draft/Submitted detail refresh passed in MAN-20260917-06; submission-to-status remains in the test evidence. KAN-79 now supplies the separate Lead allocation/oversight workflow under CR-5; it does not widen this shared detail endpoint.

### One route for all three pages

Register `GET /api/events/:id` once. Authenticate the caller once, validate the UUID, apply the request-specific visibility policy and return one response shape. Separate service functions can handle ownership checks, coordinator visibility and database queries within that handler. Page intent does not select a different handler or response.

| Story / contributor | Use of the shared response |
| --- | --- |
| KAN-34 / Kai Jie | Load the organiser's draft fields into the editing form. |
| KAN-33 / Irfan | Display an authorised coordinator's request detail. |
| KAN-16 / Tristan | Display the organiser's request status and recorded outcome. |

KAN-33's existing `submitted-requests-router.ts` now registers the shared detail route and calls `getEventRequestDetail` in `event-request-detail.ts`. The non-coordinator `next()` fallback has been removed. Do not add separate organiser detail handlers or rely on their mount order. The queue route `GET /api/events` still uses `submitted-requests.ts`; draft update `PATCH /api/events/:id` and decision write `POST /api/events/:id/reviews` remain separate operations.

### Successful response

Return `200` with the existing flat [EventRecord](../../backend/src/modules/events/types.ts) fields plus `review` and `actions`. Keep the same field names and structure for both roles. All fields are present; incomplete draft fields and an unassigned `coordinatorId` remain `null` as defined by `EventRecord`.

```ts
interface EventRequestDetail extends EventRecord {
  // CF-18 registration settings, added 19 September; null until the organiser sets them.
  registrationCapacity: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  review: {
    reviewId: string;
    eventRequestId: string;
    reviewedBy: string;
    decision: 'APPROVED' | 'REJECTED';
    reason: string | null;
    createdAt: string;
  } | null;
  actions: {
    canEditDraft: boolean;
    canMakeInitialDecision: boolean;
  };
}
```

`review` is `null` when no review row exists; a decided status does not fabricate a review record. Its fields reuse the existing decision-write response, with `createdAt` added from `event_reviews.created_at`. This is the recorded decision time, not the time the detail was fetched. If imported data contains multiple reviews, return the earliest by `created_at`, breaking ties by ID. Further review rounds need a separate contract agreement.

The service reads the event and review in one SQL statement, so they come from the same database snapshot. All timestamps are serialized as ISO 8601 strings. Nullable draft fields remain `null`, and valid `0` and `false` values are preserved.

The backend computes `actions` for the verified caller:

- `canEditDraft`: true only for the owning organiser while the request is `DRAFT`.
- `canMakeInitialDecision`: true only for a coordinator who passes the request-specific review policy, while the request is `SUBMITTED` or `UNDER_REVIEW` (added 19 September) and has no recorded approval or rejection. It is false for all organisers and for all decided requests.

These flags guide the UI. Each write endpoint must recheck authentication, permission and current state; flags returned by an earlier GET are not permission to save later.

`ReviewRequestPage` passes `actions.canMakeInitialDecision` to the decision panel. A false or missing flag prevents new decisions while a recorded outcome and its reason remain visible after an authorised detail read. Successful saves reload the shared detail to display the current status and review. A failed refresh reports that the decision was saved and offers a read retry; an uncertain write or conflict requires a refresh before another submission. Responses from a previously opened request cannot overwrite the current page.

`ReviewAccessPage` protects `/reviews` and `/reviews/:id`; the legacy `/reviews/unassigned` URL now redirects to the Lead-only `/lead` route. It mounts these coordinator pages only after the session resolves to an event coordinator. Sidebar and overview review links follow the same role check. Signed-out or wrong-role callers receive an access message without loading review content. Account changes and sign-out unmount the prior page and abort pending reads; a current API 401 clears the local session, and late responses cannot restore stale content. This frontend boundary does not change the shared API: `GET /api/events` still returns an organiser's own drafts by default, and organisers retain authorised shared-detail reads through `/events/:id`. The organiser-visible review queue defect and its automated regression coverage are recorded as MAN-20260917-07 and AUTO-20260917-07/08 in the [test evidence](../testing/test-evidence.md). The organiser queue recheck passed on 18 September (MAN-20260918-01): the Review queue link was absent after reload, and direct `/reviews` navigation showed Coordinator access only without request data. Manual checks of `/reviews/:id` and the remaining role/session scenarios are outside this recheck.

`EventRequestDetailPage` at `/events/:id` uses the same GET for organiser details. It displays request fields, readable status and the recorded outcome, reason and `review.createdAt` in Asia/Singapore. Missing review rows produce explicit messages rather than an invented decision; reasons render as plain text. A `DRAFT` with `actions.canEditDraft` exposes an Edit draft link and Submit for review for the saved draft. A failed submission (`SUBMISSION_INCOMPLETE` or `SUBMISSION_INVALID`) lists the server's per-field messages, missing fields first, and keeps the draft and its actions (KAN-6-AC101). Non-draft requests mount the applicable planning panels; organiser pages never expose coordinator approval/rejection controls. Refresh re-reads the request; sign-out, account changes, request navigation and failed reads clear previous data and ignore stale responses. A 401 clears local identity and offers sign-in, 403/404 show a generic unavailable/no-permission message, and network/server failures offer a read retry.

Creation and submission share the event API: `/events/new` uses `EventRequestForm.vue` to create a draft through `POST /api/events`, PATCH later changes to that saved draft, and submit after saving. `/events/:id/edit` saves the current form before submission; `/events/:id` submits the already-saved draft. Each path calls `POST /api/events/:id/submit`, whose service rechecks ownership, state and completeness. The hosted submission-to-status acceptance check remains outstanding.

### Access and responses

| Caller / request | Detail access |
| --- | --- |
| Organiser viewing their own request | Allow all current Sprint 1 statuses, including `DRAFT`, `APPROVED` and `REJECTED`. |
| Organiser viewing another organiser's request | Return `404 EVENT_REQUEST_NOT_FOUND`. |
| Coordinator viewing a draft | Return `404 EVENT_REQUEST_NOT_FOUND`. |
| Coordinator viewing another current Sprint 1 status | Allow only when the request's `coordinatorId` matches their verified `app_users.id`. This includes `APPROVED` and `REJECTED`. |
| Coordinator who fails the visibility policy, or a missing request | Return the same `404 EVENT_REQUEST_NOT_FOUND` response. |

Viewing permission and decision permission are separate checks. A successful detail read does not establish permission to edit or approve/reject. Role alone does not grant coordinator access: unassigned requests and requests assigned to another coordinator are unavailable. `event_requests.coordinator_id` references `app_users.id`, not the Supabase Auth UUID. Any externally reconciled coordinator change affects subsequent access; the decision write rechecks assignment against the locked event row. The current application exposes Lead-only versioned reassignment through `POST /api/events/:id/coordinator/reassign`; the KAN-65 contract above defines its reason, version, state and target checks.

An approved or rejected request leaves the pending-review queue but remains readable by its organiser and currently assigned coordinator. Refreshing after a decision should show the recorded outcome, without offering another initial decision. The queue's status filter must not be reused as the detail-access rule.

| Response | Meaning |
| --- | --- |
| `200` | The shared request detail, including nullable `review` and caller-specific `actions`. |
| `401 AUTHENTICATION_REQUIRED` | Credentials are absent or invalid. |
| `403 VIEW_FORBIDDEN` | The verified account is neither an event organiser nor an event coordinator. |
| `400 INVALID_EVENT_REQUEST_ID` | An authenticated, supported caller supplied an ID that is not a UUID. |
| `404 EVENT_REQUEST_NOT_FOUND` | The request is missing or unavailable to this caller; use the same code and message in both cases. |
| `500 INTERNAL_ERROR` | Authentication verification or persistence failed unexpectedly; return the existing generic error envelope. |

Check authentication and supported role before looking up the request. All detail responses use `Cache-Control: no-store`. Error responses use the existing JSON error envelope.

### Dependencies and remaining integration

`createApp` mounts the queue and shared detail routes only when `submittedRequests` dependencies are supplied. These must contain:

- A PostgreSQL pool supporting both `query` (queue) and `connect` (detail).
- `authenticate(request)`, returning a verified application identity or `null` for absent/invalid credentials.
- `canViewRequest(actor, request)`, the explicit coordinator visibility policy.
- `canReviewRequest(actor, request, client)`, using the same policy signature as KAN-36's write service. It receives the detail service's checked-out `PoolClient` and determines whether an otherwise eligible coordinator can make an initial decision. The write endpoint still rechecks this policy inside its transaction.

`server.ts` uses `createRuntimeApp` to supply the database pool, Ryan's `authenticateRequest` adapter and the assigned-coordinator policies. The same session verifier is used by the auth and event routes. The organiser's own-draft listing, editing and submission routes are mounted through the same router and retain their ownership checks. Local tests with synthetic identities do not verify hosted Supabase login.

Remaining integration work:

1. Review the shared response with Kai Jie and Irfan. Use mapped test accounts and synthetic requests to check the integrated assignment and review flows. Assignment UI/API implementation exists; hosted acceptance and customer clarification of triage/delegation remain pending.
2. **Done, 19 September:** the organiser's draft-editing view is connected at `/events/:id/edit` (`EventDraftEditPage.vue`). A `DRAFT` row in the `/events` list now links there instead of to the read-only detail page; the edit page loads the shared GET response, renders its form only when `actions.canEditDraft` is true, and saves through `PATCH /api/events/:id`, converting Singapore-local datetime inputs to UTC instants. 38 targeted frontend tests and the full `npm run check` suite passed the same day; this is automated-fixture coverage only, not a hosted Supabase Auth browser walkthrough (no provisioned test credentials in this environment). KAN-16's `/events` status list and read-only `/events/:id` detail are connected, including navigation, review reasons and recorded times. The coordinator's decision controls and outcome display are connected.
3. **KAN-6 frontend done, 19 September:** `EventDraftEditPage.vue` now has a "Submit for review" action alongside "Save draft." It PATCHes the current form first (so the reviewed record matches what is on screen), then calls `POST /api/events/:id/submit`, and navigates to the read-only `/events/:id` detail on success. A `SUBMISSION_INCOMPLETE`/other submission error is shown using the backend's own message rather than a re-derived one, and the page never calls submit if the preceding save failed or the request stopped being an editable draft. 12 targeted frontend tests and the full `npm run check` suite passed the same day; this is automated-fixture coverage only. The hosted submission-to-status integration check itself still needs a live account and remains open. List labels matched the four recorded detail statuses and Draft/Submitted detail refresh passed in MAN-20260917-06. Draft/submitted detail status and review messages passed in MAN-20260917-03. Coordinator approval/rejection, saved review rows and queue removal have passed; organiser approval/rejection display and refresh also passed in MAN-20260917-01. The signed-out detail page showed a sign-in prompt without request details or the review reason in MAN-20260917-02. Second-organiser detail denial and list isolation passed in MAN-20260917-04. Signed-out list navigation also passed in MAN-20260917-05, showing a sign-in prompt without request names or statuses; see the dated [test evidence](../testing/test-evidence.md).

**Verification, 11 September 2026:** Type checking and all 42 targeted backend tests passed: 31 shared-detail service/HTTP cases in `backend/test/events/event-request-detail.test.ts`, four queue-service cases and seven queue-HTTP cases. All 25 PostgreSQL tests passed, including the 11 new cases in `database/tests/events/event-request-detail.integration.test.ts`. These exercise ownership, coordinator visibility, state-dependent actions, the shared response and persisted approval/rejection outcomes through the composed GET and POST routes. They use fixture authentication and an isolated PostgreSQL test database; they do not verify live login or the hosted development project.

## KAN-33 / KAN-34 / KAN-16 request lists: authentication connected

For a coordinator, `GET /api/events` returns the review queue implemented in
`submitted-requests-router.ts` and `submitted-requests.ts`. For an organiser, the same
endpoint defaults to their own drafts. It shares the router dependencies described above
but keeps its list query and status filter separate from the shared request-detail read.

**KAN-16 list extension, 17 September:** An organiser can request
`GET /api/events?scope=all` to retrieve their requests across all stored statuses
(six at the time; nine since migration 004), including submitted and decided requests. `scope=drafts` explicitly selects the existing
draft-only list; omitting `scope` preserves that behaviour. Scope is a single, case-sensitive
value: empty, unknown or repeated values return `400 INVALID_EVENT_LIST_SCOPE`.
Coordinators omit `scope` for the pending queue. The only coordinator scope is `history`
(below); `all`, `drafts` or any other value returns the same 400 and does not expand
their review queue. Other roles remain forbidden and unauthenticated callers receive 401.

**KAN-33 / KAN-56 decided-request history, 29 September (S1-DEF-02):** A coordinator can
request `GET /api/events?scope=history` to list requests assigned to them that have left the
initial-review queue: `APPROVED`, `REJECTED`, `CONFIRMED`, `CANCELLED` or `COMPLETED`
(`FOLLOW_UP_STATUSES` in `submitted-requests.ts`), ordered by `updated_at DESC`. It applies
the same `canViewRequest` assignment policy as the queue, never includes drafts, and returns
the same five-field items. Reopening an item uses the shared `GET /api/events/:id`, whose
action flags already withhold a second initial decision. Organisers receive
`400 INVALID_EVENT_LIST_SCOPE` for `scope=history`. The `/reviews` page shows these items in
a "Decided requests" section below the pending queue, linking to `/reviews/:id`.

Both organiser lists filter by the authenticated `app_users.id` in the database and order
by `updated_at DESC`. A client-supplied `organiserId` or role cannot choose another owner.
List items retain the five fields shown below; nullable draft names are returned as `null`.
Review outcomes and reasons remain available through the existing shared detail endpoint.

The organiser page at `/events` consumes `scope=all`, displays readable labels for each
stored status and formats update timestamps in Asia/Singapore. Refresh re-reads the list;
account changes and unauthorised responses clear previously displayed results. Draft titles
link to `/events/:id/edit`; other titles link to `/events/:id` for the shared detail and recorded outcome. List/detail UI tests use
API response fixtures. MAN-20260917-01 separately records passed organiser outcome/refresh checks, and MAN-20260917-02 records the signed-out detail-page check. MAN-20260917-03 adds draft/submitted detail status and review-message checks. The test evidence records subsequent manual checks and the remaining submission-to-status integration check.

The queue includes only `SUBMITTED`, `UNDER_REVIEW` and `CLARIFICATION_REQUESTED` requests
that pass `canViewRequest`. This filter describes queue membership, not permission to
record an initial decision or view a decided request. The shared detail read includes
approved and rejected requests when its access checks pass. The runtime policy requires
the current coordinator assignment; unassigned requests and another coordinator's
requests are excluded. The [CR-5 customer change](../requirements/change-requests.md)
now gives Leads separate allocation and oversight endpoints; it does not make unassigned work visible to ordinary coordinators.

`GET /api/events` response:

```json
{ "items": [{ "id": "...", "name": "...", "status": "SUBMITTED", "createdAt": "...", "updatedAt": "..." }] }
```

The queue currently returns all permitted matching rows in creation order; pagination is
not implemented. `GET /api/events/:id` uses the shared detail response documented above.

| Response | Meaning |
| --- | --- |
| `200` | An object containing an `items` array, which may be empty. |
| `400 INVALID_EVENT_LIST_SCOPE` | An organiser supplied an invalid/repeated scope (including `history`), or a coordinator supplied any scope other than a single `history`. |
| `401 AUTHENTICATION_REQUIRED` | The authentication adapter reports absent or invalid credentials. |
| `403 VIEW_FORBIDDEN` | The verified account is neither an event coordinator nor an event organiser. |
| `500 INTERNAL_ERROR` | An unexpected verification or persistence failure occurred; details are not returned. |

Responses use `Cache-Control: no-store`. Queue service and HTTP-boundary tests passed on
11 September. All five browser checks also passed after updating the scaffold expectation;
`tests/e2e/review-queue.spec.ts` verifies error feedback, retry and an empty result using
browser-response fixtures. The new PostgreSQL detail suite also checks queue inclusion
before a decision and removal afterwards. Hosted approval checks also verified removal from
the queue and retained detail access after reload. Remaining hosted acceptance scenarios
are tracked in the [test evidence](../testing/test-evidence.md); KAN-33 is not yet complete.

## KAN-36 review endpoint: authentication connected

The handler for `POST /api/events/:id/reviews` is mounted by the normal server through `createRuntimeApp`. It supplies `createApp` with `reviews` dependencies containing the database pool, Ryan's `authenticateRequest` adapter and the assigned-coordinator `canReviewRequest(reviewer, event, client)` policy.

Ryan's authentication adapter verifies credentials and returns the corresponding `app_users` ID and trusted application role. It returns `null` for absent or invalid credentials and throws on verification-service failures. The verified Supabase subject is mapped through `app_users.supabase_user_id`; it is not assumed to equal `app_users.id`. Browser-supplied identity, role fields and unverified token contents cannot establish access.

The reviewer must be an event coordinator whose application ID matches the request's current `coordinator_id`. The policy runs inside the saving transaction against the locked event row, so a prior page view does not retain permission after reassignment. Null or different assignments do not grant access. KAN-79 Lead allocation preserves this assigned-coordinator rule and does not bypass the status or recorded-decision checks. A Lead role alone cannot review an event. Automated tests with synthetic verified identities do not establish that hosted login has been tested.

Request body:

```json
{
  "decision": "APPROVED",
  "reason": "Ready to proceed."
}
```

`decision` must be `APPROVED` or `REJECTED`. `reason` is trimmed and may be at most 2,000 characters after trimming (the shared workflow limit). **KAN-60 (21 October 2026, branch `fix/KAN-60-rejection-reason`):** a `REJECTED` decision requires a nonblank reason; an `APPROVED` decision keeps the reason optional, and an absent or blank approval reason becomes `null`. Other body fields are rejected. The event request ID must use UUID format. Initial decisions require `SUBMITTED` or, since 19 September, `UNDER_REVIEW` status with no existing review decision. A request in `CLARIFICATION_REQUESTED` must be answered first, which returns it to `SUBMITTED`.

**Required correction, recorded 21 September:** The [customer rule](../requirements/assumptions-and-questions.md#21-september-2026--customer-rules-reconciled-with-the-backlog) requires a non-empty reason for event-request rejection. The current parser, persistence path and UI still allow an empty reason. The paragraph above describes existing behaviour, not compliance with that requirement. Refine KAN-36 and add the validation/UI regression work; approval may continue without a reason. No implementation change or new test pass is recorded here. **Implemented 21 October 2026 by KAN-60** as described above; this note is retained as history.

| Response | Meaning |
| --- | --- |
| `201` | Returns `reviewId`, `eventRequestId`, `reviewedBy`, `decision` and `reason` after the review and matching event status commit together. |
| `400 INVALID_EVENT_REQUEST_ID` | The route ID is not a UUID. |
| `400 INVALID_REVIEW_INPUT` | The JSON body does not match the decision contract. Field errors add `field` (`"decision"` or `"reason"`), for example `{ "error": { "code": "INVALID_REVIEW_INPUT", "message": "Enter a reason to reject this event request.", "field": "reason" } }`; whole-body errors omit it. No decision, status, history or notification is written. |
| `401 AUTHENTICATION_REQUIRED` | The authentication adapter reports absent or invalid credentials. |
| `403 REVIEW_FORBIDDEN` | The verified account is not an event coordinator. |
| `404 EVENT_REQUEST_NOT_FOUND` | The request does not exist or this coordinator cannot review it; both cases return the same response. |
| `409 REQUEST_NOT_REVIEWABLE` | The authorised request is not in a supported initial-review state, including a draft. |
| `409 REVIEW_ALREADY_DECIDED` | The authorised request already has an approval or rejection outcome. |
| `500 INTERNAL_ERROR` | An unexpected verification or persistence failure occurred; details are not returned. |

The existing malformed-JSON and payload-size responses also apply. Responses from the review handler use `Cache-Control: no-store`. HTTP tests cover validation, role checks, error mapping and unavailable integration; database tests additionally exercise the mounted handler with real PostgreSQL and fixture authentication.

## First-release routes (CF-02 to CF-07)

**Historical scope record, 30 September 2026:** the routes below support Sprint 1 and Sprint 2. The earlier broad implementation was reduced on 26 September and again by the [30 September scope audit](../requirements/README.md#30-september-sprint-scope-audit). Confirmation, cancellation, completion and notification writes are removed. Manual assignment only sets an initial coordinator on an unassigned non-draft request; KAN-65 reassignment is deferred. Historical descriptions and test results remain dated evidence, not a list of current routes.

Conventions shared by every route below:

- Identity and role come from the verified session only. Every response sets `Cache-Control: no-store`.
- `401 AUTHENTICATION_REQUIRED` for absent or invalid credentials; the generic `400 INVALID_JSON`, `413 PAYLOAD_TOO_LARGE` and `500 INTERNAL_ERROR` envelopes still apply. These are not repeated in the tables.
- Request bodies reject unknown fields. Timestamps are ISO 8601; intervals are half-open `[startsAt, endsAt)`, so back-to-back periods do not overlap.
- An event, booking or request the caller has no permitted relationship to returns the same 404 as a missing one. "Owner" means the organiser whose `app_users.id` equals `organiser_id`; "assigned coordinator" means `coordinator_id` equals the caller's `app_users.id`. Coordinators never see drafts. Lead oversight is a separate permitted read scope over active non-draft events and does not create an assigned-coordinator relationship.
- Role abbreviations: EO Event Organiser, EC Event Coordinator, ECL Event Coordinator Lead, VS Venue Staff, TS Technical Support Staff, AT Attendee.
- List responses are `{ "items": [...] }` unless stated. Request, clarification, review, assignment and venue-decision workflows write in-app notifications in the same transaction (KAN-64, see [Notifications](#notifications-kan-64-cf-20)); KAN-26 adds the equipment-reserved slice of KAN-80. Other later-workflow triggers remain pending.

Mount order matters: `app.ts` registers the assignment, clarification and status-history routers on `/api/events` before the shared detail router, so `/unassigned`, `/coordinators` and `/oversight` are not read as event IDs.

### Events: draft creation (CF-02, CF-03) — `submitted-requests-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/events` | EO | `201` the new `DRAFT` as the flat event record plus `registrationCapacity`, `registrationOpensAt`, `registrationClosesAt`. Body is optional; any supplied draft fields follow the PATCH rules. The owner is always the caller. | `400 INVALID_DRAFT_INPUT`; `403 DRAFT_CREATE_FORBIDDEN` |

`PATCH /api/events/:id` now also accepts the three registration fields (`registrationCapacity` a non-negative whole number or null; the two timestamps ISO 8601 or null). The status-history trigger attributes the initial `DRAFT` row to the organiser.

**Draft date-times, 20 October 2026 (KAN-34-AC101):** on `POST /api/events` and `PATCH /api/events/:id`, `startsAt`, `endsAt`, `registrationOpensAt` and `registrationClosesAt` must be `null` or `YYYY-MM-DDTHH:mm[:ss[.ffffff]]` followed by `Z` or `±HH:MM`, naming a real calendar date (leap years included). Anything else, including impossible dates such as `2026-02-30T09:00:00Z` and values without an offset, returns `400 INVALID_DRAFT_INPUT` (create) or `400 INVALID_DRAFT_UPDATE` (edit) with the field named in the message, and the stored draft is unchanged.

### Events: coordinator assignment (CF-05 / KAN-79 / KAN-65) — `assignment-router.ts`

The current Lead contract above supersedes the earlier coordinator self/colleague allocation rule. Active states are Submitted, Under review, Clarification requested, Approved and Confirmed.

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/events/unassigned` | ECL | `200 { items }`: only Submitted requests with no coordinator, oldest update first; basic event summary | `403 ACTION_FORBIDDEN` |
| `GET /api/events/coordinators` | ECL | `200 { items }`: `id`, `displayName`, `email` for available Event Coordinators only | `403 ACTION_FORBIDDEN` |
| `GET /api/events/oversight` | ECL | `200 { items }`: active non-draft summaries plus nullable `coordinatorId`/`coordinatorName`, newest update first | `403 ACTION_FORBIDDEN` |
| `GET /api/events/oversight/:id` | ECL | `200` flat basic allocation detail, nullable `assignmentVersion`, `actions.canAssignCoordinator` and `actions.canReassignCoordinator`; no review/booking/roster permissions | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |
| `PUT /api/events/:id/coordinator` | ECL, active unassigned event | `200 { eventRequestId, assignmentId, coordinatorId, previousCoordinatorId: null }`. Body `{ coordinatorId, note? }`. Saves initial linkage, manual history and organiser/new-coordinator notification rows atomically; no replacement of an existing assignment | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_INPUT`, `INVALID_ASSIGNMENT_INPUT`, `INVALID_COORDINATOR`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` (missing/draft); `409 ASSIGNMENT_NOT_ALLOWED`, `COORDINATOR_ALREADY_ASSIGNED`, `ASSIGNMENT_HISTORY_CONFLICT` |
| `POST /api/events/:id/coordinator/reassign` | ECL, active assigned event | `200 { eventRequestId, assignmentId, coordinatorId, previousCoordinatorId, changed }`. Body `{ coordinatorId, reason, expectedAssignmentVersion }`. Atomically replaces the current assignment; unchanged current-target requests write nothing | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_INPUT`, `INVALID_ASSIGNMENT_INPUT`, `INVALID_COORDINATOR`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 ASSIGNMENT_NOT_ALLOWED`, `COORDINATOR_NOT_ASSIGNED`, `ASSIGNMENT_HISTORY_CONFLICT`, `ASSIGNMENT_VERSION_CONFLICT` |
| `GET /api/events/:id/assignments` | EO owner, assigned EC, ECL for active events | `200 { items }`: `id`, `coordinatorId`, `coordinatorName`, `assignmentMethod`, `assignedById`, `assignedByName`, `note`, `assignedAt`, `unassignedAt`, newest first | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |

Migration 006's `assignmentMethod` vocabulary remains `AUTOMATIC` or `MANUAL`; migration 007 only extends the trusted user role. Historical automatic records retain null `assignedById`/`assignedByName` and display their original provenance. New initial allocations and handovers use `MANUAL` with the acting Lead's ID. Owner/current-coordinator history is read-only; ordinary coordinators have no unassigned triage exception. KAN-65 needs no additional schema change; KAN-64 uses migration 008 and the shared transaction. Shared migration rollout and hosted acceptance remain separate from implementation.

### Events: review start and clarification (CF-04, KAN-27) — `clarification-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/events/:id/start-review` | Assigned EC | `200` `{ eventRequestId, status: "UNDER_REVIEW" }`; `SUBMITTED` → `UNDER_REVIEW`; the organiser reads the clarification on the request | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 REVIEW_NOT_STARTABLE` |
| `GET /api/events/:id/clarifications` | EO owner, assigned EC | `200` items: `id`, `eventRequestId`, `requestedById`, `requestedByName`, `message`, `response`, `createdAt`, `respondedAt`, oldest first | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |
| `POST /api/events/:id/clarifications` | Assigned EC | `201` `{ clarificationId, eventRequestId, status: "CLARIFICATION_REQUESTED" }`. Body `{ message }` (non-empty, at most 2000 characters). Allowed from `SUBMITTED` or `UNDER_REVIEW`; the organiser reads the clarification on the request | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_INPUT`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 CLARIFICATION_NOT_ALLOWED` |
| `POST /api/events/:id/clarifications/:clarificationId/response` | EO owner | `200` `{ clarificationId, eventRequestId, status }`. Body `{ response }`. `status` is `SUBMITTED` once every open question is answered, otherwise `CLARIFICATION_REQUESTED`; the assigned coordinator reads the saved response on the request | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_CLARIFICATION_ID`, `INVALID_INPUT`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`, `CLARIFICATION_NOT_FOUND`; `409 CLARIFICATION_ALREADY_ANSWERED`, `CLARIFICATION_NOT_AWAITED` |

### Events: status history (KAN-16) ? `status-history-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/events/:id/history` | EO owner, assigned EC | `200` items: `id`, `fromStatus`, `toStatus`, `changedById`, `changedByName`, `createdAt`, oldest first; rows come from the retained status-history trigger | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |

`POST /api/events/:id/confirm` is not mounted and returns `404 NOT_FOUND` (`/cancel` arrived with KAN-62 and `/complete` with KAN-10, below). Existing later-status records remain readable; their presence does not enable those actions. Registration and change-request application endpoints are also absent. Equipment has the narrow KAN-9 availability and KAN-26 saved-reservation endpoints below; equipment stock maintenance and request creation/editing are still pending. KAN-64 mounts the notification inbox, with the KAN-26 equipment-reserved slice of KAN-80; other later-workflow triggers remain pending. KAN-12 search, KAN-51 availability, KAN-52 suitability, KAN-55 operational blocks and KAN-8 booking decisions are mounted under their committed Sprint 2 stories; their contracts are below.

### Frontend routes

Client navigation is not access control; every page relies on the API responses above. `AppShell.vue` shows organiser links to signed-out visitors and filters the sidebar by the signed-in role. Review links require an Event Coordinator session; Lead allocation and oversight links require an Event Coordinator Lead session. Separate `ReviewAccessPage.vue` and `LeadAccessPage.vue` boundaries protect direct navigation and clear stale data on account/role changes. The venue availability link requires a resolved Event Coordinator, Venue Staff or Technical Support Staff session, and the page applies the same check before reading any data.

| Path | Page | Sidebar visibility |
| --- | --- | --- |
| `/equipment/availability` | KAN-9 approved/confirmed event picker | TS after session resolution; protected access gate on direct navigation |
| `/equipment/availability/:id` | KAN-9 saved/unsaved assessment and a separate KAN-26 saved-reservation panel with readiness/history | TS only; reserve/cancel full saved lines on approved events, confirmed events read-only; no what-if writes |
| `/events`, `/events/new` | Organiser request list; new event request form | Signed out or EO |
| `/events/:id`, `/events/:id/edit` | Organiser detail with the planning panels; draft editing | Linked from the list |
| `/events/:id/details` | KAN-66 post-submission edits: owner before approval, assigned coordinator name/description after approval | Linked from the detail and review pages; fields decided by the API |
| `/events/:id/change-request` | KAN-15 owner change request for an approved or confirmed event | Linked from the Change requests panel on `/events/:id` |
| `/reviews` | Assigned coordinator review queue | EC after session resolution |
| `/reviews/unassigned` | Legacy route redirects to `/lead` | Destination requires ECL; ordinary coordinators see no queue data |
| `/lead`, `/lead/oversight` | Submitted/unassigned allocation queue; active-event oversight | ECL after session resolution |
| `/lead/oversight/:id` | Basic allocation detail, initial assignment and versioned reassignment; recorded history | ECL after session resolution; no review/venue/roster controls |
| `/reviews/:id` | Coordinator review with the planning panels | Linked from the queue |
| `/reviews/:id/venue-suitability` | KAN-52 event-specific suitability and requirement interpretation | Linked from the assigned coordinator's review; role and relationship checked by the API |
| `/venue-blocks` | KAN-55 operational block creation, list and removal | VS after session resolution |
| `/venue-catalogue` | KAN-50 venue catalogue list | VS after session resolution |
| `/venue-catalogue/:id` | KAN-50 view and edit one venue; only changed fields are saved | VS after session resolution; others see a staff-only message and no venue data is requested |
| `/venues` | KAN-12 venue search and combined filters | EC after session resolution |
| `/venue-bookings` | KAN-8 staff pending queue or coordinator outcomes; optional `?eventRequestId=<id>` | VS or EC after session resolution |
| `/venue-bookings/:id` | KAN-8 request detail and saved decision; KAN-83 hold deadline, place-hold and cancel-hold forms; writes only for staff with a pending or live held booking | Linked from the booking list; role checked on direct navigation |
| `/venues/availability` | KAN-51 venue availability calendar; optional `?week=YYYY-MM-DD&venue=<id>` reopens a week and venue | EC, VS or TS after session resolution; also linked from `/reviews/:id` for the event's week |

`EventPlanningPanels.vue` adds read-only assignment history, clarification and read-only status-history panels to organiser/coordinator details. KAN-79 allocation controls live on the dedicated Lead pages; these planning panels do not offer coordinator self-assignment.

**Earlier scope correction, 26 September 2026:** the venue, equipment, registration, notification and change-request routes recorded here earlier were removed before Sprint 2 so the team builds those stories itself; see the Sprint 2 backlog. Their tables remain in migration 004. KAN-51's read-only calendar route was rebuilt on 3 October; see [below](#venue-availability-calendar-kan-51-cf-09).

**Verification:** Backend unit and HTTP-boundary tests live under `backend/test/events/` (`create-draft*.test.ts`, `workflow-support.test.ts`, `workflow-routers.test.ts`). PostgreSQL integration tests live under `database/tests/events/` (`create-draft`, `assignment`, `clarifications`, `status-history`) and `database/tests/core-schema.integration.test.ts`. Component tests sit beside each page and panel under `frontend/src/features/`. They use fixture authentication, API response fixtures or an isolated PostgreSQL test database. Browser checks live in `tests/e2e/`; their response fixtures test UI behavior rather than hosted persistence. The [test evidence](../testing/test-evidence.md) records the exact route/build coverage of local automation, CI and separate hosted observations, including remaining acceptance gaps.

## Venue availability calendar (KAN-51, CF-09)

**Status, 3 October 2026:** implemented on `feat/KAN-51-venue-availability-calendar` in `backend/src/modules/venues/` and mounted by `createRuntimeApp` through the `workspace` dependencies. The route only reads migration 004's `venues`, `venue_bookings` and `venue_unavailability` tables; there is no schema change. Unit, HTTP-boundary, PostgreSQL, component and browser-fixture tests passed on `6ede774` and in CI for PR #22 (AUTO-20261003-01 and AUTO-20261003-02 in the [test evidence](../testing/test-evidence.md)). Hosted acceptance (S2-T05/S2-T06) and peer review are outstanding. The three-role access group is the 21 September team decision; the remaining rules are provisional team assumptions in the [3 October decision](../requirements/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar).

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/venues/availability?from=…&to=…` | EC, VS, TS | `200` `{ from, to, items }` as described below | `400 INVALID_AVAILABILITY_WINDOW`; `401 AUTHENTICATION_REQUIRED`; `403 ACTION_FORBIDDEN` for EO and AT, before any venue data is read |

- `from` and `to` are single ISO 8601 date-times with an explicit offset or `Z`; `to` must be after `from`, at most 31 days later. The response echoes both as UTC instants. The calendar page requests one Singapore week: Monday 00:00 to the next Monday 00:00 (+08:00).
- `items` lists every **active** venue, ordered by name, with `id`, `name`, `location`, `capacity`, `opensAt` and `closesAt` (daily `HH:MM` in Singapore time; `null` leaves that end of the day unrestricted) and `unavailable`: the periods overlapping the window, earliest first, returned whole rather than clipped to the window.
- Each period is either `{ id, kind: "BOOKING", startsAt, endsAt, event }` for an `APPROVED` booking, the implemented meaning of a confirmed booking, or `{ id, kind: "BLOCKED", startsAt, endsAt, reason }` for a `venue_unavailability` row. `PENDING`, `REJECTED` and `CANCELLED` bookings are omitted because they do not hold the venue. Intervals are half-open, so a period ending exactly at `from` or starting exactly at `to` lies outside the window.
- `event` is `{ id, name }` only for the event's currently assigned coordinator, and never for a draft; it is `null` for every other reader. Block reasons are visible to all three roles. Labels and details remain open under S2-Q03.

```json
{
  "from": "2026-10-04T16:00:00.000Z",
  "to": "2026-10-11T16:00:00.000Z",
  "items": [{
    "id": "…", "name": "Harbour Hall", "location": "Level 1, Main Building", "capacity": 300,
    "opensAt": "08:00", "closesAt": "22:00",
    "unavailable": [
      { "id": "…", "kind": "BOOKING", "startsAt": "2026-10-05T02:00:00.000Z", "endsAt": "2026-10-05T04:00:00.000Z", "event": null },
      { "id": "…", "kind": "BLOCKED", "startsAt": "2026-10-06T01:00:00.000Z", "endsAt": "2026-10-06T10:00:00.000Z", "reason": "Maintenance" }
    ]
  }]
}
```

Available time is whatever lies inside a venue's opening hours that no listed period covers. `/venues/availability` derives it from this response, showing each day of the selected venue's week as a bar for scanning and a text list for screen readers and narrow screens, labelled Available, Booked or Blocked, with closed hours shaded. It offers previous/this/next week, a date jump, refresh and a venue picker, and keeps the week and venue in the address so a reload or shared link reopens the same view. Signing out or changing accounts unmounts the calendar and aborts its pending read; a 401 clears the local session. Venue Staff and Technical Support Staff need provisioned Supabase Auth accounts linked through `app_users.supabase_user_id`.

**Verification:** `backend/test/venues/` (window parsing, role refusal before any query, response mapping, HTTP boundary), `database/tests/venues/venue-availability.integration.test.ts` (all five roles and signed-out access through `createRuntimeApp`, booking statuses, half-open boundaries, inactive venues, cross-venue isolation, coordinator-only event names and refresh after changes), `frontend/src/features/venues/` (Singapore-time day/segment rules and page states) and `tests/e2e/venue-availability.spec.ts` (navigation by role, denied paths, venue/week changes, reload and a narrow screen). Record executed runs in the [test evidence](../testing/test-evidence.md) against their commit.


## Venue search (KAN-12, CF-10)

**Integrated 4 October 2026:** Ryan's venue search is mounted at `/venues` in the frontend. Only Event Coordinators may use the search/filter APIs; calendar access alone grants no search permission.

| Method / route | Success | Failure |
| --- | --- | --- |
| `GET /api/venues/filter-options` | `200 { layouts, facilities, accessibility }` from the active catalogue | `401 AUTHENTICATION_REQUIRED`; `403 ACTION_FORBIDDEN` |
| `GET /api/venues/search-venues` | `200 { items }` with matching current active venues | `400 INVALID_VENUE_SEARCH`; `401 AUTHENTICATION_REQUIRED`; `403 ACTION_FORBIDDEN` |

Optional filters are `startsAt`/`endsAt` (both supplied or both omitted), positive integer `attendance` and `capacity`, `location`, `layout`, boolean `wheelchairAccessible`, and repeated `facilities`/`accessibility` parameters. Empty filters are ignored; each active filter must match. The capacity threshold is the greater of attendance and requested minimum capacity. Required facilities/accessibility values all need to exist on the venue; layout must be supported. The location text matches venue name/location. A provided period, including the venue's setup and turnaround time, is checked against Singapore opening times, occupied booking intervals and operational blocks, using half-open overlap boundaries. Search has no write side effects and an empty match returns an empty list.

The 4 October integration fixes removed a hard-coded `public` schema so isolated test schemas work, and ensure operational blocks exclude a venue even without an approved booking. Three real PostgreSQL regressions are in `database/tests/venues/venue-search.integration.test.ts`; AUTO-20261004-KAN8-01 records the combined local run. This is supporting integration work, not KAN-52 suitability assessment or KAN-53 request submission. Hosted KAN-12 acceptance remains pending.

**5 October date-filter integration:** the search now shares KAN-52's whole-interval opening-hours helper. A continuous event must fit all occupied Singapore days, not merely endpoint clock times. Missing bounds mean 00:00/24:00; an interval ending exactly at midnight occupies only the preceding day. Explicit full-day hours or absent bounds allow multi-day continuous use; daily closed periods exclude it. Catalogue, approved bookings and operational blocks are read in one SQL snapshot; opening-hour checks retain database seconds/fractions and use those returned rows. No write or reservation is created. See [search details](../../backend/src/modules/venues/venue-search.md).

**Current integrated contract, checked 25 October 2026:** supplied timestamps must contain a real calendar date and time with an explicit `Z` or `±HH:MM` time zone (`YYYY-MM-DDTHH:mm[:ss[.sss]]` followed by that zone), and the end must be after the start. Missing zones, impossible dates such as 30 February, invalid clock values and reversed/equal periods return `400 INVALID_VENUE_SEARCH`; impossible dates are not silently normalised. Valid values are normalised to UTC. KAN-78 expands the candidate interval to `[startsAt − setupMinutes, endsAt + turnaroundMinutes)` and compares it with the stored occupied booking intervals, blocks and whole-interval opening hours. KAN-83 makes `APPROVED` bookings and `HELD` bookings whose deadline is strictly later than the database clock occupy those intervals. At the hold deadline it stops blocking immediately, even before the expiry worker updates its stored status. `PENDING`, rejected, cancelled and expired bookings do not occupy the venue. These current rules extend the earlier dated integration checkpoints above.

## Venue booking submission (KAN-53, CF-12)

**Integrated on this branch, 5 October 2026:** Kai Jie's submission API and coordinator panel connect venue selection to KAN-8 decisions. This local merge does not change remote main or establish hosted acceptance. No migration is added.

`POST /api/events/:id/venue-bookings` uses the **event request ID**, requires the currently assigned Event Coordinator, and returns `201 { booking }` with status `PENDING`. The accepted JSON fields are:

```json
{
  "venueId": "venue-uuid",
  "startsAt": "2026-10-20T10:00:00+08:00",
  "endsAt": "2026-10-20T12:00:00+08:00",
  "layout": "THEATRE",
  "notes": "Fictional planning notes"
}
```

Venue/timing are required; layout and notes may be omitted or null. Dates must be valid ISO date-times with an explicit `Z` or numeric timezone offset and a valid calendar day; end must be later than start. Optional text is trimmed and limited to 2,000 characters by the API. The panel limits layout to 100 and notes to 2,000. Unknown fields, including a forged requested-by actor or booking status, are rejected.

| Failure | Meaning |
| --- | --- |
| `401 AUTHENTICATION_REQUIRED` | No verified session. |
| `403 ACTION_FORBIDDEN` | Verified actor is not an Event Coordinator. |
| `400 INVALID_EVENT_REQUEST_ID` / `INVALID_VENUE_ID` / `INVALID_BOOKING_PERIOD` / `INVALID_INPUT` | Malformed identifier/body, invalid dates/text, or end not after start. |
| `404 EVENT_REQUEST_NOT_FOUND` | Missing event, draft, or event not assigned to this coordinator; no event data disclosed. |
| `404 VENUE_NOT_FOUND` / `409 VENUE_INACTIVE` | Missing or inactive venue. |
| `409 EVENT_NOT_ELIGIBLE` | Event is Rejected, Cancelled or Completed. |
| `409 VENUE_BOOKING_CONFLICT` | An approved booking currently overlaps the requested venue/period. No new row is saved. |
| `409 VENUE_UNAVAILABLE` | An operational block currently overlaps the requested venue/period. No new row is saved. |

The transaction locks the event and venue, then reads conflicts in a fresh query after acquiring the venue lock. Half-open intervals allow exact adjacency; different venues do not conflict. Pending, rejected and cancelled bookings do not hold availability. Several pending requests for the same event/venue/period are allowed; this endpoint has no duplicate-submission idempotency key. Approval independently rechecks availability. Creation neither approves the booking nor changes event status.

Current event timing and free-text requirements remain visible alongside saved booking timing/layout/notes; they are not a submission snapshot. The coordinator enters the booking interval, so it may differ from the event interval used by KAN-52. Suitability is a separate read-only assessment and does not automatically gate submission. Every non-draft event state except Rejected/Cancelled/Completed currently permits a request, while later approval requires an Approved event. Eligibility, duplicate-pending policy, snapshot semantics and any stronger suitability gate remain [documented defaults](../requirements/assumptions-and-questions.md#5-october-2026--venue-branch-integration), not newly agreed criteria.

On `/reviews/:id`, **Venue booking requests** lets the coordinator choose an active venue, enter Singapore start/end, optional **Room layout**/**Notes for Venue Staff**, and choose **Request this venue**. It reloads the booking list after success and presents refusals without reporting success. Organisers and other roles do not mount this panel. Account/event changes discard stale asynchronous results. Existing `/venue-bookings` and `/venue-bookings/:id` pages show the staff queue and assigned-coordinator outcomes.

Verification sources include `booking-input.test.ts`, `venue-booking-submission-router.test.ts`, `VenueBookingPanel.test.ts` and `database/tests/venues/venue-bookings.integration.test.ts`. The original branch's [4 October results](../testing/test-evidence.md#4-october-venue-booking-submission) have a narrower scope than this merged implementation. Record combined runs separately and follow [hosted submission checks](../testing/README.md#kan-53-hosted-verification); no hosted result is claimed here.

## Temporary venue holds (KAN-83, CR-4)

**Status, 21 October 2026:** implemented on branch `feat/KAN-83-venue-holds` with migration [008](../../database/migrations/013_venue_holds.sql); automated run AUTO-20261021-KAN83-01 in the [test register](../testing/test-evidence.md). Not applied to shared Supabase; hosted acceptance and review are outstanding. Decisions: [21 October KAN-83 entry](../requirements/assumptions-and-questions.md#21-october-2026--kan-83-implementation-decisions).

`POST /api/venue-bookings/:id/hold` body: `{ "expiresAt": "2026-11-28T18:00:00+08:00" }`, an ISO 8601 instant with `Z` or an offset. The deadline must be strictly after the database clock and no later than the booking's occupied start (the requested start until KAN-78 adds buffers). The service locks booking → event → venue and rechecks event approval, venue activity, capacity against expected attendance, opening hours, approved bookings, other live holds and blocks.

`POST /api/venue-bookings/:id/hold/cancel` body: `{ "reason": "Organiser withdrew" }`, trimmed, nonempty, at most 2,000 characters. Only that booking changes; its hold fields remain as history.

Approving a live hold through `POST /api/venue-bookings/:id/decision` converts it into the approved booking in one row update after rechecking the deadline under every lock. Rejecting a live hold is also allowed.

| Error | Meaning |
| --- | --- |
| `400 INVALID_HOLD_EXPIRY` | Missing, malformed, past or after-start deadline |
| `400 INVALID_INPUT` | Missing/blank cancellation reason or unknown field |
| `403 ACTION_FORBIDDEN` | The verified role is not Venue Staff |
| `404 VENUE_BOOKING_NOT_FOUND` | No such booking |
| `409 BOOKING_NOT_PENDING` / `BOOKING_ALREADY_HELD` | Only a pending request without a live hold can be held |
| `409 BOOKING_NOT_HELD` | Cancel on a booking without a live hold |
| `409 HOLD_EXPIRED` | Approve, reject or cancel at or after the deadline; the hold is already released and cannot be revived |
| `409 EVENT_NOT_APPROVED` / `VENUE_INACTIVE` / `VENUE_UNSUITABLE` / `OUTSIDE_VENUE_HOURS` | Hold eligibility failed |
| `409 VENUE_BOOKING_CONFLICT` / `VENUE_HELD` / `VENUE_UNAVAILABLE` | Overlap with an approved booking, another live hold or a block |

`VenueBooking` adds `holdExpiresAt`, `heldBy`, `heldAt`, `expiredAt`, `cancelledBy`, `cancelledAt` and `cancellationReason` (all nullable). `status` may now be `HELD` or `EXPIRED`; a `HELD` row past its deadline is returned as `EXPIRED` even before expiry runs. Venue Staff's list contains `PENDING` and live `HELD` bookings. `VENUE_HELD` is also returned by `POST /api/events/:id/venue-bookings` and booking approval when another request's live hold overlaps. Calendar `BOOKING` periods add `heldUntil` (the deadline for a live hold, otherwise `null`), and search and suitability treat a live hold as occupying.

Each hold change writes a notification for the event's current coordinator in the same transaction: `VENUE_HOLD_PLACED` (with the deadline in Singapore time), `VENUE_HOLD_EXPIRED` (once, from `expire_venue_holds()`) and `VENUE_HOLD_CANCELLED`. Their in-app display belongs to KAN-64.

## Venue booking decisions (KAN-8, CF-13)

**Status, 4 October 2026:** implemented for existing `venue_bookings` rows, using the verified application session and migration 004's retained schema. KAN-53 was not integrated in that original run; the [5 October submission integration](#venue-booking-submission-kan-53-cf-12) now supplies pending rows on this branch. No new migration or shared Supabase write is part of this implementation. The [implementation choices](../requirements/assumptions-and-questions.md#4-october-2026--kan-8-venue-booking-decisions) distinguish provisional policy from the story criteria. Executed checks belong in AUTO-20261004-KAN8-01 in the [test register](../testing/test-evidence.md); hosted acceptance, peer review and new CI remain pending.

| Method / route | Roles and scope | Success |
| --- | --- | --- |
| `GET /api/venue-bookings?eventRequestId=…` | VS: pending bookings across venues. EC: all booking statuses for currently assigned, non-draft events. The optional UUID filter only narrows this scope. | `200 { items: VenueBooking[] }`, oldest request first, stable ID tie-break |
| `GET /api/venue-bookings/:id` | VS: booking detail in any status, including a saved decision. EC: only a currently assigned, non-draft event. | `200 { booking: VenueBooking }` |
| `POST /api/venue-bookings/:id/decision` | VS only, `PENDING` booking or live `HELD` booking (KAN-83) | `200 { booking: VenueBooking }` after the decision commits |
| `POST /api/venue-bookings/:id/hold` | VS only, `PENDING` booking for an `APPROVED` event (KAN-83) | `200 { booking: VenueBooking }` with status `HELD` |
| `POST /api/venue-bookings/:id/hold/cancel` | VS only, live `HELD` booking (KAN-83) | `200 { booking: VenueBooking }` with status `CANCELLED` |

Request body for the decision route:

```json
{ "decision": "REJECTED", "reason": "The requested layout cannot be supported." }
```

`decision` must be `APPROVED` or `REJECTED`. `reason` is optional text or `null`, trimmed and limited to 2,000 characters; absent/blank becomes `null`. Unknown body fields and invalid types are refused. KAN-8 requires the ability to supply rejection information, but a mandatory reason has not been agreed. This differs from the separately recorded KAN-36/KAN-60 event-rejection rule.

`VenueBooking` contains `id`, `eventRequestId`, `eventName`, `eventStatus`, `venueId`, `venueName`, `status`, `startsAt`, `endsAt`, `layout`, `notes`, `decidedBy`, `decidedAt`, `decisionReason`, `createdAt` and `updatedAt`. It also includes the **current** event's `eventStartsAt`, `eventEndsAt`, `purpose`, `description`, `expectedAttendance`, `venueRequirements` and `accessibilityNeeds`. Event text/timing/requirements and decision fields can be null; booking identifiers, booking timing and status are required. Date-times are ISO instants. This is a current event projection alongside the stored booking period/layout/notes, not a submission snapshot. No organiser email, authentication subject or unrelated event record is returned.

The staff page at `/venue-bookings` opens `/venue-bookings/:id`; the assigned coordinator uses the same routes read-only, with an event-filtered link from `/reviews/:id`. Other roles cannot read these endpoints even if they may read the availability calendar. A saved staff decision remains readable by ID after it leaves the pending queue. The coordinator can find it in their all-status booking list.

| HTTP / code | Meaning |
| --- | --- |
| `400 INVALID_VENUE_BOOKING_ID` | Invalid booking UUID. |
| `400 INVALID_EVENT_REQUEST_ID` | Invalid, repeated or empty `eventRequestId` list filter. |
| `400 INVALID_BOOKING_DECISION` / `INVALID_INPUT` | Unsupported decision, unknown field/query parameter, invalid reason type or excessive reason length. |
| `401 AUTHENTICATION_REQUIRED` | No valid session. |
| `403 ACTION_FORBIDDEN` | Role is not allowed to read/write the requested operation. |
| `404 VENUE_BOOKING_NOT_FOUND` | Missing booking or coordinator has no current relationship to its non-draft event. |
| `409 BOOKING_ALREADY_DECIDED` | The booking is no longer pending, including a repeated/opposite decision or a cancelled row. |
| `409 EVENT_NOT_APPROVED` | Approval requires an event currently in `APPROVED`. Rejection of the pending booking remains available. |
| `409 VENUE_INACTIVE` | The venue cannot receive an approval while inactive. |
| `409 VENUE_BOOKING_CONFLICT` | Another approved booking overlaps this venue and period. |
| `409 VENUE_UNAVAILABLE` | An operational block overlaps this venue and period. |

The write uses one transaction, locks the booking row and rechecks `PENDING`. Approval also locks the event then venue, verifies `APPROVED`/active eligibility, and queries conflicts **after** obtaining the venue lock so competing approvals see the latest committed reservation. KAN-78 now checks occupied intervals including setup/turnaround (see the 21 October contract below); pending/rejected/cancelled rows do not reserve the venue. Rejection can close a stale pending request without requiring event/venue approval eligibility. The existing database trigger remains a final integrity guard; future booking/block writers must coordinate their venue locking and tests with this path.

A successful write changes only this booking's status, decision actor/time/reason and update timestamp. It preserves the event/venue associations and booking period, and does not transition the event. It writes the venue-decision notifications in the same transaction (KAN-64). KAN-51 reads the new approved period on refresh; rejected bookings remain absent. Repeated/competing decisions never overwrite the original outcome. An uncertain client response requires a read before retrying; the UI automatically reloads on 409 and offers a read-only retry after uncertain transport failures.

Verification lives in `backend/test/venues/booking-input.test.ts`, `backend/test/venues/venue-bookings-router.test.ts`, `database/tests/venues/venue-bookings.integration.test.ts`, the two booking page component suites and `tests/e2e/venue-bookings.spec.ts`. Follow the [manual guide](../testing/README.md#kan-8-hosted-verification) with provisioned accounts and coordinated synthetic fixtures. Approval-time conflict coverage does not accept KAN-53 submission or all KAN-54/KAN-55 criteria.

## Venue suitability (KAN-52, CF-11)

**Status, 4 October 2026:** implemented without a migration; the user confirmed coordinator interpretation of free-text event requirements for each assessment. The remaining [implementation choices](../requirements/assumptions-and-questions.md#4-october-2026--kan-52-venue-suitability), executed tests, hosted acceptance, peer review and CI are separate records. The API never creates a booking or changes an event.

Only the currently assigned `EVENT_COORDINATOR` can use either route for a non-draft event. A staff role or calendar permission does not grant this event-specific access.

| Method and route | Success | Errors |
| --- | --- | --- |
| `GET /api/events/:id/venue-suitability` | `200 { event, requirementsVersion, venues }` | `401 AUTHENTICATION_REQUIRED`; `403 ACTION_FORBIDDEN`; `400 INVALID_EVENT_REQUEST_ID`; `404 EVENT_REQUEST_NOT_FOUND` for absent, draft or unrelated requests |
| `POST /api/events/:id/venue-suitability` | `200 { assessment }`, including unsuitable or unknown results | Same identity/ID errors; `400 INVALID_SUITABILITY_INPUT`; `404 VENUE_NOT_FOUND`; `409 SUITABILITY_CONTEXT_CHANGED` |

`event` contains `id`, nullable `name`, `startsAt`, `endsAt`, `expectedAttendance`, `venueRequirements` and `accessibilityNeeds`. `venues` contains active catalogue entries ordered by name/ID with `id`, `name`, `capacity`, `facilities`, `accessibilityFeatures`, `layouts`, `wheelchairAccessible`, `opensAt` and `closesAt`. Event dates are ISO instants; venue opening times are nullable Singapore daily clock values. `requirementsVersion` is the SHA-256 hash of the actual returned event source fields, so dashboard edits need not update `updated_at` to invalidate stale interpretations. Treat it as an opaque freshness value, not an authorization token. `expectedAttendance: 0` is a known value that the capacity check assesses (KAN-52-AC101); only `null` or an unusable number yields an `UNKNOWN` capacity check, with a different message.

Every POST field is required explicitly, including empty lists, booleans and nullable strings; unknown fields are rejected:

```json
{
  "venueId": "<venue UUID>",
  "requirementsVersion": "<version returned by GET>",
  "facilities": ["Projector"],
  "accessibility": ["Hearing loop"],
  "layout": "Theatre",
  "wheelchairRequired": true,
  "requirementsConfirmed": true,
  "unresolvedRequirements": null
}
```

Facilities/accessibility each allow at most 30 distinct, nonblank labels of up to 100 characters. Labels are trimmed and deduplicated ignoring case; matching requires exact normalised equality, not substring or natural-language inference. All specified labels are required, including values absent from the selected venue's catalogue. `layout` is one label of up to 100 characters or null. `unresolvedRequirements` is up to 2,000 characters or null; blank nullable strings become null. Confirming empty lists/layout and an unchecked wheelchair requirement explicitly means none is required; an unchecked confirmation never silently passes.

`assessment` contains `eventId`, nullable `eventName`, `venueId`, `venueName`, ISO `checkedAt`, `outcome` (`SUITABLE`, `UNSUITABLE`, `NEEDS_REVIEW`) and `checks`. Each check has a `key`, `status` (`PASS`, `FAIL`, `UNKNOWN`) and explanatory `message`. Keys are `venueActive`, `capacity`, `facilities`, `accessibility`, `layout`, `availability` and `requirements`. A definite failed check takes precedence and yields Unsuitable; otherwise any unknown check yields Needs review; only every applicable check passing yields Suitable.

Each POST reads current authorized event, selected venue and conflicts in one SQL snapshot. It checks active state, positive known attendance against capacity, interpreted capabilities, and continuous coverage of the entire event interval by daily Singapore opening hours. Missing/invalid attendance or time yields UNKNOWN. Availability includes all approved bookings, even the selected event's own booking, and recorded operational blocks. Overlap is half-open, so adjacent periods are allowed; pending/rejected/cancelled bookings do not reserve. The check is read-only and does not lock or reserve a venue.

When the relevant event source changed, POST returns `409 SUITABILITY_CONTEXT_CHANGED`; the UI reloads the source and requires interpretation/confirmation again. Venue/capability/availability changes are re-evaluated on each check. `/reviews/:id/venue-suitability` shows source text, capabilities, per-check reasons, refresh/recheck controls and denied/expired-session/retry states; editing the interpretation or venue discards its previous conclusion and confirmation. The venue details panel is explicitly labelled as the last refreshed catalogue snapshot; assessment results use a fresh read even when that panel has not been refreshed.

Tests live in `backend/test/venues/suitability-input.test.ts`, `suitability-rules.test.ts`, `suitability-router.test.ts`, `database/tests/venues/venue-suitability.integration.test.ts`, `frontend/src/features/venues/pages/VenueSuitabilityPage.test.ts` and `tests/e2e/venue-suitability.spec.ts`. Consult [test evidence](../testing/test-evidence.md) for actual executions and [hosted checks](../testing/README.md#kan-52-hosted-verification) for S2-T09/T10. A fixture-based pass is not hosted acceptance or a booking guarantee.

## Operational venue blocks (KAN-55, CF-09/CF-14)

**KAN-81 phase 1 / CR-2, 21 October 2026 (supersedes the overlap refusal below).** `POST /api/venues/:venueId/unavailability` no longer refuses an outage that overlaps an approved booking. It saves the block and returns it with `affected`: one `{ impactId, status, bookingId, eventRequestId, eventName, bookingStartsAt, bookingEndsAt }` per non-ended approved booking at that venue whose event interval overlaps (half-open; KAN-78 will use buffered intervals). `status` is `RECOVERY_REQUIRED`, `RESOLVED` or `CLEARED`. `GET` returns each block with its `affected` list. `DELETE …/:blockId` returns `{ id, clearedBookingIds }` and clears only that block's open flags. New `GET /api/venues/recovery[?status=…]` (Venue Staff only) lists affected arrangements with `blockId` (null once removed), `venueId`, `venueName`, `outageStartsAt`, `outageEndsAt` and `outageReason`. An unknown filter returns `400 INVALID_RECOVERY_FILTER`. Booking and event records are not changed by an outage.

**KAN-81 phase 2, 21 October 2026.** Every venue booking response (`GET /api/venue-bookings`, `GET /api/venue-bookings/:id`, submission and decision results) includes `recovery`: `[{ impactId, status, outageStartsAt, outageEndsAt, outageReason }]`, earliest outage first, empty when unaffected. Existing booking visibility rules apply. Saving an outage records a `VENUE_OUTAGE_RECOVERY_REQUIRED` notification for each affected event's current coordinator, linked to the booking, in the same transaction.

**KAN-81 phase 3, 21 October 2026.** The booking submission body accepts optional `replacesBookingId` (UUID or null; `400 INVALID_REPLACED_BOOKING_ID` otherwise), and every booking response includes `replacesBookingId`. Replacement refusals: `404 VENUE_BOOKING_NOT_FOUND`, `409 REPLACEMENT_NOT_NEEDED`, `409 EVENT_NOT_ELIGIBLE_FOR_REPLACEMENT`, `409 VENUE_CAPACITY_TOO_SMALL`, `409 VENUE_CLOSED_DURING_PERIOD`, plus the usual conflict codes. Approving a replacement can return `409 REPLACEMENT_NOT_NEEDED`; on success the original becomes `CANCELLED` and its recovery `RESOLVED`. See the [phase 3 rules](../requirements/assumptions-and-questions.md#21-october-2026--kan-81-phase-3-replacement-rules).

Current main provides Venue Staff-only `GET`/`POST /api/venues/:venueId/unavailability` and `DELETE /api/venues/:venueId/unavailability/:blockId`. Creation records an ordered time interval and a mandatory reason against the correct active venue; it refuses overlap with an existing approved booking. The shared `venue_unavailability` records feed the calendar, search, KAN-52 suitability and booking approval. See the [module contract](../../backend/src/modules/venues/README.md#venue-unavailability-blocks--kan-55) and [dated implementation record](../requirements/assumptions-and-questions.md#4-october-2026--kan-55-block-venue-for-operational-unavailability). Block removal is additional implementation behavior recorded there; inclusion in main does not itself establish hosted acceptance. KAN-53 creation is now integrated on this branch; its submission-time checks read the same operational blocks.

## Venue catalogue maintenance (KAN-50, CF-08)

**Status, 9 October 2026:** the backend is implemented on `feat/KAN-50-maintain-venue-catalog` in `backend/src/modules/venues/` (`venue-catalogue-input.ts`, `venue-catalogue-service.ts`, `venue-catalogue-router.ts`) and mounted in `createApp` through the same `workspace` dependencies as the other venue routes. It reads and writes migration 004's `venues` table only; there is no schema change. Local unit and HTTP-boundary tests pass; PostgreSQL integration, browser and hosted checks are recorded separately in [test evidence](../testing/test-evidence.md) once run. Scope choices are in the [9 October decision](../requirements/assumptions-and-questions.md#9-october-2026--kan-50-venue-catalogue-maintenance-scope-and-implementation-choices).

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/venues/catalogue` | VS | `200` `{ items }`: every active venue, by name | `401 AUTHENTICATION_REQUIRED`; `403 ACTION_FORBIDDEN` |
| `GET /api/venues/catalogue/:venueId` | VS | `200` `{ venue }` | `400 INVALID_VENUE_ID`; `401`; `403`; `404 VENUE_NOT_FOUND` (missing or inactive) |
| `PATCH /api/venues/catalogue/:venueId` | VS | `200` `{ venue }`: the saved venue | `400 INVALID_VENUE_ID`; `400 INVALID_VENUE_CATALOGUE_INPUT`; `401`; `403`; `404 VENUE_NOT_FOUND`; `409 VENUE_INACTIVE`; `409 VENUE_BUFFER_CONFLICT` |

Only Venue Staff may read or change the catalogue. Event Coordinators keep reading venue data through `/api/venues/search-venues`, `/api/venues/filter-options` and venue suitability; Organisers, Attendees, Technical Support Staff and signed-out callers are refused before any venue data is read. Identity comes from the verified session, never from the body or headers. Responses use `Cache-Control: no-store`.

A `venue` has the same shape as a venue search result: `id`, `name`, `description`, `location`, `capacity`, `layouts`, `facilities`, `accessibilityFeatures`, `wheelchairAccessible`, `opensAt`, `closesAt` (daily `HH:MM` in Singapore time; `null` leaves that end unrestricted), `setupMinutes`, `turnaroundMinutes` and `updatedAt`.

**Update body.** Every field is optional, an omitted field is unchanged, and at least one must be present. Any other key (including `name`, `description`, `isActive` and `id`) is refused.

| Field | Rule |
| --- | --- |
| `location` | Text or `null`; trimmed, at most 200 characters; blank becomes `null` |
| `capacity` | Whole number from 1 to 2,147,483,647; not `null` |
| `facilities`, `accessibilityFeatures`, `layouts` | Array of text labels, possibly empty; trimmed, deduplicated ignoring case (first spelling kept), at most 100 characters each and 30 distinct values; not `null` |
| `wheelchairAccessible` | Boolean; not `null` |
| `opensAt`, `closesAt` | `HH:MM` from `00:00` to `23:59`, or `null`; when both are set (in the body, or against the stored value when only one is sent) closing must be after opening |
| `setupMinutes`, `turnaroundMinutes` (KAN-77) | Whole number of minutes from 0 to 1,440; not `null`. Each must be sent with `expectedSetupMinutes` / `expectedTurnaroundMinutes`, the value the editor loaded (same range). An expected value without its field, or a field without its expected value, is refused with `400 INVALID_VENUE_CATALOGUE_INPUT` |

**KAN-77 setup and turnaround durations, 21 October 2026.** Integrated migration 009 adds both values to every venue (default 0); the source branch originally numbered this file 008 before combining it with KAN-64. Catalogue venues, venue search results, the suitability context's `venues` and each `/api/venues/availability` venue now include `setupMinutes` and `turnaroundMinutes`. These are inputs only: booking periods, search filters, suitability and conflict checks still use the event interval until KAN-78 applies the buffers. KAN-77 AC6 booking re-evaluation and affected-booking warnings remain incomplete. Under the venue row lock, a changed buffer whose stored value no longer equals its expected value returns `409 VENUE_BUFFER_CONFLICT` and nothing in the request is written. Edits to other fields keep the KAN-50 rule below, and a request that changes no buffer is never refused for buffer changes made meanwhile.

The update locks the venue row and runs in one transaction, so concurrent edits are serialised, a field that was not sent is never touched, and layouts stay on the venue they were saved for. Concurrent edits to different fields both persist; the same non-buffer field is last-writer-wins. Buffer fields use the KAN-77 expected-value rule above. Search and suitability read the table live, so a saved change is visible to them on the next request. Changing capacity, layouts or buffer settings does not alter existing bookings. Creating, deleting or deactivating a venue remains outside this endpoint's scope. KAN-50's original catalogue scope is extended by KAN-77's setup/turnaround settings.

**KAN-50-AC101 stale-save guard, verified in the integrated code on 25 October 2026:** `VenueCatalogueEditPage.vue` captures the target venue and payload when a save starts. Reloading, navigating to another venue, changing account/role or leaving the page aborts and invalidates that save in the UI. Its delayed success, error, session-expiry or buffer-conflict response cannot replace the current editor or retarget a later save; an old completion cannot clear a newer save's busy state. Aborting the browser request does not roll back a write already committed for the original venue. This repair changes no endpoint or schema. The component regressions and PR #56 CI evidence are linked from the [verification report](../testing/test-evidence.md#25-october-2026--ryan-story-verification-records); the reusable scenario is `TC-08-14` / `S3-T15`.

**Verification:** `backend/test/venues/venue-catalogue-input.test.ts`, `venue-catalogue-service.test.ts` and `venue-catalogue-router.test.ts`. PostgreSQL integration and browser coverage (S2-T03/S2-T04) are added under `database/tests/venues/` and `tests/e2e/` and recorded in test evidence when executed.

## KAN-78 occupied venue intervals — 21 October 2026

Migration 008 adds `venues.setup_minutes` / `turnaround_minutes` (integers 0..1440, defaults zero), booking approval snapshots and internal SQL helpers/view. KAN-77 owns the separate buffer editing API/UI and stale-field contract; it is not implemented by this branch. Its writer must lock/update the same venue row and may query `venue_booking_warnings(booking_id)` for affected bookings.

The shared rule is [event start - setup, event end + turnaround). Search, calendar, suitability, submission and approval use current durations for non-ended/non-completed bookings. Approved reservations block; pending/rejected/cancelled requests do not. Exact occupied adjacency is allowed. Blocks and Singapore opening hours cover the full occupied interval. Restricted cross-day windows and invalid hours are unavailable; null/full-day hours permit continuous multi-day use.

Search adds `setupMinutes`, `turnaroundMinutes` and nullable `occupiedStartsAt/occupiedEndsAt` for a timed query. Suitability adds nullable occupied endpoints and checks them against hours. Calendar booking `startsAt/endsAt` now describe occupied bars; `eventStartsAt/eventEndsAt` retain event timing, with `warnings` carrying current operational issues. Booking list/detail/submission/decision responses add `occupiedStartsAt/occupiedEndsAt` and `warnings`. Existing event timing fields are unchanged. Staff lists include pending requests and approved bookings with current warnings; coordinators remain scoped to their assigned events. No additional event identity is disclosed on the calendar.

Warnings are `APPROVED_BOOKING_OVERLAP`, `OPERATIONAL_BLOCK_OVERLAP` and `OUTSIDE_OPERATING_HOURS`. They are recomputed on read after duration changes, flag both affected overlaps and disappear after resolution. They never cancel, delete or move bookings. Ended/completed historical bookings use recorded approval snapshots and have no new warnings. Existing conflicts do not exempt newly attempted reservations.

Submission and approval take the venue lock before a separate current-data check, serialising with duration edits/blocks/other approvals. The database trigger is a final approval guard; it snapshots durations. New block writes also coordinate on the venue lock. Existing conflict codes stay `VENUE_BOOKING_CONFLICT` / `VENUE_UNAVAILABLE`; an occupied hours violation returns 409 `VENUE_OUTSIDE_OPERATING_HOURS` with clear cross-day feedback. Any failure rolls back the write.

KAN-34's four editable date fields require ISO date-times with explicit offsets and real calendar dates. Impossible month/day or leap-day combinations return 400 input feedback before SQL; omitted fields, explicit nullable clears and Draft state/access policies are preserved.

## Notifications (KAN-64, CF-20)

Mounted at `/api/notifications` for every signed-in role. There is no way to name another recipient: each query uses the verified caller. Every response sets `Cache-Control: no-store`.

| Route | Result |
| --- | --- |
| `GET /api/notifications` | `200 { items }`, newest first, at most 100. Each item: `id`, `type`, `title`, `message`, `read`, `readAt`, `createdAt`, `event` (`{ id, name }` or null), `booking` (`{ id }` or null), `link` (an application path or null) |
| `GET /api/notifications/unread-count` | `200 { unreadCount }` |
| `POST /api/notifications/read-all` | `200 { updated }` for the caller's visible unread notifications |
| `POST /api/notifications/:id/read` | `200 { notification }`. Idempotent: an already-read notification keeps its original `readAt`. `400 INVALID_NOTIFICATION_ID` for a malformed id; `404 NOTIFICATION_NOT_FOUND` for an absent, someone else's or no-longer-visible notification (all indistinguishable) |

Visibility is re-checked on every read. An organiser sees notices for their own events; a coordinator for events they currently coordinate that are not drafts; Venue Staff for venue bookings. Ordinary notices whose protected targets are no longer accessible are excluded from the inbox, unread count and read-all update. For visible notices, `event` and `booking` are returned only for targets the caller may currently open, and `link` points only to an accessible target. The minimal `COORDINATOR_REASSIGNED_AWAY` notice stays visible to the previous coordinator without event details or a link after access is lost. Notices with no event or booking target remain scoped to their recipient. Types: `REQUEST_SUBMITTED`, `CLARIFICATION_REQUESTED`, `REVIEW_APPROVED`, `REVIEW_REJECTED`, `COORDINATOR_ASSIGNED`, `COORDINATOR_REASSIGNED`, `COORDINATOR_REASSIGNED_AWAY`, `VENUE_BOOKING_APPROVED`, `VENUE_BOOKING_REJECTED`. The trigger/recipient matrix is **To agree** in the [decision log](../requirements/assumptions-and-questions.md). Verification: `backend/test/notifications/`, `database/tests/notifications/notification-inbox.integration.test.ts`, the notification frontend suites and `tests/e2e/notifications.spec.ts`; see the KAN-64 runs in [test evidence](../testing/test-evidence.md).

The relevant business services insert these notices before committing, using the same PostgreSQL client. Duplicate `(recipient_id, dedupe_key)` outcomes are ignored; failed notification persistence rolls back the business action. Submission acknowledges the organiser; clarification and review outcomes notify the organiser; initial assignment notifies the organiser and new coordinator; handover additionally sends a minimal notice to the previous coordinator; venue decisions notify the organiser, current coordinator if assigned, and deciding Venue Staff. Same-coordinator reassignment creates no notice. Delivery is an in-app inbox and unread counter, not email or push delivery. Migration 008 must be applied through the coordinated rollout before deploying these routes and writers. The integrated venue queries additionally require migration 009.

**KAN-26 equipment notification extension — 26 October 2026:** migration 015 adds an optional equipment-request target. `EQUIPMENT_RESERVED` notifies the assigned coordinator and acting Technical Support user in the reservation transaction, deduplicated by recipient/request. A Technical Support recipient can read only their own linked equipment acknowledgement without generic event/booking details. Its link is `/equipment/availability/:id` while eligible; after the event closes, `link`, `event` and `booking` are null and the message explains the closed planning state. A coordinator's current-assignee access is still rechecked after handover. Notices with no target require all three event, booking and equipment-request links to be null. This completes only the equipment-reserved slice of KAN-80; other equipment/lifecycle triggers are pending.


**KAN-81 staff stale-write handling — 21 October 2026.** A 404/409 refusal of block creation/removal keeps the server error and entered values but refreshes both the selected venue's blocks and cross-venue recovery list. It is still a definite refused write; it is not described as uncertain. Network/5xx/unreadable outcomes also refresh, with uncertain-result wording. Neither branch retries a mutation automatically. Component regressions: TC-09-17.

## KAN-78 integrated buffer-save reporting — 21 October 2026

The KAN-77 editor is now present from main. On a successful buffer-field PATCH, the catalogue response adds optional `venue.affectedBookings: { id: string, warnings: string[] }[]`, evaluated in the same venue-locked transaction. The editor displays these warnings with booking-detail links. This reports affected arrangements without cancelling or moving them. Existing field-aware stale checks remain unchanged. Earlier KAN-77 pending-editor notes describe the pre-integration branch. Schema source is now shared migration 009 plus extension 010, not the superseded private 008.

## KAN-78 and KAN-34 current integrated contract — 25 October 2026

This current readback supersedes the private migration 008, extension 010 and pending-editor statements in the dated KAN-78 sections above; their original branch context is retained. KAN-77 migration **009** owns venue duration columns and field-aware stale edits. KAN-78 migration **012** owns approval snapshots, `venue_occupied_start/end`, `venue_interval_within_hours`, `venue_booking_intervals` and `venue_booking_warnings`. Migration **013** subsequently extends the view/guard with KAN-83 hold fields and live occupancy.

Search, calendar, suitability, request submission and approval use `[event start - setup, event end + turnaround)`. Exact occupied adjacency is allowed. Approved bookings and unexpired holds block new overlapping reservations; pending/rejected/cancelled/expired rows do not. A writer rechecks the database clock, current durations, hours, occupied bookings and blocks after taking the venue lock; an expired hold cannot keep blocking because a writer waited. Ended/completed historical rows use approval snapshots. Existing approved-booking warnings cover other approved reservations, operational blocks and hours; warning calculation does not currently report a live hold as an overlap.

The venue catalogue PATCH response may include `venue.affectedBookings: { id, warnings }[]`, computed in the buffer-save transaction. Staff booking lists include pending requests, live holds and approved bookings with warnings other than an outage-only `OPERATIONAL_BLOCK_OVERLAP`. KAN-81 recovery handles those outage cases. A later outage overlapping an approved buffered interval is saved and flags recovery; new conflicting booking/approval attempts remain refused. Existing reservations are never silently moved or cancelled by buffer edits. Known hosted display gap: affected-booking links show a raw warning code without an event name; no fix is claimed.

KAN-34 retains the real-calendar/explicit-offset validation on all four draft date fields, PATCH omission/nullable-clear semantics, Draft state and ownership restrictions. Its registration-toggle/save/reopen browser test uses substituted API responses; separate PostgreSQL tests verify persisted values and direct HTTP guards. [Evidence and exact-case boundaries](../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) do not establish complete hosted S3-T06/S3-T19 acceptance or a fresh Jira state.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

KAN-51 PR #28 synchronized client route/history and selected venue and added spoofed-role API denial regressions. Client route guards do not replace server authorization. KAN-81 PR #47 corrections refresh both views after stale 404/409 write refusals without automatically retrying the refused write. These are historical implementation provenance notes; current endpoint shapes and error contracts above remain authoritative.


## Equipment availability (KAN-9, CF-16)

**Implemented 26 October 2026.** Mounted through the runtime's verified `workspace` session. Only Technical Support Staff (`TS`, `TECHNICAL_SUPPORT_STAFF`) can use these routes, including direct service entry points. Event eligibility is `APPROVED` or `CONFIRMED`, independent of venue confirmation. All responses set `Cache-Control: no-store`. This narrow context does not grant access to `/api/events/:id` or expose event owners, other-event identities, attendee details or reservation records belonging to others.

| Method / route | Success | Errors |
| --- | --- | --- |
| `GET /api/equipment/availability/events` | `200 { items: EquipmentEventSummary[] }`, ordered by event start (null last), then ID | `401 AUTHENTICATION_REQUIRED`; `403 ACTION_FORBIDDEN` |
| `GET /api/equipment/availability/events/:id` | `200 EquipmentAvailabilityContext` | Same role errors; `400 INVALID_EVENT_REQUEST_ID`; `404 EVENT_REQUEST_NOT_FOUND` for absent/ineligible events |
| `POST /api/equipment/availability/events/:id` | `200 { assessment: EquipmentAvailabilityAssessment }`; advisory read only | Same role/ID/event errors; `400 INVALID_EQUIPMENT_AVAILABILITY_INPUT`, `EQUIPMENT_REQUIREMENTS_EMPTY`, `EQUIPMENT_TYPE_NOT_FOUND`; `409 EQUIPMENT_CONTEXT_CHANGED`, `EQUIPMENT_REQUEST_PERIOD_MISMATCH` |

`EquipmentEventSummary` is `{ id, name, status, startsAt, endsAt }`, with nullable name/times and status `APPROVED | CONFIRMED`. The context is `{ event, requirementsVersion, equipmentTypes, savedRequests }`. `event` adds nullable `equipmentRequirements`. Each type contains `{ id, name, category, totalQuantity, damagedQuantity, maintenanceQuantity, isActive }`; the context includes active types and inactive types referenced by a saved non-cancelled line. Each saved line contains `{ id, equipmentTypeId, quantity, status, startsAt, endsAt, notes }`, with status `REQUESTED | RESERVED | REJECTED`. Cancelled lines are omitted. Requirements text is displayed for interpretation, not automatically converted into stock quantities.

The `requirementsVersion` is a SHA-256 hash of current source event and saved-line values, ordered by saved ID. It includes quantity, status, period and text rather than trusting `updated_at`. POST reloads these values and rejects a stale version before assessing. The caller refreshes context and explicitly checks again. Current stock and competing reservations are read afresh; they are not frozen by the version.

Saved input:

```json
{ "mode": "saved", "requirementsVersion": "<64 lowercase hex characters from context>" }
```

The server aggregates all non-cancelled saved lines by type. Each saved line must exactly match the current event window; a mismatch returns a conflict rather than silently moving the reservation. Empty saved requirements return `EQUIPMENT_REQUIREMENTS_EMPTY`. Only the exact server-loaded `RESERVED` line IDs being assessed are excluded from competing demand, preventing self-double-counting. Rejected/requested lines remain requirements without being counted as existing reservations.

Unsaved what-if input:

```json
{
  "mode": "what-if",
  "requirementsVersion": "<64 lowercase hex characters from context>",
  "startsAt": "2031-01-12T10:00:00+08:00",
  "endsAt": "2031-01-12T14:00:00+08:00",
  "items": [{ "equipmentTypeId": "09000000-0000-4000-8000-000000000001", "quantity": 3 }]
}
```

What-if mode checks exactly the explicit window/items and counts every overlapping reservation, including those already reserved for the same event. It neither replaces saved requirements nor claims they were fulfilled. Unknown fields, caller exclusion lists, unknown equipment, empty items and nonpositive/noninteger quantities are refused. Duplicate types aggregate; each quantity and aggregate must fit `1..2147483647`. Dates require a real calendar date/time and explicit `Z` or `±HH:MM`, with at most six fractional digits; end must be strictly after start. Calculation preserves database microseconds. API input supports UTC years 0001–9999; UI fields use Singapore time.

Each item result is `{ equipmentTypeId, equipmentTypeName, requestedQuantity, totalQuantity, damagedQuantity, maintenanceQuantity, operationalQuantity, peakReservedQuantity, availableQuantity, shortfallQuantity, isActive }`. Active operational stock is total minus damaged and maintenance quantities; inactive stock is zero. Peak demand uses only simultaneously overlapping `RESERVED` quantities in the half-open interval `[start, end)`. Exact adjacency is allowed; disjoint bookings do not accumulate as concurrent demand. Available stock is `max(0, operational - peakReserved)` and shortfall is `max(0, requested - available)`. Selected equipment deactivated after context loading remains a zero-operational shortfall rather than disappearing from the assessment.

`assessment` also contains `{ eventId, eventName, mode, startsAt, endsAt, checkedAt, advisory: true, outcome, items }`, with outcome `FULFILLABLE` only when all requested items have zero shortfall, otherwise `SHORTFALL`. The UI displays a green confirmation or **Shortfall / Unfulfillable** with specific item deficits. The SQL statement snapshot includes event requirements, saved lines, stock and reservations together. No check writes requests, reservations, event status, history or notifications. A later reservation must perform its own live check under lock; results are not booking guarantees.

**Setup and dependencies:** migration 014 adds the two loss quantities. Migration 015 separately replaces the historical total-capacity reservation guard with operational-capacity protection for KAN-26 below; neither changes the read-only KAN-9 contract. Migration 014/account setup is reported complete; shared 015 application and manual integrated acceptance are **Not executed**. KAN-18 stock maintenance and KAN-63 request creation/editing/review remain pending. Technical source/test paths and verification boundaries are in the [equipment module](../../backend/src/modules/equipment/README.md) and [test evidence](../testing/test-evidence.md).

## Equipment reservations (KAN-26, CF-17)

**Implemented 26 October 2026.** All routes use the verified Technical Support session and `Cache-Control: no-store`. Reads expose minimal `APPROVED`/`CONFIRMED` event context; writes require `APPROVED`. Venue confirmation is not a precondition. Missing/ineligible read targets share `404 EVENT_REQUEST_NOT_FOUND`, and no route grants general event-detail access.

| Route | Request / response |
| --- | --- |
| `GET /api/equipment/reservations/events/:id` | `200 EquipmentReservationContext` |
| `POST /api/equipment/reservations/events/:id/requests/:requestId/reserve` | `{ requirementsVersion }` → `200 { changed: boolean, context: EquipmentReservationContext }` |
| `POST /api/equipment/reservations/events/:id/requests/:requestId/cancel` | `{ requirementsVersion, reason }` → same result; trimmed reason must contain 1–2,000 characters |

The version is the 64-character lowercase SHA-256 source version also used by KAN-9. Unknown fields, missing/malformed version and invalid reason fail with `400 INVALID_EQUIPMENT_RESERVATION_INPUT`. Event/request route UUID errors are `400 INVALID_EVENT_REQUEST_ID` / `INVALID_EQUIPMENT_REQUEST_ID`. Missing session returns `401 AUTHENTICATION_REQUIRED`; wrong or revoked role returns `403 ACTION_FORBIDDEN`; a missing line on the named event returns `404 EQUIPMENT_REQUEST_NOT_FOUND`.

`EquipmentReservationContext` contains:

- `event`: `{ id, name, status, startsAt, endsAt, equipmentRequirements }`, matching the minimal availability event.
- `requirementsVersion`: hashes actual current event and non-cancelled saved-line values; it does not rely on `updated_at` and does not cache stock.
- `requests`: every saved line, including retained cancelled history: `{ id, equipmentTypeId, equipmentName, quantity, status, startsAt, endsAt, notes, decidedBy, decidedAt, decisionReason, releasedBy, releasedAt, releaseReason, releaseCause, canReserve, canCancel }`. Status is `REQUESTED`, `RESERVED`, `REJECTED` or `CANCELLED`; nullable release cause is `MANUAL_CANCELLATION`, `EVENT_CANCELLED` or `EVENT_COMPLETED`. Timestamps preserve PostgreSQL microseconds in UTC. Action flags are presentation guidance; the server rechecks every mutation.
- `readiness`: `{ status, activeCount, reservedCount, message }`. Zero non-cancelled lines produces `NO_REQUIREMENTS`, not Not Required/ready. Invalid/mismatched periods or invalid aggregate quantities produce `INVALID_REQUIREMENTS`. Current stock shortfall produces `SHORTFALL`, including after a previously successful reservation. Otherwise any active line not reserved produces `PENDING`; only every active line reserved and still fulfilable produces `READY`. Rejected/requested rows remain active demand; cancelled rows do not.

Reserve changes one full saved `REQUESTED` line to `RESERVED` with the current actor/time. Quantity/type/period come only from the saved row, never a what-if body. A positive whole quantity, exact current event period and assigned profile with current `EVENT_COORDINATOR` role are required. Cancel changes an existing `RESERVED` line to `CANCELLED`, recording release actor/time/reason/cause while preserving its original allocation and decision. Partial reservations, request creation, rejection, quantity/time editing and stock changes are not exposed here. `CONFIRMED` events are read-only, including idempotent write attempts.

Conflicts return `409` with one of: `EQUIPMENT_EVENT_NOT_APPROVED`, `EQUIPMENT_CONTEXT_CHANGED`, `EQUIPMENT_REQUEST_NOT_RESERVABLE`, `EQUIPMENT_REQUEST_NOT_CANCELLABLE`, `EQUIPMENT_REQUEST_PERIOD_MISMATCH`, `EQUIPMENT_COORDINATOR_REQUIRED`, `EQUIPMENT_STOCK_CONFLICT`. The UI discards stale confirmation, reloads context and requires a new action; it never automatically repeats a mutation. A network failure may have followed a committed write, so refreshed saved state is authoritative.

Within one transaction, the service rechecks/locks the trusted Technical Support profile, then locks event → assigned coordinator profile (reserve only) → sorted equipment pools → sorted saved lines. The recipient profile must still have role `EVENT_COORDINATOR` for a new reservation. It reads current operational stock and half-open simultaneous reserved demand after the locks; there is no cached-advisory bypass. A conflict has no partial write. Both mutations return refreshed context. An already-applied action returns `changed: false` only with the current version or the exact reconstructed pre-action version; cancellation also requires the same recorded reason. Unrelated source changes still conflict. Repeats preserve original times/history and create no additional stock or notifications.

Successful reserve writes `EQUIPMENT_RESERVED` in the same transaction for the current coordinator and acting Technical Support user, keyed per recipient and saved-request ID. Notification persistence failure rolls back reservation. Technical Support's inbox target is `/equipment/availability/:id` while the event remains eligible, with no general `event`/`booking` DTO; after a terminal transition the acknowledgement has no link and explains that equipment planning is closed. This is the KAN-80 equipment-reserved slice only; cancellation/release and other lifecycle notification triggers remain separate.

Migration 015 adds release-history fields and `notifications.equipment_request_id`, independently guards new SQL reservations against operational overbooking, and releases live reservations once when event status changes to cancelled/completed. It retains original allocation/decision/release history and never increments a stock counter. KAN-62/KAN-10 lifecycle APIs are pending; KAN-63 owns saved request creation/editing and KAN-18 stock maintenance. Shared migration application and connected manual acceptance are **Not executed**.

## KAN-66 planning edits and revisions — 26 October 2026

`PATCH /api/events/:id` now serves owner drafts (KAN-34, unchanged), owner edits before approval and assigned-coordinator ordinary edits after approval. Roles `EVENT_ORGANISER` and `EVENT_COORDINATOR` reach the service; other roles still receive `403 DRAFT_EDIT_FORBIDDEN`. The body is any subset of the editable fields plus `expectedRevision` (a positive whole number). Fields the caller may not change are refused server-side regardless of the client.

| Status | Who may edit directly | Fields | Revision | Extra validation |
| --- | --- | --- | --- | --- |
| `DRAFT` | Owning organiser | All editable fields | Optional; checked if sent | KAN-34 draft rules |
| `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED` | Owning organiser | All editable fields | Required | Merged request must pass submission validation |
| `APPROVED`, `CONFIRMED` | Assigned coordinator | `name`, `description` | Required | Merged request must pass submission validation |
| `REJECTED`, `CANCELLED`, `COMPLETED` | Nobody | — | — | — |

Success returns `200` with the flat event record including `revision`. A save whose values equal the stored ones (dates compared as instants) returns the current record without a new revision or audit row. Each non-draft change writes one `event_request_edits` row in the same transaction; status and coordinator are never changed by an edit.

| Error | When |
| --- | --- |
| `400 INVALID_DRAFT_UPDATE` | Body is not an object, has no editable field, contains an unknown or server-owned field (`status`, `coordinatorId`, `organiserId`, `revision`, ...) or a malformed value |
| `400 EXPECTED_REVISION_REQUIRED` / `400 INVALID_INPUT` | Non-draft edit without `expectedRevision`, or a malformed one |
| `400 SUBMISSION_INCOMPLETE` / `400 SUBMISSION_INVALID` | A non-draft edit would leave a required field empty or an invalid date order; same body shape as submission (`missingFields`, `fieldErrors`) |
| `403 EDIT_ROLE_NOT_PERMITTED` | Related user at the wrong stage: the coordinator before approval, or the organiser editing name/description after approval |
| `404 EVENT_REQUEST_NOT_FOUND` | Missing request, unrelated organiser or coordinator, or a coordinator addressing a draft |
| `409 SIGNIFICANT_CHANGE_REQUIRED` | Significant field after approval; `fields` lists the refused fields. Use the KAN-15 change-request workflow |
| `409 EVENT_REVISION_CONFLICT` | `expectedRevision` differs from the current revision; nothing is written |
| `409 EVENT_NOT_EDITABLE` | Rejected, cancelled or completed event |

Significant fields (KAN-15-AC102): `purpose`, `startsAt`, `endsAt`, `expectedAttendance`, `venueRequirements`, `accessibilityNeeds`, `equipmentRequirements`, `registrationRequired`, `registrationCapacity`, `registrationOpensAt`, `registrationClosesAt`.

`GET /api/events/:id` additionally returns `revision` and three actions: `canEditDetails` (a non-draft direct edit is available to this viewer), `editMode` (`DRAFT`, `PRE_APPROVAL`, `PLANNING` or `null`) and `editableFields`. They advise the interface; the PATCH rechecks everything under the row lock.

**Reviewer actions.** `POST /api/events/:id/start-review`, `POST /api/events/:id/clarifications` and `POST /api/events/:id/reviews` accept an optional `expectedRevision`. When it is sent and differs from the locked row, the action returns `409 EVENT_REVISION_CONFLICT` and records nothing. Requests without it behave as before. The coordinator review page sends the revision it displayed. The revision advances on every update of the event row, including status and assignment changes.

**Frontend route.** `/events/:id/details` (`EventDetailsEditPage.vue`) loads the detail response, shows only `editableFields` and sends changed fields with `expectedRevision`. Organisers reach it from **Edit details** on `/events/:id`; assigned coordinators from **Edit name or description** on `/reviews/:id`.

Database: [migration 016](../database-diagram.md#26-october-2026--migration-016-event-revisions-kan-66) (numbered 014 until 27 October). Decisions: [D1–D4](../requirements/assumptions-and-questions.md#26-october-2026--kan-66-planning-edit-implementation-decisions).

## KAN-15 change requests — 27 October 2026

Nested under the event request; all responses `Cache-Control: no-store`. Roles outside the listed ones receive `403 ACTION_FORBIDDEN` before any read; unrelated organisers and coordinators receive `404 EVENT_REQUEST_NOT_FOUND`.

| Method and path | Roles | Body | Success |
| --- | --- | --- | --- |
| `GET /api/events/:id/change-requests` | Owner, assigned coordinator | — | `200 { items }`, newest first |
| `POST /api/events/:id/change-requests` | Owner | `{ changes: { <significantField>: value }, expectedRevision }` | `201` change request |
| `POST /api/events/:id/change-requests/:changeRequestId/decision` | Assigned coordinator | `{ decision: "APPROVED" or "REJECTED", reason?, expectedRevision }` | `200` change request |
| `POST /api/events/:id/change-requests/:changeRequestId/withdraw` | Owner | `{}` or no body | `200` change request |

A change request has `id`, `eventRequestId`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`), `requestedById/Name`, `proposed` and `previous` (field to value, dates as UTC ISO strings), `baseRevision`, `decidedById/Name`, `decidedAt`, `decisionReason`, `appliedRevision`, `cancelledArrangements` (`{ venueBookings, equipmentRequests }` ids) and `createdAt`. A `PENDING` item also has `current` (the event's present values for the proposed fields), `outdated` and `impact`: `affectedKinds`, `confirmed` and `pending` arrangements (`kind`, `id`, `label`, `status`, `quantity`), `activeRegistrations`, `eventConfirmed`, `canApprove`, `blockedReason`.

Significant fields are the KAN-66 list (`purpose`, `startsAt`, `endsAt`, `expectedAttendance`, `venueRequirements`, `accessibilityNeeds`, `equipmentRequirements`, `registrationRequired`, `registrationCapacity`, `registrationOpensAt`, `registrationClosesAt`). Only fields that differ from the event are stored.

| Error | When |
| --- | --- |
| `400 INVALID_INPUT` / `EXPECTED_REVISION_REQUIRED` | Malformed body or value, unknown key, missing `expectedRevision` |
| `400 CHANGE_REQUEST_FIELD_NOT_ALLOWED` | `name` or `description` (use KAN-66) or any non-significant field |
| `400 CHANGE_REQUEST_EMPTY` | Every value equals the current event |
| `400 CHANGE_REQUEST_INVALID` | The event would fail submission validation after the change |
| `400 REJECTION_REASON_REQUIRED` | Rejection without a non-blank reason |
| `403 ACTION_FORBIDDEN` | Coordinator submitting or withdrawing; owner deciding |
| `404 CHANGE_REQUEST_NOT_FOUND` | Unknown change request for this event |
| `409 CHANGE_REQUEST_NOT_ALLOWED` | Submission for an event that is not `APPROVED` or `CONFIRMED` |
| `409 CHANGE_REQUEST_ALREADY_PENDING` | The event already has a pending request |
| `409 EVENT_REVISION_CONFLICT` | `expectedRevision` is not the event's current revision |
| `409 CHANGE_REQUEST_NOT_PENDING` | Deciding or withdrawing a decided or withdrawn request |
| `409 CHANGE_REQUEST_OUTDATED` | A proposed field changed after submission; reject and ask for a new request |
| `409 CANCEL_AND_RESUBMIT_REQUIRED` | Approval would affect a confirmed arrangement, a confirmed event or active registrations |
| `409 CHANGE_REQUEST_EVENT_NOT_PLANNING` | Approving after the event left `APPROVED`/`CONFIRMED` |
| `409 CHANGE_REQUEST_BUSY` | A concurrent writer deadlocked; nothing saved, retry |

Approval applies the values, writes an `event_request_edits` row (editor role `EVENT_COORDINATOR`), cancels affected pending venue bookings (`cancelled_by/at/reason`) and `REQUESTED` equipment lines, records the decision and notifies the organiser, all in one transaction. Rejection and withdrawal change nothing on the event. Decisions: [D1–D8](../requirements/assumptions-and-questions.md#27-october-2026--kan-15-change-request-implementation-decisions). Database: [migration 017](../database-diagram.md#27-october-2026--migration-017-change-requests-kan-15).

## KAN-62 / KAN-63 lifecycle and equipment request APIs — 27 October 2026

The following routes are mounted in the current backend when its verified workflow session is
available:

| Route | Contract |
| --- | --- |
| `POST /api/events/:id/cancel` | `{ reason, confirmAffectedArrangements: true }` → `{ cancellation }`; owner/current coordinator and eligible status required. The trimmed reason is required (1–2,000 characters). |
| `GET /api/events/:id/cancellation` | `{ cancellation }` for the owning organiser/current coordinator; returns null when no saved outcome is visible. |
| `GET /api/events/:id/equipment-requests` | `{ plan }` for the assigned coordinator or Technical Support Staff. |
| `GET /api/equipment-types` | Active equipment types for coordinators and Technical Support Staff. |
| `POST /api/events/:id/equipment-requests` | `{ lines, notRequired? }` → `{ request }`; assigned coordinator of an APPROVED event only. |
| `GET /api/equipment-requests` | Staff review queue or coordinator-scoped saved lines. |
| `POST /api/equipment-requests/:id/review` | `{ decision: "RESERVED" | "REJECTED", reason?, revision? }`; Technical Support Staff only; full reservation is availability-checked by migration 015's database trigger. |
| `POST /api/equipment-requests/:id/replace` | `{ revision, replacement }`; assigned coordinator explicitly cancels a reserved line and creates one REQUESTED replacement. |
| `POST /api/equipment-requests/:id/cancel` | `{ reason }`; assigned coordinator can cancel a REQUESTED or REJECTED line. |

Migration 018 adds cancellation/audit, registration-outcome and equipment-planning fields without
adding equipment cancellation columns. A transition to event status `CANCELLED` activates
migration 015's release trigger for RESERVED rows. The cancellation service records release audit
metadata for remaining REQUESTED/REJECTED rows, then persists the event cancellation audit and
notifications in the same transaction. Database integration and connected local acceptance are
**Not executed** in the 27 October follow-up.

## KAN-62 / KAN-63 review corrections — 28 October 2026

This current contract supersedes the 27 October request shapes above. Every equipment mutation requires a 64-character lowercase hexadecimal **opaque `revision`**, copied from the latest `plan.revision` or queue line. Missing/malformed versions fail validation; stale versions return `409 STALE_EQUIPMENT_REQUEST` without writes. The version covers event revision/status/assignment/period/requirements and all line values/decision/release audit, including changes made through KAN-26. It is not the integer database column.

| Action | Current body / response |
| --- | --- |
| Read event equipment | `{ plan: { eventRequestId, eventStatus, eventStartsAt, eventEndsAt, status, revision, items } }`; all line versions match the plan snapshot |
| Save requested lines | `{ lines, notRequired?, revision }`; assigned coordinator, APPROVED only; each line has equipmentTypeId, positive integer quantity, exact event startsAt/endsAt and optional technicalRequirements |
| Staff review | `{ decision: "RESERVED" or "REJECTED", reason?, revision }`; rejection requires a reason; reservation uses shared KAN-26 writer and rechecks full operational capacity transactionally |
| Replace reservation | `{ replacement, revision }`; cancels the existing RESERVED line and creates a new REQUESTED line, retaining original decision/release audit; staff must review it again |
| Cancel pending/rejected line | `{ reason, revision }`; assigned coordinator; RESERVED lines use explicit replacement or KAN-26's audited cancellation |

Reads allow assigned coordinators and Technical Support for APPROVED/CONFIRMED events; writes require APPROVED. Not Required is explicit and needs no active lines. API dates preserve the event's microseconds; invalid/duplicate types, quantities, dates and off-event periods are rejected. Notes are mirrored for KAN-9/KAN-26 consumers. After conflict/uncertain failure the UI refreshes before a deliberate retry, never resubmits automatically.

Event cancellation revalidates actor role and ownership. It locks venue gates and known bookings before the event, then sorted equipment pools/lines. A booking added after the prelock snapshot returns `409 EVENT_ARRANGEMENTS_CHANGED`; refresh and retry explicitly. The audit counts RESERVED lines released by migration 015 as well as pending/rejected lines. Resource release, audit/history and notices commit or roll back together; replay makes no duplicate release or notice.

An affected attendee's inbox may return EVENT_CANCELLED only for that recipient's cancelled registration and event. The response uses a generic cancellation message and null protected event/booking links, excluding internal reasons even if stored in a notice. Attendees still cannot fetch protected event/cancellation details.

KAN-15 approval uses the same venue prelock check. A timing/equipment change resets `equipment_plan_status` to REQUIRED and cancels affected REQUESTED lines with released_by/at/reason/cause and incremented revision. Purpose-only changes and rejected requests preserve Not Required. The existing `expectedRevision` and confirmed-arrangement refusal remain in force.

## Event completion (KAN-10, CF-06) — 29 October 2026

| Route | Result and errors |
| --- | --- |
| `POST /api/events/:id/complete` | Event Coordinator only. No body. `200 { completion }` with `eventRequestId`, `status: "COMPLETED"`, `completedById`, `completedByName`, `completedAt` (from the status history) and `releasedEquipmentRequests`. `400 INVALID_EVENT_REQUEST_ID`; `401`; `403` for any other role; `404 EVENT_REQUEST_NOT_FOUND` for a missing event, a draft, an event not assigned to the caller or a role no longer held; `409 EVENT_NOT_COMPLETABLE` (not CONFIRMED), `409 EVENT_ALREADY_COMPLETED`, `409 EVENT_NOT_ENDED` (the database clock is before `endsAt`), `409 EVENT_ARRANGEMENTS_CHANGED` (a venue booking appeared while the action was prepared) |
| `GET /api/events/:id/completion` | Organiser who owns the event or its assigned coordinator. `200 { completion }`, or `{ completion: null }` when the event is not completed or the caller is unrelated |

One transaction locks venue bookings, the event, the equipment pools and lines in the same order as cancellation, records COMPLETED (the status trigger writes the history row with actor and time and releases still-reserved equipment once), and writes one `EVENT_COMPLETED` notice to the organiser and the coordinator. Registrations and venue bookings are not changed. The rules are **To agree** in the [decision log](../requirements/assumptions-and-questions.md#29-october-2026--kan-10-completing-an-event-rules-and-notices). Verification: `backend/test/events/completion*.test.ts`, `database/tests/events/completion.integration.test.ts`, `frontend/src/features/events/components/EventCompletionPanel.test.ts` and `tests/e2e/event-completion.spec.ts`; see AUTO-20261029-KAN10-01 in the [test evidence](../testing/test-evidence.md#29-october-2026--kan-10-mark-event-as-completed).

## KAN-82 independent venue arrangements — 28 October 2026

`Cache-Control: no-store`, as on the other venue booking routes. No migration; see decisions [D1–D8](../requirements/assumptions-and-questions.md#28-october-2026--kan-82-independent-venue-arrangement-decisions).

| Method and path | Roles | Body | Success |
| --- | --- | --- | --- |
| `POST /api/venue-bookings/:id/cancel` | Event's current assigned coordinator | `{ "reason": "Moving to a smaller room" }` (trimmed, nonempty, at most 2,000 characters; no other fields) | `200 { booking: VenueBooking }` with status `CANCELLED` and `cancelledBy/At/Reason` |
| `POST /api/events/:id/venue-bookings` | Assigned coordinator (unchanged) | `replacesBookingId` may now also name an explicitly cancelled booking of the same event | `201 { booking }`, `PENDING` |

Cancellation refusals: `401 AUTHENTICATION_REQUIRED`; `403 ACTION_FORBIDDEN` for other roles; `400 INVALID_VENUE_BOOKING_ID` or `INVALID_INPUT`; `404 VENUE_BOOKING_NOT_FOUND` for an unknown booking or a coordinator who is not currently assigned; `409 BOOKING_ALREADY_CANCELLED`; `409 HOLD_EXPIRED`; `409 ARRANGEMENT_NOT_CANCELLABLE` when the booking is not pending, live held or approved or the event is not `APPROVED`/`CONFIRMED`. Only that booking changes; open outage-recovery flags on it become `RESOLVED`.

Replacement of a cancelled arrangement: `409 REPLACEMENT_IN_PROGRESS` while another replacement of it is pending, live held or approved; approval returns `409 REPLACEMENT_NOT_NEEDED` if another replacement already holds the venue. Approving it leaves the original `CANCELLED`. KAN-81 recovery replacements are unchanged.

Every `VenueBooking` response now includes `replacedByBookingIds` (ids of bookings whose `replacesBookingId` is this booking, earliest first). New notification types: `VENUE_ARRANGEMENT_CANCELLED` and `VENUE_REPLACEMENT_REQUESTED`, to the current coordinator and every Venue Staff account, linked to the booking.

## Attendee registration (KAN-14, CF-18) — 29 October 2026

Mounted at `/api/attendee`. Every route is limited to signed-in attendees (`403 ACTION_FORBIDDEN` for any other role, `401 AUTHENTICATION_REQUIRED` signed out), is scoped to the caller and sets `Cache-Control: no-store`. No route names another attendee.

| Route | Result and errors |
| --- | --- |
| `GET /api/attendee/events` | `200 { items }`: CONFIRMED events that take registrations and have not started, by start time, at most 100. Each item: `id`, `name`, `startsAt`, `endsAt`, `registration` (`required`, `opensAt`, `closesAt`, `capacity`, `placesRemaining`), `ownStatus` and `availability` |
| `GET /api/attendee/registrations` | `200 { items }`: the caller's own registrations (`id`, `status` REGISTERED, WITHDRAWN or CANCELLED, `registeredAt`, `withdrawnAt`, `event`) |
| `GET /api/attendee/events/:id` | `200 { event, registration, availability }`. `event`: `id`, `name`, `purpose`, `description`, `startsAt`, `endsAt`, `accessibilityNeeds`, `status`, `venues` (approved bookings: `name`, `location`, `startsAt`, `endsAt`) and `registration`. `registration`: the caller's own record or null. `availability`: `canRegister`, `reason` (`ALREADY_REGISTERED`, `NOT_CONFIRMED`, `REGISTRATION_DISABLED`, `EVENT_STARTED`, `CLOSED`, `NOT_YET_OPEN`, `FULL` or null), `message`, `placesRemaining`. `400 INVALID_EVENT_ID`; `404 EVENT_NOT_FOUND` for a missing event, or one that is not CONFIRMED and has no registration of the caller's |
| `POST /api/attendee/events/:id/register` | `201 { event, registration, availability, changed: true }`. The body must be empty (`400 INVALID_INPUT` if it names anything). `409` with one of `REGISTRATION_ALREADY_REGISTERED`, `REGISTRATION_EVENT_NOT_OPEN`, `REGISTRATION_DISABLED`, `REGISTRATION_EVENT_STARTED`, `REGISTRATION_CLOSED`, `REGISTRATION_NOT_OPEN`, `REGISTRATION_FULL`; `404 EVENT_NOT_FOUND`. Nothing is written for any refusal |

One transaction locks the event, reads the counts and the caller's record afresh, inserts the registration (or reuses a WITHDRAWN record). The service writes no notice: migration 019's `notify_registration_outcome` trigger records one `REGISTRATION_CONFIRMED` each for the attendee, organiser and assigned coordinator in the same transaction, keyed by the registration's `outcome_version`, so a re-registration after withdrawal is a new outcome and a refused attempt adds nothing. The inbox link for the attendee is main's `/registrations?registration=<id>`. The rules are **To agree** in the [decision log](../requirements/assumptions-and-questions.md#29-october-2026--kan-14-attendee-registration-rules-and-what-attendees-may-see). Verification: `backend/test/registrations/`, `database/tests/registrations/registration.integration.test.ts`, `frontend/src/features/registrations/` and `tests/e2e/attendee-registration.spec.ts`; see AUTO-20261029-KAN14-01 in the [test evidence](../testing/test-evidence.md#29-october-2026--kan-14-register-for-an-event).

## Equipment stock (KAN-18, CF-16) — 29 October 2026

Mounted at `/api/equipment/stock`. Every route is limited to Technical Support Staff (`403 ACTION_FORBIDDEN` for any other role, `401 AUTHENTICATION_REQUIRED` signed out) and sets `Cache-Control: no-store`. Operational quantity is `total - damaged - maintenance`, or 0 for an inactive type, the same figure the availability and reservation checks use.

| Route | Result and errors |
| --- | --- |
| `GET /api/equipment/stock` | `200 { items }`, by name. Each item: `id`, `name`, `category`, `isActive`, `totalQuantity`, `damagedQuantity`, `maintenanceQuantity`, `operationalQuantity`, `unavailableQuantity`, `status` (`AVAILABLE`, `PARTLY_UNAVAILABLE`, `UNAVAILABLE`), `revision`, `shortfallEventCount`, `updatedAt` |
| `GET /api/equipment/stock/:id` | `200 { item, history, shortfalls }`. `history`: the latest 20 changes (`id`, `revision`, `changedById`, `changedByName`, `changedAt`, `reason`, `previous`, `next`). `shortfalls`: events whose reservations exceed operational stock (`eventId`, `eventName`, `startsAt`, `endsAt`, `reservedQuantity`, `peakReservedQuantity`, `operationalQuantity`, `shortfallQuantity`). `400 INVALID_EQUIPMENT_TYPE_ID`; `404 EQUIPMENT_TYPE_NOT_FOUND` |
| `PATCH /api/equipment/stock/:id` | Body `{ expectedRevision, totalQuantity?, damagedQuantity?, maintenanceQuantity?, reason }` with at least one quantity. `200 { item, history, shortfalls, changed, notifiedEvents }`. `changed:false` when the quantities already match or the same committed change is retried. `400 INVALID_EQUIPMENT_STOCK_INPUT` (quantity not a whole number from 0 to 1,000,000, damaged plus maintenance above the total, reason missing or over 500 characters, unknown field), `400 EXPECTED_REVISION_REQUIRED`, `404 EQUIPMENT_TYPE_NOT_FOUND`, `409 EQUIPMENT_STOCK_REVISION_CONFLICT` (stale form), `409 EQUIPMENT_STOCK_BUSY` (reservations kept changing; try again) |

A successful change locks the events that hold a reservation of the type (in id order), then the equipment type, saves the quantities, raises `revision` and appends an immutable history row, all in one transaction. The service writes no notice: when the operational quantity falls, migration 019's `notify_equipment_shortfall` trigger records one `EQUIPMENT_UNAVAILABLE` notice per affected event for its coordinator, the deciding Technical Support user and the acting user, and `notifiedEvents` counts those events. If reservations keep changing during the locking it answers `409 EQUIPMENT_STOCK_BUSY`. Existing reservations are never changed. The shortfall and notice rules were agreed by Ernest and Arvin on 29 October 2026 in the [decision log](../requirements/assumptions-and-questions.md#29-october-2026--kan-18-stock-maintenance-shortfall-and-notice-rules). Verification: `backend/test/equipment/stock-*.test.ts`, `database/tests/equipment/stock.integration.test.ts`, `frontend/src/features/equipment/pages/EquipmentStockPage.test.ts` and `tests/e2e/equipment-stock.spec.ts`; see AUTO-20261029-KAN18-02 (and the earlier isolated-branch AUTO-20261029-KAN18-01) in the [test evidence](../testing/test-evidence.md#29-october-2026--kan-18-equipment-stock-and-operational-status).

## 29 October 2026 — KAN-61 event confirmation

Both endpoints require the verified application session and set `Cache-Control: no-store`. No migration is needed.

| Method / route | Actor | Result |
| --- | --- | --- |
| `GET /api/events/:id/confirmation` | Owning organiser or currently assigned coordinator | `{ eventRequestId, status, started, canConfirm, readiness, confirmation }`. `readiness` is `{ ready, checks: [{ key: "VENUE" \| "EQUIPMENT" \| "CHANGE_REQUEST", ready, message }] }` for an APPROVED event and `null` otherwise. `confirmation` is `{ confirmedBy, confirmedByName, confirmedAt }` from the latest CONFIRMED status-history row, or `null`. `canConfirm` is true only for the assigned coordinator of a ready, not-yet-started APPROVED event. |
| `POST /api/events/:id/confirm` | Currently assigned coordinator | Body `{}` (or none). Returns `{ confirmation: { eventRequestId, status: "CONFIRMED", changed, confirmation } }`. `changed: false` means the event was already confirmed; nothing is written again. |

Errors: 401 unauthenticated; 403 wrong role (including organisers posting to `/confirm`) or a stored role that no longer matches the session; 404 unknown or unrelated event (and drafts for coordinators); 400 invalid ID or unexpected body fields; 409 `EVENT_NOT_CONFIRMABLE` (not APPROVED), `EVENT_ALREADY_STARTED` (start time reached on the database clock), `EVENT_NOT_READY` (message lists every unmet readiness check) or `EVENT_ARRANGEMENTS_CHANGED` (a venue booking appeared while locking). A refused confirmation writes nothing.

Readiness: at least one live venue arrangement, all live arrangements APPROVED, none with `RECOVERY_REQUIRED` outage impacts (KAN-61-AC105); equipment explicitly `NOT_REQUIRED` with no active lines, or every active line `RESERVED` and currently fulfilable (KAN-26 readiness); no `PENDING` change request. *29 October 2026 (PR #77 review):* every APPROVED venue booking must also have no current `APPROVED_BOOKING_OVERLAP` or `OUTSIDE_OPERATING_HOURS` warning under the venue's current buffers and hours; the event's venue rows are share-locked so catalogue edits serialize with confirmation. The status update fires the existing status-history trigger (actor and time) and migration 019's `EVENT_CONFIRMED` notices to the organiser, current coordinator, active attendees and current arrangement staff, in the same transaction.
