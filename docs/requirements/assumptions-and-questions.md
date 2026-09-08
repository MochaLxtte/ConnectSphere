# Assumptions and customer questions

These items are unresolved unless a dated decision is added. The proposed defaults in architecture or code are team choices until validated; they do not replace customer requirements. Discuss customer questions through the clarification process for this team's section.

| ID   | Decision needed                                                                                                                       | Why it matters                                                     | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| Q-01 | How are accounts created, roles assigned, and organisation membership established?                                                    | Avoid giving users a way to grant themselves staff access.         | Open   |
| Q-02 | Who may see unassigned events, assign or reassign coordinators, and access another coordinator's events?                              | Role alone is insufficient for authorization.                      | Open   |
| Q-03 | Which fields are mandatory for submission, and what may remain incomplete in a draft?                                                 | Draft and submission validation differ.                            | Open   |
| Q-04 | What are the event states, allowed transitions and actors, clarification/resubmission behavior, and confirmation prerequisites?       | Status changes must match real actions.                            | Open   |
| Q-05 | Which post-submission fields may be edited directly, and which require a reviewed change request?                                     | Prevent silent changes to approved arrangements.                   | Open   |
| Q-06 | How many venues may an event use? Do pending requests or tentative holds consume availability?                                        | Determines the booking model and conflict policy.                  | Open   |
| Q-07 | What timezone, interval boundary, setup/turnaround, operating-hour and blocked-period rules apply?                                    | Adjacent bookings can otherwise produce inconsistent availability. | Open   |
| Q-08 | How do layouts, capacity, accessibility and required facilities affect suitability? Are overrides permitted?                          | An available room may still be unsuitable.                         | Open   |
| Q-09 | Is equipment pooled by type or tracked individually? How do location, maintenance and substitutions work?                             | Determines availability and reservation granularity.               | Open   |
| Q-10 | What makes an event discoverable and open for registration? What capacity, duplicate, withdrawal and registration-period rules apply? | Registration must remain consistent with event arrangements.       | Open   |
| Q-11 | After a date, attendance, venue or equipment change, which reservations and registrations are retained, released or reapproved?       | Changes must not leave stale commitments.                          | Open   |
| Q-12 | Who may cancel or complete an event, and what resources must cancellation release?                                                    | Event lifecycle affects other core features.                       | Open   |
| Q-13 | Which actions notify which users, using which channel? Is read status or delivery retry required?                                     | Avoid missing recipients or exposing unrelated event details.      | Open   |
| Q-14 | Which important actions need audit records, who may inspect them, and what information must be retained?                              | Auditability is requested without a detailed policy.               | Open   |

## 8 September 2026 — Hosted PostgreSQL

**Decision:** Use Supabase to host the development PostgreSQL database. The application keeps its Vue → Express → PostgreSQL structure, with Express using the PostgreSQL driver for database access.

**Implementation arrangements:**

- Use the documented Supabase session-pooler connection, or a direct connection where supported, with verified TLS. Store credentials in local environment configuration; do not commit them or place them in the Vue application.
- Disable the Supabase Data API for this application. Protect application tables with the reviewed row-level-security and privilege migration as an additional boundary. Express remains responsible for checking the authenticated actor's role and relationship to each event.
- Coordinate migration order and fixture changes on a shared development project. Apply ordered migrations without editing a migration already applied; keep existing event data intact. Use only synthetic development data.
- Keep automated database tests isolated. PostgreSQL 17 remains the CI test database; Docker Compose is available for an optional local test database. Test success there does not establish that a hosted connection or project settings have been verified.

**Affected work:** KAN-24 covers hosted connection setup, migration/seed reproducibility and database integration evidence. KAN-25 still needs an explicit decision on authentication, account provisioning and identity mapping. Selecting Supabase for PostgreSQL does not by itself select Supabase Auth or resolve Q-01/Q-02.

**Sprint impact:** The original 6 September commitment remains ten PBIs and 32 points, including KAN-24 at 5 points. This is a technical implementation decision; no scope, point or completion change has been recorded. Hosted setup and project-setting checks remain to be evidenced.

## Decision record template

Copy this block when the team receives an answer or adopts an explicit implementation assumption. Keep superseded decisions so later changes remain explainable.

```text
Question ID:
Decision and rationale:
Kind: customer clarification / team implementation assumption
Source and date:
Affected story and acceptance-criterion IDs:
Affected implementation and tests:
Supersedes, if any:
```
