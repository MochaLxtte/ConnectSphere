# ConnectSphere

ConnectSphere helps event organisers and staff plan an event together. An organiser submits a request, a Coordinator Lead assigns it, and the assigned coordinator works with Venue Staff and Technical Support Staff to secure rooms and equipment. The same event record carries decisions, changes, notifications and attendee registrations.

The application checks permissions against each user’s role and relationship to the event. Venue bookings account for setup time, turnaround, outages and expiring holds. An event can use several venues, and changing one arrangement preserves the others. Starting preparation requires both ready arrangements and current Safety Officer approval.

## Run locally

Use **Node.js 24.x**, npm and a Supabase project with PostgreSQL and Auth. Run the following from the repository root:

```sh
npm ci
npm run setup
```

The setup command creates a root `.env` from [the example](.env.example) when one does not already exist. Configure these settings for the same Supabase project:

| Setting | Value |
| --- | --- |
| `DATABASE_URL` | The PostgreSQL connection string with verified TLS. Follow the [database connection guide](database/README.md#configure-supabase). |
| `SUPABASE_URL` and `VITE_SUPABASE_URL` | The project URL used by the API and frontend respectively. |
| `VITE_SUPABASE_ANON_KEY` | The project’s browser-safe publishable or anon key. Keep privileged keys and database credentials on the server. |

For a **fresh development database**, run `npm run db:migrate`, then `npm run db:seed` to create the schema and fictional development profiles. For the **existing team database**, use its provisioned accounts and coordinate any schema or seed changes with the team. To sign in, the Supabase Auth user must be linked to an `app_users` profile with the appropriate role. [Account provisioning](backend/src/modules/auth/README.md)

```sh
npm run dev
```

Open [ConnectSphere](http://127.0.0.1:5173). Vite forwards `/api` requests to Express on port 3000. Use the [readiness endpoint](http://127.0.0.1:3000/api/health/ready) to check that the API can reach the migrated database. In Windows PowerShell, use `npm.cmd` if the shell blocks the npm script wrapper.

## Repository map

| Location | What you’ll find |
| --- | --- |
| [Frontend](frontend/README.md) | Vue 3 and TypeScript pages, role-specific navigation and component tests. |
| [Backend](backend/README.md) | Express 5 API, authentication and modules for events, venues, equipment, safety, registration and notifications. |
| [Database](database/README.md) | PostgreSQL schema, migrations, development seed and integration tests. |
| [Browser tests](tests/e2e/) | Playwright scenarios for user interactions and workflows. |

## Checks

| Command | What it runs |
| --- | --- |
| `npm run check` | TypeScript checks, workspace tests, browser harness checks and application builds. |
| `npm run test:integration` | PostgreSQL integration tests against a dedicated `TEST_DATABASE_URL`. |
| `npm run test:e2e` | Playwright browser tests. Install Chromium first with `npx playwright install chromium` and supply an isolated loopback test database whose name ends in `_test`. |
| `npm run test:coverage` | Frontend and backend workspace coverage. |

The [test database setup](database/README.md#optional-local-postgresql-and-integration-tests) describes how to create an isolated database. The [testing report](docs/testing/README.md) distinguishes component and database results from checks run with real sign-in.

## IS212 project documentation

- **Trace a story to code.** Open the [product backlog workbook](docs/submission/1/product-backlog.xlsx), select a story ID, then select a test case on **Criterion index**. The offline case guide shows the expected behaviour, recorded results and mapped code. Keep the workbook with its companion files as described in the [Folder 1 guide](docs/submission/1/README.md).
- **Walk through the application.** The [demo walkthrough](docs/testing/release-e2e-walkthrough.md) follows one event across roles, including booking conflicts, safety review and recovery.
- **Understand the design and Scrum decisions.** The [architecture report](docs/architecture/README.md) explains how the modules cooperate. The [sprint records](docs/scrum/README.md) connect planning decisions to review outcomes and retrospectives.
- **Prepare the submission.** Run `npm run submission:prepare` to assemble the seven numbered folders under `dist/`. The [submission checklist](docs/submission/checklist.md) identifies the deliverables and team checks.
