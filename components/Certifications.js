'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { track } from '@/lib/track';

// Certifications from D1 (managed in the admin), hung like a 6-frame gallery wall:
//   [ 1 ]  [ 2 ]  [ 4 ]  [ 6 ]
//          [ 3 ]  [ 5 ]
// Each frame is portrait or landscape (chosen in the admin); columns are centred against each other,
// so mixed shapes give the uneven "gallery" look. Six per page, and clicking a frame opens it in a pop-up.
// Images are served from Cloudinary. Hidden while empty.

const PER_PAGE = 6;
const FADE_MS = 280;
const COLUMN_SIZES = [1, 2, 2, 1];

const meta = (c) => [c.issued, c.credentialId && `ID ${c.credentialId}`].filter(Boolean).join(' · ');

function Blank({ cert }) {
  // No image yet: a typographic "certificate" instead.
  return (
    <span className="gw-blank" aria-hidden="true">
      <span className="gw-blank-star">✦</span>
      <span className="gw-blank-title">{cert.title}</span>
      {cert.issuer && <span className="gw-blank-issuer">{cert.issuer}</span>}
    </span>
  );
}

function Frame({ cert, index, narrow, onOpen }) {
  return (
    <button type="button" className={`gw-frame gw-frame--${cert.orientation}`} style={{ '--i': index }} onClick={onOpen}
      aria-label={`View ${cert.title}${cert.issuer ? ` — ${cert.issuer}` : ''}`}>
      <span className="gw-mat">
        <span className="gw-print">
          {cert.image
            ? <Image src={cert.image} alt="" fill sizes={narrow ? '(max-width: 760px) 50vw, 200px' : '(max-width: 760px) 50vw, 280px'} style={{ objectFit: 'cover' }} />
            : <Blank cert={cert} />}
          <span className="gw-caption">
            {cert.issuer && <span className="gw-caption-issuer">{cert.issuer}</span>}
            <span className="gw-caption-title">{cert.title}</span>
            <span className="gw-caption-meta">{meta(cert)}<span className="gw-caption-cta"> Click to view</span></span>
          </span>
        </span>
      </span>
    </button>
  );
}

// Full-size view in a native <dialog> (focus trap, Esc to close). ← / → step through every certification.
function Viewer({ certs, index, onIndex, dialogRef }) {
  const cert = index == null ? null : certs[index];
  const step = (d) => onIndex((index + d + certs.length) % certs.length);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <dialog ref={dialogRef} className="cv" aria-label={cert ? cert.title : 'Certification'}
      onClose={() => onIndex(null)} onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current.close(); }}>
      {cert && (
        <div className="cv-card" key={cert.id}>
          <div className={`cv-stage cv-stage--${cert.orientation}`}>
            {cert.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={cert.image} alt={`${cert.title} certificate`} className="cv-img" />
              : <span className="cv-blank"><Blank cert={cert} /></span>}
          </div>
          <div className="cv-info">
            <div className="cv-text">
              {cert.issuer && <span className="cv-issuer mono">{cert.issuer}</span>}
              <h3 className="cv-title">{cert.title}</h3>
              {meta(cert) && <span className="cv-meta">{meta(cert)}</span>}
            </div>
            <div className="cv-actions">
              {cert.image && <a href={cert.image} target="_blank" rel="noopener noreferrer" className="pill pill--outline cv-btn">Full size ↗</a>}
              {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" className="pill pill--white cv-btn">View credential ↗</a>}
            </div>
          </div>
          {certs.length > 1 && (
            <>
              <button type="button" className="cv-nav cv-nav--prev" onClick={() => step(-1)} aria-label="Previous certification">←</button>
              <button type="button" className="cv-nav cv-nav--next" onClick={() => step(1)} aria-label="Next certification">→</button>
              <span className="cv-count mono">{index + 1} / {certs.length}</span>
            </>
          )}
          <button type="button" className="cv-close" onClick={() => dialogRef.current.close()} aria-label="Close">×</button>
        </div>
      )}
    </dialog>
  );
}

export default function Certifications({ certs }) {
  const [page, setPage] = useState(1);
  const [fading, setFading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const topRef = useRef(null);
  const dialogRef = useRef(null);
  if (!certs.length) return null;

  const pages = Math.ceil(certs.length / PER_PAGE);
  const current = Math.min(page, pages);
  const start = (current - 1) * PER_PAGE;
  const shown = certs.slice(start, start + PER_PAGE);

  // Hand out this page's certifications to the wall's columns; columns left empty on a short last page are dropped.
  let n = 0;
  const columns = COLUMN_SIZES.map((size) => shown.slice(n, (n += size))).filter((col) => col.length);

  const go = (p) => {
    if (p === current || fading) return;
    setFading(true);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { setPage(p); setFading(false); }, FADE_MS);
  };
  const open = (i) => { setViewing(i); dialogRef.current?.showModal(); track('cert_view', { label: certs[i]?.title }); };
  // Stepping through the pop-up also turns the wall to that certification's page.
  const showInViewer = (i) => { setViewing(i); if (i != null) setPage(Math.floor(i / PER_PAGE) + 1); };

  let slot = 0;
  return (
    <section id="certifications" className="section" ref={topRef}>
      <div className="row-between">
        <div className="heading">
          <span className="eyebrow">CERTIFICATIONS</span>
          <h2 className="h2">Certified <strong>and learning</strong></h2>
        </div>
        {pages > 1 && <span className="gw-count mono">{String(current).padStart(2, '0')} / {String(pages).padStart(2, '0')}</span>}
      </div>

      <div className="gw-wrap">
        <div className={`gw${fading ? ' is-fading' : ''}`} key={current}>
          {columns.map((col, c) => (
            <div key={c} className={`gw-col${c === 2 ? ' gw-col--narrow' : ''}`}>
              {col.map((cert) => {
                const i = start + slot++;
                return <Frame key={cert.id} cert={cert} index={i - start} narrow={c === 2} onOpen={() => open(i)} />;
              })}
            </div>
          ))}
        </div>

        {pages > 1 && (
          <nav className="pager" aria-label="Certification pages">
            <button type="button" className="pager-btn pager-step" onClick={() => go(current - 1)} disabled={current === 1}>← Prev</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" className="pager-btn" aria-current={p === current ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => go(p)}>
                {p}
              </button>
            ))}
            <button type="button" className="pager-btn pager-step" onClick={() => go(current + 1)} disabled={current === pages}>Next →</button>
          </nav>
        )}
      </div>

      <Viewer certs={certs} index={viewing} onIndex={showInViewer} dialogRef={dialogRef} />
    </section>
  );
}
