# Sprint 1 review and closure

**Record check — 15 October 2026:** retain the reported **32 committed / 24 Done / 8 carried** outcome and the demonstrated passes and failures below. Exact reviewed-build, participant, acceptance-decision and supporting-artifact details remain **Not recorded** where indicated. Subsequent fixes and Jira updates are in the [Sprint 2 review register](../sprint-02/review.md#baseline-and-later-delivery-register--15-october-2026); they do not alter the 19 September observations.

Sprint: **6–19 September 2026**, inclusive, Asia/Singapore. **Status: review completed and sprint closed in Jira; closure evidence reconciliation remains open.** This record was updated on 21 September from the review outcomes. Keep the original sprint window separate from the meeting and integration dates.

| Meeting detail | Record |
| --- | --- |
| Originally scheduled date | Saturday 19 September 2026 |
| Actual date, start/end time and timezone | Saturday 19 September 2026, Asia/Singapore; start/end times not recorded. Notes prepared 21 September. |
| Facilitator and note taker | Not recorded; Tristan owns the retrospective write-up and repository documentation follow-up. |
| Attendees and roles | Arvin is Scrum Master and Irfan is Product Owner; both also work as developers. Attendance is not recorded; role and story ownership do not establish attendance. |
| Absent stakeholders and feedback follow-up | Stakeholder attendance and external feedback follow-up not recorded. |
| Reviewed application version | Exact served commit, environment and fixture IDs were not captured in the review notes. Merge `db2c9db` (PR #12) occurred on 20 September, after this review, and is recorded separately as later integration. |
| Review evidence | Outcomes below; [E13](evidence/README.md) and [MAN-S1-REVIEW-01](../../testing/test-evidence.md). Meeting recording/transcript, screenshots and Jira closure export still to link. |

## Purpose and agenda

Inspect the integrated increment against the Sprint 1 goal recorded in [planning](planning.md): an organiser can authenticate, create, save and edit a draft, submit it for coordinator review, receive clarification and view the resulting approval or rejection. Carry feedback into Sprint 2 Planning, held on **Sunday 20 September**, and record its actual meeting time separately.

This review took place on 19 September; the exact demonstrated build remains to be linked. Distinguish this review from later integration or fixes when recording the sprint outcome. Demonstrating additional functionality does not change the original ten-PBI, 32-point commitment.

The team followed the demo run sheet, discussed defects, closed Sprint 1 in Jira and initialized Sprint 2. The planned 45-minute agenda covered the sprint goal, working stories and failure cases, feedback and backlog follow-ups; actual meeting duration and participation were not recorded.

## Demo preparation

- [ ] Record the exact build/commit and use the setup documented in the root README. Link applicable automated results for the demonstrated code; record new runs if the code has changed.
- [ ] Confirm authentication, coordinator visibility, mandatory submission fields and legal transitions against the accepted story criteria and recorded customer clarifications.
- [ ] Prepare mapped fictional accounts: Organiser A, Organiser B who has no relationship to A's event, and a permitted Coordinator. Include an unrelated Attendee for the additional role-denial case if that account is available; otherwise record that case as NOT DEMONSTRATED. Keep credentials outside committed evidence.
- [ ] Prepare separate fictional requests for approval, rejection and clarification, plus an untouched incomplete draft for the queue/access checks. Use the request created in DEMO-02 through DEMO-05 for the submission walkthrough and then one decision path. Fixture IDs and reproducible setup evidence: **Not recorded; to attach**. Use fresh undecided requests for repeated walkthroughs rather than manually resetting completed decisions.
- [ ] Submission does not assign a coordinator. As a coordinator, use **Unassigned requests** (`/reviews/unassigned`) to assign each submitted fixture to the demo coordinator, then open that coordinator's review queue. Treat assignment as supporting demo setup unless a dated Sprint 1 scope change selected KAN-29.
- [ ] Link every demonstrated story to acceptance criteria, implementation and executed tests. Include failures and limitations in the review.

The states used in this walkthrough are `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, and `REJECTED`. The assigned coordinator can approve/reject a `SUBMITTED` or `UNDER_REVIEW` request with no recorded decision. The implementation treated the reason as optional; the [customer-rule reconciliation](../../requirements/assumptions-and-questions.md#21-september-2026--customer-rules-reconciled-with-the-backlog) requires a reason for rejection, so that behaviour needs correction and verification. **Start review** explicitly changes `SUBMITTED` to `UNDER_REVIEW`; simply opening a request does not. Requesting clarification changes either reviewable state to `CLARIFICATION_REQUESTED`. The owner can respond, returning the request to `SUBMITTED` once all open questions are answered. Initial decisions are blocked while clarification remains pending. Preserve the demonstrated results; track policy corrections separately using the [API contract](../../architecture/api-contract.md) and decision log.

The [test evidence register](../../testing/test-evidence.md) contains earlier hosted checks and automated integration results. Those results remain separate from this review and do not fill demonstration outcomes below.

## Demo run sheet

Results below record the review observations. A PASS covers the demonstrated path, not every variation of the story. Exact request IDs, field values, actor combinations and response captures were not included in the meeting notes. Preserve the successful demonstrations alongside the separately reported defects; resolve those differences through targeted reproduction. Assess story completion separately against its acceptance criteria and Definition of Done.

| ID / story | Owner | Actions and expected behavior | Actual outcome / observation / evidence |
| --- | --- | --- | --- |
| DEMO-01 / KAN-25 | Ryan | Sign in as Organiser A and confirm the authenticated identity. Sign out, attempt an invalid login and check that no session is created. Verify a protected API operation is denied while signed out. | PASS — authentication demo worked as expected. Detailed captures still to link. |
| DEMO-02 / KAN-31, KAN-4; KAN-34 follow-up | Ernest; Kai Jie for saved-draft editing | As Organiser A, create a fictional "Community Welcome Session" request with an intentionally incomplete permitted field set. Save it as `DRAFT`; reload and show persisted values and ownership. Record its ID for DEMO-03 to DEMO-05. | ISSUE FOUND — changing registration from No to Yes while editing a draft did not expose the expected capacity and registration-date fields. Recorded under DEMO-02 in the meeting; the affected saved-draft path also belongs to KAN-34. See S1-DEF-01. |
| DEMO-03 / KAN-34 | Kai Jie | Reopen A's draft, edit a permitted field, save, then reload and show the change. Check that other existing values remain unchanged; link the API tests for omitted PATCH fields. | PASS — demonstrated draft editing worked. This does not resolve the registration-toggle defect in S1-DEF-01; KAN-34 carries over. |
| DEMO-04 / KAN-6 | Kai Jie | Leave an agreed mandatory submission field incomplete and attempt submission. Show actionable validation and that the request remains `DRAFT`. Record the exact field and agreed validation rule. | PASS for the demonstrated validation case. Other requests reportedly submitted without mandatory information or errors; exact fields/path need reproduction under S1-DEF-04. KAN-6 remains open. |
| DEMO-05 / KAN-6, KAN-16 | Kai Jie and Tristan | Complete mandatory fields and submit through the application. As Organiser A, refresh the request list and detail and show that both retain `SUBMITTED`. Then sign in as a coordinator, assign the request via Unassigned requests and show it in the assigned coordinator's review queue. Record assignment as supporting setup. | PASS for the demonstrated submission/status path. The review also reported that converting a saved draft to a submitted request was unavailable; reconcile the exact entry path and served build under S1-DEF-03. This result does not close KAN-6. |
| DEMO-06 / KAN-33 | Irfan | As the assigned coordinator, inspect the submitted request and available details. Confirm that the separate incomplete draft is absent from the review queue. Show that opening the request preserves `SUBMITTED`; then choose Start review and refresh to show `UNDER_REVIEW`. | ISSUE FOUND — after approval the request disappeared from the coordinator's view, leaving no apparent route to final confirmation. Pending-queue removal is expected; accessible follow-up navigation needs repair/verification. See S1-DEF-02; KAN-33 carries over. |
| DEMO-07 / KAN-36, KAN-16 | Tristan | Approve an assigned `UNDER_REVIEW` fixture and reject a separate assigned `SUBMITTED` fixture, including a reason on the rejection. Refresh to show saved outcomes and no further initial-decision controls; confirm both leave the pending review queue. Sign in as the owning organiser; open both requests from the list and refresh to show the matching `APPROVED`/`REJECTED` statuses and permitted decision details. | PASS — approval/rejection and organiser outcome demo worked as expected. Coordinator follow-up navigation is recorded separately in S1-DEF-02. |
| DEMO-08 / KAN-25 and affected event stories | Ryan, with feature owners | Attempt direct retrieval/edit/submission/review of A's request while signed out and as Organiser B; include an unrelated Attendee if available. Check denied API responses without event details or data changes. As an organiser, confirm review links are hidden and direct `/reviews`, `/reviews/unassigned` and `/reviews/:id` show an access message without review data. | PASS — demonstrated access checks worked as expected. Exact actor/path coverage, including whether an Attendee account was exercised, remains to be captured. |
| DEMO-09 / KAN-36 | Tristan | As the still-assigned coordinator, repeat the saved decision through the API, then attempt the opposite decision on the same request. Both return HTTP `409 REVIEW_ALREADY_DECIDED`; verify that the original status and single review record remain unchanged. Record both responses. | PASS — repeated/conflicting decision scenario worked as expected. Link the console responses and database observation when available. |
| DEMO-10 / KAN-27 | Irfan | Use a separate assigned, undecided `SUBMITTED` or `UNDER_REVIEW` request. Ask for clarification; show `CLARIFICATION_REQUESTED` and that initial decisions are unavailable. As the owner, view the question and respond. Once all open questions have responses, refresh to show `SUBMITTED` and confirm the assigned coordinator can see the response. | PASS — clarification walkthrough completed successfully; KAN-27 marked Done in Jira. Detailed captures still to link. |
| DEMO-11 / KAN-24 | Arvin | Show application/database readiness and the persisted request, owner, assignment and review records from the walkthrough. Explain the schema and identity mappings; link reviewed migrations, verified-TLS setup and executed database integration results. Check the Supabase dashboard's Data API disabled setting itself and link table-access evidence; an HTTP error alone does not confirm the setting. Keep credentials out of captures. Use read-only inspection of demo records; demonstrate migration or seed reruns only on a dedicated test database. | PASS — database walkthrough completed successfully; KAN-24 marked Done in Jira. Retain the exact checks and dashboard/setup captures with the existing automated evidence. |

If a rule remains unresolved, mark the affected scenario BLOCKED and record a customer question. Do not change the expected outcome after a failure solely to make the demo pass. Connect demo evidence to the formal test results in [testing](../../testing/README.md); a manual review is not a substitute for test coverage.

## Review defects and carry-over

The local defect references now map to Jira subtasks created on 21 September: **S1-DEF-01 → KAN-57; S1-DEF-02 → KAN-56; S1-DEF-03 → KAN-58; S1-DEF-04 → KAN-59**. They remain inside the three carried stories' eight points. No fix or retest is recorded by creating these tasks; add reproduction and regression evidence when available.

| Reference | Observed problem and qualification | Affected work / follow-up owner | Sprint 2 verification |
| --- | --- | --- | --- |
| S1-DEF-01 | Existing draft registration changed No → Yes, but capacity and registration dates were unavailable. Basic edit demo passed separately. | KAN-34 — Kai Jie; coordinate shared-form behaviour with Ernest (KAN-31/KAN-4). | Reopen a saved draft, toggle registration, enter capacity/window, save/reload, and verify UI/API persistence and submission validation. |
| S1-DEF-02 | Approved request left the coordinator's view, preventing the next confirmation step. Removing it from the pending review queue is expected; losing a usable authorised follow-up path is the reported defect. | KAN-33 — Irfan; coordinate outcome and lifecycle integration with Tristan/Arvin. | Discover and reopen an assigned approved request through navigation; retain permission checks and no second initial decision. Check confirmation separately against its prerequisites. |
| S1-DEF-03 | Saved-draft-to-submitted-request action reported unavailable although DEMO-05 passed and submission code exists. Exact route, fixture, session and build remain to be reproduced. | KAN-6 — Kai Jie; Ernest for creation/save entry paths. | Test new-request submission and reopened saved-draft submission independently using the same agreed fields; verify persisted status and organiser/coordinator visibility. |
| S1-DEF-04 | Some incomplete requests submitted without expected mandatory-field errors although DEMO-04 passed one validation case. Exact omitted fields and any conditional registration rules remain to be identified. | KAN-6 — Kai Jie; agree validation boundaries with the team. | Exercise each agreed mandatory field and conditional registration case through every submit UI and direct API; invalid attempts keep DRAFT and preserve data. |

KAN-6, KAN-33 and KAN-34 remain open and moved to [Sprint 2](../sprint-02/sprint-backlog.md): **8 points at their retained estimates (3 + 2 + 3)**. Sprint 2's agreed baseline is **43 points across 12 PBIs: 35 new + 8 carry-over**. No partial Sprint 1 points are awarded to these items, and supporting defect tasks add no separate points.

## Inspect the sprint outcome

The Jira closure dispositions are recorded below. The adopted [Definition of Done](../definition-of-done.md) version and Irfan's Product Owner acceptance record are **not recorded; to attach**. Keep these evidence gaps separate from the recorded story statuses.

| Story / task | Agreed scope at start / change reference | Done, unfinished, removed or not selected | Acceptance criteria and DoD evidence | Remaining work / backlog link |
| --- | --- | --- | --- | --- |
| KAN-25 — authentication and authorization | Committed, 5 points | Done in Jira | DEMO-01/08; existing auth/access tests | Link final Jira/PR/CI evidence. |
| KAN-31 — event creation | Committed, 3 points | Done in Jira | Creation/save work accepted; DEMO-02 follow-up assigned to KAN-34 | Support S1-DEF-01/03 if shared form changes are needed; no reopening recorded. |
| KAN-4 — saving a draft | Committed, 3 points | Done in Jira | Draft persistence accepted; related existing tests | S1-DEF-01 concerns saved-draft editing; no reopening recorded. |
| KAN-34 — editing a draft | Committed, 3 points | Unfinished; carried to Sprint 2 | DEMO-03 passed; S1-DEF-01 remains | Kai Jie; [Sprint 2 carry-over](../sprint-02/sprint-backlog.md). |
| KAN-6 — submitting a request | Committed, 3 points | Unfinished; carried to Sprint 2 | DEMO-04/05 passed demonstrated paths; S1-DEF-03/04 remain | Kai Jie; reproduce entry-path and validation differences. |
| KAN-33 — coordinator review | Committed, 2 points | Unfinished; carried to Sprint 2 | DEMO-06 exposed S1-DEF-02 | Irfan; restore discoverable access to assigned approved requests. |
| KAN-27 — clarification | Committed, 3 points | Done in Jira | DEMO-10 passed; existing clarification tests | Link detailed review evidence. |
| KAN-36 — approval and rejection | Committed, 3 points | Done in Jira | DEMO-07/09 passed; existing decision/access/persistence tests | Support coordinator follow-up under KAN-33. KAN-60 separately tracks the mandatory rejection-reason correction recorded 21 September; historical passes remain unchanged. |
| KAN-16 — organiser event status | Committed, 2 points | Done in Jira | DEMO-05/07 passed; existing organiser status/access evidence | Recheck status refresh when carry-over submission fixes land. |
| KAN-24 — database/integration PBI | Separately committed, 5 points | Done in Jira | DEMO-11 passed; existing setup and PostgreSQL integration evidence | Retain setup/dashboard captures; support Sprint 2 integration. |
| KAN-29 — conditional item | Not committed in Sprint 1 | Not selected in Sprint 1 | No Sprint 1 points | Selected for Sprint 2 at 3 points for automatic assignment. |

The commitment agreed at Sprint Planning on 6 September is **10 PBIs, 32 points**: nine user stories totalling 27 points and KAN-24 estimated separately at 5 points. Attach the original Jira backlog export and check its titles against this record. Add any scope changes with links to the decisions, and link owners and reviewers to their tasks and PRs.

| Measure | Actual value / evidence |
| --- | --- |
| Sprint goal outcome | Partially achieved: working authentication, draft and review/outcome paths were demonstrated, but three stories remain open for registration editing, submission/validation and coordinator follow-up access. |
| Original committed points | **32 points across 10 PBIs**, agreed at Sprint Planning on 6 September; see estimation and capacity record |
| Added/removed scope and estimate changes | No changes to the 32-point commitment were reported. Attach Jira history to reconcile exact transitions and dates. Carry-over is unfinished work, not a retrospective removal from Sprint 1. |
| Final in-scope PBI points | **32** across the original ten items. |
| Done PBI points / closure velocity | **24** across seven Done items: 19 business-story points + 5 KAN-24 points. The current Jira snapshot records resolution on 20 September at 23:06 for KAN-16 and 21 September at 00:26 for the other six, without a timezone. These later tracker updates do not establish individual acceptance times at the 19 September review. |
| Unfinished in-scope points | **8** across KAN-6 (3), KAN-33 (2), KAN-34 (3); carried to Sprint 2. **32 = 24 + 8.** |
| Technical PBI and supporting tasks | KAN-24 contributes its own 5 points once. Its subtasks add no points. KAN-29 contributes no Sprint 1 points. |
| Remaining defects or limitations | S1-DEF-01–04 above. Detailed reproduction, final CI/review links, timestamps and evidence captures still to consolidate. |

The closure reconciles to **32 committed = 24 Done + 8 carried over**, using the original estimates. KAN-6, KAN-33 and KAN-34 moved into the [Sprint 2 backlog](../sprint-02/sprint-backlog.md). Keep the original baseline and daily observations intact; the closure decision does not supply missing daily completion dates. Link the final Jira export in [evidence](evidence/README.md).

## Stakeholder feedback and backlog decisions

| Feedback ID | Actual contributor / date | Observation, request or question | Affected story / evidence | Team response and backlog change | Follow-up owner / date |
| --- | --- | --- | --- | --- | --- |
| S1-FB-01 | Team review; individual contributors/time not recorded | Registration-toggle fields, post-approval navigation, saved-draft submission and validation issues | S1-DEF-01–04 | KAN-6, KAN-33 and KAN-34 remain open and moved to Sprint 2. | Kai Jie and Irfan; resolve and retest during Sprint 2. |
| S1-FB-02 | Team review/planning; individual contributors/time not recorded | Define authorised internal calendar users | KAN-51 | Event Coordinators, Venue Staff and Technical Support Staff may access venue availability calendars. Resolve detailed booking-label visibility in the access contract. | KAN-51 owner to be selected. |
| S1-FB-03 | Team review/planning; individual contributors/time not recorded | Coordinators may assign requests to themselves or colleagues | KAN-29 | Preserve manual selection alongside automatic assignment; availability/selection rules, no-candidate handling and authority over another coordinator's assignment still need refinement. | KAN-29 owner to be selected. |
| S1-FB-04 | Team review/planning | Balance new Sprint 2 work across six developers | Sprint 2 planning | Nine new stories = 35 points, approximately 6 each before the 8 carry-over points. Agreed total = 43. Members choose stories and confirm allocation; no equal assignment is yet recorded. | All six developers. |
| S1-FB-05 | Team review/planning | Keep the integrated code and meeting records available | PR #12; Sprint 2 documentation | Tristan integrated the active branches into main and will prepare the retrospective write-up and new story records. | Tristan; documentation prepared 21 September. |

The feedback above records the team's review decisions. External stakeholder attendance and separate customer/Product Owner feedback were not recorded; add these when available without attributing the team's decisions to absent stakeholders.

## Closure checklist

- [ ] Complete the review times, attendance and reviewed commit; retain the 19 September meeting date and recorded results.
- [ ] Capture the end-of-sprint board and dated burndown before starting the next sprint; preserve the original baseline.
- [x] Record the Jira closure dispositions: seven Done / 24 points and three carried over / 8 points. Final export still to attach.
- [ ] Link executed tests, CI and demo evidence; record any checks that were not run.
- [x] Carry KAN-6, KAN-33 and KAN-34 into Sprint 2 and record the new 35-point story selection. New story owners still to select.
- [ ] Update the [evidence register](evidence/README.md), requirement traceability and relevant architecture records.
- [ ] Carry factual process observations into the [retrospective](retrospective.md).
