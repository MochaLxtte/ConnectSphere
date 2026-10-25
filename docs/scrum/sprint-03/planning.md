# Sprint 3 planning

**Scoped ownership and delivery reconciliation — 25 October 2026.** Arvin owns KAN-34 **3 SP** and KAN-78 **8 SP**. Leo Kai Jie supplied the requested-changes review; Irfan recorded integration approval on PR #48/#54 on 22 October. Leo's later re-review is Not recorded. [The current evidence](../../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) records automated main verification, not hosted acceptance or a planning meeting. The last recorded Jira state is In Review (21 October); no new Jira read is claimed. Estimates, sprint scope and dates are unchanged; the historical unassigned rows below are superseded only for these two stories.

**Ownership update — 20 October 2026.** KAN-60 (2 SP) and KAN-83 (8 SP) are assigned to Irfan in Jira (20 October, 23:39 Singapore time); independent reviewers **To agree**. Other Sprint 3 Jira assignments read on 20 October: Ernest KAN-6, KAN-52, KAN-64; Arvin KAN-34, KAN-78; Ryan KAN-12, KAN-50; Tristan KAN-65, KAN-79; KAN-77 and KAN-81 unassigned. No new planning meeting or vote is asserted.

**Ownership update — 19 October 2026.** KAN-79 is claimed by Tristan (8 SP); independent reviewer **To agree**. KAN-65 remains a separate dependency and is not claimed or implemented by this update. Existing allocation and estimate records below retain their dates; no new planning meeting or vote is asserted.

**Estimation status:** The current 63-SP allocation is a planning baseline. Team confirmation of relative estimates, capacity and the sprint commitment is **To agree**; no planning-poker vote is recorded. The 10 to 11 SP selection target is guidance, not an individual quota. Keep existing estimates until a team-agreed change is logged.

**Current selection: 13 parents / 63 SP.** Jira: **Active (id 67)**. Planned window: **4–17 October 2026**. This is the balanced release allocation recorded on 16 October, superseding the earlier 97/29 selection.

