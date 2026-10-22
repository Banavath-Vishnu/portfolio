import Link from 'next/link';
import BlogLayout from './BlogLayout';
import Newsletter from './Newsletter';

export default function Blog({ posts }) {
  return (
    <section id="blog" className="section">
      <div className="row-between">
        <div className="heading">
          <span className="eyebrow">BLOG</span>
          <h2 className="h2">Latest <strong>writing</strong></h2>
        </div>
        <Link href="/blog" data-track="cta_click" data-track-label="all_posts" className="pill pill--outline" style={{ minHeight: 50, padding: '0 26px', fontSize: 15 }}>All posts ↗</Link>
      </div>

      {posts.length > 0
        ? <BlogLayout featured={posts[0]} side={posts.slice(1, 4)} />
        : <p className="blog-empty">The first posts are on their way — subscribe below to hear when they’re out.</p>}

      <Newsletter />
    </section>
  );
}
