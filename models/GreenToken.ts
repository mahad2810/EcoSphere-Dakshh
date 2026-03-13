import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type RewardReason =
  | 'xp_earned'
  | 'quiz_completion'
  | 'issue_reported'
  | 'tree_planted'
  | 'project_joined'
  | 'community_event'
  | 'educational_content'
  | 'daily_streak'
  | 'referral'
  | 'admin_grant'
  | 'achievement'
  | 'signup_bonus';

export const REWARD_LABELS: Record<RewardReason, string> = {
  xp_earned: 'XP Reward',
  quiz_completion: 'Quiz Completed',
  issue_reported: 'Issue Reported',
  tree_planted: 'Tree Planted',
  project_joined: 'Joined Project',
  community_event: 'Community Event',
  educational_content: 'Learning Activity',
  daily_streak: 'Daily Streak Bonus',
  referral: 'Referral Bonus',
  admin_grant: 'Admin Grant',
  achievement: 'Achievement Unlocked',
  signup_bonus: 'Welcome Bonus',
};

export const REWARD_AMOUNTS: Partial<Record<RewardReason, number>> = {
  signup_bonus: 10,
  daily_streak: 5,
  referral: 20,
  achievement: 15,
};

export interface IGreenToken extends Document {
  userId: Types.ObjectId;
  amount: number;
  reason: RewardReason;
  description: string;
  xpAwarded: number;
  relatedEntityId?: string;
  relatedEntityType?: string;
  grantedAt: Date;
  issuedBy: 'system' | 'admin';
}

const greenTokenSchema = new Schema<IGreenToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, enum: Object.keys(REWARD_LABELS) },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    xpAwarded: { type: Number, default: 0, min: 0 },
    relatedEntityId: { type: String, default: null },
    relatedEntityType: { type: String, default: null },
    grantedAt: { type: Date, default: Date.now, index: true },
    issuedBy: { type: String, enum: ['system', 'admin'], default: 'system' },
  },
  { versionKey: false }
);

greenTokenSchema.index({ userId: 1, grantedAt: -1 });

const GreenToken: Model<IGreenToken> = mongoose.models.GreenToken || mongoose.model<IGreenToken>('GreenToken', greenTokenSchema);
export default GreenToken;
