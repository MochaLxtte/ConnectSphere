import { describe, expect, it, vi } from 'vitest';
import { parseHoldCancellation, parseHoldPlacement } from '../../src/modules/venues/booking-input.js';
import {
  effectiveBookingStatusSql, occupyingBookingSql,
} from '../../src/modules/venues/occupancy.js';
import { startHoldExpiryScheduler } from '../../src/modules/venues/hold-expiry-scheduler.js';

describe('KAN-83 hold input', () => {
  it.each([
    ['2026-11-05T10:30:00+08:00', '2026-11-05T02:30:00.000Z'],
    ['2026-11-05T02:30:00Z', '2026-11-05T02:30:00.000Z'],
    ['2026-11-05T02:30:00.123Z', '2026-11-05T02:30:00.123Z'],
  ])('KAN-83-AC1 accepts an explicit deadline %s as an instant', (expiresAt, expected) => {
    expect(parseHoldPlacement({ expiresAt })).toEqual({ expiresAt: expected });
  });

  it.each([undefined, null])('KAN-83-AC1 refuses a missing deadline (%j)', (expiresAt) => {
    expect(() => parseHoldPlacement(expiresAt === undefined ? {} : { expiresAt }))
      .toThrow(expect.objectContaining({ kind: 'INVALID_INPUT', code: 'INVALID_HOLD_EXPIRY', message: 'expiresAt is required.' }));
  });

  it.each(['tomorrow', '2026-11-05T10:30:00', '2026-02-30T10:00:00Z', 42, ''])(
    'KAN-83-AC1 refuses an invalid deadline %j with the hold error code', (expiresAt) => {
      expect(() => parseHoldPlacement({ expiresAt }))
        .toThrow(expect.objectContaining({ kind: 'INVALID_INPUT', code: 'INVALID_HOLD_EXPIRY' }));
    },
  );

  it('rejects unknown fields and non-object bodies before reading the deadline', () => {
    expect(() => parseHoldPlacement({ expiresAt: '2026-11-05T02:30:00Z', status: 'APPROVED' }))
      .toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(() => parseHoldPlacement([])).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('KAN-83-AC10 trims a cancellation reason and refuses a blank one', () => {
    expect(parseHoldCancellation({ reason: '  Organiser withdrew  ' })).toEqual({ reason: 'Organiser withdrew' });
    for (const reason of [undefined, '', '   ', 7]) {
      expect(() => parseHoldCancellation({ reason })).toThrow(expect.objectContaining({ kind: 'INVALID_INPUT' }));
    }
    expect(() => parseHoldCancellation({ reason: 'x', extra: true })).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});

describe('KAN-83 occupancy rule', () => {
  it('KAN-83-AC4 treats approved bookings and holds before their deadline as occupying', () => {
    expect(occupyingBookingSql()).toBe("(b.status = 'APPROVED' OR (b.status = 'HELD' AND b.hold_expires_at > now()))");
    expect(occupyingBookingSql('x', 'clock_timestamp()'))
      .toBe("(x.status = 'APPROVED' OR (x.status = 'HELD' AND x.hold_expires_at > clock_timestamp()))");
  });

  it('KAN-83-AC4 reports a held row past its deadline as EXPIRED to readers', () => {
    expect(effectiveBookingStatusSql()).toBe(
      "CASE WHEN b.status = 'HELD' AND b.hold_expires_at <= now() THEN 'EXPIRED' ELSE b.status END");
    expect(effectiveBookingStatusSql('v')).toContain("v.status = 'HELD'");
  });
});

describe('KAN-83 hold expiry scheduler (AC8)', () => {
  function fakeTimers() {
    let tick: (() => void) | undefined;
    const timer = { unref: vi.fn() };
    return {
      setInterval: vi.fn((callback: () => void) => { tick = callback; return timer; }) as unknown as typeof setInterval,
      clearInterval: vi.fn() as unknown as typeof clearInterval,
      tick: () => tick?.(),
      timer,
    };
  }
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('KAN-83-AC8 runs expiry at startup (catch-up) and on every interval, without blocking exit', async () => {
    const pool = { query: vi.fn(async () => ({ rows: [{ expired: 0 }] })) };
    const timers = fakeTimers();
    const stop = startHoldExpiryScheduler(pool as never, { intervalMs: 5000, ...timers, logger: { error: vi.fn() } });
    await flush();
    expect(pool.query).toHaveBeenCalledWith('SELECT expire_venue_holds() AS expired');
    expect(timers.setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(timers.timer.unref).toHaveBeenCalled();
    timers.tick();
    await flush();
    expect(pool.query).toHaveBeenCalledTimes(2);
    stop();
    expect(timers.clearInterval).toHaveBeenCalledWith(timers.timer);
    timers.tick();
    await flush();
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('does not overlap runs and logs a failure without its details, then retries', async () => {
    let release!: () => void;
    const pool = { query: vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ rows: [{ expired: 1 }] }); }))
      .mockRejectedValueOnce(new Error('password=secret'))
      .mockResolvedValue({ rows: [{ expired: 0 }] }) };
    const logger = { error: vi.fn() };
    const timers = fakeTimers();
    startHoldExpiryScheduler(pool as never, { ...timers, logger });
    timers.tick();
    expect(pool.query).toHaveBeenCalledTimes(1);
    release();
    await flush();
    timers.tick();
    await flush();
    expect(logger.error).toHaveBeenCalledWith('Venue hold expiry run failed; it will be retried.');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret');
    timers.tick();
    await flush();
    expect(pool.query).toHaveBeenCalledTimes(3);
  });

  it('defaults to one minute with the global timers', () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const pool = { query: vi.fn(async () => ({ rows: [{ expired: 0 }] })) };
    const stop = startHoldExpiryScheduler(pool as never, { logger: { error: vi.fn() } });
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    stop();
    expect(clear).toHaveBeenCalled();
    spy.mockRestore();
    clear.mockRestore();
  });

  it('accepts a timer handle without unref', async () => {
    const pool = { query: vi.fn(async () => ({ rows: [{ expired: 0 }] })) };
    const stop = startHoldExpiryScheduler(pool as never, {
      setInterval: (() => 7) as unknown as typeof setInterval, clearInterval: vi.fn() as unknown as typeof clearInterval,
    });
    stop();
    await flush();
  });
});
