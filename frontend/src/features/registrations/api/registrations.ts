import { getJson, postJson } from '../../../lib/api-client';

export type RegistrationStatus = 'REGISTERED' | 'WITHDRAWN';
export type RegistrationClosedReason =
  | 'NOT_DISCOVERABLE' | 'NOT_OPEN_YET' | 'REGISTRATION_ENDED' | 'EVENT_STARTED' | 'FULL';

export interface EventVenue {
  name: string;
  location: string | null;
}

/** CF-18: public fields only; the API never returns organiser or review data here. */
export interface PublicEvent {
  id: string;
  name: string | null;
  purpose: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  venue: EventVenue | null;
  registrationCapacity: number | null;
  registeredCount: number;
  spotsLeft: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  isOpen: boolean;
  closedReason: RegistrationClosedReason | null;
  myRegistrationStatus: RegistrationStatus | null;
}

export interface RegistrationResult {
  registrationId: string;
  eventRequestId: string;
  status: RegistrationStatus;
  registeredAt: string;
  withdrawnAt: string | null;
}

export interface MyRegistration extends RegistrationResult {
  event: {
    id: string;
    name: string | null;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    venue: EventVenue | null;
    canWithdraw: boolean;
  };
}

export interface AttendeeList {
  eventRequestId: string;
  counts: { registered: number; withdrawn: number; capacity: number | null; spotsLeft: number | null };
  items: Array<{
    registrationId: string;
    displayName: string;
    email: string;
    status: RegistrationStatus;
    registeredAt: string;
    withdrawnAt: string | null;
  }>;
}

const eventPath = (id: string) => `/api/registrations/events/${encodeURIComponent(id)}` as const;

export async function fetchDiscoverableEvents(signal?: AbortSignal): Promise<PublicEvent[]> {
  return (await getJson<{ items: PublicEvent[] }>('/api/registrations/events', signal)).items;
}

export function fetchDiscoverableEvent(id: string, signal?: AbortSignal): Promise<PublicEvent> {
  return getJson<PublicEvent>(eventPath(id), signal);
}

export function registerForEvent(id: string, signal?: AbortSignal): Promise<RegistrationResult> {
  return postJson<RegistrationResult>(`${eventPath(id)}/register`, {}, signal);
}

export function withdrawFromEvent(id: string, signal?: AbortSignal): Promise<RegistrationResult> {
  return postJson<RegistrationResult>(`${eventPath(id)}/withdraw`, {}, signal);
}

export async function fetchMyRegistrations(signal?: AbortSignal): Promise<MyRegistration[]> {
  return (await getJson<{ items: MyRegistration[] }>('/api/registrations/mine', signal)).items;
}

export function fetchAttendees(id: string, signal?: AbortSignal): Promise<AttendeeList> {
  return getJson<AttendeeList>(`${eventPath(id)}/attendees`, signal);
}
