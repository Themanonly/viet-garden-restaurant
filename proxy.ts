import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales } from './src/content/models';

const adminSessionCookie = 'viet-garden-admin-session';
const localeHeader = 'x-viet-garden-locale';

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathLocale = request.nextUrl.pathname.split('/')[1];
  const locale = locales.includes(pathLocale as (typeof locales)[number]) ? pathLocale : 'fr';
  requestHeaders.set(localeHeader, locale);

  const isAdminRoute = request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/');
  if (isAdminRoute && !request.cookies.has(adminSessionCookie)) {
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: '/:path*',
};
