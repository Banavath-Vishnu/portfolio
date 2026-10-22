// Copies Mermaid's browser build into public/vendor/mermaid so diagrams load as static files in the
// browser instead of being bundled into the Cloudflare Worker (which has a size limit on the free plan).
// Runs automatically before dev, build, preview and deploy. The folder is gitignored.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const src = 'node_modules/mermaid/dist';
const out = 'public/vendor/mermaid';
const chunks = join(src, 'chunks', 'mermaid.esm.min');

if (!existsSync(join(src, 'mermaid.esm.min.mjs'))) {
  console.error('mermaid is not installed — run `npm install`.');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'chunks', 'mermaid.esm.min'), { recursive: true });
cpSync(join(src, 'mermaid.esm.min.mjs'), join(out, 'mermaid.esm.min.mjs'));
let count = 1;
for (const name of readdirSync(chunks)) {
  if (name.endsWith('.mjs') && statSync(join(chunks, name)).isFile()) {
    cpSync(join(chunks, name), join(out, 'chunks', 'mermaid.esm.min', name));
    count++;
  }
}
console.log(`Copied Mermaid (${count} files) to ${out}`);
