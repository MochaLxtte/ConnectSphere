# Venue search

## Purpose

**User story:** As an Event Coordinator, I want to search and filter venues using an event's requirements so that I can identify potential venues efficiently.

Venue search helps a coordinator shortlist venues. It is a **read-only aid to a manual decision**. A search that finds no venue never rejects, changes or blocks an event request.

## Who can use it

Only users with the `EVENT_COORDINATOR` role. Everyone else is refused:

| Layer                          | What happens for another role                                                  |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Navigation (`AppShell`)      | The "Search Venues" link is hidden                                             |
| Page (`VenueSearchPage.vue`) | Shows "This page is for event coordinators." and runs no search                |
| Route (`venue-router.ts`)    | Only`EVENT_COORDINATOR` is allowed: 401 when signed out, 403 for other roles |
| Service (`venue-search.ts`)  | Refuses the call before any database query                                     |

The route and service checks are the real protection. The page and navigation checks only control what is visible.

## Acceptance criteria

| #   | Criterion                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | The coordinator can search/filter by date and time, expected attendance, location, capacity, accessibility, supported room layout and required facilities                                                 |
| AC2 | Search results reflect the current venue catalogue                                                                                                                                                        |
| AC3 | Results correspond to the filters selected. A venue that fails an applied filter is excluded, and the system clearly says when no venue matches. No match does not automatically reject the event request |
| AC4 | Users not authorised to perform venue planning cannot access the protected planning functionality                                                                                                         |
| AC5 | The coordinator can change or clear filters and see the updated results                                                                                                                                   |
| AC6 | Each result clearly identifies its venue                                                                                                                                                                  |

## How a search works

1. The coordinator opens `/venues`. The page loads the filter choices and shows all active venues.
2. The coordinator sets filters and presses **Search venues**, or **Clear filters** to reset them.
3. The page calls `GET /api/venues/search-venues`.
4. The backend returns the active venues that satisfy **every** applied filter. Filters left empty are ignored.
5. The page lists the venues, or shows "No venue matches these filters".

## Filters and matching rules

| Filter                | Rule                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| Expected attendance   | Venue`capacity` must be at least this number                                      |
| Minimum capacity      | Venue`capacity` must be at least this number. If both are set, the larger applies |
| Location              | Case-insensitive text match on the venue`name` and `location`                   |
| Room layout           | The chosen layout must be in the venue's`layouts`                                 |
| Required facilities   | The venue's`facilities` must contain **all** selected values                |
| Accessibility         | The venue's`accessibility_features` must contain **all** selected values    |
| Wheelchair accessible | `wheelchair_accessible` must be true                                              |
| Event start and end   | See "Date and time" below. Both must be given, or neither                           |

Only venues with `is_active = true` are searched.

### Date and time

Opening hours are evaluated in **Singapore time (UTC+8)** against the supplied date-time instants. The event uses the venue continuously from start to end, so a venue must pass all checks:

1. **Opening hours** (`opens_at`, `closes_at` on `venues`):
   - An event inside one calendar day must start no earlier than `opens_at` and end no later than `closes_at`. Either bound may be unset.
   - An event that crosses a daily closed period is excluded. A venue with no opening hours, or explicit `00:00` to `24:00` hours, can accommodate an overnight or multi-day interval.
   - A missing opening bound means `00:00`; a missing closing bound means `24:00`. An event ending exactly at midnight occupies only the preceding day because the interval is half-open.
   - Search shares the whole-interval hours helper with KAN-52 suitability. Filtering retains database seconds and fractional seconds; the API continues displaying hours as `HH:MM`.
2. **Bookings** (`venue_bookings`): the venue must have no `APPROVED` booking that overlaps the event. Overlap is half-open, so a booking that ends exactly when the event starts does not conflict.
3. **Operational blocks** (`venue_unavailability`): no recorded block may overlap the interval. The same half-open boundary applies.

`PENDING`, `REJECTED` and `CANCELLED` bookings do not block a venue. This matches the database's `venue_bookings_conflict` trigger, which only guards `APPROVED` rows.

**Example:** a search from 20 Oct 2026 2pm to 23 Oct 2026 8pm returns only continuously open venues with no approved booking or operational block in that period.

