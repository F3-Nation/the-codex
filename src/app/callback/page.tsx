'use client';

/**
 * OAuth callback page
 *
 * Responsibilities
 * - Validate OAuth params (code/state)
 * - Exchange code for token via server action
 * - Fetch user profile through same-origin proxy (/api/auth/userinfo) to avoid CORS
 * - Store minimal auth data in localStorage for UI and redirect home
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOAuthConfig, exchangeCodeForToken } from '@/app/auth-actions';

type OAuthConfig = {
  CLIENT_ID: string;
  REDIRECT_URI: string;
  AUTH_SERVER_URL: string;
};

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const config = await getOAuthConfig();
        setOauthConfig(config);
      } catch {
        setError('Failed to load OAuth configuration');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!oauthConfig) return;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        return;
      }
      if (!code || !state) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') && urlParams.has('state')) {
          setError('Authentication processing error. Please try again.');
        } else {
          setError('Missing authorization code or state parameter');
        }
        return;
      }

      try {
        const storedState = localStorage.getItem('oauth_state');
        const decodeState = (s: string) => {
          try {
            return JSON.parse(decodeURIComponent(atob(s)));
          } catch {
            throw new Error('Invalid state parameter format');
          }
        };
        const receivedStateObj = decodeState(state);
        const required = ['csrfToken', 'clientId', 'returnTo', 'timestamp'] as const;
        for (const f of required) if (!receivedStateObj[f]) throw new Error(`State missing required field: ${f}`);
        if (Date.now() - receivedStateObj.timestamp > 600000) throw new Error('Expired state parameter');

        if (storedState) {
          try {
            const storedStateObj = decodeState(storedState);
            if (
              receivedStateObj.csrfToken !== storedStateObj.csrfToken ||
              receivedStateObj.clientId !== storedStateObj.clientId ||
              receivedStateObj.returnTo !== storedStateObj.returnTo
            ) {
              throw new Error('Invalid state parameter');
            }
          } catch {
            // continue and rely on server-side validation
          }
        }

        const tokenData = await exchangeCodeForToken({ code });
        const accessToken = tokenData.access_token as string;

        // Call same-origin proxy to avoid CORS issues
        const userInfoResponse = await fetch(`/api/auth/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoResponse.ok) throw new Error('Failed to get user info');
        const userData = await userInfoResponse.json();

        localStorage.setItem('user_info', JSON.stringify(userData));
        localStorage.setItem('access_token', accessToken);
        if (tokenData.refresh_token) localStorage.setItem('refresh_token', tokenData.refresh_token as string);
        localStorage.removeItem('oauth_state');
        // Notify other components to refresh auth state
        window.dispatchEvent(new Event('codex-auth-updated'));

        router.push('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during authentication');
      }
    };

    handleCallback();
  }, [oauthConfig, router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
          <p className="text-red-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
            Return to Home
          </button>
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