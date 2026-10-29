# ConnectSphere release acceptance walkthrough

Sprints 1 to 4 · Manual end-to-end acceptance and regression testing · Prepared 30 October 2026

Use this guide to test the complete application with real sign-in, the local frontend and API, the agreed Supabase development database and the real hold-expiry job. Follow the steps in order, switching to the stated role. Record what actually happens in a separate copy of the results form at the end. All checks in this newly prepared walkthrough are **Not executed**.

The guide covers the 20 core features and six Week 7 customer changes through connected user journeys and important negative paths. It complements the detailed test cards and automated unit/integration tests; completing it alone does not prove every concurrency, rollback, migration or acceptance-criterion boundary. Release and code-freeze approval remains a team decision after reviewing all relevant evidence.

## Send this message to the team

Please test the release candidate using the attached ConnectSphere walkthrough. Use the same agreed build, real test-account sign-in and shared development database. Follow R01–R24, record Pass, Fail, Not executed or Blocked with observations and screenshots, and keep separate events for the scenario branches. Do not mark a check Pass just because its button is visible. Refresh and check saved outcomes, permissions and notifications. Return your completed results form and the IDs of any test data left behind. Report failures before code freeze.

## Before the team starts

1. Agree who drives each role and who records results. Separate browser profiles are safest; two tabs in the same browser profile share a login. One person may switch roles sequentially. Nobody shares passwords or includes tokens, cookies or credentials in screenshots.
2. Agree the exact candidate commit. This guide was prepared against main `6b26503` plus the uncommitted KAN-80/82/84 corrections on `fix/sprint-4-acceptance-gaps`. Those corrections must be included in the build being tested. Do not assume an older copy of main contains them. Record `git rev-parse HEAD` and `git status --short`; if files are uncommitted, retain the source manifest/diff identifier as well.
3. Use Node 24, the project's existing development `.env`, `npm ci`, then `npm run dev` from the repository root. Open `http://127.0.0.1:5173` consistently. Confirm both API and frontend are running and the development database is the agreed project. Do not commit `.env` or replace teammates' configuration.
4. Confirm migrations **001–022**, including 021 and 022, are recorded in the project's `public.schema_migrations`. Their application was reported; each run still records the actual database/build checked. No new migration is required for the three 30 October corrections. Do not rename, delete or rerun migration SQL manually to set up a test.
5. Confirm the hold-expiry scheduler is enabled and record its actual cadence. A disappearing hold in the calendar proves availability filtering, not that the background job persisted expiry and notifications. R09 checks both.
6. Use only synthetic accounts and agreed test fixtures. Record original venue hours/buffers, equipment counters and assignments before changing them. Do not run `db:seed`, reset scripts, cleanup-based integration tests or fault-injection tests against shared Supabase. A local Git branch does not isolate the shared database.
7. Keep the browser Network panel available for unexpected errors. A maintainer may use read-only Supabase views to corroborate IDs, status, decision/history rows and notifications. The browser journey must still work; do not use SQL updates to force event states or bypass a failed step.

### Roles to prepare

| Alias | Mapped application role | Purpose |
| --- | --- | --- |
| O1 and O2 | Event Organiser | Owner and unrelated organiser |
| L1 | Event Coordinator Lead | Initial allocation and handover |
| C1 and C2 | Event Coordinator | Current and unrelated/new coordinator; both available for the handover test |
| V1 | Venue Staff | Catalogue, blocks, holds and booking decisions |
| T1 | Technical Support Staff | Stock, equipment checks and reservations |
| S1 | Safety Officer | Safety review and decisions |
| A1, A2 and A3 | Attendee | Two registration seats and a third capacity attempt |

Account creation is a trusted setup task: each Supabase Auth test account must map to the correct `app_users` profile. Record aliases and application IDs, never credentials. Lead and Safety Officer are separate roles; internal-user status does not grant every permission.

### Shared data sheet

Choose **D**, a future date at least two weeks after the run, and enter all displayed dates in **Singapore time**. These are proposed synthetic values; record your actual choices and ensure they do not overlap teammates' events. Prefix names with `REL-<run-id>`.

| Fixture | Values and preparation |
| --- | --- |
| E-MAIN | O1's main event; D 10:00–12:00; expected attendance 20; purpose “Release acceptance workshop”; venue needs “Theatre layout, projector and wheelchair access”; equipment needs “Three test microphones”; registration required, capacity 2, opens before this run, closes before D starts but after this run. |
| Venue A, B and C | Dedicated active test venues, capacity 50, Theatre layout, Projector facility, wheelchair access, setup 15 minutes and turnaround 15 minutes. A/C hours 08:00–18:00; B hours **10:45–18:00**, deliberately fitting B1's own occupied interval but not the parent's 10:00 start. A maintainer supplies these approved test venues; do not repurpose a real venue. |
| A1-booking and B1-booking | E-MAIN at Venue A, D 10:00–11:00, then Venue B, D 11:00–12:00. These have different arrangement intervals; record their actual booking IDs. |
| EQ-MIC | Dedicated test equipment type: total 10, damaged 2, maintenance 1, leaving 7 usable before reservations. No other overlapping test allocations initially. Main request is 3 units. Restore counters after testing. |
| E-REJECT and E-HANDOVER | Separate complete requests for rejection and Lead reassignment. Do not reject or hand over E-MAIN halfway through another person's test. |
| E-HOLD and E-OUTAGE | Separate approved events and dedicated venue/period combinations for expiry and recovery. Use distinct periods/venues from E-MAIN. |
| E-CHANGE | Keep this separate event APPROVED, not Confirmed, for the arrangement-affecting significant-change branch in R17. |
| Safety branches | E-SAFETY-REJECT is Approved and ready on D+1; E-SAFETY-REMEDIATE is Confirmed and ready on D+2; E-SAFETY-STALE is Confirmed, safety-approved and preparation-started on D+3. Reuse the earlier valid workflow, with nonoverlapping equipment periods or separate provisioned equipment types. Dedicated venues alone do not isolate microphone stock. |
| E-CANCEL | Separate confirmed event, with an approved venue booking, reserved equipment and an active attendee registration, for terminal release checks. |
| E-END | A genuinely ended, previously confirmed test event with resources. Arrange and confirm it **before its start time**. If none exists, prepare a short event early in the run with enough time to finish its setup; run R23 only after its real end time. Do not backdate confirmation or change the database clock. |

Except for deliberate conflict/shortfall checks, give branch events nonoverlapping equipment periods or their own provisioned equipment types. In particular, E-CHANGE and E-CANCEL must not consume E-MAIN's seven-unit fixture during R13's availability calculation. Record the schedule before reserving stock.

### How to read and record a step

