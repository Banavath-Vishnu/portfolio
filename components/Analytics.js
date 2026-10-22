'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';
import { track } from '@/lib/track';

// Visitor analytics: Google Analytics 4 (NEXT_PUBLIC_GA_ID) and Microsoft Clarity (NEXT_PUBLIC_CLARITY_ID).
// Each loads only when its ID is set, and never on admin pages (your own editing would skew the numbers).
// Also reports:
//  - clicks on anything marked data-track="event" (+ data-track-label) — see lib/track.js
//  - section_view: which homepage sections a visitor actually scrolls to (once each per visit)
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const SECTIONS = ['about', 'skills', 'projects', 'blog', 'experience', 'certifications', 'contact'];

export default function Analytics() {
  const pathname = usePathname();
  const admin = pathname?.startsWith('/admin');
  const enabled = !admin && (GA_ID || CLARITY_ID);

  // One listener for every data-track element on the page.
  useEffect(() => {
    if (!enabled) return;
    const onClick = (e) => {
      const el = e.target.closest?.('[data-track]');
      if (!el) return;
      const params = { label: el.dataset.trackLabel || el.textContent?.trim().slice(0, 60) || undefined };
      if (el.dataset.trackLocation) params.location = el.dataset.trackLocation;
      track(el.dataset.track, params);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [enabled]);

  // Homepage scroll depth by section: fires when at least 40% of a section is on screen.
  useEffect(() => {
    if (!enabled || pathname !== '/' || typeof IntersectionObserver === 'undefined') return;
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.id;
        if (entry.isIntersecting && !seen.has(id)) {
          seen.add(id);
          track('section_view', { section: id });
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.4 });
    SECTIONS.map((id) => document.getElementById(id)).filter(Boolean).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled, pathname]);

  if (admin) return null;
  return (
    <>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      {CLARITY_ID && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_ID)});`}
        </Script>
      )}
    </>
  );
}
