import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = getAuthUser(request);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    const user = await User.findById(session.sub).select('greenTokens tokenLedger xpPoints level');
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      balance: user.greenTokens || 0,
      balanceFormatted: `${user.greenTokens || 0} GT`,
      recentTransactions: user.tokenLedger || [],
      xpPoints: user.xpPoints || 0,
      level: user.level || 1,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Balance API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
