# Sprint 1 daily progress and burndown

**Record check — 15 October 2026:** the dated observations below are preserved. Missing standup participation and daily burndown values are **Not recorded**; they have not been reconstructed from today's Jira state. Later repairs to the four review findings are linked from the [Sprint 2 review register](../sprint-02/review.md#baseline-and-later-delivery-register--15-october-2026).

Sprint: **6–19 September 2026, Asia/Singapore**. Record daily progress, decisions and burndown observations here, with supporting Jira exports and screenshots in the [evidence register](evidence/README.md). Blank values are awaiting an observation; they do not represent zero.

**Closeout update, prepared 21 September:** the Sprint 1 review is complete, Sprint 1 is closed in Jira and Sprint 2 is initialized. The dated development log and missing daily observations below are preserved. The later review summary is recorded separately; it does not establish attendance, daily Done points or an end-of-day burndown observation.

## Cadence

The original Sprint 1 plan was **two standups per week**; actual days, times and location remain to be recorded. Development working days and hours remain unrecorded. Members are available on Saturdays and Sundays for review and planning. Sprint 2's agreed cadence is **three Daily Scrums per week, on Saturday, Tuesday and Thursday**. Neither plan establishes attendance on a particular date.

Record actual standup participants and outcomes when each meeting occurs. Development updates may be recorded between meetings without implying a standup took place. Mark agreed non-working days as `Non-working day`; leave missing observations blank.

## Daily log

