'use client';

import { useActionState } from 'react';
import { signInAdminAction, type AdminLoginState } from '../content/admin-auth-actions';

const initialState: AdminLoginState = {};

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInAdminAction, initialState);
  return (
    <form action={action} className="admin-login-form">
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit" disabled={pending}>{pending ? 'Signing in...' : 'Sign in'}</button>
    </form>
  );
}