R01–R24 are walkthrough navigation labels, not new test-case IDs. Referenced `TC-...` cards supply the reusable specification; `TC-14-20` covers the Sprints 1–3 connected venue journey and `TC-06-32 / S4-T16` covers the complete release journey. A related step is not automatically the full execution of every linked card. Only record a card Pass when all its required observations have been performed.

For each successful mutation, refresh the relevant role's page and verify the same event/arrangement identity, status and saved fields. Record an HTTP response when needed to explain a refusal. A disabled control alone does not prove server authorization; the automated authorization tests remain supporting evidence, and R24 adds safe protected-read probes.

## R01 Sign in and verify role boundaries

**Roles:** O1, O2, C1, L1 and S1. **Cases:** KAN-25; TC-01-208 for current browser logout; TC-05-01/05 for allocation access. **Start:** no signed-in session in the organiser profile.

1. Open `/login`, try one incorrect test password, then sign in correctly as O1. Expect a helpful failure followed by the correct organiser identity; a failed login must not show protected request data.
2. Open `/events`, `/reviews`, `/lead`, `/equipment/stock` and `/safety-reviews` as O1. Expect organiser pages to work and protected internal pages to refuse access without revealing lists or controls.
3. Open the permitted entry page separately as C1, L1 and S1. Check the displayed identity before continuing; Lead allocation is not coordinator review permission, and Safety Officer access is not ordinary internal access.
4. Later, once O1 has a saved event, sign out, reopen its saved URL and `/events`, and refresh. Expect a sign-in gate and cleared protected content. In the Network panel, a successful logout expires the browser application cookie and subsequent unauthenticated protected requests fail. Sign in again to continue.

**Contract:** logout clears this browser's session and cached identity. It does not promise immediate revocation of a separately captured Supabase token or another device's session. Do not replay or record credentials as part of this walkthrough.

## R02 Create a draft and submit a valid request

**Role:** O1, then O2 for the privacy check. **Cases:** TC-02-02/03/06/07/08, TC-03-02/03/04; KAN-31/4/6/34. **Fixture:** E-MAIN.

1. Open **New event request** at `/events/new`. Enter the E-MAIN name only and choose **Save draft**. Reopen it from **Event requests**; expect Draft and the saved name, with no review decision or allocation.
2. Edit the draft. Fill purpose, start/end, expected attendance, venue requirements, accessibility needs and equipment requirements. First select **No registration**, save and reopen, then change to **Registration required**. Expect capacity/open/close controls to appear. Enter capacity 2 and the chosen valid window; save, reopen and compare every field.
3. Exercise invalid submission without losing the draft: clear/whitespace the purpose, set end equal to or before start, and set registration close before open. Try submission after each change. Expect field feedback and no SUBMITTED transition. Restore valid values. Blank optional registration settings are not automatically an error; follow their displayed rules.
4. Submit the valid saved draft once. Expect SUBMITTED after refresh, with its ID retained, no review outcome and no initial coordinator. Also create one separate valid request directly from the new-request form to cover that submission entry path.
5. As O2 open E-MAIN's saved detail/edit URL. Expect unavailable/denied content and no ability to edit or submit O1's request. O2's own list must not expose O1's requests.

**Current policy:** new submissions wait for a Coordinator Lead. KAN-29 automatic allocation is a historical pre-change baseline, not the expected release behavior.

## R03 Allocate and hand over an event

**Roles:** L1, C1, C2 and O1. **Cases:** TC-05-02/04/05/10/11/12/13/15/16; KAN-79/65/64. **Fixtures:** E-MAIN and E-HANDOVER.

1. As L1 open `/lead` (**Assignment queue**). Find the submitted E-MAIN, explicitly choose C1 and select **Assign**. Refresh; it leaves the unassigned queue and remains accessible through `/lead/oversight`.
2. As C1 open `/reviews` and E-MAIN. As C2 try its saved review URL. Expect access only for C1. Allocation must not approve the event or change its request fields.
3. Allocate E-HANDOVER to C1. In Lead oversight open its allocation page, choose C2 and supply a meaningful handover reason. Blank reasons must not submit. Complete the valid handover and refresh both coordinator sessions.
4. Expect C1 to lose protected request access and C2 to gain it. Owner details, venue/equipment history and prior review records remain. Check the assignment history records the old/new coordinator, actor and reason. The current coordinator is not offered as a reassignment target; same-target no-op handling is covered by controlled API tests.
5. Check O1/C1/C2 inboxes for their intended allocation/handover notices and try C1's old link after the handover. A retained notification never restores old access. Leave E-MAIN assigned to C1.

## R04 Clarify review approve and reject

**Roles:** C1 and O1. **Cases:** KAN-33/27/36/16/60; TC-04-02/03/04. **Fixtures:** E-MAIN and E-REJECT.

1. Open E-MAIN as C1 and select **Mark as under review**. Refresh and expect UNDER_REVIEW on the correct event.
2. Enter “Please confirm wheelchair access requirements” and choose **Request clarification**. Blank text must not send. O1 should see the request and its notice; enter an answer and choose **Send answer**. After the final outstanding answer, expect SUBMITTED again. Confirm the question/answer history remains after refresh, then C1 selects **Mark as under review** to resume.
3. Approve E-MAIN using the review decision panel. Refresh C1 and O1 views: both show Approved and the same saved decision; it remains reachable to the assigned coordinator after leaving the pending queue. Approval alone does not create a venue booking or confirm the event.
4. Allocate E-REJECT to C1 and start review. Try Reject with whitespace only; expect refusal. Reject with “Venue requirements are incomplete” and verify O1 sees the persisted reason and Rejected status.
5. Revisit the decided request. It must not offer a fresh opposite decision. An organiser must not have review decision controls. If checking the repeated/opposite API decision card as well, use its existing isolated/controlled procedure and record its 409 response separately; do not infer it from button visibility.

## R05 Maintain the venue catalogue and buffers

**Role:** V1, then C1 for propagation. **Cases:** TC-08-02/03/04/05/06/07/08/09/15/16/18/20; KAN-50/77. **Fixtures:** dedicated Venues A/B/C.

1. Open `/venue-catalogue`, select Venue A and record original values. Set the agreed location, capacity 50, Theatre layout, Projector facility, wheelchair/accessibility information, hours 08:00–18:00, setup 15 and turnaround 15. Save, navigate away and reopen; expect exact persistence and the correct venue identity.
2. Try negative/fractional capacity or duration and closing before opening. Expect validation without overwriting the last valid values. Restore the agreed values and prepare B/C, retaining B's deliberate **10:45** opening time from the data sheet.
3. Open the catalogue editor as C1 or O1. Expect no Venue Staff edit permission. As C1 search again and verify the saved catalogue values are used.
4. On a separate agreed venue with existing adjacent approved bookings, increase a buffer enough to overlap them. Expect affected-booking warnings and preserved booking identities/times, not silent relocation or cancellation. Record the warning, then restore that venue's original buffers and verify the warnings reconcile.

