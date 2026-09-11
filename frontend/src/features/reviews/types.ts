export type ReviewDecision = 'APPROVED' | 'REJECTED';

export interface ReviewRequestSummary {
  id: string;
  status: string;
  recordedDecision?: ReviewDecision | null;
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
