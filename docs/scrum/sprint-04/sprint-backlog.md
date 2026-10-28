# Sprint 4 backlog and acceptance test plan

**26 October 2026 targeted update:** KAN-9 is In Progress / Tristan, with approved AC104–107, implementation and automated evidence. KAN-26 is In Progress / Tristan with local reservation implementation and AUTO-20261026-KAN26-01 evidence. This update does not start the administratively Future sprint, change its 63 SP allocation or record a review. Other stories retain their dated snapshots.

**16 October 2026 update.** Selected scope: **15 parents / 63 SP**. Sprint window: **18–31 October 2026**. Jira: **Future (ID 68); not started**. All selected parents are To Do; tests **Not executed** and acceptance **Not assessed**.

This rebalanced allocation replaces the earlier 97/29 split with **63/63**, without dropping criteria or increasing the 126 remaining release points. Customer changes were received **2 October**, as confirmed on 16 October; Sprint 2 is assessed against its original scope. The five selected carried stories retain **19 SP**; their current unfinished disposition does not invent historical acceptance or reduce Jira estimates to zero.

[Planning](planning.md) and [estimation](estimation-and-capacity.md) record the allocation and recorded decisions. Active criteria below retain the Jira wording. Expandable source descriptions are preserved snapshots from before the self-selection update; old administrative owner/reviewer labels in those snapshots are historical. Notification work is an explicit **KAN-64 5 + KAN-80 3** split, not hidden unpointed preparation. S3 delivers all of its narrowed inbox and trigger scope; S4 adds the separately tracked remaining triggers.

