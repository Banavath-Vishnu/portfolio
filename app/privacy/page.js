import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { site } from '@/data/site';

export const metadata = {
  title: 'Privacy',
  description: `What ${site.name}'s website collects, why, and how to opt out.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main id="top" className="container" style={{ maxWidth: 820 }}>
        <article className="section prose" style={{ gap: 8 }}>
          <span className="eyebrow">PRIVACY</span>
          <h1 className="h2">Privacy <strong>notice</strong></h1>
          <p>This is a personal portfolio and blog. I collect as little as possible, never sell anything, and only use it to understand how the site is used and to reply to you.</p>

          <h2>Analytics</h2>
          <p>To see which pages and projects people find useful, the site uses:</p>
          <ul>
            <li><strong>Google Analytics</strong>: anonymous visit statistics such as pages viewed, how you arrived (e.g. from Google or LinkedIn), country, device type, and which buttons were used.</li>
            <li><strong>Microsoft Clarity</strong>: anonymous heatmaps and session replays showing where people click and scroll. Text you type into forms is masked and never recorded.</li>
          </ul>
          <p>Both set cookies in your browser. You can block them with your browser&apos;s privacy settings or a content blocker, or with Google&apos;s <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Analytics opt-out add-on</a>. The site works the same either way. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google&apos;s</a> and <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer">Microsoft&apos;s</a> privacy statements for how they handle data.</p>

          <h2>Things you choose to send</h2>
          <ul>
            <li><strong>Contact form:</strong> your name, email and message, so I can reply.</li>
            <li><strong>Newsletter:</strong> your email address, only to send new posts. Ask me and I&apos;ll remove it.</li>
            <li><strong>Comments:</strong> your name and comment are public. Your email is optional and never shown.</li>
          </ul>
          <p>To limit spam, a scrambled (hashed) version of your IP address is kept with comments. The IP address itself is not stored.</p>

          <h2>Your choices</h2>
          <p>To see, correct or delete anything you&apos;ve sent, or to unsubscribe, email <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Last updated: October 2026</p>
        </article>
      </main>
      <Footer />
    </>
  );
}
