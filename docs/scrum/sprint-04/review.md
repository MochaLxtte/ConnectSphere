# Sprint 4 review and closure

**On 31 October at 14:00 SGT, the team accepted all 15 selected Sprint 4 stories as one group: 63 SP accepted, zero carried.** Irfan identified the 15-story scope at the start. Ryan reported that every manual case on the review checklist passed. Tristan confirmed the 75 cases and that the responsible story owner ran each one. The recording captures the team’s assent to Arvin’s story-acceptance question. The demonstrated build and the project-wide R24 release decision remain separate fields. [Review account](evidence/meetings/current/review.docx) · [Review recording, 00:01–00:31 and 03:39–03:57](../final-sprint-recordings.md)

<a id="team-input-needed"></a>

## Review record

| Field | Supported record |
| --- | --- |
| Actual meeting date / time | 31 October 2026, 14:00 SGT, per the review account. Physical location unrecorded. |
| Participants | Arvin (facilitator), Irfan (Product Owner), Tristan, Ryan (integration coordinator), Ernest and Kai Jie. All six speak. |
| Method | Owners described their delivery. Arvin asked about repeated cancellation, and Irfan asked about a safety-relevant change. Ryan reported the manual-checklist outcome in the written account and undertook to check outstanding build and setup details. Irfan invited feedback before Arvin asked the team to accept the stories against the DoD. |
| Decision record | The group raised no outstanding concerns in the feedback round (03:29–03:39). At 03:39–03:47 Arvin asked for acceptance under the DoD. Audible affirmatives and Arvin’s close follow at 03:47–03:57. This was one collective decision covering the selected bundle. Individual votes are unrecorded. [Review recording](../final-sprint-recordings.md) |
| Demonstrated build | Not recorded. The 1 November connected results and 2 November main CI retain their actual dates. |
| Recording | [Watch the Sprint 4 review](https://www.youtube.com/watch?v=I2XzAojdZRg) · [Playback timestamps and access checks](../final-sprint-recordings.md) |
| Criteria / DoD | The review refers to the selected stories’ criteria and the team’s definition. The [DoD](../definition-of-done.md) includes the 25 October acceptance amendment. Build-specific compliance at this meeting is unrecorded. |

[Review account, cues 1–16](evidence/meetings/current/review.docx) · [Testing report](../../testing/README.md)

## Test results reported for the review

Ryan, the integration coordinator, reported that every manual check run at the review passed. Ernest confirmed that outcome at the 14:30 retrospective and said individual results still needed writing up. Tristan confirmed that the responsible story owners ran all 75 procedures identified from the Sprint 4 plan at the 14:00 review and that every one passed. Of those, 72 were labelled manual in the pre-review register and three were separately listed connected end-to-end procedures. The retained review account does not contain the original itemized checklist, build, environment or per-step observations. The roster links each team-reported result to its case ID and executor under the run `MAN-20261031-S4-REVIEW`. [Review cue 13](evidence/meetings/current/review.docx) · [Retrospective cue 4](evidence/meetings/current/retrospective.docx) · [75 cases by owner](../../testing/sprint-4-manual-review.md) · [Sources and reconciliation](../review-testing.md)

The MP4 captures Ryan’s undertaking to check the build, environment and results at 03:06–03:12, followed by the feedback discussion and story decision. Ryan and Ernest supply the aggregate result in the written accounts. The 75 case attributions come from Tristan’s confirmation against the plan. Two separate automated UI runs on 31 October logged workspace checks starting at 19:02:24 and 19:27:15, after the review. Their case records preserve four initial failures and subsequent passing retests. The final catalogue also contains cases documented on 1 November. [Timed review evidence](../final-sprint-recordings.md#review-decision-in-the-recording) · [First UI check log](evidence/minor-ui-20261031/check.txt) · [Second UI check log](evidence/ui-spacing-20261031/check.txt) · [Case results and coverage](../../testing/coverage-results.md)

## Story decisions

Irfan reported all 15 selected stories finished. Each owner explained their part of the journey. The cited cues identify those reports. Written cue 16 records the collective disposition and the recording supplies the affirmative response. The team raised no further concerns, then gave audible assent to accepting the selected stories against their criteria and DoD. The single decision applies to each of the rows below. [Review recording, 03:29–03:57](../final-sprint-recordings.md) · [Review account, cues 2–16](evidence/meetings/current/review.docx)

| Story | SP | Owner and work reported complete at review | Report cue | AC / test group | 31 October group decision |
| --- | ---: | --- | ---: | --- | --- |
| KAN-18 | 3 | Ernest · stock status feeds availability | 5 | [S4-T01](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-9 | 8 | Tristan · overlapping demand and unavailable stock | 3 | [S4-T02](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-63 | 5 | Ryan · coordinator requests and technical staff review | 4 | [S4-T03](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-26 | 3 | Tristan · stock rechecked before reservation | 3 | [S4-T04](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-61 | 3 | Kai Jie · confirmation checks current arrangements | 8 | [S4-T05](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-62 | 5 | Ryan · cancellation releases linked resources once | 7 | [S4-T06](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-10 | 3 | Ernest · completion releases remaining reservations | 5 | [S4-T07](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-14 | 5 | Ernest · duplicate and full-event registration checks | 5 | [S4-T08](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-17 | 2 | Arvin · attendee withdrawal | 12 | [S4-T09](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-67 | 2 | Arvin · authorised registration lists | 12 | [S4-T10](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-66 | 3 | Irfan · ordinary event edits | 11 | [S4-T11](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-15 | 5 | Irfan · impact review for significant changes | 11 | [S4-T12](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-80 | 3 | Arvin · notifications to affected people | 12 | [S4-T13](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-82 | 5 | Irfan · cancel or replace one venue independently | 11 | [S4-T14](sprint-backlog.md#acceptance-test-plan) | Accepted |
| KAN-84 | 8 | Kai Jie · current safety approval required before preparation | 10 | [S4-T15](sprint-backlog.md#acceptance-test-plan) | Accepted |

**Reported and accepted: 15 stories / 63 SP. Carried: 0 stories / 0 SP.** The decision was made in the 31 October review. The team supplied the recording for documentation on 6 November. [Recorded story criteria](sprint-backlog.md) · [Sprint chart and sources](../ws5-evidence/board-history.md)

## Release decision

The formal R24/release decision is recorded once in [release decision record](../../submission/release-record.md#release-decision). Keep the sprint story acceptance decisions above separate from that release decision.

## Review feedback

| Question or feedback | Affected story | Response at review | Follow-up |
| --- | --- | --- | --- |
| Arvin asked what a repeated cancellation does. | KAN-62 | Ryan explained the second attempt keeps the event cancelled, releases nothing twice and sends no duplicate notices. | No new action stated. [Cues 6–7](evidence/meetings/current/review.docx) |
| Irfan asked what happens after an approved arrangement changes. | KAN-84 | Kai Jie said a safety-relevant change invalidates the approval and requires review of the revised arrangements. | Later targeted testing identified a defect in restored approvals and verified a repair on 1 November. [Cues 8–10](evidence/meetings/current/review.docx) · [Targeted checks and repair](evidence/README.md#final-candidate-verification-and-shared-rollout--1-november-2026) |
| Irfan invited further feedback and unmet criteria. | All 15 stories | Members said they had nothing further to raise. | No additional review action was raised in that exchange. [Review recording, 03:14–03:39](../final-sprint-recordings.md) |

## Closure evidence

The start-state recording still, meeting accounts and dated test evidence are indexed in the [sprint evidence register](evidence/README.md). The [end-of-Sprint-4 release chart](../ws5-evidence/board-history.md#sprint-4) shows zero remaining. Its provisional acceptance label is qualified by the recorded 31 October team decision. The demonstrated SHA remains unrecorded. On 6 November 2026 the team confirmed the original closing screenshot does not exist. The review audio and the documented story list supply the acceptance decision. The R01–R23 connected release run, subsequent targeted failures/repairs and final-candidate retests show what was tested on 1 November. [Testing report](../../testing/README.md)

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/review.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="sprint-4-review"></a>

[Sprint 4 review](archive/2026-11-05/review.md#sprint-4-review)

<a id="demo-and-acceptance"></a>

[Demo and acceptance](archive/2026-11-05/review.md#demo-and-acceptance)

<a id="outcome"></a>

[Outcome](archive/2026-11-05/review.md#outcome)

<a id="backlog-changes-from-feedback"></a>

[Backlog changes from feedback](archive/2026-11-05/review.md#backlog-changes-from-feedback)

</details>
