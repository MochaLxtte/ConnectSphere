# Sprint 2 review and closure

**Status: Actual review outcome not recorded.** The planned review date was **Saturday 3 October 2026**, Asia/Singapore. The implementation update below is dated 4 October and does not establish whether that meeting took place. Exact time, location, attendees, facilitator, demonstrators and note taker are not recorded. This document is a preparation record; it contains no Sprint 2 demo result, stakeholder feedback or acceptance award.

## Goal and review preparation

Inspect whether the increment enables venue catalogue maintenance, availability inspection and event coordinator assignment through a connected venue selection/booking workflow, and whether the three carried stories' reported defects are resolved.

Before the review, record the reviewed commit/build and environment, prepare synthetic data/accounts for the relevant roles, link executed [acceptance cases](sprint-backlog.md#acceptance-test-plan), and capture the final Jira board. Confirm role changes and workflow state in the application after reload. Keep exact successful and failing paths in the evidence; a broad demo label should not hide an untested path.

| Preparation field | Record |
| --- | --- |
| Reviewed commit / build / deployment | Not recorded |
| Demonstrators / reviewer | Not recorded |
| Test environment and synthetic fixtures | To prepare |
| Executed test and CI evidence | To attach for the reviewed build |
| Final board and burndown export | To capture at closure |
| Meeting/feedback evidence | To capture at the actual review |

KAN-29 preparation now has [local automated evidence, AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment) and a [manual check guide](../../testing/README.md#kan-29-hosted-verification). **30 September schema follow-up:** Tristan has applied migration 006 to shared Supabase; [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirms its fields and constraint, with all six current migration checksums matching hosted history through the recognised filename aliases. Hosted manual acceptance, availability-policy acceptance, CI and peer review remain pending. Confirm provisioned-coordinator availability and record policy acceptance before the demo. Controlled load/no-eligible tests must use an isolated project or a coordinated window. After the 26 September removal, KAN-12 search and KAN-51 calendar were rebuilt and integrated, followed by KAN-8 decisions on 4 October. The current main baseline also includes KAN-55 block management, and KAN-52 adds coordinator-interpreted suitability on 4 October. **5 October follow-up:** KAN-53 submission and the latest KAN-12 date filters are now integrated on this branch; the booking submission-to-decision demo is ready for verification. KAN-50 maintenance remains absent; full venue acceptance and the actual review outcome remain unrecorded.

## Demo run sheet

No review demonstration results have been supplied for the run sheet below. Separate development checks do not fill these meeting-result cells. Agree demonstrators and exact fixtures for the actual walkthrough.

| Demo | Scenario | Stories / test references | Actual result / evidence |
| --- | --- | --- | --- |
| S2-DEMO-01 | Reopen an existing draft, enable registration, fill capacity/window, save/reload; reject invalid required fields, then submit valid values | KAN-34, KAN-6; S2-T19/T21/T22 | Not executed |
| S2-DEMO-02 | After policy review, submit with unequal then tied loads: only opted-in coordinators qualify, lowest active count wins, then UUID ascending. Show automatic history, assigned access and no automatic review decision. Demonstrate no-eligible 409 preserving an editable draft and retry, then show that existing assignments cannot be handed over (future KAN-65). Initial manual assignment is limited to unassigned requests. | KAN-29 / Tristan; S2-T01/T02; manual K29-M01–M10 | Not executed; local automation is separate evidence |
| S2-DEMO-03 | Authorized coordinator can rediscover/reopen an approved event through the supported UI path to later work | KAN-33; S2-T20 | Not executed |
| S2-DEMO-04 | Venue Staff maintain a catalogue entry once KAN-50 is integrated; coordinator searches venues and follows [KAN-52 checks](../../testing/README.md#kan-52-hosted-verification) to assess current requirements, mismatches/unknowns and refresh after data changes | KAN-50, KAN-12, KAN-52; S2-T03/T04/T07–T10 | Not executed |
| S2-DEMO-05 | Internal calendar access works for Event Coordinator, Venue Staff and Technical Support Staff, with denied organizer/attendee/signed-out paths | KAN-51; S2-T05/T06 | Not executed |
| S2-DEMO-06 | As the assigned coordinator, submit synthetic venue requests from the review page; as Venue Staff inspect current event requirements, approve one and reject another with a reason. Refresh and show the saved outcomes to the coordinator, then compare calendar availability. Follow [KAN-53](../../testing/README.md#kan-53-hosted-verification) and [KAN-8](../../testing/README.md#kan-8-hosted-verification) checks. | KAN-53 / Kai Jie; KAN-8 / Tristan; S2-T11–T14 | Not executed; integrated on this branch 5 October |
| S2-DEMO-07 | A booking request cannot be submitted against an already reserved period; later conflicting approval is also prevented. Check adjacent periods without turnover buffers and operational-block effects. | KAN-53, KAN-54, KAN-55; S2-T15–T18; retain concurrency test evidence | Not executed |
| S2-DEMO-08 | Run the connected goal path from repaired draft and assignment to accepted venue booking and calendar visibility | Integrated goal; S2-T23 | Not executed |

## Inspect the sprint outcome

| Story | Origin | Baseline points | Acceptance outcome | Remaining criteria / evidence / follow-up |
| --- | --- | ---: | --- | --- |
| KAN-29 | New | 3 | Not assessed | Tristan's branch implementation has local automated coverage; migration 006 is applied and its shared schema verified on 30 September. Policy acceptance, provisioned-coordinator opt-in, hosted manual checks, peer review and CI remain pending. |
| KAN-50 | New | 5 | Not assessed | |
| KAN-51 | New | 5 | Not assessed | Ernest's implementation and PR #22 CI are integrated; hosted S2-T05/S2-T06 and review acceptance remain pending. |
| KAN-12 | New | 5 | Not assessed | Team search branch integrated on 4 October; hosted/story acceptance and peer review remain pending. |
| KAN-52 | New | 3 | Not assessed | Tristan implements read-only, current-data suitability with explicit coordinator interpretation. Local automation passed in [AUTO-20261004-KAN52-01](../../testing/test-evidence.md#4-october-venue-suitability); hosted S2-T09/T10, policy acceptance, peer review and CI remain pending. |
| KAN-53 | New | 3 | Not assessed | Kai Jie's submission implementation integrated 5 October with current reservation/block refusal and coordinator-only panel. Original local evidence is AUTO-20261004-KAN53-01; combined verification, hosted S2-T11/T12, policy acceptance, peer review and CI remain separate. |
| KAN-8 | New | 3 | Not assessed | Implemented 4 October for existing pending bookings. Local verification is in AUTO-20261004-KAN8-01; real-account checks, policy acceptance, peer review and new CI pending. KAN-53 is now integrated; S2-T23's connected hosted acceptance remains unexecuted. |
| KAN-54 | New | 5 | Not assessed | |
| KAN-55 | New | 3 | Not assessed | Staff block management is integrated in the main baseline; see Kai Jie's dated implementation/evidence record. Hosted S2-T17/T18 and review acceptance remain pending. |
| KAN-6 | Carry-over | 3 | Not assessed | |
| KAN-33 | Carry-over | 2 | Not assessed | |
| KAN-34 | Carry-over | 3 | Not assessed | |
| **Total baseline** | **35 new + 8 carried** | **43** | **Outcome not yet recorded** | |

| Outcome measure | Actual record |
| --- | --- |
| Sprint goal outcome | Not assessed |
| Actual final scope and dated changes | To reconcile with daily log and Jira |
| Accepted new-story points | Not recorded |
| Accepted carry-over points | Not recorded |
| Total accepted points / velocity | Not recorded; use accepted whole stories only |
| Unfinished stories and points | To record at closure |
| Review participants and acceptance decision makers | Not recorded |

Do not treat unassessed stories as failed stories or award points from code presence. Preserve the starting 43-point baseline and calculate the outcome against actual agreed scope changes and the Definition of Done.

## Stakeholder feedback and backlog decisions

| Actual date / contributor | Observation or feedback | Affected story | Decision / rationale | Follow-up owner / target |
| --- | --- | --- | --- | --- |
| | | | | |

## Closure checklist

- [ ] Actual meeting attendance, reviewed build and demo outcomes are recorded.
- [ ] Every accepted story links its criteria, executed tests, peer review, integration and relevant CI evidence.
- [ ] Carry-over defects have exact reproduction/retest records and neighboring path regressions.
- [ ] Final board, scope, burndown and accepted-point calculation reconcile.
- [ ] Feedback and unfinished work are carried into Sprint 3 planning with agreed owners/priorities.
- [ ] Retrospective actions and missing evidence are recorded honestly.
