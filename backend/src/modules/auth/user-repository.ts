import type { AuthenticatedUser, UserRole } from './types.js';

export interface AuthDatabase {
  query<Row extends Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

function isUserRole(value: string): value is UserRole {
  return [
    'EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE',
  ].includes(value);
}

/** Resolve a Firebase subject to the application-owned profile and role. */
export async function findUserByFirebaseUid(
  database: AuthDatabase, firebaseUid: string,
): Promise<AuthenticatedUser | null> {
  const result = await database.query<UserRow>(`
    SELECT u.id, u.email, u.display_name, u.role
    FROM app_user_identities AS identity
    JOIN app_users AS u ON u.id = identity.user_id
    WHERE identity.firebase_uid = $1
  `, [firebaseUid]);
  const row = result.rows[0];
  if (!row || !isUserRole(row.role)) return null;
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}
