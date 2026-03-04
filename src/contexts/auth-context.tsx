"use client";

import type { UserProfile } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import { createContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for an authenticated user
    setTimeout(() => {
      // For demonstration, we'll log in a mock admin user automatically.
      const mockAdminUser: UserProfile = {
        uid: "1a2b3c",
        displayName: "Director HC",
        email: "director@hospital.cl",
        role: "admin",
        hospitalId: "hcurepto",
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      setUser(mockAdminUser);
      setLoading(false);
    }, 500);
  }, []);
  
  const login = async (email: string, pass: string) => {
    setLoading(true);
    // In a real app, you'd call Firebase Auth here.
    console.log("Logging in with", email, pass);
    await new Promise(res => setTimeout(res, 1000));
    const mockAdminUser: UserProfile = {
        uid: "1a2b3c",
        displayName: "Director HC",
        email: "director@hospital.cl",
        role: "admin",
        hospitalId: "hcurepto",
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    setUser(mockAdminUser);
    setLoading(false);
  }

  const logout = async () => {
    setLoading(true);
    await new Promise(res => setTimeout(res, 500));
    setUser(null);
    setLoading(false);
  }

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
