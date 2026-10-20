# ConnectSphere

IS212 event planning and venue booking project, built with **Vue 3 + TypeScript, Express 5 + TypeScript, Supabase PostgreSQL and Supabase Auth**, organised as a monorepo with a modular backend.

The application supports sign-in, an assigned coordinator's review queue, request details and approval/rejection. Organisers can create and save drafts, edit and submit them, list their requests across all statuses, and refresh the status and recorded outcome. Draft rows open the editor; other rows open request details and the available planning actions.

The code includes Lead-controlled initial coordinator assignment and reassignment, review start, clarification and read-only status history. KAN-50 provides Venue Staff catalogue maintenance; KAN-51 provides an availability calendar for Event Coordinators, Venue Staff and Technical Support Staff; KAN-12 provides venue search. KAN-8 booking decisions, KAN-52 event-specific suitability assessment, KAN-53 booking submission and KAN-55 operational venue blocks are also implemented. Their remaining repairs and acceptance work are tracked in the [current sprint records](docs/scrum/README.md) and [product backlog](docs/requirements/product-backlog.md). Equipment, registration, notification and change-request workflows are **not** implemented merely because migration 004 supplies their tables. Automated results are recorded against their source commits in the [test evidence](docs/testing/test-evidence.md); code presence does not establish hosted acceptance or independent review.

**KAN-64 notifications — 21 October 2026:** signed-in users now have an in-app inbox at `/notifications` and a bell with an unread count. Request submission, clarification, review decisions, coordinator assignment and reassignment and venue booking decisions each notify the people the [decision log](docs/requirements/assumptions-and-questions.md) lists (a proposal to agree). Migration 008 must be applied to shared Supabase only after the team agrees. Manual/hosted checks and later-workflow triggers (KAN-80) are not done.

