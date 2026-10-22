'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SESSION_COOKIE, SESSION_MAX_AGE, authConfigured, checkPassword, createSessionToken } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { dbAvailable, sql, ensureSchema, bumpContentVersion } from '@/lib/db';
import { putImage, removeImage, removeUnusedInline } from '@/lib/media';
import { ADMIN_PATH } from '@/lib/adminPath';

// Publishing model: saving never touches the live site. Every save writes a draft (the `draft` JSON text column);
// the public site only reads the live columns. "Approve & publish" copies the draft over the live version.

// ---------- Auth ----------

export async function login(_prev, formData) {
  if (!authConfigured()) {
    return { error: 'Admin login is not configured. Set ADMIN_PASSWORD and a SESSION_SECRET of at least 32 characters.' };
  }
  if (!(await checkPassword(formData.get('password')))) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return { error: 'Wrong password.' };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect(ADMIN_PATH);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect(`${ADMIN_PATH}/login`);
}

// ---------- Helpers ----------

function text(formData, name, max = 20000) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function safeHref(href) {
  if (!href) return '';
  return /^(https?:\/\/|\/|#)/i.test(href) ? href : null;
}

// Works out the draft's image after an upload / "remove" tick. An image only the old draft used is deleted;
// the live image is kept until the draft is published.
async function nextImage({ formData, field, removeField, folder, live, draft }) {
  const current = draft !== undefined ? draft : live;
  const uploaded = await putImage(formData.get(field), folder);
  if (uploaded) { if (current !== live) await removeImage(current); return uploaded; }
  if (formData.get(removeField) === 'on') { if (current !== live) await removeImage(current); return null; }
  return current;
}

async function needDb() {
  if (!(await dbAvailable())) throw new Error('No database available. Check the D1 binding (run `npm run cf:config`).');
}

// After any content change: clear Next's cache for the affected pages and the edge page cache (new version).
async function refreshSite(...paths) {
  await bumpContentVersion();
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');
  paths.filter(Boolean).forEach((p) => revalidatePath(p));
}

const json = (v) => JSON.stringify(v);

// A post topic / project filter must be one of the categories managed in the admin (falls back to the first one).
async function pickCategory(kind, value) {
  const names = (await sql`SELECT name FROM categories WHERE kind = ${kind} ORDER BY sort_order ASC, id ASC`).map((r) => r.name);
  if (names.includes(value)) return value;
  return names[0] ?? (value || 'General');
}

// ---------- Posts ----------

export async function savePost(_prev, formData) {
  await requireAdmin();
  let id = Number(formData.get('id')) || null;
  const intent = formData.get('intent') === 'preview' ? 'preview' : 'draft';
  try {
    await needDb();
    await ensureSchema();
    const title = text(formData, 'title', 200);
    const slug = slugify(text(formData, 'slug', 120) || title);
    const tagIn = text(formData, 'tag');
    if (!title) return { error: 'Title is required.' };
    if (!slug) return { error: 'Slug is required.' };

    const [taken] = await sql`SELECT id FROM posts WHERE slug = ${slug} AND (${id} IS NULL OR id <> ${id})`;
    if (taken) return { error: `The slug “${slug}” is already used by another post.` };

    const row = id ? (await sql`SELECT cover_url, content, draft FROM posts WHERE id = ${id}`)[0] : null;
    if (id && !row) return { error: 'Post not found.' };

    // Publish date & time (sent as ISO from the editor). Empty = when you approve; a future time schedules the post.
    const publishIn = text(formData, 'publishAt', 40);
    const publishAt = publishIn ? new Date(publishIn) : null;
    if (publishAt && Number.isNaN(publishAt.getTime())) return { error: 'That publish date isn’t valid.' };

    const draft = {
      slug,
      title,
      excerpt: text(formData, 'excerpt', 500),
      content: text(formData, 'content', 200000),
      content_format: formData.get('contentFormat') === 'html' ? 'html' : 'markdown',
      tag: await pickCategory('post', tagIn),
      read_time: text(formData, 'readTime', 40) || null,
      publish_at: publishAt ? publishAt.toISOString() : null,
      cover_url: await nextImage({ formData, field: 'cover', removeField: 'removeCover', folder: 'blog', live: row?.cover_url ?? null, draft: row?.draft?.cover_url }),
    };

    if (id) {
      await sql`UPDATE posts SET draft = ${json(draft)}, updated_at = ${new Date()} WHERE id = ${id}`;
      // Screenshots taken out of the previous draft (and not on the live version) are deleted.
      await removeUnusedInline(row.draft?.content, draft.content, row.content);
    } else {
      // A new post starts unpublished; slug/title are stored live only to satisfy NOT NULL/UNIQUE.
      [{ id }] = await sql`
        INSERT INTO posts (slug, title, draft, published) VALUES (${slug}, ${title}, ${json(draft)}, 0) RETURNING id`;
    }
  } catch (err) {
    return { error: err.message || 'Could not save the post.' };
  }
  redirect(intent === 'preview' ? `${ADMIN_PATH}/preview/posts/${id}` : `${ADMIN_PATH}/posts/${id}?saved=1`);
}

export async function publishPost(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`SELECT slug, cover_url, content, published_at, draft FROM posts WHERE id = ${id}`;
  if (!row) redirect(ADMIN_PATH);
  const d = row.draft;
  const now = new Date().toISOString();
  // The draft's publish time wins (empty = now); older drafts without one keep the original date.
  const at = d && 'publish_at' in d ? (d.publish_at || now) : (row.published_at || now);
  if (d) {
    const [taken] = await sql`SELECT id FROM posts WHERE slug = ${d.slug} AND id <> ${id}`;
    if (taken) redirect(`${ADMIN_PATH}/posts/${id}?error=slug`);
    await sql`
      UPDATE posts SET slug = ${d.slug}, title = ${d.title}, excerpt = ${d.excerpt}, content = ${d.content},
        content_format = ${d.content_format || 'markdown'}, tag = ${d.tag},
        cover_url = ${d.cover_url}, read_time = ${d.read_time}, draft = NULL, published = 1,
        published_at = ${at}, updated_at = ${now}
      WHERE id = ${id}`;
    if (row.cover_url !== d.cover_url) await removeImage(row.cover_url);
    await removeUnusedInline(row.content, d.content);
  } else {
    await sql`UPDATE posts SET published = 1, published_at = ${at}, updated_at = ${now} WHERE id = ${id}`;
  }
  await refreshSite(`/blog/${row.slug}`, d && `/blog/${d.slug}`);
  redirect(`${ADMIN_PATH}?${at > now ? 'scheduled' : 'published'}=post`);
}

// A scheduled post, live right away.
export async function publishPostNow(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const now = new Date().toISOString();
  const [row] = await sql`UPDATE posts SET published = 1, published_at = ${now}, updated_at = ${now} WHERE id = ${id} RETURNING slug`;
  if (row) await refreshSite(`/blog/${row.slug}`);
  redirect(`${ADMIN_PATH}?published=post`);
}

export async function discardPostDraft(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`SELECT cover_url, content, draft FROM posts WHERE id = ${id}`;
  if (row?.draft) {
    if (row.draft.cover_url !== row.cover_url) await removeImage(row.draft.cover_url);
    await removeUnusedInline(row.draft.content, row.content);
    await sql`UPDATE posts SET draft = NULL, updated_at = ${new Date()} WHERE id = ${id}`;
  }
  redirect(`${ADMIN_PATH}/posts/${id}?discarded=1`);
}

export async function unpublishPost(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`UPDATE posts SET published = 0, updated_at = ${new Date()} WHERE id = ${id} RETURNING slug`;
  if (row) await refreshSite(`/blog/${row.slug}`);
  redirect(`${ADMIN_PATH}?unpublished=post`);
}

export async function deletePost(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`DELETE FROM posts WHERE id = ${id} RETURNING slug, cover_url, content, draft`;
  await sql`DELETE FROM comments WHERE target_type = 'post' AND target_id = ${id}`;
  if (row) {
    await removeImage(row.cover_url);
    await removeUnusedInline([row.content, row.draft?.content].join(' '));
    if (row.draft?.cover_url !== row.cover_url) await removeImage(row.draft?.cover_url);
    await refreshSite(`/blog/${row.slug}`);
  }
  redirect(`${ADMIN_PATH}?deleted=post`);
}

// ---------- Projects ----------

export async function saveProject(_prev, formData) {
  await requireAdmin();
  let id = Number(formData.get('id')) || null;
  const intent = formData.get('intent') === 'preview' ? 'preview' : 'draft';
  try {
    await needDb();
    await ensureSchema();
    const name = text(formData, 'name', 120);
    const slug = slugify(text(formData, 'slug', 120) || name);
    const key = text(formData, 'filterKey');
    const href = safeHref(text(formData, 'href', 500));
    if (!name) return { error: 'Name is required.' };
    if (!slug) return { error: 'Slug is required.' };
    if (href === null) return { error: 'Link must start with https://, http://, / or #.' };

    const [taken] = await sql`SELECT id FROM projects WHERE slug = ${slug} AND (${id} IS NULL OR id <> ${id})`;
    if (taken) return { error: `The slug “${slug}” is already used by another project.` };

    const row = id ? (await sql`SELECT image_url, content, draft FROM projects WHERE id = ${id}`)[0] : null;
    if (id && !row) return { error: 'Project not found.' };

    const draft = {
      name,
      slug,
      content: text(formData, 'content', 200000),
      content_format: formData.get('contentFormat') === 'html' ? 'html' : 'markdown',
      category: text(formData, 'category', 60).toUpperCase(),
      filter_key: await pickCategory('project', key),
      tags: text(formData, 'tags', 400).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
      description: text(formData, 'description', 600),
      href,
      link_label: text(formData, 'linkLabel', 40) || 'Read more ↗',
      sort_order: Number.parseInt(text(formData, 'sortOrder'), 10) || 0,
      image_url: await nextImage({ formData, field: 'image', removeField: 'removeImage', folder: 'projects', live: row?.image_url ?? null, draft: row?.draft?.image_url }),
    };

    if (id) {
      await sql`UPDATE projects SET draft = ${json(draft)} WHERE id = ${id}`;
      await removeUnusedInline(row.draft?.content, draft.content, row.content);
    } else {
      [{ id }] = await sql`
        INSERT INTO projects (name, slug, draft, published) VALUES (${name}, ${slug}, ${json(draft)}, 0) RETURNING id`;
    }
  } catch (err) {
    return { error: err.message || 'Could not save the project.' };
  }
  redirect(intent === 'preview' ? `${ADMIN_PATH}/preview/projects/${id}` : `${ADMIN_PATH}/projects/${id}?saved=1`);
}

export async function publishProject(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`SELECT slug, image_url, content, draft FROM projects WHERE id = ${id}`;
  if (!row) redirect(ADMIN_PATH);
  const d = row.draft;
  if (d) {
    const [taken] = await sql`SELECT id FROM projects WHERE slug = ${d.slug} AND id <> ${id}`;
    if (taken) redirect(`${ADMIN_PATH}/projects/${id}?error=slug`);
    await sql`
      UPDATE projects SET name = ${d.name}, slug = ${d.slug}, content = ${d.content}, content_format = ${d.content_format || 'markdown'},
        category = ${d.category},
        filter_key = ${d.filter_key}, tags = ${d.tags}, description = ${d.description}, href = ${d.href},
        link_label = ${d.link_label}, image_url = ${d.image_url}, sort_order = ${d.sort_order}, draft = NULL, published = 1
      WHERE id = ${id}`;
    if (row.image_url !== d.image_url) await removeImage(row.image_url);
    await removeUnusedInline(row.content, d.content);
  } else {
    await sql`UPDATE projects SET published = 1 WHERE id = ${id}`;
  }
  await refreshSite(`/projects/${row.slug}`, d && `/projects/${d.slug}`);
  redirect(`${ADMIN_PATH}?published=project`);
}

export async function discardProjectDraft(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`SELECT image_url, content, draft FROM projects WHERE id = ${id}`;
  if (row?.draft) {
    if (row.draft.image_url !== row.image_url) await removeImage(row.draft.image_url);
    await removeUnusedInline(row.draft.content, row.content);
    await sql`UPDATE projects SET draft = NULL WHERE id = ${id}`;
  }
  redirect(`${ADMIN_PATH}/projects/${id}?discarded=1`);
}

export async function unpublishProject(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`UPDATE projects SET published = 0 WHERE id = ${id} RETURNING slug`;
  if (row) await refreshSite(`/projects/${row.slug}`);
  redirect(`${ADMIN_PATH}?unpublished=project`);
}

export async function deleteProject(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [row] = await sql`DELETE FROM projects WHERE id = ${id} RETURNING slug, image_url, content, draft`;
  await sql`DELETE FROM comments WHERE target_type = 'project' AND target_id = ${id}`;
  if (row) {
    await removeImage(row.image_url);
    await removeUnusedInline([row.content, row.draft?.content].join(' '));
    if (row.draft?.image_url !== row.image_url) await removeImage(row.draft?.image_url);
    await refreshSite(`/projects/${row.slug}`);
  }
  redirect(`${ADMIN_PATH}?deleted=project`);
}

// ---------- Images inside Markdown ----------

// Uploads one screenshot from the Markdown editor (button, paste or drag & drop) and returns its URL.
export async function uploadInlineImage(formData) {
  await requireAdmin();
  try {
    const url = await putImage(formData.get('image'), 'inline');
    return url ? { url } : { error: 'No image was selected.' };
  } catch (err) {
    return { error: err.message || 'Upload failed.' };
  }
}

// ---------- Inbox ----------

export async function deleteMessage(formData) {
  await requireAdmin();
  await needDb();
  await sql`DELETE FROM messages WHERE id = ${Number(formData.get('id'))}`;
  redirect(`${ADMIN_PATH}?tab=inbox&deleted=message`);
}

export async function deleteSubscriber(formData) {
  await requireAdmin();
  await needDb();
  await sql`DELETE FROM subscribers WHERE id = ${Number(formData.get('id'))}`;
  redirect(`${ADMIN_PATH}?tab=inbox&deleted=subscriber`);
}

// ---------- Comments ----------

async function commentPage(id) {
  const [r] = await sql`
    SELECT COALESCE(p.slug, pr.slug) AS slug, c.target_type FROM comments c
    LEFT JOIN posts p ON c.target_type = 'post' AND p.id = c.target_id
    LEFT JOIN projects pr ON c.target_type = 'project' AND pr.id = c.target_id
    WHERE c.id = ${id}`;
  return r?.slug ? `/${r.target_type === 'post' ? 'blog' : 'projects'}/${r.slug}` : null;
}

// Hide (or show again) a comment; hiding a top-level comment hides its replies on the site too.
export async function setCommentHidden(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const hidden = formData.get('hidden') === '1';
  await sql`UPDATE comments SET hidden = ${hidden} WHERE id = ${id}`;
  await bumpContentVersion();
  const page = await commentPage(id);
  if (page) revalidatePath(page);
  redirect(`${ADMIN_PATH}?tab=comments&${hidden ? 'hidden' : 'shown'}=comment`);
}

// Deletes a comment and its replies.
export async function deleteComment(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const page = await commentPage(id);
  await sql`DELETE FROM comments WHERE id = ${id} OR parent_id = ${id}`;
  await bumpContentVersion();
  if (page) revalidatePath(page);
  redirect(`${ADMIN_PATH}?tab=comments&deleted=comment`);
}

// ---------- Categories ----------
// Changes here go live right away (no draft step). Renaming also renames the category on every post/project
// (and pending draft) that uses it; a category that's still in use can't be deleted.

const CATEGORIES = `${ADMIN_PATH}/categories`;

function categoriesRedirect(params) {
  redirect(`${CATEGORIES}?${new URLSearchParams(params)}`);
}

async function categoryUsage(kind, name) {
  const [r] = kind === 'post'
    ? await sql`SELECT COUNT(*) AS n FROM posts WHERE tag = ${name} OR json_extract(draft, '$.tag') = ${name}`
    : await sql`SELECT COUNT(*) AS n FROM projects WHERE filter_key = ${name} OR json_extract(draft, '$.filter_key') = ${name}`;
  return r.n;
}

export async function addCategory(formData) {
  await requireAdmin();
  await needDb();
  await ensureSchema();
  const kind = formData.get('kind') === 'post' ? 'post' : 'project';
  const name = text(formData, 'name', 40);
  if (!name) categoriesRedirect({ error: 'empty' });
  const [dupe] = await sql`SELECT id FROM categories WHERE kind = ${kind} AND name = ${name} COLLATE NOCASE`;
  if (dupe) categoriesRedirect({ error: 'exists', name });
  await sql`INSERT INTO categories (kind, name, sort_order)
    VALUES (${kind}, ${name}, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM categories WHERE kind = ${kind}))`;
  await refreshSite();
  categoriesRedirect({ added: name });
}

export async function renameCategory(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const name = text(formData, 'name', 40);
  const [cat] = await sql`SELECT kind, name FROM categories WHERE id = ${id}`;
  if (!cat || name === cat.name) categoriesRedirect({});
  if (!name) categoriesRedirect({ error: 'empty' });
  const [dupe] = await sql`SELECT id FROM categories WHERE kind = ${cat.kind} AND name = ${name} COLLATE NOCASE AND id <> ${id}`;
  if (dupe) categoriesRedirect({ error: 'exists', name });

  await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
  if (cat.kind === 'post') {
    await sql`UPDATE posts SET tag = ${name} WHERE tag = ${cat.name}`;
    await sql`UPDATE posts SET draft = json_set(draft, '$.tag', ${name}) WHERE json_extract(draft, '$.tag') = ${cat.name}`;
  } else {
    await sql`UPDATE projects SET filter_key = ${name} WHERE filter_key = ${cat.name}`;
    await sql`UPDATE projects SET draft = json_set(draft, '$.filter_key', ${name}) WHERE json_extract(draft, '$.filter_key') = ${cat.name}`;
  }
  await refreshSite();
  categoriesRedirect({ renamed: name });
}

// Moves a category one place up or down within its kind.
export async function moveCategory(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const dir = formData.get('dir') === 'up' ? -1 : 1;
  const [cat] = await sql`SELECT kind FROM categories WHERE id = ${id}`;
  if (cat) {
    const ids = (await sql`SELECT id FROM categories WHERE kind = ${cat.kind} ORDER BY sort_order ASC, id ASC`).map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j >= 0 && j < ids.length) {
      [ids[i], ids[j]] = [ids[j], ids[i]];
      for (const [n, cid] of ids.entries()) await sql`UPDATE categories SET sort_order = ${(n + 1) * 10} WHERE id = ${cid}`;
      await refreshSite();
    }
  }
  categoriesRedirect({});
}

