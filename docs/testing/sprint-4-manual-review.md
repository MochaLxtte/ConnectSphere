# Sprint 4 manual review results

**31 October 2026, 14:00 SGT · 75 manual cases reported passed.** The team identified the cases as the 72 labelled manual in the Sprint 4 plan and the three separately listed manual end-to-end procedures. Tristan confirmed the story owner ran each case as written and reported a Pass. Ryan’s written review account and Ernest’s retrospective both report that every check on the review checklist passed and that the individual results still needed to be entered. The case-to-owner attribution comes from Tristan’s confirmation and the sprint assignments. [Review, cue 13](../scrum/sprint-04/evidence/meetings/current/review.docx) · [Retrospective, cue 4](../scrum/sprint-04/evidence/meetings/current/retrospective.docx) · [Story owners](../scrum/sprint-04/review.md#story-decisions)

Each entry below links to the specification and its full execution history. The run ID is `MAN-20261031-S4-REVIEW`. Its execution IDs use `EX-S4REV-20261031-` followed by the case ID. The build, environment, individual step observations and case-specific captures were not retained for this session. The source of the result is the team’s report. [Execution register](test-executions.csv) · [Review test evidence](../scrum/review-testing.md)

These 75 entries give **48 cases their first recorded outcome**. The other 27 had an earlier or later outcome under their own case ID. Runs on other dates remain separate. TC-06-32, the full release case, and its supporting venue journey TC-14-20 sit outside this roster. [Full-release case](evidence-index.md#reconciling-the-full-release-case)

## S4-T01

**KAN-18 · Ernest · 2 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-16-02](case-catalogue/cf-16.md#tc-16-02) | Unavailable units cannot be allocated | Pass |
| [TC-16-05](case-catalogue/cf-16.md#tc-16-05) | Flag reservations affected by damage | Pass |

## S4-T02

**KAN-9 · Tristan · 3 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-16-06](case-catalogue/cf-16.md#tc-16-06) | View requirements before venue confirmation | Pass |
| [TC-16-07](case-catalogue/cf-16.md#tc-16-07) | Use peak simultaneous demand | Pass |
| [TC-16-09](case-catalogue/cf-16.md#tc-16-09) | Show deficits and recheck before reservation | Pass |

## S4-T03

**KAN-63 · Ryan · 6 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-15-01](case-catalogue/cf-15.md#tc-15-01) | Create and inspect equipment request | Pass |
| [TC-15-02](case-catalogue/cf-15.md#tc-15-02) | Persist review outcomes | Pass |
| [TC-15-04](case-catalogue/cf-15.md#tc-15-04) | Deny unrelated equipment access | Pass |
| [TC-15-05](case-catalogue/cf-15.md#tc-15-05) | Explicit Not Required and unresolved needs | Pass |
| [TC-15-06](case-catalogue/cf-15.md#tc-15-06) | Actors states and whole-line outcomes | Pass |
| [TC-15-07](case-catalogue/cf-15.md#tc-15-07) | Replace reserved line with recheck | Pass |

## S4-T04

**KAN-26 · Tristan · 7 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-17-01](case-catalogue/cf-17.md#tc-17-01) | Reserve a full saved request independently of venue | Pass |
| [TC-17-03](case-catalogue/cf-17.md#tc-17-03) | Reservation notifications stay recipient-scoped | Pass |
| [TC-17-04](case-catalogue/cf-17.md#tc-17-04) | Release once on event cancellation and completion | Pass |
| [TC-17-05](case-catalogue/cf-17.md#tc-17-05) | Manual cancellation retains allocation and release history | Pass |
| [TC-17-06](case-catalogue/cf-17.md#tc-17-06) | Deny unauthorised reservation reads and mutations | Pass |
| [TC-17-07](case-catalogue/cf-17.md#tc-17-07) | Readiness requires all current full requirements | Pass |
| [TC-17-08](case-catalogue/cf-17.md#tc-17-08) | Stale source and uncertain mutation require refreshed context | Pass |

## S4-T05

**KAN-61 · Kai Jie · 7 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-06-01](case-catalogue/cf-06.md#tc-06-01) | Confirm only assigned event | Pass |
| [TC-06-02](case-catalogue/cf-06.md#tc-06-02) | Approval differs from final confirmation | Pass |
| [TC-06-03](case-catalogue/cf-06.md#tc-06-03) | Require complete current readiness | Pass |
| [TC-06-04](case-catalogue/cf-06.md#tc-06-04) | Confirmation audit and persistence | Pass |
| [TC-06-05](case-catalogue/cf-06.md#tc-06-05) | Stale competing readiness checks | Pass |
| [TC-06-06](case-catalogue/cf-06.md#tc-06-06) | No human staffing prerequisite | Pass |
| [TC-06-07](case-catalogue/cf-06.md#tc-06-07) | Preserve registration schedule | Pass |

## S4-T06

**KAN-62 · Ryan · 5 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-06-08](case-catalogue/cf-06.md#tc-06-08) | Cancellation authority state reason | Pass |
| [TC-06-09](case-catalogue/cf-06.md#tc-06-09) | Cancellation audit persists | Pass |
| [TC-06-11](case-catalogue/cf-06.md#tc-06-11) | Cancellation recipient privacy | Pass |
| [TC-06-12](case-catalogue/cf-06.md#tc-06-12) | Repeated cancellation release safe | Pass |
| [TC-06-13](case-catalogue/cf-06.md#tc-06-13) | Major confirmed change needs new request | Pass |

## S4-T07

**KAN-10 · Ernest · 3 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-06-14](case-catalogue/cf-06.md#tc-06-14) | Completion permissions and state | Pass |
| [TC-06-16](case-catalogue/cf-06.md#tc-06-16) | Completed outcome persists | Pass |
| [TC-06-17](case-catalogue/cf-06.md#tc-06-17) | Completion releases but retains history | Pass |

## S4-T08

**KAN-14 · Ernest · 4 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-18-01](case-catalogue/cf-18.md#tc-18-01) | Attendee inspects details before registering | Pass |
| [TC-18-02](case-catalogue/cf-18.md#tc-18-02) | Registration state window and capacity matrix | Pass |
| [TC-18-03](case-catalogue/cf-18.md#tc-18-03) | Registration success and own status persist | Pass |
| [TC-18-06](case-catalogue/cf-18.md#tc-18-06) | Cross-attendee impersonation refused | Pass |

## S4-T09

**KAN-17 · Arvin · 5 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-18-07](case-catalogue/cf-18.md#tc-18-07) | Withdrawal allowed until event starts | Pass |
| [TC-18-08](case-catalogue/cf-18.md#tc-18-08) | Confirm withdrawal with accurate warning | Pass |
| [TC-18-09](case-catalogue/cf-18.md#tc-18-09) | Withdrawn status persists | Pass |
| [TC-18-10](case-catalogue/cf-18.md#tc-18-10) | Withdrawal capacity and notice exactly once | Pass |
| [TC-18-11](case-catalogue/cf-18.md#tc-18-11) | Failed unauthorised and ineligible withdrawal | Pass |

## S4-T10

**KAN-67 · Arvin · 6 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-18-12](case-catalogue/cf-18.md#tc-18-12) | Roster access requires event relationship | Pass |
| [TC-18-13](case-catalogue/cf-18.md#tc-18-13) | Event-specific status counts | Pass |
| [TC-18-14](case-catalogue/cf-18.md#tc-18-14) | Refresh reflects saved registration changes | Pass |
| [TC-18-15](case-catalogue/cf-18.md#tc-18-15) | Empty roster cannot retain previous event data | Pass |
| [TC-18-16](case-catalogue/cf-18.md#tc-18-16) | Manager data disclosure is limited | Pass |
| [TC-18-17](case-catalogue/cf-18.md#tc-18-17) | Handover and session change revoke roster access | Pass |

## S4-T11

**KAN-66 · Irfan · 4 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-07-01](case-catalogue/cf-07.md#tc-07-01) | Owner edits before approval | Pass |
| [TC-07-02](case-catalogue/cf-07.md#tc-07-02) | Ordinary edit preserves arrangements | Pass |
| [TC-07-03](case-catalogue/cf-07.md#tc-07-03) | Server enforces actor and field matrix | Pass |
| [TC-07-04](case-catalogue/cf-07.md#tc-07-04) | Significant fields use reviewed changes | Pass |

## S4-T12

**KAN-15 · Irfan · 7 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-19-01](case-catalogue/cf-19.md#tc-19-01) | One owner change stays unapplied pending review | Pass |
| [TC-19-02](case-catalogue/cf-19.md#tc-19-02) | Compare change and arrangement effects | Pass |
| [TC-19-03](case-catalogue/cf-19.md#tc-19-03) | Save eligible approval or rejection | Pass |
| [TC-19-04](case-catalogue/cf-19.md#tc-19-04) | Major confirmed impacts cannot apply silently | Pass |
| [TC-19-05](case-catalogue/cf-19.md#tc-19-05) | Owner/current-reviewer access enforced | Pass |
| [TC-19-06](case-catalogue/cf-19.md#tc-19-06) | Change acknowledgements and outcomes | Pass |
| [TC-19-07](case-catalogue/cf-19.md#tc-19-07) | Significant field matrix vs ordinary edits | Pass |

## S4-T13

**KAN-80 · Arvin · 4 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-20-22](case-catalogue/cf-20.md#tc-20-22) | Significant-change notification matrix | Pass |
| [TC-20-25](case-catalogue/cf-20.md#tc-20-25) | Correct later-workflow entity links | Pass |
| [TC-20-28](case-catalogue/cf-20.md#tc-20-28) | Reuse inbox and preserve actor acknowledgements | Pass |
| [TC-20-431](case-catalogue/cf-20.md#tc-20-431) | KAN-80 connected significant-change submission and review-prompt link (manual end-to-end) | Pass |

## S4-T14

**KAN-82 · Irfan · 6 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-12-01](case-catalogue/cf-12.md#tc-12-01) | Multiple arrangement identity | Pass |
| [TC-12-04](case-catalogue/cf-12.md#tc-12-04) | Cancel only the selected arrangement | Pass |
| [TC-12-05](case-catalogue/cf-12.md#tc-12-05) | Explicit cancel and resubmit | Pass |
| [TC-12-08](case-catalogue/cf-12.md#tc-12-08) | Per-arrangement aggregate display | Pass |
| [TC-12-12](case-catalogue/cf-12.md#tc-12-12) | Selected-venue UI and recovery | Pass |
| [TC-12-20](case-catalogue/cf-11.md#tc-12-20) | KAN-82 connected arrangement suitability acceptance journey (manual end-to-end) | Pass |

## S4-T15

**KAN-84 · Kai Jie · 6 cases.**

| Case | Manual scenario | Reported result |
| --- | --- | --- |
| [TC-06-22](case-catalogue/cf-06.md#tc-06-22) | Reviewable safety context and missing information | Pass |
| [TC-06-24](case-catalogue/cf-06.md#tc-06-24) | Approval and rejection semantics | Pass |
| [TC-06-25](case-catalogue/cf-06.md#tc-06-25) | Targeted change-request routing | Pass |
| [TC-06-30](case-catalogue/cf-06.md#tc-06-30) | Safety recipients and organiser outcome | Pass |
| [TC-06-31](case-catalogue/cf-06.md#tc-06-31) | Safety UI uncertainty and no automatic deadline | Pass |
| [TC-06-445](case-catalogue/cf-06.md#tc-06-445) | KAN-84 connected current-review decision and navigation acceptance journey (manual end-to-end) | Pass |

## How this relates to other evidence

The Sprint 4 selection uses the plan and case register as they stood on 30 October (`5491021`). That commit identifies the roster source; the build demonstrated at the review is unknown. The two UI suites recorded on 31 October ran in the evening. The 1 November connected walkthrough and targeted repair checks record their own results. For example, the October safety review result does not replace the later failure for restored buffers under TC-06-446, or its repaired-candidate retest. [31 October UI run](test-evidence.md#auto-20261031-minor-ui--date-entry-consistency-and-review-links) · [Restoration failure and retest](case-catalogue/results/cf-06.md#tc-06-446) · [November connected checks](evidence-index.md)
