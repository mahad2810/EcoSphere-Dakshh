import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { getUserById } from '@/lib/auth';

/**
 * GET /api/auth/session
 * Returns the currently authenticated user's data, or 401 if not logged in.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch latest user data from DB to ensure freshness
    const user = await getUserById(authUser.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        xpPoints: user.xpPoints || 0,
        level: user.level || 1,
        greenTokens: user.greenTokens || 0,
        environmentalImpact: user.environmentalImpact || {
          treesPlanted: 0,
          co2Offset: 0,
          waterSaved: 0,
        },
        activityHistory: user.activityHistory || [],
        completedItems: user.completedItems || [],
        achievements: user.achievements || [],
        // Role-specific fields
        ...(user.role === 'government' && {
          department: user.department,
          position: user.position,
          governmentId: user.governmentId,
        }),
        ...(user.role === 'researcher' && {
          institution: user.institution,
          researchArea: user.researchArea,
          academicCredentials: user.academicCredentials,
        }),
        ...(user.role === 'user' && {
          location: user.location,
          interests: user.interests,
        }),
        ...(user.role === 'ngo' && {
          organizationName: user.organizationName,
          registrationNumber: user.registrationNumber,
          focusAreas: user.focusAreas,
        }),
        // Common optional fields
        phone: user.phone,
        profileImage: user.profileImage,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
