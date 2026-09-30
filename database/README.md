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

A full entity-relationship diagram of the live `public` schema is in
[docs/database-diagram.md](../docs/database-diagram.md); the [architecture record](../docs/architecture/README.md)
carries a curated view split into the Sprint 1 workflow and the later first-release tables.

The team manages the shared development schema in the Supabase dashboard. Coordinate changes with Arvin and retain equivalent numbered migrations for reproducible local and CI databases. Before applying migrations to an existing shared project, reconcile its tables and migration history; do not recreate tables already managed through the dashboard.

Verify the connection using the application's overview page or `GET /api/health/ready`. An unconfigured URL, unreachable project or missing scaffold metadata produces a readiness failure. Supabase Auth handles sign-in separately; Express verifies the session and resolves the application profile through `app_users.supabase_user_id`.

## Shared schema and migrations

The migration runner applies active numbered SQL files in order within one transaction, records checksums, and serializes concurrent runners using a database advisory lock. The active sequence is 001-006. On 30 September the unused Firebase migration was retired and the remaining files were renumbered without changing their SQL. New databases do not create its unused identity table. Existing databases keep their tables, data and original history names; the updated runner recognises the exact former filenames in the table below, checks every recorded checksum and skips SQL already applied under either name. It records a current filename only when that migration actually runs. A mismatched old or current checksum stops and rolls back the transaction. The retired Firebase file's checksum is still checked if its exact historical name is recorded; no missing history is fabricated. Run it again to apply only new migrations. Never edit an applied file: add the next numbered migration and coordinate numbering with other developers. Migrations run explicitly, never automatically on API startup. Back up important data before schema changes; this starter has no automatic rollback/down-migration facility.

| Current filename | Recognised former filename |
| --- | --- |
| `001_initial_scaffold.sql` | Unchanged |
| `002_restrict_data_api_access.sql` | Unchanged |
| `003_add_supabase_user_id.sql` | `004_add_supabase_user_id.sql` |
| `004_core_feature_schema.sql` | `005_core_feature_schema.sql` |
| `005_equipment_peak_availability.sql` | `006_equipment_peak_availability.sql` |
| `006_automatic_coordinator_assignment.sql` | `007_automatic_coordinator_assignment.sql` |

Use the updated runner after pulling this change. Do not rename or delete database history rows to match the files. The separate dashboard-era `003_add_supabase_auth.sql` record is preserved, but is not an alias for a repository migration. Earlier dated evidence and comments inside unchanged SQL use the original numbering. Future schema changes should start at 007, with a new descriptive filename agreed by the team.

**30 September schema verification:** applying 001-006 to a fresh local PostgreSQL database reproduced the shared project's application schema: 16 tables, 142 columns, 74 constraints, 40 indexes, five triggers and four project functions. All six migration checksums matched the hosted history using the documented filename aliases. The hosted-only `ensure_rls` event trigger and `rls_auto_enable()` helper enable RLS for new public tables; these are environment automation, while our migrations explicitly enable RLS for their tables. See [DB-SCHEMA-20260930-01](../docs/testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) for the comparison and its boundaries.

