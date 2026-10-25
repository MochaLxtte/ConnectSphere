# Sprint 2 review and closure

## Current acceptance and closure — 26 October 2026

This summary consolidates the meeting, test and acceptance reports with the earlier review assessment. It is the current closure reference; the dated records below remain unchanged. **Sprint 2 acceptance is recorded: seven stories / 24 SP accepted at the 3 October review; five stories / 19 SP carried at full original estimates.** The six-member collective review decision was confirmed on 26 October. Closing-board evidence, review feedback/actions and the team-prepared burndown remain to be supplied.

| Closure field | Supported record |
| --- | --- |
| Sprint window and commitment | 20 September–3 October 2026; **12 stories / 43 SP = 35 new + 8 carried** |
| Review / retrospective | **3 October 2026**, confirmed in the 25 October report; exact times and location **Not recorded** |
| Participants and acceptance decision makers | **Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan** attended planning, review and retrospective. All six collectively agreed the acceptance decisions in the review meeting. Arvin: Scrum Master; Irfan: Product Owner. |
| Administrative closure | Jira Sprint 2 id 34 is **Closed**, confirmed by the [26 October metadata read](../sprint-03/evidence/jira-sprint-metadata-20261026.json). Actual administrative completion: **16 October 2026, 02:06:49 Singapore time**. This is not a 3 October closing-board capture. |
| Recorded disposition | KAN-6, KAN-34, KAN-50, KAN-12 and KAN-52 selected for completion/re-verification in Sprint 3 at their **full 19 original SP**. The 16 October disposition is retained separately from the 3 October review. |
| Accepted stories | **KAN-29, KAN-51, KAN-53, KAN-8, KAN-54, KAN-55 and KAN-33: 7 stories / 24 SP**, accepted at the **3 October review**, confirmed in the 26 October report. This is a reported team decision, not an inference from Jira Done labels or test passes. |
| Accepted SP / historical velocity | **24 SP**. The five selected carry-over stories contribute **0 delivered SP** to Sprint 2 and retain their full **19-SP** estimates in Sprint 3. Commitment reconciles as **43 = 24 accepted + 19 carried**. |
| Reviewed build / local configuration | Exact reviewed commit or branch, fixture IDs and per-run configuration **Not recorded**. Existing dated builds and later fixes remain linked evidence, not substituted review builds. |
| Acceptance source | Team-reported collective decision by all six members at the **3 October 2026 review meeting**, supplied on **26 October 2026**. No contemporaneous decision artifact has been supplied. |
| Closing board / burndown | Closing-board artifact **Not recorded**; the team will supply it. The team will prepare the Sprint 2 burndown chart and provide its underlying observations; no chart or daily values are generated here. |

### Story decision and evidence register

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

### Information needed to finish closure

| Item | Exact information needed | Current position |
| --- | --- | --- |
| Story decisions and source | Seven accepted stories / 24 SP at 3 October review; five full-point carry-over stories / 19 SP; all six collectively agreed | **Recorded**, from the 26 October confirmation |
| Reviewed candidate | Commit SHA, branch or other recognisable build identifier, only if recovered later | **Not recorded**, confirmed unavailable; no repeat test required solely to reconstruct an unavailable identifier |
| Closing artifacts | Location of original closing-board/export evidence; the team-prepared burndown chart and underlying observations | **Not recorded**; the team will supply these |
| Review feedback/follow-up | Feedback actually given, affected story, agreed action and owner; confirm if there was no additional feedback | **Not recorded** beyond retained defects/carry-over decisions; the team will supply feedback/actions |

The accepted whole-story rows establish **24 SP** for the Sprint 2 summary and release records. Register the remaining team-supplied artifacts when available. This update records the supplied historical decision; it does not claim a new review meeting, change an estimate, alter Jira or treat the later 25 October DoD amendment as a retrospective Sprint 2 requirement.

## Retained earlier review records

