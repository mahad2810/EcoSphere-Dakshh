"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'government' | 'researcher' | 'user' | 'ngo';
  isVerified: boolean;
  // Progress fields
  xpPoints?: number;
  level?: number;
  greenTokens?: number;
  environmentalImpact?: {
    treesPlanted: number;
    co2Offset: number;
    waterSaved: number;
  };
  activityHistory?: Array<any>;
  completedItems?: string[];
  achievements?: string[];
  // Role-specific fields
  department?: string;
  position?: string;
  governmentId?: string;
  institution?: string;
  researchArea?: string;
  academicCredentials?: string;
  location?: string;
  interests?: string[];
  organizationName?: string;
  registrationNumber?: string;
  focusAreas?: string[];
  // Common fields
  phone?: string;
  profileImage?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ── Session restore: read JWT cookie via /api/auth/session ──────────────────
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include', // send httpOnly cookie
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      if (data.redirectTo) {
        router.push(data.redirectTo);
      }
      return true;
    }

    const errorData = await response.json();
    throw new Error(errorData.error || 'Login failed');
  };

  // ── Signup ───────────────────────────────────────────────────────────────────
  const signup = async (userData: any): Promise<boolean> => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      if (data.redirectTo) {
        router.push(data.redirectTo);
      }
      return true;
    }

    const errorData = await response.json();
    throw new Error(errorData.error || 'Signup failed');
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue even if request fails
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  // ── Refresh user from server ─────────────────────────────────────────────────
  const refreshUser = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = { user, loading, login, signup, logout, refreshUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
