import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { config as proxyConfig, proxy } from '../../proxy';
import { AdminAuthorizationError, requireAdminRequest } from './admin-auth';

const environment = process.env as Record<string, string | undefined>;
const environmentKeys = ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ADMIN_USER_IDS', 'VIET_GARDEN_DATA_PROVIDER', 'VIET_GARDEN_MEDIA_STORAGE_PROVIDER', 'SUPABASE_STORAGE_BUCKET'] as const;

function configureAuth(adminUserIds: string) {
  environment.NODE_ENV = 'test';
  environment.SUPABASE_URL = 'https://example.supabase.co';
  environment.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key';
  environment.SUPABASE_ADMIN_USER_IDS = adminUserIds;
}

function sessionCookie(accessToken = 'test-access-token') {
  return `viet-garden-admin-session=${encodeURIComponent(JSON.stringify({ access_token: accessToken }))}`;
}

test('Proxy redirects unauthenticated Admin requests and leaves authenticated requests alone', () => {
  const unauthenticated = proxy(new NextRequest('https://example.test/admin/categories'));
  assert.equal(unauthenticated.status, 307);
  assert.equal(new URL(unauthenticated.headers.get('location') ?? '').pathname, '/admin-login');

  const authenticated = proxy(new NextRequest('https://example.test/admin/categories', { headers: { cookie: sessionCookie() } }));
  assert.equal(authenticated.status, 200);
  assert.equal(proxyConfig.matcher, '/admin/:path*');
});

test('Admin request authorization rejects missing and non-admin sessions', async () => {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, environment[key]]));
  try {
    configureAuth('authorized-user');
    await assert.rejects(() => requireAdminRequest(new Request('https://example.test/api/admin/media/upload')), (error: unknown) => error instanceof AdminAuthorizationError && error.status === 401);

    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ id: 'ordinary-user', email: 'ordinary@example.test' }), { status: 200 });
    try {
      await assert.rejects(() => requireAdminRequest(new Request('https://example.test/api/admin/media/upload', { headers: { cookie: sessionCookie() } })), (error: unknown) => error instanceof AdminAuthorizationError && error.status === 403);
    } finally {
      globalThis.fetch = previousFetch;
    }
  } finally {
    environmentKeys.forEach((key) => {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    });
  }
});

test('authorized Admin requests resolve the Supabase user identity', async () => {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, environment[key]]));
  const previousFetch = globalThis.fetch;
  try {
    configureAuth('authorized-user');
    globalThis.fetch = async () => new Response(JSON.stringify({ id: 'authorized-user', email: 'admin@example.test' }), { status: 200 });
    assert.deepEqual(await requireAdminRequest(new Request('https://example.test/api/admin/media/upload', { headers: { cookie: sessionCookie() } })), { userId: 'authorized-user', email: 'admin@example.test' });
  } finally {
    globalThis.fetch = previousFetch;
    environmentKeys.forEach((key) => {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    });
  }
});

test('public route paths are outside the Admin Proxy matcher and upload rejects unauthenticated callers', async () => {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, environment[key]]));
  try {
    configureAuth('authorized-user');
    const { POST } = await import('../app/api/admin/media/upload/route');
    const response = await POST(new Request('https://example.test/api/admin/media/upload', { method: 'POST' }));
    assert.equal(response.status, 401);
    assert.deepEqual(['/', '/fr', '/en', '/ar', '/fr/menu', '/en/menu', '/ar/menu'].some((path) => path.startsWith('/admin')), false);
  } finally {
    environmentKeys.forEach((key) => {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    });
  }
});
