# Venue search: test cases

Automated tests live in `backend/test/venues/venue-search.test.ts`. Each test name starts with its ID and `[acceptance criterion, test type]`, for example `TC-VS-07 [AC3, negative]`. The criteria (AC1 to AC6) are listed in [venue-search.md](venue-search.md).

## Test types

| Type               | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| **Positive** | Valid input; the expected result is returned                            |
| **Negative** | Invalid input is rejected, or a venue that should not match is excluded |
| **Boundary** | A value exactly at a limit, or a time-zone edge                         |
| **Security** | A user without permission is refused                                    |

## Coverage summary

| Criterion                                                      | Automated      | Manual        | Types                        |
| -------------------------------------------------------------- | -------------- | ------------- | ---------------------------- |
| AC1 Search/filter by criteria                                  | TC-VS-01 to 03 | M01, M08, M11 | positive, negative           |
| AC2 Current catalogue                                          | TC-VS-04, 05   | M10           | positive                     |
| AC3 Results match filters, exclusion, no-match, no auto-reject | TC-VS-06 to 20 | M05, M09      | positive, negative, boundary |
| AC4 Authorisation                                              | TC-VS-21       | M06, M07      | security                     |
| AC5 Change or clear filters                                    | TC-VS-22, 23   | M02, M03      | positive                     |
| AC6 Result identifies venue                                    | TC-VS-24       | M04           | positive                     |

## Automated test cases

| ID       | AC  | Type     | What it checks                                                                                                | Expected result                                                                                                      |
| -------- | --- | -------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-VS-01 | AC1 | Positive | A query with date/time, attendance, capacity, location, layout, accessibility, wheelchair and facilities      | Every value is accepted and normalised (dates to UTC, text trimmed)                                                  |
| TC-VS-02 | AC1 | Negative | Five bad inputs: start without end, end before start, non-numeric attendance, capacity 0, wheelchair`maybe` | Each is rejected with a clear message                                                                                |
| TC-VS-03 | AC1 | Positive | A search with every filter set, attendance 100 and capacity 150                                               | All filters reach the database query; the larger number (150) is used                                                |
| TC-VS-04 | AC2 | Positive | Two searches in a row while the catalogue changes between them                                                | The second search returns the new data; only active venues are read from`public.venues`                            |
| TC-VS-05 | AC2 | Positive | Loading the filter choices                                                                                    | Layouts, facilities and accessibility values come from the live catalogue                                            |
| TC-VS-06 | AC3 | Positive | A search with no filters                                                                                      | Neutral parameters are sent, nothing is excluded, and no booking query runs                                          |
| TC-VS-07 | AC3 | Negative | A venue with an approved booking overlapping the event                                                        | That venue is excluded; the booking query uses the event's start and end, status`APPROVED` and a half-open overlap |
| TC-VS-08 | AC3 | Negative | A venue open 09:00 to 17:00 searched for 18:00 to 20:00                                                       | The venue is excluded                                                                                                |
| TC-VS-09 | AC3 | Negative | The reported case: 20 Oct 2pm to 23 Oct 8pm with venues that have opening hours                               | No venue is returned                                                                                                 |
| TC-VS-10 | AC3 | Positive | The same multi-day range with a venue that has no opening hours, plus one that is booked                      | The unbooked venue is returned; the booked one is excluded                                                           |
| TC-VS-11 | AC3 | Positive | Event 14:00 to 18:00 at a venue open 08:00 to 22:00                                                           | Venue is open for the event                                                                                          |
| TC-VS-12 | AC3 | Boundary | Event exactly 08:00 to 22:00 at that venue                                                                    | Venue is open for the event                                                                                          |
| TC-VS-13 | AC3 | Negative | Event starting at 07:00                                                                                       | Venue is not open                                                                                                    |
| TC-VS-14 | AC3 | Negative | Event ending at 23:00                                                                                         | Venue is not open                                                                                                    |
| TC-VS-15 | AC3 | Negative | Event 20:00 to 01:00 the next day                                                                             | Venue is not open (it is closed overnight)                                                                           |
| TC-VS-16 | AC3 | Negative | Event spanning several days                                                                                   | Venue is not open                                                                                                    |
| TC-VS-17 | AC3 | Boundary | Times where UTC and Singapore dates differ                                                                    | Singapore time is used, not UTC                                                                                      |
| TC-VS-18 | AC3 | Positive | A venue with no opening hours                                                                                 | Always open, even for a multi-day event                                                                              |
| TC-VS-19 | AC3 | Negative | The only matching venue is booked                                                                             | An empty list is returned, not an error                                                                              |
| TC-VS-20 | AC3 | Negative | Every query run during a date search                                                                          | All are`SELECT`s; none writes data or mentions event requests                                                      |
| TC-VS-21 | AC4 | Security | Event organiser, venue staff, technical support and attendee call search and filter options                   | Each is refused with "Only event coordinators can search venues."; the database is not queried                       |
| TC-VS-22 | AC5 | Positive | Cleared (empty or blank) filter values                                                                        | Treated as not supplied, the same as an unfiltered search                                                            |
| TC-VS-23 | AC5 | Positive | A search with capacity 200, then a search with no filters                                                     | The second search is independent and returns the wider result set                                                    |
| TC-VS-24 | AC6 | Positive | A search returning two venues                                                                                 | Each result carries its`id` and `name` (plus `updatedAt` as an ISO date)                                       |

