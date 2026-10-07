# Architecture

ConnectSphere uses one Git repository, one Vue frontend, one Express backend, Supabase PostgreSQL and Supabase Auth. The backend is a modular monolith: domain modules run in the same process and database transaction boundary. The team selected this structure during Sprint 1 planning to keep development and integration manageable across the six workstreams. Supabase was selected for database hosting on 8 September 2026; its authentication integration is recorded in the 15 September decision log.

## C4 system context

The context diagram describes the intended first release. Implemented today: organiser draft creation, editing and submission, automatic and initial manual coordinator assignment, clarification, review decisions and read-only status history. KAN-51 provides the internal availability calendar and KAN-12 venue search is integrated. KAN-8 adds staff booking decisions and assigned-coordinator outcomes. KAN-52 now provides read-only event-specific suitability and KAN-55 provides Venue Staff block management. KAN-53 booking submission is integrated on this branch on 5 October with current reservation/block checks. Catalogue maintenance remains absent; equipment, registration and notification workflows remain to implement; migration 004 provides their tables and guards, and Sprint 2 builds the venue stories. The test evidence register separates local automated results from the hosted Sprint 1 observations below; the diagram does not imply acceptance. Final confirmation, cancellation/completion, reassignment and notification generation are deferred after the 30 September audit. Venue Staff, Technical Support Staff and Attendee accounts still need provisioning in Supabase Auth and linking through `app_users.supabase_user_id`.

The organiser's approved outcome and rejected status/reason remained visible after refresh in the 17 September hosted check (MAN-20260917-01). Reopening a request URL after sign-out showed a sign-in prompt without request details or the review reason (MAN-20260917-02). Draft and Submitted detail statuses and their no-decision messages also passed (MAN-20260917-03). A second organiser received the unavailable/no-permission message for the first organiser's request and saw an empty request list (MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). The remaining submission-to-status check is in the [test evidence](../testing/test-evidence.md).

```mermaid
flowchart LR
  organiser["Event Organiser<br/>Provides requests and manages own events"]
  coordinator["Event Coordinator<br/>Reviews and coordinates assigned events"]
  venue["Venue Staff<br/>Maintains venues and decides bookings"]
  technical["Technical Support Staff<br/>Arranges equipment"]
  attendee["Attendee<br/>Registers and withdraws"]
  system["ConnectSphere<br/>Event planning and venue booking system"]
  identity["Supabase Auth<br/>External identity service"]
  organiser -->|Requests and changes| system
  coordinator -->|Review and planning| system
  venue -->|Venue availability and booking decisions| system
  technical -->|Availability and reservations| system
  attendee -->|Event registration| system
  system -->|Sign-in and token verification| identity
```

## C4 containers

```mermaid
flowchart LR
  user["User<br/>One of five application roles"]
  identity["Supabase Auth<br/>Email/password sign-in and signing keys"]
  subgraph boundary["ConnectSphere system boundary"]
    web["Web application<br/>Vue 3, TypeScript, Vite<br/>Pages and API client"]
    api["API application<br/>Express 5, TypeScript<br/>Authorization and business rules"]
    db[("Database<br/>Supabase PostgreSQL<br/>Persistent application records")]
  end
  user -->|Uses browser| web
  web -->|HTTP JSON /api| api
  web -->|HTTPS credential exchange| identity
  api -->|HTTPS public signing keys| identity
  api -->|SQL via pg over TLS| db
```

In local development Vite proxies `/api` to Express; the browser needs no database credentials or direct database access. Supabase hosts PostgreSQL, while the frontend and API run locally. Deployment of the frontend and API is not configured. Plan HTTPS and same-origin API routing when deployment enters scope.

Application tables remain in the `public` schema. Supabase's unused Data API is disabled; the hardening migration enables row-level security and removes Data API roles' access to application tables. Express uses its server database connection for application reads/writes and enforces roles, ownership and coordinator assignment. Supabase Auth remains available independently of the Data API.

