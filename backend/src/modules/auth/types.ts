/** Product roles; routes must enforce role and resource ownership using verified identity. */
export const USER_ROLES = [
  'EVENT_ORGANISER',
  'EVENT_COORDINATOR',
  'EVENT_COORDINATOR_LEAD',
  'VENUE_STAFF',
  'TECHNICAL_SUPPORT_STAFF',
  'ATTENDEE',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Safe API representation. Never expose a password hash in an HTTP response. */
export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

/** Populated only after Supabase token verification and application-user mapping. */
export type AuthenticatedUser = UserSummary;
