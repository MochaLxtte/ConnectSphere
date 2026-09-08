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

Run the migrations and optional fictional development seeds:

```sh
npm run db:migrate
npm run db:seed
```

Verify the connection using the application's overview page or `GET /api/health/ready`. An unconfigured URL, unreachable project or missing migration produces a readiness failure. Hosting the database does not implement login; authentication remains part of KAN-25.

## Shared schema and migrations

The migration runner applies numbered SQL files in order within one transaction, records checksums, and serializes concurrent runners using a database advisory lock. Run it again to apply only new migrations. Never edit an applied file: add the next numbered migration and coordinate numbering with other developers. Migrations run explicitly, never automatically on API startup. Back up important data before schema changes; this starter has no automatic rollback/down-migration facility.

Application tables remain in the `public` schema. The hardening migration enables row-level security and revokes access for Supabase Data API roles on the scaffold tables; it creates no client access policies. The Data API must remain disabled for this architecture. Express's database owner connection can access these tables, so services still have to enforce each person's role and ownership. Apply equivalent restrictions to new tables as they are introduced. See [Supabase data access guidance](https://supabase.com/docs/guides/database/secure-data).

A Git branch does not isolate a shared database. Agree schema changes with Dev 6 before applying them to the team's project. Use separate projects or the local test database for experiments that would disrupt other developers. Do not run destructive reset commands against the shared project.

The initial schema covers user identity, incomplete event drafts, coordinator linkage, clarification records, and review outcomes. It intentionally has no reservation or registration schema yet. Draft fields may be NULL, and submission rules must be implemented separately after clarification. The six statuses, single role per user, single proposed time interval, and text requirement fields are starting design choices, not approved customer policy. Services must update `updated_at` on writes and enforce roles, ownership, transitions, and atomic review operations; the schema alone does not do so.

Seeds contain fictional `.test` accounts with NULL password hashes, plus one incomplete draft. They cannot authenticate. Re-running seeding inserts missing examples without replacing existing data. Seeding is disabled for `NODE_ENV=production`; point it only at a development database. KAN-25 owns identity integration, KAN-24 owns schema evolution and representative integration fixtures.

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
