# Pre-Week 7 customer changes

Preserved on 6 November 2026.

These documents preserve the repository **as of 1 October 2026**, commit `b981f1133750e7ddd42ac412651c915cb4485418`, before receipt of the customer changes on 2 October. Individual documents were already present in September. The snapshot date identifies the version retained.

| Original document | Preserved copy |
| --- | --- |
| Architecture (C4 and curated ERDs) | [architecture.md](architecture.md) |
| API contract | [api-contract.md](api-contract.md) |
| Database model | [database-diagram.md](database-diagram.md) |
| Class and sequence diagram source / exports | **Not recorded** in this snapshot |

The 10 October revision (`3bd64f8`) still listed C3, class and sequence diagrams as “To draw”. The first committed class and sequence models appear on 19 October (`6eb6450`), after the customer changes.

[The manifest](manifest.json) identifies the three original Git blobs and their SHA-256 checksums. For checksum verification, use the repository copies in Folder 6 with LF line endings. Folder 2 adjusts Markdown links for submission navigation. The original text uses paths relative to its original location. The [current architecture](../../README.md), [API contract](../../api-contract.md) and [data model](../../../database-diagram.md) link to the frozen implementation.

## C4 views — added 6 November 2026

[Open all five C4 views](c4-gallery.html) · [Every-node, connection and boundary audit](c4-audit.md).

The original C1/C2 Mermaid has now been rendered unchanged into PNG/SVG. These are new exports of genuine historical source, not October exports. Separate, clearly labelled C1/C2/C3 reconstructions were prepared from the same pinned 1 October code. An original C3 remains **Not recorded**; its reconstruction is not presented as a historical original. The audited views distinguish implemented organiser/coordinator workflows from the venue/equipment/attendee workflows that had role/schema support but no business APIs or pages yet.

The audit covers 44 displayed blocks (including three notation legends), 55 directed connections and three boundaries across all five views. The original Markdown snapshots and their manifest remain unchanged. [S3-E32](../../../scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106/README.md) retains the individual source proofs and export checks.

## Original ERDs

The October snapshot contains three Mermaid ERDs. Each standalone source below is a byte-for-byte extraction of the indicated fenced block, including its final newline. The SVG and PNG files were first rendered on **6 November 2026**, using Mermaid CLI 12.0.0 and Mermaid 12.2.0. Open the SVG to zoom in on column names and relationship labels.

| 1 October view | Source in the preserved snapshot | Standalone source and 6 November renders |
| --- | --- | --- |
| Sprint 1 request workflow · 6 entities, 9 relationships | [Architecture, lines 77–136](architecture.md#sprint-1-request-workflow) | [Mermaid](erd-source/erd-events-original.mmd) · [SVG](erd-exports/erd-events-original.svg) · [PNG](erd-exports/erd-events-original.png) |
| Venues, equipment, registration and notifications · 10 entities, 10 relationships | [Architecture, lines 140–224](architecture.md#venues-equipment-registration-and-notifications) | [Mermaid](erd-source/erd-planning-original.mmd) · [SVG](erd-exports/erd-planning-original.svg) · [PNG](erd-exports/erd-planning-original.png) |
| Database schema · 15 entities, 29 relationships | [Database model, lines 7–224](database-diagram.md) | [Mermaid](erd-source/erd-database-original.mmd) · [SVG](erd-exports/erd-database-original.svg) · [PNG](erd-exports/erd-database-original.png) |

The original database view omits the two utility tables. The second curated ERD uses `APP_USERS` and `EVENT_REQUESTS` as relationship endpoints and gives their columns in the first view. The diagram exports preserve those choices. The three source blocks were checked against `b981f11` and each render was checked against its source entity and relationship counts.

## What changed in the frozen design

| Family | 1 October baseline | Frozen implementation and corresponding view |
| --- | --- | --- |
| C1 · people and system | Five roles in the intended release. The retrospective audit identifies which interactions the code supported on 1 October. | Coordinator Lead takes allocation and handover responsibility. Safety Officer reviews submitted arrangements and requests remediation. The release has seven roles. [Current C1](../../exports/c1-context.svg) |
| C2 · containers | The browser calls Express and Supabase Auth. Express uses PostgreSQL. | Express now runs hold expiry at startup and every minute. PostgreSQL supplies the expiry function and optional `pg_cron` scheduling. [Current C2](../../exports/c2-containers.svg) |
| C3 · API components | The historical snapshot has only the module table. The [retrospective C3](c4-audit.md#pre-week-7-c3---reconstructed-from-b981f11-on-6-nov-2026) describes the then-implemented API. | The current API includes venue, equipment, registration, safety and notification services along with event workflows and readiness checks. [Current C3](../../exports/c3-components.svg) |
| ERDs · requests, arrangements and database | The request workflow covers assignments, reviews, clarifications and status history. The planning view covers venue bookings, equipment requests and registrations. The database view supplies all relationships in the 15 depicted entities. | Event detail covers assignment and review history. Planning detail adds stock changes and venue outage impacts. Safety review, invalidation and approval context have their own detail view. The full database now has 24 tables and 55 foreign keys. [Events](../../exports/erd-events.svg) · [Planning](../../exports/erd-planning.svg) · [Safety](../../exports/erd-safety-invalidation.svg) · [Database](../../exports/erd-database.svg) |
| Class and sequence diagrams | No original in the 1 October snapshot. The first 19 October class model and lead-assignment workflow document post-change work. | The [before-update archive](../before-2026-11-06-update/README.md) preserves the later class model and eight sequence exports. The current release has four class views and twelve sequences, including venue hold, outage recovery, event completion and significant planning changes. [Current gallery](../../exports/index.html) |
