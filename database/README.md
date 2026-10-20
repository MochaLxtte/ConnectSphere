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

A full entity-relationship diagram of the repository schema, with the last hosted verification distinguished from pending migrations, is in
[docs/database-diagram.md](../docs/database-diagram.md); the [architecture record](../docs/architecture/README.md)
carries a curated view split into the Sprint 1 workflow and the later first-release tables.

The team manages the shared development schema in the Supabase dashboard. Coordinate changes with Arvin and retain equivalent numbered migrations for reproducible local and CI databases. Before applying migrations to an existing shared project, reconcile its tables and migration history; do not recreate tables already managed through the dashboard.

Verify the connection using the application's overview page or `GET /api/health/ready`. An unconfigured URL, unreachable project or missing scaffold metadata produces a readiness failure. Supabase Auth handles sign-in separately; Express verifies the session and resolves the application profile through `app_users.supabase_user_id`.

## Shared schema and migrations

The migration runner applies active numbered SQL files in order within one transaction, records checksums, and serializes concurrent runners using a database advisory lock. The active sequence is 001-009. Migration 008 (21 October 2026, KAN-64) adds the notification inbox columns and index; it is additive, existing rows are untouched, and it is **not applied** to shared Supabase until the team agrees (apply it with Arvin, as for 007). Migration 009 adds per-venue buffer settings and likewise has no recorded shared application. Migration 007 adds the Coordinator Lead role; its shared application and successful Lead login were reported on 19 October after the implementation. KAN-65 reuses this schema and adds no migration. On 30 September the unused Firebase migration was retired and the remaining files were renumbered without changing their SQL. New databases do not create its unused identity table. Existing databases keep their tables, data and original history names; the updated runner recognises the exact former filenames in the table below, checks every recorded checksum and skips SQL already applied under either name. It records a current filename only when that migration actually runs. A mismatched old or current checksum stops and rolls back the transaction. The retired Firebase file's checksum is still checked if its exact historical name is recorded; no missing history is fabricated. Run it again to apply only new migrations. Never edit an applied file: add the next numbered migration and coordinate numbering with other developers. Migrations run explicitly, never automatically on API startup. Back up important data before schema changes; this starter has no automatic rollback/down-migration facility.

| Current filename | Recognised former filename |
| --- | --- |
| `001_initial_scaffold.sql` | Unchanged |
| `002_restrict_data_api_access.sql` | Unchanged |
| `003_add_supabase_user_id.sql` | `004_add_supabase_user_id.sql` |
| `004_core_feature_schema.sql` | `005_core_feature_schema.sql` |
| `005_equipment_peak_availability.sql` | `006_equipment_peak_availability.sql` |
| `006_automatic_coordinator_assignment.sql` | `007_automatic_coordinator_assignment.sql` |
| `007_add_coordinator_lead.sql` | New migration; no former filename |
| `008_notification_inbox.sql` | New notification migration |
| `009_venue_buffer_durations.sql` | `008_venue_buffer_durations.sql` from the unmerged KAN-77 branch; exact checksum required |

Use the updated runner after pulling this change. Do not rename or delete database history rows to match the files. The separate dashboard-era `003_add_supabase_auth.sql` record is preserved, but is not an alias for a repository migration. Earlier dated evidence and comments inside unchanged SQL use the original numbering. The new `007_add_coordinator_lead.sql` is distinct from the recognised historical `007_automatic_coordinator_assignment.sql`: migration history is keyed by the entire filename. Future schema changes should start at 010, with a new descriptive filename agreed by the team.

**30 September schema verification:** applying 001-006 to a fresh local PostgreSQL database reproduced the shared project's application schema: 16 tables, 142 columns, 74 constraints, 40 indexes, five triggers and four project functions. All six migration checksums matched the hosted history using the documented filename aliases. The hosted-only `ensure_rls` event trigger and `rls_auto_enable()` helper enable RLS for new public tables; these are environment automation, while our migrations explicitly enable RLS for their tables. See [DB-SCHEMA-20260930-01](../docs/testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) for the comparison and its boundaries.

