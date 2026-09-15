export type ReviewDecision = 'APPROVED' | 'REJECTED';

export interface SavedReview {
  reviewId: string;
  eventRequestId: string;
  reviewedBy: string;
  decision: ReviewDecision;
  reason: string | null;
}

export interface RecordedReview extends SavedReview {
  createdAt: string;
}

export interface ReviewRequestSummary {
  id: string;
  status: string;
  review?: RecordedReview | null;
}

/** KAN-33 queue row: `GET /api/events` response item. */
export interface ReviewQueueItem {
  id: string;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Shared `GET /api/events/:id` response, including the saved outcome and allowed actions. */
export interface ReviewRequestDetail {
  id: string;
  organiserId: string;
  coordinatorId: string | null;
  status: string;
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
  createdAt: string;
  updatedAt: string;
  review: RecordedReview | null;
  actions: { canEditDraft: boolean; canMakeInitialDecision: boolean };
}

/** The request ID selects the URL; only input belongs in the POST body. */
export interface ReviewSubmission {
  eventRequestId: string;
  input: { decision: ReviewDecision; reason: string | null };
}

/** Scope feedback to its request so a late response cannot affect another open request. */
export type ReviewFeedback = { eventRequestId: string } & (
  | { state: 'saving' }
  | { state: 'saved'; decision: ReviewDecision }
  | { state: 'error'; code: string }
);
