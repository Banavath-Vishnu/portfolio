'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { dbAvailable, sql, ensureSchema, bumpContentVersion } from '@/lib/db';
import { isAdmin } from '@/lib/admin';
import { site } from '@/data/site';

// Public form actions: the contact form and the newsletter sign-up. Both save to the database
// and show up in the admin's Inbox tab. A hidden "leave_empty" field (components/Honeypot.js) catches bots that fill every input.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const text = (formData, name, max) => String(formData.get(name) ?? '').trim().slice(0, max);
const unavailable = `This form isn’t connected yet — please email me at ${site.email}.`;

export async function sendMessage(_prev, formData) {
  const values = { name: text(formData, 'name', 100), email: text(formData, 'email', 200), message: text(formData, 'message', 5000) };
  if (text(formData, 'leave_empty', 200)) return { ok: true }; // bot: pretend it worked
  if (!values.name) return { error: 'Please add your name.', values };
  if (!EMAIL.test(values.email)) return { error: 'Please enter a valid email address.', values };
  if (values.message.length < 10) return { error: 'Please write a slightly longer message.', values };
  if (!(await dbAvailable())) return { error: unavailable, values };
  try {
    await ensureSchema();
    const [{ recent }] = await sql`
      SELECT COUNT(*) AS recent FROM messages WHERE email = ${values.email} AND created_at > ${new Date(Date.now() - 10 * 60 * 1000)}`;
    if (recent >= 3) return { error: 'You’ve sent a few messages already — I’ll get back to you soon.', values };
    await sql`INSERT INTO messages (name, email, message) VALUES (${values.name}, ${values.email}, ${values.message})`;
    return { ok: true };
  } catch (err) {
    console.error('sendMessage failed', err);
    return { error: `Something went wrong sending your message. Please email me at ${site.email}.`, values };
  }
}

export async function subscribe(_prev, formData) {
  const email = text(formData, 'email', 200);
  if (text(formData, 'leave_empty', 200)) return { ok: true };
  if (!EMAIL.test(email)) return { error: 'Please enter a valid email address.', email };
  if (!(await dbAvailable())) return { error: 'Sign-ups open soon — check back shortly.', email };
  try {
    await ensureSchema();
    await sql`INSERT INTO subscribers (email) VALUES (${email.toLowerCase()}) ON CONFLICT (email) DO NOTHING`;
    return { ok: true };
  } catch (err) {
    console.error('subscribe failed', err);
    return { error: 'Something went wrong — please try again.', email };
  }
}

// ---------- Comments ----------
// Comments go live straight away (you can hide or delete them in the admin). Spam guards: the hidden "leave_empty"
// field, a length limit, and at most 5 comments per visitor per 10 minutes (by a salted hash of their IP —
// the IP itself is never stored). When you're logged in as admin, your comments carry the "Author" badge.

async function visitorHash() {
  const h = await headers();
  const ip = h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const data = new TextEncoder().encode(`${ip}|${process.env.SESSION_SECRET || 'comments'}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function postComment(_prev, formData) {
  const author = await isAdmin();
  const values = {
    name: author ? site.name : text(formData, 'name', 60),
    email: author ? '' : text(formData, 'email', 200),
    body: text(formData, 'body', 2000),
  };
  const targetType = formData.get('targetType') === 'project' ? 'project' : 'post';
  const targetId = Number(formData.get('targetId'));
  let parentId = Number(formData.get('parentId')) || null;
  if (text(formData, 'leave_empty', 200)) return { ok: true }; // bot: pretend it worked
  if (!values.name) return { error: 'Please add your name.', values };
  if (values.email && !EMAIL.test(values.email)) return { error: 'That email doesn’t look right (or leave it empty).', values };
  if (values.body.length < 2) return { error: 'Please write a comment first.', values };
  if (!(await dbAvailable())) return { error: 'Comments aren’t available right now.', values };
  try {
    await ensureSchema();
    const now = new Date().toISOString();
    const [target] = targetType === 'post'
      ? await sql`SELECT slug FROM posts WHERE id = ${targetId} AND published AND (published_at IS NULL OR published_at <= ${now})`
      : await sql`SELECT slug FROM projects WHERE id = ${targetId} AND published`;
    if (!target) return { error: 'This page isn’t accepting comments.', values };

    if (parentId) {
      const [parent] = await sql`SELECT id, parent_id FROM comments WHERE id = ${parentId} AND target_type = ${targetType} AND target_id = ${targetId}`;
      if (!parent) return { error: 'The comment you’re replying to was removed.', values };
      parentId = parent.parent_id || parent.id; // replies stay one level deep
    }

    const ipHash = await visitorHash();
    if (!author) {
      const [{ recent }] = await sql`SELECT COUNT(*) AS recent FROM comments WHERE ip_hash = ${ipHash} AND created_at > ${new Date(Date.now() - 10 * 60 * 1000)}`;
      if (recent >= 5) return { error: 'You’re commenting a lot — please wait a few minutes and try again.', values };
    }

    const [{ id }] = await sql`
      INSERT INTO comments (target_type, target_id, parent_id, name, email, body, is_author, ip_hash)
      VALUES (${targetType}, ${targetId}, ${parentId}, ${values.name}, ${values.email || null}, ${values.body}, ${author}, ${ipHash})
      RETURNING id`;
    await bumpContentVersion();
    revalidatePath(`/${targetType === 'post' ? 'blog' : 'projects'}/${target.slug}`);
    return { ok: true, id };
  } catch (err) {
    console.error('postComment failed', err);
    return { error: 'Something went wrong posting your comment — please try again.', values };
  }
}
