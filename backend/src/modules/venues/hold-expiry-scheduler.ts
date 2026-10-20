import type { Pool } from 'pg';
import { expireVenueHolds } from './booking-service.js';

export interface HoldExpirySchedulerOptions {
  /** How often to run expiry. Defaults to one minute, matching the pg_cron schedule. */
  intervalMs?: number;
  logger?: Pick<Console, 'error'>;
  setInterval?: typeof globalThis.setInterval;
  clearInterval?: typeof globalThis.clearInterval;
}

/**
 * KAN-83-AC8: run expire_venue_holds() at startup (catching up anything overdue after downtime)
 * and then periodically. The database function is idempotent and uses the database clock, so
 * several API instances, restarts and a pg_cron job can all run it safely. Reads never depend on
 * this job: a hold stops occupying its venue at its deadline either way (occupancy.ts).
 */
export function startHoldExpiryScheduler(
  pool: Pick<Pool, 'query'>,
  options: HoldExpirySchedulerOptions = {},
): () => void {
  const intervalMs = options.intervalMs ?? 60_000;
  const logger = options.logger ?? console;
  const schedule = options.setInterval ?? globalThis.setInterval;
  const cancel = options.clearInterval ?? globalThis.clearInterval;
  let running = false;
  let stopped = false;

  const run = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await expireVenueHolds(pool);
    } catch {
      // Keep credentials and SQL out of logs; the next tick retries.
      logger.error('Venue hold expiry run failed; it will be retried.');
    } finally {
      running = false;
    }
  };

  void run();
  const timer = schedule(() => void run(), intervalMs);
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) timer.unref();
  return () => {
    stopped = true;
    cancel(timer);
  };
}
