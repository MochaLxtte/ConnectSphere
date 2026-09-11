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

## Proposed Sprint 1 routes

These are coordination proposals, not implemented APIs. Refine them together before independent UI/API implementation; add an OpenAPI file when request validation and authentication are settled. If KAN-25 adopts Supabase Auth, revise the login, logout and session contract to match that integration before building the account pages.

| Owner                 | Method / route                                                      | Purpose                                                     |
| --------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Ryan, KAN-25         | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Establish, end and inspect authenticated identity           |
| Ernest, KAN-31 / KAN-4 | `POST /api/events`                                                  | Save an incomplete draft for the authenticated organiser    |
| Kai Jie / Irfan / Tristan, KAN-34 / KAN-33 / KAN-16 | `GET /api/events/:id`                         | Shared request details, status and recorded decision; see proposal below |
| Kai Jie, KAN-34       | `PATCH /api/events/:id`                                            | Update an owned draft                                      |
| Kai Jie, KAN-6        | `POST /api/events/:id/submit`                                       | Validate submission and transition atomically               |
| Irfan, KAN-33         | `GET /api/events`                                                   | Filtered, paginated list scoped to the actor's relationship |
| Irfan, KAN-27         | `POST /api/events/:id/clarifications`                               | Request clarification and make it visible to the organiser  |
| Tristan, KAN-36       | `POST /api/events/:id/reviews`                                      | Record an approval/rejection and update status atomically   |

Use camelCase in JSON and snake_case in SQL. IDs are UUID strings. Dates over HTTP should be ISO 8601 timestamps with an offset; PostgreSQL stores `timestamptz`. The expected display timezone is provisionally Asia/Singapore. Missing draft fields are nullable; PATCH omission should mean unchanged, and explicit null should clear an allowed field. Confirm these conventions before implementing handlers.

Never accept organiser identity, acting role, arbitrary status, or reviewer identity from an untrusted request body. Derive them from the authenticated session and service action. Filter in repositories as well as enforcing service access rules. Determine coordinator visibility and assignment policy before exposing a review queue. Client navigation is not access control.

Agree on an authentication strategy, runtime validation, 401/403/404 behavior, concurrency handling, and error details as part of KAN-25 and the first event stories. Proposals can be reviewed before implementation. When adopting a significant contract change, keep this document, the corresponding UI, service and integration tests consistent in the implementation PR.

## Shared request detail: proposal for team review

**Status:** Proposed for KAN-34, KAN-33 and KAN-16. The response and access rules below need review by Kai Jie, Irfan and Tristan before adoption. The shared handler is not implemented on this branch; coordinator assignment and delegation remain open under [Q-02](../requirements/assumptions-and-questions.md). The team still needs to choose one owner for the route integration.

### One route for all three pages

Register `GET /api/events/:id` once. Authenticate the caller once, validate the UUID, apply the request-specific visibility policy and return one response shape. Separate service functions can handle ownership checks, coordinator visibility and database queries within that handler. Page intent does not select a different handler or response.

| Story / contributor | Use of the shared response |
| --- | --- |
| KAN-34 / Kai Jie | Load the organiser's draft fields into the editing form. |
| KAN-33 / Irfan | Display an authorised coordinator's request detail. |
| KAN-16 / Tristan | Display the organiser's request status and recorded outcome. |

During integration, consolidate KAN-33's existing detail handler into this shared route and remove its non-coordinator `next()` fallback. Do not add separate organiser detail handlers or rely on their mount order. Keep the queue route `GET /api/events`, draft update `PATCH /api/events/:id` and decision write `POST /api/events/:id/reviews` as separate operations.

### Proposed successful response

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

`review` is `null` until an initial approval or rejection is recorded. Its fields reuse the existing decision-write response, with `createdAt` added from `event_reviews.created_at`. This is the recorded decision time, not the time the detail was fetched. All timestamps use ISO 8601 strings with an offset. Read the event status and its review from the same database snapshot so a concurrent decision cannot produce an old status with a new outcome. Further review rounds need a separate contract agreement.

The backend computes `actions` for the verified caller:

- `canEditDraft`: true only for the owning organiser while the request is `DRAFT`.
- `canMakeInitialDecision`: true only for a coordinator who passes the request-specific review policy, while the request is `SUBMITTED` and has no recorded approval or rejection. It is false for all organisers and for all decided requests.

These flags guide the UI. Each write endpoint must recheck authentication, permission and current state; flags returned by an earlier GET are not permission to save later.

