'use client';

import type { UserProfile } from '@/lib/types';
import { createContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getUserProfile, createUserProfile } from '@/lib/data';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setLoading(true);
        let profile = await getUserProfile(fbUser.uid);

        // If the user exists in Auth but not in Firestore, create their profile.
        // This handles the case of the very first user signing up.
        if (!profile) {
          try {
             profile = await createUserProfile(fbUser.uid, {
              displayName: fbUser.email?.split('@')[0] || "Nuevo Usuario",
              email: fbUser.email || "",
              role: 'admin', // First user is an admin
              hospitalId: 'hcurepto',
              isActive: true,
            });
          } catch (e) {
            console.error("Failed to create user profile automatically", e);
          }
        }
        
        setUser(profile);
        setLoading(false);

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      // Try to sign in first
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      // If user does not exist, create them
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
          // onAuthStateChanged will fire and handle creating the profile.
        } catch (creationError) {
          console.error("Account creation failed:", creationError);
          throw creationError; // Let the form handle the error
        }
      } else {
        console.error("Sign-in failed:", error);
        throw error; // Let the form handle the error
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will handle clearing user and firebaseUser state.
  };

  const value = { user, firebaseUser, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