Application tables remain in the `public` schema. The hardening migration enables row-level security and revokes access for Supabase Data API roles on the scaffold tables; it creates no client access policies. The Data API must remain disabled for this architecture. Express's database owner connection can access these tables, so services still have to enforce each person's role and ownership. Apply equivalent restrictions to new tables as they are introduced. See [Supabase data access guidance](https://supabase.com/docs/guides/database/secure-data).

A Git branch does not isolate a shared database. Agree schema changes with Arvin before applying them to the team's project. Use separate projects or the local test database for experiments that would disrupt other developers. Do not run destructive reset commands against the shared project.

The schema covers application profiles, incomplete event drafts, coordinator linkage, clarification records, and review outcomes. Migration `004_core_feature_schema.sql` adds the tables for the remaining first-release features. The 30 September scope audit retained initial coordinator assignment, clarification and read-only status history while removing later lifecycle writes, reassignment and notification generation. KAN-65 now adds the explicit Lead-only reassignment described below, and KAN-64 supplies transactionally recorded in-app outcomes and the recipient-scoped inbox. Later lifecycle writes and KAN-80 notification triggers remain deferred. The integrated KAN-51 calendar reads `venues`, `venue_bookings` and `venue_unavailability`, and KAN-12 search reads the retained venue schema without a schema change. KAN-8 also uses these existing tables to record booking decisions atomically and enforce reservation conflicts; it adds no migration. KAN-55 records/removes operational blocks in `venue_unavailability`. KAN-52 reads current event and venue fields, approved reservations and blocks; coordinator interpretations are per-assessment inputs, not new columns or persisted decisions. It adds no migration. KAN-53 now inserts pending `venue_bookings` rows after checking current approved reservations and blocks under the venue lock; pending requests do not reserve availability. It also needs no migration. KAN-50 catalogue maintenance is implemented with a recorded stale-save repair still pending. KAN-77 extends it with buffer settings in migration 009; applying the buffers and re-evaluating existing bookings remain incomplete pending KAN-78. Equipment, attendee registration and change-request workflows remain future work. All applied migrations, stored data and integrity guards are preserved, including the future-domain tables below. Schema compatibility is distinct from an implemented application feature:

| Tables | Core features | Database-enforced rule |
| ------ | ------------- | ---------------------- |
| `event_status_history` | CF-06 | Trigger records every status change; set `app.actor_id` in the transaction to attribute it |
| `coordinator_assignments` | CF-05 | One active assignment per request; `event_requests.coordinator_id` stays the current assignment |
| `venues`, `venue_unavailability` | CF-08 to CF-11 | Unique names, positive capacity, valid intervals |
| `venue_bookings` | CF-12 to CF-14 | An `APPROVED` booking cannot overlap another approved booking or a blocked period (`23P01`) |
| `equipment_types`, `equipment_requests` | CF-15 to CF-17 | Overlapping `RESERVED` quantities cannot exceed the type's pooled quantity (`23P01`) |
| `event_registrations` | CF-18 | One row per attendee and event; `REGISTERED` rows cannot exceed `event_requests.registration_capacity` (`23P01`) |
| `event_change_requests` | CF-19 | Non-empty JSON object of proposed field changes with a reason |
| `notifications` | CF-20 | In-app notifications with read state. Migration 008 (KAN-64) adds `venue_booking_id` and `dedupe_key` and a unique index on `(recipient_id, dedupe_key)` so a repeated outcome is a no-op |

It also allows the later `CONFIRMED`, `CANCELLED` and `COMPLETED` request statuses. Pending bookings not consuming availability, pooled equipment, half-open intervals and the extra statuses are provisional team assumptions for Q-04 and Q-06 to Q-13; revise them through new migrations once the customer answers. The hosted project's history also lists `003_add_supabase_auth.sql`, a separate dashboard-era record retained unchanged; it is not the retired Firebase migration's filename or checksum. Draft fields may be NULL; the submission service validates the required fields before moving an owned draft to `SUBMITTED`. The review service saves the review row and matching `APPROVED`/`REJECTED` status in one transaction, after checking the assigned coordinator and current state. The nine statuses, single role per user, single proposed time interval, and text requirement fields remain design choices subject to the recorded open questions. Services update `updated_at` on writes and enforce roles, ownership and transitions; the schema alone does not do so.

Seeds contain fictional `.test` accounts with NULL password hashes, one incomplete draft and, once migration 004 has been applied, three fictional venues. Since the 30 September scope correction, seeding no longer creates equipment samples; any existing equipment data is retained. The accounts cannot authenticate. Re-running seeding inserts missing examples without replacing existing data. Seeding is disabled for `NODE_ENV=production`; point it only at a development database. Ryan owns identity integration under KAN-25; Arvin owns schema evolution and representative integration fixtures under KAN-24.

Create test login accounts in Supabase Auth, then link each UUID to its application profile's `supabase_user_id`. The mapping is nullable and unique. `organiser_id` and `coordinator_id` on event requests refer to `app_users.id`, not the Supabase Auth UUID. Migration `003_add_supabase_user_id.sql` supplies the mapping for local/CI databases; Firebase migration 003 is no longer an active file. Existing Firebase identity tables and their data remain untouched, but are unused by the current authentication code.

Hosted approval checks verified the `APPROVED` request status and matching review row with the assigned coordinator's application ID. See the [test evidence](../docs/testing/test-evidence.md) for the dated results and remaining hosted acceptance checks.

## KAN-79 Lead assignment rollout

**Implementation record, 19 October 2026:** [007_add_coordinator_lead.sql](migrations/007_add_coordinator_lead.sql) extends `app_users_role_check` to include `EVENT_COORDINATOR_LEAD`. It adds no table or column, does not promote any existing profile and does not modify event assignments or history. Migrations 001-006 and their recognised aliases/checksums stay unchanged. Fresh-install and upgrade checks use an isolated PostgreSQL test database; shared Supabase migration application and hosted acceptance are separate steps.

Deploy the submission-policy change and allocation interface as one coordinated release:

1. Agree migration 007 and the deployment window with the team before applying it to shared Supabase. Confirm which database the migration URL targets and reconcile its existing history; use `npm run db:migrate` to apply only pending files.
2. Create a test/staff login through trusted Supabase administration and link its UUID to `app_users.supabase_user_id`. Set that mapped application's role to `EVENT_COORDINATOR_LEAD` through the trusted dashboard. Do not use client-editable metadata to grant the role. Existing ordinary profiles are unchanged.
3. Ensure eligible real `EVENT_COORDINATOR` profiles have their own valid mappings and set `coordinator_available = true` only when ready for assignment. Keep fictional seed profiles opted out. A Lead profile is not an eligible target merely because its availability flag is true.
4. Deploy the matching backend and frontend together, then sign in as the provisioned Lead and verify `/lead` and `/lead/oversight`. Do this before making the changed submission workflow available to organisers. The health readiness endpoint checks scaffold metadata only; it does not certify migration 007 or the presence of a mapped Lead.
5. Run the [hosted test cases](../docs/testing/README.md) with coordinated test accounts and record the build, original data, results and any retained fixtures. Never run cleanup-based integration tests against shared Supabase.

A successful new submission becomes `SUBMITTED` with no coordinator, even when every coordinator is unavailable. The Lead queue contains submitted/unassigned requests; oversight covers active `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED` events. An eligible target is an available `EVENT_COORDINATOR`. The transaction locks the event and selected profile, rechecks eligibility and writes `event_requests.coordinator_id` with one active `MANUAL` assignment record containing the Lead's ID and timestamp. The existing unique active-history index remains the final duplicate guard.

Turning availability off excludes future initial allocation; it does not unassign existing events or revoke access. Unexpected assignments on drafts are preserved and reported as `409 DRAFT_ALREADY_ASSIGNED`. Existing assigned events and historical `AUTOMATIC` records keep their actors/timestamps; the new migration does not backfill or reassign them. A repeated/stale allocation returns `409 COORDINATOR_ALREADY_ASSIGNED`. KAN-65 reassignment and KAN-64 organiser/coordinator notifications remain separately implemented dependencies; this rollout does not provide their completed integration acceptance.

## KAN-65 reassignment and setup follow-up — 19 October 2026

Migration 007 application and successful Coordinator Lead login were confirmed in chat. This is a user-reported setup result, not a fresh inspection of every shared table/constraint or a completed manual workflow run. The [test evidence](../docs/testing/test-evidence.md#19-october-2026--kan-65-coordinator-reassignment) records the distinction. Manual workflow checks are deferred until the remaining features are finished.

KAN-65 adds reassignment using the existing `event_requests.coordinator_id`, `coordinator_assignments` table and unique active-row index. No migration 008 or history rewrite is required. The current active history UUID is the expected assignment version; the existing `note` records the required handover reason. A transaction locks the event and current history, validates the expected version, locks/rechecks the new available coordinator, closes the old row and creates a MANUAL row with the Lead actor. The closing and opening timestamps are identical, captured after lock waits without truncating PostgreSQL precision; current linkage and history commit together. Event status, decisions and arrangements remain unchanged. A valid-version same-coordinator request changes nothing, even if that existing coordinator is now unavailable.

Legacy linkage without matching active history is preserved and refused with `ASSIGNMENT_HISTORY_CONFLICT`; reconcile it deliberately before handover rather than generating an invented original actor/time. A stale expected UUID returns `ASSIGNMENT_VERSION_CONFLICT`. Assignment, clarification and status-history reads hold a shared event lock while authorising and fetching records, so a handover cannot change the assignment midway through a protected read. Existing coordinator writes also check the current assignment under lock. KAN-64 will supply notifications separately; there is no notification generation in KAN-65. Automated tests use isolated databases and never run cleanup against the shared Supabase project.

**21 October integration follow-up:** the KAN-64 dependency described in the 19 October checkpoint above is now implemented using migration 008. Submission, clarification, review, initial allocation, handover and venue decisions commit their notification rows in the same transaction; insertion failures roll back the action. Same-coordinator handovers create no notice. Shared migration rollout and combined hosted acceptance remain pending. Migration 009 is also required by the integrated venue queries; coordinate both pending migrations before deploying the matching backend.

## KAN-29 automatic assignment setup

**Historical setup and policy, superseded for new submissions by KAN-79 on 19 October 2026.** Retain the following 30 September schema evidence and earlier workload rule as history. The availability column and automatic-history representation are still used or preserved, but the application no longer runs automatic allocation or returns `NO_AVAILABLE_COORDINATOR` for submission.

The branch implementation requires [006_automatic_coordinator_assignment.sql](migrations/006_automatic_coordinator_assignment.sql). **The shared project's migration record, checksum, columns and method/actor constraint were verified on 30 September after the migration was applied.** Its schema is ready for KAN-29 manual testing; account availability, hosted workflow results, CI and peer review remain separate checks.

For a new environment, coordinate with Arvin, reconcile its schema and migration history, then use the updated runner to apply any pending files. Local and CI test databases apply the same numbered migrations. Use the migration as the schema reference; do not duplicate its SQL, edit an applied file or rename existing history rows.

Migration 006 adds `app_users.coordinator_available` with a non-null default of `false`. Existing profiles and newly inserted profiles start opted out. Once the migration is present, use the Table Editor to set the flag to `true` only for `EVENT_COORDINATOR` profiles whose Supabase Auth login and `supabase_user_id` mapping are already provisioned and whose staff member is ready to receive requests. Keep fictional seed profiles opted out; running the seed is not coordinator provisioning. Availability is an explicit assignment setting, not a check of whether the person is currently signed in. Changing it to `false` excludes future automatic allocations; it does not remove existing assignments or revoke their access.

On valid draft submission the service selects an available coordinator with the fewest assigned requests in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` or `CONFIRMED`. Drafts, rejected, cancelled and completed requests do not count. Equal workloads use ascending `app_users.id` UUID order. The request's status, coordinator and automatic assignment-history row commit together. Concurrent automatic and manual assignment writes coordinate through the same coordinator-row locks.

The migration also records `coordinator_assignments.assignment_method`: existing rows remain `MANUAL` with their original `assigned_by`; automatic rows use `AUTOMATIC` with a null actor. The constraint requires the corresponding method/actor pairing. The existing single-active-assignment constraint remains in place. Automatic submission does not create an approval/rejection record.

If no coordinator is available, submission returns `409 NO_AVAILABLE_COORDINATOR` and the transaction leaves the saved draft unchanged, with no new assignment. The organiser can edit, save and retry once availability is configured. A draft with an existing `coordinator_id` or active assignment-history row instead returns `409 DRAFT_ALREADY_ASSIGNED`, preserving that data for investigation rather than replacing it. Old submitted requests are not backfilled or reassigned by this change; initial manual assignment remains available only for unassigned Submitted, Under review, Clarification requested or Approved requests. Reassignment is future KAN-65 work and is refused without changing current assignment or history.

Use the [manual check guide](../docs/testing/README.md#kan-29-hosted-verification) for hosted verification. Tests that alter all coordinator availability flags or construct controlled workloads belong in an isolated project, or in a coordinated test window with the original settings recorded and restored. A feature branch does not isolate Supabase data.

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

## Migration 008 — KAN-78 occupied venue intervals

Adds zero-default 0..1440-minute venue durations, reservation snapshot fields, SQL occupied start/end/hour helpers, an internal booking-interval view, live warning evaluation and booking/block integrity guards. Existing migrations and booking rows are preserved. The shared venue lock serialises current buffer changes and reservation decisions. Ended/completed rows retain approval snapshots; warnings for live bookings are computed without mutating history.

Run `npm run db:migrate` only against the intended development database after the team has been told. This session applied migration 008 only to disposable local PostgreSQL test schemas. Shared Supabase application is **Not executed**. Coordinate the column names/migration with KAN-77 before merging its separately owned editor; do not create duplicate buffer columns. Tests use explicit `TEST_DATABASE_URL` and must never target shared data.

## KAN-77 venue buffer durations — 21 October 2026

**Implementation record:** [009_venue_buffer_durations.sql](migrations/009_venue_buffer_durations.sql) adds `venues.setup_minutes` and `venues.turnaround_minutes`, each `integer NOT NULL DEFAULT 0` with a `CHECK` from 0 to 1440. Existing venues receive zero, so current intervals are unchanged; bookings, blocks and migration history are untouched. The upgrade and constraint checks are in `database/tests/database.integration.test.ts` and run on an isolated PostgreSQL test database.

**Not yet applied to shared Supabase.** Agree the deployment window with the team first (AGENTS.md §7.3), then run `npm run db:migrate`. Deploy the matching backend at the same time: this branch's venue queries read the new columns and fail on a database without migration 009.

**21 October integration numbering:** KAN-64 and KAN-77 independently added migration 008 on unmerged branches. Notifications retain `008_notification_inbox.sql`; venue buffers use `009_venue_buffer_durations.sql` with unchanged SQL. Both source PRs report no shared application. The runner recognises the exact original `008_venue_buffer_durations.sql` checksum if it was used in a developer database, preserves that ledger row, and never fabricates a replacement row or reapplies the columns. Apply both pending migrations with team coordination before deploying this combined backend.

## KAN-78 main reconciliation — 21 October 2026

The original branch migration `008_venue_occupied_intervals.sql` is superseded by `010_venue_occupied_intervals.sql` after main integration. Shared `008_notification_inbox.sql` and `009_venue_buffer_durations.sql` are preserved without edits. Migration 010 adds booking snapshots and occupied-interval/warning/guard objects, using duration columns already created by 009. Fresh installs, prior migration aliases and existing data passed the integration suite. Migration 010 was applied only to the isolated local test database; shared Supabase application is Not executed. Coordinate its application before deploying this PR.
