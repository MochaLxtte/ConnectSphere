import { reactive, readonly } from 'vue';
import { ApiError, getJson, postJson } from '../../lib/api-client.js';
import { getSupabaseAccessToken } from './supabase-client.js';

export type UserRole =
  | 'EVENT_ORGANISER'
  | 'EVENT_COORDINATOR'
  | 'EVENT_COORDINATOR_LEAD'
  | 'VENUE_STAFF'
  | 'TECHNICAL_SUPPORT_STAFF'
  | 'ATTENDEE'
  | 'SAFETY_OFFICER';

export interface SignedInUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

const state = reactive<{ user: SignedInUser | null; loading: boolean }>({ user: null, loading: true });
export const authSession = readonly(state);
// A response from an older operation must not restore a superseded browser identity.
let sessionGeneration = 0;
// Cookies are applied by the browser before fetch resolves. Serialize writes as well
// as guarding reactive state, so a late logout cannot erase a newer login cookie.
let sessionWrites: Promise<void> = Promise.resolve();
let pendingSessionWrites = 0;

function orderedSessionWrite<T>(operation: () => Promise<T>): Promise<T> {
  pendingSessionWrites += 1;
  const result = sessionWrites.then(operation).finally(() => { pendingSessionWrites -= 1; });
  // A failed operation is still reported to its caller, but must not block a retry.
  sessionWrites = result.then(() => undefined, () => undefined);
  return result;
}

function requireCurrentSignIn(generation: number): void {
  if (generation !== sessionGeneration) {
    throw new ApiError('Sign-in was superseded. Please try again.', 409, 'SESSION_CHANGED');
  }
}

async function clearServerSession(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new ApiError('Unable to sign out. Please try again.', response.status, 'REQUEST_FAILED');
  // This runs within the write queue, before any later login can set a new identity.
  state.user = null;
}

/** Forget cached identity after the server reports that the session is no longer valid. */
export function clearLocalSession(): void {
  sessionGeneration += 1;
  state.user = null;
  state.loading = false;
}

export function roleLabel(role: UserRole): string {
  return {
    EVENT_ORGANISER: 'Event organiser',
    EVENT_COORDINATOR: 'Event coordinator',
    EVENT_COORDINATOR_LEAD: 'Event coordinator Lead',
    VENUE_STAFF: 'Venue staff',
    TECHNICAL_SUPPORT_STAFF: 'Technical support staff',
    ATTENDEE: 'Attendee',
    SAFETY_OFFICER: 'Safety Officer',
  }[role];
}

export async function restoreSession(): Promise<void> {
  const beforeWrites = sessionGeneration;
  if (pendingSessionWrites > 0) {
    await sessionWrites;
    if (beforeWrites !== sessionGeneration) return;
  }
  const generation = ++sessionGeneration;
  state.loading = true;
  try {
    const user = (await getJson<{ user: SignedInUser }>('/api/auth/me')).user;
    if (generation === sessionGeneration) state.user = user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      if (generation === sessionGeneration) state.user = null;
    }
    else throw error;
  } finally {
    if (generation === sessionGeneration) state.loading = false;
  }
}

export async function signIn(email: string, password: string): Promise<SignedInUser> {
  const generation = ++sessionGeneration;
  state.loading = true;
  try {
    const accessToken = await getSupabaseAccessToken(email, password);
    requireCurrentSignIn(generation);
    return await orderedSessionWrite(async () => {
      requireCurrentSignIn(generation);
      const user = (await postJson<{ user: SignedInUser }>('/api/auth/login', { accessToken })).user;
      if (generation !== sessionGeneration) {
        // An already-sent response may have set its HttpOnly cookie. Clear it before
        // allowing another write; aborting fetch alone would not revoke that cookie.
        await clearServerSession();
        requireCurrentSignIn(generation);
      }
      state.user = user;
      return user;
    });
  } finally {
    if (generation === sessionGeneration) state.loading = false;
  }
}

export async function signOut(): Promise<void> {
  const generation = ++sessionGeneration;
  state.loading = true;
  try {
    await orderedSessionWrite(clearServerSession);
  } finally {
    if (generation === sessionGeneration) state.loading = false;
  }
}
