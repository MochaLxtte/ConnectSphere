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

/** KAN-66: include the displayed revision when known, so a stale reviewer must refresh. */
const revisionField = (expectedRevision?: number) => expectedRevision === undefined ? {} : { expectedRevision };

export function requestClarification(
  eventRequestId: string, message: string, signal?: AbortSignal, expectedRevision?: number,
) {
  return postJson<ClarificationResult>(
    `${event(eventRequestId)}/clarifications`, { message, ...revisionField(expectedRevision) }, signal,
  );
}

export function respondToClarification(
  eventRequestId: string, clarificationId: string, response: string, signal?: AbortSignal,
) {
  return postJson<ClarificationResult>(
    `${event(eventRequestId)}/clarifications/${encodeURIComponent(clarificationId)}/response`, { response }, signal,
  );
}

export function startReview(eventRequestId: string, signal?: AbortSignal, expectedRevision?: number) {
  return postJson<{ eventRequestId: string; status: string }>(
    `${event(eventRequestId)}/start-review`, revisionField(expectedRevision), signal,
  );
}
