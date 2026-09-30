# KAN-29 manual checks: automatic coordinator assignment

These checks verify the branch implementation with real accounts. **All results remain pending until a tester records the actual outcome.** Existing Sprint 1 results do not prove this new allocation path. Record the tested commit, date, environment, tester, request IDs, expected coordinator IDs, actual result and evidence links in [test-evidence.md](test-evidence.md). Do not include passwords, cookies or access tokens in evidence.

**Scope update, 30 September:** K29-M08 now verifies refusal of reassignment. The earlier handover implementation was removed because KAN-65 is outside Sprint 1 and Sprint 2. Existing assignment history remains readable.

## Prepare the environment

1. Confirm [006_automatic_coordinator_assignment.sql](../../database/migrations/006_automatic_coordinator_assignment.sql) is present in the target environment. Tristan has applied it to shared Supabase; [DB-SCHEMA-20260930-01](test-evidence.md#30-september-migration-and-hosted-schema-consistency) verified its fields and constraint on 30 September, with all six current migration checksums matching hosted history through the recognised filename aliases. For another environment, coordinate schema/history reconciliation and any required migration with Arvin using the updated runner. It recognises former filenames without reapplying their SQL or changing existing history. Active predecessors are 001-005; KAN-29 is now 006 (formerly 007). Use migration 006 as the schema reference; do not create a second SQL setup or edit an applied migration. Schema verification does not complete the hosted manual cases below.
2. Provision one organiser and at least two coordinator logins in Supabase Auth, with the correct linked `app_users` profiles. The event's organiser/coordinator IDs use `app_users.id`, not `supabase_user_id`. Confirm each account can sign in.
3. In the Table Editor, set `coordinator_available = true` only for provisioned `EVENT_COORDINATOR` profiles that are ready to receive requests. Its default is `false`. Do not enable fictional seed profiles. There is no new application screen for this setting.
4. Start the app with `npm.cmd run dev`. Use separate browser profiles or sign out between roles. Prepare a valid draft through the organiser UI: event name, purpose, start, end, expected attendance and venue requirements. Keep registration off for these focused checks unless registration itself is being tested.
5. Capture the eligible coordinators' application IDs and current active workloads before controlled selection checks. Count only `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED` requests assigned to each coordinator. Ties use ascending UUID order. Closed requests and drafts do not contribute.

Use a dedicated project for controlled workloads, preassigned draft fixtures and the no-available-coordinator scenario. If a shared-project test is necessary, arrange a test window with the team, record the original availability flags, and restore them afterward. Do not disable all coordinators or change teammates' live request statuses during normal development. A local Git branch does not isolate the shared database.

## Test cases

| ID | Steps | Expected result and evidence |
| --- | --- | --- |
| K29-M01 | As the organiser, create a valid request and choose **Submit for review**. Open its detail and refresh. Repeat through **Edit draft → Submit for review** and the saved draft's detail-page submit action using separate drafts. | Each request becomes `SUBMITTED` with one selected coordinator. `event_requests.coordinator_id` matches the expected application profile; one current assignment row has `assignment_method = AUTOMATIC`, `assigned_by = NULL` and `unassigned_at = NULL`. No `event_reviews` record is created. Capture the UI and corresponding request/history data. |
| K29-M02 | Sign in as the selected coordinator. Open **Review queue**, then the assigned request and refresh. Sign in as the other coordinator and open the same `/reviews/:id` URL. | The selected coordinator sees the request in their queue and can read its details after refresh. The unrelated coordinator cannot read it or find it in their queue. No manual initial assignment is needed. Capture both account results without credentials. |
| K29-M03 | As the organiser, open the submitted request and its **Assignment** panel. Repeat as the assigned coordinator. | The coordinator name and **Current** history entry agree. Both show **Assigned automatically on ...** with a timestamp. Neither the organiser nor the assigned coordinator has a handover control; reassignment is future KAN-65 work. `GET /api/events/:id/assignments` returns `assignmentMethod: "AUTOMATIC"`, `assignedById: null`, `assignedByName: null`. |
| K29-M04 | In an isolated project, leave exactly two coordinator profiles eligible and give them equal active workloads; temporarily opt other profiles out. Record their UUID order and submit a valid draft. With that saved allocation still active, submit a second draft. | The first tie selects the smaller UUID. The second selects the coordinator now carrying fewer active requests. Capture the counts immediately before each submission and the selected IDs. Do not infer the expected result from display-name order. Restore temporary availability settings afterward. |
| K29-M05 | In the controlled project, set the otherwise lowest-workload coordinator's availability to `false`, leaving another eligible coordinator available. Submit a fresh valid draft. | The unavailable coordinator is excluded even if their load is lower. The selected profile is an available Event Coordinator. Existing assignments to the unavailable profile retain their owner and remain accessible. Restore the flag after the check. |
| K29-M06 | In the isolated project or coordinated window, make all coordinator profiles unavailable. Attempt a valid submission from the form and from a saved-draft detail page. Edit and save the draft, then opt in a provisioned coordinator and retry. | The first attempts return `409 NO_AVAILABLE_COORDINATOR` and explain that the request is still a draft. There is no new assignment, coordinator or submitted-status history entry. Fields remain editable, saving remains possible, and retry submits the same draft successfully once a coordinator is available. No duplicate draft is created. Record failed and successful responses and the retained request ID. |
| K29-M07 | As the owning organiser, repeat submission through the API for a request already submitted by M01; see the console example below. Refresh and inspect its assignment history. | `409 REQUEST_NOT_SUBMITTABLE`. The request status, coordinator and original assignment ID/timestamp stay unchanged, with one active assignment and no extra automatic-history row. |
| K29-M08 | As the assigned coordinator, verify that the Assignment panel has no handover control. Send `PUT /api/events/:id/coordinator` with `{ "coordinatorId": "<another coordinator application UUID>" }` from the authenticated API session. Inspect the request/history before and after. Repeat as an unrelated coordinator. | The assigned coordinator receives `409 REASSIGNMENT_NOT_AVAILABLE`; the unrelated coordinator receives the generic `404 EVENT_REQUEST_NOT_FOUND`. No assignment is ended or created, the current coordinator and request status stay unchanged, and the original coordinator retains access. Initial manual assignment is available only for unassigned Submitted, Under review, Clarification requested or Approved requests; replacing a coordinator is deferred. |
| K29-M09 | In an isolated project, prepare a valid draft with a pre-existing coordinator or active assignment-history row. Record that data, then submit as its owning organiser. | `409 DRAFT_ALREADY_ASSIGNED`. The original draft, coordinator and history are preserved. The UI shows the specific assignment explanation and permits draft editing/saving. Investigate and reconcile the fixture before another submission; do not silently clear real assignment history. |
| K29-M10 | Try submitting an incomplete owned draft. As another organiser, attempt submission of the first organiser's draft by API. Repeat as a coordinator. | Incomplete data returns `400 SUBMISSION_INCOMPLETE`; another organiser receives `404 EVENT_REQUEST_NOT_FOUND`; a coordinator receives `403 SUBMIT_FORBIDDEN`. No allocation or status change occurs. Record responses and unchanged request/history data. |

For every no-write outcome, compare the request and assignment history before and after the action. Inspect `event_status_history` separately from `coordinator_assignments`: one records submission status, the other records who coordinates the event. The authenticated organiser is the submitter; an automatic assignment deliberately has no manual assigning actor.

## Repeat-submission API check

Open the already-submitted request's organiser detail page (`/events/:id`), while signed in as its owner. In the browser developer console run:

```javascript
(async () => {
  const session = await fetch('/api/auth/me').then((response) => response.json());
  if (session.user?.role !== 'EVENT_ORGANISER') {
    console.log('Sign in as the owning organiser first.');
    return;
  }
  const match = location.pathname.match(/^\/events\/([0-9a-f-]+)$/i);
  if (!match) {
    console.log('Open the submitted request detail page first.');
    return;
  }
  const response = await fetch(`/api/events/${match[1]}/submit`, { method: 'POST' });
  console.log(response.status, await response.json());
})();
```

Expect HTTP `409` with `error.code = REQUEST_NOT_SUBMITTABLE`. Capture the response and verify unchanged database history; the HTTP code alone does not establish that no extra row was written. This is a deliberate repeat of a submission operation on a known test request, not an assignment or approval command.

## Completion record

Record each case as Passed, Failed or Not run, with evidence and any defect. Record restoration of temporary availability flags and identify test-only records retained for evidence. Peer review, CI and these hosted checks are separate evidence; do not mark KAN-29 accepted merely because local automated tests pass.
