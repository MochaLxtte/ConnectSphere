# Sprint 3 daily progress and burndown

**Current selected scope: 13 parents / 63 SP after the 16 October rebalance.** Earlier 84/97-point statements below are dated planning snapshots. No implementation completion is claimed by changing scope.

**Current ownership:** unassigned for members to choose; reviewers and integration lead To agree. Earlier named allocation entries below are historical.

Daily Scrums: Tuesday, Thursday, Saturday. Each person writes their own row; any one member adds the burndown checkpoint the same day. Notes written outside a meeting go under "Development updates" and say so.

## Daily Scrum log

| Date / time | Attendees | Member | Done since last | Next | Blockers |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Development updates

Dated notes per story: what was finished, evidence IDs, what remains.

**15 October 2026 — preparation outside a Daily Scrum.** Reconciled original sprint records, current Jira/backlog exports, retained the post-sprint audit as `AUTO-20261015-01`, and prepared the [defect triage](planning.md#pre-planning-baseline-and-defect-triage) and [customer change register](../../requirements/change-requests.md). No repair was implemented, no Jira story was reopened, and no Sprint 3 goal, owner, estimate or commitment was agreed by this work. Actual planning/acceptance evidence and the team's decisions remain outstanding. This is not a member's standup row.

**16 October 2026 — schedule and scope refinement outside a Daily Scrum.** The confirmed sprint window is 4–17 October, with planning on 4 October but no finalised scope or Sprint 3 work started at that point. All six members intend two full days of focused work, 16–17 October. Sprint 4 is final development, projected 18–31 October; Week 12 is 2–8 November, giving a Friday 6 November submission deadline. The current scope proposal is documented in [planning](planning.md), with estimates **To agree**. No implementation, acceptance or team vote is recorded by this note; it is not a member's standup row.

The broad proposal covers all 15 future items, five additional repairs and CR-1/CR-5 in Sprint 3 (84 provisional SP), followed by the remaining four customer changes in Sprint 4 (29 provisional SP). These proposed values are not entered in the agreed scope/burndown tables below; they await team agreement, votes and ownership. The current Jira estimates and statuses are unchanged.

**16 October 2026 — selected plan and evidence review outside a Daily Scrum.** The selected carry-over covers KAN-6, KAN-34, KAN-50, KAN-12 and KAN-52 at full original points for completion/re-verification. The selected Sprint 3 scope is **97 SP = 60 future + 19 carried + 18 new** across 23 items. This supersedes the initial 84-SP proposal's 6-SP repair allowance; no original carry-over estimate is reduced to zero. The five currently outstanding stories earn no delivered credit in the present disposition, while historical Sprint 2 acceptance and velocity remain **Not recorded**. The remaining 24 points are not automatically accepted by subtraction.

Selected ownership/review: Arvin 19/Kai Jie, Kai Jie 19/Tristan, Ernest 12/Ryan, Tristan 23/Irfan, Ryan 11/Arvin and Irfan 13/Ernest. Arvin coordinates integration. KAN-15 changes from 2 to 5 SP with rationale in [estimation](estimation-and-capacity.md#re-estimates-during-the-sprint); KAN-60 is the one 2-SP rejection-reason correction and does not duplicate KAN-36. Jira verification confirms KAN-77 (2), KAN-78 (8) and KAN-79 (8) for the three new change stories. Sprint 3 id 67 is Active with 23 parents / 97 SP, all To Do. Sprint 2 id 34 was administratively closed on 16 October at 02:06 Singapore time; no historical acceptance outcome is inferred. The [plan](planning.md) includes dependency order, implementation defaults and two-day checkpoints. This update records planning, not six individual votes, a Daily Scrum, executed tests or implementation completion.

**16 October 2026 — balanced release reconstruction outside a Daily Scrum.** Receipt of the Week 7 changes on 2 October was confirmed, together with the plan to finish the original Sprint 2 scope before considering changes at Sprint 3 planning. The confirmation is recorded now; original implementation dates, missing acceptance and the 43-point Sprint 2 baseline remain unchanged. Current planning creates a complete linked customer-change backlog and allocates **63 SP to each remaining sprint**. Move 12 unstarted existing parents / 47 SP to Sprint 4, split KAN-64 8 into KAN-64 5 + KAN-80 3, and bring CR-2 (KAN-81, 8) and CR-4 (KAN-83, 8) into Sprint 3. CR-3 (KAN-82, 5) and CR-6 (KAN-84, 8) remain in Sprint 4. Full original carry-over remains 19 SP. Ownership/review is redistributed in [planning](planning.md); no six-member vote, standup, test execution or earlier commitment is claimed.

**16 October 2026 — self-selection follow-up outside a Daily Scrum.** Stories are unassigned for team members to choose; the earlier named allocation is superseded. Target roughly 10–11 SP each per 63-SP sprint and 21 SP across the 126-SP release remainder, without splitting or changing story estimates merely to equalise loads. Select independent reviewers after ownership and agree an integration lead. Scope, criteria, test outcomes and historical assignments are unchanged. This is a planning update, not a standup or meeting record.

## Impediments

| Raised | Impediment | Owner | Action | Status |
| --- | --- | --- | --- | --- |
| 16 October 2026 | Existing historical acceptance/DoD provenance and starting evidence are incomplete | Collection owner To agree; actual sources needed from the team | Retain gaps; review current implementation against ACs, capture new evidence with its actual date, and keep historical acceptance distinct | Not recorded |
| 16 October 2026 | Shared contracts and migrations touch parallel workstreams | Integration lead To agree; selected story owners | Use the first integration checkpoint in planning; publish contracts before dependent implementation and avoid editing applied migrations | Not executed |

## Scope change log

| Date | Added / removed / re-estimated | SP delta | New total | Reason / who agreed |
| --- | --- | ---: | ---: | --- |
| Baseline | No story selection finalised at the reported 4 October planning | — | Not recorded | Confirmed planning record; do not turn the later initial proposal into a starting commitment |
| 16 October 2026 | Selected 15 existing future items, five full-point carry-over stories and three new change stories | +97 selected scope | 97 | The planning selection includes the five confirmed carry-over parents; detailed estimates/owners in planning and estimation |
| 16 October 2026 | KAN-15 estimate 2 → 5; included in the 97 above | +3 versus previous Jira estimate, already included | 97 | Reviewed change workflow and arrangement effects are larger than the original 2-SP read-only anchor; no second addition to scope |
| 16 October 2026 | Five carry-over stories retain original 19 rather than initial proposal's 6-SP repair allowance | +13 versus initial 84-SP proposal, already included | 97 | Full-point carry-over disposition; this changes the proposal accounting, not the original Jira story estimates |
| 16 October 2026, rebalance | Move KAN-9, KAN-10, KAN-14, KAN-15, KAN-17, KAN-18, KAN-26, KAN-61, KAN-62, KAN-63, KAN-66, KAN-67 (12 unstarted parents) to Sprint 4 | -47 | 50 | Dependency-coherent release rebalance; estimates and ACs preserved |
| 16 October 2026, rebalance | Split KAN-64 8 → KAN-64 5 plus KAN-80 3 in Sprint 4 | -3 | 47 | Preserve full original notification coverage; separate usable current triggers from later trigger integration |
| 16 October 2026, rebalance | Add KAN-81 / CR-2 outage recovery (8) and KAN-83 / CR-4 expiring holds (8) from earlier Sprint 4 forecast | +16 | 63 | Cohesive venue workflow completes this sprint; total remaining allocation remains 126 SP |
| 16 October 2026, self-selection | Earlier named owner/reviewer allocation withdrawn; members choose whole stories | 0 | 63 | Self-selection update; target roughly 10–11 SP each this sprint / 21 across both; independent reviewers and integration lead To agree |


## Burndown data

`remaining = scope total − Done SP`. Count a story only when it meets the Definition of Done; no partial points.

| Date | Scope total | Done SP (cumulative) | Remaining SP | Ideal remaining | Source / time |
| --- | ---: | ---: | ---: | ---: | --- |
| 16 October 2026 | 97 | 0 selected Sprint 3 points evidenced complete | 97 | Not assessed | Verified 16 October Jira snapshot: active Sprint 3 id 67, 23 parents all To Do. Actual observation, not a reconstructed 4 October baseline |
| 16 October 2026, after rebalance | 63 | 0 selected parent points evidenced complete | 63 | Not assessed | Current administrative snapshot: Sprint 3 id 67, 13 selected To Do parents; scope reduction is reallocation, not completed work |

At sprint close: export the Jira burndown chart, save it in `evidence/`, register it, and update `../release-burndown.md`.
