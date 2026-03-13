import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';

/**
 * GET /api/auth/check
 * Returns basic auth status for the current session.
 */
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ isAuthenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      isAuthenticated: true,
      userRole: user.role,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Auth check failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/check
 * Verifies current session and whether user has access to a specific role dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);

    if (!user) {
      return NextResponse.json({
        isAuthenticated: false,
        allowedAccess: false,
        message: 'Not authenticated',
      });
    }

    const body = await request.json().catch(() => ({}));
    const { role } = body;

    // Check if the user is allowed to access the requested role dashboard
    const allowedAccess = !role || role === user.role;

    return NextResponse.json({
      isAuthenticated: true,
      allowedAccess,
      userRole: user.role,
    });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
