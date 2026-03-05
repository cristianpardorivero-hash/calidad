"use client";

import type { UserProfile } from "@/lib/types";
import { createContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: Omit<UserProfile, 'createdAt' | 'updatedAt'>[] = [
    { uid: '1a2b3c', displayName: 'Director HC', email: 'director@hospital.cl', role: 'admin', hospitalId: 'hcurepto', servicioId: 'srv-dir', isActive: true },
    { uid: '4d5e6f', displayName: 'Editor Contenidos', email: 'editor@hospital.cl', role: 'editor', hospitalId: 'hcurepto', servicioId: 'srv-med', isActive: true },
    { uid: '7g8h9i', displayName: 'Lector Calidad', email: 'lector@hospital.cl', role: 'lector', hospitalId: 'hcurepto', servicioId: 'srv-cal', isActive: true },
];

const getMockUser = (email: string): UserProfile | undefined => {
    const user = mockUsers.find(u => u.email === email);
    if (!user) return undefined;
    return {
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for an authenticated user
    setTimeout(() => {
      // For demonstration, we'll log in a mock 'lector' user automatically to show filtering.
      const mockLectorUser = getMockUser('lector@hospital.cl')!;
      setUser(mockLectorUser);
      setLoading(false);
    }, 500);
  }, []);
  
  const login = async (email: string, pass: string) => {
    setLoading(true);
    // In a real app, you'd call Firebase Auth here.
    console.log("Logging in with", email, pass);
    await new Promise(res => setTimeout(res, 1000));
    
    const foundUser = getMockUser(email);
    // For demo, login as found user, or default to admin if not found.
    setUser(foundUser || getMockUser('director@hospital.cl')!);
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
