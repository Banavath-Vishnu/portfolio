import Image from 'next/image';
import Link from 'next/link';
import Prose from './Prose';
import ShareBar from './ShareBar';
import { site, formatViews } from '@/data/site';
import { renderContent } from '@/lib/markdown';

// The blog post page body. Shared by the live page and the admin preview so they can't drift apart.
export default function PostArticle({ post }) {
  const html = renderContent(post.content, post.format);
  return (
    <article className="section" style={{ gap: 24 }}>
      <Link href="/blog">← All posts</Link>
      <span className="tag-pill" style={{ alignSelf: 'flex-start' }}>{post.tag.toUpperCase()}</span>
      <h1 className="post-title post-title--lg">{post.title}</h1>
      <div className="post-meta"><span>By {site.name}</span><span aria-hidden="true">•</span><span>{post.date}</span><span aria-hidden="true">•</span><span>{post.readTime}</span><span aria-hidden="true">•</span><span>{formatViews(post.views)}</span></div>
      <ShareBar title={post.title} path={`/blog/${post.slug}`} compact />
      <div className="post-img" style={{ position: 'relative', aspectRatio: '16 / 9' }}><Image src={post.cover} alt={post.title} fill priority sizes="(max-width: 860px) 100vw, 820px" style={{ objectFit: 'cover' }} /></div>
      <div className="rule-thick" />
      {html ? (
        <Prose html={html} />
      ) : (
        <>
          <p className="post-excerpt">{post.excerpt}</p>
          <p className="post-excerpt" style={{ color: 'var(--muted)' }}>Full post coming soon.</p>
        </>
      )}
      <div className="rule" />
      <ShareBar title={post.title} path={`/blog/${post.slug}`} label="Enjoyed this? Share it" />
    </article>
  );
}
