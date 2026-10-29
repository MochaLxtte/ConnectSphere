import { describe, expect, it } from 'vitest';
import { registrationAvailability, REGISTRATION_MESSAGES, type RegistrationFacts } from '../../src/modules/registrations/registration-rules.js';

const open: RegistrationFacts = { status: 'CONFIRMED', registrationRequired: true, started: false, beforeOpen: false, afterClose: false,
  capacity: 10, registered: 3, ownStatus: null };
const facts = (over: Partial<RegistrationFacts> = {}): RegistrationFacts => ({ ...open, ...over });

describe('KAN-14-AC2/AC102 registration availability', () => {
  it('accepts a CONFIRMED event that takes registrations, inside its window, before it starts, with a place left', () => {
    expect(registrationAvailability(open)).toEqual({ canRegister: true, reason: null, message: 'Registration is open.', placesRemaining: 7 });
  });
  it.each(['SUBMITTED', 'APPROVED', 'DRAFT', 'CANCELLED', 'COMPLETED', 'REJECTED'])('KAN-14-AC2 refuses a %s event', status => {
    expect(registrationAvailability(facts({ status }))).toMatchObject({ canRegister: false, reason: 'NOT_CONFIRMED' });
  });
  it.each([false, null])('KAN-14-AC6 refuses an event whose registration is %s', registrationRequired => {
    expect(registrationAvailability(facts({ registrationRequired }))).toMatchObject({ canRegister: false, reason: 'REGISTRATION_DISABLED' });
  });
  it('KAN-14-AC102 uses [opens, closes): before opening and from the closing instant are refused; the opening instant is accepted', () => {
    expect(registrationAvailability(facts({ beforeOpen: true }))).toMatchObject({ reason: 'NOT_YET_OPEN' });
    expect(registrationAvailability(facts({ afterClose: true }))).toMatchObject({ reason: 'CLOSED' });
    expect(registrationAvailability(facts({ beforeOpen: false, afterClose: false })).canRegister).toBe(true);
  });
  it('KAN-14-AC102 refuses once the event has started', () => {
    expect(registrationAvailability(facts({ started: true }))).toMatchObject({ canRegister: false, reason: 'EVENT_STARTED' });
  });
  it('KAN-14-AC102 treats null bounds as unbounded, null capacity as unlimited and capacity zero as full', () => {
    const unlimited = registrationAvailability(facts({ capacity: null, registered: 5000 }));
    expect(unlimited).toMatchObject({ canRegister: true, placesRemaining: null });
    expect(registrationAvailability(facts({ capacity: 0, registered: 0 }))).toMatchObject({ canRegister: false, reason: 'FULL', placesRemaining: 0 });
  });
  it('KAN-14-AC5/AC6 counts the last place and refuses at and above capacity', () => {
    expect(registrationAvailability(facts({ capacity: 4, registered: 3 }))).toMatchObject({ canRegister: true, placesRemaining: 1 });
    expect(registrationAvailability(facts({ capacity: 4, registered: 4 }))).toMatchObject({ canRegister: false, reason: 'FULL', placesRemaining: 0 });
    expect(registrationAvailability(facts({ capacity: 4, registered: 9 }))).toMatchObject({ reason: 'FULL', placesRemaining: 0 });
  });
  it('KAN-14-AC7 refuses someone who is already registered, whatever else is true', () => {
    expect(registrationAvailability(facts({ ownStatus: 'REGISTERED' }))).toMatchObject({ reason: 'ALREADY_REGISTERED' });
    expect(registrationAvailability(facts({ ownStatus: 'REGISTERED', afterClose: true, status: 'COMPLETED' }))).toMatchObject({ reason: 'ALREADY_REGISTERED' });
  });
  it('KAN-14-AC103 holds a withdrawn attendee to the same rules as anyone else', () => {
    expect(registrationAvailability(facts({ ownStatus: 'WITHDRAWN' })).canRegister).toBe(true);
    expect(registrationAvailability(facts({ ownStatus: 'WITHDRAWN', afterClose: true }))).toMatchObject({ reason: 'CLOSED' });
    expect(registrationAvailability(facts({ ownStatus: 'WITHDRAWN', capacity: 3, registered: 3 }))).toMatchObject({ reason: 'FULL' });
    expect(registrationAvailability(facts({ ownStatus: 'CANCELLED' })).canRegister).toBe(true);
  });
  it('gives every refusal its own plain message', () => {
    const reasons = ['ALREADY_REGISTERED', 'NOT_CONFIRMED', 'REGISTRATION_DISABLED', 'EVENT_STARTED', 'CLOSED', 'NOT_YET_OPEN', 'FULL'] as const;
    expect(new Set(reasons.map(reason => REGISTRATION_MESSAGES[reason])).size).toBe(reasons.length);
  });
  it('checks the refusals in a fixed order: state, disabled, started, closed, not yet open, full', () => {
    expect(registrationAvailability(facts({ status: 'APPROVED', started: true, capacity: 0 }))).toMatchObject({ reason: 'NOT_CONFIRMED' });
    expect(registrationAvailability(facts({ registrationRequired: false, started: true }))).toMatchObject({ reason: 'REGISTRATION_DISABLED' });
    expect(registrationAvailability(facts({ started: true, afterClose: true }))).toMatchObject({ reason: 'EVENT_STARTED' });
    expect(registrationAvailability(facts({ afterClose: true, capacity: 0 }))).toMatchObject({ reason: 'CLOSED' });
    expect(registrationAvailability(facts({ beforeOpen: true, capacity: 0 }))).toMatchObject({ reason: 'NOT_YET_OPEN' });
  });
});
