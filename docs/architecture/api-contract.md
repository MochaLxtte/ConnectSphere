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

The normal server mounts Supabase authentication, event listing, draft creation, shared detail, draft editing, submission and decision writing through `createRuntimeApp` in `backend/src/runtime-app.ts`. The coordinator review page consumes the shared detail, decision permissions and saved outcomes; the organiser detail page consumes the same response for status, outcome and permitted draft actions, with planning panels after submission. Draft creation and clarification were added on 19 September with the [first-release routes](#first-release-routes-cf-02-cf-03-and-cf-05-to-cf-20) below; "Implemented" in this table means the handler is mounted; actual test runs and hosted acceptance are recorded separately in the [test evidence](../testing/test-evidence.md). Organiser approval/rejection display and refresh passed with a real account in MAN-20260917-01. The signed-out detail page showed a sign-in prompt without request details or the review reason in MAN-20260917-02; draft/submitted detail status and review messages also passed in MAN-20260917-03. Later manual results and the outstanding submission-to-status integration check are tracked in the test evidence.

| Owner | Method / route | Purpose | State |
| --- | --- | --- | --- |
| Ryan, KAN-25 | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Establish, end and inspect authenticated identity | Implemented |
| Ernest, KAN-31 / KAN-4 | `POST /api/events` | Save an incomplete draft for the authenticated organiser | Implemented 19 September; hosted acceptance outstanding |
| Kai Jie / Irfan / Tristan, KAN-34 / KAN-33 / KAN-16 | `GET /api/events/:id` | Shared details, status and recorded decision | Implemented; coordinator and organiser detail pages connected |
| Kai Jie, KAN-34 | `PATCH /api/events/:id` | Update an owned draft | Implemented |
| Kai Jie, KAN-6 | `POST /api/events/:id/submit` | Validate submission and transition atomically | Implemented |
| Irfan / Kai Jie / Tristan, KAN-33 / KAN-34 / KAN-16 | `GET /api/events` | Assigned coordinator queue, or the organiser's own drafts; organiser `?scope=all` includes all owned statuses; coordinator `?scope=history` lists assigned decided requests (KAN-56); pagination pending | Implemented; organiser list page connected |
| Irfan, KAN-27 | `POST /api/events/:id/clarifications` | Request clarification and make it visible to the organiser | Implemented 19 September; hosted acceptance outstanding |
| Tristan, KAN-36 | `POST /api/events/:id/reviews` | Record an approval/rejection and update status atomically | Implemented |

Use camelCase in JSON and snake_case in SQL. IDs are UUID strings. Dates over HTTP should be ISO 8601 timestamps with an offset; PostgreSQL stores `timestamptz`. The expected display timezone is provisionally Asia/Singapore. Missing draft fields are nullable; PATCH omission leaves a field unchanged, and explicit null clears an allowed field. Preserve these conventions in new handlers.

Never accept organiser identity, acting role, arbitrary status, or reviewer identity from an untrusted request body. Derive them from the authenticated session and service action. Filter in repositories as well as enforcing service access rules. Sprint 1 uses assigned-coordinator access as a team implementation assumption; customer clarification about unassigned triage and delegation remains open under [Q-02](../requirements/assumptions-and-questions.md). Client navigation is not access control.

Supabase Auth handles sign-in. Express verifies the access token and resolves `app_users.supabase_user_id` to the application profile and trusted role. `POST /api/auth/login` accepts `{ "accessToken": "..." }` and sets the verified token in an HttpOnly session cookie; `GET /api/auth/me` returns the mapped profile, and `POST /api/auth/logout` clears the cookie. Accounts must be provisioned before login; an unmapped account receives `403 ACCOUNT_NOT_PROVISIONED`. See the [authentication workstream](../../backend/src/modules/auth/README.md) for configuration and identity mapping. When adopting a significant contract change, keep this document, the corresponding UI, service and integration tests consistent in the implementation PR.

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

Viewing permission and decision permission are separate checks. A successful detail read does not establish permission to edit or approve/reject. Role alone does not grant coordinator access: unassigned requests and requests assigned to another coordinator are unavailable. `event_requests.coordinator_id` references `app_users.id`, not the Supabase Auth UUID. Reassignment changes access on subsequent requests; the decision write rechecks assignment against the locked event row.

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
(six at the time; nine since migration 005), including submitted and decided requests. `scope=drafts` explicitly selects the existing
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

**Status, 19 September 2026:** The routes in this section are implemented on `feat/KAN-24-core-feature-schema` and mounted by `createRuntimeApp` through the `workspace` dependencies (`pool` plus the same `authenticateRequest` session verifier as the Sprint 1 routes). Unit, component and PostgreSQL integration tests pass locally with fixture or locally signed identities. They have **not** been verified against hosted Supabase accounts, have not been peer reviewed, and do not mark any story Done. The business rules are team implementation assumptions for Q-02 and Q-04 to Q-13, recorded in the [19 September decision record](../requirements/assumptions-and-questions.md); the customer questions stay open. Venue Staff, Technical Support Staff and Attendee accounts must be provisioned in Supabase Auth and linked through `app_users.supabase_user_id` before those roles can sign in.

Conventions shared by every route below:

- Identity and role come from the verified session only. Every response sets `Cache-Control: no-store`.
- `401 AUTHENTICATION_REQUIRED` for absent or invalid credentials; the generic `400 INVALID_JSON`, `413 PAYLOAD_TOO_LARGE` and `500 INTERNAL_ERROR` envelopes still apply. These are not repeated in the tables.
- Request bodies reject unknown fields. Timestamps are ISO 8601; intervals are half-open `[startsAt, endsAt)`, so back-to-back periods do not overlap.
- An event, booking or request the caller has no relationship to returns the same 404 as a missing one. "Owner" means the organiser whose `app_users.id` equals `organiser_id`; "assigned coordinator" means `coordinator_id` equals the caller's `app_users.id`. Coordinators never see drafts.
- Role abbreviations: EO Event Organiser, EC Event Coordinator, VS Venue Staff, TS Technical Support Staff, AT Attendee.
- List responses are `{ "items": [...] }` unless stated. Notifications are written in the same transaction as the action they describe and never to the acting user.

Mount order matters: `app.ts` registers the assignment, clarification, change-request and lifecycle routers on `/api/events` before the shared detail router, so `/unassigned` and `/coordinators` are not read as event IDs.

### Events: draft creation (CF-02, CF-03) — `submitted-requests-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/events` | EO | `201` the new `DRAFT` as the flat event record plus `registrationCapacity`, `registrationOpensAt`, `registrationClosesAt`. Body is optional; any supplied draft fields follow the PATCH rules. The owner is always the caller. | `400 INVALID_DRAFT_INPUT`; `403 DRAFT_CREATE_FORBIDDEN` |

`PATCH /api/events/:id` now also accepts the three registration fields (`registrationCapacity` a non-negative whole number or null; the two timestamps ISO 8601 or null). The status-history trigger attributes the initial `DRAFT` row to the organiser.

### Events: coordinator assignment (CF-05) — `assignment-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/events/unassigned` | EC | `200` items: `id`, `name`, `status`, `organiserName`, `startsAt`, `endsAt`, `expectedAttendance`, `updatedAt`; unassigned requests excluding `DRAFT`, `REJECTED`, `CANCELLED`, `COMPLETED`, oldest update first | `403 ACTION_FORBIDDEN` |
| `GET /api/events/coordinators` | EC | `200` items: `id`, `displayName`, `email` of every Event Coordinator | `403 ACTION_FORBIDDEN` |
| `PUT /api/events/:id/coordinator` | EC (any coordinator when unassigned; otherwise only the currently assigned coordinator) | `200` `eventRequestId`, `assignmentId`, `coordinatorId`, `previousCoordinatorId`. Body `{ coordinatorId, note? }`. Updates `event_requests.coordinator_id` and the assignment history together; notifies the new coordinator, the previous coordinator and the organiser | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_INPUT`, `INVALID_ASSIGNMENT_INPUT`, `INVALID_COORDINATOR`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` (missing, draft, or assigned to another coordinator); `409 ASSIGNMENT_NOT_ALLOWED`, `COORDINATOR_ALREADY_ASSIGNED` |
| `GET /api/events/:id/assignments` | EO owner, assigned EC, or any EC while the non-draft request is unassigned | `200` items: `id`, `coordinatorId`, `coordinatorName`, `assignedById`, `assignedByName`, `note`, `assignedAt`, `unassignedAt`, newest first | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |

### Events: review start and clarification (CF-04, KAN-27) — `clarification-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/events/:id/start-review` | Assigned EC | `200` `{ eventRequestId, status: "UNDER_REVIEW" }`; `SUBMITTED` → `UNDER_REVIEW`; notifies the organiser | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 REVIEW_NOT_STARTABLE` |
| `GET /api/events/:id/clarifications` | EO owner, assigned EC | `200` items: `id`, `eventRequestId`, `requestedById`, `requestedByName`, `message`, `response`, `createdAt`, `respondedAt`, oldest first | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |
| `POST /api/events/:id/clarifications` | Assigned EC | `201` `{ clarificationId, eventRequestId, status: "CLARIFICATION_REQUESTED" }`. Body `{ message }` (non-empty, at most 2000 characters). Allowed from `SUBMITTED` or `UNDER_REVIEW`; notifies the organiser | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_INPUT`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 CLARIFICATION_NOT_ALLOWED` |
| `POST /api/events/:id/clarifications/:clarificationId/response` | EO owner | `200` `{ clarificationId, eventRequestId, status }`. Body `{ response }`. `status` is `SUBMITTED` once every open question is answered, otherwise `CLARIFICATION_REQUESTED`; notifies the assigned coordinator | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_CLARIFICATION_ID`, `INVALID_INPUT`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`, `CLARIFICATION_NOT_FOUND`; `409 CLARIFICATION_ALREADY_ANSWERED`, `CLARIFICATION_NOT_AWAITED` |

### Events: lifecycle and status history (CF-06) — `lifecycle-router.ts`

| Method / route | Roles | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/events/:id/confirm` | Assigned EC | `200` `{ eventRequestId, status: "CONFIRMED" }`; `APPROVED` → `CONFIRMED`; needs at least one `APPROVED` venue booking and no equipment request still `REQUESTED` | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 EVENT_NOT_CONFIRMABLE`, `VENUE_BOOKING_REQUIRED`, `EQUIPMENT_REQUESTS_PENDING` |
| `POST /api/events/:id/cancel` | EO owner, assigned EC | `200` `{ eventRequestId, status: "CANCELLED", cancelledVenueBookings, cancelledEquipmentRequests, notifiedAttendees }`. Body `{ reason }` (required). Cancels `PENDING`/`APPROVED` bookings and `REQUESTED`/`RESERVED` equipment requests; the reason is sent to the organiser/coordinator only, registered attendees are told the event is off | `400 INVALID_EVENT_REQUEST_ID`, `INVALID_INPUT`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 EVENT_NOT_CANCELLABLE` (`DRAFT`, `REJECTED`, `CANCELLED`, `COMPLETED`) |
| `POST /api/events/:id/complete` | Assigned EC | `200` `{ eventRequestId, status: "COMPLETED" }`; `CONFIRMED` → `COMPLETED` after `ends_at` has passed by the database clock | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND`; `409 EVENT_NOT_COMPLETABLE`, `EVENT_NOT_ENDED` |
| `GET /api/events/:id/history` | EO owner, assigned EC | `200` items: `id`, `fromStatus`, `toStatus`, `changedById`, `changedByName`, `createdAt`, oldest first; rows come from the `event_status_history` trigger | `400 INVALID_EVENT_REQUEST_ID`; `403 ACTION_FORBIDDEN`; `404 EVENT_REQUEST_NOT_FOUND` |

The schema has no cancellation-reason column; the reason travels only in the notifications.

### Frontend routes

Client navigation is not access control; every page relies on the API responses above. `AppShell.vue` shows organiser links to signed-out visitors and filters the sidebar by the signed-in role. Review and unassigned-queue links require a resolved event-coordinator session; direct review navigation is also protected by `ReviewAccessPage.vue`. The venue availability link requires a resolved Event Coordinator, Venue Staff or Technical Support Staff session, and the page applies the same check before reading any data.

| Path | Page | Sidebar visibility |
| --- | --- | --- |
| `/events`, `/events/new` | Organiser request list; new event request form | Signed out or EO |
| `/events/:id`, `/events/:id/edit` | Organiser detail with the planning panels; draft editing | Linked from the list |
| `/reviews`, `/reviews/unassigned` | Review queue; unassigned requests | EC after session resolution |
| `/reviews/:id` | Coordinator review with the planning panels | Linked from the queue |
| `/venues/availability` | KAN-51 venue availability calendar; optional `?week=YYYY-MM-DD&venue=<id>` reopens a week and venue | EC, VS or TS after session resolution; also linked from `/reviews/:id` for the event's week |

`EventPlanningPanels.vue` adds the assignment, clarification and lifecycle panels to both detail pages.

**Scope, 26 September 2026:** the venue, equipment, registration, notification and change-request routes recorded here earlier were removed before Sprint 2 so the team builds those stories itself; see the Sprint 2 backlog. Their tables remain in migration 005. KAN-51's read-only calendar route was rebuilt on 3 October; see [below](#venue-availability-calendar-kan-51-cf-09).

**Verification:** Backend unit and HTTP-boundary tests live under `backend/test/events/` (`create-draft*.test.ts`, `workflow-support.test.ts`, `workflow-routers.test.ts`). PostgreSQL integration tests live under `database/tests/events/` (`create-draft`, `assignment`, `clarifications`, `lifecycle`) and `database/tests/core-schema.integration.test.ts`. Component tests sit beside each page and panel under `frontend/src/features/`. They use fixture authentication, API response fixtures or an isolated PostgreSQL test database. No Playwright check or hosted manual check covers these routes yet; record those results in the [test evidence](../testing/test-evidence.md) before claiming acceptance.

## Venue availability calendar (KAN-51, CF-09)

**Status, 3 October 2026:** implemented on `feat/KAN-51-venue-availability-calendar` in `backend/src/modules/venues/` and mounted by `createRuntimeApp` through the `workspace` dependencies. The route only reads migration 005's `venues`, `venue_bookings` and `venue_unavailability` tables; there is no schema change. Unit, HTTP-boundary, PostgreSQL, component and browser-fixture tests passed on `6ede774` (AUTO-20261003-01 in the [test evidence](../testing/test-evidence.md)). Hosted acceptance (S2-T05/S2-T06) and peer review are outstanding. The three-role access group is the 21 September team decision; the remaining rules are provisional team assumptions in the [3 October decision](../requirements/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar).

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
