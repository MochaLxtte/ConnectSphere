import { reactive, readonly } from 'vue';
import { ApiError, getJson, postJson } from '../../lib/api-client.js';
import { getSupabaseAccessToken } from './supabase-client.js';

export type UserRole =
  | 'EVENT_ORGANISER'
  | 'EVENT_COORDINATOR'
  | 'VENUE_STAFF'
  | 'TECHNICAL_SUPPORT_STAFF'
  | 'ATTENDEE';

export interface SignedInUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

const state = reactive<{ user: SignedInUser | null; loading: boolean }>({ user: null, loading: true });
export const authSession = readonly(state);

export function roleLabel(role: UserRole): string {
  return {
    EVENT_ORGANISER: 'Event organiser',
    EVENT_COORDINATOR: 'Event coordinator',
    VENUE_STAFF: 'Venue staff',
    TECHNICAL_SUPPORT_STAFF: 'Technical support staff',
    ATTENDEE: 'Attendee',
  }[role];
}

export async function restoreSession(): Promise<void> {
  state.loading = true;
  try {
    state.user = (await getJson<{ user: SignedInUser }>('/api/auth/me')).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) state.user = null;
    else throw error;
  } finally {
    state.loading = false;
  }
}

export async function signIn(email: string, password: string): Promise<SignedInUser> {
  const accessToken = await getSupabaseAccessToken(email, password);
  const user = (await postJson<{ user: SignedInUser }>('/api/auth/login', { accessToken })).user;
  state.user = user;
  return user;
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new ApiError('Unable to sign out. Please try again.', response.status, 'REQUEST_FAILED');
  state.user = null;
}