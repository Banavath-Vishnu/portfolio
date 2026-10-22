// Checks the Cloudflare setup before you run or deploy the site.
//   npm run check             → local database (the copy Wrangler keeps in .wrangler/)
//   npm run check -- --remote → your real D1 database on Cloudflare (needs `npx wrangler login`)

import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const remote = process.argv.includes('--remote');
const env = (k) => (process.env[k] || '').trim();
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const info = (m) => console.log(`    ${m}`);
let failures = 0;
// Run Wrangler's JS entry with Node directly (no shell), so arguments with spaces stay intact on Windows too.
const wrangler = (args) => execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

console.log('\nAdmin login');
if (env('ADMIN_PASSWORD')) ok('ADMIN_PASSWORD is set'); else { bad('ADMIN_PASSWORD is empty'); failures++; }
if (env('ADMIN_PASSWORD') && env('ADMIN_PASSWORD').length < 12) info('Tip: use a longer password (12+ characters) for the live site.');
if (env('SESSION_SECRET').length >= 32) ok('SESSION_SECRET is set'); else { bad('SESSION_SECRET is missing or shorter than 32 characters'); failures++; }

console.log('\nSite');
if (env('SITE_URL')) ok(`SITE_URL = ${env('SITE_URL')}`); else info('SITE_URL is empty — the site uses the address it is served from. Set it once you have your own domain (SEO).');

console.log('\nCloudflare config');
execFileSync(process.execPath, ['scripts/cf-config.mjs'], { stdio: 'inherit' });
const dbName = env('CF_D1_DATABASE_NAME') || `${env('CF_WORKER_NAME') || 'vishnu-portfolio'}-db`;
if (env('CF_D1_DATABASE_ID')) ok('CF_D1_DATABASE_ID is set');
else info(remote ? '' : 'CF_D1_DATABASE_ID is empty — fine for local testing; required before deploying.');

if (remote) {
  try { const who = wrangler(['whoami']); ok(/You are logged in/i.test(who) ? 'Logged in to Cloudflare' : 'wrangler whoami ran'); }
  catch { bad('Not logged in — run `npx wrangler login`'); failures++; }
  if (!env('CF_D1_DATABASE_ID')) { bad('CF_D1_DATABASE_ID is empty — create the database with `npx wrangler d1 create ' + dbName + '`'); failures++; }
}

console.log(`\nDatabase (D1, ${remote ? 'remote' : 'local'})`);
try {
  const out = wrangler(['d1', 'execute', dbName, remote ? '--remote' : '--local', '--json', '--command',
    "SELECT 1 AS reachable, (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('posts','projects','messages','subscribers')) AS tables"]);
  const [{ results: [row] }] = JSON.parse(out);
  ok('Reachable');
  if (row.tables === 4) ok('Tables exist (posts, projects, messages, subscribers)');
  else info('Tables are created automatically the first time the site uses the database.');
} catch (err) {
  // Wrangler prints D1 errors as JSON on stdout; fall back to stderr / the message.
  let reason = (err.stderr || err.message || '').toString().split('\n').find(Boolean);
  try { reason = JSON.parse(err.stdout).error.text; } catch {}
  bad(`Could not query D1: ${reason}`); failures++;
}

console.log('\nImages (Cloudinary)');
const cloud = env('CLOUDINARY_CLOUD_NAME'), key = env('CLOUDINARY_API_KEY'), secret = env('CLOUDINARY_API_SECRET');
if (!cloud || !key || !secret) {
  info('Not set — the site works, but cover/screenshot uploads are off. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and');
  info('CLOUDINARY_API_SECRET (Cloudinary dashboard → Settings → API Keys) to .env.local.');
} else {
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) ok(`Credentials work (plan: ${data.plan || 'unknown'}${data.credits ? `, ${data.credits.used_percent ?? '?'}% of credits used` : ''})`);
    else { bad(`Cloudinary rejected the credentials: ${data?.error?.message || res.status}`); failures++; }
  } catch (err) { bad(`Could not reach Cloudinary: ${err.message}`); failures++; }
}

console.log(failures ? `\n${failures} problem(s) to fix.\n` : `\nAll set${remote ? ' — ready to deploy (npm run deploy)' : ' — run `npm run dev`'}.\n`);
process.exit(failures ? 1 : 0);
