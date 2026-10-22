import { dbAvailable, sql, ensureSchema } from './db';

// Reads posts and projects from the D1 database. Nothing is hardcoded: without the D1 binding the site
// simply shows its empty states ("Projects are on the way", "The first posts are on their way").

export const DEFAULT_COVER = '/blog/default-cover.jpg';

// Dates are shown in the site's timezone (SITE_TIMEZONE in .env.local), wherever the server runs.
const timeZone = () => process.env.SITE_TIMEZONE || 'Asia/Kolkata';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: timeZone() });
}

export function formatDateTime(d) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timeZone() });
}

// Published posts whose publish time hasn't come yet are "scheduled": hidden until then, no cron needed.
const nowIso = () => new Date().toISOString();

export function estimateReadTime(text) {
  const words = (text || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function toPost(r) {
  // A pending draft may carry its own publish time (`publish_at`; null = "when approved").
  const publishAt = 'publish_at' in r ? r.publish_at : r.published_at;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    content: r.content,
    format: r.content_format === 'html' ? 'html' : 'markdown',
    tag: r.tag,
    cover: r.cover_url || DEFAULT_COVER,
    coverUrl: r.cover_url,
    readTime: r.read_time || estimateReadTime(r.content),
    readTimeSet: r.read_time || '',
    views: r.views,
    published: r.published,
    date: formatDate(publishAt || r.created_at),
    publishedAt: r.published_at,
    publishAt: publishAt || null,
    publishAtLabel: publishAt ? formatDateTime(publishAt) : '',
    scheduled: Boolean(r.published && r.published_at && r.published_at > nowIso()),
    updatedAt: r.updated_at,
  };
}

function toProject(r) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    content: r.content || '',
    format: r.content_format === 'html' ? 'html' : 'markdown',
    cat: r.category,
    key: r.filter_key,
    tags: r.tags || [],
    desc: r.description,
    href: r.href || '#',
    linkLabel: r.link_label,
    image: r.image_url || undefined,
    sortOrder: r.sort_order,
    published: r.published,
  };
}

// Admin views show the pending draft (if any) on top of the live row, plus where it stands.
function status(r) {
  return { hasDraft: Boolean(r.draft), live: Boolean(r.published), everPublished: Boolean(r.published_at ?? r.published) };
}
const toAdminPost = (r) => ({ ...toPost({ ...r, ...(r.draft || {}) }), ...status(r) });
const toAdminProject = (r) => ({ ...toProject({ ...r, ...(r.draft || {}) }), ...status(r) });

// Public site: published posts only, newest first.
export async function getPosts() {
  if (!(await dbAvailable())) return [];
  try {
    await ensureSchema();
    const rows = await sql`SELECT * FROM posts WHERE published AND (published_at IS NULL OR published_at <= ${nowIso()}) ORDER BY published_at DESC NULLS LAST, id DESC`;
    return rows.map(toPost);
  } catch (err) {
    console.error('getPosts failed', err);
    return [];
  }
}

export async function getPost(slug) {
  if (!(await dbAvailable())) return null;
  try {
    await ensureSchema();
    const [row] = await sql`SELECT * FROM posts WHERE slug = ${slug} AND published AND (published_at IS NULL OR published_at <= ${nowIso()})`;
    return row ? toPost(row) : null;
  } catch (err) {
    console.error('getPost failed', err);
    return null;
  }
}

export async function getProjects() {
  if (!(await dbAvailable())) return [];
  try {
    await ensureSchema();
    const rows = await sql`SELECT * FROM projects WHERE published ORDER BY sort_order ASC, id ASC`;
    return rows.map(toProject);
  } catch (err) {
    console.error('getProjects failed', err);
    return [];
  }
}

export async function getProject(slug) {
  if (!(await dbAvailable())) return null;
  try {
    await ensureSchema();
    const [row] = await sql`SELECT * FROM projects WHERE slug = ${slug} AND published`;
    return row ? toProject(row) : null;
  } catch (err) {
    console.error('getProject failed', err);
    return null;
  }
}

// Admin: everything, with pending drafts merged in. These throw so the admin sees real errors.
export async function getAllPostsForAdmin() {
  if (!(await dbAvailable())) return [];
  await ensureSchema();
  return (await sql`SELECT * FROM posts ORDER BY updated_at DESC`).map(toAdminPost);
}

export async function getPostById(id) {
  if (!(await dbAvailable())) return null;
  await ensureSchema();
  const [row] = await sql`SELECT * FROM posts WHERE id = ${id}`;
  return row ? toAdminPost(row) : null;
}

export async function getAllProjectsForAdmin() {
  if (!(await dbAvailable())) return [];
  await ensureSchema();
  return (await sql`SELECT * FROM projects ORDER BY sort_order ASC, id ASC`).map(toAdminProject);
}

// Admin inbox: contact-form messages and newsletter subscribers, newest first.
export async function getInbox() {
  if (!(await dbAvailable())) return { messages: [], subscribers: [] };
  await ensureSchema();
  const [messages, subscribers] = await Promise.all([
    sql`SELECT * FROM messages ORDER BY created_at DESC`,
    sql`SELECT * FROM subscribers ORDER BY created_at DESC`,
  ]);
  return {
    messages: messages.map((m) => ({ id: m.id, name: m.name, email: m.email, message: m.message, date: formatDate(m.created_at) })),
    subscribers: subscribers.map((s) => ({ id: s.id, email: s.email, date: formatDate(s.created_at) })),
  };
}

export async function getProjectById(id) {
  if (!(await dbAvailable())) return null;
  await ensureSchema();
  const [row] = await sql`SELECT * FROM projects WHERE id = ${id}`;
  return row ? toAdminProject(row) : null;
}

