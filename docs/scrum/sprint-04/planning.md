# Sprint 4 planning

**26 October 2026 ownership/refinement update:** Tristan selected KAN-9 (8 SP) and KAN-26 (3 SP), an11SP pair. KAN-9 development is authorised and In Progress; KAN-26 remains To Do. Independent reviewers are **To agree**. The approved unsaved-check and migration 014 choices are in the [decision log](../../requirements/assumptions-and-questions.md#26-october-2026--kan-9-equipment-availability-boundary). No sprint-start meeting, vote, estimate change or acceptance is inferred.

**Estimation status:** The current 63-SP allocation is a planning baseline. Team confirmation of relative estimates, capacity and the sprint commitment is **To agree**; no planning-poker vote is recorded. The 10 to 11 SP selection target is guidance, not an individual quota. Keep existing estimates until a team-agreed change is logged.

**Current selection: 15 parents / 63 SP.** Jira: **Future, not started (id 68)**. Planned window: **18–31 October 2026**. This is the balanced release allocation recorded on 16 October, superseding the earlier 97/29 selection.

Scope and estimates follow the recorded planning decisions. Stories are unassigned for team members to choose. Planning votes and meeting attendance are **Not recorded**; see [record preparation](../README.md#record-preparation).

| Field | Value |
| --- | --- |
| Planned sprint dates | 18–31 October 2026 |
| Planning event | Planned 18 October; actual meeting Not recorded. Record it live as the final-sprint planning meeting. |
| Actual time, place, attendees | Not recorded |
| Decision source | Recorded planning decisions and receipt confirmation; customer-change PDF; current Jira and repo baseline |
| Integration | To agree after story selection; coordinate with every owner and independent reviewer |
| Starting board / recording | Not recorded; current administrative snapshot is not a historical start board |

## Sprint goal

Complete the event journey through equipment arrangements, event lifecycle, registration, ordinary/significant changes, independent venue management and safety-approved preparation; verify the full release and its submission evidence.

## Selected scope and release allocation

**Point reconciliation:** the earlier Sprint 3 selection was 97 SP. Move 12 existing parents (KAN-9, KAN-10, KAN-14, KAN-15, KAN-17, KAN-18, KAN-26, KAN-61, KAN-62, KAN-63, KAN-66, KAN-67) at **47 SP** to Sprint 4; split unstarted KAN-64's **8 SP** into **KAN-64 5 SP** for request/assignment/venue notifications and **KAN-80 3 SP** for equipment/lifecycle/change/registration notifications; move **KAN-81 / CR-2 8 SP** and **KAN-83 / CR-4 8 SP** forward from the earlier Sprint 4 forecast. Thus Sprint 3 is **97 - 47 - 3 + 16 = 63** and Sprint 4 is **29 + 47 + 3 - 16 = 63**. KAN-64/KAN-80 together retain every original notification obligation; shared delivery is estimated only once. Moving the 12 unstarted stories is scope reallocation, not failed Sprint 3 delivery or a completed-sprint carry-over. No other story estimate is changed by this rebalance.

**16 October 2026 — self-selection update.** Stories are unassigned for team members to choose. The current pool remains **63 SP per sprint / 126 SP in total**. Aim for roughly **10–11 SP per member in each sprint**, or **21 SP across both**, using whole stories and their existing estimates. Keep dependencies together where useful, account for review/integration effort, and choose an independent reviewer after each owner is known. Reviewers must not review their own work. The integration lead is **To agree**. This replaces earlier named allocations; it does not change scope, points, acceptance or test results.

## Selected backlog

| Jira | Story | SP | Owner | Independent reviewer | Source / dependency |
| --- | --- | ---: | --- | --- | --- |
| KAN-9 | Check Equipment Availability for an Event | 8 | Tristan | To agree | KAN-18 operational quantities; KAN-63 event demand and KAN-26 reservation contract |
| KAN-10 | Mark Event as Completed | 3 | Unassigned — team member to choose | To agree after owner chosen | KAN-61 lifecycle and KAN-26 once-only equipment release; KAN-80 |
| KAN-14 | Register for an Event | 5 | Unassigned — team member to choose | To agree after owner chosen | KAN-61 eligible event; atomic capacity and KAN-80 notifications |
| KAN-15 | Submit and Review Event Change Requests | 5 | Unassigned — team member to choose | To agree after owner chosen | KAN-66 edit routing, venue/equipment impact, KAN-82 per-arrangement boundary and KAN-80 |
| KAN-17 | Withdraw Attendee Registration | 2 | Unassigned — team member to choose | To agree after owner chosen | KAN-14 owned registration and once-only capacity release; KAN-80 |
| KAN-18 | Update Equipment Availability Status | 3 | Unassigned — team member to choose | To agree after owner chosen | Pooled stock contract; KAN-9/KAN-26 shortfall effects; KAN-80 notifications |
| KAN-26 | Reserve Equipment | 3 | Tristan | To agree | KAN-9, KAN-63; KAN-62/KAN-10 lifecycle release; KAN-80 notifications |
| KAN-61 | Confirm Event After Planning Arrangements | 3 | Unassigned — team member to choose | To agree after owner chosen | Current venue readiness, KAN-26 equipment, KAN-15 pending-change check; separate KAN-84 preparation gate |
| KAN-62 | Cancel Event and Release Its Arrangements | 5 | Unassigned — team member to choose | To agree after owner chosen | Venue/hold release, KAN-26 equipment and KAN-14/KAN-17 registration consistency; KAN-80 |
| KAN-63 | Submit and Review Event Equipment Requests | 5 | Unassigned — team member to choose | To agree after owner chosen | KAN-9 availability, KAN-26 atomic reservation and KAN-80 notification integration |
| KAN-66 | Update Event Information During Planning | 3 | Unassigned — team member to choose | To agree after owner chosen | KAN-15 ordinary/significant change boundary and revision checks |
| KAN-67 | View Event Registrations | 2 | Unassigned — team member to choose | To agree after owner chosen | KAN-14/KAN-17 registration state and current organiser/coordinator authorization |
| KAN-80 | Receive Equipment, Lifecycle, Change and Registration Notifications | 3 | Unassigned — team member to choose | To agree after owner chosen | Sprint 3 KAN-64 inbox/delivery; Sprint 4 equipment, lifecycle, change and registration trigger owners |
| KAN-82 | Manage each venue arrangement independently for an event | 5 | Unassigned — team member to choose | To agree after owner chosen | Sprint 3 KAN-81/KAN-83 states and KAN-78 checks; KAN-15/KAN-62 event-wide boundary; KAN-84 invalidation |
| KAN-84 | Review operational safety before event preparation | 8 | Unassigned — team member to choose | To agree after owner chosen | KAN-61 readiness, KAN-26/KAN-63 equipment, KAN-82/KAN-81 arrangements, KAN-15 changes and notification delivery |

The pool is unassigned. Once a story is chosen, its owner is responsible for code, meaningful tests, contracts/docs, hosted evidence and arranging independent review. Points are relative story size, not hours or individual productivity.

## Customer-change chronology

The Week 7 customer changes were received on **2 October 2026**, near Sprint 2's end, with receipt confirmed on 16 October. The plan was to complete the original Sprint 2 scope before considering those changes in Sprint 3 planning. The receipt date is a confirmed project record rather than PDF metadata. The source inspection/preparation was recorded on 15 October and the present Jira/refinement changes on 16 October. Planning on 4 October was reported without a finalised selection; the later record does not claim this scope was committed then. See the [change register](../../requirements/change-requests.md).

Original Sprint 1/2 criteria and dated outcomes remain history. New customer requirements have linked new stories; unfinished original criteria remain on their existing stories. Rebuilding the current backlog neither retroactively accepts earlier work nor treats the changed automatic-assignment policy as a defect in original KAN-29.

## Dependencies and acceptance boundaries

- Build KAN-18 operational quantities and KAN-9 availability contracts before KAN-63/KAN-26 request, review and reservation integration. KAN-26's automatic release AC requires KAN-62 cancellation and KAN-10 completion; do not accept reservation in isolation before that path works.
- KAN-61 requires valid venue/equipment arrangements. KAN-14 registration depends on the eligible confirmed-event state; KAN-17/KAN-67 consume the same registration transaction and counts.
- KAN-80 reuses Sprint 3's KAN-64 delivery infrastructure and implements every remaining original trigger group alongside its owning story. A successful backend action without its required notification is not the completed story.
- KAN-66 and KAN-15 distinguish ordinary edits from significant changes; KAN-82 handles independent venue actions while event-wide cancellation remains KAN-62. Preserve unrelated arrangements and prior decisions.
- KAN-84 safety review happens after venue/technical readiness. Event confirmation and safety approval are separate conditions for explicit preparation; do not make readiness depend circularly on safety approval. Changed arrangements invalidate the reviewed revision.
- Regress Sprint 3 buffers, holds, outage recovery, assignment access and notification privacy in the final end-to-end build. All original core features and all six changes must be represented in release tests.

## Tasks

| Selection | Planned work packages | Reviewer |
| --- | --- | --- |
| Unassigned — team member to choose | Operational equipment quantities; attendee registration/withdrawal and authorised lists | To agree after owner chosen |
| Unassigned — team member to choose | Peak-overlap equipment availability; event cancellation and cross-resource consistency | To agree after owner chosen |
| Unassigned — team member to choose | Equipment request/review and atomic reservation; coordinate lifecycle release; integration lead To agree | To agree after owner chosen |
| Unassigned — team member to choose | Final event readiness/confirmation; Safety Officer review rounds and preparation gate | To agree after owner chosen |
| Unassigned — team member to choose | Ordinary edits, independent venue actions and completion with once-only release | To agree after owner chosen |
| Unassigned — team member to choose | Significant-change request/decision workflow; remaining original notification triggers via KAN-80 | To agree after owner chosen |

These thematic packages are not prescribed member bundles; members choose individual stories using the balance target. These are planned work packages, not completed work or created Jira subtasks. Story owners create the necessary implementation/review tasks when starting work.

## Integration and final-sprint checkpoints

| Planned checkpoint | Required outcome |
| --- | --- |
| 18 October planning | Record the meeting live; inspect actual Sprint 3 outcome, retain any full-point carry-over and explicitly reforecast this 63-point allocation |
| Early sprint | Publish stock, request/reservation, readiness, ordinary/significant-edit and notification contracts; agree migration order before parallel changes |
| Mid-sprint integration | Request/Lead/review → venue/equipment → confirmation → registration works; cancellation/completion release once; independent venue actions and change impacts remain consistent |
| Before 31 October review | Integrate safety submission, all outcomes, remediation, revision invalidation and preparation gate; complete combined regression, coverage, hosted acceptance and independent reviews |
| 31 October review/retro | Record both meetings live, assess actual whole-story outcomes and record feedback/actions; retain final board and burndown exports |
| 1–6 November | Final package/diagram/backlog/slide exports and instructor-access check; record any fixes with their real dates; submit by 6 November 23:59 Singapore time |

The 1–6 November buffer is submission preparation, not extra days silently added to Sprint 4 velocity. The [final-sprint recording register](../final-sprint-recordings.md) requires planning, review, retrospective and one Daily Scrum.

## Decisions and open questions

| Decision / gap | Recorded disposition |
| --- | --- |
| Balanced scope | 63 SP in Sprint 3 and 63 SP in Sprint 4, selected in the recorded planning decisions; all 126 remaining points retained |
| Notification split | KAN-64 8 → 5 and new KAN-80 3; AC allocation and original wording retained in story records; no double-counting of delivery infrastructure |
| Customer arrival | 2 October, confirmed on 16 October; finish original Sprint 2 scope first was reported intent, not evidence of actual completion |
| Historical acceptance / DoD agreement metadata | Not recorded where missing; current planning does not supply past attendees, acceptance or votes |
| Actual completion / product checks | Not executed / Not assessed; capture implementation and test evidence as work happens |

## Backlog refinement

| Recorded date | Who / method | Scope and decision |
| --- | --- | --- |
| 16 October 2026 | Recorded planning decisions; preparation method documented centrally | Reconstruct all six customer changes in linked stories; retain original criteria/history; balance release at 63/63; initially allocate owners, split notification trigger scope and document dependencies; named allocation superseded by the self-selection follow-up below |
| 16 October 2026, self-selection follow-up | Recorded planning decision | Remove current named allocations; members choose stories, target roughly 10–11 SP each per sprint / 21 across both; independent reviewers and integration lead To agree; scope remains 63/63 |

## Starting evidence

Current administrative selection is registered in [evidence](evidence/README.md). A real sprint-start board remains **Not recorded**. The Jira sprint is Future and has not started; capture the actual starting board at the planned 18 October meeting.

## Earlier named allocation — superseded 16 October

<details>
<summary>Earlier 63-point ownership proposal (historical; stories are now unassigned)</summary>

| Story | SP | Earlier owner | Earlier reviewer |
| --- | ---: | --- | --- |
| KAN-9 | 8 | Tristan | Irfan |
| KAN-10 | 3 | Ryan | Arvin |
| KAN-14 | 5 | Ernest | Ryan |
| KAN-15 | 5 | Irfan | Ernest |
| KAN-17 | 2 | Ernest | Ryan |
| KAN-18 | 3 | Ernest | Ryan |
| KAN-26 | 3 | Arvin | Kai Jie |
| KAN-61 | 3 | Kai Jie | Tristan |
| KAN-62 | 5 | Tristan | Irfan |
| KAN-63 | 5 | Arvin | Kai Jie |
| KAN-66 | 3 | Ryan | Arvin |
| KAN-67 | 2 | Ernest | Ryan |
| KAN-80 | 3 | Irfan | Ernest |
| KAN-82 | 5 | Ryan | Arvin |
| KAN-84 | 8 | Kai Jie | Tristan |

These assignments were replaced by team self-selection on 16 October. They are retained only to explain the earlier allocation record.

</details>
