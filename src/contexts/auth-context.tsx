'use client';

import type { UserProfile } from '@/lib/types';
import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth';
import { createUserProfile, getUserProfile } from '@/lib/data';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (fbUser: User) => {
    let profile = await getUserProfile(fbUser.uid);
    if (!profile) {
      try {
        // If the user is new (including anonymous), create a profile with admin role.
        profile = await createUserProfile(fbUser.uid, {
          displayName: fbUser.isAnonymous ? 'Visitante' : (fbUser.email?.split('@')[0] || "Nuevo Usuario"),
          email: fbUser.isAnonymous ? `${fbUser.uid}@guest.com` : (fbUser.email || ""),
          role: 'admin', // Grant admin role to anonymous visitor and first-time users
          hospitalId: 'hcurepto', // Default hospital
          isActive: true,
        });
      } catch (e) {
        console.error("Failed to create user profile automatically", e);
        setUser(null);
        setFirebaseUser(null);
        await signOut(auth); // Sign out to prevent inconsistent state
        return;
      }
    }
    setUser(profile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        await fetchUserProfile(fbUser);
        setLoading(false);
      } else {
        // If no user, sign in anonymously to provide admin guest access
        signInAnonymously(auth).catch((error) => {
            console.error("Anonymous sign-in failed", error);
            // If anonymous sign-in fails, stop loading and clear user state.
            setLoading(false);
            setUser(null);
            setFirebaseUser(null);
        });
        // onAuthStateChanged will be called again with the anonymous user,
        // which will then handle setting loading to false.
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const login = async (email: string, pass: string) => {
    // This function allows a user to sign in over the anonymous session.
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
        } catch (creationError: any) {
          console.error("Account creation failed:", creationError);
          throw new Error(`Error al crear la cuenta: ${creationError.message}`);
        }
      } else {
        console.error("Sign-in failed:", error);
        throw new Error(`Error de inicio de sesión: ${error.message}`);
      }
    }
  };

  const logout = async () => {
    // When logging out, the onAuthStateChanged effect will automatically
    // sign the user in anonymously again.
    await signOut(auth);
  };

  const value = { user, firebaseUser, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