TC-VS-02 runs five input rows, TC-VS-21 runs four roles. Each row is reported as its own test.

## Manual test cases (page and end to end)

The automated tests cover the backend logic only. These check the page and the full stack, and need a coordinator account, an account in another role, and a few venues and bookings in the database.

| ID  | AC  | Type     | Steps                                                                                    | Expected result                                                                                                                              |
| --- | --- | -------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| M01 | AC1 | Positive | Sign in as a coordinator and open`/venues`                                             | All filters are shown: start, end, attendance, minimum capacity, location, layout, accessibility (with Wheelchair accessible) and facilities |
| M02 | AC5 | Positive | Enter attendance 200 and press Search venues                                             | Only venues with capacity of at least 200 are listed; the count updates                                                                      |
| M03 | AC5 | Positive | After M02, press Clear filters                                                           | All fields reset and the full venue list returns                                                                                             |
| M04 | AC6 | Positive | Look at any result                                                                       | It shows the venue name, location, capacity, opening hours, layouts, facilities and accessibility                                            |
| M05 | AC3 | Negative | Search for attendance 99999                                                              | "No venue matches these filters" is shown with a note that the event request is not affected; the event request is unchanged                 |
| M06 | AC4 | Security | Sign in as an organiser (then venue staff), look at the navigation, then open`/venues` | The link is hidden; the page shows "This page is for event coordinators."; calling`GET /api/venues/search-venues` returns 403              |
| M07 | AC4 | Security | Signed out, open`/venues` and call the API                                             | The page asks you to sign in; the API returns 401                                                                                            |
| M08 | AC1 | Negative | Set the end time before the start time                                                   | An error is shown and Search is disabled                                                                                                     |
| M09 | AC3 | Negative | Search 20 Oct 2026 2pm to 23 Oct 2026 8pm                                                | No venue with opening hours is returned                                                                                                      |
| M10 | AC2 | Positive | Change a venue in the database (for example its capacity), then search again             | The new value appears in the results without restarting anything                                                                             |
| M11 | AC1 | Positive | Type a number in Expected attendance and press Search                                    | The search runs with no error (regression for the earlier`value.trim` bug)                                                                 |

## Not covered yet

- Real SQL behaviour (array matching, overlap, location match) is not exercised, because the automated tests use a mocked database. An integration test against a test Postgres would close this gap.
- The page, the API client and the route restriction have no automated tests; M01 to M08 and M11 cover them by han

