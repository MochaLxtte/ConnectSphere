# Sprint 1 daily progress and burndown

The team met twice a week, on Tuesday and Saturday. Its four standup accounts track how the database, sign-in and request screens came together. The field handoff and coordinator access were raised early. When the review arrived, the saved-draft and post-decision paths still needed work. [Daily accounts 01–04](evidence/meetings/daily.docx)

<a id="team-input-needed"></a>

## Daily Scrum log

The four accounts identify the meeting day and speakers. They do not give start times. Each row summarises the named member’s own contribution. [Daily standup collection](evidence/meetings/daily.docx)

### 8 September · Database setup and coordinator access

[Standup 01 in the daily collection](evidence/meetings/daily.docx)

| Member · cue | Reported progress and next step | Blocker, dependency or response |
| --- | --- | --- |
| Arvin · 01, 07 | Reported Supabase chosen for the database. Next, check shared setup and help connect the separate parts. | Assigned the access discussion to Ryan and Irfan and the field comparison to Ernest and Kai Jie. Would help with database mapping. |
| Ryan · 02 | Compared authentication options for sign-in and roles. | Needed Irfan to clarify which requests a coordinator could see. |
| Ernest · 03 | Started the request field list. Next, assemble the form and compare it with the edit flow. | There was no complete save path to demonstrate. |
| Kai Jie · 04 | Worked through editing and submission requirements. | Needed to know what the form saved and what could remain blank in a draft. |
| Irfan · 05 | Sketched the request list and detail view, with clarification planned next. | Arranged to work through coordinator visibility with Ryan after standup. |
| Tristan · 06 | Worked through approval/rejection states. Next, build the decision panel and organiser status view. | Needed the same request details as Irfan. |

### 12 September · Resolve shared fields and access

[Standup 02 in the daily collection](evidence/meetings/daily.docx)

| Member · cue | Reported progress and next step | Blocker, dependency or response |
| --- | --- | --- |
| Arvin · 01, 08, 10 | Reported hosting decided and separate work underway. Next, check shared setup and follow one request through create, save, reopen and submit. | Offered to join the field discussion and map the shared list to the database. |
| Ryan · 02 | Worked through login and roles. Next, connect identity to protected pages and API calls. | Other members needed real signed-in users for access checks. |
| Ernest · 03, 07 | Listed the create/save fields. Next, connect the form and save path. | Suggested comparing one registration-enabled request and one incomplete draft with Kai Jie after standup. |
| Kai Jie · 04 | Worked through the edit and submission steps. | Shared fields were blocking progress. Needed registration values to reload and different required-field rules for drafts and submission. |
| Irfan · 05, 09 | Had a first list/detail view. Next, connect clarification and check access with Ryan. | Flagged the need to return to a request after a decision and share permissions with Tristan. |
| Tristan · 06 | Had a first approval/rejection panel. Next, connect it to request detail and the organiser’s status view. | The full request journey still needed a combined check. |

### 15 September · Connect identity and request data

[Standup 03 in the daily collection](evidence/meetings/daily.docx)

| Member · cue | Reported progress and next step | Blocker, dependency or response |
| --- | --- | --- |
| Arvin · 01, 07 | Worked on shared database setup. Next, connect request fields and keep the common field list in use. | A full request had yet to pass through every component. |
| Ryan · 02 | Reported Supabase sign-in and coordinator access connected. Worked with Tristan on authenticated request actions. | Other protected pages still needed checks. |
| Ernest · 03 | The field discussion helped the create/save work. Next, connect the form values to the save path. | The whole form was still in progress. |
| Kai Jie · 04 | Reported draft and submission backend progress. Planned to reopen, edit and submit the same saved request. | The browser journey was waiting on the form. |
| Irfan · 05 | Was connecting clarification to the request details. | The route back after a decision was unresolved. Planned to check it with Ryan. |
| Tristan · 06 | Reported the decision flow using the signed-in coordinator. Continued the organiser status view. | Needed to show the saved outcome after refresh. |

### 19 September · Final readiness before review

[Standup 04 in the daily collection](evidence/meetings/daily.docx)

