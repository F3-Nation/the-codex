'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { getOAuthConfig } from '@/lib/auth';
import AdminPanel from './AdminPanel';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for auth cookie
      const cookies = document.cookie
        .split(';')
        .reduce<Record<string, string>>((acc, cookie) => {
          const [name, ...rest] = cookie.trim().split('=');
          if (!name) return acc;
          acc[name] = decodeURIComponent(rest.join('='));
          return acc;
        }, {});

      if (cookies['user_info'] === 'authenticated') {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      try {
        const oauthConfig = await getOAuthConfig();
        const csrfToken = crypto.randomUUID();
        const stateData = {
          csrfToken,
          clientId: oauthConfig.CLIENT_ID,
          returnTo: window.location.href,
          timestamp: Date.now(),
        };

        const state = btoa(JSON.stringify(stateData));
        localStorage.setItem('oauth_state', state);

        const authParams = new URLSearchParams({
          response_type: 'code',
          client_id: oauthConfig.CLIENT_ID,
          redirect_uri: oauthConfig.REDIRECT_URI,
          scope: 'openid profile email',
          state: state,
          nonce: crypto.randomUUID()
        });
        window.location.href = `${oauthConfig.AUTH_SERVER_URL}/api/oauth/authorize?${authParams.toString()}`;
      } catch (err) {
        console.error('Auth error:', err);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect will happen via window.location
  }

  return <>{children}</>;
}

export default function Page() {
  return (
    <AuthWrapper>
      <Suspense fallback={
        <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      }>
        <AdminPanel />
      </Suspense>
    </AuthWrapper>
  );
}
