import { getPosts } from '@/lib/content';
import { siteUrl, absolute, snippet } from '@/lib/siteUrl';
import { site } from '@/data/site';

// RSS feed of published posts (/feed.xml) — for feed readers, and another way search engines discover new posts.
export const dynamic = 'force-dynamic';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const [posts, base] = await Promise.all([getPosts(), siteUrl()]);
  const items = posts.slice(0, 50).map((p) => {
    const url = `${base}/blog/${p.slug}`;
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.publishedAt || Date.now()).toUTCString()}</pubDate>
      <category>${esc(p.tag)}</category>
      <description>${esc(p.excerpt || snippet(p.content, 300))}</description>
      <enclosure url="${esc(absolute(p.cover, base))}" type="image/jpeg" length="0" />
    </item>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} — Blog</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${esc('Writing on AI systems, LLM backends, backend security and shipping full stack products.')}</description>
    <language>en</language>
${posts[0] ? `    <lastBuildDate>${new Date(posts[0].publishedAt || Date.now()).toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
