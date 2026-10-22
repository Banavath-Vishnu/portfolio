import Image from 'next/image';
import Link from 'next/link';
import { site, formatViews } from '@/data/site';

// Featured post on the left, a stacked list on the right. Shared by the homepage section and /blog.
export default function BlogLayout({ featured, side }) {
  return (
    <div className="blog-layout">
      <article className="post post-featured">
        <Link href={`/blog/${featured.slug}`} className="post-img" aria-hidden="true" tabIndex={-1}>
          <div className="placeholder" style={{ aspectRatio: '16 / 10' }}><Image src={featured.cover} alt="" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: 'cover' }} /></div>
        </Link>
        <div className="rule-thick" />
        <h3 className="post-title post-title--lg"><Link className="ul" href={`/blog/${featured.slug}`}>{featured.title}</Link></h3>
        <p className="post-excerpt">{featured.excerpt}</p>
        <div className="rule" />
        <div className="post-meta">
          <span className="tag-pill">{featured.tag.toUpperCase()}</span>
          <span>By {site.name}</span><span aria-hidden="true">•</span>
          <span>{featured.date}</span><span aria-hidden="true">•</span>
          <span>{featured.readTime}</span><span aria-hidden="true">•</span>
          <span>{formatViews(featured.views)}</span>
        </div>
      </article>

      <div className="post-side-list">
        {side.map((p) => (
          <article key={p.slug} className="post post-side">
            <Link href={`/blog/${p.slug}`} className="post-img" aria-hidden="true" tabIndex={-1}>
              <div className="placeholder" style={{ aspectRatio: '16 / 10' }}><Image src={p.cover} alt="" fill sizes="(max-width: 900px) 100vw, 20vw" style={{ objectFit: 'cover' }} /></div>
            </Link>
            <div className="post-side-body">
              <span className="post-by">By {site.name}</span>
              <h3 className="post-title post-title--sm"><Link className="ul" href={`/blog/${p.slug}`}>{p.title}</Link></h3>
              <div className="rule" style={{ marginTop: 8 }} />
              <div className="post-meta" style={{ fontSize: 14, gap: 10 }}>
                <span className="tag-pill" style={{ fontSize: 11, padding: '5px 11px' }}>{p.tag.toUpperCase()}</span>
                <span>{p.date}</span><span aria-hidden="true">•</span><span>{formatViews(p.views)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
