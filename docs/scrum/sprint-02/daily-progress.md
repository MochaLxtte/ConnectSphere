# Sprint 2 daily progress and burndown

Six Daily Scrums traced the handoffs from booking requests and conflict checks to the venue calendar. The team aligned the input fields after 24 September, but catalogue, search, suitability, submission and draft editing still needed work at the 3 October review. [Standup account](evidence/meetings/daily.docx) · [Review](review.md)

<a id="team-input-needed"></a>

## Daily Scrum log

Every member contributed on each of the six dates below. Cue numbers identify each person’s entry in that date’s section of the [daily standup collection](evidence/meetings/daily.docx), supplied 6 November. Exact times and locations were unrecorded. The 3 October standup preceded the separate review and retrospective.

### 22 September

| Member | Progress reported | Next step or impediment | Cue |
| --- | --- | --- | ---: |
| Arvin | Mapped calendar users and what they needed to see. | Map approved bookings and unavailable periods. Track booking dependencies. | 1, 7 |
| Tristan | Started automatic assignment using availability, lowest workload and a stable tie-break. | Handle the no-eligible case. Decisions and suitability had barely started. | 2 |
| Irfan | Split time between the coordinator-view repair and catalogue fields. | Restore access to decided requests and send field names to Ryan. | 3 |
| Ryan | Outlined search filters. | Map basic filters while waiting for catalogue and availability inputs. | 4 |
| Kai Jie | Reviewed carried draft and submission issues. | List booking fields alongside ongoing repairs and operational-block work. | 5 |
| Ernest | Started conflict examples. | Needs matching venue and time inputs at request and approval. | 6 |

### 24 September

| Member | Progress reported | Next step or impediment | Cue |
| --- | --- | --- | ---: |
| Arvin | Worked through calendar views and role access. | Connect booking and blocked periods before the combined walkthrough. | 1, 9 |
| Tristan | Worked through coordinator selection. | Prioritise decisions and suitability. Join the field discussion for approval and concurrent actions. | 2, 8 |
| Irfan | Reviewed catalogue fields and the route to decided requests. | Check saving/propagating catalogue edits and access to earlier requests. | 3 |
| Ryan | Mapped filters to venue information. | Connect results and compare availability against the booking flow. | 4 |
| Kai Jie | Reviewed carried issues. Request validation remained open. | Bring the request structure and conflict response to a discussion after standup. | 5, 7 |
| Ernest | Outlined overlap cases. | Blocked on inconsistent booking inputs. Needed venue/start/end format shared by submission and approval. | 6 |

### 26 September

| Member | Progress reported | Next step or impediment | Cue |
| --- | --- | --- | ---: |
| Arvin | Calendar progress was limited while waiting for booking and block inputs. | Get one connected booking example working. | 1, 7 |
| Kai Jie | The post-standup discussion aligned booking fields. | Develop the request form. Submission validation still needed work. | 2 |
| Ernest | Had a clearer conflict-input format. | Compare submission and approval calls, including an intervening booking. | 3 |
| Tristan | Spent most effort on automatic assignment. | Move to booking decisions. Suitability had barely started. | 4 |
| Irfan | Coordinator-view repair had taken priority over catalogue work. | Finish saving catalogue changes and keep Ryan informed. | 5 |
| Ryan | Progressed filter mapping. | Use the shared venue/date inputs. Connected comparison with the calendar was pending. | 6 |

### 29 September

| Member | Progress reported | Next step or impediment | Cue |
| --- | --- | --- | ---: |
| Arvin | Kept calendar focused on bookings and unavailable periods. | Work through expected inputs with owners. Separate venue pieces still needed connecting. | 1, 7 |
| Tristan | Implemented automatic assignment on his branch. | Check shared setup and no-eligible case. Booking decisions and suitability still needed work. | 2 |
| Irfan | Developing a separate route back to decided requests. | Connect the history view and check access. Catalogue had progressed less. | 3 |
| Kai Jie | Switching between carried issues and venue requests. | Required-field validation remained open. Asked Ernest to focus on booking inputs after the standup. | 4 |
| Ryan | Progressed search. | Compare results with Arvin using the same venue and dates. | 5 |
| Ernest | Worked through overlaps, separate venues and adjacent bookings. | Connect cases to both submission and approval. Both handoffs still needed attention. | 6 |

### 1 October

| Member | Progress reported | Next step or impediment | Cue |
| --- | --- | --- | ---: |
| Arvin | Prepared calendar checks for correct venue, bookings, blocks and authorised users. | Still needed connected booking data. Asked everyone to bring evidence and gaps to review. | 1, 7 |
| Kai Jie | Rechecked registration fields and saved-draft submission fixes. | Required-field validation was still open. Bookings and blocks also needed attention. | 2 |
| Irfan | Decided-request route ready for examination. | Asked Ryan to check account restrictions. Catalogue saves and propagation remained unfinished. | 3 |
| Ryan | Search had moved little since Tuesday. | Finish the filters and compare results with venue rules. | 4 |
| Tristan | Preparing assignment and working through booking decisions. | Keep the unfinished suitability checks visible separately. | 5 |
| Ernest | Prepared conflict cases for review. | Recheck current bookings at approval. Record actual inputs and outcomes when run. | 6 |