## R06 Search and assess candidate venues

**Role:** C1. **Cases:** TC-10-02/03/04/05/06/07/08/09/10; TC-11-02/03/04/05/06; KAN-12/52/51/78. **Start:** E-MAIN is Approved, no booking yet.

1. Open `/venues` and search D 10:00–11:00 with expected attendance 20. Filter by the agreed location, wheelchair access, Theatre layout and Projector. Expect the correct matching venues; clear/change a filter and verify results are recalculated.
2. Try attendance exactly 50 then 51 against Venue A's capacity 50; observe the threshold. Try an end before start and a date/time outside venue hours. Expect clear invalid/no-match feedback rather than a silent substitute period.
3. Open E-MAIN's **Check venue suitability** page from its review, or `/reviews/<eventId>/venue-suitability`. Confirm structured requirements from the displayed source text. Check one matching venue, then a venue lacking the required capability. Expect reasons for each unsuitable/unknown requirement; no booking or safety approval is created.
4. Refresh after an agreed catalogue/source change. An old confirmed interpretation must not be applied silently to new source data. O1/attendees cannot read protected venue-planning results. The calendar `/venues/availability` is available to permitted coordinators, Venue Staff and Technical Support Staff.

## R07 Request and decide independent venue arrangements

**Roles:** C1 and V1. **Cases:** TC-12-20; KAN-53/8/54/82. **Fixtures:** E-MAIN, A1-booking and B1-booking.

1. On E-MAIN's review page request Venue A for D 10:00–11:00, Theatre layout, with clear notes. Add Venue B for D 11:00–12:00. Record each booking ID; expect two separate Pending arrangements under the same event.
2. Follow each arrangement's **Check suitability** link. Expect the selected venue, own interval, layout and notes to be displayed separately from the parent's D 10:00–12:00 reference. Confirm the interpreted requirements and assess. B1's occupied interval starts 10:45 and fits B's hours, while ordinary event-mode assessment of the parent's 10:00 start fails those hours. This demonstrates that saved arrangement timing is actually used. No result from A may remain when opening B.
3. As V1 open `/venue-bookings`, then each exact booking. Approve A and B separately; refresh C1's event. Expect independent Approved decisions with the correct venue/time and unchanged parent fields. The parent remains Approved until explicitly confirmed.
4. Reassess the selected approved arrangement. It must not conflict with itself; a different occupying arrangement, even on the same event, still counts. The saved venue selector/layout remain fixed to that arrangement, and unrelated C2 cannot open its protected context. Forged venue/layout mismatches are covered by the controlled API tests.
5. On a separate test booking reject the request and verify the outcome on its event without changing the other bookings. Check the owning coordinator and relevant Venue Staff notices. Keep E-MAIN's two intended approved arrangements intact for the later steps.

## R08 Check buffered conflicts and operational blocks

**Roles:** C1 and V1. **Cases:** TC-14-01/02/03/04/06; KAN-54/55/78. **Fixture:** Venue A with A1-booking, plus separate conflict requests.

1. A1 runs D 10:00–11:00 with 15-minute setup/turnaround, so its occupied interval is **09:45–11:15**. Compare booking detail, calendar, search and suitability; event time and occupied time must remain distinguishable.
2. On another eligible event request Venue A at 11:15–12:00. Its own setup starts 11:00, overlapping A1's occupied interval. Expect conflict refusal even though the requested booking periods do not overlap. No partial booking or unrelated change is saved.
3. Try a candidate beginning 11:30, whose setup starts exactly 11:15. With no other blocker and within hours, occupied-interval adjacency is eligible. A successful availability read is advisory; creating/approving a request rechecks current data.
4. As V1 open `/venue-blocks`, select a separate venue/period and add a named operational block. Search/check/request that period as C1: expect it unavailable. Try blank reason or inverted interval: expect validation. Remove only the agreed test block and verify availability updates.
5. Do not manually simulate simultaneous writers on shared Supabase. The isolated database suites verify locking/rollback; record those separately from these sequential conflict observations.

## R09 Hold approve cancel and automatically expire

**Roles:** V1 and C1. **Cases:** TC-14-08/09/11/12/13/14/15/17/18; KAN-83. **Fixtures:** three separate pending requests on E-HOLD or distinct events/periods.

1. A Pending request alone must not reserve availability. On the first booking choose **Place a temporary hold**. Try a past deadline and one after the setup-inclusive occupied start: expect refusal. Enter a deadline a few minutes in the future and before the occupied start, then **Place hold**. Record server deadline; verify Held on both staff/coordinator pages and unavailable time in the calendar.
2. Approve this booking before expiry. Expect one Approved reservation replacing its own hold, not a conflict with itself. On the second booking place a hold, then **Cancel hold** with a reason. Blank reason is refused; valid cancellation releases that hold only and notifies the coordinator.
3. Place the third hold with a short practical future deadline, for example now plus five minutes. Let real time pass; record timestamps. After the deadline, readers must stop treating it as occupying. Allow the recorded scheduler cadence and verify the persisted EXPIRED state/history and intended expiry notification. Do not invoke expiry SQL manually and report it as automatic success.
4. Keep a staff page open across the deadline and attempt approval from that stale form before refreshing: it must not revive or approve the expired hold. After refresh there is no approval/renewal control. A new request must follow the normal workflow. Retrying/refreshing must not duplicate expiry notices.
5. If the calendar releases the period but the expiry job does not persist the transition/notice, record that distinction and fail/block the job-dependent observation with evidence. Do not label the whole case Pass.

## R10 Recover from a venue outage

**Roles:** V1 and C1. **Cases:** TC-09-02/03/04/06/07/08/09/11; KAN-81. **Fixture:** E-OUTAGE with an approved booking and a different available replacement venue.