**KAN-79 implementation — 19 October 2026:** submitting a valid draft now leaves it `SUBMITTED` and unassigned, even when no coordinator is available. A trusted Event Coordinator Lead opens `/lead`, inspects basic allocation details and chooses an available Event Coordinator. The allocation atomically records one current coordinator and a manual history entry with the Lead as actor. `/lead/oversight` retains visibility of active assigned and unassigned events; Lead access does not grant review, approval, venue-planning or attendee access. The [API contract](docs/architecture/api-contract.md#kan-79-submission-and-lead-allocation--19-october-2026) defines the boundaries and conflicts. Coordinate migration 007 and a mapped Lead account before deploying this workflow. KAN-65 reassignment and KAN-64 notification delivery remain separate dependencies; KAN-79's related AC9 integration is still pending. The previous KAN-29 automatic-allocation policy and its [30 September schema verification](docs/testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) remain [historical records](backend/src/modules/events/README.md#kan-29-automatic-assignment-on-submission), superseded for new submissions by KAN-79.

**KAN-65 follow-up — 19 October 2026:** Leads can now reassign active events from `/lead/oversight/:id`, with a required reason and an expected assignment version. The handover preserves the event and prior decisions, ends the previous assignment and records the new one atomically. The former coordinator loses assignment-derived access; the new coordinator receives it. Stale pages must refresh, and selecting the already-current coordinator through the API returns an unchanged result without another history row. No new migration is needed. Migration 007 application and Coordinator Lead login have been reported successful; the deferred manual workflow tests, KAN-64 notifications and independent review remain outstanding. See the [current contract](docs/architecture/api-contract.md#kan-65-coordinator-reassignment--19-october-2026) and [verification record](docs/testing/test-evidence.md#19-october-2026--kan-65-coordinator-reassignment).

KAN-8 adds Venue Staff review at `/venue-bookings`: open an existing pending booking, inspect event requirements, approve or reject it, and retain the recorded outcome. The currently assigned Event Coordinator can read their bookings and decisions. Approval rechecks the event's approved status, active venue and current booking/block conflicts; it reserves the booking period without changing the event's status. No new migration is required. KAN-53 lets the assigned coordinator create pending requests from **Venue booking requests** on `/reviews/:id`; it refuses an interval already reserved by an approved booking or operational block. Follow the connected [submission checks](docs/testing/README.md#kan-53-hosted-verification) and [decision checks](docs/testing/README.md#kan-8-hosted-verification). Hosted acceptance remains pending.

KAN-52 lets the assigned coordinator open **Check venue suitability** from an event review at `/reviews/:id/venue-suitability`. It compares current event/venue information, explains failed or unknown checks, and lets the coordinator interpret free-text facilities, accessibility and layout requirements for that assessment. The result is Suitable, Unsuitable or Needs review; it neither reserves a venue nor changes the event. No database migration is needed. See [the contract](docs/architecture/api-contract.md#venue-suitability-kan-52-cf-11) and [hosted verification](docs/testing/README.md#kan-52-hosted-verification); executed evidence is recorded separately in [the test register](docs/testing/test-evidence.md).

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

When joining the team's existing Supabase project, confirm its schema with Arvin before applying migrations or changing seed data. Provision each login in Supabase Auth and link it to `app_users.supabase_user_id` with the correct application role. Seed profiles alone do not create login credentials. The seed also adds fictional venues once migration 004 has run, ready for the Sprint 2 venue stories. It no longer creates future-sprint equipment samples; existing data is preserved.

**Migration history:** Active files run consecutively from 001 to 007. The runner recognises the earlier files' historical names and checksums while preserving existing records and data. KAN-29 remains `006_automatic_coordinator_assignment.sql` (formerly `007_automatic_coordinator_assignment.sql`); `007_add_coordinator_lead.sql` is a distinct migration that adds the Lead role to the existing role constraint. The [30 September hosted verification](docs/testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) covered 001–006. Migration 007 has been tested in an isolated database; its shared application and successful Lead login were subsequently reported on 19 October. That setup report does not establish workflow acceptance or a fresh full-schema inspection. KAN-65 uses the existing assignment table and adds no migration. Use this branch's migration runner and coordinate any pending shared change with the team; see the [database guide](database/README.md#shared-schema-and-migrations).

**KAN-79 setup:** after coordinating migration [007](database/migrations/007_add_coordinator_lead.sql), provision the Lead through a trusted administrator by mapping their Supabase Auth user to an `app_users` profile with role `EVENT_COORDINATOR_LEAD`. Roles come from the application profile, not sign-in metadata or client input. Verify the Lead's queue access with the matching API and frontend before relying on the changed submission flow. The existing `app_users.coordinator_available` flag defaults to `false`; opt in only provisioned `EVENT_COORDINATOR` profiles ready to receive allocations. This flag controls the Lead's selectable targets. Submission succeeds without an available coordinator, while allocation requires a currently available target. Do not opt in fictional seed profiles. Follow the [coordinated rollout](database/README.md#kan-79-lead-assignment-rollout), then start the application:

```sh
npm run dev
```

Open **http://localhost:5173**. The dashboard checks the API and migrated database. The API listens at http://127.0.0.1:3000; Vite proxies `/api` to it. Keep the development terminal running and stop it with Ctrl+C. Supabase hosts the database; it does not require a local database container.

On Windows, use `npm.cmd` / `npx.cmd` if PowerShell blocks npm's `.ps1` wrapper.

Never commit `.env` or place database passwords in frontend `VITE_*` variables. The example connection contains placeholders that must be replaced locally. If changing the API port, change `API_PORT` and `API_PROXY_TARGET` together. Restart the dev servers after environment changes. Coordinate migrations and seed changes with Arvin because teammates using the same Supabase project share its database.

## Repository map

```text
frontend/                  Vue application, navigation, API client, component tests
backend/src/modules/       Authentication, event and venue services and HTTP routes
backend/src/               HTTP application, configuration, database pool
backend/test/              API and environment tests, grouped by module
database/                  SQL migrations, seed and database integration tests
tests/e2e/                 Browser checks for events, venue calendar and booking decisions
docs/requirements/         20 core features, customer questions, traceability
docs/architecture/         C4 views, ERD and implemented/proposed API contracts
docs/testing/              Test plan, acceptance cases and evidence records
docs/scrum/                Workstreams, Definition of Done, evidence templates
docs/submission/           Course deliverable checklist
scripts/                   Cross-platform setup
.github/workflows/         CI
```

See [architecture](docs/architecture/README.md) and the [API contract](docs/architecture/api-contract.md) for implemented endpoints, ownership boundaries and provisional workflow rules. Dependencies are locked in one root `package-lock.json`; run package installation from the root. Add a workspace dependency with, for example, `npm install <package> -w @connectsphere/backend`.

## Team handoff

Start with the [current sprint administration](docs/scrum/README.md), [Sprint 3 plan](docs/scrum/sprint-03/README.md), [selected stories and acceptance plan](docs/scrum/sprint-03/sprint-backlog.md), and [product backlog](docs/requirements/product-backlog.md). The current release allocation is **63 SP each for Sprints 3 and 4**. KAN-79 and KAN-65 are In Progress, with automated verification recorded on 19 October; deferred manual checks, KAN-64 notification integration and independent review remain outstanding. Other story statuses and ownership retain their latest dated snapshots. Sprint 3 is administratively Active beyond its configured 17 October end; these implementations are not recorded as completion inside that window. [Sprint 2's original 43-point baseline](docs/scrum/sprint-02/README.md) remains **35 new plus eight carried from Sprint 1**, with five unfinished stories carried into Sprint 3 at their full 19 points. Historical acceptance and velocity gaps remain explicit.

The following **historical Sprint 1 workstreams** were agreed on 6 September 2026. They provide ownership context and do not assign current sprint work:

| Developer | Jira items              | Responsibilities                                                   |
| --------- | ----------------------- | ------------------------------------------------------------------ |
| Ryan      | KAN-25                  | Authentication, authorisation, protected routes and permission checks |
| Ernest    | KAN-31, KAN-4           | Event form, request creation and draft saving                       |
| Kai Jie   | KAN-34, KAN-6           | Draft retrieval/editing, validation and submission                  |
| Irfan     | KAN-33, KAN-27          | Coordinator review, clarification requests and organiser visibility |
| Tristan   | KAN-36, KAN-16          | Approval/rejection workflow and organiser-facing status             |
| Arvin     | KAN-24                  | Initial database, schema, configuration and seed data                |

After database setup, Arvin supports cross-feature integration, end-to-end testing and resolving integration issues with the feature owners.

Read [AGENTS.md](AGENTS.md) before the first feature branch: it holds the mandatory workflow and documentation order for people and AI assistants. The shared setup uses pre-provisioned Supabase accounts and assigned-coordinator access. Sprint 1 closed with 24 Done points and eight carried points; the [review](docs/scrum/sprint-01/review.md#review-defects-and-carry-over) records the carried defects. Existing code and later fixes still need verification against the selected criteria. Account administration, event field validation, assignment/delegation and later transitions have [open customer questions](docs/requirements/assumptions-and-questions.md). Team assumptions remain distinct from customer clarifications.

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

Hosted approval and rejection checks passed, including the saved review row, outcome after reload and removal from the pending queue. See the [test evidence](docs/testing/test-evidence.md) for the dated results and remaining organiser-workflow checks. KAN-16's `/events` page uses `GET /api/events?scope=all` to show owned request names, readable statuses and Singapore-time updates. Draft titles open `/events/:id/edit`; other titles open `/events/:id`, which reads the shared detail API and displays status, saved outcome, reason and recorded time alongside the available planning actions. The organiser approval/rejection display and refresh checks passed in MAN-20260917-01. Reopening a request URL after sign-out also passed: the page showed a sign-in prompt without request details or the review reason (MAN-20260917-02). Draft and submitted detail pages also showed the expected statuses and review messages (MAN-20260917-03). A second organiser could not view the first organiser's request details or see their requests in the list (MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). The submission-to-status path remains to be checked in the test evidence.

## Join the repository

Clone [ConnectSphere](https://github.com/MochaLxtte/ConnectSphere), then follow the setup instructions above:

```sh
git clone https://github.com/MochaLxtte/ConnectSphere.git
cd ConnectSphere
```

Invite teammates and configure `main` to require PR review and the CI `verify` check once the first workflow has run. Follow [AGENTS.md](AGENTS.md) for feature branches, documentation and reviews.

## Course deliverables

The [submission checklist](docs/submission/checklist.md) maps the submission requirements to folders **1–7**, with project records and outstanding evidence. Keep working records in `docs/`; run `npm run submission:prepare` to assemble a fresh numbered snapshot in `dist/submission-.../`. Complete the checklist before creating the final ZIP. [Sprint 1](docs/scrum/sprint-01/README.md) and [Sprint 2](docs/scrum/sprint-02/README.md) retain their historical records; [Sprint 3](docs/scrum/sprint-03/README.md) and [Sprint 4](docs/scrum/sprint-04/README.md) hold the current release plan and evidence.

## Project context

The first release covers 20 core features across connected event workflows. Sprint 1 decisions are recorded in the [planning notes](docs/scrum/sprint-01/planning.md). Supabase hosts PostgreSQL and handles sign-in; Express verifies sessions and enforces application roles, ownership and coordinator assignment.

Team members and Scrum roles are maintained in the Sprint 1 plan. No public distribution license has been chosen for this coursework project.
