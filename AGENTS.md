# ConnectSphere: the single guide for people and AI assistants

**This is the only master instruction file for the project.** Every AI assistant (Claude, Codex,
Cursor, Copilot, ...) must read it before doing any work here and must follow it. It loads
automatically: Codex reads `AGENTS.md` directly, and Claude Code loads it through the committed
`.claude/CLAUDE.md`. If you still have an old root `CLAUDE.md` with team rules, delete it or reduce
it to the single line `@AGENTS.md` (personal notes only otherwise). Any older guidance
(`CONTRIBUTING.md`, old `CLAUDE.md` rules, `SPM_MASTER.md`) is replaced by this file. If another
document disagrees with this one, this one wins; tell the team so the other document gets fixed.

IS212 grades the **Scrum process and its evidence** as heavily as the code. Instructors do not inspect
Jira directly: **the submitted documents must contain the evidence**, alongside the required repository access. Every piece of work
must leave the trail Jira → branch → code → tests → docs → PR → merged → Jira Done, and every
Scrum activity (planning, estimation, backlog work, reviews, retrospectives) must leave a record.

Use the project instructions, assessment rubric and customer changes to determine required scope
and deliverables; use the IS212 teaching materials for story, testing and Scrum conventions.
Course sources are indexed in `docs/requirements/README.md`. Jira cards contain concise user
stories and acceptance criteria, with estimates, priority, assignment and sprint in their native
fields. Keep planning history, evidence and submission commentary in the repository.

---

## 1. Start of every session

1. Read this file.
2. `git status`. If there is a merge in progress or conflict markers, stop and ask.
3. `git checkout main && git pull --ff-only origin main`. Create a branch before changing files
   (§7.1).
4. Find the **active sprint** by status in `docs/scrum/README.md`, not simply the latest row.
   Use a future sprint folder only for its planning. Below, `sprint-0N` means the relevant folder;
   earlier sprint folders are closed history (correct factual errors only).
5. Work out which activity the person is asking for using the **activity index (§3)** and follow
   that procedure. If nothing matches, ask which documents they expect to change before starting.

## 2. How work is shared (role-agnostic)

The team works role-agnostically: **any member may do any activity and fill any document.**
Formal Scrum titles exist only for the record (Product Owner: Irfan; Scrum Master: Arvin) and do
not limit who does what. Every activity is one of three kinds:

| Kind | Who | Rule |
| --- | --- | --- |
| **Story work** | Whoever is assigned the story in Jira | Does all of §4 for that story, including its documents |
| **Everyone** | Each member, for themselves | Own row at each Daily Scrum; own retrospective feedback; own estimation vote |
| **Any one member** | Whoever picks it up first | Coordinates ownership, completes the record and retains its date and source |

Shared decisions (sprint goal, commitment, estimates, priorities, story acceptance, Definition of
Done, change classification) may be prepared and recorded by one member, but the record must say
**who took part and how** (meeting, chat poll, async review). If only one person decided, write
that honestly; never list people who did not take part.

Use neutral, factual prose. Do not repeat recorder labels or conversational phrases such as
"at someone's request" throughout the documents or Jira cards. Names belong where they identify
an actual assignee, participant, decision-maker or test executor. Record preparation method once;
retain the required AI-assistance disclosure in pull requests.

## 3. Activity index

Match the request to a row and follow that procedure in order.

