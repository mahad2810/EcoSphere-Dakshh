import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthUser } from "@/lib/api-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  // Verify JWT — reject unauthenticated requests
  const guard = requireAuth(req);
  if (guard) return guard;

  try {
    const authUser = getAuthUser(req)!;
    await connectDB();

    const user = await User.findById(authUser.sub).select(
      'xpPoints level completedItems environmentalImpact activityHistory'
    );

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const level = user.level;
    const xpForNextLevel = Math.pow(level, 2) * 10;
    const xpToNextLevel = xpForNextLevel - user.xpPoints;

    return NextResponse.json({
      success: true,
      totalXp: user.xpPoints,
      level: user.level,
      xpForNextLevel,
      xpToNextLevel,
      completedItems: user.completedItems || [],
      environmentalImpact: user.environmentalImpact || { treesPlanted: 0, co2Offset: 0, waterSaved: 0 },
      activityHistory: user.activityHistory || [],
    });
  } catch (error) {
    console.error("Error fetching user progress:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching user progress" },
      { status: 500 }
    );
  }
}