| Date | Day | Actual participants or non-working-day note | Progress toward sprint goal and Jira/PR links | Impediment and adaptation | Evidence ID |
| --- | --- | --- | --- | --- | --- |
| 6 September | Sunday | Not recorded | | | |
| 7 September | Monday | Not recorded | Scaffold commit `db6930d` recorded at 02:58:37 +08:00 | Assess remaining KAN-24 work and business stories against their acceptance criteria | E17 |
| 8 September | Tuesday | Not recorded | Supabase selected for hosted PostgreSQL; [technical decision](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) recorded | Arvin to verify hosted setup and coordinate migrations; KAN-25 authentication approach remains to be agreed. Commitment remains 32 points. | E09 |
| 9 September | Wednesday | Not recorded | | | |
| 10 September | Thursday | Not recorded | | | |
| 11 September | Friday | Not recorded | KAN-36 review-decision backend and decision panel implemented (`7313a01`–`29493ea`); KAN-33 submitted-requests view implemented by Irfan (`b054056`); shared `GET /api/events/:id` detail contract proposed and implemented across KAN-33/KAN-34/KAN-16 (`27ba591`, `e7d6954`, `63d231b`); bundled and merged as PR #1 (`28e718f`). See the [11 September decision records](../../requirements/assumptions-and-questions.md#11-september-2026--kan-33-review-queuedetail-scope). | KAN-29/Q-02 (coordinator assignment/visibility) remains unresolved, so `submitted-requests.ts` still requires an externally supplied visibility policy and the production router mounts none; `ReviewRequestPage.vue` still hardcodes `can-review="true"` pending KAN-25. | |
| 12 September | Saturday | Not recorded | | | |
| 13 September | Sunday | Not recorded | KAN-34 resume/edit-draft backend implemented and merged as PR #2 (`acf760b`); KAN-6 submit-event-request backend implemented with TDD and merged as PR #3 (`cbec28d`); provisional submission-completeness rule recorded (Q-03 still open) — see the [13 September decision record](../../requirements/assumptions-and-questions.md#13-september-2026--kan-6-submission-completeness-rule-q-03-still-open). | KAN-31 (new-request form) and live authentication (KAN-25) remain pending, so KAN-6/KAN-34 have no browser-level coverage yet; the new PostgreSQL integration tests (`submit-request.integration.test.ts`, `update-draft.integration.test.ts`) were written but not executed in this environment (no Docker/`TEST_DATABASE_URL`) — see [traceability.csv](../../requirements/traceability.csv). | |
| 14 September | Monday | Not recorded | | | |
| 15 September | Tuesday | Tristan (development update) | Supabase authentication and assigned-coordinator access connected (`8334f94`); coordinator decision permissions, outcomes and refresh connected (`c14eaf4`). Login worked; approving a synthetic request on the webpage changed Supabase status from `SUBMITTED` to `APPROVED`. | Finish hosted review/rejection/access checks and KAN-16 organiser list/status UI plus an all-status organiser list API. | E10, E11; [test runs and manual scope](../../testing/test-evidence.md) |
| 16 September | Wednesday | Tristan (development update) | Approval and rejection persisted with the correct reviewer and supplied reason; outcomes remained after reload and both requests left the queue. Direct approval attempts were denied for an organiser (`403 REVIEW_FORBIDDEN`), an unassigned coordinator (`404 EVENT_REQUEST_NOT_FOUND`) and an assigned coordinator on a draft (`409 REQUEST_NOT_REVIEWABLE`), without changing the requests or review records. | Continue KAN-16 organiser list/status implementation and outcome acceptance; remaining hosted checks are recorded in the test register. | E11; [MAN-20260916-01/02/03/04/05](../../testing/test-evidence.md) |
| 17 September | Thursday | Tristan (development update) | Implemented KAN-16 owned-request API (`96188b5`), status list (`2261a8b`) and read-only detail (`95cd43e`). Manually verified approval/rejection after refresh, Draft/Submitted detail messages after refresh, matching Draft/Submitted/Rejected/Approved list labels, signed-out list/detail protection and second-organiser list/detail isolation. Fixed a later review-navigation defect that displayed an organiser's own draft in the coordinator queue; review pages now require a coordinator session and clear stale content on session changes. Component and browser regressions passed. | Recheck the review-access fix with hosted accounts, then publish for peer review and CI. The final submission-to-status check awaits KAN-6 frontend integration; run it once connected. Stories remain in progress. | E11; [AUTO-20260917-01/02/03/04/05/06/07/08; MAN-20260917-01/02/03/04/05/06/07](../../testing/test-evidence.md) |
| 18 September | Friday | Tristan (development update) | Rechecked the coordinator-page fix (`b2f0c2d`) as the organiser: Review queue was absent after reload and direct `/reviews` navigation showed `Coordinator access only`. Recorded the passed manual recheck. | Publish the fix and evidence for peer review and CI. The final submission-to-status check still awaits KAN-6 frontend integration. | E11; [MAN-20260918-01](../../testing/test-evidence.md) |
| 19 September | Saturday | Not recorded | **Added 21 October 2026 from git history (Ernest):** `25e7c91` created the new-request page and the create-event/draft API for KAN-31 and KAN-4 (23:35 Singapore time per the commit), and `93e221c` installed dependencies (setup chore). Merged into `main` by Tristan's [PR #12](https://github.com/MochaLxtte/ConnectSphere/pull/12) on 20 September; the backend router and repository were later removed in that PR as superseded. See the [backfill](../../testing/test-evidence.md#21-october-2026--documentation-backfill-kan-51-kan-31-and-kan-4). Who attended any standup that day remains Not recorded. | | |

For decisions needing more context, append a dated note with the meeting time and attendees, affected story, issue, options discussed, decision, owner and follow-up date. If notes are completed later, record the event date and the date the notes were prepared.

## Technical decision — 8 September

Supabase will host the development PostgreSQL database. Express continues to use PostgreSQL directly through the driver; the Vue application uses Express for business data. The [decision record](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) sets out connection security, project settings, shared migration coordination and isolated testing.

KAN-24 retains its 5-point estimate, and the sprint retains its original ten PBIs and 32 points. No item is marked Done by this decision. Supabase Auth had not yet been selected on 8 September; the 15 September implementation uses Supabase Auth. Participants and meeting time for the hosting decision are to be recorded; this entry does not establish Daily Scrum attendance.

## Impediments and adaptations

