'use server';

/**
 * Auth actions wrapping f3-nation-auth-sdk.
 *
 * Responsibilities
 * - Expose getOAuthConfig() and exchangeCodeForToken() to client components
 * - Read environment variables to configure the SDK client
 *
 * Environment
 * - AUTH_PROVIDER_URL: Base URL for the Auth Provider (e.g., https://auth.f3nation.com)
 * - OAUTH_CLIENT_ID: OAuth client ID issued by the provider for this app (Codex)
 * - OAUTH_CLIENT_SECRET: OAuth client secret for this app
 * - OAUTH_REDIRECT_URI: This app's callback URL, typically /api/callback
 *
 * High-level Flow
 * 1) /login uses getOAuthConfig() to build the authorize URL and redirects the browser
 * 2) Auth Provider redirects back to our /api/callback which forwards to /callback
 * 3) /callback uses exchangeCodeForToken() to get an access token
 * 4) /api/auth/userinfo server-proxies the provider's /userinfo to avoid CORS
 */
import { AuthClient, type AuthClientConfig } from 'f3-nation-auth-sdk';

export interface OAuthClientPublicConfig {
  CLIENT_ID: string;
  REDIRECT_URI: string;
  AUTH_SERVER_URL: string;
}

export interface TokenExchangeParams {
  code: string;
}

const authConfig: AuthClientConfig = {
  client: {
    CLIENT_ID: process.env.OAUTH_CLIENT_ID || '',
    CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || '',
    AUTH_SERVER_URL: process.env.AUTH_PROVIDER_URL || '',
  },
};

const authClient = new AuthClient(authConfig);

export async function getOAuthConfig(): Promise<OAuthClientPublicConfig> {
  return authClient.getOAuthConfig();
}

export async function exchangeCodeForToken(params: TokenExchangeParams) {
  return authClient.exchangeCodeForToken(params);
} 