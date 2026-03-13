/**
 * GreenToken Service — Database-Native Token System
 *
 * This service is the single source of truth for all GreenToken operations.
 * Tokens are stored in two places:
 *   1. GreenToken collection — one document per transaction (full audit ledger)
 *   2. User.greenTokens    — cached running total for fast reads
 *
 * Both are updated atomically within a Mongoose session where possible.
 *
 * No blockchain, no wallets, no external services.
 */

import mongoose, { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import GreenToken, { REWARD_AMOUNTS, REWARD_LABELS } from '@/models/GreenToken';
import type { IGreenToken, RewardReason } from '@/models/GreenToken';
import User from '@/models/User';

// Re-export constants so callers don't need to import the model
export type { RewardReason };
export { REWARD_LABELS, REWARD_AMOUNTS };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GrantOptions {
  userId: string;
  amount: number;
  reason: RewardReason;
  description: string;
  xpAwarded?: number;
  relatedEntityId?: string;
  relatedEntityType?: string;
  issuedBy?: 'system' | 'admin';
}

export interface GrantResult {
  success: boolean;
  tokensGranted: number;
  totalTokens: number;
  transactionId: string;
  error?: string;
}

export interface TokenBalance {
  userId: string;
  totalTokens: number;
  totalFormatted: string;
  lifetimeEarned: number;
}

export interface TokenHistoryEntry {
  id: string;
  amount: number;
  reason: RewardReason;
  reasonLabel: string;
  description: string;
  xpAwarded: number;
  relatedEntityId?: string;
  relatedEntityType?: string;
  grantedAt: Date;
  issuedBy: 'system' | 'admin';
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  role: string;
  totalTokens: number;
  totalFormatted: string;
}

// ── Core: Grant Tokens ───────────────────────────────────────────────────────

/**
 * Grant GreenTokens to a user.
 * Creates a GreenToken transaction document AND increments User.greenTokens.
 */
export async function grantTokens(opts: GrantOptions): Promise<GrantResult> {
  await connectDB();

  const {
    userId,
    amount,
    reason,
    description,
    xpAwarded = 0,
    relatedEntityId,
    relatedEntityType,
    issuedBy = 'system',
  } = opts;

  if (!userId || !amount || amount < 1) {
    return { success: false, tokensGranted: 0, totalTokens: 0, transactionId: '', error: 'Invalid userId or amount' };
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // 1. Create transaction record in GreenToken collection
    const [txDoc] = await GreenToken.create(
      [
        {
          userId: new Types.ObjectId(userId),
          amount,
          reason,
          description,
          xpAwarded,
          relatedEntityId: relatedEntityId || null,
          relatedEntityType: relatedEntityType || null,
          grantedAt: new Date(),
          issuedBy,
        },
      ],
      { session: dbSession }
    );

    // 2. Increment User.greenTokens balance atomically
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { greenTokens: amount },
      },
      { session: dbSession, new: true }
    ).select('greenTokens');

    if (!updatedUser) {
      await dbSession.abortTransaction();
      return { success: false, tokensGranted: 0, totalTokens: 0, transactionId: '', error: 'User not found' };
    }

    await dbSession.commitTransaction();

    return {
      success: true,
      tokensGranted: amount,
      totalTokens: updatedUser.greenTokens,
      transactionId: String(txDoc._id),
    };
  } catch (error: any) {
    await dbSession.abortTransaction();
    console.error('[GreenTokenService] grantTokens error:', error);
    return {
      success: false,
      tokensGranted: 0,
      totalTokens: 0,
      transactionId: '',
      error: error.message || 'Failed to grant tokens',
    };
  } finally {
    dbSession.endSession();
  }
}

/**
 * Award GreenTokens proportional to XP earned (1 XP = 1 GT).
 * Convenience wrapper around grantTokens.
 */