Catalogue rows, approved bookings and blocks are read in one SQL snapshot. Table references respect the connection's search path, including isolated test schemas. Opening hours are then checked against those same returned rows, without a second database read.

## API

All endpoints require a signed-in coordinator.

### `GET /api/venues/search-venues`

| Query parameter                   | Type                     | Notes                                                 |
| --------------------------------- | ------------------------ | ----------------------------------------------------- |
| `startsAt`, `endsAt`          | ISO 8601 date-time       | Both or neither.`endsAt` must be after `startsAt` |
| `attendance`, `capacity`      | whole number >= 1        |                                                       |
| `location`                      | text, max 100 characters |                                                       |
| `layout`                        | text                     |                                                       |
| `wheelchairAccessible`          | `true` or `false`    |                                                       |
| `accessibility`, `facilities` | text, repeated           | e.g.`?facilities=Projector&facilities=Wi-Fi`        |

Empty values are treated as not supplied.

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid", "name": "Harbourfront Hall", "description": null, "location": "Marina Bay",
      "capacity": 300, "layouts": ["THEATRE"], "facilities": ["WIFI"],
      "accessibilityFeatures": ["Lift"], "wheelchairAccessible": true,
      "opensAt": "08:00", "closesAt": "22:00", "updatedAt": "2026-10-01T02:00:00.000Z"
    }
  ]
}
```

An empty `items` array means no venue matched. It is not an error.

| Status                      | Meaning                                |
| --------------------------- | -------------------------------------- |
| 400`INVALID_VENUE_SEARCH` | A parameter is malformed               |
| 401                         | Not signed in                          |
| 403                         | Signed in but not an event coordinator |

### `GET /api/venues/filter-options`

Returns `{ "layouts": [], "facilities": [], "accessibility": [] }`: the distinct values found on active venues, used to fill the filter controls.

## Data used

| Table                     | Columns used                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.venues`         | `id`, `name`, `description`, `location`, `capacity`, `layouts`, `facilities`, `accessibility_features`, `wheelchair_accessible`, `opens_at`, `closes_at`, `is_active`, `updated_at` |
| `public.venue_bookings` | `venue_id`, `status`, `starts_at`, `ends_at`                                                                                                                                                          |
| `public.venue_unavailability` | `venue_id`, `starts_at`, `ends_at` |

Search only reads. It never writes to any table, including `event_requests`.

## Code map

| File                                                       | Role                                                |
| ---------------------------------------------------------- | --------------------------------------------------- |
| `backend/src/modules/venues/venue-search.ts`             | Query validation and catalogue/conflict query |
| `backend/src/modules/venues/suitability-rules.ts`        | Shared whole-interval opening-hours check |
| `backend/src/modules/venues/venue-router.ts`             | The two endpoints, restricted to coordinators       |
| `backend/test/venues/venue-search.test.ts`               | Automated tests                                     |
| `database/tests/venues/venue-search.integration.test.ts` | Real PostgreSQL exclusions and opening-hours boundaries |
| `frontend/src/features/venues/api/venues.ts`             | Builds the request and calls the API                |
| `frontend/src/features/venues/pages/VenueSearchPage.vue` | The page: filters, results, empty and error states  |
| `frontend/src/components/AppShell.vue`                   | The "Search Venues" navigation link                 |
| `frontend/src/app/router.ts`                             | The `/venues` route                                |

## Known limitations and assumptions

- Layouts have no per-layout capacity, so a layout filter only checks that the layout is supported.
- Only `APPROVED` bookings and operational blocks hold a venue. Pending requests do not reserve it.
- Singapore time is fixed at UTC+8 (no daylight saving).
- Opening hours are treated as the same every day of the week.
- Search runs on request. There is no result paging, so a very large catalogue would return every match.

## Running the tests

From the repository root:

```powershell
npm.cmd run test --workspace @connectsphere/backend -- test/venues/venue-search.test.ts
```

With `TEST_DATABASE_URL` pointing to a dedicated local PostgreSQL test database:

```powershell
npm.cmd run test:integration -- database/tests/venues/venue-search.integration.test.ts
```

See [venue-search-test-cases.md](../../../test/venues/venue-search-test-cases.md) for coverage and manual checks. Local tests do not establish hosted acceptance or GitHub CI results.
