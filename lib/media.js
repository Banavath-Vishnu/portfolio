// Uploaded images (post covers, project screenshots) live in Cloudinary.
// Uploads use Cloudinary's signed upload API directly (fetch + Web Crypto, so it runs on Workers
// without an SDK); images are served from Cloudinary's CDN with automatic format/quality (f_auto,q_auto).
// Settings: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function config() {
  const cloud = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const key = (process.env.CLOUDINARY_API_KEY || '').trim();
  const secret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  const folder = (process.env.CLOUDINARY_FOLDER || 'portfolio').trim().replace(/^\/+|\/+$/g, '');
  return cloud && key && secret ? { cloud, key, secret, folder } : null;
}

export function mediaConfigured() {
  return Boolean(config());
}

// Cloudinary signature: SHA-1 of the sorted "k=v&k=v" params with the API secret appended.
export async function cloudinarySignature(params, secret) {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + secret;
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function signedPost(cfg, endpoint, params, file) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { ...params, timestamp };
  const form = new FormData();
  for (const [k, v] of Object.entries(signed)) form.append(k, String(v));
  form.append('api_key', cfg.key);
  form.append('signature', await cloudinarySignature(signed, cfg.secret));
  if (file) form.append('file', file);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/${endpoint}`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cloudinary ${endpoint} failed: ${data?.error?.message || res.status}`);
  return data;
}

// Uploads a File and returns its delivery URL, or null when no file was chosen.
export async function putImage(file, folder) {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Images must be JPG, PNG, WebP, GIF or AVIF.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Images must be 4 MB or smaller.');
  const cfg = config();
  if (!cfg) throw new Error('Image uploads aren’t set up — add your Cloudinary details (CLOUDINARY_*) to .env.local.');
  const data = await signedPost(cfg, 'upload', { folder: `${cfg.folder}/${folder}` }, file);
  // Serve the best format and quality for each browser.
  return data.secure_url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}

// …/image/upload/[transformations/]v<version>/<public_id>.<ext>  →  <public_id>
// Upload URLs always carry the version segment, so everything after it is the public id.
export function publicIdFromUrl(url) {
  return url.match(/\/image\/upload\/(?:[^/]+\/)*?v\d+\/(.+)\.[a-z0-9]+$/i)?.[1] ?? null;
}

// Deletes an image we uploaded to Cloudinary; anything else (e.g. /blog/… files) is left alone.
export async function removeImage(url) {
  const cfg = config();
  if (!url || !cfg || !url.includes(`res.cloudinary.com/${cfg.cloud}/image/upload/`)) return;
  const publicId = publicIdFromUrl(url);
  if (!publicId) return;
  try {
    // invalidate: also purge the CDN cache, so a deleted image stops being served right away.
    await signedPost(cfg, 'destroy', { public_id: publicId, invalidate: 'true' });
  } catch (err) {
    console.error('Image delete failed', err);
  }
}

// Images placed inside Markdown (screenshots in posts/projects) live in the "inline" subfolder.
// Only those are ever cleaned up automatically — covers and other images are never matched here.
export function inlineImageUrls(markdown) {
  const cfg = config();
  if (!cfg || !markdown) return [];
  const re = new RegExp(String.raw`https://res\.cloudinary\.com/${cfg.cloud}/image/upload/[^\s)"'<>]+`, 'g');
  return [...new Set(markdown.match(re) || [])].filter((url) => url.includes(`/${cfg.folder}/inline/`));
}

// Deletes inline images that `before` used and none of `keep` still use.
export async function removeUnusedInline(before, ...keep) {
  const kept = new Set(keep.flatMap((md) => inlineImageUrls(md)));
  for (const url of inlineImageUrls(before)) if (!kept.has(url)) await removeImage(url);
}
