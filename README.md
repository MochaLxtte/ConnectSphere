# ConnectSphere

IS212 event planning and venue booking project, built with **Vue 3 + TypeScript, Express 5 + TypeScript, Supabase PostgreSQL and Supabase Auth** in a modular monorepo.

The frozen release supports requests and drafts, Lead allocation/handover, coordinator review, venue and equipment arrangements, event confirmation, safety review/remediation, attendee registration, changes, notifications, cancellation and completion. Server policies enforce the role and current relationship to each event. See the [design report](docs/architecture/README.md) for responsibilities and the [testing report](docs/testing/README.md) for actual verification and limitations.

**Documentation editors:** start at the [team documentation home](docs/README.md), choose one of six workstreams and use the [single submission checklist](docs/submission/checklist.md). Source code, SQL, tests and configuration are frozen after **1 November 2026, 23:59 SGT**. Subsequent documentation work is on `docs/release-freeze-evidence`; formal release acceptance remains separate from the editing freeze.

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

When joining the team's existing Supabase project, confirm its schema with Arvin before applying migrations or changing seed data. Provision each login in Supabase Auth and link it to `app_users.supabase_user_id` with the correct application role. Seed profiles alone do not create login credentials. The seed also adds fictional venues once migration 004 has run, ready for the Sprint 2 venue stories. It does not create equipment samples; existing data is preserved.

