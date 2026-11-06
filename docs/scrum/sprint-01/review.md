# Sprint 1 review and closure

On **19 September 2026**, all six members collectively accepted **seven of ten items / 24 of 32 SP**. Three incomplete stories carried into Sprint 2 at their full estimates. A saved draft held its values, but changing its registration setting and submitting it exposed gaps. Approval persisted through refresh, but a coordinator could not reliably find the approved request again. [Review account, cues 03–12 and 16–17](evidence/meetings/review.docx)

<a id="team-input-needed"></a>

## Review record

Arvin facilitated. Ernest, Irfan, Kai Jie, Ryan and Tristan presented or discussed their parts of the workflow. Ernest called for the criteria, applicable Definition of Done and evidence to be checked. Arvin asked for the decision and summarised the result. The written account leaves a pause for individual responses. The 25 October report confirms attendance, and the 26 October team confirmation records collective agreement on the 19 September outcome. The time, place, demonstrated build and exact historical DoD version are unavailable. [Review cues 01–17](evidence/meetings/review.docx) · [Evidence register](evidence/README.md)

## Manual checks reported at review

Ernest reported that all planned Sprint 1 manual cases ran and that the checks for the seven accepted items passed. Draft editing failed when a No-to-Yes registration change omitted capacity and registration dates. The coordinator-view check failed because an approved request could not be reopened through the supported navigation. For submission, Kai Jie distinguished a successful path and a validation check that caught missing information from two other reported problems: saved-draft submission was unavailable on one path, and some incomplete requests went through without errors. The team carried these three stories at full points. Ernest said the individual results and failure details still needed to be logged. The current written account gives these outcomes without a case-ID list or tested build. [Current Sprint 1 review, cues 04–11 and 15–17](evidence/meetings/current/review.docx) · [Review testing reports and source versions](../review-testing.md)

## Story decisions

