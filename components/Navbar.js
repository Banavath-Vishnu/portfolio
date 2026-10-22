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
          <a href={site.github} aria-label="GitHub" className="icon-btn" data-track="social_click" data-track-label="github" data-track-location="nav" target="_blank" rel="noopener noreferrer"><GitHubIcon /></a>
          <a href={site.linkedin} aria-label="LinkedIn" className="icon-btn" data-track="social_click" data-track-label="linkedin" data-track-location="nav" target="_blank" rel="noopener noreferrer"><LinkedInIcon /></a>
          <ThemeToggle />
          <a href={site.resume} className="pill pill--outline nav-cta" data-track="resume_click" data-track-label="nav">Resume</a>
        </div>
      </nav>
    </header>
  );
}
