import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cloudflare D1 (SQLite) behind a small `sql` tagged template, so queries read like
//   const rows = await sql`SELECT * FROM posts WHERE slug = ${slug}`;
// Values are always bound as parameters (never spliced into the SQL). Conversions for SQLite:
//   booleans → 1/0, Dates → ISO strings, arrays/objects → JSON text; `tags` and `draft` columns
//   come back parsed. The D1 database is the `DB` binding from wrangler.jsonc — locally that's a
//   SQLite file Wrangler keeps in .wrangler/, in production the real D1 database.

async function getDB() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.DB ?? null;
  } catch {
    return null;
  }
}

export async function dbAvailable() {
  return Boolean(await getDB());
}

function toParam(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

const JSON_COLUMNS = ['tags', 'draft'];
function fromRow(row) {
  for (const col of JSON_COLUMNS) {
    if (typeof row[col] === 'string') {
      try { row[col] = JSON.parse(row[col]); } catch { /* leave as text */ }
    }
  }
  return row;
}

export async function sql(strings, ...values) {
  const db = await getDB();
  if (!db) throw new Error('No database available (the D1 binding "DB" is missing — run `npm run cf:config`).');
  const query = strings.reduce((q, s, i) => q + s + (i < values.length ? '?' : ''), '');
  const { results } = await db.prepare(query).bind(...values.map(toParam)).all();
  return (results || []).map(fromRow);
}

// Timestamps are stored as ISO-8601 text, which also sorts correctly.
const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    content_format TEXT NOT NULL DEFAULT 'markdown',
    tag TEXT NOT NULL DEFAULT 'AI',
    cover_url TEXT,
    read_time TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    draft TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    updated_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    content_format TEXT NOT NULL DEFAULT 'markdown',
    category TEXT NOT NULL DEFAULT '',
    filter_key TEXT NOT NULL DEFAULT 'AI',
    tags TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    href TEXT NOT NULL DEFAULT '',
    link_label TEXT NOT NULL DEFAULT 'Read more ↗',
    image_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    draft TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  // Contact form messages and newsletter sign-ups (shown in the admin's Inbox tab).
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  `CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  // Filter categories you manage in the admin: kind is 'project' (homepage filter tabs) or 'post' (blog topics).
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (kind, name)
  )`,
  // The homepage "Journey" timeline. `since` (YYYY-MM) makes the duration count up; `live` adds the pulsing dot.
  `CREATE TABLE IF NOT EXISTS journey (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    org TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    dates TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    since TEXT,
    live INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    logo_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  `CREATE TABLE IF NOT EXISTS certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    issuer TEXT NOT NULL DEFAULT '',
    issued TEXT NOT NULL DEFAULT '',
    credential_id TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    orientation TEXT NOT NULL DEFAULT 'portrait',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  // Comments on posts and projects (target_type 'post' | 'project'). Replies point at a top-level comment
  // (one level deep). Email is optional and never shown publicly; ip_hash is a salted hash used only for rate limiting.
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    parent_id INTEGER,
    name TEXT NOT NULL,
    email TEXT,
    body TEXT NOT NULL,
    is_author INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    ip_hash TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  )`,
  `CREATE INDEX IF NOT EXISTS comments_target ON comments (target_type, target_id)`,
  // One-off markers (e.g. "starter categories added"), so deleted starter rows never come back.
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`,
];

// Starting content, added once to a new database (then it's yours to edit or delete in the admin):
// the categories the site launched with, plus any already used by existing posts/projects, and the journey timeline.
const STARTER_CATEGORIES = {
  project: ['AI', 'Full Stack', 'Backend', 'Freelance'],
  post: ['AI', 'Security', 'Backend', 'Full Stack', 'Career'],
};

const STARTER_JOURNEY = [
  { title: 'Chemical Engineering', org: 'IIT Hyderabad', type: 'Education', location: 'Hyderabad, India', dates: '2022 – 2026', duration: 'B.Tech', description: 'Where it started: coding alongside engineering, one side project at a time.' },
  { title: 'Freelance Full Stack & Mobile Developer', org: 'Self-employed', type: 'Freelance', location: 'Remote', dates: 'Since 2023', duration: '25+ projects', description: 'Real-time chat and food ordering apps across MERN web and React Native (Expo) mobile, with Django, Flask and FastAPI backends on AWS — using Lambda and SNS for OTP login. Real-time chat and notifications with Socket.io, plus UI/UX research and prototyping for startups and small businesses.' },
  { title: 'Full Stack Developer', org: 'Olcademy', type: 'Remote', location: '', dates: 'Jun – Dec 2024', duration: '7 months', description: 'Built web and mobile apps with React and React Native, including food delivery apps along the lines of Zomato and Swiggy and a resume builder tool, and hosted them in production.' },
  { title: 'Software Engineer Intern', org: 'Multiplier AI', type: 'Internship', location: 'Hyderabad, India · On-site', dates: 'May – Jul 2025', duration: '3 months', description: 'Cut manual entity verification time by 90%+ (2 days to 4 hours) with an AI-assisted, human-in-the-loop review workflow, and built an e-learning app with React, MongoDB and a Spring Boot API.' },
  { title: 'Full Stack Developer (AI Backend)', org: 'Bharat Smart Services', type: 'Full Time', location: 'Hyderabad, India', dates: 'May 2026 – Present', since: '2026-05', live: true, description: 'Architecting NerveNet and leading 2 developers and 1 QA. Fixed 17 of 18 security audit findings (all 4 high-severity), backed by ~350 automated tests. Shipped 23+ REST APIs with JWT and RBAC, and owned the AI Website Editor backend.' },
];