| ID | Raised on | Observed blocker and affected stories | Impact on goal | Action/assistance needed | Owner | Follow-up date | Resolved on and evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1-DEF-01 | Sprint review; summary recorded 21 September | Registration changed from no to yes in a draft without capacity/date fields appearing; KAN-34 | Draft cannot be completed reliably for registration | Reproduce the saved-draft edit path and verify field visibility/persistence | Sprint 2 owner to select | To agree | Open; [review defects](review.md#review-defects-and-carry-over) |
| S1-DEF-02 | Sprint review; summary recorded 21 September | Approved request disappeared from the coordinator view; KAN-33 | Later final confirmation is inaccessible through that view | Restore a discoverable route to eligible approved requests and verify access | Sprint 2 owner to select | To agree | Open; [review defects](review.md#review-defects-and-carry-over) |
| S1-DEF-03 | Sprint review; summary recorded 21 September | Submitting a saved draft reported as not implemented; KAN-6 | Saved requests may not reach review | Reconcile the reported path with the successful submission demonstrations, then fix and retest | Sprint 2 owner to select | To agree | Open; exact reproduction pending |
| S1-DEF-04 | Sprint review; summary recorded 21 September | Some submissions with missing required fields were accepted; KAN-6 | Incomplete data may enter the review workflow | Identify missing fields and affected paths; agree and test submission validation | Sprint 2 owner to select | To agree | Open; exact reproduction pending |

Add impediments as they arise, linking each one to the affected work and its resolution.

## Scope change log

Record agreed scope changes with their reasons and participants, retaining the original baseline.

| Change ID/date | Added/removed/changed item | Old scope or estimate | New scope or estimate | Why and impact on goal | Participants in decision | Point effect and evidence |
| --- | --- | --- | --- | --- | --- | --- |
| S1-CLOSE-01; recorded 21 September, exact decision time pending | KAN-6, KAN-33 and KAN-34 carry to Sprint 2 | Sprint 1 commitment: 3 + 2 + 3 = 8 original SP | Unfinished work carried forward at the same 8 points in Sprint 2's 43-point baseline | Resolve the review defects in submission, draft editing and coordinator access | Not recorded | Preserve Sprint 1's 10-PBI/32-SP baseline and count no partial Done points. This closeout disposition is not an observed mid-sprint removal or a daily burndown drop. Closing Jira export pending. |

Keep accepted estimates stable during the sprint. If the team agrees an estimate revision for an unfinished PBI, retain both values, the signed difference (`new − old`) and the reason. Record this difference separately from added or removed items, so it is counted once. Do not resize completed work. Apply the convention in [estimation and capacity](estimation-and-capacity.md): KAN-24 has its own 5-point estimate, and supporting subtasks add no points.

## Review and handoff summary — prepared 21 September

The review and retrospective took place on 19 September; meeting times and attendance are not recorded. Sprint 2 planning took place on 20 September. DEMO-01, DEMO-03, DEMO-04, DEMO-05, DEMO-07, DEMO-08, DEMO-09, DEMO-10 and DEMO-11 passed. DEMO-02 exposed the draft registration-field issue and DEMO-06 exposed the approved-request navigation issue. Saved-draft submission and required-field validation were also raised as problems. Successful DEMO-04/05 observations remain recorded alongside those reports until their exact paths and data are reproduced. See [MAN-S1-REVIEW-01](../../testing/test-evidence.md) and the [review](review.md).

Tristan merged all team branches into `main`. Sprint 1 has been closed in Jira and Sprint 2 initialized with KAN-6, KAN-33 and KAN-34 carried over at 8 points. KAN-25, KAN-31, KAN-4, KAN-27, KAN-36, KAN-16 and KAN-24 are Done: **24 points at closure**, including 5 infrastructure points. The original commitment reconciles as **32 = 24 Done + 8 carried forward**. The [Jira audit](../../requirements/assumptions-and-questions.md#21-september-2026--jira-backlog-audit) records resolution updates on 20–21 September. Individual acceptance times and the 19 September daily snapshot remain unrecorded. The review findings do not replace earlier dated passing checks; they add scenarios and gaps to follow up.

Sprint 2 focuses on the venue catalogue, venue calendar and coordinator assignment. The agreed baseline is **43 points: 35 points across nine new stories plus 8 carryover points**. New-story owners remain unassigned; Kai Jie retains KAN-6/KAN-34 and Irfan retains KAN-33. Tristan is responsible for the retrospective writeup. The planned sprint runs 20 September–3 October, with review on Saturday 3 October and Sprint 3 planning/start on Sunday 4 October. Daily Scrums will be held on Saturday, Tuesday and Thursday; exact times remain to record.

## Burndown data

The team committed to **B = 32 points** at Sprint Planning on **6 September 2026**: **27 points across nine user stories + 5 points for KAN-24**. Use this combined PBI baseline for the burndown and report the 27/5 split at review. Supporting subtasks add no points. The original backlog snapshot still needs to be attached; daily observations are recorded below as they become available.

At each chosen observation time:

- Record added items at their accepted estimate and removed **unfinished** items at their latest agreed estimate, cumulatively from the baseline.
- Record agreed estimate changes separately as the cumulative signed difference, including any earlier revision to an item later removed. A revision is not also an added or removed item.
- Record the cumulative points of items meeting the adopted Definition of Done, using the latest agreed estimate before completion. Do not award partial points.
- Remaining scope is `B + cumulative added points − cumulative removed unfinished points + cumulative net estimate changes − cumulative Done points`. Keep completed scope in the history; disclose any corrections/reopened items and reconcile their effect.
- Reconcile the result with the board. A scope reduction can lower the remaining line without delivering work, so the scope-change log must accompany the chart.

The table uses the planning baseline and end-of-day observations. Agree a consistent snapshot time and link each entry to the board or export. Leave missing observations blank.

**Closeout evidence gap:** actual daily burndown values and the closing chart are not available. The confirmed closure outcome of 24 Done points and 8 carried forward does not establish the 19 September remaining-work value or earlier daily progress. Recover data from dated Jira history if available, retaining the actual export time and any gaps.

| Observation | Cumulative points added | Cumulative unfinished points removed | Cumulative net estimate changes | Cumulative Done points | Remaining points | Board/export evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Planning scope, 6 September | Not recorded | Not recorded | Not recorded | Not recorded | Baseline scope 32; remaining-work snapshot pending | Planning commitment; original board snapshot to attach |
| End of 6 September | | | | | | |
| End of 7 September | | | | | | |
| End of 8 September | | | | | | |
| End of 9 September | | | | | | |
| End of 10 September | | | | | | |
| End of 11 September | | | | | | |
| End of 12 September | | | | | | |
| End of 13 September | | | | | | |
| End of 14 September | | | | | | |
| End of 15 September | | | | | | |
| End of 16 September | | | | | | |
| End of 17 September | | | | | | |
| End of 18 September | | | | | | |
| End of 19 September | | | | | | |

## Produce and interpret the chart

Export the Jira burndown, or plot the observed dates against remaining points in a spreadsheet. Label units, sprint dates, baseline and scope changes. Save the final chart image/PDF and its underlying data in the evidence register.

An optional ideal line can be labelled **planning guide** once the working-day calendar is agreed. For `N` planned working days and `k` elapsed working days, use `B × (1 − k/N)` and leave non-working days flat. If using calendar days instead, state that basis on the chart. Keep the guide distinct from observed progress.

At review, explain significant flat periods, drops and scope changes using the impediment and decision records. Record the [completed points and unfinished work](review.md), then use the result to inform Sprint 2 planning.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

**KAN-24 — infrastructure, Arvin, 5 SP.** [PR #10](https://github.com/MochaLxtte/ConnectSphere/pull/10) merged on **20 September 22:43 Singapore time**, after Sprint 1’s planned 19 September end. It supplied first-release database/schema, ERD and persistence work, but also introduced business workflows beyond the infrastructure story. Arvin subsequently removed uncommitted future-scope application features in [PR #19](https://github.com/MochaLxtte/ConnectSphere/pull/19), merged **26 September 18:54**; database migration history and required shared dependencies remained. The removed workflows are not delivery credit for KAN-24 or for other members’ stories. Initial scaffolding authored by Mochs is not attributed to Arvin.

The retained Jira Done entry and the original closure totals do not establish that this 20 September merge met the Definition of Done by 19 September. PR #10 was self-merged; neither #10 nor #19 has a submitted human review in the GitHub readback. PR-reported tests are historical reported results, not newly executed manual checks. Preserve `KAN-24-AC1`–`AC4`, `TC-DB-201`–`205` and `S1-T31`–`S1-T33`; reproducible setup, hosted security configuration and diagram verification must retain their existing evidence limits. No additional Done SP or revised velocity is asserted.

See the [evidence index](evidence/README.md) and [master contribution register](../../requirements/product-backlog.md).
