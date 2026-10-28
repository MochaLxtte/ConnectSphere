# Sprint 4 daily progress and burndown

**Current planned selection: 15 parents / 63 SP.** Jira Sprint 4 (id 68) is Future, not started. Planned window: 18–31 October 2026. Pre-sprint planning records below do not claim implementation or a sprint-start baseline.

**Current ownership:** unassigned for members to choose; reviewers and integration lead To agree. Earlier named allocation entries below are historical.

Daily Scrums follow Tuesday, Thursday and Saturday: planned dates 20, 22, 24, 27, 29 and 31 October. Each member writes their own row. Record one actual final-sprint Daily Scrum live and register it in the [recording register](../final-sprint-recordings.md).

## Daily Scrum log

| Date / time | Attendees | Member | Done since last | Next | Blockers |
| --- | --- | --- | --- | --- | --- |
| Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded |

## Development updates

**16 October 2026 — pre-sprint planning outside a Daily Scrum.** Reconstructed the remaining release backlog and selected 63 SP for each remaining sprint. Sprint 4 holds 12 original future parents at 47 SP, KAN-80's 3-SP notification split and customer changes KAN-82/CR-3 (5) and KAN-84/CR-6 (8). All selected work remains to be implemented, tested and assessed. The 18 October planning, 31 October review/retro and their recordings have not happened in this record. Reconcile actual Sprint 3 carry-over at planning without treating relocated unstarted work as failed completed-sprint work.

**16 October 2026 — self-selection follow-up outside a Daily Scrum.** Stories are unassigned for team members to choose; the earlier named allocation is superseded. Target roughly 10–11 SP each per 63-SP sprint and 21 SP across the 126-SP release remainder, without splitting or changing story estimates merely to equalise loads. Select independent reviewers after ownership and agree an integration lead. Scope, criteria, test outcomes and historical assignments are unchanged. This is a planning update, not a standup or meeting record.

**26 October 2026 — KAN-66 development update outside a Daily Scrum (Irfan).** Irfan assigned KAN-66, KAN-15 and KAN-82 (13 SP) to himself in Jira and moved them to In Progress; KAN-66 subtasks KAN-107/108/109 created. KAN-66 implemented on `feat/KAN-66-planning-edits`: migration 014 (event revision and edit audit), status/role/field edit rules on `PATCH /api/events/:id`, revision checks for reviewer actions, and the `/events/:id/details` page. Evidence: `AUTO-20261026-KAN66-01` (unit/component, Pass) and `AUTO-20261026-KAN66-02` (browser fixtures; KAN-66 tests Pass, 5 unrelated environment/timing failures recorded). Remaining: PostgreSQL integration suite (CI), migration 014 announcement and shared rollout, local integrated acceptance, independent review, and AC8 assessment with KAN-15. Estimate unchanged at 3 SP. The 13 SP selection is above the 10–11 SP guidance; KAN-82 is the first to drop if time runs short. This is a development note, not a standup row.

**27 October 2026 — KAN-66 development update outside a Daily Scrum (Irfan).** Re-ran `npm run check` and coverage on the committed branch (`AUTO-20261027-KAN66-03`, Pass) and opened the KAN-66 pull request so CI runs the PostgreSQL integration and browser suites. Commit messages were rewritten to remove AI co-author trailers (content unchanged). Heads-up: the KAN-9/KAN-26 and KAN-62/KAN-63 branches also add a `014_*` migration; whichever merges after KAN-66 should renumber. Remaining: CI result, independent review (Tristan; reviewer changed from Kai Jie the same day), migration 014 team notice and shared rollout after merge, local integrated acceptance, AC8 with KAN-15.

**27 October 2026 — KAN-15 development update outside a Daily Scrum (Irfan).** Design D1–D8 approved and implemented on `feat/KAN-15-change-requests`, stacked on the KAN-66 branch because approval reuses KAN-66's revision and edit audit. Migration 017 completes the unused 004 `event_change_requests` table. Evidence: `AUTO-20261027-KAN15-01` (unit/component and browser fixtures Pass; full browser suite 164/164 locally). Remaining: PostgreSQL integration in CI, independent review, migrations 016/017 notice and shared rollout after merge, local integrated acceptance (planned via Claude in Chrome), and the equipment cancellation model once #62/#63 settle (D8). Estimate unchanged at 5 SP.

**27 October 2026 — KAN-66 integration update outside a Daily Scrum (Irfan).** After #62 (KAN-9/KAN-26) merged, `main` was merged into `feat/KAN-66-planning-edits`; shared-document conflicts kept both sides. KAN-66's migration was renumbered 014 to 016 (KAN-9's 014 is already reported applied on shared Supabase) and its evidence ID S4-E10 became S4-E14 because KAN-9 used S4-E10 to S4-E13. On the stacked KAN-15 branch, KAN-15's S4-E11 became S4-E15 for the same reason. Earlier dated run records keep their original wording.

## Impediments

