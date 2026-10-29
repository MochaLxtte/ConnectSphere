/**
 * KAN-14: whether an attendee may register for an event right now. The time comparisons are made by the
 * database clock when the facts are read (see registration-service), so a caller's or a page's clock never decides.
 */
export type RegistrationBlock =
  | 'ALREADY_REGISTERED' | 'NOT_CONFIRMED' | 'REGISTRATION_DISABLED' | 'EVENT_STARTED' | 'CLOSED' | 'NOT_YET_OPEN' | 'FULL';

export type OwnRegistrationStatus = 'REGISTERED' | 'WITHDRAWN' | 'CANCELLED';

export interface RegistrationFacts {
  status: string;
  /** NULL when the organiser never said; treated as not taking registrations. */
  registrationRequired: boolean | null;
  /** now >= startsAt; true when the event has no start time. */
  started: boolean;
  /** now < registrationOpensAt; false when there is no opening bound. */
  beforeOpen: boolean;
  /** now >= registrationClosesAt; false when there is no closing bound. */
  afterClose: boolean;
  /** NULL means unlimited; 0 means full. */
  capacity: number | null;
  registered: number;
  ownStatus: OwnRegistrationStatus | null;
}

export interface RegistrationAvailability {
  canRegister: boolean;
  reason: RegistrationBlock | null;
  message: string;
  /** NULL for an unlimited event. */
  placesRemaining: number | null;
}

export const REGISTRATION_MESSAGES: Record<RegistrationBlock, string> = {
  ALREADY_REGISTERED: 'You are already registered for this event.',
  NOT_CONFIRMED: 'This event is not open for registration.',
  REGISTRATION_DISABLED: 'This event does not take registrations.',
  EVENT_STARTED: 'This event has already started, so registration is closed.',
  CLOSED: 'Registration for this event has closed.',
  NOT_YET_OPEN: 'Registration for this event has not opened yet.',
  FULL: 'This event is full.',
};

/**
 * KAN-14-AC2/AC6/AC7/AC102: only a CONFIRMED event that takes registrations, inside [opens, closes), before it
 * starts and with a place left, accepts a new registration. A null bound is unbounded, a null capacity is unlimited
 * and a capacity of zero is full. A withdrawn attendee is held to the same rules as anyone else (AC103).
 */
export function registrationAvailability(facts: RegistrationFacts): RegistrationAvailability {
  const placesRemaining = facts.capacity === null ? null : Math.max(0, facts.capacity - facts.registered);
  const blocked = (reason: RegistrationBlock): RegistrationAvailability =>
    ({ canRegister: false, reason, message: REGISTRATION_MESSAGES[reason], placesRemaining });
  if (facts.ownStatus === 'REGISTERED') return blocked('ALREADY_REGISTERED');
  if (facts.status !== 'CONFIRMED') return blocked('NOT_CONFIRMED');
  if (facts.registrationRequired !== true) return blocked('REGISTRATION_DISABLED');
  if (facts.started) return blocked('EVENT_STARTED');
  if (facts.afterClose) return blocked('CLOSED');
  if (facts.beforeOpen) return blocked('NOT_YET_OPEN');
  if (placesRemaining === 0) return blocked('FULL');
  return { canRegister: true, reason: null, message: 'Registration is open.', placesRemaining };
}
