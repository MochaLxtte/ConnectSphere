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

The normal server mounts Supabase authentication, event listing, shared detail, draft editing, submission and decision writing through `createRuntimeApp` in `backend/src/runtime-app.ts`. The coordinator review page consumes the shared detail, decision permissions and saved outcomes; the organiser detail page consumes the same response for read-only status and outcome display. The two routes marked planned below are not implemented. Organiser approval/rejection display and refresh passed with a real account in MAN-20260917-01. The signed-out detail page showed a sign-in prompt without request details or the review reason in MAN-20260917-02; draft/submitted detail status and review messages also passed in MAN-20260917-03. Remaining list/status/refresh, submission and access checks are tracked in the test evidence.

| Owner | Method / route | Purpose | State |
| --- | --- | --- | --- |
| Ryan, KAN-25 | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Establish, end and inspect authenticated identity | Implemented |
| Ernest, KAN-31 / KAN-4 | `POST /api/events` | Save an incomplete draft for the authenticated organiser | Planned |
| Kai Jie / Irfan / Tristan, KAN-34 / KAN-33 / KAN-16 | `GET /api/events/:id` | Shared details, status and recorded decision | Implemented; coordinator and organiser detail pages connected |
| Kai Jie, KAN-34 | `PATCH /api/events/:id` | Update an owned draft | Implemented |
| Kai Jie, KAN-6 | `POST /api/events/:id/submit` | Validate submission and transition atomically | Implemented |
| Irfan / Kai Jie / Tristan, KAN-33 / KAN-34 / KAN-16 | `GET /api/events` | Assigned coordinator queue, or the organiser's own drafts; organiser `?scope=all` includes all owned statuses; pagination pending | Implemented; organiser list page connected |
| Irfan, KAN-27 | `POST /api/events/:id/clarifications` | Request clarification and make it visible to the organiser | Planned |
| Tristan, KAN-36 | `POST /api/events/:id/reviews` | Record an approval/rejection and update status atomically | Implemented |

Use camelCase in JSON and snake_case in SQL. IDs are UUID strings. Dates over HTTP should be ISO 8601 timestamps with an offset; PostgreSQL stores `timestamptz`. The expected display timezone is provisionally Asia/Singapore. Missing draft fields are nullable; PATCH omission leaves a field unchanged, and explicit null clears an allowed field. Preserve these conventions in new handlers.

Never accept organiser identity, acting role, arbitrary status, or reviewer identity from an untrusted request body. Derive them from the authenticated session and service action. Filter in repositories as well as enforcing service access rules. Sprint 1 uses assigned-coordinator access as a team implementation assumption; customer clarification about unassigned triage and delegation remains open under [Q-02](../requirements/assumptions-and-questions.md). Client navigation is not access control.

Supabase Auth handles sign-in. Express verifies the access token and resolves `app_users.supabase_user_id` to the application profile and trusted role. `POST /api/auth/login` accepts `{ "accessToken": "..." }` and sets the verified token in an HttpOnly session cookie; `GET /api/auth/me` returns the mapped profile, and `POST /api/auth/logout` clears the cookie. Accounts must be provisioned before login; an unmapped account receives `403 ACCOUNT_NOT_PROVISIONED`. See the [authentication workstream](../../backend/src/modules/auth/README.md) for configuration and identity mapping. When adopting a significant contract change, keep this document, the corresponding UI, service and integration tests consistent in the implementation PR.

## Shared request detail: backend, coordinator and organiser pages connected

**Status:** The shared backend handler for KAN-34, KAN-33 and KAN-16 uses Ryan's verified session and the Sprint 1 assigned-coordinator policy. The coordinator page uses its action flags and displays saved outcomes; the organiser page displays request details and saved outcomes without write controls. Organiser approval/rejection display and refresh passed in MAN-20260917-01, followed by the signed-out detail-page check in MAN-20260917-02. Draft/submitted detail display passed in MAN-20260917-03. The test evidence tracks remaining list/status/refresh, submission and access checks. Assignment workflows, unassigned triage and delegation still need customer clarification under [Q-02](../requirements/assumptions-and-questions.md); the current policy is a team implementation assumption.

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
- `canMakeInitialDecision`: true only for a coordinator who passes the request-specific review policy, while the request is `SUBMITTED` and has no recorded approval or rejection. It is false for all organisers and for all decided requests.