1. Record the approved booking and parent event. As V1 add an operational block overlapping its occupied interval, including a setup-only overlap where possible. Expect the block to save, the existing booking to be retained and marked as needing recovery, and protected notices to the affected users.
2. Verify calendar/search/suitability treat the blocked venue as unavailable. The event must not silently become cancelled or confirmed; confirmation and safety readiness must not pass with unresolved recovery.
3. As assigned C1 open the affected booking/event and use its linked replacement workflow. Select a different suitable available venue and valid interval. Expect a new Pending replacement linked to the affected arrangement; submitting it is not recovery completion.
4. On one attempt choose a conflicting replacement or have V1 reject it. Expect the unresolved recovery to remain and no false restored reservation. Submit a valid linked replacement, then approve it as V1. Expect the replacement APPROVED, original CANCELLED and recovery RESOLVED, with history retained; unrelated arrangements remain intact. Do not manually cancel the outage-affected original first: this workflow releases it when the replacement is approved.
5. On a second still-unresolved outage fixture, remove its agreed test block. Expect that block's recovery CLEARED and the original APPROVED booking retained; other remaining outages still require recovery. Removing the block after the successful replacement instead preserves RESOLVED/CANCELLED history. Record both scopes separately. C2 must not perform C1's recovery action.
6. On a separate live hold, save an overlapping operational block. Expect the hold to be cancelled/released with the outage notice, not converted to an approved booking. This differs from an outage affecting an already approved booking, which is retained for recovery.

## R11 Cancel and replace just one arrangement

**Roles:** C1 and V1. **Cases:** TC-12-04/05/06/09/11/12/14; KAN-82. **Start:** E-MAIN is still Approved with A and B approved.

1. Choose **Cancel arrangement** on B. Read the confirmation naming the event, venue and interval. Blank **Reason for cancelling** must not enable **Confirm cancellation**. Enter “Move the second session to Venue C” and confirm.
2. Refresh. B is Cancelled with history/reason and its period is released. A stays Approved; parent name/dates/attendance and equipment remain unchanged. Check the intended coordinator and Venue Staff notice.
3. On cancelled B choose **Request replacement**. Verify **This request replaces** names B, then fill Venue C, D 11:00–12:00, Theatre and notes explicitly. First try an invalid/conflicting period: expect no replacement saved and no restoration of B. Submit the valid request; it gets a new Pending ID linked to B.
4. On this first replacement, have V1 reject it. B stays cancelled and A stays approved. Request a fresh valid linked replacement and approve that one. Refresh the linked history and independent statuses; do not overwrite the rejected row or re-enable B to retry.
5. Before proceeding, verify E-MAIN now has its intended two approved live arrangements: A plus the approved replacement. A Pending/Held live replacement blocks venue readiness. Cancelled/rejected bookings remain history, but are excluded from live readiness: with only A still live and approved, venue readiness can be true. Finish the replacement here to preserve this scenario's intended two-arrangement setup.

## R12 Maintain equipment stock

**Role:** T1. **Cases:** TC-16-01–05; KAN-18. **Fixture:** dedicated EQ-MIC with no initial overlapping allocations.

1. Open `/equipment/stock`, select the maintainer-provisioned EQ-MIC and choose **Update stock**. Record original counters. If different, set total 10, damaged 2 and maintenance 1, enter **Reason for the change**, then **Save stock change** and reload. Expect 7 operational units before reservations and a retained stock-change record. If already 10/2/1, verify the values; unchanged saves are disabled. Use the deliberate change in step 4 to check persistence/history.
2. Try a negative/fractional counter and damaged plus maintenance greater than total. Expect field feedback and no saved invalid counters. Restore valid values.
3. As C1, O1 and A1 try the stock page. They must not acquire Technical Support edit access. Availability elsewhere must use the latest valid counters, not the physical total alone.
4. After R13 reserves equipment, revisit this row. With an explicit reason, reduce usable stock below its current overlapping commitments using valid counters. The save retains reservations and lists the shortfall under **Reservations not fully covered**; it must not silently delete or reallocate them. Restore agreed counters and verify the warning/readiness reconciles before later checks.
5. Observe C1's equipment-unavailability notice after that operational loss. For stale editing, open the same stock revision in two T1 tabs, save one valid change, then submit the outdated second form. Expect refusal and **Reload stock**, preserving the newer revision. Restore agreed values with a recorded reason.

## R13 Request check and reserve equipment

**Roles:** C1 and T1. **Cases:** TC-15-01–07, TC-16-06–17, TC-17-01–08; KAN-63/9/26. **Start:** E-MAIN Approved; EQ-MIC has 7 operational units.

1. On E-MAIN's **Equipment arrangements**, C1 selects EQ-MIC, quantity 3 and clear technical requirements, then **Save equipment request**. Refresh and compare the saved line/event/date/time. Invalid quantity or an empty required plan must not appear as a successful reservation.
2. As T1 open `/equipment/availability`, select E-MAIN and check its requested window/lines. Expect the requested quantity and operational availability to reflect damaged, maintenance and overlapping reservations. The check can run before a venue is confirmed and does not itself reserve stock.
3. In the unsaved check mode, try quantity 7 against the free 7-unit interval, then 8. Expect Fulfillable at the boundary and a one-unit Shortfall above it. Confirm the unsaved check creates no request or reservation. Return to the actual saved 3-unit requirement.
4. Open `/equipment/availability/<eventId>`, choose **Load saved reservations**, then select the saved EQ-MIC line and **Reserve full request** → **Confirm reservation**. Expect all 3 requested units on that line to reserve once, never a partial quantity. Reservations are atomic **per line**, not across every line on the event: a failed line leaves its state/notices unchanged while previously reserved other lines remain. Equipment readiness requires every active required line to be reserved and currently fulfilable. Refresh C1/T1 views and notices.
5. From a separate eligible probe event in the same interval, check 4 and 5 units. With only E-MAIN's 3 units reserved, expect 4 available and a one-unit deficit for 5. A non-overlapping interval should regain all 7. Checking E-MAIN's existing saved reservation must not count it twice.
6. On a separate Approved equipment fixture, cancel a saved reservation with a reason and confirm its release/history. Repeated refresh/action must not release it twice. Do not cancel E-MAIN's needed equipment before confirmation.
7. On a no-equipment branch event, C1 explicitly selects **No equipment is required** and saves. Verify the coordinator's persisted plan and confirmation/readiness outcome. An empty saved request alone is not the explicit Not Required decision.
8. On a separate Approved equipment fixture, T1 opens **Equipment requests** and tries **Reject request** with no **Rejection reason**; expect refusal. Reject with a reason, then verify it on C1's event. A rejected required line does not consume stock but still blocks readiness. C1 uses **Cancel line**, supplies **Cancellation reason**, then **Confirm line cancellation**, and creates a valid replacement request if equipment is still needed.
9. Demonstrate independence using an Approved probe event with no approved venue: its equipment what-if check can still succeed. For a stale-source check, T1 leaves a reservation form open while C1 edits an unreserved requirement; an attempt using the old version must require refresh, not silently reserve obsolete requirements. Keep exact simultaneous stock races in the isolated automated tests.

## R14 Confirm the event

**Role:** C1, then O1/A1. **Cases:** TC-06-01/02/03/04; KAN-61. **Fixture:** E-MAIN before its actual start.

