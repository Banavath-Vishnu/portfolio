import Image from 'next/image';
import { site, about, approach, education, review } from '@/data/site';

export default function About() {
  return (
    <section id="about" className="section about">
      <div className="about-text">
        <span className="eyebrow">ABOUT</span>
        <h2 className="h2">Curious by nature.<br /><strong>Builder by habit.</strong></h2>
        {about.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
      </div>
      <div className="about-grid">
        <div className="card lift placeholder about-photo">
          {site.portrait ? <Image src={site.portrait} alt={site.name} fill sizes="(max-width: 900px) 50vw, 25vw" style={{ objectFit: 'cover', objectPosition: 'center 28%' }} /> : <span>[Your photo]</span>}
        </div>
        <div className="card lift fact"><div className="fact-label">Based in</div><div className="fact-value">{site.location}</div></div>
        <div className="card lift fact fact--value">
          <div className="fact-label">Trusted by</div>
          <div className="fact-value fact-value--big">23 clients</div>
          <div className="fact-note">2+ years delivering software end to end, from requirements to deployment</div>
        </div>
        <figure className="card lift review">
          <div className="review-head"><span className="review-stars" aria-hidden="true">★★★★★</span><span>{review.rating}</span><span className="review-from">{review.from}</span></div>
          <blockquote>“{review.quote}”</blockquote>
        </figure>
      </div>
      <div className="approach">
        <h3 className="approach-heading">My <strong>Approach</strong></h3>
        <div className="approach-grid">
          {approach.map((a) => (
            <div key={a.num} className="card lift approach-card">
              <span className="skill-num mono">{a.num}</span>
              <p>{a.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="approach">
        <h3 className="approach-heading">My <strong>Education</strong></h3>
        <div className="approach-grid">
          {education.map((e) => (
            <div key={e.degree} className="card lift approach-card edu-card">
              {e.logo && <span className="edu-logo"><Image src={e.logo} alt={`${e.school} logo`} width={56} height={56} /></span>}
              <div className="edu-body">
                <span className="edu-years mono">{e.years}</span>
                <h4>{e.degree}</h4>
                <p>{e.school}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
