import type { UserRole } from '../auth/types.js';
import { DraftEligibilityError } from './draft-eligibility.js';
import type { DraftUpdateInput } from './draft-update-input.js';
import type { EventStatus } from './types.js';

export type EditableField = keyof DraftUpdateInput;

/** KAN-66-AC102 / S3-P05: the only fields an approved event may change without KAN-15 review. */
export const ORDINARY_FIELDS = ['name', 'description'] as const satisfies readonly EditableField[];

/** KAN-66-AC7 / KAN-15-AC102: these change arrangements or registrations, so they need review. */
export const SIGNIFICANT_FIELDS = [
  'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements', 'accessibilityNeeds',
  'equipmentRequirements', 'registrationRequired', 'registrationCapacity', 'registrationOpensAt',
  'registrationClosesAt',
] as const satisfies readonly EditableField[];

export const ALL_EDITABLE_FIELDS: readonly EditableField[] = [...ORDINARY_FIELDS, ...SIGNIFICANT_FIELDS];

/**
 * DRAFT keeps KAN-34's incomplete-draft rules. PRE_APPROVAL edits must still pass submission
 * validation (KAN-66-AC101). PLANNING is the assigned coordinator's ordinary edit of an approved
 * event (KAN-66-AC102). The last two are revision-checked and audited (KAN-66-AC103).
 */
export type EditMode = 'DRAFT' | 'PRE_APPROVAL' | 'PLANNING';

export interface PlanningEditContext {
  /** From verified identity, never from the request body. */
  actorId: string;
  actorRole: UserRole | null;
  /** From the stored (locked) request, never from the request body. */
  ownerId: string;
  coordinatorId: string | null;
  status: EventStatus;
}

export interface EditPermission {
  mode: EditMode;
  fields: readonly EditableField[];
}

const preApprovalStatuses: readonly EventStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'];
const planningStatuses: readonly EventStatus[] = ['APPROVED', 'CONFIRMED'];

type Relation = 'OWNER' | 'ASSIGNED_COORDINATOR';

function relationOf(context: PlanningEditContext): Relation | null {
  if (context.actorRole === 'EVENT_ORGANISER' && context.actorId === context.ownerId) return 'OWNER';
  if (context.actorRole === 'EVENT_COORDINATOR' && context.coordinatorId === context.actorId &&
      context.status !== 'DRAFT') return 'ASSIGNED_COORDINATOR';
  return null;
}

/** What this actor may edit directly now; `null` means no direct edit at all. Never throws. */
export function editPermissionFor(context: PlanningEditContext): EditPermission | null {
  const relation = relationOf(context);
  if (relation === 'OWNER' && context.status === 'DRAFT') {
    return { mode: 'DRAFT', fields: ALL_EDITABLE_FIELDS };
  }
  if (relation === 'OWNER' && preApprovalStatuses.includes(context.status)) {
    return { mode: 'PRE_APPROVAL', fields: ALL_EDITABLE_FIELDS };
  }
  if (relation === 'ASSIGNED_COORDINATOR' && planningStatuses.includes(context.status)) {
    return { mode: 'PLANNING', fields: ORDINARY_FIELDS };
  }
  return null;
}

/**
 * Check a requested edit against the locked request, explaining any refusal. The caller rechecks
 * this inside the write transaction; a client's own field list is never trusted (KAN-66-AC103).
 */
export function assertCanEditFields(
  context: PlanningEditContext,
  requested: readonly EditableField[],
): EditMode {
  const relation = relationOf(context);
  // Unrelated actors learn nothing about the request's existence or state (KAN-66-AC4).
  if (!relation) {
    throw new DraftEligibilityError('DRAFT_EDIT_FORBIDDEN', 'You are not authorised to edit this event request.');
  }

  const permission = editPermissionFor(context);
  if (permission) {
    const refused = requested.filter((field) => !permission.fields.includes(field));
    if (refused.length === 0) return permission.mode;
    // Only PLANNING restricts fields, and everything outside it is a significant change.
    throw new DraftEligibilityError(
      'SIGNIFICANT_CHANGE_REQUIRED',
      'Changes to these details need a reviewed change request once the event is approved.',
      refused,
    );
  }

  if (planningStatuses.includes(context.status)) {
    const significant = requested.filter((field) => (SIGNIFICANT_FIELDS as readonly string[]).includes(field));
    if (significant.length > 0) {
      throw new DraftEligibilityError(
        'SIGNIFICANT_CHANGE_REQUIRED',
        'Changes to these details need a reviewed change request once the event is approved.',
        significant,
      );
    }
    throw new DraftEligibilityError(
      'EDIT_ROLE_NOT_PERMITTED',
      'Only the assigned coordinator can edit the name or description of an approved event.',
    );
  }
  if (preApprovalStatuses.includes(context.status)) {
    throw new DraftEligibilityError(
      'EDIT_ROLE_NOT_PERMITTED',
      'Only the organiser can edit this event request before it is approved.',
    );
  }
  throw new DraftEligibilityError('EVENT_NOT_EDITABLE', 'This event can no longer be edited.');
}
