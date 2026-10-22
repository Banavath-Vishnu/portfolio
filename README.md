# Banavath Vishnu — Portfolio (Next.js on Cloudflare)

Hosted on **Cloudflare Workers** (via the OpenNext adapter), with **D1** (SQLite) for posts, projects and the inbox, and **Cloudinary** for uploaded images (served optimised from its CDN).

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in ADMIN_PASSWORD and SESSION_SECRET (the rest has defaults)
npm run dev                  # http://localhost:3000
```

No Cloudflare account is needed for local work: `npm run dev` uses a local D1 database that Wrangler keeps in `.wrangler/`. Image uploads go to Cloudinary once its keys are in `.env.local`. `npm run check` confirms the setup, and `npm run test:e2e` runs the full end-to-end test against your local site.

To test the production build in Cloudflare's real runtime (still local): `npm run preview` → http://localhost:8787.

> **Windows:** stop `npm run dev` (Ctrl+C) before `npm run preview` or `npm run deploy` — the dev server's file watcher keeps the `.open-next` build folder open, so the build can't replace it.

## All settings live in `.env.local`

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your live URL (canonical links, sitemap, Open Graph) |
| `SITE_URL` | Your live address, e.g. `https://vishnu.dev` (empty = the address the site is served from). Used for SEO |
| `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` | Search Console / Bing Webmaster ownership codes (optional) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 id (optional) |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | Admin login (secret = 32+ random chars) |
| `CF_ACCOUNT_ID` | Optional; only if your Cloudflare login has several accounts |
| `CF_WORKER_NAME` | The Worker (site) name → `https://<name>.<you>.workers.dev` |
| `CF_D1_DATABASE_NAME`, `CF_D1_DATABASE_ID` | The D1 database (id from `wrangler d1 create`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image uploads (Cloudinary dashboard → Settings → API Keys). Leave empty to turn uploads off |
| `CLOUDINARY_FOLDER` | Folder in your Cloudinary library for this site's images |
| `SITE_TIMEZONE` | Timezone for post dates and scheduled publishing (default `Asia/Kolkata`) |

`wrangler.jsonc` and `.dev.vars` are **generated** from these by `npm run cf:config` (dev, preview and deploy run it automatically) — edit `.env.local`, not those files.

## Deploy to Cloudflare (first time)

```bash
npx wrangler login                                   # opens the browser once
npx wrangler d1 create vishnu-portfolio-db           # copy the printed database_id …
#   … into CF_D1_DATABASE_ID in .env.local
# set NEXT_PUBLIC_SITE_URL in .env.local to your workers.dev URL (or custom domain)
npm run check -- --remote                            # verifies login + the real D1 database
npm run deploy                                       # builds and uploads → prints your URL
npm run cf:secrets                                   # uploads ADMIN_PASSWORD, SESSION_SECRET + CLOUDINARY_API_SECRET
```

Then open `https://<your-site>/admin/ultrapremiumhomosepian/hello`, sign in, and add your projects and posts. Tables are created automatically on first use.

**Later deploys:** `npm run deploy`. After changing the password or secret: `npm run cf:secrets`.

**Deploy from GitHub (optional):** after the first deploy, Cloudflare dashboard → Workers & Pages → your Worker → Settings → Builds → connect the GitHub repo, and set:
- *Build command:* `node scripts/vendor-mermaid.mjs && node scripts/cf-config.mjs && npx opennextjs-cloudflare build`
- *Deploy command:* `npx opennextjs-cloudflare deploy`
- *Build variables:* everything from `.env.local` except `ADMIN_PASSWORD`, `SESSION_SECRET` and `CLOUDINARY_API_SECRET` (those stay as Worker secrets).

Every push to `main` then deploys automatically.

**Custom domain:** Worker → Settings → Domains & Routes → add your domain (it must be on Cloudflare DNS). Update `NEXT_PUBLIC_SITE_URL` and redeploy.

## Where things live

- `data/site.js` — content that isn't managed in the admin (hero, about, skills, links).
- `components/` — one file per section (Hero, About, Projects, Blog, Journey…).
- `app/globals.css` — all styles and animations.
- `app/admin/ultrapremiumhomosepian/hello/` — the admin (address set in `lib/adminPath.js`).
- `lib/db.js` — D1 access + table definitions · `lib/media.js` — Cloudinary uploads/deletes (signed API calls, no SDK).
- `scripts/` — `cf-config` (generates Cloudflare config), `cf-secrets`, `check-setup`, `vendor-mermaid`.

## Admin

Every admin page and every save checks the login on the server.

**Publishing workflow.** Saving never changes the live site. *Save draft* keeps editing; *Save & preview* opens the draft in the real page layout with an approval bar. *Approve & publish* (or *Publish changes* for something already live) puts it on the site. From the preview you can also discard pending changes or unpublish. Posts and projects both work this way.

**Publish date & scheduling (posts).** The post editor's *Publish date & time* sets the date shown on the post. Leave it empty to publish the moment you approve; pick a future time and approving **schedules** the post: it stays hidden until then and goes live by itself (no cron job: the site only shows posts whose time has passed). Scheduled posts show a purple *Scheduled* badge; their preview has *Publish now* and *Cancel schedule*. Times use `SITE_TIMEZONE`.

**Editor layout.** Post and project editors have two tabs: **Details** (title/name, summary, slug, topic or category, schedule, cover/screenshot, links) and **Write** (the write-up). Both are one form, so either Save button saves everything; Ctrl+S saves a draft.

**Markdown or HTML.** Each post/project's write-up is Markdown or HTML (switch in the Write tab; Markdown converts to HTML when you switch). Write / Split / Preview views show the real page styling. HTML mode has click-to-insert snippets (image + caption, image with text wrap, two columns, callouts, YouTube embed, collapsible section, button, Mermaid diagram). For safety, scripts, inline event handlers, `javascript:` links and non-https iframes are removed when HTML is shown (`cleanHtml` in `lib/markdown.js`). Image upload, paste and drag & drop work in both modes.

**Markdown.** GitHub-flavoured Markdown, syntax-highlighted code, ```` ```mermaid ```` diagrams, LaTeX math (`$…$`, `$$…$$`), footnotes, callouts (`> [!NOTE]`…) and linkable headings. The editor's quick preview, the page preview and the live site use the same renderer (`lib/markdown.js`). Mermaid is served as static files from `/vendor/mermaid` (copied by `scripts/vendor-mermaid.mjs`) so it stays out of the Worker bundle.

**Content.** Projects and posts always come from D1 — nothing is hardcoded. Add them with **New project** / **New post** in the admin.

**Comments & sharing.** Every post and project page has share buttons (copy link, LinkedIn, X, WhatsApp, email, and the phone's share sheet) and a comment section. Comments go live immediately; name is required, email optional and never shown. Anyone can reply (one level deep). Spam guards: a hidden honeypot field and at most 5 comments per visitor per 10 minutes (by a salted IP hash; IPs aren't stored). When you're logged in as admin, your comments show an *Author* badge. Moderate in the dashboard's **Comments** tab (hide/show or delete with replies); deleting a post or project deletes its comments.

**Inbox.** Contact-form messages and newsletter sign-ups are saved to D1 and listed in the dashboard's **Inbox** tab.

**Site pages (go live as soon as you save — no draft step).**
- **Journey** — the homepage timeline. Each entry can have a logo (uploaded to Cloudinary). Set *Started* (a month) to make the duration count up, and tick *I'm here now* for the pulsing dot. A new database starts with your current timeline; the section hides when it's empty.
- **Certifications** — title, issuer, date, credential link/ID and a certificate image (Cloudinary). Shown on the homepage after Journey; hidden while empty.
- **Categories** — the project filter tabs and the blog topics. Add, rename (updates every post/project using it), reorder or delete (only when nothing uses it). The post/project editors offer exactly these. Only categories that have content get a tab on the site.

## Speed

- **Edge page cache** (`worker.js`, the Worker entry): the home page, /blog, posts, projects, sitemap, robots and feed are cached at Cloudflare's edge for visitors (~10 ms instead of ~0.5–1 s). Every admin change, comment or moderation bumps a content version (`bumpContentVersion` in `lib/db.js`), and a scheduled post going live changes it too, so visitors always get current pages. Never cached: logged-in admin, admin/API routes, form submissions, client navigations, URLs with query strings. Response header `X-Edge-Cache: HIT|MISS` shows what happened. `npm run dev` isn't cached.
- **Images** are WebP/JPEG (`portrait-hero.webp` 40 KB instead of an 833 KB PNG); `public/_headers` gives images and build files long browser caching.
- **Cold starts**: `ensureSchema` checks a stored schema version (one query) and only runs setup when `SCHEMA_VERSION` changes — bump it when you change tables.

## SEO

Built in: per-page titles and descriptions, canonical URLs, Open Graph/Twitter previews (`public/og.png` for the home and blog pages; posts use their cover, projects their screenshot), structured data (Person + WebSite + ProfilePage on the home page, BlogPosting and breadcrumbs on posts, CreativeWork and breadcrumbs on projects, Blog on /blog), `/sitemap.xml` with real dates and images, `/robots.txt` (blocks `/admin` and `/api/`), an RSS feed at `/feed.xml`, related-post links, and `noindex` on every admin page. URLs come from `SITE_URL` (or the serving address) — see `lib/siteUrl.js`.

After deploying: add the site in [Google Search Console](https://search.google.com/search-console) (HTML tag method → put the code in `GOOGLE_SITE_VERIFICATION`, redeploy, verify), submit `https://<your-site>/sitemap.xml`, and do the same in [Bing Webmaster Tools](https://www.bing.com/webmasters) (it can import from Search Console).

See **[TESTING.md](TESTING.md)** for a step-by-step test checklist.
