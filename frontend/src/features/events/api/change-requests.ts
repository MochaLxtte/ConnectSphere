import { getJson, postJson } from '../../../lib/api-client';
import type { EventDraftInput } from './event-requests';

/** KAN-15-AC102: the details that change only through a reviewed change request. */
export const SIGNIFICANT_FIELDS = [
  'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements', 'accessibilityNeeds',
  'equipmentRequirements', 'registrationRequired', 'registrationCapacity', 'registrationOpensAt',
  'registrationClosesAt',
] as const satisfies readonly (keyof EventDraftInput)[];
export type SignificantField = (typeof SIGNIFICANT_FIELDS)[number];
export type ChangeValues = Partial<Record<SignificantField, unknown>>;

export interface ArrangementRecord {
  kind: 'VENUE_BOOKING' | 'EQUIPMENT_REQUEST';
  id: string;
  label: string;
  status: string;
  quantity: number | null;
}

export interface ChangeImpact {
  affectedKinds: ('VENUE' | 'EQUIPMENT' | 'REGISTRATION')[];
  confirmed: ArrangementRecord[];
  pending: ArrangementRecord[];
  activeRegistrations: number;
  eventConfirmed: boolean;
  canApprove: boolean;
  blockedReason: string | null;
}

export interface ChangeRequestRecord {
  id: string;
  eventRequestId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  requestedById: string;
  requestedByName: string;
  proposed: ChangeValues;
  previous: ChangeValues;
  baseRevision: number;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  appliedRevision: number | null;
  cancelledArrangements: { venueBookings: string[]; equipmentRequests: string[] } | null;
  createdAt: string;
  current?: ChangeValues;
  outdated?: boolean;
  impact?: ChangeImpact;
}

const base = (eventRequestId: string) =>
  `/api/events/${encodeURIComponent(eventRequestId)}/change-requests` as const;
const one = (eventRequestId: string, changeRequestId: string) =>
  `${base(eventRequestId)}/${encodeURIComponent(changeRequestId)}` as const;

export async function fetchChangeRequests(eventRequestId: string, signal?: AbortSignal): Promise<ChangeRequestRecord[]> {
  return (await getJson<{ items: ChangeRequestRecord[] }>(base(eventRequestId), signal)).items;
}

export function submitChangeRequest(
  eventRequestId: string, changes: ChangeValues, expectedRevision: number, signal?: AbortSignal,
) {
  return postJson<ChangeRequestRecord>(base(eventRequestId), { changes, expectedRevision }, signal);
}

export function decideChangeRequest(
  eventRequestId: string, changeRequestId: string,
  decision: { decision: 'APPROVED' | 'REJECTED'; reason?: string }, expectedRevision: number, signal?: AbortSignal,
) {
  return postJson<ChangeRequestRecord>(`${one(eventRequestId, changeRequestId)}/decision`,
    { ...decision, expectedRevision }, signal);
}

export function withdrawChangeRequest(eventRequestId: string, changeRequestId: string, signal?: AbortSignal) {
  return postJson<ChangeRequestRecord>(`${one(eventRequestId, changeRequestId)}/withdraw`, {}, signal);
}
