import type { OwnRegistrationStatus, RegistrationAvailability } from './registration-rules.js';

/** What an attendee may know about an event they can register for: no organiser, coordinator or other attendee. */
export interface AttendeeEvent {
  id: string;
  name: string | null;
  purpose: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  accessibilityNeeds: string | null;
  status: string;
  /** Approved venue bookings only. */
  venues: { name: string; location: string | null; startsAt: string; endsAt: string }[];
  registration: {
    required: boolean;
    opensAt: string | null;
    closesAt: string | null;
    capacity: number | null;
    placesRemaining: number | null;
  };
}

export interface OwnRegistration {
  id: string;
  status: OwnRegistrationStatus;
  registeredAt: string;
  withdrawnAt: string | null;
}

export interface AttendeeEventDetail {
  event: AttendeeEvent;
  /** The caller's own registration, or null. */
  registration: OwnRegistration | null;
  availability: RegistrationAvailability;
}

export interface AttendeeEventSummary {
  id: string;
  name: string | null;
  startsAt: string | null;
  endsAt: string | null;
  registration: AttendeeEvent['registration'];
  ownStatus: OwnRegistrationStatus | null;
  availability: RegistrationAvailability;
}

export interface OwnRegistrationSummary extends OwnRegistration {
  event: { id: string; name: string | null; startsAt: string | null; endsAt: string | null; status: string };
}

export interface RegistrationResult extends AttendeeEventDetail {
  /** False only for a repeat that found the attendee already registered (reported as 409, never returned). */
  changed: true;
}