The browser obtains a Supabase access token through sign-in and exchanges it at `POST /api/auth/login`. Express verifies the token and stores it in an HttpOnly session cookie, revalidating it for later API calls. The token subject maps through `app_users.supabase_user_id` to the application's trusted ID and role. Session lifetime follows the token's expiry; automatic session refresh is not implemented. Public signing keys are retrieved from the project's JWKS; the backend-only HS256 secret is an optional compatibility path for legacy projects.

## Module boundaries

| Area          | Responsibility                                                        | Current state                                    |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| auth          | Identity, session lifecycle, role and event access policies           | Supabase sign-in, token verification, mapped profiles and sessions |
| events        | Requests, drafts, initial assignment, review and status | Draft creation/edit/submit, shared detail, coordinator queue and decisions, automatic allocation, initial manual assignment, review start, clarification and read-only status history. Later lifecycle writes, reassignment and significant changes are deferred. Dated validation is in the test evidence register. |
| venues        | Catalogue, suitability, availability, booking decisions and conflicts | Tables and the booking-conflict trigger exist in migration 004. The read-only KAN-51 availability calendar (`GET /api/venues/availability`, `/venues/availability`) is implemented with automated tests for the three internal roles; hosted acceptance and peer review remain. KAN-12 search and KAN-8 pending-booking decisions/outcomes are integrated. KAN-8 rechecks conflicts during approval; KAN-52 assesses latest event/venue data with explicitly interpreted requirements and explained tri-state checks; KAN-55 creates/lists/removes operational blocks. KAN-53 now creates pending bookings after current approved-booking/block checks under the venue lock. KAN-50 remains absent; full KAN-54 acceptance, policy review and hosted workflow evidence remain pending |
| equipment     | Requests, quantity availability, reservations                         | Tables and the pooled-peak trigger exist in migrations 004/005; no services or pages. Planned |
| registrations | Attendee eligibility, registration and withdrawal                     | Tables and the capacity trigger exist in migration 004; no services or pages. Planned |
| notifications | Relevant recipients and notification delivery                         | Historical table retained; no writer, inbox route or page. Future KAN-64 work |

Keep controllers thin: parse requests and call services. Services own permissions and workflow consistency; repositories own parameterized SQL. Add subfolders when real files justify them rather than pre-creating empty controller/service/repository trees. Avoid a global bucket of unrelated utilities. Cross-domain workflows should call explicit services and share a transaction when several reservations or statuses must change together.

The backend is currently laid out under `backend/src/modules/`; see its README for paths. Database migrations live at root in `database/` to make shared schema changes visible to all workstreams. Documentation and tests live with their consumers. Add C4 component views when components exist; these context/container views are a baseline, not a completed final design submission.

## ERD

Migrations 001–003 provide the Sprint 1 request/authentication foundation. Migration 004 adds the
broader first-release tables, 005 corrects the equipment availability guard and 006 adds
automatic coordinator assignment fields. The diagram omits
housekeeping timestamps, migration metadata and the unused legacy auth fields/tables.
[docs/database-diagram.md](../database-diagram.md) holds the full generated diagram of
the live `public` schema, including every foreign key this curated view leaves out.

### Sprint 1 request workflow

```mermaid
erDiagram
  APP_USERS ||--o{ EVENT_REQUESTS : organises
  APP_USERS o|--o{ EVENT_REQUESTS : coordinates
  EVENT_REQUESTS ||--o{ EVENT_CLARIFICATIONS : has
  EVENT_REQUESTS ||--o{ EVENT_REVIEWS : has
  EVENT_REQUESTS ||--o{ EVENT_STATUS_HISTORY : records
  EVENT_REQUESTS ||--o{ COORDINATOR_ASSIGNMENTS : "assigned through"
  APP_USERS ||--o{ EVENT_CLARIFICATIONS : requests
  APP_USERS ||--o{ EVENT_REVIEWS : reviews
  APP_USERS ||--o{ COORDINATOR_ASSIGNMENTS : coordinates
  APP_USERS {
    uuid id PK
    text email UK
    text role
    uuid supabase_user_id UK "nullable until account provisioned"
    boolean coordinator_available "default false; explicit automatic-allocation opt-in"
  }
  EVENT_REQUESTS {
    uuid id PK
    uuid organiser_id FK
    uuid coordinator_id FK "nullable; current assignment"
    text status "nine states"
    text name "draft fields nullable"
    timestamptz starts_at
    timestamptz ends_at
    integer expected_attendance
    boolean registration_required
    integer registration_capacity "nullable; NULL is unlimited"
    timestamptz registration_opens_at
    timestamptz registration_closes_at
  }
  EVENT_CLARIFICATIONS {
    uuid id PK
    uuid event_request_id FK
    uuid requested_by FK
    text message
    text response "nullable until answered"
  }
  EVENT_REVIEWS {
    uuid id PK
    uuid event_request_id FK
    uuid reviewed_by FK
    text decision
    text reason "nullable"
  }
  EVENT_STATUS_HISTORY {
    uuid id PK
    uuid event_request_id FK
    text from_status "null on insert"
    text to_status
    uuid changed_by FK "from app.actor_id"
  }
  COORDINATOR_ASSIGNMENTS {
    uuid id PK
    uuid event_request_id FK
    uuid coordinator_id FK
    uuid assigned_by FK "null only for automatic assignment"
    text assignment_method "AUTOMATIC or MANUAL"
    timestamptz unassigned_at "nullable; one active row per request"
  }
```

