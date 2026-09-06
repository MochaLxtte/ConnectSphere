# API contract

## Implemented endpoints

All responses are JSON. Development uses a same-origin Vite proxy at `/api`.

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

These are coordination proposals, not implemented APIs. Refine them together before independent UI/API implementation; add an OpenAPI file when request validation and authentication are settled.

| Owner                 | Method / route                                                      | Purpose                                                     |
| --------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Dev 1, KAN-25         | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Establish, end and inspect authenticated identity           |
| Dev 2, KAN-31 / KAN-4 | `POST /api/events`                                                  | Save an incomplete draft for the authenticated organiser    |
| Dev 3, KAN-34         | `GET /api/events/:id`, `PATCH /api/events/:id`                      | Retrieve and update an owned draft                          |
| Dev 3, KAN-6          | `POST /api/events/:id/submit`                                       | Validate submission and transition atomically               |
| Dev 4, KAN-33         | `GET /api/events`                                                   | Filtered, paginated list scoped to the actor's relationship |
| Dev 4, KAN-27         | `POST /api/events/:id/clarifications`                               | Request clarification and make it visible to the organiser  |
| Dev 5, KAN-36         | `POST /api/events/:id/reviews`                                      | Record an approval/rejection and update status atomically   |
| Dev 5, KAN-16         | `GET /api/events/:id`                                               | Show the current visible status and decision                |

Use camelCase in JSON and snake_case in SQL. IDs are UUID strings. Dates over HTTP should be ISO 8601 timestamps with an offset; PostgreSQL stores `timestamptz`. The expected display timezone is provisionally Asia/Singapore. Missing draft fields are nullable; PATCH omission should mean unchanged, and explicit null should clear an allowed field. Confirm these conventions before implementing handlers.

Never accept organiser identity, acting role, arbitrary status, or reviewer identity from an untrusted request body. Derive them from the authenticated session and service action. Filter in repositories as well as enforcing service access rules. Determine coordinator visibility and assignment policy before exposing a review queue. Client navigation is not access control.

Agree on an authentication strategy, runtime validation, 401/403/404 behavior, concurrency handling, and error details as part of KAN-25 and the first event stories. For significant contract changes, update this document and the corresponding UI, service and integration test in the same PR.