| Member · cue | Reported progress and next step | Blocker, dependency or response |
| --- | --- | --- |
| Arvin · 01, 07 | Prepared shared setup notes and invited outstanding integration issues for the walkthrough. | Asked the group to record results and carry unfinished stories at their full estimates. |
| Ryan · 02 | Planned to use organiser and coordinator accounts to demonstrate sign-in and protected actions. | Would show which pages each account could reach. |
| Ernest · 03 | Still finishing the create/save path for the walkthrough. | Would tell members when the combined form and saved-value changes were ready to pull. |
| Kai Jie · 04 | Prepared the saved-draft example, including registration and missing information. | Reported outstanding edit and submission gaps despite working individual paths. |
| Irfan · 05 | Prepared coordinator view and clarification. | The request left the pending queue after decision. Needed to examine how a coordinator could revisit it. |
| Tristan · 06 | Prepared approval, rejection and organiser status with saved outcomes and refresh. | Kept the unfinished submission connection visible for review. |

## Development history

The retained development record separates the standups from work reported between meetings. For example, the 15–18 September entries document identity checks, decisions after refresh and organiser status work. PR #12 integrated branches after the sprint on 20 September. Those records identify their own builds and dates. [Dated development record](archive/2026-11-05/daily-progress.md) · [Technical evidence](evidence/README.md)

## Impediments and adaptations

| First raised | What the team tried | Outcome at review |
| --- | --- | --- |
| 8–12 September · draft and submission fields | Ernest, Kai Jie and Arvin agreed to compare the form, edit requirements and database mapping using one registration-enabled request and one incomplete draft. | Creation and draft persistence worked. Changing registration from No to Yes omitted fields, saved-draft submission was reported unavailable on one path, and required-field checks missed some invalid submissions. |
| 8–12 September · coordinator identity and visibility | Ryan and Irfan paired on access. By 15 September Ryan reported sign-in connected, and Tristan connected decisions to the signed-in user. | The demonstrated access and decision cases worked. The team carried coordinator follow-up navigation because the approved request could no longer be found through the pending queue. |
| 12 September · late integration | Arvin asked for the same request to travel through create, save, reopen and submit. On 19 September Ernest was still assembling the form and saved values. | Members showed working individual features, while the incomplete cross-screen cases became retrospective actions for Sprint 2. |

[Daily accounts 01–04](evidence/meetings/daily.docx) · [Review cues 03–12](evidence/meetings/review.docx)

## Scope change log

The selected scope stayed at ten items and 32 SP. At review, KAN-6 (3), KAN-33 (2) and KAN-34 (3) carried at full value. Their eight points formed part of the next sprint’s 43-point forecast. This accounted for work still outstanding without reducing the earlier commitment. [Review cues 15–17](evidence/meetings/review.docx) · [Sprint 2 planning](../sprint-02/planning.md)

## Burndown data

| Checkpoint | Forecast | Accepted SP | Remaining against forecast | Source |
| --- | ---: | ---: | ---: | --- |
| 6 September · planning | 32 | 0 at opening | 32 | [Planning cues 34–35 and 55–61](evidence/meetings/planning.docx) |
| 8, 12, 15 and 19 September · standups before the review | 32 | Intermediate values unavailable | Intermediate values unavailable | [Daily accounts 01–04](evidence/meetings/daily.docx) |
| 19 September · review | 32 | 24 | 8 | [Review cues 16–17](evidence/meetings/review.docx) and the later [collective confirmation](review.md#review-record) |

## Chart and source evidence

The [Sprint 1 chart and checkpoints](../ws4-evidence/board-history.md#sprint-1) show 103 SP remaining for the release. The accompanying table records 32 points in the sprint forecast and eight carried at close. The standups describe progress on individual features but give no intermediate accepted-point totals. [Release accounting](../release-burndown.md)

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/daily-progress.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="cadence"></a>

[Cadence](archive/2026-11-05/daily-progress.md#cadence)

<a id="daily-log"></a>

[Daily log](archive/2026-11-05/daily-progress.md#daily-log)

<a id="technical-decision--8-september"></a>

[Technical decision — 8 September](archive/2026-11-05/daily-progress.md#technical-decision--8-september)

<a id="review-and-handoff-summary--prepared-21-september"></a>

[Review and handoff summary — prepared 21 September](archive/2026-11-05/daily-progress.md#review-and-handoff-summary--prepared-21-september)

<a id="produce-and-interpret-the-chart"></a>

[Produce and interpret the chart](archive/2026-11-05/daily-progress.md#produce-and-interpret-the-chart)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/daily-progress.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

</details>
