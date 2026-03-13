import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );
    // Clear the httpOnly auth cookie
    response.headers.set('Set-Cookie', clearAuthCookie());
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
