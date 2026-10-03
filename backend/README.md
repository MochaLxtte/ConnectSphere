# ConnectSphere API

Express 5, TypeScript, and Supabase PostgreSQL on Node.js 24. Run dependency installation and database setup from the repository root using the root README, then run `npm run dev --workspace @connectsphere/backend`. `npm run build --workspace @connectsphere/backend` produces `dist/`; `npm run start --workspace @connectsphere/backend` starts that build.

`src/config/env.ts` loads the repository root `.env` in both source and compiled execution, regardless of the shell's working directory. Existing environment variables take precedence. `DATABASE_URL` is required at server startup; `API_PORT` defaults to `3000`, `API_HOST` to `127.0.0.1`, and `NODE_ENV` to `development`. Bind to `0.0.0.0` explicitly when a container or another machine must reach the API.

The API connects to Supabase through `pg`; event data continues to pass through Express. Configure `DATABASE_URL` with `sslmode=verify-full` and disable the unused Data API as described in [database setup](../database/README.md). The optional `MIGRATION_DATABASE_URL` is used only by migrations and seeds. No Supabase API key is needed for this SQL connection. Supabase Auth handles sign-in; Express verifies its tokens using `SUPABASE_URL` and maps the subject to `app_users.supabase_user_id`. See [authentication setup](src/modules/auth/README.md).

## Available endpoints

| Method and path                                                       | Response                                                                                                                                 | Purpose                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/health`                                                     | `200 {"status":"ok","service":"connectsphere-api"}`                                                                                      | Confirms the HTTP process responds; does not access the database.       |
| `GET /api/health/ready`                                               | `200 {"status":"ok","database":"connected"}`                                                                                             | Confirms the scaffold migration's metadata row exists with version `1`. |
| `GET /api/health/ready` when the database or migration is unavailable | `503 {"error":{"code":"DATABASE_UNAVAILABLE","message":"Database is not ready. Run the migrations and check the database connection."}}` | Helps distinguish a live server from an initialized database.           |

The normal server also mounts these business routes:

| Method and path | Current behaviour |
| --- | --- |
| `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | Verify a Supabase token, establish/read/end the application session. |
| `GET /api/events` | An organiser's own drafts, or the assigned coordinator's pending queue; organiser `?scope=all` includes all owned statuses. |
| `GET /api/events/:id` | One shared detail response with status, recorded review and caller-specific actions. |
| `PATCH /api/events/:id` | Validate and update an organiser's own draft. |
| `POST /api/events/:id/submit` | Validate an owned draft and change it to `SUBMITTED`. |
| `POST /api/events/:id/reviews` | Record an assigned coordinator's initial decision and matching status in one transaction. |
| `GET /api/venues/availability?from=…&to=…` | KAN-51 calendar for Event Coordinators, Venue Staff and Technical Support Staff: active venues with their confirmed (`APPROVED`) bookings and blocked periods in a window of up to 31 days. |

Draft creation and clarification routes are not implemented. KAN-16's organiser list uses `GET /api/events?scope=all`, and its read-only detail page uses the shared detail endpoint. Recorded browser checks cover status labels, outcome display and refresh, signed-out access and other-organiser isolation. The final submission-to-status check awaits KAN-6 frontend integration; see [test evidence](../docs/testing/test-evidence.md). The [API contract](../docs/architecture/api-contract.md) distinguishes current routes from planned ones and defines access/error responses.

Unknown endpoints return a JSON `NOT_FOUND` error with HTTP 404. Malformed JSON returns `INVALID_JSON`/400, JSON bodies above 100kb return `PAYLOAD_TOO_LARGE`/413, and unexpected failures return `INTERNAL_ERROR`/500. Client responses omit stacks and database connection details. Helmet adds default security headers. The API intentionally has no permissive CORS policy; the frontend development proxy and a same-origin production reverse proxy can route `/api` requests.

Readiness checks only the scaffold metadata and connection, not every table or future migration. Extend the probe if a later sprint introduces a stronger readiness requirement.

## Team extension points

- `src/app.ts`: app composition, health endpoints, and error responses. Tests can inject a database without opening a real connection.
- `src/runtime-app.ts`: normal-server wiring for the shared session verifier and explicit coordinator access policies; integration tests use the same composition.
- `src/server.ts`: environment loading, listener startup, and graceful shutdown.
- `src/db/pool.ts`: one shared PostgreSQL pool with bounded connection/query timeouts.
- `src/modules/auth/`: Supabase token verification, application-user mapping, session routes and five role contracts.
- `src/modules/events/`: draft editing/submission, queue and shared detail, decision validation, access policies and transactional persistence.
- `src/modules/venues/`: the read-only KAN-51 availability calendar (`availability.ts`, `availability-router.ts`), using the shared `workflowRoute` boundary for authentication, the role gate and error mapping.

Organisers can read their own requests; coordinators can read non-drafts assigned to their `app_users.id`. Initial approval/rejection requires `SUBMITTED` status with no recorded decision. The write rechecks assignment and state against a locked row. This assigned-coordinator rule is a Sprint 1 team assumption while assignment/delegation questions remain open. Keep these server checks when extending routes; frontend flags are only presentation guidance.

Run `npm run typecheck --workspace @connectsphere/backend`, `npm test --workspace @connectsphere/backend`, and `npm run test:coverage --workspace @connectsphere/backend` from the root. Unit tests use fake dependencies; `npm run test:integration` uses a dedicated PostgreSQL database to test migrations, persistence, authentication mappings and composed event routes. It does not use the shared Supabase project. Hosted acceptance progress is maintained in [test evidence](../docs/testing/test-evidence.md).
