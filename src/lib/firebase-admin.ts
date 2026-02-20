import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Check if we're in build phase or env vars are missing
const isBuildPhase = !process.env.FIREBASE_PROJECT_ID;

if (isBuildPhase) {
  console.warn('Firebase credentials not available - using mock for build');
}

const firebaseAdminConfig = isBuildPhase ? null : {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
  }),
};

const app = isBuildPhase 
  ? null 
  : (getApps().length === 0 ? initializeApp(firebaseAdminConfig!) : getApps()[0]);

// Export mock db for build, real db for runtime
export const db = isBuildPhase 
  ? ({
      collection: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              get: async () => ({ docs: [] }),
              onSnapshot: () => () => {},
            }),
          }),
        }),
        add: async () => ({ id: 'mock-id' }),
      }),
    } as any)
  : getFirestore(app!);
