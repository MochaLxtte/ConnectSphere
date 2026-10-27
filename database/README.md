# Database

**Current shared configuration — 25 October 2026.** The shared development project has the existing migration-013 expiry function and a matching ledger checksum. With team approval, `pg_cron` 1.6.4 was enabled and the single named job `connectsphere-expire-venue-holds` scheduled every minute with `SELECT public.expire_venue_holds()`. Actual runs succeeded from **21:58 Singapore time**; sanitized [evidence](../docs/scrum/sprint-03/evidence/supabase-hold-expiry-20261025.json) retains version/job/run metadata. No business test data or cleanup suite was run against shared Supabase. Earlier dated “pg_cron disabled” / unapplied-migration notes describe their earlier checkpoints. Do not rerun or edit applied migrations to enable this job. The API scheduler remains an idempotent fallback; a cron return message of `1 row` is a SQL result-row count, not a count of expired holds.

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

The migration runner applies active numbered SQL files in order within one transaction, records checksums, and serializes concurrent runners using a database advisory lock. The active sequence is 001–015. The 25 October shared-development record reports 001–013 applied; 014 and test-account setup are reported complete, while shared 015 application is **Not executed**. The following dated rollout descriptions retain earlier checkpoints. Migration 008 (21 October 2026, KAN-64) adds the notification inbox columns and index; it is additive, existing rows are untouched, and it is **not applied** to shared Supabase until the team agrees (apply it with Arvin, as for 007). Migration 009 adds per-venue buffer settings and likewise has no recorded shared application. Migration 007 adds the Coordinator Lead role; its shared application and successful Lead login were reported on 19 October after the implementation. KAN-65 reuses this schema and adds no migration. On 30 September the unused Firebase migration was retired and the remaining files were renumbered without changing their SQL. New databases do not create its unused identity table. Existing databases keep their tables, data and original history names; the updated runner recognises the exact former filenames in the table below, checks every recorded checksum and skips SQL already applied under either name. It records a current filename only when that migration actually runs. A mismatched old or current checksum stops and rolls back the transaction. The retired Firebase file's checksum is still checked if its exact historical name is recorded; no missing history is fabricated. Run it again to apply only new migrations. Never edit an applied file: add the next numbered migration and coordinate numbering with other developers. Migrations run explicitly, never automatically on API startup. Back up important data before schema changes; this starter has no automatic rollback/down-migration facility.

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
| `010_venue_outage_impacts.sql` | New outage-impact migration |
| `011_venue_booking_replacements.sql` | New replacement-link migration |
| `012_venue_occupied_intervals.sql` | Current integrated filename; no runner alias for its unmerged branch filenames |
| `013_venue_holds.sql` | Current integrated filename; no runner alias for its unmerged branch filenames |
| `014_equipment_operational_quantities.sql` | KAN-9 additive operational-stock fields; no former filename |
| `015_equipment_reservations.sql` | KAN-26 release history, equipment notification links and operational-capacity/lifecycle guards |

Use the updated runner after pulling this change. Do not rename or delete database history rows to match the files. The separate dashboard-era `003_add_supabase_auth.sql` record is preserved, but is not an alias for a repository migration. Earlier dated evidence and comments inside unchanged SQL use the original numbering. The new `007_add_coordinator_lead.sql` is distinct from the recognised historical `007_automatic_coordinator_assignment.sql`: migration history is keyed by the entire filename. Future schema changes should start at 016, with a new descriptive filename agreed by the team.

**30 September schema verification:** applying 001-006 to a fresh local PostgreSQL database reproduced the shared project's application schema: 16 tables, 142 columns, 74 constraints, 40 indexes, five triggers and four project functions. All six migration checksums matched the hosted history using the documented filename aliases. The hosted-only `ensure_rls` event trigger and `rls_auto_enable()` helper enable RLS for new public tables; these are environment automation, while our migrations explicitly enable RLS for their tables. See [DB-SCHEMA-20260930-01](../docs/testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) for the comparison and its boundaries.