1. Before arranging everything on a separate branch, inspect **Event confirmation** with a Pending/Held venue, unreserved equipment, pending significant change or unresolved outage. Expect each live blocker to prevent confirmation and be understandable; fix each through its owning workflow.
2. For E-MAIN ensure all intended live venue arrangements are Approved, equipment is reserved, no significant change is Pending and no recovery remains. Select the acknowledgement **I have checked the arrangements and want to confirm this event**, then **Confirm event**.
3. Refresh C1/O1. Expect CONFIRMED, persisted confirmation history and notices; repeated action must not produce another transition. Confirmed is different from event-review approval and from safety approval.
4. An organiser, unrelated coordinator or Lead must not get C1's confirmation authority. An event whose start has already arrived cannot newly be confirmed. Record an actual refusal only on an appropriately prepared separate fixture; never move its date by SQL to make the result pass.
5. E-MAIN is registration-enabled and future, so an authenticated attendee should now find it through `/attend`. There is no separate Publish button. Preparation remains blocked until R18 grants current safety approval.

## R15 Discover register withdraw and test capacity

**Roles:** A1/A2/A3, then O1/C1. **Cases:** TC-18-01/02/03/05/06, TC-18-405/409/410/415/424; KAN-14/17/67. **Fixture:** E-MAIN Confirmed, registration open, capacity 2.

1. As A1 open `/attend`. Find E-MAIN and open its attendee detail. Verify attendee-visible name, period and registration state without internal decision notes, coordinator-only data or other attendees' personal details. This requires attendee sign-in; Draft/Submitted/Approved-only events do not appear in discovery.
2. Register A1 and then A2 using their own sessions. Refresh attendee details and `/registrations` (**My registrations**). Expect each active registration once and the correct event. Inspect O1/C1's authorised event registration roster at `/events/<eventId>/registrations` and the acknowledgement/organiser/coordinator notices.
3. As A3 attempt the same event while both seats are taken. Expect Full/no successful registration, no extra roster row and no success notice. Repeat A1's unchanged action if available; there must not be a duplicate active registration or outcome notice.
4. As A1 open `/registrations` and **Withdraw registration**. Read the warning and choose **Keep registration** first: nothing changes. Reopen and **Confirm withdrawal**: count falls to 1 and notices appear. Re-register A1 while the window is open; expect the same registration ID with a new registered timestamp, count 2 and no duplicate active row. Withdraw A1 again; A3 takes the freed place. A1's next attempt is refused as Full. Leave A2/A3 active and A1 withdrawn for R17's recipient check.
5. On separate confirmed fixtures, check not-yet-open, closed, capacity-zero and registration-disabled behavior. For an actual window boundary, prepare a future event whose registration closes later in this run, register before close, then let the real close time pass. A new registration is refused; an existing attendee can still withdraw before event start but cannot re-enter after registration closes. At/after event start withdrawal is refused. Record unavailable timed observations as Blocked/Not executed. Discovery can display full/closed/not-yet-open entries without allowing registration.
6. As A1 open `/registrations?registration=<A2-registration-id>`: expect **The linked registration is unavailable for this account**; A1's own records may still appear. The event-manager roster is denied to attendees and unrelated O2/C2. Only permitted event managers see the full roster; attendee notices link to their own registration context.

## R16 Edit ordinary event information safely

**Roles:** O1 and C1. **Cases:** TC-07-01/02/03/04/05/06/07; KAN-66. **Fixtures:** separate pre-approval event and E-MAIN.

1. As O1 select **Edit details** (`/events/<eventId>/details`) on an owned Submitted/Under review/Clarification requested event. The page is headed **Edit event details**. Change allowed fields, select **Save changes**, reopen and verify persistence. Another organiser cannot edit it.
2. On E-MAIN after approval/confirmation, **C1** selects **Edit name or description** from the review page and changes Description to “Arrival instructions: arrive 09:45”. O1 does not have this coordinator-only edit action after approval. Compare snapshots: ordinary text editing must preserve dates, attendance, arrangements, registrations and safety approval, and must not stand in for a reviewed significant change.
3. Open the same editable event in two tabs. Save a different revision in tab A; try an outdated edit in tab B. Expect current-state/conflict feedback, not an unnoticed overwrite. Refresh before retrying. Record the observed behavior rather than assuming concurrent timing occurred.
4. Attempt a significant field through the ordinary editor only where it is exposed; expect it to be unavailable or directed to **Request a change** after approval. Do not call a hidden control a server-side test. Existing API/component cases cover the full actor/field matrix.

## R17 Submit review withdraw and reject significant changes

**Roles:** O1 and C1; A2/A3 observe notices when registered. **Cases:** TC-19-01/02/03/04/05/06/07/08/09, TC-20-405/431; KAN-15/80. **Fixtures:** E-MAIN and separate E-CHANGE.

1. As O1 on E-MAIN open **Request a change** (`/events/<eventId>/change-request`). Enter a permitted purpose-only revision, for example “Workshop including a discussion session”, then **Send change request**. Record the change ID. Original event values remain until approval.
2. O1 receives an acknowledgement; C1 receives **Change request to review** with a link to `/reviews/<eventId>?change=<changeId>`. This submission is the request for coordinator action; there is no additional reverse request-for-action step. Open the exact change and compare before/proposed values.
3. C1 checks **Effect on arrangements**, then **Approve and apply**. Refresh event/change history: only accepted fields change and the decision persists. Active attendees receive **Event details changed**; withdrawn/unregistered attendees do not. A repeated unchanged action must not emit duplicate outcome notices. An unrelated coordinator cannot review it.
4. Submit a second permitted purpose change; C1 enters **Reason for rejecting** and selects **Reject change**. Expect unchanged event values, a retained rejected change and notices. Submit another and have O1 use **Withdraw change request** before decision; this has no confirmation dialog. C1's stale decision must not apply the withdrawn proposal. Keep each change ID distinct.
5. On Approved E-CHANGE, prepare a Pending venue booking and unaffected reserved equipment. O1 requests attendance 20 → 22. C1's **Effect on arrangements** must list cancellation of the pending venue; **Approve and apply** saves attendance, cancels that venue with history and preserves the equipment. On a separate Approved fixture with REQUESTED equipment, change only equipment requirements and verify the affected requested line cancels while the unaffected venue remains. An affected approved venue/reserved equipment blocks such approval; do not force it.
6. On Confirmed E-MAIN with active arrangements/attendees, request a time change to D 11:00–13:00. The preview explains the restriction and **Approve and apply** is disabled/refused, without partial changes or approval notices. Reject or withdraw this pending proposal before continuing. Purpose-only approval does not imply all significant fields remain applicable after confirmation.
7. Leave no pending change on E-MAIN before safety review. A pending change must block readiness/preparation even if it has not yet changed the saved safety revision.

