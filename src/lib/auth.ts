'use server';

import { AuthClient, type AuthClientConfig } from 'f3-nation-auth-sdk';

interface OauthClient {
  CLIENT_ID: string;
  REDIRECT_URI: string;
  AUTH_SERVER_URL: string;
}

interface TokenExchangeParams {
  code: string;
}

// Create AuthClient configuration from environment variables
// This client only knows about itself - no other client secrets needed
const authConfig: AuthClientConfig = {
  client: {
    CLIENT_ID: process.env.OAUTH_CLIENT_ID || '',
    CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || '',
    AUTH_SERVER_URL: process.env.AUTH_PROVIDER_URL || '',
  },
};

// Create AuthClient instance
const authClient = new AuthClient(authConfig);

export async function getOAuthConfig(): Promise<OauthClient> {
  return authClient.getOAuthConfig();
}

export async function exchangeCodeForToken(params: TokenExchangeParams) {
  return authClient.exchangeCodeForToken(params);
}

function decodeJwtPayload(token: string): any | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  // base64url decode
  const normalized = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(payload.length / 4) * 4, '=');

  try {
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function getUserFromAccessToken(accessToken: string) {
  // 1) Try to decode as JWT to extract email without relying on unimplemented SDK method.
  const decoded = decodeJwtPayload(accessToken);
  if (decoded) {
    const email =
      decoded.email ||
      decoded.upn ||
      decoded.preferred_username ||
      decoded.username ||
      decoded.sub ||
      undefined;

    if (email) {
      return { ...decoded, email };
    }
  }

  // 2) Try OpenID Connect UserInfo endpoint using the access token
  const base = (process.env.AUTH_PROVIDER_URL || '').replace(/\/+$/, '');
  const userInfoEndpoints = [
    `${base}/api/oauth/userinfo`,
    `${base}/oauth/userinfo`,
    `${base}/userinfo`,
  ].filter(Boolean);

  for (const url of userInfoEndpoints) {
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => null as any);
        if (data) {
          const email =
            data.email ||
            data.upn ||
            data.preferred_username ||
            data.username ||
            data.sub ||
            undefined;
          if (email) {
            return { ...data, email };
          }
        }
      }
    } catch {
      // continue to next strategy
    }
  }

  // 3) Fallback to SDK implementation if available (may throw "Not implemented")
  try {
    if (typeof (authClient as any).getUser === 'function') {
      return await (authClient as any).getUser(accessToken);
    }
  } catch {
    // ignore and provide a clearer error below
  }

  throw new Error('Unable to determine user from access token');
}
