/**
 * Same-origin proxy for Auth Provider `/api/oauth/userinfo`
 *
 * Why
 * - The provider only returns CORS headers for registered origins
 * - The client app calls this endpoint to avoid cross-origin requests
 *
 * Behavior
 * - Forwards Authorization: Bearer <token> to the provider
 * - Returns provider JSON payload and status code as-is
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const baseUrl = process.env.AUTH_PROVIDER_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'server_error', error_description: 'AUTH_PROVIDER_URL not configured' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${baseUrl}/api/oauth/userinfo`, {
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (error) {
    console.error('Proxy userinfo error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to fetch userinfo' },
      { status: 500 }
    );
  }
} 