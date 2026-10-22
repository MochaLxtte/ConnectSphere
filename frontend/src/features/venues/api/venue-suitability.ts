import { getJson, postJson } from '../../../lib/api-client';

export interface SuitabilityEvent {
  id: string;
  name: string | null;
  startsAt: string | null;
  endsAt: string | null;
  expectedAttendance: number | null;
  venueRequirements: string | null;
  accessibilityNeeds: string | null;
}

export interface SuitabilityVenue {
  id: string;
  name: string;
  capacity: number;
  facilities: string[];
  accessibilityFeatures: string[];
  layouts: string[];
  wheelchairAccessible: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface VenueSuitabilityContext {
  event: SuitabilityEvent;
  requirementsVersion: string;
  venues: SuitabilityVenue[];
}

export interface VenueSuitabilityInput {
  venueId: string;
  requirementsVersion: string;
  facilities: string[];
  accessibility: string[];
  layout: string | null;
  wheelchairRequired: boolean;
  requirementsConfirmed: boolean;
  unresolvedRequirements: string | null;
}

export interface VenueSuitabilityCheck {
  key: 'venueActive' | 'capacity' | 'facilities' | 'accessibility' | 'layout' | 'availability' | 'requirements';
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  message: string;
}

export interface VenueSuitabilityAssessment {
  eventId: string;
  eventName: string | null;
  venueId: string;
  venueName: string;
  occupiedStartsAt?: string | null;
  occupiedEndsAt?: string | null;
  checkedAt: string;
  outcome: 'SUITABLE' | 'UNSUITABLE' | 'NEEDS_REVIEW';
  checks: VenueSuitabilityCheck[];
}

export function fetchVenueSuitabilityContext(eventId: string, signal?: AbortSignal): Promise<VenueSuitabilityContext> {
  return getJson<VenueSuitabilityContext>(`/api/events/${encodeURIComponent(eventId)}/venue-suitability`, signal);
}

export async function assessVenueSuitability(
  eventId: string, input: VenueSuitabilityInput, signal?: AbortSignal,
): Promise<VenueSuitabilityAssessment> {
  return (await postJson<{ assessment: VenueSuitabilityAssessment }>(
    `/api/events/${encodeURIComponent(eventId)}/venue-suitability`, input, signal,
  )).assessment;
}