These flags guide the UI. Each write endpoint must recheck authentication, permission and current state; flags returned by an earlier GET are not permission to save later.

`ReviewRequestPage` passes `actions.canMakeInitialDecision` to the decision panel. A false or missing flag prevents new decisions while a recorded outcome and its reason remain visible after an authorised detail read. Successful saves reload the shared detail to display the current status and review. A failed refresh reports that the decision was saved and offers a read retry; an uncertain write or conflict requires a refresh before another submission. Responses from a previously opened request cannot overwrite the current page.

`EventRequestDetailPage` at `/events/:id` uses the same GET for the organiser's read-only view. It displays request fields, readable status and the recorded outcome, reason and `review.createdAt` in Asia/Singapore. Missing review rows produce explicit messages rather than an invented decision; reasons render as plain text. The page never exposes editing, submission or decision controls, even if an action flag is enabled. Refresh re-reads the request; sign-out, account changes, request navigation and failed reads clear previous data and ignore stale responses. A 401 clears local identity and offers sign-in, 403/404 show a generic unavailable/no-permission message, and network/server failures offer a read retry. This connection introduces no new backend handler or schema change.

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

1. Review the shared response with Kai Jie and Irfan. Use mapped test accounts and assigned synthetic requests while the KAN-29 assignment workflow is pending.
2. Connect the organiser's draft-editing view to the shared response. KAN-16's `/events` status list and read-only `/events/:id` detail are connected, including navigation, review reasons and recorded times. The coordinator's decision controls and outcome display are connected.
3. Complete the remaining hosted list/status/refresh, submission and access checks recorded in the test evidence. Draft/submitted detail status and review messages passed in MAN-20260917-03. Coordinator approval/rejection, saved review rows and queue removal have passed; organiser approval/rejection display and refresh also passed in MAN-20260917-01. The signed-out detail page showed a sign-in prompt without request details or the review reason in MAN-20260917-02. Unrelated-organiser reads and signed-out list access remain to be checked manually; see the dated [test evidence](../testing/test-evidence.md).

**Verification, 11 September 2026:** Type checking and all 42 targeted backend tests passed: 31 shared-detail service/HTTP cases in `backend/test/events/event-request-detail.test.ts`, four queue-service cases and seven queue-HTTP cases. All 25 PostgreSQL tests passed, including the 11 new cases in `database/tests/events/event-request-detail.integration.test.ts`. These exercise ownership, coordinator visibility, state-dependent actions, the shared response and persisted approval/rejection outcomes through the composed GET and POST routes. They use fixture authentication and an isolated PostgreSQL test database; they do not verify live login or the hosted development project.

## KAN-33 / KAN-34 / KAN-16 request lists: authentication connected

For a coordinator, `GET /api/events` returns the review queue implemented in
`submitted-requests-router.ts` and `submitted-requests.ts`. For an organiser, the same
endpoint defaults to their own drafts. It shares the router dependencies described above
but keeps its list query and status filter separate from the shared request-detail read.

**KAN-16 list extension, 17 September:** An organiser can request
`GET /api/events?scope=all` to retrieve their requests across all six stored statuses,
including submitted and decided requests. `scope=drafts` explicitly selects the existing
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
account changes and unauthorised responses clear previously displayed results. Request titles
link to `/events/:id` for the shared detail and recorded outcome. List/detail UI tests use
API response fixtures. MAN-20260917-01 separately records passed organiser outcome/refresh checks, and MAN-20260917-02 records the signed-out detail-page check. MAN-20260917-03 adds draft/submitted detail status and review-message checks. The test evidence tracks remaining list/status/refresh, submission-to-status and access verification.

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

`decision` must be `APPROVED` or `REJECTED`. `reason` is optional, is trimmed, and becomes `null` when absent or blank. Other body fields are rejected. The event request ID must use UUID format. Initial decisions currently require `SUBMITTED` status with no existing review decision.

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
