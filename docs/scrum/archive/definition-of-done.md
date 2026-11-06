# Definition of Done

**Current acceptance environment — 25 October 2026:** application deployment is not required. A complete local frontend/API connected to the agreed Supabase development project is the acceptance environment. The [policy amendment](#local-acceptance-policy--25-october-2026) supersedes earlier hosted-only guidance for current and subsequent work.

**25 October 2026 reconciliation:** The [new supplied report](#team-confirmation--25-october-2026) records meeting attendance and/or manual results separately from earlier dated evidence. It does not backdate new fixes or infer acceptance.

**Agreement reported; supporting details not recorded.** On 11 October 2026, Tristan confirmed that the team had already agreed to the checklist below and would provide the details. The actual agreement date, participants and method of agreement are **Not recorded**. The checklist is unchanged in this update; 11 October is the date this report was recorded, not an invented adoption date.

A story is done when:

- Its acceptance criteria and relevant customer clarifications are clear and satisfied, including access restrictions and important failure cases.
- The implementation is reviewed, integrated, and understandable to its owner; any AI-assisted code is checked and explainable.
- Appropriate tests pass, CI is green, and the story or acceptance criteria link to implementation and test evidence.
- Database changes use reviewed, ordered migrations, and relevant setup, API and architecture documentation is current. Changes to the shared Supabase development project are coordinated; shared development database configuration evidence is distinct from isolated PostgreSQL test results.
- The integrated behavior passes relevant acceptance scenarios on localhost using the running frontend, API, real authentication and agreed development database, with reproducible test data and no secrets or real personal data committed. Public application hosting or a deployed app/API URL is not required. Relevant background jobs and shared database configuration still work and have evidence.
- The board, review notes and remaining limitations reflect the actual outcome. Unfinished criteria return to the backlog.

A scaffold stub, UI placeholder, unexecuted test outline, or disabled test does not satisfy a business acceptance criterion.

## Version history

Record every change to this definition, including confirming it unchanged at a sprint boundary, so reviewers can see how it evolved between sprints.

| Version | Date | Sprint | Change | Who agreed / recorded by |
| --- | --- | --- | --- | --- |
| 0 (proposed) | To record | 1 | Initial proposal above | To record |
| Agreement reported; checklist unchanged | Recorded 11 October 2026; actual agreement date **Not recorded** | Applicability to confirm with agreement details | Tristan reports prior team agreement to the existing checklist. Record the actual date, participants and decision source when supplied. | Agreement reported in chat |

## Sprint 3 planning follow-up

Add the agreement date, who agreed and the meeting/chat reference when Tristan supplies them, and confirm this remains the checklist for Sprint 3. This documentation update does not itself accept a story, establish a missing review, or change historical sprint velocity. Evaluate outstanding criteria using their linked evidence in the [test register](../../testing/test-evidence.md) and [sprint reviews](../README.md).

**15 October preparation:** agreement details remain **Not recorded**. Keep the checklist unchanged. Assess historical acceptance against the criteria and DoD version actually applicable then; a later process update must not silently re-judge previously accepted stories. A newly discovered original defect is recorded and handled separately in [Sprint 3 triage](../sprint-03/planning.md#pre-planning-baseline-and-defect-triage).

## Team confirmation — 25 October 2026

The supplied team confirmation states that the **existing checklist is agreed and unchanged**. Participants: **Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan**, reported through the current project discussion on 25 October. The original adoption date and original agreement method remain **Not recorded**. This confirms continued use of the checklist; it does not introduce a new criterion or assign a historical acceptance date to any story.

| Version / confirmation | Record date | Applicability | Outcome | Participants / source |
| --- | --- | --- | --- | --- |
| Existing checklist reconfirmed unchanged | 25 October 2026; original adoption date Not recorded | Current closeout and subsequent story work | Team agreement confirmed; no checklist amendment | All six team members, confirmation supplied in the project discussion |

The earlier missing-agreement notes remain dated source records. Story acceptance still requires its own criteria, review and test evidence; a blanket manual-result report does not establish the tested build or deployed configuration. No retrospective velocity is recalculated from this confirmation.

## Local acceptance policy — 25 October 2026

| Version | Effective date | Change | Decision source |
| --- | --- | --- | --- |
| 1 — Local integrated acceptance | 25 October 2026 | Remove the application-hosting prerequisite from current and subsequent acceptance. Verify the complete local frontend/API with actual authentication, shared development persistence, permissions and applicable scheduled jobs. Keep code review, integration, CI, criteria and documentation requirements. | Project decision communicated and authorised by Tristan in chat: the team will not deploy the application. No additional meeting or individual votes are asserted. |

The earlier checklist's reproducible integrated demonstration remains required. This amendment aligns AGENTS.md and the testing/checklist language, which had imposed a hosted check. It does not remove KAN-79's requirement to make submission, trusted Lead access, queue and allocation usable together, or KAN-83's automatic expiry requirement. Existing shared Supabase configuration is retained. Apply the change from this confirmation onward; preserve earlier DoD versions and historical acceptance/velocity records.