**Migration history:** the frozen release includes migrations **001–023**. Shared Supabase application through 023 and focused connected retests are recorded on 1 November. Consult the [database guide](database/README.md#shared-schema-and-migrations) and [023 rollout evidence](database/README.md#1-november-2026--shared-023-rollout-and-connected-retests). Use the existing migration runner for an agreed fresh environment; never rename applied files or ledger entries. Coordinate any shared-database operation with the team. The code freeze does not authorise new SQL changes.

**Role provisioning:** migration [007](database/migrations/007_add_coordinator_lead.sql) defines the Lead role. Provision the Lead through a trusted administrator by mapping their Supabase Auth user to an `app_users` profile with role `EVENT_COORDINATOR_LEAD`. Roles come from the application profile, not sign-in metadata or client input. Verify the Lead's queue access with the matching API and frontend before relying on the changed submission flow. The existing `app_users.coordinator_available` flag defaults to `false`; opt in only provisioned `EVENT_COORDINATOR` profiles ready to receive allocations. This flag controls the Lead's selectable targets. Submission succeeds without an available coordinator, while allocation requires a currently available target. Do not opt in fictional seed profiles. Follow the [coordinated rollout](database/README.md#kan-79-lead-assignment-rollout), then start the application:

```sh
npm run dev
```

Open **http://localhost:5173**. The dashboard checks the API and migrated database. The API listens at http://127.0.0.1:3000; Vite proxies `/api` to it. Keep the development terminal running and stop it with Ctrl+C. Supabase hosts the database; it does not require a local database container.

On Windows, use `npm.cmd` / `npx.cmd` if PowerShell blocks npm's `.ps1` wrapper.

Never commit `.env` or place database passwords in frontend `VITE_*` variables. The example connection contains placeholders that must be replaced locally. If changing the API port, change `API_PORT` and `API_PROXY_TARGET` together. Restart the dev servers after environment changes. Coordinate migrations and seed changes with Arvin because teammates using the same Supabase project share its database.

## Repository map

```text
frontend/                  Vue application, navigation, API client, component tests
backend/src/modules/       Auth, events, venues, equipment, registrations, safety and notifications
backend/src/               HTTP application, configuration, database pool
backend/test/              API and environment tests, grouped by module
database/                  SQL migrations, seed and database integration tests
tests/e2e/                 Browser workflow and interaction checks; mostly substituted APIs
docs/requirements/         20 core features, customer questions, traceability
docs/architecture/         Current design report, C4 exports and detailed API contract
docs/testing/              Testing report, separate specifications/executions and evidence
docs/scrum/                Sprint records, Definition of Done and Scrum evidence
docs/submission/           Course deliverable checklist
scripts/                   Cross-platform setup
.github/workflows/         CI
```

See [architecture](docs/architecture/README.md) and the [API contract](docs/architecture/api-contract.md) for implemented endpoints, ownership boundaries and documented workflow rules. Dependencies are locked in one root `package-lock.json`; run package installation from the root. Add a workspace dependency with, for example, `npm install <package> -w @connectsphere/backend`.

## Team handoff

Use the [documentation workstream guide](docs/README.md) for file-by-file editing responsibilities. Historical sprint records are indexed in the [Scrum overview](docs/scrum/README.md); original criteria and customer changes remain distinguishable in the [requirements guide](docs/requirements/README.md). Do not use old progress checkpoints as the current status.

## Checks

```sh
npm run check
npm run test:coverage
```

`check` runs TypeScript checks (including database/tooling), workspace tests, browser-harness isolation checks, and both builds. Coverage has enforced regression floors, with 100% gates for selected authentication/navigation boundaries. It does not establish completion or acceptance of all 20 business features. See [coverage scope and exceptions](docs/testing/README.md#coverage-gates-and-remaining-exceptions--1-november-2026).

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

For combined backend coverage, keep the dedicated `TEST_DATABASE_URL` above and run `npm run test:coverage:backend`. This instruments backend source across unit/HTTP **and** real PostgreSQL tests in one run, including all database integration tests. The isolated and combined percentages are reported separately.

Browser tests also require that explicit loopback `TEST_DATABASE_URL`, with a database name ending in `_test`. They migrate/seed that test database automatically and start their own API on 4311 and static frontend on 4173; both ports must be free. They never reuse the developer's 3000/5173 servers or fall back to a shared `DATABASE_URL`.

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite uses two Chromium workers and zero retries. It covers infrastructure and browser workflows; most domain scenarios substitute API/auth responses and therefore establish frontend integration, not full connected E2E acceptance. PostgreSQL tests separately exercise persistence, authorization, rollback and concurrency. GitHub Actions runs checks, both coverage measurements and the browser suite with its own PostgreSQL service, uploading evidence for 14 days. Preserve the release report in the repository before artifact expiry. See [testing guidance](docs/testing/README.md) and [test evidence](docs/testing/test-evidence.md) for the separate real-authentication manual E2E results.

## Join the repository

Clone [ConnectSphere](https://github.com/MochaLxtte/ConnectSphere) and follow the setup above. [AGENTS.md](AGENTS.md) is the master guide. Instructor repository access and the actual independent-review/release qualifications are recorded in [submission folder 7](docs/submission/7/README.md).

## Course deliverables

The [submission checklist](docs/submission/checklist.md) maps the requirements to folders **1–7**. Keep editing the repository sources; `npm run submission:prepare` assembles a draft numbered snapshot in ignored `dist/submission-.../`. Inspect it before final packaging. The command does not create missing evidence, certify acceptance or perform an eLearn submission.

## Project context

The first release covers 20 core features and six required Week 7 customer changes. The [change register](docs/requirements/change-requests.md) records the 2 October receipt and later planning decisions. [Sprint 1 planning](docs/scrum/sprint-01/planning.md) retains the initial decisions, while the [design report](docs/architecture/README.md) explains the frozen implementation. The team works role-agnostically; formal accountabilities are recorded in the Scrum records.

## Historical setup and development checkpoints

Earlier progress notes, superseded setup checkpoints and the pre-cleanup README are retained in the [historical README](docs/archive/2026-11-05/root-README.md). Their dates and limitations remain unchanged.

<details>
<summary>Links to earlier sections (historical reference)</summary>

<a id="kan-9-equipment-availability--26-october-2026"></a>

- [KAN-9 equipment availability — 26 October 2026](docs/archive/2026-11-05/root-README.md#kan-9-equipment-availability--26-october-2026) — retained historical section.

<a id="kan-26-equipment-reservations--26-october-2026"></a>

- [KAN-26 equipment reservations — 26 October 2026](docs/archive/2026-11-05/root-README.md#kan-26-equipment-reservations--26-october-2026) — retained historical section.

</details>