const COLUMN_UPGRADES = [
  `ALTER TABLE certifications ADD COLUMN orientation TEXT NOT NULL DEFAULT 'portrait'`,
  `ALTER TABLE posts ADD COLUMN content_format TEXT NOT NULL DEFAULT 'markdown'`,
  `ALTER TABLE projects ADD COLUMN content_format TEXT NOT NULL DEFAULT 'markdown'`,
];

const once = (key) => `NOT EXISTS (SELECT 1 FROM meta WHERE key = '${key}')`;

function starterStatements(db) {
  const stmts = [];
  for (const [kind, names] of Object.entries(STARTER_CATEGORIES)) {
    names.forEach((name, i) => stmts.push(db.prepare(
      `INSERT OR IGNORE INTO categories (kind, name, sort_order) SELECT ?, ?, ? WHERE ${once('starter_categories')}`).bind(kind, name, i)));
  }
  stmts.push(db.prepare(`INSERT OR IGNORE INTO categories (kind, name, sort_order)
    SELECT 'post', tag, 100 FROM posts WHERE tag <> '' AND ${once('starter_categories')} GROUP BY tag`));
  stmts.push(db.prepare(`INSERT OR IGNORE INTO categories (kind, name, sort_order)
    SELECT 'project', filter_key, 100 FROM projects WHERE filter_key <> '' AND ${once('starter_categories')} GROUP BY filter_key`));
  stmts.push(db.prepare(`INSERT OR IGNORE INTO meta (key, value) VALUES ('starter_categories', '1')`));

  STARTER_JOURNEY.forEach((e, i) => stmts.push(db.prepare(
    `INSERT INTO journey (title, org, type, location, dates, duration, since, live, description, sort_order)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${once('starter_journey')}`)
    .bind(e.title, e.org, e.type, e.location, e.dates, e.duration || '', e.since || null, e.live ? 1 : 0, e.description, (i + 1) * 10)));
  stmts.push(db.prepare(`INSERT OR IGNORE INTO meta (key, value) VALUES ('starter_journey', '1')`));
  return stmts;
}

let ready;

// Bump this whenever SCHEMA, the starter rows or COLUMN_UPGRADES change. A database already at this version
// skips the setup entirely, so a fresh Worker instance costs one quick query instead of ~30 statements.
const SCHEMA_VERSION = '7';

// Creates the tables on first use (once per Worker instance), so there's no separate migration step.
export function ensureSchema() {
  ready ??= (async () => {
    const db = await getDB();
    if (!db) return;
    try {
      const row = await db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).first();
      if (row?.value === SCHEMA_VERSION) return;
    } catch {
      // No meta table yet (brand-new database): run the full setup below.
    }
    await db.batch(SCHEMA.map((s) => db.prepare(s)));
    await db.batch(starterStatements(db));
    // Columns added after a table was first created (SQLite has no ADD COLUMN IF NOT EXISTS).
    for (const stmt of COLUMN_UPGRADES) {
      try { await db.prepare(stmt).run(); } catch (err) { if (!/duplicate column/i.test(err.message)) throw err; }
    }
    await db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`).bind(SCHEMA_VERSION).run();
  })().catch((err) => { ready = undefined; throw err; });
  return ready;
}

// ---------- Page cache version ----------
// Public pages are cached at Cloudflare's edge (see worker.js). Every content change bumps this number, which
// changes the cache key, so visitors get fresh pages right away. Cheap: one tiny write.
export async function bumpContentVersion() {
  const db = await getDB();
  if (!db) return;
  try {
    await db.prepare(`INSERT INTO meta (key, value) VALUES ('content_version', '1')
      ON CONFLICT (key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`).run();
  } catch (err) {
    console.error('bumpContentVersion failed', err);
  }
}
