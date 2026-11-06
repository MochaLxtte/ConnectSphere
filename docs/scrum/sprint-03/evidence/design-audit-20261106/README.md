# S3-E31 — Current design audit, 6 November 2026

Prepared by Codex after Arvin approved the design-document plan in the project discussion. This is §5.17 document maintenance on `docs/c4-accuracy`, based on main commit `fb6d8d93f721b114accc9857a05d62e859987e23`. Sprint 3 remains administratively Active in the Scrum index; this actual November work is not counted as delivery or velocity by the historical October sprint end. No meeting, team design decision or independent review is asserted.

## Preserved originals

- [Pre-Week 7 customer changes](../../../../architecture/archive/pre-week-7-customer-changes/README.md): three genuine Git blobs from 1 October, before the confirmed 2 October receipt. Historical class/sequence diagrams and their exports are **Not recorded**. Their first committed versions are later than receipt, so no later models have been mislabelled as pre-change originals.
- [Before this update](../../../../architecture/archive/before-2026-11-06-update/README.md): three working documents and 19 exports, including existing Week 7 models and the preceding C4 corrections.
- Both manifests preserve exact hashes and provenance; final validation verifies all 25 preserved files. Original relative links remain in their recorded repository context.

## Source and checks

| Artifact | What it establishes |
| --- | --- |
| [audit.json](audit.json) | Final automated validation result, exact coverage and scope limits |
| [schema.json](schema.json) | Fresh migrated PostgreSQL catalog: 24 tables, 243 columns, 55 FKs, 169 constraints, 62 indexes, one view, 26 user triggers |
| [schema-audit.json](schema-audit.json) | Every table/column and FK, nullability-derived parent optionality and unique-key-derived child multiplicity |
| [migration-input.json](migration-input.json), [application log](migration-apply.txt) | All 23 checked-in migrations applied successfully in a disposable PostgreSQL 17 database; exact source checksums |
| [route-inventory.json](route-inventory.json) | All 85 mounted method/path/role/status records, source snippets and hashes, including imported calendar roles and loop-generated reservation routes |
| [endpoint-audit.json](endpoint-audit.json) | Each route's documented input and response envelope attached to its handler reference |
| [api-shapes.json](api-shapes.json) | Exact current exported DTO/type definitions used in the API reference |
| [sequence-audit.json](sequence-audit.json) | Individual implementation proof for all 49 participants and 177 messages across 12 sequences |
| [models.json](models.json), [Mermaid sources](models/) | All 20 current class/ERD/sequence models, per-node columns, FK identities, message proofs and source hashes |
| [visual-qa.json](visual-qa.json) | Final SVG and PNG hashes, all node/label boxes, exact rendered node/edge or participant/message counts, label containment and overlap checks |
| [render-result.json](render-result.json) | Last targeted Mermaid render outcomes; the complete final inventory is in audit.json/visual-qa.json |

The complete class view has all 22 persisted application record types and all 55 FK associations. Three class detail views and three ERD detail views provide readable domain slices; the complete ERD includes the two infrastructure tables. The data dictionary lists all 243 SQL columns, defaults and nullability. The class and data-model attributes retain actual SQL identifiers. Class relationship labels include `[parents per child / children per parent]` to keep the many actor references legible.

Every rendered class/entity field and relationship is checked against the catalog. ERD SVG endpoints, identifying-line styles and crow's-foot markers are checked individually. Every sequence participant and message has a concrete source token, line reference and unchanged source hash; workflow branches, replay ordering, transaction ownership and notices were reviewed against those functions. Guards that refuse an action throw through the rollback/HTTP error path. Workflow views group SQL/local calls and are not a line-by-line call graph of every handler.

The API audit inventories the actual registered routes by constructing their factories with inert dependencies. It opens no server socket and makes no authentication/database calls. It checks the actual Express route stack against the static inventory; documentation records exact input/response wrappers and source DTOs. Business authorization remains narrower than an outer route-role list.

## Environment and reproduction

Windows; Node v22.12.0; Python 3.9.13; PostgreSQL 17; Mermaid CLI 11.17.1 / Mermaid 11.17.2; Puppeteer 25.13.0 and local Chromium. No package manifest or lockfile was changed. The local container used `--network none`, no host ports, no host bind mounts, no application seed records and no shared/production database credentials. The migration notice that optional pg_cron is unavailable in this isolated database is expected; API-side hold expiry remains a separate runtime caller. This schema audit does not establish the shared database's applied migration state.

From the repository root:

```powershell
node docs/scrum/sprint-03/evidence/design-audit-20261106/scan-routes.cjs "$env:TEMP/connectsphere-route-check.json"
node --import tsx docs/scrum/sprint-03/evidence/design-audit-20261106/verify-routes.cjs "$env:TEMP/connectsphere-route-check.json"
python docs/scrum/sprint-03/evidence/design-audit-20261106/validate-design.py
```

For a diagram, render its checked-in `.mmd` using Mermaid CLI with `mermaid-config.json` and a Puppeteer config naming an installed Chromium executable. `render-models.cjs` and `inspect-render.cjs` reproduce the full export/geometry pass on this Windows setup; `MERMAID_CLI`, `PUPPETEER_MODULE` and `CHROME_EXECUTABLE` can override the local tool locations. The output is staged before copying to exports. No remote renderer is required.

## Scope limits

This is a source, migrated-schema and diagram-render audit. Integrated application acceptance, authentication against Supabase and shared database deployment checks are **Not executed** in this task. Application suites and coverage were not rerun because product code, tests and migrations are unchanged. No case-level test outcomes, Jira statuses, points or historical acceptance results were invented. The documented block-deletion path-parent limitation reflects current code and is not claimed to be fixed by a diagram.

No commit, push or PR was performed. The previous C4 audit evidence and sources remain intact.

Cleanup: the owned audit container and the anonymous data volume created by the PostgreSQL image were removed after checking the task label and exact container identity. [cleanup.json](cleanup.json) records the outcome. No host directory was mounted.

Final export review: Codex inspected all 20 final PNGs; [visual-review.json](visual-review.json) records each image hash and the scope of that AI review. [Gallery QA](gallery-qa.json) confirms all 23 preview images and 75 links load, with no horizontal overflow at desktop and mobile widths. [Tool syntax checks](tooling-syntax-check.json) pass for the five reproduction scripts. These checks are document/tooling evidence, not application acceptance.
