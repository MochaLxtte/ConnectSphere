# Sprint 3 review and closure

**17 October 2026. The six members collectively accepted all 13 selected stories, worth 63 SP, with no carry-over.** The review account closes with this disposition. The team separately confirmed attendance on 25 October and collective acceptance on 26 October. [Review account, cues 01–13](evidence/meetings/review.docx) · [Collective decision report](evidence/README.md#s3-e28--collective-review-acceptance-confirmation-26-october-2026)

<a id="team-input-needed"></a>

## Review record

| Field | Record |
| --- | --- |
| Date and participants | 17 October. Arvin facilitated. Ernest, Irfan, Kai Jie, Ryan and Tristan each contributed. Clock time and location unavailable. |
| Method | Members presented their parts of the request and venue journey, discussed a hold-expiry question, then considered the story criteria, applicable DoD and available evidence. Arvin called for acceptance. The written cue leaves the six responses open. The separate team report confirms collective agreement. |
| Demonstrated build | Exact build/branch and contemporaneous demo captures unavailable. Later verification remains dated to the build actually examined. Historical build-level DoD compliance is **Not assessed**. |

## Manual checks reported at review

At the 17 October review, Ernest reported that all planned Sprint 3 manual cases ran and passed. He said the individual results were still being entered and undertook to record “Test passed” for each case with the details available. The account gives the result for the sprint’s planned manual checks, without listing their case IDs, build or environment. Later reports in the story table identify the individual cases they cover and retain their own dates and evidence. [Current Sprint 3 review, cue 11](evidence/meetings/current/review.docx) · [Review testing reports and source versions](../review-testing.md)

## Review feedback

Ryan asked whether expiry of a temporary hold meant that a venue became available. Irfan clarified that expiry releases only that hold. Other bookings, outages and availability rules continue to apply. The availability view and notification should reflect the expiry, and expiry cannot turn a hold into an approved booking. This clarified KAN-83 and its interaction with KAN-78 and KAN-81. The subsequent request for additional feedback is an open recording prompt. No further response, assignee or target date is supplied. [Review cues 09–13](evidence/meetings/review.docx)

The team organised its presentation around the product journey. Tristan covered the Lead queue, reassignment and access changes. Ernest covered submission, suitability and notification handoffs. Ryan explained venue search and the catalogue continuation. Kai Jie showed buffer configuration and outage recovery. Arvin covered draft resumption and buffer enforcement. Irfan covered rejection reasons and expiring holds. The next sprint would extend the journey into equipment, registration, event changes, confirmation and safety-approved preparation. [Review cues 02–08 and 13](evidence/meetings/review.docx)

## Story decisions

The criteria and test groups below provide a stable reference for each reviewed story. The team's 17 October decision and subsequent technical evidence have separate dates. The build shown on 17 October cannot be identified, so later failures, fixes and retests retain their original dates. [Test report](../../testing/README.md)

| Story / current criteria | SP | Implementation owner / scope | Available verification | Acceptance decision at review |
| --- | ---: | --- | --- | --- |
| [KAN-6](sprint-backlog.md#kan-6--submit-an-event-request) / S3-T05 | 3 | Ernest | S3-E24: reported manual Pass; existing submission regressions | Accepted |
| [KAN-12](sprint-backlog.md#kan-12--search-and-filter-venues) / S3-T16 | 5 | Ryan | S3-E22: reported manual Pass, retained failed source CI and later passing integration | Accepted |
| [KAN-34](sprint-backlog.md#kan-34--resumeedit-draft-event-request) / S3-T06 | 3 | Arvin | S3-E21/E24: existing automation and reported manual Pass; S3-E25/E26: date-bound repair and reported retest Pass | Accepted |
| [KAN-50](sprint-backlog.md#kan-50--maintain-venue-catalog) / S3-T15 | 5 | Ryan (AC101 repair); original catalogue Irfan | S3-E22: stale-save repair report and passing PR #56 CI; original catalogue evidence remains in Sprint 2 | Accepted |
| [KAN-52](sprint-backlog.md#kan-52--check-venue-suitability) / S3-T17 | 3 | Ernest (Sprint 3 revision) | S3-E24: reported manual Pass; AUTO-20261025-CLOSEOUT-02: exact-capacity regression Pass | Accepted |
| [KAN-60](sprint-backlog.md#kan-60--require-a-reason-when-rejecting-an-event-request) / S3-T07 | 2 | Irfan | S3-E24: reported manual Pass; S3-E25/E26: Singapore-time repair and reported retest Pass | Accepted |
| [KAN-64](sprint-backlog.md#kan-64--receive-request-assignment-and-venue-notifications) / S3-T22 | 5 | Ernest | S3-E24: reported manual Pass; S3-E25: real dedupe/rollback/recipient regressions and notification-scope trace | Accepted |
| [KAN-65](sprint-backlog.md#kan-65--reassign-event-coordinator) / S3-T21 | 3 | Tristan | S3-E23: reported localhost manual Pass; integrated assignment/notification automated evidence | Accepted |
| [KAN-77](sprint-backlog.md#kan-77--configure-venue-setup-and-turnaround-durations) / S3-T18 | 2 | Kai Jie | S3-E24: reported manual Pass; existing duration editor/guard automation | Accepted |
| [KAN-78](sprint-backlog.md#kan-78--apply-venue-buffers-to-availability-and-booking-conflicts) / S3-T19 | 8 | Arvin | S3-E21/E24: automation and reported manual Pass; S3-E25/E26: readable-warning repair and reported retest Pass | Accepted |
| [KAN-79](sprint-backlog.md#kan-79--assign-submitted-events-through-a-coordinator-lead-queue) / S3-T20 | 8 | Tristan | S3-E23: reported localhost manual Pass; integrated allocation/reassignment/notification evidence | Accepted |
| [KAN-81](sprint-backlog.md#kan-81--recover-venue-arrangements-affected-by-operational-unavailability) / S3-T25 | 8 | Kai Jie | S3-E24: reported manual Pass; S3-E25/E26: replacement/outage repair and reported retest Pass; Sprint 4 confirmation/safety consumer integration remains separate | Accepted |
| [KAN-83](sprint-backlog.md#kan-83--manage-temporary-venue-holds-with-expiry-and-automatic-release) / S3-T26 | 8 | Irfan | S3-E24: reported manual Pass; S3-E25: observed cron execution and contention tests; S3-E26: buffered-deadline/expiry-inbox repair smoke reported Pass | Accepted |

## Closure evidence

The review account and the later collective confirmation support the 63-point outcome. The sprint commitment closed with zero points outstanding. The [release chart](../burndown-charts/sprint-3.jpg) shows 63 SP remaining for Sprint 4. On 6 November 2026 the team confirmed the original closing board screenshot does not exist. The separate native chart export remains unavailable. [Evidence register](evidence/README.md) · [Sprint checkpoints](daily-progress.md#burndown-data) · [Shared chart](../ws5-evidence/board-history.md)

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/review.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="sprint-3-review"></a>

[Sprint 3 review](archive/2026-11-05/review.md#sprint-3-review)

<a id="current-acceptance-and-closure--26-october-2026"></a>

[Current acceptance and closure — 26 October 2026](archive/2026-11-05/review.md#current-acceptance-and-closure--26-october-2026)

<a id="story-decision-register"></a>

[Story decision register](archive/2026-11-05/review.md#story-decision-register)

<a id="closure-checklist-and-outstanding-inputs"></a>

[Closure checklist and outstanding inputs](archive/2026-11-05/review.md#closure-checklist-and-outstanding-inputs)

<a id="retained-earlier-review-records"></a>

[Retained earlier review records](archive/2026-11-05/review.md#retained-earlier-review-records)

<a id="demo-and-acceptance"></a>

[Demo and acceptance](archive/2026-11-05/review.md#demo-and-acceptance)

<a id="outcome"></a>

[Outcome](archive/2026-11-05/review.md#outcome)

<a id="backlog-changes-from-feedback"></a>

[Backlog changes from feedback](archive/2026-11-05/review.md#backlog-changes-from-feedback)

<a id="superseded-planning-records"></a>

[Superseded planning records](archive/2026-11-05/review.md#superseded-planning-records)

<a id="sprint-3-review-1"></a>

[Sprint 3 review](archive/2026-11-05/review.md#sprint-3-review-1)

<a id="demo-and-acceptance-1"></a>

[Demo and acceptance](archive/2026-11-05/review.md#demo-and-acceptance-1)

<a id="outcome-1"></a>

[Outcome](archive/2026-11-05/review.md#outcome-1)

<a id="backlog-changes-from-feedback-1"></a>

[Backlog changes from feedback](archive/2026-11-05/review.md#backlog-changes-from-feedback-1)

<a id="arvin-evidence-prepared-for-review--25-october-2026"></a>

[Arvin evidence prepared for review — 25 October 2026](archive/2026-11-05/review.md#arvin-evidence-prepared-for-review--25-october-2026)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/review.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--team-meeting-and-manual-result-reconciliation"></a>

[25 October 2026 — Team meeting and manual-result reconciliation](archive/2026-11-05/review.md#25-october-2026--team-meeting-and-manual-result-reconciliation)

<a id="current-sprint-3-ownership-and-status-snapshot--25-october-2026"></a>

[Current Sprint 3 ownership and status snapshot — 25 October 2026](archive/2026-11-05/review.md#current-sprint-3-ownership-and-status-snapshot--25-october-2026)

<a id="25-october-2026--repair-follow-up-and-local-acceptance"></a>

[25 October 2026 — Repair follow-up and local acceptance](archive/2026-11-05/review.md#25-october-2026--repair-follow-up-and-local-acceptance)

</details>
