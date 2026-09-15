# Sprint 1 daily progress and burndown

Sprint: **6–19 September 2026, Asia/Singapore**. Record daily progress, decisions and burndown observations here, with supporting Jira exports and screenshots in the [evidence register](evidence/README.md). Blank values are awaiting an observation; they do not represent zero.

## Cadence

The team plans **two standups per week**; exact days, times and location remain to be recorded. Development working days and hours remain to be confirmed. Members are available on Saturdays and Sundays for review and planning. This meeting cadence does not establish attendance on any date.

Record actual standup participants and outcomes when each meeting occurs. Development updates may be recorded between meetings without implying a standup took place. Mark agreed non-working days as `Non-working day`; leave missing observations blank.

## Daily log

| Date | Day | Actual participants or non-working-day note | Progress toward sprint goal and Jira/PR links | Impediment and adaptation | Evidence ID |
| --- | --- | --- | --- | --- | --- |
| 6 September | Sunday | Not recorded | | | |
| 7 September | Monday | Not recorded | Scaffold commit `db6930d` recorded at 02:58:37 +08:00 | Assess remaining KAN-24 work and business stories against their acceptance criteria | E17 |
| 8 September | Tuesday | Not recorded | Supabase selected for hosted PostgreSQL; [technical decision](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) recorded | Arvin to verify hosted setup and coordinate migrations; KAN-25 authentication approach remains to be agreed. Commitment remains 32 points. | E09 |
| 9 September | Wednesday | Not recorded | | | |
| 10 September | Thursday | Not recorded | | | |
| 11 September | Friday | Not recorded | | | |
| 12 September | Saturday | Not recorded | | | |
| 13 September | Sunday | Not recorded | | | |
| 14 September | Monday | Not recorded | | | |
| 15 September | Tuesday | Tristan (development update) | Supabase authentication and assigned-coordinator access connected (`8334f94`); coordinator decision permissions, outcomes and refresh connected (`c14eaf4`). Login worked; approving a synthetic request on the webpage changed Supabase status from `SUBMITTED` to `APPROVED`. | Finish hosted review/rejection/access checks and KAN-16 organiser list/status UI plus an all-status organiser list API. | E10, E11; [test runs and manual scope](../../testing/test-evidence.md) |
| 16 September | Wednesday | Tristan (development update) | Approval and rejection persisted with the correct reviewer and supplied reason; outcomes remained after reload and both requests left the queue. Direct approval attempts were denied for an organiser (`403 REVIEW_FORBIDDEN`) and a coordinator on an unassigned request (`404 EVENT_REQUEST_NOT_FOUND`), without changing either request or its review records. | Finish remaining hosted access/state checks and continue KAN-16 organiser status work. | E11; [MAN-20260916-01/02/03/04](../../testing/test-evidence.md) |
| 17 September | Thursday | Not recorded | | | |
| 18 September | Friday | Not recorded | | | |
| 19 September | Saturday | Not recorded | | | |

For decisions needing more context, append a dated note with the meeting time and attendees, affected story, issue, options discussed, decision, owner and follow-up date. If notes are completed later, record the event date and the date the notes were prepared.

## Technical decision — 8 September

Supabase will host the development PostgreSQL database. Express continues to use PostgreSQL directly through the driver; the Vue application uses Express for business data. The [decision record](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) sets out connection security, project settings, shared migration coordination and isolated testing.

KAN-24 retains its 5-point estimate, and the sprint retains its original ten PBIs and 32 points. No item is marked Done by this decision. Supabase Auth had not yet been selected on 8 September; the 15 September implementation uses Supabase Auth. Participants and meeting time for the hosting decision are to be recorded; this entry does not establish Daily Scrum attendance.

## Impediments and adaptations

| ID | Raised on | Observed blocker and affected stories | Impact on goal | Action/assistance needed | Owner | Follow-up date | Resolved on and evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| To assign when raised | | | | | | | |

Add impediments as they arise, linking each one to the affected work and its resolution.

## Scope change log

Record agreed scope changes with their reasons and participants, retaining the original baseline.

| Change ID/date | Added/removed/changed item | Old scope or estimate | New scope or estimate | Why and impact on goal | Participants in decision | Point effect and evidence |
| --- | --- | --- | --- | --- | --- | --- |
| To record if a change occurs | | | | | | |

Keep accepted estimates stable during the sprint. If the team agrees an estimate revision for an unfinished PBI, retain both values, the signed difference (`new − old`) and the reason. Record this difference separately from added or removed items, so it is counted once. Do not resize completed work. Apply the convention in [estimation and capacity](estimation-and-capacity.md): KAN-24 has its own 5-point estimate, and supporting subtasks add no points.

## Burndown data

The team committed to **B = 32 points** at Sprint Planning on **6 September 2026**: **27 points across nine user stories + 5 points for KAN-24**. Use this combined PBI baseline for the burndown and report the 27/5 split at review. Supporting subtasks add no points. The original backlog snapshot still needs to be attached; daily observations are recorded below as they become available.

At each chosen observation time:

- Record added items at their accepted estimate and removed **unfinished** items at their latest agreed estimate, cumulatively from the baseline.
- Record agreed estimate changes separately as the cumulative signed difference, including any earlier revision to an item later removed. A revision is not also an added or removed item.
- Record the cumulative points of items meeting the adopted Definition of Done, using the latest agreed estimate before completion. Do not award partial points.
- Remaining scope is `B + cumulative added points − cumulative removed unfinished points + cumulative net estimate changes − cumulative Done points`. Keep completed scope in the history; disclose any corrections/reopened items and reconcile their effect.
- Reconcile the result with the board. A scope reduction can lower the remaining line without delivering work, so the scope-change log must accompany the chart.

The table uses the planning baseline and end-of-day observations. Agree a consistent snapshot time and link each entry to the board or export. Leave missing observations blank.

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
