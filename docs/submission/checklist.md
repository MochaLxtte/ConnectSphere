# Submission checklist

Submit **one ZIP containing numbered subfolders 1–7**. The table below maps each required deliverable to the project records and identifies what remains to complete.

The release and evidence ZIP is due **Friday Week 12 at 23:59**, and the final sprint must end by that day. Confirm the calendar date against the course schedule. Other milestones are the Week 7 process consultation, Week 13 interactive Q&A and peer review due Friday Week 14 at 23:59.

## Required structure and current status

| Folder | Required deliverable and type | Project records | Still needed for final submission |
| --- | --- | --- | --- |
| **1** | Full final product backlog, with completed and pending stories — document | [Backlog export record](1/README.md), [requirements](../requirements/README.md) | Export the **entire** backlog and story details from Jira, including work beyond Sprint 1. Instructors will not access live Jira. |
| **2** | C4 system design — document(s) | [Architecture and C4 models](../architecture/README.md), [API contract](../architecture/api-contract.md) | Update to the final implementation. Add readable PDF or image exports of C4 diagrams in `docs/architecture/`; check the exports without relying on GitHub's Mermaid renderer. |
| **3** | Test cases for all core features and traceable test evidence — document(s) | [Test guidance](../testing/README.md), [case outlines](../testing/test-cases.csv), [traceability](../requirements/traceability.csv), [Sprint 1 AC-linked scenarios](../scrum/sprint-01/sprint-backlog.md#acceptance-test-plan) | Complete cases and story/AC links; add actual unit, integration and end-to-end results where relevant. Store concise evidence exports in `docs/testing/`. |
| **4** | Scrum meeting documents/screenshots from **all sprints**, plus final-sprint recording links — documents and videos by link | [Scrum records](../scrum/README.md), [Sprint 1](../scrum/sprint-01/README.md), [recording register](../scrum/final-sprint-recordings.md) | Capture starting goals/backlogs/tasks, estimation activities, end boards, burndown charts, reviews and retrospectives for every sprint. For the **final sprint only**, include planning, review, retrospective and one daily standup recording link. Use unlisted links; exclude video files from the ZIP. |
| **5** | Self-contained summary slide deck — **PDF** | [Deck record](5/README.md) | Use the prescribed template released in eLearn by Week 11. Summarise how the team addressed all rubric areas. The deck will not be presented. Place the PDF in `docs/submission/5/`. |
| **6** | Software release — code | Repository source, [run instructions](../../README.md), test files and [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Implement all core features and coherent workflows; verify clean setup. Include working code, run README, relevant unit/integration test classes and the CI scripts used. |
| **7** | Repository README and instructor access | [Repository and access record](7/README.md) | Verify both instructors can access the linked repository; record names, account checks and the submitted release commit. |

**Current stage, 15 September:** Sprint 1 implementation includes Supabase authentication, draft/submission backend work and the connected coordinator decision interface. The [test register](../testing/test-evidence.md) contains automated results and a limited hosted approval/status observation. KAN-16 organiser list/status work, broader acceptance, and the missing Scrum/export artifacts remain outstanding. This checklist covers the full Week 12 submission; a GitHub push is not the final release or evidence ZIP.

## Prepare the numbered folders

Keep editing the project documents at the paths above. From the Git repository root, with an existing commit and `origin` remote, run:

```sh
npm run submission:prepare
```

This uses the project's existing Node and Git tools, with no additional dependencies. It creates a new, ignored `dist/submission-...` folder containing:

```text
submission-.../
├── 1/  Product backlog export record, exports and requirements
├── 2/  C4 architecture and design documents
├── 3/  Test cases, traceability and test evidence
├── 4/  All sprint records, evidence and final-sprint recording links
├── 5/  Summary slide deck PDF and deck record
├── 6/  Software source, README, tests and CI configuration
└── 7/  Repository README, access record and package metadata
```

The command copies the current files on disk, including uncommitted files that Git does not ignore. Folder 6 preserves the repository layout and its documentation so the release can be used independently. Other folders contain snapshots of the relevant documents, with local Markdown links adjusted for the package. The package record in folder 7 records the local commit and whether uncommitted changes were included.

The preparation command does not generate missing evidence, render diagrams, run tests or check instructor access. It excludes local environment files other than `.env.example`, dependency directories, build/test caches and video files. Add curated exports to the source locations in the table so they are included next time. Do not edit generated copies; update the source and prepare a new snapshot.

For final submission, review the contents, then ZIP **the seven numbered folders together**. Open the ZIP and confirm that `1/` through `7/` are at its top level. Use a ZIP tool that includes dotfiles: `6/.github/workflows/ci.yml`, `6/.env.example` and `6/.nvmrc` are part of the release.

## Final checks

- [ ] Full backlog export includes completed and pending stories, descriptions and acceptance criteria, readable without Jira.
- [ ] C4 diagrams match the release and are readable in the included document/image exports.
- [ ] All 20 core features work as coherent workflows; remaining gaps are resolved or disclosed.
- [ ] Test cases trace important stories/acceptance criteria to actual results; measured coverage and justified gaps are recorded.
- [ ] Every sprint has starting scope, estimation records, an ending board and burndown, review outcomes and retrospective actions.
- [ ] Final-sprint planning/review/retro/standup recording links work for the instructors; video files are excluded.
- [ ] The self-contained PDF slide deck uses the prescribed course template.
- [ ] Setup and checks reproduce from folder 6 in a clean environment; the run README, test code and CI scripts are present. Supabase prerequisites and hosted setup verification are documented separately from isolated database tests; credentials are excluded.
- [ ] The intended release is committed and pushed; the package record and folder 6 match that commit.
- [ ] Folder 7 contains the repository link and both instructors' access has been verified.
- [ ] Missing record fields are completed or explained; no template prompts are presented as finished evidence.
- [ ] The final ZIP has folders 1–7 at its root and opens correctly, with required dotfiles included.
- [ ] Submit through the correct section's eLearn assignment before the deadline; only the latest submission is graded.

For Week 13, each team member should be able to explain the relevant code and decisions, demonstrate selected behaviour, trace a requirement to tests and discuss improvements made after feedback.
