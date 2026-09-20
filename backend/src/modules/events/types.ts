/** Proposed workflow vocabulary; confirm with the customer before implementing transitions. */
export const EVENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CLARIFICATION_REQUESTED',
  'APPROVED',
  'REJECTED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Nullable fields allow incomplete drafts. Submit validation is a separate story. */
export interface EventDraftFields {
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
}

/** IDs are UUID strings; timestamps are ISO 8601 strings in API representations. */
export interface EventRecord extends EventDraftFields {
  id: string;
  organiserId: string;
  coordinatorId: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

/** Server-owned fields such as organiserId and status are deliberately excluded. */
export type SaveEventDraftInput = Partial<EventDraftFields>;
