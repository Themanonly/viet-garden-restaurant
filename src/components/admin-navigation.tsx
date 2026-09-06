'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const adminNavigation = [
  { href: '/admin/status', label: 'Restaurant Status' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/items', label: 'Menu Items' },
  { href: '/admin/featured', label: 'Featured Sections' },
  { href: '/admin/media', label: 'Media Library' },
] as const;

export function getActiveAdminNavigationItem(pathname: string | null) {
  return adminNavigation.find((item) => pathname === item.href);
}

export function AdminNavigation() {
  const pathname = usePathname();
  const activeItem = getActiveAdminNavigationItem(pathname);

  const handleNavigate = (href: string) => {
    window.location.assign(href);
  };

  return (
    <nav className="admin-navigation" aria-label="Admin navigation">
      <div className="admin-mobile-navigation">
        <label htmlFor="admin-section-select">Section</label>
        <select id="admin-section-select" value={activeItem?.href ?? ''} onChange={(event) => { handleNavigate(event.target.value); }}>
          {adminNavigation.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
        </select>
      </div>
      <div className="admin-desktop-navigation">
        {adminNavigation.map((item) => {
          const isActive = pathname === item.href;
          return <Link key={item.href} href={item.href} className={isActive ? 'admin-nav-link is-active' : 'admin-nav-link'} aria-current={isActive ? 'page' : undefined}>{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}