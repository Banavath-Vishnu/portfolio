'use client';

import { useEffect, useState } from 'react';

function monthsSince(iso) {
  const start = new Date(iso);
  const now = new Date();
  return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1);
}

// Timeline entries come from D1 (managed under Journey in the admin).
export default function Journey({ entries }) {
  // Computed on the client so the "live" duration is always current, even on a statically built page.
  const [now, setNow] = useState(null);
  useEffect(() => setNow(Date.now()), []);
  if (!entries.length) return null;

  return (
    <section id="experience" className="section journey">
      <div className="journey-intro">
        <span className="eyebrow">JOURNEY</span>
        <h2 className="h2">How I got <strong>here</strong></h2>
        <p>From chemical engineering at IIT Hyderabad to building secure AI systems — one shipped project at a time.</p>
      </div>

      <div className="tl">
        <div className="tl-track" aria-hidden="true" />
        <div className="tl-fill" aria-hidden="true" />
        <ol>
          {entries.map((e) => {
            const dur = e.since ? (now ? `${monthsSince(e.since)} months` : '…') : e.dur;
            const org = [e.org, e.type].filter(Boolean);
            return (
              <li key={e.id} className="tl-item">
                <span className={`tl-dot${e.live ? ' live' : ''}`} aria-hidden="true" />
                <div className="tl-dates">{e.dates}{dur && <> <span className="sep">~</span> <span className="tl-hl">{dur}</span></>}</div>
                <h3>{e.title}</h3>
                {org.length > 0 && (
                  <div className="tl-org">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {e.logo && <img src={e.logo} alt="" className="tl-logo" width={28} height={28} />}
                    <span>{org[0]}{org[1] && <> <span className="sep">~</span> {org[1]}</>}</span>
                  </div>
                )}
                {e.loc && <div className="tl-loc">{e.loc}</div>}
                {e.desc && <p className="tl-desc">{e.desc}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
