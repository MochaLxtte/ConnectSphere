# Customer change requests

This register explains when the six Week 7 changes arrived and how they affected the backlog, criteria, design, tests and sprint allocation. Use the current map below with the full sprint cards. Original planning notes remain in the historical appendix.

## Team input needed

Use [WS1 in the shared checklist](../submission/checklist.md#ws1-backlog-and-customer-changes) for unresolved source/acceptance inputs. Customer receipt and adopted allocation are already recorded; missing announcement captures or individual estimation votes must not be reconstructed as if they existed. Owner/reviewer selection is in the [team workstream table](../README.md#ws1-backlog-and-customer-changes).

## Source and decision chronology

| Event | Date | Evidence and effect |
| --- | --- | --- |
| Six Week 7 customer changes received | **2 October 2026** | Receipt reported in chat on 16 October. Source: Week 7 Customer Changes.pdf, pp.1–2; no calendar receipt date printed in that PDF. |
| Original Sprint 2 review boundary | 3 October | Original scope remains 43 SP. Customer changes do not become retroactive original defects. |
| Sprint 3 planning/start | 4 October | Start/planning date reported; scope was reported not finalised then. |
| Source inspection and impact assessment | 15 October | Preserved preparation record; not the customer receipt date. |
| Delegated selection and rebalance | 16 October | Initial 97/29 split superseded by 63 SP in each of Sprints 3 and 4. Individual team votes are Not recorded. |
| Requirement/traceability reconciliation | 17 October | Preserved original criteria and restored existing no-automatic-rejection safeguards; no added scope/points. |
| Later implementation, repair and test evidence | 19 October–2 November | Dated records in the [testing report](../testing/README.md) and sprint evidence indexes; these do not change the earlier planning dates. |

## Current change-to-backlog and sprint map

| Change | Required behaviour and affected baseline | Story / points | Sprint | AC and evidence route |
| --- | --- | --- | --- | --- |
| CR-1 — venue buffers | Include setup/turnaround in venue occupancy, availability and conflicts; preserve affected bookings rather than silently deleting them | KAN-77 2 + KAN-78 8 | 3 | Sprint 3 cards; venue interval/locking diagrams; original KAN-50/51/12/52/53/8/54/55 regression |
| CR-2 — outages after booking | Record unavailability, identify approved arrangements requiring recovery, release impacted holds and notify current responsible coordinators | KAN-81 8 | 3 | Sprint 3 card; outage/replacement and concurrent approval checks |
| CR-3 — independent venue arrangements | Assess each arrangement's actual interval/layout/requirements and isolate cancellation/replacement from other arrangements | KAN-82 5 | 4 | Sprint 4 card; two-venue isolation and arrangement-specific advisory checks |
| CR-4 — temporary holds | Explicit live holds reserve capacity until release/expiry; ordinary pending requests remain non-reserving | KAN-83 8 | 3 | Sprint 3 card; boundary, replay, approval/expiry race and background-job evidence |
| CR-5 — Lead queue | Newly submitted events enter an unassigned queue; trusted Leads assign/reassign; preserve original KAN-29 history | KAN-79 8; existing KAN-65 3 counted once | 3 | Sprint 3 cards; trusted roles, stale assignment, handover and scoped notifications |
| CR-6 — operational safety | Safety Officer review, revision-bound outcomes, remediation and preparation gate; distinct from initial event approval and advisory suitability | KAN-84 8 | 4 | Sprint 4 card; three decisions, changed arrangements, stale approval and restoration checks |

These **seven new stories add 47 SP**, allocated 34 SP to Sprint 3 and 13 SP to Sprint 4. New scope is distinguished from the five original-scope S2 carry-overs (19 SP) and the earlier KAN-60 correction (2 SP). Current criteria: [Sprint 3](../scrum/sprint-03/sprint-backlog.md) and [Sprint 4](../scrum/sprint-04/sprint-backlog.md). Current verification: [testing report](../testing/README.md). Formal Sprint 4/release acceptance remains Not assessed.

## Original notification scope split (not a new customer requirement)

KAN-64's original 8 SP were decomposed before implementation into KAN-64 (5 SP, request/assignment/venue notifications) and KAN-80 (3 SP, equipment/lifecycle/change/registration notifications). The total remains 8 SP. KAN-64 uses AC201–209 to avoid changing the meaning of older criterion IDs. CR-specific outage, hold and safety notices remain in their owning change stories. The [original criterion crosswalk](archive/2026-11-05/change-requests.md#original-notification-scope-split-not-a-new-customer-requirement) preserves the allocation of every trigger.

KAN-80's significant-change submission is the request for coordinator action, as clarified on 29–30 October. It does not introduce an extra request-for-action workflow. See the [dated decision](assumptions-and-questions.md#29-october-2026--kan-80-change-action-and-recipient-interpretation).

## Baseline and change classification

| Situation | Treatment | Accounting |
| --- | --- | --- |
| Original work unfinished | Carry the original story under the agreed team rule | Full original points; zero delivery credit in the incomplete sprint |
| Missed/broken AC in accepted work | Reopen the original story and retain its acceptance history | Estimate remaining repair work; record the change |
| Additional/replacement customer behaviour | New linked story identifies affected and superseded criteria | Estimate the additional scope separately |
| Clarification of an existing rule | Update wording/traceability with the source and effective scope | No automatic point increase |

Original KAN-29 automatic assignment and pre-buffer venue criteria remain valid historical requirements. Current Lead assignment and buffer rules have explicit change links. KAN-12-AC102 and KAN-52-AC102 restore existing safeguards: no matching/suitable venue does not automatically reject the event. This correction adds no story or points.

## Design and test impact

The [architecture report](../architecture/README.md) explains the changed responsibilities and transaction boundaries. The [traceability register](traceability.csv) maps stories and ACs to cases and executable tests. Separate execution records retain original checks, later regressions, repairs and retests. A planned test or a mapped case does not establish acceptance.

## Estimate and release effect

Unique parent scope is **174 SP = 127 original + 47 customer-change SP**. Later carry-over does not add the same story twice. The retained KAN-15 2→5 re-estimate and KAN-64 8→5 plus KAN-80 3 split are explicit in the historical records. The final selected S3/S4 allocation is **63/63**, superseding **97/29**. See [release accounting](../scrum/release-burndown.md) for reported acceptance and evidence limitations.

## Historical records

[Preserved document before cleanup](archive/2026-11-05/change-requests.md). These dated records remain supporting evidence.

<details>
<summary>Links retained for earlier references</summary>

<a id="reading-historical-and-current-requirements--17-october-2026"></a>
[Reading historical and current requirements — 17 October 2026](archive/2026-11-05/change-requests.md#reading-historical-and-current-requirements--17-october-2026)

<a id="release-reconstruction-and-balanced-allocation--16-october-2026"></a>
[Release reconstruction and balanced allocation — 16 October 2026](archive/2026-11-05/change-requests.md#release-reconstruction-and-balanced-allocation--16-october-2026)

<a id="design-and-test-impact-planned-work"></a>
[Design and test impact (planned work)](archive/2026-11-05/change-requests.md#design-and-test-impact-planned-work)

<a id="earlier-delegated-disposition--16-october-2026-superseded-allocation"></a>
[Earlier delegated disposition — 16 October 2026 (superseded allocation)](archive/2026-11-05/change-requests.md#earlier-delegated-disposition--16-october-2026-superseded-allocation)

<a id="preserved-preparation-record"></a>
[Preserved preparation record](archive/2026-11-05/change-requests.md#preserved-preparation-record)

<a id="preparation-summary--historical"></a>
[Preparation summary — historical](archive/2026-11-05/change-requests.md#preparation-summary--historical)

<a id="cr-1--venue-setup-and-turnaround-time"></a>
[CR-1 — Venue setup and turnaround time](archive/2026-11-05/change-requests.md#cr-1--venue-setup-and-turnaround-time)

<a id="cr-2--venue-becomes-unavailable-after-booking"></a>
[CR-2 — Venue becomes unavailable after booking](archive/2026-11-05/change-requests.md#cr-2--venue-becomes-unavailable-after-booking)

<a id="cr-3--multiple-venues-for-one-event"></a>
[CR-3 — Multiple venues for one event](archive/2026-11-05/change-requests.md#cr-3--multiple-venues-for-one-event)

<a id="cr-4--tentative-venue-holds-expire"></a>
[CR-4 — Tentative venue holds expire](archive/2026-11-05/change-requests.md#cr-4--tentative-venue-holds-expire)

<a id="cr-5--event-coordinator-lead-and-assignment-queue"></a>
[CR-5 — Event Coordinator Lead and assignment queue](archive/2026-11-05/change-requests.md#cr-5--event-coordinator-lead-and-assignment-queue)

<a id="cr-6--safety-officer-and-operational-feasibility-check"></a>
[CR-6 — Safety Officer and operational feasibility check](archive/2026-11-05/change-requests.md#cr-6--safety-officer-and-operational-feasibility-check)

<a id="cr-1-kan-78-delivery-reconciliation--25-october-2026"></a>
[CR-1 KAN-78 delivery reconciliation — 25 October 2026](archive/2026-11-05/change-requests.md#cr-1-kan-78-delivery-reconciliation--25-october-2026)

<a id="25-october-2026--arvin-contribution-reconciliation-sprints-13"></a>
[25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)](archive/2026-11-05/change-requests.md#25-october-2026--arvin-contribution-reconciliation-sprints-13)

<a id="25-october-2026--current-integration-and-notification-ownership"></a>
[25 October 2026 — Current integration and notification ownership](archive/2026-11-05/change-requests.md#25-october-2026--current-integration-and-notification-ownership)

</details>
