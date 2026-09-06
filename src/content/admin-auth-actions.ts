'use server';

import { redirect } from 'next/navigation';
import { clearAdminSession, signInAdmin } from './admin-auth';

export type AdminLoginState = { error?: string };

export async function signInAdminAction(_previousState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  let result: Awaited<ReturnType<typeof signInAdmin>>;
  try {
    result = await signInAdmin(String(formData.get('email') ?? ''), String(formData.get('password') ?? ''));
  } catch {
    return { error: 'Admin sign-in is temporarily unavailable.' };
  }
  if (!result.ok) return { error: result.message };
  redirect('/admin');
}

export async function signOutAdminAction() {
  await clearAdminSession();
  redirect('/admin-login');
}
