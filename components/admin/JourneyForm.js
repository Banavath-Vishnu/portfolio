'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { saveJourney } from '@/app/admin/ultrapremiumhomosepian/hello/actions';
import { ADMIN_PATH } from '@/lib/adminPath';
import PageHeader from './PageHeader';
import SubmitButton from './SubmitButton';
import ImageField from './ImageField';

// One timeline entry. Saving puts it on the site straight away.
export default function JourneyForm({ entry, title }) {
  const [state, action] = useActionState(saveJourney, null);
  // Controlled so a failed save (React resets uncontrolled fields after an action) never loses your input.
  const [f, setF] = useState({
    title: entry?.title ?? '',
    org: entry?.org ?? '',
    type: entry?.type ?? '',
    location: entry?.loc ?? '',
    dates: entry?.dates ?? '',
    duration: entry?.dur ?? '',
    since: entry?.since ?? '',
    description: entry?.desc ?? '',
    sortOrder: entry ? String(entry.sortOrder) : '',
  });
  const [live, setLive] = useState(entry?.live ?? false);
  const bind = (name) => ({ id: name, name, value: f[name], onChange: (e) => setF((s) => ({ ...s, [name]: e.target.value })) });

  return (
    <form action={action} className="adm-editor">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <PageHeader eyebrow="Journey" title={title}>
        <Link href={`${ADMIN_PATH}/journey`} className="adm-btn adm-btn--ghost">Cancel</Link>
        <SubmitButton pendingLabel="Saving…">Save &amp; publish</SubmitButton>
      </PageHeader>
      {state?.error && <p className="admin-alert admin-alert--error adm-editor-full" role="alert">{state.error}</p>}

      <div className="adm-editor-main">
        <section className="adm-card adm-card--pad">
          <div className="field">
            <label htmlFor="title">Role / title</label>
            <input required maxLength={160} className="input adm-input-title" placeholder="e.g. Software Engineer Intern" {...bind('title')} />
          </div>
          <div className="adm-field-row">
            <div className="field">
              <label htmlFor="org">Organisation</label>
              <input maxLength={120} className="input" placeholder="Company, college or “Self-employed”" {...bind('org')} />
            </div>
            <div className="field">
              <label htmlFor="type">Type</label>
              <input maxLength={60} className="input" placeholder="Full Time, Internship, Education…" {...bind('type')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="location">Location <span className="admin-hint">optional</span></label>
            <input maxLength={120} className="input" placeholder="Hyderabad, India · On-site" {...bind('location')} />
          </div>
          <div className="field">
            <label htmlFor="description">What you did <span className="admin-hint">{f.description.length}/2000</span></label>
            <textarea rows={6} maxLength={2000} className="input" {...bind('description')} />
          </div>
        </section>
      </div>

      <aside className="adm-editor-side">
        <section className="adm-card adm-card--pad adm-side-card">
          <h3>Dates</h3>
          <div className="field">
            <label htmlFor="dates">Dates shown</label>
            <input maxLength={60} className="input" placeholder="May – Jul 2025" {...bind('dates')} />
          </div>
          <label className="admin-check"><input type="checkbox" name="live" checked={live} onChange={(e) => setLive(e.target.checked)} /> I’m here now (pulsing dot)</label>
          <div className="field">
            <label htmlFor="since">Started <span className="admin-hint">optional · counts the months up automatically</span></label>
            <input type="month" className="input" {...bind('since')} />
          </div>
          <div className="field">
            <label htmlFor="duration">Highlight <span className="admin-hint">{f.since ? 'not used while “Started” is set' : 'e.g. 3 months, B.Tech, 25+ projects'}</span></label>
            <input maxLength={40} className="input" readOnly={Boolean(f.since)} {...bind('duration')} />
          </div>
        </section>

        <section className="adm-card adm-card--pad adm-side-card">
          <h3>Order</h3>
          <div className="field">
            <label htmlFor="sortOrder">Position <span className="admin-hint">lower shows first · blank = last</span></label>
            <input type="number" className="input" {...bind('sortOrder')} />
          </div>
        </section>

        <section className="adm-card adm-card--pad adm-side-card">
          <h3>Logo</h3>
          <ImageField name="logo" removeName="removeLogo" current={entry?.logo} label="Logo" contain hint="Optional · square works best · max 4 MB" />
        </section>
      </aside>
    </form>
  );
}