| Activity (the person says something like) | Kind | Procedure |
| --- | --- | --- |
| **Development** | | |
| "Let's work on KAN-xx", "build / fix KAN-xx" | Story work | §4 |
| "Write test cases for CF-xx / KAN-xx" (no code) | Any one member | §4 steps 9–12 |
| "Run the manual / hosted test for KAN-xx", "accept KAN-xx on the hosted app" | Any one member | §5.12 |
| "Review PR #n" | Any one member (not the author) | §5.11 |
| "Merge main into my branch", "fix conflicts" | Story work | §7.1 |
| "Add a migration", "change the schema" | Story work | §7.3 |
| "Clean up test data" | Any one member | §7.3 |
| **Product backlog** | | |
| "Add / split / reorder stories", "update the backlog" | Any one member | §5.1 |
| "Refine the backlog" (session) | Any one member records | §5.2 |
| "Estimate the stories", "do story points" | Team decides | §5.3 |
| "Handle CR-n", "work on the customer changes" | Team decides | §5.9 |
| "KAN-xx was Done but is broken" | Story work | §5.10 |
| "Log a customer question / decision / assumption" | Any one member | §5.13 |
| **Sprint events** | | |
| "Plan the sprint", "set up Sprint N" | Team decides | §5.4 |
| "Add my standup", "daily scrum" | Everyone | §5.5 |
| "Write up the review", "accept the sprint's stories" | Team decides | §5.6 |
| "Write up the retro" | Everyone + any one member | §5.7 |
| "Close the sprint", "update the burndown / release burndown" | Any one member | §5.8 |
| "Turn this transcript / these notes into the minutes" | Any one member | §5.14 |
| **Process and records** | | |
| "Sync Jira with the repo", "update Jira statuses / points" | Any one member | §5.15 |
| "Change the Definition of Done" | Team decides | §5.16 |
| "Update the C4 / class / sequence diagrams", "export diagrams" | Any one member | §5.17 |
| "Prepare the submission", "slide deck", "instructor access" | Any one member | §5.18 |
| "Prepare for the Week 13 Q&A" | Everyone | §5.19 |
| "Add a new document" | Any one member | §8 (add it to the map in the same PR) |

### 3.1 Mandatory stops (AI assistants, every activity)

Do not skip these, even if the person asks you to go faster.

1. **Before changing anything:** state the activity (§3 row), the documents you will change in
   order and what goes in each. For story work also give: the ACs as you understand them,
   uncovered edge cases (normal / boundary / conflict / failure), files to change, whether a
   migration is needed and whether the estimate still fits. If you cannot read the Jira card, ask
   the person to paste it; never infer ACs from memory or the repo copy alone. **Wait for approval.**
2. **Shared decisions:** you may *propose* values with reasons, but record them as decided only
   after the person confirms the outcome and who took part (§2). Until then write **To agree**.
3. **Meeting records:** write only from notes, a transcript or what the person tells you (§5.14).
4. **Story work, after tests pass:** show test and coverage results before writing the documents.
5. **Before committing or pushing:** show the changed files (and for story work the commit list,
   the filled PR template and a short paragraph the person can use at the Week 13 Q&A). Commit,
   push or open a PR only when told.

## 4. Story workflow and document order (development)

For every story, defect or reopened story, **in this order**. Documents are updated in the same
branch as the code, before the PR is opened. *(if)* steps apply only when the situation arises.