# Venue search: test cases

Automated tests live in `backend/src/venues/venue-search.test.ts`. Each test name starts with its ID and `[acceptance criterion, test type]`, for example `TC-VS-07 [AC3, negative]`. The criteria (AC1 to AC6) are listed in [venue-search.md](venue-search.md).

## Test types

| Type               | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| **Positive** | Valid input; the expected result is returned                            |
| **Negative** | Invalid input is rejected, or a venue that should not match is excluded |
| **Boundary** | A value exactly at a limit, or a time-zone edge                         |
| **Security** | A user without permission is refused                                    |

## Coverage summary

| Criterion                                                      | Automated      | Manual        | Types                        |
| -------------------------------------------------------------- | -------------- | ------------- | ---------------------------- |
| AC1 Search/filter by criteria                                  | TC-VS-01 to 03 | M01, M08, M11 | positive, negative           |
| AC2 Current catalogue                                          | TC-VS-04, 05   | M10           | positive                     |
| AC3 Results match filters, exclusion, no-match, no auto-reject | TC-VS-06 to 20 | M05, M09      | positive, negative, boundary |
| AC4 Authorisation                                              | TC-VS-21       | M06, M07      | security                     |
| AC5 Change or clear filters                                    | TC-VS-22, 23   | M02, M03      | positive                     |
| AC6 Result identifies venue                                    | TC-VS-24       | M04           | positive                     |

## Automated test cases

| ID       | AC  | Type     | What it checks                                                                                                | Expected result                                                                                                      |
| -------- | --- | -------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-VS-01 | AC1 | Positive | A query with date/time, attendance, capacity, location, layout, accessibility, wheelchair and facilities      | Every value is accepted and normalised (dates to UTC, text trimmed)                                                  |
| TC-VS-02 | AC1 | Negative | Five bad inputs: start without end, end before start, non-numeric attendance, capacity 0, wheelchair`maybe` | Each is rejected with a clear message                                                                                |
| TC-VS-03 | AC1 | Positive | A search with every filter set, attendance 100 and capacity 150                                               | All filters reach the database query; the larger number (150) is used                                                |
| TC-VS-04 | AC2 | Positive | Two searches in a row while the catalogue changes between them                                                | The second search returns the new data; only active venues are read from`public.venues`                            |
| TC-VS-05 | AC2 | Positive | Loading the filter choices                                                                                    | Layouts, facilities and accessibility values come from the live catalogue                                            |
| TC-VS-06 | AC3 | Positive | A search with no filters                                                                                      | Neutral parameters are sent, nothing is excluded, and no booking query runs                                          |
| TC-VS-07 | AC3 | Negative | A venue with an approved booking overlapping the event                                                        | That venue is excluded; the booking query uses the event's start and end, status`APPROVED` and a half-open overlap |
| TC-VS-08 | AC3 | Negative | A venue open 09:00 to 17:00 searched for 18:00 to 20:00                                                       | The venue is excluded                                                                                                |
| TC-VS-09 | AC3 | Negative | The reported case: 20 Oct 2pm to 23 Oct 8pm with venues that have opening hours                               | No venue is returned                                                                                                 |
| TC-VS-10 | AC3 | Positive | The same multi-day range with a venue that has no opening hours, plus one that is booked                      | The unbooked venue is returned; the booked one is excluded                                                           |
| TC-VS-11 | AC3 | Positive | Event 14:00 to 18:00 at a venue open 08:00 to 22:00                                                           | Venue is open for the event                                                                                          |
| TC-VS-12 | AC3 | Boundary | Event exactly 08:00 to 22:00 at that venue                                                                    | Venue is open for the event                                                                                          |
| TC-VS-13 | AC3 | Negative | Event starting at 07:00                                                                                       | Venue is not open                                                                                                    |
| TC-VS-14 | AC3 | Negative | Event ending at 23:00                                                                                         | Venue is not open                                                                                                    |
| TC-VS-15 | AC3 | Negative | Event 20:00 to 01:00 the next day                                                                             | Venue is not open (it is closed overnight)                                                                           |
| TC-VS-16 | AC3 | Negative | Event spanning several days                                                                                   | Venue is not open                                                                                                    |
| TC-VS-17 | AC3 | Boundary | Times where UTC and Singapore dates differ                                                                    | Singapore time is used, not UTC                                                                                      |
| TC-VS-18 | AC3 | Positive | A venue with no opening hours                                                                                 | Always open, even for a multi-day event                                                                              |
| TC-VS-19 | AC3 | Negative | The only matching venue is booked                                                                             | An empty list is returned, not an error                                                                              |
| TC-VS-20 | AC3 | Negative | Every query run during a date search                                                                          | All are`SELECT`s; none writes data or mentions event requests                                                      |
| TC-VS-21 | AC4 | Security | Event organiser, venue staff, technical support and attendee call search and filter options                   | Each is refused with "Only event coordinators can search venues."; the database is not queried                       |
| TC-VS-22 | AC5 | Positive | Cleared (empty or blank) filter values                                                                        | Treated as not supplied, the same as an unfiltered search                                                            |
| TC-VS-23 | AC5 | Positive | A search with capacity 200, then a search with no filters                                                     | The second search is independent and returns the wider result set                                                    |
| TC-VS-24 | AC6 | Positive | A search returning two venues                                                                                 | Each result carries its`id` and `name` (plus `updatedAt` as an ISO date)                                       |

