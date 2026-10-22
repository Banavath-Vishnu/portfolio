'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogoMark } from './Icons';

// Compact Netflix-style projects: category pills + one scrolling row of square cards.

const Chevron = ({ dir }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

function Art({ project, sizes }) {
  if (project.image) return <Image src={project.image} alt="" fill sizes={sizes} style={{ objectFit: 'cover' }} />;
  // No screenshot yet: generated cover art in the category's colours.
  return (
    <span className={`nf-art nf-art--${(project.key || 'AI').toLowerCase().replace(/\s+/g, '-')}`} aria-hidden="true">
      <span className="nf-art-title">{project.name}</span>
    </span>
  );
}

export default function Projects({ projects, categories = [] }) {
  const [filter, setFilter] = useState('All');
  const [fading, setFading] = useState(false);
  const [row, setRow] = useState({ page: 0, pages: 1, atStart: true, atEnd: true });
  const track = useRef(null);

  // Tabs follow the order set on the admin's Categories page; only categories that have projects get a tab.
  const used = new Set(projects.map((p) => p.key));
  const filters = ['All', ...categories.filter((k) => used.has(k)), ...[...used].filter((k) => k && !categories.includes(k))];
  const items = filter === 'All' ? projects : projects.filter((p) => p.key === filter);

  // Track which "page" of the row is showing, for the arrows and the dashes.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollLeft = 0;
    const update = () => {
      const step = el.clientWidth - 56; // one visible screen of tiles (minus the track's side padding)
      const pages = Math.max(1, Math.ceil((el.scrollWidth - 56) / step - 0.05));
      const page = Math.min(pages - 1, Math.round(el.scrollLeft / step));
      setRow({ page, pages, atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [filter, projects]);

  const slide = (dir) => track.current?.scrollBy({ left: dir * (track.current.clientWidth - 56), behavior: 'smooth' });
  const pick = (f) => {
    if (f === filter || fading) return;
    setFading(true);
    setTimeout(() => { setFilter(f); setFading(false); }, 200);
  };

  return (
    <section id="projects" className="section nf">
      <div className="row-between">
        <div className="heading">
          <span className="eyebrow">PROJECTS</span>
          <h2 className="h2">Things <strong>I’ve built</strong></h2>
        </div>
        {filters.length > 2 && (
          <div className="filters" role="group" aria-label="Filter projects">
            {filters.map((f) => (
              <button key={f} type="button" className="filter" data-track="project_filter" data-track-label={f} aria-pressed={filter === f} onClick={() => pick(f)}>{f}</button>
            ))}
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="blog-empty">Projects are on the way — check back soon.</p>
      ) : (
        <div className="nf-row">
          <div className="nf-row-viewport">
            <button type="button" className="nf-arrow nf-arrow--prev" onClick={() => slide(-1)} disabled={row.atStart} aria-label="Previous projects"><Chevron dir="left" /></button>
            <div className={`nf-track${fading ? ' is-fading' : ''}`} ref={track} key={filter}>
              {items.map((p, i) => (
                <Link key={p.slug} href={`/projects/${p.slug}`} data-track="project_open" data-track-label={p.slug} className="nf-tile" style={{ '--i': i }}>
                  <span className="nf-tile-art"><Art project={p} sizes="(max-width: 560px) 80vw, (max-width: 900px) 48vw, 33vw" /></span>
                  <span className="nf-badge nf-tile-badge" aria-hidden="true"><LogoMark /></span>
                  <span className="nf-tile-info">
                    <span className="nf-tile-cat">{p.cat}</span>
                    <span className="nf-tile-name">{p.name}</span>
                    <span className="nf-tile-desc">{p.desc}</span>
                    <span className="nf-tile-tags">{p.tags.slice(0, 3).join(' · ')}</span>
                    <span className="nf-tile-cta">View project <span aria-hidden="true">→</span></span>
                  </span>
                </Link>
              ))}
            </div>
            <button type="button" className="nf-arrow nf-arrow--next" onClick={() => slide(1)} disabled={row.atEnd} aria-label="Next projects"><Chevron dir="right" /></button>
          </div>
          {row.pages > 1 && (
            <div className="nf-dashes" aria-hidden="true">
              {Array.from({ length: row.pages }, (_, i) => <span key={i} className={i === row.page ? 'is-on' : ''} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
