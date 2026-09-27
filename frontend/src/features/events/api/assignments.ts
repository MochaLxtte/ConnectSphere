import { ApiError, getJson } from '../../../lib/api-client';

/** CF-05: a request no coordinator has picked up yet. */
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

/** The shared client has no PUT helper yet; this mirrors its error handling for one call. */
export async function assignCoordinator(
  eventRequestId: string,
  input: { coordinatorId: string; note?: string | null },
  signal?: AbortSignal,
): Promise<AssignmentResult> {
  let response: Response;
  try {
    response = await fetch(`${event(eventRequestId)}/coordinator`, {
      method: 'PUT',
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
  return data as AssignmentResult;
}