**25 October 2026 reconciliation:** The [new supplied report](#25-october-2026--team-meeting-and-manual-result-reconciliation) records meeting attendance and/or manual results separately from earlier dated evidence. It does not backdate new fixes or infer acceptance.

**Current review assessment:** see the [twelve-story evidence assessment and recheck plan](#current-evidence-assessment--16-october-2026), recorded on 16 October. Five stories / 19 SP are selected for completion in Sprint 3; the other seven / 24 SP have historical acceptance **Not recorded**. Jira Sprint 2 is administratively closed. No actual review meeting, demonstration or historical velocity is supplied by this assessment. Earlier snapshots below retain their original dates and are superseded only for current administrative status.

## Baseline and later delivery register — 15 October 2026

**Record updated 15 October 2026.** The original commitment remains **43 points = 35 new + 8 carried**, for **20 September–3 October**. All 12 parents are now Done in Jira; Sprint 2 is still active. The table separates that administrative state from the original criteria, evidence available at the boundary, later verification and formal acceptance. Jira resolution dates are Asia/Singapore (+08:00), not proof of implementation or acceptance on those dates.

The criterion ranges link to the retained planning cards, not a claim that their later refinements were accepted on 3 October. KAN-50-AC15–AC21, KAN-12-AC14–AC16, KAN-54-AC10–AC11 and KAN-6-AC5–AC7 are separately dated 9 October refinements; keep them distinct from both the original scope and the [Week 7 customer changes](../../requirements/change-requests.md). Formal acceptance and accepted velocity remain **Not recorded**; unknown boundary status is not zero or a failed story.

| Story / original points | Original criteria / repair references | Position at 3 October boundary | Later implementation or verification evidence | Jira Done date (administrative) | Current formal acceptance | Remaining work / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-29 / 3 | [AC1–AC7 and assignment rule](sprint-backlog.md#kan-29--automatically-assign-event-coordinator) | Local implementation and AUTO-20260928-01 recorded; acceptance Not recorded | MAN-20261009-S2T23-01 observes assignment in the connected path; AUTO-20261015-01 reruns the automated suites | 4 October | Not recorded | Full hosted load/tie/no-eligible checks and policy/acceptance record |
| KAN-50 / 5 | [AC1–AC14](sprint-backlog.md#kan-50--maintain-venue-catalogue) | Earlier maintenance removed 26 September; no replacement or acceptance evidence at boundary | Rebuilt 9 October; AUTO/MAN-20261009-KAN50-01/02; PR #33 merged; later audit reproduces delayed-save wrong-venue state | 10 October | Not recorded | Fix/regress delayed-save defect; PR #33 peer review and AI-assistance explanation Not recorded |
| KAN-51 / 5 | [AC1–AC6](sprint-backlog.md#kan-51--view-venue-availability-calendar) | AUTO-20261003-01/02 and PR #22 CI recorded; acceptance Not recorded | Isolated interactive MAN-20261006-KAN51-01; shared-development calendar observations 9 October | 10 October | Not recorded | Full hosted role matrix and acceptance record |
| KAN-12 / 5 | [AC1–AC13](sprint-backlog.md#kan-12--search-and-filter-venues) | Full criterion-level completion/acceptance Not recorded | AUTO/MAN-20261009-KAN12-01; later audit reproduces impossible-date normalization | 10 October | Not recorded | Strict calendar-date validation/regression; manual stale/failure paths and acceptance record |
| KAN-52 / 3 | [AC1–AC9](sprint-backlog.md#kan-52--check-venue-suitability) | Full implementation/acceptance Not recorded; implementation entry dated 4 October | AUTO-20261004-KAN52-01; 9 October connected run loads context only; later audit finds zero-attendance rule inconsistency | 4 October | Not recorded | Resolve rule inconsistency and regress; run actual hosted assessment and refresh checks |
| KAN-53 / 3 | [AC1–AC11](sprint-backlog.md#kan-53--submit-venue-booking-request) | Full implementation/acceptance Not recorded; implementation entry dated 4 October | AUTO-20261005-INTEGRATION-01 and AUTO/MAN-20261009-S2T23-01 | 4 October | Not recorded | Complete dedicated authorization/refresh acceptance record |
| KAN-8 / 3 | [AC1–AC11](sprint-backlog.md#kan-8--approve-or-reject-venue-booking-request) | Full implementation/acceptance Not recorded; implementation entry dated 4 October | AUTO-20261004-KAN8-01 and MAN-20261009-KAN54-01/S2T23-01 | 4 October | Not recorded | Complete dedicated decision/permission acceptance record |
| KAN-54 / 5 | [AC1–AC9](sprint-backlog.md#kan-54--detect-venue-booking-conflicts) | Full criterion-level completion/acceptance Not recorded | AUTO/MAN-20261009-KAN54-01; automated concurrency coverage retained | 10 October | Not recorded | Formal conflict-policy/acceptance record; no manual concurrency run claimed |
| KAN-55 / 3 | [AC1–AC13](sprint-backlog.md#kan-55--block-venue-for-operational-unavailability) | Full criterion-level completion/acceptance Not recorded | AUTO-20261005-INTEGRATION-01; MAN-20261009-KAN54-01 block/refusal/removal observations | 4 October | Not recorded | Full reason/role matrix and acceptance record |
| KAN-6 / 3 carried | [Retained AC1–AC4; S1-DEF-03/04](sprint-backlog.md#carry-over-repair-criteria-and-tasks) | KAN-58 component repair reverified 1 October; KAN-59 validation repair still outstanding | AUTO/MAN-20261009-KAN59-01; later audit reproduces invalid-date API 500 and hidden submission field errors | 4 October | Not recorded | Repair/regress the newly reproduced paths; remaining post-submission refresh evidence |
| KAN-33 / 2 carried | [Retained AC1–AC4/AC6; S1-DEF-02](sprint-backlog.md#carry-over-repair-criteria-and-tasks) | KAN-56 repair, MAN-20260929-01 and 1 October CI recorded; formal acceptance Not recorded | 15 October regression suites pass; retain the earlier manual repeat-decision caveat | 1 October | Not recorded | Link acceptance decision and complete any unrecorded dedicated cases |
| KAN-34 / 3 carried | [Retained AC1–AC3; S1-DEF-01](sprint-backlog.md#carry-over-repair-criteria-and-tasks) | KAN-57 component repair reverified 1 October; complete hosted scenario Not recorded | 15 October regression suites pass; no new hosted toggle/refresh run supplied | 4 October | Not recorded | Full hosted No→Yes/Yes→No persistence and refresh evidence; coordinate invalid-date repair |
| **Total / 43** | **35 new + 8 carried** | **Accepted whole-story total: Not recorded** | **Later evidence keeps its actual date** | **12 parents Done** | **Not recorded** | **Team review/closure record required** |

KAN-57, KAN-58 and KAN-76 became Done in Jira on **15 October**. They remain included subtasks under KAN-34, KAN-6 and KAN-50 respectively, with no extra story points. The latest retained KAN-57/KAN-58 comments, dated 10 October, still leave hosted checks outstanding; the status changes supply no new run evidence. PR #33 has no submitted peer review in the 15 October check. This supersedes the current-status interpretation of the 11 October notes below, while preserving those dated observations.

Use [AUTO-20261015-01](../../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) and the [coverage summary](../../testing/coverage-reports/2026-10-15-post-sprint-audit.txt) as later verification, not a 3 October result. The newly reproduced defects and proposed handling are in [Sprint 3 planning](../sprint-03/planning.md). Reopening/remaining-work estimates and new customer-change stories require explicit team decisions; this register does not commit them or retrospectively award points.

## Review record and historical preparation

**Status: Actual review outcome not recorded.** The planned review date was **Saturday 3 October 2026**, Asia/Singapore. The implementation update below is dated 4 October and does not establish whether that meeting took place. Exact time, location, attendees, facilitator, demonstrators and note taker are not recorded. This document is a preparation record; it contains no Sprint 2 demo result, stakeholder feedback or acceptance award.

## 11 October preparation update

**Record updated 11 October 2026.** Current main includes the complete implemented venue flow, including KAN-50 maintenance and KAN-59 validation. All 12 parent stories are Done in the live Jira snapshot, but Sprint 2 is still active and the review decisions below remain Not recorded / Not assessed. Existing automated and shared-development checks are listed in the [evidence reconciliation](../../testing/test-evidence.md#11-october-reconciliation-of-existing-evidence); they are development evidence, not invented results for this meeting. Earlier preparation notes retain their original dates.

## Goal and review preparation

Inspect whether the increment enables venue catalogue maintenance, availability inspection and event coordinator assignment through a connected venue selection/booking workflow, and whether the three carried stories' reported defects are resolved.

Before the review, record the reviewed commit/build and environment, prepare synthetic data/accounts for the relevant roles, link executed [acceptance cases](sprint-backlog.md#acceptance-test-plan), and capture the final Jira board. Confirm role changes and workflow state in the application after reload. Keep exact successful and failing paths in the evidence; a broad demo label should not hide an untested path.

| Preparation field | Record |
| --- | --- |
| Reviewed commit / build / deployment | Not recorded |
| Demonstrators / reviewer | Not recorded |
| Test environment and synthetic fixtures | Not recorded for the actual review |
| Executed test and CI evidence | Not recorded for the reviewed build; dated development runs remain in the evidence register |
| Final board and burndown export | Not recorded |
| Meeting/feedback evidence | Not recorded |

KAN-29 preparation now has [local automated evidence, AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment) and a [manual check guide](../../testing/README.md#kan-29-hosted-verification). **30 September schema follow-up:** Tristan has applied migration 006 to shared Supabase; [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirms its fields and constraint, with all six current migration checksums matching hosted history through the recognised filename aliases. Hosted manual acceptance, availability-policy acceptance, CI and peer review remain pending. Confirm provisioned-coordinator availability and record policy acceptance before the demo. Controlled load/no-eligible tests must use an isolated project or a coordinated window. After the 26 September removal, KAN-12 search and KAN-51 calendar were rebuilt and integrated, followed by KAN-8 decisions on 4 October. The current main baseline also includes KAN-55 block management, and KAN-52 adds coordinator-interpreted suitability on 4 October. **5 October follow-up:** KAN-53 submission and the latest KAN-12 date filters are now integrated on this branch; the booking submission-to-decision demo is ready for verification. KAN-50 maintenance remains absent; full venue acceptance and the actual review outcome remain unrecorded.

## Demo run sheet

No review demonstration results have been supplied for the run sheet below. Its meeting results are **Not recorded**; this does not claim that each demonstration was or was not performed. Separate development checks do not fill these cells. Record actual demonstrators, fixtures and outcomes when supplied.

| Demo | Scenario | Stories / test references | Actual result / evidence |
| --- | --- | --- | --- |
| S2-DEMO-01 | Reopen an existing draft, enable registration, fill capacity/window, save/reload; reject invalid required fields, then submit valid values | KAN-34, KAN-6; S2-T19/T21/T22 | Not recorded |
| S2-DEMO-02 | After policy review, submit with unequal then tied loads: only opted-in coordinators qualify, lowest active count wins, then UUID ascending. Show automatic history, assigned access and no automatic review decision. Demonstrate no-eligible 409 preserving an editable draft and retry, then show that existing assignments cannot be handed over (future KAN-65). Initial manual assignment is limited to unassigned requests. | KAN-29 / Tristan; S2-T01/T02; manual K29-M01–M10 | Not recorded; local automation is separate evidence |
| S2-DEMO-03 | Authorized coordinator can rediscover/reopen an approved event through the supported UI path to later work | KAN-33; S2-T20 | Not recorded |
| S2-DEMO-04 | Venue Staff maintain a catalogue entry; coordinator searches venues and follows [KAN-52 checks](../../testing/README.md#kan-52-hosted-verification) to assess current requirements, mismatches/unknowns and refresh after data changes | KAN-50, KAN-12, KAN-52; S2-T03/T04/T07–T10 | Not recorded |
| S2-DEMO-05 | Internal calendar access works for Event Coordinator, Venue Staff and Technical Support Staff, with denied organizer/attendee/signed-out paths | KAN-51; S2-T05/T06 | Not recorded |
| S2-DEMO-06 | As the assigned coordinator, submit synthetic venue requests from the review page; as Venue Staff inspect current event requirements, approve one and reject another with a reason. Refresh and show the saved outcomes to the coordinator, then compare calendar availability. Follow [KAN-53](../../testing/README.md#kan-53-hosted-verification) and [KAN-8](../../testing/README.md#kan-8-hosted-verification) checks. | KAN-53 / Kai Jie; KAN-8 / Tristan; S2-T11–T14 | Not recorded; implementation integrated 5 October |
| S2-DEMO-07 | A booking request cannot be submitted against an already reserved period; later conflicting approval is also prevented. Check adjacent periods without turnover buffers and operational-block effects. | KAN-53, KAN-54, KAN-55; S2-T15–T18; retain concurrency test evidence | Not recorded |
| S2-DEMO-08 | Run the connected goal path from repaired draft and assignment to accepted venue booking and calendar visibility | Integrated goal; S2-T23 | Not recorded |

## Inspect the sprint outcome

| Story | Origin | Baseline points | Acceptance outcome | Remaining criteria / evidence / follow-up |
| --- | --- | ---: | --- | --- |
| KAN-29 | New | 3 | Not assessed | Current assignee Tristan. AUTO-20260928-01 plus MAN-20261009-S2T23-01 assignment observation; full hosted load/tie/no-eligible checks and review decision remain separate. |
| KAN-50 | New | 5 | Not assessed | Current assignee Irfan. PR #33 is merged; AUTO-20261009-KAN50-01 and MAN-20261009-KAN50-01/02 record automated and shared-development checks. KAN-76 is Done as of 15 October; peer-review evidence remains Not recorded. See the current baseline register for the later reproduced save defect. |
| KAN-51 | New | 5 | Not assessed | Current assignee Arvin. AUTO-20261003-01/02, isolated MAN-20261006-KAN51-01 and shared-development booking/calendar observations in MAN-20261009-S2T23-01; full hosted five-role acceptance remains separate. |
| KAN-12 | New | 5 | Not assessed | Current assignee Ryan. AUTO/MAN-20261009-KAN12-01 cover automated and shared-development search/access; manual failure/stale-response paths not executed. |
| KAN-52 | New | 3 | Not assessed | Current assignee Tristan. AUTO-20261004-KAN52-01 passes local layers. MAN-20261009-S2T23-01 only loads suitability context; the actual assessment and cross-role refresh gaps remain. |
| KAN-53 | New | 3 | Not assessed | Current assignee Kai Jie. AUTO-20261005-INTEGRATION-01 and AUTO/MAN-20261009-S2T23-01 support the integrated submission path; dedicated complete acceptance remains separate. |
| KAN-8 | New | 3 | Not assessed | Current assignee Tristan. AUTO-20261004-KAN8-01 and MAN-20261009-KAN54-01/S2T23-01 record automated decisions plus actual approval, conflict refusal, cleanup rejection and coordinator/calendar outcome paths; full dedicated acceptance remains separate. |
| KAN-54 | New | 5 | Not assessed | Current assignee Ernest. AUTO/MAN-20261009-KAN54-01 support submission/approval conflict, another venue, adjacency and block scenarios. No manual concurrency run is claimed. |
| KAN-55 | New | 3 | Not assessed | Current assignee Kai Jie. AUTO-20261005-INTEGRATION-01 includes PostgreSQL block cases; MAN-20261009-KAN54-01 records one block, refusal and cleanup. Full reason/role matrix remains separate. |
| KAN-6 | Carry-over | 3 | Not assessed | Current assignee Kai Jie. KAN-59 repair and automated/shared-development checks are recorded in AUTO/MAN-20261009-KAN59-01. KAN-58 is Done as of 15 October; full post-submission refresh evidence remains incomplete. Newly reproduced validation/error-display defects are listed in the current baseline register. |
| KAN-33 | Carry-over | 2 | Not assessed | Current assignee Irfan. KAN-56 repair has MAN-20260929-01 and CI AUTO-20261001-01; preserve the manual repeat-decision caveat. |
| KAN-34 | Carry-over | 3 | Not assessed | Current assignee Kai Jie. KAN-57 component repair passes AUTO-20261001-DRAFT-01; subtask is Done as of 15 October, but full hosted registration-toggle and refresh evidence remains incomplete. |
| **Total baseline** | **35 new + 8 carried** | **43** | **Outcome not yet recorded** | |

| Outcome measure | Actual record |
| --- | --- |
| Sprint goal outcome | Not assessed |
| Actual final scope and dated changes | Not recorded as a closure decision; original 43-point baseline retained |
| Accepted new-story points | Not recorded |
| Accepted carry-over points | Not recorded |
| Total accepted points / velocity | Not recorded; use accepted whole stories only |
| Unfinished stories and points | Not recorded as a closure decision |
| Review participants and acceptance decision makers | Not recorded |

Do not treat unassessed stories as failed stories or award points from code presence. Preserve the starting 43-point baseline and calculate the outcome against actual agreed scope changes and the Definition of Done.

## Stakeholder feedback and backlog decisions

| Actual date / contributor | Observation or feedback | Affected story | Decision / rationale | Follow-up owner / target |
| --- | --- | --- | --- | --- |
| Not recorded | Not recorded | Not recorded | Not recorded | Not recorded |

## Closure checklist

- [ ] Actual meeting attendance, reviewed build and demo outcomes are recorded.
- [ ] Every accepted story links its criteria, executed tests, peer review, integration and relevant CI evidence.
- [ ] Carry-over defects have exact reproduction/retest records and neighboring path regressions.
- [ ] Final board, scope, burndown and accepted-point calculation reconcile.
- [ ] Feedback and unfinished work are carried into Sprint 3 planning with agreed owners/priorities.
- [ ] Retrospective actions and missing evidence are recorded honestly.

## Current evidence assessment — 16 October 2026

This is a review of the recorded evidence and current acceptance gaps, not a newly executed demonstration or a reconstruction of the planned 3 October meeting. KAN-6, KAN-34, KAN-50, KAN-12 and KAN-52 are recorded as unfinished work to carry into Sprint 3 at their **full original 19 points**. Their current disposition is **not accepted; fix and verify in Sprint 3**. This decision does not establish the date each defect arose or an acceptance decision made at the Sprint 2 boundary.

The original Sprint 2 commitment remains **12 stories / 43 points = 35 new + 8 carried**. Record **0 delivered points for the five selected carry-over stories** in Sprint 2's outcome accounting; retain their original Jira estimates of 3, 3, 5, 5 and 3 respectively. The other seven stories total **24 points**, but that is their combined estimate, **not an accepted velocity**. Their actual review acceptance remains **Not recorded**. The actual Sprint 2 reviewed build, meeting attendance and stakeholder acceptance are still **Not recorded**; no finalised-on field is used.

### Evidence used and limits

- Read the original and dated refined ACs in the [Sprint 2 backlog](sprint-backlog.md), the live Jira descriptions saved for this planning activity, the earlier run records and [AUTO-20261015-01](../../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit). The pre-change Jira snapshot lists all 12 parent stories as Done; those labels do not settle their acceptance.
- The 15 October audit used application source `3bd64f8`, local Windows/Node 24, isolated PostgreSQL 17 and synthetic authentication fixtures. It passed **1,356 unit/component tests, 304 database integration tests and 95 Chromium tests**, with type checks and builds passing. Those existing suites did not detect the five independently reproduced findings.
- The [coverage summary](../../testing/coverage-reports/2026-10-15-post-sprint-audit.txt) reports frontend **94.18% statements / 91.09% branches** and backend **79.65% statements / 83.98% branches** for configured unit/component coverage. These percentages do not measure AC satisfaction or establish real Supabase login. No tests were rerun for this documentation assessment.
- Shared-development runs on 9 October and the earlier KAN-33 navigation check retain their actual scope and dates. Their successful paths remain evidence; a later finding does not erase them. Fixed-code regressions and the additional checks below are **Not executed**.
- Apply the [Definition of Done](../definition-of-done.md) to the relevant ACs, failure paths, review/integration, tests and demonstrable behavior. The reported agreement's supporting details remain **Not recorded**; this assessment does not invent a new historical DoD adoption date.

### Twelve-story assessment

The AC column identifies behavior supported by existing evidence, not a blanket pass for every criterion in its range. Full run details and limitations remain in the linked test register. Follow-up owners below are the selected Sprint 3 workstream owners or the relevant existing story owner; they are action assignments, not invented review attendees.

| Story / original SP | ACs or behavior supported by existing evidence | Known failure or remaining gap | Current disposition / follow-up owner |
| --- | --- | --- | --- |
| KAN-29 / 3 | AC1–AC7/selection rule have local selection, atomic assignment and concurrency checks in AUTO-20260928-01; MAN-20261009-S2T23-01 observes real-account submission and assignment. | Full hosted unequal-load/tie/no-eligible matrix and formal policy/acceptance record remain incomplete. Preserve the original automatic-assignment baseline separately from CR-5's replacement workflow. | Actual acceptance **Not recorded**; Ryan retains baseline regressions while implementing the Lead replacement. |
| KAN-50 / 5 | AC1–AC14 catalogue viewing/editing, persistence and propagation have AUTO/MAN-20261009-KAN50-01/02 evidence and merged PR #33. | Delayed save for venue A replaces the editor after navigation to venue B; the next save targets A. Correct-venue editing is compromised. PR #33 submitted peer-review evidence is also **Not recorded** in the inspected record. | **Not accepted; carry 5 SP.** Tristan fixes the stale response and verifies correct-record editing; Irfan reviews. |
| KAN-51 / 5 | AC1–AC6 have AUTO-20261003-01/02 and isolated interactive MAN-20261006-KAN51-01; the 9 October connected run observes booking/calendar propagation. | Full hosted role matrix, linked reviewed build and formal acceptance are incomplete. The isolated interactive run used fixture JWTs, not Supabase login. | Actual acceptance **Not recorded**; Arvin completes role/availability evidence and reviews buffer integration. |
| KAN-12 / 5 | AC1–AC13 and later validation/stale/failure refinements have AUTO/MAN-20261009-KAN12-01 coverage for filters, current data, exclusion, clearing and organiser denial. | An impossible API date normalizes to a different calendar date. The resulting query can use a period the caller did not supply. Manual slow/failure paths and acceptance remain incomplete. | **Not accepted; carry 5 SP.** Tristan fixes strict date handling and regressions; Irfan reviews. |
| KAN-52 / 3 | AC1–AC9 have local rule/API/database/browser evidence in AUTO-20261004-KAN52-01; the connected manual run loads the assessment context. | Attendance 0 is allowed by the recorded submission policy but yields capacity UNKNOWN / NEEDS_REVIEW. This is a conservative policy inconsistency, not a demonstrated unsafe Suitable result or a direct false Unsuitable label. Full hosted assessment/refresh remains **Not executed**. | **Not accepted; carry 3 SP** by Tristan's selected scope. Tristan aligns the policy and verifies the whole assessment; Irfan reviews. |
| KAN-53 / 3 | AC1–AC11 have integrated submission, Pending persistence, requirement association and reserved-period/block refusal evidence in AUTO-20261005-INTEGRATION-01 and AUTO/MAN-20261009-S2T23-01. | The connected path does not replace all dedicated relationship, invalid-state, concurrent-write and refreshed-outcome acceptance cases. | Actual acceptance **Not recorded**; Kai Jie completes S2-T11/T12 evidence and preserves submission safeguards. |
| KAN-8 / 3 | AC1–AC11 have AUTO-20261004-KAN8-01; MAN-20261009-KAN54-01/S2T23-01 observe approval, rejection cleanup, conflict refusal and coordinator/calendar outcomes. | Full dedicated authorised/unauthorised, repeat/opposite-decision and stale-view acceptance record is incomplete. | Actual acceptance **Not recorded**; Tristan completes S2-T13/T14 verification with an independent reviewer. |
| KAN-54 / 5 | AC1–AC9 and later boundary refinements have AUTO/MAN-20261009-KAN54-01 evidence for submission/approval clashes, other venues, adjacency and blocks; automated concurrency coverage is retained. | Actual formal acceptance and conflict-policy sign-off are **Not recorded**. The manual run did not exercise concurrent submissions; do not relabel automated evidence as manual. | Actual acceptance **Not recorded**; Ernest checks the criterion/evidence matrix and retains concurrency regression before CR-1. |
| KAN-55 / 3 | AC1–AC13 have isolated block cases in AUTO-20261005-INTEGRATION-01; MAN-20261009-KAN54-01 observes block creation, request refusal and removal. | Complete reason/role/state matrix and formal acceptance are incomplete. CR-2's later block-over-existing-booking requirement is new scope, not an original failure inferred here. | Actual acceptance **Not recorded**; Kai Jie completes S2-T17/T18 baseline evidence before CR-2 changes behavior. |
| KAN-6 / 3 | Retained submission ACs and S1-DEF-03/04 have AUTO-20261001-DRAFT-01 and AUTO/MAN-20261009-KAN59-01 for saved-draft submission, invalid-input refusal and correction/resubmission. | The detail-page submission path hides the returned field errors behind a generic uncertain-result message. This directly conflicts with the requirement to explain information preventing submission; the valid form path's earlier pass does not cover it. | **Not accepted; carry 3 SP.** Kai Jie fixes detail/form feedback parity and verifies both submission paths; Tristan reviews. |
| KAN-33 / 2 | Retained AC1–AC4/AC6 and S1-DEF-02 have MAN-20260929-01 and PR #21 CI AUTO-20261001-01 for rediscovering decided requests and current-assignment access. | Actual review acceptance is **Not recorded**; the earlier manual repeat-decision 409 observation was inconclusive, with automated coverage separate. No fresh navigation defect is established by this assessment. | Actual acceptance **Not recorded**; Irfan links the accepted build/decision if supplied and retains assigned-access/history regressions. |
| KAN-34 / 3 | Retained draft AC1–AC3 and S1-DEF-01 have AUTO-20261001-DRAFT-01 for registration controls and save/reload behavior. | An impossible direct-API draft date returns HTTP 500 instead of input feedback; the database preserves the draft. This is an input/failure-path gap, not evidence of silent data corruption or failure of every normal edit. Full hosted registration-toggle persistence remains **Not executed**. | **Not accepted; carry 3 SP.** Kai Jie fixes calendar-date validation and completes the hosted draft matrix; Tristan reviews. |
| **Total / 43** | **12 original stories; retained successful evidence remains valid for its tested paths** | **Five selected unfinished stories / 19 SP; seven other stories / 24 SP with acceptance Not recorded** | **No accepted-velocity total awarded by this assessment** |

### Severity and acceptance interpretation

These are product observations, not simply tests that were missing. Their severity differs, and none proves the whole project is unusable.

| Finding | Assessment | Why it matters for acceptance |
| --- | --- | --- |
| KAN-50 wrong-venue editor/save | High: data-integrity risk | The core action must edit the venue the user is viewing. A delayed response can cause a subsequent write to another venue; this is more than a cosmetic warning. |
| KAN-6 hidden field feedback | Medium: explicit AC failure on one submission path | Submission is correctly refused, but the user is not told which data prevents it. The Jira submission-feedback requirement applies to saved-draft submission as well as the form. |
| KAN-34 impossible date / HTTP 500 | Medium: API validation and recoverability gap | Stored data remains unchanged. Strict calendar validation is a meaningful failure-path/DoD requirement; it is not separately spelled out in every original draft AC. |
| KAN-12 impossible date normalized | Medium: input correctness gap | Silent normalization changes the selected search period. The original story requires results to correspond to filters; a dedicated impossible-date boundary case is a regression refinement. |
| KAN-52 zero-attendance handling | Lower severity: cross-feature policy consistency and evidence gap | NEEDS_REVIEW is conservative and differs from UNSUITABLE. The original capacity AC rejects over-capacity venues, not zero attendees explicitly. Align with the recorded policy allowing zero, and complete real hosted checks; do not call this an unsafe approval bypass. |

### Rechecks and action plan

All rows below are **planned rechecks — Not executed**. Use synthetic accounts/data, record the real build and environment, preserve and restore original shared-development values, and add the actual AUTO/MAN run ID to the test register. Existing automation can be reused where appropriate; a new manual run is not required merely to duplicate an already meaningful automated boundary check.

| Action / references | Concrete check and expected result | Owner / reviewer | Result |
| --- | --- | --- | --- |
| Catalogue stale-save regression; TC-08-01, S2-T03/T04 | Delay save A, navigate to B, resolve A, then edit/save B. B's URL/editor stay aligned and the second write targets B. Also change account during a pending save; stale data must not repopulate the next session. Repeat a normal save and reload. | Tristan / Irfan | Not executed |
| Submission feedback parity; TC-02-01, S2-T21/T22 | Submit the same invalid saved draft through its detail page and edit form. Both identify the invalid end/registration field and keep the draft unchanged. Correct the data, submit once, refresh organiser and assigned-coordinator views and verify no duplicate submission. | Kai Jie / Tristan | Not executed |
| Draft real-date validation; TC-03-01, S2-T19 | Send `2026-02-30T09:00:00Z` to the draft API: return a field-level 400 with no stored change. Check valid/invalid leap days, month boundaries and offsets; save/reopen a valid date. Complete No→Yes and Yes→No registration UI/API persistence and access checks. | Kai Jie / Tristan | Not executed |
| Search real-date validation; TC-10-01, S2-T07/T08 | Send `2026-02-30T10:00:00+08:00`: reject it rather than search 2 March. Check valid leap day, reversed/incomplete interval, offsets and ordinary filtered results. Retain slow-response/error tests and record which paths were automated versus manual. | Tristan / Irfan | Not executed |
| Suitability policy and hosted assessment; TC-11-01, S2-T09/T10 | With explicit requirements and otherwise passing venue checks, assess attendance 0 consistently with the allowed submission value; unknown/unconfirmed attendance must still need review. Test over-capacity and each required facility/layout/accessibility failure. Change current venue/event data, refresh/reconfirm and reassess using a real mapped coordinator account. | Tristan / Irfan | Not executed |
| Other seven stories; S2-T01/T02/T05/T06/T11–T18/T20 | Complete the specific gaps in the twelve-story table, link existing relevant automated evidence and record the actual acceptance decision. Do not rerun unchanged broad suites solely to fill a table. | Relevant owner above; Arvin coordinates | Not executed |
| Integrated baseline; S2-T23 | Repeat draft → submission/assignment → review → search → actual suitability assessment → booking request → staff decision → coordinator outcome/calendar, including reloads and unrelated-account denial. Capture the baseline before CR-1/CR-5 replace interval/assignment behavior; test the changed workflow separately in Sprint 3. | Arvin coordinates all affected owners; independent reviewers | Not executed |

**Review outcome from this evidence assessment:** five confirmed unfinished stories move into the selected [Sprint 3 plan](../sprint-03/planning.md) at **19 original points**. The remaining seven stories have substantial working evidence, but their formal acceptance remains **Not recorded**. The original planned Sprint 2 dates and 43-point baseline remain intact. Closing the Jira sprint administratively does not supply missing review attendance, a historical demo or accepted velocity.

## 16 October clarification — customer changes received during Sprint 2

**Record updated 16 October 2026.** The team received the Week 7 customer changes on **2 October 2026**, near the planned 3 October sprint end. The recorded plan was to complete Sprint 2 against its original scope, then consider the changes during Sprint 3 planning. The original **43 SP (35 new + 8 carry-over)** and original acceptance criteria therefore remain the Sprint 2 baseline. This later clarification records receipt and intended handling; it does not supply missing review attendance, acceptance or proof of completion by 3 October. The [change register](../../requirements/change-requests.md) traces the new/replacement requirements and later 63/63 Sprint 3/4 allocation.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

**KAN-51 — calendar, recorded owner Arvin, 5 SP.** Ernest’s original calendar rebuild in [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) remains his contribution. Arvin’s [PR #28](https://github.com/MochaLxtte/ConnectSphere/pull/28) corrected route/history synchronization, venue selection and server-side denial of spoofed roles; it merged **7 October 01:29 Singapore time**, after Sprint 2’s planned 3 October end. It added three component regressions and two API denial regressions. This is later delivery on a Sprint 2 story, not evidence of on-time Sprint 2 completion.

The existing **MAN-20261006-KAN51-01** walkthrough used a real local API with isolated PostgreSQL and locally signed fixture tokens: 15 checks passed as recorded. It did not exercise hosted Supabase password sign-in. The original ignored captures were not retained in this documentation checkout; no replacement screenshot is invented. GitHub readback records no submitted human approval for #28. `KAN-51-AC1`–`AC6`, `TC-09-201`–`203` and `S2-T05/T06` remain subject to their recorded scope and hosted acceptance gaps; the later shared buffers/holds requirements do not retroactively redefine the original checks. No new acceptance or velocity is inferred.

See the [evidence index](evidence/README.md) and [master contribution register](../../requirements/product-backlog.md).

## 25 October 2026 — reported original-story manual results

Tristan reports that all documented manual scenarios for his original **KAN-29, KAN-8 and KAN-52** work passed on **3 October 2026** using localhost, before the later push. [REPORT-20261025-TRISTAN-S2](../../testing/test-evidence.md#25-october-2026--reported-manual-results-for-original-stories), the [case mapping](sprint-backlog.md#25-october-2026--reported-original-story-manual-results) and [S2-E34](evidence/README.md#25-october-2026--reported-original-story-manual-results) retain that retrospective executor confirmation, recorded on 25 October.

The exact local build, database environment, fixture identifiers and supporting captures are **Not recorded**. This report does not replace earlier dated implementation evidence or establish a new review decision. It covers KAN-29's historical automatic allocation and KAN-52's original version only; Lead allocation, buffers/holds and Ernest's later KAN-52 revision remain separately evidenced. The original **43-point commitment**, recorded carry-overs and missing historical acceptance/meeting details are unchanged.

## 25 October 2026 — Ryan story verification records

Tristan reports that Ryan passed **six original KAN-12 manual scenarios** on **3 October 2026**, mapped to original AC1–AC13 in `TC-10-201–206` and `MAN-20261003-02`. See [REPORT-20261025-RYAN-S2](../../testing/test-evidence.md#25-october-2026--ryan-story-verification-records) and [S2-E33](evidence/README.md#25-october-2026--ryan-story-verification-records). Tested build, environment, fixtures and contemporaneous captures are **Not recorded**.

The report was recorded on 25 October and does not replace the actual later PR, CI or defect dates. Refined search/error/date behaviour is recorded separately for Sprint 3. The original 43-point baseline, administrative carry-over and missing historical acceptance/meeting evidence remain unchanged.

## 25 October 2026 — Team meeting and manual-result reconciliation

The supplied **25 October 2026** report confirms planning on **20 September 2026**, and review and retrospective on **3 October 2026**, with **Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan** attending all three. **Arvin is Scrum Master; Irfan is Product Owner.** Exact times, location, facilitator, note taker, original notes/recordings and individual estimation votes are **Not recorded**. Attendance does not establish who voted, accepted each story, or agreed a particular retrospective action.

[REPORT-20261025-TEAM-S2](../../testing/test-evidence.md#25-october-2026--team-manual-result-reports) appends **52 reported Pass** manual case results for the owners below. Reported execution date: **3 October 2026**. Tested build, environment, exact observations and captures are **Not recorded**. Existing Tristan/Ryan reports and all earlier outcomes remain separate. Current fixes require new retests; no acceptance or Done-SP change is inferred. Burndown artifacts remain for the team to supply.

| Reported executor | Historical story scope | Reported manual case rows |
| --- | --- | --- |
| Irfan | KAN-50 / KAN-33 | 18 Pass |
| Arvin | KAN-51 | 3 Pass |
| Ernest | KAN-54 | 4 Pass |
| Kai Jie | KAN-53 / KAN-55 / KAN-6 / KAN-34 | 27 Pass |

Evidence: [S2-E36](evidence/README.md#25-october-2026--team-manual-result-reports). Formal story acceptance and any new velocity calculation remain **Not assessed**. Previously recorded historical dispositions are preserved.
