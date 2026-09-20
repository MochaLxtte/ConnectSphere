import { formatEventTime } from '../events/presentation';
import type { PublicEvent, RegistrationStatus } from './api/registrations';

export type AvailabilityTone = 'open' | 'full' | 'pending' | 'closed';

/** Short badge for list rows and the detail header. */
export function availabilityBadge(event: Pick<PublicEvent, 'isOpen' | 'closedReason'>): { label: string; tone: AvailabilityTone } {
  if (event.isOpen) return { label: 'Open', tone: 'open' };
  switch (event.closedReason) {
    case 'FULL': return { label: 'Full', tone: 'full' };
    case 'NOT_OPEN_YET': return { label: 'Opens soon', tone: 'pending' };
    case 'EVENT_STARTED': return { label: 'Started', tone: 'closed' };
    default: return { label: 'Closed', tone: 'closed' };
  }
}

/** Sentence explaining why registration is unavailable. */
export function closedReasonMessage(event: Pick<PublicEvent, 'closedReason' | 'registrationOpensAt'>): string {
  switch (event.closedReason) {
    case 'FULL': return 'All places have been taken.';
    case 'NOT_OPEN_YET':
      return event.registrationOpensAt
        ? `Registration opens on ${formatEventTime(event.registrationOpensAt)}.`
        : 'Registration has not opened yet.';
    case 'REGISTRATION_ENDED': return 'Registration has closed.';
    case 'EVENT_STARTED': return 'This event has already started.';
    default: return 'Registration is not available for this event.';
  }
}

export function placesLabel(event: Pick<PublicEvent, 'registrationCapacity' | 'spotsLeft' | 'registeredCount'>): string {
  if (event.registrationCapacity === null || event.spotsLeft === null) {
    return `${event.registeredCount} registered · no limit`;
  }
  const places = event.spotsLeft === 1 ? 'place' : 'places';
  return `${event.spotsLeft} of ${event.registrationCapacity} ${places} left`;
}

export function registrationStatusLabel(status: RegistrationStatus | string): string {
  if (status === 'REGISTERED') return 'Registered';
  if (status === 'WITHDRAWN') return 'Withdrawn';
  return 'Status unavailable';
}

export function venueLabel(venue: { name: string; location: string | null } | null): string {
  if (!venue) return 'Venue to be confirmed';
  return venue.location?.trim() ? `${venue.name} · ${venue.location.trim()}` : venue.name;
}