### Venues, equipment, registration and notifications

```mermaid
erDiagram
  EVENT_REQUESTS ||--o{ VENUE_BOOKINGS : reserves
  EVENT_REQUESTS ||--o{ EQUIPMENT_REQUESTS : needs
  EVENT_REQUESTS ||--o{ EVENT_REGISTRATIONS : "opens to"
  EVENT_REQUESTS ||--o{ EVENT_CHANGE_REQUESTS : "amended by"
  EVENT_REQUESTS o|--o{ NOTIFICATIONS : concerns
  VENUES ||--o{ VENUE_BOOKINGS : "booked as"
  VENUES ||--o{ VENUE_UNAVAILABILITY : blocks
  EQUIPMENT_TYPES ||--o{ EQUIPMENT_REQUESTS : "drawn from"
  APP_USERS ||--o{ EVENT_REGISTRATIONS : attends
  APP_USERS ||--o{ NOTIFICATIONS : receives
  VENUES {
    uuid id PK
    text name UK
    integer capacity
    text_array layouts
    text_array facilities
    text_array accessibility_features
    boolean wheelchair_accessible
    time opens_at "nullable operating hours"
    time closes_at
    boolean is_active
  }
  VENUE_UNAVAILABILITY {
    uuid id PK
    uuid venue_id FK
    timestamptz starts_at
    timestamptz ends_at
    text reason "nullable"
  }
  VENUE_BOOKINGS {
    uuid id PK
    uuid event_request_id FK
    uuid venue_id FK
    uuid requested_by FK
    text status "PENDING APPROVED REJECTED CANCELLED"
    timestamptz starts_at
    timestamptz ends_at
    text layout "nullable"
    uuid decided_by FK "set with decided_at on a decision"
  }
  EQUIPMENT_TYPES {
    uuid id PK
    text name UK
    text category "nullable"
    integer total_quantity "pooled by type"
    boolean is_active
  }
  EQUIPMENT_REQUESTS {
    uuid id PK
    uuid event_request_id FK
    uuid equipment_type_id FK
    uuid requested_by FK
    integer quantity
    text status "REQUESTED RESERVED REJECTED CANCELLED"
    timestamptz starts_at
    timestamptz ends_at
    uuid decided_by FK "set with decided_at on a decision"
  }
  EVENT_REGISTRATIONS {
    uuid id PK
    uuid event_request_id FK
    uuid attendee_id FK
    text status "REGISTERED WITHDRAWN"
    timestamptz withdrawn_at "nullable"
  }
  EVENT_CHANGE_REQUESTS {
    uuid id PK
    uuid event_request_id FK
    uuid requested_by FK
    text status "PENDING APPROVED REJECTED WITHDRAWN"
    jsonb proposed_changes "non-empty object of event fields"
    text reason
    uuid decided_by FK "nullable until decided"
  }
  NOTIFICATIONS {
    uuid id PK
    uuid recipient_id FK
    uuid event_request_id FK "nullable"
    text type
    text title
    timestamptz read_at "nullable until read"
  }
```

