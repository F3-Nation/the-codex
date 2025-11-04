"use server";

import { AuthClient, type AuthClientConfig } from "f3-nation-auth-sdk";

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
    CLIENT_ID: process.env.OAUTH_CLIENT_ID || "",
    CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || "",
    REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || "",
    AUTH_SERVER_URL: process.env.AUTH_PROVIDER_URL || "",
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

export async function getUserInfo(accessToken: string) {
  const authServerUrl = authConfig.client.AUTH_SERVER_URL;
  if (!authServerUrl) {
    throw new Error("Auth server URL is not configured");
  }

  const response = await fetch(`${authServerUrl}/api/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorDetail = "Failed to fetch user info";
    try {
      const body = await response.json();
      errorDetail =
        body.error_description ||
        body.error ||
        body.message ||
        `${response.status} ${response.statusText}`;
    } catch {
      // Ignore JSON parsing error and use the default message
    }

    throw new Error(errorDetail);
  }

  return response.json();
}
