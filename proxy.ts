import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const adminSessionCookie = 'viet-garden-admin-session';

export function proxy(request: NextRequest) {
  if (request.cookies.has(adminSessionCookie)) return NextResponse.next();
  const loginUrl = new URL('/admin-login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: '/admin/:path*',
};
