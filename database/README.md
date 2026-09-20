# Database

Supabase hosts the team's PostgreSQL development database. Vue calls Express, and Express uses `pg` to run SQL. Docker is optional; the local Compose service and CI use PostgreSQL 17 for isolated testing.

## Configure Supabase

1. Create or join the team's Supabase development project. In its API settings, disable the Data API before running the initial migration. Application data is accessed through Express.
2. Open **Connect** in the dashboard. For development on an IPv4 network, select the **Session pooler** connection on port **5432**. A direct connection is also suitable when the network supports the project's direct endpoint. This scaffold uses direct or session connections for consistent migration and test-session settings; the transaction pooler on port 6543 is not supported.
3. Keep certificate verification enabled with `sslmode=verify-full`. If the connection needs the project's server root certificate, download it from the database connection settings, save it locally outside the repository and add its absolute path as `sslrootcert` in the URL.
4. Run `npm run setup` from the repository root, then replace the placeholders in `.env`. Existing `.env` files are preserved and must be updated manually.

Example connection shape, using fictional values:

```dotenv
DATABASE_URL="postgresql://postgres.PROJECT_REF:ENCODED_DATABASE_PASSWORD@POOLER_HOST:5432/postgres?sslmode=verify-full"
```

Copy the host, username and database name from the dashboard. Use the database password, not an API key. Percent-encode special characters in the password. If a root certificate is needed, append `&sslrootcert=ENCODED_ABSOLUTE_CERTIFICATE_PATH`. For example, `C:/Users/yourname/certs/supabase.crt` becomes `C%3A%2FUsers%2Fyourname%2Fcerts%2Fsupabase.crt`. On macOS/Linux, `/Users/yourname/certs/supabase.crt` becomes `%2FUsers%2Fyourname%2Fcerts%2Fsupabase.crt`. Keep `.env` local and never put this URL in a frontend `VITE_*` variable. Supabase's [connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) describes the connection modes and TLS certificate settings.

`MIGRATION_DATABASE_URL` is optional. Leave it blank to run migrations and seeds through `DATABASE_URL`, or set it to a separate direct or session connection for schema administration. Both URLs must target the same project and use verified TLS. The application uses `DATABASE_URL`; `TEST_DATABASE_URL` is reserved for a dedicated test database.

For a new isolated database, run the migrations and optional fictional development seeds:

```sh
npm run db:migrate
npm run db:seed
```

The team manages the shared development schema in the Supabase dashboard. Coordinate changes with Arvin and retain equivalent numbered migrations for reproducible local and CI databases. Before applying migrations to an existing shared project, reconcile its tables and migration history; do not recreate tables already managed through the dashboard.

Verify the connection using the application's overview page or `GET /api/health/ready`. An unconfigured URL, unreachable project or missing scaffold metadata produces a readiness failure. Supabase Auth handles sign-in separately; Express verifies the session and resolves the application profile through `app_users.supabase_user_id`.

## Shared schema and migrations

The migration runner applies numbered SQL files in order within one transaction, records checksums, and serializes concurrent runners using a database advisory lock. Run it again to apply only new migrations. Never edit an applied file: add the next numbered migration and coordinate numbering with other developers. Migrations run explicitly, never automatically on API startup. Back up important data before schema changes; this starter has no automatic rollback/down-migration facility.