## R18 Review safety and start preparation

**Roles:** C1, S1 and O1. **Cases:** TC-06-20/21/22/23/27/30/31/445; KAN-84. **Start:** E-MAIN Confirmed and all live arrangements ready.

1. As C1 inspect **Safety review**. Before approval, **Start preparation** must not be available. Fill **Emergency access** = “East and west exits clear”, **Equipment placement** = “Three microphones at the front, cables secured away from exits”, **Crowd movement** = “Separate entry and exit with clear aisle”. Select **Submit for safety review** and record the review ID/round.
2. As S1 open `/safety-reviews`, then the event/round link. Verify event attendance, every venue's capacity/layout/accessibility/hours/buffers, equipment and all safety notes. Missing information must be visible; advisory venue suitability is not safety approval.
3. Approve using **Save decision**, refresh and verify officer, time and round outcome. C1 receives the outcome notice. O1 sees the appropriate safety outcome on the owned event, without officer decision rights. Another submission/decision must not overwrite a completed round.
4. As C1 select **Start preparation**. Reload C1/O1 views; expect **Preparation started**, actor/time and the approved current review. It must not create repeated starts. If safety approval was obtained before final confirmation on a branch fixture, confirmation is still required before preparation.
5. On two separate Pending rounds, S1 selects a decision/enters notes on A, returns to the queue and opens B. Expect B's details and an empty decision draft with no stale success/error from A. Sign out and reopen: no protected stale content. Controlled late-response ordering is covered by the automated regressions, not inferred from ordinary navigation.

## R19 Reject safety and complete requested remediation

**Roles:** S1, C1, V1 and T1. **Cases:** TC-06-24/25/26/27/433/434; KAN-84. **Fixtures:** separate E-SAFETY-REJECT and E-SAFETY-REMEDIATE, both otherwise ready.

1. On the rejection fixture, submit a round with a missing safety note. S1 should see **Missing — not provided by the coordinator**. Try Reject with blank notes: saving is disabled/refused. Reject with “Explain how exits remain clear”. Expect retained rejection/history, blocked preparation and no automatic deletion/cancellation of event, bookings or equipment.
2. C1 supplies the missing information/corrections and submits a new round. The rejected round remains unchanged. S1 must explicitly decide the new round; no timer or comment grants automatic approval.
3. On the remediation fixture, C1 chooses **Submit for safety review**. S1 opens that round, chooses **Request changes**, enters “Move the second arrangement and reduce microphone setup to two units”, and selects **Venue** and **Technical**. No area/blank explanation must not save. Verify C1 and relevant arrangement staff receive the correct instructions.
4. Resubmission and safety-note fields remain unavailable while areas are unresolved. As C1 use **Edit name or description** to change only Description, then refresh. Venue and Technical must remain unresolved. C1 explicitly cancels/replaces the selected venue arrangement and V1 approves the replacement. Unrelated arrangements persist, and Technical remains unresolved.
5. On the Confirmed remediation event, C1 uses **Replace reserved line**, changes the three microphones to two, supplies revised requirements and confirms release/replacement. T1 uses `/equipment/availability/<eventId>` → **Load saved reservations** → **Reserve full request** → **Confirm reservation**. The general equipment queue's inline action is Approved-only; use this panel for the permitted safety remediation on a Confirmed event.
6. Only after every requested area is genuinely changed and current readiness passes may C1 submit a new round. S1 approves it and C1 starts/resumes preparation as offered. Resubmission closes the limited technical-remediation window; old rounds, release reasons and replacements remain in history.
7. For the area-specific acceptance cards, repeat Venue-only and Technical-only decisions on separate fixtures and verify that changing only an unrequested area does not satisfy remediation. If not run, leave those narrower cards Not executed rather than extrapolating from the combined case.

## R20 Recheck stale safety and uncertain saves

**Roles:** C1, V1, S1 and O1. **Cases:** TC-06-28/29/436/437/445; KAN-84/82. **Fixture:** separate E-SAFETY-STALE, Confirmed, safety-approved and preparation started.

1. O1 submits a purpose-only change and leaves it Pending. Expect preparation blocked by live readiness, even if the stored safety fingerprint remains current. Withdraw it and refresh; the same already-started preparation may become unblocked without a new Resume button.
2. V1 changes this event's dedicated venue setup buffer from 15 to 20 minutes within otherwise free opening hours. Expect the prior safety approval to become out of date and preparation blocked. A name/description-only edit should not produce the same invalidation.
3. C1 submits a fresh ready round; before S1 decides, V1 changes the buffer again. S1 reloads: approval of the stale round must be unavailable. Select **Reject**, enter the reason, then **Save decision**. C1 submits a fresh round for the current arrangements and S1 approves it. Use Reject for this branch; Request changes would require additional changes after that decision, as in R19. Resume preparation only when current approval and readiness permit it.
4. Independently cancel/replace one approved arrangement on an agreed branch event. Expect safety invalidation/readiness recalculation while the parent event and unrelated allocations remain. New arrangement approval does not itself renew safety approval.
5. On another undecided round, briefly take only the test browser offline before Save. A failed response must not claim success. If reconciliation also fails, the old decision form stays unavailable and asks for reload. Restore connectivity, reload and inspect the actual saved round before retrying; a failed response does not prove the server did not commit.
6. Restore agreed mutable venue settings after the observation, but do not assume restoration re-approves a review. Keep prior rounds and decisions as history and record the final state.

## R21 Check notifications throughout the journey

**Roles:** all affected actors and one unrelated user. **Cases:** KAN-64/80 and CR-2/4/6 notification criteria; TC-20-431. **Start:** keep observations from each earlier action, not only a final inbox count.

1. After each relevant action open `/notifications` as its intended recipients. Check the correct event, outcome, reason/action where applicable and related request/booking/change identity. Notifications are in-app; email delivery is not a requirement.
2. Cover assignment/handover, clarification/review, venue decisions/outage/hold expiry, equipment reservation/unavailability, final confirmation/cancellation, registration/withdrawal, significant-change submission/decision and safety submission/decision/remediation. Capture the recipient and observed notice for each performed outcome; failed/refused actions must not generate a success notice.
3. Choose **Mark as read** on an unread notice and refresh; its read state persists only for that recipient. There is no mark-unread control, and merely opening a link does not mark it read. Follow **Open event request** and verify the actual destination; this generic label can link to registration context. The destination rechecks current permissions, including after handover.
4. Expect outcome notices for the appropriate owner/current coordinator/acting or responsible staff and affected active attendees as specified by the related card, not a broadcast to every internal account. For safety Request Changes, inspect the relevant venue/technical recipients; for registration, inspect attendee acknowledgement plus organiser/current coordinator.
5. Repeat an unchanged permitted action where the UI supports it, or refresh after an uncertain outcome, then compare exact outcome/recipient IDs. There should not be duplicate business notices. Transaction rollback and adversarial retry cases stay with the isolated automated integration tests.

