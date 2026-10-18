import { USER_ROLES, type AuthenticatedUser, type UserRole } from './types.js';

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
  return (USER_ROLES as readonly string[]).includes(value);
}

/** Resolve a Supabase auth user id (uuid) to the application-owned profile and role. */
export async function findUserBySupabaseUid(
  database: AuthDatabase, supabaseUserId: string,
): Promise<AuthenticatedUser | null> {
  const result = await database.query<UserRow>(`
    SELECT id, email, display_name, role
    FROM app_users
    WHERE supabase_user_id = $1
  `, [supabaseUserId]);
  const row = result.rows[0];
  if (!row || !isUserRole(row.role)) return null;
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}
