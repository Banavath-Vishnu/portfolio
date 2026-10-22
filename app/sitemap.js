import { getPosts, getProjects } from '@/lib/content';
import { siteUrl, absolute } from '@/lib/siteUrl';

// Rendered on each request from D1, so new posts and projects appear right away (and the build never reads the database).
export const dynamic = 'force-dynamic';

// Only real change dates are sent (search engines ignore sitemaps whose dates always say "now").
export default async function sitemap() {
  const [posts, projects, base] = await Promise.all([getPosts(), getProjects(), siteUrl()]);
  const latest = posts.reduce((d, p) => (p.updatedAt && p.updatedAt > d ? p.updatedAt : d), '');
  return [
    { url: base, changeFrequency: 'monthly', priority: 1, ...(latest && { lastModified: new Date(latest) }) },
    { url: `${base}/blog`, changeFrequency: 'weekly', priority: 0.8, ...(latest && { lastModified: new Date(latest) }) },
    ...projects.map((p) => ({
      url: `${base}/projects/${p.slug}`,
      changeFrequency: 'monthly',
      priority: 0.7,
      ...(p.image && { images: [absolute(p.image, base)] }),
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.publishedAt || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.7,
      images: [absolute(p.cover, base)],
    })),
  ];
}
