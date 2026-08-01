import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: import.meta.env.PUBLIC_INSFORGE_URL,
  anonKey: import.meta.env.PUBLIC_INSFORGE_ANON_KEY,
});

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentPath = window.location.pathname;

    // Don't guard auth pages
    const publicPaths = ['/signin', '/signup', '/ForgotPassword', '/landing'];
    if (publicPaths.includes(currentPath)) {
      setAuthenticated(true);
      return;
    }

    (async () => {
      try {
        const { data } = await insforge.auth.getCurrentUser();
        if (!cancelled) setAuthenticated(!!data?.user);
      } catch {
        if (!cancelled) setAuthenticated(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Loading state
  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto size-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to signin (only once)
  if (!authenticated) {
    const currentPath = window.location.pathname;
    if (currentPath !== '/signin') {
      window.location.replace('/signin');
    }
    return null;
  }

  return <>{children}</>;
}
