import { ApiError, getJson } from '../../../lib/api-client';
import type { ReviewRequestDetail } from '../../reviews/types';

/** Organiser and coordinator detail views share the same response contract. */
export type EventRequestDetail = ReviewRequestDetail;

export function fetchEventRequestDetail(id: string, signal?: AbortSignal): Promise<EventRequestDetail> {
  return getJson<EventRequestDetail>(`/api/events/${encodeURIComponent(id)}`, signal);
}

/** KAN-16: summary from the organiser's ownership-scoped list. */
export interface EventRequestListItem {
  id: string;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchEventRequests(signal?: AbortSignal): Promise<EventRequestListItem[]> {
  const result = await getJson<{ items: EventRequestListItem[] }>('/api/events?scope=all', signal);
  return result.items;
}

/** Editable draft fields accepted by `POST /api/events` and `PATCH /api/events/:id`. */
export interface EventDraftInput {
  name: string | null;
  purpose: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  expectedAttendance: number | null;
  venueRequirements: string | null;
  accessibilityNeeds: string | null;
  equipmentRequirements: string | null;
  registrationRequired: boolean | null;
  registrationCapacity: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
}

/** Flat event shape returned by the draft create, update and submit routes. */
export interface SavedEventRequest extends EventDraftInput {
  id: string;
  organiserId: string;
  coordinatorId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** 400 SUBMISSION_INCOMPLETE: the draft was kept, but these fields must be completed first. */
export class SubmissionIncompleteError extends ApiError {
  constructor(message: string, public readonly missingFields: string[]) {
    super(message, 400, 'SUBMISSION_INCOMPLETE');
    this.name = 'SubmissionIncompleteError';
  }
}

interface ErrorBody { error: { code: string; message: string; missingFields?: unknown } }

function isErrorBody(value: unknown): value is ErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = value.error;
  return typeof error === 'object' && error !== null &&
    'code' in error && typeof error.code === 'string' &&
    'message' in error && typeof error.message === 'string';
}

/** Same-origin write that also keeps the `missingFields` detail the shared client drops. */
async function sendJson<T>(
  method: 'POST' | 'PATCH', path: `/api/${string}`, body: unknown, signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      'Unable to reach the API. Check that the backend is running, then try again.', 0, 'NETWORK_ERROR',
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'The API returned an unreadable response. Check the backend and try again.',
      response.status, 'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    if (isErrorBody(data)) {
      const { code, message, missingFields } = data.error;
      if (code === 'SUBMISSION_INCOMPLETE' && Array.isArray(missingFields)) {
        throw new SubmissionIncompleteError(
          message, missingFields.filter((field): field is string => typeof field === 'string'),
        );
      }
      throw new ApiError(message, response.status, code);
    }
    throw new ApiError(
      `The request failed (HTTP ${response.status}). Please try again.`, response.status, 'REQUEST_FAILED',
    );
  }
  return data as T;
}

/** CF-02: the server takes the owner from the session, so only draft fields are sent. */
export function createDraft(input: Partial<EventDraftInput>, signal?: AbortSignal): Promise<SavedEventRequest> {
  return sendJson<SavedEventRequest>('POST', '/api/events', input, signal);
}

/** CF-03: send only the changed fields; omitted fields keep their saved values. */
export function updateDraft(
  id: string, changes: Partial<EventDraftInput>, signal?: AbortSignal,
): Promise<SavedEventRequest> {
  return sendJson<SavedEventRequest>('PATCH', `/api/events/${encodeURIComponent(id)}`, changes, signal);
}

/** CF-02: submit an owned draft. Throws SubmissionIncompleteError when fields are still missing. */
export function submitRequest(id: string, signal?: AbortSignal): Promise<SavedEventRequest> {
  return sendJson<SavedEventRequest>('POST', `/api/events/${encodeURIComponent(id)}/submit`, {}, signal);
}
