import type { UserRole } from '../auth/session.js';

/** KAN-51: the internal roles agreed on 21 September. Express enforces the same list. */
export const VENUE_CALENDAR_ROLES: readonly UserRole[] = [
  'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF',
];

export function canViewVenueAvailability(role: UserRole | null | undefined): boolean {
  return role != null && VENUE_CALENDAR_ROLES.includes(role);
}