// ---------- Categories, journey, certifications ----------

// Category names for 'project' (homepage filter tabs) or 'post' (blog topics), in display order.
export async function getCategories(kind) {
  if (!(await dbAvailable())) return [];
  try {
    await ensureSchema();
    return (await sql`SELECT name FROM categories WHERE kind = ${kind} ORDER BY sort_order ASC, id ASC`).map((r) => r.name);
  } catch (err) {
    console.error('getCategories failed', err);
    return [];
  }
}

// Admin: both kinds, with how many posts/projects use each one.
export async function getCategoriesForAdmin() {
  if (!(await dbAvailable())) return { project: [], post: [] };
  await ensureSchema();
  const rows = await sql`
    SELECT c.id, c.kind, c.name, c.sort_order,
      CASE c.kind WHEN 'post' THEN (SELECT COUNT(*) FROM posts WHERE tag = c.name)
                  ELSE (SELECT COUNT(*) FROM projects WHERE filter_key = c.name) END AS used
    FROM categories c ORDER BY c.sort_order ASC, c.id ASC`;
  const toCat = (r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order, used: r.used });
  return { project: rows.filter((r) => r.kind === 'project').map(toCat), post: rows.filter((r) => r.kind === 'post').map(toCat) };
}

function toJourney(r) {
  return {
    id: r.id,
    title: r.title,
    org: r.org,
    type: r.type,
    loc: r.location,
    dates: r.dates,
    dur: r.duration,
    since: r.since || '',
    live: Boolean(r.live),
    desc: r.description,
    logo: r.logo_url || undefined,
    sortOrder: r.sort_order,
  };
}

async function readJourney() {
  await ensureSchema();
  return (await sql`SELECT * FROM journey ORDER BY sort_order ASC, id ASC`).map(toJourney);
}

export async function getJourney() {
  if (!(await dbAvailable())) return [];
  try {
    return await readJourney();
  } catch (err) {
    console.error('getJourney failed', err);
    return [];
  }
}

export async function getJourneyForAdmin() {
  if (!(await dbAvailable())) return [];
  return readJourney();
}

export async function getJourneyEntry(id) {
  if (!(await dbAvailable())) return null;
  await ensureSchema();
  const [row] = await sql`SELECT * FROM journey WHERE id = ${id}`;
  return row ? toJourney(row) : null;
}

function toCertification(r) {
  return {
    id: r.id,
    title: r.title,
    issuer: r.issuer,
    issued: r.issued,
    credentialId: r.credential_id,
    url: r.url,
    image: r.image_url || undefined,
    orientation: r.orientation === 'landscape' ? 'landscape' : 'portrait',
    sortOrder: r.sort_order,
  };
}

async function readCertifications() {
  await ensureSchema();
  return (await sql`SELECT * FROM certifications ORDER BY sort_order ASC, id DESC`).map(toCertification);
}

export async function getCertifications() {
  if (!(await dbAvailable())) return [];
  try {
    return await readCertifications();
  } catch (err) {
    console.error('getCertifications failed', err);
    return [];
  }
}

export async function getCertificationsForAdmin() {
  if (!(await dbAvailable())) return [];
  return readCertifications();
}

export async function getCertification(id) {
  if (!(await dbAvailable())) return null;
  await ensureSchema();
  const [row] = await sql`SELECT * FROM certifications WHERE id = ${id}`;
  return row ? toCertification(row) : null;
}

// ---------- Comments ----------

function toComment(r) {
  return { id: r.id, parentId: r.parent_id, name: r.name, body: r.body, isAuthor: Boolean(r.is_author), date: formatDate(r.created_at), createdAt: r.created_at };
}

// Public: visible comments for one post/project, oldest first, each with its replies.
// Replies under a hidden comment are hidden with it.
export async function getComments(targetType, targetId) {
  if (!(await dbAvailable())) return [];
  try {
    await ensureSchema();
    const rows = await sql`SELECT * FROM comments WHERE target_type = ${targetType} AND target_id = ${targetId} AND NOT hidden ORDER BY created_at ASC, id ASC`;
    const top = rows.filter((r) => !r.parent_id).map((r) => ({ ...toComment(r), replies: [] }));
    const byId = new Map(top.map((c) => [c.id, c]));
    for (const r of rows) if (r.parent_id) byId.get(r.parent_id)?.replies.push(toComment(r));
    return top;
  } catch (err) {
    console.error('getComments failed', err);
    return [];
  }
}

// Admin: every comment, newest first, with what it's on.
export async function getCommentsForAdmin() {
  if (!(await dbAvailable())) return [];
  await ensureSchema();
  const rows = await sql`
    SELECT c.*, COALESCE(p.title, pr.name) AS target_title, COALESCE(p.slug, pr.slug) AS target_slug, parent.name AS parent_name
    FROM comments c
    LEFT JOIN posts p ON c.target_type = 'post' AND p.id = c.target_id
    LEFT JOIN projects pr ON c.target_type = 'project' AND pr.id = c.target_id
    LEFT JOIN comments parent ON parent.id = c.parent_id
    ORDER BY c.created_at DESC, c.id DESC`;
  return rows.map((r) => ({
    ...toComment(r),
    email: r.email || '',
    hidden: Boolean(r.hidden),
    targetType: r.target_type,
    targetTitle: r.target_title || '(deleted)',
    href: r.target_slug ? `/${r.target_type === 'post' ? 'blog' : 'projects'}/${r.target_slug}#comment-${r.id}` : null,
    parentName: r.parent_name || '',
  }));
}
