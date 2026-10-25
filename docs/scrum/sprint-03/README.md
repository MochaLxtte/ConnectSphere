# Sprint 3 overview

**Scoped ownership and delivery reconciliation — 25 October 2026.** Arvin owns KAN-34 **3 SP** and KAN-78 **8 SP**. Leo Kai Jie supplied the requested-changes review; Irfan recorded integration approval on PR #48/#54 on 22 October. Leo's later re-review is Not recorded. [The current evidence](../../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) records automated main verification, not hosted acceptance or a planning meeting. The last recorded Jira state is In Review (21 October); no new Jira read is claimed. Estimates, sprint scope and dates are unchanged; the historical unassigned rows below are superseded only for these two stories.

**KAN-65 follow-up — 19 October 2026.** KAN-65 and subtasks KAN-88/89/90 are In Progress / Tristan; the estimate remains 3 SP. Branch `feat/KAN-65-coordinator-reassignment` includes KAN-79 and implements Lead-only reassignment with a required reason, assignment-version checks, atomic audit history and current-assignment permissions. `AUTO-20261019-02` records local verification. KAN-64 notifications, manual/hosted workflow checks, independent review and acceptance remain pending. The earlier KAN-79 dependency notes below describe that earlier implementation stage. This targeted update does not change sprint scope, historical evidence or velocity.

**KAN-79 implementation update — 19 October 2026.** KAN-79 is assigned to Tristan and In Progress in Jira, with subtasks KAN-85/86/87 In Progress. Its 8 SP and Sprint 3 membership are unchanged. The branch implements trusted Lead access, unassigned submission, oversight and initial allocation; automated verification is recorded as `AUTO-20261019-01`. KAN-65/KAN-64 integration, hosted checks, independent review and acceptance remain outstanding. Other stories retain their last dated snapshot; this is a targeted update, not a fresh project-wide export. Sprint 3 remains administratively Active despite its configured 17 October end; this work is recorded on its actual 19 October date and is not counted as delivery by 17 October.

**Estimation status:** The current 63-SP allocation is a planning baseline. Team confirmation of relative estimates, capacity and the sprint commitment is **To agree**; no planning-poker vote is recorded. The 10 to 11 SP selection target is guidance, not an individual quota. Keep existing estimates until a team-agreed change is logged.

**Current release allocation: 13 parent items / 63 SP.** Sprint window: **4–17 October 2026**. Sprint 3 and Sprint 4 each contain 63 SP; this supersedes the earlier 97/29 allocation while keeping 126 SP remaining across the two sprints.

