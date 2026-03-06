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

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(currentFbUser => 
          (currentFbUser && currentFbUser.uid === fbUser.uid) ? currentFbUser : fbUser
        );
        try {
          const profile = await getUserProfile(fbUser.uid);

          setUser(currentUser => {
            if (!currentUser || !profile) {
              return profile;
            }
            
            // Perform a deep comparison to check if the user profile has actually changed.
            // This prevents re-renders if the object reference is new but the data is the same.
            const areEqual = 
                currentUser.uid === profile.uid &&
                currentUser.displayName === profile.displayName &&
                currentUser.email === profile.email &&
                currentUser.role === profile.role &&
                currentUser.hospitalId === profile.hospitalId &&
                currentUser.isActive === profile.isActive &&
                currentUser.isDeleted === profile.isDeleted &&
                JSON.stringify(currentUser.servicioIds || []) === JSON.stringify(profile.servicioIds || []) &&
                JSON.stringify(currentUser.allowedPages || []) === JSON.stringify(profile.allowedPages || []) &&
                currentUser.createdAt.getTime() === profile.createdAt.getTime() &&
                currentUser.updatedAt.getTime() === profile.updatedAt.getTime();

            if (areEqual) {
              return currentUser; // Data is the same, return the existing state object to prevent re-renders.
            }
            
            return profile; // Data is different, return the new profile object.
          });

        } catch (e) {
          console.error('Failed to fetch user profile', e);
          await signOut(auth);
          setUser(null);
          setFirebaseUser(null);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
