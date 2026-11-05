# 1. Product backlog

Read the [master workbook](product-backlog.xlsx), then use the [requirements guide](../../requirements/README.md), [master register](../../requirements/product-backlog.md) and [customer-change register](../../requirements/change-requests.md) for the source, current criteria and history. The seven-sheet workbook contains the 42-parent / 174-SP release inventory, full source story/AC text, evidence references, feature mapping, sprint records and archived items.

## Team input needed

Complete [WS1 in the shared checklist](../checklist.md#ws1-backlog-and-customer-changes). Assign the workstream owner/reviewer in [the team editing guide](../../README.md#ws1-backlog-and-customer-changes). Edit the repository's master register and relevant story cards first; refresh the workbook from those supported values.

## Reading order and source boundaries

| File / workbook area | Use | Qualification |
| --- | --- | --- |
| Product backlog | Parent inventory, estimates, priorities and last recorded Jira metadata | Mixed-date source observations; not a fresh 5 November Jira export |
| Story specifications | Full Jira source wording and explicitly labelled repository supplements | Read current sprint cards for later criteria; retain original criterion IDs |
| Delivery evidence / Feature coverage | Implementation and requirement-to-test references | Dated assessments; [testing report](../../testing/README.md) gives the release evidence summary |
| Sprint record | Original commitments, carry-over and reported acceptance | Later report date is separate from the stated review date; missing historical builds remain Not recorded |
| Subtasks and archive / Review notes | Unestimated tasks, exclusions and source history | Subtasks/archived items do not add parent points |
| Dated Jira CSV exports | Preserved exports from 21 September, 11/15/16 October and targeted 25 October | Source snapshots remain unchanged; current claims must cite the relevant later evidence |

## Scope and acceptance summary

The six customer changes were received **2 October**. They add **47 SP** to **127 original-scope SP**, giving **174 unique parent SP**. Sprints 3 and 4 each selected 63 SP. Sprint 1's 32 and Sprint 2's 43 commitments retain carried work and therefore must not be summed as unique release scope.

Reported accepted points are **S1 24, S2 24 and S3 63**, confirmed in the 26 October collective-review report. Formal **S4 acceptance and release acceptance remain Not assessed**. Current merged/connected verification is indexed in the [testing report](../../testing/README.md). Passing tests do not silently update Jira metadata or historic acceptance dates.

## Workbook reconciliation

**5 November 2026 documentation reconciliation:** all 42 parent keys, points, retained Jira status values and assignees match the Markdown master table. Historical CSV exports, raw test registers and original acceptance records are unchanged.

The Sprint record summary at C6 previously returned 0 because the formula expected the exact label `Accepted`; seven underlying rows contain `Accepted 19 Sep (reported 26 Oct)`. Matching that recorded label restores the supported **24 SP**. Underlying results, story estimates and dates are preserved. Introductory workbook labels explain the mixed-date snapshot and point readers to current release evidence.

Verification: 13 introductory-label cells and the C6 formula/result changed; all other cell values and formulas are unchanged. The 7 sheets, 11 native tables, styles, merges, filters, validations and freeze panes are preserved. Recalculation reports no formula errors. Temporarily excluding one 3-SP accepted row changed C6 from 24 to 21; restoring the row restored 24. Parent totals remain 42 items / 174 SP. Rendered views of all edited sheet introductions and the corrected sprint summary were checked. This validates the document export, not a new application test or review decision.

## Refresh procedure

1. Record an actual new decision or source observation in its owning sprint/review/requirements document, preserving its date and source.
2. Update only supported parent fields and relevant criterion/evidence references. Keep Jira observations distinct from acceptance.
3. Refresh the workbook and compare keys, estimates, source text, formulas and native tables. Check displayed summaries and formula errors.
4. Review this folder with WS1's reviewer and resolve the shared checklist entries. Retain dated exports as history.

## Historical records

[Preserved document before cleanup](archive/2026-11-05/README.md). These dated records remain supporting evidence.

<details>
<summary>Links retained for earlier references</summary>

<a id="1-final-product-backlog"></a>
[1. Final product backlog](archive/2026-11-05/README.md#1-final-product-backlog)

<a id="submission-reconciliation--17-october-2026"></a>
[Submission reconciliation — 17 October 2026](archive/2026-11-05/README.md#submission-reconciliation--17-october-2026)

<a id="reconciliation-validation--17-october-2026"></a>
[Reconciliation validation — 17 October 2026](archive/2026-11-05/README.md#reconciliation-validation--17-october-2026)

<a id="current-export--16-october-2026-after-backlog-reconstruction"></a>
[Current export — 16 October 2026, after backlog reconstruction](archive/2026-11-05/README.md#current-export--16-october-2026-after-backlog-reconstruction)

<a id="course-format-and-ownership-validation--16-october-2026"></a>
[Course-format and ownership validation — 16 October 2026](archive/2026-11-05/README.md#course-format-and-ownership-validation--16-october-2026)

<a id="preserved-earlier-export-records"></a>
[Preserved earlier export records](archive/2026-11-05/README.md#preserved-earlier-export-records)

<a id="earlier-16-october-export--superseded-9729-allocation"></a>
[Earlier 16 October export — superseded 97/29 allocation](archive/2026-11-05/README.md#earlier-16-october-export--superseded-9729-allocation)

<a id="historical-export--15-october-2026"></a>
[Historical export — 15 October 2026](archive/2026-11-05/README.md#historical-export--15-october-2026)

<a id="historical-snapshot--11-october-2026"></a>
[Historical snapshot — 11 October 2026](archive/2026-11-05/README.md#historical-snapshot--11-october-2026)

<a id="historical-snapshot--21-september-2026"></a>
[Historical snapshot — 21 September 2026](archive/2026-11-05/README.md#historical-snapshot--21-september-2026)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>
[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/README.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--closeout-refresh"></a>
[25 October 2026 — Closeout refresh](archive/2026-11-05/README.md#25-october-2026--closeout-refresh)

<a id="28-october-2026--targeted-pr-63-backlog-refresh"></a>
[28 October 2026 — Targeted PR #63 backlog refresh](archive/2026-11-05/README.md#28-october-2026--targeted-pr-63-backlog-refresh)

</details>
