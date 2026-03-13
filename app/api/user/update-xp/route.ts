import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  const guard = requireAuth(request);
  if (guard) return guard;

  try {
    await connectDB();

    const authUser = getAuthUser(request)!;
    const body = await request.json();
    const { xpPoints, reason } = body;

    if (!xpPoints || typeof xpPoints !== 'number' || xpPoints <= 0) {
      return NextResponse.json({ error: 'Valid XP points are required' }, { status: 400 });
    }

    const user = await User.findById(authUser.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.xpPoints) user.xpPoints = 0;
    if (!user.level) user.level = 1;
    if (!user.activityHistory) user.activityHistory = [];

    const currentLevel = user.level;

    await user.addXP(xpPoints, {
      eventType: 'issue_reported',
      description: reason || 'XP earned',
      timestamp: new Date(),
    });

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'XP updated successfully',
      xpAwarded: xpPoints,
      totalXP: user.xpPoints,
      currentLevel: user.level,
      leveledUp: user.level > currentLevel,
    });
  } catch (error: any) {
    console.error('Error updating user XP:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
