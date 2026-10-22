import Link from 'next/link';
import { site } from '@/data/site';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} {site.name}. Built with Next.js.</span>
        <div className="footer-links">
          <Link href="/blog">Blog</Link>
          <a href={site.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="#top">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
