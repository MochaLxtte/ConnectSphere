import { describe, expect, it } from 'vitest';
import {
  assertOpenForRegistration,
  describeRegistrationAvailability,
  hasEventStarted,
  isDiscoverable,
  RegistrationStateError,
  type RegistrationWindowContext,
} from '../../src/modules/registrations/registration-eligibility.js';

const now = new Date('2026-09-19T04:00:00.000Z');
const at = (offsetMinutes: number) => new Date(now.getTime() + offsetMinutes * 60_000);

function context(overrides: Partial<RegistrationWindowContext> = {}): RegistrationWindowContext {
  return {
    status: 'APPROVED', registrationRequired: true, startsAt: at(600),
    registrationOpensAt: null, registrationClosesAt: null,
    registrationCapacity: null, registeredCount: 0, now, ...overrides,
  };
}

describe('CF-18 registration eligibility (Q-10 provisional rules)', () => {
  it.each(['APPROVED', 'CONFIRMED'])('treats %s events that require registration as discoverable', (status) => {
    expect(isDiscoverable({ status, registrationRequired: true })).toBe(true);
  });

  it.each([
    ['DRAFT', true], ['SUBMITTED', true], ['REJECTED', true], ['CANCELLED', true], ['COMPLETED', true],
    ['APPROVED', false], ['CONFIRMED', null],
  ] as const)('hides %s events with registrationRequired=%s', (status, registrationRequired) => {
    expect(isDiscoverable({ status, registrationRequired })).toBe(false);
    expect(describeRegistrationAvailability(context({ status, registrationRequired })))
      .toMatchObject({ isOpen: false, closedReason: 'NOT_DISCOVERABLE' });
  });

  it('is open with unbounded window and unlimited capacity', () => {
    expect(describeRegistrationAvailability(context({ registeredCount: 5000 })))
      .toEqual({ isOpen: true, closedReason: null, spotsLeft: null });
  });

  it('includes both window bounds', () => {
    expect(describeRegistrationAvailability(context({ registrationOpensAt: now, registrationClosesAt: now })).isOpen)
      .toBe(true);
  });

  it.each([
    ['NOT_OPEN_YET', { registrationOpensAt: at(1) }],
    ['REGISTRATION_ENDED', { registrationClosesAt: at(-1) }],
    ['EVENT_STARTED', { startsAt: now }],
    ['EVENT_STARTED', { startsAt: at(-30), registrationCapacity: 1, registeredCount: 1 }],
    ['FULL', { registrationCapacity: 2, registeredCount: 2 }],
    ['FULL', { registrationCapacity: 0 }],
    ['FULL', { registrationCapacity: 1, registeredCount: 3 }],
  ] as const)('reports %s for %j', (closedReason, overrides) => {
    const availability = describeRegistrationAvailability(context(overrides));
    expect(availability).toMatchObject({ isOpen: false, closedReason });
    if (closedReason === 'FULL') expect(availability.spotsLeft).toBe(0);
  });

  it('reports remaining spots and treats a missing start time as not started', () => {
    expect(describeRegistrationAvailability(context({
      startsAt: null, registrationCapacity: 10, registeredCount: 4,
    }))).toEqual({ isOpen: true, closedReason: null, spotsLeft: 6 });
    expect(hasEventStarted(null, now)).toBe(false);
    expect(hasEventStarted(at(1), now)).toBe(false);
    expect(hasEventStarted(at(-1), now)).toBe(true);
  });

  it('throws REGISTRATION_FULL for capacity and REGISTRATION_CLOSED with a reason otherwise', () => {
    expect(() => assertOpenForRegistration(context())).not.toThrow();
    const full = (() => {
      try { assertOpenForRegistration(context({ registrationCapacity: 1, registeredCount: 1 })); } catch (error) { return error; }
      return undefined;
    })();
    expect(full).toBeInstanceOf(RegistrationStateError);
    expect(full).toMatchObject({ code: 'REGISTRATION_FULL', reason: 'FULL' });

    expect(() => assertOpenForRegistration(context({ registrationClosesAt: at(-5) })))
      .toThrowError(expect.objectContaining({ code: 'REGISTRATION_CLOSED', reason: 'REGISTRATION_ENDED' }));
  });
});
