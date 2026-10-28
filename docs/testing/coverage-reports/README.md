# Coverage summaries

One file per sprint close: the summary printed by `npm run test:coverage` (`sprint-0N.txt`), registered in that sprint's evidence register. Explain any new-code gap below 100% in `../test-evidence.md`.

## Retained reports

| Report | Actual date and scope |
| --- | --- |
| [Post-sprint implementation audit](2026-10-15-post-sprint-audit.txt) | 15 October 2026, source `3bd64f8`; AUTO-20261015-01. Includes check, coverage, integration and browser totals. This is not Sprint 1 or Sprint 2 close coverage. |
| [KAN-79 local allocation coverage](2026-10-19-kan79.txt) | 19 October 2026; AUTO-20261019-01, not sprint-close acceptance. |
| [KAN-65 local reassignment coverage](2026-10-19-kan65.txt) | 19 October 2026; AUTO-20261019-02, manual/hosted checks and KAN-64 integration pending. |
| [KAN-60 local rejection-reason coverage](2026-10-21-kan60.txt) | 21 October 2026; AUTO-20261021-KAN60-01, not sprint-close acceptance; manual/hosted cases pending. |
| [KAN-83 local venue-hold coverage](2026-10-21-kan83.txt) | 21 October 2026; AUTO-20261021-KAN83-01, not sprint-close acceptance; manual/hosted cases pending. |

Sprint 1 and Sprint 2 close-specific summary files are **Not recorded**. Historical measurements remain in [test evidence](../test-evidence.md); do not rename a later run to imply an earlier execution date.

**25 October scoped evidence import:** [KAN-78/KAN-34 current-main CI](2026-10-25-kan78-kan34-ci.txt), `AUTO-20261025-ARVIN-01`, retains whole-main metrics from run 40192394546 at `96a0d10`. This is neither a local rerun nor Sprint 3 close coverage; configured scope and hosted limits remain explicit.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

Earlier PR suite counts for KAN-24/KAN-51 are linked from [test evidence](../test-evidence.md); they are not source-level coverage reports. No historical percentage, 100% claim or new execution is inferred. The retained 25 October KAN-34/KAN-78 CI coverage remains scoped to source `96a0d10`, preceding the later documentation-only main update.

**26 October 2026 — KAN-66:** [KAN-66 automated verification](2026-10-26-kan66.txt) records `AUTO-20261026-KAN66-01/02` on the uncommitted `feat/KAN-66-planning-edits` working tree (base `c849ebf`). Workspace unit/component coverage only; the PostgreSQL integration suite was not executed. This is not Sprint 4 close coverage.

