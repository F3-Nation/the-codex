/**
 * OAuth callback API route
 * - Handles CORS preflight and adds response headers for cross-origin redirects
 * - Normalizes provider redirects to our page route (/callback) with code and state
 *
 * This endpoint should be listed in OAUTH_REDIRECT_URI and the provider's allowed redirect URIs.
 */
import { NextRequest, NextResponse } from 'next/server';

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');

  if (process.env.NODE_ENV === 'development') {
    if (
      origin &&
      (origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.cloudworkstations.dev'))
    ) {
      return origin;
    }
    return 'https://localhost:3000';
  }

  const productionOrigins = ['https://auth.f3nation.com'];

  if (origin && productionOrigins.includes(origin)) {
    return origin;
  }

  return 'https://auth.f3nation.com';
}

export async function OPTIONS(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin(request);
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const allowedOrigin = getAllowedOrigin(request);
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as Record<string, string>;

  if (error) {
    const url = new URL('/callback', request.url);
    url.searchParams.set('error', error);
    return NextResponse.redirect(url, { headers });
  }

  if (code && state) {
    const url = new URL('/callback', request.url);
    url.searchParams.set('code', code);
    url.searchParams.set('state', state);
    return NextResponse.redirect(url, { headers });
  }

  const url = new URL('/callback', request.url);
  url.searchParams.set('error', 'missing_parameters');
  return NextResponse.redirect(url, { headers });
} 