export async function grantTokensForXP(
  userId: string,
  xpAmount: number,
  eventType: RewardReason,
  description: string,
  opts: Partial<Pick<GrantOptions, 'relatedEntityId' | 'relatedEntityType'>> = {}
): Promise<GrantResult> {
  const tokensToGrant = Math.max(1, Math.floor(xpAmount));
  return grantTokens({
    userId,
    amount: tokensToGrant,
    reason: eventType,
    description,
    xpAwarded: xpAmount,
    issuedBy: 'system',
    ...opts,
  });
}

/**
 * Grant a one-time signup bonus.
 * Safe to call multiple times — checks if bonus was already granted.
 */
export async function grantSignupBonus(userId: string, userName: string): Promise<GrantResult> {
  await connectDB();
  const alreadyGranted = await GreenToken.findOne({ userId: new Types.ObjectId(userId), reason: 'signup_bonus' });
  if (alreadyGranted) {
    const user = await User.findById(userId).select('greenTokens');
    return {
      success: true,
      tokensGranted: 0,
      totalTokens: user?.greenTokens ?? 0,
      transactionId: String(alreadyGranted._id),
    };
  }
  const bonus = REWARD_AMOUNTS.signup_bonus ?? 10;
  return grantTokens({
    userId,
    amount: bonus,
    reason: 'signup_bonus',
    description: `Welcome bonus for ${userName}`,
    xpAwarded: 0,
    issuedBy: 'system',
  });
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Get a user's current GreenToken balance (fast read from User document).
 */
export async function getBalance(userId: string): Promise<TokenBalance> {
  await connectDB();
  const user = await User.findById(userId).select('greenTokens name');
  const total = user?.greenTokens ?? 0;

  // Compute lifetime earned from transaction ledger
  const lifetimeAgg = await GreenToken.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return {
    userId,
    totalTokens: total,
    totalFormatted: formatBalance(total),
    lifetimeEarned: lifetimeAgg[0]?.total ?? total,
  };
}

/**
 * Get paginated transaction history for a user.
 */
export async function getHistory(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ transactions: TokenHistoryEntry[]; total: number; page: number; totalPages: number }> {
  await connectDB();
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    GreenToken.find({ userId: new Types.ObjectId(userId) })
      .sort({ grantedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GreenToken.countDocuments({ userId: new Types.ObjectId(userId) }),
  ]);

  const transactions: TokenHistoryEntry[] = docs.map((doc: any) => ({
    id: String(doc._id),
    amount: doc.amount,
    reason: doc.reason as RewardReason,
    reasonLabel: REWARD_LABELS[doc.reason as RewardReason] ?? doc.reason,
    description: doc.description,
    xpAwarded: doc.xpAwarded,
    relatedEntityId: doc.relatedEntityId ?? undefined,
    relatedEntityType: doc.relatedEntityType ?? undefined,
    grantedAt: doc.grantedAt,
    issuedBy: doc.issuedBy,
  }));

  return {
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get the community leaderboard — top users by GreenToken balance.
 */
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  await connectDB();
  const users = await User.find({ greenTokens: { $gt: 0 } })
    .sort({ greenTokens: -1 })
    .limit(limit)
    .select('name role greenTokens')
    .lean();

  return users.map((u: any) => ({
    userId: String(u._id),
    name: u.name,
    role: u.role,
    totalTokens: u.greenTokens,
    totalFormatted: formatBalance(u.greenTokens),
  }));
}

/**
 * Get token stats for a specific user (total by reason category).
 */
export async function getUserStats(userId: string) {
  await connectDB();
  const breakdown = await GreenToken.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $group: { _id: '$reason', totalTokens: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { totalTokens: -1 } },
  ]);

  return breakdown.map((b) => ({
    reason: b._id as RewardReason,
    reasonLabel: REWARD_LABELS[b._id as RewardReason] ?? b._id,
    totalTokens: b.totalTokens,
    transactionCount: b.count,
  }));
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** Format a token count for display. */
export function formatBalance(tokens: number): string {
  return `${tokens.toLocaleString()} GT`;
}

/** Calculate tokens to award for a given XP amount (1:1). */
export function calculateTokensForXP(xpAmount: number): number {
  return Math.max(0, Math.floor(xpAmount));
}
