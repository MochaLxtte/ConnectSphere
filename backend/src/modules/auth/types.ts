/** Product roles; authorization still needs to be implemented by the auth workstream. */
export const USER_ROLES = [
  'EVENT_ORGANISER',
  'EVENT_COORDINATOR',
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

/** Populated only after the eventual authentication middleware verifies a session. */
export type AuthenticatedUser = UserSummary;
