import Image from 'next/image';
import Link from 'next/link';
import Prose from './Prose';
import ShareBar from './ShareBar';
import { renderContent } from '@/lib/markdown';
import { DEFAULT_COVER } from '@/lib/content';

// The project page body. Shared by the live page and the admin preview so they can't drift apart.
export default function ProjectArticle({ project, more = [], children }) {
  const html = renderContent(project.content, project.format);
  const external = project.href && /^https?:\/\//.test(project.href);

  return (
    <>
      <article className="section project-page">
        <Link href="/#projects" className="project-back">← All projects</Link>

        <header className="project-hero fu">
          <span className="project-cat mono">{project.cat}</span>
          <h1 className="h2">{project.name}</h1>
          {project.desc && <p className="project-lead">{project.desc}</p>}
          <div className="project-hero-meta">
            <div className="chips">{project.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
            {external && (
              <a href={project.href} target="_blank" rel="noopener noreferrer" className="pill pill--outline project-ext">{project.linkLabel}</a>
            )}
            <ShareBar title={project.name} path={`/projects/${project.slug}`} compact />
          </div>
        </header>

        <div className="project-cover fu d1">
          <Image src={project.image || DEFAULT_COVER} alt={project.image ? `${project.name} screenshot` : ''} fill priority sizes="(max-width: 1280px) 100vw, 1224px" style={{ objectFit: 'cover' }} />
        </div>

        <div className="project-content">
          {html ? (
            <Prose html={html} />
          ) : (
            <p className="post-excerpt" style={{ color: 'var(--muted)' }}>A full write-up for this project is coming soon.</p>
          )}
          <div className="rule" />
          <ShareBar title={project.name} path={`/projects/${project.slug}`} label="Like this project? Share it" />
          {/* Comments (live page only; the admin preview passes none) */}
          {children}
        </div>
      </article>

      {more.length > 0 && (
        <section className="section project-more">
          <div className="row-between">
            <h2 className="approach-heading">More <strong>projects</strong></h2>
            <Link href="/#projects" className="pill pill--outline" style={{ minHeight: 46, padding: '0 22px', fontSize: 14 }}>All projects ↗</Link>
          </div>
          <div className="projects-grid">
            {more.map((p) => (
              <article key={p.slug} className="card lift project">
                <div className="project-body">
                  <span className="project-cat mono">{p.cat}</span>
                  <h3><Link href={`/projects/${p.slug}`} className="project-stretch">{p.name}</Link></h3>
                  <p>{p.desc}</p>
                  <span className="project-link" aria-hidden="true">View project <span className="project-arrow">→</span></span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
