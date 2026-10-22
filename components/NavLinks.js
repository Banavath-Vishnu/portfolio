'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/#about', id: 'about', label: 'about' },
  { href: '/#projects', id: 'projects', label: 'projects' },
  { href: '/blog', id: 'blog', label: 'blog' },
  { href: '/#experience', id: 'experience', label: 'journey' },
  { href: '/#certifications', id: 'certifications', label: 'certifications' },
  { href: '/#contact', id: 'contact', label: 'contact' },
];

// Highlights the link for whichever homepage section crosses the middle of the viewport.
export default function NavLinks() {
  const pathname = usePathname();
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (pathname !== '/') {
      setActive(pathname.startsWith('/blog') ? 'blog' : pathname.startsWith('/projects') ? 'projects' : null);
      return;
    }
    const sections = links.map((l) => document.getElementById(l.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    // Nothing is highlighted while the hero is on screen.
    const onScroll = () => {
      if (sections[0] && window.scrollY + window.innerHeight * 0.45 < sections[0].offsetTop) setActive(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [pathname]);

  return (
    <div className="nav-links">
      {links.map((l) => (
        <a key={l.href} href={l.href} className={active === l.id ? 'active' : undefined} aria-current={active === l.id ? 'true' : undefined}>
          {l.label}
        </a>
      ))}
    </div>
  );
}