export async function deleteCategory(formData) {
  await requireAdmin();
  await needDb();
  const id = Number(formData.get('id'));
  const [cat] = await sql`SELECT kind, name FROM categories WHERE id = ${id}`;
  if (!cat) categoriesRedirect({});
  const used = await categoryUsage(cat.kind, cat.name);
  if (used) categoriesRedirect({ error: 'inuse', name: cat.name, n: used, kind: cat.kind });
  await sql`DELETE FROM categories WHERE id = ${id}`;
  await refreshSite();
  categoriesRedirect({ deleted: cat.name });
}

// ---------- Journey ----------
// Timeline entries go live as soon as they're saved. Logos are uploaded to Cloudinary (folder "journey").

const JOURNEY = `${ADMIN_PATH}/journey`;

export async function saveJourney(_prev, formData) {
  await requireAdmin();
  let id = Number(formData.get('id')) || null;
  let uploaded = null;
  try {
    await needDb();
    await ensureSchema();
    const title = text(formData, 'title', 160);
    const since = text(formData, 'since', 7);
    if (!title) return { error: 'Title is required.' };
    if (since && !/^\d{4}-(0[1-9]|1[0-2])$/.test(since)) return { error: 'Start month must look like 2026-05.' };

    const row = id ? (await sql`SELECT logo_url FROM journey WHERE id = ${id}`)[0] : null;
    if (id && !row) return { error: 'Entry not found.' };

    uploaded = await putImage(formData.get('logo'), 'journey');
    const logo = uploaded ?? (formData.get('removeLogo') === 'on' ? null : row?.logo_url ?? null);
    const order = Number.parseInt(text(formData, 'sortOrder'), 10);
    const e = {
      org: text(formData, 'org', 120),
      type: text(formData, 'type', 60),
      location: text(formData, 'location', 120),
      dates: text(formData, 'dates', 60),
      duration: text(formData, 'duration', 40),
      since: since || null,
      live: formData.get('live') === 'on',
      description: text(formData, 'description', 2000),
    };

    if (id) {
      await sql`UPDATE journey SET title = ${title}, org = ${e.org}, type = ${e.type}, location = ${e.location}, dates = ${e.dates},
        duration = ${e.duration}, since = ${e.since}, live = ${e.live}, description = ${e.description}, logo_url = ${logo},
        sort_order = ${Number.isNaN(order) ? 0 : order} WHERE id = ${id}`;
      if (row.logo_url && row.logo_url !== logo) await removeImage(row.logo_url);
    } else {
      // New entries go to the end of the timeline unless an order is given.
      await sql`
        INSERT INTO journey (title, org, type, location, dates, duration, since, live, description, logo_url, sort_order)
        VALUES (${title}, ${e.org}, ${e.type}, ${e.location}, ${e.dates}, ${e.duration}, ${e.since}, ${e.live}, ${e.description}, ${logo},
          COALESCE(${Number.isNaN(order) ? null : order}, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM journey)))`;
    }
  } catch (err) {
    if (uploaded) await removeImage(uploaded);
    return { error: err.message || 'Could not save the entry.' };
  }
  await refreshSite();
  redirect(`${JOURNEY}?saved=1`);
}

