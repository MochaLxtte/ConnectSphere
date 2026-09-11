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
| Kai Jie, KAN-34       | `GET /api/events/:id`, `PATCH /api/events/:id`                      | Retrieve and update an owned draft                          |
| Kai Jie, KAN-6        | `POST /api/events/:id/submit`                                       | Validate submission and transition atomically               |
| Irfan, KAN-33         | `GET /api/events`                                                   | Filtered, paginated list scoped to the actor's relationship |
| Irfan, KAN-27         | `POST /api/events/:id/clarifications`                               | Request clarification and make it visible to the organiser  |
| Tristan, KAN-36       | `POST /api/events/:id/reviews`                                      | Record an approval/rejection and update status atomically   |
| Tristan, KAN-16       | `GET /api/events/:id`                                               | Show the current visible status and decision                |

Use camelCase in JSON and snake_case in SQL. IDs are UUID strings. Dates over HTTP should be ISO 8601 timestamps with an offset; PostgreSQL stores `timestamptz`. The expected display timezone is provisionally Asia/Singapore. Missing draft fields are nullable; PATCH omission should mean unchanged, and explicit null should clear an allowed field. Confirm these conventions before implementing handlers.

Never accept organiser identity, acting role, arbitrary status, or reviewer identity from an untrusted request body. Derive them from the authenticated session and service action. Filter in repositories as well as enforcing service access rules. Determine coordinator visibility and assignment policy before exposing a review queue. Client navigation is not access control.

Agree on an authentication strategy, runtime validation, 401/403/404 behavior, concurrency handling, and error details as part of KAN-25 and the first event stories. For significant contract changes, update this document and the corresponding UI, service and integration test in the same PR.

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
