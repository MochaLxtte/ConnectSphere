# Submission checklist and team inputs

This is the single tracker for documentation completion. Choose workstream editors/reviewers in the [team home](../README.md#choose-your-workstream), then fill the destination records linked below. A checked item means its stated completion condition was verified; it does not automatically accept a story.

**Deadline:** Friday **6 November 2026, 23:59 SGT**. **Code boundary:** frozen after 1 November, 23:59 SGT. Current work is documentation only. No PR, commit or push is authorised by this checklist.

## Available evidence and known limits

| Already available | Use it for | Limit |
| --- | --- | --- |
| [Backlog and change records](1/README.md) | Whole-project story scope, AC versions and Week 7 change handling | Saved Jira snapshots are dated; they are not a fresh live export |
| [Design report and image exports](../architecture/README.md) | Current architecture, decisions and implementation boundaries | Diagram rendering is not acceptance testing |
| [Testing report](../testing/README.md) | Automated results, scoped R01–R23 observations, team-reported final R24 functional Pass and targeted repair evidence | Formal release acceptance remains separate under DOC-603 |
| [Sprint 1–4 review records](../scrum/README.md) | Review acceptance of 24, 24, 63 and 63 SP. The Sprint 4 recording identifies the bundle and group assent. | Historical build details and formal frozen-release acceptance have separate records |
| [Sprint 1 source notes](../scrum/sprint-01/planning.md) | Actual notes in the supplied Documentation Tasks PDF | Its other blank prompts/guidance are not completed meeting records |
| [Main CI and frozen-source evidence](../testing/test-evidence.md#ci-20261102-main--merge-readback-and-frozen-source-verification) | Recorded merge `fb6d8d9` and passing exact-commit CI | PR #80 was author-merged without a recorded independent approval |

**Confirmed unavailable:** the original demonstrated build/commit/branch for Sprint 1–3 was not retained. Keep it **Not recorded**; no repeated action is assigned to recover it. The original DoD adoption date/method also remain Not recorded; the [25 October team reconfirmation](../scrum/archive/definition-of-done.md#team-confirmation--25-october-2026) is already retained. Do not manufacture missing dates from Git timestamps.

## WS1: Backlog and customer changes

| Item | Completion condition | WS1 record · 6 November 2026 |
| --- | --- | --- |
| [ ] DOC-101 | Review the whole-project register and workbook together, then record the team reviewer and date | **Awaiting team reviewer.** The 6 November documentation check reconciled all 42 parent IDs, point values, dispositions, sprint allocations and review dates. The workbook’s 416 criterion IDs and internal links were checked. Desktop Excel reproduced all four review totals, including a temporary change and restoration. Record the different team reviewer’s actual name, date and corrections in the [Folder 1 handover](1/README.md#documentation-review-and-team-inputs). |
| [x] DOC-102 | Verify original requirements versus changes received 2 October | All six [change records](../requirements/change-requests.md#current-change-to-backlog-and-sprint-map) link the baseline and its amendments to the relevant stories, numbered criteria, design, test cases and recorded outcomes. Seven new stories account for 47 SP. The outage record identifies the specific safety-submission check under TC-06-21 and preserves the original card’s reference to TC-06-23. |
| [x] DOC-103 | Reconcile remaining disagreements using the supplied customer and team decisions | All 14 historical questions are accounted for in the [clarification register](../requirements/assumptions-and-questions.md). The [G7 customer answers](../requirements/sources/g7-customer-clarifications.xlsx) are dated 25 August and 9 September. The register separates those answers from later changes, delegated choices and subjects for which G7 supplied no answer. |

The [Folder 1 evidence guide](1/README.md) links to the dated exports in Folder 6, the story decisions and the matched meeting accounts. The submission can be read without Jira.

## WS2: Architecture

| Item | Required input or check | Edit / completion condition |
| --- | --- | --- |
| [ ] DOC-201 | Independent review of the concise design report and rendered views | Irfan reviewed the initial design on 6 November 2026 and made the integration edits. A second teammate must check the final report, including C3 and the [four revised workflows](../architecture/archive/2026-11-06-integration/README.md), then record their name, actual date and findings in the [design review fields](../architecture/README.md#team-input-needed). |
| [x] DOC-202 | Check customer-change explanations and diagram readability | [Design report](../architecture/README.md): follow CR links; open full-size images; record limitations of retained older views rather than presenting them as complete schema exports. **Done 6 November 2026 (Irfan):** CR-1 to CR-6 rows link to the change register and diagrams; all 23 views checked; limitations recorded under [Diagram exports](../architecture/README.md#diagram-exports) |

## WS3: Testing and traceability

| Item | Completion condition | WS3 review · 6 November 2026 |
| --- | --- | --- |
| [ ] DOC-301 | Reviewer validates the test report against retained runs | **Awaiting team reviewer.** The 6 November technical review verified builds, suite counts, code-coverage numerators and denominators against native reports. Unit/HTTP, PostgreSQL, substituted browser tests and connected checks have separate results. Record the different team reviewer's name, actual date and any corrections in the [report handover](../testing/README.md#documentation-review-and-team-handover). |
| [x] DOC-302 | Spot-check traceability across all 20 core features and six customer changes | Verified 26 requirement routes, 624 case IDs and 1,214 execution/preparation IDs, including the [75 manual review results](../testing/sprint-4-manual-review.md), 12 recovered automated results, the reported release test and [21 additional manual results](../testing/pre-freeze-manual-results.md). The review identifies the superseded unmapped AC and six detailed cases with incomplete criterion links in their original trace rows. [Matrix and findings](../testing/traceability-review.md) · [complete cases and attempts](../testing/case-catalogue/README.md) |
| [x] DOC-303 | Review disclosed remaining coverage and acceptance limits | The [115-case evidence audit](../testing/pre-freeze-case-audit.md) identifies 81 detailed cases still without a whole-case result: 69 have partial evidence and 12 are superseded. The reports distinguish functional R24 Pass from the formal decision under DOC-603. [Results and denominators](../testing/coverage-results.md) · [release case reconciliation](../testing/evidence-index.md#reconciling-the-full-release-case) · [WS6 decision](release-record.md#release-decision) |

The WS3 review reuses the retained runs. The unmet team review for DOC-301 and formal release review for DOC-603 have separate owners and completion conditions.

## WS4: Sprint 1 and 2

The [WS4 evidence index](../scrum/ws4-evidence/README.md) maps Folder 4 requirements to meeting accounts, charts, sprint outcomes and follow-through. The [source dispositions](../scrum/ws4-evidence/README.md#outstanding-team-input) record the confirmed role clarification and unavailable historical artifacts.

| Item | Required evidence | Recorded position · 6 November 2026 |
| --- | --- | --- |
| [x] DOC-401 | Sprint 1 planning, estimates and role attribution | The final 32-SP commitment is reconciled against the provisional estimates. On 6 November Tristan confirmed that the earlier note was incorrect. Arvin facilitated as Scrum Master and Irfan was Product Owner. [Planning and source correction](../scrum/sprint-01/planning.md#supplied-planning-notes--5-november-2026) · [Estimates](../scrum/sprint-01/estimation-and-capacity.md) |
| [x] DOC-402 | Starting and closing board evidence or explicit disposition of unavailable originals | Original captures were absent from the supplied materials. Both registers identify that limit. The starting story lists, Sprint 2 export and per-story closing decisions are included as alternative evidence. [Board record](../scrum/ws4-evidence/board-history.md#board-evidence-disposition) |
| [x] DOC-403 | Burndowns with dated scope and remaining-point evidence | The Sprint 1 and Sprint 2 release charts show 103 and 79 SP left in the original scope. The sprint tables show 32→8 and 43→19 SP against each sprint’s own commitment, plus two Sprint 2 board readings of 43 SP remaining. [Charts and sources](../scrum/ws4-evidence/board-history.md) |
| [x] DOC-404 | Estimation, capacity and individual standup contributions | Both estimation records show the comparisons and capacity assumptions that the accounts support. Ten standups include 60 attributed member updates, with source cues. [Sprint 1 records](../scrum/sprint-01/README.md) · [Sprint 2 records](../scrum/sprint-02/README.md) |
| [x] DOC-405 | Review decisions, feedback and follow-up | Each review reconciles all selected items, the demonstrated paths, concerns, next owners where recorded, and 24 accepted SP. Additional replies to open feedback prompts remain unrecorded. [Sprint 1 review](../scrum/sprint-01/review.md) · [Sprint 2 review](../scrum/sprint-02/review.md) |
| [x] DOC-406 | Member reflections, improvement actions and later evidence | Twelve attributed reflections and both action registers identify commitments, proposals and observed follow-through. The changed cadence, coordinator-access repair and 6 October checklist handoffs are linked to later evidence. [Sprint 1 retrospective](../scrum/sprint-01/retrospective.md) · [Sprint 2 retrospective](../scrum/sprint-02/retrospective.md) |

## WS5: Sprint 3 and 4

**Draft reviewed against the Folder 4 brief on 6 November.** Both sprint reviews accepted 63 SP with zero carry-over. The [assessor’s evidence index](../scrum/ws5-evidence/README.md) links the accounts, story decisions, chart inputs and recording timestamps. Outstanding inputs are listed once in [the WS5 index](../scrum/ws5-evidence/README.md#outstanding-inputs).

| Item | Scope | Result and completion condition |
| --- | --- | --- |
| [x] DOC-501 | Sprint 4 review and story decisions | All 15 story rows identify the 31 October collective decision on the 63-SP bundle. The local recording captures feedback and assent. [Story decisions](../scrum/sprint-04/review.md#story-decisions) · [timed evidence](../scrum/final-sprint-recordings.md#review-decision-in-the-recording) |
| [x] DOC-502 | Opening and closing board captures | The Sprint 4 planning recording supplies the starting board at 24:40. On 6 November Tristan confirmed that the team did not retain separate screenshots of the Sprint 3 opening or closing board or the Sprint 4 closing board. [Board record](../scrum/ws5-evidence/board-history.md) |
| [x] DOC-503 | Sprint and release burndowns with dated sources | The Sprint 3 and Sprint 4 release charts show the 47-SP scope increase and the fall from 63 to zero release SP remaining. The review recording resolves the provisional label on the final chart. Separate sprint tables retain the meeting checkpoints. [Sprint checkpoint records](../scrum/ws5-evidence/board-history.md) · [Four release charts](../scrum/release-burndown.md#chart) |
| [x] DOC-504 | Planning, estimation and member standups | Two planning and sizing records and 72 attributed member updates across 12 standups. Sprint 3 planning took place on 4 October. The 16 October administrative record documents the sprint allocation. [Sprint 3 planning](../scrum/sprint-03/planning.md#customer-change-chronology) · [Sprint 4](../scrum/sprint-04/README.md) |
| [x] DOC-505 | Review feedback, retrospectives and follow-through | Both reviews and all 12 retrospective contributions are documented. The record follows the integration checklist into Sprint 4 and identifies the final team's handover actions and owners. Completion of those actions awaits its own evidence. [Sprint 3 retrospective](../scrum/sprint-03/retrospective.md) · [Sprint 4 retrospective](../scrum/sprint-04/retrospective.md) |
| [x] DOC-506 | Four unlisted recordings and instructor-access checks | The register links the playlist and all four videos. Codex verified on 6 November that each unlisted video started playing without sign-in. [Recording links and check](../scrum/final-sprint-recordings.md#published-recordings-and-access-check) |

## WS6: Submission integration

| Item | Required input or check | Exact destination / completion condition |
| --- | --- | --- |
| [ ] DOC-601 | Course slide template and final self-contained deck PDF | The team supplied the [17-page final slide PDF](5/IS212_submission.pdf). Independent template and content review is unrecorded. |
| [ ] DOC-602 | Both instructors' names/accounts and verified repository access | [Access record](release-record.md#instructor-access): accepted/working access with checked-by/date; an invitation alone is insufficient |
| [ ] DOC-603 | Independent frozen-candidate review evidence and team's formal release decision | [Release decision](release-record.md#release-decision): actual participants, method/date, acceptance/limitations and review link; reconcile R24/TC-06-32 without fabricating a historic GitHub approval |
| [ ] DOC-604 | Final documentation/package snapshot identification | [Release record](release-record.md#release-identification): distinguish frozen code SHA, documentation SHA and package content; commit/push only when authorised |
| [ ] DOC-605 | Cross-workstream consistency and final ZIP inspection | [Package validation](#package-validation): links, charts, figures, AC versions and access verified; remaining gaps visibly disclosed |

## Required structure and current status

| Folder | First document | Supporting material |
| --- | --- | --- |
| 1 | [Backlog guide](1/README.md) | Master workbook, requirements/story records, customer changes and links to the dated exports |
| 2 | [Design report](../architecture/README.md) | Readable C4/sequence/data diagrams and technical references |
| 3 | [Testing report](../testing/README.md) | Cases, executions, traceability, coverage/CI and connected evidence |
| 4 | [Scrum overview](../scrum/README.md) | All four sprint records, evidence/charts and final recording links |
| 5 | [Final slide deck](5/IS212_submission.pdf) | [Supporting records](5/README.md) |
| 6 | [Run instructions](../../README.md) | Frozen source, test code, CI and repository-layout documentation |
| 7 | [Repository link](7/README.md) | GitHub repository URL |

## Prepare the numbered folders

Run from the repository root:

```sh
npm run submission:prepare
```

The preparation script creates an ignored `dist/submission-...` directory with folders **1–7**. It copies current on-disk, nonignored files, including uncommitted documentation. Folder 6 retains the repository layout. Other folders receive mapped documentation and rewritten relative Markdown links. Exclude the generated `7/package-record.txt` from the final ZIP so Folder 7 contains only `README.md`.

The command does not render all Markdown, create missing records, run tests, verify instructor access or certify release acceptance. Do not edit generated copies. Correct source documents and prepare another draft. The team home, this tracker and detailed database source reach folder 6; mapped reports link to them. History stays available as supporting material.

## Package validation

- [ ] Open the draft reading guide and each folder's first document. Its current conclusion and remaining qualifications are obvious.
- [ ] Verify one full feature → story/AC → case → implementation/test → execution/evidence path, then check coverage across all core features and customer changes.
- [ ] Check diagrams, tables, formulas and links in their final viewer. Do not rely on GitHub-only Mermaid rendering.
- [ ] Confirm frozen source/SQL/tests/configuration match the recorded release. Later documentation changes have their own identification.
- [ ] Retain actual failures/retests, source dates and reported-vs-observed distinctions. Template prompts are not evidence.
- [ ] Check folder 5 contains the final PDF and all four recording links work for instructors.
- [ ] Confirm both instructors' repository access and release/package metadata.
- [ ] Exclude credentials, `.env`, dependency/build caches and video files. Retain `.env.example`, `.nvmrc` and `.github/workflows/ci.yml` in folder 6.
- [ ] ZIP **1–7 at the ZIP root**, reopen it and verify the contents, including dotfiles.
- [ ] Submit to the correct eLearn assignment before the deadline. Only the latest submission is graded.

| Draft/final packaging record | Value to fill |
| --- | --- |
| Package identity and documentation snapshot | Use the single [release identification record](release-record.md#release-identification) |
| Inspected by / date | Not recorded |
| Remaining disclosed limitations | Not assessed |
| eLearn submission confirmation | Not recorded |

## Editorial validation — 5 November 2026

| Documentation check | Observed result |
| --- | --- |
| Frozen files and raw evidence | Pass: baseline comparison found no source, SQL, test or configuration changes; existing raw evidence, test registers, traceability and run ledger remain unchanged |
| Historical records and links | Pass: original section anchors remain available; repository relative file/fragment links resolve; archived text retains its source content with rebased links |
| Story cards | Pass: original criteria and acceptance-plan content preserved; two malformed Sprint 4 table rows were reformatted without changing wording |
| Workbook | Pass: [reconciliation record](1/README.md#workbook-reconciliation) identifies the corrected 24-SP formula and verifies preserved story data, native tables and formatting |
| Rendered editing pages | Pass: nine representative guides/forms checked in Chromium; no horizontal page overflow or broken images; team home, tracker and review form visually inspected |
| Draft packaging | Pass: existing command produced folders 1–7; packaged links, required source dotfiles and copied-file hashes checked; credentials/local environment files and videos excluded by filename checks |

These are documentation/package checks. Application suites were not rerun during this editorial cleanup. The inspected draft included uncommitted documentation and was not a final ZIP, instructor-access verification or release acceptance. Final identifiers and inspection/submission details belong in the fields above and the release record.

## Historical records

Earlier checklist snapshots and their then-current pending items are preserved in the [pre-cleanup checklist](archive/2026-11-05/checklist.md). Use the workstream tables above for current editing tasks.

<details>
<summary>Links to earlier sections (historical reference)</summary>

<a id="submission-checklist"></a>

- [Submission checklist](archive/2026-11-05/checklist.md#submission-checklist) — retained historical section.

<a id="release-candidate-checkpoint--1-november-2026"></a>

- [Release-candidate checkpoint — 1 November 2026](archive/2026-11-05/checklist.md#release-candidate-checkpoint--1-november-2026) — retained historical section.

<a id="current-handover-readiness--16-october-2026"></a>

- [Current handover readiness — 16 October 2026](archive/2026-11-05/checklist.md#current-handover-readiness--16-october-2026) — retained historical section.

<a id="earlier-readiness-assessment--15-october-2026"></a>

- [Earlier readiness assessment — 15 October 2026](archive/2026-11-05/checklist.md#earlier-readiness-assessment--15-october-2026) — retained historical section.

<a id="final-checks"></a>

- [Final checks](archive/2026-11-05/checklist.md#final-checks) — retained historical section.

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

- [25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/checklist.md#25-october-2026--arvin-contribution-reconciliation-sprints-13) — retained historical section.

</details>
