// Uploads ADMIN_PASSWORD, SESSION_SECRET and CLOUDINARY_API_SECRET from .env.local to your Cloudflare Worker as encrypted secrets.
//   npm run cf:secrets     (needs `npx wrangler login` once, and the Worker to exist — deploy first)

import { existsSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const secrets = {};
for (const name of ['ADMIN_PASSWORD', 'SESSION_SECRET']) {
  const value = (process.env[name] || '').trim();
  if (!value) { console.error(`✗ ${name} is empty in .env.local`); process.exit(1); }
  secrets[name] = value;
}
// Optional: only needed for image uploads.
if ((process.env.CLOUDINARY_API_SECRET || '').trim()) secrets.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET.trim();
if (secrets.SESSION_SECRET.length < 32) { console.error('✗ SESSION_SECRET must be at least 32 characters'); process.exit(1); }

// wrangler reads the secrets from a JSON file; keep it in a private temp folder and delete it right after.
const dir = mkdtempSync(join(tmpdir(), 'cf-secrets-'));
const file = join(dir, 'secrets.json');
try {
  writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk', file], { stdio: 'inherit' });
  console.log('✓ Secrets uploaded.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
