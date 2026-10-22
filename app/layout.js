import { Manrope, Fraunces, JetBrains_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { site } from '@/data/site';
import { siteUrl } from '@/lib/siteUrl';
import './globals.css';

const sans = Manrope({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const serif = Fraunces({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-serif', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

// Built per request so URLs use the real site address (see lib/siteUrl.js).
export async function generateMetadata() {
  const base = await siteUrl();
  const title = `${site.name} — ${site.role}`;
  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ${site.name}` },
    description: site.description,
    applicationName: site.name,
    authors: [{ name: site.name, url: base }],
    creator: site.name,
    keywords: ['Banavath Vishnu', 'Vishnu Banavath', 'Full Stack Developer', 'AI Backend Engineer', 'Django', 'FastAPI', 'Next.js', 'LLM', 'MCP', 'Hyderabad', 'IIT Hyderabad'],
    alternates: { canonical: '/', types: { 'application/rss+xml': [{ url: '/feed.xml', title: `${site.name} — Blog` }] } },
    openGraph: {
      type: 'website',
      url: '/',
      siteName: site.name,
      title,
      description: site.description,
      locale: 'en_IN',
      images: [{ url: '/og.jpg', width: 1200, height: 630, alt: `${site.name} — ${site.role}` }],
    },
    twitter: { card: 'summary_large_image', title, description: site.description, images: ['/og.jpg'] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    // Search Console / Bing Webmaster ownership checks (values from .env.local).
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined,
    },
    formatDetection: { telephone: false },
  };
}

export const viewport = {
  themeColor: '#05070B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so light mode never flashes dark. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}" }} />
      </head>
      <body>
        {children}
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
