# Customer change requests

**CR-5 reassignment follow-up — 19 October 2026.** KAN-65 now integrates with KAN-79 on `feat/KAN-65-coordinator-reassignment`. Lead-only handover preserves decisions/arrangements, records a reason and prior/new assignment atomically, rejects stale versions and changes current-assignment permissions. Local evidence: [AUTO-20261019-02](../testing/test-evidence.md#19-october-2026--kan-65-coordinator-reassignment). KAN-64 notifications and manual/hosted acceptance remain pending. Migration 007 and Lead login were user-reported as working; no new migration was required or applied. This supersedes the earlier pending-KAN-65 implementation note, without changing the 2 October customer-change receipt, historical KAN-29 rule or existing 3-SP estimate.

**CR-5 implementation update — 19 October 2026.** KAN-79 now has a locally tested implementation on `feat/KAN-79-lead-assignment`: new submissions remain unassigned; trusted Leads allocate available coordinators and oversee active requests. Existing assignments and historical KAN-29 records remain intact. Migration 007, backend policy and frontend controls form one rollout unit. This is branch delivery preparation, not shared deployment or acceptance. KAN-65 reassignment and KAN-64 notifications are still pending under AC9. See [AUTO-20261019-01](../testing/test-evidence.md#19-october-2026--kan-79-lead-allocation) and the [hosted guide](../testing/README.md#kan-79-hosted-verification). Receipt on 2 October and the dated planning/history below remain unchanged; no scope or point increase is recorded.

## Reading historical and current requirements — 17 October 2026

The original Sprint 1/2 cards remain the baseline for work and evidence from those sprints. The changes received on **2 October** are traced below to new or refined Sprint 3/4 stories. A later requirement does not retrospectively change an earlier acceptance decision, and receiving/planning a change does not establish that it is implemented. Apply the revised operational rule when its integrated implementation is deployed; retain the original tests as regression checks except where the change explicitly supersedes their expected behaviour.

In particular, original automatic assignment (KAN-29) differs intentionally from the later Lead queue (CR-5/KAN-79); original event-only venue intervals differ intentionally from buffered occupancy (CR-1/KAN-77/78). The map below also records outage recovery, independent venue arrangements, temporary holds and safety review. These are documented requirement changes, not synchronization errors.

The 17 October reconciliation restores two unchanged planning safeguards to the repository: a search with no matching venue and an unsuitable venue assessment must not automatically reject the event. They existed in the 21 September Jira source and remain valid after the Week 7 changes. **KAN-12-AC102** and **KAN-52-AC102** identify them on current repository cards. This is a wording/traceability correction with **zero scope or point increase**, not a seventh customer change. The live Jira descriptions currently omit these sentences; the retained CSV remains an accurate source snapshot rather than being silently edited to look aligned.

Register of customer changes to the original brief. Process follows the course's *Managing Changes – A Guide* (Week 7) and [AGENTS.md §5.9](../../AGENTS.md#59-customer-change-eg-week-7-changes-team-decides).

## Release reconstruction and balanced allocation — 16 October 2026

**Record updated 16 October 2026.** The Release 1 backlog incorporates all customer changes and balances work between Sprints 3 and 4. The adopted allocation is **63 SP in each sprint (126 remaining)**. The earlier **97 / 29** selection is preserved below as superseded history. Individual member votes and independent team approval are **Not recorded**; these are delegated planning decisions, not customer approval of implementation defaults.

**Ownership update — 16 October 2026.** All 28 unfinished parent items are now unassigned in Jira. Team members will choose their own stories; independent reviewers and the integration lead are **To agree** after ownership is chosen. The scope remains **63 SP per sprint**, averaging **10.5 SP per member per sprint** and **21 SP per member across both**. Aim for roughly 10–11 SP each, retaining whole estimates and dependency order rather than forcing an exact split. Earlier named allocations are historical. Claim a Jira card and sync its sprint record before starting work.

### Source and decision chronology

| Event | Date | Evidence and effect |
| --- | --- | --- |
| Team received the six Week 7 customer changes | **2 October 2026** | Tristan confirmed this in chat on **16 October**. The team intended to finish Sprint 2 against its original scope and consider changes during Sprint 3 planning. Source content: `Week 7 Customer Changes.pdf`, pp. 1–2. The PDF itself does not print a receipt date; no announcement capture is claimed. |
| Sprint 2 planned boundary | 3 October 2026 | Preserve original **43 SP (35 new + 8 carry-over)** and original criteria. Customer changes are not retroactive original defects or new Sprint 2 commitments. Historical acceptance remains separately evidenced. |
| Sprint 3 planning/start | 4 October 2026 | Date reported by Tristan; he reported scope was not finalised then. Do not present the later allocation as a recorded 4 October finalisation. |
| Repository source inspection / impact assessment | 15 October 2026 | Dated source hashes and assessment in [assumptions and questions](assumptions-and-questions.md); not the customer receipt date. |
| Initial delegated selection and later rebalance | 16 October 2026 | Initial 97/29 selection followed by full reconstruction and 63/63 allocation requested by Tristan. Current Jira snapshot and exports retain actual edit timestamps. |

### Current change-to-backlog and sprint map

| CR / source | Classification and original baseline | Current Jira / active criteria | SP | Sprint | Original regression / superseded rule |
| --- | --- | --- | ---: | --- | --- |
| CR-1, p.1 item1 | New venue buffers | KAN-77 AC1–6; KAN-78 AC1–8 | 10 | 3 | Preserve KAN-50/51/12/52/53/8/54/55 access, associations and atomicity; extend event-only intervals to buffered occupancy. |
| CR-2, p.1 item2 | New recovery workflow | KAN-81 AC1–12 | 8 | 3 | KAN-55's refusal of an outage overlapping approved bookings is prospectively replaced; retain original history and unrelated arrangements. |
| CR-3, p.1 item3 | New independent arrangement actions using existing multi-booking creation | KAN-82 AC1–12 | 5 | 4 | Preserve KAN-53/8 creation/decisions; new per-arrangement cancel/replacement must isolate other venues, distinct from KAN-15/62 event-wide actions. |
| CR-4, p.2 item4 | New timed hold lifecycle | KAN-83 AC1–12 | 8 | 3 | Ordinary PENDING remains non-reserving; only an explicit live hold reserves. Preserve KAN-8/54 decision/conflict protections. |
| CR-5, p.2 item5 | Replacement initial assignment plus refined existing reassignment | KAN-79 AC1–10; KAN-65 original AC1–8 plus AC101–104 | 8 new; KAN-65 existing 3 counted once | 3 | Preserve historical KAN-29 automatic allocation criteria; new submissions enter Lead queue. Lead-only assignment replaces coordinator self/other assignment when deployed. |
| CR-6, p.2 item6 | New trusted role and revision-bound safety/preparation gate | KAN-84 AC1–12 | 8 | 4 | Safety is distinct from KAN-36 initial approval and KAN-52 advisory suitability; preserve original checks, add readiness, review and invalidation. |
| **Total new customer scope** | **All six required in Release 1** | **Seven new customer-change stories** | **47** | **34 in S3; 13 in S4** | **No original story points counted twice** |

Full Jira wording, numbered criteria, owners/reviewers, cases and current selection are in the [Sprint 3 backlog](../scrum/sprint-03/sprint-backlog.md) and [Sprint 4 backlog](../scrum/sprint-04/sprint-backlog.md). Jira has explicit related/blocks links. New customer stories are To Do; no implementation, test pass or acceptance is claimed. Original unfinished KAN-6/34/50/12/52 retain **19 SP**, and KAN-60 remains the separate **2-SP** pre-Week-7 correction.

### Original notification scope split (not a new customer requirement)

KAN-64's original **8-SP** full scope becomes **KAN-64 5 SP (S3)** plus **KAN-80 3 SP (S4)**. This is decomposition before implementation, not partial delivery or zero-point carry-over. The complete original description remains archived in Jira and the prior sprint specification. New KAN-64 criteria use **AC201–209**, preventing old IDs from silently acquiring new meanings.

| Original KAN-64 criteria | KAN-64 active responsibility | KAN-80 active responsibility |
| --- | --- | --- |
| AC1, AC2 | Request submission/clarification/amendment/review and assignment/reassignment, AC201–202 | None transferred |
| AC3 | Venue decisions, AC203 | Equipment and significant arrangement changes, AC1–2 |
| AC4, AC5 | None retained | Confirmation/cancellation, registration/withdrawal, attendee-relevant changes, AC2–4 |
| AC6–9 | Correct/actionable records, recipient authorization, atomic outcomes, in-app channel, AC204–207 | Same protections for added trigger groups, AC5–7 |
| AC101–102 | Complete inbox/read-state and reusable transaction/deduplication, AC204/207 | Reuse and verify added integrations, AC6–7 |
| AC103–105 | Request/assignment/venue matrix, actor acknowledgements and safe links, AC201–208 | Later-workflow matrix, same safeguards, AC1–8 |
| AC106 | CR-2/4/6 new triggers stay in their own stories, AC209 | Same no-double-count boundary, AC9 |

Five points cover a usable shared inbox, authorization, persistence/deduplication and the request/venue integrations. Three points cover remaining trigger/recipient integrations reusing it. Every original trigger remains assigned. CR-specific outage/hold/safety notices are estimated in KAN-81/83/84; independent arrangement-action notices are in KAN-82. Do not mark a story Done with a missing required trigger merely because the other half is planned later.

### Design and test impact (planned work)

| Change | Planned design/contracts/data work | Required new checks plus original regression |
| --- | --- | --- |
| CR-1 | Additive duration fields; shared half-open buffered interval calculation; catalogue, search/calendar/suitability/booking contracts and diagrams | Zero/max/invalid buffers, exact adjacency, operating hours/blocks, existing affected bookings, concurrent approvals; preserve authorization and catalogue field saves |
| CR-2 | Outage-impact/recovery links, venue locking, protected recovery view, linked replacement, shared venue-readiness predicate | Multiple affected bookings/holds, unchanged event/other venues, correct current recipient, failed replacement, approval/outage race and replay; later lifecycle/safety stories consume the readiness predicate |
| CR-3 | Per-arrangement actions/replacement links and aggregate display; cancellation/readiness/safety invalidation | Two-venue isolation, cancel-and-resubmit failure, approved/held states, reassignment and concurrent cancellation; parent fields stay unchanged |
| CR-4 | Additive hold state/deadline and constraint updates, explicit staff hold/release, expiry-aware reads, deployed restart-safe scheduler | Before/at/after deadline, worker downtime/replay, approval/expiry race, current recipients, no auto-confirmation; ordinary pending still does not reserve |
| CR-5 | Trusted Lead role, queue/oversight, submission and assignment API/UI, audit/access rules | No-coordinator submission, old and new assignment access, self-grant denial, concurrent assignment; preserve prior records and deploy queue with changed submission policy |
| CR-6 | Trusted Safety Officer, review rounds/revision, preparation phase and readiness/invalidation contracts | Three outcomes, missing arrangements, stale decision versus changed revision, request-changes resubmission, preparation gate and notifications; no automatic cancellation/approval |

Operational defaults are explicit in each Jira card and sprint policy record, distinct from customer quotations. Implementers must update the API/data model/C4/class/sequence diagrams and re-export them with code; this planning update does not claim those designs or migrations already exist. [Traceability](traceability.csv) and [functional cases](../testing/test-cases.csv) allocate each active criterion; planned new cases are **Not executed**, and eventual actual runs go in [test evidence](../testing/test-evidence.md).

**Test-record format update — 21 October 2026.** The case register now holds reusable specifications;
case outcomes and unperformed-test placeholders are in [test-executions.csv](../testing/test-executions.csv).
Append a record for each evidenced case attempt and retain run-level details in
[test-evidence.md](../testing/test-evidence.md). Original and revised requirement versions remain
distinct; this format change supplies no new customer-change implementation or acceptance result.

### Estimate and release effect

Current Jira scope is **174 SP**: **127 estimated original-scope points + 47 customer-change points**. Of this, **48 SP are current administrative Done**, **63 are assigned S3** and **63 assigned S4**. These are inventory/plan totals, not historical velocity. The earlier 145-point Jira inventory plus 29-point forecast already totalled 174: creating KAN-81/82/83/84 turns that forecast into real cards, without adding another 29 to the release total. KAN-64's 8→5 plus KAN-80's 3 nets zero. The earlier KAN-15 2→5 revision remains explicitly recorded; carry-over never increases release scope again. See [release accounting](../scrum/release-burndown.md).

Rebalance arithmetic: **S3 97 − 47 moved existing work − 3 notification scope + 16 outage/hold work = 63**; **S4 47 + 3 notification scope + 5 independent venues + 8 safety = 63**. The [current evidence snapshot](../scrum/sprint-03/evidence/jira-rebalanced-state-2026-10-16.json) records the verified administration; it is not a screenshot of the original sprint-start board.

## Earlier delegated disposition — 16 October 2026 (superseded allocation)

**Decision method:** Tristan delegated planning, estimates, ownership and policy choices to Codex in chat. These selections supersede the preparation statements below; they do not claim a team vote or customer approval of implementation defaults. Original customer wording remains the source requirement.

| CR | Classification | Current Jira / estimate | Release allocation |
| --- | --- | --- | --- |
| CR-1 | Additional requirement | KAN-77 (2 SP) + KAN-78 (8 SP) | Selected Sprint 3; Tristan, reviewer Irfan |
| CR-2 | Revised workflow / additional requirement | Jira story and final refinement **To agree**; forecast 8 SP | Sprint 4 forecast; Tristan |
| CR-3 | Extension to independent venue arrangements | Jira story and final refinement **To agree**; forecast 5 SP | Sprint 4 forecast; Ryan |
| CR-4 | Additional hold lifecycle | Jira story and final refinement **To agree**; forecast 8 SP | Sprint 4 forecast; Arvin |
| CR-5 | Replacement assignment requirement | KAN-79 (8 SP); existing KAN-65 (3 SP) counted once in original backlog | Selected Sprint 3; Ryan, reviewer Arvin |
| CR-6 | Additional role and safety gate | Jira story and final refinement **To agree**; forecast 8 SP | Sprint 4 forecast; Kai Jie |

**CR-1 handling:** Jira KAN-77/78 are linked to each other and affected venue stories. Their full ACs and validation plans are in the [Sprint 3 backlog](../scrum/sprint-03/sprint-backlog.md). Durations are whole minutes 0–1440, zero for existing venues; effective occupancy is [start−setup, end+turnaround). Current buffers apply to non-ended bookings; retain and flag affected existing bookings. Pending requests still do not reserve until CR-4. Preserve simultaneous edits to unrelated catalogue fields; new buffer fields reject conflicting stale saves without changing KAN-50's other-field policy. New migrations, API fields, shared interval calculator, catalogue/calendar/search/suitability/booking UI and diagrams are **planned**, not implemented. Original permissions, field preservation, association and conflict atomicity must be re-tested alongside new zero/boundary/overlap/operational-block cases. Execution **Not executed**. Release scope adds **10 SP**.

**CR-5 handling:** Jira KAN-79 links KAN-29/25/6/65/64. New submissions remain unassigned and only trusted Leads allocate available coordinators; existing assignments are preserved. Single-deployment oversight and event-related authorization are explicit. Lead access does not grant coordinator decision, venue-staff or attendee-roster powers. KAN-65 becomes Lead-only reassignment, with reason, concurrency protection and immediate old-assignee access removal. This supersedes the original automatic initial allocation and coordinator self/manual-assignment policy **when the integrated feature is deployed**, not retrospectively. Role migration, queue, API authorization, submission transaction, audit and notification designs are planned; original data retention/decision restrictions still require regression. Execution **Not executed**. Release scope adds **8 SP**; KAN-65 and KAN-64 are not added twice.

The [estimation record](../scrum/sprint-03/estimation-and-capacity.md) explains 2/8/8 SP against existing anchors and records KAN-15's 2→5 change separately. [Release accounting](../scrum/release-burndown.md) records 145 current Jira SP plus 29 forecast, without converting administrative Done into historical velocity. All new test specifications remain **Not executed**, and design/implementation acceptance remains **Not assessed**.

### Preserved preparation record

The source assessment below describes preparation before delegated selection. Its CR-1/CR-5 “To agree” statements are superseded by the current disposition above. Remaining Sprint 4 details still require refinement.

**Prepared 15 October 2026.** The source requirements and implementation differences below are planning inputs, not decisions made at a meeting. Classification, Jira breakdown, estimates, owners and sprint selection are **To agree**. No Jira issues, estimates, acceptance outcomes or original criteria were changed by this preparation.

Sources inspected: `Week 7 Customer Changes.pdf`, pages 1–2, and `Week 7 Guide to Managing Changes.pdf`, pages 1–3, in the team's course materials. The customer requires all six changes in Release 1 and anticipates no further Release 1 changes. This does not imply all six have already been selected for Sprint 3.

**16 October scope proposal:** put CR-1 (two linked new stories, proposed 2 + 8 SP) and CR-5 (new Lead queue/initial assignment story, proposed 8 SP, plus existing KAN-65 reassignment) in Sprint 3. Propose CR-2/CR-3/CR-4/CR-6 for Sprint 4 at 8/5/8/8 SP. These are AI estimates and proposed allocations, not agreed points, classifications or Jira changes. See [Sprint 3 proposal and complete release split](../scrum/sprint-03/planning.md#proposed-scope-and-release-split--16-october) and [draft new story cards](../scrum/sprint-03/sprint-backlog.md#proposed-new-stories--16-october). Original notifications are estimated once in KAN-64; later change stories include their additional trigger/recipient integration. Preserve original rules and record superseding criteria with the actual agreement date.

## Baseline and change classification

Use the [Sprint 2 baseline](../scrum/sprint-02/review.md) and [15 October audit](../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) before revising a story. Preserve original criterion IDs and dated acceptance evidence; label later criteria with their source and date.

| Finding | Treatment for planning | Point accounting |
| --- | --- | --- |
| Original work was never completed | Carry the original story; record the actual unfinished criteria | Retain its full original points under the team's carry-over rule |
| An original criterion in previously accepted work was missed or is broken | Reopen the original story and record the defect against that criterion | Estimate only the remaining repair work; retain the old estimate and outcome in history |
| Customer requests additional or replacement behaviour | Propose a new linked story and explicitly identify any superseded rule | Estimate the additional work separately; do not relabel it as an original defect |
| Customer clarifies an existing rule | Record the clarification and update affected criteria, tests and contracts | Re-estimate only if understanding materially changes; record the decision |

The course guide also permits estimating remaining work for an incomplete item; the team's current rule keeps full original points on ordinary carry-over. Any change to that convention needs an explicit team decision, not a silent rewrite. The guide's missed-criterion and mixed-change examples support keeping a defect and a new requirement distinct.

The existing KAN-60 rejection-reason correction predates Week 7. Resolve its relationship to KAN-36 before reopening or creating work, so the same repair is not counted twice. The [Sprint 3 defect triage](../scrum/sprint-03/planning.md#pre-planning-baseline-and-defect-triage) is separate from CR-1–CR-6.

## Preparation summary — historical

| CR | Change | Type (new / clarification / correction) | Affected existing stories | New stories (KAN) | SP | Target sprint | Status |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| CR-1 | Venue setup and turnaround time | To agree | KAN-50, KAN-51, KAN-12, KAN-52, KAN-53, KAN-8, KAN-54, KAN-55 | To agree | To agree | To agree | Source reviewed; acceptance Not assessed |
| CR-2 | Venue becomes unavailable after booking | To agree | KAN-55, KAN-51, KAN-53, KAN-8, KAN-54; future KAN-64 | To agree | To agree | To agree | Source reviewed; acceptance Not assessed |
| CR-3 | Multiple venues for one event | To agree | KAN-53, KAN-8, KAN-51, KAN-52, KAN-54; future KAN-15, KAN-62 | To agree | To agree | To agree | Source reviewed; acceptance Not assessed |
| CR-4 | Tentative venue holds expire | To agree | KAN-53, KAN-8, KAN-51, KAN-54; future KAN-64 | To agree | To agree | To agree | Source reviewed; acceptance Not assessed |
| CR-5 | Event Coordinator Lead role and assignment queue | To agree | KAN-25, KAN-6, KAN-29, KAN-33; future KAN-65, KAN-64 | To agree | To agree | To agree | Source reviewed; acceptance Not assessed |
| CR-6 | Safety Officer and operational feasibility check | To agree | KAN-25, KAN-16; future KAN-61, KAN-63, KAN-26, KAN-15 | To agree | To agree | To agree | Source reviewed; acceptance Not assessed |

## CR-1 — Venue setup and turnaround time

1. **Requested change / baseline:** each venue needs configurable preparation and reset durations. Availability and conflict checks must include both buffers; existing affected bookings must be identified, not silently removed. Current pre-change checks use the booking interval without buffers and allow exact adjacency. Source: customer changes, page 1, item 1. Proposed classification: additional requirement; **To agree**.
2. **Backlog impact:** linked new work for venue configuration and shared availability/conflict behaviour; affected stories are listed above. Jira keys and decomposition: **To agree**.
3. **Candidate acceptance checks:** authorised Venue Staff maintain the two durations; a 10:00–12:00 event with 30-minute setup and 45-minute turnaround occupies 09:30–12:45; search, calendar, suitability, submission and approval agree on the effective interval; existing problematic bookings are flagged without deletion. Valid duration limits and the treatment of later buffer edits are **To agree**. Existing role, association and transactional-conflict criteria still require regression checks.
4. **Estimates:** **To agree** at refinement; record votes and rationale in the Sprint 3 estimation record.
5. **Design impact:** venue data model/migration, API fields, shared interval calculation and booking sequence diagrams require assessment; implementation/design changes **Not assessed**.
6. **Tests:** plan normal/zero-buffer/boundary/overlap cases, operational-block interaction, existing-booking detection and concurrent submission/approval. Execution **Not executed**.
7. **Release scope:** added points **To agree**; no burndown increase entered yet.

## CR-2 — Venue becomes unavailable after booking

1. **Requested change / baseline:** Venue Staff can record operational unavailability even when future bookings exist. Identify affected arrangements, inform the responsible coordinators, preserve the event and enable replacement-venue requests. Current block creation refuses an overlap with an approved booking. Source: page 1, item 2. Proposed classification: revised workflow/additional requirement; **To agree**.
2. **Backlog impact:** link recovery work to KAN-55 and booking stories; coordinate notifications with existing future KAN-64. Do not create a duplicate notification feature. Jira breakdown **To agree**.
3. **Candidate acceptance checks:** an authorised staff member records the outage and reason; affected bookings and coordinators are identified; the event is not automatically cancelled or its information lost; replacement search/request is possible; unrelated arrangements remain intact. Exact affected-booking states, replacement links and notification delivery rules are **To agree**.
4. **Estimates:** **To agree**; assess recovery, notification and concurrency dependencies separately.
5. **Design impact:** block/booking state relationship, recovery API, notification integration, data model and sequence diagrams **Not assessed**.
6. **Tests:** plan outages over one/multiple bookings, unaffected periods, correct recipients, replacement flow and concurrent approval/outage. Original access and conflict protections require regression. Execution **Not executed**.
7. **Release scope:** added points **To agree**; keep any original KAN-55 defect distinct from this changed customer rule.

**Implementation progress — 21 October 2026.** KAN-81 phase 1 replaces KAN-55's refusal of an outage over approved bookings, flags the affected arrangements in a new `venue_outage_impacts` table and gives Venue Staff a recovery view. Coordinator notification (phase 2) and linked replacements (phase 3) follow. See the [phase 1 decisions](assumptions-and-questions.md#21-october-2026--kan-81-phase-1-outage-recovery-decisions). Acceptance is Not assessed.

## CR-3 — Multiple venues for one event

1. **Requested change / baseline:** one event can use multiple venues; each arrangement is checked independently and changing/cancelling one must not implicitly remove others. Multiple booking rows already exist, so this is not a claim that all supporting code is absent. Independent cancellation/change behaviour is not established by the existing creation flow. Source: page 1, item 3. Classification of the gap **To agree** after comparing existing criteria.
2. **Backlog impact:** assess reusable KAN-53/KAN-8 functionality and future KAN-15/KAN-62; define only the missing acceptance scope. Jira breakdown **To agree**.
3. **Candidate acceptance checks:** an authorised coordinator requests several venues for the same event; suitability, availability and conflicts are evaluated per venue; each saved booking stays linked to that event; changing or cancelling one arrangement preserves unrelated bookings unless explicitly requested. Per-venue timing and event-wide cancellation semantics are **To agree**.
4. **Estimates:** **To agree** after the existing multi-booking path is assessed; do not estimate existing functionality as wholly new work.
5. **Design impact:** arrangement identity, per-booking actions, aggregate event display, API and change/cancellation sequences **Not assessed**.
6. **Tests:** plan same-event multi-venue creation, independent decisions, one-venue conflicts and change/cancellation isolation, plus ownership checks. Execution **Not executed** for the new requirements.
7. **Release scope:** added points **To agree**; avoid double-counting unchanged booking stories.

## CR-4 — Tentative venue holds expire

1. **Requested change / baseline:** temporary holds need an expiry; an unmet deadline releases availability, informs the coordinator before or at expiry, and never becomes a confirmed booking merely because time elapsed. Current pending requests do not reserve time and have no hold-expiry workflow. Source: page 2, item 4. Proposed classification: additional requirement; **To agree**.
2. **Backlog impact:** propose hold lifecycle and expiry processing, linked to booking/conflict/notification work. Do not silently reinterpret every existing PENDING request as a hold. Jira breakdown **To agree**.
3. **Candidate acceptance checks:** each hold has a deadline; it affects availability according to the agreed hold rules; expiry releases it when the required action has not occurred; the responsible coordinator is informed; expired holds are not confirmed bookings. Hold creation permission, required action, duration/renewal, exact deadline semantics and notification timing are **To agree**.
4. **Estimates:** **To agree**, including time-driven processing and race conditions.
5. **Design impact:** hold state/deadline persistence, clock/worker strategy, availability reads, confirmation transaction and notification sequence **Not assessed**.
6. **Tests:** plan just-before/at/after expiry, repeated processing, worker restart, notification duplication and simultaneous confirmation/expiry. Execution **Not executed**.
7. **Release scope:** added points **To agree**.

## CR-5 — Event Coordinator Lead and assignment queue

1. **Requested change / baseline:** newly submitted events enter an unassigned queue for a new Event Coordinator Lead, who can inspect basic event information, assign/reassign coordinators and oversee assignments/active events. Coordinators manage only their assigned events, with notifications for relevant assignment changes. This replaces KAN-29's original automatic initial allocation rule; it is not proof that KAN-29 was wrongly implemented against its original criteria. Source: page 2, item 5. Proposed classification: replacement requirement/new linked work; **To agree**.
2. **Backlog impact:** link the new role/queue workflow to KAN-29, KAN-25 and KAN-6; reconcile existing future reassignment KAN-65 and notifications KAN-64 rather than duplicating them. Jira breakdown **To agree**.
3. **Candidate acceptance checks:** submission succeeds into an unassigned queue without automatically picking a coordinator; only the authorised Lead manages assignments and sees their supervision scope; the assignee is recorded correctly; coordinators cannot manage unrelated events; assignment/reassignment notifies relevant users. Exact supervision scope, migration of existing assignments and removal of old manual-assignment permissions are **To agree**.
4. **Estimates:** **To agree**; preserve historical KAN-29 estimate and acceptance record, and separately estimate the changed workflow.
5. **Design impact:** role provisioning, queue/API authorization, submit transaction, reassignment audit and notification diagrams **Not assessed**. Any code changes must replace the old policy coherently across UI, API and tests.
6. **Tests:** plan new role access, unassigned submission, initial assignment, reassignment, concurrent assignment, ownership changes and correct notification recipients. Original event-data retention and decision restrictions still require regression. Execution **Not executed**.
7. **Release scope:** added/replaced scope **To agree** and must be logged explicitly; do not silently rewrite the Sprint 2 baseline.

## CR-6 — Safety Officer and operational feasibility check

1. **Requested change / baseline:** a new Safety Officer reviews operational safety after venue and technical arrangements are confirmed and before preparation. They can approve, reject the safety arrangement or request changes; requested changes return the event to the relevant earlier planning stage and may require arrangements to be reviewed again. Preparation is blocked without safety approval. The customer permits assuming the officer always responds. Current venue suitability is advisory and is not this approval gate. Source: page 2, item 6. Proposed classification: additional requirement; **To agree**.
2. **Backlog impact:** new safety role/review workflow linked to future confirmation, equipment and change-management work. Jira decomposition **To agree**; do not confuse this role with the Coordinator Lead or venue suitability checker.
3. **Candidate acceptance checks:** only the authorised Safety Officer decides; the review can consider attendance, venue capacity/layout, emergency access, accessibility, equipment placement, crowd movement and restrictions; all three outcomes persist; changes route back to the appropriate stage; preparation remains blocked until approval. Exact return states, invalidation of prior approval after edits and responsibility for remedial work are **To agree**.
4. **Estimates:** **To agree**, taking the unimplemented technical-arrangements and confirmation dependencies into account.
5. **Design impact:** role, safety-review records, event state transitions, authorization/API, affected-arrangement references and approval sequence **Not assessed**.
6. **Tests:** plan prerequisite enforcement, three outcomes, data association, unauthorised actions, repeated decisions, changed arrangements and preparation blocking. Execution **Not executed**.
7. **Release scope:** added points **To agree**; no sprint commitment is implied by this register.
