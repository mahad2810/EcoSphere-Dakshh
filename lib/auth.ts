import jwt from 'jsonwebtoken';
import User, { IUser } from '@/models/User';
import connectDB from '@/lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  sub: string;   // userId
  email: string;
  name: string;
  role: 'government' | 'researcher' | 'user' | 'ngo';
  iat?: number;
  exp?: number;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

/**
 * Signs a JWT token containing the user identity.
 */
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies a JWT token and returns the decoded payload, or null if invalid.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Authenticate user with email + password. Returns user or null.
 */
export async function authenticateUser(email: string, password: string): Promise<IUser | null> {
  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return null;
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return null;
    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Create a new user. Returns the created user or null.
 */
export async function createUser(userData: any): Promise<IUser | null> {
  try {
    await connectDB();
    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    console.error('User creation error:', error);
    return null;
  }
}

/**
 * Get user by ID (password excluded).
 */
export async function getUserById(userId: string): Promise<IUser | null> {
  try {
    await connectDB();
    const user = await User.findById(userId).select('-password');
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Check whether an email already exists in the database.
 */
export async function emailExists(email: string): Promise<boolean> {
  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    return !!user;
  } catch (error) {
    console.error('Email check error:', error);
    return false;
  }
}
