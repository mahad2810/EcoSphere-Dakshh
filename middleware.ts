import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'auth-token';

// Routes that are always accessible without authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/contact', '/privacy', '/terms'];
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/location'];

// Role → dashboard mapping
const ROLE_HOME: Record<string, string> = {
  user: '/user',
  government: '/government',
  researcher: '/researcher',
  ngo: '/ngo',
};

async function getTokenPayload(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { sub: string; role: string; email: string; name: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals, static files, and favicons
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.glb') ||
    pathname.endsWith('.gltf')
  ) {
    return NextResponse.next();
  }

  // Allow public API routes (auth endpoints, etc.)
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow all other /api/* routes to enforce auth themselves via requireAuth()
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow explicitly public page routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    // If already authenticated, redirect away from login/signup
    if (pathname === '/login' || pathname === '/signup') {
      const payload = await getTokenPayload(request);
      if (payload?.role) {
        const dest = ROLE_HOME[payload.role] ?? '/';
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return NextResponse.next();
  }

  // ── Protected routes below this line ──────────────────────────────────────

  const payload = await getTokenPayload(request);

  // Not authenticated → redirect to login
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = payload.role as string;

  // Role-restricted sections: check that the user's role matches the route prefix
  const roleRoutes: Record<string, string> = {
    '/user': 'user',
    '/government': 'government',
    '/researcher': 'researcher',
    '/ngo': 'ngo',
  };

  for (const [prefix, requiredRole] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(prefix)) {
      if (userRole !== requiredRole) {
        // Redirect to the user's own dashboard
        const correctHome = ROLE_HOME[userRole] ?? '/';
        return NextResponse.redirect(new URL(correctHome, request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