### Proposed access and responses

| Caller / request | Detail access |
| --- | --- |
| Organiser viewing their own request | Allow all current Sprint 1 statuses, including `DRAFT`, `APPROVED` and `REJECTED`. |
| Organiser viewing another organiser's request | Return `404 EVENT_REQUEST_NOT_FOUND`. |
| Coordinator viewing a draft | Return `404 EVENT_REQUEST_NOT_FOUND`. |
| Coordinator viewing another current Sprint 1 status | Allow only when the explicit coordinator-visibility policy permits access to that request. This includes `APPROVED` and `REJECTED`. |
| Coordinator who fails the visibility policy, or a missing request | Return the same `404 EVENT_REQUEST_NOT_FOUND` response. |

Viewing permission and decision permission are separate checks. A successful detail read does not establish permission to edit or approve/reject. Role alone does not grant coordinator access, and this proposal does not choose an assigned-only or all-coordinators policy. Ryan's adapter must supply the verified application identity; the shared route remains unavailable until authentication and the required policies are wired in.

An approved or rejected request leaves the pending-review queue but remains readable by its organiser and any coordinator who still passes the visibility policy. Refreshing after a decision should show the recorded outcome, without offering another initial decision. The queue's status filter must not be reused as the detail-access rule.

| Response | Meaning |
| --- | --- |
| `200` | The shared request detail, including nullable `review` and caller-specific `actions`. |
| `401 AUTHENTICATION_REQUIRED` | Credentials are absent or invalid. |
| `403 VIEW_FORBIDDEN` | The verified account is neither an event organiser nor an event coordinator. |
| `400 INVALID_EVENT_REQUEST_ID` | An authenticated, supported caller supplied an ID that is not a UUID. |
| `404 EVENT_REQUEST_NOT_FOUND` | The request is missing or unavailable to this caller; use the same code and message in both cases. |
| `500 INTERNAL_ERROR` | Authentication verification or persistence failed unexpectedly; return the existing generic error envelope. |

Check authentication and supported role before looking up the request. All detail responses use `Cache-Control: no-store`. Error responses use the existing JSON error envelope.

### Integration and verification

After the contract review, implement this in small commits:

1. Consolidate the detail route and service, preserving the existing flat event fields. Keep the queue's filtering separate and remove the duplicate GET registration when combining branches. Update KAN-33's API section and dated scope/collision notes when adopting this proposal, preserving the previous assumptions as superseded history.
2. Connect the draft, coordinator and status pages to the shared response. Separate outcome visibility from action availability in `ReviewDecisionPanel`: its current `canReview` prop also gates the outcome display, so binding it directly to `actions.canMakeInitialDecision` would hide saved decisions. Refresh the shared detail after saving or an uncertain write result, and show the latest status and outcome.
3. Test the composed Express app with fixture authentication and explicit policies: owned drafts, owned submitted/decided requests, unrelated organisers, permitted and denied coordinators, coordinator access to drafts, unsupported roles, missing requests, invalid IDs and missing/invalid credentials. Verify the same response shape across roles and statuses, action flags, and non-disclosing error responses. Database integration tests should verify decision persistence and a successful detail refresh after both approval and rejection. UI tests should keep a recorded outcome visible when decision actions are disabled.

These are planned checks, not completed test evidence. Ryan's authentication integration and the team review of the access policy remain separate dependencies.

## KAN-36 review endpoint: authentication integration pending

The handler for `POST /api/events/:id/reviews` is implemented. It is mounted only when `createApp` receives `reviews` dependencies containing the database pool, an `authenticate(request)` function and a `canReviewRequest(reviewer, event, client)` policy. The normal server does not supply these dependencies yet, so this route currently returns the standard `404 NOT_FOUND` response when running `npm run dev`.

Ryan's authentication adapter must verify credentials and return the corresponding `app_users` ID and trusted application role. It returns `null` for absent or invalid credentials and throws on verification-service failures. An identity provider's subject must be mapped to the application account; it is not assumed to equal `app_users.id`. Browser-supplied identity, role fields and unverified token contents cannot establish access.

The reviewer must be an event coordinator. The request-specific policy then runs inside the saving transaction against the locked event row. Coordinator assignment and delegation rules must be agreed before supplying this policy. There is no default policy that grants access. Tests use a fixture-only assigned-coordinator policy and synthetic verified identities; they do not implement or verify live login.

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
