import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');
  const isAuthApi = req.nextUrl.pathname.startsWith('/api/auth');

  // Always allow auth API routes
  if (isAuthApi) return NextResponse.next();

  // Redirect unauthenticated users to /login
  if (!isLoggedIn && (isApiRoute || !isAuthRoute)) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /admin — requires isAdmin flag
  if (isAdminRoute && req.auth && !req.auth.user.isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  // Redirect logged-in users away from /login
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