## R22 Cancel an event and release its resources

**Roles:** authorised owner/current coordinator, V1, T1 and attendees. **Cases:** TC-06-08–13, TC-17-04; KAN-62/26/80. **Fixture:** E-CANCEL Confirmed with an approved booking, reserved equipment and active registration.

1. Open **Event cancellation**. Check the named event; blank/whitespace **Reason** or an unchecked acknowledgement must not save. Enter “Release test cancellation”, check **I understand this releases the event's active arrangements and registrations**, then **Cancel event** and refresh relevant views.
2. Expect CANCELLED with actor/time/reason and retained event/review history. Active venue reservations and equipment allocations are released once; retained rows/history identify their cancellation/release rather than disappearing.
3. The event is no longer a future registrable choice. Attendee registration outcomes and cancellation notices must match the saved cancellation; the owner, current coordinator and affected participants/staff receive applicable notices. Do not confuse removal from active discovery with deletion of history.
4. Verify venue availability for its released interval. Check equipment from a separate eligible probe event at that interval; a terminal event may no longer appear in the Technical Support selector. Released equipment must be reusable without double release on refresh/repeated cancellation.
5. Try the event URL as the unrelated O2/C2. Cancellation must not broaden permissions. Further confirmation, preparation, registration and incompatible mutations must be unavailable/refused for the cancelled event.
6. Attendee cancellation notices must omit the internal cancellation reason. Compare an unrelated event's resources to confirm they are unchanged. After an uncertain/stale action use **Refresh cancellation details**; a retry must not create a second release or notice.

## R23 Complete an ended event

**Role:** currently assigned coordinator; owner and resource staff observe. **Cases:** TC-06-14–18, TC-17-04; KAN-10/26. **Fixture:** E-END was legitimately confirmed before starting and its real end time has now passed.

1. Verify E-END's saved interval and Confirmed status. Check the completion acknowledgement, then **Mark event as completed**. Refresh: expect COMPLETED with audit/history, not Cancelled.
2. Still-RESERVED equipment lines are released once. Existing venue booking rows and historical registrations remain unchanged; completion is not venue cancellation. The event leaves active planning/discovery while authorised history stays readable. Verify equipment stock from an eligible probe event; the reported release count is request lines, not physical units.
3. On a future Confirmed fixture, the completion form may be visible, but acknowledging and submitting before the real end must be refused by the server with no mutation. An organiser or unrelated coordinator must not acquire this permission. Repeated completion must not duplicate releases/history.
4. If no legitimately ended fixture is available, record this step **Blocked** with the time it can be retried. Do not mark it Pass using an automated result, backdated event status or a modified clock.

## R24 Finish access checks and record the release decision

**Roles:** tester/recorder and the team. **Cases:** TC-14-20, TC-06-32 and the specific cards actually executed.

1. As signed out, O2, C2 and an unrelated attendee, revisit saved event, roster, arrangement, suitability and safety URLs appropriate to each denial. Expect sign-in/unavailable/forbidden views without protected content. As signed out, use a same-origin protected read from the browser Network panel or console without supplying any old token; expect 401. Do not forge shared-data mutations merely to test denial.
2. Navigate rapidly between two event/booking/review pages and refresh after saves. Check correct identity, no leftover form/result/message, useful failure feedback and no false saved outcome. Use the recorded focused automated race tests for deterministic late responses and competing writers.
3. Review every R row and referenced card with the recorder. Record Fail for an observed mismatch, Blocked for an actual obstacle and Not executed for skipped checks. Fixes require a new attempt with build/date/evidence; retain the failed attempt. A partial walkthrough is not a Pass for TC-06-32.
4. Restore agreed original hours/buffers/stock settings and list all synthetic events, bookings, equipment lines, registrations, blocks, reviews and notices retained. Obtain agreement before deleting shared test data; immutable decisions/history should not be erased to make the run look clean.
5. Before release/code freeze, require the candidate's relevant CI and automated checks to pass, the intended migrations/background job to be verified, all critical manual journeys to pass, acceptance-criterion gaps to be resolved or explicitly assessed, independent review/merge to be complete and required documentation/evidence to be current. Record who made the release decision and when; this guide itself does not grant release approval.

## Coverage map for the team

Use this map to find the relevant journey; use `docs/testing/test-cases.csv` and `docs/requirements/traceability.csv` for the full AC-level specification and automated test files. Earlier sprint acceptance records remain history. The release is tested against current requirements, including the customer changes received on 2 October.

| Core feature | Walkthrough |
| --- | --- |
| CF-01 Authentication and authorisation | R01, role boundaries throughout, R24 |
| CF-02 Event request creation | R02 |
| CF-03 Draft requests | R02 |
| CF-04 Review and approval | R04 |
| CF-05 Coordinator assignment | R03; current Lead policy supersedes automatic initial assignment |
| CF-06 Status and lifecycle | R02–R04, R14, R18–R20, R22–R23 |
| CF-07 Event information | R02, R16 |
| CF-08 Venue catalogue | R05 |
| CF-09 Availability calendar | R06, R08–R10 |
| CF-10 Venue search | R06, R08 |
| CF-11 Suitability | R06–R07; advisory only |
| CF-12 Venue requests | R07, R10–R11 |
| CF-13 Venue decisions | R07, R09–R11 |
| CF-14 Conflict detection | R08–R10; deterministic competing writes remain automated |
| CF-15 Equipment requests | R13, R19 |
| CF-16 Equipment availability | R12–R13 |
| CF-17 Equipment reservation | R13, R19, R22–R23 |
| CF-18 Registration | R14–R15, R22–R23 |
| CF-19 Significant changes | R17, R20 |
| CF-20 Notifications | Each business outcome and R21 |

| Customer change | Walkthrough |
| --- | --- |
| CR-1 Setup and turnaround buffers | R05–R08 |
| CR-2 Operational outage recovery | R10, safety readiness in R18–R20 |
| CR-3 Independent venue arrangements | R07, R11, R20 |
| CR-4 Temporary holds and expiry | R09–R10 |
| CR-5 Coordinator Lead allocation | R02–R03 |
| CR-6 Safety approval before preparation | R18–R20 |

