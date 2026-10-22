import { headers } from 'next/headers';

// The site's public address, used for canonical URLs, the sitemap, robots.txt, the RSS feed, social previews and
// structured data. Set SITE_URL in .env.local to your real domain (e.g. https://vishnu.dev). Until then, the
// address the site is actually being served from is used (e.g. your *.workers.dev URL) — never "localhost" on the
// live site, which would stop search engines from indexing it.
export async function siteUrl() {
  const configured = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (configured && !/\/\/(localhost|127\.0\.0\.1)(:|$)/.test(configured)) return configured;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) {
      const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
      const proto = h.get('x-forwarded-proto')?.split(',')[0] || (local ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // Outside a request (e.g. at build time): fall through.
  }
  return configured || 'http://localhost:3000';
}

// "/blog/x.jpg" → "https://site/blog/x.jpg"; absolute URLs pass through.
export const absolute = (path, base) => (path ? new URL(path, base).href : undefined);

// Plain-text summary for search snippets: Markdown/HTML stripped, cut at a word boundary.
export function snippet(text, max = 160) {
  const plain = (text || '').replace(/<[^>]+>/g, ' ').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`>|~-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : plain;
}
