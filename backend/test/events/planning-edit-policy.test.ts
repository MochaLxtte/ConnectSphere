import { describe, expect, it } from 'vitest';
import { DraftEligibilityError } from '../../src/modules/events/draft-eligibility.js';
import {
  ALL_EDITABLE_FIELDS, assertCanEditFields, editPermissionFor, ORDINARY_FIELDS, SIGNIFICANT_FIELDS,
  type PlanningEditContext,
} from '../../src/modules/events/planning-edit-policy.js';
import type { EventStatus } from '../../src/modules/events/types.js';

const ownerId = '10000000-0000-4000-8000-000000000001';
const coordinatorId = '20000000-0000-4000-8000-000000000001';
const owner = (status: EventStatus): PlanningEditContext => ({
  actorId: ownerId, actorRole: 'EVENT_ORGANISER', ownerId, coordinatorId, status,
});
const assigned = (status: EventStatus): PlanningEditContext => ({
  actorId: coordinatorId, actorRole: 'EVENT_COORDINATOR', ownerId, coordinatorId, status,
});

function refusal(context: PlanningEditContext, fields: Parameters<typeof assertCanEditFields>[1]) {
  try {
    assertCanEditFields(context, fields);
  } catch (error) {
    expect(error).toBeInstanceOf(DraftEligibilityError);
    return error as DraftEligibilityError;
  }
  throw new Error('Expected the edit to be refused.');
}

describe('KAN-66 planning edit policy', () => {
  it('KAN-66-AC6/AC7 treats dates, attendance, venue and equipment needs as significant', () => {
    expect(ORDINARY_FIELDS).toEqual(['name', 'description']);
    expect(SIGNIFICANT_FIELDS).toEqual(expect.arrayContaining([
      'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements', 'equipmentRequirements',
      'purpose', 'accessibilityNeeds', 'registrationRequired', 'registrationCapacity',
    ]));
    expect(new Set(ALL_EDITABLE_FIELDS).size).toBe(ORDINARY_FIELDS.length + SIGNIFICANT_FIELDS.length);
  });

  it('keeps KAN-34 draft editing for the owner only', () => {
    expect(editPermissionFor(owner('DRAFT'))).toEqual({ mode: 'DRAFT', fields: ALL_EDITABLE_FIELDS });
    expect(assertCanEditFields(owner('DRAFT'), ['purpose'])).toBe('DRAFT');
    // Coordinators never see drafts, so even an assigned one is treated as unrelated.
    expect(editPermissionFor(assigned('DRAFT'))).toBeNull();
    expect(refusal(assigned('DRAFT'), ['name']).code).toBe('DRAFT_EDIT_FORBIDDEN');
  });

  it.each(['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'] as const)(
    'KAN-66-AC101 lets the owner edit every field while %s', (status) => {
      expect(editPermissionFor(owner(status))).toEqual({ mode: 'PRE_APPROVAL', fields: ALL_EDITABLE_FIELDS });
      expect(assertCanEditFields(owner(status), [...ALL_EDITABLE_FIELDS])).toBe('PRE_APPROVAL');
      expect(editPermissionFor(assigned(status))).toBeNull();
      const error = refusal(assigned(status), ['name']);
      expect(error.code).toBe('EDIT_ROLE_NOT_PERMITTED');
      expect(error.message).toBe('Only the organiser can edit this event request before it is approved.');
    },
  );

  it.each(['APPROVED', 'CONFIRMED'] as const)(
    'KAN-66-AC102 limits direct %s edits to the assigned coordinator name/description', (status) => {
      expect(editPermissionFor(assigned(status))).toEqual({ mode: 'PLANNING', fields: ORDINARY_FIELDS });
      expect(assertCanEditFields(assigned(status), ['name', 'description'])).toBe('PLANNING');

      const coordinatorError = refusal(assigned(status), ['name', 'startsAt', 'expectedAttendance']);
      expect(coordinatorError.code).toBe('SIGNIFICANT_CHANGE_REQUIRED');
      expect(coordinatorError.fields).toEqual(['startsAt', 'expectedAttendance']);

      expect(editPermissionFor(owner(status))).toBeNull();
      const ownerSignificant = refusal(owner(status), ['description', 'venueRequirements']);
      expect(ownerSignificant.code).toBe('SIGNIFICANT_CHANGE_REQUIRED');
      expect(ownerSignificant.fields).toEqual(['venueRequirements']);
      const ownerOrdinary = refusal(owner(status), ['name']);
      expect(ownerOrdinary.code).toBe('EDIT_ROLE_NOT_PERMITTED');
      expect(ownerOrdinary.fields).toEqual([]);
    },
  );

  it.each(['REJECTED', 'CANCELLED', 'COMPLETED'] as const)('refuses every edit once %s', (status) => {
    expect(editPermissionFor(owner(status))).toBeNull();
    expect(editPermissionFor(assigned(status))).toBeNull();
    expect(refusal(owner(status), ['name']).code).toBe('EVENT_NOT_EDITABLE');
    expect(refusal(assigned(status), ['description']).code).toBe('EVENT_NOT_EDITABLE');
  });

  it('KAN-66-AC4 treats other organisers, other coordinators and other roles as unrelated', () => {
    const unrelated: PlanningEditContext[] = [
      { ...owner('SUBMITTED'), actorId: coordinatorId },
      { ...assigned('APPROVED'), actorId: ownerId },
      { ...assigned('APPROVED'), coordinatorId: null },
      { ...owner('SUBMITTED'), actorRole: 'VENUE_STAFF' },
      { ...owner('SUBMITTED'), actorRole: null },
    ];
    for (const context of unrelated) {
      expect(editPermissionFor(context)).toBeNull();
      expect(refusal(context, ['name']).code).toBe('DRAFT_EDIT_FORBIDDEN');
    }
  });
});
