import Image from 'next/image';
import { site, heroWords, award } from '@/data/site';
import { ArrowIcon, Laurel } from './Icons';
import WordRotator from './WordRotator';

function Silhouette() {
  const d = 'M200 20c-74 0-124 56-124 132 0 56 24 104 62 130-84 22-150 82-138 178v60h400v-60c12-96-54-156-138-178 38-26 62-74 62-130 0-76-50-132-124-132z';
  return (
    <svg viewBox="0 0 400 520" aria-hidden="true">
      <path d={d} fill="#03050a" />
      <path d={d} fill="none" stroke="rgba(140,185,255,0.75)" strokeWidth="2.5" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="hero" aria-label="Introduction">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-line" style={{ left: '-10%', top: '6%', background: 'rgba(200,215,255,0.16)' }} aria-hidden="true" />
      <div className="hero-line" style={{ left: '-10%', top: '30%' }} aria-hidden="true" />
      <div className="hero-line" style={{ left: '20%', top: 0, background: 'rgba(200,215,255,0.08)' }} aria-hidden="true" />

      <div className="hero-portrait">
        {site.heroPortrait ? (
          <Image src={site.heroPortrait} alt={site.name} width={750} height={870} sizes="(max-width: 900px) 80vw, 38vw" priority />
        ) : (
          <>
            <Silhouette />
            <span className="hero-portrait-note mono">[your portrait — dark bg, blue rim light]</span>
          </>
        )}
      </div>

      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-l1 fu">
            Hi, I’m Vishnu.
            <svg className="hero-ring" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="17" fill="none" stroke="#a8aeb9" strokeWidth="10" strokeDasharray="7.5 3.2" />
            </svg>
          </span>
          <span className="hero-l2 fu d1">
            I build
            <WordRotator words={heroWords} />
            <span className="sr-only">{heroWords.join(', ').replace(/\./g, '')}.</span>
          </span>
        </h1>

        <div className="hero-right">
          <p className="hero-copy fu d2">
            Full stack engineer turning company data into<br />
            <strong>secure, clear answers — powered by AI.</strong>
          </p>
          <div className="hero-ctas fu d3">
            <a href="/#projects" className="pill pill--white cta-main">
              View my work
              <span className="arrow"><ArrowIcon /></span>
            </a>
            <a href="/blog" className="pill pill--outline cta-alt">Read the blog</a>
          </div>
          <p className="hero-tagline fu d4">AI backend engineer at Bharat Smart Services.</p>
        </div>
      </div>

      <div className="award fu d5">
        <span className="award-year">{award.year}</span>
        <div className="award-row">
          <Laurel />
          <span className="award-title">
            {award.title.map((t, i) => <span key={t}>{t}{i < award.title.length - 1 && <br />}</span>)}
          </span>
          <Laurel flip />
        </div>
        <span className="award-sub">{award.line1}<br /><strong>{award.line2}</strong></span>
      </div>
    </section>
  );
}
