import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthUser } from "@/lib/api-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  const guard = requireAuth(req);
  if (guard) return guard;

  try {
    await connectDB();

    const authUser = getAuthUser(req)!;
    const { itemId, itemType, title, xpAmount = 15, environmentalImpact } = await req.json();

    if (!itemId) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const user = await User.findById(authUser.sub);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Mark the item as completed
    const isNewCompletion = await user.completeItem(itemId);

    // Track old level before awarding XP
    const oldLevel = user.level;

    // If this is a new completion, award XP
    if (isNewCompletion && xpAmount > 0) {
      const eventType = itemType === 'quiz' ? 'quiz_completion' : 'educational_content';
      const description = `Completed ${itemType}: ${title || itemId}`;

      await user.addXP(xpAmount, {
        eventType,
        description,
        environmentalImpact,
        timestamp: new Date(),
        relatedItemId: itemId,
      } as any);
    }

    const newLevel = user.level;
    const isLevelUp = newLevel > oldLevel;

    return NextResponse.json({
      success: true,
      isNewCompletion,
      isLevelUp,
      completedItems: user.completedItems,
      xpPoints: user.xpPoints,
      level: user.level,
    });
  } catch (error) {
    console.error("Error marking item complete:", error);
    return NextResponse.json({ success: false, message: "Error marking item complete" }, { status: 500 });
  }
}
