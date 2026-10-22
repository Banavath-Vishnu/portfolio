'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { savePost } from '@/app/admin/ultrapremiumhomosepian/hello/actions';
import Link from 'next/link';
import { ADMIN_PATH } from '@/lib/adminPath';
import ContentEditor from './ContentEditor';
import EditorTabs, { useEditorTab, useSaveShortcut, wordCount } from './EditorTabs';
import EditorBar, { StatusBadge, statusOf } from './EditorFooter';

// <input type="datetime-local"> works in the browser's local time; the server gets an ISO timestamp.
const pad = (n) => String(n).padStart(2, '0');
function toLocalInput(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

const STATUS_HELP = {
  draft: 'Not on the site yet. Save & preview, then approve to publish.',
  scheduled: 'Approved and waiting — it goes live by itself at the scheduled time.',
  pending: 'Your saved changes are waiting for approval. The site still shows the live version.',
  live: 'Visitors see this version. Edits become a draft until you publish them.',
};

// Post editor: a Details tab (title, summary, publishing & schedule, slug, topic, cover) and a Write tab
// (the Markdown/HTML editor with preview). Both are one form, so either Save button sends everything.
export default function PostForm({ post, heading, notice, alert, topics = [] }) {
  const [state, action] = useActionState(savePost, null);
  const [tab, setTab] = useEditorTab(!post);
  const form = useRef(null);
  const titleRef = useRef(null);
  useSaveShortcut(form);
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? '');
  const [format, setFormat] = useState(post?.format ?? 'markdown');
  // Controlled so a failed save (React resets uncontrolled fields after an action) never loses your text.
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [tag, setTag] = useState(post?.tag ?? topics[0] ?? '');
  // Topics come from the Categories page; keep the post's current one listed even if it was renamed meanwhile.
  const options = tag && !topics.includes(tag) ? [tag, ...topics] : topics;
  const [readTime, setReadTime] = useState(post?.readTimeSet ?? '');
  const [missing, setMissing] = useState(false);
  // Filled in after mount, so the server render (different timezone) never disagrees with the browser.
  const [publishAt, setPublishAt] = useState('');
  useEffect(() => { if (post?.publishAt) setPublishAt(toLocalInput(post.publishAt)); }, [post?.publishAt]);
  const publishIso = publishAt && !Number.isNaN(new Date(publishAt).getTime()) ? new Date(publishAt).toISOString() : '';
  const future = publishIso && new Date(publishIso) > new Date();
  const setIn = (mins) => setPublishAt(toLocalInput(new Date(Date.now() + mins * 60000).toISOString()));

  // The title lives on the Details tab; if it's empty, jump there instead of failing silently.
  const onSubmit = (e) => {
    if (title.trim()) return;
    e.preventDefault();
    setMissing(true);
    setTab('details');
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  return (
    <form ref={form} action={action} onSubmit={onSubmit} className="adm-editor adm-editor--tabs">
      {post && <input type="hidden" name="id" value={post.id} />}
      <EditorBar {...heading} item={post} error={state?.error || (missing && !title.trim() ? 'Add a title (Details tab) before saving.' : null)} />
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {alert && <p className="admin-alert admin-alert--error" role="alert">{alert}</p>}
      <EditorTabs tab={tab} onTab={setTab} words={wordCount(content)} missing={missing && !title.trim()} />

      <div className="adm-tab-pane adm-details" role="tabpanel" aria-label="Details" hidden={tab !== 'details'}>
        <div className="adm-details-main">
          <section className="adm-card adm-card--pad">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input ref={titleRef} id="title" name="title" maxLength={200} className="input adm-input-title" placeholder="A clear, specific title" value={title}
                onChange={(e) => { setTitle(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
            </div>
            <div className="field">
              <label htmlFor="excerpt">Summary <span className="admin-hint">shown on cards and in search results · {excerpt.length}/500</span></label>
              <textarea id="excerpt" name="excerpt" rows={3} maxLength={500} className="input" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>
            <div className="adm-field-row">
              <div className="field">
                <label htmlFor="slug">URL slug</label>
                <input id="slug" name="slug" className="input mono" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} />
                <span className="admin-hint">/blog/{slug || '…'}</span>
              </div>
              <div className="field">
                <label htmlFor="tag">Topic <Link href={`${ADMIN_PATH}/categories`} className="admin-hint adm-manage-link">Manage</Link></label>
                <select id="tag" name="tag" className="input" value={tag} onChange={(e) => setTag(e.target.value)}>
                  {options.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="readTime">Read time</label>
              <input id="readTime" name="readTime" className="input" placeholder="Auto-estimated from the write-up" value={readTime} onChange={(e) => setReadTime(e.target.value)} />
            </div>
          </section>

          <section className="adm-card adm-card--pad adm-side-card">
            <h3>Cover image</h3>
            {post?.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.coverUrl} alt="" className="adm-cover-preview" />
            )}
            <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="input admin-file" aria-label="Cover image" />
            <span className="admin-hint">JPG, PNG or WebP · max 4 MB</span>
            {post?.coverUrl && <label className="admin-check"><input type="checkbox" name="removeCover" /> Remove current cover</label>}
          </section>
        </div>

        <aside className="adm-details-side">
          <section className="adm-card adm-card--pad adm-side-card">
            <h3>Publishing</h3>
            <StatusBadge item={post} />
            <p className="admin-hint">{STATUS_HELP[statusOf(post).tone]}</p>
            <div className="field">
              <label htmlFor="publishAtLocal">Publish date &amp; time</label>
              <input id="publishAtLocal" type="datetime-local" className="input" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
              <input type="hidden" name="publishAt" value={publishIso} />
              <span className="admin-hint">
                {future ? 'Scheduled: after you approve, it goes live automatically at this time.'
                  : publishAt ? 'Shown as the post’s date. Past dates publish immediately.'
                  : 'Empty = goes live the moment you approve. Pick a future time to schedule it.'}
              </span>
              <div className="adm-chip-row">
                <button type="button" className="adm-chip" onClick={() => setIn(60)}>In 1 hour</button>
                <button type="button" className="adm-chip" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); setPublishAt(toLocalInput(d.toISOString())); }}>Tomorrow 9 AM</button>
                {publishAt && <button type="button" className="adm-chip" onClick={() => setPublishAt('')}>Clear</button>}
              </div>
            </div>
          </section>
          <button type="button" className="adm-btn adm-next-tab" onClick={() => setTab('write')}>Continue to Write →</button>
        </aside>
      </div>

      <div className="adm-tab-pane" role="tabpanel" aria-label="Write" hidden={tab !== 'write'}>
        <section className="adm-card adm-card--pad">
          <ContentEditor value={content} onChange={setContent} format={format} onFormat={setFormat} placeholder="Write your post in Markdown…" />
        </section>
      </div>
    </form>
  );
}
