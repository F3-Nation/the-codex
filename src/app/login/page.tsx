'use client';

/**
 * Optional: This page is no longer required since the header login button initiates OAuth directly.
 * Keep it for deep links or if you want a standalone login screen.
 */
import { useEffect, useState } from 'react';
import { getOAuthConfig } from '@/app/auth-actions';

type OAuthConfig = { CLIENT_ID: string; REDIRECT_URI: string; AUTH_SERVER_URL: string };

export default function LoginPage() {
  const [config, setConfig] = useState<OAuthConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOAuthConfig().then(setConfig).catch(() => setError('Failed to load OAuth configuration'));
  }, []);

  const handleLogin = () => {
    if (!config) return;
    const csrfToken = crypto.randomUUID();
    const stateData = {
      csrfToken,
      clientId: config.CLIENT_ID,
      returnTo: config.REDIRECT_URI,
      timestamp: Date.now(),
    };
    const state = btoa(JSON.stringify(stateData));
    localStorage.setItem('oauth_state', state);

    window.location.href = `${config.AUTH_SERVER_URL}/api/oauth/authorize?response_type=code&client_id=${config.CLIENT_ID}&redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}&scope=openid%20profile%20email&state=${encodeURIComponent(state)}`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}
        <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded">
          Login with F3 Auth
        </button>
      </div>
    </main>
  );
} 