Application tables remain in the `public` schema. The hardening migration enables row-level security and revokes access for Supabase Data API roles on the scaffold tables; it creates no client access policies. The Data API must remain disabled for this architecture. Express's database owner connection can access these tables, so services still have to enforce each person's role and ownership. Apply equivalent restrictions to new tables as they are introduced. See [Supabase data access guidance](https://supabase.com/docs/guides/database/secure-data).

A Git branch does not isolate a shared database. Agree schema changes with Arvin before applying them to the team's project. Use separate projects or the local test database for experiments that would disrupt other developers. Do not run destructive reset commands against the shared project.

The schema covers application profiles, incomplete event drafts, coordinator linkage, clarification records, and review outcomes. Migration `004_core_feature_schema.sql` adds the tables for the remaining first-release features. The 30 September scope audit retained initial coordinator assignment, clarification and read-only status history while removing later lifecycle writes, reassignment and notification generation. KAN-65 now adds the explicit Lead-only reassignment described below, and KAN-64 supplies transactionally recorded in-app outcomes and the recipient-scoped inbox. Later lifecycle writes and KAN-80 notification triggers remain deferred. The integrated KAN-51 calendar reads `venues`, `venue_bookings` and `venue_unavailability`, and KAN-12 search reads the retained venue schema without a schema change. KAN-8 also uses these existing tables to record booking decisions atomically and enforce reservation conflicts; it adds no migration. KAN-55 records/removes operational blocks in `venue_unavailability`. KAN-52 reads current event and venue fields, approved reservations and blocks; coordinator interpretations are per-assessment inputs, not new columns or persisted decisions. It adds no migration. KAN-53 now inserts pending `venue_bookings` rows after checking current approved reservations and blocks under the venue lock; pending requests do not reserve availability. It also needs no migration. KAN-50 catalogue maintenance is implemented with a recorded stale-save repair still pending. KAN-77 extends it with buffer settings in migration 009; applying the buffers and re-evaluating existing bookings remain incomplete pending KAN-78. KAN-9 availability and KAN-26 saved equipment reservations are now implemented; equipment stock/request editing, attendee registration and change-request workflows remain future work. All applied migrations, stored data and integrity guards are preserved, including the future-domain tables below. Schema compatibility is distinct from an implemented application feature:

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

## KAN-83 venue holds rollout — 21 October 2026

**Implementation record:** [013_venue_holds.sql](migrations/013_venue_holds.sql) is additive. It adds the `HELD` and `EXPIRED` booking statuses, the hold deadline, creator, time, expiry and cancellation columns with their consistency checks, a partial index on live holds, a hold-aware `prevent_venue_booking_conflict()` trigger (an approved booking or a live hold may not overlap another approved booking, live hold or block) and the `expire_venue_holds()` function. Existing rows, statuses and decisions are unchanged, and migrations 001-007 keep their checksums. Fresh-install and upgrade checks ran against an isolated PostgreSQL database (AUTO-20261021-02); migration 008 has **not** been applied to shared Supabase.

Before applying it to shared Supabase:

1. Tell the team and agree a time (AGENTS.md §7.3). Deploy the matching backend and frontend together: older code does not know the new statuses.
2. Run `npm run db:migrate` against the agreed database; it applies only pending files.
3. **Schedule expiry.** In the Supabase dashboard enable the `pg_cron` extension (Database → Extensions), then either re-run the scheduling block at the end of migration 013 or run `SELECT cron.schedule('connectsphere-expire-venue-holds', '* * * * *', 'SELECT public.expire_venue_holds()');` once. Check it with `SELECT jobname, schedule FROM cron.job;`. The API also runs `expire_venue_holds()` at startup and every minute (`hold-expiry-scheduler.ts`), so expiry still happens while the API is running even without `pg_cron`.
4. Verify with synthetic data only: place a hold with a deadline a few minutes ahead, confirm the period shows as held, wait for the deadline and confirm the booking becomes `EXPIRED` with one `VENUE_HOLD_EXPIRED` notification. Record the run as `MAN-YYYYMMDD-NN`.

The database clock is authoritative for every deadline check. A live hold stops occupying its venue at the deadline even before an expiry run marks it `EXPIRED`. Expiry is idempotent and safe to run from several API instances and `pg_cron` at the same time; it never approves a booking or changes an event. KAN-78 venue buffers will extend `backend/src/modules/venues/occupancy.ts`; KAN-64 will display the stored notifications.

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

## KAN-81 outage recovery — 21 October 2026

**Implementation record:** [010_venue_outage_impacts.sql](migrations/010_venue_outage_impacts.sql) adds `venue_outage_impacts`: one row per outage and affected approved booking, with a copy of the outage period and reason, a `RECOVERY_REQUIRED`/`RESOLVED`/`CLEARED` status and a unique index so reprocessing an outage records nothing twice. Deleting a block sets its `unavailability_id` to null and keeps the row as history. The table gets the same row-level security and Data API revocation as the other application tables. Fresh-install and upgrade checks run on an isolated PostgreSQL test database.

**Not yet applied to shared Supabase.** It follows migrations 008 and 009 from the sprint 3 integration; agree the deployment window with the team first (AGENTS.md §7.3). The backend's block routes read and write this table and fail on a database without migration 010.

## KAN-81 replacement link — 21 October 2026

**Implementation record:** [011_venue_booking_replacements.sql](migrations/011_venue_booking_replacements.sql) adds nullable `venue_bookings.replaces_booking_id`, a self-reference from a replacement to the outage-affected booking it replaces, with a partial index. Existing rows get NULL and are unchanged. It follows 010 because PR #47 merged 010; an applied migration is never edited. Not applied to shared Supabase; agree the window with the team (AGENTS.md §7.3). The booking routes read this column and fail on a database without migration 011.

## KAN-78 main reconciliation — 21 October 2026

The original branch migration `008_venue_occupied_intervals.sql` is superseded by `012_venue_occupied_intervals.sql` after main integration. Shared `008_notification_inbox.sql` and `009_venue_buffer_durations.sql` are preserved without edits. Migration 010 adds booking snapshots and occupied-interval/warning/guard objects, using duration columns already created by 009. Fresh installs, prior migration aliases and existing data passed the integration suite. Migration 010 was applied only to the isolated local test database; shared Supabase application is Not executed. Coordinate its application before deploying this PR.

**22 October integration numbering:** after KAN-81's 010 (outage impacts) and 011 (replacement bookings), KAN-78's occupied intervals become `012_venue_occupied_intervals.sql` (branch name 010) and KAN-83's holds become `013_venue_holds.sql` (branch names 008, then 011). 012's block trigger only takes the venue lock, so KAN-81 outages are not refused. 013 rebuilds `venue_booking_intervals` to expose the hold columns and extends the buffered booking trigger with live holds. None of 010–013 is applied to shared Supabase yet; apply them in order after the team agrees the window (AGENTS.md §7.3).


## KAN-9 operational equipment quantities — migration 014

[014_equipment_operational_quantities.sql](migrations/014_equipment_operational_quantities.sql) adds `equipment_types.damaged_quantity` and `maintenance_quantity`, both `integer NOT NULL DEFAULT 0`. Each must be nonnegative, and their sum must not exceed `total_quantity`; the sum constraint uses `bigint` casts so overflow cannot bypass validation. Existing stock, requests, reservations, event records and migration history are preserved. Fresh install and upgrade tests also verify the unchanged RLS/Data API restrictions.

For an active type, operational stock is `total_quantity - damaged_quantity - maintenance_quantity`; an inactive type has zero operational stock. KAN-9 subtracts peak simultaneous `RESERVED` demand in the half-open check period and clamps available quantity to zero. Migration 005's historical reservation trigger still guards **total** capacity. This read-only story does not replace it with an operational-stock reservation workflow: KAN-26 must recheck live losses and reservations under the shared equipment-pool lock when it implements reservation writes. KAN-18 owns stock maintenance; KAN-63 owns request editing/review.

**26 October setup follow-up:** the user reports migration 014 and test accounts ready. This is reported setup, not an independent schema audit or manual acceptance. For another environment, coordinate with the team, confirm the target development project, then run `npm run db:migrate` with the configured database administrator connection. Do not paste or modify old applied SQL. Verify the new migration ledger row and both stock-loss columns before restarting the matching API. Provision a Supabase Auth test account mapped to `app_users.role = 'TECHNICAL_SUPPORT_STAFF'`. The seed preserves existing stock and does not manufacture a KAN-9 equipment catalogue; agree test stock and requests with the team or wait for the dependent write workflows.

Automated migration and availability checks use an explicitly configured **dedicated** `TEST_DATABASE_URL` and disposable schemas, never shared Supabase cleanup. `database/tests/database.integration.test.ts` verifies default-zero upgrade/preservation and constraints; `database/tests/equipment/availability.integration.test.ts` exercises real HTTP/SQL calculations, live source/stock changes, access refusal and a PostgreSQL read-only session. Manual shared-data acceptance remains separate and **Not executed**.

## KAN-26 equipment reservations — migration 015

The active sequence is now **001–015**. [015_equipment_reservations.sql](migrations/015_equipment_reservations.sql) adds nullable `released_at`, `released_by` (FK to `app_users`), `release_reason` and `release_cause` to `equipment_requests`, and nullable `notifications.equipment_request_id` (FK to `equipment_requests`) with a partial index. Existing decisions, cancelled rows and notification records are not backfilled or rewritten. Release metadata is either all absent or records a cancelled line, release time, nonempty reason and one of `MANUAL_CANCELLATION`, `EVENT_CANCELLED`, `EVENT_COMPLETED`; manual cancellation additionally requires a release actor.

`protect_equipment_reservation_history()` prevents reserved/released allocation and decision changes, requires metadata for a reservation's release, prevents reuse of a released line, and makes recorded release metadata immutable. The original request row remains the reservation and its release history; there is no stock decrement/increment counter or separate reservation table.

`prevent_equipment_overbooking()` now checks an approved event and its exact current period, locks the event and equipment pool, and compares the new full quantity plus half-open peak `RESERVED` demand against current operational stock (`total - damaged - maintenance`, or zero if inactive). Existing reservations survive later stock losses; harmless metadata updates do not reserve again. The API locks the trusted actor and, for a reserve, the assigned coordinator profile in addition to event → sorted pool → sorted request ordering, re-reads after lock waits and records reservation notices atomically. Direct SQL new reservations receive the same database capacity protection.

`release_terminal_event_equipment()` runs only when an event actually changes to `CANCELLED` or `COMPLETED`. It locks affected pools/lines, releases only still-reserved rows, retains the original decision and allocation, and records a single release time, reason and cause. `released_by` uses transaction-local `app.actor_id` when set; a database action without an actor retains null rather than inventing one. Repeating a terminal status does not change the release record or add capacity again. KAN-62/KAN-10 must connect their pending lifecycle APIs to this trigger; no new cancel/complete event endpoint is supplied here.

**Shared 015 application: Not executed.** Migration 014 and test accounts are reported ready. Coordinate 015 with the team, confirm the intended development project, then run the unchanged `npm run db:migrate` runner. Verify both ledger entries, the four request release columns, the notification FK and the new history/release triggers before using the matching API. Do not edit already-applied migration 005 or rewrite historical cancellations. KAN-18 stock maintenance and KAN-63 request creation/editing remain pending; use only agreed saved test fixtures until those workflows exist.

`database/tests/equipment/reservations.integration.test.ts` uses disposable PostgreSQL schemas to verify operational stock races, API/SQL guards, decision/notification rollback, idempotency, retained release history, terminal transitions and recipient access. These automated fixtures do not establish connected shared-data manual acceptance. Keep the Data API disabled and use a provisioned Technical Support test account for later local acceptance.

## KAN-62 / KAN-63 event cancellation and equipment requests — migration 018

`018_event_cancellation_equipment_workflows.sql` adds the immutable `event_cancellations` outcome,
event-status-history reason, attendee cancellation outcome timestamp, equipment plan state, and
equipment-line technical requirements/revision. It does not add another equipment cancellation
metadata model: migration 015's `released_at`, `released_by`, `release_reason` and `release_cause`
remain authoritative. On an actual event transition to `CANCELLED`, the existing migration-015
trigger releases RESERVED lines once with cause `EVENT_CANCELLED`; the KAN-62 transaction marks
remaining REQUESTED/REJECTED lines with the same cause and its acting user. Equipment line
cancellation/replacement uses `MANUAL_CANCELLATION`. The new cancellation-audit table has RLS
enabled and direct Data API role privileges revoked; application access remains through the
authorised backend routes.

Migration 018 is allocated after the parallel migration-016/017 work. This checkout contains
migrations through 015 plus the new 018 file; apply migrations in numeric order. Fresh-install and
upgrade integration assertions were updated, but were **Not executed** in this follow-up. Do not
apply to shared Supabase without the team's deployment coordination. See the event module README
and `docs/testing/test-evidence.md` for route, automated-check and acceptance boundaries.
