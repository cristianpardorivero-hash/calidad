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
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  // Fast check for the most common change indicator
  if (a.updatedAt.getTime() !== b.updatedAt.getTime()) {
    return false;
  }

  // Deeper checks for other properties
  if (
    a.uid !== b.uid ||
    a.displayName !== b.displayName ||
    a.email !== b.email ||
    a.role !== b.role ||
    a.hospitalId !== b.hospitalId ||
    a.isActive !== b.isActive
  ) {
    return false;
  }

  // Robust array comparison (handles undefined, null, and order differences)
  const arrayIsEqual = (arrA: string[] | undefined | null, arrB: string[] | undefined | null): boolean => {
      const a1 = arrA || [];
      const a2 = arrB || [];
      if (a1.length !== a2.length) return false;
      const set1 = new Set(a1);
      for (const item of a2) {
          if (!set1.has(item)) return false;
      }
      return true;
  };

  if (!arrayIsEqual(a.servicioIds, b.servicioIds)) return false;
  if (!arrayIsEqual(a.allowedPages, b.allowedPages)) return false;

  return true;
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

          if (!areProfilesEqual(userRef.current, profile)) {
            setUser(profile ?? null);
          }
          
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
  }, []); 

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
