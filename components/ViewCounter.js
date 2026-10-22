'use client';

import { useEffect } from 'react';

// Counts one view per post per browser session.
export default function ViewCounter({ slug }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    fetch(`/api/views/${encodeURIComponent(slug)}`, { method: 'POST', keepalive: true }).catch(() => {});
  }, [slug]);
  return null;
}
