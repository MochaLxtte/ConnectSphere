# Sprint 2 daily progress and burndown

Sprint 2 runs **20 September–3 October 2026**, Asia/Singapore. The starting baseline is **43 points across 12 PBIs**, comprising 35 new points and 8 carried points. Record actual observations below; an empty cell means not recorded, not zero work or a missed meeting.

## Cadence

Daily Scrums are scheduled **three times each week: Tuesday, Thursday and Saturday**. The Sprint 2 dates are **22, 24, 26 and 29 September; 1 and 3 October**. Exact times and participants remain to be recorded. Sprint Review is scheduled for Saturday 3 October; that day's Daily Scrum and review need separate records. Sprint 3 planning and the next sprint start fall on Sunday 4 October.

## Daily log

Scheduled dates do not establish that a meeting occurred. Capture actual meeting time, attendees, progress toward the goal, next steps, blockers and any adaptation. Add asynchronous development updates with their actual date and identify them as such.

| Scheduled Daily Scrum | Actual time / attendees | Progress toward goal | Next steps | Blocker / adaptation / owner | Evidence |
| --- | --- | --- | --- | --- | --- |
| 22 September | | | | | |
| 24 September | | | | | |
| 26 September | | | | | |
| 29 September | | | | | |
| 1 October | | | | | |
| 3 October | | | | | |

### 21 September backlog refinement

Asynchronous update, not a Daily Scrum: Jira criteria were refined, KAN-56–KAN-59 added under the three carried stories, KAN-60 added for mandatory event-rejection reasons, and KAN-61–KAN-64 added for future release coverage. KAN-21 was marked superseded by KAN-55. The live sprint still showed 12 PBIs / 43 points: 35 To Do, eight In Review and zero Done. No fixes or new test runs are recorded by this update. Exact observation time was not recorded.

Later backlog refinement on the same date added KAN-65 reassignment, KAN-66 ordinary planning edits and KAN-67 registration viewing as unestimated future stories. Existing registration, change-review, equipment and notification criteria were consolidated. KAN-21 was archived as a duplicate, and optional KAN-19/KAN-22/KAN-23 were archived with history retained. The sprint commitment remains unchanged. See the [product backlog](../../requirements/product-backlog.md) for scope and the archive register; this is documentation/backlog work, not a feature completion or test result.

### 29 September development update — Irfan (KAN-33 / KAN-56)

