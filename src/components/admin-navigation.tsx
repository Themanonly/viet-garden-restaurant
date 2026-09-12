'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminNavigationItem = {
  href: string;
  label: string;
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    label: 'Business',
    items: [
      { href: '/admin/business', label: 'Business Information' },
      { href: '/admin/status', label: 'Hours & Status' },
      { href: '/admin/contact', label: 'Contacts & Social' },
      { href: '/admin/contact', label: 'Ordering Channels' },
    ],
  },
  {
    label: 'Menu',
    items: [
      { href: '/admin/categories', label: 'Menu Categories' },
      { href: '/admin/items', label: 'Menu Items' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/featured', label: 'Featured Content' },
      { href: '/admin/promotions', label: 'Promotions' },
    ],
  },
  {
    label: 'Media',
    items: [
      { href: '/admin/media', label: 'Media Library' },
    ],
  },
];

export const adminNavigation: AdminNavigationItem[] = adminNavigationGroups.flatMap((group) => group.items);

export function getActiveAdminNavigationItem(pathname: string | null): AdminNavigationItem | undefined {
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
          {adminNavigationGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((item) => <option key={`${group.label}-${item.label}`} value={item.href}>{item.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="admin-desktop-navigation" aria-label="Admin sections">
        {adminNavigationGroups.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <p className="admin-nav-group-title">{group.label}</p>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return <Link key={`${group.label}-${item.label}`} href={item.href} className={isActive ? 'admin-nav-link is-active' : 'admin-nav-link'} aria-current={isActive ? 'page' : undefined}>{item.label}</Link>;
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}