Scope and estimates follow the recorded planning decisions. Stories are unassigned for team members to choose. Planning votes and meeting attendance are **Not recorded**; see [record preparation](../README.md#record-preparation).

| Field | Current value |
| --- | --- |
| Sprint window | 4–17 October 2026 |
| Jira state | Active (id 67); KAN-79 and KAN-65 In Progress on 19 October; acceptance Not assessed |
| Goal | Deliver reliable request review and Lead assignment, then coherent venue planning with buffered availability, expiring holds, outage recovery and relevant notifications. |
| Selected scope | 13 parent items / 63 SP; [story cards](sprint-backlog.md) |
| Unclaimed story pool | 55 SP in the last recorded allocation after KAN-79 (8 SP) was claimed; other ownership not re-audited |
| Independent review | To agree after each owner is chosen; reviewer must be another member; see [planning](planning.md#selected-backlog) |
| Integration owner | To agree; coordinate contracts, migration order and combined verification |
| Actual planning attendance / votes | Not recorded |
| Review / retrospective | Planned 17 October; actual attendance, demonstrated build and outcomes Not recorded |
| Outcome at close | Not assessed; only whole stories meeting ACs and DoD count |
| Submission | 6 November 2026, 23:59 Singapore time; final preparation buffer 1–6 November |

Sprint 3 includes **19 SP** of original carry-over, **10 SP** of existing correction/reassignment/notification scope, and **34 SP** of customer-change stories (CR-1, CR-2, CR-4 and CR-5). The five carry-over estimates remain 3/3/5/5/3; historical Sprint 2 acceptance and velocity remain **Not recorded**. Its original 43-point baseline is unchanged. The relocated equipment/lifecycle/registration/change work is in [Sprint 4](../sprint-04/README.md).

The Week 7 customer changes were received on **2 October 2026**, near Sprint 2's end, with receipt confirmed on 16 October. The plan was to complete the original Sprint 2 scope before considering those changes in Sprint 3 planning. The receipt date is a confirmed project record rather than PDF metadata. The source inspection/preparation was recorded on 15 October and the present Jira/refinement changes on 16 October. Planning on 4 October was reported without a finalised selection; the later record does not claim this scope was committed then. See the [change register](../../requirements/change-requests.md).

**16 October ownership update:** stories are unassigned for team members to choose, targeting roughly **10–11 SP each per sprint / 21 SP across both**. Keep whole estimates and dependencies; choose another member to review. The integration lead is **To agree**. See the [selection rules](planning.md#selected-backlog).

## Records

| Record | Purpose |
| --- | --- |
| [planning](planning.md) | Goal, selection, ownership, dependencies and decisions |
| [estimation and capacity](estimation-and-capacity.md) | Relative estimates, changes and available effort |
| [sprint backlog](sprint-backlog.md) | Full story criteria and acceptance-test plan |
| [daily progress](daily-progress.md) | Own-member Scrum rows, dated changes and observed burndown |
| [review](review.md) | Actual demonstration and acceptance outcome |
| [retrospective](retrospective.md) | Actual member feedback and agreed actions |
| [evidence](evidence/README.md) | Captured artifacts and their limits |

## Superseded planning records

The following preserved record describes the earlier 97-point selection and 84-point proposal. Its current-status wording, ownership, scope and allocation statements were accurate to those snapshots and are superseded by the 63/63 allocation above. Dated evidence and missing historical facts remain unchanged.

<details>
<summary>Earlier Sprint 3 planning and preparation record (preserved)</summary>

# Sprint 3 overview

**Selected plan: 97 SP across 23 items, sprint 4–17 October 2026.** Complete the original event journey, five outstanding carry-over stories, venue buffers and Coordinator Lead allocation. **16 October 2026 update.** Scope, estimates, ownership and implementation defaults followed the recorded planning decisions. No team vote, completion result or earlier finalisation is implied.

The selected scope consists of **60 SP across 15 existing future items + 19 SP across five full-point carry-over stories + 18 SP across three new customer-change stories**. KAN-6 (3), KAN-34 (3), KAN-50 (5), KAN-12 (5) and KAN-52 (3) retain their full original estimates for current completion and re-verification. They earn no delivered credit in the current Sprint 2 disposition; historical Sprint 2 acceptance/velocity remains **Not recorded**. The initial 84-SP proposal below used smaller repair allowances and is superseded by this selection.

| Current field | Value |
| --- | --- |
| Sprint window | 4–17 October 2026 |
| Goal | Complete request-to-planning-to-registration-to-completion/cancellation, with venue buffers and Lead-controlled allocation, ready for remaining Sprint 4 changes |
| Selected scope | 97 SP / 23 items; individual [story cards and acceptance plan](sprint-backlog.md) |
| Ownership / review | Arvin 19 (Kai Jie reviews); Kai Jie 19 (Tristan); Ernest 12 (Ryan); Tristan 23 (Irfan); Ryan 11 (Arvin); Irfan 13 (Ernest) |
| Integration | Arvin coordinates shared contracts, migration ordering and combined build; [two-day checkpoints](planning.md#two-day-integration-checkpoints) |
| Decision method | Recorded planning decisions; individual votes and meeting attendance Not recorded |
| Jira setup and starting evidence | Sprint 3 id 67 verified Active; 23 parents / 97 SP all To Do. Window configured 4 October 00:00 to 17 October 23:59 Singapore time; board image Not recorded. |
| Review / retrospective | Scheduled 17 October; actual attendance, acceptance and outcomes Not recorded |
| Outcome at close | Not assessed; parent stories count only when complete against ACs and DoD |
| Next release allocation | Sprint 4, 18–31 October: four remaining changes, 29 SP forecast plus actual carry-over; submission 6 November at 23:59 Singapore time |

See [planning](planning.md#selected-scope-and-release-allocation) for dependencies, tasks, policy choices and independent reviewers, and [selected estimates](estimation-and-capacity.md#selected-estimates) for the point accounting and rationale. KAN-77 (2), KAN-78 (8) and KAN-79 (8) are the created buffer-configuration, buffered-occupancy and Lead-queue stories. Sprint 2 was administratively closed on 16 October at 02:06 Singapore time, with five outstanding parents moved into Sprint 3. This does not establish a historical review outcome. Application work and acceptance checks remain to be executed. Mark evidence gaps as **Not recorded**, **To agree**, **Not executed** or **Not assessed**.

## Preparation history

The dated notes and table below retain the earlier proposal state; the current plan above takes precedence.

**16 October 2026 update.** Sprint 3 started on 4 October and is scheduled to end on 17 October. Planning took place on 4 October but did not finalise scope; No Sprint 3 work was reported as started and the six members will focus for 16–17 October. Original meeting participants, notes and decisions are **Not recorded**. Current [scope refinement](planning.md) is dated 16 October. Sprint 4 will be the final development sprint, projected for 18–31 October; submission is Friday 6 November at 23:59, Singapore time.

**15 October 2026 preparation.** Sprint 3 has not been created in the checked Jira board and no planning outcome is recorded. [Planning inputs](planning.md#pre-planning-baseline-and-defect-triage) distinguish unfinished original work, repair candidates, existing future stories and the six customer changes. This folder is prepared for the meeting; it is not evidence that the meeting took place.

| Field | Value |
| --- | --- |
| Dates (start Sunday – end Saturday) | 4–17 October 2026; actual start and scheduled end confirmed on 16 October |
| Sprint goal | Proposed: complete the original event journey with venue buffers and Lead-controlled allocation, ready for remaining Sprint 4 changes; To agree |
| Committed scope | Not finalised at 4 October planning, according to the confirmed planning record; current selection To agree. Record new, carried and reopened repair work separately. |
| Planning recorded by | Not recorded |
| Outcome at close | Not assessed; record actual whole-story outcome at close |

**Current proposal:** [84 provisional Sprint 3 points](planning.md#proposed-scope-and-release-split--16-october), with [existing and new user-story candidates](sprint-backlog.md). Sprint 4 is proposed to cover the remaining four customer changes at 29 provisional points. Team estimates, owners/reviewers and final selection are **To agree**; none of these proposed values is recorded as velocity or an agreed commitment.

## Records

| Record | Purpose | Who updates |
| --- | --- | --- |
| [planning.md](planning.md) | Goal, selected stories, tasks, owners, dependencies; backlog refinement | Any one member |
| [estimation-and-capacity.md](estimation-and-capacity.md) | Points, rationale, capacity, velocity | Any one member |
| [sprint-backlog.md](sprint-backlog.md) | Story cards, ACs, `S3-Txx` acceptance tests | Story owners |
| [daily-progress.md](daily-progress.md) | Daily Scrums, scope changes, burndown data | Everyone (own rows) + any one member (burndown) |
| [review.md](review.md) | Demo and acceptance outcome | Any one member |
| [retrospective.md](retrospective.md) | Went well / to improve, actions | Everyone (own feedback) + any one member |
| [evidence/README.md](evidence/README.md) | Index of screenshots, exports, CI runs | Whoever captures it |

</details>

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

**Supporting contributions, separate from owned KAN-34 (3 SP) and KAN-78 (8 SP):**

- **12 October preparation:** Arvin’s consultation action list, C4 preparation record and submission runbook are retained as TXT source snapshots in this sprint’s evidence folder. They prepared Sprint 2 closure, Sprint 3 planning, capacity inputs, C4 exports and packaging; they do not establish that meetings occurred, votes were cast, artifacts were independently reviewed or instructor access was delivered. The original worktree remains untouched. Current committed design supersedes those historical C4 snapshots.
- **21 October 02:26:27 Singapore time — shared migrations 008/009:** Arvin authorized the reviewed rollout; Codex executed it from `cf65c05e5d7b91675d74f7281439d0e9c2b1a766`. The retained JSON records both ledger checksums, four columns, two indexes and zero venues with nonzero initial buffers. This is deployment verification, not KAN-64/KAN-77 authorship, hosted functional acceptance or a new team-wide decision. No fixture, booking or cleanup writes were part of that run.
- **21 October — KAN-81 PR #47 review and corrections:** Arvin requested changes, implemented stale 404/409 refresh corrections in `18ac27d`/`30da68a`, updated tests/evidence and then approved the phase-one work while disclosing his own fixes. His follow-up approval is not a second independent review of his corrections. Kai Jie remains KAN-81’s owner at 8 SP. Existing **S3-E20**, the KAN-81 review JSON and 21 October test narrative retain the scope and CI results.

Owned KAN-34/KAN-78 merge, CI and acceptance limits remain in the preceding 25 October reconciliation. Supporting work adds no story points and does not convert other members’ stories to Done.
