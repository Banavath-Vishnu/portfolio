'use client';

import Link from 'next/link';
import SubmitButton from './SubmitButton';

export function statusOf(item) {
  if (!item) return { tone: 'draft', label: 'New draft' };
  if (item.live && item.scheduled) return item.hasDraft ? { tone: 'pending', label: 'Scheduled · changes pending' } : { tone: 'scheduled', label: 'Scheduled' };
  if (item.live) return item.hasDraft ? { tone: 'pending', label: 'Live · changes pending' } : { tone: 'live', label: 'Live' };
  return { tone: 'draft', label: item.everPublished ? 'Unpublished' : 'Draft' };
}

export function StatusBadge({ item }) {
  const s = statusOf(item);
  return <span className={`admin-badge is-${s.tone}`}><span className="admin-badge-dot" aria-hidden="true" />{s.label}</span>;
}

// Sticky header for the editors (title on the left, save actions on the right, like YouTube Studio).
// Lives inside the <form> so the submit buttons can show their pending state.
// Saving never publishes: "Save draft" keeps editing, "Save & preview" opens the page preview to approve.
export default function EditorBar({ eyebrow, title, item, previewHref, error }) {
  return (
    <div className="adm-editbar">
      <div className="adm-page-title">
        <span className="adm-eyebrow">{eyebrow}</span>
        <div className="adm-title-row"><h1 className="admin-title">{title}</h1><StatusBadge item={item} /></div>
      </div>
      <div className="adm-editbar-actions">
        {previewHref && <Link href={previewHref} className="adm-btn adm-btn--ghost">Preview page</Link>}
        <SubmitButton name="intent" value="draft" pendingLabel="Saving…" className="adm-btn">Save draft</SubmitButton>
        <SubmitButton name="intent" value="preview" pendingLabel="Opening preview…" className="adm-btn adm-btn--primary">Save &amp; preview →</SubmitButton>
      </div>
      {error && <p className="admin-error adm-editbar-error" role="alert">{error}</p>}
    </div>
  );
}
