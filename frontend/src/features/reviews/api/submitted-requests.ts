import { getJson, postJson } from '../../../lib/api-client';
import type { ReviewQueueItem, ReviewRequestDetail, ReviewSubmission, SavedReview } from '../types';

/** KAN-33: coordinator review queue. */
export async function fetchReviewQueue(signal?: AbortSignal): Promise<ReviewQueueItem[]> {
  const result = await getJson<{ items: ReviewQueueItem[] }>('/api/events', signal);
  return result.items;
}

/** KAN-33 / KAN-36: authorised detail, including requests with a recorded decision. */
export function fetchReviewRequestDetail(
  eventRequestId: string,
  signal?: AbortSignal,
): Promise<ReviewRequestDetail> {
  return getJson<ReviewRequestDetail>(`/api/events/${eventRequestId}`, signal);
}

/** KAN-36: record an approval/rejection. */
export function submitReview(
  { eventRequestId, input }: ReviewSubmission,
  signal?: AbortSignal,
): Promise<SavedReview> {
  return postJson<SavedReview>(`/api/events/${eventRequestId}/reviews`, input, signal);
}