Asynchronous development update, not a Daily Scrum record. KAN-56 assigned to Irfan and moved to In Progress; KAN-33 moved from In Review back to In Progress while its carry-over repair is worked. S1-DEF-02 reproduced statically on `dff42ed`: the coordinator queue lists only pending statuses and `/reviews` offered no route back to a decided request. Repair implemented on `feat/KAN-33-decided-request-access` (coordinator `scope=history` list plus a Decided requests section; [decision record](../../requirements/assumptions-and-questions.md#29-september-2026--kan-56-coordinator-decided-request-history)). Automated checks passed locally (AUTO-20260929-01); hosted walkthrough MAN-20260929-01, CI integration/browser runs and peer review remain before Done. KAN-42/KAN-43 are to be closed with this PR's CI evidence and review. No story points are completed by this update.

### 3 October development update — Ernest (KAN-51)

Asynchronous development update, not a Daily Scrum record. KAN-51 was built on `feat/KAN-51-venue-availability-calendar` (`4c89da9` backend, `6ede774` frontend) as a new read-only module, because the earlier venue code was removed on 26 September: `GET /api/venues/availability` for Event Coordinators, Venue Staff and Technical Support Staff, and the `/venues/availability` week calendar. Provisional rules are in the [3 October decision](../../requirements/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar). Automated layers passed locally (AUTO-20261003-01), and [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) passed CI (AUTO-20261003-02); peer review is pending. The hosted S2-T05/S2-T06 checks still need Venue Staff and Technical Support Staff accounts and synthetic bookings and blocks, because the booking and blocking stories are not built yet. Jira status is not recorded by this update.

## Impediments and adaptations

| Reference | Current planning position | Next inspection | Action owner / resolution |
| --- | --- | --- | --- |
| Scope baseline | 35 new + 8 retained carry-over points = 43; new-story owners and capacity not yet recorded. Kai Jie retains KAN-6/KAN-34 and Irfan retains KAN-33 in Jira. | Allocate total work, including repair, integration and review | To agree |
| S2-Q01/02 | Use preconfigured availability, fewest active events and consistent ID/order. Stored availability field, active-event statuses, no-eligible fallback and handover authority remain open. | Record definitions and remaining policy before accepting assignment behavior | To agree |
| S2-Q03 | Existing calendar access is broader than the agreed internal roles; Technical Support Staff detail policy needs clarification | Reconcile UI/API role matrix and tests | To agree |
| S1-DEF-01–04 | Four carry-over paths require reproduction and regression evidence | Capture route, data, role and build; preserve successful Sprint 1 demo observations | To agree |
| S2-Q04–07, S2-Q10/11 | Venue interval/status, requirement matching, booking information, rejection reasons and block/catalogue lifecycle policies need refinement | Agree the remaining rules while retaining Jira's existing suitability checks | To agree |
| Criteria reconciliation | Six shorter cards now include the missing checks and customer-rule refinements; the detailed planning version retains 93 stable IDs. | Complete detailed criterion/test cross-references and settle remaining policies before acceptance | Jira edits applied 21 September; remaining decisions to agree |

These are known planning dependencies, not a record that work was blocked on a particular day. Add dated observations and actions when they occur.

## Scope change log

| Decision date | Added / removed / re-estimated scope | Point delta | New total | Reason / participants | Evidence |
| --- | --- | ---: | ---: | --- | --- |
| Baseline | Nine new stories plus KAN-6, KAN-33 and KAN-34 at retained estimates | — | 43 | Starting scope; meeting participants not recorded | [Backlog](sprint-backlog.md) and [estimation](estimation-and-capacity.md) |

Carry-over is already included in the starting 43 points. Add only actual later changes; do not add the same defect work again as separate points without an explicit scope decision.

## Burndown data

| Date | Scope total at checkpoint | Actual cumulative Done points | Actual remaining points | Observation time / source / notes |
| --- | ---: | ---: | ---: | --- |
| 20 September | | | | Starting commitment: 43 points; actual checkpoint not recorded |
| 21 September | 43 | 0 | 43 | Live Jira inspection after refinement; 35 To Do / 8 In Review / 0 Done. Exact observation time and portable board capture not recorded. |
| 22 September | | | | |
| 23 September | | | | |
| 24 September | | | | |
| 25 September | | | | |
| 26 September | | | | |
| 27 September | | | | |
| 28 September | | | | |
| 29 September | 43 | 0 | 43 | Live Jira inspection by Irfan at about 18:40 +08:00: 0 Done. KAN-6/KAN-34 In Review; KAN-33 and subtask KAN-56 In Progress; KAN-8, KAN-12, KAN-29 and KAN-50–KAN-55 To Do, with KAN-50–KAN-55 unassigned. No portable capture retained. |
| 30 September | | | | |
| 1 October | | | | |
| 2 October | | | | |
| 3 October | | | | |

For each verified checkpoint, record `remaining = current scope total − accepted Done points`. Count a story only when it meets the Definition of Done; code presence, merged work and partial test passes do not burn its points. Historical observations recovered later must identify their source and capture date. Leave unsupported days blank.

## Produce and interpret the chart

Export the actual Jira burndown and retain its source/filter/date in the [evidence register](evidence/README.md). If producing a separate chart, use the verified table values, preserve gaps and annotate dated scope changes. Any ideal line should be labeled as a plan and use the agreed calendar/working-day convention. No actual burndown chart or trend is recorded yet.
