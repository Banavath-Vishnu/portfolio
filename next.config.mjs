import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Makes the Cloudflare bindings from wrangler.jsonc (the D1 `DB`) available in `next dev`,
// backed by local copies Wrangler keeps in .wrangler/. Run `npm run cf:config` first (predev does it).
initOpenNextCloudflareForDev({ configPath: './wrangler.dev.jsonc' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Next's image optimiser needs Cloudflare Images (paid) on Workers; Cloudinary optimises uploads instead.
    unoptimized: true,
    // Uploaded images are served (and optimised) by Cloudinary.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  experimental: {
    // Room for a 4 MB image upload plus form overhead.
    serverActions: { bodySizeLimit: '4.5mb' },
  },
  async redirects() {
    return [
      { source: '/blogs', destination: '/blog', permanent: true },
      { source: '/blogs/:slug', destination: '/blog/:slug', permanent: true },
    ];
  },
};

export default nextConfig;
