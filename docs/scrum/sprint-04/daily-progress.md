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

**27 October 2026 — KAN-66 development update outside a Daily Scrum (Irfan).** Re-ran `npm run check` and coverage on the committed branch (`AUTO-20261027-KAN66-03`, Pass) and opened the KAN-66 pull request so CI runs the PostgreSQL integration and browser suites. Commit messages were rewritten to remove AI co-author trailers (content unchanged). Heads-up: the KAN-9/KAN-26 and KAN-62/KAN-63 branches also add a `014_*` migration; whichever merges after KAN-66 should renumber. Remaining: CI result, independent review (Kai Jie), migration 014 team notice and shared rollout after merge, local integrated acceptance, AC8 with KAN-15.

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
