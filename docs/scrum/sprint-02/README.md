# Sprint 2

## Documentation reconciliation — 17 October 2026

The [dated acceptance reconciliation and functional crosswalk](sprint-backlog.md#acceptance-reconciliation--17-october-2026) now map all **93 original criteria for the nine new stories**, their **12 later numbered refinements**, and the two restored no-automatic-event-rejection guardrails to explicit functional specifications. It clarifies the outdated repo-only labels, attendance-zero decision, mandatory block reason/valid period and competing-approval protection while preserving the earlier dated records. New specifications are **Not executed**; this update supplies no new acceptance or run evidence.

The historical commitment remains **12 parents / 43 SP**. Five carried parents retain **19 SP** in Sprint 3; the other seven remain Jira Done at **24 SP**, which does not establish the accepted total at 3 October. Current Sprint 3 ownership is **Unassigned** for self-selection; the owner names in the earlier 16 October table below are a preserved allocation snapshot. Historical acceptance/velocity remain **Not recorded**. Later customer changes are tracked in the current/future sprint cards and do not rewrite Sprint 2 scope.

## Administrative close and current carry-over — 16 October 2026

**Record updated 16 October 2026.** Jira Sprint 2 (id 34) is **Closed**, with actual administrative completion **16 October 2026 at 02:06 Singapore time**. The original sprint window remains **20 September–3 October** and its commitment remains **43 points: 35 new + 8 carried**. This administrative closure is not a reconstructed 3 October review, retrospective, acceptance decision or velocity.

The following five outstanding parents were selected for completion and re-verification in active Sprint 3 (id 67):

| Story | Original points retained | Current Sprint 3 owner | Current disposition |
| --- | ---: | --- | --- |
| KAN-6 — submit event request | 3 | Kai Jie | To Do; submission feedback and original AC re-verification |
| KAN-34 — resume/edit draft | 3 | Kai Jie | To Do; strict date validation and original AC re-verification |
| KAN-50 — maintain venue catalogue | 5 | Tristan | To Do; stale-save/wrong-record risk and original AC re-verification |
| KAN-12 — search/filter venues | 5 | Tristan | To Do; impossible calendar dates and original AC re-verification |
| KAN-52 — check venue suitability | 3 | Tristan | To Do; zero-attendance consistency and original AC re-verification |
| **Total** | **19** | | **Full-point carry-over; zero delivered credit in this current disposition** |

Their Jira estimates remain 3/3/5/5/3; they were not set to zero. The other seven original parents total **24 SP** and remain Jira Done, but that is **not** a verified accepted total at the Sprint 2 boundary. Historical acceptance/velocity and missing meeting evidence remain **Not recorded**. Earlier passing tests and dated observations are retained. See the [current review assessment](review.md) and [Sprint 3 selected plan](../sprint-03/planning.md#selected-scope-and-release-allocation); the older administrative snapshots below describe their own dates.

## Submission position — 15 October 2026

**Record updated 15 October 2026.** Scope remains **43 points: 35 new + 8 carried**, across 12 parents. All parents and included KAN-57/KAN-58/KAN-76 subtasks are Done in Jira; Sprint 2 is still active. Review/retrospective outcomes, the accepted total at 3 October and the closure burndown are **Not recorded**. Current Done labels do not fill those historical records.

The [baseline and later delivery register](review.md#baseline-and-later-delivery-register--15-october-2026) is the single current comparison of original criteria, evidence at the 3 October boundary, later runs, administrative Done dates and remaining acceptance work. It separates 9–10 October development from the sprint window and identifies the latest defects without rewriting earlier passing observations. The [evidence register](evidence/README.md#15-october-current-evidence-position) links later verification and remaining artifacts.

**Next documentation inputs:** actual review/retrospective decisions and participants; agreed acceptance/DoD version; reviewed build; any original board/burndown, standup and estimation/capacity records; retrospective actions and owners. Where unavailable, leave **Not recorded**. Sprint 3 planning should separately select carry-over, repairs to existing criteria and [new customer changes](../../requirements/change-requests.md).

**Period:** 20 September–3 October 2026, inclusive, Asia/Singapore. **Planning:** Sunday 20 September. **Scheduled review:** Saturday 3 October. The original cadence proposed Sprint 3 planning/start on Sunday 4 October; actual Sprint 3 dates/commitment are **Not recorded**, and no Sprint 3 exists in the 15 October Jira inspection. Daily Scrums were scheduled on Tuesdays, Thursdays and Saturdays. Actual meeting times, attendance and the Sprint 2 retrospective outcome are **Not recorded**.

## 11 October reconciliation

**Record updated 11 October 2026.** The current Jira snapshot records all **12 Sprint 2 parent stories Done (43 points)**; the sprint itself is still **active**. This observation is not the sprint-end velocity or a review acceptance record. The original period, 35 + 8 baseline and dated development records are preserved.

KAN-57, KAN-58 and KAN-76 are **subtasks**, not three extra committed stories: KAN-57 belongs to carried KAN-34, KAN-58 to carried KAN-6, and KAN-76 to KAN-50. They explicitly belong to Sprint 2 in Jira and remain To Do. Their work is included in the parents' existing points. KAN-57/KAN-58 retain missing hosted registration/refresh checks; KAN-76's peer review is not recorded. Do not infer those checks from a parent story's Done label.

Current main includes KAN-50 venue catalogue maintenance (PR #33) and the KAN-59 validation repair. Passing PostgreSQL/browser and shared-development test records already exist for these and other venue workflows; use the [11 October evidence reconciliation](../../testing/test-evidence.md#11-october-reconciliation-of-existing-evidence) and the current [acceptance-plan statuses](sprint-backlog.md#acceptance-test-plan). In particular, the connected run is partial because suitability assessment and every cross-role refresh were not exercised. Older “absent”, “unrepaired” or “not executed” implementation notes below describe their original dates, not current main.

## Sprint goal

Enable submitted requests to reach an assigned coordinator, and enable coordinators to identify suitable available venues from a maintained catalogue, request bookings, and receive Venue Staff decisions without conflicting bookings.

Sprint 2 has been initialized in Jira. The confirmed baseline is **12 PBIs and 43 points**: **nine new stories worth 35 points**, plus unfinished Sprint 1 stories KAN-6, KAN-33 and KAN-34 retaining their original **8 points**. The approximately six-point target per member refers to the **35 new points** only.

Tristan merged the team branches into `main`, and Sprint 1 was closed in Jira. The venue services, UI and their tests described in the original planning inspection were removed from `main` on 26 September (`dff42ed`); their migration tables remain. Those earlier inspection notes are historical planning context. Manual assignment remains implemented; on 28 September Tristan added KAN-29 automatic initial assignment on a feature branch. Neither implementation presence nor a merge establishes acceptance of a Sprint 2 story.

**30 September scope correction:** the [repository audit](../../requirements/README.md#30-september-sprint-scope-audit) removes final confirmation/cancellation/completion, notification generation and coordinator handover from the current application. Initial manual assignment of an unassigned request, automatic allocation, clarification and read-only status history remain. Applied database history and integrity guards are preserved. This supersedes earlier implementation statements that retained handover; KAN-65 remains future work. The 43-point commitment, acceptance criteria and historical results are unchanged.

## Sprint records

| Document | Purpose | Update when |
| --- | --- | --- |
| [Planning and meeting record](planning.md) | Goal, meeting decisions, dependencies, proposed sequence and open questions | Record actual meeting details, allocation and dated decisions |
| [Estimation and capacity](estimation-and-capacity.md) | New-story estimates, carry-over treatment, workload target and availability | Complete capacity and estimation discussion; record agreed changes |
| [Sprint backlog and acceptance test plan](sprint-backlog.md) | Selected scope, Jira criteria, proposed technical tasks/checks and test traceability | Assign owners/reviewers, reconcile refinements with Jira and link actual results |
| [Daily progress and burndown](daily-progress.md) | Actual updates, impediments, scope changes and remaining points | At actual check-ins and dated board observations |
| [Sprint review](review.md) | Original baseline, later delivery, demonstration and acceptance/closure record | Add the actual review date, build and outcomes when supplied; preserve the scheduled 3 October boundary |
| [Retrospective](retrospective.md) | Process observations and improvement actions | Record actual meeting evidence and subsequent action follow-up |
| [Evidence register](evidence/README.md) | Artifact index, capture requirements and evidence gaps | As each artifact is captured or verified |

Use the shared [Definition of Done](../definition-of-done.md), [requirements](../../requirements/README.md), [clarification log](../../requirements/assumptions-and-questions.md), [architecture](../../architecture/README.md) and [testing guidance](../../testing/README.md).

## Planning decisions and outstanding details

| Area | Record |
| --- | --- |
| New Must stories | KAN-29, KAN-50, KAN-51, KAN-12, KAN-52, KAN-53, KAN-8 and KAN-54: 32 points |
| New Supporting story | KAN-55: 3 points |
| Carry-over | KAN-6, KAN-33 and KAN-34 retain 3, 2 and 3 points respectively; 8 points included in the 43-point baseline |
| Calendar access decision | Internal users: Event Coordinators, Venue Staff and Technical Support Staff |
| Manual assignment decision | Coordinators may initially assign an unassigned request to themselves or another coordinator; replacing an existing coordinator is deferred to future KAN-65 |
| Automatic assignment | Branch choices implemented 28 September: `coordinator_available` defaults false with explicit opt-in; count `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `CONFIRMED`; choose least load then ascending profile UUID. No eligible coordinator returns 409 with the draft unchanged. Team/customer acceptance of these details remains pending. |
| Team and allocation | Current Jira assignees, checked 11 October: Tristan — KAN-29/KAN-8/KAN-52; Irfan — KAN-50/KAN-33; Arvin — KAN-51; Ryan — KAN-12; Ernest — KAN-54; Kai Jie — KAN-53/KAN-55/KAN-6/KAN-34. Reviewers: To agree. These current assignments do not reconstruct who decided the original planning allocation. |
| Capacity and Scrum roles | Arvin is Scrum Master and Irfan is Product Owner; both also work as developers. Individual development hours and time for Scrum responsibilities remain to be recorded. |
| Acceptance criteria and refinements | The backlog retains 93 detailed planning criteria. The pre-edit export had 77. Six shorter Jira cards now include the missing checks as dated refinements; KAN-29/KAN-50/KAN-51 already matched. Customer rules add submission conflict protection, minimum event-submission fields and preconfigured availability. Existing criterion IDs remain stable. KAN-29 local automation is recorded in AUTO-20260928-01; hosted checks and Sprint 2 review outcomes remain pending. |

The carry-over work targets four reported paths in the [Sprint 1 defect record](../sprint-01/review.md#review-defects-and-carry-over): registration fields after enabling registration on an existing draft, coordinator navigation after approval, saved-draft submission, and mandatory-field validation. Preserve the successful Sprint 1 demo observations while reproducing these paths separately.

The [21 September Jira update](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied) links KAN-56–KAN-59 to the carried stories and KAN-60 to the event-rejection correction. The [product backlog](../../requirements/product-backlog.md) covers future release work including KAN-61–KAN-67. KAN-60–KAN-67 remain unestimated outside this sprint; archiving KAN-19/KAN-21/KAN-22/KAN-23 does not change the 43-point commitment.

**KAN-29 handoff, 28 September:** automatic selection, atomic submission/history and recoverable allocation errors are implemented locally. The targeted PostgreSQL run passed 29 new automatic-assignment, 12 submission and 10 existing manual-assignment tests; see [AUTO-20260928-01](../../testing/test-evidence.md#28-september-kan-29-automatic-assignment) for the exact environment and limits. Coordinate migration 006 and provisioned-coordinator opt-in with Arvin before hosted testing, then follow the [manual guide](../../testing/README.md#kan-29-hosted-verification). Shared Supabase rollout, hosted acceptance, CI and peer review are not completed by this record. KAN-29 remains unaccepted and the baseline stays 43 points.

**30 September schema follow-up:** Tristan has since applied migration 006 to shared Supabase. [DB-SCHEMA-20260930-01](../../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) confirms the required fields and constraint, and all six current migration checksums match hosted history through the recognised filename aliases. The 28 September handoff above retains its original evidence boundary. Confirm provisioned-coordinator opt-in and complete the hosted manual checks, availability-policy acceptance, CI and peer review. No story acceptance or change to the 43-point baseline is recorded.

**4 October integration and KAN-8:** the latest fetched team changes are integrated locally, including coordinator decided-request history, draft verification, KAN-12 search and KAN-51 availability. Tristan implemented pending venue booking decisions and assigned-coordinator outcomes. Use the [KAN-8 manual guide](../../testing/README.md#kan-8-hosted-verification) with existing synthetic pending bookings; KAN-53 submission is not implemented. Approval-time conflicts and calendar refresh are included, but catalogue maintenance, suitability, submission and block creation remain separate stories. AUTO-20261004-KAN8-01 in [test evidence](../../testing/test-evidence.md) records local runs. This update does not establish a 3 October review result, a Jira transition or Done points; the baseline remains 43.

## Next actions

1. Record available development hours and meeting details before judging the feasibility of the 43-point baseline.
2. Confirm reviewers and retain the current Jira owners above; record review and evidence responsibilities.
3. Review the implemented automatic-assignment choices, resolve remaining venue policy questions, and record accepted decisions and allocation in Jira.
4. Supply or execute the missing KAN-57/KAN-58 hosted checks, retain an actual peer-review record for KAN-76, and complete the remaining suitability/cross-role refresh portions of S2-T23. These subtasks became Done in Jira on 15 October without new supporting run/review evidence in the inspected sources. Preserve the already recorded KAN-59 repair and shared-development runs.
5. Capture the actual Jira baseline, meeting records and executed acceptance evidence as they become available.

**4 October KAN-52 follow-up:** the new branch starts from current `main` (`ae2be66`), which includes KAN-55 block management. Tristan implements event-specific suitability with coordinator interpretation of free-text requirements, explained tri-state results and current-data rechecks. No migration or event/booking writes are added. KAN-50 catalogue maintenance remains absent, and KAN-53 booking creation is not yet integrated into this branch/main. Follow [KAN-52 hosted verification](../../testing/README.md#kan-52-hosted-verification) and record actual test results, peer review and CI separately; no review result or Done points are inferred.

**5 October branch integration:** KAN-12's latest date-filter work and Kai Jie's KAN-53 submission are now integrated into `codex/KAN-52-venue-suitability`. The assigned coordinator can create a pending booking from the review page, staff can decide it, and coordinator outcomes/calendar can be checked together. Creation now refuses current approved reservations and operational blocks after taking the venue lock; pending requests still do not reserve. KAN-12 and KAN-52 share continuous-interval Singapore opening-hours checks. Follow [submission](../../testing/README.md#kan-53-hosted-verification) and [decision](../../testing/README.md#kan-8-hosted-verification) verification; this update records implementation, not an executed hosted result or a remote-main update. KAN-50 remains absent, and the 43-point baseline and 93 criteria remain unchanged.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

**KAN-51 — calendar, recorded owner Arvin, 5 SP.** Ernest’s original calendar rebuild in [PR #22](https://github.com/MochaLxtte/ConnectSphere/pull/22) remains his contribution. Arvin’s [PR #28](https://github.com/MochaLxtte/ConnectSphere/pull/28) corrected route/history synchronization, venue selection and server-side denial of spoofed roles; it merged **7 October 01:29 Singapore time**, after Sprint 2’s planned 3 October end. It added three component regressions and two API denial regressions. This is later delivery on a Sprint 2 story, not evidence of on-time Sprint 2 completion.

The existing **MAN-20261006-KAN51-01** walkthrough used a real local API with isolated PostgreSQL and locally signed fixture tokens: 15 checks passed as recorded. It did not exercise hosted Supabase password sign-in. The original ignored captures were not retained in this documentation checkout; no replacement screenshot is invented. GitHub readback records no submitted human approval for #28. `KAN-51-AC1`–`AC6`, `TC-09-201`–`203` and `S2-T05/T06` remain subject to their recorded scope and hosted acceptance gaps; the later shared buffers/holds requirements do not retroactively redefine the original checks. No new acceptance or velocity is inferred.

See the [evidence index](evidence/README.md) and [master contribution register](../../requirements/product-backlog.md).
