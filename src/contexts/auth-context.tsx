'use client';

import type { UserProfile } from '@/lib/types';
import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { auth } from '@/lib/firebase';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getUserProfile } from '@/lib/data';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const areProfilesEqual = (a: UserProfile | null, b: UserProfile | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  // If updatedAt exists on both, it's the most reliable and efficient way to check for changes.
  if (a.updatedAt && b.updatedAt) {
      if (a.updatedAt.getTime() !== b.updatedAt.getTime()) return false;
  }
  
  // As a fallback, check other critical fields. This handles cases where updatedAt might not be set yet.
  if (a.uid !== b.uid || a.role !== b.role) return false;

  // A shallow check for array contents is a good compromise.
  if (String(a.servicioIds) !== String(b.servicioIds)) return false;
  if (String(a.allowedPages) !== String(b.allowedPages)) return false;

  return true;
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Use a ref to hold the current user profile to compare against inside the listener
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      try {
        if (fbUser) {
          const profile = await getUserProfile(fbUser.uid);
          if (!isMounted) return;

          // Compare and only set if different to prevent re-renders
          if (!areProfilesEqual(userRef.current, profile)) {
            setUser(profile ?? null);
          }
          // Only update firebaseUser if the UID is different
          if (firebaseUser?.uid !== fbUser.uid) {
            setFirebaseUser(fbUser);
          }
        } else {
          setUser(null);
          setFirebaseUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        if (isMounted) {
          setUser(null);
          setFirebaseUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // IMPORTANT: Empty dependency array ensures this runs only once on mount.

  const login = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error('Sign-in failed:', error);

      if (error.code === 'auth/invalid-credential') {
        throw new Error(
          'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.'
        );
      }

      if (error.code === 'auth/user-disabled') {
        throw new Error('Esta cuenta de usuario ha sido desactivada.');
      }

      throw new Error(
        'Error de inicio de sesión: Problema de red o error inesperado.'
      );
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, firebaseUser, loading, login, logout }),
    [user, firebaseUser, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
