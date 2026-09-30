# Sprint 2 review and closure

**Status: Scheduled; review not executed.** The review is scheduled for **Saturday 3 October 2026**, Asia/Singapore. Exact time, location, attendees, facilitator, demonstrators and note taker are not recorded. This document is a preparation record; it contains no Sprint 2 demo result, stakeholder feedback or acceptance award.

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

KAN-29 preparation now has [local automated evidence, AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment) and a [manual check guide](../../testing/kan29-manual-checks.md). This is not a completed review or hosted acceptance result. Coordinate migration 007 with Arvin, confirm provisioned-coordinator availability and record policy acceptance before the demo. Controlled load/no-eligible tests must use an isolated project or a coordinated window. Venue services/UI/tests were removed from `main` on 26 September; the venue demos remain planned scenarios requiring implementation, not available features inferred from the original inspection.

## Demo run sheet

All results below are **Not executed**. Agree demonstrators and exact fixtures before the meeting.

| Demo | Scenario | Stories / test references | Actual result / evidence |
| --- | --- | --- | --- |
| S2-DEMO-01 | Reopen an existing draft, enable registration, fill capacity/window, save/reload; reject invalid required fields, then submit valid values | KAN-34, KAN-6; S2-T19/T21/T22 | Not executed |
| S2-DEMO-02 | After policy review, submit with unequal then tied loads: only opted-in coordinators qualify, lowest active count wins, then UUID ascending. Show automatic history, assigned access and no automatic review decision. Demonstrate no-eligible 409 preserving an editable draft and retry, then show that existing assignments cannot be handed over (future KAN-65). Initial manual assignment is limited to unassigned requests. | KAN-29 / Tristan; S2-T01/T02; manual K29-M01–M10 | Not executed; local automation is separate evidence |
| S2-DEMO-03 | Authorized coordinator can rediscover/reopen an approved event through the supported UI path to later work | KAN-33; S2-T20 | Not executed |
| S2-DEMO-04 | Venue Staff maintain a catalogue entry; coordinator searches combined requirements and inspects suitability | KAN-50, KAN-12, KAN-52; S2-T03/T04/T07–T10 | Not executed |
| S2-DEMO-05 | Internal calendar access works for Event Coordinator, Venue Staff and Technical Support Staff, with denied organizer/attendee/signed-out paths | KAN-51; S2-T05/T06 | Not executed |
| S2-DEMO-06 | Coordinator submits a booking, Venue Staff approve/reject, and saved outcome/calendar agree after reload | KAN-53, KAN-8; S2-T11–T14 | Not executed |
| S2-DEMO-07 | A booking request cannot be submitted against an already reserved period; later conflicting approval is also prevented. Check adjacent periods without turnover buffers and operational-block effects. | KAN-53, KAN-54, KAN-55; S2-T15–T18; retain concurrency test evidence | Not executed |
| S2-DEMO-08 | Run the connected goal path from repaired draft and assignment to accepted venue booking and calendar visibility | Integrated goal; S2-T23 | Not executed |

## Inspect the sprint outcome

| Story | Origin | Baseline points | Acceptance outcome | Remaining criteria / evidence / follow-up |
| --- | --- | ---: | --- | --- |
| KAN-29 | New | 3 | Not assessed | Tristan's branch implementation has local automated coverage. Policy acceptance, shared rollout, hosted checks, peer review and CI remain pending. |
| KAN-50 | New | 5 | Not assessed | |
| KAN-51 | New | 5 | Not assessed | |
| KAN-12 | New | 5 | Not assessed | |
| KAN-52 | New | 3 | Not assessed | |
| KAN-53 | New | 3 | Not assessed | |
| KAN-8 | New | 3 | Not assessed | |
| KAN-54 | New | 5 | Not assessed | |
| KAN-55 | New | 3 | Not assessed | |
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
