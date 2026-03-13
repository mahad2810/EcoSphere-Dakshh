import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/user/balance/[address]
 * This route is deprecated — blockchain wallets are no longer used.
 * Please use GET /api/user/balance instead (JWT-protected, DB-based).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Blockchain wallet balances are no longer supported.',
      info: 'Use GET /api/user/balance to retrieve your GreenToken balance from the database.',
    },
    { status: 410 } // 410 Gone
  );
}
