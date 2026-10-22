// Admin session: a signed, expiring token in an HTTP-only cookie.
// Uses Web Crypto so the same code runs in proxy.js and in server actions.

export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();

function toBase64Url(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Compare without bailing out early, so timing doesn't leak how much matched.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function secret() {
  const s = process.env.SESSION_SECRET || '';
  return s.length >= 32 ? s : null; // fail closed on a missing or weak secret
}

async function sign(data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function sha256(text) {
  return toBase64Url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

export function authConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && secret());
}

export async function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string') return false;
  // Hash both sides so the comparison is always over equal-length strings.
  return safeEqual(await sha256(input), await sha256(expected));
}

export async function createSessionToken() {
  const payload = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token) {
  if (!token || !secret()) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (!safeEqual(sig, await sign(payload))) return false;
  return Number(payload) > Date.now();
}