| Sprint 4 story and acceptance group | Walkthrough |
| --- | --- |
| KAN-18 / S4-T01 Stock | R12 |
| KAN-9 / S4-T02 Availability | R13 |
| KAN-63 / S4-T03 Equipment requests | R13, R19 |
| KAN-26 / S4-T04 Reservations | R13, R19, R22–R23 |
| KAN-61 / S4-T05 Confirmation | R14 |
| KAN-62 / S4-T06 Cancellation | R22 |
| KAN-10 / S4-T07 Completion | R23 |
| KAN-14 / S4-T08 Registration and discovery | R14–R15 |
| KAN-17 / S4-T09 Withdrawal | R15 |
| KAN-67 / S4-T10 Registration roster | R15 |
| KAN-66 / S4-T11 Ordinary editing | R16 |
| KAN-15 / S4-T12 Significant changes | R17 |
| KAN-80 / S4-T13 Later workflow notices | R13–R23, especially R17/R21 |
| KAN-82 / S4-T14 Multiple arrangements | R07, R11, R20 |
| KAN-84 / S4-T15 Safety | R18–R20 |
| TC-06-32 / S4-T16 Full release journey | R01–R24, with separate fixtures for incompatible outcomes |

### What still needs automated or separately controlled evidence

Keep the tested candidate's `npm run check`, `npm run test:coverage`, isolated `npm run test:integration` and browser/CI results with their real build identifiers. Unit tests cover isolated rules; integration tests cover collaborating components/database behavior; this live multi-role journey is E2E with a manual execution method. Browser scenarios that substitute API responses are UI integration evidence, not proof of the shared database/sign-in workflow.

Use isolated tests for deterministic competing approvals, reservation/capacity races, rollback after injected failures, exact database-clock equality, migration upgrade preservation and controlled delayed-response orderings. Do not mark those cases Pass from ordinary sequential clicks. Coverage percentages and a green CI run do not replace the manual observations above, and manual completion does not replace those automated tests.

## Separate results form

Copy this section for each actual run. Keep the guide/specifications unchanged while recording results. An unperformed row remains **Not executed** with execution metadata **Not recorded**; do not invent a run date or executor in advance.

### Run details

| Field | Value to record |
| --- | --- |
| Run ID | Not recorded; assign MAN-YYYYMMDD-NN when execution begins |
| Date and time with timezone | Not recorded |
| Executor for each role and recorder | Not recorded |
| Build commit and any local diff/source manifest | Not recorded |
| Frontend/API URL, browser and development database identifier | Not recorded; no secrets |
| Applied migrations and expiry job cadence checked | Not recorded |
| D and all actual event/venue/equipment/booking/review/registration IDs | Not recorded |
| Original shared values and agreed cleanup | Not recorded |

### Walkthrough observations

Use Pass / Fail / Not executed / Blocked. In the final column include observed values, role, IDs, screenshot/log references and defect/retest reference. Duplicate a row for a new attempt rather than erasing a failure. These R rows organise the team run; they do not replace case-level execution records.

| Step | Status | Actual result and evidence |
| --- | --- | --- |
| R01 Sign-in and roles | Not executed | Not recorded |
| R02 Draft and submission | Not executed | Not recorded |
| R03 Allocation and handover | Not executed | Not recorded |
| R04 Clarification and review decisions | Not executed | Not recorded |
| R05 Catalogue and buffers | Not executed | Not recorded |
| R06 Search and suitability | Not executed | Not recorded |
| R07 Independent venue decisions | Not executed | Not recorded |
| R08 Buffered conflicts and blocks | Not executed | Not recorded |
| R09 Holds and automatic expiry | Not executed | Not recorded |
| R10 Outage recovery | Not executed | Not recorded |
| R11 Individual cancellation and replacement | Not executed | Not recorded |
| R12 Equipment stock | Not executed | Not recorded |
| R13 Requests availability and reservation | Not executed | Not recorded |
| R14 Final confirmation | Not executed | Not recorded |
| R15 Discovery registration and withdrawal | Not executed | Not recorded |
| R16 Ordinary information edits | Not executed | Not recorded |
| R17 Significant changes | Not executed | Not recorded |
| R18 Safety approval and preparation | Not executed | Not recorded |
| R19 Safety rejection and remediation | Not executed | Not recorded |
| R20 Stale safety and uncertain saves | Not executed | Not recorded |
| R21 Notification matrix and links | Not executed | Not recorded |
| R22 Event cancellation | Not executed | Not recorded |
| R23 Event completion | Not executed | Not recorded |
| R24 Access cleanup and release review | Not executed | Not recorded |

### Case execution entry

Copy one entry per actual case/run/attempt, following the Week 4 test-case template. Do not tick every related TC merely because one linked step passed.

| Field | Value |
| --- | --- |
| Test Case ID and scenario | Not recorded |
| Actual result | Not recorded |
| Pass / Fail / Not executed / Blocked | Not executed |
| Remarks including failed step or limitation | Not recorded |
| Executed by | Not recorded |
| Date of execution | Not recorded |
| Run ID and attempt | Not recorded |
| Build and environment | Not recorded |
| Evidence and retained test data | Not recorded |

The recorder appends supported entries to `docs/testing/test-executions.csv`, the narrative to `docs/testing/test-evidence.md`, and evidence links to the Sprint 4 evidence index. Preserve old placeholders, failed attempts and historical results. Update S4-T16 and narrower acceptance groups only for the tested scope; formal story acceptance remains a separate team decision.

### Release review outcome

- Critical failures or outstanding acceptance criteria: **Not assessed**.
- Timed, blocked or skipped observations and planned retest: **Not recorded**.
- Restored values and retained synthetic data: **Not recorded**.
- Relevant automated checks, CI and independent review references: **Not recorded**.
- Team release/code-freeze decision, participants, date and reasons: **Not recorded**.

## Reference basis

This guide expands the earlier Sprints 1–3 walkthrough and the reusable TC-14-20/TC-06-32 cards. It uses the current Sprint 4 Jira criteria read on 30 October 2026, the repository's current workflows and the KAN-80/82/84 corrections in this candidate. It does not rewrite earlier sprint acceptance outcomes.

Course basis: **Week 4 Project Instructions**, deliverable folder 3 and testing/traceability rubric; **Week 4 Test Cases and Software Architecture**, page 22 (separate specification/execution template); **Week 6 Automated Testing 1 and CI**, page 18 (test boundaries); **Week 9 Automated Testing 2 and CD**, integration/E2E and release-gate sections. Repository authorities: `AGENTS.md`, `docs/scrum/definition-of-done.md`, current sprint cards, `docs/requirements/change-requests.md`, `docs/testing/test-cases.csv` and `docs/requirements/traceability.csv`.

The matching Word file is a shareable copy of this Markdown guide. Update both together. Required submission packaging copies `docs/testing/` into folder 3; the walkthrough supplements the reusable test cards, executions and traceability instead of replacing them.
