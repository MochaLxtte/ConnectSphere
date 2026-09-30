# API contract

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
| Kai Jie / Tristan, KAN-6 / KAN-29 | `POST /api/events/:id/submit` | Validate and atomically submit with an automatically selected coordinator | Implemented on this branch; migration 006 and hosted verification required |
| Irfan / Kai Jie / Tristan, KAN-33 / KAN-34 / KAN-16 | `GET /api/events` | Assigned coordinator queue, or the organiser's own drafts; organiser `?scope=all` includes all owned statuses; pagination pending | Implemented; organiser list page connected |
| Irfan, KAN-27 | `POST /api/events/:id/clarifications` | Request clarification and make it visible to the organiser | Implemented 19 September; hosted acceptance outstanding |
| Tristan, KAN-36 | `POST /api/events/:id/reviews` | Record an approval/rejection and update status atomically | Implemented |

Use camelCase in JSON and snake_case in SQL. IDs are UUID strings. Dates over HTTP should be ISO 8601 timestamps with an offset; PostgreSQL stores `timestamptz`. The expected display timezone is provisionally Asia/Singapore. Missing draft fields are nullable; PATCH omission leaves a field unchanged, and explicit null clears an allowed field. Preserve these conventions in new handlers.

Never accept organiser identity, acting role, arbitrary status, or reviewer identity from an untrusted request body. Derive them from the authenticated session and service action. Filter in repositories as well as enforcing service access rules. Sprint 1 uses assigned-coordinator access as a team implementation assumption; customer clarification about unassigned triage and delegation remains open under [Q-02](../requirements/assumptions-and-questions.md). Client navigation is not access control.

Supabase Auth handles sign-in. Express verifies the access token and resolves `app_users.supabase_user_id` to the application profile and trusted role. `POST /api/auth/login` accepts `{ "accessToken": "..." }` and sets the verified token in an HttpOnly session cookie; `GET /api/auth/me` returns the mapped profile, and `POST /api/auth/logout` clears the cookie. Accounts must be provisioned before login; an unmapped account receives `403 ACCOUNT_NOT_PROVISIONED`. See the [authentication workstream](../../backend/src/modules/auth/README.md) for configuration and identity mapping. When adopting a significant contract change, keep this document, the corresponding UI, service and integration tests consistent in the implementation PR.

## KAN-29 automatic assignment on submission

