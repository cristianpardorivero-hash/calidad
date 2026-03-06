'use client';

import type { UserProfile } from '@/lib/types';
import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;

      try {
        if (fbUser) {
          setFirebaseUser(fbUser);

          const profile = await getUserProfile(fbUser.uid);

          if (!isMounted) return;

          setUser(profile ?? null);
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);

        if (!isMounted) return;

        setFirebaseUser(null);
        setUser(null);
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
