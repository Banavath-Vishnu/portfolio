import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogMosaic from '@/components/BlogMosaic';
import Newsletter from '@/components/Newsletter';
import JsonLd from '@/components/JsonLd';
import { getPosts, getCategories } from '@/lib/content';
import { siteUrl, absolute } from '@/lib/siteUrl';
import { site } from '@/data/site';

// Rendered on each request from D1, so the admin's changes show up immediately (and the build never reads the database).
export const dynamic = 'force-dynamic';

const DESCRIPTION = 'Writing by Banavath Vishnu on AI systems, LLM backends, backend security and shipping full stack products.';

export const metadata = {
  title: 'Blog',
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: { type: 'website', title: `Blog | ${site.name}`, description: DESCRIPTION, url: '/blog' },
  twitter: { card: 'summary_large_image', title: `Blog | ${site.name}`, description: DESCRIPTION },
};

export default async function BlogPage() {
  const [posts, topics, base] = await Promise.all([getPosts(), getCategories('post'), siteUrl()]);
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${base}/blog#blog`,
    url: `${base}/blog`,
    name: `${site.name} — Blog`,
    description: DESCRIPTION,
    author: { '@type': 'Person', '@id': `${base}/#person`, name: site.name, url: base },
    blogPost: posts.slice(0, 30).map((p) => ({
      '@type': 'BlogPosting', headline: p.title, url: `${base}/blog/${p.slug}`, datePublished: p.publishedAt || undefined, image: absolute(p.cover, base),
    })),
  };
  return (
    <>
      <JsonLd data={structured} />
      <Navbar />
      <main id="top" className="container">
        <section className="section">
          <div className="heading heading--center fu">
            <span className="eyebrow">BLOG</span>
            <h1 className="h2">All <strong>writing</strong></h1>
            <p className="blog-intro">Notes on AI systems, backend security, and shipping full stack products. The most-read posts get the biggest tiles.</p>
          </div>

          {posts.length > 0 ? (
            <BlogMosaic posts={posts} topics={topics} />
          ) : (
            <p className="blog-empty">The first posts are on their way — subscribe below to hear when they’re out.</p>
          )}

          <Newsletter />
        </section>
      </main>
      <Footer />
    </>
  );
}
