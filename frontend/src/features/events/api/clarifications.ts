import { getJson, postJson } from '../../../lib/api-client';

/** CF-04 / KAN-27: a question from the coordinator and the answer from the organiser. */
export interface ClarificationRecord {
  id: string;
  eventRequestId: string;
  requestedById: string;
  requestedByName: string;
  message: string;
  response: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export interface ClarificationResult {
  clarificationId: string;
  eventRequestId: string;
  status: string;
}

const event = (id: string) => `/api/events/${encodeURIComponent(id)}` as const;

export async function fetchClarifications(eventRequestId: string, signal?: AbortSignal): Promise<ClarificationRecord[]> {
  return (await getJson<{ items: ClarificationRecord[] }>(`${event(eventRequestId)}/clarifications`, signal)).items;
}

export function requestClarification(eventRequestId: string, message: string, signal?: AbortSignal) {
  return postJson<ClarificationResult>(`${event(eventRequestId)}/clarifications`, { message }, signal);
}

export function respondToClarification(
  eventRequestId: string, clarificationId: string, response: string, signal?: AbortSignal,
) {
  return postJson<ClarificationResult>(
    `${event(eventRequestId)}/clarifications/${encodeURIComponent(clarificationId)}/response`, { response }, signal,
  );
}

export function startReview(eventRequestId: string, signal?: AbortSignal) {
  return postJson<{ eventRequestId: string; status: string }>(`${event(eventRequestId)}/start-review`, {}, signal);
}