| # | Step | Document / tool |
| --- | --- | --- |
| 1 | Tell the group chat; assign the card to yourself, move it to In Progress, create subtasks | Jira |
| 2 | Read the card's ACs; make sure the repo card matches Jira wording (add the card if the story is in the sprint but missing) | `docs/scrum/sprint-0N/sprint-backlog.md` |
| 3 | Read earlier decisions, contracts and the module's README | `docs/requirements/assumptions-and-questions.md`, `docs/architecture/api-contract.md`, `backend/src/modules/<module>/README.md` |
| 4 | *(if)* The estimate no longer fits: log old → new, reason, date | `sprint-0N/estimation-and-capacity.md` + "Scope change log" in `sprint-0N/daily-progress.md` |
| 5 | Create a fresh branch off the latest `main` (§7.1) | git |
| 6 | Write code and tests: normal, boundary, conflict and failure cases; suite names include `KAN-xx`; aim for 100% coverage of the code you add | code (§7) |
| 7 | *(if)* An edge case or decision the card did not cover: add it as a new AC on the Jira card **and** the repo card; log the decision | Jira, `sprint-backlog.md`, `assumptions-and-questions.md` |
| 8 | Run `npm run check` and `npm run test:coverage` (integration/E2E when API, database or user flows changed) | — |
| 9 | Write or update reusable test specifications for each AC: scenario, preconditions, steps, data and expected result; keep execution outcomes separate | `docs/testing/test-cases.csv` (§6.1) |
| 10 | Link feature → story → AC → test case → real test file paths | `docs/requirements/traceability.csv` |
| 11 | Append supported case-level execution results; record run ID, date, commit SHA, environment, command or manual steps, result and coverage gaps. Leave unperformed cases Not executed | `docs/testing/test-executions.csv` (case results), `docs/testing/test-evidence.md` (run narratives and suite results) |
| 12 | Update the acceptance test status (`S#-Txx`) using the relevant execution evidence; an automated suite pass alone does not establish hosted acceptance | `sprint-0N/sprint-backlog.md` |
| 13 | *(if)* Captured screenshots, CI runs or exports: register them | `sprint-0N/evidence/README.md` |
| 14 | *(if)* Endpoints, schema, modules or setup changed: update contracts, diagrams, module/setup READMEs; re-export diagram images | `docs/architecture/*`, `docs/database-diagram.md`, `database/README.md`, `backend/`/`frontend/` READMEs, module READMEs |
| 15 | Add a dated development note (what finished, evidence IDs, what remains) | `sprint-0N/daily-progress.md` § Development updates |
| 16 | Commit in small steps naming the story: `feat(KAN-xx): ...`, `test(KAN-xx): ...`, `docs(KAN-xx): ...` | git |
| 17 | Open the PR with the template fully ticked; request a reviewer who is not the author | GitHub (`.github/pull_request_template.md`) |
| 18 | Move the card to In Review | Jira |
| 19 | After review and merge: subtasks Done; story Done **only** when the Definition of Done is met (hosted check included) | Jira |
| 20 | Update the story's status, sprint and Done date | `docs/requirements/product-backlog.md` § Master backlog register |

## 5. Non-development activities

### 5.1 Backlog management (any one member)
Use the course card format: a short title, **User Story** (As a role, I want a goal, so that a
benefit), and **Acceptance Criteria**. Checklist criteria, Given/When/Then, or a mixture are valid.
Keep existing criterion IDs stable for traceability. Technical tasks may use an objective rather
than an invented end-user story. Store estimates and priority in Jira's native fields; use links
for dependencies and change relationships. Do not append sprint histories or personal attribution
to descriptions. Preserve the corresponding history and evidence in repository records.

1. New story: create it in Jira first (user story, ACs, core feature `CF-xx`, priority, link to the
   original story or `CR-n` if it comes from a change). Leave points **To agree** (§5.3).
2. Split a story: create the new cards, link them to the original, move ACs, and log the split in
   the decision log. If the original was in a sprint, also log it in that sprint's scope change log.
3. Reorder: change priority in Jira, then the `Priority` column of the master register.
4. Always finish by updating `docs/requirements/product-backlog.md` § Master backlog register, and
   `docs/requirements/README.md` if a core feature's story mapping changed.

