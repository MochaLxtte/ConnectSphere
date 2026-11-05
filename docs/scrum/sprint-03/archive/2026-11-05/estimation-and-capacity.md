> Historical source snapshot retained during the 5 November 2026 documentation cleanup. Statements below describe their original dates; use the [current editing page](../../estimation-and-capacity.md) for the supported summary. Original prose and headings are retained; relative links are rebased.

# Sprint 3 estimation and capacity

**Scoped ownership and delivery reconciliation — 25 October 2026.** Arvin owns KAN-34 **3 SP** and KAN-78 **8 SP**. Leo Kai Jie supplied the requested-changes review; Irfan recorded integration approval on PR #48/#54 on 22 October. Leo's later re-review is Not recorded. [The current evidence](../../../../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) records automated main verification, not hosted acceptance or a planning meeting. The last recorded Jira state is In Review (21 October); no new Jira read is claimed. Estimates, sprint scope and dates are unchanged; the historical unassigned rows below are superseded only for these two stories.

**Estimation status:** The current 63-SP allocation is a planning baseline. Team confirmation of relative estimates, capacity and the sprint commitment is **To agree**; no planning-poker vote is recorded. The 10 to 11 SP selection target is guidance, not an individual quota. Keep existing estimates until a team-agreed change is logged.

**Current selected allocation: 13 parent items / 63 SP.** Relative anchors remain KAN-33 and KAN-16 at 2 SP. Points are not hours and equal sprint totals do not demonstrate equal elapsed effort or guaranteed completion.

