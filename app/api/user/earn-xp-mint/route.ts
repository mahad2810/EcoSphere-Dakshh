import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { grantTokensForXP } from '@/lib/ecotoken-service';
import type { RewardReason } from '@/lib/ecotoken-service';

/**
 * POST /api/user/earn-xp-mint
 * Awards XP to the current user and grants equivalent GreenTokens (1 XP = 1 GT).
 * Both operations are persisted to MongoDB — no blockchain involved.
 *
 * Body: {
 *   xpAmount: number;
 *   eventType?: RewardReason;        // defaults to 'educational_content'
 *   description?: string;
 *   environmentalImpact?: { treesPlanted?: number; co2Offset?: number; waterSaved?: number }
 *   relatedEntityId?: string;
 *   relatedEntityType?: string;
 * }
 *
 * Returns: { success, xpBefore, xpAfter, tokensGranted, totalGreenTokens, transactionId }
 */
export async function POST(req: NextRequest) {
  const guard = requireAuth(req);
  if (guard) return guard;

  try {
    await connectDB();
    const authUser = getAuthUser(req)!;

    const body = await req.json();
    const {
      xpAmount,
      eventType = 'educational_content',
      description = 'Earned XP',
      environmentalImpact,
      relatedEntityId,
      relatedEntityType,
    } = body || {};

    if (!xpAmount || typeof xpAmount !== 'number' || xpAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'xpAmount must be a positive number' },
        { status: 400 }
      );
    }

    const user = await User.findById(authUser.sub);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const xpBefore = user.xpPoints;
    const tokensBefore = user.greenTokens || 0;

    // 1. Award XP via model method (also updates level, activity history, env impact)
    await user.addXP(xpAmount, {
      eventType: eventType as any,
      description,
      environmentalImpact,
      timestamp: new Date(),
      relatedItemId: relatedEntityId,
    });

    // 2. Create a proper GreenToken transaction document in the dedicated collection
    const tokenResult = await grantTokensForXP(
      authUser.sub,
      xpAmount,
      eventType as RewardReason,
      description,
      { relatedEntityId, relatedEntityType }
    );

    const xpAfter = user.xpPoints;
    const tokensAfter = user.greenTokens || 0;

    return NextResponse.json({
      success: true,
      xpBefore,
      xpAfter,
      xpGained: xpAfter - xpBefore,
      tokensGranted: tokenResult.tokensGranted,
      totalGreenTokens: tokenResult.totalTokens,
      totalGreenTokensFormatted: `${tokenResult.totalTokens.toLocaleString()} GT`,
      transactionId: tokenResult.transactionId,
      level: user.level,
      recentActivity: user.activityHistory[0] ?? null,
    });
  } catch (error: any) {
    console.error('[POST /api/user/earn-xp-mint]', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
