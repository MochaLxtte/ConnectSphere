# Submission checklist

**Code-editing freeze:** after **1 November 2026, 23:59 Singapore time**, only documentation may change (constraint confirmed in chat on 2 November). The final code commit `55e2b61` predates the cutoff at 23:55:42 +08:00. Preserve application code, migrations, tests and configuration; report later findings without code changes. Review/CI evidence and submission documents may still be completed. This restriction is separate from acceptance/merge decisions.

**2 November release handover:** [PR #80](https://github.com/MochaLxtte/ConnectSphere/pull/80) is pushed with connected repair evidence; [CI run 199](https://github.com/MochaLxtte/ConnectSphere/actions/runs/41323715692) passed on `0384a3c`. Its log and coverage reports are retained under Sprint 4 evidence. Check the PR's latest documentation-follow-up head for its own CI; independent teammate review, merge and the team's freeze decision remain outstanding. Submission artifacts below remain separate.

## Release-candidate checkpoint — 1 November 2026

Migration 023 is applied to shared development and the four focused connected repair/authentication checks pass in [MAN-20261101-03](../testing/test-evidence.md#man-20261101-03--connected-repaired-candidate-acceptance-1-november-2026). [AUTO-20261101-FREEZE-CANDIDATE](../testing/test-evidence.md#auto-20261101-freeze-candidate--final-local-verification-1-november-2026) records passing final local suites, exact source hashes, coverage floors/gaps and two complete browser runs. Testing records distinguish reusable specifications, execution attempts and substituted boundaries; current architecture views and exports describe the implemented lifecycle/safety flows.

Before freezing folder 6, integrate the reviewed candidate, verify CI on its exact commit and record the team's release decision. Source hashes identify the tested code; they do not manufacture missing historical sprint builds. Folder 3 must retain both earlier failures and these passing retests. The final backlog export, Scrum/recording artifacts, deck, instructor access and numbered-folder ZIP still need their own checks below; a code-freeze candidate is not a completed submission package.

**Closure records — 26 October 2026:** collective acceptance decisions for Sprints 1–3 are now recorded, with the historical review dates distinguished from today's confirmation. See the [current closure checklist](../scrum/README.md#acceptance-and-closure-inputs--26-october-2026). The team will supply closing-board artifacts, review feedback/actions and burndown charts/source data. Reviewed builds remain Not recorded because none were retained. Later reproduced failures and repairs remain separately dated; the Sprint 3 acceptance report does not independently verify the unknown historical build. Jira administration and final submission packaging are not completed by this update.

**Current closeout — 25 October 2026.** Sprints 1–3 include all-team reported manual results, current Sprint 3 owner/status reconciliation and full-attendance reports. The latest repair smoke checks are reported **Pass** in [REPORT-20261025-CLOSEOUT-RETEST](../testing/test-evidence.md#25-october-2026--closeout-retest-confirmation), supplied on 25 October; actual execution date, tested build, individual executor, captures and cleanup details are **Not recorded**. Current code fixes also pass local check/coverage/database/browser suites, and configured Supabase hold-expiry jobs have succeeded. Folder 3 retains separate specifications, executions and coverage. Remaining: explicit story review/closure, team burndown artifacts, agreed retrospective actions, Sprint 4 consumers and final submission deliverables. Historical outcomes and velocity remain unchanged.

**Acceptance environment clarified — 25 October 2026.** Public app/API deployment is outside the release plan. The [Definition of Done](../scrum/definition-of-done.md) permits integrated local frontend/API acceptance with real mapped authentication and the shared development database. A reproducible local software release, coherent end-to-end workflows and operational Supabase setup remain required. Earlier dated hosted/deployed wording below is retained as history, not a requirement to supply a public application URL.

**Scoped Arvin documentation update — 25 October 2026.** KAN-34/KAN-78 records now distinguish integrated source, independent review history, current-main CI and remaining hosted acceptance; see [S3-E21](../scrum/sprint-03/evidence/README.md#arvin-delivery-reconciliation--25-october-2026). Folders 1–4 must use the updated master rows, current design exports, separate case/execution records and dated Sprint 3 evidence. Existing CSV/workbook exports retain their labelled source dates; this is not a new full Jira export or completed submission. No story acceptance, sprint closure, instructor access or other story delivery is asserted.

**Test-document structure — 21 October 2026.** Folder 3 uses separate [test specifications](../testing/test-cases.csv) and [case execution records](../testing/test-executions.csv), linked through stable case IDs to the [traceability matrix](../requirements/traceability.csv) and [run narratives](../testing/test-evidence.md). This follows the Week 4 template: a specification is maintained once and an execution record is retained for each run/attempt. Maintain the source records during development; final presentation and numbered-folder packaging can wait until submission. Existing outcomes are retained with their source limitations; unperformed cases remain **Not executed**. The [original combined register](../testing/archive/test-cases-2026-10-21.csv) is an archive, not the current editable source.

**Documentation reconciliation — 17 October 2026.** The submitted [master backlog](1/README.md) distinguishes the verbatim Jira snapshot, repository corrections and documented before/after customer requirements. Sprint 1/2 criterion crosswalks and detailed functional specifications close mapping gaps; they do not establish new test results or historical acceptance. Finish the actual evidence and deliverables in the checklist below before calling the final submission complete. Scope and sprint-point totals are unchanged.

**Planning update — 16 October 2026, after reconstruction/rebalance:** the master register now covers all six customer changes and **42 parent items / 174 SP**. The remaining plan is **Sprint 3: 13 items / 63 SP; Sprint 4: 15 items / 63 SP**. Current exports contain all **68 Jira issues** including 26 unpointed subtasks. Customer receipt on **2 October** and the later scope/estimate/sprint changes are traced in the [change register](../requirements/change-requests.md). The earlier 97/29 plan is retained as history. These are planning records; actual implementation, tests, hosted acceptance, historical meeting/DoD evidence, final-sprint recordings and submission deliverables remain outstanding.

Submit **one ZIP containing numbered subfolders 1–7**. The table below maps each required deliverable to the project records and identifies what remains to complete.

The release and evidence ZIP is due **Friday 6 November 2026 at 23:59, Singapore time**, and the final sprint must end by that day. The 16 October chat confirmed that Week 12 is 2–8 November; the Friday date follows from that week and the course's specified deadline. Other milestones are the Week 7 process consultation, Week 13 interactive Q&A and peer review due Friday Week 14 at 23:59.

**Schedule update — 16 October 2026.** Sprint 3 runs 4–17 October; planning was on 4 October but scope was not finalised. No Sprint 3 work has started according to the chat update, and six members will focus for 16–17 October. Final development Sprint 4 is projected for 18–31 October. Reserve 1–6 November for final verification, evidence, diagrams, slide deck, access checks and packaging; this is a proposed buffer, not an extension of Sprint 4 or evidence that the deliverables are complete. Arrange [final-sprint recordings](../scrum/final-sprint-recordings.md) before 18 October. The 63/63 scope selection above supersedes the earlier proposal; current owners will be chosen by the team.

## Current handover readiness — 16 October 2026

**Ownership update — 16 October 2026.** All 28 unfinished parent items are now unassigned in Jira. Team members will choose their own stories; independent reviewers and the integration lead are **To agree** after ownership is chosen. The scope remains **63 SP per sprint**, averaging **10.5 SP per member per sprint** and **21 SP per member across both**. Aim for roughly 10–11 SP each, retaining whole estimates and dependency order rather than forcing an exact split. Earlier named allocations are historical. Claim a Jira card and sync its sprint record before starting work.

The backlog and sprint plans are ready to share for development after the pending documentation changes are reviewed, committed and pushed. Before parallel coding, confirm the team's estimates and capacity, choose owners/reviewers, create implementation subtasks and coordinate shared contracts/migration order. Actual feature implementation, tests, hosted acceptance and reviews remain to be done. Historical evidence and final submission deliverables below remain outstanding.

## Earlier readiness assessment — 15 October 2026

Documentation has been reconciled for Sprint 3 preparation; the final submission is **not yet complete**. Current Jira statuses, the [backlog workbook/export](1/README.md), [Sprint 2 baseline](../scrum/sprint-02/review.md), [post-sprint audit](../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) and [customer changes](../requirements/change-requests.md) now have distinct sources and dates. The dated 21 September/11 October paragraphs below are retained history.

| Next action | Record / evidence needed | Who supplies or decides |
| --- | --- | --- |
| Confirm Sprint 2's actual review and disposition | Reviewed build, actual date, participants, story outcomes and any remaining original criteria; record later completion separately | Team / actual review participants; record in [review](../scrum/sprint-02/review.md) |
| Complete available historical Scrum evidence | Existing planning/estimation/attendance/standup notes, start/end boards and burndown exports; explicitly identify originals that were not retained | Team members who hold the records; use existing sprint records/evidence indexes |
| Record retrospective agreements | Actual feedback, agreed actions, owners and dates; proposed actions are not agreements | Team / actual participants |
| Confirm the applicable Definition of Done | Actual prior agreement date, participants and source; applicability to upcoming work | Team; [version history](../scrum/definition-of-done.md) |
| Finish acceptance evidence and repair known defects | Targeted integrated local/shared-database scenarios and reviewed fixes; retain previously passed runs | Story owners/reviewers selected by the team; [planning triage](../scrum/sprint-03/planning.md#pre-planning-baseline-and-defect-triage) |
| Agree Sprint 3 scope | Distinguish unfinished work, reopened repairs, existing future backlog and CR-1–CR-6; decide estimates, owners, capacity and dates | Team during refinement/planning |
| Share the reconciled documentation | Review the current diff, then commit/push/merge when authorised | Tristan and a teammate reviewer |

Do not create replacement historical screenshots, invented meeting outcomes or a burndown curve from missing observations. A current rerun may verify current behaviour, but must keep its actual date. Planning can use an explicit baseline with acknowledged evidence gaps; those gaps remain visible for submission. Final-release features, diagrams, deck, recordings and instructor access still follow the checklist below.

## Required structure and current status

| Folder | Required deliverable and type | Project records | Still needed for final submission |
| --- | --- | --- | --- |
| **1** | Full final product backlog, with completed and pending stories — document | [Backlog export record](1/README.md), [product backlog](../requirements/product-backlog.md) (master backlog register), [change requests](../requirements/change-requests.md), [requirements](../requirements/README.md) | Export the **entire** retained backlog and story details from Jira, including work beyond Sprint 1; include the archived-scope register. Instructors will not access live Jira. |
| **2** | C4 system design — document(s) | [Architecture and C4 models](../architecture/README.md) (C1–C3, class and sequence diagrams, exports in `docs/architecture/exports/`), [API contract](../architecture/api-contract.md) | Update to the final implementation. Add readable PDF or image exports of C4 diagrams in `docs/architecture/`; check the exports without relying on GitHub's Mermaid renderer. |
| **3** | Test cases for all core features and traceable test evidence — document(s) | [Test guidance and templates](../testing/README.md), [specifications](../testing/test-cases.csv), [execution records](../testing/test-executions.csv), [run evidence](../testing/test-evidence.md), [traceability](../requirements/traceability.csv), [Sprint 1 AC-linked scenarios](../scrum/sprint-01/sprint-backlog.md#acceptance-test-plan) | Complete reproducible cases and story/AC links for all 20 core features and applicable customer changes. Record actual unit, integration and/or end-to-end results where relevant, including normal, boundary, conflict, failure and regression cases. Keep unperformed checks Not executed; retain failed attempts and separate retests. Store concise evidence exports in `docs/testing/`. |
| **4** | Scrum meeting documents/screenshots from **all sprints**, plus final-sprint recording links — documents and videos by link | [Scrum records](../scrum/README.md), [release burndown](../scrum/release-burndown.md), [Sprint 1](../scrum/sprint-01/README.md), [Sprint 2](../scrum/sprint-02/README.md), [Sprint 3](../scrum/sprint-03/README.md), [recording register](../scrum/final-sprint-recordings.md) | Capture starting goals/backlogs/tasks, estimation activities, end boards, burndown charts, reviews and retrospectives for every sprint. For the **final sprint only**, include planning, review, retrospective and one daily standup recording link. Use unlisted links; exclude video files from the ZIP. |
| **5** | Self-contained summary slide deck — **PDF** | [Deck record](5/README.md) | Use the prescribed template released in eLearn by Week 11. Summarise how the team addressed all rubric areas. The deck will not be presented. Place the PDF in `docs/submission/5/`. |
| **6** | Software release — code | Repository source, [run instructions](../../README.md), test files and [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Implement all core features and coherent workflows; verify clean setup. Include working code, run README, relevant unit/integration test classes and the CI scripts used. |
| **7** | Repository README and instructor access | [Repository and access record](7/README.md) | Verify both instructors can access the linked repository; record names, account checks and the submitted release commit. |

**Current stage, 21 September:** Sprint 1 closed with 24 Done points and eight carried points. Sprint 2 has a 43-point commitment, including the carry-over. The [product backlog](../requirements/product-backlog.md) maps all 20 release features and records future criteria and archived scope. A [current 51-record Jira snapshot](1/jira-backlog-2026-09-21.csv) is retained and must be refreshed for final submission. The [Sprint 1 review](../scrum/sprint-01/review.md#review-defects-and-carry-over) records the four reported defects; their fixes and retests, wider release acceptance and missing Scrum artifacts remain outstanding. Preserve the dated results and limits in the [test register](../testing/test-evidence.md); backlog refinement does not establish new passing tests. This checklist covers the full Week 12 submission; a GitHub push is not the final release or evidence ZIP.

## Prepare the numbered folders

**11 October reconciliation:** the [master register](../requirements/product-backlog.md#master-backlog-register), [Excel workbook](1/product-backlog.xlsx) and [60-record Jira export](1/jira-backlog-2026-10-11.csv) now include the current completed and future backlog. KAN-50 catalogue maintenance is merged and its checks are recorded; [current test evidence](../testing/test-evidence.md) supersedes stale implementation/test gaps above. The 21 September paragraph remains a historical snapshot. Jira Sprint 2 is still active, three child verification/review tasks remain open, and the actual Sprint 2 acceptance, retrospective and burndown records are still needed. The Definition of Done has [reported team agreement](../scrum/definition-of-done.md), with agreement details to follow.

Keep editing the project documents at the paths above. From the Git repository root, with an existing commit and `origin` remote, run:

```sh
npm run submission:prepare
```

This uses the project's existing Node and Git tools, with no additional dependencies. It creates a new, ignored `dist/submission-...` folder containing:

```text
submission-.../
├── 1/  Product backlog export record, exports and requirements
├── 2/  C4 architecture and design documents
├── 3/  Test specifications, execution records, traceability and run evidence
├── 4/  All sprint records, evidence and final-sprint recording links
├── 5/  Summary slide deck PDF and deck record
├── 6/  Software source, README, tests and CI configuration
└── 7/  Repository README, access record and package metadata
```

The command copies the current files on disk, including uncommitted files that Git does not ignore. Folder 6 preserves the repository layout and its documentation so the release can be used independently. Other folders contain snapshots of the relevant documents, with local Markdown links adjusted for the package. The package record in folder 7 records the local commit and whether uncommitted changes were included.

Folder 3 includes all files under `docs/testing/` plus `docs/requirements/traceability.csv`. The CSV registers can be read as spreadsheets; no duplicate workbook or screenshot-coloured template is required by the deliverable. If additional presentation exports are produced, derive them from these registers and keep the same IDs and outcomes. Label the retained combined-register archive as historical and do not count aggregate summaries or Not executed placeholders as executed cases.

The preparation command does not generate missing evidence, render diagrams, run tests or check instructor access. It excludes local environment files other than `.env.example`, dependency directories, build/test caches and video files. Add curated exports to the source locations in the table so they are included next time. Do not edit generated copies; update the source and prepare a new snapshot.

For final submission, review the contents, then ZIP **the seven numbered folders together**. Open the ZIP and confirm that `1/` through `7/` are at its top level. Use a ZIP tool that includes dotfiles: `6/.github/workflows/ci.yml`, `6/.env.example` and `6/.nvmrc` are part of the release.

## Final checks

- [ ] Full backlog export includes completed and pending stories, descriptions and acceptance criteria, readable without Jira.
- [ ] C4 diagrams match the release and are readable in the included document/image exports.
- [ ] All 20 core features and all six required Week 7 customer changes work as coherent workflows; remaining gaps are resolved or disclosed.
- [ ] All 20 core features and applicable customer changes trace through story/AC IDs to reproducible specifications, relevant test files and supported execution evidence. Historical or superseded requirements remain distinguishable from current acceptance.
- [ ] Folder 3 separates specifications from execution records. Actual records identify the tested build/environment and retain failures/retests; missing historical details are Not recorded and unperformed cases remain Not executed.
- [ ] Appropriate unit, integration and/or end-to-end evidence covers normal, boundary, conflict, failure and regression scenarios. Mocked HTTP/database or browser fixtures are labelled with their limits; they are not presented as live integrated local end-to-end acceptance with real authentication and shared-database persistence.
- [ ] Report measured coverage and target 100% as required by the project rubric; where not possible, explain the uncovered code and reasons. Passing suite totals do not establish every linked scenario or story as accepted.
- [ ] Every sprint has starting scope, estimation records, an ending board and burndown, review outcomes and retrospective actions.
- [ ] Final-sprint planning/review/retro/standup recording links work for the instructors; video files are excluded.
- [ ] The self-contained PDF slide deck uses the prescribed course template.
- [ ] Setup and checks reproduce from folder 6 in a clean environment; the run README, test code and CI scripts are present. Supabase prerequisites and shared-development setup verification are documented separately from isolated database tests; credentials are excluded. Public app/API deployment is not required.
- [ ] The intended release is committed and pushed; the package record and folder 6 match that commit.
- [ ] Folder 7 contains the repository link and both instructors' access has been verified.
- [ ] Missing record fields are completed or explained; no template prompts are presented as finished evidence.
- [ ] The final ZIP has folders 1–7 at its root and opens correctly, with required dotfiles included.
- [ ] Submit through the correct section's eLearn assignment before the deadline; only the latest submission is graded.

For Week 13, each team member should be able to explain the relevant code and decisions, demonstrate selected behaviour, trace a requirement to tests and discuss improvements made after feedback.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

Arvin’s Sprint 1–3 contribution readback now includes owned KAN-24, KAN-51, KAN-34/KAN-78 and supporting scope correction, preparation, migration rollout and KAN-81 review fixes. The master backlog, sprint records, test narrative and traceability contain the reconciliation. Existing Jira CSV/workbook exports remain historical snapshots; a fresh Jira export and acceptance reconciliation are still required. Retained preparation snapshots are draft evidence, not final meeting records or instructor-delivery confirmation.
