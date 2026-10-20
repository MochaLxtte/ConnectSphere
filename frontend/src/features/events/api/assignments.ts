import { ApiError, getJson } from '../../../lib/api-client';

/** KAN-79: a submitted request awaiting a Lead's initial allocation. */
export interface UnassignedRequest {
  id: string;
  name: string | null;
  status: string;
  organiserName: string;
  startsAt: string | null;
  endsAt: string | null;
  expectedAttendance: number | null;
  updatedAt: string;
}

export interface CoordinatorOption {
  id: string;
  displayName: string;
  email: string;
}

export interface LeadEventSummary extends UnassignedRequest {
  coordinatorId: string | null;
  coordinatorName: string | null;
}

export interface LeadEventDetail extends LeadEventSummary {
  purpose: string | null;
  description: string | null;
  venueRequirements: string | null;
  accessibilityNeeds: string | null;
  equipmentRequirements: string | null;
  registrationRequired: boolean | null;
  assignmentVersion: string | null;
  actions: { canAssignCoordinator: boolean; canReassignCoordinator: boolean };
}

export async function fetchLeadEvents(signal?: AbortSignal): Promise<LeadEventSummary[]> {
  return (await getJson<{ items: LeadEventSummary[] }>('/api/events/oversight', signal)).items;
}

export function fetchLeadEvent(id: string, signal?: AbortSignal): Promise<LeadEventDetail> {
  return getJson<LeadEventDetail>(`/api/events/oversight/${encodeURIComponent(id)}`, signal);
}

export interface AssignmentRecord {
  id: string;
  coordinatorId: string;
  coordinatorName: string;
  assignmentMethod: 'AUTOMATIC' | 'MANUAL';
  assignedById: string | null;
  assignedByName: string | null;
  note: string | null;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface AssignmentResult {
  eventRequestId: string;
  assignmentId: string;
  coordinatorId: string;
  previousCoordinatorId: string | null;
}

export interface ReassignmentInput {
  coordinatorId: string;
  reason: string;
  expectedAssignmentVersion: string;
}

export interface ReassignmentResult extends AssignmentResult {
  changed: boolean;
}

const event = (id: string) => `/api/events/${encodeURIComponent(id)}` as const;

export async function fetchUnassignedRequests(signal?: AbortSignal): Promise<UnassignedRequest[]> {
  return (await getJson<{ items: UnassignedRequest[] }>('/api/events/unassigned', signal)).items;
}

export async function fetchCoordinators(signal?: AbortSignal): Promise<CoordinatorOption[]> {
  return (await getJson<{ items: CoordinatorOption[] }>('/api/events/coordinators', signal)).items;
}

export async function fetchAssignments(eventRequestId: string, signal?: AbortSignal): Promise<AssignmentRecord[]> {
  return (await getJson<{ items: AssignmentRecord[] }>(`${event(eventRequestId)}/assignments`, signal)).items;
}

/** Allocation writes require explicit reconciliation after an uncertain response. */
async function writeAssignment(path: string, method: 'PUT' | 'POST', input: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('Unable to reach the API. Check that the backend is running, then try again.', 0, 'NETWORK_ERROR');
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('The API returned an unreadable response. Check the backend and try again.', response.status, 'INVALID_RESPONSE');
  }
  if (!response.ok) {
    const envelope = data as { error?: { code?: unknown; message?: unknown } } | null;
    if (typeof envelope?.error?.code === 'string' && typeof envelope.error.message === 'string') {
      throw new ApiError(envelope.error.message, response.status, envelope.error.code);
    }
    throw new ApiError(`The request failed (HTTP ${response.status}). Please try again.`, response.status, 'REQUEST_FAILED');
  }
  return data;
}

export async function assignCoordinator(
  eventRequestId: string,
  input: { coordinatorId: string; note?: string | null },
  signal?: AbortSignal,
): Promise<AssignmentResult> {
  return await writeAssignment(`${event(eventRequestId)}/coordinator`, 'PUT', input, signal) as AssignmentResult;
}

export async function reassignCoordinator(
  eventRequestId: string, input: ReassignmentInput, signal?: AbortSignal,
): Promise<ReassignmentResult> {
  const data = await writeAssignment(`${event(eventRequestId)}/coordinator/reassign`, 'POST', input, signal);
  if (!data || typeof data !== 'object' || !('changed' in data) || typeof data.changed !== 'boolean'
    || !('eventRequestId' in data) || data.eventRequestId !== eventRequestId
    || !('assignmentId' in data) || typeof data.assignmentId !== 'string'
    || !('coordinatorId' in data) || data.coordinatorId !== input.coordinatorId
    || !('previousCoordinatorId' in data) || typeof data.previousCoordinatorId !== 'string') {
    throw new ApiError('The reassignment response could not be confirmed. Refresh the assignment before trying again.', 200, 'INVALID_RESPONSE');
  }
  return data as ReassignmentResult;
}
