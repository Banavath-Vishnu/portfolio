'use client';

// Fallback for unexpected errors on admin pages (e.g. the database dropping mid-request).
export default function AdminError({ error, reset }) {
  return (
    <div className="admin-stack">
      <h1 className="admin-title">Something went wrong</h1>
      <div className="admin-alert admin-alert--action">
        <span>
          The page couldn’t load. This is usually a database connection problem. Run <code>npm run check</code> locally,
          or check the Worker logs (`npx wrangler tail` or the Cloudflare dashboard){error?.digest ? <> (error id <code>{error.digest}</code>)</> : null}.
        </span>
        <button type="button" className="adm-btn" onClick={() => reset()}>Try again</button>
      </div>
    </div>
  );
}