### 3 October

| Member | Progress reported | Next step or impediment | Cue |
| --- | --- | --- | ---: |
| Arvin | Prepared calendar criteria for review. | Use the same booking example with Ernest and Kai Jie across their parts. | 1, 7 |
| Tristan | Prepared assignment and booking decisions for review. | Explain remaining suitability checks and plan continuation. | 2 |
| Irfan | Prepared coordinator access to decided requests. | Carry unfinished catalogue work with its outstanding items recorded. | 3 |
| Ryan | Prepared search’s main path and remaining checks. | Keep catalogue and search gaps together at the next planning discussion. | 4 |
| Kai Jie | Prepared booking requests and operational blocks. | Keep submission and draft editing open. Their remaining checks were separate. | 5 |
| Ernest | Prepared conflict checks across submission and approval. | Bring the venue and time examples and the available evidence to review. | 6 |

## Development history

The dated engineering history records the KAN-29 branch tests on 28 September, the coordinator-view repair, scope corrections and later venue work. Post-3 October development and retests belong to their actual dates. The daily accounts above describe what each person reported at the time. [Development history](archive/2026-11-05/daily-progress.md) · [Review decisions](review.md#story-decisions)

## Impediments and adaptations

| Issue | Team response | Outcome and evidence |
| --- | --- | --- |
| Ernest lacked one venue/start/end format for conflict checks at submission and approval. | On 24 September Kai Jie offered the request structure and Tristan the approval side. The three discussed the interface after standup. | On 26 September Kai Jie and Ernest reported clearer inputs. They still needed a connected example and protection against a booking appearing before approval. [24 Sep cues 6–9 and 26 Sep cues 2–3, 7](evidence/meetings/daily.docx) |
| Calendar, catalogue and search needed to agree with booking availability. | Ryan and Arvin planned to compare the same dates and venue data. Irfan kept Ryan updated on catalogue fields. | Calendar was accepted. Search and catalogue carried because filters, consistent results, catalogue saving and propagation still needed checks. [29 Sep cues 1, 3 and 5](evidence/meetings/daily.docx) · [Review cues 4, 7–8](evidence/meetings/review.docx) |
| Kai Jie’s 12-SP bundle covered two venue stories and two prior repairs. | He flagged load at planning and reported switching between the work on 29 September. | Both venue stories were accepted. Draft editing and submission carried at 3 SP each. The retrospective called for earlier help or reallocation. [Planning cues 41–42](evidence/meetings/planning.docx) · [Retrospective cue 3](evidence/meetings/retrospective.docx) |

## Scope change log

On 20 September the team selected nine new parents / 35 SP plus KAN-6, KAN-33 and KAN-34 / 8 SP carried from Sprint 1. The six standups and review identify no in-sprint parent additions, removals or point changes. The customer changes received on 2 October went forward to Sprint 3 planning. At review the team reconciled the original 43 SP. [Planning cues 8–15, 29–35](evidence/meetings/planning.docx) · [Review cue 13](evidence/meetings/review.docx) · [Change history](../../requirements/change-requests.md)

## Burndown data

| Date | Selected scope | Accepted in sprint | Remaining against forecast | Source |
| --- | ---: | ---: | ---: | --- |
| 20 September planning | 43 SP | 0 at opening | 43 SP | Twelve parents including eight carried SP. [Planning cues 8–15 and 56–62](evidence/meetings/planning.docx) |
| 3 October review | 43 SP | 24 SP | 19 SP | Five parents carried at full estimates. [Review cue 13](evidence/meetings/review.docx) |

Two dated administrative observations survive separately. On **21 September**, the post-refinement snapshot recorded 35 SP To Do, 8 SP In Review and 0 Done, leaving 43 SP on the board. On **29 September** around **18:40 SGT**, Irfan recorded 0 Done and 43 remaining on the board. KAN-6 and KAN-34 were In Review, KAN-33 In Progress. Both observations describe internal board state. No original board image was retained. The standups provide no cumulative accepted-point observation between the two meetings. [Archived observations](archive/2026-11-05/daily-progress.md#burndown-data)

## Chart and source evidence

The [Sprint 2 chart and checkpoints](../ws4-evidence/board-history.md#sprint-2) show 79 SP remaining for the original release after 48 SP of cumulative acceptance. The accompanying table retains the 21 and 29 September board observations at 43 SP. The review establishes 19 SP carried. Intermediate meeting balances remain unrecorded. [Release accounting](../release-burndown.md)

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/daily-progress.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="cadence"></a>

[Cadence](archive/2026-11-05/daily-progress.md#cadence)

<a id="daily-log"></a>

[Daily log](archive/2026-11-05/daily-progress.md#daily-log)

<a id="21-september-backlog-refinement"></a>

[21 September backlog refinement](archive/2026-11-05/daily-progress.md#21-september-backlog-refinement)

<a id="28-september-kan-29-implementation"></a>

[28 September KAN-29 implementation](archive/2026-11-05/daily-progress.md#28-september-kan-29-implementation)

<a id="30-september-repository-scope-correction"></a>

[30 September repository scope correction](archive/2026-11-05/daily-progress.md#30-september-repository-scope-correction)

<a id="30-september-firebase-migration-retirement"></a>

[30 September Firebase migration retirement](archive/2026-11-05/daily-progress.md#30-september-firebase-migration-retirement)

<a id="30-september-migration-and-hosted-schema-consistency"></a>

[30 September migration and hosted schema consistency](archive/2026-11-05/daily-progress.md#30-september-migration-and-hosted-schema-consistency)

<a id="29-september-development-update--irfan-kan-33--kan-56"></a>

[29 September development update — Irfan (KAN-33 / KAN-56)](archive/2026-11-05/daily-progress.md#29-september-development-update--irfan-kan-33--kan-56)

<a id="1-october-re-verification-s1-def-01-and-s1-def-03-fixed"></a>

[1 October re-verification: S1-DEF-01 and S1-DEF-03 fixed](archive/2026-11-05/daily-progress.md#1-october-re-verification-s1-def-01-and-s1-def-03-fixed)

<a id="3-october-development-update--ernest-kan-51"></a>

[3 October development update — Ernest (KAN-51)](archive/2026-11-05/daily-progress.md#3-october-development-update--ernest-kan-51)

<a id="4-october-integration-and-kan-8--tristan"></a>

[4 October integration and KAN-8 — Tristan](archive/2026-11-05/daily-progress.md#4-october-integration-and-kan-8--tristan)

<a id="4-october-development-update--kai-jie-kan-55"></a>

[4 October development update — Kai Jie (KAN-55)](archive/2026-11-05/daily-progress.md#4-october-development-update--kai-jie-kan-55)

<a id="4-october-kan-52--tristan"></a>

[4 October KAN-52 — Tristan](archive/2026-11-05/daily-progress.md#4-october-kan-52--tristan)

<a id="4-october-development-update--kai-jie-kan-53"></a>

[4 October development update — Kai Jie (KAN-53)](archive/2026-11-05/daily-progress.md#4-october-development-update--kai-jie-kan-53)

<a id="produce-and-interpret-the-chart"></a>

[Produce and interpret the chart](archive/2026-11-05/daily-progress.md#produce-and-interpret-the-chart)

<a id="5-october-development-update--published-venue-branch-integration"></a>

[5 October development update — published venue-branch integration](archive/2026-11-05/daily-progress.md#5-october-development-update--published-venue-branch-integration)

<a id="9-october-development-update--irfan-kan-59--s1-def-04"></a>

[9 October development update — Irfan (KAN-59 / S1-DEF-04)](archive/2026-11-05/daily-progress.md#9-october-development-update--irfan-kan-59--s1-def-04)

<a id="9-october-development-update--irfan-kan-54-verification"></a>

[9 October development update — Irfan (KAN-54 verification)](archive/2026-11-05/daily-progress.md#9-october-development-update--irfan-kan-54-verification)

<a id="9-october-development-update--irfan-kan-12-page-tests"></a>

[9 October development update — Irfan (KAN-12 page tests)](archive/2026-11-05/daily-progress.md#9-october-development-update--irfan-kan-12-page-tests)

<a id="9-october-development-update--irfan-s2-t23-connected-workflow-test"></a>

[9 October development update — Irfan (S2-T23 connected workflow test)](archive/2026-11-05/daily-progress.md#9-october-development-update--irfan-s2-t23-connected-workflow-test)

<a id="9-october-development-update--irfan-kan-50"></a>

[9 October development update — Irfan (KAN-50)](archive/2026-11-05/daily-progress.md#9-october-development-update--irfan-kan-50)

<a id="15-october-documentation-reconciliation-and-later-audit"></a>

[15 October documentation reconciliation and later audit](archive/2026-11-05/daily-progress.md#15-october-documentation-reconciliation-and-later-audit)

<a id="16-october-current-evidence-assessment-and-administrative-close"></a>

[16 October current evidence assessment and administrative close](archive/2026-11-05/daily-progress.md#16-october-current-evidence-assessment-and-administrative-close)

<a id="16-october-clarification--customer-changes-received-during-sprint-2"></a>

[16 October clarification — customer changes received during Sprint 2](archive/2026-11-05/daily-progress.md#16-october-clarification--customer-changes-received-during-sprint-2)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/daily-progress.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

</details>
