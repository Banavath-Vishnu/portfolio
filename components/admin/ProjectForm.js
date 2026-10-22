'use client';

import { useActionState, useRef, useState } from 'react';
import { saveProject } from '@/app/admin/ultrapremiumhomosepian/hello/actions';
import Link from 'next/link';
import { slugify } from '@/data/site';
import { ADMIN_PATH } from '@/lib/adminPath';
import ContentEditor from './ContentEditor';
import EditorTabs, { useEditorTab, useSaveShortcut, wordCount } from './EditorTabs';
import EditorBar, { StatusBadge, statusOf } from './EditorFooter';

const STATUS_HELP = {
  draft: 'Not on the site yet. Save & preview, then approve to publish.',
  pending: 'Your saved changes are waiting for approval. The site still shows the live version.',
  live: 'Visitors see this version. Edits become a draft until you publish them.',
};

// Project editor: a Details tab (name, description, tags, slug, category, filter, order, link, screenshot)
// and a Write tab (the Markdown/HTML write-up with preview). Both are one form, so saving sends everything.
export default function ProjectForm({ project, heading, notice, alert, filters = [] }) {
  const [state, action] = useActionState(saveProject, null);
  const [tab, setTab] = useEditorTab(!project);
  const form = useRef(null);
  const nameRef = useRef(null);
  useSaveShortcut(form);
  // Controlled so a failed save (React resets uncontrolled fields after an action) never loses your input.
  const [f, setF] = useState({
    name: project?.name ?? '',
    slug: project?.slug ?? '',
    content: project?.content ?? '',
    format: project?.format ?? 'markdown',
    category: project?.cat ?? '',
    filterKey: project?.key ?? filters[0] ?? '',
    tags: project?.tags?.join(', ') ?? '',
    description: project?.desc ?? '',
    href: project?.href && project.href !== '#' ? project.href : '',
    linkLabel: project?.linkLabel ?? 'Read more ↗',
    sortOrder: project?.sortOrder ?? 0,
  });
  const [slugEdited, setSlugEdited] = useState(Boolean(project));
  const [missing, setMissing] = useState(false);
  // Filter tabs come from the Categories page; keep the project's current one listed even if it was renamed meanwhile.
  const options = f.filterKey && !filters.includes(f.filterKey) ? [f.filterKey, ...filters] : filters;
  const bind = (name) => ({ name, value: f[name], onChange: (e) => setF((s) => ({ ...s, [name]: e.target.value })) });

  // The name lives on the Details tab; if it's empty, jump there instead of failing silently.
  const onSubmit = (e) => {
    if (f.name.trim()) return;
    e.preventDefault();
    setMissing(true);
    setTab('details');
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  return (
    <form ref={form} action={action} onSubmit={onSubmit} className="adm-editor adm-editor--tabs">
      {project && <input type="hidden" name="id" value={project.id} />}
      <EditorBar {...heading} item={project} error={state?.error || (missing && !f.name.trim() ? 'Add a project name (Details tab) before saving.' : null)} />
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {alert && <p className="admin-alert admin-alert--error" role="alert">{alert}</p>}
      <EditorTabs tab={tab} onTab={setTab} words={wordCount(f.content)} missing={missing && !f.name.trim()} />

      <div className="adm-tab-pane adm-details" role="tabpanel" aria-label="Details" hidden={tab !== 'details'}>
        <div className="adm-details-main">
          <section className="adm-card adm-card--pad">
            <div className="field">
              <label htmlFor="name">Project name</label>
              <input ref={nameRef} id="name" name="name" maxLength={120} className="input adm-input-title" placeholder="e.g. NerveNet" value={f.name}
                onChange={(e) => { const name = e.target.value; setF((s) => ({ ...s, name, slug: slugEdited ? s.slug : slugify(name) })); }} />
            </div>
            <div className="field">
              <label htmlFor="description">Short description <span className="admin-hint">shown on the project card · {f.description.length}/600</span></label>
              <textarea id="description" rows={3} maxLength={600} className="input" {...bind('description')} />
            </div>
            <div className="field">
              <label htmlFor="tags">Tech tags <span className="admin-hint">comma-separated</span></label>
              <input id="tags" className="input" placeholder="Django, Next.js, Claude + MCP" {...bind('tags')} />
            </div>
            <div className="adm-field-row">
              <div className="field">
                <label htmlFor="slug">URL slug</label>
                <input id="slug" name="slug" className="input mono" value={f.slug} onChange={(e) => { setSlugEdited(true); setF((s) => ({ ...s, slug: e.target.value })); }} />
                <span className="admin-hint">/projects/{f.slug || '…'}</span>
              </div>
              <div className="field">
                <label htmlFor="category">Category label</label>
                <input id="category" maxLength={60} className="input" placeholder="AI PLATFORM" {...bind('category')} />
              </div>
            </div>
            <div className="adm-field-row">
              <div className="field">
                <label htmlFor="filterKey">Filter tab <Link href={`${ADMIN_PATH}/categories`} className="admin-hint adm-manage-link">Manage</Link></label>
                <select id="filterKey" className="input" {...bind('filterKey')}>
                  {options.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sortOrder">Order <span className="admin-hint">lower shows first</span></label>
                <input id="sortOrder" type="number" className="input" {...bind('sortOrder')} />
              </div>
            </div>
          </section>

          <section className="adm-card adm-card--pad adm-side-card">
            <h3>External link</h3>
            <div className="adm-field-row">
              <div className="field">
                <label htmlFor="href">URL</label>
                <input id="href" className="input" placeholder="https://github.com/…" {...bind('href')} />
              </div>
              <div className="field">
                <label htmlFor="linkLabel">Button text</label>
                <input id="linkLabel" maxLength={40} className="input" {...bind('linkLabel')} />
              </div>
            </div>
          </section>
        </div>

        <aside className="adm-details-side">
          <section className="adm-card adm-card--pad adm-side-card">
            <h3>Publishing</h3>
            <StatusBadge item={project} />
            <p className="admin-hint">{STATUS_HELP[statusOf(project).tone]}</p>
          </section>
          <section className="adm-card adm-card--pad adm-side-card">
            <h3>Screenshot</h3>
            {project?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.image} alt="" className="adm-cover-preview" />
            )}
            <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="input admin-file" aria-label="Screenshot" />
            <span className="admin-hint">JPG, PNG or WebP · max 4 MB</span>
            {project?.image && <label className="admin-check"><input type="checkbox" name="removeImage" /> Remove current screenshot</label>}
          </section>
          <button type="button" className="adm-btn adm-next-tab" onClick={() => setTab('write')}>Continue to Write →</button>
        </aside>
      </div>

      <div className="adm-tab-pane" role="tabpanel" aria-label="Write" hidden={tab !== 'write'}>
        <section className="adm-card adm-card--pad">
          <div className="adm-section-label">
            <h3>Full write-up</h3>
            <span className="admin-hint">Shown on the project page: overview, what you built, your role, results.</span>
          </div>
          <ContentEditor value={f.content} onChange={(content) => setF((s) => ({ ...s, content }))}
            format={f.format} onFormat={(format) => setF((s) => ({ ...s, format }))}
            placeholder={`## Overview\n\nWhat the project is and who it is for…\n\n## What I built\n\n- …`} />
        </section>
      </div>
    </form>
  );
}
