import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';

function firebaseConfiguration() {
  const { VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID } = import.meta.env;
  if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_AUTH_DOMAIN || !VITE_FIREBASE_PROJECT_ID || !VITE_FIREBASE_APP_ID) {
    throw new Error('Firebase sign-in is not configured for this environment.');
  }
  return {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    appId: VITE_FIREBASE_APP_ID,
  };
}

/** Sign in only long enough to exchange the ID token for the server-owned session cookie. */
export async function getFirebaseIdToken(email: string, password: string): Promise<string> {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfiguration());
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return await credential.user.getIdToken();
  } finally {
    // Express owns the durable HttpOnly session; do not retain a second browser Firebase session.
    await signOut(auth);
  }
}
