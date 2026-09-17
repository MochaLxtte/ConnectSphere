# ConnectSphere

IS212 event planning and venue booking project, built with **Vue 3 + TypeScript, Express 5 + TypeScript, Supabase PostgreSQL and Supabase Auth**, organised as a monorepo with a modular backend.

The application supports sign-in, an assigned coordinator's review queue, request details and approval/rejection. Organisers can list their requests across all statuses, open read-only details and refresh the status and recorded outcome. The backend also supports owned-draft editing and submission. Organiser creation and draft-editing interfaces remain unfinished; draft creation and clarification endpoints are not implemented. Venue, equipment, registration and notification workflows remain for later work. Database migrations, fictional seed data, automated checks, CI and team documentation support development.

## Start here

Prerequisites: [Node.js 24 LTS](https://nodejs.org/en/download), npm bundled with Node, Git, and access to the team's Supabase development project. Docker is optional for isolated local database testing.

Run these commands from the repository root, one at a time:

```sh
npm ci
npm run setup
```

Configure the root `.env` with the database connection and TLS settings in [database setup](database/README.md), plus `SUPABASE_URL`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for [authentication](backend/src/modules/auth/README.md). Use the project's publishable key for `VITE_SUPABASE_ANON_KEY`; never a privileged secret key. Leave `SUPABASE_JWT_SECRET` blank for the project's asymmetric signing keys. `npm run setup` creates `.env` without overwriting an existing file, so existing clones must add missing settings manually.

For a fresh database, initialise the schema and fictional profiles:

```sh
npm run db:migrate
npm run db:seed
```

When joining the team's existing Supabase project, confirm its schema with Arvin before applying migrations or changing seed data. Provision each login in Supabase Auth and link it to `app_users.supabase_user_id` with the correct application role. Seed profiles alone do not create login credentials. Then start the application:

```sh
npm run dev
```

Open **http://localhost:5173**. The dashboard checks the API and migrated database. The API listens at http://127.0.0.1:3000; Vite proxies `/api` to it. Keep the development terminal running and stop it with Ctrl+C. Supabase hosts the database; it does not require a local database container.

On Windows, use `npm.cmd` / `npx.cmd` if PowerShell blocks npm's `.ps1` wrapper.

Never commit `.env` or place database passwords in frontend `VITE_*` variables. The example connection contains placeholders that must be replaced locally. If changing the API port, change `API_PORT` and `API_PROXY_TARGET` together. Restart the dev servers after environment changes. Coordinate migrations and seed changes with Arvin because teammates using the same Supabase project share its database.

## Repository map

```text
frontend/                  Vue application, navigation, API client, component tests
backend/src/modules/       Authentication, event services and HTTP routes
backend/src/               HTTP application, configuration, database pool
backend/test/              API and environment tests
database/                  SQL migrations, seed and database integration tests
tests/e2e/                 Browser checks, organiser status and coordinator decisions
docs/requirements/         20 core features, customer questions, traceability
docs/architecture/         C4 views, ERD and implemented/proposed API contracts
docs/testing/              Test plan, acceptance cases and evidence records
docs/scrum/                Workstreams, Definition of Done, evidence templates
docs/submission/           Course deliverable checklist
scripts/                   Cross-platform setup
.github/workflows/         CI
```

See [architecture](docs/architecture/README.md) and the [API contract](docs/architecture/api-contract.md) for implemented endpoints and proposed Sprint 1 interfaces. Dependencies are locked in one root `package-lock.json`; run package installation from the root. Add a workspace dependency with, for example, `npm install <package> -w @connectsphere/backend`.

## Team handoff

Start with the [Sprint 1 plan](docs/scrum/sprint-01/README.md). The following workstreams were agreed at the planning meeting on 6 September 2026:

| Developer | Jira items              | Responsibilities                                                   |
| --------- | ----------------------- | ------------------------------------------------------------------ |
| Ryan      | KAN-25                  | Authentication, authorisation, protected routes and permission checks |
| Ernest    | KAN-31, KAN-4           | Event form, request creation and draft saving                       |
| Kai Jie   | KAN-34, KAN-6           | Draft retrieval/editing, validation and submission                  |
| Irfan     | KAN-33, KAN-27          | Coordinator review, clarification requests and organiser visibility |
| Tristan   | KAN-36, KAN-16          | Approval/rejection workflow and organiser-facing status             |
| Arvin     | KAN-24                  | Initial database, schema, configuration and seed data                |

After database setup, Arvin supports cross-feature integration, end-to-end testing and resolving integration issues with the feature owners.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before the first feature branch. Sprint 1 uses pre-provisioned Supabase accounts and assigned-coordinator access. Account administration, event field validation, assignment/delegation and later transitions still have [open customer questions](docs/requirements/assumptions-and-questions.md). Team assumptions remain distinct from customer clarifications.

## Checks

```sh
npm run check
npm run test:coverage
```

`check` runs TypeScript checks (including database/tooling), workspace tests, and both builds. Coverage reports measure the included code; they do not establish completion or acceptance coverage of all 20 business features.

For database integration tests, use a dedicated test database. The optional Docker Compose service provides PostgreSQL 17 locally without using the team's Supabase data. With Docker Desktop's Linux engine running:

```sh
npm run db:up
docker compose exec -T db createdb -U connectsphere connectsphere_test
```

Then set its URL and run the test. PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://connectsphere:connectsphere_local@127.0.0.1:5432/connectsphere_test'
npm run test:integration
```

macOS/Linux:

```sh
TEST_DATABASE_URL=postgresql://connectsphere:connectsphere_local@127.0.0.1:5432/connectsphere_test npm run test:integration
```

Adjust the local credentials if you changed the Compose settings. Integration tests require `TEST_DATABASE_URL`, create their own schema, and remove only that schema afterward. See [database setup](database/README.md) for test TLS settings and optional local development. `npm run db:down` stops the local service and retains its data volume.

Browser smoke tests start the API/frontend automatically; first ensure the configured development database is reachable and migrated:

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite covers infrastructure, navigation, queue recovery, organiser request lists/details and coordinator decisions using API response fixtures. PostgreSQL integration tests exercise persistence and access rules in an isolated database. GitHub Actions repeats the checks with its own PostgreSQL service and uploads coverage/browser evidence. See [testing guidance](docs/testing/README.md) and [test evidence](docs/testing/test-evidence.md) for the distinction between automated checks and hosted acceptance testing.

Hosted approval and rejection checks passed, including the saved review row, outcome after reload and removal from the pending queue. See the [test evidence](docs/testing/test-evidence.md) for the dated results and remaining organiser-workflow checks. KAN-16's `/events` page uses `GET /api/events?scope=all` to show owned request names, readable statuses and Singapore-time updates. Request titles link to `/events/:id`, which reads the existing shared detail API and displays the status, saved outcome, reason and recorded time. Hosted organiser list/detail acceptance remains pending.

## Join the repository

Clone [ConnectSphere](https://github.com/MochaLxtte/ConnectSphere), then follow the setup instructions above:

```sh
git clone https://github.com/MochaLxtte/ConnectSphere.git
cd ConnectSphere
```

Invite teammates and configure `main` to require PR review and the CI `verify` check once the first workflow has run. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for feature branches and reviews.

## Course deliverables

The [submission checklist](docs/submission/checklist.md) maps the submission requirements to folders **1–7**, with project records and outstanding evidence. Keep working records in `docs/`; run `npm run submission:prepare` to assemble a fresh numbered snapshot in `dist/submission-.../`. Complete the checklist before creating the final ZIP. Sprint 1 records are in [docs/scrum/sprint-01](docs/scrum/sprint-01/README.md).

## Project context

The first release covers 20 core features across connected event workflows. Sprint 1 decisions are recorded in the [planning notes](docs/scrum/sprint-01/planning.md). Supabase hosts PostgreSQL and handles sign-in; Express verifies sessions and enforces application roles, ownership and coordinator assignment.

Team members and Scrum roles are maintained in the Sprint 1 plan. No public distribution license has been chosen for this coursework project.
