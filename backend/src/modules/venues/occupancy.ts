/**
 * KAN-83 (with the KAN-78 buffer hook): the single definition of when a venue booking row
 * occupies its venue. Every availability consumer (calendar, search, suitability, request
 * creation, booking approval, block creation) uses this predicate instead of its own status list.
 *
 * - An APPROVED booking always occupies its interval.
 * - A HELD booking occupies its interval only while the database clock is strictly earlier than
 *   hold_expires_at. At or after the deadline it stops blocking availability immediately, even
 *   if expire_venue_holds() has not yet marked it EXPIRED (KAN-83-AC4).
 * - PENDING, REJECTED, CANCELLED and EXPIRED rows never occupy a venue.
 *
 * `clock` is a SQL expression. Readers use `now()` (one consistent snapshot per statement);
 * writers that have just taken a venue or booking lock use `clock_timestamp()` so a hold that
 * expired while they waited no longer counts (KAN-83-AC9).
 */
export function occupyingBookingSql(alias = 'b', clock: 'now()' | 'clock_timestamp()' = 'now()'): string {
  return `(${alias}.status = 'APPROVED' OR (${alias}.status = 'HELD' AND ${alias}.hold_expires_at > ${clock}))`;
}

/**
 * The status a reader should see. A HELD row past its deadline is reported as EXPIRED even
 * before the scheduler has processed it, so no screen shows a dead hold as live.
 */
export function effectiveBookingStatusSql(alias = 'b'): string {
  return `CASE WHEN ${alias}.status = 'HELD' AND ${alias}.hold_expires_at <= now() THEN 'EXPIRED' ELSE ${alias}.status END`;
}

/**
 * Start of the period a booking occupies. KAN-78 extends this with the venue's setup buffer;
 * until then the occupied start is the requested start. A hold deadline may not be later than it.
 */
export function occupiedStart(startsAt: Date): Date {
  return startsAt;
}
