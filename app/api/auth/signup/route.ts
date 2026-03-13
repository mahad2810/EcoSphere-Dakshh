import { NextRequest, NextResponse } from 'next/server';
import { emailExists, createUser, signToken } from '@/lib/auth';
import { buildAuthCookie } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      confirmPassword,
      name,
      role,
      // Government fields
      department,
      position,
      governmentId,
      // Researcher fields
      institution,
      researchArea,
      academicCredentials,
      // User fields
      location,
      interests,
      // NGO fields
      organizationName,
      registrationNumber,
      focusAreas,
      // Optional fields
      phone,
      bio,
    } = body;

    // Basic validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const userExists = await emailExists(email);
    if (userExists) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Validate role-specific fields
    const roleValidation = validateRoleFields(role, body);
    if (roleValidation.error) {
      return NextResponse.json({ error: roleValidation.error }, { status: 400 });
    }

    // Build user data
    const userData: any = {
      email: email.toLowerCase(),
      password,
      name,
      role,
      phone,
      bio,
    };

    if (role === 'government') {
      userData.department = department;
      userData.position = position;
      userData.governmentId = governmentId;
    } else if (role === 'researcher') {
      userData.institution = institution;
      userData.researchArea = researchArea;
      userData.academicCredentials = academicCredentials;
    } else if (role === 'user') {
      userData.location = location;
      userData.interests = interests || [];
    } else if (role === 'ngo') {
      userData.organizationName = organizationName;
      userData.registrationNumber = registrationNumber;
      userData.focusAreas = focusAreas || [];
    }

    // Create user in DB
    const user = await createUser(userData);
    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Grant signup bonus (async, non-blocking)
    const { grantSignupBonus } = await import('@/lib/ecotoken-service');
    grantSignupBonus(String(user._id), user.name).catch((e: Error) =>
      console.error('[GreenToken] signup bonus failed:', e)
    );

    // Sign JWT
    const token = signToken({
      sub: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
        },
        redirectTo: `/${user.role}`,
      },
      { status: 201 }
    );

    // Set httpOnly auth cookie so the user is immediately signed in
    response.headers.set('Set-Cookie', buildAuthCookie(token));
    return response;

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function validateRoleFields(role: string, body: any) {
  switch (role) {
    case 'government':
      if (!body.department || !body.position || !body.governmentId) {
        return { error: 'Department, position, and government ID are required for government officials' };
      }
      break;
    case 'researcher':
      if (!body.institution || !body.researchArea || !body.academicCredentials) {
        return { error: 'Institution, research area, and academic credentials are required for researchers' };
      }
      break;
    case 'user':
      if (!body.location) {
        return { error: 'Location is required for community members' };
      }
      break;
    case 'ngo':
      if (!body.organizationName || !body.registrationNumber) {
        return { error: 'Organization name and registration number are required for NGOs' };
      }
      break;
    default:
      return { error: 'Invalid role specified' };
  }
  return { error: null };
}
