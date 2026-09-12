import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/** Initialise Firebase Admin once; credentials stay on the server in GOOGLE_APPLICATION_CREDENTIALS. */
export function createFirebaseAuth(projectId: string | undefined = process.env.FIREBASE_PROJECT_ID): Auth {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required for Firebase Admin authentication.');
  }
  const app = getApps()[0] ?? initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
  return getAuth(app);
}
