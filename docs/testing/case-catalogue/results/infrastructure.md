# Database and integration infrastructure · execution records

11 entries in the execution register: 6 Pass, 5 Not executed. Each result belongs to the build, environment, executor and scope recorded for that entry. Preparation rows are retained when a later run is added. Within each case, entries follow the order of the source register; execution dates and run IDs identify the actual attempts.

[Feature specifications](../infrastructure.md) · [Execution CSV](../../test-executions.csv) · [Run evidence and logs](../../test-evidence.md)

This feature has 1 additional pre-freeze manual report with no exact execution date or build. The register keeps these entries alongside dated runs and preparation entries. [Pre-freeze manual report and case sources](../../pre-freeze-manual-results.md)

## TC-DB-201

[TC-DB-201](../infrastructure.md#tc-db-201) · KAN-24: Reproduce documented database setup and verified connection

### EX-DB-201-P01

| Field | Record |
| --- | --- |
| Actual result | Not recorded |
| Status | Not executed |
| Remarks | Planning placeholder, not a performed run. Original Not executed status retained. Existing evidence text may reference plans, partial/earlier checks or inspections; it does not establish execution of this complete specification. Append a new execution row after a real run. |
| Executed by | Not recorded |
| Date of execution | Not recorded |
| Run ID | Not recorded |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | Not recorded |


### EX-TEAM-20261025-S1-059

| Field | Record |
| --- | --- |
| Actual result | Reported successful: KAN-24: Reproduce documented database setup and verified connection. Individual observed output: Not recorded. |
| Status | Pass |
| Remarks | Reported on 25 October 2026 on behalf of the named story owner(s): all manual scenarios passed on the sprint-review date. Execution date is user-reported, not inferred from Git or independently observed. Tested build, environment, exact fixture values, observed HTTP/database output, screenshots and cleanup are Not recorded. The specification identifies the scenario, not proof that every example input was used. This report does not establish formal acceptance, hosted acceptance, a Done date or sprint velocity. Earlier failures, Not executed placeholders and later implementation/audit records remain separate. The 25 October fixes require fresh retesting. Covers the original pre-Week-7 story version only; later Lead allocation, buffers, holds and new criteria are excluded. |
| Executed by | Arvin |
| Date of execution | 2026-09-19 |
| Run ID | MAN-20260919-TEAM-01 |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | REPORT-20261025-TEAM-S1; [docs/testing/test-evidence.md#25-october-2026--team-manual-result-reports](../../test-evidence.md#25-october-2026--team-manual-result-reports) |


## TC-DB-202

[TC-DB-202](../infrastructure.md#tc-db-202) · KAN-24: Verify schema constraints and non-destructive reruns

### EX-DB-202-P01

| Field | Record |
| --- | --- |
| Actual result | Not recorded |
| Status | Not executed |
| Remarks | Planning placeholder, not a performed run. Original Not executed status retained. Existing evidence text may reference plans, partial/earlier checks or inspections; it does not establish execution of this complete specification. Append a new execution row after a real run. |
| Executed by | Not recorded |
| Date of execution | Not recorded |
| Run ID | Not recorded |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | Not recorded |


### EX-PREFREEZE-AUDIT-TC-DB-202

**Recovered automated result.** The evidence identifies the historical run and assertions covering this case. The audit matched evidence from the original run without re-executing the tests.

| Field | Record |
| --- | --- |
| Actual result | Named raw checks in one pre-freeze run show migrations persisted, rerunning schema/seed preserved edits, preserved prior ledger names without duplicate execution, and enforced booking, stock and registration constraints. SCF-DB-01/02/08 plus CORE-DB-02/04/05 are individually green in the retained verbose log. The disposable environment and verified commit are recorded in kan26-20261026/summary.json. This is the DB-infrastructure level specified, not a business-journey pass. |
| Status | Pass |
| Remarks | Case-level result recovered from this retained automated run. The evidence audit identifies the named assertions, tested boundary and raw artifact. |
| Executed by | Automated test runner |
| Date of execution | 2026-10-26 |
| Run ID | AUTO-20261026-KAN26-01 |
| Build | b29dc1261937c4f66708ae35d043779737c99e2e (verified source commit in the KAN-26 run manifest) |
| Environment | Windows, Node 24.21.0, Vitest 4.1.11, dedicated disposable PostgreSQL 17 on 127.0.0.1:55432; synthetic actors and substituted identity provider where applicable; no shared database. |
| Evidence | [docs/testing/pre-freeze-case-audit.md#case-tc-db-202](../../pre-freeze-case-audit.md#case-tc-db-202); [docs/scrum/sprint-04/evidence/kan26-20261026/integration.txt](../../../scrum/sprint-04/evidence/kan26-20261026/integration.txt) |


## TC-DB-203

[TC-DB-203](../infrastructure.md#tc-db-203) · KAN-24: Verify database access protection and the Data API setting

### EX-DB-203-P01

| Field | Record |
| --- | --- |
| Actual result | Not recorded |
| Status | Not executed |
| Remarks | Planning placeholder, not a performed run. Original Not executed status retained. Existing evidence text may reference plans, partial/earlier checks or inspections; it does not establish execution of this complete specification. Append a new execution row after a real run. |
| Executed by | Not recorded |
| Date of execution | Not recorded |
| Run ID | Not recorded |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | Not recorded |


### EX-TEAM-20261025-S1-060

| Field | Record |
| --- | --- |
| Actual result | Reported successful: KAN-24: Verify database access protection and the Data API setting. Individual observed output: Not recorded. |
| Status | Pass |
| Remarks | Reported on 25 October 2026 on behalf of the named story owner(s): all manual scenarios passed on the sprint-review date. Execution date is user-reported, not inferred from Git or independently observed. Tested build, environment, exact fixture values, observed HTTP/database output, screenshots and cleanup are Not recorded. The specification identifies the scenario, not proof that every example input was used. This report does not establish formal acceptance, hosted acceptance, a Done date or sprint velocity. Earlier failures, Not executed placeholders and later implementation/audit records remain separate. The 25 October fixes require fresh retesting. Covers the original pre-Week-7 story version only; later Lead allocation, buffers, holds and new criteria are excluded. |
| Executed by | Arvin |
| Date of execution | 2026-09-19 |
| Run ID | MAN-20260919-TEAM-01 |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | REPORT-20261025-TEAM-S1; [docs/testing/test-evidence.md#25-october-2026--team-manual-result-reports](../../test-evidence.md#25-october-2026--team-manual-result-reports) |


## TC-DB-204

[TC-DB-204](../infrastructure.md#tc-db-204) · KAN-24: Verify representative persistence through integration tests

### EX-DB-204-P01

| Field | Record |
| --- | --- |
| Actual result | Not recorded |
| Status | Not executed |
| Remarks | Planning placeholder, not a performed run. Original Not executed status retained. Existing evidence text may reference plans, partial/earlier checks or inspections; it does not establish execution of this complete specification. Append a new execution row after a real run. |
| Executed by | Not recorded |
| Date of execution | Not recorded |
| Run ID | Not recorded |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | Not recorded |


### EX-PREFREEZE-AUDIT-TC-DB-204

**Recovered automated result.** The evidence identifies the historical run and assertions covering this case. The audit matched evidence from the original run without re-executing the tests.

| Field | Record |
| --- | --- |
| Actual result | The raw log names passing SCF-DB-01, CORE-DB-01/02/03/04/05/06 and the mapped-identity owned-draft test. The latter inserts representative drafts, retrieves the persisted owner record over HTTP, and denies the unrelated draft. The three suites named in TC-DB-204 ran together on the disposable PG17 setup. Isolation/build in kan26-20261026/summary.json. |
| Status | Pass |
| Remarks | Case-level result recovered from this retained automated run. The evidence audit identifies the named assertions, tested boundary and raw artifact. |
| Executed by | Automated test runner |
| Date of execution | 2026-10-26 |
| Run ID | AUTO-20261026-KAN26-01 |
| Build | b29dc1261937c4f66708ae35d043779737c99e2e (verified source commit in the KAN-26 run manifest) |
| Environment | Windows, Node 24.21.0, Vitest 4.1.11, dedicated disposable PostgreSQL 17 on 127.0.0.1:55432; synthetic actors and substituted identity provider where applicable; no shared database. |
| Evidence | [docs/testing/pre-freeze-case-audit.md#case-tc-db-204](../../pre-freeze-case-audit.md#case-tc-db-204); [docs/scrum/sprint-04/evidence/kan26-20261026/integration.txt](../../../scrum/sprint-04/evidence/kan26-20261026/integration.txt) |


## TC-DB-205

[TC-DB-205](../infrastructure.md#tc-db-205) · KAN-24: Check the database diagram against the adopted schema

### EX-DB-205-P01

| Field | Record |
| --- | --- |
| Actual result | Not recorded |
| Status | Not executed |
| Remarks | Planning placeholder, not a performed run. Original Not executed status retained. Existing evidence text may reference plans, partial/earlier checks or inspections; it does not establish execution of this complete specification. Append a new execution row after a real run. |
| Executed by | Not recorded |
| Date of execution | Not recorded |
| Run ID | Not recorded |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | Not recorded |


### EX-PREFREEZE-MANUAL-TC-DB-205

**Team-reported pre-freeze manual result.** The team reported this case passed before the freeze. The exact execution date, tested build and environment were not recorded.

| Field | Record |
| --- | --- |
| Actual result | Team-reported Pass for the manual procedure before the code freeze. Individual step observations were not supplied. |
| Status | Pass |
| Remarks | Tristan confirmed the pre-freeze manual runs. Story ownership: KAN-24. Bound: before 1 November 2026, 23:59 SGT; exact execution date and build not recorded. |
| Executed by | Arvin |
| Date of execution | Not recorded |
| Run ID | REPORT-PREFREEZE-MANUAL |
| Build | Not recorded |
| Environment | Not recorded |
| Evidence | [docs/testing/pre-freeze-manual-results.md#tc-db-205](../../pre-freeze-manual-results.md#tc-db-205) |


## TC-DB-207

[TC-DB-207](../infrastructure.md#tc-db-207) · KAN-24 pool safeguards and browser harness prevent unintended shared-database use

### EX-DB-207-AUTO-20261101-TEST-HARDENING-A1

| Field | Record |
| --- | --- |
| Actual result | Six pool configuration/error tests and two owned browser-environment guard tests passed. Invalid/remote/override URLs were refused and inherited database/auth settings were replaced. |
| Status | Pass |
| Remarks | Pool checks construct but never query/connect; browser guards use synthetic environment strings. No shared database cleanup or hosted connectivity is claimed. |
| Executed by | Automated local test runner |
| Date of execution | 2026-11-01 |
| Run ID | AUTO-20261101-TEST-HARDENING |
| Build | 034a631bdb05309d4ba0ef4ed1ff9ba032d9df50 + uncommitted fix/release-regressions working tree; final-source SHA-256 manifest in [docs/scrum/sprint-04/evidence/test-hardening-20261101/summary.json](../../../scrum/sprint-04/evidence/test-hardening-20261101/summary.json) |
| Environment | Windows; Node 24.21.0; Vitest; real Express/JOSE or pg.Pool as specified; synthetic identity/service or loopback boundaries, no shared database; node:test for browser environment guards |
| Evidence | AUTO-20261101-TEST-HARDENING; [docs/scrum/sprint-04/evidence/test-hardening-20261101/check-final.txt](../../../scrum/sprint-04/evidence/test-hardening-20261101/check-final.txt); [docs/scrum/sprint-04/evidence/test-hardening-20261101/backend-combined-final.txt](../../../scrum/sprint-04/evidence/test-hardening-20261101/backend-combined-final.txt) |
