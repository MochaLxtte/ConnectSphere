# S3-E32 — Pre-Week 7 C4 originals and reconstructions

Prepared by Codex on **6 November 2026** after Arvin approved the §5.17 plan in project chat. Working branch: `docs/c4-accuracy`. Historical source: **`b981f1133750e7ddd42ac412651c915cb4485418`**, 1 October 2026, before customer-change receipt on 2 October. Current application build remains `fb6d8d93f721b114accc9857a05d62e859987e23`.

[Diagram gallery](../../../../architecture/archive/pre-week-7-customer-changes/c4-gallery.html) · [Complete element ledger and Mermaid](../../../../architecture/archive/pre-week-7-customer-changes/c4-audit.md) · [Summary](audit.json).

## Provenance and scope

The genuine archived C1/C2 source was rendered unchanged; the PNG/SVG files were produced in November. Original October exports and an original C3 are **Not recorded**. Separate reconstructed C1/C2/C3 views explicitly identify the source commit and November preparation date. Original Markdown snapshots, the preservation manifest, before-update archive and current diagram source/exports are retained.

Every one of the **44 blocks, 55 directed connections and three boundaries** has an individual entry in [models.json](models.json). The 41 application blocks, connections and boundaries have exact source tokens, line numbers, Git blob IDs, SHA-256 hashes and links pinned to the historical commit. Three blocks are new notation legends checked against their diagram definitions. The human-readable ledger has a separate row for each item. [source-catalog.json](source-catalog.json) identifies all 107 inspected source/configuration/migration/document files; [source-tree.json](source-tree.json) retains the full pinned tree inventory.

The original C1 describes intended release scope. Venue, equipment and attendee roles/schema existed, but their business routers/pages were absent. [negative-evidence.json](negative-evidence.json) records the complete backend tree, frontend pages, route-source anchors and six historical migrations. Later prose claiming full module implementation in the old architecture document disagrees with that code; the originals are retained, and the reconstruction follows the pinned implementation. No Lead Coordinator, Safety Officer, safety workflow or temporary-hold scheduler is added to this historical model.

C3 groups 14 components in one API process. [component-map.json](component-map.json) assigns every backend source file to a component or bootstrap/shared-type support. All **26 cross-component runtime imports** map to a displayed connection. The two runtime-injected assignment policies are checked separately; type-only imports are excluded from runtime arrows. Draft, submission and initial review use their own SQL transactions. Assignment, clarification and lifecycle call the in-app notification writer; no inbox API, email delivery service or worker is implied.

## Verification

[render-validation.json](render-validation.json) records the five SVG checks and PNG/SVG hashes. Checks cover every rendered node's identity and full label, label fit, every arrow's endpoints, arrowhead, solid/non-solid style and associated label, and each boundary's name and members. Node intersections, node/edge-label intersections, edge-label intersections and canvas overflow must all be zero. All five PNGs were also visually inspected at full size or using their full-resolution SVG. [validation.json](validation.json) records source, preservation, ledger, link and export verification.

An initial inspection attempt assumed an HTML body in a standalone SVG document; the inspector was corrected for the SVG root. Its initial boundary-ID and non-solid-style checks were also adjusted to Mermaid's actual prefixed IDs and dotted-line representation. The final checks use actual SVG identity/style values and individual edge-label associations.

This is retrospective static code/design and rendering verification. Application suites: **Not executed**. Live integrated acceptance and historical deployment/database state: **Not assessed**. Independent review: **Not recorded**. No application code, schema, shared database, Jira state, historical sprint delivery or velocity was changed. No commit, push or PR is claimed.

## Reproduction

Run from the repository root with Python 3.9+ and Node.js. Use an existing Mermaid CLI 11.17.1 installation (Mermaid 11.17.2) and Chromium; the scripts install nothing and read Git objects without checking out historical code.

```powershell
python docs/scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106/build-audit.py
node docs/scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106/render-audit.mjs <mermaid-cli/src/cli.js> <chrome.exe>
python docs/scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106/validate-audit.py
```

The renderer uses [mermaid-config.json](mermaid-config.json), ELK layout and the CLI installation's Puppeteer. The Chromium run used Chrome 153 on this machine. [visual-review.json](visual-review.json) records the final manually inspected image hashes. Rebuilding sources alone requires rerendering before validation if any source changes.
