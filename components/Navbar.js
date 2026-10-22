import { site } from '@/data/site';
import { GitHubIcon, LinkedInIcon, LogoMark } from './Icons';
import NavLinks from './NavLinks';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  return (
    <header className="nav-wrap">
      <nav aria-label="Main" className="container nav">
        <a href="/" className="logo"><LogoMark />{site.shortName}</a>
        <NavLinks />
        <div className="nav-right">
          <a href={site.github} aria-label="GitHub" className="icon-btn" target="_blank" rel="noopener noreferrer"><GitHubIcon /></a>
          <a href={site.linkedin} aria-label="LinkedIn" className="icon-btn" target="_blank" rel="noopener noreferrer"><LinkedInIcon /></a>
          <ThemeToggle />
          <a href={site.resume} className="pill pill--outline nav-cta">Resume</a>
        </div>
      </nav>
    </header>
  );
}
