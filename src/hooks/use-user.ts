'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, type DocumentSnapshot, type Timestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase/client';
import type { UserProfile } from '@/lib/types';

interface UseUserHook {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
}

// A more robust equality check for UserProfile
function profilesAreEqual(p1: UserProfile | null, p2: UserProfile | null): boolean {
  if (!p1 && !p2) return true; // both are null
  if (!p1 || !p2) return false; // one is null, the other isn't

  // Check primitive types and dates first
  if (
    p1.uid !== p2.uid ||
    p1.displayName !== p2.displayName ||
    p1.email !== p2.email ||
    p1.role !== p2.role ||
    p1.hospitalId !== p2.hospitalId ||
    p1.isActive !== p2.isActive ||
    p1.isDeleted !== p2.isDeleted ||
    p1.updatedAt?.getTime() !== p2.updatedAt?.getTime()
  ) {
    return false;
  }

  // Check arrays (servicioIds)
  const s1 = p1.servicioIds || [];
  const s2 = p2.servicioIds || [];
  if (s1.length !== s2.length || !s1.every(id => s2.includes(id))) {
    return false;
  }
  
  // Check arrays (allowedPages)
  const a1 = p1.allowedPages || [];
  const a2 = p2.allowedPages || [];
  if (a1.length !== a2.length || !a1.every(id => a2.includes(id))) {
    return false;
  }

  return true;
}


export function useUser(): UseUserHook {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listener only sets the core Firebase user and loading state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        // If no user, we are done loading and have no profile.
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      // If we have a firebase user, start listening to their profile.
      // Loading remains true until the profile is fetched.
      setLoading(true);
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribeProfile = onSnapshot(userDocRef, (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const newProfile: UserProfile = {
            ...data,
            uid: snapshot.id,
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate(),
          } as UserProfile;
          
          // Only update state if the profile has actually changed.
          setUserProfile(currentProfile => {
            if (profilesAreEqual(currentProfile, newProfile)) {
              return currentProfile;
            }
            return newProfile;
          });

        } else {
          // User is authenticated but has no profile document.
          setUserProfile(null);
        }
        // We are done loading once we have the profile snapshot.
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
        setLoading(false);
      });

      return () => unsubscribeProfile();
    }
  }, [firebaseUser]);

  return { user: userProfile, firebaseUser, loading };
}
