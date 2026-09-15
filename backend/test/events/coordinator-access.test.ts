import { describe, expect, it } from 'vitest';
import { USER_ROLES } from '../../src/modules/auth/types.js';
import { isAssignedCoordinator } from '../../src/modules/events/coordinator-access.js';

const coordinatorId = '10000000-0000-4000-8000-000000000001';

describe('KAN-36 assigned-coordinator access', () => {
  it.each(USER_ROLES)('requires the coordinator role even when the application ID matches: %s', (role) => {
    expect(isAssignedCoordinator({ id: coordinatorId, role }, { coordinatorId }))
      .toBe(role === 'EVENT_COORDINATOR');
  });

  it('denies another coordinator and an unassigned request', () => {
    const actor = { id: coordinatorId, role: 'EVENT_COORDINATOR' as const };
    expect(isAssignedCoordinator(actor, { coordinatorId: '10000000-0000-4000-8000-000000000002' }))
      .toBe(false);
    expect(isAssignedCoordinator(actor, { coordinatorId: null })).toBe(false);
  });
});
