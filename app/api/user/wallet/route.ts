import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/user/wallet — Deprecated
 *
 * Blockchain wallets have been removed. GreenTokens are now stored entirely
 * in MongoDB and awarded automatically when XP is earned. No wallet is needed.
 *
 * Use GET /api/user/balance for your GreenToken balance.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Blockchain wallet management has been removed. Use GET /api/user/balance for GreenToken balance.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Blockchain wallet management has been removed. Use GET /api/user/balance for GreenToken balance.' },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Blockchain wallet management has been removed. Use GET /api/user/balance for GreenToken balance.' },
    { status: 410 }
  );
}
