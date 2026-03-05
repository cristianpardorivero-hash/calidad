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
        const profile = await getUserProfile(fbUser.uid);
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
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        try {
          // If sign-in fails, try to create a new user. This is a shortcut for demo purposes.
          // A real app would have a separate sign-up flow.
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            pass
          );
          const { user: fbUser } = userCredential;

          // Create a corresponding user profile in Firestore
          if (fbUser) {
            await createUserProfile(fbUser.uid, {
              displayName: email.split('@')[0],
              email: email,
              role: 'admin', // Default to admin for the first user
              hospitalId: 'hcurepto', // This should come from a better source in a real app
              isActive: true,
            });
          }
        } catch (creationError: any) {
          // If user creation also fails, then there's a real issue.
          console.error(
            'User creation failed after sign-in failed:',
            creationError
          );
          // Re-throw the CREATION error to be caught by the form
          throw creationError;
        }
      } else {
        // If the error is something else (e.g., network error), re-throw it.
        throw error;
      }
    }
    // onAuthStateChanged will handle setting the user state after either
    // successful sign-in or successful creation.
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const value = { user, firebaseUser, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
