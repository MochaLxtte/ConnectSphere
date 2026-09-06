# ConnectSphere

Development scaffold for the IS212 event planning and venue booking project. The team selected **Vue 3 + TypeScript, Express 5 + TypeScript, and PostgreSQL 17**, organised as a monorepo with a modular backend.

The starter runs a web application, an API, and a database connection check. It includes initial migrations, fictional seed data, automated checks, CI, and team handoff documentation. **Business stories such as login, event creation, submission, review, booking and registration are not implemented.** The visible feature pages are clearly labelled placeholders; seed users cannot log in.

## Start here

Prerequisites: [Node.js 24 LTS](https://nodejs.org/en/download), npm bundled with Node, Git, and Docker Desktop with its Linux engine running. Alternatively, use an existing PostgreSQL 17 database and configure `DATABASE_URL`.

Run these commands from the repository root, one at a time:

```sh
npm ci
npm run setup
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:5173**. The dashboard checks the API and migrated database. The API listens at http://127.0.0.1:3000; Vite proxies `/api` to it. Keep the development terminal running. Stop it with Ctrl+C; `npm run db:down` stops PostgreSQL while retaining its data volume.

On Windows, use `npm.cmd` / `npx.cmd` if PowerShell blocks npm's `.ps1` wrapper.

`npm run setup` creates `.env` without overwriting an existing file. The sample credentials are for local development. Never commit `.env`; keep configurable names/defaults in `.env.example`. If port 5432 is occupied, change both `POSTGRES_PORT` and the port in `DATABASE_URL`. If changing the API port, change `API_PORT` and `API_PROXY_TARGET` together. Restart the dev servers after environment changes. See [database setup](database/README.md) for volume and migration behavior.

## Repository map

```text
frontend/                  Vue application, navigation, API client, component tests
backend/src/modules/       Auth and event domain starting points
backend/src/               HTTP application, configuration, database pool
backend/test/              API and environment tests
database/                  SQL migrations, seed, database integration test
tests/e2e/                 Browser smoke tests
docs/requirements/         20 core features, customer questions, traceability
docs/architecture/         C4 context/container views, ERD, API proposals
docs/testing/              Test plan and planned business test cases
docs/scrum/                Workstreams, Definition of Done, evidence templates
docs/submission/           Course deliverable checklist
scripts/                   Cross-platform setup
.github/workflows/         CI
```

See [architecture](docs/architecture/README.md) and the [API contract](docs/architecture/api-contract.md) for implemented endpoints and proposed Sprint 1 interfaces. Dependencies are locked in one root `package-lock.json`; run package installation from the root. Add a workspace dependency with, for example, `npm install <package> -w @connectsphere/backend`.

## Team handoff

Start with the [Sprint 1 plan](docs/scrum/sprint-01/README.md). The following workstreams were agreed at the planning meeting on 6 September 2026:

| Workstream | Jira items              | Starting areas                                |
| ---------- | ----------------------- | --------------------------------------------- |
| Dev 1      | KAN-25                  | Backend auth module and frontend auth feature |
| Dev 2      | KAN-31, KAN-4           | Event creation and draft saving               |
| Dev 3      | KAN-34, KAN-6           | Draft editing, validation and submission      |
| Dev 4      | KAN-33, KAN-27          | Coordinator review and clarification          |
| Dev 5      | KAN-36, KAN-16          | Decisions and visible event status            |
| Dev 6      | KAN-24, optional KAN-30 | Database, schema coordination and integration |

Read [CONTRIBUTING.md](CONTRIBUTING.md) before the first feature branch. Resolve authentication, event field validation, coordinator visibility and transitions using the [open questions](docs/requirements/assumptions-and-questions.md). Proposed acceptance criteria and implementation details remain subject to team review and customer clarification.

## Checks

```sh
npm run check
npm run test:coverage
```

`check` runs TypeScript checks (including database/tooling), workspace tests, and both builds. Coverage reports measure the scaffold code; they do not establish coverage of the 20 business features.

For database integration tests, create a separate local test database once:

```sh
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

Adjust these values if you changed `.env`. Integration tests require `TEST_DATABASE_URL`, create their own schema, and remove only that schema afterward. Browser smoke tests start the API/frontend automatically; first ensure the normal development database is running and migrated:

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite covers infrastructure and placeholder navigation. Expand tests around real acceptance criteria as features are delivered. GitHub Actions repeats the checks with its own PostgreSQL service and uploads coverage/browser evidence. See [testing guidance](docs/testing/README.md).

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

The first release covers 20 core features across connected event workflows. Sprint 1 decisions are recorded in the [planning notes](docs/scrum/sprint-01/planning.md). The team selected Vue, Express and PostgreSQL; the initial architecture and schema provide a starting point for implementation.

Team members and Scrum roles are maintained in the Sprint 1 plan. No public distribution license has been chosen for this coursework project.
