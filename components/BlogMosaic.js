'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatViews } from '@/data/site';

const PER_PAGE = 10;
const FADE_MS = 220;

// Tile size follows views relative to the most-read post, so popular posts take more room.
function sizeFor(views, max) {
  const r = views / max;
  if (r >= 0.8) return 'xl';
  if (r >= 0.4) return 'wide';
  if (r >= 0.28) return 'tall';
  return 'sm';
}

const CELLS = { xl: 4, wide: 2, tall: 2, sm: 1 };

// Promote the most-viewed small tiles to wide until the tiles fill whole 4-column rows, so the grid never ends with a hole.
function layout(list, max) {
  const sizes = list.map((p) => sizeFor(p.views, max));
  let cells = sizes.reduce((n, s) => n + CELLS[s], 0);
  for (let i = 0; i < sizes.length && cells % 4 !== 0; i++) {
    if (sizes[i] === 'sm') { sizes[i] = 'wide'; cells += 1; }
  }
  return sizes;
}

export default function BlogMosaic({ posts, topics = [] }) {
  const [tag, setTag] = useState('All');
  const [page, setPage] = useState(1);
  const [fading, setFading] = useState(false);
  const [bar, setBar] = useState(null); // sliding tab underline: { left, top, width }
  const topRef = useRef(null);
  const gridRef = useRef(null);
  const tabsRef = useRef(null);
  const prevHeight = useRef(null);

  // Topic tabs follow the admin's Categories order; only topics that have posts get a tab.
  const used = new Set(posts.map((p) => p.tag));
  const tabs = ['All', ...topics.filter((t) => used.has(t)), ...[...used].filter((t) => t && !topics.includes(t))];
  const max = Math.max(...posts.map((p) => p.views));
  const byViews = [...posts].sort((a, b) => b.views - a.views);
  const filtered = tag === 'All' ? byViews : byViews.filter((p) => p.tag === tag);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const sizes = layout(shown, max);
  const view = `${tag}-${current}`;

  // Fade the current tiles out, then swap in the new set (which animates in via CSS).
  function change(update, scroll) {
    if (fading) return;
    prevHeight.current = gridRef.current?.offsetHeight ?? null;
    setFading(true);
    if (scroll) topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { update(); setFading(false); }, FADE_MS);
  }

  // Animate the grid's height between views instead of letting the page jump.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const from = prevHeight.current;
    prevHeight.current = null;
    if (!grid || from == null) return;
    const to = grid.offsetHeight;
    if (from === to) return;
    grid.style.height = `${from}px`;
    grid.style.overflow = 'hidden';
    grid.getBoundingClientRect(); // commit the start height before transitioning
    grid.style.height = `${to}px`;
    const done = () => { grid.style.height = ''; grid.style.overflow = ''; };
    const t = setTimeout(done, 500);
    return () => { clearTimeout(t); done(); };
  }, [view]);

  // Keep the underline under the active tab, including after resizes.
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabsRef.current?.querySelector('[aria-pressed="true"]');
      if (el) setBar({ left: el.offsetLeft, top: el.offsetTop + el.offsetHeight - 2, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tag]);

  return (
    <div className="mosaic-wrap fu d2" ref={topRef}>
      <div className="mosaic-tabs" role="group" aria-label="Filter posts by topic" ref={tabsRef}>
        {tabs.map((t) => (
          <button key={t} type="button" className="mosaic-tab" data-track="blog_filter" data-track-label={t} aria-pressed={tag === t} onClick={() => t !== tag && change(() => { setTag(t); setPage(1); })}>
            {t}
          </button>
        ))}
        {bar && <span className="mosaic-tab-bar" style={{ transform: `translate(${bar.left}px, ${bar.top}px)`, width: bar.width }} aria-hidden="true" />}
      </div>

      <div className={`mosaic${fading ? ' is-fading' : ''}`} ref={gridRef} key={view}>
        {shown.map((p, i) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} data-track="post_open" data-track-label={p.slug} className={`tile tile--${sizes[i]}`} style={{ '--i': i }}>
            <Image src={p.cover} alt="" fill sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw" style={{ objectFit: 'cover' }} />
            <span className="tile-shade" aria-hidden="true" />
            <span className="tile-text">
              <span className="tile-tag">{p.tag}</span>
              <span className="tile-title">{p.title}</span>
              <span className="tile-meta">{p.date} · {formatViews(p.views)}</span>
            </span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && <p className="mosaic-empty">No posts in this topic yet.</p>}

      {pages > 1 && (
        <nav className="pager" aria-label="Blog pages">
          <button type="button" className="pager-btn pager-step" onClick={() => change(() => setPage(current - 1), true)} disabled={current === 1}>← Prev</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className="pager-btn" aria-current={n === current ? 'page' : undefined} aria-label={`Page ${n}`} onClick={() => n !== current && change(() => setPage(n), true)}>
              {n}
            </button>
          ))}
          <button type="button" className="pager-btn pager-step" onClick={() => change(() => setPage(current + 1), true)} disabled={current === pages}>Next →</button>
        </nav>
      )}
    </div>
  );
}
