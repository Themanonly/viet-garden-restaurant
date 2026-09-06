import type { ReactNode } from 'react';
import { AdminNavigation } from './admin-navigation';
import { signOutAdminAction } from '../content/admin-auth-actions';

export function SaveStateBanner() {
  return <div className="admin-save-state" aria-live="polite" />;
}

export function ValidationSummary() {
  return <div className="admin-validation-summary" aria-live="polite" />;
}

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand" aria-label="Viet Garden internal management">
          <span className="admin-brand-mark" aria-hidden="true">VG</span>
          <span><strong>Viet Garden</strong><small>Management</small></span>
        </div>
        <form action={signOutAdminAction} className="admin-sign-out"><button type="submit" className="admin-text-button">Sign out</button></form>
        <AdminNavigation />
      </aside>
      <main className="admin-main">
        <header className="admin-page-header">
          <div><p className="admin-eyebrow">Internal workspace</p><h1>{title}</h1></div>
          <SaveStateBanner />
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}