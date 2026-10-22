'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/track';

// Share buttons for a post or project: copy link, the phone's share sheet (when the browser has one),
// LinkedIn, X, WhatsApp and email. `compact` shows icons only (for the page header).

const ICONS = {
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  check: <path d="m5 12 5 5 9-10" />,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />,
  mail: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
};
const Stroke = ({ name }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
);
const Brand = ({ d }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>;
const LINKEDIN = 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.2 21 14.5V21h-4v-5.8c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.52-2.25 3.1V21H9z';
const X = 'M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78zm-1.08 16.2h1.7L7.4 4.73H5.58z';
const WHATSAPP = 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .78.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.17-.29.19-.54.06a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48a.92.92 0 0 0-.66.31 2.8 2.8 0 0 0-.87 2.08 4.86 4.86 0 0 0 1.02 2.58 11.1 11.1 0 0 0 4.25 3.75c1.58.68 2.2.74 3 .62.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.29z';

export default function ShareBar({ title, path, compact = false, label = 'Share' }) {
  // The full URL is only known in the browser (works on any domain the site is served from).
  const [url, setUrl] = useState(path);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setUrl(new URL(path, window.location.origin).href);
    setCanShare(typeof navigator.share === 'function');
  }, [path]);

  const enc = encodeURIComponent;
  const links = [
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, icon: <Brand d={LINKEDIN} /> },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, icon: <Brand d={X} /> },
    { name: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${url}`)}`, icon: <Brand d={WHATSAPP} /> },
    { name: 'Email', href: `mailto:?subject=${enc(title)}&body=${enc(`${title}\n\n${url}`)}`, icon: <Stroke name="mail" />, self: true },
  ];

  // GA4's recommended "share" event: which network, and what was shared.
  const shared = (method) => track('share', { method, content_type: path.startsWith('/blog') ? 'post' : 'project', item_id: path });

  async function copy() {
    shared('copy_link');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers / insecure origins: fall back to a temporary text field.
      const ta = Object.assign(document.createElement('textarea'), { value: url });
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={`share${compact ? ' share--compact' : ''}`} role="group" aria-label={`Share “${title}”`}>
      {!compact && <span className="share-label">{label}</span>}
      <button type="button" className={`share-btn${copied ? ' is-done' : ''}`} onClick={copy} aria-label={copied ? 'Link copied' : 'Copy link'} title="Copy link">
        <Stroke name={copied ? 'check' : 'link'} />{!compact && <span>{copied ? 'Copied!' : 'Copy link'}</span>}
      </button>
      {links.map((l) => (
        <a key={l.name} href={l.href} className="share-btn share-btn--icon" aria-label={`Share on ${l.name}`} title={`Share on ${l.name}`}
          onClick={() => shared(l.name.toLowerCase())} {...(!l.self && { target: '_blank', rel: 'noopener noreferrer' })}>{l.icon}</a>
      ))}
      {canShare && (
        <button type="button" className="share-btn share-btn--icon" aria-label="More sharing options" title="More…"
          onClick={() => { shared('native'); navigator.share({ title, url }).catch(() => {}); }}><Stroke name="share" /></button>
      )}
      <span className="sr-only" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</span>
    </div>
  );
}
