> Historical source snapshot retained during the 5 November 2026 documentation cleanup. Statements below describe their original dates; use the [current editing page](../../retrospective.md) for the supported summary. Original prose and headings are retained; relative links are rebased.

# Sprint 1 retrospective

**25 October 2026 reconciliation:** The [new supplied report](#25-october-2026--team-meeting-and-manual-result-reconciliation) records meeting attendance and/or manual results separately from earlier dated evidence. It does not backdate new fixes or infer acceptance.

**Record check — 15 October 2026:** the meeting date and source observations below are retained. Individual feedback, actual participants and agreement to the proposed actions remain **Not recorded**. An improvement agreed now should be dated now and followed up in [Sprint 3 planning](../../../sprint-03/planning.md), rather than being attributed to the historical meeting.

Sprint: **6–19 September 2026**, inclusive, Asia/Singapore. **Retrospective held: 19 September. Writeup prepared: 21 September. Owner: Tristan.** Sprint 1 review is complete and the sprint is closed in Jira. This writeup draws together the review observations and proposed process improvements for Sprint 2. Attendance, participant discussion, voting and agreed root causes have not been recorded.

| Meeting detail | Record |
| --- | --- |
| Actual retrospective date | Saturday 19 September 2026 |
| Start/end time and timezone | Times not recorded; Asia/Singapore |
| Facilitator and note taker | Not recorded; Tristan owns this writeup |
| Scrum roles | Arvin is Scrum Master and Irfan is Product Owner; both also work as developers. These roles do not establish who attended or facilitated this meeting. |
| Attendees and absences | Not recorded |
| Review timing | Review also held on 19 September; exact meeting times not recorded |
| Meeting evidence | Original notes or Zoom transcript not available in this record; no recording linked |
| Input evidence | [Review results and defects](../../review.md), [historical progress and missing burndown observations](../../daily-progress.md), [test evidence](../../../../testing/test-evidence.md), and the agreed Sprint 2 handoff |

## Outcome and observations

The original commitment was **10 PBIs and 32 points**. Seven PBIs are Done at closure: KAN-25, KAN-31, KAN-4, KAN-27, KAN-36, KAN-16 and KAN-24. Their **24 points** comprise 19 business-story points and 5 infrastructure points. KAN-6, KAN-33 and KAN-34 carry forward at **8 points**. Exact completion timestamps remain to attach, so the closure outcome does not establish how much was Done by the original 19 September boundary.

| What we observed | Evidence and effect | What to take into Sprint 2 |
| --- | --- | --- |
| Much of the demonstrated workflow worked | DEMO-01, DEMO-03, DEMO-04, DEMO-05, DEMO-07, DEMO-08, DEMO-09, DEMO-10 and DEMO-11 passed. Earlier dated manual checks also covered status persistence and access restrictions. | Preserve the passing paths as regression scenarios while fixing the remaining cases. |
| Follow-up integration brought the branches together | After the 19 September retrospective, Tristan merged all team branches into `main`; [PR #12](https://github.com/MochaLxtte/ConnectSphere/pull/12) produced `db2c9db` on 20 September. This later update is separate from the review; the exact demo build remains to record. | Continue integrating shared work and retain a reproducible build for review. A merge alone does not describe the tested behavior. |
| Draft editing needs another pass | In DEMO-02, changing registration from no to yes in a saved draft did not expose the capacity/date fields. KAN-34 carries forward. | Include changes to conditional fields after save and reload in the acceptance walkthrough. |
| A later workflow stage became inaccessible | In DEMO-06, approval removed the request from the coordinator view, leaving no accessible path to final confirmation. KAN-33 carries forward. | Walk through how the responsible actor finds the request again after each status transition. Approval and final confirmation are separate stages. |
| Submission observations need to be reconciled | DEMO-04/05 worked, but saved-draft submission was also reported as not implemented and some submissions with missing required fields were accepted. KAN-6 carries forward. | Retain both observations and reproduce the exact routes, request states, input fields and tested build before concluding which behavior failed. |
| Closure evidence is incomplete | The Done/carryover totals and later Jira resolution updates are recorded. The closing board/report, actual acceptance times, daily burndown and meeting attendance are still missing. | Capture observations as work happens. Keep unknown daily values blank and distinguish tracker updates, record preparation and actual meeting/acceptance times. |

The remaining draft, submission and coordinator-navigation cases interrupt the integrated goal path and explain the carryover. The [review defect register](../../review.md#review-defects-and-carry-over) tracks S1-DEF-01 through S1-DEF-04.

## Lessons to discuss

The review suggests that we should test how a request moves across saved drafts, conditional form fields and later statuses, in addition to demonstrating individual features. This is a proposed lesson from the observed gaps; it is not a recorded team agreement about why they occurred.

| Topic | Possible explanation to examine | Evidence still needed |
| --- | --- | --- |
| Draft registration and submission | The saved-draft path may behave differently from the creation path, or the demonstrations may have used different data or builds. | Exact DEMO-02/04/05 routes, request states, field values and build; repeatable saved-draft cases. |
| Approved-request access | Queue eligibility and later navigation may not support the same lifecycle stages. Historical direct-detail checks and the review navigation issue need to be considered separately. | Steps from approval to final confirmation for the assigned coordinator, including refresh and navigation. |
| Required-field validation | Client/server checks or the agreed field rules may differ across submission paths. | The exact missing fields, expected rules, API response and persisted state for each reproduction. |
| Estimation and capacity | Shared workflow checks and evidence collection may need more explicit allowance in planning. | Actual development availability and task history; missing hours cannot be inferred from story points. |

No root cause, vote or consensus has been recorded. Keep alternative explanations open until reproduction and discussion provide evidence.

## Agreed handoff and coordination

| Action or decision | Owner | Timing and follow-up | Status |
| --- | --- | --- | --- |
| Prepare the Sprint 1 retrospective writeup | Tristan | Prepared 21 September; team review date to record | Writeup prepared; discussion and agreement of proposed improvements pending |
| Select Sprint 2 stories | Each of Ryan, Ernest, Kai Jie, Irfan, Tristan and Arvin | At Sprint 2 planning; record selections in the backlog | Owners not yet selected |
| Hold Daily Scrums three times per week | Team; facilitator to record | Saturday, Tuesday and Thursday during Sprint 2; exact times to agree | Current cadence recorded; attendance to record for each actual meeting |
| Continue the two-week review/planning cycle | Team | Saturday review at the end of the fortnight; next planning and sprint start on Sunday | Sprint 2 planned 20 September–3 October; review 3 October; Sprint 3 planning 4 October |

Sprint 1's earlier plan was two standups per week. The three-times-weekly cadence is the Sprint 2 arrangement and does not establish that those meetings occurred during Sprint 1.

Sprint 2's baseline is **43 points: nine new stories at 35 points plus 8 carryover points**. The approximate six-point target per member applies to the new work; check the additional carryover, integration and testing load when stories are selected. The venue catalogue, venue calendar and coordinator assignment form the Sprint 2 goal.

## Proposed improvements for team agreement

The following are proposals, with owners and dates to be agreed. They are not yet commitments made at a retrospective.

| Action ID | Proposed change | Proposed verification | Owner / target date | Outcome |
| --- | --- | --- | --- | --- |
| S1-RETRO-01 | Add a shared acceptance walkthrough covering an incomplete saved draft, registration changing from no to yes, save/reload, valid submission and rejection of missing required fields. Reproduce S1-DEF-01/03/04 and keep the successful DEMO-04/05 paths. | Record the build, account role, route, input fields, expected/actual result and persisted status for each case before closing KAN-6/KAN-34. | To agree; proposed before carryover acceptance | Pending agreement and execution |
| S1-RETRO-02 | Check that the responsible actor can still find a request after each relevant transition, starting with approval and the route to final confirmation. | Record the assigned coordinator's approval-to-later-access walkthrough, refresh behavior and denied-access cases before closing KAN-33. | To agree; proposed before carryover acceptance | Pending agreement and execution |

Complete this record with the discussion and any actions agreed on 19 September. If the team agrees additional improvements later, record that follow-up date, participants, owners and success measures separately. Link accepted actions from the Sprint 2 backlog and review their outcome at the next retrospective. Retain original notes and any recording link in [E14](../../evidence/README.md); do not replace missing meeting evidence with this writeup.

## 25 October 2026 — Team meeting and manual-result reconciliation

The supplied **25 October 2026** report confirms planning on **6 September 2026**, and review and retrospective on **19 September 2026**, with **Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan** attending all three. **Arvin is Scrum Master; Irfan is Product Owner.** Exact times, location, facilitator, note taker, original notes/recordings and individual estimation votes are **Not recorded**. Attendance does not establish who voted, accepted each story, or agreed a particular retrospective action.

The retrospective is now **reported as held**, with the attendance above. The supplied information does not include individual feedback, quotations, root-cause discussion or an agreed improvement action. Those fields remain **Not recorded**; earlier observations and proposals are preserved. The following recommendations are prepared on 25 October for team agreement, not attributed to the historical meeting.

| Recommended action | Status / owner | Proposed completion check |
| --- | --- | --- |
| Record the tested commit, environment and case outcomes during each acceptance walkthrough, including failures and retests. | To agree / To agree | Every new manual run has a case-level execution record and evidence reference. |
| Reserve a shared integration checkpoint for cross-role workflows, conflicting writes and recovery from uncertain responses. | To agree / To agree | Relevant integration/browser tests and a current-build walkthrough are linked before acceptance. |
| Reconcile story ownership, current Jira status and repository evidence before closing each sprint. | To agree / To agree | Scope/points reconcile; acceptance decisions and remaining work are explicit; team burndown exports are linked. |

Agreement date, owners, due dates and follow-through are **To agree**. Per-member feedback and the result of previous actions remain **Not recorded** unless already supported above. [REPORT-20261025-TEAM-S1](../../../../testing/test-evidence.md#25-october-2026--team-manual-result-reports) supplies manual-result reports; it does not establish retrospective consensus.
