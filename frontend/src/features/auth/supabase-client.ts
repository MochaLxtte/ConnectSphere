import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function supabaseConfiguration() {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    throw new Error('Supabase sign-in is not configured for this environment.');
  }
  return { url: VITE_SUPABASE_URL, anonKey: VITE_SUPABASE_ANON_KEY };
}

let client: SupabaseClient | null = null;

function supabaseClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = supabaseConfiguration();
    client = createClient(url, anonKey, {
      auth: {
        // Express owns the durable HttpOnly session; the browser SDK only brokers the
        // credential exchange and must not keep a second session of its own.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Sign in only long enough to exchange the access token for the server-owned session cookie. */
export async function getSupabaseAccessToken(email: string, password: string): Promise<string> {
  const supabase = supabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw error ?? new Error('Unable to sign in. Please try again.');
  }
  const accessToken = data.session.access_token;
  // persistSession is already false, but sign out explicitly so no in-memory client
  // session lingers for the rest of the tab's lifetime.
  await supabase.auth.signOut();
  return accessToken;
}