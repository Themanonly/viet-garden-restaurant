import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AdminAuthorizationError, requireAdmin } from '../../content/admin-auth';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) redirect('/admin-login');
    throw error;
  }
  return <div className="admin-route-root">{children}</div>;
}