export async function deleteJourney(formData) {
  await requireAdmin();
  await needDb();
  const [row] = await sql`DELETE FROM journey WHERE id = ${Number(formData.get('id'))} RETURNING logo_url`;
  if (row) await removeImage(row.logo_url);
  await refreshSite();
  redirect(`${JOURNEY}?deleted=1`);
}

// ---------- Certifications ----------
// Live as soon as they're saved. Certificate images are uploaded to Cloudinary (folder "certifications").

const CERTS = `${ADMIN_PATH}/certifications`;

export async function saveCertification(_prev, formData) {
  await requireAdmin();
  const id = Number(formData.get('id')) || null;
  let uploaded = null;
  try {
    await needDb();
    await ensureSchema();
    const title = text(formData, 'title', 160);
    const url = safeHref(text(formData, 'url', 500));
    if (!title) return { error: 'Title is required.' };
    if (url === null) return { error: 'Credential link must start with https://, http://, / or #.' };

    const row = id ? (await sql`SELECT image_url FROM certifications WHERE id = ${id}`)[0] : null;
    if (id && !row) return { error: 'Certification not found.' };

    uploaded = await putImage(formData.get('image'), 'certifications');
    const image = uploaded ?? (formData.get('removeImage') === 'on' ? null : row?.image_url ?? null);
    const c = {
      issuer: text(formData, 'issuer', 120),
      issued: text(formData, 'issued', 40),
      credentialId: text(formData, 'credentialId', 120),
      orientation: formData.get('orientation') === 'landscape' ? 'landscape' : 'portrait',
      sortOrder: Number.parseInt(text(formData, 'sortOrder'), 10) || 0,
    };

    if (id) {
      await sql`UPDATE certifications SET title = ${title}, issuer = ${c.issuer}, issued = ${c.issued}, credential_id = ${c.credentialId},
        url = ${url}, image_url = ${image}, orientation = ${c.orientation}, sort_order = ${c.sortOrder} WHERE id = ${id}`;
      if (row.image_url && row.image_url !== image) await removeImage(row.image_url);
    } else {
      await sql`
        INSERT INTO certifications (title, issuer, issued, credential_id, url, image_url, orientation, sort_order)
        VALUES (${title}, ${c.issuer}, ${c.issued}, ${c.credentialId}, ${url}, ${image}, ${c.orientation}, ${c.sortOrder})`;
    }
  } catch (err) {
    if (uploaded) await removeImage(uploaded);
    return { error: err.message || 'Could not save the certification.' };
  }
  await refreshSite();
  redirect(`${CERTS}?saved=1`);
}

export async function deleteCertification(formData) {
  await requireAdmin();
  await needDb();
  const [row] = await sql`DELETE FROM certifications WHERE id = ${Number(formData.get('id'))} RETURNING image_url`;
  if (row) await removeImage(row.image_url);
  await refreshSite();
  redirect(`${CERTS}?deleted=1`);
}
