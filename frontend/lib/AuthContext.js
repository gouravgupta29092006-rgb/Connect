'use client';
// lib/AuthContext.js
// Unified auth context powered by Firebase Authentication.
// Firebase listens for auth state changes; on each change we sync with our
// Express backend so the PostgreSQL user record always exists.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // our DB user object
  const [fbUser, setFbUser]   = useState(null);   // raw Firebase user
  const [loading, setLoading] = useState(true);

  // ─── Sync Firebase user → our PostgreSQL backend ──────────────────────────
  const syncWithBackend = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setFbUser(null);
      setLoading(false);
      return;
    }

    try {
      // Get the Firebase ID token (auto-refreshed by Firebase SDK)
      const idToken = await firebaseUser.getIdToken();

      // POST to our backend — it will find-or-create the DB user
      const { data } = await api.post('/auth/firebase', { idToken });
      setUser(data.user);
      setFbUser(firebaseUser);
    } catch (err) {
      console.error('Backend sync failed:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Listen for Firebase auth state changes ────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, syncWithBackend);
    return () => unsubscribe();
  }, [syncWithBackend]);

  // ─── Google Sign-In ────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged fires automatically after this — no need to manually sync
    return result;
  };

  // ─── Email / Password Login ────────────────────────────────────────────────
  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  };

  // ─── Email / Password Registration ────────────────────────────────────────
  const registerWithEmail = async (email, password, fullName, institution = '') => {
    // 1. Create Firebase account
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // 2. Set the display name in Firebase (shows in Google profile)
    await updateProfile(result.user, { displayName: fullName });
    // 3. Force token refresh so backend gets the updated display name
    await result.user.getIdToken(true);
    // 4. onAuthStateChanged fires → syncWithBackend handles the DB record
    //    Pass institution via a custom attribute the backend sync can use.
    //    We do a direct sync call here so we can pass institution.
    const idToken = await result.user.getIdToken();
    const { data } = await api.post('/auth/firebase', { idToken, institution });
    setUser(data.user);
    setFbUser(result.user);
    return data;
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await api.get('/auth/logout');       // clears the HTTP-only session cookie
    await firebaseSignOut(auth);         // clears Firebase local state
    setUser(null);
    setFbUser(null);
  };

  // ─── Refresh DB user (e.g., after profile update) ─────────────────────────
  const refetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      fbUser,
      loading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      refetchUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
