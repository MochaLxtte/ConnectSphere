/**
 * CF-18 / Q-10 (provisional team assumption until the customer answers Q-10).
 *
 * An event is DISCOVERABLE when its status is APPROVED or CONFIRMED and
 * registration_required is true.
 *
 * A discoverable event is OPEN FOR REGISTRATION when all of these hold:
 *  - now is within [registration_opens_at, registration_closes_at]; a NULL bound is unbounded;
 *  - the event has not started (starts_at is NULL or later than now);
 *  - the REGISTERED count is below registration_capacity; NULL capacity means unlimited.
 *
 * Withdrawal is allowed until the event starts. Withdrawing keeps the row and re-registering
 * reuses it. The database trigger `event_registrations_within_capacity` remains the final
 * guard against overbooking under concurrency.
 */

export const DISCOVERABLE_STATUSES = ['APPROVED', 'CONFIRMED'] as const;

export type RegistrationClosedReason =
  | 'NOT_DISCOVERABLE'
  | 'NOT_OPEN_YET'
  | 'REGISTRATION_ENDED'
  | 'EVENT_STARTED'
  | 'FULL';

export interface RegistrationWindowContext {
  status: string;
  registrationRequired: boolean | null;
  startsAt: Date | null;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  registrationCapacity: number | null;
  registeredCount: number;
  now: Date;
}

export interface RegistrationAvailability {
  isOpen: boolean;
  closedReason: RegistrationClosedReason | null;
  /** NULL when the event has no registration limit. */
  spotsLeft: number | null;
}

export type RegistrationErrorCode =
  | 'ALREADY_REGISTERED'
  | 'REGISTRATION_CLOSED'
  | 'REGISTRATION_FULL'
  | 'NOT_REGISTERED'
  | 'WITHDRAWAL_CLOSED';

export class RegistrationStateError extends Error {
  constructor(
    public readonly code: RegistrationErrorCode,
    message: string,
    public readonly reason: RegistrationClosedReason | null = null,
  ) {
    super(message);
    this.name = 'RegistrationStateError';
  }
}

export function isDiscoverable(event: Pick<RegistrationWindowContext, 'status' | 'registrationRequired'>): boolean {
  return (DISCOVERABLE_STATUSES as readonly string[]).includes(event.status)
    && event.registrationRequired === true;
}

export function hasEventStarted(startsAt: Date | null, now: Date): boolean {
  return startsAt !== null && startsAt.getTime() <= now.getTime();
}

/** Describe availability without changing data; the register transaction rechecks under a lock. */
export function describeRegistrationAvailability(context: RegistrationWindowContext): RegistrationAvailability {
  const spotsLeft = context.registrationCapacity === null
    ? null
    : Math.max(0, context.registrationCapacity - context.registeredCount);
  const closed = (closedReason: RegistrationClosedReason): RegistrationAvailability =>
    ({ isOpen: false, closedReason, spotsLeft });

  if (!isDiscoverable(context)) return closed('NOT_DISCOVERABLE');
  if (hasEventStarted(context.startsAt, context.now)) return closed('EVENT_STARTED');
  if (context.registrationOpensAt && context.now.getTime() < context.registrationOpensAt.getTime()) {
    return closed('NOT_OPEN_YET');
  }
  if (context.registrationClosesAt && context.now.getTime() > context.registrationClosesAt.getTime()) {
    return closed('REGISTRATION_ENDED');
  }
  if (spotsLeft !== null && spotsLeft <= 0) return closed('FULL');
  return { isOpen: true, closedReason: null, spotsLeft };
}

const closedMessages: Record<RegistrationClosedReason, string> = {
  NOT_DISCOVERABLE: 'This event is not open for registration.',
  NOT_OPEN_YET: 'Registration for this event has not opened yet.',
  REGISTRATION_ENDED: 'Registration for this event has closed.',
  EVENT_STARTED: 'This event has already started.',
  FULL: 'This event is full.',
};

/** Throw the 409-mapped error for a closed or full event. */
export function assertOpenForRegistration(context: RegistrationWindowContext): void {
  const availability = describeRegistrationAvailability(context);
  if (availability.isOpen || availability.closedReason === null) return;
  const reason = availability.closedReason;
  throw new RegistrationStateError(
    reason === 'FULL' ? 'REGISTRATION_FULL' : 'REGISTRATION_CLOSED',
    closedMessages[reason],
    reason,
  );
}