**Branch implementation, 28 September 2026:** `POST /api/events/:id/submit` retains its owned-draft, completeness and verified-organiser checks. It now allocates one coordinator as part of the submission transaction. This is not a hosted acceptance record: migration [006](../../database/migrations/006_automatic_coordinator_assignment.sql) has not been applied to the shared Supabase project by this work. Coordinate its rollout with Arvin through the [database setup](../../database/README.md#kan-29-automatic-assignment-setup).

An eligible candidate has application role `EVENT_COORDINATOR` and `app_users.coordinator_available = true`. The new availability flag defaults to `false`; opt in only provisioned coordinator profiles that are ready for work. Fictional seed accounts remain opted out. Selection counts requests in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED`, chooses the smallest count, and breaks ties using ascending `app_users.id` UUID order. Availability is independent of current login state and does not revoke existing assignments when turned off.

Submission locks the event, then coordinates with other automatic and manual allocations through consistently ordered coordinator-row locks. It counts committed workload after acquiring those locks. The `SUBMITTED` status, `event_requests.coordinator_id` and one `AUTOMATIC` assignment-history row commit together. Failure rolls all three changes back. No approval/rejection record is created. Changing assignment or availability later does not cause a submitted request to be automatically reallocated.

| Response | Meaning |
| --- | --- |
| `200` | Existing flat `EventRecord` response, now with `status: "SUBMITTED"` and the selected non-null `coordinatorId`. |
| `400 INVALID_EVENT_REQUEST_ID` | The route ID is not a UUID. |
| `400 SUBMISSION_INCOMPLETE` | Required submission data is missing/invalid; the error also supplies `missingFields`. No allocation occurs. |
| `401 AUTHENTICATION_REQUIRED` | No verified session. |
| `403 SUBMIT_FORBIDDEN` | The verified caller is not an event organiser. |
| `404 EVENT_REQUEST_NOT_FOUND` | The request is missing or belongs to another organiser; no assignment details are revealed. |
| `409 REQUEST_NOT_SUBMITTABLE` | The owned request is no longer a draft, including repeated submission. Status, coordinator and history stay unchanged. |
| `409 NO_AVAILABLE_COORDINATOR` | No opted-in coordinator is available. The saved request remains an editable draft with no new assignment. |
| `409 DRAFT_ALREADY_ASSIGNED` | The draft already has a coordinator or active assignment-history row. Preserve the existing data and investigate it before submission; automatic selection does not overwrite it. |
| `500 INTERNAL_ERROR` | An unexpected failure; the submission transaction is rolled back. |

`NO_AVAILABLE_COORDINATOR` uses the message: "No event coordinator is currently available. Your request is still a draft. Please try again later." The create/edit form and saved-draft detail page show this explanation, retain draft editing and allow retry. `DRAFT_ALREADY_ASSIGNED` displays its specific explanation and retains editing; the existing assignment must be checked before submission can succeed. The form saves draft changes before calling submit, so a rolled-back submission does not undo an earlier successful draft save. Clients cannot choose the coordinator through submission input.

The [manual check guide](../testing/kan29-manual-checks.md) covers account access, workload selection, recovery and refusal of out-of-scope reassignment. Previously submitted requests are not backfilled. Manual initial assignment remains a separate operation only for unassigned requests; the automatic availability flag does not restrict manual targets.

## Shared request detail: backend, coordinator and organiser pages connected

**Status:** The shared backend handler for KAN-34, KAN-33 and KAN-16 uses Ryan's verified session and the Sprint 1 assigned-coordinator policy. The coordinator page uses its action flags and displays saved outcomes; the organiser page displays request details and saved outcomes with permitted draft and planning actions. Organiser approval/rejection display and refresh passed in MAN-20260917-01, followed by the signed-out detail-page check in MAN-20260917-02. Draft/submitted detail display passed in MAN-20260917-03. Second-organiser detail denial and list isolation passed in MAN-20260917-04. Signed-out list navigation showed a sign-in prompt without request names or statuses in MAN-20260917-05. Draft/Submitted/Rejected/Approved list labels matched the detail pages and Draft/Submitted detail refresh passed in MAN-20260917-06; submission-to-status remains in the test evidence. Assignment workflows, unassigned triage and delegation still need customer clarification under [Q-02](../requirements/assumptions-and-questions.md); the current policy is a team implementation assumption.

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

`ReviewAccessPage` is the parent of `/reviews`, `/reviews/unassigned` and `/reviews/:id`. It mounts these coordinator pages only after the session resolves to an event coordinator. Sidebar and overview review links follow the same role check. Signed-out or wrong-role callers receive an access message without loading review content. Account changes and sign-out unmount the prior page and abort pending reads; a current API 401 clears the local session, and late responses cannot restore stale content. This frontend boundary does not change the shared API: `GET /api/events` still returns an organiser's own drafts by default, and organisers retain authorised shared-detail reads through `/events/:id`. The organiser-visible review queue defect and its automated regression coverage are recorded as MAN-20260917-07 and AUTO-20260917-07/08 in the [test evidence](../testing/test-evidence.md). The organiser queue recheck passed on 18 September (MAN-20260918-01): the Review queue link was absent after reload, and direct `/reviews` navigation showed Coordinator access only without request data. Manual checks of `/reviews/:id` and the remaining role/session scenarios are outside this recheck.

`EventRequestDetailPage` at `/events/:id` uses the same GET for organiser details. It displays request fields, readable status and the recorded outcome, reason and `review.createdAt` in Asia/Singapore. Missing review rows produce explicit messages rather than an invented decision; reasons render as plain text. A `DRAFT` with `actions.canEditDraft` exposes an Edit draft link and Submit for review for the saved draft. Non-draft requests mount the applicable planning panels; organiser pages never expose coordinator approval/rejection controls. Refresh re-reads the request; sign-out, account changes, request navigation and failed reads clear previous data and ignore stale responses. A 401 clears local identity and offers sign-in, 403/404 show a generic unavailable/no-permission message, and network/server failures offer a read retry.

Creation and submission share the event API: `/events/new` uses `EventRequestForm.vue` to create a draft through `POST /api/events`, PATCH later changes to that saved draft, and submit after saving. `/events/:id/edit` saves the current form before submission; `/events/:id` submits the already-saved draft. Each path calls `POST /api/events/:id/submit`, whose service rechecks ownership, state and completeness. The hosted submission-to-status acceptance check remains outstanding.

### Access and responses

| Caller / request | Detail access |
| --- | --- |
| Organiser viewing their own request | Allow all current Sprint 1 statuses, including `DRAFT`, `APPROVED` and `REJECTED`. |
| Organiser viewing another organiser's request | Return `404 EVENT_REQUEST_NOT_FOUND`. |
| Coordinator viewing a draft | Return `404 EVENT_REQUEST_NOT_FOUND`. |
| Coordinator viewing another current Sprint 1 status | Allow only when the request's `coordinatorId` matches their verified `app_users.id`. This includes `APPROVED` and `REJECTED`. |
| Coordinator who fails the visibility policy, or a missing request | Return the same `404 EVENT_REQUEST_NOT_FOUND` response. |

Viewing permission and decision permission are separate checks. A successful detail read does not establish permission to edit or approve/reject. Role alone does not grant coordinator access: unassigned requests and requests assigned to another coordinator are unavailable. `event_requests.coordinator_id` references `app_users.id`, not the Supabase Auth UUID. Any externally reconciled coordinator change affects subsequent access; the decision write rechecks assignment against the locked event row. The current application does not expose reassignment.

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
Coordinators must omit `scope`; supplying it returns the same 400 and does not expand
their review queue. Other roles remain forbidden and unauthenticated callers receive 401.

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
requests are excluded. [Q-02 remains open](../requirements/assumptions-and-questions.md)
for customer clarification about triage, assignment and delegation.

`GET /api/events` response:

```json
{ "items": [{ "id": "...", "name": "...", "status": "SUBMITTED", "createdAt": "...", "updatedAt": "..." }] }
```

The queue currently returns all permitted matching rows in creation order; pagination is
not implemented. `GET /api/events/:id` uses the shared detail response documented above.

| Response | Meaning |
| --- | --- |
| `200` | An object containing an `items` array, which may be empty. |
| `400 INVALID_EVENT_LIST_SCOPE` | An organiser supplied an invalid/repeated scope, or a coordinator supplied any scope. |
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

The reviewer must be an event coordinator whose application ID matches the request's current `coordinator_id`. The policy runs inside the saving transaction against the locked event row, so a prior page view does not retain permission after reassignment. Null or different assignments do not grant access. Assignment is a Sprint 1 implementation assumption while Q-02 remains open; it does not bypass the status and recorded-decision checks. Automated tests with synthetic verified identities do not establish that hosted login has been tested.

Request body:

```json
{
  "decision": "APPROVED",
  "reason": "Ready to proceed."
}
```

`decision` must be `APPROVED` or `REJECTED`. `reason` is optional, is trimmed, and becomes `null` when absent or blank. Other body fields are rejected. The event request ID must use UUID format. Initial decisions require `SUBMITTED` or, since 19 September, `UNDER_REVIEW` status with no existing review decision. A request in `CLARIFICATION_REQUESTED` must be answered first, which returns it to `SUBMITTED`.

**Required correction, recorded 21 September:** The [customer rule](../requirements/assumptions-and-questions.md#21-september-2026--customer-rules-reconciled-with-the-backlog) requires a non-empty reason for event-request rejection. The current parser, persistence path and UI still allow an empty reason. The paragraph above describes existing behaviour, not compliance with that requirement. Refine KAN-36 and add the validation/UI regression work; approval may continue without a reason. No implementation change or new test pass is recorded here.

| Response | Meaning |
| --- | --- |
| `201` | Returns `reviewId`, `eventRequestId`, `reviewedBy`, `decision` and `reason` after the review and matching event status commit together. |
| `400 INVALID_EVENT_REQUEST_ID` | The route ID is not a UUID. |
| `400 INVALID_REVIEW_INPUT` | The JSON body does not match the decision contract. |
| `401 AUTHENTICATION_REQUIRED` | The authentication adapter reports absent or invalid credentials. |
| `403 REVIEW_FORBIDDEN` | The verified account is not an event coordinator. |
| `404 EVENT_REQUEST_NOT_FOUND` | The request does not exist or this coordinator cannot review it; both cases return the same response. |
| `409 REQUEST_NOT_REVIEWABLE` | The authorised request is not in a supported initial-review state, including a draft. |
| `409 REVIEW_ALREADY_DECIDED` | The authorised request already has an approval or rejection outcome. |
| `500 INTERNAL_ERROR` | An unexpected verification or persistence failure occurred; details are not returned. |

The existing malformed-JSON and payload-size responses also apply. Responses from the review handler use `Cache-Control: no-store`. HTTP tests cover validation, role checks, error mapping and unavailable integration; database tests additionally exercise the mounted handler with real PostgreSQL and fixture authentication.

## First-release routes (CF-02 to CF-07)

**Current scope, 30 September 2026:** the routes below support Sprint 1 and Sprint 2. The earlier broad implementation was reduced on 26 September and again by the [30 September scope audit](../requirements/README.md#30-september-sprint-scope-audit). Confirmation, cancellation, completion and notification writes are removed. Manual assignment only sets an initial coordinator on an unassigned non-draft request; KAN-65 reassignment is deferred. Historical descriptions and test results remain dated evidence, not a list of current routes.

Conventions shared by every route below:

- Identity and role come from the verified session only. Every response sets `Cache-Control: no-store`.
- `401 AUTHENTICATION_REQUIRED` for absent or invalid credentials; the generic `400 INVALID_JSON`, `413 PAYLOAD_TOO_LARGE` and `500 INTERNAL_ERROR` envelopes still apply. These are not repeated in the tables.
- Request bodies reject unknown fields. Timestamps are ISO 8601; intervals are half-open `[startsAt, endsAt)`, so back-to-back periods do not overlap.
- An event, booking or request the caller has no relationship to returns the same 404 as a missing one. "Owner" means the organiser whose `app_users.id` equals `organiser_id`; "assigned coordinator" means `coordinator_id` equals the caller's `app_users.id`. Coordinators never see drafts.
- Role abbreviations: EO Event Organiser, EC Event Coordinator, VS Venue Staff, TS Technical Support Staff, AT Attendee.
- List responses are `{ "items": [...] }` unless stated. Retained workflows do not generate notifications; delivery is future KAN-64 work.

Mount order matters: `app.ts` registers the assignment, clarification and status-history routers on `/api/events` before the shared detail router, so `/unassigned` and `/coordinators` are not read as event IDs.

### Events: draft creation (CF-02, CF-03) — `submitted-requests-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/events` | EO | `201` the new `DRAFT` as the flat event record plus `registrationCapacity`, `registrationOpensAt`, `registrationClosesAt`. Body is optional; any supplied draft fields follow the PATCH rules. The owner is always the caller. | `400 INVALID_DRAFT_INPUT`; `403 DRAFT_CREATE_FORBIDDEN` |

`PATCH /api/events/:id` now also accepts the three registration fields (`registrationCapacity` a non-negative whole number or null; the two timestamps ISO 8601 or null). The status-history trigger attributes the initial `DRAFT` row to the organiser.

### Events: coordinator assignment (CF-05) — `assignment-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/events/unassigned` | EC | `200` items: `id`, `name`, `status`, `organiserName`, `startsAt`, `endsAt`, `expectedAttendance`, `updatedAt`; unassigned requests in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED` or `APPROVED`, oldest update first | `403 ACTION_FORBIDDEN` |
| `GET /api/events/coordinators` | EC | `200` items: `id`, `displayName`, `email` of every Event Coordinator | `403 ACTION_FORBIDDEN` |
| `PUT /api/events/:id/coordinator` | EC, unassigned request in one of the four queue statuses above | `200` `eventRequestId`, `assignmentId`, `coordinatorId`, `previousCoordinatorId`. Body `{ coordinatorId, note? }`. Sets the initial `event_requests.coordinator_id` and assignment history together; `previousCoordinatorId` is null. Does not replace existing assignment or generate notifications | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_INPUT`, `INVALID_ASSIGNMENT_INPUT`, `INVALID_COORDINATOR`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` (missing, draft, or assigned to another coordinator); `409 ASSIGNMENT_NOT_ALLOWED`, `COORDINATOR_ALREADY_ASSIGNED`, `REASSIGNMENT_NOT_AVAILABLE`, `ASSIGNMENT_HISTORY_CONFLICT` |
| `GET /api/events/:id/assignments` | EO owner, assigned EC, or any EC while the non-draft request is unassigned | `200` items: `id`, `coordinatorId`, `coordinatorName`, `assignmentMethod`, `assignedById`, `assignedByName`, `note`, `assignedAt`, `unassignedAt`, newest first | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |

With migration 006, `assignmentMethod` is `AUTOMATIC` or `MANUAL`. Automatic records have null `assignedById` and `assignedByName`; the UI displays "Assigned automatically on ..." rather than attributing the choice to the organiser or coordinator. Manual records retain their acting staff member and existing display. Existing history defaults to `MANUAL`; the migration does not rewrite its actor or change the current coordinator. The owning organiser sees the history read-only, and assigned coordinators can read it. Assignment controls appear only for initial assignment of unassigned requests; the API also refuses replacement.

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

`POST /api/events/:id/confirm`, `/cancel` and `/complete` are not mounted and return `404 NOT_FOUND`. Existing later-status records remain readable; their presence does not enable those actions. Equipment, registration, change-request and notification application endpoints are also absent. Venue routes will be added under their committed Sprint 2 stories.

### Frontend routes

Client navigation is not access control; every page relies on the API responses above. `AppShell.vue` shows organiser links to signed-out visitors and filters the sidebar by the signed-in role. Review and unassigned-queue links require a resolved event-coordinator session; direct review navigation is also protected by `ReviewAccessPage.vue`.

| Path | Page | Sidebar visibility |
| --- | --- | --- |
| `/events`, `/events/new` | Organiser request list; new event request form | Signed out or EO |
| `/events/:id`, `/events/:id/edit` | Organiser detail with the planning panels; draft editing | Linked from the list |
| `/reviews`, `/reviews/unassigned` | Review queue; unassigned requests | EC after session resolution |
| `/reviews/:id` | Coordinator review with the planning panels | Linked from the queue |

`EventPlanningPanels.vue` adds the assignment, clarification and read-only status-history panels to both detail pages.

**Earlier scope correction, 26 September 2026:** the venue, equipment, registration, notification and change-request routes recorded here earlier were removed before Sprint 2 so the team builds those stories itself; see the Sprint 2 backlog. Their tables remain in migration 004.

**Verification:** Backend unit and HTTP-boundary tests live under `backend/test/events/` (`create-draft*.test.ts`, `workflow-support.test.ts`, `workflow-routers.test.ts`). PostgreSQL integration tests live under `database/tests/events/` (`create-draft`, `assignment`, `clarifications`, `status-history`) and `database/tests/core-schema.integration.test.ts`. Component tests sit beside each page and panel under `frontend/src/features/`. They use fixture authentication, API response fixtures or an isolated PostgreSQL test database. No Playwright check or hosted manual check covers these routes yet; record those results in the [test evidence](../testing/test-evidence.md) before claiming acceptance.
