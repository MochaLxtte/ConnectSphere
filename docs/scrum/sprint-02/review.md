# Sprint 2 review and closure

The six members reviewed the 43-SP forecast on **3 October 2026**. They accepted **seven stories / 24 SP**, including the coordinator request-view repair, and carried **five stories / 19 SP** at their full estimates. Their account states the handoff to Sprint 3 planning on 4 October. The joint decision was confirmed on 26 October. [Review account, cues 2–13](evidence/meetings/review.docx)

<a id="team-input-needed"></a>

## Review record

| Field | Record |
| --- | --- |
| Decision date | 3 October 2026. Clock time and place unrecorded. |
| Attendees and collective acceptors | Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan. The 25 October report confirmed meeting attendance and the 26 October report confirmed collective acceptance. |
| Method | Arvin facilitated, Irfan restated original scope, and the owners presented accepted work and gaps. Ernest called for checks against the ACs and applicable DoD. Irfan invited feedback. Arvin recorded seven accepted and five carried, totalling 43 SP. |
| Build and evidence | Exact reviewed build and original demonstration captures were not retained. Historical build-specific DoD compliance remains unassessed. Later reported manual scenarios and later repairs retain their own dates in the table below. |
| Sources | [Review account, cues 1–13](evidence/meetings/review.docx) · [26 October confirmation and earlier records](evidence/README.md#current-acceptance-and-closure--26-october-2026) |

## Manual checks reported at review

At the 3 October review, Ernest reported that all **original Sprint 2 manual scenarios** ran and passed, and that the test log still needed updating. Five stories retained unfinished criteria: search filters and availability, catalogue updates, suitability, submission and draft editing. Their passing main paths did not complete those criteria, so all five carried at their full 19 points. The account identifies the scope and outcome of the manual checks collectively; it gives no complete roster of case IDs or tested build. [Current Sprint 2 review, cues 07–13](evidence/meetings/current/review.docx) · [Review testing reports and source versions](../review-testing.md)

## Story decisions

Review cues 3–6 identify accepted assignment, booking decision, calendar, request, block and conflict work. Cue 8 identifies the accepted coordinator-view repair. Cues 7–10 explain each full-point carry. [Meeting account](evidence/meetings/review.docx)

Original criterion links below point to the retained Sprint 2 cards. Later numbered refinements, Week 7 customer changes and revised Sprint 3 implementations remain separately dated; this summary does not apply the 25 October DoD amendment retrospectively to the 3 October review. Work required only by a later customer change does not revoke original-scope acceptance: **KAN-29 remains accepted** despite its later replacement by CR-5/KAN-79. New CR-1 buffer and CR-4 hold requirements are recorded in their own stories. The retained five-story carry-over was classified as original-work completion or policy/validation repair, not customer-change-only work; see the [change classification](../../requirements/change-requests.md) and [earlier severity assessment](#severity-and-acceptance-interpretation).

| Story / original SP | Original criteria / acceptance group | Latest supplied original-scope manual report | Recorded acceptance / carry-over |
| --- | --- | --- | --- |
| KAN-29 / 3 | [Automatic assignment](sprint-backlog.md#kan-29--automatically-assign-event-coordinator); S2-T01/T02 | [Tristan report, S2-E34](evidence/README.md#25-october-2026--reported-original-story-manual-results): reported Pass on 3 October; original automatic allocation only | **Accepted 3 October, 3 SP**; CR-5's later replacement does not revoke this original acceptance |
| KAN-50 / 5 | [Catalogue](sprint-backlog.md#kan-50--maintain-venue-catalogue); S2-T03/T04 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): original catalogue manual scenarios reported Pass on 3 October | Selected carry-over, 5 SP; later stale-save repair and its Sprint 3 verification remain separate |
| KAN-51 / 5 | [Calendar](sprint-backlog.md#kan-51--view-venue-availability-calendar); S2-T05/T06 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): original calendar manual scenarios reported Pass on 3 October; [Arvin contribution evidence](evidence/README.md#25-october-2026--arvin-contribution-reconciliation-sprints-13) retains later dated changes | **Accepted 3 October, 5 SP**; later buffer/hold requirements remain separate |
| KAN-12 / 5 | [Search/filter](sprint-backlog.md#kan-12--search-and-filter-venues); S2-T07/T08 | [Ryan report, S2-E33](evidence/README.md#25-october-2026--ryan-story-verification-records): six original scenarios reported Pass on 3 October | Selected carry-over, 5 SP; later search refinements and fixes remain Sprint 3 evidence |
| KAN-52 / 3 | [Suitability](sprint-backlog.md#kan-52--check-venue-suitability); S2-T09/T10 | [Tristan report, S2-E34](evidence/README.md#25-october-2026--reported-original-story-manual-results): original suitability scenarios reported Pass on 3 October | **Carry-over, 3 SP; 0 delivered in Sprint 2.** Zero-attendance handling was an original-policy clarification and evidence gap, not a demonstrated direct failure of the over-capacity criterion. Retain the prior carry decision; Ernest's revised version remains Sprint 3 work. |
| KAN-53 / 3 | [Booking submission](sprint-backlog.md#kan-53--submit-venue-booking-request); S2-T11/T12 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): original manual scenarios reported Pass on 3 October | **Accepted 3 October, 3 SP** |
| KAN-8 / 3 | [Booking decision](sprint-backlog.md#kan-8--approve-or-reject-venue-booking-request); S2-T13/T14 | [Tristan report, S2-E34](evidence/README.md#25-october-2026--reported-original-story-manual-results): original decision scenarios reported Pass on 3 October | **Accepted 3 October, 3 SP** |
| KAN-54 / 5 | [Conflicts](sprint-backlog.md#kan-54--detect-venue-booking-conflicts); S2-T15/T16 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): original manual scenarios reported Pass on 3 October; deterministic concurrency evidence remains automated | **Accepted 3 October, 5 SP** |
| KAN-55 / 3 | [Operational unavailability](sprint-backlog.md#kan-55--block-venue-for-operational-unavailability); S2-T17/T18 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): original manual scenarios reported Pass on 3 October | **Accepted 3 October, 3 SP**; CR-2's later outage-over-booking requirement remains separate |
| KAN-6 / 3 carried | [Retained submission criteria/repair](sprint-backlog.md#carry-over-repair-criteria-and-tasks); S2-T21/T22 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): manual scenarios reported Pass on 3 October | Selected carry-over, 3 SP; subsequent submission feedback/validation fixes remain dated separately |
| KAN-33 / 2 carried | [Retained coordinator-view repair](sprint-backlog.md#carry-over-repair-criteria-and-tasks); S2-T20 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): original manual scenarios reported Pass on 3 October | **Accepted 3 October, 2 SP** |
| KAN-34 / 3 carried | [Retained draft-edit repair](sprint-backlog.md#carry-over-repair-criteria-and-tasks); S2-T19 | [Team report, S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports): manual scenarios reported Pass on 3 October | Selected carry-over, 3 SP; subsequent strict date/boundary fixes remain dated separately |

The team report supplies **52 manual Pass records**, alongside the separate Tristan and Ryan reports. Their actual report date is 25 October; exact historical builds, detailed observations and captures remain **Not recorded**. Later [closeout repair verification and reported retest](../../testing/test-evidence.md#25-october-2026--closeout-retest-confirmation) resolve current repair follow-ups, but do not turn those fixes into 3 October delivery or remove the five-story carry-over. Current acceptance permits a complete local application; a deployed website is not a remaining prerequisite.

## Review feedback

| Contributor / cue | Issue raised | Decision and next destination |
| --- | --- | --- |
| Ryan · 7 | KAN-12’s main path existed, but filters and agreement with shared availability still needed checks. | Carry the full 5 SP. Ryan brought catalogue continuation and search gaps to the 6 October standup. |
| Irfan · 8 | KAN-50 catalogue saves and updates on dependent screens were unfinished. KAN-33 could reopen decided requests. | Carry KAN-50 at 5 SP. Accept KAN-33 at 2 SP. |
| Tristan · 9 | KAN-52 needed further comparison against the suitability requirements. | Carry the full 3 SP. Ernest later included suitability failure paths on the Sprint 3 acceptance checklist. |
| Kai Jie · 10 | KAN-6 submission and KAN-34 draft editing still needed completion. | Carry both at 3 SP each. Kai Jie took their cases to 4 October planning and handed them to Arvin and Ernest. |
| Ernest, Irfan and Arvin · 11–13 | Compare the seven candidates with their original criteria/DoD, invite additional feedback and make a clear disposition. | Arvin recorded the 24/19 split for 4 October planning. Further feedback from the pause in cue 12 is unrecorded. |

[Review account, cues 7–13](evidence/meetings/review.docx) · [Sprint 3 standup, 6 October cues 3–5](../sprint-03/evidence/meetings/daily.docx)

## Closure evidence

The [evidence index](evidence/README.md) contains the four supplied written accounts and the dated manual and automated reports. The [burndown](../ws4-evidence/board-history.md) records the 43-SP forecast and 19 SP outstanding at review. No original end-board capture or original reviewed build was retained. The 2 October customer changes went forward to Sprint 3. Sprint 2 accepted work is evaluated against its original scope.

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/review.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="current-acceptance-and-closure--26-october-2026"></a>

[Current acceptance and closure — 26 October 2026](archive/2026-11-05/review.md#current-acceptance-and-closure--26-october-2026)

<a id="story-decision-and-evidence-register"></a>

[Story decision and evidence register](archive/2026-11-05/review.md#story-decision-and-evidence-register)

<a id="information-needed-to-finish-closure"></a>

[Information needed to finish closure](archive/2026-11-05/review.md#information-needed-to-finish-closure)

<a id="retained-earlier-review-records"></a>

[Retained earlier review records](archive/2026-11-05/review.md#retained-earlier-review-records)

<a id="baseline-and-later-delivery-register--15-october-2026"></a>

[Baseline and later delivery register — 15 October 2026](archive/2026-11-05/review.md#baseline-and-later-delivery-register--15-october-2026)

<a id="review-record-and-historical-preparation"></a>

[Review record and historical preparation](archive/2026-11-05/review.md#review-record-and-historical-preparation)

<a id="11-october-preparation-update"></a>

[11 October preparation update](archive/2026-11-05/review.md#11-october-preparation-update)

<a id="goal-and-review-preparation"></a>

[Goal and review preparation](archive/2026-11-05/review.md#goal-and-review-preparation)

<a id="demo-run-sheet"></a>

[Demo run sheet](archive/2026-11-05/review.md#demo-run-sheet)

<a id="inspect-the-sprint-outcome"></a>

[Inspect the sprint outcome](archive/2026-11-05/review.md#inspect-the-sprint-outcome)

<a id="stakeholder-feedback-and-backlog-decisions"></a>

[Stakeholder feedback and backlog decisions](archive/2026-11-05/review.md#stakeholder-feedback-and-backlog-decisions)

<a id="closure-checklist"></a>

[Closure checklist](archive/2026-11-05/review.md#closure-checklist)

<a id="current-evidence-assessment--16-october-2026"></a>

[Current evidence assessment — 16 October 2026](archive/2026-11-05/review.md#current-evidence-assessment--16-october-2026)

<a id="evidence-used-and-limits"></a>

[Evidence used and limits](archive/2026-11-05/review.md#evidence-used-and-limits)

<a id="twelve-story-assessment"></a>

[Twelve-story assessment](archive/2026-11-05/review.md#twelve-story-assessment)

<a id="severity-and-acceptance-interpretation"></a>

[Severity and acceptance interpretation](archive/2026-11-05/review.md#severity-and-acceptance-interpretation)

<a id="rechecks-and-action-plan"></a>

[Rechecks and action plan](archive/2026-11-05/review.md#rechecks-and-action-plan)

<a id="16-october-clarification--customer-changes-received-during-sprint-2"></a>

[16 October clarification — customer changes received during Sprint 2](archive/2026-11-05/review.md#16-october-clarification--customer-changes-received-during-sprint-2)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/review.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--reported-original-story-manual-results"></a>

[25 October 2026 — reported original-story manual results](archive/2026-11-05/review.md#25-october-2026--reported-original-story-manual-results)

<a id="25-october-2026--ryan-story-verification-records"></a>

[25 October 2026 — Ryan story verification records](archive/2026-11-05/review.md#25-october-2026--ryan-story-verification-records)

<a id="25-october-2026--team-meeting-and-manual-result-reconciliation"></a>

[25 October 2026 — Team meeting and manual-result reconciliation](archive/2026-11-05/review.md#25-october-2026--team-meeting-and-manual-result-reconciliation)

</details>