**16 October ownership update:** stories are unassigned for team members to choose, targeting roughly **10–11 SP each per sprint / 21 SP across both**. Keep whole estimates and dependencies; choose another member to review. The integration lead is **To agree**. See the [selection rules](planning.md#selected-backlog).

## Selected backlog

| Jira | Story | SP | Owner | Independent reviewer | Origin | Test |
| --- | --- | ---: | --- | --- | --- | --- |
| [KAN-18](https://smu-g7-grp1.atlassian.net/browse/KAN-18) | Update Equipment Availability Status | 3 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T01 |
| [KAN-9](https://smu-g7-grp1.atlassian.net/browse/KAN-9) | Check Equipment Availability for an Event | 8 | Tristan | To agree | Existing release backlog | S4-T02 |
| [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) | Submit and Review Event Equipment Requests | 5 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T03 |
| [KAN-26](https://smu-g7-grp1.atlassian.net/browse/KAN-26) | Reserve Equipment | 3 | Tristan | To agree | Existing release backlog | S4-T04 |
| [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) | Confirm Event After Planning Arrangements | 3 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T05 |
| [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) | Cancel Event and Release Its Arrangements | 5 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T06 |
| [KAN-10](https://smu-g7-grp1.atlassian.net/browse/KAN-10) | Mark Event as Completed | 3 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T07 |
| [KAN-14](https://smu-g7-grp1.atlassian.net/browse/KAN-14) | Register for an Event | 5 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T08 |
| [KAN-17](https://smu-g7-grp1.atlassian.net/browse/KAN-17) | Withdraw Attendee Registration | 2 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T09 |
| [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) | View Event Registrations | 2 | Unassigned — team member to choose | To agree after owner chosen | Existing release backlog | S4-T10 |
| [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) | Update Event Information During Planning | 3 | Irfan (assigned in Jira 26 October 2026) | To agree | Existing release backlog | S4-T11 |
| [KAN-15](https://smu-g7-grp1.atlassian.net/browse/KAN-15) | Submit and Review Event Change Requests | 5 | Irfan (assigned in Jira 26 October 2026) | To agree | Existing release backlog | S4-T12 |
| [KAN-80](https://smu-g7-grp1.atlassian.net/browse/KAN-80) | Receive Equipment, Lifecycle, Change and Registration Notifications | 3 | Unassigned — team member to choose | To agree after owner chosen | Explicit original notification split | S4-T13 |
| [KAN-82](https://smu-g7-grp1.atlassian.net/browse/KAN-82) | Manage each venue arrangement independently for an event | 5 | Unassigned — team member to choose | To agree after owner chosen | Customer change CR-3 | S4-T14 |
| [KAN-84](https://smu-g7-grp1.atlassian.net/browse/KAN-84) | Review operational safety before event preparation | 8 | Unassigned — team member to choose | To agree after owner chosen | Customer change CR-6 | S4-T15 |
| **Total** | **15 parents** | **63** | | | | |

## Shared test data and execution rules

These are specifications, **Not executed**, with acceptance **Not assessed**. The original 26 aggregate/audit rows and historical dated evidence remain unchanged; a past Fail is not replaced by a planned repair Pass.

- Use synthetic **O1/O2** organisers, **C1/C2** coordinators, **T** Technical Support, **V** Venue Staff, **L1/L2** Leads, **A1/A2** attendees and **S** Safety Officer. Record real mapped account aliases at execution; a person signs in themselves and no credentials are recorded.
- **E-A/E-B**, venues **A/B** and equipment **EQ-A/EQ-B** are separate fixtures. Default future period: **12 January 2031, 10:00–12:00 Asia/Singapore**. Each case sets specific boundaries, quantities, statuses, revisions and clocks.
- Use isolated PostgreSQL and a controlled database clock for destructive setup, races, injected failures and expiry processing. Reset each case so prior reservations/registrations/blocks do not contaminate it. Never point cleanup-based tests at shared Supabase.
- Integrated localhost checks use coordinated synthetic data: record original values, restore them and identify anything retained. Compare UI/API with persisted state, then refresh. Do not invent UI paths for unimplemented features.
- An action mentioned in a case is a requirement, not proof an endpoint or scheduler exists. Add actual code/test paths to [traceability](../../requirements/traceability.csv) when implemented; baseline paths for carry-over are only regression targets.
- Record each real run with its actual date, build SHA, environment, command/steps, fixture identities, outcomes and gaps in [test evidence](../../testing/test-evidence.md). Independent review and integrated localhost acceptance are required for Done under the 25 October Definition of Done amendment; application deployment is not required.

## Acceptance test plan

Every row requires its complete active criterion set plus applicable Definition of Done. Normal, boundary, conflict and failure cases in the CSV remain specifications until an actual run is recorded.

| Test | Story / active criteria | Functional cases | Result / evidence |
| --- | --- | --- | --- |
| S4-T01 | KAN-18: AC1, AC2, AC3, AC4, AC5, AC6, AC101, AC102, AC103 | TC-16-01, TC-16-02, TC-16-03, TC-16-04, TC-16-05 | **Not executed** / Not recorded |
| S4-T02 | KAN-9: AC1–AC5, AC101–AC107 | TC-16-06–TC-16-18 | Automated evidence: AUTO-20261026-KAN9-01. Integrated manual **Not executed**; acceptance **Not assessed**. TC-16-09 combined reservation path is now implemented locally with KAN-26; its integrated manual run remains Not executed. |
| S4-T03 | KAN-63: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC101, AC102, AC103, AC104 | TC-15-01, TC-15-02, TC-15-03, TC-15-04, TC-15-05, TC-15-06, TC-15-07 | **Not executed** / Not recorded |
| S4-T04 | KAN-26: AC1–AC7, AC101–AC108 | TC-17-01–08; automated TC-17-101–110 | AUTO-20261026-KAN26-01 records automated results. Integrated manual **Not executed**; acceptance **Not assessed**. Shared migration 015 and KAN-18/63/62/10 UI integration remain pending. |
| S4-T05 | KAN-61: AC1, AC2, AC3, AC4, AC5, AC6, AC101, AC102, AC103, AC104 | TC-06-01, TC-06-02, TC-06-03, TC-06-04, TC-06-05, TC-06-06, TC-06-07 | **Not executed** / Not recorded |
| S4-T06 | KAN-62: AC1, AC2, AC3, AC4, AC5, AC6, AC101, AC102, AC103, AC104 | TC-06-08, TC-06-09, TC-06-10, TC-06-11, TC-06-12, TC-06-13 | **Not executed** / Not recorded |
| S4-T07 | KAN-10: AC1, AC2, AC3, AC4, AC5, AC101, AC102, AC103 | TC-06-14, TC-06-15, TC-06-16, TC-06-17, TC-06-18 | **Not executed** / Not recorded |
| S4-T08 | KAN-14: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC101, AC102, AC103, AC104 | TC-18-01, TC-18-02, TC-18-03, TC-18-04, TC-18-05, TC-18-06 | **Not executed** / Not recorded |
| S4-T09 | KAN-17: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC101, AC102, AC103 | TC-18-07, TC-18-08, TC-18-09, TC-18-10, TC-18-11 | **Not executed** / Not recorded |
| S4-T10 | KAN-67: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC101, AC102, AC103 | TC-18-12, TC-18-13, TC-18-14, TC-18-15, TC-18-16, TC-18-17 | **Not executed** / Not recorded |
| S4-T11 | KAN-66: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC101, AC102, AC103 | TC-07-01, TC-07-02, TC-07-03, TC-07-04, TC-07-05 | **In progress (27 October 2026):** automated unit/component and browser-fixture runs Pass (`AUTO-20261026-KAN66-01`, `-02`; unit re-run `AUTO-20261027-KAN66-03` on `3ac15d5`); PostgreSQL integration 533/533 and browser 161/161 Pass in CI on `27d5d84` (`CI-20261027-KAN66-02`); re-confirmed after merging main, 578/578 and 182/182 on `a5d1a3a` (`CI-20261027-KAN66-04`); local integrated acceptance **Not executed**; acceptance **Not assessed** |
| S4-T12 | KAN-15: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC101, AC102, AC103, AC104, AC105 | TC-19-01, TC-19-02, TC-19-03, TC-19-04, TC-19-05, TC-19-06, TC-19-07, TC-19-08, TC-19-09 | **In progress (27 October 2026):** unit/component and browser-fixture runs Pass (`AUTO-20261027-KAN15-01`); PostgreSQL integration 544/544 and browser 164/164 Pass in CI on `6c5043c` (`CI-20261027-KAN15-02`); local integrated acceptance **Not executed**; acceptance **Not assessed** |
| S4-T13 | KAN-80: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9 | TC-20-21, TC-20-22, TC-20-23, TC-20-24, TC-20-25, TC-20-26, TC-20-27, TC-20-28, TC-20-29 | **Not executed** / Not recorded |
| S4-T14 | KAN-82: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12 | TC-12-01, TC-12-02, TC-12-03, TC-12-04, TC-12-05, TC-12-06, TC-12-07, TC-12-08, TC-12-09, TC-12-10, TC-12-11, TC-12-12 | **Not executed** / Not recorded |
| S4-T15 | KAN-84: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12 | TC-06-20, TC-06-21, TC-06-22, TC-06-23, TC-06-24, TC-06-25, TC-06-26, TC-06-27, TC-06-28, TC-06-29, TC-06-30, TC-06-31 | **Not executed** / Not recorded |
| S4-T16 | Integrated complete release with equipment, registration, independent venue actions and safety | TC-06-32 | **Not executed** / Not recorded |

## Selected story cards

### KAN-18 — Update Equipment Availability Status

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 3 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T01

**User story:** As a Technical Support Staff member, I want to update the operational status of unavailable equipment so that damaged or maintained equipment is not incorrectly treated as available for event use.

**Transferred test group:** S3-T01 → S4-T01; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-18-AC1** | Technical Support Staff can view the current operational status of equipment. | TC-16-01 |
| **KAN-18-AC2** | Technical Support Staff can mark equipment as unavailable when it is damaged, undergoing repair or maintenance, or otherwise unavailable for event use. | TC-16-02 |
| **KAN-18-AC3** | When the equipment's operational status is changed, the updated status is saved. | TC-16-01 |
| **KAN-18-AC4** | Equipment marked as unavailable is not counted as available when equipment availability is checked for an event. | TC-16-02 |
| **KAN-18-AC5** | Equipment marked as unavailable cannot be newly reserved for an event while it remains unavailable. | TC-16-02 |
| **KAN-18-AC6** | Technical Support Staff can update the equipment's operational status when it becomes available for event use again. | TC-16-03 |
| **KAN-18-AC101** | Only Technical Support Staff may alter pooled total, damaged or maintenance quantities; use nonnegative whole quantities with damaged + maintenance <= total and retain actor/time/reason. | TC-16-04 |
| **KAN-18-AC102** | A newly recorded operational loss preserves existing reservations and identifies affected shortfalls, notifies relevant assigned coordinators through KAN-80 (using KAN-64 infrastructure), and prevents further over-allocation until resolved. | TC-16-05 |
| **KAN-18-AC103** | Restoring availability updates subsequent checks; a stale stock form cannot overwrite newer totals or operational changes. | TC-16-03 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 3 SP. Owner: Ernest; independent reviewer: Ryan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

| **User Story** | As a Technical Support Staff member, I want to update the operational status of unavailable equipment so that damaged or maintained equipment is not incorrectly treated as available for event use. |
| --- | --- |
| **Acceptance Criteria** |
| Technical Support Staff can view the current operational status of equipment. Technical Support Staff can mark equipment as unavailable when it is damaged, undergoing repair or maintenance, or otherwise unavailable for event use. When the equipment's operational status is changed, the updated status is saved. Equipment marked as unavailable is not counted as available when equipment availability is checked for an event. Equipment marked as unavailable cannot be newly reserved for an event while it remains unavailable. Technical Support Staff can update the equipment's operational status when it becomes available for event use again. |

### Sprint 3 selected scope and verification

Owner: Arvin. Independent reviewer: Kai Jie. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-18-AC101:** Only Technical Support Staff may alter pooled total, damaged or maintenance quantities; use nonnegative whole quantities with damaged + maintenance <= total and retain actor/time/reason.
* **KAN-18-AC102:** A newly recorded operational loss preserves existing reservations and identifies affected shortfalls, notifies relevant assigned coordinators through KAN-80 (using KAN-64 infrastructure), and prevents further over-allocation until resolved.
* **KAN-18-AC103:** Restoring availability updates subsequent checks; a stale stock form cannot overwrite newer totals or operational changes.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-9 — Check Equipment Availability for an Event

**Owner:** Tristan · **Independent reviewer:** To agree · **Estimate:** 8 SP · **Jira status:** In Progress · **Acceptance:** Not assessed · **Test group:** S4-T02

**User story:** As a Technical Support Staff member, I want to check whether sufficient suitable equipment is available for an event's requested date and time, so that I can determine if the event's technical requirements can be fulfilled.

**Transferred test group:** S3-T02 → S4-T02; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-9-AC1** | Can view the requested equipment types, requested quantities, and the event date/time window. | TC-16-06 |
| **KAN-9-AC2** | Is shown only equipment that excludes units marked as damaged, undergoing maintenance, or reserved for overlapping bookings. | TC-16-07 |
| **KAN-9-AC3** | Can perform the availability check independently of whether the venue booking is confirmed. | TC-16-06 |
| **KAN-9-AC4** | Given an event request with equipment requirements, when the available quantity meets or exceeds the requested quantity for all items on that date/time, then the system marks the technical requirements as "Fulfillable" with a green confirmation indicator. | TC-16-08 |
| **KAN-9-AC5** | Given an event request with equipment requirements, when any requested item has fewer available units than requested, then the system marks the technical requirements as "Shortfall / Unfulfillable" and highlights the specific item deficit. | TC-16-09 |
| **KAN-9-AC101** | Availability uses quantity pools and half-open periods: exclude damaged/maintenance quantities and the peak simultaneous RESERVED quantity, without summing disjoint reservations as concurrent demand. | TC-16-07 |
| **KAN-9-AC102** | Invalid or nonexistent dates, end <= start and nonpositive/noninteger requested quantities are refused with field feedback; exact adjacency does not conflict. | TC-16-10 |
| **KAN-9-AC103** | A result is advisory and includes each requested/operational/available/shortfall quantity; KAN-26 rechecks live quantities under lock before reserving. | TC-16-09 |
| **KAN-9-AC104** | Only authenticated Technical Support Staff may access the checker and its minimal APPROVED/CONFIRMED event context. Other roles cannot retrieve protected requirements, and competing reservations disclose quantities rather than other events' identities. | TC-16-11 |
| **KAN-9-AC105** | Staff can assess saved structured requests or explicitly entered, unsaved what-if quantities and dates. Free text is not automatically interpreted. A check does not create or modify requests, reservations, event state or notifications. | TC-16-12 |
| **KAN-9-AC106** | Checks reload current stock and reservations; changed event or saved-request context requires refresh. Saved requirements aggregate same-type lines and count their existing reservations only once; unsaved what-if checks consume no stock and exclude no existing reservation. | TC-16-13, TC-16-14 |
| **KAN-9-AC107** | Empty requirements do not produce Fulfillable. Inactive or insufficient stock is clearly identified, invalid or mismatched saved periods are refused, and changed inputs, accounts, routes or failed requests cannot leave a stale success result on screen. | TC-16-15, TC-16-16 |

**Implementation:** `backend/src/modules/equipment/`, `frontend/src/features/equipment/`, migration 014. **Automated tests:** `backend/test/equipment/`, `database/tests/equipment/availability.integration.test.ts`, frontend equipment tests and `tests/e2e/equipment-availability.spec.ts`. **Evidence:** `AUTO-20261026-KAN9-01` / S4-E10.

**26 October refinement:** unsaved mode and migration 014 approved in chat; AC104–107 now match Jira. Estimate remains 8 SP. Subtasks KAN-101/102/103 are In Progress / Tristan. Checks are advisory and read-only. KAN-18 stock administration, KAN-63 request entry and KAN-26 reservations remain separate. Manual acceptance is **Not executed**, independent review **To agree**, acceptance **Not assessed**. TC-16-17 isolates deficit/advisory behavior; TC-16-09 still requires the later KAN-26 reservation test.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 8 SP. Owner: Tristan; independent reviewer: Irfan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

| **User Story** | As a Technical Support Staff member, I want to check whether sufficient suitable equipment is available for an event's requested date and time, so that I can determine if the event's technical requirements can be fulfilled. |
| --- | --- |
| **Acceptance Criteria** |
| Ensure that the Technical Support Staff member:  Can view the requested equipment types, requested quantities, and the event date/time window.  Is shown only equipment that excludes units marked as damaged, undergoing maintenance, or reserved for overlapping bookings.  Can perform the availability check independently of whether the venue booking is confirmed.  Given an event request with equipment requirements, when the available quantity meets or exceeds the requested quantity for all items on that date/time, then the system marks the technical requirements as "Fulfillable" with a green confirmation indicator.  Given an event request with equipment requirements, when any requested item has fewer available units than requested, then the system marks the technical requirements as "Shortfall / Unfulfillable" and highlights the specific item deficit. |

### Sprint 3 selected scope and verification

Owner: Arvin. Independent reviewer: Kai Jie. Selected estimate: 8 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-9-AC101:** Availability uses quantity pools and half-open periods: exclude damaged/maintenance quantities and the peak simultaneous RESERVED quantity, without summing disjoint reservations as concurrent demand.
* **KAN-9-AC102:** Invalid or nonexistent dates, end <= start and nonpositive/noninteger requested quantities are refused with field feedback; exact adjacency does not conflict.
* **KAN-9-AC103:** A result is advisory and includes each requested/operational/available/shortfall quantity; KAN-26 rechecks live quantities under lock before reserving.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-63 — Submit and Review Event Equipment Requests

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 5 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T03

**User story:** As an Event Coordinator, I want to record an event’s equipment request and have Technical Support Staff review and update its arrangements so that suitable equipment can be provided.

**Transferred test group:** S3-T03 → S4-T03; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-63-AC1** | An authorised coordinator can create and save an equipment request for an event they manage, specifying equipment types, quantities, the relevant event period and technical requirements. | TC-15-01 |
| **KAN-63-AC2** | The request remains associated with the correct event and is available to the appropriate Technical Support Staff. | TC-15-01 |
| **KAN-63-AC3** | Technical Support Staff can open relevant equipment requests and inspect the requested types, quantities, timing and technical requirements. | TC-15-01 |
| **KAN-63-AC4** | Authorised Technical Support Staff can update equipment-arrangement information and save a review outcome against the correct request. | TC-15-02 |
| **KAN-63-AC5** | The latest saved request and permitted review outcome remain visible to the relevant coordinator and staff after refresh. | TC-15-02 |
| **KAN-63-AC6** | Availability checks consider current requested quantities and overlapping reservations through KAN-9. An outcome does not silently reserve unavailable equipment. | TC-15-03 |
| **KAN-63-AC7** | Accepted arrangements connect to KAN-26 reservation without duplicate reservations or double-counted quantities. | TC-15-03 |
| **KAN-63-AC8** | Updates do not modify equipment requests or reservations belonging to unrelated events. | TC-15-04 |
| **KAN-63-AC9** | Unauthorised users cannot create, modify, review or access protected equipment arrangements for the event. | TC-15-04 |
| **KAN-63-AC10** | Venue and equipment planning can proceed independently. Events with no equipment needs may use Not Required under the agreed event requirements. | TC-15-05 |
| **KAN-63-AC101** | For an APPROVED event, only the assigned coordinator may create or revise REQUESTED equipment lines; Technical Support Staff may reserve the full line or reject it with a reason. | TC-15-06 |
| **KAN-63-AC102** | Explicit Not Required is available only when there are no active required equipment lines; unresolved or rejected required lines do not count as ready. | TC-15-05 |
| **KAN-63-AC103** | Each accepted line connects atomically to a single RESERVED record through KAN-26; no partial fulfilment or substitutions are silently applied. | TC-15-03 |
| **KAN-63-AC104** | Changing a reserved line requires explicit cancellation/replacement with renewed availability checks and cannot mutate a reservation behind another viewer's stale form. | TC-15-07 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 5 SP. Owner: Arvin; independent reviewer: Kai Jie. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Coordinator, I want to record an event’s equipment request and have Technical Support Staff review and update its arrangements so that suitable equipment can be provided.

### Acceptance Criteria

1. An authorised coordinator can create and save an equipment request for an event they manage, specifying equipment types, quantities, the relevant event period and technical requirements.
2. The request remains associated with the correct event and is available to the appropriate Technical Support Staff.
3. Technical Support Staff can open relevant equipment requests and inspect the requested types, quantities, timing and technical requirements.
4. Authorised Technical Support Staff can update equipment-arrangement information and save a review outcome against the correct request.
5. The latest saved request and permitted review outcome remain visible to the relevant coordinator and staff after refresh.
6. Availability checks consider current requested quantities and overlapping reservations through KAN-9. An outcome does not silently reserve unavailable equipment.
7. Accepted arrangements connect to KAN-26 reservation without duplicate reservations or double-counted quantities.
8. Updates do not modify equipment requests or reservations belonging to unrelated events.
9. Unauthorised users cannot create, modify, review or access protected equipment arrangements for the event.
10. Venue and equipment planning can proceed independently. Events with no equipment needs may use Not Required under the agreed event requirements.

### Refinement before selection

Agree eligible event/request states, edit permissions, review outcomes, partial fulfilment and whether acceptance creates a reservation immediately. Record how authorised later changes interact with existing reservations. Equipment quantities and resource release are owned jointly with KAN-9, KAN-18 and KAN-26; do not count duplicate work.

This story covers both equipment-request recording and staff review/update. Human technical-support staffing is separate from equipment management and is not a prerequisite.

Refined 21 September 2026. Unestimated future backlog outside Sprint 2’s 43-point commitment. Existing implementation requires criterion-linked validation.

### Sprint 3 selected scope and verification

Owner: Arvin. Independent reviewer: Kai Jie. Selected estimate: 5 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-63-AC101:** For an APPROVED event, only the assigned coordinator may create or revise REQUESTED equipment lines; Technical Support Staff may reserve the full line or reject it with a reason.
* **KAN-63-AC102:** Explicit Not Required is available only when there are no active required equipment lines; unresolved or rejected required lines do not count as ready.
* **KAN-63-AC103:** Each accepted line connects atomically to a single RESERVED record through KAN-26; no partial fulfilment or substitutions are silently applied.
* **KAN-63-AC104:** Changing a reserved line requires explicit cancellation/replacement with renewed availability checks and cannot mutate a reservation behind another viewer's stale form.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-26 — Reserve Equipment

**Owner:** Tristan · **Independent reviewer:** To agree · **Estimate:** 3 SP · **Jira status:** In Progress · **Acceptance:** Not assessed · **Test group:** S4-T04

**User story:** As a Technical Support Staff member, I want to reserve equipment for an event being planned so that the required quantities are secured without double-booking.

**Transferred test group:** S3-T04 → S4-T04; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-26-AC1** | A reservation records the equipment type, quantity, event and required period. | TC-17-01 |
| **KAN-26-AC2** | Reserved quantities reduce availability for overlapping periods; reservations cannot exceed available stock. | TC-17-02 |
| **KAN-26-AC3** | Equipment and venue arrangements can proceed independently. Final event or venue confirmation is not a blanket prerequisite for equipment arrangements. | TC-17-01 |
| **KAN-26-AC4** | The Event Coordinator is notified when equipment is confirmed reserved. | TC-17-03 |
| **KAN-26-AC5** | Cancellation or completion automatically releases the event’s equipment reservations. Repeating the transition does not release stock twice. | TC-17-04 |
| **KAN-26-AC6** | Authorised Technical Support Staff can make manual availability adjustments while maintaining quantity consistency. | TC-17-05 |
| **KAN-26-AC7** | Unauthorised users cannot create or alter reservations. | TC-17-06 |
| **KAN-26-AC101** | Reserve only the full positive whole requested quantity on an APPROVED event, independently of venue confirmation; equipment readiness requires every active required line to be RESERVED. | TC-17-07 |
| **KAN-26-AC102** | Use one locked, atomic operation for request decision and reservation; simultaneous reservations may not exceed operational stock at any instant. | TC-17-02 |
| **KAN-26-AC103** | Cancellation/completion release by recorded reservation state exactly once, preserve history and never increment a separate stock counter repeatedly. | TC-17-04 |
| **KAN-26-AC104** | The affected assigned coordinator receives a transactional in-app reservation confirmation through KAN-80 (using KAN-64 infrastructure); the lifecycle release path is an acceptance dependency. | TC-17-03 |
| **KAN-26-AC105** | Technical Support Staff may cancel a RESERVED line on an APPROVED event with a non-empty reason; preserve its original reservation decision and record release actor, time and cause. Operational stock editing remains KAN-18 integration. | TC-17-05 |
| **KAN-26-AC106** | Reservation and cancellation use the current saved requirements version. Replaying the same unchanged outcome creates no duplicate release or notification; intervening source changes require refresh. | TC-17-08 |
| **KAN-26-AC107** | Unsaved availability checks cannot create reservations. Empty, unresolved, rejected or currently unfulfillable saved requirements must not be reported as equipment ready. | TC-17-07 |
| **KAN-26-AC108** | The deciding Technical Support Staff member receives a recipient-scoped confirmation linked only to permitted equipment planning; closed events retain the notice without granting general event-detail access. | TC-17-03 |

**Implementation location:** `backend/src/modules/equipment/reservation-{types,input,service,router}.ts`, notification writer/inbox/trigger matrix, `frontend/src/features/equipment/api/equipment-reservations.ts`, `EquipmentReservationPanel.vue` and its event availability parent; additive `database/migrations/015_equipment_reservations.sql`. The local branch includes the KAN-9 checker commits.

**Automated test files:** `backend/test/equipment/reservation-{service,router,notifications}.test.ts`; `database/tests/equipment/reservations.integration.test.ts`, `database/tests/database.integration.test.ts`, `database/tests/core-schema.integration.test.ts`; frontend reservation API, panel and workflow tests; `tests/e2e/equipment-reservations.spec.ts`. [Traceability](../../requirements/traceability.csv) links every active criterion to reusable cases and real files.

**Verification:** AUTO-20261026-KAN26-01 / S4-E12 records check, coverage, real PostgreSQL and browser-fixture results. These do not establish real-login manual acceptance. The user reports migration 014/account setup complete; migration 015 is not applied to shared Supabase. KAN-63 request entry/revision, KAN-18 stock-editor integration and KAN-62/KAN-10 lifecycle UI acceptance remain pending. This branch supplies KAN-80's equipment-reserved notification slice only. Independent review and merge remain outstanding; no Done points are claimed.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 3 SP. Owner: Arvin; independent reviewer: Kai Jie. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As a Technical Support Staff member, I want to reserve equipment for an event being planned so that the required quantities are secured without double-booking.

### Acceptance Criteria

* A reservation records the equipment type, quantity, event and required period.
* Reserved quantities reduce availability for overlapping periods; reservations cannot exceed available stock.
* Equipment and venue arrangements can proceed independently. Final event or venue confirmation is not a blanket prerequisite for equipment arrangements.
* The Event Coordinator is notified when equipment is confirmed reserved.
* Cancellation or completion automatically releases the event’s equipment reservations. Repeating the transition does not release stock twice.
* Authorised Technical Support Staff can make manual availability adjustments while maintaining quantity consistency.
* Unauthorised users cannot create or alter reservations.

### Refinement before selection

Define eligible planning states, tentative versus confirmed reservation states, quantity integrity rules and manual-adjustment permissions. Equipment location does not restrict allocation; no turnover buffer is required. Coordinate availability calculations with KAN-9 and manual stock updates with KAN-18.

Refined 21 September 2026. The existing estimate is retained for planning review; this story remains outside Sprint 2.

### Sprint 3 selected scope and verification

Owner: Arvin. Independent reviewer: Kai Jie. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-26-AC101:** Reserve only the full positive whole requested quantity on an APPROVED event, independently of venue confirmation; equipment readiness requires every active required line to be RESERVED.
* **KAN-26-AC102:** Use one locked, atomic operation for request decision and reservation; simultaneous reservations may not exceed operational stock at any instant.
* **KAN-26-AC103:** Cancellation/completion release by recorded reservation state exactly once, preserve history and never increment a separate stock counter repeatedly.
* **KAN-26-AC104:** The affected assigned coordinator receives a transactional in-app reservation confirmation through KAN-80 (using KAN-64 infrastructure); the lifecycle release path is an acceptance dependency.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-61 — Confirm Event After Planning Arrangements

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 3 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T05

**User story:** As an Event Coordinator, I want to confirm an event once its required arrangements are ready so that the organiser knows the event can proceed.

**Transferred test group:** S3-T08 → S4-T05; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-61-AC1** | Only a coordinator authorised for the event can confirm it. | TC-06-01 |
| **KAN-61-AC2** | Initial event-request approval under KAN-36 is distinct from final confirmation. | TC-06-02 |
| **KAN-61-AC3** | Confirmation checks the required venue and equipment arrangements. Unmet prerequisites prevent the transition with useful feedback; an applicable Not Required equipment choice does not block confirmation. | TC-06-03 |
| **KAN-61-AC4** | Confirmation is recorded against the correct event with actor and time, persists after refresh and is visible to the organiser. | TC-06-04 |
| **KAN-61-AC5** | Unauthorised, invalid and repeated transitions do not corrupt status or resource records. | TC-06-05 |
| **KAN-61-AC6** | Optional human technical-support requests or staff scheduling are not prerequisites of this first-release confirmation workflow. | TC-06-06 |
| **KAN-61-AC101** | Only the currently assigned coordinator may transition APPROVED to CONFIRMED. At least one valid APPROVED venue arrangement is required; all active requested venue arrangements must be approved and conflict-free. | TC-06-03 |
| **KAN-61-AC102** | Equipment is explicitly Not Required or every active required equipment line is RESERVED and currently fulfilable; a rejected or unresolved required line blocks confirmation. | TC-06-03 |
| **KAN-61-AC103** | No pending significant change is allowed; perform the complete readiness check and status/history/notification write atomically against current data. | TC-06-05 |
| **KAN-61-AC104** | Confirmation preserves configured registration times; registration still checks its own window and capacity. The later CR-6 safety gate is a separately tracked requirement. | TC-06-07 |
| **KAN-61-AC105** | An event with a venue booking still requiring outage recovery (KAN-81) cannot be confirmed. *(Moved from KAN-81-AC9, PO decision 28 October 2026.)* | TC-06-03 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 3 SP. Owner: Kai Jie; independent reviewer: Tristan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Coordinator, I want to confirm an event once its required arrangements are ready so that the organiser knows the event can proceed.

### Proposed Acceptance Criteria — refine before selection

1. Only a coordinator authorised for the event can confirm it.
2. Initial event-request approval under KAN-36 is distinct from final confirmation.
3. Confirmation checks the required venue and equipment arrangements. Unmet prerequisites prevent the transition with useful feedback; an applicable Not Required equipment choice does not block confirmation.
4. Confirmation is recorded against the correct event with actor and time, persists after refresh and is visible to the organiser.
5. Unauthorised, invalid and repeated transitions do not corrupt status or resource records.
6. Optional human technical-support requests or staff scheduling are not prerequisites of this first-release confirmation workflow.

### Open decisions

Agree exact eligible prior states and the venue/equipment readiness checklist. Define registration-opening and notification effects. Coordinate venue booking KAN-8, equipment KAN-26, status display KAN-16, registration KAN-14 and notifications KAN-64.

Refined 21 September 2026 to keep core confirmation independent of optional human staffing. Existing implementation is not acceptance evidence. Unestimated future backlog; not included in Sprint 2’s 43 points.

### Sprint 3 selected scope and verification

Owner: Kai Jie. Independent reviewer: Tristan. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-61-AC101:** Only the currently assigned coordinator may transition APPROVED to CONFIRMED. At least one valid APPROVED venue arrangement is required; all active requested venue arrangements must be approved and conflict-free.
* **KAN-61-AC102:** Equipment is explicitly Not Required or every active required equipment line is RESERVED and currently fulfilable; a rejected or unresolved required line blocks confirmation.
* **KAN-61-AC103:** No pending significant change is allowed; perform the complete readiness check and status/history/notification write atomically against current data.
* **KAN-61-AC104:** Confirmation preserves configured registration times; registration still checks its own window and capacity. The later CR-6 safety gate is a separately tracked requirement.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-62 — Cancel Event and Release Its Arrangements

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 5 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T06

**User story:** As an authorised event manager, I want to cancel an eligible event and release its arrangements so that obsolete bookings and resources do not remain committed.

**Transferred test group:** S3-T09 → S4-T06; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-62-AC1** | Only a user authorised for the event can cancel it in an eligible state. | TC-06-08 |
| **KAN-62-AC2** | Cancellation is recorded against the correct event with actor, time and any explanation required by the agreed policy, and remains visible after refresh. | TC-06-09 |
| **KAN-62-AC3** | Equipment reservations are released automatically on cancellation, without double-releasing quantities or affecting unrelated events. | TC-06-10 |
| **KAN-62-AC4** | Venue bookings, registrations and notifications are handled consistently with the agreed cancellation policy; incompatible arrangements are not silently left as valid. | TC-06-11 |
| **KAN-62-AC5** | Repeated, invalid or unauthorised cancellation attempts do not corrupt status or related resource records. | TC-06-12 |
| **KAN-62-AC6** | Major changes affecting confirmed arrangements can follow cancellation plus a new event request under KAN-15. | TC-06-13 |
| **KAN-62-AC101** | The owning organiser or current coordinator may cancel SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED or CONFIRMED with a trimmed nonempty reason and confirmation of affected arrangements. | TC-06-08 |
| **KAN-62-AC102** | Cancel active venue bookings/equipment requests/reservations and attendee registrations atomically, preserving prior decisions, actor, time and reason; no event history is deleted. | TC-06-10 |
| **KAN-62-AC103** | Affected users receive transactional KAN-80 (using KAN-64 infrastructure) notifications. Attendees see a cancellation outcome without internal-only reasons. | TC-06-11 |
| **KAN-62-AC104** | A repeated cancellation does not repeat resource release or notifications; completion/rejection/draft/unauthorised cancellation leaves data unchanged. | TC-06-12 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 5 SP. Owner: Tristan; independent reviewer: Irfan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

User Story
As an authorised event manager, I want to cancel an eligible event and release its arrangements so that obsolete bookings and resources do not remain committed.

Proposed Acceptance Criteria

1. Only a user authorised for the event can cancel it in an eligible state.
2. Cancellation is recorded against the correct event with actor, time and any explanation required by the agreed policy, and remains visible after refresh.
3. Equipment reservations are released automatically on cancellation, without double-releasing quantities or affecting unrelated events.
4. Venue bookings, registrations and notifications are handled consistently with the agreed cancellation policy; incompatible arrangements are not silently left as valid.
5. Repeated, invalid or unauthorised cancellation attempts do not corrupt status or related resource records.
6. Major changes affecting confirmed arrangements can follow cancellation plus a new event request under KAN-15.

Refinement before selection
Agree who may request versus perform cancellation, permitted prior states, whether a reason is mandatory, and the venue-booking/registration/notification effects. Coordinate KAN-26 resource release, KAN-64 notifications and KAN-61 confirmation. Keep a cancellation record rather than deleting the event and its history.

Refined 21 September 2026. Unestimated future backlog outside Sprint 2’s 43-point commitment. Existing implementation requires validation against the agreed policy.

### Sprint 3 selected scope and verification

Owner: Kai Jie. Independent reviewer: Tristan. Selected estimate: 5 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-62-AC101:** The owning organiser or current coordinator may cancel SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED or CONFIRMED with a trimmed nonempty reason and confirmation of affected arrangements.
* **KAN-62-AC102:** Cancel active venue bookings/equipment requests/reservations and attendee registrations atomically, preserving prior decisions, actor, time and reason; no event history is deleted.
* **KAN-62-AC103:** Affected users receive transactional KAN-80 (using KAN-64 infrastructure) notifications. Attendees see a cancellation outcome without internal-only reasons.
* **KAN-62-AC104:** A repeated cancellation does not repeat resource release or notifications; completion/rejection/draft/unauthorised cancellation leaves data unchanged.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-10 — Mark Event as Completed

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 3 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T07

**User story:** As an Event Coordinator, I want to mark an event as completed so that its final status is recorded and reserved equipment can be released.

**Transferred test group:** S3-T10 → S4-T07; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-10-AC1** | Only a coordinator authorised for the event can perform the completion action. | TC-06-14 |
| **KAN-10-AC2** | An eligible event transitions to Completed, recorded against the correct event with the actor and time. | TC-06-15 |
| **KAN-10-AC3** | Completed status persists after refresh and is visible to the relevant organiser and authorised internal users. | TC-06-16 |
| **KAN-10-AC4** | Completion automatically releases the event’s equipment reservations without releasing another event’s resources or duplicating the release. | TC-06-17 |
| **KAN-10-AC5** | An unauthorised or invalid transition leaves the event and its reservations unchanged. | TC-06-14 |
| **KAN-10-AC101** | Only the currently assigned coordinator may complete a CONFIRMED event at or after its endsAt instant according to the server/database clock. | TC-06-15 |
| **KAN-10-AC102** | Completion atomically records actor/time, releases all still-reserved equipment once and closes further registration/withdrawal; historic registrations and venue bookings remain readable. | TC-06-17 |
| **KAN-10-AC103** | An early, stale, repeated or unauthorised completion must not duplicate release or notifications or modify another event. | TC-06-18 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 3 SP. Owner: Ryan; independent reviewer: Arvin. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Coordinator, I want to mark an event as completed so that its final status is recorded and reserved equipment can be released.

### Acceptance Criteria

* Only a coordinator authorised for the event can perform the completion action.
* An eligible event transitions to Completed, recorded against the correct event with the actor and time.
* Completed status persists after refresh and is visible to the relevant organiser and authorised internal users.
* Completion automatically releases the event’s equipment reservations without releasing another event’s resources or duplicating the release.
* An unauthorised or invalid transition leaves the event and its reservations unchanged.

### Refinement before selection

Confirm allowed prior states and timing relative to the event end. Proposed boundary: the assigned coordinator completes a Confirmed event after it ends. This still needs team agreement. Define other booking, registration and notification effects consistently with the lifecycle.

21 September 2026: Corrected the copied organiser status-view description. KAN-16 covers status viewing; completion requires separate acceptance. The existing estimate is retained for planning review.

### Sprint 3 selected scope and verification

Owner: Kai Jie. Independent reviewer: Tristan. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-10-AC101:** Only the currently assigned coordinator may complete a CONFIRMED event at or after its endsAt instant according to the server/database clock.
* **KAN-10-AC102:** Completion atomically records actor/time, releases all still-reserved equipment once and closes further registration/withdrawal; historic registrations and venue bookings remain readable.
* **KAN-10-AC103:** An early, stale, repeated or unauthorised completion must not duplicate release or notifications or modify another event.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-14 — Register for an Event

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 5 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T08

**User story:** As an Attendee, I want to view relevant event information and register while registration is open and capacity remains so that I can make an informed choice and secure my place.

**Transferred test group:** S3-T11 → S4-T08; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-14-AC1** | An attendee can view the relevant event details and registration conditions before submitting a registration. | TC-18-01 |
| **KAN-14-AC2** | Registration is accepted only for a Confirmed event with registration enabled, within the registration window and with capacity available. | TC-18-02 |
| **KAN-14-AC3** | A successful registration is saved against the correct attendee and event, and a confirmation is shown. | TC-18-03 |
| **KAN-14-AC4** | The attendee can view their own registration status after reopening or refreshing the page. | TC-18-03 |
| **KAN-14-AC5** | Successful registrations count towards capacity immediately; concurrent attempts cannot exceed capacity or claim the same last place. | TC-18-04 |
| **KAN-14-AC6** | A full event, closed or not-yet-open registration window, or registration-disabled event gives clear feedback without creating a registration. | TC-18-02 |
| **KAN-14-AC7** | The same attendee cannot hold duplicate active registrations for the same event. | TC-18-05 |
| **KAN-14-AC8** | An attendee cannot create or access another attendee’s protected registration through the interface or API. | TC-18-06 |
| **KAN-14-AC101** | Only authenticated attendees may register. No extra personal-data form is required beyond the mapped attendee account; show the relevant event information and admission conditions. | TC-18-01 |
| **KAN-14-AC102** | Use \[registrationOpensAt,registrationClosesAt) and now < event startsAt; null bounds are unbounded, capacity null is unlimited and capacity zero is full. | TC-18-02 |
| **KAN-14-AC103** | Withdrawn attendees may register again only if the normal window, event and capacity rules hold; reuse the attendee/event record instead of creating a duplicate. | TC-18-05 |
| **KAN-14-AC104** | Record registration and capacity effect atomically; send the attendee acknowledgement and appropriate manager notifications through KAN-80 (using KAN-64 infrastructure) without exposing another attendee's details. | TC-18-04 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 5 SP. Owner: Ernest; independent reviewer: Ryan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Attendee, I want to view relevant event information and register while registration is open and capacity remains so that I can make an informed choice and secure my place.

### Acceptance Criteria

1. An attendee can view the relevant event details and registration conditions before submitting a registration.
2. Registration is accepted only for a Confirmed event with registration enabled, within the registration window and with capacity available.
3. A successful registration is saved against the correct attendee and event, and a confirmation is shown.
4. The attendee can view their own registration status after reopening or refreshing the page.
5. Successful registrations count towards capacity immediately; concurrent attempts cannot exceed capacity or claim the same last place.
6. A full event, closed or not-yet-open registration window, or registration-disabled event gives clear feedback without creating a registration.
7. The same attendee cannot hold duplicate active registrations for the same event.
8. An attendee cannot create or access another attendee’s protected registration through the interface or API.

### Refinement notes — 21 September 2026

KAN-17 covers withdrawal and KAN-67 covers authorised organiser/coordinator viewing of event registrations. Waiting lists are optional scope and are not a dependency of this core registration story.

Agree the attendee-visible event fields, required registration details, eligibility and any re-registration policy before implementation/acceptance. Reuse KAN-64 for notification delivery; email is not mandatory.

The existing 5-point estimate is retained for history and must be reviewed after refinement before sprint selection. This future story is outside the 43-point Sprint 2 baseline.

### Sprint 3 selected scope and verification

Owner: Ernest. Independent reviewer: Ryan. Selected estimate: 5 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-14-AC101:** Only authenticated attendees may register. No extra personal-data form is required beyond the mapped attendee account; show the relevant event information and admission conditions.
* **KAN-14-AC102:** Use \[registrationOpensAt,registrationClosesAt) and now < event startsAt; null bounds are unbounded, capacity null is unlimited and capacity zero is full.
* **KAN-14-AC103:** Withdrawn attendees may register again only if the normal window, event and capacity rules hold; reuse the attendee/event record instead of creating a duplicate.
* **KAN-14-AC104:** Record registration and capacity effect atomically; send the attendee acknowledgement and appropriate manager notifications through KAN-80 (using KAN-64 infrastructure) without exposing another attendee's details.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-17 — Withdraw Attendee Registration

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 2 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T09

**User story:** As an Attendee, I want to withdraw my registration for an event I can no longer attend so that I am no longer expected and my place becomes available.

**Transferred test group:** S3-T12 → S4-T09; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-17-AC1** | An attendee can select an eligible registration belonging to them and request withdrawal. | TC-18-07 |
| **KAN-17-AC2** | Before saving, the attendee is asked to confirm withdrawal and is informed of the applicable re-registration restrictions. | TC-18-08 |
| **KAN-17-AC3** | Confirmed withdrawal is saved against the correct attendee and event; the registration is no longer treated as active. | TC-18-09 |
| **KAN-17-AC4** | The attendee can view the withdrawn status after reopening or refreshing the page. | TC-18-09 |
| **KAN-17-AC5** | Withdrawal releases the active registration’s capacity contribution once. Repeated attempts cannot release extra capacity or alter unrelated registrations. | TC-18-10 |
| **KAN-17-AC6** | An attendee cannot withdraw another attendee’s registration through the interface or API. | TC-18-11 |
| **KAN-17-AC7** | A failed or ineligible withdrawal leaves the registration and capacity unchanged and gives clear feedback. | TC-18-11 |
| **KAN-17-AC101** | An attendee may withdraw their own active registration before event start, including after registration has closed; at or after start withdrawal is refused. | TC-18-07 |
| **KAN-17-AC102** | The confirmation explains that re-registration is allowed only if the event is still open and has capacity; it must not promise a saved place. | TC-18-08 |
| **KAN-17-AC103** | Withdrawal changes the existing record once, releases its capacity contribution once and uses KAN-80 (using KAN-64 infrastructure) for attendee/manager notifications; repeated requests cannot release another place. | TC-18-10 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 2 SP. Owner: Ernest; independent reviewer: Ryan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Attendee, I want to withdraw my registration for an event I can no longer attend so that I am no longer expected and my place becomes available.

### Acceptance Criteria

1. An attendee can select an eligible registration belonging to them and request withdrawal.
2. Before saving, the attendee is asked to confirm withdrawal and is informed of the applicable re-registration restrictions.
3. Confirmed withdrawal is saved against the correct attendee and event; the registration is no longer treated as active.
4. The attendee can view the withdrawn status after reopening or refreshing the page.
5. Withdrawal releases the active registration’s capacity contribution once. Repeated attempts cannot release extra capacity or alter unrelated registrations.
6. An attendee cannot withdraw another attendee’s registration through the interface or API.
7. A failed or ineligible withdrawal leaves the registration and capacity unchanged and gives clear feedback.

### Refinement notes — 21 September 2026

Agree withdrawal timing/eligible states and whether re-registration is allowed before implementation. The warning must reflect that policy; permanent re-registration prohibition is not assumed.

Coordinate capacity with KAN-14, manager registration visibility with KAN-67 and notifications with KAN-64. Waiting lists are not a dependency.

The existing 2-point estimate is retained for history and must be reviewed after refinement before sprint selection. This future story is outside the 43-point Sprint 2 baseline.

### Sprint 3 selected scope and verification

Owner: Ernest. Independent reviewer: Ryan. Selected estimate: 2 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-17-AC101:** An attendee may withdraw their own active registration before event start, including after registration has closed; at or after start withdrawal is refused.
* **KAN-17-AC102:** The confirmation explains that re-registration is allowed only if the event is still open and has capacity; it must not promise a saved place.
* **KAN-17-AC103:** Withdrawal changes the existing record once, releases its capacity contribution once and uses KAN-80 (using KAN-64 infrastructure) for attendee/manager notifications; repeated requests cannot release another place.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-67 — View Event Registrations

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 2 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T10

**User story:** As an Event Organiser or Event Coordinator, I want to view registration information for events I manage so that I can understand current attendee registrations.

**Transferred test group:** S3-T13 → S4-T10; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-67-AC1** | An authorised organiser or current coordinator can open registration information for an event they own or manage. | TC-18-12 |
| **KAN-67-AC2** | The displayed registrations and counts correspond to the correct event. | TC-18-13 |
| **KAN-67-AC3** | Active and withdrawn registrations can be distinguished where applicable. | TC-18-13 |
| **KAN-67-AC4** | Registration information and counts reflect successful attendee registration or withdrawal when refreshed. | TC-18-14 |
| **KAN-67-AC5** | An event with no registrations shows a clear empty result rather than unrelated or stale registrations. | TC-18-15 |
| **KAN-67-AC6** | Users cannot view protected registration information for unrelated events, including through direct API calls. | TC-18-12 |
| **KAN-67-AC7** | The information exposed is limited to the fields needed by that authorised role under the agreed disclosure rules. | TC-18-16 |
| **KAN-67-AC101** | The owning organiser and currently assigned coordinator may see attendee display name, email, status and registration/withdrawal timestamps; do not expose authentication IDs or unrelated account data. | TC-18-16 |
| **KAN-67-AC102** | Distinguish active, withdrawn and event-cancelled registrations and count only active records toward capacity. | TC-18-13 |
| **KAN-67-AC103** | After reassignment, the former coordinator loses roster access immediately; current-data refresh must not retain another event's roster after route/account changes. | TC-18-17 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files when implemented; historical schema or removed code is not feature completion.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 2 SP. Owner: Ernest; independent reviewer: Ryan. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

User Story
As an Event Organiser or Event Coordinator, I want to view registration information for events I manage so that I can understand current attendee registrations.

Acceptance Criteria

1. An authorised organiser or current coordinator can open registration information for an event they own or manage.
2. The displayed registrations and counts correspond to the correct event.
3. Active and withdrawn registrations can be distinguished where applicable.
4. Registration information and counts reflect successful attendee registration or withdrawal when refreshed.
5. An event with no registrations shows a clear empty result rather than unrelated or stale registrations.
6. Users cannot view protected registration information for unrelated events, including through direct API calls.
7. The information exposed is limited to the fields needed by that authorised role under the agreed disclosure rules.

Refinement before selection
Agree the personal/contact fields each manager may see and the treatment of withdrawn records. An export feature is not implied. Coordinate KAN-14 registration, KAN-17 withdrawal and KAN-65 reassignment so access follows the current event relationship. Record the refresh expectation and test against a second unrelated organiser/coordinator.

Added 21 September 2026. Unestimated, unassigned future backlog outside Sprint 2’s 43 points.

### Sprint 3 selected scope and verification

Owner: Ernest. Independent reviewer: Ryan. Selected estimate: 2 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-67-AC101:** The owning organiser and currently assigned coordinator may see attendee display name, email, status and registration/withdrawal timestamps; do not expose authentication IDs or unrelated account data.
* **KAN-67-AC102:** Distinguish active, withdrawn and event-cancelled registrations and count only active records toward capacity.
* **KAN-67-AC103:** After reassignment, the former coordinator loses roster access immediately; current-data refresh must not retain another event's roster after route/account changes.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-66 — Update Event Information During Planning

**Owner:** Irfan (assigned in Jira 26 October 2026; subtasks KAN-107/108/109) · **Independent reviewer:** To agree · **Estimate:** 3 SP (unchanged) · **Jira status:** In Progress · **Acceptance:** Not assessed · **Test group:** S4-T11

**User story:** As an authorised event manager, I want to update relevant event information during planning so that the event record remains accurate as arrangements are made.

**Transferred test group:** S3-T14 → S4-T11; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-66-AC1** | An authorised user can view current information for an event they are permitted to manage. | TC-07-01 |
| **KAN-66-AC2** | The user can edit and save the fields permitted for their role, relationship to the event and lifecycle stage. | TC-07-01 |
| **KAN-66-AC3** | Updated values remain associated with the correct event and are visible after reopening and refreshing. | TC-07-02 |
| **KAN-66-AC4** | Unauthorised users cannot modify the event through the interface or direct API. | TC-07-03 |
| **KAN-66-AC5** | Ordinary edits retain unaffected event information and do not incorrectly change existing arrangements or unrelated events. | TC-07-02 |
| **KAN-66-AC6** | The system distinguishes ordinary edits from significant changes under the agreed field and lifecycle rules. | TC-07-04 |
| **KAN-66-AC7** | Date, time, expected attendance, venue requirements and equipment requirements are assessed as potentially significant rather than automatically treated as harmless edits. | TC-07-04 |
| **KAN-66-AC8** | Significant changes use the KAN-15 change-review process and cannot silently leave incompatible venue or equipment arrangements treated as valid. Major changes affecting confirmed arrangements follow the agreed cancellation/new-request rule. | TC-07-04 |
| **KAN-66-AC101** | Before initial approval, the owning organiser can directly edit their SUBMITTED, UNDER_REVIEW or CLARIFICATION_REQUESTED request using complete submission validation; preserve assignment and status and make stale reviewers refresh. | TC-07-01 |
| **KAN-66-AC102** | For APPROVED or CONFIRMED events, ordinary direct editing is restricted to the assigned coordinator and to name/description; other planning requirement fields use KAN-15. | TC-07-03 |
| **KAN-66-AC103** | Changes must preserve audit information and use an expected revision to reject stale overwrites; unauthorised fields are refused server-side, even if a client sends them. | TC-07-05 |

**Implementation location (26 October 2026, branch `feat/KAN-66-planning-edits`):** `database/migrations/016_event_request_revisions.sql`; `backend/src/modules/events/planning-edit-policy.ts`, `update-draft.ts`, `draft-update-input.ts`, `draft-eligibility.ts`, `event-request-detail.ts`, `submitted-requests-router.ts`, `workflow-support.ts`, `review-input.ts`, `review-decision.ts`, `review-router.ts`, `clarifications.ts`, `clarification-router.ts`; `frontend/src/features/events/pages/EventDetailsEditPage.vue` (route `/events/:id/details`), `EventRequestDetailPage.vue`, `EventDraftEditPage.vue`, `api/event-requests.ts`, `api/clarifications.ts`, `components/ClarificationPanel.vue`, `components/EventPlanningPanels.vue`; `frontend/src/features/reviews/pages/ReviewRequestPage.vue`, `components/ReviewDecisionPanel.vue`, `types.ts`.

**Automated test files:** `backend/test/events/planning-edit-policy.test.ts`, `update-event-request.test.ts`, `submitted-requests-router.test.ts`, `event-request-detail.test.ts`, `review-input.test.ts`, `review-router.test.ts`, `workflow-support.test.ts`; `database/tests/events/planning-edits.integration.test.ts`, `update-draft.integration.test.ts`; `frontend/src/features/events/pages/EventDetailsEditPage.test.ts`, `EventRequestDetailPage.test.ts`, `EventDraftEditPage.test.ts`, `api/event-requests.test.ts`, `components/ClarificationPanel.test.ts`; `frontend/src/features/reviews/pages/ReviewRequestPage.test.ts`; `tests/e2e/kan66-planning-edits.spec.ts`.

**Implementation decisions (26 October 2026, approved by Irfan in the working session):** D1 integer `event_requests.revision` advanced by a trigger on every update; D2 `event_request_edits` audit table; D3 reviewer actions (start review, clarification request, initial decision) accept `expectedRevision`; D4 the existing `PATCH /api/events/:id` is extended rather than a new route. See the [decision log](../../requirements/assumptions-and-questions.md#26-october-2026--kan-66-planning-edit-implementation-decisions).

**Acceptance dependency:** KAN-66-AC8 needs the KAN-15 review workflow. KAN-66 refuses significant fields after approval with `409 SIGNIFICANT_CHANGE_REQUIRED` and directs users to a reviewed change request; full AC8 acceptance is assessed together with KAN-15.

| Test | 26 October 2026 status |
| --- | --- |
| Unit/component (`npm run check`) | Pass — `AUTO-20261026-KAN66-01`; re-run Pass 27 October on `3ac15d5` (`AUTO-20261027-KAN66-03`) |
| Browser fixtures (`tests/e2e/kan66-planning-edits.spec.ts`) | Pass — `AUTO-20261026-KAN66-02` (substituted API responses; not live integration) |
| PostgreSQL integration (`planning-edits.integration.test.ts`) | Pass in CI, 23/23 (full suite 533/533) — `CI-20261027-KAN66-02`, run 40499977926 on `27d5d84`; first run `CI-20261027-KAN66-01` failed on 14 outdated expectations, fixed |
| Local integrated acceptance (AGENTS.md §5.12) | **Not executed** |

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 3 SP. Owner: Ryan; independent reviewer: Arvin. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

User Story
As an authorised event manager, I want to update relevant event information during planning so that the event record remains accurate as arrangements are made.

Acceptance Criteria

1. An authorised user can view current information for an event they are permitted to manage.
2. The user can edit and save the fields permitted for their role, relationship to the event and lifecycle stage.
3. Updated values remain associated with the correct event and are visible after reopening and refreshing.
4. Unauthorised users cannot modify the event through the interface or direct API.
5. Ordinary edits retain unaffected event information and do not incorrectly change existing arrangements or unrelated events.
6. The system distinguishes ordinary edits from significant changes under the agreed field and lifecycle rules.
7. Date, time, expected attendance, venue requirements and equipment requirements are assessed as potentially significant rather than automatically treated as harmless edits.
8. Significant changes use the KAN-15 change-review process and cannot silently leave incompatible venue or equipment arrangements treated as valid. Major changes affecting confirmed arrangements follow the agreed cancellation/new-request rule.

Refinement before selection
Agree the editable field-by-role-by-stage matrix, validation and concurrency policy. Customer discussions allow organiser edits before approval but restrict general event editing to coordinators; the exact boundary remains open. KAN-34 covers drafts, this story covers ordinary planning edits, and KAN-15 owns significant-change processing. Define audit details and relevant notifications with KAN-64.

Added 21 September 2026. Unestimated, unassigned future backlog outside Sprint 2’s 43 points.

### Sprint 3 selected scope and verification

Owner: Ernest. Independent reviewer: Ryan. Selected estimate: 3 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-66-AC101:** Before initial approval, the owning organiser can directly edit their SUBMITTED, UNDER_REVIEW or CLARIFICATION_REQUESTED request using complete submission validation; preserve assignment and status and make stale reviewers refresh.
* **KAN-66-AC102:** For APPROVED or CONFIRMED events, ordinary direct editing is restricted to the assigned coordinator and to name/description; other planning requirement fields use KAN-15.
* **KAN-66-AC103:** Changes must preserve audit information and use an expected revision to reject stale overwrites; unauthorised fields are refused server-side, even if a client sends them.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-15 — Submit and Review Event Change Requests

**Owner:** Irfan (assigned in Jira 26 October 2026) · **Independent reviewer:** To agree · **Estimate:** 5 SP (unchanged) · **Jira status:** In Progress · **Acceptance:** Not assessed · **Test group:** S4-T12

**User story:** As an Event Organiser, I want to submit significant changes to my event for review by the authorised Event Coordinator so that feasible changes can be agreed without leaving incompatible arrangements in place.

**Transferred test group:** S3-T23 → S4-T12; original case IDs are retained. This is planned reallocation, not completed work or earned points.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-15-AC1** | An organiser can submit a change request for an event they own, identifying the requested changes; no fixed response deadline or change-request cutoff is imposed. | TC-19-01 |
| **KAN-15-AC2** | The request is saved against the correct event as Pending review and does not itself apply the requested changes or silently alter existing arrangements. | TC-19-01 |
| **KAN-15-AC3** | The authorised coordinator can open the pending request and compare the current event information with the requested values. | TC-19-02 |
| **KAN-15-AC4** | The coordinator can assess effects on venue bookings, equipment and other applicable arrangements before recording an agreed review outcome. | TC-19-02 |
| **KAN-15-AC5** | The outcome is saved against the correct change request and is visible to the relevant organiser and coordinator after refresh. | TC-19-03 |
| **KAN-15-AC6** | When an accepted change is eligible for application under the agreed policy, the permitted values are applied to the correct event. Rejected changes leave existing event information unchanged. | TC-19-03 |
| **KAN-15-AC7** | Significant changes to dates, times, attendance, venue or equipment needs identify affected arrangements for reconsideration; incompatible arrangements must not silently remain valid. | TC-19-04 |
| **KAN-15-AC8** | Major changes affecting confirmed arrangements require cancellation and a new request instead of silently changing the confirmed event. | TC-19-04 |
| **KAN-15-AC9** | Unauthorised users cannot submit or decide changes for unrelated events through the interface or API. | TC-19-05 |
| **KAN-15-AC10** | The relevant coordinator receives a request notification and the organiser receives acknowledgement/outcome information through the selected notification channel. | TC-19-06 |
| **KAN-15-AC101** | Accept at most one pending significant-change request for an APPROVED or CONFIRMED event, submitted by its owner and decided by its current coordinator; preserve proposed and previous values. | TC-19-01 |
| **KAN-15-AC102** | Significant fields are purpose, dates/times, attendance, venue/equipment/accessibility requirements and registration settings. Ordinary name/description edits follow KAN-66. | TC-19-07 |
| **KAN-15-AC103** | Before approving, show affected arrangements and registrations. A change affecting an already confirmed arrangement or active registrations requires cancellation and a new event request, not in-place approval. | TC-19-04 |
| **KAN-15-AC104** | When no affected arrangement is confirmed, apply an approved change only after current validation; cancel affected pending arrangements explicitly for resubmission while preserving unaffected arrangements. | TC-19-08 |
| **KAN-15-AC105** | Decision and changes are atomic and version-checked; rejection requires a reason. Use KAN-80 (using KAN-64 infrastructure) for acknowledgement, coordinator request, organiser outcome and attendee-relevant changes without imposing a fixed response deadline. | TC-19-09 |

**Implementation location (27 October 2026, branch `feat/KAN-15-change-requests`, stacked on KAN-66):** `database/migrations/017_event_change_requests.sql`; `backend/src/modules/events/change-requests.ts`, `change-request-impact.ts`, `change-request-router.ts`; `backend/src/modules/notifications/change-request-notifications.ts`; `backend/src/modules/events/update-draft.ts` (exports `sameValue`); `backend/src/app.ts`; `frontend/src/features/events/pages/EventChangeRequestPage.vue` (route `/events/:id/change-request`), `components/ChangeRequestPanel.vue`, `components/EventPlanningPanels.vue`, `api/change-requests.ts`, `change-request-fields.ts`, `pages/EventRequestDetailPage.vue`; `frontend/src/app/router.ts`.

**Automated test files:** `backend/test/events/change-requests.test.ts`, `change-request-impact.test.ts`, `backend/test/notifications/change-request-notifications.test.ts`; `database/tests/events/change-requests.integration.test.ts`; `frontend/src/features/events/components/ChangeRequestPanel.test.ts`, `pages/EventChangeRequestPage.test.ts`; `tests/e2e/kan15-change-requests.spec.ts`. Updated: `backend/test/sprint-scope.test.ts` (routes now in scope), `database/tests/database.integration.test.ts` (migration lists), `tests/e2e/workspace-fixtures.ts` (empty change-request reads).

**Implementation decisions (27 October 2026, approved by Irfan in the working session):** D1–D8 in the [decision log](../../requirements/assumptions-and-questions.md#27-october-2026--kan-15-change-request-implementation-decisions).

| Test | 27 October 2026 status |
| --- | --- |
| Unit/component (`npm run check`, coverage) | Pass — `AUTO-20261027-KAN15-01` |
| Browser fixtures (`tests/e2e/kan15-change-requests.spec.ts`; full suite 164/164) | Pass — `AUTO-20261027-KAN15-01` (substituted API responses; not live integration) |
| PostgreSQL integration (`change-requests.integration.test.ts`) | Pass in CI, 11/11 (full suite 544/544) — `CI-20261027-KAN15-02`, run 40509445003 on `6c5043c`; first run `CI-20261027-KAN15-01` failed on two test assumptions, fixed |
| Local integrated acceptance (AGENTS.md §5.12) | **Not executed** — needs migrations 016 and 017 on shared Supabase |

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### Preserved release allocation before self-selection — 16 October 2026

Selected Sprint 4; 5 SP. Owner: Irfan; independent reviewer: Ernest. This allocation supersedes older sprint/owner labels below; original acceptance criteria remain unless a dated refinement explicitly supersedes them. Tristan authorised the full Release 1 backlog reconstruction and balanced 63/63 sprint allocation in chat; no team vote or acceptance outcome is asserted.

Moved from the earlier 97-SP Sprint 3 selection to Sprint 4 before implementation. Later-workflow notification triggers now belong to KAN-80, using KAN-64's shared inbox; this changes scope ownership, not required behaviour.

Customer changes were received 2 October 2026 (Tristan's confirmation recorded 16 October); the team intended to complete Sprint 2 against its existing scope and consider changes during Sprint 3 planning. This record does not rewrite Sprint 2 scope or acceptance. Current planning: docs/scrum/sprint-03/ and sprint-04/; change provenance: docs/requirements/change-requests.md.

---

### User Story

As an Event Organiser, I want to submit significant changes to my event for review by the authorised Event Coordinator so that feasible changes can be agreed without leaving incompatible arrangements in place.

### Acceptance Criteria

1. An organiser can submit a change request for an event they own, identifying the requested changes; no fixed response deadline or change-request cutoff is imposed.
2. The request is saved against the correct event as Pending review and does not itself apply the requested changes or silently alter existing arrangements.
3. The authorised coordinator can open the pending request and compare the current event information with the requested values.
4. The coordinator can assess effects on venue bookings, equipment and other applicable arrangements before recording an agreed review outcome.
5. The outcome is saved against the correct change request and is visible to the relevant organiser and coordinator after refresh.
6. When an accepted change is eligible for application under the agreed policy, the permitted values are applied to the correct event. Rejected changes leave existing event information unchanged.
7. Significant changes to dates, times, attendance, venue or equipment needs identify affected arrangements for reconsideration; incompatible arrangements must not silently remain valid.
8. Major changes affecting confirmed arrangements require cancellation and a new request instead of silently changing the confirmed event.
9. Unauthorised users cannot submit or decide changes for unrelated events through the interface or API.
10. The relevant coordinator receives a request notification and the organiser receives acknowledgement/outcome information through the selected notification channel.

### Refinement notes — 21 September 2026

This story includes submission and coordinator review. Do not create a duplicate processing story. KAN-34 covers draft editing; KAN-66 covers ordinary permitted planning edits; KAN-62 covers cancellation; KAN-64 supplies notification delivery.

Agree the field/role/lifecycle matrix, accepted/rejected or other review outcomes, significance rules, resource revalidation and concurrent-change handling. Resolve the pre-approval organiser-editing versus coordinator-editing clarification before implementing the boundary. Email is not mandatory.

The existing 2-point estimate is retained for history and must be reviewed after refinement before sprint selection. This future story is outside the 43-point Sprint 2 baseline.

### Sprint 3 selected scope and verification

Owner: Irfan. Independent reviewer: Ernest. Selected estimate: 5 SP. Decision method: Codex selection under Tristan's explicit delegated authority; no team voting session is asserted.
Explicit estimate change: 2 → 5 SP, reflecting submission, review, arrangement impacts and concurrency beyond the 2-SP read-only anchor.

Additional verification criteria (stable IDs in the 101+ range; original wording and IDs above are preserved):

* **KAN-15-AC101:** Accept at most one pending significant-change request for an APPROVED or CONFIRMED event, submitted by its owner and decided by its current coordinator; preserve proposed and previous values.
* **KAN-15-AC102:** Significant fields are purpose, dates/times, attendance, venue/equipment/accessibility requirements and registration settings. Ordinary name/description edits follow KAN-66.
* **KAN-15-AC103:** Before approving, show affected arrangements and registrations. A change affecting an already confirmed arrangement or active registrations requires cancellation and a new event request, not in-place approval.
* **KAN-15-AC104:** When no affected arrangement is confirmed, apply an approved change only after current validation; cancel affected pending arrangements explicitly for resubmission while preserving unaffected arrangements.
* **KAN-15-AC105:** Decision and changes are atomic and version-checked; rejection requires a reason. Use KAN-80 (using KAN-64 infrastructure) for acknowledgement, coordinator request, organiser outcome and attendee-relevant changes without imposing a fixed response deadline.

Implementation defaults: docs/scrum/sprint-03/planning.md and docs/requirements/assumptions-and-questions.md. These are delegated release choices, not customer quotations. Complete API/UI integration, negative/boundary/concurrency checks, hosted verification, independent review and related documentation before Done.

</details>

### KAN-80 — Receive Equipment, Lifecycle, Change and Registration Notifications

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 3 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T13

**User story:** As a relevant organiser, internal staff member or attendee, I want equipment, event lifecycle, change and registration updates in my inbox so that I can act on outcomes that affect me.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-80-AC1** | Equipment confirmation and unavailability notify the current assigned coordinator and relevant technical staff without exposing unrelated events. | TC-20-21 |
| **KAN-80-AC2** | Significant-change submission, requests for action and decisions notify the organiser and reviewing coordinator; changes that affect registered attendees notify those active attendees. | TC-20-22 |
| **KAN-80-AC3** | Final event confirmation and cancellation notify the organiser, current coordinator and affected registered attendees or arrangement staff as applicable. | TC-20-23 |
| **KAN-80-AC4** | Registration and withdrawal acknowledge the attendee and notify the organiser/current coordinator; a failed or repeated unchanged action creates no new business-outcome notification. | TC-20-24 |
| **KAN-80-AC5** | Each notification identifies the correct event and equipment request, change request or registration where applicable, with enough information for the recipient to understand the outcome and required action. | TC-20-25 |
| **KAN-80-AC6** | Only the intended recipient can list/read or change read state; following a protected link rechecks current role and event permissions, including after reassignment. | TC-20-26 |
| **KAN-80-AC7** | All added trigger notifications persist atomically with the recorded business outcome using the KAN-64 outcome/recipient uniqueness mechanism; rollback creates none and retry creates no duplicate. | TC-20-27 |
| **KAN-80-AC8** | Every added trigger uses the delivered KAN-64 authenticated inbox and read/unread behaviour and the recorded recipient matrix, including acknowledgements where the actor is also a recipient. No email delivery is required. | TC-20-28 |
| **KAN-80-AC9** | CR-2 outage, CR-4 hold and CR-6 safety notifications remain acceptance responsibilities of those separate customer-change stories; this story does not count their implementation twice. | TC-20-29 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files during implementation; these planned tests are not completion evidence.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### User Story

As a relevant organiser, internal staff member or attendee, I want equipment, event lifecycle, change and registration updates in my inbox so that I can act on outcomes that affect me.

### Acceptance Criteria

1. Equipment confirmation and unavailability notify the current assigned coordinator and relevant technical staff without exposing unrelated events.
2. Significant-change submission, requests for action and decisions notify the organiser and reviewing coordinator; changes that affect registered attendees notify those active attendees.
3. Final event confirmation and cancellation notify the organiser, current coordinator and affected registered attendees or arrangement staff as applicable.
4. Registration and withdrawal acknowledge the attendee and notify the organiser/current coordinator; a failed or repeated unchanged action creates no new business-outcome notification.
5. Each notification identifies the correct event and equipment request, change request or registration where applicable, with enough information for the recipient to understand the outcome and required action.
6. Only the intended recipient can list/read or change read state; following a protected link rechecks current role and event permissions, including after reassignment.
7. All added trigger notifications persist atomically with the recorded business outcome using the KAN-64 outcome/recipient uniqueness mechanism; rollback creates none and retry creates no duplicate.
8. Every added trigger uses the delivered KAN-64 authenticated inbox and read/unread behaviour and the recorded recipient matrix, including acknowledgements where the actor is also a recipient. No email delivery is required.
9. CR-2 outage, CR-4 hold and CR-6 safety notifications remain acceptance responsibilities of those separate customer-change stories; this story does not count their implementation twice.

### Planning and scope provenance

Split from KAN-64 on 16 October 2026 under Tristan's delegated planning authority. This is original Release 1 scope, not a new customer change. Original KAN-64 = 8 SP; narrowed KAN-64 = 5 SP and this story = 3 SP, preserving the total. Old AC3 (equipment/significant changes), AC4 and AC5 transfer here; shared AC6-9 and AC101-106 protections are retained across both stories. The complete mapping and original description are preserved in docs/requirements/change-requests.md and Sprint 3/4 backlog records.

Selected Sprint 4 (18-31 October), owner Irfan, independent reviewer Ernest. 3 SP reuses the delivered 5-SP inbox, authorization, transaction and deduplication infrastructure. Owns later-workflow trigger integration and matrix verification; original combined KAN-64 was 8 SP.

Dependencies: KAN-64, KAN-63, KAN-26, KAN-15, KAN-61, KAN-62, KAN-14, KAN-17. Reuse inbox contract, add business-event payloads and recipient integrations, update workflow sequences and transaction tests.

All original/new triggers require unit/integration/E2E and hosted verification; no implementation or test pass is claimed by this card.

</details>

### KAN-82 — Manage each venue arrangement independently for an event

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 5 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T14

**User story:** As an Event Coordinator, I want to manage multiple venue arrangements independently for one event, so that changing or cancelling one arrangement does not silently alter the others.

**Source:** CR-3, received 2 October 2026 with receipt confirmed on 16 October. Sprint 2 retains its original scope. New linked extension covering missing independent arrangement actions; reuse already implemented multi-row booking creation.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-82-AC1** | The currently assigned coordinator can request and view more than one venue arrangement for the same eligible event; each arrangement has a stable identity and remains linked to the correct event and venue. | TC-12-01 |
| **KAN-82-AC2** | Each venue arrangement uses its own requested interval, layout and requirements and is checked independently against current venue suitability, operating hours, buffered availability, operational blocks and live holds. | TC-12-02 |
| **KAN-82-AC3** | A request or decision that fails for one venue does not save a partial change to another arrangement, delete unrelated arrangements or alter their decision/hold states. | TC-12-03 |
| **KAN-82-AC4** | The assigned coordinator may explicitly cancel one pending, held or approved arrangement on an APPROVED or CONFIRMED event using a trimmed nonempty reason and a confirmation showing that arrangement. Cancellation releases only its reservation/hold and preserves its recorded identity, decisions and reason. | TC-12-04 |
| **KAN-82-AC5** | Changing a selected arrangement is an explicit cancel-and-resubmit workflow: the interface explains that the original reservation is released, records the cancellation, and creates a separately validated replacement request linked to that arrangement. The replacement starts pending and must undergo the usual Venue Staff approval. | TC-12-05 |
| **KAN-82-AC6** | If replacement submission fails or is rejected, the already cancelled original is not silently restored or reported as reserved; the coordinator sees the cancellation and can retry a new linked request while unrelated arrangements remain intact. | TC-12-06 |
| **KAN-82-AC7** | Independent arrangement actions preserve the parent event's name, dates, attendance and other event-level fields. Event-wide significant changes continue through KAN-15 and cancellation of the entire event continues through KAN-62; those actions are not disguised as a single-venue edit. | TC-12-07 |
| **KAN-82-AC8** | Venue decisions, hold deadlines, recovery flags and cancellation/replacement links are shown per arrangement on the authorised event view; an aggregate label never hides an outstanding pending, affected or invalid arrangement. | TC-12-08 |
| **KAN-82-AC9** | Cancelling or replacing an arrangement rechecks event readiness and invalidates any safety approval tied to the changed arrangement revision. It does not automatically cancel the event or release unrelated venue/equipment allocations. | TC-12-09 |
| **KAN-82-AC10** | Authorization is rechecked on the server using the current assignment. Stale or competing cancel/approve/hold-expiry actions resolve against locked current state; repeated cancellation cannot release availability twice, overwrite a newer decision or duplicate notification/history rows. | TC-12-10 |
| **KAN-82-AC11** | A successful independent cancellation or replacement request produces a protected in-app notice for the current coordinator and relevant Venue Staff through the shared notification mechanism, only after its mutation commits and without duplicate retry notices. | TC-12-11 |
| **KAN-82-AC12** | The UI identifies the selected event, venue and interval before acting, disables duplicate submissions, preserves other arrangements on success and offers a current-state refresh after uncertain network outcomes or stale conflicts. | TC-12-12 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files during implementation; these planned tests are not completion evidence.

**Dependencies:** Existing venue request and decision workflows; CR-2 recovery links and CR-4 hold states; KAN-78 buffered conflict rules; KAN-64 notification mechanism.

**Design impact:** Planned per-arrangement action routes and frontend controls, replacement linkage/audit if not provided by CR-2, aggregate readiness queries, safety invalidation integration and API/sequence updates. Preserve applied migrations and add only missing schema fields.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### User Story

As an Event Coordinator, I want to manage multiple venue arrangements independently for one event, so that changing or cancelling one arrangement does not silently alter the others.

### Acceptance Criteria

1. The currently assigned coordinator can request and view more than one venue arrangement for the same eligible event; each arrangement has a stable identity and remains linked to the correct event and venue.
2. Each venue arrangement uses its own requested interval, layout and requirements and is checked independently against current venue suitability, operating hours, buffered availability, operational blocks and live holds.
3. A request or decision that fails for one venue does not save a partial change to another arrangement, delete unrelated arrangements or alter their decision/hold states.
4. The assigned coordinator may explicitly cancel one pending, held or approved arrangement on an APPROVED or CONFIRMED event using a trimmed nonempty reason and a confirmation showing that arrangement. Cancellation releases only its reservation/hold and preserves its recorded identity, decisions and reason.
5. Changing a selected arrangement is an explicit cancel-and-resubmit workflow: the interface explains that the original reservation is released, records the cancellation, and creates a separately validated replacement request linked to that arrangement. The replacement starts pending and must undergo the usual Venue Staff approval.
6. If replacement submission fails or is rejected, the already cancelled original is not silently restored or reported as reserved; the coordinator sees the cancellation and can retry a new linked request while unrelated arrangements remain intact.
7. Independent arrangement actions preserve the parent event's name, dates, attendance and other event-level fields. Event-wide significant changes continue through KAN-15 and cancellation of the entire event continues through KAN-62; those actions are not disguised as a single-venue edit.
8. Venue decisions, hold deadlines, recovery flags and cancellation/replacement links are shown per arrangement on the authorised event view; an aggregate label never hides an outstanding pending, affected or invalid arrangement.
9. Cancelling or replacing an arrangement rechecks event readiness and invalidates any safety approval tied to the changed arrangement revision. It does not automatically cancel the event or release unrelated venue/equipment allocations.
10. Authorization is rechecked on the server using the current assignment. Stale or competing cancel/approve/hold-expiry actions resolve against locked current state; repeated cancellation cannot release availability twice, overwrite a newer decision or duplicate notification/history rows.
11. A successful independent cancellation or replacement request produces a protected in-app notice for the current coordinator and relevant Venue Staff through the shared notification mechanism, only after its mutation commits and without duplicate retry notices.
12. The UI identifies the selected event, venue and interval before acting, disables duplicate submissions, preserves other arrangements on success and offers a current-state refresh after uncertain network outcomes or stale conflicts.

### Customer source and chronology

Week 7 Customer Changes.pdf, page 1, item 3: support multiple venues per event, check each arrangement separately, and preserve other arrangements when one is changed or cancelled.

Received 2 October 2026, confirmed by Tristan in chat on 16 October. The team intended to finish Sprint 2 against its original scope and consider these changes during Sprint 3 planning. Source inspection recorded 15 October; backlog reconstruction recorded 16 October. These dates are distinct; no earlier finalisation or customer approval of implementation defaults is claimed.

Classification: New linked extension covering missing independent arrangement actions; reuse already implemented multi-row booking creation.

### Delegated release defaults

* Per-arrangement periods reuse the current valid booking-period contract; this story does not silently add a new event-period containment restriction.
* The selected replacement mechanism is explicit cancellation then a new request, not in-place mutation of an approved row or an invisible all-or-nothing multi-venue operation.
* A coordinator must be told that cancelling first releases the original space and that a replacement is not guaranteed.
* Whole-event cancellation, event-level significant-change review and outage-specific recovery remain their own stories.

### Planning and delivery

Selected Sprint 4; 5 SP. Owner: Ryan; independent reviewer: Arvin. Codex selected scope/estimates/defaults under Tristan's explicit delegated authority in chat; no independent six-member vote is claimed.

Estimate rationale: 5 SP: comparable to KAN-53 booking submission plus controlled cancellation/replacement, aggregation and isolation regressions; existing request creation, approval and suitability are reused rather than reimplemented. General event-wide significant changes remain KAN-15.

Core features: CF-12, CF-13, CF-14, CF-19. Related stories: KAN-53, KAN-8, KAN-51, KAN-52, KAN-54, KAN-15, KAN-62.
Dependencies: Existing venue request and decision workflows; CR-2 recovery links and CR-4 hold states; KAN-78 buffered conflict rules; KAN-64 notification mechanism.

Design impact: Planned per-arrangement action routes and frontend controls, replacement linkage/audit if not provided by CR-2, aggregate readiness queries, safety invalidation integration and API/sequence updates. Preserve applied migrations and add only missing schema fields.

Test plan:

* AC1/AC2/AC3: One event requests venues A and B; approve A, fail B's conflict check and verify A stays approved with correct associations.
* AC4/AC5/AC6: Cancel-and-replace only B, then fail the replacement submission; B stays honestly cancelled, A remains reserved and retry produces a linked pending request.
* AC7/AC8/AC9: Compare parent fields and unrelated allocations before/after one arrangement action; readiness/safety becomes stale when required while the event and unrelated rows remain.
* AC10/AC11: Attempt action as old/wrong coordinator; race cancel with approval and expiry; retry after committed write; only one release and one notice.
* AC12: Browser confirmation names the selected venue, handles cancellation plus failed replacement honestly and refreshes after network uncertainty.

Update contracts/diagrams, test cases, traceability, actual run evidence and sprint acceptance status during implementation. All new tests Not executed; acceptance Not assessed. Change history: docs/requirements/change-requests.md.

</details>

### KAN-84 — Review operational safety before event preparation

**Owner:** Unassigned — team member to choose · **Independent reviewer:** To agree after owner chosen · **Estimate:** 8 SP · **Jira status:** To Do · **Acceptance:** Not assessed · **Test group:** S4-T15

**User story:** As a Safety Officer, I want to review confirmed venue and technical arrangements and approve, reject or request changes, so that preparation starts only when the current operational arrangements have safety approval.

**Source:** CR-6, received 2 October 2026 with receipt confirmed on 16 October. Sprint 2 retains its original scope. New role and safety approval gate; distinct from advisory venue suitability and initial event approval.

| Stable criterion | Requirement | Functional case |
| --- | --- | --- |
| **KAN-84-AC1** | A trusted SAFETY_OFFICER application role can access an authorised safety-review queue and detail view; other roles cannot decide safety reviews or gain protected review access merely by being internal users. | TC-06-20 |
| **KAN-84-AC2** | The currently assigned coordinator can submit an APPROVED or CONFIRMED event for safety review only when every required venue arrangement is valid and approved, equipment is explicitly Not Required or all required technical arrangements are reserved and fulfilable, and no pending significant change or unresolved venue recovery remains. | TC-06-21 |
| **KAN-84-AC3** | Safety review presents the current event attendance, venue capacities and layouts, emergency access, accessibility, equipment placement, crowd-movement information and applicable restrictions. Missing information is visible and can be requested; advisory venue suitability is not shown as safety approval. | TC-06-22 |
| **KAN-84-AC4** | Only a Safety Officer can record one of Approve, Reject or Request Changes against the correct pending review and the specific event/arrangement revision reviewed. The decision, officer, timestamp and notes are persisted; Reject and Request Changes require a trimmed nonempty explanation. | TC-06-23 |
| **KAN-84-AC5** | Approve makes the current reviewed revision safety-approved. Reject leaves it not safety-approved and does not automatically cancel or delete the event, bookings, equipment or registrations; an updated arrangement may be submitted for a new review round. | TC-06-24 |
| **KAN-84-AC6** | Request Changes identifies venue, technical or both planning areas and the changes required, returns the workflow to those planning tasks for the assigned coordinator and relevant staff, and keeps unrelated arrangements and previous decision history intact. | TC-06-25 |
| **KAN-84-AC7** | Requested changes do not count as resolved merely because a comment is added. The responsible staff/coordinator update the relevant arrangements; readiness is rechecked and a new safety-review round is submitted, preserving the prior round and its outcome. | TC-06-26 |
| **KAN-84-AC8** | Event preparation can be started only by the currently assigned coordinator for a confirmed event whose current arrangement revision has an approved safety review and still passes live readiness checks. Pending, rejected, changes-requested, stale or missing safety approval blocks the action on both UI and server. | TC-06-27 |
| **KAN-84-AC9** | Changes to event time, attendance, safety-relevant requirements, venue/layout/operational availability or required equipment invalidate the prior safety approval and require re-review before preparation can start or continue. Ordinary name/description edits alone do not invalidate it. | TC-06-28 |
| **KAN-84-AC10** | Concurrent review decisions and arrangement changes are version checked within transactions. A stale review cannot approve newer arrangements; repeated or opposite decisions cannot overwrite a completed review round or create duplicate notifications. | TC-06-29 |
| **KAN-84-AC11** | Submission notifies the Safety Officer queue and decisions notify the current assigned coordinator; Request Changes also informs the relevant Venue/Technical Support Staff. The owning organiser can view an appropriate safety/preparation outcome without acquiring officer decision rights or unrelated protected data. | TC-06-30 |
| **KAN-84-AC12** | The workflow displays review rounds, current outcome, required remedial work and preparation eligibility, handles missing/stale data and network failure without claiming an unsaved decision, and refreshes after an uncertain write. The release does not invent a response deadline, escalation or automatic approval because the customer permits assuming the officer responds. | TC-06-31 |
| **KAN-84-AC101** | An event with a venue booking still requiring outage recovery (KAN-81) cannot pass the safety review. *(Moved from KAN-81-AC9, PO decision 28 October 2026.)* | TC-06-23 |

**Implementation location:** Not recorded. **Automated test files:** Not recorded. Record real files during implementation; these planned tests are not completion evidence.

**Dependencies:** KAN-61 event and arrangement readiness; KAN-63/KAN-26 technical arrangement reservation; KAN-15/KAN-66 revision-aware changes; CR-3 independent venue actions and CR-2 recovery state; KAN-64 persisted notification delivery.

**Design impact:** Planned additive role, safety review/round/revision and preparation-phase fields, queue/decision/submit/start-preparation APIs, live readiness/invalidation integration, structured review notes, notification events and frontend workflow; update C3, state/class/sequence diagrams, API and data model during implementation.

<details>
<summary>Preserved Jira description before self-selection (historical ownership)</summary>

### User Story

As a Safety Officer, I want to review confirmed venue and technical arrangements and approve, reject or request changes, so that preparation starts only when the current operational arrangements have safety approval.

### Acceptance Criteria

1. A trusted SAFETY_OFFICER application role can access an authorised safety-review queue and detail view; other roles cannot decide safety reviews or gain protected review access merely by being internal users.
2. The currently assigned coordinator can submit an APPROVED or CONFIRMED event for safety review only when every required venue arrangement is valid and approved, equipment is explicitly Not Required or all required technical arrangements are reserved and fulfilable, and no pending significant change or unresolved venue recovery remains.
3. Safety review presents the current event attendance, venue capacities and layouts, emergency access, accessibility, equipment placement, crowd-movement information and applicable restrictions. Missing information is visible and can be requested; advisory venue suitability is not shown as safety approval.
4. Only a Safety Officer can record one of Approve, Reject or Request Changes against the correct pending review and the specific event/arrangement revision reviewed. The decision, officer, timestamp and notes are persisted; Reject and Request Changes require a trimmed nonempty explanation.
5. Approve makes the current reviewed revision safety-approved. Reject leaves it not safety-approved and does not automatically cancel or delete the event, bookings, equipment or registrations; an updated arrangement may be submitted for a new review round.
6. Request Changes identifies venue, technical or both planning areas and the changes required, returns the workflow to those planning tasks for the assigned coordinator and relevant staff, and keeps unrelated arrangements and previous decision history intact.
7. Requested changes do not count as resolved merely because a comment is added. The responsible staff/coordinator update the relevant arrangements; readiness is rechecked and a new safety-review round is submitted, preserving the prior round and its outcome.
8. Event preparation can be started only by the currently assigned coordinator for a confirmed event whose current arrangement revision has an approved safety review and still passes live readiness checks. Pending, rejected, changes-requested, stale or missing safety approval blocks the action on both UI and server.
9. Changes to event time, attendance, safety-relevant requirements, venue/layout/operational availability or required equipment invalidate the prior safety approval and require re-review before preparation can start or continue. Ordinary name/description edits alone do not invalidate it.
10. Concurrent review decisions and arrangement changes are version checked within transactions. A stale review cannot approve newer arrangements; repeated or opposite decisions cannot overwrite a completed review round or create duplicate notifications.
11. Submission notifies the Safety Officer queue and decisions notify the current assigned coordinator; Request Changes also informs the relevant Venue/Technical Support Staff. The owning organiser can view an appropriate safety/preparation outcome without acquiring officer decision rights or unrelated protected data.
12. The workflow displays review rounds, current outcome, required remedial work and preparation eligibility, handles missing/stale data and network failure without claiming an unsaved decision, and refreshes after an uncertain write. The release does not invent a response deadline, escalation or automatic approval because the customer permits assuming the officer responds.

### Customer source and chronology

Week 7 Customer Changes.pdf, page 2, item 6: a new Safety Officer reviews after venue and technical arrangements are confirmed and before preparation; three possible outcomes; requested changes return to the relevant planning stage; preparation blocked without safety approval; officer response can be assumed.

Received 2 October 2026, confirmed by Tristan in chat on 16 October. The team intended to finish Sprint 2 against its original scope and consider these changes during Sprint 3 planning. Source inspection recorded 15 October; backlog reconstruction recorded 16 October. These dates are distinct; no earlier finalisation or customer approval of implementation defaults is claimed.

Classification: New role and safety approval gate; distinct from advisory venue suitability and initial event approval.

### Delegated release defaults

* Safety is a separately recorded workflow phase/review revision, not a reuse of event-review approval or a reinterpretation of venue suitability.
* Arrangement readiness precedes safety submission. Event CONFIRMED and safety APPROVED are separate conditions for an explicit start-preparation action, avoiding a circular prerequisite.
* Requested changes route venue/technical tasks and invalidate readiness without automatically cancelling the event lifecycle or releasing unaffected reservations.
* If a safety-relevant change occurs after preparation starts, show preparation blocked until the revised arrangements are approved; do not silently retain the former approval.
* Emergency access, equipment placement and crowd movement must be represented by reviewable fields/notes or clearly shown as missing. Do not claim existing free text proves those checks were performed.
* Trusted role provisioning is required. An officer response may be assumed; no timeout escalation feature is added.

### Planning and delivery

Selected Sprint 4; 8 SP. Owner: Kai Jie; independent reviewer: Tristan. Codex selected scope/estimates/defaults under Tristan's explicit delegated authority in chat; no independent six-member vote is claimed.

Estimate rationale: 8 SP: new trusted role, authorized queue/detail, revision-bound review records, three outcomes, targeted return-to-planning and preparation gating across venue/equipment/lifecycle consumers. Reuses the 2-SP KAN-33 detail and 3-SP KAN-36 decision patterns but adds readiness and invalidation complexity.

Core features: CF-01, CF-06, CF-11, CF-15, CF-17, CF-19, CF-20. Related stories: KAN-25, KAN-16, KAN-61, KAN-63, KAN-26, KAN-15, KAN-52, KAN-64.
Dependencies: KAN-61 event and arrangement readiness; KAN-63/KAN-26 technical arrangement reservation; KAN-15/KAN-66 revision-aware changes; CR-3 independent venue actions and CR-2 recovery state; KAN-64 persisted notification delivery.

Design impact: Planned additive role, safety review/round/revision and preparation-phase fields, queue/decision/submit/start-preparation APIs, live readiness/invalidation integration, structured review notes, notification events and frontend workflow; update C3, state/class/sequence diagrams, API and data model during implementation.

Test plan:

* AC1/AC2/AC3: Safety Officer queue; wrong roles denied; pending venue, short equipment, outage recovery and missing material prevent submission or remain clearly visible as appropriate.
* AC4/AC5/AC6/AC7: Execute all three outcomes on distinct review rounds; require rejection/change reasons; targeted remediation and resubmission preserve unrelated arrangements and full history.
* AC8/AC9: Preparation fails for missing/pending/rejected/stale approval and succeeds only for current approved revision; change layout/attendance/equipment or record outage and verify preparation is blocked again.
* AC10/AC11: Race officer approval with arrangement edit and another decision; repeat writes; verify one outcome, correct current recipients and rollback-safe notices.
* AC12: Browser shows current round/remedial route, handles stale and transport failures without false success, and never auto-approves when time passes.

Update contracts/diagrams, test cases, traceability, actual run evidence and sprint acceptance status during implementation. All new tests Not executed; acceptance Not assessed. Change history: docs/requirements/change-requests.md.

</details>

## Notification scope preservation

Original KAN-64 was one 8-SP story. Rebalance explicitly replaces its active scope with 5-SP KAN-64 AC201–209 plus 3-SP KAN-80 AC1–9. Original TC-20-01–11 remain **historical, never-executed specifications**, not active criteria or evidence of passing. Active replacements have new case IDs; no old ID is reused.

| Original KAN-64 criterion | Current acceptance owner |
| --- | --- |
| AC1 request submission/clarification/amendment/decision | KAN-64-AC201 |
| AC2 assignment/reassignment | KAN-64-AC202 |
| AC3 venue decisions | KAN-64-AC203 |
| AC3 equipment confirmation/unavailability | KAN-80-AC1 |
| AC3 significant arrangement changes | KAN-80-AC2 |
| AC4 final confirmation/cancellation | KAN-80-AC3 |
| AC5 registration/withdrawal and attendee-relevant changes | KAN-80-AC4 and AC2 |
| AC6 correct associated record/action | KAN-64-AC205 and KAN-80-AC5 |
| AC7 recipient authorization | KAN-64-AC206 and KAN-80-AC6 |
| AC8 successful outcome only | KAN-64-AC207 and KAN-80-AC7 |
| AC9 / AC101 in-app inbox/read state | KAN-64-AC204; reused and verified by KAN-80-AC8 |
| AC102 transaction and deduplication | KAN-64-AC207 and KAN-80-AC7 |
| AC103 complete original matrix | Union of KAN-64-AC201–203 and KAN-80-AC1–4; scope recorded in KAN-64-AC209 |
| AC104 actor acknowledgement and recipient matrix | KAN-64-AC208 and KAN-80-AC8 |
| AC105 own inbox and current protected-link access | KAN-64-AC206 and KAN-80-AC6 |
| AC106 new customer triggers are owned separately | KAN-64-AC209 / KAN-80-AC9; KAN-81 outage, KAN-83 holds and KAN-84 safety own their new trigger tests |

## Test-group transfer register

Old test identifiers are preserved as history; their current location is explicit. A move does not create a Pass or revise past execution dates.

| Earlier group | Current group | Story / reason |
| --- | --- | --- |
| S3-T01 | S4-T01 | KAN-18; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T02 | S4-T02 | KAN-9; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T03 | S4-T03 | KAN-63; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T04 | S4-T04 | KAN-26; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T08 | S4-T05 | KAN-61; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T09 | S4-T06 | KAN-62; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T10 | S4-T07 | KAN-10; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T11 | S4-T08 | KAN-14; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T12 | S4-T09 | KAN-17; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T13 | S4-T10 | KAN-67; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T14 | S4-T11 | KAN-66; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T23 | S4-T12 | KAN-15; full unchanged estimate and active criteria moved to Sprint 4 |
| S3-T22 (original combined 8-SP scope) | S3-T22 (narrowed 5-SP scope) + S4-T13 (3-SP transferred triggers) | KAN-64 / KAN-80; old AC/case mapping retained above |
| S3-T24 (old complete-release journey) | S4-T16 | Original TC-06-19 remains historical; new current journey has a distinct case ID |

S3-T25/T26 are new customer-change groups; S3-T27 is the current integrated Sprint 3 journey. S4-T14/T15 cover CR-3/CR-6. No test-group identifier from the previous selected plan is reassigned to another story.

## Implementation dependency and final-sprint boundary

KAN-64 is a completed usable inbox and early-trigger scope prerequisite; KAN-80 completes its separately estimated later triggers alongside equipment, lifecycle, change and registration stories. Keep KAN-26 reservation with KAN-62/10 automatic release and KAN-61 readiness; keep KAN-66 ordinary edits with KAN-15 reviewed changes. KAN-82 independent arrangement actions and KAN-84 safety revision/gate checks integrate with those same workflows. No item is Done merely because a dependency or schema exists.

Sprint 4 is the final development sprint. Capture actual planning/review/retrospective/standup recordings as required in [final-sprint-recordings](../final-sprint-recordings.md); planned test specifications are not replacements for those records.
