# Database

PostgreSQL 17 is the development and CI database. Run commands from the repository root:

```sh
npm run setup
npm run db:up
npm run db:migrate
npm run db:seed
```

`db:down` stops the Compose service and retains its named volume. The scaffold provides no automatic reset command. Changing `.env` credentials after a database volume has already been initialised does not change its PostgreSQL users; use the existing credentials or deliberately provision a separate database.

The migration runner applies numbered SQL files in order within one transaction, records checksums, and serializes concurrent runners using a database advisory lock. Run it again to apply only new migrations. Never edit an applied file: add the next numbered migration and coordinate numbering with other developers. Migrations run explicitly, never automatically on API startup. Back up important data before schema changes; this starter has no automatic rollback/down-migration facility.

The initial schema covers user identity, incomplete event drafts, coordinator linkage, clarification records, and review outcomes. It intentionally has no reservation or registration schema yet. Draft fields may be NULL, and submission rules must be implemented separately after clarification. The six statuses, single role per user, single proposed time interval, and text requirement fields are starting design choices, not approved customer policy. Services must update `updated_at` on writes and enforce roles, ownership, transitions, and atomic review operations; the schema alone does not do so.

Seeds contain fictional `.test` accounts with NULL password hashes, plus one incomplete draft. They cannot authenticate. Re-running seeding inserts missing examples without replacing existing data. Seeding is disabled for `NODE_ENV=production`; point it only at a development database. KAN-25 owns credential setup, KAN-24 owns schema evolution and representative integration fixtures.

For integration tests, supply `TEST_DATABASE_URL` pointing to a dedicated test database. Tests create and drop an isolated schema in that database, never reset the public schema. CI provisions its own PostgreSQL service.
