# Sprint 1 estimation and capacity

The team forecast **32 SP** for its first sprint. With no prior velocity, Ernest proposed 8 points per person, Arvin considered 10, and Ryan questioned whether 10 left enough time to connect login, database and pages. Six people at eight points suggested a rough 48-point capacity. The selected scope came from sizing the request journey, not from filling that amount. [Planning cues 08–14 and 29–35](evidence/meetings/planning.docx) · [Planning notes, pp. 3–4](evidence/documentation-tasks-20261105.pdf)

<a id="team-input-needed"></a>

## Estimation evidence

The six planning participants used planning poker on the Fibonacci scale **1, 2, 3, 5, 8, 13**. KAN-16 (view event status) was the 2-SP anchor. Tristan also treated KAN-33 as 2 SP while its scope was a permitted read of submitted details. Ryan compared authentication against the read-only items, Ernest compared the four request-write paths, Irfan explained the state-changing stories, and Arvin sized shared foundations. Ernest confirmed the resulting baseline. The account records these rationales but leaves the individual ballot values and any additional responses at the pause unspecified. [Planning cues 29–35](evidence/meetings/planning.docx) · [Planning notes, p. 3](evidence/documentation-tasks-20261105.pdf)

## Selected estimates

| Item | SP | Why it differed from the read-only anchors |
| --- | ---: | --- |
| KAN-25 · Authentication and authorisation | 5 | Sign-in plus role and ownership checks across the API and protected pages |
| KAN-31 · Create request | 3 | Form input, persistence and validation of a new request |
| KAN-4 · Save incomplete draft | 3 | Persist incomplete data and retain it after reopening |
| KAN-34 · Edit saved draft | 3 | Load and change an owned draft while respecting state and conditional fields |
| KAN-6 · Submit request | 3 | Validate required fields and change an eligible draft to a submitted request |
| KAN-33 · Coordinator request view | 2 | Read permitted submitted details using shared identity and request data |
| KAN-27 · Clarification | 3 | Authorised action, message and clarification state change |
| KAN-36 · Approve or reject | 3 | Two authorised outcomes with permission and state guards |
| KAN-16 · Organiser status | 2 | Show the state saved by request actions; reference story |
| KAN-24 · Database and integration | 5 | Shared schema, repeatable setup and integration across the workflow |
| **Total** | **32** | **27 SP in nine business stories + 5 SP in the infrastructure item** |

### Infrastructure estimate

The notes discussed “set up database” at 8 and a diagram at 2–3. The final KAN-24 covers the shared foundation at 5 SP. The diagram discussion is not an additional selected parent or a separately added estimate. Each business story retains its own feature behaviour and tests. [Planning notes, pp. 3–4](evidence/documentation-tasks-20261105.pdf) · [Planning cues 26–28 and 34](evidence/meetings/planning.docx)

## Actual capacity

| Member | Forecast SP | Capacity or dependency raised at planning |
| --- | ---: | --- |
| Arvin | 5 | Suggested 10 per person, then forecast the shared foundation and asked feature owners to support integration. |
| Ernest | 6 | Suggested about 8 per person because setup effort was uncertain. Would supply the creation and save fields to Kai Jie. |
| Irfan | 5 | Treated 48 SP as a rough capacity calculation. Coordinator access needed agreement with Ryan. |
| Kai Jie | 6 | Set aside room for integration and testing because edit and submission depended on Ernest’s form and field list. |
| Ryan | 5 | Challenged 10 per person while sign-in, database and pages were still separate. Took authentication and access. |
| Tristan | 5 | Needed the decision and status screens to use consistent request data and proposed reserving 17–18 September for integration. |

Members committed to story bundles, without assigning individual hours or days. The first measured throughput was **24 accepted SP** at review. Sprint 2 planning used that figure and the 8 carried points when considering its next forecast. [Planning cues 08–14, 36–48 and 55–61](evidence/meetings/planning.docx) · [Sprint 2 planning](../sprint-02/planning.md)

## Re-estimates and interpretation

| Subject | In the wider planning notes | Final selected scope |
| --- | --- | --- |
| Submit event request | 2 SP | KAN-6 at **3 SP**, including eligibility, permission, validation and transition |
| Save draft event request | 5 SP | KAN-4 at **3 SP**. Creation, later editing and submission are separate work. |
| Database | Setup **8 SP**, diagram **2–3 SP** | KAN-24 at **5 SP** for the scoped shared infrastructure item |
| Event status / authentication | **2 SP** for status, approximately **5 SP** for Firebase authentication | KAN-16 **2 SP**, KAN-25 **5 SP** across sign-in, role and ownership rules |

The PDF also sized potential later stories and gave ranges for booking approval and equipment availability. Those estimates describe the wider backlog. The meeting account and retained story register agree on the ten final values. No recorded mid-sprint re-estimate changed the 32-point baseline. At close, KAN-6, KAN-33 and KAN-34 carried at their original 3, 2 and 3 points. [PDF, pp. 3–4](evidence/documentation-tasks-20261105.pdf) · [Review disposition](review.md#story-decisions) · [Release accounting](../release-burndown.md)

## Historical records

[Preserved pre-cleanup record](archive/2026-11-05/estimation-and-capacity.md) contains the original dated updates, earlier preparations and source limitations.

<details>
<summary>Earlier section links</summary>

<a id="agreed-estimation-method"></a>

[Agreed estimation method](archive/2026-11-05/estimation-and-capacity.md#agreed-estimation-method)

<a id="agreed-story-estimates-and-comparative-rationale"></a>

[Agreed story estimates and comparative rationale](archive/2026-11-05/estimation-and-capacity.md#agreed-story-estimates-and-comparative-rationale)

<a id="agreed-infrastructure-estimate"></a>

[Agreed infrastructure estimate](archive/2026-11-05/estimation-and-capacity.md#agreed-infrastructure-estimate)

<a id="estimation-session-record"></a>

[Estimation-session record](archive/2026-11-05/estimation-and-capacity.md#estimation-session-record)

<a id="capacity-for-619-september"></a>

[Capacity for 6–19 September](archive/2026-11-05/estimation-and-capacity.md#capacity-for-619-september)

<a id="scope-and-commitment-decision"></a>

[Scope and commitment decision](archive/2026-11-05/estimation-and-capacity.md#scope-and-commitment-decision)

<a id="completion-velocity-and-interpretation"></a>

[Completion, velocity and interpretation](archive/2026-11-05/estimation-and-capacity.md#completion-velocity-and-interpretation)

<a id="closeout-and-sprint-2-planning-implications--21-september"></a>

[Closeout and Sprint 2 planning implications — 21 September](archive/2026-11-05/estimation-and-capacity.md#closeout-and-sprint-2-planning-implications--21-september)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>

[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/estimation-and-capacity.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

</details>
