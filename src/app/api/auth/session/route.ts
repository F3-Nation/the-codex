import { NextRequest, NextResponse } from 'next/server';
import { getUserFromAccessToken } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { admins } from '@/drizzle/schema';
import { ilike } from 'drizzle-orm';

export const runtime = 'nodejs';

function corsHeaders(request: NextRequest) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(request),
  });
}

// Establish a session cookie for authorized admins
// POST /api/auth/session
// Headers: Authorization: Bearer <access_token>
export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);

  try {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 400, headers });
    }

    const accessToken = auth.slice(7).trim();
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400, headers });
    }

    // Resolve user info from the access token (via /api/oauth/userinfo or JWT decode)
    const user = await getUserFromAccessToken(accessToken);
    const email: string | undefined = user?.email;

    if (!email) {
      return NextResponse.json({ error: 'Unable to determine user email from token' }, { status: 400, headers });
    }

    // RBAC: ensure user is an admin
    const rows = await db.select().from(admins).where(ilike(admins.email, email)).limit(1);
    if (!rows.length) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403, headers });
    }

    // Authorized: set a non-httpOnly cookie that Admin AuthWrapper checks
    const response = NextResponse.json({ ok: true, email }, { status: 200, headers });
    response.cookies.set('user_info', 'authenticated', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (e: any) {
    console.error('Session establishment error:', e);
    return NextResponse.json({ error: 'Authorization failed' }, { status: 500, headers });
  }
}
