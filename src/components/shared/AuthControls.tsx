"use client";

/**
 * AuthControls
 * - Small client-side UI for login/logout and showing basic user info
 * - Reads/stores data in localStorage set by /callback
 * - Use variant="desktop" or variant="mobile" for placement-specific UI
 */

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getOAuthConfig } from '@/app/auth-actions';
import { useAuthUser } from '@/hooks/useAuthUser';
import { User as UserIcon } from 'lucide-react';

interface AuthControlsProps {
  variant?: 'desktop' | 'mobile';
}

export function AuthControls({ variant = 'desktop' }: AuthControlsProps) {
  const router = useRouter();
  const { user, loaded } = useAuthUser();

  if (!loaded) return null;

  if (!user) {
    const handleLogin = async () => {
      try {
        const config = await getOAuthConfig();
        const csrfToken = crypto.randomUUID();
        const stateData = {
          csrfToken,
          clientId: config.CLIENT_ID,
          returnTo: config.REDIRECT_URI,
          timestamp: Date.now(),
        } as const;
        const state = btoa(JSON.stringify(stateData));
        localStorage.setItem('oauth_state', state);
        window.location.href = `${config.AUTH_SERVER_URL}/api/oauth/authorize?response_type=code&client_id=${config.CLIENT_ID}&redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}&scope=openid%20profile%20email&state=${encodeURIComponent(state)}`;
      } catch (e) {
        // no-op; optionally show toast
      }
    };

    if (variant === 'desktop') {
      return (
        <Button size="sm" onClick={handleLogin}>Log in</Button>
      );
    }
    return (
      <div className="mt-6">
        <Button className="w-full" onClick={handleLogin}>Log in</Button>
      </div>
    );
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('user_info');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('oauth_state');
      window.dispatchEvent(new Event('codex-auth-updated'));
    } catch {
      // ignore
    }
    router.push('/');
  };

  if (variant === 'desktop') {
    return (
      <div className="flex items-center gap-3">
        {user.picture ? (
          <Image
            src={user.picture}
            alt="avatar"
            width={28}
            height={28}
            className="rounded-full"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm max-w-[140px] truncate">{user.name || user.email || 'User'}</span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        {user.picture ? (
          <Image
            src={user.picture}
            alt="avatar"
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="text-sm">
          <div className="font-medium">{user.name || 'User'}</div>
          {user.email && <div className="text-muted-foreground">{user.email}</div>}
        </div>
      </div>
      <Button className="w-full" variant="outline" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
} 