TC-VS-02 runs five input rows, TC-VS-21 runs four roles. Each row is reported as its own test.

## Manual test cases (page and end to end)

The automated tests cover the backend logic only. These check the page and the full stack, and need a coordinator account, an account in another role, and a few venues and bookings in the database.

| ID  | AC  | Type     | Steps                                                                                    | Expected result                                                                                                                              |
| --- | --- | -------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| M01 | AC1 | Positive | Sign in as a coordinator and open`/venues`                                             | All filters are shown: start, end, attendance, minimum capacity, location, layout, accessibility (with Wheelchair accessible) and facilities |
| M02 | AC5 | Positive | Enter attendance 200 and press Search venues                                             | Only venues with capacity of at least 200 are listed; the count updates                                                                      |
| M03 | AC5 | Positive | After M02, press Clear filters                                                           | All fields reset and the full venue list returns                                                                                             |
| M04 | AC6 | Positive | Look at any result                                                                       | It shows the venue name, location, capacity, opening hours, layouts, facilities and accessibility                                            |
| M05 | AC3 | Negative | Search for attendance 99999                                                              | "No venue matches these filters" is shown with a note that the event request is not affected; the event request is unchanged                 |
| M06 | AC4 | Security | Sign in as an organiser (then venue staff), look at the navigation, then open`/venues` | The link is hidden; the page shows "This page is for event coordinators."; calling`GET /api/venues/search-venues` returns 403              |
| M07 | AC4 | Security | Signed out, open`/venues` and call the API                                             | The page asks you to sign in; the API returns 401                                                                                            |
| M08 | AC1 | Negative | Set the end time before the start time                                                   | An error is shown and Search is disabled                                                                                                     |
| M09 | AC3 | Negative | Search 20 Oct 2026 2pm to 23 Oct 2026 8pm                                                | No venue with opening hours is returned                                                                                                      |
| M10 | AC2 | Positive | Change a venue in the database (for example its capacity), then search again             | The new value appears in the results without restarting anything                                                                             |
| M11 | AC1 | Positive | Type a number in Expected attendance and press Search                                    | The search runs with no error (regression for the earlier`value.trim` bug)                                                                 |

## Not covered yet

- Real SQL behaviour (array matching, overlap, location match) is not exercised, because the automated tests use a mocked database. An integration test against a test Postgres would close this gap.
- The page, the API client and the route restriction have no automated tests; M01 to M08 and M11 cover them by hand.
