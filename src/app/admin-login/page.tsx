import { redirect } from 'next/navigation';
import { getAdminSession } from '../../content/admin-auth';
import { AdminLoginForm } from '../../components/admin-login-form';

export const metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin');
  return (
    <main className="admin-login-page">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <p className="admin-eyebrow">Viet Garden Management</p>
        <h1 id="admin-login-title">Admin sign in</h1>
        <AdminLoginForm />
      </section>
    </main>
  );
}
