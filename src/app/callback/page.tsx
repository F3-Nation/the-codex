'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOAuthConfig, exchangeCodeForToken } from '@/lib/auth';

interface OAuthConfig {
  CLIENT_ID: string;
  REDIRECT_URI: string;
  AUTH_SERVER_URL: string;
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);

  // Load OAuth configuration
  useEffect(() => {
    const initialize = async () => {
      try {
        const cfg = await getOAuthConfig();
        setOauthConfig(cfg);
      } catch (err) {
        console.error('Failed to load OAuth configuration:', err);
        setError('Failed to load OAuth configuration');
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!oauthConfig) return;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      // Debug
      console.log('Callback debug:', {
        code: code ? 'present' : 'missing',
        state: state ? 'present' : 'missing',
        errorParam,
        url: typeof window !== 'undefined' ? window.location.href : '',
      });

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        return;
      }

      if (!code || !state) {
        setError('Missing authorization code or state parameter');
        return;
      }

      try {
        const storedState = localStorage.getItem('oauth_state');

        const decodeState = (s: string) => {
          try {
            return JSON.parse(decodeURIComponent(atob(s)));
          } catch (err) {
            console.error('Failed to decode state:', err);
            throw new Error('Invalid state parameter format');
          }
        };

        const receivedStateObj = decodeState(state);

        // Validate required fields
        const requiredFields = ['csrfToken', 'clientId', 'returnTo', 'timestamp'] as const;
        for (const field of requiredFields) {
          if (!receivedStateObj[field]) {
            throw new Error(`State missing required field: ${field}`);
          }
        }

        // Validate timestamp (10 minutes)
        const timestampDiff = Date.now() - receivedStateObj.timestamp;
        if (timestampDiff > 600_000) {
          throw new Error('Expired state parameter');
        }

        // If we have stored state (same-browser flow), validate match
        if (storedState) {
          try {
            const storedStateObj = decodeState(storedState);
            if (
              receivedStateObj.csrfToken !== storedStateObj.csrfToken ||
              receivedStateObj.clientId !== storedStateObj.clientId
            ) {
              throw new Error('Invalid state parameter');
            }
          } catch (err) {
            console.warn('Stored state validation failed; continuing with server validation:', err);
          }
        }

        // Exchange authorization code for tokens (server action)
        const tokenData: any = await exchangeCodeForToken({ code });

        const accessToken: string | undefined =
          tokenData?.access_token ??
          tokenData?.accessToken ??
          tokenData?.token ??
          tokenData?.tokens?.access_token;

        if (!accessToken) {
          throw new Error('No access token in token response');
        }

        // Fetch user info from provider (matches auth-client approach)
        const userInfoResp = await fetch(
          `${oauthConfig.AUTH_SERVER_URL.replace(/\/+$/, '')}/api/oauth/userinfo`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          }
        );

        if (!userInfoResp.ok) {
          throw new Error(`Failed to get user info (status ${userInfoResp.status})`);
        }

        const userData = await userInfoResp.json();

        // Persist user info locally
        localStorage.setItem('user_info', JSON.stringify(userData));
        localStorage.setItem('access_token', accessToken);
        if (tokenData?.refresh_token) {
          localStorage.setItem('refresh_token', tokenData.refresh_token as string);
        }
        localStorage.removeItem('oauth_state');

        // Ask server to establish session cookie and enforce RBAC
        const sessionResp = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (sessionResp.status === 401 || sessionResp.status === 403) {
          // Not an admin
          router.replace('/?error=unauthorized');
          return;
        }

        if (!sessionResp.ok) {
          // Do not block client usage, but log it
          console.warn('Session establishment failed:', await sessionResp.text());
        }

        // Redirect to admin
        router.replace('/admin');
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err?.message ?? 'An error occurred during authentication');
      }
    };

    handleCallback();
  }, [oauthConfig, searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
            <p className="text-red-600 mb-6">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait while we complete your login</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
