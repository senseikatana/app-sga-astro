import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { insforge } from '../lib/insforge';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; requireEmailVerification?: boolean }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'microsoft') => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  signInWithOAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await insforge.auth.getCurrentUser();
        if (!cancelled) setUser(data?.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.statusCode === 403) return { error: 'Email no verificado. Revisa tu bandeja.' };
        return { error: error.message || 'Credenciales incorrectas' };
      }
      setUser(data?.user ?? null);
      return {};
    } catch (e: any) {
      return { error: e.message || 'Error al iniciar sesión' };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
        redirectTo: 'http://localhost:4321/signin',
      });
      if (error) return { error: error.message || 'Error al registrar' };
      if (data?.requireEmailVerification) return { requireEmailVerification: true };
      if (data?.accessToken) {
        setUser(data?.user ?? null);
        return {};
      }
      return {};
    } catch (e: any) {
      return { error: e.message || 'Error al registrar' };
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'microsoft') => {
    await insforge.auth.signInWithOAuth(provider, {
      redirectTo: 'http://localhost:4321',
    });
  };

  const signOut = async () => {
    await insforge.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