### 5.2 Backlog refinement session (any one member records)
1. Record date, who took part and stories discussed in `sprint-0N/planning.md` § Backlog refinement
   (use the upcoming sprint's folder).
2. Apply the agreed changes through §5.1; estimates through §5.3; decisions in the decision log.

### 5.3 Story estimation (any one member runs it; the team decides)
1. List the stories to estimate: unestimated stories in Jira and the master register, new stories
   from change requests, and any reopened story (remaining work only, §5.10).
2. The AI proposes points for each against the anchors (KAN-33 and KAN-16 = 2 SP) and the nearest
   comparable Done stories, with a one-line reason. Scale 1, 2, 3, 5, 8, 13; split anything above 8.
3. The team votes (planning poker in a meeting, or a chat poll per story). Record each member's
   vote, the final value and how disagreement was resolved. An AI proposal is never the final
   estimate by itself.
4. Record in this order: `sprint-0N/estimation-and-capacity.md` (session, participants, estimates,
   rationale) → Jira points field → master register in `product-backlog.md` → for change-request
   stories, step 4 of `change-requests.md`.
5. Changing an agreed estimate follows §4 step 4 (logged, never overwritten).

### 5.4 Sprint planning (team decides; any one member records)
1. Copy `docs/scrum/templates/sprint/` to `docs/scrum/sprint-0N/` (replace `Sprint N` / `SN-`) if it
   does not exist yet.
2. Order the backlog (§5.1), including open change requests.
3. `sprint-0N/estimation-and-capacity.md`: capacity per member, velocity from
   `docs/scrum/release-burndown.md`, estimates (§5.3).
4. `sprint-0N/planning.md`: goal, selected stories, owners, reviewers, decisions, how they were made.
5. `sprint-0N/sprint-backlog.md`: one card per story with ACs and the `S#-Txx` test plan.
6. `sprint-0N/README.md`: dates, goal, committed scope and decision source.
7. Start the sprint in Jira; screenshot the board into `sprint-0N/evidence/` as `S#-E01` and register it.
8. Add the sprint's row to `docs/scrum/README.md`. Final sprint: record the meeting (§5.18).

### 5.5 Daily Scrum (Tuesday, Thursday, Saturday)
1. Each member adds their own row (done / next / blockers) to `sprint-0N/daily-progress.md` § Daily
   Scrum log. Never write another member's row for them.
2. One member (whoever is first after the meeting) adds the burndown checkpoint (scope total, Done
   SP, remaining, from Jira) and any impediment.

### 5.6 Sprint review (last day; team decides, any one member records)
1. `sprint-0N/review.md`: build demonstrated, stories demoed, accepted / not accepted against their
   ACs and the Definition of Done, feedback, Done SP, who accepted.
2. Unfinished stories stay not Done and carry to the next sprint (§6.4).
3. Feedback that changes scope goes through §5.1 (new stories) or §5.10 (reopened stories).

### 5.7 Retrospective (everyone gives feedback; any one member records)
1. `sprint-0N/retrospective.md`: last sprint's actions followed up; each member's went well / to
   improve / did not go well (from that member, not invented); agreed actions with owners and dates.

### 5.8 Sprint close (any one member, same day as the review)
1. Screenshot the Jira board and export the burndown chart into `sprint-0N/evidence/` (`S#-E02`,
   `S#-E03`) and register them.
2. Fill the burndown data table in `sprint-0N/daily-progress.md` and the outcome in `sprint-0N/README.md`.
3. Add the sprint's row to `docs/scrum/release-burndown.md` and redraw the chart.
4. Update the master register in `product-backlog.md`; export it as
   `docs/submission/1/product-backlog.xlsx`; refresh the Jira CSV export in `docs/submission/1/`
   and its README.
5. Save the `npm run test:coverage` summary as `docs/testing/coverage-reports/sprint-0N.txt` and register it.
6. If the Definition of Done changed, add a row to its version history (§5.16).
7. Close the sprint in Jira (unfinished items move to the next sprint at full points).
8. Update the sprint's row in `docs/scrum/README.md`.

### 5.9 Customer change (e.g. Week 7 changes; team decides)
Follow the course's *Managing Changes* guide in this order, recording each step in
`docs/requirements/change-requests.md`:
1. Describe the change and classify it: new requirement, clarification or correction.
2. Product backlog: **new requirement → new story** linked to the original; clarification → update
   the existing story; reprioritise (§5.1).
3. Acceptance criteria: define new ACs, check existing ACs are still valid, re-verify the originals.
4. Story points: estimate new stories (§5.3); re-estimate existing ones only if understanding
   materially changed.
5. Design: C4, class diagram, sequence diagram, data model, API contract (§5.17).
6. Tests: unit, functional, integration, E2E and regression cases.
7. Add the scope increase to `docs/scrum/release-burndown.md`.

### 5.10 Defect in a story already marked Done
**Reopen** that story (do not create a new one) in the current sprint and estimate only the
remaining work (course guide, Scenario 1). Record it in `change-requests.md` if a customer raised
it, otherwise in the sprint's scope change log. Then follow §4.

### 5.11 Pull request review (any member who is not the author)
1. Check the PR template: every required document ticked and actually changed in the diff.
2. Check the code against the card's ACs and the Definition of Done; run `npm run check` locally if
   in doubt.
3. Leave the review on GitHub (approve or request changes, with reasons). The GitHub review is the
   record; a self-merge without review must be stated in the PR text.

### 5.12 Manual or hosted acceptance testing (any one member)
1. Use only the shared development database with test accounts; never production data. The person
   signs in themselves; AI assistants never type passwords.
2. Record original values before changing shared data and restore them afterwards; list any test
   data left behind in the run record.
3. Record the run as `MAN-YYYYMMDD-NN` in `docs/testing/test-evidence.md` (steps, data, result).
   Append one `test-executions.csv` row per case and attempt, linking the specification's
   `test_case_id`, run ID, actual result, status, executor, execution date, build, environment and
   evidence. Update `S#-Txx` status and register screenshots. Change `test-cases.csv` only when
   the specification changes; keep earlier runs and failures when recording a retest.
4. If it fails: reopen or create a defect (§5.10) and tell the story owner.

### 5.13 Customer question, decision or assumption (any one member)
1. Add a dated entry at the bottom of `docs/requirements/assumptions-and-questions.md`: question or
   decision, source (customer, team, instructor), outcome, who decided.
2. Update the affected stories' ACs (Jira and `sprint-backlog.md`) and tests.

### 5.14 Meeting minutes from notes or transcripts (any one member)
1. Use only the transcript, notes or what attendees said. Link the transcript or note the source.
2. Put the content in the record for that meeting (planning, daily progress, review, retro,
   refinement); never create a separate minutes file.
3. Anything not in the source is **Not recorded**.

### 5.15 Jira and repo sync (any one member)
1. Compare Jira (status, points, assignee, ACs, sprint) with `sprint-backlog.md`, the master
   register and `traceability.csv`. Jira is the source of truth for wording; the repo for evidence.
2. Fix the side that is wrong. Add a Jira comment explaining any change to another member's card
   and tell them in the group chat.
3. Never set points to 0 for carried stories (§6.4).

### 5.16 Definition of Done change (team decides)
1. Edit `docs/scrum/definition-of-done.md` and add a row to its version history (date, sprint,
   change, who agreed). Apply it from the next story onward; do not re-judge accepted stories.

### 5.17 Design documents (any one member)
1. Update the matching section of `docs/architecture/README.md` (C1, C2, C3, class, sequence),
   `docs/architecture/api-contract.md` and `docs/database-diagram.md`.
2. Re-export images into `docs/architecture/exports/` (`c1-context`, `c2-containers`,
   `c3-components`, `class`, `seq-<workflow>`).

### 5.18 Submission preparation (any one member)
1. Work through `docs/submission/checklist.md` folder by folder.
2. Folder 1: refresh `docs/submission/1/` (Jira CSV, backlog spreadsheet, README status).
   Folder 5: the slide deck PDF and `docs/submission/5/README.md` (course template, released by
   Week 11). Folder 7: repository link and instructor access check in `docs/submission/7/README.md`.
3. Final sprint: put the planning, review, retro and one standup recording links in
   `docs/scrum/final-sprint-recordings.md` (recorded live; cannot be backdated).
4. Run `npm run submission:prepare`, check the output, then zip folders 1–7.

### 5.19 Week 13 Q&A preparation (everyone)
Each member can explain their own stories' code, decisions and tests, trace a requirement to its
tests using `traceability.csv`, and explain how the team handled the Week 7 changes
(`change-requests.md`).

## 6. Rules and formats

### 6.1 Test specifications and execution records

Follow the Week 4 test case template: a reusable specification is written once and updated when
requirements change; an execution record is added for each run. Maintain these during development.
Final submission packaging copies the testing records and traceability into folder 3; it does not
replace recording evidence when tests happen.

**Specifications — `docs/testing/test-cases.csv`.** Every AC must link to a relevant case here.
Module-level case lists (such as `backend/test/venues/venue-search-test-cases.md`) are supporting
detail. Fill every column; use **Not recorded** for unavailable source details or optional author
and creation-date metadata. Do not invent setup, test data or authors when migrating old cases.
Preserve existing case IDs and explain historical or superseded cases in `specification_notes`.
The retained `TC-01` to `TC-20` rows are historical feature-level summaries, not runnable cases;
their aggregate outcomes stay in the archive and run narratives rather than becoming execution
rows. Use the detailed cases linked from traceability for execution and acceptance checks.

| Column | Example |
| --- | --- |
| `test_case_id` | `TC-10-03` (feature number, case number) |
| `feature_id` | `CF-10` |
| `scenario_outline` | Coordinator searches with an end date before the start date |
| `planned_level` | integration (existing mixed labels are retained until their test boundaries are assessed) |
| `acceptance_criterion_ids` | `KAN-12-AC14` |
| `preconditions` | Signed in as coordinator; test venue exists |
| `test_steps` | 1. Open /venues/search 2. Enter the dates in test_data 3. Search |
| `test_data` | Start: 10 Jan 2027; end: 9 Jan 2027 |
| `expected_result` | Search refused with an end-date message; no results shown |
| `created_by` | Not recorded |
| `date_of_creation` | Not recorded |
| `specification_notes` | Boundary scenario; use an isolated test fixture |

**Executions — `docs/testing/test-executions.csv`.** Keep one row per case/run/attempt where
the evidence supports that detail. Append retests; do not overwrite earlier outcomes. A
**Not executed** row is a planning placeholder, not a performed run: its actual result, run ID,
executor, execution date, build and environment remain **Not recorded** until supported by evidence.
Keep that placeholder as historical preparation when appending a real execution. Do not treat
its row number or the documentation migration date as an execution date.

| Column | Meaning / example |
| --- | --- |
| `execution_id` | Stable unique `EX-...` row identifier; distinct from the run ID |
| `test_case_id` | Existing specification ID, e.g. `TC-10-03` |
| `run_id` | `MAN-20261012-01` or an existing historical run ID; Not recorded if unavailable |
| `actual_result` | What was observed; Not recorded for an unperformed case or an old result without observed detail |
| `result` | Pass / Fail / Not executed / Blocked |
| `remarks` | Limitations, blockers, cleanup, retained test data, attempt details or source provenance |
| `executed_by` | Actual executor; Not recorded if unavailable |
| `date_of_execution` | Actual date; Not recorded if unavailable |
| `build` | Tested commit SHA or build identifier; Not recorded if unavailable |
| `environment` | Actual environment and relevant substitutes; Not recorded if unavailable |
| `evidence` | `MAN-20261012-01` |

Use **Blocked** only when a recorded obstacle prevented execution, explaining it in `remarks`.
A pending or future test without a recorded blocker remains **Not executed**. Preserve reported
historical outcomes and their limitations; do not infer missing metadata from commit timestamps.

**Run detail — `docs/testing/test-evidence.md`.** Retain commands, suite totals, coverage,
environment details, screenshots and failures/retests here. A suite-wide Pass does not establish
that every linked case passed. Add case-level Pass/Fail only when the source identifies the case
or its specific scenario and observed result. Preserve older run ID formats and original records.
The unchanged migration snapshot `docs/testing/archive/test-cases-2026-10-21.csv` is historical
source evidence, not the current specification or execution register.
Counts of recorded case outcomes do not establish complete feature coverage or hosted acceptance;
check their scope, source limitations and the relevant Definition of Done.

**Test selection.** Cover normal, boundary, conflict and failure scenarios at the appropriate
levels: unit for isolated rules, integration for collaborating components and real database
behaviour, and E2E for important complete user journeys. State mocked boundaries: a browser test
with substituted API responses does not prove a live integrated workflow. Manual/automated is
an execution method; regression is a purpose that applies across levels, not a separate level.
Avoid duplicating every low-level assertion as a manual case: link meaningful AC-level cases to
the actual automated test files through traceability.

### 6.2 IDs

| ID | Meaning | Lives in |
| --- | --- | --- |
| `KAN-xx`, `KAN-xx-ACn` | Jira story, acceptance criterion | Jira, `sprint-backlog.md` |
| `CF-01`…`CF-20` | Core feature from the project instructions | `docs/requirements/README.md`, traceability |
| `CR-n` | Customer change request | `change-requests.md` |
| `TC-xx-nn` | Reusable test specification | `test-cases.csv` |
| `EX-...` | Unique execution-register row (including explicit Not executed placeholders) | `test-executions.csv` |
| `S#-Txx` | Sprint acceptance test (e.g. `S3-T04`) | `sprint-backlog.md` |
| `AUTO-YYYYMMDD-NN`, `MAN-YYYYMMDD-NN` | Automated / manual test run; preserve existing historical ID formats | `test-evidence.md`, linked from `test-executions.csv` where case evidence exists |
| `S#-Exx` | Registered evidence artifact | `sprint-0N/evidence/README.md` |

### 6.3 Writing records
- Only record what actually happened. Never invent a test result, meeting, attendee, vote, date,
  review or decision.
- Mark gaps with exactly one of: **Not recorded**, **To agree**, **Not executed**, **Not assessed**.
- Add new dated rows; never rewrite or delete someone else's dated entries.
- AI-assisted work is allowed, but PRs say which parts were AI-assisted and how they were checked;
  every member must be able to explain their work at the Week 13 Q&A.

### 6.4 Story point rules
- A story counts toward a sprint's velocity **only** if it meets the Definition of Done by that
  sprint's last day. No partial points.
- An unfinished story counts **0** in that sprint and moves to the next sprint at its **full
  original points**. Never set its Jira estimate to 0 and never split points between sprints.
- Estimates are never silently overwritten (§4 step 4).
- New requirement = new story; missed or broken AC in a Done story = reopen it (§5.9, §5.10).

## 7. Code, git and environment

### 7.1 Git
- Branch from the latest `main`: `feat/`, `fix/`, `test/` or `docs/` + `KAN-xx-short-name` (or a
  short topic for non-story work, e.g. `docs/sprint-03-planning`).
- Only pull while on `main`. To bring `main` into your branch: `git merge main` on your branch, and
  keep **both sides** of shared documents when resolving conflicts (they are append-only logs).
- `git add` explicit paths only (never `git add -A` or `git add .`). Never commit `.env`,
  credentials, real personal data or video files.
- Every commit for a story names its KAN id. Non-story commits use `docs:`, `chore:` or `test:`.

### 7.2 Tests and commands
- Backend unit/HTTP tests: `backend/test/<module>/` · Frontend component tests: `*.test.ts` beside
  the component · Database integration: `database/tests/**/*.integration.test.ts` · Browser/E2E:
  `tests/e2e/*.spec.ts`.
- `npm run check` (types + unit tests + builds) · `npm run test:coverage` ·
  `npm run test:integration` (needs a test database) · `npm run test:e2e`.
- Validate input at the API boundary and enforce authorization on the server. Use transactions
  where related records change together.
- If 100% coverage of new code is not possible, explain why in the PR and in `test-evidence.md`.

### 7.3 Database
- Schema changes: add a new numbered migration (never edit a shared one), update
  `docs/database-diagram.md` and `database/README.md`, and tell the team before applying it to the
  shared Supabase database.
- Never point cleanup-based tests at the shared database. Test data left on the shared database is
  listed in the run record and removed only with the team's agreement.

## 8. Document map (every Markdown file in the repo)

Any new document must be added to this map in the same PR. **Required** = updated by the story
owner for every story. **If** = only when it applies. **Any one member** = one person does it for
the team and records their name (§2).

### 8.1 Instructions and setup

| Document | Holds | Update when |
| --- | --- | --- |
| `AGENTS.md` | This guide | Process changes (team agrees) |
| `.claude/CLAUDE.md` | Loads this guide for Claude Code (`@AGENTS.md` only) | Never |
| `CONTRIBUTING.md` | Pointer to this guide | Never |
| `.github/pull_request_template.md` | PR checklist matching §4 | When §4 changes |
| `README.md` | Project overview, setup, run and check commands | Setup or commands change |
| `backend/README.md`, `frontend/README.md`, `database/README.md` | Workspace setup, structure, database configuration | Setup, structure or schema changes (§4 step 14) |
| `backend/src/modules/*/README.md` | Module responsibilities and files (owner names there are historical) | The module changes (§4 step 14) |
| `backend/src/modules/venues/venue-search.md`, `backend/test/venues/venue-search-test-cases.md` | KAN-12 design notes and module-level case list | KAN-12 changes; cases must also be in `test-cases.csv` |

### 8.2 Requirements and backlog (submission folder 1)

| Document | Holds | Who |
| --- | --- | --- |
| `docs/requirements/product-backlog.md` | Master register of all stories (status, priority, SP, sprint, Done date), release coverage, future stories | Any one member (§5.1) |
| `docs/requirements/README.md` | Core features CF-01..20 and scope | Any one member |
| `docs/requirements/change-requests.md` | Customer changes and their handling | Team decides (§5.9) |
| `docs/requirements/assumptions-and-questions.md` | Dated questions, decisions, assumptions | If (§5.13) |
| `docs/submission/1/README.md` + exports | Jira CSV and backlog spreadsheet for submission | Any one member, sprint close |

### 8.3 Design (folder 2)

| Document | Holds | Who |
| --- | --- | --- |
| `docs/architecture/README.md` + `exports/` | C1, C2, C3, class and sequence diagrams, image exports | If (§5.17) |
| `docs/architecture/api-contract.md` | Endpoint shapes and errors | If |
| `docs/database-diagram.md` | Tables and relationships | If |

### 8.4 Testing (folder 3)

| Document | Holds | Who |
| --- | --- | --- |
| `docs/testing/test-cases.csv` | Reusable specifications per AC: preconditions, steps, data and expected results | Required |
| `docs/testing/test-executions.csv` | Case-level actual results per run/attempt; explicit Not executed placeholders | Required |
| `docs/requirements/traceability.csv` | Feature → story → AC → test case → test file | Required |
| `docs/testing/test-evidence.md` | Run narratives, suite results, source limitations and coverage gaps | Required |
| `docs/testing/archive/test-cases-2026-10-21.csv` | Unchanged pre-standardisation register retained as historical source evidence | Never edit; current records live in the separate registers |
| `docs/testing/README.md` | Register workflow, test levels, environments and hosted check scripts | If (testing workflow or hosted check changes) |
| `docs/testing/coverage-reports/` | Coverage summary per sprint | Any one member, sprint close |

### 8.5 Scrum records (folder 4)

| Document | Holds | Who |
| --- | --- | --- |
| `docs/scrum/README.md` | Sprint list and conventions | Any one member, planning and close |
| `docs/scrum/release-burndown.md` | Remaining release SP per sprint vs ideal | Any one member, sprint close |
| `docs/scrum/definition-of-done.md` | Definition of Done and version history | Team decides (§5.16) |
| `docs/scrum/final-sprint-recordings.md` | Final sprint recording links | Any one member |
| `docs/scrum/templates/sprint/*` | Blank sprint records to copy | Only when the process changes |
| `sprint-0N/README.md` | Dates, goal, scope, outcome | Any one member |
| `sprint-0N/planning.md` | Goal, selected stories, refinement sessions, decisions | Any one member |
| `sprint-0N/estimation-and-capacity.md` | Capacity, velocity, estimates, re-estimates | Any one member; story owner if re-estimating |
| `sprint-0N/sprint-backlog.md` | Story cards, ACs, `S#-Txx` tests | Required |
| `sprint-0N/daily-progress.md` | Daily Scrum rows, development notes, scope changes, burndown | Required; own Daily Scrum row by everyone |
| `sprint-0N/review.md` | Demo and acceptance outcome | Any one member |
| `sprint-0N/retrospective.md` | Feedback per member, actions | Everyone + any one member |
| `sprint-0N/evidence/README.md` + files | Index of screenshots, exports, CI runs, transcripts | If |
| `docs/scrum/sprint-01/*`, `sprint-02/*` | Closed sprints (same eight records) | Factual corrections and backfilled records only, marked with the date they were added |
| `docs/scrum/sprint-03/*`, `sprint-04/*` | Current and final planned sprint records, customer-change allocation and evidence | Current sprint updates; future sprint planning records do not claim meetings already occurred |

### 8.6 Submission (folders 5–7)

| Document | Holds | Who |
| --- | --- | --- |
| `docs/submission/checklist.md` | Folders 1–7 and final checks | Any one member (§5.18) |
| `docs/submission/5/README.md` | Slide deck status and PDF | Any one member |
| `docs/submission/7/README.md` | Repository link and instructor access check | Any one member |
