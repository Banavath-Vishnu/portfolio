import { siteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default async function robots() {
  const base = await siteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
