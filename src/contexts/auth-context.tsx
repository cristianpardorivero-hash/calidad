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
        try {
          const profile = await getUserProfile(fbUser.uid);
          setUser(profile);
        } catch(e) {
          console.error("Error fetching user profile", e);
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user state and loading state
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            pass
          );
          const { user: fbUser } = userCredential;

          if (fbUser) {
            await createUserProfile(fbUser.uid, {
              id: fbUser.uid,
              displayName: email.split('@')[0],
              email: email,
              role: 'admin', 
              hospitalId: 'hcurepto',
              isActive: true,
            });
             // onAuthStateChanged will handle setting the user state.
          }
        } catch (creationError: any) {
          console.error(
            'User creation failed after sign-in failed:',
            creationError
          );
          // Re-throw the CREATION error to be caught by the form
          throw creationError;
        }
      } else {
        console.error('Sign-in error:', error);
        // If the error is something else (e.g., network error), re-throw it.
        throw error;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const value = { user, firebaseUser, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
