import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getUserFromAccessToken } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { admins } from '@/drizzle/schema';
import { ilike } from 'drizzle-orm';

export const runtime = 'nodejs';

function decodeJwtPayload(token: string): any | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  try {
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const headers = {
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (error) {
    return NextResponse.json({ error }, { status: 400, headers });
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400, headers }
    );
  }

  // TODO: Validate state against localStorage

  try {
    // Exchange authorization code for tokens
    const tokenResp: any = await exchangeCodeForToken({ code });

    const accessToken: string | undefined =
      tokenResp?.accessToken ?? tokenResp?.access_token ?? tokenResp?.token ?? tokenResp?.tokens?.access_token;

    // accessToken may be absent if provider returns id_token only; we'll handle below.

    // Determine user email from id_token if present, else fallback to access token lookup
    let email: string | undefined;
    const idToken: string | undefined =
      tokenResp?.idToken ?? tokenResp?.id_token ?? tokenResp?.tokens?.id_token;

    if (idToken) {
      const decoded = decodeJwtPayload(idToken);
      email =
        decoded?.email ||
        decoded?.upn ||
        decoded?.preferred_username ||
        decoded?.username ||
        undefined;
    } else {
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Missing id_token/access_token from token response' },
          { status: 500, headers }
        );
      }
      const user = await getUserFromAccessToken(accessToken);
      email = user?.email;
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Unable to determine user email from provider' },
        { status: 400, headers }
      );
    }

    // Enforce RBAC: only allow users in admins table
    const rows = await db.select().from(admins).where(ilike(admins.email, email)).limit(1);

    if (!rows.length) {
      // Not authorized - redirect to home with an error. Do not set auth cookie.
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url), {
        status: 302,
        headers,
      });
    }

    // Authorized - set auth cookie and redirect to admin
    const response = NextResponse.redirect(new URL('/admin', request.url), {
      status: 302,
      headers,
    });

    response.cookies.set('user_info', 'authenticated', {
      httpOnly: false, // readable by client code to unblock AuthWrapper
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (e: any) {
    console.error('Auth callback error:', e);
    return NextResponse.json(
      { error: 'Authorization failed' },
      { status: 500, headers }
    );
  }
}
