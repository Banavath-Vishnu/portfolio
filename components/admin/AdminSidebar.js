'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '../ThemeToggle';
import { LogoMark } from '../Icons';
import { ADMIN_PATH } from '@/lib/adminPath';

const ICONS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  out: 'M14 4h6v16h-6M10 8l-4 4 4 4M6 12h10',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  route: 'M6 3v18M6 7h9l-2 3 2 3H6',
  award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 13.5 7 21l5-3 5 3-1.5-7.5',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
};

function Icon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function AdminSidebar({ logout }) {
  const path = usePathname();
  const onDashboard = path === ADMIN_PATH || path === `${ADMIN_PATH}/demo`;
  const dash = path === `${ADMIN_PATH}/demo` ? `${ADMIN_PATH}/demo` : ADMIN_PATH;
  const editing = /\/(posts|projects)\/\d+$/.test(path);
  const groups = [
    {
      label: 'Content',
      items: [
        // Posts and projects live in the dashboard's tabs; Dashboard stays highlighted while editing one.
        { href: dash, label: 'Dashboard', icon: 'grid', active: onDashboard || editing },
      ],
    },
    {
      label: 'Site',
      items: [
        { href: `${ADMIN_PATH}/journey`, label: 'Journey', icon: 'route', active: path.startsWith(`${ADMIN_PATH}/journey`) },
        { href: `${ADMIN_PATH}/certifications`, label: 'Certifications', icon: 'award', active: path.startsWith(`${ADMIN_PATH}/certifications`) },
        { href: `${ADMIN_PATH}/categories`, label: 'Categories', icon: 'tag', active: path.startsWith(`${ADMIN_PATH}/categories`) },
      ],
    },
    {
      label: 'Create',
      items: [
        { href: `${ADMIN_PATH}/posts/new`, label: 'New post', icon: 'pen', active: path.endsWith('/posts/new') },
        { href: `${ADMIN_PATH}/projects/new`, label: 'New project', icon: 'plus', active: path.endsWith('/projects/new') },
      ],
    },
  ];

  return (
    <aside className="adm-side">
      <Link href={ADMIN_PATH} className="adm-brand">
        <span className="adm-brand-mark"><LogoMark /></span>
        <span className="adm-brand-text">Vishnu<small>Admin</small></span>
      </Link>

      <nav className="adm-nav" aria-label="Admin">
        {groups.map((g) => (
          <div key={g.label} className="adm-nav-group">
            <span className="adm-nav-label">{g.label}</span>
            {g.items.map((it) => (
              <Link key={it.label} href={it.href} className={`adm-nav-item${it.active ? ' is-active' : ''}`} aria-current={it.active ? 'page' : undefined}>
                <Icon name={it.icon} /><span>{it.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="adm-side-foot">
        <a href="/" target="_blank" rel="noopener noreferrer" className="adm-nav-item"><Icon name="ext" /><span>View site</span></a>
        <div className="adm-side-row">
          <form action={logout}>
            <button type="submit" className="adm-nav-item adm-logout"><Icon name="out" /><span>Log out</span></button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
