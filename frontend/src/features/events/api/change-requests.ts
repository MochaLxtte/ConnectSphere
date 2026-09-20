import { getJson, postJson } from '../../../lib/api-client';

/** CF-19: fields an organiser may propose to change after approval. */
export interface ProposedChanges {
  name?: string | null;
  purpose?: string | null;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  expectedAttendance?: number | null;
  venueRequirements?: string | null;
  accessibilityNeeds?: string | null;
  equipmentRequirements?: string | null;
  registrationRequired?: boolean | null;
}

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface ChangeRequestRecord {
  id: string;
  eventRequestId: string;
  requestedById: string;
  requestedByName: string;
  status: ChangeRequestStatus;
  proposedChanges: ProposedChanges;
  reason: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeDecisionResult {
  changeRequestId: string;
  eventRequestId: string;
  status: 'APPROVED' | 'REJECTED';
  eventStatus: string;
  cancelledVenueBookings: number;
  cancelledEquipmentRequests: number;
}

const base = (id: string) => `/api/events/${encodeURIComponent(id)}/change-requests` as const;

export async function fetchChangeRequests(eventRequestId: string, signal?: AbortSignal): Promise<ChangeRequestRecord[]> {
  return (await getJson<{ items: ChangeRequestRecord[] }>(base(eventRequestId), signal)).items;
}

export function createChangeRequest(
  eventRequestId: string, input: { proposedChanges: ProposedChanges; reason: string }, signal?: AbortSignal,
) {
  return postJson<{ changeRequestId: string; eventRequestId: string; status: 'PENDING' }>(
    base(eventRequestId), input, signal,
  );
}

export function withdrawChangeRequest(eventRequestId: string, changeRequestId: string, signal?: AbortSignal) {
  return postJson<{ changeRequestId: string; eventRequestId: string; status: 'WITHDRAWN' }>(
    `${base(eventRequestId)}/${encodeURIComponent(changeRequestId)}/withdraw`, {}, signal,
  );
}

export function decideChangeRequest(
  eventRequestId: string, changeRequestId: string,
  input: { decision: 'APPROVED' | 'REJECTED'; reason?: string | null }, signal?: AbortSignal,
) {
  return postJson<ChangeDecisionResult>(
    `${base(eventRequestId)}/${encodeURIComponent(changeRequestId)}/decision`, input, signal,
  );
}
