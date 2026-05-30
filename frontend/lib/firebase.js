// lib/firebase.js
// Firebase client-side initialization.
// All config values come from NEXT_PUBLIC_ environment variables.
// Firebase Authentication Spark plan is completely FREE — no billing required.

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent re-initializing on hot-reload in Next.js dev mode
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request the user's email, profile and openid scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Force account chooser to always appear (great UX for multi-account users)
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
