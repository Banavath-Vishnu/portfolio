import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ViewCounter from '@/components/ViewCounter';
import PostArticle from '@/components/PostArticle';
import Comments from '@/components/Comments';
import JsonLd from '@/components/JsonLd';
import { getPost, getPosts, getComments } from '@/lib/content';
import { isAdmin } from '@/lib/admin';
import { siteUrl, absolute, snippet } from '@/lib/siteUrl';
import { site } from '@/data/site';

// Rendered on each request from D1, so the admin's changes show up immediately (and the build never reads the database).
export const dynamic = 'force-dynamic';

// Metadata and the page both need the post; this makes it one database read per request.
const loadPost = cache(getPost);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return {};
  const description = post.excerpt || snippet(post.content) || post.title;
  const image = { url: post.cover, alt: post.title };
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      images: [image],
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: [site.name],
      section: post.tag,
      tags: [post.tag],
    },
    twitter: { card: 'summary_large_image', title: post.title, description, images: [post.cover] },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();
  const [comments, author, all, base] = await Promise.all([getComments('post', post.id), isAdmin(), getPosts(), siteUrl()]);

  // Keep reading: same topic first, then the newest others.
  const others = all.filter((p) => p.slug !== post.slug);
  const related = [...others.filter((p) => p.tag === post.tag), ...others.filter((p) => p.tag !== post.tag)].slice(0, 3);

  const url = `${base}/blog/${post.slug}`;
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: post.title.slice(0, 110),
        description: post.excerpt || snippet(post.content),
        image: [absolute(post.cover, base)],
        datePublished: post.publishedAt || undefined,
        dateModified: post.updatedAt || post.publishedAt || undefined,
        author: { '@type': 'Person', '@id': `${base}/#person`, name: site.name, url: base },
        publisher: { '@type': 'Person', '@id': `${base}/#person`, name: site.name, url: base },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        url,
        articleSection: post.tag,
        keywords: [post.tag],
        wordCount: snippet(post.content, 1e9).split(' ').filter(Boolean).length,
        commentCount: comments.reduce((n, c) => n + 1 + c.replies.length, 0),
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={structured} />
      <Navbar />
      <main id="top" className="container" style={{ maxWidth: 820 }}>
        <PostArticle post={post} />
        {related.length > 0 && (
          <nav className="related" aria-labelledby="related-title">
            <h2 id="related-title" className="related-title">Keep reading</h2>
            <ul className="related-list">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="related-item">
                    <span className="related-tag mono">{p.tag}</span>
                    <span className="related-name">{p.title}</span>
                    <span className="related-meta">{p.date} · {p.readTime}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <Comments targetType="post" targetId={post.id} comments={comments} author={author} authorName={site.name} />
      </main>
      <ViewCounter slug={post.slug} />
      <Footer />
    </>
  );
}