Scope and estimates follow the recorded planning decisions. Stories are unassigned for team members to choose. Planning votes and meeting attendance are **Not recorded**; see [record preparation](../README.md#record-preparation).

| Field | Value |
| --- | --- |
| Planned sprint dates | 4–17 October 2026 |
| Planning event | 4 October, reported on 16 October; scope was not finalised. Current refinement is recorded 16 October. |
| Actual time, place, attendees | Not recorded |
| Decision source | Recorded planning decisions and receipt confirmation; customer-change PDF; current Jira and repo baseline |
| Integration | To agree after story selection; coordinate with every owner and independent reviewer |
| Starting board / recording | Not recorded; current administrative snapshot is not a historical start board |

## Sprint goal

Deliver reliable request review and Lead assignment, then coherent venue planning with buffered availability, expiring holds, outage recovery and relevant notifications.

## Selected scope and release allocation

**Point reconciliation:** the earlier Sprint 3 selection was 97 SP. Move 12 existing parents (KAN-9, KAN-10, KAN-14, KAN-15, KAN-17, KAN-18, KAN-26, KAN-61, KAN-62, KAN-63, KAN-66, KAN-67) at **47 SP** to Sprint 4; split unstarted KAN-64's **8 SP** into **KAN-64 5 SP** for request/assignment/venue notifications and **KAN-80 3 SP** for equipment/lifecycle/change/registration notifications; move **KAN-81 / CR-2 8 SP** and **KAN-83 / CR-4 8 SP** forward from the earlier Sprint 4 forecast. Thus Sprint 3 is **97 - 47 - 3 + 16 = 63** and Sprint 4 is **29 + 47 + 3 - 16 = 63**. KAN-64/KAN-80 together retain every original notification obligation; shared delivery is estimated only once. Moving the 12 unstarted stories is scope reallocation, not failed Sprint 3 delivery or a completed-sprint carry-over. No other story estimate is changed by this rebalance.

**16 October 2026 — self-selection update.** Stories are unassigned for team members to choose. The current pool remains **63 SP per sprint / 126 SP in total**. Aim for roughly **10–11 SP per member in each sprint**, or **21 SP across both**, using whole stories and their existing estimates. Keep dependencies together where useful, account for review/integration effort, and choose an independent reviewer after each owner is known. Reviewers must not review their own work. The integration lead is **To agree**. This replaces earlier named allocations; it does not change scope, points, acceptance or test results.

## Selected backlog

| Jira | Story | SP | Owner | Independent reviewer | Source / dependency |
| --- | --- | ---: | --- | --- | --- |
| KAN-6 | Submit an Event Request | 3 | Unassigned — team member to choose | To agree after owner chosen | Full-point Sprint 2 carry-over; Original submission validation; KAN-79 replaces initial assignment in the integrated release |
| KAN-12 | Search and Filter Venues | 5 | Unassigned — team member to choose | To agree after owner chosen | Full-point Sprint 2 carry-over; Strict dates and shared buffered/held/unavailable venue reads |
| KAN-34 | Resume/Edit Draft Event Request | 3 | Arvin | Leo Kai Jie (requested changes); Irfan (integration approval); Leo re-review Not recorded | Full-point Sprint 2 carry-over; Original draft criteria and strict real-calendar validation |
| KAN-50 | Maintain Venue Catalog | 5 | Unassigned — team member to choose | To agree after owner chosen | Full-point Sprint 2 carry-over; Original catalogue criteria; stale-save navigation regression |
| KAN-52 | Check Venue Suitability | 3 | Unassigned — team member to choose | To agree after owner chosen | Full-point Sprint 2 carry-over; Zero-attendance consistency and shared current venue checks |
| KAN-60 | Require a reason when rejecting an event request | 2 | Irfan | To agree | Existing KAN-36 review flow; correction counted once |
| KAN-64 | Receive Request, Assignment and Venue Notifications | 5 | Unassigned — team member to choose | To agree after owner chosen | Shared business-event/recipient contract; request, assignment and venue trigger owners |
| KAN-65 | Reassign Event Coordinator | 3 | Unassigned — team member to choose | To agree after owner chosen | KAN-79 Lead authority; KAN-64 notifications and current assignment access |
| KAN-77 | Configure Venue Setup and Turnaround Durations | 2 | Unassigned — team member to choose | To agree after owner chosen | KAN-50 catalogue and additive schema/API changes |
| KAN-78 | Apply Venue Buffers to Availability and Booking Conflicts | 8 | Arvin | Leo Kai Jie (requested changes); Irfan (integration approval); Leo re-review Not recorded | KAN-77 buffers; shared availability contract with KAN-81/KAN-83 |
| KAN-79 | Assign Submitted Events Through a Coordinator Lead Queue | 8 | Unassigned — team member to choose | To agree after owner chosen | KAN-6 submission; trusted role mapping; KAN-64 notification delivery |
| KAN-81 | Recover venue arrangements affected by operational unavailability | 8 | Unassigned — team member to choose | To agree after owner chosen | KAN-78 occupancy, KAN-64 delivery, existing booking decisions; integrate KAN-83 live holds |
| KAN-83 | Manage temporary venue holds with expiry and automatic release | 8 | Irfan | To agree | KAN-78 occupancy, KAN-64 delivery, existing booking decisions; integrate KAN-81 outages |

The pool is unassigned. Once a story is chosen, its owner is responsible for code, meaningful tests, contracts/docs, hosted evidence and arranging independent review. Points are relative story size, not hours or individual productivity.

## Customer-change chronology

The Week 7 customer changes were received on **2 October 2026**, near Sprint 2's end, with receipt confirmed on 16 October. The plan was to complete the original Sprint 2 scope before considering those changes in Sprint 3 planning. The receipt date is a confirmed project record rather than PDF metadata. The source inspection/preparation was recorded on 15 October and the present Jira/refinement changes on 16 October. Planning on 4 October was reported without a finalised selection; the later record does not claim this scope was committed then. See the [change register](../../requirements/change-requests.md).

Original Sprint 1/2 criteria and dated outcomes remain history. New customer requirements have linked new stories; unfinished original criteria remain on their existing stories. Rebuilding the current backlog neither retroactively accepts earlier work nor treats the changed automatic-assignment policy as a defect in original KAN-29.

## Selected implementation policies

The [current story cards](sprint-backlog.md) and [change register](../../requirements/change-requests.md) hold the operative criteria and provenance. Earlier policy labels remain references, with these allocation boundaries:

| Policy group | Current application |
| --- | --- |
| S3-P01 dates/access, S3-P08 venue buffers, S3-P09 Lead assignment | Apply to Sprint 3 with the current hold/outage story criteria. Keep server authority, current assignment checks, half-open intervals and the recorded catalogue concurrency exception. |
| S3-P07 notifications | Superseded in scope by the explicit KAN-64/KAN-80 split. Shared delivery/inbox and request/assignment/venue triggers are Sprint 3; equipment/lifecycle/change/registration triggers are Sprint 4. Each new CR owns its extra trigger integration. |
| S3-P02/P03 equipment, S3-P04 lifecycle, S3-P05 editing/changes, S3-P06 registration | Retained as implementation defaults for the relocated Sprint 4 stories, subject to their current criteria. They are not Sprint 3 acceptance obligations or claims of existing implementation. |
| CR-2/CR-4 operational defaults | KAN-81 and KAN-83 define outage recovery, explicit staff holds, deadline semantics, cancellation, scheduling and shared conflict handling. Defaults are implementation defaults, distinct from customer quotations. |

Preserve the original policy record below as history. Later changes need a new dated decision and matching Jira, criteria, test and contract updates.

## Dependencies and acceptance boundaries

- KAN-64 delivers a usable inbox plus request, assignment and venue notifications in this sprint. KAN-80 owns later equipment/lifecycle/change/registration trigger integrations in Sprint 4. Neither card can claim the other's criteria as already executed.
- KAN-50/KAN-77 define venue edits and buffers before KAN-78 changes consumers. KAN-81 and KAN-83 share that interval calculation, the same venue transaction/lock order and notification delivery. Integrate outage/hold interaction before accepting either story.
- KAN-79's trusted Lead role/queue and submission-policy replacement deploy together; KAN-65 reuses the same authority and current-assignment rules. Existing coordinator assignments and original event data remain intact.
- Sprint 3's demonstration uses currently eligible approved events and venue arrangements; it does not depend on building Sprint 4 equipment, final confirmation, registration or safety features early. Future readiness consumers must use the contracts published here.
- The five original carry-over stories retain their original criteria plus specific regressions. Required rejection reasons remain the single KAN-60 correction.

## Tasks

| Selection | Planned work packages | Reviewer |
| --- | --- | --- |
| Unassigned — team member to choose | Submission feedback in both paths, strict draft dates, required rejection reason and regression evidence | To agree after owner chosen |
| Unassigned — team member to choose | Stale venue-save correction, zero-attendance suitability, buffer settings and catalogue regression | To agree after owner chosen |
| Unassigned — team member to choose | Strict search dates and one buffered occupancy calculation across all venue consumers | To agree after owner chosen |
| Unassigned — team member to choose | Lead role/queue, coherent submission-policy change, initial allocation and reassignment with access revocation | To agree after owner chosen |
| Unassigned — team member to choose | Shared inbox and request/assignment/venue notifications; outage impact/recovery and replacement workflow | To agree after owner chosen |
| Unassigned — team member to choose | Explicit staff holds, expiry-aware reads, operational scheduled expiry and race handling; combined integration | To agree after owner chosen |

These thematic packages are not prescribed member bundles; members choose individual stories using the balance target. These are planned work packages, not created Jira subtasks or completed actions. Existing Done subtasks on reopened parents retain their earlier history and add no new Sprint 3 points.

### Two-day integration checkpoints

| Planned checkpoint | Participants | Exit condition |
| --- | --- | --- |
| 16 October, first work block | Integration lead (To agree) and selected owners | Agree shared buffer/hold/outage states, role/assignment rules, notification contracts and additive migration order; reproduce carried regressions |
| 16 October, before ending focused work | Owners and reviewers | Narrow fixes ready; notification, buffer and Lead contracts available; hold/outage branches integrate shared checks |
| 17 October, first work block | Selected owners and integration lead (To agree) | Request → Lead allocation → review → venue search/hold/decision/recovery and notifications work together; hold expiry/outage races verified |
| 17 October, before review | Owners and independent reviewers | Required automated checks, coverage, isolated DB/browser tests and hosted cases recorded; reviewed tested PRs merged |
| 17 October review/retro | Actual attendees recorded then | Assess whole stories, record actual acceptance/Done points/carry-over and member feedback |

No checkpoint is recorded as executed until supported by evidence. The original broader equipment-to-registration demonstration is moved to Sprint 4, not silently omitted from release scope.

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

Current administrative selection is registered in [evidence](evidence/README.md). A real sprint-start board remains **Not recorded**. The active sprint window does not establish that its current administrative scope existed on 4 October.



## Earlier named allocation — superseded 16 October

<details>
<summary>Earlier 63-point ownership proposal (historical; stories are now unassigned)</summary>

| Story | SP | Earlier owner | Earlier reviewer |
| --- | ---: | --- | --- |
| KAN-6 | 3 | Kai Jie | Tristan |
| KAN-12 | 5 | Tristan | Irfan |
| KAN-34 | 3 | Kai Jie | Tristan |
| KAN-50 | 5 | Ernest | Ryan |
| KAN-52 | 3 | Ernest | Ryan |
| KAN-60 | 2 | Kai Jie | Tristan |
| KAN-64 | 5 | Irfan | Ernest |
| KAN-65 | 3 | Ryan | Arvin |
| KAN-77 | 2 | Ernest | Ryan |
| KAN-78 | 8 | Tristan | Irfan |
| KAN-79 | 8 | Ryan | Arvin |
| KAN-81 | 8 | Irfan | Ernest |
| KAN-83 | 8 | Arvin | Kai Jie |

These assignments were replaced by team self-selection on 16 October. They are retained only to explain the earlier allocation record.

</details>
## Superseded planning records

The following preserved record describes the earlier 97-point selection and 84-point proposal. Its current-status wording, ownership, scope and allocation statements were accurate to those snapshots and are superseded by the 63/63 allocation above. Dated evidence and missing historical facts remain unchanged.

<details>
<summary>Earlier Sprint 3 planning and preparation record (preserved)</summary>

# Sprint 3 planning

**Status: selected plan — 97 SP across 23 backlog items.** Sprint window: **4–17 October 2026**. The plan below is adopted through the recorded planning decisions on scope, estimates, ownership and implementation defaults. It is a delivery plan, not a record of a team vote or a claim of completed work. Sprint 4 is the final development sprint; its meetings need the [required recordings](../final-sprint-recordings.md).

**16 October 2026 update.** Recorded planning selection: KAN-6, KAN-34, KAN-50, KAN-12 and KAN-52 as the outstanding Sprint 2 stories to carry for completion and re-verification. Their full original **19 SP** enter Sprint 3; the five receive **0 delivered credit in the current disposition**. Historical Sprint 2 acceptance/velocity remains **Not recorded**; this evidence review does not establish a past 3 October acceptance outcome or automatically accept the other 24 points. Jira story estimates stay at their full values. Other members' attendance, individual estimation votes and independent agreement are **Not recorded**. The earlier proposal snapshots below are retained; the selected plan and estimate table take precedence.

| Field | Value |
| --- | --- |
| Planning / sprint window | Planning on 4 October, reported on 16 October; sprint 4–17 October 2026. Original meeting time/place Not recorded. |
| Decision method | Planning decisions were recorded through chat; no planning-poker meeting or six-member vote is claimed. |
| Source | Recorded planning decisions, current Jira cards, Week 7 changes, repository audit and prior sprint records |
| Integration owner | Arvin; each story owner supplies code, tests, docs and an independent reviewer |
| Jira administration / starting board evidence | Sprint 3, id 67, verified Active; 23 parent items / 97 SP, all To Do. Board image Not recorded; administrative setup is not a historical start-board capture. |

## Preparation history

**16 October 2026 update:** Sprint 3 started on Sunday 4 October and is scheduled to end on Saturday 17 October. Planning took place on 4 October, but no stories were finalised. Sprint 3 work was not reported as started; all six members planned two full days of focus, 16–17 October. Record the eventual selection with its actual decision date and participants. This does not reclassify the dated 4–10 October completion of original Sprint 2 work or supply missing Sprint 2 acceptance evidence.

The two-week cadence projects final development Sprint 4 to 18–31 October. Week 12 is confirmed as 2–8 November, so the Friday submission deadline is **6 November 2026 at 23:59, Singapore time**, using the course's specified time. Proposed preparation buffer: 1–6 November. Sprint 4 scope, owners and estimates remain **To agree**.

**15 October 2026 preparation.** This page now contains inputs for the team's next planning meeting. It does not record that planning happened, select stories, reopen Jira cards, assign work or agree estimates. Only Sprint 1 and Sprint 2 exist in the live Jira board checked on 15 October; Sprint 2 is still active.

The following table records the earlier preparation state, before the recorded decisions above.

| Field | Value |
| --- | --- |
| Date, time, place | Planning on 4 October 2026, confirmed on 16 October; time/place Not recorded. Current refinement: 16 October chat. |
| Attendees / absences | Not recorded |
| Recorded by | Not recorded; add actual meeting recorder and date |
| How decisions were made | Original meeting method/participants Not recorded. 16 October refinement: Dates, availability and candidate scope were recorded through chat. Team voting/selection Not recorded. |
| Transcript or minutes source | The 16 October planning update confirms the date and unfinalised scope; original notes/transcript Not recorded |
| Inputs prepared | Sprint 1 reported 24-point outcome; Sprint 2 baseline and unresolved acceptance; current backlog; audit defects; CR-1–CR-6 below. Team discussion: Not recorded. |

## Pre-planning baseline and defect triage

**Historical preparation snapshot.** The later selected plan resolves the five listed original-story gaps as unfinished full-point carry-over, under the recorded carry-over decision. KAN-60 remains the single rejection-reason correction item; there is no second KAN-36 estimate. References below to treatment or decisions still needing confirmation describe the earlier proposal, not the current selection.

Use the [Sprint 2 review baseline](../sprint-02/review.md), [current master register](../../requirements/product-backlog.md#master-backlog-register) and [AUTO-20261015-01](../../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) together. Sprint 1 retains **32 committed / 24 reported Done / 8 carried**. Sprint 2 retains **43 committed points (35 new + 8 carried)**; its historical acceptance and velocity are **Not recorded**. Current Jira Done labels and later passing suites do not establish acceptance at the earlier deadline.

The following findings are observed against the pre-change implementation, not requirements introduced by the Week 7 update. The order is a suggested technical priority, not a team decision. Confirm the applicable original criterion and disposition before changing Jira. Do not count the same original story twice because several symptoms belong to it.

| Existing story | Observed gap / test case | Planning treatment to confirm | Regression focus |
| --- | --- | --- | --- |
| KAN-50 — venue catalogue | A delayed save for venue A replaces venue B's editor after navigation; the next save can target A. `TC-08-01`. | Repair candidate: reopen the original Done story under §5.10 after confirming the original criterion; estimate remaining work. Highest suggested priority because the wrong record can be changed. | Route changes during a pending save; stale success/error responses; subsequent write targets |
| KAN-6 — submission, including KAN-59 repair | The request-detail submission action hides `SUBMISSION_INVALID` field feedback behind a generic error. `TC-02-01`. | Repair candidate against existing useful-feedback criteria; reconcile the parent and included repair, not a duplicate new requirement. | Both submission entry points; valid/missing/invalid data; unchanged draft on failure |
| KAN-34 — draft editing | The date parser accepts an impossible day and the PostgreSQL update returns HTTP 500 instead of an input error. `TC-03-01`. | Repair candidate against draft validation; confirm original AC coverage and estimate the remaining fix. | Real calendar dates, timezone format, invalid API input and data preservation |
| KAN-12 — venue search | An impossible calendar date is normalised to a different day. `TC-10-01`. | Repair candidate against date-filter correctness; keep separate from CR-1's new buffered intervals. | Impossible dates, leap days, intervals and consistent client/server errors |
| KAN-52 — venue suitability | Expected attendance 0 is accepted at submission but produces unknown capacity suitability. `TC-11-01`. | Reconcile against the Product Owner's recorded 9 October zero-attendance decision; classification and repair estimate **To agree**. | Zero attendance, absent attendance and capacity boundaries |
| KAN-36 / existing KAN-60 correction | Event rejection accepts an omitted reason. `TC-04-01` plans the HTTP enforcement check; that new case is **Not executed**. | Resolve the existing KAN-60 task versus reopening KAN-36. Preserve the original history and choose one accounting path; this correction predates Week 7. | Required nonblank rejection reason, optional approval reason, authorised/unauthorised decisions |

The audit's existing suites passed while these gaps were found separately. New regression fixes have not been implemented by this documentation update. Each eventual repair needs relevant unit/component/integration checks and its affected manual path, followed by review and a dated evidence record.

### Separate planning inputs

| Input | Treatment |
| --- | --- |
| Original work unfinished at a sprint boundary | Record the original criterion and actual later completion. Only still-unfinished work is a candidate for Sprint 3; do not carry already-completed later work a second time. Ordinary carry-over keeps full original points under the team's rule. |
| Defect in previously accepted work | Reopen the original story, retain historical acceptance and estimate only the remaining repair. If historical acceptance is unknown, first resolve the baseline rather than assuming it. |
| New or replacement customer requirement | Use a new linked story after the team agrees the breakdown; preserve any superseded criterion with its original date. |
| Clarification | Record the source and date, update existing criteria deliberately, and recheck unchanged criteria. |
| Remaining original release backlog | Consider the existing equipment, registration, lifecycle, notification and planning-change stories alongside the new changes; do not duplicate existing future cards. |

CR-1–CR-6 are prepared in the [change register](../../requirements/change-requests.md). **CR-5 replaces automatic initial assignment with a Coordinator Lead queue**; that replacement does not itself make original KAN-29 a defect. **CR-6 adds a separate Safety Officer and approval gate**, not merely another venue-suitability check. Classification, linked Jira work, estimates, owners and sprint selection remain **To agree**.

### Team inputs needed before commitment

**Historical checklist from the preparation snapshot.** The selected plan below now settles scope, estimates, ownership and release defaults through the recorded planning decisions. Missing original meeting/DoD/acceptance evidence remains missing; it is not a blocker that has been silently filled by the planning choices.

1. Confirm actual Sprint 2 review outcomes, reviewed build, decision makers and timing, and identify any still-unfinished original criteria. Record unavailable historical details as **Not recorded**.
2. Provide any existing retrospective actions, board/burndown exports and estimation/attendance records; no replacement historical records should be invented.
3. Supply the Definition of Done's actual agreement date, participants and decision source, then confirm its applicability to the coming work.
4. Agree how each defect above is tracked, reconcile KAN-60, and estimate repairs alongside the customer changes and remaining release work.
5. Use the confirmed 4–17 October window and reported two-day capacity; agree the goal, selected stories, owners and reviewers with the actual refinement date. Recover an original starting board if one exists; any current capture keeps its real date. Prepare Sprint 4's final-sprint recordings before its planned 18 October start.

## Sprint goal

Complete the original event journey from request through planning, registration and completion/cancellation, with reliable venue buffers and Lead-controlled coordinator assignments, so Sprint 4 can integrate the remaining customer changes on a working release.

## Selected scope and release allocation

**97 SP = 60 existing future items + 19 full-point carry-over + 18 new customer-change work.** The increase from the initial 84-SP proposal is entirely the replacement of its 6-SP repair allowance with the confirmed 19-SP full-point carry-over. KAN-15 is selected at 5 SP, with its former 2-SP estimate retained in the [estimate change log](estimation-and-capacity.md#re-estimates-during-the-sprint). KAN-60 is counted once. KAN-65 and KAN-64 are counted once, with their shared responsibilities reused by the change stories.

| Workstream | Owner | Independent reviewer | Selected items | SP | Required integrated outcome |
| --- | --- | --- | --- | ---: | --- |
| Equipment planning | Arvin | Kai Jie | KAN-18, KAN-9, KAN-63, KAN-26 | 19 | Operational stock, quantity availability, staff review, protected reservation, notifications and lifecycle release |
| Event lifecycle and submission/draft carry-over | Kai Jie | Tristan | KAN-61, KAN-62, KAN-10, KAN-60, KAN-6, KAN-34 | 19 | Validated submissions/drafts, required rejection reasons, readiness-based confirmation, cancellation and completion with exactly-once resource release |
| Registration and ordinary editing | Ernest | Ryan | KAN-14, KAN-17, KAN-67, KAN-66 | 12 | Concurrent registration limits, owned withdrawal, authorised attendee lists and ordinary edits that respect arrangement impacts |
| Venue buffers and venue carry-over | Tristan | Irfan | KAN-77, KAN-78, KAN-50, KAN-12, KAN-52 | 23 | Correct catalogue saves and date/attendance boundaries; consistent setup/turnaround occupancy across all venue workflows |
| Lead allocation | Ryan | Arvin | KAN-79, KAN-65 | 11 | Lead role and unassigned queue, initial allocation/reassignment, oversight and immediate access changes |
| Notifications and reviewed changes | Irfan | Ernest | KAN-64, KAN-15 | 13 | All original notification triggers and reviewed significant changes with safe arrangement impacts |
| **Total** | **Six members** | **No self-review** | **23 items** | **97** | **Implementation, integration, regression, hosted acceptance and story documentation** |

`KAN-77`, `KAN-78` and `KAN-79` are the verified Jira keys for the earlier local labels CR1-A, CR1-B and CR5-A. Their [cards](sprint-backlog.md) define the new scope. Preserve KAN-29's original automatic-assignment history; CR-5 replaces initial assignment, and KAN-65 becomes Lead-authorised reassignment. Jira Sprint 3 (id 67) is Active with these 23 parents and 97 points, all To Do, verified on 16 October. Sprint 2 (id 34) was administratively closed on 16 October at 02:06 Singapore time; this is not a 3 October acceptance record.

The release allocation reserves **29 SP** for Sprint 4: CR-2 outage recovery (8), CR-3 independent venue arrangements (5), CR-4 expiring holds (8) and CR-6 safety review/gate (8). Owners: Tristan/CR-2, Ryan/CR-3, Arvin/CR-4 and Kai Jie/CR-6; Irfan supplies notification/change integration and Ernest supplies registration regression and submission preparation. Those Sprint 4 allocations are a planning forecast to review on 18 October, alongside actual Sprint 3 carry-over. No Sprint 4 completion or capacity hours are asserted.

## Selected implementation policies

These are release defaults adopted through the recorded planning decisions, not quotations or additional approvals from the customer. They supplement the customer requirements and must appear consistently in the Jira cards, repository cards, contracts and tests. Changes to them need a new recorded decision. Historical proposal questions below are superseded by these choices.

| Policy | Selected rule |
| --- | --- |
| S3-P01 — Dates and access | Use server/database UTC instants for comparisons and Asia/Singapore display. Use half-open time windows [start,end); exact adjacency does not overlap. Recheck current role, ownership/assignment and resource state within every write transaction. Use revision/conflict checks appropriate to each operation, preserving its existing criteria. Catalogue updates preserve concurrent edits to different fields, and existing catalogue fields retain KAN-50's same-field last-save policy. New KAN-77 buffer fields use field-aware checks: reject a stale save that conflicts on the same buffer field while preserving independent field edits. Version-checked event edits and decisions fail clearly when stale without overwriting newer work. |
| S3-P02 — Equipment pool | Pool by equipment type. Record nonnegative whole total, damaged and maintenance quantities, with damaged + maintenance <= total. Operational quantity = total - damaged - maintenance. Availability is operational quantity minus peak concurrent RESERVED quantity for the requested half-open interval, floored at zero for display. REQUESTED/REJECTED/CANCELLED rows do not reserve. Positive requested quantities only; equipment location and turnover buffers do not constrain allocation. Availability can be checked before venue confirmation. |
| S3-P03 — Equipment workflow and degraded stock | Only the assigned coordinator requests equipment for APPROVED planning events; Technical Support Staff review/reserve. A line is REQUESTED, RESERVED, REJECTED or CANCELLED; full requested quantity is reserved atomically, no partial reservation or silent substitute. The event is not equipment-ready until every active required line is RESERVED, or the coordinator explicitly records Not Required. Stock/operational changes must preserve existing reservation history, flag any affected shortfall and notify assigned coordinators; they must not pretend those reservations remain fulfilable. Subsequent confirmation/new reservation is blocked until resolved. Use new migrations for extra integrity/shortfall state, never modify applied ones. |
| S3-P04 — Lifecycle | Assigned coordinator confirms APPROVED -> CONFIRMED only when at least one valid APPROVED venue arrangement exists, all non-cancelled requested venue arrangements are approved, equipment is explicitly Not Required or all required equipment lines are RESERVED and currently fulfilable, and no pending significant change remains. No human staff scheduling prerequisite. Registration does not open automatically before its configured time. Assigned coordinator completes CONFIRMED -> COMPLETED at or after event end. Owning organiser or assigned coordinator may cancel SUBMITTED/UNDER_REVIEW/CLARIFICATION_REQUESTED/APPROVED/CONFIRMED with a trimmed nonempty reason. Draft cancellation remains outside this lifecycle action. Preserve decisions/history. Cancellation atomically cancels active venue/equipment arrangements and registrations; completion releases equipment exactly once but retains attendance/booking history. Later CR-6 adds the safety gate before preparation and is not claimed delivered here. |
| S3-P05 — Editing and significant changes | Draft editing stays KAN-34. Before initial approval, the owning organiser may edit submitted/review/clarification requests using full submission validation; retain submitted state and assignment, audit the revision, and force a reviewer with stale data to refresh. Once APPROVED/CONFIRMED, only the assigned coordinator may directly edit name and description as ordinary changes. Purpose, time, attendance, venue/equipment/accessibility requirements and registration configuration are significant and use KAN-15. One pending request per event; organiser owns it, assigned coordinator approves/rejects, rejection requires a reason. No arbitrary response deadline or change-request cutoff. A significant change that affects an already confirmed venue/equipment arrangement or active registrations cannot silently be applied: display the impact and require cancellation plus a new event request. Changes before any affected arrangement is confirmed can be approved after current validation/revalidation, with affected pending arrangements explicitly cancelled for resubmission and unaffected arrangements preserved. CR-3 later adds per-venue actions as a distinct revised requirement. |
| S3-P06 — Registration | Use authenticated attendee account identity; collect no extra personal fields for first release. Show Confirmed, registration-enabled events with name, description, purpose, event time and attendee-relevant confirmed venue details plus registration conditions. Admit only before event start and within [opensAt,closesAt), treating null bounds as unbounded; finite capacity is a nonnegative whole number (zero means full), null means unlimited for the existing contract. Never register for APPROVED merely because venue work has begun. Prevent duplicate active registrations and oversubscription transactionally. Withdrawal is permitted before event start, including after registration closes; confirm the action, release capacity once. Re-registration is permitted only while all normal admission rules hold and reuses the attendee/event record. Cancellation marks registrations cancelled without deleting history; cancelled registrations no longer occupy capacity. Organiser/current coordinator see attendee display name, email, registration status and timestamps; other roles do not gain roster access from internal status alone. No exports/waitlists. |
| S3-P07 — Notifications | Implement in-app notification inbox and read/unread state only, using transactional insertion plus unique business-event/recipient keys. Rolled-back changes produce no notifications, retries do not duplicate. Keep records for the release; no email worker is required. Include an acknowledgement even when actor is recipient (submission/registration), not a blanket exclude-actor rule. Protected links/details require current authorization: old assignees may retain a minimal handover notice but cannot reopen protected event data. Matrix: submission -> owner + Leads; clarification -> owner, reply -> assigned coordinator; initial decision -> owner; assignment -> owner/new coordinator, reassignment additionally old coordinator; venue decision -> assigned coordinator; equipment reservation/shortfall -> assigned coordinator and relevant technical staff; change request -> owner acknowledgement + assigned coordinator, outcome -> owner, affecting attendee details -> active attendees; confirmation/cancellation -> owner/current coordinator and active attendees, plus relevant venue/technical staff for affected arrangements; registration/withdrawal -> attendee and owner/current coordinator. CR2/4/6 add their new triggers in their own stories. |
| S3-P08 — Venue buffers | Venue Staff configure integer setupMinutes/turnaroundMinutes in 0..1440 inclusive, with zero on existing venues. Use the venue's current configured buffers for future/non-ended booking evaluations: occupied interval is [start-setup,end+turnaround). Completed historical bookings retain their recorded history. Check operational blocks and operating hours against the whole occupied interval. Apply the same calculator in search/calendar/suitability/submission/approval; pending requests still do not reserve until CR4 introduces holds. Re-evaluate future existing bookings on buffer edits, retain the booking rows and explicitly flag new overlaps/operational violations without silently cancelling them. Both conflicting existing arrangements are flagged; new conflicting reservations cannot be approved. UI labels the event period separately from occupied period and flagged conflicts. When buffers cross an unsupported operating-day boundary, report unavailable rather than normalizing away the time. |
| S3-P09 — Lead assignment | Provision EVENT_COORDINATOR_LEAD through trusted existing account setup. Leads oversee all non-draft events in the single deployment, with basic list fields and current assignments; the role alone cannot approve requests, act as venue staff or read attendee rosters. New successful submissions remain SUBMITTED and unassigned; all registered Leads see the queue. Only Leads initially assign/reassign to an EVENT_COORDINATOR with isAvailableForAssignment=true. Initial/reassignment states: SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED, CONFIRMED; refuse DRAFT/REJECTED/CANCELLED/COMPLETED. Preserve existing assignments and original KAN-29 history. KAN-65 handles reassignment and revokes old assignment-derived access immediately. Require a trimmed nonempty reason for reassignment, not initial assignment. Concurrent allocation uses a lock/version; one current assignment and nonoverlapping history. Targeting the current coordinator is an unchanged result without a new history/notification row. Only disable automatic allocation in the same integrated release that enables the queue and Lead access. |

Policy limits: the 1,440-minute buffer maximum and registration cutoffs/privacy fields are implementation defaults. Provision separate trusted test accounts when roles differ; do not assume a Lead is also a coordinator. Sprint 4 must refine the safety/preparation state without creating a circular dependency on venue/equipment readiness. All added migrations remain pending until implemented and tested.

## Proposed scope and release split — 16 October

**Superseded initial proposal, retained for the planning trail.** Its 84-SP total, unassigned owners and “To agree” wording describe the proposal before the recorded selection and full-point carry-over decision. Use the selected 97-SP plan above for current work.

No scope was finalised on 4 October. The subsequent proposal covered the work needed for the final deadline. This is an AI-prepared proposal for team agreement on its actual decision date; it is not the 4 October commitment. All 34 parent Jira items were read on 16 October: the 15 future items remain To Do. Current estimates, draft changes, unestimated work and repairs are distinguished in [estimation](estimation-and-capacity.md#story-estimates-and-rationale).

| Sprint 3 workstream | Proposed items | Provisional SP | Complete outcome required |
| --- | --- | ---: | --- |
| Equipment planning | KAN-18, KAN-9, KAN-63, KAN-26 | 19 | Staff maintain operational stock, assess real event demand, review requests and reserve without over-allocation; lifecycle release and coordinator notification work |
| Event lifecycle and input repairs | KAN-61, KAN-62, KAN-10; KAN-6/KAN-34 repairs; KAN-60 or KAN-36 repair counted once | 15 | Readiness-based confirmation, cancellation, completion and resource release; clear validation and mandatory event-rejection reasons |
| Registration and ordinary editing | KAN-14, KAN-17, KAN-67, KAN-66 | 12 | Attendees register/withdraw safely; managers see permitted lists; ordinary edits respect role and arrangement-impact rules |
| Venue buffers and corrections | New CR1-A/CR1-B; KAN-50/KAN-12/KAN-52 repairs | 14 | Venue configuration, search, calendar, suitability, requests and approval agree on buffered occupancy; known venue bugs repaired |
| Lead assignment workflow | New CR5-A; existing KAN-65 under the new Lead policy | 11 | Submission reaches a usable unassigned queue; the Lead assigns/reassigns and supervises; coordinator permissions follow the current assignment |
| Notifications and reviewed changes | KAN-64, KAN-15 | 13 | All original workflow triggers reach authorised recipients; organisers request changes and coordinators assess/apply the agreed outcomes |
| **Total proposed** | **15 future items, five additional existing-story repairs, three new linked stories** | **84** | Tests, review, integration, hosted checks and documentation included; no partially delivered parent marked Done |

`CR1-A`, `CR1-B` and `CR5-A` are local proposal labels, not Jira keys. Proposed cards are in [sprint backlog](sprint-backlog.md#proposed-new-stories--16-october). Create linked Jira stories only after the team agrees their scope and classification. Preserve KAN-29's original automatic-assignment history; CR-5 replaces that rule. Reconcile KAN-60 versus reopening KAN-36 so one correction has one estimate. Update KAN-65's future criteria deliberately for Lead authority; do not implement both old coordinator self-assignment and the replacement Lead-only policy.

**Sprint 4 proposal:** complete CR-2 (outage recovery), CR-3 (independent multi-venue arrangements), CR-4 (expiring holds) and CR-6 (Safety Officer review/gate), provisionally 29 SP. Each has a full customer-derived acceptance outline in [change requests](../../requirements/change-requests.md); classification and estimates remain **To agree**. Any genuinely unfinished Sprint 3 work joins Sprint 4's planning explicitly. All 20 original core features are covered by the Sprint 1/2 baseline plus the Sprint 3 proposal; all six customer changes are allocated across these two proposals. This is scope coverage, not proof of implementation or acceptance.

| Sprint 4 candidate | Proposed user story | Provisional SP |
| --- | --- | ---: |
| CR-2 | As Venue Staff, I want to record an outage even when future bookings exist, identify affected arrangements and notify coordinators so they can request replacement venues without losing the event. | 8 |
| CR-3 | As a coordinator, I want to manage several venue arrangements independently for one event so changing/cancelling one does not silently remove the others. | 5 |
| CR-4 | As a coordinator, I want temporary venue holds to have a clear deadline, notification and automatic release so expired holds do not block availability or become confirmed bookings. | 8 |
| CR-6 | As a Safety Officer, I want to review completed venue/technical arrangements and approve, reject or request changes so preparation begins only after safety approval. | 8 |

KAN-64's original trigger matrix is Sprint 3 scope. The new outage/hold/safety triggers are part of the later change stories and reuse that delivery mechanism; they must not be omitted or estimated twice. CR-3 covers missing independent booking actions, not a second implementation of existing multi-row booking creation. KAN-61 readiness/confirmation remains distinct from CR-6 safety approval and the preparation gate.

### Division and integration order

Use the six workstreams above as parallel ownership areas; **names and independent reviewers To agree**. They are not six isolated systems. Confirm shared event states, request/reservation states, API payloads, migration numbers and notification delivery before parallel edits. Choose an integration owner from the same six people; review/testing time is part of their available effort.

1. **16 October, first integration checkpoint:** resolve policy questions and agree contracts; implement narrow event/venue repairs early. Agree the buffer fields/calculation before changing venue consumers. Establish notification persistence/recipient conventions and equipment availability interfaces so other streams can integrate against them.
2. **16–17 October implementation:** deliver UI, API and database behaviour together. Equipment availability feeds review/reservation; reservation and venue readiness feed confirmation; confirmed events enable registration. Cancellation/completion release resources exactly once. Lead assignment controls subsequent access. Each business mutation publishes its agreed notifications only after its result is saved.
3. **17 October acceptance checkpoint:** run the combined checks and hosted scenarios, obtain independent review, merge the tested build and record the actual review/retrospective. A parent is not Done if its required UI, notifications, release behaviour or evidence is still missing. Reforecast unfinished work explicitly rather than increasing estimates or moving dates.
4. **18 October final-sprint planning:** record the meeting live; agree the four remaining changes plus any actual carry-over. Reuse buffers/notifications/change/lifecycle/equipment contracts. Safety review depends on confirmed venue and technical arrangements; holds and outages must agree with buffered availability and independent booking changes.
5. **By 31 October:** target feature acceptance, full regression and Sprint 4 review/retrospective, with recording links retained. Use **1–6 November** for final verification, document/diagram/slide exports, instructor-access checks and submission packaging. Any later defect fix gets its actual date and revalidation; it is not silently counted in Sprint 4 velocity.

### Policy decisions before implementation

**Historical proposal questions, superseded by the selected S3-P01–S3-P09 policies above.** At this initial proposal stage, the following implementation choices were **To agree**, not customer facts or accepted AC changes:

- Confirm the event-state sequence, who may cancel/edit, significant-change boundaries, and confirmation/completion eligibility. CR-6 later adds the safety gate without erasing the original confirmation rules.
- Agree quantity-based equipment availability, overlapping reservation states, review outcomes and whether acceptance creates a reservation atomically. Use shared rules for manual stock changes and affected reservations.
- Select the release notification channel and trigger/recipient matrix. In-app delivery is proposed; email is not required. KAN-64 remains incomplete until all its original trigger groups work, even if the shared delivery component exists earlier.
- Agree buffer limits/defaults, exact boundary semantics and the treatment of already-booked periods after a buffer edit. Propose nonnegative whole minutes, zero for existing venues, and half-open occupied intervals; retain and flag affected existing bookings.
- Agree Lead supervision scope, coordinator selection rules and migration of existing assignments. Propose preserving existing assignments while new submissions enter the Lead queue. Reassignment must revoke access derived solely from the old assignment.
- Confirm registration fields, opening/closing boundaries, withdrawal/re-registration rules and manager-visible personal fields. Registration must enforce the live event/capacity state.

The total of 84 is a broad delivery forecast, not a limit derived from historic velocity or a guarantee. Team estimates and a working integrated build determine the final commitment and actual outcome.

## Selected backlog

| Jira | Story | SP | Owner | Reviewer | Carried? | Depends on |
| --- | --- | ---: | --- | --- | --- | --- |
| KAN-18 | Update operational equipment status | 3 | Arvin | Kai Jie | No | Shared equipment quantity/status contract |
| KAN-9 | Check equipment availability | 8 | Arvin | Kai Jie | No | KAN-18; shared reservation interval/state rules |
| KAN-63 | Submit/review equipment requests | 5 | Arvin | Kai Jie | No | KAN-9, KAN-26; KAN-64 notifications |
| KAN-26 | Reserve equipment | 3 | Arvin | Kai Jie | No | KAN-9; cancellation/completion release contract |
| KAN-6 | Submit event request | 3 | Kai Jie | Tristan | Yes: Sprint 2, full original points | Original ACs and both submission entry points; KAN-79 allocation |
| KAN-34 | Resume/edit draft request | 3 | Kai Jie | Tristan | Yes: Sprint 2, full original points | Original draft ACs and real-date validation |
| KAN-60 | Require event-rejection reason | 2 | Kai Jie | Tristan | No: one existing correction | KAN-36 decision flow; no second repair estimate |
| KAN-61 | Confirm event after arrangements | 3 | Kai Jie | Tristan | No | Venue arrangements, KAN-26; shared readiness rules |
| KAN-62 | Cancel event and release arrangements | 5 | Kai Jie | Tristan | No | KAN-26/venue resources, KAN-64; KAN-17 registration consistency |
| KAN-10 | Complete event | 3 | Kai Jie | Tristan | No | KAN-61; resource release and notifications |
| KAN-14 | Register for an event | 5 | Ernest | Ryan | No | KAN-61 eligible state; atomic registration capacity |
| KAN-17 | Withdraw registration | 2 | Ernest | Ryan | No | KAN-14; owned registration and once-only capacity release |
| KAN-67 | View registrations | 2 | Ernest | Ryan | No | KAN-14; organiser/coordinator access policy |
| KAN-66 | Update event information during planning | 3 | Ernest | Ryan | No | Shared edit-impact rules with KAN-15 |
| KAN-50 | Maintain venue catalogue | 5 | Tristan | Irfan | Yes: Sprint 2, full original points | Original ACs, stale save regression; KAN-77 fields |
| KAN-12 | Search/filter venues | 5 | Tristan | Irfan | Yes: Sprint 2, full original points | Original ACs, strict dates; KAN-78 occupancy |
| KAN-52 | Check venue suitability | 3 | Tristan | Irfan | Yes: Sprint 2, full original points | Original ACs, zero-attendance rule; KAN-78 occupancy |
| KAN-77 | Maintain setup/turnaround durations | 2 | Tristan | Irfan | No: new customer requirement | KAN-50; numbered additive migration |
| KAN-78 | Enforce buffered venue occupancy | 8 | Tristan | Irfan | No: new customer requirement | KAN-77; search/calendar/suitability/request/approval consumers |
| KAN-79 | Lead queue and initial allocation | 8 | Ryan | Arvin | No: replacement customer requirement | KAN-6, auth roles and KAN-64 assignment notifications |
| KAN-65 | Reassign coordinator under Lead authority | 3 | Ryan | Arvin | No | KAN-79 role/queue; current assignment-based access |
| KAN-64 | Workflow notifications | 8 | Irfan | Ernest | No | Shared persisted event/recipient contract; integrations in all streams |
| KAN-15 | Submit and review changes | 5 | Irfan | Ernest | No: revised estimate 2 → 5 | KAN-66 edit routing; venue/equipment impact checks and KAN-64 |

## Tasks

Each owner breaks these work packages into Jira subtasks beneath the corresponding selected parent. Shared tasks are dependencies, not additional story-point totals.

| Owner | Work packages in delivery order | Integration hand-off |
| --- | --- | --- |
| Arvin | Agree shared equipment contracts and migration sequence; maintain operational stock; implement peak overlapping availability; connect request/review and reservation; verify concurrency and lifecycle release; coordinate combined build | Publish equipment availability/reservation/release interfaces to Kai Jie and notification events to Irfan; review Ryan's access changes |
| Kai Jie | Fix both submission feedback paths and draft dates; enforce rejection reason; implement readiness/confirm/cancel/complete transactions; connect resource release and notifications; test repeated/concurrent transitions | Publish event state/readiness rules to Ernest, Irfan and Ryan; test equipment lifecycle with Arvin; review equipment changes |
| Ernest | Implement registration capacity transaction, withdrawal and authorised lists; connect event-state checks; implement ordinary-edit path and significant-change routing; cover role, window and concurrency cases | Agree editable fields and change routing with Irfan; test lifecycle/registration with Kai Jie; review notifications and change requests |
| Tristan | Fix stale venue-save, date and zero-attendance cases; add buffer fields/migration; implement one occupied-interval rule; integrate every venue consumer and existing-booking conflict flag; verify boundary/concurrency cases | Publish interval helper/API data to all venue consumers; coordinate migration with Arvin; review lifecycle changes |
| Ryan | Add Lead role and access mapping; build unassigned queue and initial assignment; replace automatic allocation only with the working queue; add reassignment/oversight; test old/new assignee access and race cases | Publish assigned/unassigned contract to Kai Jie and recipient changes to Irfan; review Ernest's registration/editing access |
| Irfan | Define persisted notification records and recipient/trigger matrix; build authorised inbox/read state and retry/dedup handling; connect all original triggers; implement reviewed significant changes and arrangement rechecks | Give other streams notification interfaces early; distinguish KAN-15 from KAN-66; review venue changes |

### Two-day integration checkpoints

| Checkpoint | Lead / participants | Exit condition |
| --- | --- | --- |
| 16 October, first work block | Arvin coordinates all six owners | Shared event/request/reservation states, API inputs/errors, notification events and additive migration numbers documented; five carry-over regressions reproduced; feature branches created from the same updated main |
| 16 October, before ending focused work | Each owner, Arvin integrates | Narrow repair PRs ready; equipment availability, notification persistence, buffer fields and Lead role/queue contracts usable; consumer branches integrate shared changes and report exact remaining dependencies |
| 17 October, first work block | Arvin with each owner/reviewer pair | Integrated request → Lead allocation → review → venue/equipment planning → confirmation → registration → change/cancel/complete flow works; no duplicate reservations or double resource release |
| 17 October, before review | Independent reviewers and story owners | `npm run check`, coverage, isolated database integration and browser tests pass; real hosted checks and each story's evidence/docs recorded; review comments resolved and tested PRs merged |
| 17 October review/retrospective | Actual attendees/acceptors recorded at the event | Assess each complete parent against ACs/DoD, record actual Done points and carry-over, feedback and actions; do not pre-fill acceptance or attendance |

Arvin owns integration coordination, not other members' standup entries or acceptance decisions. No checkpoint above is recorded as executed until its evidence is captured.

## Decisions and open questions

| Decision / question | Outcome | Logged in decision log? |
| --- | --- | --- |
| Definition of Done agreement details | Prior team agreement to the unchanged checklist was reported on 11 October. Actual agreement date, participants and decision source are **Not recorded**; details will follow. Confirm applicability for Sprint 3. This is a planning input, not a completed planning-meeting decision. | [Definition of Done version history](../definition-of-done.md#version-history) |
| Planning authority and selection | The recorded planning decisions adopted the proposed scope and estimates. Select the 97-SP plan, six owners/reviewers and integration owner above. No separate finalised-on field or invented group vote. | This record; estimation provenance |
| Five outstanding Sprint 2 stories | Carry KAN-6 (3), KAN-34 (3), KAN-50 (5), KAN-12 (5), KAN-52 (3) at full original points for completion/re-verification; current delivered credit 0 for those five. Historical Sprint 2 acceptance/velocity remains Not recorded and the other 24 points are not automatically accepted. Preserve Jira estimates and prior evidence. | Estimate and scope-change logs |
| Rejection reason | Keep KAN-60 as the single 2-SP correction item linked to KAN-36; no duplicate KAN-36 repair points. | Selected backlog |
| KAN-15 estimate | Select 5 SP rather than 2 because reviewed changes include validation, decisions and arrangement effects beyond read-only 2-SP anchors. | [Estimate change log](estimation-and-capacity.md#re-estimates-during-the-sprint) |

## Backlog refinement

Sessions held before or during this sprint to refine stories, ACs, priorities and estimates.

| Date | Who took part | Stories discussed | Changes made (stories, ACs, SP, priority) |
| --- | --- | --- | --- |
| 16 October 2026 | Planning decisions through chat; wider meeting participation Not recorded | All 34 existing parents, five audit gaps, CR-1–CR-6, release deadline and two-day capacity | Initial 84-SP proposal prepared; the subsequent selection totals 97 SP by retaining the five confirmed carry-over stories at full 19 SP. New work/estimates, six owner/reviewer assignments and Sprint 4 allocation are recorded above. No planning-poker votes or team meeting are claimed. |

## Starting evidence

- Jira Sprint 3 (id 67) is **Active**, with configured window 4 October 00:00 to 17 October 23:59, Asia/Singapore; 23 parent items / 97 SP are To Do in the verified 16 October snapshot. The configured start is not a claim that this administrative setup happened on 4 October.
- Jira sprint board screenshot: **Not recorded**. The current API/export snapshot is registered as `S3-E05` in [evidence](evidence/README.md), using its actual capture date. `S3-E01` remains reserved for the missing original sprint-start board; any later board image needs its own dated evidence entry and does not reconstruct the 4 October state.

</details>

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

**Supporting contributions, separate from owned KAN-34 (3 SP) and KAN-78 (8 SP):**

- **12 October preparation:** Arvin’s consultation action list, C4 preparation record and submission runbook are retained as TXT source snapshots in this sprint’s evidence folder. They prepared Sprint 2 closure, Sprint 3 planning, capacity inputs, C4 exports and packaging; they do not establish that meetings occurred, votes were cast, artifacts were independently reviewed or instructor access was delivered. The original worktree remains untouched. Current committed design supersedes those historical C4 snapshots.
- **21 October 02:26:27 Singapore time — shared migrations 008/009:** Arvin authorized the reviewed rollout; Codex executed it from `cf65c05e5d7b91675d74f7281439d0e9c2b1a766`. The retained JSON records both ledger checksums, four columns, two indexes and zero venues with nonzero initial buffers. This is deployment verification, not KAN-64/KAN-77 authorship, hosted functional acceptance or a new team-wide decision. No fixture, booking or cleanup writes were part of that run.
- **21 October — KAN-81 PR #47 review and corrections:** Arvin requested changes, implemented stale 404/409 refresh corrections in `18ac27d`/`30da68a`, updated tests/evidence and then approved the phase-one work while disclosing his own fixes. His follow-up approval is not a second independent review of his corrections. Kai Jie remains KAN-81’s owner at 8 SP. Existing **S3-E20**, the KAN-81 review JSON and 21 October test narrative retain the scope and CI results.

Owned KAN-34/KAN-78 merge, CI and acceptance limits remain in the preceding 25 October reconciliation. Supporting work adds no story points and does not convert other members’ stories to Done.