Scope and estimates follow the recorded planning decisions. Stories are unassigned for team members to choose. Planning votes and meeting attendance are **Not recorded**; see [record preparation](../../../README.md#record-preparation).

**16 October ownership update:** stories are unassigned for team members to choose, targeting roughly **10–11 SP each per sprint / 21 SP across both**. Keep whole estimates and dependencies; choose another member to review. The integration lead is **To agree**. See the [selection rules](../../planning.md#selected-backlog).

## Capacity

| Work pool | Unclaimed SP | Selection target | Capacity record |
| --- | ---: | --- | --- |
| Current sprint | 63 | Roughly 10–11 SP per member across six members | Individual hours and absences Not recorded |
| Sprints 3 and 4 combined | 126 | Roughly 21 SP per member; whole stories | Adjust for dependencies, review and integration effort |

The recorded availability is six people focusing for 16–17 October: 12 planned person-days before allowing for review, integration, tests and documentation. This does not create another two-week capacity window.

Velocity reference: Sprint 1 reported 24 SP; historical Sprint 2 acceptance/velocity is **Not recorded**. No valid two-sprint average is asserted. The 63-point selection is a planned release allocation, not measured velocity. Review the actual prior-sprint outcome before treating it as a forecast supported by delivery evidence.

## Estimation session

| Field | Value |
| --- | --- |
| Recorded date / method | 16 October 2026; chat-based planning and backlog refinement |
| Participants | Relative estimates adopted through the recorded planning decisions; preparation method documented centrally; individual votes Not recorded |
| Planning-poker / disagreement resolution | Not recorded; no six-member vote is claimed |

## Selected estimates

| Jira | Story | SP | Owner | Rationale / estimate history |
| --- | --- | ---: | --- | --- |
| KAN-6 | Submit an Event Request | 3 | Unassigned — team member to choose | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-12 | Search and Filter Venues | 5 | Unassigned — team member to choose | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-34 | Resume/Edit Draft Event Request | 3 | Arvin | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-50 | Maintain Venue Catalog | 5 | Unassigned — team member to choose | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-52 | Check Venue Suitability | 3 | Unassigned — team member to choose | Retain full original carry-over estimate; complete original criteria and specific audit regression. Prior evidence remains historical; no Jira estimate is zeroed. |
| KAN-60 | Require a reason when rejecting an event request | 2 | Unassigned — team member to choose | Retain 2 SP: bounded rejection-reason correction, counted once and linked to KAN-36. |
| KAN-64 | Receive Request, Assignment and Venue Notifications | 5 | Unassigned — team member to choose | Unstarted original 8-SP notification scope split: 5 SP for usable inbox/delivery plus request/assignment/venue integrations; remaining trigger groups move to KAN-80 (3). |
| KAN-65 | Reassign Event Coordinator | 3 | Unassigned — team member to choose | Retain 3 SP: Lead-authorised reassignment, audit, race handling and access revocation; reuse KAN-79. |
| KAN-77 | Configure Venue Setup and Turnaround Durations | 2 | Unassigned — team member to choose | Retain 2 SP: bounded catalogue/persistence extension for two validated buffer settings. |
| KAN-78 | Apply Venue Buffers to Availability and Booking Conflicts | 8 | Arvin | Retain 8 SP: shared interval calculation across venue consumers, existing-booking effects and races. |
| KAN-79 | Assign Submitted Events Through a Coordinator Lead Queue | 8 | Unassigned — team member to choose | Retain 8 SP: replacement submission policy, trusted Lead role, queue, assignment and oversight. |
| KAN-81 | Recover venue arrangements affected by operational unavailability | 8 | Unassigned — team member to choose | 8 SP: extends the 3-SP KAN-55 block and 3-SP KAN-8 decision workflows with affected-booking persistence, recovery links/UI, transactional notifications and approval/outage concurrency. Existing venue search and booking paths are reused; their original implementation is not estimated again. |
| KAN-83 | Manage temporary venue holds with expiry and automatic release | 8 | Unassigned — team member to choose | 8 SP: a new timed reservation state, database clock and replay-safe expiry worker, approval/expiry locking, all availability consumers, UI and transactional notices exceed the 3-SP KAN-8 decision scope while reusing the booking model. |
| **Total** | **13 parent items** | **63** | **Unassigned pool** | **Tests, documentation, independent review and hosted evidence belong to story completion** |

**Point reconciliation:** the earlier Sprint 3 selection was 97 SP. Move 12 existing parents (KAN-9, KAN-10, KAN-14, KAN-15, KAN-17, KAN-18, KAN-26, KAN-61, KAN-62, KAN-63, KAN-66, KAN-67) at **47 SP** to Sprint 4; split unstarted KAN-64's **8 SP** into **KAN-64 5 SP** for request/assignment/venue notifications and **KAN-80 3 SP** for equipment/lifecycle/change/registration notifications; move **KAN-81 / CR-2 8 SP** and **KAN-83 / CR-4 8 SP** forward from the earlier Sprint 4 forecast. Thus Sprint 3 is **97 - 47 - 3 + 16 = 63** and Sprint 4 is **29 + 47 + 3 - 16 = 63**. KAN-64/KAN-80 together retain every original notification obligation; shared delivery is estimated only once. Moving the 12 unstarted stories is scope reallocation, not failed Sprint 3 delivery or a completed-sprint carry-over. No other story estimate is changed by this rebalance.

## Re-estimates during the sprint

| Recorded date | Jira / scope | Previous | Current | Reason / authority |
| --- | --- | --- | --- | --- |
| 16 October 2026 | KAN-15 | 2 SP before earlier selection | 5 SP, retained | Review and arrangement effects exceed read-only anchors; earlier recorded re-estimate retained, not repeated by balancing |
| 16 October 2026 | KAN-64 and KAN-80 | KAN-64 8 SP for all original notifications | KAN-64 5 + KAN-80 3 = 8 | Split unstarted scope along implemented trigger groups so each sprint has independently completable notification acceptance; Recorded backlog reconstruction and balancing |
| 16 October 2026 | Five original carry-over stories | 19 SP original estimates | 19 SP unchanged | No zeroing or partial delivery credit; movement is separate from historical acceptance |

No other estimate changes in this rebalance. Unassigning stories for self-selection and moving sprint membership do not alter relative size. Record further scope/estimate changes with a new dated row.


## Superseded planning records

The following preserved record describes the earlier 97-point selection and 84-point proposal. Its current-status wording, ownership, scope and allocation statements were accurate to those snapshots and are superseded by the 63/63 allocation above. Dated evidence and missing historical facts remain unchanged.

<details>
<summary>Earlier Sprint 3 planning and preparation record (preserved)</summary>

# Sprint 3 estimation and capacity

**Status: selected 97-SP Sprint 3 plan.** Anchors: KAN-33 and KAN-16 = 2 SP. Estimates are relative size, never hours. **16 October 2026 update.** Scope and estimates followed recorded planning decisions; the adopted values below are not planning-poker votes or an independently reported six-member agreement. Earlier proposal text remains as a historical snapshot.

## Capacity

| Member | Available hours | Known absences | Notes |
| --- | ---: | --- | --- |
| Irfan | Not recorded | Not recorded | Two full days reported; see update below |
| Tristan | Not recorded | Not recorded | Two full days reported; see update below |
| Arvin | Not recorded | Not recorded | Two full days reported; see update below |
| Ryan | Not recorded | Not recorded | Two full days reported; see update below |
| Kai Jie | Not recorded | Not recorded | Two full days reported; see update below |
| Ernest | Not recorded | Not recorded | Two full days reported; see update below |

**16 October 2026 — availability update.** All six members intend to focus for two full days, 16–17 October: **12 person-days of planned effort**, before allowing for review, integration, testing and documentation. Daily hours and individual absences are **Not recorded**. No Sprint 3 work was reported as started, and the 4 October planning did not finalise a story selection. The sprint window remains 4–17 October; this update does not create two new weeks of capacity.

Higher delivery is planned in Sprints 3 and 4 because of greater availability. Treat that as a forecast to review against actual completed stories. Keep estimates comparable to the anchors; do not raise points to manufacture a higher velocity. Sprint 4 is the final development sprint, projected for 18–31 October. Submission is Friday 6 November at 23:59, Singapore time (confirmed Week 12 dates). Final verification and submission preparation on 1–6 November is proposed.

Velocity reference: Sprint 1's reported outcome is 24 points; Sprint 2's historical acceptance/velocity is **Not recorded** in the [release burndown](../../../release-burndown.md). The selected 97-SP scope is a release allocation based on the recorded two-day effort commitment, not a measured velocity or hour conversion. The five currently outstanding carry-over stories earn no delivered credit in this disposition; that does not establish which other stories met the DoD on 3 October. Do not substitute current Jira statuses for a verified Sprint 2 velocity.

**15 October preparation:** estimate remaining repair work separately from ordinary full-point carry-over and new/replacement customer requirements. Review the [triage inputs](../../planning.md#pre-planning-baseline-and-defect-triage) before voting. Existing KAN-60 and future KAN-65/KAN-64 must be reconciled with related repair/CR work to avoid duplicate estimates. The 93 estimated points in the current release backlog exclude eight unestimated items and new change estimates; they are not a complete remaining-work estimate. No points or member capacity were assigned by this preparation.

## Estimation session

| Field | Value |
| --- | --- |
| Method | Planning decisions recorded through chat; individual voting was not recorded |
| Participants (who actually estimated) | Proposed values adopted through the recorded planning decisions; individual votes and meeting attendance Not recorded. |
| Planning-poker votes / disagreement resolution | No vote or disagreement-resolution session is claimed; no individual votes have been manufactured |

## Selected estimates

The five outstanding Sprint 2 parents are carried for completion and re-verification at full original points, under the recorded carry-over decision. Their historical Sprint 2 acceptance remains **Not recorded**. This replaces the initial six-point repair allowance; it neither erases previous tests nor asserts that all five failed a recorded 3 October review.

| Jira | Work | Previous estimate / proposal | Selected Sprint 3 SP | Owner | Rationale |
| --- | --- | --- | ---: | --- | --- |
| KAN-9 | Check equipment availability | Jira 8 | 8 | Arvin | Retain current estimate: peak overlapping quantities, exclusions and staff UI |
| KAN-10 | Complete event | Jira 3 | 3 | Kai Jie | Retain: authorised transition with exactly-once resource release |
| KAN-14 | Register for an event | Jira 5 | 5 | Ernest | Retain: attendee UI, eligibility and concurrent capacity protection |
| KAN-15 | Submit and review changes | Jira 2; initial proposal 5 | 5 | Irfan | Review, decision and arrangement impact exceed the 2-SP read-only anchors; change recorded below |
| KAN-17 | Withdraw registration | Jira 2 | 2 | Ernest | One owned transition and once-only place release |
| KAN-18 | Update operational equipment status | Jira 3 | 3 | Arvin | Staff editing with availability/reservation effects |
| KAN-26 | Reserve equipment | Jira 3 | 3 | Arvin | Reuses KAN-9 availability and lifecycle release; do not estimate those algorithms twice |
| KAN-60 | Require rejection reason | Unestimated; initial proposal 2 | 2 | Kai Jie | Bounded correction to UI/API validation, persistence and organiser display; original KAN-36 history remains |
| KAN-61 | Confirm event after arrangements | Unestimated; initial proposal 3 | 3 | Kai Jie | Readiness, authorised transition and display; separate CR-6 safety gate belongs to Sprint 4 |
| KAN-62 | Cancel event and release arrangements | Unestimated; initial proposal 5 | 5 | Kai Jie | Cross-resource transaction with repeated/concurrent action protection |
| KAN-63 | Submit/review equipment requests | Unestimated; initial proposal 5 | 5 | Arvin | Two-role request/review flow reusing KAN-9/KAN-26 |
| KAN-64 | Workflow notifications | Unestimated; initial proposal 8 | 8 | Irfan | Recipient controls, all original triggers, inbox and rollback/retry handling |
| KAN-65 | Reassign under Lead authority | Unestimated; initial proposal 3 | 3 | Ryan | One reassignment action plus access/audit/race rules; role/queue infrastructure in KAN-79 |
| KAN-66 | Ordinary planning edits | Unestimated; initial proposal 3 | 3 | Ernest | Authorised field changes, validation and significant-change routing |
| KAN-67 | View registrations | Unestimated; initial proposal 2 | 2 | Ernest | Authorised list, counts and empty state comparable to KAN-16 |
| KAN-50 | Maintain venue catalogue | Original 5; initial repair allowance 2 | 5 | Tristan | Full original carry-over estimate, including original AC re-verification and stale-save fix |
| KAN-6 | Submit event request | Original 3; initial repair allowance 1 | 3 | Kai Jie | Full original carry-over estimate, including both submission paths and field feedback |
| KAN-34 | Resume/edit draft | Original 3; initial repair allowance 1 | 3 | Kai Jie | Full original carry-over estimate, including draft validation and impossible dates |
| KAN-12 | Search/filter venues | Original 5; initial repair allowance 1 | 5 | Tristan | Full original carry-over estimate, including strict calendar dates and filter correctness |
| KAN-52 | Check venue suitability | Original 3; initial repair allowance 1 | 3 | Tristan | Full original carry-over estimate, including original checks and zero-attendance consistency |
| KAN-77 | Setup/turnaround duration settings | New requirement; initial proposal 2 | 2 | Tristan | Small catalogue/persistence extension |
| KAN-78 | Buffered venue occupancy | New requirement; initial proposal 8 | 8 | Tristan | Shared interval rule across six workflows, existing-booking effects and concurrent writes |
| KAN-79 | Lead role, queue and initial allocation | New requirement; initial proposal 8 | 8 | Ryan | Replacement submission policy plus new role, queue, allocation and oversight; reuses KAN-64 |
| **Total** | **23 items** | **Initial proposal 84; full-point carry-over adds 13** | **97** | **Six owners** | **60 future + 19 carried + 18 new** |

Owner totals: **Arvin 19; Kai Jie 19; Ernest 12; Tristan 23; Ryan 11; Irfan 13**. These reflect cohesive dependency groups, not equal hours or individual velocity. Arvin coordinates integration; independent reviewers are listed in [planning](../../planning.md#selected-scope-and-release-allocation).

The release allocation also reserves **29 SP** for Sprint 4 (CR-2 8, CR-3 5, CR-4 8, CR-6 8), to be reviewed with actual carry-over on 18 October. The 16 October Jira verification confirms all selected estimates: KAN-77 = 2, KAN-78 = 8 and KAN-79 = 8 replace proposal labels CR1-A/CR1-B/CR5-A. All 23 parents are To Do in active Sprint 3 (id 67), totaling 97 SP. Integration, regression, hosted checks and documentation are part of the story work, not additional invented delivery points.

## Story estimates and rationale

**Historical initial proposal.** This section retains the original 84-SP proposal. Current estimates and ownership are in the selected table above; “To agree” in this historical table does not override the recorded selection.

**AI proposal prepared 16 October 2026, not agreed estimates.** The proposal covered the complete remaining release across Sprints 3 and 4 rather than using earlier velocity as a limit. Existing points were checked against all 34 top-level Jira items on 16 October. Proposed values below are relative to KAN-16/KAN-33 (2 SP), not conversions from hours. Team votes, participants, disagreement resolution and final values are **Not recorded / To agree**. No Jira estimate was edited.

| Jira / proposal | Work | Current Jira SP | Proposed Sprint 3 SP | Rationale vs anchors | Agreed SP |
| --- | --- | ---: | ---: | --- | --- |
| KAN-9 | Check equipment availability | 8 | 8 | Retain current estimate: overlapping quantity calculations, exclusions and item-level staff UI | To agree |
| KAN-10 | Complete event | 3 | 3 | Retain: authorised transition and exactly-once resource release | To agree |
| KAN-14 | Register for an event | 5 | 5 | Retain: attendee UI, eligibility and concurrent capacity protection | To agree |
| KAN-15 | Submit and review changes | 2 | 5 | Proposed 2 → 5: review and arrangement impact extend beyond the 2-SP read-only anchors; retain 2 unless the team approves this change | To agree |
| KAN-17 | Withdraw registration | 2 | 2 | Retain: one owned transition and exactly-once place release | To agree |
| KAN-18 | Update operational equipment status | 3 | 3 | Retain: staff editing plus availability/reservation effects | To agree |
| KAN-26 | Reserve equipment | 3 | 3 | Retain assuming KAN-9 provides shared availability and lifecycle stories provide the release actions | To agree |
| KAN-60 / KAN-36 repair, one tracking path | Require rejection reason | Not estimated | 2 | Bounded UI/API validation with persistence and organiser-view regression | To agree |
| KAN-61 | Confirm event after arrangements | Not estimated | 3 | Authorised readiness checks, transition and outcome display; safety gate added in CR-6 | To agree |
| KAN-62 | Cancel event and release arrangements | Not estimated | 5 | Cross-resource transaction and repeated/concurrent-transition protection | To agree |
| KAN-63 | Submit/review equipment requests | Not estimated | 5 | Two roles and request/review UI, reusing KAN-9/KAN-26 rather than counting their algorithms again | To agree |
| KAN-64 | Workflow notifications | Not estimated | 8 | Shared recipient controls and delivery across all original workflow triggers; inbox UI and rollback/retry testing | To agree |
| KAN-65 | Reassign coordinator under the CR-5 Lead policy | Not estimated | 3 | Single reassignment action plus loss/gain of access, audit and concurrency; shared role/queue work sits in CR5-A | To agree |
| KAN-66 | Update event information during planning | Not estimated | 3 | Authorised field edits, validation and significant-change routing | To agree |
| KAN-67 | View registrations | Not estimated | 2 | Closest to the 2-SP status/detail anchors: permitted list, counts and empty state | To agree |
| KAN-50 repair | Prevent stale saves changing the wrong venue editor | 5 (original story) | 2 (repair only) | Bounded async race with component/browser regression | To agree |
| KAN-6 repair | Show submission field feedback | 3 (original story) | 1 (repair only) | Narrow error presentation; both entry points need regression | To agree |
| KAN-34 repair | Reject impossible draft dates | 3 (original story) | 1 (repair only) | Bounded input validation with API/database preservation check | To agree |
| KAN-12 repair | Reject impossible search dates | 5 (original story) | 1 (repair only) | Narrow date-filter validation, reusing agreed date semantics | To agree |
| KAN-52 repair | Handle zero attendance consistently | 3 (original story) | 1 (repair only) | One boundary rule with component/API regression | To agree |
| CR1-A (new Jira key To agree) | Maintain venue setup/turnaround durations | Not created | 2 | Small extension to existing authorised catalogue editor and persistence | To agree |
| CR1-B (new Jira key To agree) | Enforce buffered availability/conflicts | Not created | 8 | Shared interval policy across six workflows, existing-booking impacts and concurrent writes | To agree |
| CR5-A (new Jira key To agree) | Lead role, unassigned queue and initial allocation | Not created | 8 | New role, replacement submission policy, queue, assignment and oversight; reuses KAN-64 notifications | To agree |

**Proposed Sprint 3 total: 84 SP = 60 across the 15 existing future items + 6 for five existing-story repairs + 10 for CR-1 + 8 for new CR-5 work.** The rejection-reason repair is already included in the 60; KAN-65 reassignment is also already included there. Neither is counted again under the repair or CR-5 totals. The 60 includes the proposed KAN-15 increase of 3 points. If that increase is not agreed, the proposal totals 81. Original completed-story estimates remain unchanged; repair points describe only the new repair effort. This is not a sprint commitment, observed velocity or an update to the release burndown.

**Proposed Sprint 4 change estimates:** CR-2 outage recovery 8; CR-3 independent multiple-venue arrangements 5; CR-4 expiring holds 8; CR-6 safety approval 8: **29 SP**, all **To agree**. Existing booking/change/cancellation, notifications, equipment and role infrastructure from the Sprint 3 proposal are dependencies. Integration, acceptance, review, diagrams and evidence belong in the work, not after an item is declared Done. Final whole-system regression and release preparation also need explicit tasks and capacity; no extra delivery points are invented for those tasks.

Before agreeing estimates, settle the policies listed in [planning](../../planning.md#policy-decisions-before-implementation), record each member's vote, and split any item the team estimates above 8. Record an approved KAN-15 change with its actual date and participants in the scope change log; do not overwrite its current Jira value silently.

## Re-estimates during the sprint

Never overwrite an estimate. Log it here and in the daily-progress scope change log.

| Date | Jira | Old SP | New SP | Reason | Agreed by |
| --- | --- | ---: | ---: | --- | --- |
| 16 October 2026 | KAN-15 | 2 | 5 | Reviewed changes include decision flow and arrangement effects beyond the 2-SP read-only anchors; original value retained here | Recorded planning decision; no team vote claimed |
| 16 October 2026 | KAN-6, KAN-34, KAN-50, KAN-12, KAN-52 | 19 original; 6 in initial repair proposal | 19 full carry-over | The five outstanding parents were selected for completion/re-verification at full original points. This is a disposition change from the proposal, not a change to their original Jira estimates. | Confirmed carry-over scope; full-point rule applied |

</details>

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

The 12 October capacity template is preparation, not recorded member availability or estimation votes. KAN-34 remains 3 SP, KAN-78 8 SP; review, rollout and preparation contributions add no separate points. The selected Sprint 3 total remains 63 SP.
