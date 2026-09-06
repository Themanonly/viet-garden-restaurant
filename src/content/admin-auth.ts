import { cookies } from 'next/headers';

export const adminSessionCookie = 'viet-garden-admin-session';

type SupabaseAuthUser = { id: string; email?: string };
type SupabaseAuthSession = { access_token: string; refresh_token?: string; expires_in?: number; user?: SupabaseAuthUser };

export type AdminSession = { userId: string; email?: string };

export class AdminAuthorizationError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = 'AdminAuthorizationError';
  }
}

function getAuthConfig() {
  const projectUrl = process.env.SUPABASE_URL ?? process.env.SUPABASE_PROJECT_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminUserIds = (process.env.SUPABASE_ADMIN_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!projectUrl || !serviceRoleKey) throw new Error('Admin authentication requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  if (adminUserIds.length === 0) throw new Error('Admin authorization requires SUPABASE_ADMIN_USER_IDS.');
  return { projectUrl: projectUrl.replace(/\/$/, ''), serviceRoleKey, adminUserIds };
}

function authHeaders(serviceRoleKey: string, accessToken?: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    'Content-Type': 'application/json',
  };
}

function isAuthorizedUser(userId: string, adminUserIds: string[]): boolean {
  return adminUserIds.includes(userId);
}

function decodeSession(value: string | undefined): SupabaseAuthSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown;
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as SupabaseAuthSession).access_token !== 'string') return null;
    return parsed as SupabaseAuthSession;
  } catch {
    return null;
  }
}

async function fetchCurrentUser(accessToken: string): Promise<SupabaseAuthUser | null> {
  const { projectUrl, serviceRoleKey } = getAuthConfig();
  const response = await fetch(`${projectUrl}/auth/v1/user`, {
    headers: authHeaders(serviceRoleKey, accessToken),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const user = await response.json() as SupabaseAuthUser;
  return typeof user.id === 'string' ? user : null;
}

async function writeSession(session: SupabaseAuthSession) {
  const cookieStore = await cookies();
  const maxAge = Math.max(60, Math.min(session.expires_in ?? 3600, 60 * 60 * 24 * 7));
  cookieStore.set(adminSessionCookie, encodeURIComponent(JSON.stringify({
    access_token: session.access_token,
    ...(session.refresh_token ? { refresh_token: session.refresh_token } : {}),
    ...(session.expires_in ? { expires_in: session.expires_in } : {}),
  })), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
}

export async function signInAdmin(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { projectUrl, serviceRoleKey, adminUserIds } = getAuthConfig();
  if (!email.trim() || !password) return { ok: false, message: 'Enter your email and password.' };
  const response = await fetch(`${projectUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(serviceRoleKey),
    body: JSON.stringify({ email: email.trim(), password }),
    cache: 'no-store',
  });
  if (!response.ok) return { ok: false, message: 'The email or password is not valid.' };
  const session = await response.json() as SupabaseAuthSession;
  const user = session.user ?? await fetchCurrentUser(session.access_token);
  if (!user || !isAuthorizedUser(user.id, adminUserIds)) return { ok: false, message: 'This account is not authorized for Admin.' };
  await writeSession(session);
  return { ok: true };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const { adminUserIds } = getAuthConfig();
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(adminSessionCookie)?.value);
  if (!session) return null;
  const user = await fetchCurrentUser(session.access_token);
  if (!user || !isAuthorizedUser(user.id, adminUserIds)) return null;
  return { userId: user.id, ...(user.email ? { email: user.email } : {}) };
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthorizationError(401, 'Admin authentication is required.');
  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookie);
}

export async function requireAdminRequest(request: Request): Promise<AdminSession> {
  const { adminUserIds } = getAuthConfig();
  const header = request.headers.get('cookie') ?? '';
  const raw = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${adminSessionCookie}=`))?.slice(adminSessionCookie.length + 1);
  const session = decodeSession(raw);
  if (!session) throw new AdminAuthorizationError(401, 'Admin authentication is required.');
  const user = await fetchCurrentUser(session.access_token);
  if (!user) throw new AdminAuthorizationError(401, 'Admin authentication is required.');
  if (!isAuthorizedUser(user.id, adminUserIds)) throw new AdminAuthorizationError(403, 'Admin authorization is required.');
  return { userId: user.id, ...(user.email ? { email: user.email } : {}) };
}
