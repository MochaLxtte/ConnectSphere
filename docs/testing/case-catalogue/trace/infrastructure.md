# Database and integration infrastructure · traceability mappings

2 grouped mappings from the traceability register. Mapping numbers identify data rows in that register, starting at 1 after the header. A path listed for a group supports the scope described in that row. The case and execution pages provide the case-specific outcomes.

[Mapping index](../trace-index.md) · [Original traceability register](../../../requirements/traceability.csv)

## Mapping 103

| Field | Record |
| --- | --- |
| Feature | Infrastructure · Database and integration infrastructure |
| Story IDs | KAN-24 |
| Acceptance criterion IDs | KAN-24-AC1; KAN-24-AC2; KAN-24-AC3; KAN-24-AC4 |
| Implementation | [database/migrate.ts](../../../../database/migrate.ts); [database/seed.ts](../../../../database/seed.ts); [database/README.md](../../../../database/README.md); [docs/database-diagram.md](../../../database-diagram.md) |
| Test case / sprint group IDs | [TC-DB-201](../infrastructure.md#tc-db-201); [TC-DB-202](../infrastructure.md#tc-db-202); [TC-DB-203](../infrastructure.md#tc-db-203); [TC-DB-204](../infrastructure.md#tc-db-204); [TC-DB-205](../infrastructure.md#tc-db-205) |
| Automated test path | [database/tests/database.integration.test.ts](../../../../database/tests/database.integration.test.ts); [database/tests/core-schema.integration.test.ts](../../../../database/tests/core-schema.integration.test.ts); [database/tests/auth.integration.test.ts](../../../../database/tests/auth.integration.test.ts) |
| Recorded status and scope | 17 October 2026 specification reconciliation: source criteria and retained local IDs mapped in [docs/scrum/sprint-01/sprint-backlog.md#criterion-crosswalk--17-october-2026](../../../scrum/sprint-01/sprint-backlog.md#criterion-crosswalk--17-october-2026). New cases Not executed; evidence Not recorded. Listed automated files are existing regression targets, not proof that these newly specified scenarios have passed. Historical review/acceptance records and later customer-change scope remain separate. 25 October Arvin readback: PR #10 schema merged 20 September, after Sprint 1 planned end; PR #19 removed premature feature scope. No additional manual setup/security/diagram acceptance or on-time velocity inferred. Reported manual evidence added 25 October: REPORT-20261025-TEAM-S1 for TC-DB-201, TC-DB-203. Dates are reported review dates; builds/environment unrecorded, prior results retained, acceptance not inferred. |


## Mapping 224

| Field | Record |
| --- | --- |
| Feature | Infrastructure · Database and test-environment safeguards |
| Story IDs | KAN-24 |
| Acceptance criterion IDs | KAN-24-AC1; KAN-24-AC2 |
| Implementation | [backend/src/db/pool.ts](../../../../backend/src/db/pool.ts); [tests/browser/environment.ts](../../../../tests/browser/environment.ts); [tests/browser/start-api.ts](../../../../tests/browser/start-api.ts) |
| Test case / sprint group IDs | [TC-DB-207](../infrastructure.md#tc-db-207) |
| Automated test path | [backend/test/database-pool.test.ts](../../../../backend/test/database-pool.test.ts); [tests/browser/environment.test.ts](../../../../tests/browser/environment.test.ts) |
| Recorded status and scope | AUTO-20261101-TEST-HARDENING: scoped automated checks passed. See the case-level execution rows for prior failures, fixture boundaries and exact subset. No whole-story or connected acceptance is implied. |
