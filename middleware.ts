/**
 * Middleware CORS for OAuth callback routes
 * - Adds Access-Control-* headers for /callback and /api/callback
 * - Handles OPTIONS preflight requests
 * - Accepts a single configured origin (CLIENT_ORIGIN) in dev/prod to avoid drift
 */
import { NextRequest, NextResponse } from 'next/server';

function getAllowedOrigin(request: NextRequest): string {
  const configuredOrigin = process.env.CLIENT_ORIGIN;
  if (configuredOrigin) return configuredOrigin;

  // Sensible defaults if not configured
  if (process.env.NODE_ENV === 'development') {
    return 'https://localhost:3001';
  }
  return 'https://auth.f3nation.com';
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/callback') || request.nextUrl.pathname.startsWith('/api/callback')) {
    if (request.method === 'OPTIONS') {
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

    const response = NextResponse.next();
    const allowedOrigin = getAllowedOrigin(request);
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/callback/:path*', '/api/callback/:path*'],
}; 