| Raised | Impediment / dependency | Owner | Planned action | Status |
| --- | --- | --- | --- | --- |
| 16 October 2026 | Sprint 3 venue, notification and assignment contracts are prerequisites | Integration lead To agree; selected story owners | Review actual integrated Sprint 3 build at planning and reforecast any unfinished dependencies explicitly | Not assessed |
| 16 October 2026 | Historical acceptance/DoD provenance and individual capacity details remain incomplete | Collection owner To agree; team supplies actual sources | Keep missing evidence marked; record future meetings and checks as they occur | Not recorded |
| 26 October 2026 | No isolated PostgreSQL available on Irfan's workstation (Docker Desktop could not start in reasonable time); shared Supabase unsuitable for cleanup-based tests (AGENTS.md §7.3; migration 013 re-schedules the named pg_cron job per test schema) | Irfan | Run the PostgreSQL integration suite in GitHub CI on the KAN-66 pull request | Open |

## Scope change log

| Recorded date | Added / removed / reallocated | SP delta | Total | Reason / authority |
| --- | --- | ---: | ---: | --- |
| 16 October 2026, earlier forecast | Four customer changes CR-2/3/4/6 | 29 forecast | 29 | Earlier 97/29 plan; forecast, not a completed planning-meeting commitment |
| 16 October 2026, rebalance | Move 12 existing unstarted parents from Sprint 3 | +47 | 76 | Near-equal release allocation; preserve estimates and criteria |
| 16 October 2026, rebalance | KAN-80 notification integrations split from KAN-64 | +3 | 79 | Original 8-point notification scope retained as 5 + 3 |
| 16 October 2026, rebalance | Move KAN-81/CR-2 and KAN-83/CR-4 into Sprint 3 | -16 | 63 | Coherent venue work completed before downstream lifecycle/safety work |
| 16 October 2026, self-selection | Earlier named owner/reviewer allocation withdrawn; members choose whole stories | 0 | 63 | Self-selection update; target roughly 10–11 SP each this sprint / 21 across both; independent reviewers and integration lead To agree |

This is a pre-sprint selection. Any actual Sprint 3 carry-over or newly discovered work changes the forecast explicitly at planning; it is not silently included in 63.


## Burndown data

`remaining = scope total − Done SP`; only stories meeting the DoD by the sprint end count. The pre-start observation is not a reconstructed 18 October starting board.

| Observation date | Scope total | Done SP | Remaining SP | Ideal remaining | Source / limits |
| --- | ---: | ---: | ---: | ---: | --- |
| 16 October 2026, pre-start | 63 | 0 selected parent points evidenced complete | 63 | Not assessed | Current Jira administrative selection: Future sprint id 68; no sprint meeting or product acceptance implied |

At actual start and close, capture the board. At close export the burndown, register evidence and update the [release burndown](../release-burndown.md). Work after 31 October retains its actual date.

## 26 October 2026 — KAN-9 development update

Outside a Daily Scrum: KAN-9 is In Progress / Tristan (8 SP), with unestimated subtasks KAN-101/102/103. Implemented strict quantity/time rules, operational counters, protected minimal event context, saved/unsaved read-only checks and an interface that discards stale results. Four local code commits separate the rules/schema, API, interface and database regression slices; subsequent documentation and focused test commits retain the KAN-9 ID. See AUTO-20261026-KAN9-01 / S4-E10 for commands, failed attempts/retests and coverage.

KAN-26 is assigned to Tristan but remains To Do (3 SP). Migration 014 application to shared Supabase, integrated real-login manual scenarios, independent review and merge remain outstanding. Stock administration (KAN-18), request entry/review (KAN-63) and reservation writes (KAN-26) are not claimed complete. Scope remains 63 SP; no Done points, meeting attendance, estimates or burndown observations are added.

## 26 October 2026 — KAN-26 development update

Outside a Daily Scrum: implemented full saved-request reservation, current operational-capacity locking, transactionally committed coordinator/staff notices, audited manual cancellation and automatic release on actual CANCELLED/COMPLETED database transitions. The new branch includes local KAN-9 commits. KAN-26 remains In Progress / Tristan at 3 SP; KAN-104/105/106 are unestimated In Progress subtasks. AC105–108 and the decision log record the approved edge-case refinements; the estimate remains unchanged.

AUTO-20261026-KAN26-01 / S4-E12 records the exact automated tests, failed attempts/retests, coverage and environment boundaries. S4-E13 captures API-fixture browser views, not manual acceptance. Migration 014 and test accounts were reported ready; additive migration 015 is prepared but not applied to shared Supabase. KAN-63 request-entry, KAN-18 stock-editor and KAN-62/KAN-10 lifecycle UI acceptance remain pending. Manual integrated tests are Not executed; independent review, merge and formal acceptance remain outstanding. Scope remains 63 SP; no standup, team vote or new Done points are invented.

## 26 October 2026 — Combined KAN-9 and KAN-26 handoff

Prepared `feat/KAN-9-KAN-26-equipment-workflow` for a single GitHub pull request containing the existing 13 feature/test/documentation commits, with their history preserved. The branch contains the latest fetched `main` (`c849ebf`) and both complete local feature branches. This handoff adds only branch-navigation notes and a detailed commit message; it does not change the tested application or database source.

The recorded verification remains frontend 945 / backend 1,518 tests, isolated PostgreSQL 555 tests and browser 179 tests, with types, builds and coverage passing in AUTO-20261026-KAN26-01. Manual acceptance remains Not executed, migration 015 shared application is pending, and KAN-18/63/62/10 dependent UI checks remain separate. A push does not establish CI success, human review, merge or Done status; no acceptance or sprint-point changes are recorded.
