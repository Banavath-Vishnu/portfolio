import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import About from '@/components/About';
import Skills from '@/components/Skills';
import Projects from '@/components/Projects';
import Blog from '@/components/Blog';
import Journey from '@/components/Journey';
import Certifications from '@/components/Certifications';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { getPosts, getProjects, getCategories, getJourney, getCertifications } from '@/lib/content';
import { site, skillGroups } from '@/data/site';
import { siteUrl, absolute } from '@/lib/siteUrl';

// Rendered on each request from D1, so the admin's changes show up immediately (and the build never reads the database).
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [projects, posts, categories, journey, certs, base] = await Promise.all([
    getProjects(), getPosts(), getCategories('project'), getJourney(), getCertifications(), siteUrl(),
  ]);
  const current = journey.find((e) => e.live);
  // Who you are, for search engines: name, role, employer, education, skills, profiles and photo.
  const person = {
    '@type': 'Person',
    '@id': `${base}/#person`,
    name: site.name,
    alternateName: 'Vishnu Banavath',
    jobTitle: site.role,
    description: site.description,
    url: base,
    image: absolute(site.portrait, base),
    email: `mailto:${site.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Hyderabad', addressRegion: 'Telangana', addressCountry: 'IN' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Indian Institute of Technology Hyderabad', sameAs: 'https://www.iith.ac.in' },
    ...(current?.org && { worksFor: { '@type': 'Organization', name: current.org } }),
    knowsAbout: skillGroups.flatMap((g) => g.items).slice(0, 40),
    hasCredential: certs.map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c.title, ...(c.issuer && { recognizedBy: { '@type': 'Organization', name: c.issuer } }) })),
    sameAs: [site.github, site.linkedin],
  };
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      person,
      { '@type': 'WebSite', '@id': `${base}/#website`, url: base, name: site.name, description: site.description, publisher: { '@id': `${base}/#person` }, inLanguage: 'en' },
      { '@type': 'ProfilePage', '@id': `${base}/#profile`, url: base, name: `${site.name} — ${site.role}`, mainEntity: { '@id': `${base}/#person` }, isPartOf: { '@id': `${base}/#website` } },
    ],
  };
  return (
    <>
      <JsonLd data={graph} />
      <Navbar />
      <main id="top">
        <Hero />
        <Marquee />
        <div className="container">
          <About />
          <Skills />
          <Projects projects={projects} categories={categories} />
          <Blog posts={posts} />
          <Journey entries={journey} />
          <Certifications certs={certs} />
          <Contact />
        </div>
      </main>
      <Footer />
    </>
  );
}