Application tables remain in the `public` schema. The hardening migration enables row-level security and revokes access for Supabase Data API roles on the scaffold tables; it creates no client access policies. The Data API must remain disabled for this architecture. Express's database owner connection can access these tables, so services still have to enforce each person's role and ownership. Apply equivalent restrictions to new tables as they are introduced. See [Supabase data access guidance](https://supabase.com/docs/guides/database/secure-data).

A Git branch does not isolate a shared database. Agree schema changes with Arvin before applying them to the team's project. Use separate projects or the local test database for experiments that would disrupt other developers. Do not run destructive reset commands against the shared project.

The schema covers application profiles, incomplete event drafts, coordinator linkage, clarification records, and review outcomes. Migration `004_core_feature_schema.sql` adds the tables for the remaining first-release features. After the 30 September scope audit, the application uses coordinator assignment, clarification and read-only status history. Later lifecycle writes, reassignment and notification generation are removed. The venue application remains Sprint 2 work; equipment, attendee registration and change-request workflows remain future work. All applied migrations, stored data and integrity guards are preserved, including the future-domain tables below. Schema compatibility is distinct from an implemented application feature:

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

It also allows the later `CONFIRMED`, `CANCELLED` and `COMPLETED` request statuses. Pending bookings not consuming availability, pooled equipment, half-open intervals and the extra statuses are provisional team assumptions for Q-04 and Q-06 to Q-13; revise them through new migrations once the customer answers. The hosted project's history also lists `003_add_supabase_auth.sql`, a separate dashboard-era record retained unchanged; it is not the retired Firebase migration's filename or checksum. Draft fields may be NULL; the submission service validates the required fields before moving an owned draft to `SUBMITTED`. The review service saves the review row and matching `APPROVED`/`REJECTED` status in one transaction, after checking the assigned coordinator and current state. The nine statuses, single role per user, single proposed time interval, and text requirement fields remain design choices subject to the recorded open questions. Services update `updated_at` on writes and enforce roles, ownership and transitions; the schema alone does not do so.

Seeds contain fictional `.test` accounts with NULL password hashes, one incomplete draft and, once migration 004 has been applied, three fictional venues. Since the 30 September scope correction, seeding no longer creates equipment samples; any existing equipment data is retained. The accounts cannot authenticate. Re-running seeding inserts missing examples without replacing existing data. Seeding is disabled for `NODE_ENV=production`; point it only at a development database. Ryan owns identity integration under KAN-25; Arvin owns schema evolution and representative integration fixtures under KAN-24.

Create test login accounts in Supabase Auth, then link each UUID to its application profile's `supabase_user_id`. The mapping is nullable and unique. `organiser_id` and `coordinator_id` on event requests refer to `app_users.id`, not the Supabase Auth UUID. Migration `003_add_supabase_user_id.sql` supplies the mapping for local/CI databases; Firebase migration 003 is no longer an active file. Existing Firebase identity tables and their data remain untouched, but are unused by the current authentication code.

Hosted approval checks verified the `APPROVED` request status and matching review row with the assigned coordinator's application ID. See the [test evidence](../docs/testing/test-evidence.md) for the dated results and remaining hosted acceptance checks.

## KAN-29 automatic assignment setup

The branch implementation requires [006_automatic_coordinator_assignment.sql](migrations/006_automatic_coordinator_assignment.sql). **The shared project's migration record, checksum, columns and method/actor constraint were verified on 30 September after the migration was applied.** Its schema is ready for KAN-29 manual testing; account availability, hosted workflow results, CI and peer review remain separate checks.

For a new environment, coordinate with Arvin, reconcile its schema and migration history, then use the updated runner to apply any pending files. Local and CI test databases apply the same numbered migrations. Use the migration as the schema reference; do not duplicate its SQL, edit an applied file or rename existing history rows.

Migration 006 adds `app_users.coordinator_available` with a non-null default of `false`. Existing profiles and newly inserted profiles start opted out. Once the migration is present, use the Table Editor to set the flag to `true` only for `EVENT_COORDINATOR` profiles whose Supabase Auth login and `supabase_user_id` mapping are already provisioned and whose staff member is ready to receive requests. Keep fictional seed profiles opted out; running the seed is not coordinator provisioning. Availability is an explicit assignment setting, not a check of whether the person is currently signed in. Changing it to `false` excludes future automatic allocations; it does not remove existing assignments or revoke their access.

On valid draft submission the service selects an available coordinator with the fewest assigned requests in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` or `CONFIRMED`. Drafts, rejected, cancelled and completed requests do not count. Equal workloads use ascending `app_users.id` UUID order. The request's status, coordinator and automatic assignment-history row commit together. Concurrent automatic and manual assignment writes coordinate through the same coordinator-row locks.

The migration also records `coordinator_assignments.assignment_method`: existing rows remain `MANUAL` with their original `assigned_by`; automatic rows use `AUTOMATIC` with a null actor. The constraint requires the corresponding method/actor pairing. The existing single-active-assignment constraint remains in place. Automatic submission does not create an approval/rejection record.

If no coordinator is available, submission returns `409 NO_AVAILABLE_COORDINATOR` and the transaction leaves the saved draft unchanged, with no new assignment. The organiser can edit, save and retry once availability is configured. A draft with an existing `coordinator_id` or active assignment-history row instead returns `409 DRAFT_ALREADY_ASSIGNED`, preserving that data for investigation rather than replacing it. Old submitted requests are not backfilled or reassigned by this change; initial manual assignment remains available only for unassigned Submitted, Under review, Clarification requested or Approved requests. Reassignment is future KAN-65 work and is refused without changing current assignment or history.

Use the [manual check guide](../docs/testing/kan29-manual-checks.md) for hosted verification. Tests that alter all coordinator availability flags or construct controlled workloads belong in an isolated project, or in a coordinated test window with the original settings recorded and restored. A feature branch does not isolate Supabase data.

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
