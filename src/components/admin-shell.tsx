import type { ReactNode } from 'react';
import { AdminNavigation } from './admin-navigation';
import { signOutAdminAction } from '../content/admin-auth-actions';

export type AdminHeaderAction = { kind?: 'primary' | 'secondary' | 'ghost'; label: string; element?: ReactNode };

export function SaveStateBanner({ message = '', tone = 'idle' }: { message?: string; tone?: 'idle' | 'saving' | 'saved' | 'error' | 'validation-error' }) {
  return <div className={message ? `admin-save-state is-${tone}` : 'admin-save-state'} aria-live="polite">{message}</div>;
}

export function ValidationSummary({ title = 'Validation error', message = '' }: { title?: string; message?: string }) {
  return <div className="admin-validation-summary is-visible" aria-live="polite"><h2>{title}</h2>{message ? <p>{message}</p> : null}</div>;
}

type AdminPageHeaderProps = {
  title: string;
  context?: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

export function AdminPageHeader({ title, context = 'Operations', description, primaryAction, secondaryAction }: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header-copy">
        <p className="admin-eyebrow">{context}</p>
        <h1>{title}</h1>
        {description ? <p className="admin-page-description">{description}</p> : null}
      </div>
      {(primaryAction || secondaryAction) ? (
        <div className="admin-page-header-actions" aria-label="Page actions">
          {secondaryAction}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}

export function AdminShell({
  title,
  children,
  context,
  description,
  primaryAction,
  secondaryAction,
}: { title: string; children: ReactNode; context?: string; description?: string; primaryAction?: ReactNode; secondaryAction?: ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Administrative navigation">
        <div className="admin-brand" aria-label="Business admin">
          <span className="admin-brand-mark" aria-hidden="true">BA</span>
          <span><strong>Business</strong><small>Admin</small></span>
        </div>
        <form action={signOutAdminAction} className="admin-sign-out"><button type="submit" className="admin-text-button">Sign out</button></form>
        <AdminNavigation />
      </aside>
      <main className="admin-main">
        <AdminPageHeader
          title={title}
          context={context}
          description={description}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
        />
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}