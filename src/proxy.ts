import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/admin',
  '/api/auth/login',
  '/api/auth/register',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is public
  // /admin* is gated by its own ADMIN_PASSWORD session, not a user login
  const isPublicRoute = publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/admin/');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('token')?.value;
  const payload = token ? await verifyJwt(token) : null;

  if (!payload) {
    // API callers get a JSON 401; page visits are redirected to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
