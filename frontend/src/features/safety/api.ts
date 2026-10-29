import { getJson, postJson } from '../../lib/api-client.js';
import type { ReadinessCheck } from '../events/api/arrangements.js';

/** KAN-84 / CR-6: safety review rounds and the preparation gate. */
export type SafetyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
export type SafetyOutcome = 'NONE' | SafetyStatus | 'STALE';
export type SafetyArea = 'VENUE' | 'TECHNICAL';
export type SafetyNoteField = 'emergencyAccess' | 'equipmentPlacement' | 'crowdMovement';
export interface SafetyRound {
  id: string; round: number; status: SafetyStatus;
  emergencyAccess: string | null; equipmentPlacement: string | null; crowdMovement: string | null;
  submittedByName: string | null; submittedAt: string; decidedByName: string | null; decidedAt: string | null;
  decisionNotes: string | null; requestedAreas: SafetyArea[] | null; missingNotes: SafetyNoteField[];
}
export interface Readiness { ready: boolean; checks: ReadinessCheck[] }
export interface EventSafety {
  eventRequestId: string; eventStatus: string; outcome: SafetyOutcome; readiness: Readiness | null;
  pendingStale: boolean; rounds: SafetyRound[]; unresolvedAreas: SafetyArea[];
  preparation: { startedAt: string; startedByName: string | null; blocked: boolean } | null;
  canSubmit: boolean; canStartPreparation: boolean;
}
export interface SafetyQueueItem {
  id: string; round: number; eventId: string; eventName: string | null; startsAt: string | null; submittedAt: string; stale: boolean;
}
export interface SafetyReviewDetail {
  review: SafetyRound & { fingerprint: string };
  stale: boolean; canDecide: boolean;
  event: { id: string; name: string | null; status: string; startsAt: string | null; endsAt: string | null;
    expectedAttendance: number | null; venueRequirements: string | null; accessibilityNeeds: string | null;
    equipmentRequirements: string | null; equipmentPlanStatus: string };
  venues: { bookingId: string; name: string; location: string | null; capacity: number; layouts: string[];
    accessibilityFeatures: string[]; wheelchairAccessible: boolean; bookedLayout: string | null; status: string; needsRecovery: boolean;
    opensAt: string | null; closesAt: string | null; setupMinutes: number; turnaroundMinutes: number }[];
  equipment: { id: string; name: string; quantity: number; status: string }[];
  readiness: Readiness | null;
  rounds: SafetyRound[];
}
export type SafetyNotes = Record<SafetyNoteField, string>;
export interface SafetyDecisionInput { decision: Exclude<SafetyStatus, 'PENDING'>; notes?: string; areas?: SafetyArea[]; fingerprint: string }

const event = (id: string): `/api/${string}` => `/api/events/${encodeURIComponent(id)}`;
const review = (id: string): `/api/${string}` => `/api/safety-reviews/${encodeURIComponent(id)}`;

export const fetchEventSafety = (eventId: string, signal?: AbortSignal) => getJson<EventSafety>(`${event(eventId)}/safety`, signal);
export const submitSafetyReview = (eventId: string, notes: SafetyNotes, signal?: AbortSignal) =>
  postJson<{ eventRequestId: string; review: SafetyRound }>(`${event(eventId)}/safety-reviews`, notes, signal);
export const startPreparation = (eventId: string, signal?: AbortSignal) =>
  postJson<{ eventRequestId: string; changed: boolean }>(`${event(eventId)}/preparation/start`, {}, signal);
export const fetchSafetyQueue = (signal?: AbortSignal) => getJson<{ items: SafetyQueueItem[] }>('/api/safety-reviews', signal);
export const fetchSafetyReview = (id: string, signal?: AbortSignal) => getJson<SafetyReviewDetail>(review(id), signal);
export const decideSafetyReview = (id: string, input: SafetyDecisionInput, signal?: AbortSignal) =>
  postJson<{ changed: boolean; review: SafetyRound }>(`${review(id)}/decision`, input, signal);

export const noteLabels: Record<SafetyNoteField, string> = {
  emergencyAccess: 'Emergency access', equipmentPlacement: 'Equipment placement', crowdMovement: 'Crowd movement',
};
export const statusLabels: Record<SafetyOutcome, string> = {
  NONE: 'Not submitted', PENDING: 'Awaiting Safety Officer', APPROVED: 'Safety approved', REJECTED: 'Rejected',
  CHANGES_REQUESTED: 'Changes requested', STALE: 'Approval out of date',
};
export const areaLabels: Record<SafetyArea, string> = { VENUE: 'Venue', TECHNICAL: 'Technical' };
export const singaporeTime = (value: string) => new Date(value).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
