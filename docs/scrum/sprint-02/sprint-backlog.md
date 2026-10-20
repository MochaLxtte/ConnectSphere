# Sprint 2 backlog and acceptance test plan

**Current disposition — 16 October 2026:** Sprint 2 is now administratively closed. KAN-6, KAN-34, KAN-50, KAN-12 and KAN-52 are To Do in Sprint 3 at their full original **19 SP** for completion and re-verification. The [current review assessment](review.md#current-evidence-assessment--16-october-2026) explains the findings and distinguishes them from historical acceptance, which is **Not recorded**. The other seven parents remain Done in Jira at 24 SP; those labels do not supply acceptance evidence. Use the [Sprint 3 cards](../sprint-03/sprint-backlog.md) for current owners/reviewers and new AC101+ refinements. The original **43-point baseline**, story cards, stable IDs and dated evidence below remain historical.

## Preserved baseline and earlier reconciliation

**Current position — 15 October 2026:** all 12 parent stories and KAN-57/KAN-58/KAN-76 subtasks are Done in Jira; Sprint 2 remains active. Hosted evidence and peer-review gaps are not resolved by those labels. The [baseline and later delivery register](review.md#baseline-and-later-delivery-register--15-october-2026) holds boundary status, actual later evidence, administrative dates and remaining acceptance work. The **43-point commitment and original criterion IDs are unchanged**. Newly reproduced defects are proposed for [Sprint 3 planning](../sprint-03/planning.md), separately from new customer changes.

The confirmed baseline is **12 PBIs and 43 points: nine new stories at 35 points plus three carried stories at their original 8 points**. **Current owner and evidence summaries reconciled 11 October 2026.** The owner column reflects the latest Jira snapshot, not a reconstruction of the original planning allocation. Reviewers remain **To agree**. Implementation, current Jira Done status and test observations remain separate from the actual Sprint 2 review acceptance decision, which is **Not recorded**.

The dated development entries retain the source branch and environment used for each run. Current `main` includes KAN-50 maintenance and the KAN-59 validation repair; older statements that these are absent or unrepaired are historical. See the [11 October evidence reconciliation](../../testing/test-evidence.md#11-october-reconciliation-of-existing-evidence) for the 9 October automated/shared-development runs and their limits.

The nine new story cards retain the detailed planning version and stable `KAN-<story>-AC<number>` references. The pre-edit export contained **77 criteria**, compared with **93 planning criteria** below. The missing correctness checks in six shorter cards and the customer-rule refinements were added to live Jira on 21 September. Preserve these repository IDs and historical test references; use the [applied-change record](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied) for the current Jira work and remaining decisions. Customer rules and meeting refinements are recorded separately; technical tasks and additional robustness checks remain proposed delivery work.

## Committed backlog

| Jira item | Story | Priority / origin | Points | Sprint 2 owner / reviewer | Acceptance position |
| --- | --- | --- | ---: | --- | --- |
| KAN-29 | Automatically Assign Event Coordinator | Must / new | 3 | Tristan / To agree | Implemented; AUTO-20260928-01 covers selection/concurrency. MAN-20261009-S2T23-01 observes automatic assignment on the shared-development path. Full hosted load/tie/no-eligible cases and recorded review acceptance remain separate. |
| KAN-50 | Maintain Venue Catalogue | Must / new | 5 | Irfan / To agree | Merged via PR #33. AUTO-20261009-KAN50-01 includes passing unit/component, PostgreSQL and browser layers; MAN-20261009-KAN50-01/02 cover editing/restoration, organiser denial and propagation. Review acceptance: Not recorded. |
| KAN-51 | View Venue Availability Calendar | Must / new | 5 | Arvin / To agree | Implemented; local/PR #22 CI evidence AUTO-20261003-01/02 and isolated interactive MAN-20261006-KAN51-01. MAN-20261009-S2T23-01 adds shared-development booking/calendar evidence. Full hosted role matrix and review acceptance remain separate. |
| KAN-12 | Search and Filter Venues | Must / new | 5 | Ryan / To agree | Implemented; AUTO-20261009-KAN12-01 covers page/browser/PostgreSQL checks and MAN-20261009-KAN12-01 covers shared-development filters/access. Manual stale/failure paths were not exercised; review acceptance: Not recorded. |
| KAN-52 | Check Venue Suitability | Must / new | 3 | Tristan / To agree | Implemented with explicit requirement interpretation and tri-state results; AUTO-20261004-KAN52-01. The 9 October connected run loaded context but did not run an assessment; full hosted S2-T09/T10 remains Not executed. |
| KAN-53 | Submit Venue Booking Request | Must / new | 3 | Kai Jie / To agree | Integrated submission with pending status and current reservation/block checks. AUTO-20261005-INTEGRATION-01 and AUTO/MAN-20261009-S2T23-01 cover the connected path. Dedicated authorization/concurrency evidence and review acceptance remain distinct. |
| KAN-8 | Approve or Reject Venue Booking Request | Must / new | 3 | Tristan / To agree | Implemented; AUTO-20261004-KAN8-01 plus MAN-20261009-KAN54-01 and MAN-20261009-S2T23-01 cover actual approval, rejection cleanup, conflict refusal and coordinator outcome. Full S2-T13/T14 review acceptance: Not recorded. |
| KAN-54 | Detect Venue Booking Conflicts | Must / new | 5 | Ernest / To agree | Implemented at submission and approval; AUTO-20261009-KAN54-01 and MAN-20261009-KAN54-01 cover clash, other-venue, adjacency and operational-block paths. Manual concurrency and review acceptance remain separate. |
| KAN-55 | Block Venue for Operational Unavailability | Supporting / new | 3 | Kai Jie / To agree | Implemented Venue Staff block management. Isolated PostgreSQL coverage is included in AUTO-20261005-INTEGRATION-01; MAN-20261009-KAN54-01 covers block creation, conflicting booking refusal and removal. Full reason/role matrix and review acceptance remain separate. |
| KAN-6 | Submit Event Request | Carry-over | 3 | Kai Jie / To agree | KAN-58 repair re-verified 1 October (AUTO-20261001-DRAFT-01). KAN-59 repair is merged with passing PostgreSQL and signed-in correction/resubmission evidence AUTO/MAN-20261009-KAN59-01; complete S2-T21/T22 coverage and review acceptance remain separate. |
| KAN-33 | View Submitted Event Request | Carry-over | 2 | Irfan / To agree | KAN-56 repair has MAN-20260929-01 and PR #21 CI AUTO-20261001-01; the manual repeat-decision 409 caveat is retained. Sprint 2 review acceptance: Not recorded. |
| KAN-34 | Resume/Edit Draft Event Request | Carry-over | 3 | Kai Jie / To agree | KAN-57 repair re-verified 1 October (AUTO-20261001-DRAFT-01); the complete registration-toggle hosted scenario S2-T19 remains Not executed. Review acceptance: Not recorded. |
| **Total** | **12 PBIs** | **35 new + 8 carried** | **43** | | **No Sprint 2 acceptance outcome recorded** |

The four corrective subtasks are included in their parents' retained estimates. The 11 October snapshot recorded KAN-57 (child of KAN-34), KAN-58 (child of KAN-6) and KAN-76 (KAN-50 peer-review/PR task) as To Do; the **15 October inspection now records all three Done**. They explicitly belong to Sprint 2 and add no PBIs or points. Their remaining hosted checks and PR #33 peer-review evidence remain **Not recorded** in the inspected sources. KAN-60–KAN-67 are future-backlog work outside this commitment.

## Story cards

The acceptance criteria below retain the detailed planning criteria and subsequent explicitly dated refinements. Use the current owner column above; older development notes name the contributor at that time and are not the current Jira assignee register. Proposed implementation work does not add points.

**Historical venue implementation references:** the venue task rows and robustness notes below preserve the 21 September planning inspection. `main` commit `dff42ed` removed those services, UI and tests on 26 September; unrevised task rows name historical files, not current evidence. The KAN-12, KAN-51, KAN-52, KAN-8 and KAN-55 rows below have since been updated for their rebuilt implementations. Migration tables and integrity guards remain. Rework those tasks against the retained schema when implementing the venue stories; the 93 acceptance criteria remain unchanged.

**Customer-rule refinements:** Coordinator availability may be preconfigured. No turnover buffer is required. Venue-booking submission must be refused for an already reserved period, in addition to approval-time conflict protection. Submission validation must require event date and attendance while allowing None / Not Required for inapplicable optional needs. These rules are now recorded in the affected Jira cards. Retain the [remaining questions](planning.md#dependencies-and-open-decisions), including pending/tentative reservations and new operational blocks over existing bookings.

### KAN-29 — Automatically Assign Event Coordinator

As an Event Organiser, I want my submitted event request to be automatically assigned to an available Event Coordinator so that there is a clear internal staff member responsible for coordinating my event.

**Owner / proposed reviewer:** Tristan / To agree. Current Jira ownership reconciled 11 October; dated contributor notes remain in the development and evidence records.

**Acceptance criteria (planning version)**

Ensure that:

- **KAN-29-AC1:** When an Event Organiser successfully submits an event request, the system automatically assigns an available Event Coordinator.
- **KAN-29-AC2:** An event is assigned to only one Event Coordinator at a time.
- **KAN-29-AC3:** The assigned Event Coordinator is recorded against the correct event.
- **KAN-29-AC4:** The assigned Event Coordinator can view the event request they have been assigned.
- **KAN-29-AC5:** No manual administrator action is required for the initial assignment.
- **KAN-29-AC6:** Automatic assignment does not approve or reject the event request.
- **KAN-29-AC7:** The assignment remains in place unless the Event Coordinator is subsequently reassigned.

**Assignment rule:** Filter to available Event Coordinators → assign the coordinator with the fewest active events → if tied, choose the first by a consistent ID/order.

The selection rule is agreed and availability may be preconfigured. On 28 September the branch implements `app_users.coordinator_available` with default `false` and explicit opt-in for provisioned coordinators. Active workload counts `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED`; the lowest count wins, then ascending application-profile UUID. No eligible coordinator returns `409 NO_AVAILABLE_COORDINATOR` with the saved draft unchanged and editable for retry. No availability-management UI is added. These detailed choices await team/customer acceptance; they are not newly recorded meeting decisions.

Submission and one automatic assignment commit together without a review decision. Automatic history uses `assignmentMethod: 'AUTOMATIC'` and null assigning-actor fields. A preassigned draft returns `409 DRAFT_ALREADY_ASSIGNED` without replacing its existing data; repeated submission cannot allocate again. **30 September schema follow-up:** Tristan has applied migration 006 to shared Supabase. [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirms its fields and constraint, with all six current migration checksums matching hosted history through the recognised filename aliases. Confirm real-coordinator opt-in and follow the [manual checks](../../testing/README.md#kan-29-hosted-verification). Hosted manual acceptance, availability-policy acceptance, CI and peer review remain pending.

**Meeting refinement:** Event Coordinators may initially assign an unassigned request to themselves or another coordinator. This complements automatic initial assignment. **30 September scope correction:** replacing an existing coordinator is deferred under KAN-65; handover is removed from the API/UI. This supersedes the earlier branch implementation, not the unchanged KAN-29-AC7 wording.

| Local task | Proposed technical work |
| --- | --- |
| S2-29-01 | Implemented locally: [automatic selection](https://github.com/MochaLxtte/ConnectSphere/blob/8f29d35d528d1bd265e435702b9a2db6aeb7046a/backend/src/modules/events/automatic-assignment.ts), [submission transaction](../../../backend/src/modules/events/submit-request.ts), [migration 006](../../../database/migrations/006_automatic_coordinator_assignment.sql), UI allocation-error recovery and automatic-history display. [Automatic-assignment tests](../../../database/tests/events/automatic-assignment.integration.test.ts), [submission tests](../../../database/tests/events/submit-request.integration.test.ts) and [manual-assignment regression](../../../database/tests/events/assignment.integration.test.ts) passed 29 + 12 + 10 targeted PostgreSQL checks. See [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment). S2-T01/T02 hosted checks, policy acceptance, CI and peer review remain pending; S2-T23 is not executed. 30 September correction: only initial manual assignment of unassigned requests remains; KAN-65 handover is removed. The linked 28 September test totals are historical. |

### KAN-50 — Maintain Venue Catalogue

As a Venue Staff member, I want to maintain accurate information about ConnectSphere venues so that Event Coordinators and Venue Staff can use reliable venue information when planning events.

**Owner / proposed reviewer:** Irfan / Ryan or Tristan, to agree. Current Jira ownership reconciled 11 October; the existing record dates Irfan's assignment to 8 October.

**Acceptance criteria (planning version)**

Ensure that Venue Staff can:

- **KAN-50-AC1:** View the venues recorded in the venue catalogue.
- **KAN-50-AC2:** View the current information recorded for a venue.
- **KAN-50-AC3:** Record and update a venue's location.
- **KAN-50-AC4:** Record and update a venue's maximum capacity.
- **KAN-50-AC5:** Record and update the facilities available at a venue.
- **KAN-50-AC6:** Record and update accessibility information for a venue.
- **KAN-50-AC7:** Record and update one or more supported room layouts for a venue.
- **KAN-50-AC8:** Record and update relevant operating information for a venue.
- **KAN-50-AC9:** Save changes made to venue information.

Ensure that:

- **KAN-50-AC10:** Supported room layouts remain associated with the correct venue.
- **KAN-50-AC11:** A venue can support more than one room layout where applicable.
- **KAN-50-AC12:** Updated venue information is displayed when the venue is subsequently viewed.
- **KAN-50-AC13:** Updated venue information is available to the venue search and suitability-checking functionality.
- **KAN-50-AC14:** Users who are not authorised to maintain venue information cannot modify the venue catalogue.

**Edge-case criteria added during implementation, 9 October 2026** (mirrored on the Jira card as "Acceptance detail — 9 October 2026"; see the [9 October decision](../../requirements/assumptions-and-questions.md#9-october-2026--kan-50-venue-catalogue-maintenance-scope-and-implementation-choices)):

- **KAN-50-AC15:** A save that supplies no field, or a field Venue Staff may not change (name, description, active status, identifiers), is refused with a validation error and the venue is unchanged.
- **KAN-50-AC16:** Changing only one operating-hour endpoint is checked against the saved value; a result where closing is at or before opening is refused. A blank endpoint means no restriction at that end of the day.
- **KAN-50-AC17:** Facility, accessibility and layout entries are trimmed, case-insensitive duplicates are removed, each entry is at most 100 characters and each list holds at most 30 distinct values. Capacity is a whole number of at least 1.
- **KAN-50-AC18:** When two Venue Staff edit different fields of the same venue at the same time, both changes are kept; the same field resolves to the last save.
- **KAN-50-AC19:** A venue that is inactive or no longer exists is reported as not in the active catalogue, and nothing is changed.
- **KAN-50-AC20:** Changing capacity or supported layouts does not alter existing bookings; it applies to later searches and suitability assessments.
- **KAN-50-AC21:** Only the fields that were actually changed are sent on save, and a failed save keeps the entered values for correction.

| Local task | Proposed technical work |
| --- | --- |
| S2-50-01 | Inspect `backend/src/modules/venues/venue-input.ts` (historical), `backend/src/modules/venues/venue-service.ts` (historical) and `frontend/src/features/venues/pages/VenueFormPage.vue` (historical); verify viewing and updating the listed venue attributes, multiple layouts, persistence, authorization and propagation to search/suitability. Reuse `database/tests/venues/venue-catalogue.integration.test.ts` (historical) for S2-T03/T04. Venue creation, deletion and inactivation are not explicit criteria for this story; refine any requested extension separately. **9 October status:** those historical files were removed on 26 September, so the story was rebuilt as `venue-catalogue-input.ts`, `venue-catalogue-service.ts`, `venue-catalogue-router.ts`, `VenueCataloguePage.vue` and `VenueCatalogueEditPage.vue` with unit and component tests (Jira subtasks KAN-68–KAN-73). PostgreSQL and browser tests are written and await their first CI run (KAN-74). |

### KAN-51 — View Venue Availability Calendar

As an authorised internal user (Event Coordinator, Venue Staff, Technical Support Staff), I want to view venue availability across relevant dates and times so that I can identify when a venue may be requested.

**Owner / proposed reviewer:** Arvin / To agree. Current Jira ownership reconciled 11 October; dated contributor notes remain in the development and evidence records.

**Acceptance criteria (planning version)**

- **KAN-51-AC1:** Authorised internal users can view venue availability for relevant dates and times.
- **KAN-51-AC2:** Confirmed venue bookings are reflected as unavailable during the corresponding period.
- **KAN-51-AC3:** Recorded periods of venue unavailability are reflected.
- **KAN-51-AC4:** Available and unavailable periods can be distinguished.
- **KAN-51-AC5:** Availability information corresponds to the correct venue.
- **KAN-51-AC6:** Unauthorised users cannot access protected venue-planning information.

The three internal roles are now explicit in the story. Permitted event labels and block details remain to be clarified; calendar access alone does not grant booking or catalogue-edit permissions.

| Local task | Proposed technical work |
| --- | --- |
| S2-51-01 | **3 Oct (Ernest):** the earlier files were removed on 26 September and were not restored. The calendar was rebuilt on `feat/KAN-51-venue-availability-calendar`: [availability service](../../../backend/src/modules/venues/availability.ts) and [route](../../../backend/src/modules/venues/availability-router.ts) (`GET /api/venues/availability`, three roles only, `APPROVED` bookings and blocked periods for active venues) and the [`/venues/availability` page](../../../frontend/src/features/venues/pages/VenueAvailabilityPage.vue). Technical Support Staff see the same periods as the other two roles; event names appear only to the event's assigned coordinator ([3 October decision](../../requirements/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar)). Automated tests: [service](../../../backend/test/venues/availability.test.ts), [HTTP](../../../backend/test/venues/availability-router.test.ts), [PostgreSQL](../../../database/tests/venues/venue-availability.integration.test.ts), [component](../../../frontend/src/features/venues/pages/VenueAvailabilityPage.test.ts) and [browser](../../../tests/e2e/venue-availability.spec.ts); they passed on `6ede774` (AUTO-20261003-01) and in CI for [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) (AUTO-20261003-02). The S2-T05/T06 hosted runs are not executed; see the [walkthrough to run](../../testing/test-evidence.md#3-october-kan-51-venue-availability-calendar-s2-t05s2-t06). |

#### KAN-51 remaining implementation plan — 6 October 2026

**Source:** [live KAN-51](https://smu-g7-grp1.atlassian.net/browse/KAN-51), read through the authenticated Atlassian MCP connection on 6 October. Its description still contains exactly the six criteria above. Jira lists it as **To Do**, assigned to Arvin, estimated at five points, in Sprint 2; its last update is 5 October. It has no subtasks or comments. This inspection does not change its status or establish acceptance.

**Branch / baseline:** `codex/kan-51-availability-plan`, created from `main` at `ae2be66107dcd8c9fe20a526c78a4715f7d01ab1`. KAN-51's API, interface and tests from PR #22 are already present in this baseline. The planned implementation work is to address demonstrated gaps against these criteria. No new application-code change is currently justified by the inspected requirements or the focused test results.

| Criterion | Existing implementation to retain | Verification / permitted follow-up |
| --- | --- | --- |
| KAN-51-AC1: internal users can view relevant dates/times | `availability-router.ts` and `availability.ts` serve `GET /api/venues/availability`; `VenueAvailabilityPage.vue` and `VenueAvailabilityCalendar.vue` provide a venue picker, Singapore week navigation, date jump and refresh. | Check each of the three roles, date/week changes and reloading the selected view. Repair calendar reads or navigation only if a reproduced failure prevents the required view. |
| KAN-51-AC2: confirmed bookings show as unavailable | The SQL reads overlapping `APPROVED` venue bookings; the timeline labels their periods Booked. Booking approval is distinct from event confirmation. | Verify exact venue/time mapping and periods crossing day/week boundaries. Keep pending, rejected and cancelled bookings excluded under the existing policy. |
| KAN-51-AC3: recorded unavailability is reflected | The same read returns overlapping `venue_unavailability` rows, displayed as Blocked. | Verify single-day and multi-day recorded blocks, including refresh after fixture data changes. This ticket consumes existing records; it adds no block-management action. |
| KAN-51-AC4: available/unavailable periods are distinguishable | `frontend/src/features/venues/availability.ts` derives Available, Booked, Blocked and Closed segments; `VenueWeekTimeline.vue` supplies a legend and textual agenda. | Verify free time around reservations and blocks, opening hours, overlapping recorded periods and narrow-screen readability. Change only presentation that fails to convey required availability. |
| KAN-51-AC5: the correct venue is shown | The backend associates periods by venue ID; the page renders the selected venue and retains its selection in the URL. | Use two venues with different periods and confirm that switching venue never shows another venue's periods. |
| KAN-51-AC6: unauthorised access is denied | The API checks verified sessions and the three-role allowlist before reading data; page and sidebar use the same role group, with pending reads aborted when accounts change. | Verify signed-out users receive 401; Event Organisers and Attendees receive 403; direct navigation, expired sessions and account changes reveal no protected calendar data. |

**Implementation sequence and completion checks**

1. **Confirm the baseline — completed for planning.** Live Jira matches the retained criteria. Focused backend and frontend tests passed, 33 tests each, on the baseline above using local Node `v22.12.0`. These are current local results; the repository requires Node 24 for its supported verification environment. PostgreSQL, browser and hosted checks were not run in this planning session.
2. **Verify the existing calendar in its supported environment.** Use Node 24, a dedicated test database and the existing KAN-51 suites below. Reuse their isolated booking/block fixtures to exercise reads; avoid shared hosted-data writes as part of automated verification.
3. **Implement a minimal fix only for a demonstrated KAN-51 failure.** First record the failing criterion and reproduce it in the relevant existing test. Limit the change to the availability service/route, calendar API client, access helper, calendar/date helpers, page or timeline components. Shared app mounting, routing and navigation may change only when required to make the KAN-51 view or its access protection work. No database migration is planned.
4. **Verify any fix and review the branch diff.** Rerun the affected KAN-51 tests; run `npm run check` if application code changes. Every changed line must support a KAN-51 criterion. Record execution evidence against the tested commit, separating new results from the historical PR #22 results.
5. **Complete acceptance evidence.** Run the existing S2-T05/S2-T06 walkthrough with provisioned internal-role accounts and denied-role accounts, using agreed test data; obtain peer review and record unresolved policy decisions. Jira closure requires that evidence and is a separate action from this plan.

Targeted commands for step 2:

```sh
npm test -w @connectsphere/backend -- test/venues/availability.test.ts test/venues/availability-router.test.ts
npm test -w @connectsphere/frontend -- src/features/venues/availability.test.ts src/features/venues/pages/VenueAvailabilityPage.test.ts
npm run test:integration -- database/tests/venues/venue-availability.integration.test.ts
npm run test:e2e -- tests/e2e/venue-availability.spec.ts
```

**Scope boundary:** KAN-51 is a read-only availability view. KAN-50 catalogue maintenance, KAN-12 search/filtering, KAN-52 suitability, KAN-53 booking submission, KAN-8 booking decisions, KAN-54 booking-conflict enforcement and KAN-55 block creation/removal are excluded from this branch's work. Their existing code on `main` is outside this change. Equipment, registration, notifications, event lifecycle actions, new calendar features and unrelated refactoring are also excluded. Reading stored bookings and blocks to satisfy AC2/AC3 does not require implementing or changing those other workflows.

**Policy assumptions to retain pending confirmation:** active venues only; `APPROVED` means a confirmed venue booking; half-open intervals with no added buffer; Singapore time and Monday-to-Sunday weeks; available time within opening hours; event names visible only to the currently assigned coordinator; block reasons visible to the three calendar roles. These are the existing [3 October team assumptions](../../requirements/assumptions-and-questions.md#3-october-2026--kan-51-venue-availability-calendar), beyond Jira's six criteria. S2-Q03, S2-Q04 and S2-Q07 remain open. This plan adds no broader detail permissions, pending-booking holds or new policy.

**6 October implementation follow-through:** KAN-51-AC1/AC5 had a reproduced gap: opening another calendar link or navigating browser history while the calendar was mounted left the previous week/venue displayed. `VenueAvailabilityCalendar.vue` now follows changes to `week` and `venue` in the route, reloads only when the week changes, and uses its existing abort handling to discard the previous week's pending read. Three new component regressions cover route/history changes, venue-only changes and a late response from the previous week; all three failed before the fix and pass afterward. Application-code changes are confined to this calendar component and its existing page test file.

**Local verification:** working tree based on `ae2be66`, Node `24.21.0`, isolated PostgreSQL 17 container and Playwright Chromium. `npm run check` passed: type checks, 303 frontend tests, 503 backend tests and both production builds. The targeted KAN-51 PostgreSQL suite passed all six tests; its browser suite passed all 12 checks. The temporary database container was stopped afterward. Hosted S2-T05/S2-T06, peer review and policy confirmation remain outstanding; these local results do not change Jira status or establish hosted acceptance.

**7 October follow-through:** The venue picker now appears before the selected venue's title and details on desktop and mobile. Two additional HTTP cases verify that signed-in Event Organisers and Attendees cannot obtain calendar data by claiming a Venue Staff identity in headers or query parameters: both receive an error-only 403 response before the data reader is called. The targeted backend availability suites passed all 35 tests; the calendar page suite passed all 22 tests; backend type checking and the frontend production build also passed. These changes remain within KAN-51-AC1/AC4/AC5/AC6.

### KAN-12 — Search and Filter Venues

As an Event Coordinator, I want to search and filter venues using an event's requirements so that I can efficiently identify potential venues for the event.

**Owner / proposed reviewer:** Ryan / To agree. Current Jira ownership reconciled 11 October; dated contributor notes remain in the development and evidence records.

**Retained 9 October contributor note:** Irfan added page component tests and a browser spec for the search page on `feat/KAN-12-search-page-tests` (local branch, no change to the story card on Jira in that update).

**Acceptance criteria (planning version)**

Ensure that the Event Coordinator can search or filter venues using relevant criteria including:

- **KAN-12-AC1:** Proposed event date and time.
- **KAN-12-AC2:** Expected attendance.
- **KAN-12-AC3:** Venue location.
- **KAN-12-AC4:** Venue capacity.
- **KAN-12-AC5:** Accessibility requirements.
- **KAN-12-AC6:** Supported room layout.
- **KAN-12-AC7:** Required facilities.

Ensure that:

- **KAN-12-AC8:** Search results use the current information recorded in the Venue Catalogue.
- **KAN-12-AC9:** Search results correspond to the search and filter criteria selected by the Event Coordinator.
- **KAN-12-AC10:** Venues that do not satisfy a selected filter are not incorrectly presented as satisfying that filter.
- **KAN-12-AC11:** The Event Coordinator can clear or change the selected filters and perform another search.
- **KAN-12-AC12:** Search results identify the corresponding venue clearly.
- **KAN-12-AC13:** Users who are not authorised to perform venue planning cannot access protected venue-search functionality.
- **KAN-12-AC14 (repo-only, 9 October; not yet on Jira):** An incomplete period (only a start or only an end) or an end that is not after the start is refused with a clear message before any search is sent.
- **KAN-12-AC15 (repo-only, 9 October; not yet on Jira):** Results from an earlier search never replace those of a newer one, and earlier results are hidden while a new search runs so they cannot be mistaken for the new filters.
- **KAN-12-AC16 (repo-only, 9 October; not yet on Jira):** If the layout, facility or accessibility lists cannot be loaded, the other filters still work and the user is told what is missing. A search with no matches explains that no venue meets every filter, which is different from an empty catalogue.

| Local task | Proposed technical work |
| --- | --- |
| S2-12-01 | **Integrated 4 October:** Ryan's [search page](../../../frontend/src/features/venues/pages/VenueSearchPage.vue), [query service](../../../backend/src/modules/venues/venue-search.ts) and [routes](../../../backend/src/modules/venues/venue-router.ts) provide coordinator-only, manually entered combined filters against current active venues. Integration fixes ensure operational blocks are excluded independently of approved bookings and isolated schemas work. [PostgreSQL regressions](../../../database/tests/venues/venue-search.integration.test.ts) are recorded in AUTO-20261004-KAN8-01. Complete story-level S2-T07/T08 and peer review; this search does not implement KAN-52 suitability or KAN-53 submission. |

### KAN-52 — Check Venue Suitability

As an Event Coordinator, I want to check whether a venue appears suitable for an event so that I can avoid selecting a venue that does not meet important event requirements.

**Implementation owner / proposed reviewer:** Tristan / To agree. User-requested work on 4 October; no live Jira assignment or Sprint 2 reallocation is implied.

**Acceptance criteria (planning version)**

Ensure that:

- **KAN-52-AC1:** A venue can be assessed using the relevant requirements of the selected event.
- **KAN-52-AC2:** A venue is not treated as suitable when the event's expected attendance exceeds the venue's maximum capacity.
- **KAN-52-AC3:** A venue is not treated as suitable when a required facility is unavailable at that venue.
- **KAN-52-AC4:** Accessibility requirements are considered when determining suitability where applicable.
- **KAN-52-AC5:** Required room layouts are considered when determining suitability where applicable.
- **KAN-52-AC6:** The venue's availability for the event's proposed date and time is considered when determining suitability.
- **KAN-52-AC7:** The Event Coordinator can identify which relevant requirement caused a venue to be considered unsuitable.
- **KAN-52-AC8:** A venue that satisfies the applicable checked requirements is not incorrectly marked unsuitable.
- **KAN-52-AC9:** Suitability checking uses the latest relevant event and venue information.

| Local task | Proposed technical work |
| --- | --- |
| S2-52-01 | **Implemented 4 October:** assigned-coordinator context/assessment API and `/reviews/:id/venue-suitability`. Coordinator interprets current free-text needs per check and explicitly confirms them, including none required. Exact normalised labels, capacity, full-interval operating hours, active venue, approved reservations and operational blocks produce explained PASS/FAIL/UNKNOWN checks. Unknown/unconfirmed requirements never pass silently; changed source requires reinterpretation. No schema, event or booking writes. Review [policy choices](../../requirements/assumptions-and-questions.md#4-october-2026--kan-52-venue-suitability), [contract](../../architecture/api-contract.md#venue-suitability-kan-52-cf-11) and S2-T09/T10 [hosted checks](../../testing/README.md#kan-52-hosted-verification); record executed results separately. |

### KAN-53 — Submit Venue Booking Request

As an Event Coordinator, I want to submit a venue booking request for an event so that Venue Staff can assess whether the requested venue can be made available.

**Owner / proposed reviewer:** Kai Jie / To agree. Current Jira ownership reconciled 11 October; dated contributor notes remain in the development and evidence records.

**Acceptance criteria (planning version)**

Ensure that the Event Coordinator can:

- **KAN-53-AC1:** Select a venue for an event that they are authorised to coordinate.
- **KAN-53-AC2:** Create a venue booking request for the selected venue.
- **KAN-53-AC3:** Include the relevant event date and time in the booking request.
- **KAN-53-AC4:** Include relevant venue requirements required by Venue Staff to assess the booking.
- **KAN-53-AC5:** Submit the venue booking request for review.

Ensure that:

- **KAN-53-AC6:** The booking request remains associated with the correct event.
- **KAN-53-AC7:** The booking request remains associated with the correct venue.
- **KAN-53-AC8:** A successfully submitted booking request becomes available to the appropriate Venue Staff for review.
- **KAN-53-AC9:** Submitting a venue booking request does not automatically approve the booking.
- **KAN-53-AC10:** A submitted booking request can be distinguished from an approved or rejected booking.
- **KAN-53-AC11:** Users who are not authorised to coordinate the event cannot submit a venue booking request for it.

| Local task | Proposed technical work |
| --- | --- |
| S2-53-01 | **Integrated 5 October:** [submission/decision service](../../../backend/src/modules/venues/booking-service.ts), [HTTP routes](../../../backend/src/modules/venues/venue-bookings-router.ts) and coordinator-only [panel](../../../frontend/src/features/events/components/VenueBookingPanel.vue). A valid permitted request saves Pending without approval or an event-status change. Current approved reservations and operational blocks are checked after the venue lock; conflicts create no row, pending requests may overlap, and approval rechecks. Event requirements remain current rather than snapshotted; API layout/notes limits are 2,000 characters, UI layout 100. Confirm eligible states, duplicate policy and snapshot semantics. Run [S2-T11/T12](../../testing/README.md#kan-53-hosted-verification) and connected S2-T23, recording combined automated results separately from AUTO-20261004-KAN53-01. |

### KAN-8 — Approve or Reject Venue Booking Request

As a Venue Staff member, I want to approve or reject a pending venue booking request so that venue usage can be managed appropriately.

**Owner / proposed reviewer:** Tristan / To agree. Current Jira ownership reconciled 11 October; dated contributor notes remain in the development and evidence records.

**Acceptance criteria (planning version)**

Ensure that Venue Staff can:

- **KAN-8-AC1:** View pending venue booking requests that they are authorised to review.
- **KAN-8-AC2:** Open a pending booking request and view the relevant event timing and venue requirements.
- **KAN-8-AC3:** Approve a pending venue booking request.
- **KAN-8-AC4:** Reject a pending venue booking request.
- **KAN-8-AC5:** Provide relevant information or a reason when rejecting a booking request.

Ensure that:

- **KAN-8-AC6:** The approval or rejection decision is recorded against the correct booking request.
- **KAN-8-AC7:** The Event Coordinator can view the booking decision.
- **KAN-8-AC8:** An approved venue booking remains associated with the corresponding event and venue.
- **KAN-8-AC9:** An approved venue booking affects the venue's availability for the corresponding period.
- **KAN-8-AC10:** A rejected booking is not treated as a confirmed venue booking.
- **KAN-8-AC11:** Users who are not authorised as Venue Staff cannot approve or reject venue booking requests.

| Local task | Proposed technical work |
| --- | --- |
| S2-8-01 | **Implemented 4 October:** [booking service](../../../backend/src/modules/venues/booking-service.ts), [HTTP routes](../../../backend/src/modules/venues/venue-bookings-router.ts), [list/outcomes page](../../../frontend/src/features/venues/pages/VenueBookingsPage.vue) and [detail/decision page](../../../frontend/src/features/venues/pages/VenueBookingDetailPage.vue). Only pending bookings can be decided; all Venue Staff may review, assigned coordinators read outcomes, optional reasons are bounded, and approval locks/rechecks approved-event, active-venue and conflict eligibility. These policy defaults are recorded in the [decision log](../../requirements/assumptions-and-questions.md#4-october-2026--kan-8-venue-booking-decisions). Local input/HTTP/PostgreSQL/component/browser checks are indexed in AUTO-20261004-KAN8-01. Run the [manual guide](../../testing/README.md#kan-8-hosted-verification) for S2-T13/T14, then calendar/conflict regression. KAN-53 submission is integrated on 5 October; create synthetic requests through the coordinator panel, then run the staff/coordinator journey without inferring hosted acceptance. |

### KAN-54 — Detect Venue Booking Conflicts

As an Event Coordinator or Venue Staff member, I want conflicting venue bookings to be identified so that the same venue is not inappropriately booked for overlapping events.

**Owner / proposed reviewer:** Ernest / To agree. Current Jira ownership reconciled 11 October; dated contributor notes remain in the development and evidence records.

**Retained 9 October contributor note:** Irfan added the missing unit tests and two integration cases to the existing logic on `feat/KAN-54-conflict-detection-verification` (local branch, no change to the story card on Jira in that update). The later run record reports three new PostgreSQL cases actually executed.

**Acceptance criteria (planning version)**

Ensure that:

- **KAN-54-AC1:** Existing confirmed bookings for a venue are considered when another booking request for that venue is assessed.
- **KAN-54-AC2:** Two bookings for the same venue with incompatible overlapping periods are identified as conflicting.
- **KAN-54-AC3:** A booking for a different venue is not incorrectly treated as conflicting solely because its time overlaps.
- **KAN-54-AC4:** A non-overlapping booking for the same venue is not incorrectly identified as conflicting.
- **KAN-54-AC5:** Recorded operational-unavailability periods are considered when assessing whether a venue can be booked.
- **KAN-54-AC6:** A venue with a confirmed booking is not treated as freely available during the conflicting booking period.
- **KAN-54-AC7:** A venue booking that would create an inappropriate conflict cannot be confirmed.
- **KAN-54-AC8:** The relevant user is informed when a booking cannot proceed because of a detected conflict.
- **KAN-54-AC9:** Conflict detection uses the latest confirmed booking and venue-unavailability information.
- **KAN-54-AC10 (repo-only, 9 October; not yet on Jira):** Only approved bookings and recorded blocks reserve a venue. Pending, rejected and cancelled bookings never cause a conflict, and a booking that is already decided is not assessed again.
- **KAN-54-AC11 (repo-only, 9 October; not yet on Jira):** When the database itself refuses an overlap at the moment of approval, the user receives the same conflict or unavailable message as the application-level check, and an unrelated database failure is not disguised as a conflict.

**Example scenario**

> Given Venue A has a confirmed booking for an existing event,
> When another booking for Venue A is requested for an incompatible overlapping period,
> Then the system identifies the conflict and prevents the second booking from being confirmed.

| Local task | Proposed technical work |
| --- | --- |
| S2-54-01 | Current [booking service](../../../backend/src/modules/venues/booking-service.ts) handles KAN-53 submission-time and KAN-8 approval-time reservation/block checks. [PostgreSQL tests](../../../database/tests/venues/venue-bookings.integration.test.ts) cover atomic persistence, conflict rollback and competing operations. Validate S2-T15/T16 against the merged build and through the UI; record actual results separately. Pending requests do not reserve; half-open adjacency remains a provisional documented policy. |

### KAN-55 — Block Venue for Operational Unavailability

As a Venue Staff member, I want to block a venue for a period when it is operationally unavailable so that Event Coordinators do not incorrectly treat the venue as available for event use.

**Owner / proposed reviewer:** Kai Jie / To agree. Current Jira ownership reconciled 11 October; dated contributor notes remain in the development and evidence records.

**Acceptance criteria (planning version)**

Ensure that Venue Staff can:

- **KAN-55-AC1:** Select a venue that needs to be made unavailable.
- **KAN-55-AC2:** Specify the date of the venue-unavailability period.
- **KAN-55-AC3:** Specify the start and end time of the venue-unavailability period.
- **KAN-55-AC4:** Record an appropriate reason for the venue being unavailable.
- **KAN-55-AC5:** Record unavailability for reasons such as maintenance, renovation, safety restrictions, internal activities, or other operational reasons.
- **KAN-55-AC6:** Save the venue-unavailability period.

Ensure that:

- **KAN-55-AC7:** The blocked period remains associated with the correct venue.
- **KAN-55-AC8:** The venue is shown as unavailable in the Venue Availability Calendar during the blocked period.
- **KAN-55-AC9:** The venue is not treated as available when searching for venues for an overlapping event period.
- **KAN-55-AC10:** The venue is not treated as suitable for an event whose required date and time conflicts with the blocked period.
- **KAN-55-AC11:** A venue booking cannot be confirmed for a period that conflicts with the recorded venue block.
- **KAN-55-AC12:** The venue remains available outside the recorded blocked period where no other booking or unavailability applies.
- **KAN-55-AC13:** Users who are not authorised as Venue Staff cannot create venue-unavailability blocks.

| Local task | Proposed technical work |
| --- | --- |
| S2-55-01 | Inspect block/unblock operations in `backend/src/modules/venues/venue-service.ts` (historical) and the venue detail UI; confirm conflict/removal policy and run S2-T17/T18. Reuse catalogue integration tests, including block-versus-booking conflict cases. |

## Proposed additional robustness checks

These checks support implementation quality and need refinement where behavior is unspecified. They are not additional Jira acceptance criteria and do not change the story estimates. The acceptance test plan distinguishes these proposals from tests of the criteria above.

| Story | Proposed check or unresolved policy |
| --- | --- |
| KAN-29 | Local automation covers the implemented opt-in availability, active statuses, UUID tie-break, no-eligible rollback, retries, write failures and concurrent submissions. Accept the detailed policy and complete hosted verification. Regression checks preserve initial manual assignment and refuse replacement of an existing coordinator. KAN-65 handover implementation is removed; its future refinement stays separate. |
| KAN-50 | Invalid capacity/operating values, duplicate venue naming and failed-save recovery. Creation, deletion and inactivation require separate scope clarification if requested. |
| KAN-51 | Interval endpoints, Singapore-time conversion, pending-request display, role-specific labels and loading/error recovery. Confirm how the Jira term confirmed booking maps to the implemented booking status. |
| KAN-12 | Invalid or incomplete filters, empty results, exact capacity/time boundaries and stale-result recovery. Define how expected attendance differs from a venue-capacity filter and how selected filters combine. |
| KAN-52 | User confirmed coordinator interpretation per assessment with no schema change. Review case-insensitive exact matching, explicit none/unknown semantics, full-interval operating hours, inactive venues and source-version freshness. Assessment has no writes or booking-policy effects; future submission behavior remains separate. |
| KAN-53 | Review eligible event states, duplicate/pending hold policy, current requirements versus a snapshot and independently supplied booking intervals. Verify failed/uncertain saves, current reservation/block conflicts, forged identity/status and competing operations; hosted acceptance remains pending. |
| KAN-8 | Implemented pending-only decisions, optional trimmed reason (2,000 characters), all Venue Staff review, assigned-coordinator reads and approval of an APPROVED event at an active venue. Team/customer acceptance of these defaults remains open. Repeated/competing decisions, conflict rollback and uncertain-write recovery are covered by the implementation; hosted verification remains pending. |
| KAN-54 | Document incompatible overlap and adjacency without turnover buffers, and define transactional behavior for competing approvals or block creation. Clarify pending-request warnings and cancelled/rejected booking treatment. |
| KAN-55 | Invalid periods, a new block overlapping an already-confirmed booking, concurrent block/approval, and any amendment/removal behavior. Verify reason handling for operational categories and authorization on retained removal functionality. |

## Carry-over repair criteria and tasks

The [Sprint 1 review defect register](../sprint-01/review.md#review-defects-and-carry-over) holds the reported observations. The successful Sprint 1 DEMO-03/04/05 paths remain recorded; these defects concern additional paths and require reproduction. Their Jira subtasks are **S1-DEF-01 → KAN-57; S1-DEF-02 → KAN-56; S1-DEF-03 → KAN-58; S1-DEF-04 → KAN-59**. Existing KAN-34-AC1–KAN-34-AC3, KAN-6-AC1–KAN-6-AC4 and applicable KAN-33 criteria retain their [Sprint 1 definitions](../sprint-01/sprint-backlog.md#story-cards); KAN-33-AC5 remains superseded. The repair refinements below do not renumber those criteria.

| Story / defect | Proposed acceptance criteria for the repair | Proposed implementation and verification work |
| --- | --- | --- |
| KAN-34 / S1-DEF-01 | Reopen a saved draft with registration disabled, enable registration, and obtain the required capacity and registration-window controls. Save, reload and submit with those settings preserved and validated. Confirm disabling registration clears or ignores dependent settings consistently. | **Fixed and re-verified, 1 October:** `EventDraftEditPage.vue` now delegates to [shared event form](../../../frontend/src/features/events/components/EventRequestForm.vue) instead of its own duplicate fields, so registration capacity/opens/closes now appear and persist when toggling No → Yes on a reopened draft. 7 page-level tests plus 16 form tests (23 total) pass, along with the full `npm run check` against current `main`. This is automated-fixture coverage only; S2-T19's hosted UI/API persistence check is still Not executed. See the [dated record](../../requirements/assumptions-and-questions.md#1-october-2026--s1-def-01-and-s1-def-03-repaired-and-re-verified). |
| KAN-33 / S1-DEF-02 | After approval, the authorized coordinator can discover and reopen the request through a supported UI path, including after reload, to reach the later workflow. Other users remain restricted and an initial review decision cannot be applied again. | Reproduce navigation after approval; inspect [submitted-request query](../../../backend/src/modules/events/submitted-requests.ts), [shared detail](../../../backend/src/modules/events/event-request-detail.ts) and review navigation. The pending queue excludes approved requests while direct detail/status-history support exists; verify the reported discovery path. Run S2-T20. Approval/rejection itself is not reported broken; full final-confirmation acceptance is not added to this carried story. **29 Sept (Irfan):** reproduced on `dff42ed` (queue excludes decided statuses; no UI route back). Repair on `feat/KAN-33-decided-request-access`: coordinator `GET /api/events?scope=history` plus a Decided requests section on `/reviews`; see the [29 September decision](../../requirements/assumptions-and-questions.md#29-september-2026--kan-56-coordinator-decided-request-history). Added checks (also on the KAN-56 Jira card): history also lists CONFIRMED/CANCELLED/COMPLETED requests; it follows the current assignment only (other coordinators' and unassigned requests never listed); organisers are refused `scope=history`; a history load failure does not hide the pending queue. |
| KAN-6 / S1-DEF-03 | A valid saved draft submits successfully from its supported edit path, persists the submitted state and reaches the correct organizer/coordinator views after reload. Failed submission retains the draft and gives an actionable result. | **Fixed and re-verified, 1 October:** root cause was `EventDraftEditPage.vue` reading `actions` off the `PATCH /api/events/:id` response, which never carries it — the write always succeeded but the page showed a false failure, matching the reported symptom exactly. Fixed by re-reading the shared `GET` detail after a successful write. 23 targeted tests plus the full `npm run check` pass against current `main`. Automated-fixture coverage only; S2-T21's hosted save/submit/refresh check is still Not executed. See the [dated record](../../requirements/assumptions-and-questions.md#1-october-2026--s1-def-01-and-s1-def-03-repaired-and-re-verified). |
| KAN-6 / S1-DEF-04 | Missing/blank mandatory fields and invalid required combinations are rejected by UI and direct API without changing the draft to submitted; valid required values permit submission. | Agree the required-field/validation matrix, reproduce the bypass and inspect [submission input](../../../backend/src/modules/events/submit-input.ts) plus shared/draft forms. Run S2-T22, including refresh and server-enforced validation. **Reproduced and repaired locally, 9 October:** the browser form already trimmed text and checked the end time and registration window, but the server accepted whitespace-only mandatory text, an end not after the start and a registration window that closed before it opened, so a direct API call could submit them. `assertReadyForSubmission` now treats blank text as missing and reports invalid values with per-field messages (`400 SUBMISSION_INVALID`); the form shows them beside the inputs. See the [9 October decision](../../requirements/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04). |

**Criteria added during the KAN-59 repair, 9 October 2026** (repository copy only; the Jira KAN-6 and KAN-59 cards were not edited, so the owner or Product Owner should mirror them):

- **KAN-6-AC5:** A mandatory text field (event name, purpose, venue requirements) that is blank or only whitespace is treated as missing by any client; the request stays a draft and the field is listed.
- **KAN-6-AC6:** An event end that is not after its start is refused at submission with a message for the end field; the request stays a draft.
- **KAN-6-AC7:** When registration is required and the registration close is not after its open, submission is refused with a message for the close field. A blank capacity still means no limit, and the window is ignored while registration is not required.

An expected attendance of 0 is still accepted; whether it should be refused is an open question recorded in the decision log.

## Acceptance test plan

**Current evidence summary, 15 October:** the rows below include executed automated and shared-development checks; they are not all unexecuted. S2-T23 is **partial**: the 9 October connected run exercised submission/assignment, search, booking, staff approval and visible outcomes/calendar, but omitted the actual suitability assessment and every cross-role refresh. Full S2-T19 and remaining S2-T21 hosted checks have no new run evidence accompanying the 15 October Jira status changes. Formal review acceptance is **Not recorded**. Criterion IDs retain the planning version plus explicitly dated refinements. Preserve each run's actual build/commit, date, role, fixture, environment, steps, result and limitations; [AUTO-20261015-01](../../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) is later regression verification, not historical hosted acceptance.

Criterion ranges include every numbered criterion between their endpoints. A broad test case needs evidence for each listed observation; one successful step does not establish the entire case or story as passed.

| Case | Criteria / refinement | Verification layer | Proposed scenario and expected observation | Status |
| --- | --- | --- | --- | --- |
| S2-T01 | KAN-29-AC1–KAN-29-AC7; assignment rule | Service + database + hosted UI | Submit a valid request with available/unavailable candidates at unequal loads: select the available coordinator with the fewest active events, even if an unavailable coordinator has fewer. Repeat with tied eligible loads and verify the documented consistent ID/order wins. Verify one coordinator on the correct event, assigned-coordinator access, no administrator action, unchanged review outcome and persistence until reassignment. | Local automation covered; hosted checks and policy acceptance pending (AUTO-20260928-01) |
| S2-T02 | KAN-29-AC2, KAN-29-AC7; assignment rule and manual-assignment meeting refinement | Database concurrency + API authorization + UI | Verify one current assignment after automatic or permitted initial manual assignment to self/another coordinator. Refuse handover without changing stored data; KAN-65 is outside the sprint. Proposed robustness: no eligible coordinator, retries, write failures and simultaneous submissions follow explicitly agreed behavior, with consistent workload counts and no duplicate active assignment. | Local automation covered; hosted checks and policy acceptance pending (AUTO-20260928-01) |
| S2-T03 | KAN-50-AC1–KAN-50-AC13 | Database + Venue Staff UI + search/suitability integration | View the catalogue/current venue; update location, capacity, facilities, accessibility, multiple supported layouts and operating information. Save and reopen; verify the right venue retains all values/layouts and search/suitability uses the changes. | Automated unit/component, PostgreSQL and browser checks passed (AUTO-20261009-KAN50-01). MAN-20261009-KAN50-01/02 passed the recorded edit, restoration and search/suitability-context propagation paths. Full review acceptance: Not recorded. |
| S2-T04 | KAN-50-AC14; proposed validation/failure checks | Input/API + database + UI | Non-maintainer roles cannot modify catalogue information through UI or direct API. Proposed robustness: invalid capacity/hours, duplicate names and save failures produce useful feedback without an unintended stored change. Duplicate names are not applicable: a venue's name is not editable in this story. | Automated validation/access layers passed (AUTO-20261009-KAN50-01). MAN-20261009-KAN50-01/02 observed invalid capacity/hours, signed-out 401 and organiser UI/API 403 with data unchanged; other non-maintainer roles were not manually tested. Review acceptance: Not recorded. |
| S2-T05 | KAN-51-AC1, KAN-51-AC6 | API + hosted sessions/UI | Check all five roles and signed-out access via navigation, direct URL and API; only Event Coordinators, Venue Staff and Technical Support Staff obtain the calendar. Check label/detail visibility after the separate internal-data policy is agreed. | Automated local/CI layers passed (AUTO-20261003-01/02). Isolated fixture-login interactive access checks passed in MAN-20261006-KAN51-01; these are not a Supabase-login role matrix. Full hosted role matrix: Not executed; policy/acceptance records remain separate. |
| S2-T06 | KAN-51-AC1–KAN-51-AC5 | Database + UI | View relevant dates/times for two venues; distinguish available and unavailable periods, including confirmed bookings and operational blocks associated with the correct venue. Supporting regression checks cover unaffected periods, refresh after booking/block changes, timezone boundaries and empty/failed-load behavior. | Automated local/CI layers and isolated interactive checks passed (AUTO-20261003-01/02; MAN-20261006-KAN51-01). MAN-20261009-S2T23-01 adds actual booking/calendar visibility. Complete hosted scenario and review acceptance: Not recorded. |
| S2-T07 | KAN-12-AC1–KAN-12-AC10, KAN-12-AC12 | Query integration + coordinator UI | Search/filter by event date/time, expected attendance, location, capacity, accessibility, room layout and facilities individually and in agreed combinations. Confirm current catalogue data, clearly identified venues, matching results and exclusion of venues that fail a selected filter. | Automated page/browser/PostgreSQL checks passed (AUTO-20261009-KAN12-01); MAN-20261009-KAN12-01 records shared-development filtering and availability results. Review acceptance: Not recorded. |
| S2-T08 | KAN-12-AC11, KAN-12-AC13; proposed filter validation | Input/API + hosted UI | Change and clear filters, then search again; verify protected venue search is inaccessible to unauthorized users. Proposed robustness: no matches, invalid counts, incomplete/reversed periods and stale-result recovery. | AUTO-20261009-KAN12-01 passed automated access/validation/failure tests. MAN-20261009-KAN12-01 passed clear/change, invalid-period and organiser refusal paths; stale-response/filter-list-failure paths were not checked manually. Review acceptance: Not recorded. |
| S2-T09 | KAN-52-AC1–KAN-52-AC8 | Rules + database + API/UI | Assess a selected event against venues that pass all applicable checks and venues that separately fail capacity, required facilities, accessibility, required layout or availability. Each relevant failure prevents a suitable result and identifies its cause; a fitting venue is not wrongly rejected. | Local automation passed: [AUTO-20261004-KAN52-01](../../testing/test-evidence.md#4-october-venue-suitability); hosted verification pending |
| S2-T10 | KAN-52-AC9; proposed missing-input and workflow checks | Integrated UI + persistence | Change relevant event and venue information, including capacity, facilities/layouts and availability, then reassess using current data. Proposed robustness: missing/unconfirmed requirements stay Needs review; changed source invalidates old interpretation; no booking or event mutation. | Local automation passed: [AUTO-20261004-KAN52-01](../../testing/test-evidence.md#4-october-venue-suitability); hosted verification pending |
| S2-T11 | KAN-53-AC1–KAN-53-AC10 | Database + two-role hosted UI | Coordinator selects a venue for an authorized event, creates a request with event timing and relevant venue requirements, and submits it. Verify correct event/venue associations, visibility to appropriate staff, a distinct submitted status and no automatic approval. | AUTO-20261005-INTEGRATION-01 includes real PostgreSQL and browser checks. MAN-20261009-S2T23-01 observed coordinator submission as PENDING, unchanged event status and staff visibility/decision. Dedicated full-scenario acceptance: Not recorded. |
| S2-T12 | KAN-53-AC11; proposed request validation/concurrency | API + database concurrency + UI | Unrelated or unauthorized users cannot submit a booking for the event. Proposed robustness: duplicate/repeated requests, invalid period, ineligible state, forged identity/status and failed/concurrent saves follow agreed rules without invalid or duplicate records. | Original branch evidence (4 October): role/relationship rejection, invalid period and ineligible-state (`EVENT_NOT_ELIGIBLE`) checks covered by unit tests and a written integration test; concurrency and forged-identity robustness not separately executed. Hosted/manual acceptance not executed.  5 October: combined local input/HTTP/component, PostgreSQL and browser checks passed in [AUTO-20261005-INTEGRATION-01](../../testing/test-evidence.md#5-october-integrated-venue-search-and-booking-submission). Hosted acceptance remains pending. |
| S2-T13 | KAN-8-AC1–KAN-8-AC10 | Two-role hosted UI + database | Authorized Venue Staff list/open pending requests with timing and venue requirements; approve one and reject another while providing relevant information/reason. Verify decisions on the correct requests, coordinator visibility, retained event/venue associations, approval blocking the booked period and rejection not becoming a confirmed booking. | AUTO-20261004-KAN8-01 passed local layers. MAN-20261009-S2T23-01 records approval, persisted reason/time, coordinator outcome and calendar; MAN-20261009-KAN54-01 also records conflict refusal and rejection cleanup. Full dedicated scenario/refresh acceptance: Not recorded. |
| S2-T14 | KAN-8-AC11; proposed decision validation/concurrency | API + database concurrency | Non-Venue Staff cannot approve/reject through UI or API. Proposed robustness: repeated decisions, simultaneous approve/reject, changed event eligibility and mandatory-reason handling, if agreed, preserve a valid outcome. | Local automated verification: AUTO-20261004-KAN8-01; hosted/manual acceptance not executed. Follow [KAN-8 checks](../../testing/README.md#kan-8-hosted-verification). |
| S2-T15 | KAN-54-AC1, KAN-54-AC2, KAN-54-AC5–KAN-54-AC9; booking-submission customer rule | PostgreSQL + API/UI; proposed concurrency regression | Attempt submission against an already reserved period: refuse it with useful feedback and no booking request created. Assess the latest confirmed bookings and operational blocks again at approval, preventing incompatible confirmation. Repeat after changing blocking data; proposed robustness includes competing approvals and stale views. | Automated unit/PostgreSQL cases passed (AUTO-20261009-KAN54-01). MAN-20261009-KAN54-01 passed submission and approval clash/block paths with feedback; no manual simultaneous/stale-approval test was recorded. Review acceptance: Not recorded. |
| S2-T16 | KAN-54-AC3, KAN-54-AC4; proposed boundary/status checks | Rules + database | An overlapping booking for another venue and a non-overlapping booking for the same venue are not falsely flagged. No turnover buffer is required. Proposed robustness: documented adjacency, timezone and cancelled/rejected/pending-status rules. | Automated boundary/status cases passed (AUTO-20261009-KAN54-01). MAN-20261009-KAN54-01 passed other-venue and directly adjacent-period paths; cancelled-status rules were automated, not manually exercised. Review acceptance: Not recorded. |
| S2-T17 | KAN-55-AC1–KAN-55-AC12 | Integrated UI + database | Venue Staff select the venue, set the date/start/end and an appropriate reason, and save. Use maintenance, renovation, safety restriction, internal activity and other operational reason fixtures. Verify correct venue association, calendar/search/suitability exclusion and prevented conflicting booking confirmation; unaffected periods remain available absent other conflicts. | Unit/component and isolated PostgreSQL layers passed (AUTO-20261005-INTEGRATION-01). MAN-20261009-KAN54-01 records one block, conflicting booking refusal, search exclusion and removal; the full reason/role matrix is Not executed manually. |
| S2-T18 | KAN-55-AC11, KAN-55-AC13; proposed block validation/concurrency | PostgreSQL + API/UI | Non-Venue Staff cannot create a block, and a booking conflicting with a saved block cannot be confirmed. Proposed robustness: simultaneous block/approval, invalid periods, creating a block over an already-confirmed booking and authorized amendment/removal behavior if retained. | Automated block/booking integration evidence is included in AUTO-20261005-INTEGRATION-01; MAN-20261009-KAN54-01 records block-versus-booking refusal. No manual concurrent block/approval or full role matrix is recorded; review acceptance: Not recorded. |
| S2-T19 | KAN-34-AC1–KAN-34-AC3; S1-DEF-01 | Hosted UI + direct API persistence | Existing owned draft: No → Yes registration, fill capacity/window, save/reopen/submit; then check Yes → No handling and compare the new-request path. Recheck unauthorized or disallowed-state edits remain denied without stored changes. | Partial; component coverage passed 1 October ([EventDraftEditPage.test.ts](../../../frontend/src/features/events/pages/EventDraftEditPage.test.ts), [EventRequestForm.test.ts](../../../frontend/src/features/events/components/EventRequestForm.test.ts)); hosted UI/API run still Not executed |
| S2-T20 | KAN-33-AC1–KAN-33-AC3; S1-DEF-02 follow-up navigation | Hosted UI + API authorization | Assigned coordinator approves, returns to navigation, reloads and reopens the request through the supported later-workflow path. Pending queue eligibility remains correct, detail data persists and unrelated users remain denied. | Passed 29 Sept: automated layers (AUTO-20260929-01; CI incl. PostgreSQL and browser tests AUTO-20261001-01, PR #21) and hosted walkthrough MAN-20260929-01 (manual repeat-decision 409 inconclusive, covered by automated test) |
| S2-T21 | KAN-6-AC1, KAN-6-AC4; S1-DEF-03 | Hosted UI + database | Save/reopen a complete draft, submit, refresh and inspect organiser/coordinator status; compare the earlier successful demo path. Repeated/competing submission follows the agreed behavior without duplicate effects. Automatic assignment is separately verified by S2-T01. | Partial. AUTO-20261001-DRAFT-01 verifies the saved-draft fix; MAN-20261009-KAN59-01 records reopening, correcting and submitting the same draft. Repeated/competing submission and full cross-role refresh are not covered by that manual run. |
| S2-T22 | KAN-6-AC2, KAN-6-AC3; S1-DEF-04; submission-field customer rule | Input/API + database + hosted UI | Reject missing date or attendance and each other agreed invalid mandatory/conditional value through UI/API; feedback is actionable and saved data remains Draft. Accept None / Not Required for inapplicable optional needs. Recheck unrelated actors and disallowed source states cannot submit. | Partial. AUTO-20261009-KAN59-01 includes 12 passing PostgreSQL cases. MAN-20261009-KAN59-01 records missing/invalid refusal, Draft preservation and correction/resubmission. Full conditional/role/state matrix was not demonstrated. Attendance 0 is accepted under the Product Owner decision dated 9 October. |
| S2-T23 | KAN-6-AC1; KAN-29-AC1, KAN-29-AC4, KAN-29-AC6; assignment rule; KAN-12-AC8, KAN-12-AC9; KAN-52-AC1, KAN-52-AC9; KAN-53-AC5, KAN-53-AC8, KAN-53-AC9; KAN-8-AC3, KAN-8-AC7, KAN-8-AC9; KAN-51-AC2 | Hosted acceptance walkthrough | Repaired draft → submission/automatic assignment without event approval → search/suitability → venue booking request without automatic booking approval → staff approval → coordinator decision visibility and changed calendar availability. Retain evidence across roles and refreshes; verify additional story criteria in their dedicated cases. | Partial. AUTO-20261009-S2T23-01 passed the isolated API/PostgreSQL chain. MAN-20261009-S2T23-01 records real test-account submission, assignment, search, booking, staff approval, coordinator outcome and calendar/search changes. Suitability assessment and every cross-role refresh were Not executed; actual review acceptance: Not recorded. |

Each story closes only when its Jira criteria, recorded refinements, appropriate tests, review, integration and evidence satisfy the [Definition of Done](../definition-of-done.md). Record actual results in [test evidence](../../testing/test-evidence.md) and link them from the [Sprint 2 evidence register](evidence/README.md) and [review](review.md). Proposed checks become acceptance requirements only through an explicit refinement decision.

## Acceptance reconciliation — 17 October 2026

This dated reconciliation supplements the earlier records; it does not replace the 20 September–3 October commitment, change its **12 parents / 43 SP**, or claim new test execution or retrospective acceptance. The nine new parents retain **93 original numbered criteria**, with **12 later numbered refinements** (KAN-50 AC15–21, KAN-12 AC14–16 and KAN-54 AC10–11). The carried KAN-6/KAN-33/KAN-34 criteria remain in their [Sprint 1 cards](../sprint-01/sprint-backlog.md) and current completion cards where selected. Their points remain included once in the original 43 SP.

Sources: the preserved [21 September Jira export](../../submission/1/jira-backlog-2026-09-21.csv), [11 October export](../../submission/1/jira-backlog-2026-10-11.csv), [16 October export](../../submission/1/jira-backlog-2026-10-16.csv), unchanged live Jira read on 17 October, and the [dated clarification decisions](../../requirements/assumptions-and-questions.md). The dated exports retain their captured wording; the following corrections distinguish historical labels from the current interpretation.

| Earlier wording or omission | Reconciled interpretation and criterion mapping | Functional specification |
| --- | --- | --- |
| KAN-12 AC14–16 and KAN-54 AC10–11 were labelled repo-only on 9 October; the KAN-6 AC5–7 introduction also says not yet on Jira | These refinements are already present in the 11 October and later Jira exports. The older labels describe the 9 October record, not current Jira. Their stable IDs and original dates are retained. | KAN-12 and KAN-54 crosswalk below; KAN-6 uses the Sprint 1/current completion crosswalk. |
| Attendance 0 remained an open question in the carried submission note | The [9 October Product Owner decision](../../requirements/assumptions-and-questions.md#9-october-2026--kan-59-submission-validation-rules-s1-def-04) permits 0 as a supplied attendance value; missing attendance remains invalid. S2-T22 already reflects this. The current KAN-52-AC101 consistency repair does not introduce a new minimum or rewrite Sprint 2 acceptance. | KAN-6 submission cases; current KAN-52-AC101 / TC-11-07. |
| KAN-55 reason and invalid-period safeguards appeared as proposed robustness | The 21 September adopted requirements make the operational reason mandatory and refuse invalid periods. KAN-55-AC4 includes rejecting absent/blank reasons; AC2–AC3 require a valid date and ordered start/end. AC5–AC7 retain reason categories, save and correct-venue association. These are existing requirements, not new scope. | TC-14-207 |
| Competing approval protection appeared as proposed robustness for KAN-54 | KAN-54-AC7 prevents incompatible confirmations even when requests race; AC9 requires rechecking current booking/block information at approval. KAN-53-AC5 submission also refuses an already reserved/blocked period without inserting a conflicting request; approval independently rechecks. These safeguards were already adopted on 21 September. | TC-14-201, TC-14-203, TC-14-204 |
| The current Jira cleanup omitted the no-automatic-event-rejection sentences from KAN-12 and KAN-52 | Restore the existing 21 September guardrails as **KAN-12-AC102** and **KAN-52-AC102** in the current [Sprint 3 cards](../sprint-03/sprint-backlog.md). These repository supplements add traceable IDs, not scope or points; mirroring the restored sentences to Jira remains pending. | TC-10-210; TC-11-205 |

**Test fixtures and historical boundary.** Use synthetic test accounts and two distinct active venues, with recorded original values and build SHA. O1/O2 are organisers, C1/C2 coordinators, V1/V2 Venue Staff and T1 Technical Support; E1/E2 and A/B are synthetic events/venues. Unless a case says otherwise, use 12 January 2031 in Singapore time, matching venue capabilities and unrestricted hours. Use an isolated database for concurrent requests, direct fixture deletion or failure injection; restore fixtures afterwards and record any remaining shared test data. Do not use production data.

The new cases specify the Sprint 2 baseline and its dated refinements: automatic initial assignment, no turnover buffer and no reservation from pending requests. **CR-1 buffers, CR-4 provisional holds and CR-5 Lead assignment remain prospective requirements in later sprint cards**, so a later build must be tested against its applicable changed rules separately. Do not restore an old workflow in the current product merely to satisfy a historical case. The two no-automatic-rejection guardrails still apply to the current carried stories.

**Functional case crosswalk.** The following 49 specifications cover every one of the 105 numbered criteria for the nine new Sprint 2 parents, plus the two restored guardrails. They use the course test-case fields in [test-cases.csv](../../testing/test-cases.csv); [traceability.csv](../../requirements/traceability.csv) links real automated regression targets. New specifications are **Not executed**, their evidence is **Not recorded**, and acceptance is **Not assessed**. Historical passed/failed observations above and in [test evidence](../../testing/test-evidence.md) are unchanged; an existing automated file is not evidence that these newly specified combinations were executed.

| Story | Stable acceptance criteria | Functional case | Specification |
| --- | --- | --- | --- |
| KAN-29 | KAN-29-AC1; KAN-29-AC2; KAN-29-AC3; KAN-29-AC5; KAN-29-AC6 | TC-05-201 | S2 successful submission automatically records exactly one coordinator without deciding the event |
| KAN-29 | KAN-29-AC4 | TC-05-202 | S2 automatically assigned coordinator can open the submitted event |
| KAN-29 | KAN-29-AC7 | TC-05-203 | S2 initial assignment persists through ordinary reads and updates |
| KAN-50 | KAN-50-AC1; KAN-50-AC2 | TC-08-201 | S2 venue catalogue lists venues and opens the correct current record |
| KAN-50 | KAN-50-AC3; KAN-50-AC4; KAN-50-AC9; KAN-50-AC12 | TC-08-202 | S2 location and capacity updates persist for the selected venue |
| KAN-50 | KAN-50-AC5; KAN-50-AC6; KAN-50-AC7; KAN-50-AC10; KAN-50-AC11 | TC-08-203 | S2 facility, accessibility and multiple layout updates remain linked to their venue |
| KAN-50 | KAN-50-AC8; KAN-50-AC16 | TC-08-204 | S2 operating-hour updates validate against the unchanged endpoint |
| KAN-50 | KAN-50-AC13; KAN-50-AC20 | TC-08-205 | S2 updated venue information reaches planning without changing existing bookings |
| KAN-50 | KAN-50-AC14; KAN-50-AC15 | TC-08-206 | S2 only authorised editable venue fields may be saved |
| KAN-50 | KAN-50-AC17 | TC-08-207 | S2 catalogue list and capacity boundaries are normalised and validated |
| KAN-50 | KAN-50-AC18 | TC-08-208 | S2 concurrent catalogue edits preserve disjoint changes and resolve one-field conflicts |
| KAN-50 | KAN-50-AC19 | TC-08-209 | S2 save rejects an inactive or missing catalogue record |
| KAN-50 | KAN-50-AC21 | TC-08-210 | S2 save sends changed fields only and retains input after a failed request |
| KAN-51 | KAN-51-AC1; KAN-51-AC5 | TC-09-201 | S2 all authorised internal roles can inspect availability for the correct venue |
| KAN-51 | KAN-51-AC2; KAN-51-AC3; KAN-51-AC4 | TC-09-202 | S2 calendar distinguishes confirmed bookings, operational blocks and free time |
| KAN-51 | KAN-51-AC6 | TC-09-203 | S2 protected venue calendar denies unauthorised users |
| KAN-12 | KAN-12-AC1 | TC-10-201 | S2 date/time search excludes an overlapping booking or block and permits free periods |
| KAN-12 | KAN-12-AC2; KAN-12-AC4 | TC-10-202 | S2 attendance and capacity filters respect the capacity boundary |
| KAN-12 | KAN-12-AC3; KAN-12-AC5; KAN-12-AC6; KAN-12-AC7 | TC-10-203 | S2 each location, accessibility, layout and facility filter affects results |
| KAN-12 | KAN-12-AC8; KAN-12-AC9; KAN-12-AC10 | TC-10-204 | S2 combined search uses the latest catalogue values and excludes non-matches |
| KAN-12 | KAN-12-AC11; KAN-12-AC12 | TC-10-205 | S2 filters can be changed or cleared and result links identify the right venue |
| KAN-12 | KAN-12-AC13 | TC-10-206 | S2 protected search rejects unauthorised users through UI and API |
| KAN-12 | KAN-12-AC14 | TC-10-207 | S2 invalid or incomplete periods are stopped before any search request |
| KAN-12 | KAN-12-AC15 | TC-10-208 | S2 delayed earlier search responses cannot replace a later search |
| KAN-12 | KAN-12-AC16 | TC-10-209 | S2 missing filter options and no-match results have distinct recoverable feedback |
| KAN-12 | KAN-12-AC102 | TC-10-210 | Restored search guardrail: no matching venue never rejects the event |
| KAN-52 | KAN-52-AC1; KAN-52-AC8 | TC-11-201 | S2 suitability accepts a venue meeting the selected event’s confirmed requirements |
| KAN-52 | KAN-52-AC2; KAN-52-AC3; KAN-52-AC4; KAN-52-AC5; KAN-52-AC7 | TC-11-202 | S2 each unsuitable requirement is identified without false suitability |
| KAN-52 | KAN-52-AC6 | TC-11-203 | S2 suitability considers confirmed bookings, operational blocks and otherwise free time |
| KAN-52 | KAN-52-AC9 | TC-11-204 | S2 refreshed suitability uses current event, venue and availability information |
| KAN-52 | KAN-52-AC102 | TC-11-205 | Restored suitability guardrail: an unsuitable venue never rejects the event |
| KAN-53 | KAN-53-AC1; KAN-53-AC2; KAN-53-AC3; KAN-53-AC4; KAN-53-AC5; KAN-53-AC6; KAN-53-AC7 | TC-12-201 | S2 assigned coordinator submits the selected event’s venue request with correct details |
| KAN-53 | KAN-53-AC8; KAN-53-AC9; KAN-53-AC10 | TC-12-202 | S2 submitted requests are visible to Venue Staff as pending rather than decided |
| KAN-53 | KAN-53-AC11 | TC-12-203 | S2 unrelated coordinators and other users cannot submit event bookings |
| KAN-8 | KAN-8-AC1; KAN-8-AC2 | TC-13-201 | S2 Venue Staff can list and open pending requests with timing and requirements |
| KAN-8 | KAN-8-AC3; KAN-8-AC6; KAN-8-AC7; KAN-8-AC8; KAN-8-AC9 | TC-13-202 | S2 approval persists for the correct booking and updates availability |
| KAN-8 | KAN-8-AC4; KAN-8-AC5; KAN-8-AC10 | TC-13-203 | S2 rejection records its explanation without reserving the venue |
| KAN-8 | KAN-8-AC11 | TC-13-204 | S2 non-Venue Staff cannot decide a booking |
| KAN-54 | KAN-54-AC1; KAN-54-AC2; KAN-54-AC6; KAN-54-AC8; KAN-53-AC5 | TC-14-201 | S2 confirmed-booking overlaps are detected with feedback at submission |
| KAN-54 | KAN-54-AC3; KAN-54-AC4 | TC-14-202 | S2 other venues and non-overlapping intervals do not cause false conflicts |
| KAN-54 | KAN-54-AC5; KAN-53-AC5 | TC-14-203 | S2 operational blocks prevent conflicting venue requests and approval |
| KAN-54 | KAN-54-AC7; KAN-54-AC9 | TC-14-204 | S2 approval rechecks fresh data and serialises competing confirmations |
| KAN-54 | KAN-54-AC10 | TC-14-205 | S2 pending, rejected and cancelled bookings do not reserve the venue |
| KAN-54 | KAN-54-AC11 | TC-14-206 | S2 database overlap enforcement maps to conflicts without hiding unrelated failures |
| KAN-55 | KAN-55-AC1; KAN-55-AC2; KAN-55-AC3; KAN-55-AC4; KAN-55-AC5; KAN-55-AC6; KAN-55-AC7 | TC-14-207 | S2 Venue Staff save a valid venue block with its mandatory operational reason |
| KAN-55 | KAN-55-AC8; KAN-55-AC9; KAN-55-AC10 | TC-14-208 | S2 a saved block is reflected consistently in calendar, search and suitability |
| KAN-55 | KAN-55-AC11 | TC-14-209 | S2 a saved operational block prevents booking confirmation |
| KAN-55 | KAN-55-AC12 | TC-14-210 | S2 unaffected periods outside a block remain available |
| KAN-55 | KAN-55-AC13 | TC-14-211 | S2 only Venue Staff may create operational blocks |

The original S2-T01–S2-T23 run-plan entries and their results remain historical. Use this crosswalk for precise per-criterion specifications and the current sprint cards for later fixes/customer changes; do not infer acceptance from this documentation reconciliation.

**Link maintenance — 19 October 2026:** the removed automatic-allocation helper now links to its historical commit. Earlier requirements, observations and acceptance records are unchanged; CR-5/KAN-79 defines the later replacement policy.
