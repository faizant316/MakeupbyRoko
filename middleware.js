import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { isAdminEmail } from './src/lib/adminAllowlist';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const isAdmin = !!session && isAdminEmail(session.user?.email);

  const { pathname } = req.nextUrl;

  // Protect /admin routes — redirect to /login unless a session belongs to an
  // allowlisted admin. A logged-in non-admin (e.g. a stray self-signup) is
  // bounced just like a signed-out visitor.
  if ((pathname.startsWith('/admin') || pathname.startsWith('/admin-invite')) && !isAdmin) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already signed in as an admin and visiting /login, skip straight to the
  // dashboard. A non-admin session stays on /login so they can sign in properly.
  if (pathname === '/login' && isAdmin) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/admin-invite/:path*', '/login'],
};
