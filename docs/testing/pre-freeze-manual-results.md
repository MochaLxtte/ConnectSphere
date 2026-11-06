# Manual results reported before code freeze

Tristan confirms that the team ran its manual procedures before the **1 November 2026, 23:59 SGT** code freeze and that all passed. This report adds **21 team-reported Passes** for active cases that still had only preparation entries. It is separate from the [75 cases at the 31 October review](sprint-4-manual-review.md). The group result in Ryan’s review and Ernest’s retrospective specifically covers the review-day checklist. The broader pre-freeze result and story-owner attribution below come from Tristan’s confirmation. [Meeting evidence](../scrum/review-testing.md) · [Execution register](test-executions.csv)

The register uses the run ID `REPORT-PREFREEZE-MANUAL`. An exact execution date, build, environment and case-level captures were not supplied. The individually named smoke procedures retain their earlier preparation checkpoints. For the two cross-story cases, both story owners are listed; who performed each individual step is unrecorded.

## Results by case

| Case and procedure | Story | Owner attribution | Result |
| --- | --- | --- | --- |
| <a id="tc-04-233"></a>[TC-04-233](case-catalogue/cf-04.md#tc-04-233) · Local spacing and link-affordance smoke check | KAN-33 / KAN-8 | Irfan (KAN-33) / Tristan (KAN-8) | Pass |
| <a id="tc-08-02"></a>[TC-08-02](case-catalogue/cf-08.md#tc-08-02) · KAN-50: Inspect current selected catalogue venue | KAN-50 | Ryan | Pass |
| <a id="tc-08-03"></a>[TC-08-03](case-catalogue/cf-08.md#tc-08-03) · KAN-50: Save location and capacity | KAN-50 | Ryan | Pass |
| <a id="tc-08-04"></a>[TC-08-04](case-catalogue/cf-08.md#tc-08-04) · KAN-50: Save facilities and accessibility | KAN-50 | Ryan | Pass |
| <a id="tc-08-05"></a>[TC-08-05](case-catalogue/cf-08.md#tc-08-05) · KAN-50: Save multiple venue-specific layouts | KAN-50 | Ryan | Pass |
| <a id="tc-08-06"></a>[TC-08-06](case-catalogue/cf-08.md#tc-08-06) · KAN-50: Validate one-sided operating-hour edit | KAN-50 | Ryan | Pass |
| <a id="tc-08-07"></a>[TC-08-07](case-catalogue/cf-08.md#tc-08-07) · KAN-50: Persist catalogue save after navigation | KAN-50 | Ryan | Pass |
| <a id="tc-08-08"></a>[TC-08-08](case-catalogue/cf-08.md#tc-08-08) · KAN-50: Propagate catalogue without changing bookings | KAN-50 | Ryan | Pass |
| <a id="tc-08-09"></a>[TC-08-09](case-catalogue/cf-08.md#tc-08-09) · KAN-50: Refuse unauthorised and unsupported fields | KAN-50 | Ryan | Pass |
| <a id="tc-08-10"></a>[TC-08-10](case-catalogue/cf-08.md#tc-08-10) · KAN-50: Normalize and bound catalogue data | KAN-50 | Ryan | Pass |
| <a id="tc-08-11"></a>[TC-08-11](case-catalogue/cf-08.md#tc-08-11) · KAN-50: Concurrent catalogue field behavior | KAN-50 | Ryan | Pass |
| <a id="tc-08-12"></a>[TC-08-12](case-catalogue/cf-08.md#tc-08-12) · KAN-50: Missing or inactive venue refuses save | KAN-50 | Ryan | Pass |
| <a id="tc-08-13"></a>[TC-08-13](case-catalogue/cf-08.md#tc-08-13) · KAN-50: Failed save retains edited fields | KAN-50 | Ryan | Pass |
| <a id="tc-08-208"></a>[TC-08-208](case-catalogue/cf-08.md#tc-08-208) · S2 concurrent catalogue edits preserve disjoint changes and resolve one-field conflicts | KAN-50 | Irfan | Pass |
| <a id="tc-10-207"></a>[TC-10-207](case-catalogue/cf-10.md#tc-10-207) · S2 invalid or incomplete periods are stopped before any search request | KAN-12 | Ryan | Pass |
| <a id="tc-10-209"></a>[TC-10-209](case-catalogue/cf-10.md#tc-10-209) · S2 missing filter options and no-match results have distinct recoverable feedback | KAN-12 | Ryan | Pass |
| <a id="tc-10-212"></a>[TC-10-212](case-catalogue/cf-10.md#tc-10-212) · Local cross-form date/time keyboard consistency smoke check | KAN-12 / KAN-9 | Ryan (KAN-12) / Tristan (KAN-9) | Pass |
| <a id="tc-12-23"></a>[TC-12-23](case-catalogue/cf-12.md#tc-12-23) · Connected local replacement and conflict feedback smoke check during R11 | KAN-82 | Irfan | Pass |
| <a id="tc-16-08"></a>[TC-16-08](case-catalogue/cf-16.md#tc-16-08) · KAN-9: Fulfillable equality boundary | KAN-9 | Tristan | Pass |
| <a id="tc-16-10"></a>[TC-16-10](case-catalogue/cf-16.md#tc-16-10) · KAN-9: Validate dates quantities and adjacency | KAN-9 | Tristan | Pass |
| <a id="tc-db-205"></a>[TC-DB-205](case-catalogue/infrastructure.md#tc-db-205) · KAN-24: Check the database diagram against the adopted schema | KAN-24 | Arvin | Pass |

## Roster and source boundaries

The earlier register identifies ten active Sprint 3 catalogue cases, two venue-search cases and one database-diagram inspection as manual or manual/E2E. Three later cards explicitly call for manual smoke checks. The retained KAN-9 procedure also names the equipment equality and invalid-input cases. The catalogue procedure gives the single-hour edit and disjoint/same-field two-user test, including its Sprint 2 baseline version. This is how an integration-level card can have a documented manual method. [Catalogue procedure](archive/2026-11-05/README.md#kan-50-hosted-verification) · [Equipment manual scenarios](archive/2026-11-05/README.md#manual-scenarios) · [115-case evidence audit](pre-freeze-case-audit.md)

Irfan owned the Sprint 2 catalogue baseline; Ryan took its Sprint 3 continuation. Ryan owned venue search, Arvin the database foundation, and Tristan equipment availability. The queue/booking smoke spans Irfan and Tristan, and the date-entry smoke spans Ryan and Tristan. Irfan owned the independent venue-arrangement story. [Sprint 1 review](../scrum/sprint-01/review.md) · [Sprint 2 assignments](../scrum/sprint-02/planning.md) · [Sprint 3 assignments](../scrum/sprint-03/planning.md) · [Sprint 4 assignments](../scrum/sprint-04/planning.md)

The UI patch checkpoints still described TC-04-233 and TC-10-212 as pending on 31 October and TC-12-23 as pending on 1 November. The team places their manual completion before the cutoff; the exact time relative to those checkpoints is unknown. An earlier reported November 6 fixture input differs from the November 16 slot specified in TC-12-23; no fixture-level readout was supplied for the reported Pass. [31 October date-entry checkpoint](test-evidence.md#auto-20261031-minor-ui--date-entry-consistency-and-review-links) · [31 October spacing checkpoint](test-evidence.md#auto-20261031-ui-spacing--shared-panel-insets-and-visible-text-links) · [1 November replacement checkpoint](test-evidence.md#auto-20261101-booking-feedback--replacement-guidance-and-local-submission-feedback)

Ten of the manual-labelled cases in the earlier register describe superseded versions: the Sprint 3 journey TC-06-19 and nine original notification cases, TC-20-01–07, TC-20-09 and TC-20-11. The team confirmed the manual cases used for the release; it did not identify separate runs against those retired requirements. The historical entries continue to carry their own dispositions.
