# Infrastructure · database and integration

6 specification rows. Open a case to read its setup, inputs, steps, expected result and original scope notes. The status column shows all outcomes on the latest recorded execution day. Separately labelled pre-freeze reports have no exact execution date, so the table does not infer their order relative to dated runs.

[Catalogue](README.md) · [Execution records](results/infrastructure.md) · [Feature mappings](trace/infrastructure.md)

| Case | Scenario | Dated outcome and undated reports |
| --- | --- | --- |
| [TC-DB-201](#tc-db-201) | KAN-24: Reproduce documented database setup and verified connection | 2026-09-19 · Pass |
| [TC-DB-202](#tc-db-202) | KAN-24: Verify schema constraints and non-destructive reruns | 2026-10-26 · Pass / pre-freeze automated run verified in audit |
| [TC-DB-203](#tc-db-203) | KAN-24: Verify database access protection and the Data API setting | 2026-09-19 · Pass |
| [TC-DB-204](#tc-db-204) | KAN-24: Verify representative persistence through integration tests | 2026-10-26 · Pass / pre-freeze automated run verified in audit |
| [TC-DB-205](#tc-db-205) | KAN-24: Check the database diagram against the adopted schema | Before freeze · team-reported manual Pass (date unrecorded) |
| [TC-DB-207](#tc-db-207) | KAN-24 pool safeguards and browser harness prevent unintended shared-database use | 2026-11-01 · Pass |

## TC-DB-201

| Field | Record |
| --- | --- |
| Test case ID | TC-DB-201 |
| Test scenario | KAN-24: Reproduce documented database setup and verified connection |
| Pre-conditions | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. |
| Test steps | 1. On a clean checkout record the commit and Node version; follow README.md and [database/README.md](../../../database/README.md) to install dependencies and configure the authorised test/development database with verified TLS. Apply only the agreed migration/seed procedure and start the API; GET /api/health/ready. Do not print secrets or apply unapproved shared migrations. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Test data | Not recorded |
| Expected result | A teammate can reproduce setup and the API reports the intended database connected with certificate verification enabled; commands, environment and commit are captured. |
| Created by | Not recorded |
| Date of creation | Not recorded |
| Feature / planned level | Infrastructure · integration |
| Acceptance criterion IDs | KAN-24-AC1 |
| Traceability | [Mapping 103](trace/infrastructure.md#mapping-103) |
| Execution record | 2026-09-19 · Pass · [All 2 register entries](results/infrastructure.md#tc-db-201) |


<details>
<summary>Specification notes and earlier register entry</summary>

Existing specification reformatted on 2026-10-21; original text and evidence preserved in [docs/testing/archive/test-cases-2026-10-21.csv](../archive/test-cases-2026-10-21.csv). Level reviewed 2026-11-01; previous label: manual. Boundary rationale is retained in AUTO-20261101-TEST-HARDENING/test-level-classification.json; method/purpose is separate from level.


**Earlier combined register, 21 October 2026.** The following is the historical row as recorded before specifications and executions were separated. Its result column belongs to that snapshot. [Archived register](../archive/test-cases-2026-10-21.csv)

| Field | Record |
| --- | --- |
| Feature | Infrastructure |
| Test scenario | KAN-24: Reproduce documented database setup and verified connection |
| Planned level | manual |
| Acceptance criterion IDs | KAN-24-AC1 |
| Preconditions and steps | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. On a clean checkout record the commit and Node version; follow README.md and [database/README.md](../../../database/README.md) to install dependencies and configure the authorised test/development database with verified TLS. Apply only the agreed migration/seed procedure and start the API; GET /api/health/ready. Do not print secrets or apply unapproved shared migrations. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Expected result | A teammate can reproduce setup and the API reports the intended database connected with certificate verification enabled; commands, environment and commit are captured. |
| Original combined result | Not executed |
| Original combined evidence | Not recorded |


</details>

## TC-DB-202

| Field | Record |
| --- | --- |
| Test case ID | TC-DB-202 |
| Test scenario | KAN-24: Verify schema constraints and non-destructive reruns |
| Pre-conditions | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. |
| Test steps | 1. Use a dedicated disposable PostgreSQL test database only. Run npm run test:integration -- [database/tests/database.integration.test.ts](../../../database/tests/database.integration.test.ts) [database/tests/core-schema.integration.test.ts](../../../database/tests/core-schema.integration.test.ts); inspect cases for required relationships/constraints and rerunning migration/seed without overwriting existing fixtures; record the output and tested commit. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Test data | Not recorded |
| Expected result | Relevant constraint and non-destructive setup tests pass on the disposable database; unexpected overwrites or missing constraints are recorded as failures. No cleanup test targets shared Supabase. |
| Created by | Not recorded |
| Date of creation | Not recorded |
| Feature / planned level | Infrastructure · integration |
| Acceptance criterion IDs | KAN-24-AC2 |
| Traceability | [Mapping 103](trace/infrastructure.md#mapping-103) |
| Execution record | 2026-10-26 · Pass / pre-freeze automated run verified in audit · [All 2 register entries](results/infrastructure.md#tc-db-202) |
| Historical automated result | 2026-10-26 Pass · [EX-PREFREEZE-AUDIT-TC-DB-202](results/infrastructure.md#ex-prefreeze-audit-tc-db-202) · [Case audit](../pre-freeze-case-audit.md#case-tc-db-202) |


<details>
<summary>Specification notes and earlier register entry</summary>

Existing specification reformatted on 2026-10-21; original text and evidence preserved in [docs/testing/archive/test-cases-2026-10-21.csv](../archive/test-cases-2026-10-21.csv).


**Earlier combined register, 21 October 2026.** The following is the historical row as recorded before specifications and executions were separated. Its result column belongs to that snapshot. [Archived register](../archive/test-cases-2026-10-21.csv)

| Field | Record |
| --- | --- |
| Feature | Infrastructure |
| Test scenario | KAN-24: Verify schema constraints and non-destructive reruns |
| Planned level | integration |
| Acceptance criterion IDs | KAN-24-AC2 |
| Preconditions and steps | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. Use a dedicated disposable PostgreSQL test database only. Run npm run test:integration -- [database/tests/database.integration.test.ts](../../../database/tests/database.integration.test.ts) [database/tests/core-schema.integration.test.ts](../../../database/tests/core-schema.integration.test.ts); inspect cases for required relationships/constraints and rerunning migration/seed without overwriting existing fixtures; record the output and tested commit. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Expected result | Relevant constraint and non-destructive setup tests pass on the disposable database; unexpected overwrites or missing constraints are recorded as failures. No cleanup test targets shared Supabase. |
| Original combined result | Not executed |
| Original combined evidence | Not recorded |


</details>

## TC-DB-203

| Field | Record |
| --- | --- |
| Test case ID | TC-DB-203 |
| Test scenario | KAN-24: Verify database access protection and the Data API setting |
| Pre-conditions | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. |
| Test steps | 1. In the authorised Supabase development dashboard, directly inspect the Data API enabled/disabled setting; separately inspect application-table RLS and role grants against [database/README.md](../../../database/README.md). Capture settings/privilege evidence without keys. Do not change permissions as part of this read-only check. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Test data | Not recorded |
| Expected result | The dashboard directly confirms the Data API is disabled and the adopted application tables retain their reviewed RLS/privilege boundaries; an HTTP error alone is not sufficient evidence. |
| Created by | Not recorded |
| Date of creation | Not recorded |
| Feature / planned level | Infrastructure · static analysis |
| Acceptance criterion IDs | KAN-24-AC2 |
| Traceability | [Mapping 103](trace/infrastructure.md#mapping-103) |
| Execution record | 2026-09-19 · Pass · [All 2 register entries](results/infrastructure.md#tc-db-203) |


<details>
<summary>Specification notes and earlier register entry</summary>

Existing specification reformatted on 2026-10-21; original text and evidence preserved in [docs/testing/archive/test-cases-2026-10-21.csv](../archive/test-cases-2026-10-21.csv). Level reviewed 2026-11-01; previous label: manual. Boundary rationale is retained in AUTO-20261101-TEST-HARDENING/test-level-classification.json; method/purpose is separate from level.


**Earlier combined register, 21 October 2026.** The following is the historical row as recorded before specifications and executions were separated. Its result column belongs to that snapshot. [Archived register](../archive/test-cases-2026-10-21.csv)

| Field | Record |
| --- | --- |
| Feature | Infrastructure |
| Test scenario | KAN-24: Verify database access protection and the Data API setting |
| Planned level | manual |
| Acceptance criterion IDs | KAN-24-AC2 |
| Preconditions and steps | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. In the authorised Supabase development dashboard, directly inspect the Data API enabled/disabled setting; separately inspect application-table RLS and role grants against [database/README.md](../../../database/README.md). Capture settings/privilege evidence without keys. Do not change permissions as part of this read-only check. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Expected result | The dashboard directly confirms the Data API is disabled and the adopted application tables retain their reviewed RLS/privilege boundaries; an HTTP error alone is not sufficient evidence. |
| Original combined result | Not executed |
| Original combined evidence | Not recorded |


</details>

## TC-DB-204

| Field | Record |
| --- | --- |
| Test case ID | TC-DB-204 |
| Test scenario | KAN-24: Verify representative persistence through integration tests |
| Pre-conditions | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. |
| Test steps | 1. Use a dedicated disposable PostgreSQL test database and record its isolation plus the tested commit. Run npm run test:integration -- [database/tests/database.integration.test.ts](../../../database/tests/database.integration.test.ts) [database/tests/core-schema.integration.test.ts](../../../database/tests/core-schema.integration.test.ts) [database/tests/auth.integration.test.ts](../../../database/tests/auth.integration.test.ts); retain actual summaries and relevant persistence/retrieval assertions. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Test data | Not recorded |
| Expected result | The application/database integration checks can persist and retrieve representative synthetic records while enforcing schema constraints; actual output is captured and business-story acceptance is not inferred. |
| Created by | Not recorded |
| Date of creation | Not recorded |
| Feature / planned level | Infrastructure · integration |
| Acceptance criterion IDs | KAN-24-AC3 |
| Traceability | [Mapping 103](trace/infrastructure.md#mapping-103) |
| Execution record | 2026-10-26 · Pass / pre-freeze automated run verified in audit · [All 2 register entries](results/infrastructure.md#tc-db-204) |
| Historical automated result | 2026-10-26 Pass · [EX-PREFREEZE-AUDIT-TC-DB-204](results/infrastructure.md#ex-prefreeze-audit-tc-db-204) · [Case audit](../pre-freeze-case-audit.md#case-tc-db-204) |


<details>
<summary>Specification notes and earlier register entry</summary>

Existing specification reformatted on 2026-10-21; original text and evidence preserved in [docs/testing/archive/test-cases-2026-10-21.csv](../archive/test-cases-2026-10-21.csv).


**Earlier combined register, 21 October 2026.** The following is the historical row as recorded before specifications and executions were separated. Its result column belongs to that snapshot. [Archived register](../archive/test-cases-2026-10-21.csv)

| Field | Record |
| --- | --- |
| Feature | Infrastructure |
| Test scenario | KAN-24: Verify representative persistence through integration tests |
| Planned level | integration |
| Acceptance criterion IDs | KAN-24-AC3 |
| Preconditions and steps | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. Use a dedicated disposable PostgreSQL test database and record its isolation plus the tested commit. Run npm run test:integration -- [database/tests/database.integration.test.ts](../../../database/tests/database.integration.test.ts) [database/tests/core-schema.integration.test.ts](../../../database/tests/core-schema.integration.test.ts) [database/tests/auth.integration.test.ts](../../../database/tests/auth.integration.test.ts); retain actual summaries and relevant persistence/retrieval assertions. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Expected result | The application/database integration checks can persist and retrieve representative synthetic records while enforcing schema constraints; actual output is captured and business-story acceptance is not inferred. |
| Original combined result | Not executed |
| Original combined evidence | Not recorded |


</details>

## TC-DB-205

| Field | Record |
| --- | --- |
| Test case ID | TC-DB-205 |
| Test scenario | KAN-24: Check the database diagram against the adopted schema |
| Pre-conditions | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. |
| Test steps | 1. Read [docs/database-diagram.md](../../database-diagram.md) and the numbered migration files for the tested commit; compare table names, key fields, cardinalities and foreign keys with the authorised development schema metadata. Check that schema-changing PRs update the diagram and any required export. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Test data | Not recorded |
| Expected result | The diagram represents the adopted tables and relationships accurately and its maintenance is traceable to schema changes; every mismatch is recorded for correction. |
| Created by | Not recorded |
| Date of creation | Not recorded |
| Feature / planned level | Infrastructure · static analysis |
| Acceptance criterion IDs | KAN-24-AC4 |
| Traceability | [Mapping 103](trace/infrastructure.md#mapping-103) |
| Execution record | Before freeze · team-reported manual Pass (date unrecorded) · [All 2 register entries](results/infrastructure.md#tc-db-205) |
| Pre-freeze manual report | Reported Pass before the cutoff; exact date and build unrecorded. [EX-PREFREEZE-MANUAL-TC-DB-205](results/infrastructure.md#ex-prefreeze-manual-tc-db-205) |


<details>
<summary>Specification notes and earlier register entry</summary>

Existing specification reformatted on 2026-10-21; original text and evidence preserved in [docs/testing/archive/test-cases-2026-10-21.csv](../archive/test-cases-2026-10-21.csv). Level reviewed 2026-11-01; previous label: manual. Boundary rationale is retained in AUTO-20261101-TEST-HARDENING/test-level-classification.json; method/purpose is separate from level.


**Earlier combined register, 21 October 2026.** The following is the historical row as recorded before specifications and executions were separated. Its result column belongs to that snapshot. [Archived register](../archive/test-cases-2026-10-21.csv)

| Field | Record |
| --- | --- |
| Feature | Infrastructure |
| Test scenario | KAN-24: Check the database diagram against the adopted schema |
| Planned level | manual |
| Acceptance criterion IDs | KAN-24-AC4 |
| Preconditions and steps | Use an authorised development/test environment and synthetic fixtures only; record the build, URL and fixture IDs. The tester signs in personally. Read [docs/database-diagram.md](../../database-diagram.md) and the numbered migration files for the tested commit; compare table names, key fields, cardinalities and foreign keys with the authorised development schema metadata. Check that schema-changing PRs update the diagram and any required export. Record the observed response/screenshot; restore any changed pre-existing fixture values and list new fixtures for agreed cleanup. |
| Expected result | The diagram represents the adopted tables and relationships accurately and its maintenance is traceable to schema changes; every mismatch is recorded for correction. |
| Original combined result | Not executed |
| Original combined evidence | Not recorded |


</details>

## TC-DB-207

| Field | Record |
| --- | --- |
| Test case ID | TC-DB-207 |
| Test scenario | KAN-24 pool safeguards and browser harness prevent unintended shared-database use |
| Pre-conditions | Node/Vitest for pool construction and node:test for browser environment validation; real pg.Pool is constructed but no query/connect is issued. Synthetic URLs only; no real database cleanup or shared project access. |
| Test steps | 1. Construct the pool and inspect connection bounds/timeouts without opening a socket.<br>2. Emit an idle connection error and inspect sanitized logging.<br>3. Reject invalid/insecure connection configuration.<br>4. Validate explicit loopback browser-test URLs ending in _test and reject remote, wrong-name, wrong-scheme and query-string overrides.<br>5. Build the owned browser API environment from inherited shared/production-like settings and verify replacement before imports. |
| Test data | Loopback localhost/127.0.0.1/IPv6 test databases; synthetic credentials; remote Supabase-like hostname; host/options/dbname query overrides; inherited DATABASE_URL, TEST_DATABASE_URL, MIGRATION_DATABASE_URL, SUPABASE_* and VITE_* values. |
| Expected result | Pool construction is lazy and bounded; idle failures do not crash or expose credentials. Invalid/insecure configuration fails before a usable pool is returned. Browser harness accepts only explicit dedicated local databases and replaces inherited database/auth settings without mutating the input environment. |
| Created by | Not recorded |
| Date of creation | 2026-11-01 |
| Feature / planned level | Infrastructure · unit |
| Acceptance criterion IDs | KAN-24-AC1; KAN-24-AC2 |
| Traceability | [Mapping 224](trace/infrastructure.md#mapping-224) |
| Execution record | 2026-11-01 · Pass · [All 1 register entry](results/infrastructure.md#tc-db-207) |


<details>
<summary>Specification notes</summary>

Six pool unit checks and two owned harness unit checks support database setup/access safeguards. They do not establish hosted TLS connectivity, migrations or RLS; those remain separately covered by TC-DB-201..204.


</details>