| Story and owner | Review outcome | What the team reported |
| --- | --- | --- |
| [KAN-25](sprint-backlog.md#kan-25--authentication-and-authorization) · Authentication and authorisation (Ryan) | Accepted · 5 SP | Sign-in and access controls worked for the users and request actions demonstrated. Cue 03, DEMO-01/08. |
| [KAN-31](sprint-backlog.md#kan-31--start-a-new-event-request) · Create request (Ernest) | Accepted · 3 SP | Creation worked. The registration-edit defect applied to a later path. Cues 04–06. |
| [KAN-4](sprint-backlog.md#kan-4--save-incomplete-drafts) · Save incomplete draft (Ernest) | Accepted · 3 SP | Saved draft values persisted after reopening. Cues 04–06. |
| [KAN-27](sprint-backlog.md#kan-27--request-clarification) · Clarification (Irfan) | Accepted · 3 SP | Coordinator asked for clarification and the organiser’s response returned to the review flow. Cue 11, DEMO-10. |
| [KAN-36](sprint-backlog.md#kan-36--approve-or-reject-requests) · Approve or reject (Tristan) | Accepted · 3 SP | Demonstrated decisions stayed saved after refresh. Cue 08, DEMO-07/09. |
| [KAN-16](sprint-backlog.md#kan-16--view-event-request-status) · Organiser status (Tristan) | Accepted · 2 SP | Organiser could see the saved decision after refresh. Cue 08, DEMO-05/07. |
| [KAN-24](sprint-backlog.md#kan-24--database-and-integration-infrastructure) · Database/integration foundation (Arvin) | Accepted · 5 SP | Walkthrough covered saved requests and related records. Cue 12, DEMO-11. |
| [KAN-6](sprint-backlog.md#kan-6--submit-event-requests) · Submit request (Kai Jie) | Carried · 3 SP | One path worked, another saved-draft submission was reported unavailable, and incomplete data could get through without errors. Cues 07 and 16, S1-DEF-03/04. |
| [KAN-33](sprint-backlog.md#kan-33--view-submitted-requests) · Coordinator request view (Irfan) | Carried · 2 SP | The pending queue correctly excluded an approved request, but the coordinator lacked a clear route to reopen it. Cues 08–11 and 16, S1-DEF-02. |
| [KAN-34](sprint-backlog.md#kan-34--resume-and-edit-drafts) · Edit saved draft (Kai Jie) | Carried · 3 SP | Changing registration from No to Yes omitted capacity and registration-date fields. Cues 04–06 and 16, S1-DEF-01. |
| **10 items / 32 SP** | **24 accepted, 8 carried** | **19 accepted business-story SP + 5 infrastructure SP.** |

[Review account](evidence/meetings/review.docx) · [Story criteria and closure](sprint-backlog.md#closure-and-carry-over)

## Review feedback

| Ref. | Feedback and contributor | Agreed response or next step |
| --- | --- | --- |
| S1-FB-01 | Kai Jie identified the registration toggle and two submission failures. Ernest offered to check the shared form. Irfan and Tristan distinguished expected removal from the pending queue from the missing way back to an approved request. | Preserve the separate paths and carry KAN-34/6 with Kai Jie and KAN-33 with Irfan. Reproduce the saved and incomplete-draft cases independently. [Cues 04–11 and 16](evidence/meetings/review.docx) |
| S1-FB-02 | Ryan specified Event Coordinators, Venue Staff and Technical Support as calendar users. | Take their access into KAN-51. The level of booking detail visible to each role still needed clarification. [Cue 13](evidence/meetings/review.docx) |
| S1-FB-03 | Irfan proposed adding automatic assignment to Sprint 2 while keeping manual selection available. | Take KAN-29 into planning and clarify coordinator availability, selection rules and the no-eligible-candidate case. Later Lead assignment is a dated change to this original policy. [Cue 14](evidence/meetings/review.docx) · [Change register](../../requirements/change-requests.md) |
| S1-FB-04 | The retained review/planning record called for balancing new work across six developers. | On 20 September the team forecast nine new stories / 35 SP plus the eight carried points. [Sprint 2 planning](../sprint-02/planning.md) |
| S1-FB-05 | The handover record identified integration and meeting documentation as follow-ups for Tristan. | PR #12 integrated the active branches on 20 September. The earlier record dates the documentation preparation to 21 September. [Retained feedback register](archive/2026-11-05/review.md) |

The review account contains team feedback. Its open invitation for other observations does not identify an additional respondent or external stakeholder. [Cue 15](evidence/meetings/review.docx)

## Closure evidence

The review and collective confirmation establish the seven accepted and three carried items. The [Sprint 1 checkpoint table and release chart](../ws4-evidence/board-history.md#sprint-1) distinguish eight carried sprint points from 103 remaining release points. Original board images and the original demonstrated build are unavailable in the sprint materials. [Evidence register](evidence/README.md)

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/review.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="current-acceptance-and-closure--26-october-2026"></a>

[Current acceptance and closure — 26 October 2026](archive/2026-11-05/review.md#current-acceptance-and-closure--26-october-2026)

<a id="retained-per-story-closure-outcome"></a>

[Retained per-story closure outcome](archive/2026-11-05/review.md#retained-per-story-closure-outcome)

<a id="closure-completion-checklist"></a>

[Closure completion checklist](archive/2026-11-05/review.md#closure-completion-checklist)

<a id="retained-earlier-review-records"></a>

[Retained earlier review records](archive/2026-11-05/review.md#retained-earlier-review-records)

<a id="purpose-and-agenda"></a>

[Purpose and agenda](archive/2026-11-05/review.md#purpose-and-agenda)

<a id="demo-preparation"></a>

[Demo preparation](archive/2026-11-05/review.md#demo-preparation)

<a id="demo-run-sheet"></a>

[Demo run sheet](archive/2026-11-05/review.md#demo-run-sheet)

<a id="review-defects-and-carry-over"></a>

[Review defects and carry-over](archive/2026-11-05/review.md#review-defects-and-carry-over)

<a id="inspect-the-sprint-outcome"></a>

[Inspect the sprint outcome](archive/2026-11-05/review.md#inspect-the-sprint-outcome)

<a id="stakeholder-feedback-and-backlog-decisions"></a>

[Stakeholder feedback and backlog decisions](archive/2026-11-05/review.md#stakeholder-feedback-and-backlog-decisions)

<a id="closure-checklist"></a>

[Closure checklist](archive/2026-11-05/review.md#closure-checklist)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/review.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--reported-original-story-manual-results"></a>

[25 October 2026 — reported original-story manual results](archive/2026-11-05/review.md#25-october-2026--reported-original-story-manual-results)

<a id="25-october-2026--ryan-story-verification-records"></a>

[25 October 2026 — Ryan story verification records](archive/2026-11-05/review.md#25-october-2026--ryan-story-verification-records)

<a id="25-october-2026--team-meeting-and-manual-result-reconciliation"></a>

[25 October 2026 — Team meeting and manual-result reconciliation](archive/2026-11-05/review.md#25-october-2026--team-meeting-and-manual-result-reconciliation)

</details>