Application tables remain in the `public` schema. The hardening migration enables row-level security and revokes access for Supabase Data API roles on the scaffold tables; it creates no client access policies. The Data API must remain disabled for this architecture. Express's database owner connection can access these tables, so services still have to enforce each person's role and ownership. Apply equivalent restrictions to new tables as they are introduced. See [Supabase data access guidance](https://supabase.com/docs/guides/database/secure-data).

A Git branch does not isolate a shared database. Agree schema changes with Arvin before applying them to the team's project. Use separate projects or the local test database for experiments that would disrupt other developers. Do not run destructive reset commands against the shared project.

The schema covers application profiles, incomplete event drafts, coordinator linkage, clarification records, and review outcomes. Migration `005_core_feature_schema.sql` adds the tables for the remaining first-release features, ahead of their services:

| Tables | Core features | Database-enforced rule |
| ------ | ------------- | ---------------------- |
| `event_status_history` | CF-06 | Trigger records every status change; set `app.actor_id` in the transaction to attribute it |
| `coordinator_assignments` | CF-05 | One active assignment per request; `event_requests.coordinator_id` stays the current assignment |
| `venues`, `venue_unavailability` | CF-08 to CF-11 | Unique names, positive capacity, valid intervals |
| `venue_bookings` | CF-12 to CF-14 | An `APPROVED` booking cannot overlap another approved booking or a blocked period (`23P01`) |
| `equipment_types`, `equipment_requests` | CF-15 to CF-17 | Overlapping `RESERVED` quantities cannot exceed the type's pooled quantity (`23P01`) |
| `event_registrations` | CF-18 | One row per attendee and event; `REGISTERED` rows cannot exceed `event_requests.registration_capacity` (`23P01`) |
| `event_change_requests` | CF-19 | Non-empty JSON object of proposed field changes with a reason |
| `notifications` | CF-20 | In-app notifications with read state |

It also allows the later `CONFIRMED`, `CANCELLED` and `COMPLETED` request statuses. Pending bookings not consuming availability, pooled equipment, half-open intervals and the extra statuses are provisional team assumptions for Q-04 and Q-06 to Q-13; revise them through new migrations once the customer answers. The hosted project's history also lists `003_add_supabase_auth.sql`, an earlier dashboard-era equivalent of migration 004 that the runner ignores. Draft fields may be NULL; the submission service validates the required fields before moving an owned draft to `SUBMITTED`. The review service saves the review row and matching `APPROVED`/`REJECTED` status in one transaction, after checking the assigned coordinator and current state. The six statuses, single role per user, single proposed time interval, and text requirement fields remain design choices subject to the recorded open questions. Services update `updated_at` on writes and enforce roles, ownership and transitions; the schema alone does not do so.

Seeds contain fictional `.test` accounts with NULL password hashes, plus one incomplete draft. They cannot authenticate. Re-running seeding inserts missing examples without replacing existing data. Seeding is disabled for `NODE_ENV=production`; point it only at a development database. Ryan owns identity integration under KAN-25; Arvin owns schema evolution and representative integration fixtures under KAN-24.

Create test login accounts in Supabase Auth, then link each UUID to its application profile's `supabase_user_id`. The mapping is nullable and unique. `organiser_id` and `coordinator_id` on event requests refer to `app_users.id`, not the Supabase Auth UUID. Migration `004_add_supabase_user_id.sql` supplies the mapping for local/CI databases; migration 003 remains historical and its Firebase identity table is unused by the current authentication code.

Hosted approval checks verified the `APPROVED` request status and matching review row with the assigned coordinator's application ID. See the [test evidence](../docs/testing/test-evidence.md) for the dated results and remaining hosted acceptance checks.

## Optional local PostgreSQL and integration tests

With Docker Desktop's Linux engine running, start the optional PostgreSQL 17 service and create a separate test database once:

```sh
npm run db:up
docker compose exec -T db createdb -U connectsphere connectsphere_test
```

Run the integration suite with its own URL. PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://connectsphere:connectsphere_local@127.0.0.1:5432/connectsphere_test'
npm run test:integration
```

macOS/Linux:

```sh
TEST_DATABASE_URL=postgresql://connectsphere:connectsphere_local@127.0.0.1:5432/connectsphere_test npm run test:integration
```

The local service does not use TLS. Tests create and drop an isolated schema in the dedicated test database, never reset the public schema. GitHub Actions provisions its own PostgreSQL service and does not need Supabase credentials. To use a dedicated hosted test database instead, include its own verified TLS settings in `TEST_DATABASE_URL`.

For optional local application development, set `DATABASE_URL=postgresql://connectsphere:connectsphere_local@127.0.0.1:5432/connectsphere` and leave `MIGRATION_DATABASE_URL` blank, then run migrations, seeds and the app normally. Update the URL if the local port or credentials change. `npm run db:down` stops the Compose service and retains its named volume. Changing Compose credentials after a volume is initialised does not change the existing PostgreSQL users. There is no automatic reset command.
