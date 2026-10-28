import { SIGNIFICANT_FIELDS } from './planning-edit-policy.js';

/** KAN-15-AC102: the fields a change request may carry; name/description stay with KAN-66. */
export type SignificantField = (typeof SIGNIFICANT_FIELDS)[number];

export type ArrangementKind = 'VENUE' | 'EQUIPMENT' | 'REGISTRATION';

/**
 * KAN-15 design D4 (27 October 2026): which existing arrangements each field can invalidate.
 * Purpose describes the event without changing any arrangement, so it affects none.
 */
export const AFFECTED_ARRANGEMENTS: Record<SignificantField, readonly ArrangementKind[]> = {
  purpose: [],
  startsAt: ['VENUE', 'EQUIPMENT', 'REGISTRATION'],
  endsAt: ['VENUE', 'EQUIPMENT', 'REGISTRATION'],
  expectedAttendance: ['VENUE'],
  venueRequirements: ['VENUE'],
  accessibilityNeeds: ['VENUE'],
  equipmentRequirements: ['EQUIPMENT'],
  registrationRequired: ['REGISTRATION'],
  registrationCapacity: ['REGISTRATION'],
  registrationOpensAt: ['REGISTRATION'],
  registrationClosesAt: ['REGISTRATION'],
};

export function isSignificantField(field: string): field is SignificantField {
  return (SIGNIFICANT_FIELDS as readonly string[]).includes(field);
}

export function affectedKinds(fields: readonly SignificantField[]): ArrangementKind[] {
  const kinds = new Set(fields.flatMap((field) => AFFECTED_ARRANGEMENTS[field]));
  return (['VENUE', 'EQUIPMENT', 'REGISTRATION'] as const).filter((kind) => kinds.has(kind));
}

/** One live arrangement of the event, as stored. */
export interface ArrangementRecord {
  kind: 'VENUE_BOOKING' | 'EQUIPMENT_REQUEST';
  id: string;
  /** Venue or equipment name, for display. */
  label: string;
  status: string;
  /** Equipment quantity; null for venue bookings. */
  quantity: number | null;
}

export interface ChangeImpact {
  affectedKinds: ArrangementKind[];
  /** Confirmed arrangements the change touches: approval is refused while any exist (AC103). */
  confirmed: ArrangementRecord[];
  /** Pending arrangements approval cancels for resubmission (AC104). */
  pending: ArrangementRecord[];
  /** Active registrations, when the change affects registrations. */
  activeRegistrations: number;
  /** A CONFIRMED event counts as a confirmed arrangement when any arrangement kind is affected. */
  eventConfirmed: boolean;
  canApprove: boolean;
  /** Why approval is refused; null when it is allowed. */
  blockedReason: string | null;
}

const confirmedStatus = { VENUE_BOOKING: ['APPROVED'], EQUIPMENT_REQUEST: ['RESERVED'] } as const;
const pendingStatus = { VENUE_BOOKING: ['PENDING', 'HELD'], EQUIPMENT_REQUEST: ['REQUESTED'] } as const;
const kindOf = { VENUE_BOOKING: 'VENUE', EQUIPMENT_REQUEST: 'EQUIPMENT' } as const;

/**
 * KAN-15-AC4/AC7/AC103/AC104: classify the event's live arrangements for a proposed change.
 * The caller reads them under the event lock at decision time, so the result matches what an
 * approval would actually change.
 */
export function assessChangeImpact(input: {
  fields: readonly SignificantField[];
  eventStatus: string;
  arrangements: readonly ArrangementRecord[];
  activeRegistrations: number;
}): ChangeImpact {
  const kinds = affectedKinds(input.fields);
  const touched = input.arrangements.filter((item) => kinds.includes(kindOf[item.kind]));
  const confirmed = touched.filter((item) =>
    (confirmedStatus[item.kind] as readonly string[]).includes(item.status));
  const pending = touched.filter((item) =>
    (pendingStatus[item.kind] as readonly string[]).includes(item.status));
  const activeRegistrations = kinds.includes('REGISTRATION') ? input.activeRegistrations : 0;
  const eventConfirmed = input.eventStatus === 'CONFIRMED' && kinds.length > 0;

  let blockedReason: string | null = null;
  if (eventConfirmed || confirmed.length > 0 || activeRegistrations > 0) {
    const reasons = [
      eventConfirmed ? 'the event is confirmed' : null,
      confirmed.length > 0 ? 'it affects confirmed venue or equipment arrangements' : null,
      activeRegistrations > 0 ? 'it affects active registrations' : null,
    ].filter((reason): reason is string => reason !== null);
    blockedReason = `This change cannot be approved because ${reasons.join(' and ')}. ` +
      'Cancel the event and submit a new request instead.';
  }
  return {
    affectedKinds: kinds, confirmed, pending, activeRegistrations, eventConfirmed,
    canApprove: blockedReason === null, blockedReason,
  };
}
