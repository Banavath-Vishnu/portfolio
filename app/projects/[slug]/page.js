import { cache } from 'react';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { siteUrl, absolute, snippet } from '@/lib/siteUrl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProjectArticle from '@/components/ProjectArticle';
import Comments from '@/components/Comments';
import { getProject, getProjects, getComments, DEFAULT_COVER } from '@/lib/content';
import { isAdmin } from '@/lib/admin';
import { site } from '@/data/site';

// Rendered on each request from D1, so the admin's changes show up immediately (and the build never reads the database).
export const dynamic = 'force-dynamic';


// Metadata and the page both need the project; this makes it one database read per request.
const loadProject = cache(getProject);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = await loadProject(slug);
  if (!project) return {};
  const description = project.desc || snippet(project.content) || project.name;
  const image = project.image || DEFAULT_COVER;
  return {
    title: project.cat ? `${project.name} — ${project.cat.charAt(0) + project.cat.slice(1).toLowerCase()}` : project.name,
    description,
    keywords: project.tags,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { type: 'article', title: project.name, description, url: `/projects/${project.slug}`, images: [{ url: image, alt: `${project.name} screenshot` }], authors: [site.name], tags: project.tags },
    twitter: { card: 'summary_large_image', title: project.name, description, images: [image] },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const [project, all, base] = await Promise.all([loadProject(slug), getProjects(), siteUrl()]);
  if (!project) notFound();
  const [comments, author] = await Promise.all([getComments('project', project.id), isAdmin()]);
  const url = `${base}/projects/${project.slug}`;
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': `${url}#project`,
        name: project.name,
        headline: project.name,
        description: project.desc || snippet(project.content),
        image: absolute(project.image || DEFAULT_COVER, base),
        url,
        genre: project.cat || undefined,
        keywords: project.tags.join(', ') || undefined,
        author: { '@type': 'Person', '@id': `${base}/#person`, name: site.name, url: base },
        creator: { '@type': 'Person', '@id': `${base}/#person`, name: site.name },
        ...(project.href && /^https?:/.test(project.href) && { sameAs: project.href }),
        commentCount: comments.reduce((n, c) => n + 1 + c.replies.length, 0),
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: 'Projects', item: `${base}/#projects` },
          { '@type': 'ListItem', position: 3, name: project.name, item: url },
        ],
      },
    ],
  };

  // Prefer projects from the same filter tab, then fill with the rest.
  const others = all.filter((p) => p.slug !== project.slug);
  const more = [...others.filter((p) => p.key === project.key), ...others.filter((p) => p.key !== project.key)].slice(0, 3);

  return (
    <>
      <JsonLd data={structured} />
      <Navbar />
      <main id="top" className="container">
        <ProjectArticle project={project} more={more}>
          <Comments targetType="project" targetId={project.id} comments={comments} author={author} authorName={site.name} />
        </ProjectArticle>
      </main>
      <Footer />
    </>
  );
}
