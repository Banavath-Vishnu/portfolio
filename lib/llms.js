import { getPosts, getProjects, getJourney, getCertifications } from '@/lib/content';
import { siteUrl, snippet } from '@/lib/siteUrl';
import { site, about, award, review, approach, education, skillGroups } from '@/data/site';

// Builds /llms.txt and /llms-full.txt (llmstxt.org): Markdown overviews of the site for AI assistants and agents.
// Everything comes from the site's own content (data/site.js + the database), so it stays accurate and current.
// `full` adds the complete text of every project write-up and blog post.

const line = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// HTML write-ups → readable text with paragraph breaks (Markdown write-ups are already ideal for AI tools).
function plainText(content, format) {
  if (format !== 'html') return (content || '').trim();
  return (content || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|figure|blockquote|pre|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => `\n${'#'.repeat(Number(n) + 1)} `)
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function buildLlms({ full = false } = {}) {
  const [posts, projects, journey, certs, base] = await Promise.all([getPosts(), getProjects(), getJourney(), getCertifications(), siteUrl()]);
  const out = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    '## About',
    ...about.flatMap((p) => [p, '']),
    `Based in ${site.location}. Portfolio and blog: ${base}`,
    '',
    '## Contact',
    `- Email: ${site.email}`,
    `- Contact form: ${base}/#contact`,
    `- LinkedIn: ${site.linkedin}`,
    `- GitHub: ${site.github}`,
    `- Resume (PDF): ${base}${site.resume}`,
    '',
    '## Highlights',
    `- ${award.title.join(' ')} (${award.year}): ${award.line1.toLowerCase()} ${award.line2}.`,
    `- Client review (${review.rating}/5, ${review.from.replace(/^Client review from /, 'client in ')}): "${review.quote}"`,
    ...journey.filter((e) => e.live).map((e) => `- Currently: ${line(e.title)} at ${line(e.org)}. ${line(e.desc)}`),
    '',
    '## How I work',
    ...approach.map((a) => `- ${a.text}`),
    '',
    '## Skills',
    ...skillGroups.map((g) => `- ${g.title}: ${g.items.join(', ')}`),
  ];

  if (journey.length) {
    out.push('', '## Experience (most recent first)');
    for (const e of [...journey].reverse()) {
      const meta = [e.type, e.loc, e.dates].filter(Boolean).map(line).join(' · ');
      out.push(`- **${line(e.title)}**${e.org ? `, ${line(e.org)}` : ''}${meta ? ` (${meta})` : ''}${e.desc ? `: ${line(e.desc)}` : ''}`);
    }
  }

  out.push('', '## Education', ...education.map((e) => `- ${e.degree}, ${e.school} (${e.years})`));

  if (certs.length) {
    out.push('', '## Certifications');
    for (const c of certs) out.push(`- ${line(c.title)}${c.issuer ? `, ${line(c.issuer)}` : ''}${c.issued ? ` (${line(c.issued)})` : ''}${c.url ? `: ${c.url}` : ''}`);
  }

  if (projects.length) {
    out.push('', '## Projects');
    for (const p of projects) {
      const tags = p.tags?.length ? ` Tech: ${p.tags.join(', ')}.` : '';
      out.push(`- [${line(p.name)}](${base}/projects/${p.slug})${p.cat ? ` (${line(p.cat).toLowerCase()})` : ''}: ${line(p.desc || snippet(plainText(p.content, p.format), 200))}${tags}`);
    }
  }

  if (posts.length) {
    out.push('', '## Blog posts');
    for (const p of posts) out.push(`- [${line(p.title)}](${base}/blog/${p.slug}) (${p.date}, ${p.tag}): ${line(p.excerpt || snippet(plainText(p.content, p.format), 200))}`);
  }

  if (full) {
    for (const p of projects) {
      out.push('', '---', '', `## Project: ${line(p.name)}`, `URL: ${base}/projects/${p.slug}`);
      if (p.tags?.length) out.push(`Tech: ${p.tags.join(', ')}`);
      if (p.href && /^https?:/.test(p.href)) out.push(`Link: ${p.href}`);
      out.push('', line(p.desc), '', plainText(p.content, p.format) || '(No write-up yet.)');
    }
    for (const p of posts) {
      out.push('', '---', '', `## Post: ${line(p.title)}`, `URL: ${base}/blog/${p.slug}`, `Published: ${p.date} · Topic: ${p.tag}`, '', plainText(p.content, p.format) || line(p.excerpt));
    }
  }

  out.push('', '## Optional');
  if (!full) out.push(`- [Full text of all projects and posts](${base}/llms-full.txt)`);
  out.push(`- [Blog](${base}/blog): all posts`, `- [RSS feed](${base}/feed.xml)`, `- [Sitemap](${base}/sitemap.xml)`, '');
  return out.join('\n');
}

export const textResponse = (body) =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