Database triggers enforce the invariants that concurrent requests could otherwise break:
the status-history record, one approved booking per venue and period, the pooled equipment
peak, and the registration capacity. Roles, ownership and transition validity remain
service responsibilities; `event_registrations` is unique per attendee and event.

Numbered migrations define the reproducible local and CI schema; coordinate equivalent dashboard changes in the shared Supabase project with Arvin. The ERD omits housekeeping fields, migration metadata and unused legacy auth fields/tables. Credentials are managed by Supabase Auth; the nullable historical `password_hash` field is not used by the current authentication code. Role checks, event ownership, transition validity and atomic decisions belong to services, with database constraints providing additional integrity.

## Decisions and tradeoffs

- Use one repository and modular backend to keep setup and integration manageable for six developers. There are no independently deployed business services.
- Use TypeScript across Vue and Express for consistent types and tooling. HTTP contracts still need runtime validation; static types do not validate user input.
- Use hosted Supabase PostgreSQL and explicit SQL migrations for visible schema changes and future reservation transactions. Retain `pg` and the Express service boundary. The small migration runner is forward-only, transactional, checksummed, and tested for repeat execution. Evaluate a fuller migration tool if lifecycle needs grow.
- Use a direct database connection where the network supports it, or the session pooler on port 5432 for IPv4 development. Connections verify TLS certificates. Compose remains available for optional local databases and isolated tests; GitHub Actions uses its own temporary PostgreSQL service.
- Coordinate changes against the shared development database. A feature branch isolates code, but it does not isolate Supabase tables or data. Keep schema changes in migrations and agree their order before applying them.
- Keep credentials out of the repository. Seed profiles have no login credentials; provision Supabase Auth accounts and map them to application profiles through `app_users.supabase_user_id` before sign-in, including the Venue Staff, Technical Support Staff and Attendee accounts the new routes need. `database/seed.ts` also adds fictional venues once migration 004 has run; equipment sample generation is removed. All mounted routes verify the application session.
- Use current coordinator assignment as the relationship rule. `event_requests.coordinator_id` refers to `app_users.id`, not the Supabase UUID. Recheck this assignment with the locked row when recording a decision. KAN-29 now selects an available coordinator on submission using the fewest active requests and ascending UUID order. Status, current coordinator and automatic history commit together; no eligible coordinator leaves an editable draft. Migration 006 adds explicit availability and distinguishes automatic history from manual actors. See the [allocation contract](api-contract.md#kan-29-automatic-assignment-on-submission) and [implementation choices](../requirements/assumptions-and-questions.md#28-september-2026--kan-29-implementation-choices). The separate initial manual workflow permits a coordinator to assign an unassigned non-draft request to themselves or another coordinator. Existing assignments cannot be handed over through the application; KAN-65 and its unresolved policy remain future work.
- Keep optional draft values nullable. Do not reuse draft validation as submission validation. Record confirmed required fields in the clarification log.
- Use the nine statuses defined by migration 004: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `REJECTED`, `CONFIRMED`, `CANCELLED` and `COMPLETED`. The six Sprint 1 statuses are unchanged; the migration adds the three later lifecycle states. Implemented transitions are draft submission, review start, clarification and its answer, and initial approval/rejection. Later status values remain readable for compatibility with existing records and KAN-29 workload counting; the application cannot confirm, cancel or complete events. Request approval remains distinct from future final confirmation.
- A coordinator may record an initial decision from `SUBMITTED` or `UNDER_REVIEW`, so starting a review does not block the decision it precedes. A pending clarification must be answered first, which returns the request to `SUBMITTED`.
- The 26 September scope correction removed the broader venue, equipment, registration, change-request and notification feature modules. Their schema and database guards remain, but do not establish working interfaces or accepted stories. The 4 October integration adds KAN-12 search, KAN-51 availability and KAN-8 booking decisions within Sprint 2 scope. Equipment, attendee registration, change requests and notification application workflows remain absent.

Record significant changes in the [decision log](../requirements/assumptions-and-questions.md), including context, options, the chosen approach, consequences, linked stories and any superseded decision. Keep implementation assumptions separate from customer clarifications.
