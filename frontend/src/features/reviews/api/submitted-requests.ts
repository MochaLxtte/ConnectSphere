import { getJson, postJson } from '../../../lib/api-client';
import type { ReviewDecision, ReviewQueueItem, ReviewRequestDetail, ReviewSubmission } from '../types';

/** KAN-33: coordinator review queue. */
export async function fetchReviewQueue(signal?: AbortSignal): Promise<ReviewQueueItem[]> {
  const result = await getJson<{ items: ReviewQueueItem[] }>('/api/events', signal);
  return result.items;
}

/** KAN-33: full detail for one reviewable request. */
export function fetchReviewRequestDetail(
  eventRequestId: string,
  signal?: AbortSignal,
): Promise<ReviewRequestDetail> {
  return getJson<ReviewRequestDetail>(`/api/events/${eventRequestId}`, signal);
}

/** KAN-36: record an approval/rejection. Owned by Tristan's workstream; called from here. */
export interface SavedReview {
  reviewId: string;
  eventRequestId: string;
  reviewedBy: string;
  decision: ReviewDecision;
  reason: string | null;
}

export function submitReview(
  { eventRequestId, input }: ReviewSubmission,
  signal?: AbortSignal,
): Promise<SavedReview> {
  return postJson<SavedReview>(`/api/events/${eventRequestId}/reviews`, input, signal);
}
