# ConnectSphere API scaffold

Express 5, TypeScript, and PostgreSQL on Node.js 24. Run dependency installation and database setup from the repository root using the root README, then run `npm run dev --workspace @connectsphere/backend`. `npm run build --workspace @connectsphere/backend` produces `dist/`; `npm run start --workspace @connectsphere/backend` starts that build.

`src/config/env.ts` loads the repository root `.env` in both source and compiled execution, regardless of the shell's working directory. Existing environment variables take precedence. `DATABASE_URL` is required at server startup; `API_PORT` defaults to `3000`, `API_HOST` to `127.0.0.1`, and `NODE_ENV` to `development`. Bind to `0.0.0.0` explicitly when a container or another machine must reach the API.

## Available endpoints

| Method and path                                                       | Response                                                                                                                                 | Purpose                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/health`                                                     | `200 {"status":"ok","service":"connectsphere-api"}`                                                                                      | Confirms the HTTP process responds; does not access the database.       |
| `GET /api/health/ready`                                               | `200 {"status":"ok","database":"connected"}`                                                                                             | Confirms the scaffold migration's metadata row exists with version `1`. |
| `GET /api/health/ready` when the database or migration is unavailable | `503 {"error":{"code":"DATABASE_UNAVAILABLE","message":"Database is not ready. Run the migrations and check the database connection."}}` | Helps distinguish a live server from an initialized database.           |

Other endpoints return a JSON `NOT_FOUND` error with HTTP 404. Malformed JSON returns `INVALID_JSON`/400, JSON bodies above 100kb return `PAYLOAD_TOO_LARGE`/413, and unexpected failures return `INTERNAL_ERROR`/500. Client responses omit stacks and database connection details. Helmet adds default security headers. The API intentionally has no permissive CORS policy; the frontend development proxy and a same-origin production reverse proxy can route `/api` requests.

Readiness checks only the scaffold metadata and connection, not every table or future migration. Extend the probe if a later sprint introduces a stronger readiness requirement.

## Team extension points

- `src/app.ts`: app composition, health endpoints, and error responses. Tests can inject a database without opening a real connection.
- `src/server.ts`: environment loading, listener startup, and graceful shutdown.
- `src/db/pool.ts`: one shared PostgreSQL pool with bounded connection/query timeouts.
- `src/modules/auth/`: five roles and public user types; auth teammate implements verified identity and authorization.
- `src/modules/events/`: draft fields and proposed status types; event teammate implements validation and persistence.

Authentication and event business routes are not mounted. This starter does not complete sprint stories. Agree endpoint contracts before implementation, enforce server-side role and ownership checks before exposing writes, and keep password hashes out of public user representations. The domain directory READMEs describe the remaining work.

Run `npm run typecheck --workspace @connectsphere/backend`, `npm test --workspace @connectsphere/backend`, and `npm run test:coverage --workspace @connectsphere/backend` from the root. Unit tests use a fake database; root integration tests exercise the actual migration and PostgreSQL connection.
