import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

interface JWTPayload {
  sub: string;
  email: string;
  exp: number;
}

const AUTH_TOKEN_KEY = 'auth_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      try {
        const decoded = jwtDecode<JWTPayload>(token);
        const now = Date.now() / 1000;
        
        if (decoded.exp > now) {
          setUser({
            id: decoded.sub,
            email: decoded.email
          });
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to sign up');
      }

      const { token } = await response.json();
      localStorage.setItem(AUTH_TOKEN_KEY, token);

      const decoded = jwtDecode<JWTPayload>(token);
      setUser({
        id: decoded.sub,
        email: decoded.email
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to sign in');
      }

      const { token } = await response.json();
      localStorage.setItem(AUTH_TOKEN_KEY, token);

      const decoded = jwtDecode<JWTPayload>(token);
      setUser({
        id: decoded.sub,
        email: decoded.email
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reset password');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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