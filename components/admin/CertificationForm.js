'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { saveCertification } from '@/app/admin/ultrapremiumhomosepian/hello/actions';
import { ADMIN_PATH } from '@/lib/adminPath';
import PageHeader from './PageHeader';
import SubmitButton from './SubmitButton';
import ImageField from './ImageField';

// One certification. Saving puts it on the site straight away; the image goes to Cloudinary.
export default function CertificationForm({ cert, title }) {
  const [state, action] = useActionState(saveCertification, null);
  // Controlled so a failed save (React resets uncontrolled fields after an action) never loses your input.
  const [f, setF] = useState({
    title: cert?.title ?? '',
    issuer: cert?.issuer ?? '',
    issued: cert?.issued ?? '',
    credentialId: cert?.credentialId ?? '',
    url: cert?.url ?? '',
    sortOrder: cert ? String(cert.sortOrder) : '0',
    orientation: cert?.orientation ?? 'portrait',
  });
  // Picking an image pre-selects the matching frame shape (you can still change it).
  const detectOrientation = (file) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => { setF((s) => ({ ...s, orientation: img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait' })); URL.revokeObjectURL(url); };
    img.src = url;
  };
  const bind = (name) => ({ id: name, name, value: f[name], onChange: (e) => setF((s) => ({ ...s, [name]: e.target.value })) });

  return (
    <form action={action} className="adm-editor">
      {cert && <input type="hidden" name="id" value={cert.id} />}
      <PageHeader eyebrow="Certifications" title={title}>
        <Link href={`${ADMIN_PATH}/certifications`} className="adm-btn adm-btn--ghost">Cancel</Link>
        <SubmitButton pendingLabel="Saving…">Save &amp; publish</SubmitButton>
      </PageHeader>
      {state?.error && <p className="admin-alert admin-alert--error adm-editor-full" role="alert">{state.error}</p>}

      <div className="adm-editor-main">
        <section className="adm-card adm-card--pad">
          <div className="field">
            <label htmlFor="title">Certification</label>
            <input required maxLength={160} className="input adm-input-title" placeholder="e.g. AWS Certified Cloud Practitioner" {...bind('title')} />
          </div>
          <div className="adm-field-row">
            <div className="field">
              <label htmlFor="issuer">Issued by</label>
              <input maxLength={120} className="input" placeholder="Amazon Web Services" {...bind('issuer')} />
            </div>
            <div className="field">
              <label htmlFor="issued">Date</label>
              <input maxLength={40} className="input" placeholder="Mar 2025" {...bind('issued')} />
            </div>
          </div>
          <div className="adm-field-row">
            <div className="field">
              <label htmlFor="url">Credential link <span className="admin-hint">optional</span></label>
              <input className="input" placeholder="https://www.credly.com/badges/…" {...bind('url')} />
            </div>
            <div className="field">
              <label htmlFor="credentialId">Credential ID <span className="admin-hint">optional</span></label>
              <input maxLength={120} className="input mono" {...bind('credentialId')} />
            </div>
          </div>
        </section>
      </div>

      <aside className="adm-editor-side">
        <section className="adm-card adm-card--pad adm-side-card">
          <h3>Certificate image</h3>
          <ImageField name="image" removeName="removeImage" current={cert?.image} label="Image" contain onFile={detectOrientation}
            hint="The certificate or badge · JPG, PNG or WebP · max 4 MB" />
        </section>

        <section className="adm-card adm-card--pad adm-side-card">
          <h3>Frame</h3>
          <div className="adm-orient" role="radiogroup" aria-label="Frame shape">
            {['portrait', 'landscape'].map((o) => (
              <label key={o} className={`adm-orient-opt${f.orientation === o ? ' is-on' : ''}`}>
                <input type="radio" name="orientation" value={o} checked={f.orientation === o} onChange={() => setF((s) => ({ ...s, orientation: o }))} />
                <span className={`adm-orient-shape adm-orient-shape--${o}`} aria-hidden="true" />
                <span>{o === 'portrait' ? 'Portrait' : 'Landscape'}</span>
              </label>
            ))}
          </div>
          <span className="admin-hint">How it hangs on the homepage wall. Set automatically when you pick an image.</span>
        </section>

        <section className="adm-card adm-card--pad adm-side-card">
          <h3>Order</h3>
          <div className="field">
            <label htmlFor="sortOrder">Position <span className="admin-hint">lower shows first · ties show newest first</span></label>
            <input type="number" className="input" {...bind('sortOrder')} />
          </div>
        </section>
      </aside>
    </form>
  );
}
