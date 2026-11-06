# Sprint 1 planning

On **6 September 2026**, the team chose its first two-week sprint and forecast **10 items / 32 SP**. It planned the request workflow from sign-in through a saved draft, submission, coordinator review and the organiser’s view of the outcome. The team needed shared request fields, database foundations and a clear access policy before the separate screens could work together. [Planning cues 01–07, 15–28 and 43–48](evidence/meetings/planning.docx)

<a id="team-input-needed"></a>

## Meeting record

| Field | Record |
| --- | --- |
| Date, time and place | 6 September, approximately 22:35–23:58 on Zoom. The PDF describes two calls because of the 40-minute limit. [Meeting notes, p. 2](evidence/documentation-tasks-20261105.pdf) |
| Participants | Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan. Both planning sources identify all six. |
| Responsibilities | Arvin facilitated. Irfan represented product priorities and also took development work. Ernest recorded decisions, and Tristan operated the shared worksheet. [Planning preparation table and cues 01–07](evidence/meetings/planning.docx) |
| Scrum roles | The team’s formal record names Arvin as Scrum Master and Irfan as Product Owner. The separate description of Irfan in the planning notes is addressed below. |
| Cadence | Two-week sprints gave the team time to connect the pieces. This sprint ran 6–19 September, with review and retrospective on the 19th and next planning on the 20th. The team planned two standups per week for Sprint 1. [Planning cues 02–07, 48 and 61](evidence/meetings/planning.docx) |

## Sprint goal

Enable an organiser to create, save and submit a request securely, and a coordinator to review it and reach an outcome. The notes say Ryan drafted an early goal around creation and saving. In the meeting account, Irfan described the full journey and Arvin restated it for the team. Tristan identified an improvement for next time: set the goal before dividing up pages. [PDF, p. 4](evidence/documentation-tasks-20261105.pdf) · [Planning cues 04–07 and 59](evidence/meetings/planning.docx)

## Scope and selection

| Member | Volunteered work | SP |
| --- | --- | ---: |
| Arvin | KAN-24 shared database and integration foundations (5) | 5 |
| Ernest | KAN-31 create request (3) and KAN-4 save incomplete draft (3) | 6 |
| Irfan | KAN-33 coordinator request view (2) and KAN-27 clarification (3) | 5 |
| Kai Jie | KAN-34 edit draft (3) and KAN-6 submit request (3) | 6 |
| Ryan | KAN-25 authentication and authorisation (5) | 5 |
| Tristan | KAN-36 approve/reject (3) and KAN-16 organiser status (2) | 5 |
| **Total** | **10 backlog items** | **32** |

Each person confirmed their bundle when Arvin checked the first forecast. The account calls for independent review; it leaves specific reviewer agreement until the pull request is ready. The backlog lists proposed review partners. [Planning cues 36–48 and 55–61](evidence/meetings/planning.docx) · [Committed backlog](sprint-backlog.md#committed-backlog)

## Supplied planning notes — 5 November 2026

**Role clarification supplied by Tristan on 6 November 2026.** Arvin was Scrum Master and facilitated Sprint 1 planning. Irfan was Product Owner, contributed as a developer and set up Jira. Tristan confirmed that the earlier note describing Irfan as “effectively taken as Scrum Master” was incorrect and that the meeting account governs the attribution. The original PDF is retained for its Zoom timing, provisional sizing discussion and other planning notes. [Original notes, p. 2](evidence/documentation-tasks-20261105.pdf) · [Planning account, role table and cues 1–7](evidence/meetings/planning.docx)

Page 3 records estimates discussed for a wider backlog, including submission at 2, draft saving at 5 and database setup at 8. The final scoped items were KAN-6 (3), KAN-4 (3) and KAN-24 (5). Page 4 describes an early Firebase-authentication choice; the daily account later records Supabase sign-in by 15 September. The exact timing of intervening estimate revisions is unspecified. [Estimate comparison](estimation-and-capacity.md#re-estimates-and-interpretation) · [Daily progress](daily-progress.md)

## Decisions and follow-up

| Decision | Consequence and owner |
| --- | --- |
| Keep create, draft save, edit and submit distinct | Ernest and Kai Jie would compare saved fields and the different validation rules. Conditional registration fields and required-at-submission behaviour remained open. [Cues 15–21 and 43–50](evidence/meetings/planning.docx) |
| Keep request review, clarification, decision and status separate | Irfan and Tristan would connect the same request across their views. Automatic assignment (KAN-29) stayed outside Sprint 1, while Ryan and Irfan needed to agree which coordinator could see each request. [Cues 22–25 and 39–40](evidence/meetings/planning.docx) |
| Size shared infrastructure once | Arvin owned database/integration setup. Each feature owner retained its own validation, tests and integration work. [Cues 26–28 and 41–43](evidence/meetings/planning.docx) |
| Decide acceptance at the review | Criteria, tests, review, integration and evidence informed the decision. Unfinished stories would carry at their full points. [Cues 49–54](evidence/meetings/planning.docx) |

## Delivery and dependencies

The intended sequence was database setup and common fields, then creation, saving, reopening and submission, followed by coordinator actions and status. Ryan could develop identity checks in parallel. Tristan proposed **17–18 September** for integration repairs and review preparation, while encouraging earlier connected checks. The first sprint had two standups a week; the retrospective would revise that cadence for Sprint 2. [Planning cues 43–48](evidence/meetings/planning.docx) · [Sprint 1 retrospective](retrospective.md)

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/planning.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="sprint-1-planning-and-meeting-record"></a>

[Sprint 1 planning and meeting record](archive/2026-11-05/planning.md#sprint-1-planning-and-meeting-record)

<a id="sprint-boundary-and-goal"></a>

[Sprint boundary and goal](archive/2026-11-05/planning.md#sprint-boundary-and-goal)

<a id="team-and-accountabilities"></a>

[Team and accountabilities](archive/2026-11-05/planning.md#team-and-accountabilities)

<a id="proposed-delivery-sequence"></a>

[Proposed delivery sequence](archive/2026-11-05/planning.md#proposed-delivery-sequence)

<a id="dependencies-and-open-decisions"></a>

[Dependencies and open decisions](archive/2026-11-05/planning.md#dependencies-and-open-decisions)

<a id="planning-decisions-and-follow-up"></a>

[Planning decisions and follow-up](archive/2026-11-05/planning.md#planning-decisions-and-follow-up)

<a id="working-agreement-to-adopt-or-revise"></a>

[Working agreement to adopt or revise](archive/2026-11-05/planning.md#working-agreement-to-adopt-or-revise)

<a id="closeout-and-sprint-2-handoff--recorded-21-september"></a>

[Closeout and Sprint 2 handoff — recorded 21 September](archive/2026-11-05/planning.md#closeout-and-sprint-2-handoff--recorded-21-september)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/planning.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--team-meeting-and-manual-result-reconciliation"></a>

[25 October 2026 — Team meeting and manual-result reconciliation](archive/2026-11-05/planning.md#25-october-2026--team-meeting-and-manual-result-reconciliation)

</details>
