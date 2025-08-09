"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export type UserInfo = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};

function readUserFromStorage(): UserInfo | null {
  try {
    const stored = localStorage.getItem('user_info');
    return stored ? (JSON.parse(stored) as UserInfo) : null;
  } catch {
    return null;
  }
}

export function useAuthUser() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refreshAuth = () => {
    setUser(readUserFromStorage());
  };

  // Initial load
  useEffect(() => {
    refreshAuth();
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync on route changes
  useEffect(() => {
    // Avoid double-reads during first render if not loaded yet
    if (loaded) refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Listen for cross-tab storage updates and custom auth events
  useEffect(() => {
    const onAuthUpdated = () => refreshAuth();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || ['user_info', 'access_token', 'refresh_token'].includes(e.key)) {
        refreshAuth();
      }
    };

    window.addEventListener('codex-auth-updated', onAuthUpdated as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('codex-auth-updated', onAuthUpdated as EventListener);
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return { user, loaded, refreshAuth } as const;
} 