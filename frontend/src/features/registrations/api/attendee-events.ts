import { getJson, postJson } from '../../../lib/api-client.js';

export type OwnRegistrationStatus = 'REGISTERED' | 'WITHDRAWN' | 'CANCELLED';
export type RegistrationBlock = 'ALREADY_REGISTERED' | 'NOT_CONFIRMED' | 'REGISTRATION_DISABLED' | 'EVENT_STARTED' | 'CLOSED' | 'NOT_YET_OPEN' | 'FULL';

export interface RegistrationAvailability {
  canRegister: boolean;
  reason: RegistrationBlock | null;
  message: string;
  placesRemaining: number | null;
}
export interface RegistrationConditions {
  required: boolean;
  opensAt: string | null;
  closesAt: string | null;
  capacity: number | null;
  placesRemaining: number | null;
}
export interface AttendeeEvent {
  id: string;
  name: string | null;
  purpose: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  accessibilityNeeds: string | null;
  status: string;
  venues: { name: string; location: string | null; startsAt: string; endsAt: string }[];
  registration: RegistrationConditions;
}
export interface OwnRegistration { id: string; status: OwnRegistrationStatus; registeredAt: string; withdrawnAt: string | null }
export interface AttendeeEventDetail { event: AttendeeEvent; registration: OwnRegistration | null; availability: RegistrationAvailability }
export interface AttendeeEventSummary {
  id: string; name: string | null; startsAt: string | null; endsAt: string | null;
  registration: RegistrationConditions; ownStatus: OwnRegistrationStatus | null; availability: RegistrationAvailability;
}
export interface OwnRegistrationSummary extends OwnRegistration {
  event: { id: string; name: string | null; startsAt: string | null; endsAt: string | null; status: string };
}

export async function fetchAttendeeEvents(signal?: AbortSignal): Promise<AttendeeEventSummary[]> {
  return (await getJson<{ items: AttendeeEventSummary[] }>('/api/attendee/events', signal)).items;
}
export async function fetchOwnRegistrations(signal?: AbortSignal): Promise<OwnRegistrationSummary[]> {
  return (await getJson<{ items: OwnRegistrationSummary[] }>('/api/attendee/registrations', signal)).items;
}
export function fetchAttendeeEvent(eventId: string, signal?: AbortSignal): Promise<AttendeeEventDetail> {
  return getJson(`/api/attendee/events/${encodeURIComponent(eventId)}`, signal);
}
/** The body is empty on purpose: the server uses the signed-in attendee, never a supplied identity. */
export function registerForEvent(eventId: string, signal?: AbortSignal): Promise<AttendeeEventDetail & { changed: true }> {
  return postJson(`/api/attendee/events/${encodeURIComponent(eventId)}/register`, {}, signal);
}

export const registrationStatusLabel: Record<OwnRegistrationStatus, string> = {
  REGISTERED: 'Registered', WITHDRAWN: 'Withdrawn', CANCELLED: 'Cancelled with the event',
};
