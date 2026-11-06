# Documentation: start here

Use this page to choose a workstream, find the files to edit and hand completed documentation to a reviewer. The submission uses seven numbered folders; the six workstreams below divide the preparation between the team.

**Current boundary:** application code, SQL, tests and configuration are frozen after **1 November 2026, 23:59 SGT**. Documentation remains editable. The submission deadline is **6 November 2026, 23:59 SGT**. This cleanup does not establish missing sprint or release acceptance.

## Choose your workstream

Enter a primary editor and a different reviewer here. These are documentation responsibilities, not changes to historical story ownership or Scrum titles.

| Workstream | Editor | Reviewer | Start editing | Outstanding inputs |
| --- | --- | --- | --- | --- |
| WS1 — Backlog and customer changes | To agree | To agree | [Requirements guide](requirements/README.md) | [WS1 checklist](submission/checklist.md#ws1-backlog-and-customer-changes) |
| WS2 — Architecture | Arvin | Irfan | [Design report](architecture/README.md) | [WS2 checklist](submission/checklist.md#ws2-architecture) |
| WS3 — Testing and traceability | To agree | To agree | [Testing report](testing/README.md) | [WS3 checklist](submission/checklist.md#ws3-testing-and-traceability) |
| WS4 — Sprint 1 and 2 | To agree | To agree | [Sprint 1](scrum/sprint-01/README.md), [Sprint 2](scrum/sprint-02/README.md) | [WS4 checklist](submission/checklist.md#ws4-sprint-1-and-2) |
| WS5 — Sprint 3 and 4 | To agree | To agree | [Sprint 3](scrum/sprint-03/README.md), [Sprint 4](scrum/sprint-04/README.md) | [WS5 checklist](submission/checklist.md#ws5-sprint-3-and-4) |
| WS6 — Submission integration | To agree | To agree | [Shared checklist](submission/checklist.md), [deck](submission/5/README.md), [access and release](submission/7/README.md) | [WS6 checklist](submission/checklist.md#ws6-submission-integration) |

## How to edit

1. Read your workstream below and its checklist items. Fill the linked source document, not a generated copy under `dist/`.
2. Use the document's **Team input needed** section to find the exact fields. Complete supported facts; use **Not recorded**, **To agree**, **Not executed** or **Not assessed** where applicable.
3. Retain the event/test date and the source of the information. If adding a later report, record when it was supplied separately. Reconstructed summaries are not original meeting captures.
4. Register artifacts in the relevant sprint evidence index, then link them from the source record. Use relative Markdown links; keep recordings as access-checked links, not video uploads.
5. Have your reviewer check claims against evidence. Update the single [submission checklist](submission/checklist.md) when its completion condition is met. Do not tick other workstreams on their behalf.

The main pages explain the current position. `archive/2026-11-05/` contains earlier narrative snapshots retained during cleanup. Existing test registers and run logs remain supporting evidence. Do not paste new progress updates into every README or edit archives to make old statements look current.

## WS1: Backlog and customer changes

**Outcome:** a complete backlog readable without Jira, with original scope and customer-change additions distinguishable.

| Edit | Put here |
| --- | --- |
| [Product backlog](requirements/product-backlog.md) | Supported story metadata, current repository disposition and links to the relevant sprint AC version |
| [Customer changes](requirements/change-requests.md) | Receipt on 2 October, changed requirements, linked stories and effects on design/tests/sprints |
| [Assumptions and questions](requirements/assumptions-and-questions.md) | New supplied answers or unresolved contradictions, with source and actual date |
| [Folder 1 record](submission/1/README.md) | Export reconciliation and limitations; refresh the workbook from the authoritative records |

Keep agreed points and historical acceptance records intact. The workbook is a derived submission export; avoid independently editing the same facts in two places.

## WS2: Architecture

**Outcome:** the marker can understand the system and explain why the design supports its workflows and customer changes.

Edit the [design report](architecture/README.md). Review the context/container/component diagrams, domain responsibilities, important sequences and trade-offs. The [API contract](architecture/api-contract.md) and [database model](database-diagram.md) hold technical details; link to them rather than copying them into the report. Existing diagram images are under [exports](architecture/exports/).

## WS3: Testing and traceability

**Outcome:** a reader can trace a requirement to an appropriate test and its actual evidence.

Edit the [testing report](testing/README.md). Reuse the [specifications](testing/test-cases.csv), [execution register](testing/test-executions.csv), [traceability](requirements/traceability.csv) and [run evidence](testing/test-evidence.md). Those registers were preserved during cleanup. Report corrections with supporting evidence; do not replace earlier failed attempts or convert preparation placeholders into passes.

Separate automated results, connected manual results and formal release acceptance. The [full release walkthrough](testing/release-e2e-walkthrough.md) is a reusable procedure, not an execution record by itself.

## WS4: Sprint 1 and 2

**Outcome:** two readable historical sprint packages with supported decisions and explicitly identified missing artifacts.

Work in [Sprint 1](scrum/sprint-01/README.md) and [Sprint 2](scrum/sprint-02/README.md). Each folder uses the same order: overview → planning → estimation → backlog → daily progress → review → retrospective → evidence. Follow its editing table. Each member supplies their own standup and retrospective contribution. The workstream editor incorporates supplied material without inventing another person's account.

## WS5: Sprint 3 and 4

**Outcome:** the customer-change response and final sprint's outcome are supported by records and evidence.

Work in [Sprint 3](scrum/sprint-03/README.md) and [Sprint 4](scrum/sprint-04/README.md), using the same record order as WS4. Maintain the shared [Scrum overview](scrum/README.md), [release accounting](scrum/release-burndown.md) and [recording register](scrum/final-sprint-recordings.md). Coordinate earlier-sprint figures with WS4. Final-sprint recordings supplement the written records.

## WS6: Submission integration

**Outcome:** one consistent, readable seven-folder submission with the prescribed deck and verified access.

Use the [deck content brief](submission/5/README.md), [release/access record](submission/7/README.md) and [package checks](submission/checklist.md#package-validation). Gather the course template before creating the final slide PDF. Check all rubric areas against specific evidence and distinguish the frozen code SHA from the later documentation/package snapshot.

Run the existing `npm run submission:prepare` only after the source documents are ready for a draft inspection. It copies current files, including uncommitted nonignored files; it does not certify acceptance or supply missing evidence. Keep final commit/push/submission decisions explicit.

## Submission reading order

| Folder | Read first | Then consult |
| --- | --- | --- |
| 1 | [Backlog export guide](submission/1/README.md) | Workbook, story/AC records and customer-change history |
| 2 | [Design report](architecture/README.md) | Rendered diagrams, API contract and data model |
| 3 | [Testing report](testing/README.md) | Specifications, executions, traceability and selected run artifacts |
| 4 | [Scrum overview](scrum/README.md) | Sprint 1–4 records, charts, evidence and final recordings |
| 5 | Prescribed-template PDF when supplied | [Deck record](submission/5/README.md) |
| 6 | [Run instructions](../README.md) | Frozen source, tests and CI configuration |
| 7 | [Repository access and release](submission/7/README.md) | Package identity and checks |

See [AGENTS.md](../AGENTS.md) for the master process rules. This page is an editing guide; it does not change the Definition of Done or the course requirements.

**Preparation method — 5 November 2026:** AI-assisted editorial restructuring reused the existing repository and supplied planning notes. Automated file/link checks and rendered previews checked the cleanup; human document review and missing team decisions remain in the shared checklist. No new application test, meeting or acceptance result was created.
