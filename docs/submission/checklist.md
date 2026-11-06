# Submission checklist and team inputs

This is the single tracker for documentation completion. Choose workstream editors/reviewers in the [team home](../README.md#choose-your-workstream), then fill the destination records linked below. A checked item means its stated completion condition was verified; it does not automatically accept a story.

**Deadline:** Friday **6 November 2026, 23:59 SGT**. **Code boundary:** frozen after 1 November, 23:59 SGT. Current work is documentation only. No PR, commit or push is authorised by this checklist.

## Available evidence and known limits

| Already available | Use it for | Limit |
| --- | --- | --- |
| [Backlog and change records](1/README.md) | Whole-project story scope, AC versions and Week 7 change handling | Saved Jira snapshots are dated; they are not a fresh live export |
| [Design report and image exports](../architecture/README.md) | Current architecture, decisions and implementation boundaries | Diagram rendering is not acceptance testing |
| [Testing report](../testing/README.md) | Automated results, connected R01–R23 and targeted repair evidence | Formal R24 release acceptance remains separate |
| [Sprint 1–3 review records](../scrum/README.md) | Reported acceptance outcomes with source limitations | Later reports do not supply original reviewed builds |
| [Sprint 1 source notes](../scrum/sprint-01/planning.md) | Actual notes in the supplied Documentation Tasks PDF | Its other blank prompts/guidance are not completed meeting records |
| [Main CI and frozen-source evidence](../testing/test-evidence.md#ci-20261102-main--merge-readback-and-frozen-source-verification) | Recorded merge `fb6d8d9` and passing exact-commit CI | PR #80 was author-merged without a recorded independent approval |

**Confirmed unavailable:** the original demonstrated build/commit/branch for Sprint 1–3 was not retained. Keep it **Not recorded**; no repeated action is assigned to recover it. The original DoD adoption date/method also remain Not recorded; the [25 October team reconfirmation](../scrum/definition-of-done.md#team-confirmation--25-october-2026) is already retained. Do not manufacture missing dates from Git timestamps.

## WS1: Backlog and customer changes

| Item | Required input or check | Edit / completion condition |
| --- | --- | --- |
| [ ] DOC-101 | Review the whole-project master register and derived workbook together | [Folder 1 record](1/README.md): verify every retained parent story, agreed points, completed/pending disposition, source dates and links to story/AC text; record reviewer/date |
| [ ] DOC-102 | Verify original requirements versus changes received 2 October | [Change register](../requirements/change-requests.md): each CR links to affected stories, ACs, design and tests; original acceptance is not silently replaced by changed scope |
| [ ] DOC-103 | Resolve any remaining source disagreements using supplied decisions | [Assumptions/questions](../requirements/assumptions-and-questions.md): record the actual answer/source/date; refresh affected summaries only when supported |

No new live Jira export is required to pretend historical metadata is current. If one is supplied, retain its export date and reconcile it rather than overwriting the earlier snapshots. Folder 1 must remain understandable without access to Jira.

## WS2: Architecture

| Item | Required input or check | Edit / completion condition |
| --- | --- | --- |
| [ ] DOC-201 | Independent review of the concise design report and rendered views | [Design review fields](../architecture/README.md#team-input-needed): reviewer/date and any factual corrections recorded; role, transaction and lifecycle explanations match the frozen release. **6 November 2026:** review fields completed by Irfan; still open until a second member confirms Irfan's 6 November integration edits |
| [x] DOC-202 | Check customer-change explanations and diagram readability | [Design report](../architecture/README.md): follow CR links; open full-size images; record limitations of retained older views rather than presenting them as complete schema exports. **Done 6 November 2026 (Irfan):** CR-1 to CR-6 rows link to the change register and diagrams; all 23 views checked; limitations recorded under [Diagram exports](../architecture/README.md#diagram-exports) |

## WS3: Testing and traceability

| Item | Required input or check | Edit / completion condition |
| --- | --- | --- |
| [ ] DOC-301 | Reviewer validates the test report against retained runs | [Testing report](../testing/README.md): verify builds, suite counts and coverage denominators; keep browser substitutes, real DB integration and connected acceptance separate |
| [ ] DOC-302 | Spot-check traceability across all 20 core features and six customer changes | [Traceability register](../requirements/traceability.csv), [test cases](../testing/test-cases.csv), [executions](../testing/test-executions.csv): document any unsupported claim; preserve historical versions, failed attempts and preparation placeholders |
| [ ] DOC-303 | Review disclosed remaining coverage and acceptance limits | [Testing report](../testing/README.md): remaining gaps are accurately described, without claiming 100% or impossibility; formal R24 decision is recorded through DOC-603 |

Existing test results are reused. These are document reviews, not requests to repeat the full test suite or mark more tests passed. If the team supplies new results, append supported execution evidence through AGENTS.md; do not overwrite the preserved ledger.

## WS4: Sprint 1 and 2

| Item | Team evidence still needed | Exact destination / completion condition |
| --- | --- | --- |
| [ ] DOC-401 | Clarify Sprint 1 notes calling Irfan acting Scrum Master, and distinguish tentative estimates from final commitment | [S1 planning](../scrum/sprint-01/planning.md), [S1 estimates](../scrum/sprint-01/estimation-and-capacity.md): retain formal Arvin/Irfan roles and agreed totals; add the supplied explanation and source |
| [ ] DOC-402 | Existing start/end board captures for each sprint | [S1 evidence](../scrum/sprint-01/evidence/README.md), [S2 evidence](../scrum/sprint-02/evidence/README.md): attach files with capture dates; identify unavailable originals explicitly |
| [ ] DOC-403 | Burndown charts and dated scope/remaining-point observations | [S1 daily progress](../scrum/sprint-01/daily-progress.md), [S2 daily progress](../scrum/sprint-02/daily-progress.md): register chart/data in the matching evidence folder; do not invent daily data from sprint-end totals |
| [ ] DOC-404 | Retained estimation discussion/votes, capacity decisions and member standup contributions | Corresponding sprint `estimation-and-capacity.md` and `daily-progress.md`: each statement has a source; identify missing material instead of completing generic prompts |
| [ ] DOC-405 | Actual review feedback and follow-up actions | [S1 review](../scrum/sprint-01/review.md), [S2 review](../scrum/sprint-02/review.md): feedback/action/owner/date, or an explicit supplied report that none was raised; accepted totals already recorded stay qualified |
| [ ] DOC-406 | Each member's retrospective feedback, agreed actions and later follow-through | [S1 retrospective](../scrum/sprint-01/retrospective.md), [S2 retrospective](../scrum/sprint-02/retrospective.md): separate proposals from agreements and link an observed follow-up where available |

## WS5: Sprint 3 and 4

| Item | Team evidence still needed | Exact destination / completion condition |
| --- | --- | --- |
| [ ] DOC-501 | Sprint 4 review details and story acceptance decisions | [S4 review](../scrum/sprint-04/review.md): actual meeting details, who decided/how, per-story outcome and feedback; cite relevant testing evidence without inferring acceptance from it |
| [ ] DOC-502 | Existing start/end board captures for S3/S4 | [S3 evidence](../scrum/sprint-03/evidence/README.md), [S4 evidence](../scrum/sprint-04/evidence/README.md): original artifact/capture date or explicit unavailability |
| [ ] DOC-503 | Burndowns and actual dated source observations for S3/S4 | [S3 daily progress](../scrum/sprint-03/daily-progress.md), [S4 daily progress](../scrum/sprint-04/daily-progress.md), [release accounting](../scrum/release-burndown.md): chart links and inputs agree with scope changes and supported outcomes |
| [ ] DOC-504 | Retained planning/estimation evidence and each member's standup contributions | S3/S4 `planning.md`, `estimation-and-capacity.md`, `daily-progress.md`: record actual sources and distinguish 4 October start from later scope selection |
| [ ] DOC-505 | S3/S4 review feedback, retrospective contributions, actions and follow-through | [S3 review](../scrum/sprint-03/review.md), [S3 retro](../scrum/sprint-03/retrospective.md), [S4 review](../scrum/sprint-04/review.md), [S4 retro](../scrum/sprint-04/retrospective.md): record supplied feedback/agreements; preparation text remains a proposal until confirmed |
| [ ] DOC-506 | Four existing final-sprint recordings and instructor-access checks | [Recording register](../scrum/final-sprint-recordings.md): planning, review, retrospective and one daily standup; actual dates, unlisted links, useful timestamps and checked access; no videos in ZIP |

## WS6: Submission integration

| Item | Required input or check | Exact destination / completion condition |
| --- | --- | --- |
| [ ] DOC-601 | Course slide template and final self-contained deck PDF | [Deck brief](5/README.md): apply the actual template, include all rubric areas with evidence references, save PDF and record review |
| [ ] DOC-602 | Both instructors' names/accounts and verified repository access | [Access record](7/README.md#instructor-access): accepted/working access with checked-by/date; an invitation alone is insufficient |
| [ ] DOC-603 | Independent frozen-candidate review evidence and team's formal release decision | [Release decision](7/README.md#release-decision): actual participants, method/date, acceptance/limitations and review link; reconcile R24/TC-06-32 without fabricating a historic GitHub approval |
| [ ] DOC-604 | Final documentation/package snapshot identification | [Release record](7/README.md#release-identification): distinguish frozen code SHA, documentation SHA and package content; commit/push only when authorised |
| [ ] DOC-605 | Cross-workstream consistency and final ZIP inspection | [Package validation](#package-validation): links, charts, figures, AC versions and access verified; remaining gaps visibly disclosed |

## Required structure and current status

| Folder | First document | Supporting material |
| --- | --- | --- |
| 1 | [Backlog guide](1/README.md) | Full workbook, requirements/story records, customer changes and dated exports |
| 2 | [Design report](../architecture/README.md) | Readable C4/sequence/data diagrams and technical references |
| 3 | [Testing report](../testing/README.md) | Cases, executions, traceability, coverage/CI and connected evidence |
| 4 | [Scrum overview](../scrum/README.md) | All four sprint records, evidence/charts and final recording links |
| 5 | [Deck brief and record](5/README.md) | Prescribed-template PDF when provided |
| 6 | [Run instructions](../../README.md) | Frozen source, test code, CI and repository-layout documentation |
| 7 | [Access and release record](7/README.md) | Repository link, access verification and package identification |

## Prepare the numbered folders

Run from the repository root:

```sh
npm run submission:prepare
```

The unchanged script creates an ignored `dist/submission-...` directory with folders **1–7**. It copies current on-disk, nonignored files, including uncommitted documentation. Folder 6 retains the repository layout. Other folders receive mapped documentation and rewritten relative Markdown links. `7/package-record.txt` records the local HEAD and dirty state.

The command does not render all Markdown, create missing records, run tests, verify instructor access or certify release acceptance. Do not edit generated copies. Correct source documents and prepare another draft. The team home, this tracker and detailed database source reach folder 6; mapped reports link to them. History stays available as supporting material.

## Package validation

- [ ] Open the draft reading guide and each folder's first document. Its current conclusion and remaining qualifications are obvious.
- [ ] Verify one full feature → story/AC → case → implementation/test → execution/evidence path, then check coverage across all core features and customer changes.
- [ ] Check diagrams, tables, formulas and links in their final viewer. Do not rely on GitHub-only Mermaid rendering.
- [ ] Confirm frozen source/SQL/tests/configuration match the recorded release. Later documentation changes have their own identification.
- [ ] Retain actual failures/retests, source dates and reported-vs-observed distinctions. Template prompts are not evidence.
- [ ] Check folder 5 contains the final PDF and all four recording links work for instructors.
- [ ] Confirm both instructors' repository access and folder 7 release/package metadata.
- [ ] Exclude credentials, `.env`, dependency/build caches and video files. Retain `.env.example`, `.nvmrc` and `.github/workflows/ci.yml` in folder 6.
- [ ] ZIP **1–7 at the ZIP root**, reopen it and verify the contents, including dotfiles.
- [ ] Submit to the correct eLearn assignment before the deadline. Only the latest submission is graded.

| Draft/final packaging record | Value to fill |
| --- | --- |
| Package identity and documentation snapshot | Use the single [release identification record](7/README.md#release-identification) |
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

These are documentation/package checks. Application suites were not rerun during this editorial cleanup. The inspected draft included uncommitted documentation and was not a final ZIP, instructor-access verification or release acceptance. Final identifiers and inspection/submission details still belong in the fields above and folder 7.

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
