import Link from 'next/link';
import { formatViews } from '@/data/site';
import { deletePost, deleteProject, deleteMessage, deleteSubscriber, deleteComment, setCommentHidden } from '@/app/admin/ultrapremiumhomosepian/hello/actions';
import SubmitButton from './SubmitButton';
import DeleteButton from './DeleteButton';
import PageHeader from './PageHeader';
import { StatusBadge } from './EditorFooter';
import CopyButton from './CopyButton';
import MessageDialog from './MessageDialog';
import { ADMIN_PATH } from '@/lib/adminPath';

export const NewButtons = () => (
  <>
    <Link href={`${ADMIN_PATH}/posts/new`} className="adm-btn adm-btn--primary">+ New post</Link>
    <Link href={`${ADMIN_PATH}/projects/new`} className="adm-btn">+ New project</Link>
  </>
);

// The dashboard body (stats, tabs, posts/projects tables), given admin-shaped posts and projects.
// `tab` is 'all' | 'posts' | 'projects' (from ?tab=), and `basePath` is where the tab links point.
export default function DashboardView({ posts, projects, inbox = { messages: [], subscribers: [] }, comments = [], notice, blobReady, tab = 'all', basePath = ADMIN_PATH }) {
  const awaiting = [...posts, ...projects].filter((i) => i.hasDraft || !i.live).length;
  const scheduledCount = posts.filter((p) => p.scheduled).length;
  const stats = [
    { label: 'Posts', value: posts.length, note: `${posts.filter((p) => p.live && !p.scheduled).length} live${scheduledCount ? ` · ${scheduledCount} scheduled` : ''}` },
    { label: 'Projects', value: projects.length, note: `${projects.filter((p) => p.live).length} live` },
    { label: 'Awaiting approval', value: awaiting, note: 'drafts & pending changes', tone: awaiting ? 'pending' : undefined },
    { label: 'Total views', value: posts.reduce((n, p) => n + p.views, 0).toLocaleString('en-US'), note: 'across all posts' },
  ];

  const tabs = [
    { key: 'all', label: 'All content', count: posts.length + projects.length },
    { key: 'posts', label: 'Posts', count: posts.length },
    { key: 'projects', label: 'Projects', count: projects.length },
    { key: 'comments', label: 'Comments', count: comments.length },
    { key: 'inbox', label: 'Inbox', count: inbox.messages.length },
  ];

  return (
    <div className="admin-stack">
      <PageHeader eyebrow="Overview" title="Dashboard"><NewButtons /></PageHeader>

      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {!blobReady && (
        <div className="admin-alert">
          <strong>Image uploads are off.</strong> Add your Cloudinary details (<code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>,
          <code>CLOUDINARY_API_SECRET</code>) to <code>.env.local</code> — for the live site also run <code>npm run cf:secrets</code>. You can still write posts without covers.
        </div>
      )}

      <div className="adm-stats">
        {stats.map((s) => (
          <div key={s.label} className={`adm-stat${s.tone ? ` is-${s.tone}` : ''}`}>
            <span className="adm-stat-label">{s.label}</span>
            <span className="adm-stat-value">{s.value}</span>
            <span className="adm-stat-note">{s.note}</span>
          </div>
        ))}
      </div>

      <nav className="adm-tabs" aria-label="Content">
        {tabs.map((t) => (
          <Link key={t.key} href={t.key === 'all' ? basePath : `${basePath}?tab=${t.key}`} scroll={false}
            className={`adm-tab${tab === t.key ? ' is-active' : ''}`} aria-current={tab === t.key ? 'page' : undefined}>
            {t.label}<span className="adm-tab-count">{t.count}</span>
          </Link>
        ))}
      </nav>

      {(tab === 'all' || tab === 'posts') && (
      <section id="posts" className="adm-card adm-tab-panel">
        <div className="adm-card-head">
          <h2>Posts <span className="admin-count">{posts.length}</span></h2>
          <Link href={`${ADMIN_PATH}/posts/new`} className="adm-btn adm-btn--sm">+ New post</Link>
        </div>
        {posts.length === 0 ? <p className="adm-empty">No posts yet. Write your first one.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Topic</th><th>Status</th><th>Views</th><th>Date</th><th /></tr></thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`${ADMIN_PATH}/posts/${p.id}`} className="admin-row-title">{p.title}</Link>
                      <span className="adm-row-sub">/blog/{p.slug}</span>
                    </td>
                    <td><span className="adm-tag">{p.tag}</span></td>
                    <td><StatusBadge item={p} /></td>
                    <td className="adm-num">{formatViews(p.views)}</td>
                    <td className="adm-nowrap">{p.scheduled ? <span className="adm-scheduled" title="Goes live automatically">⏱ {p.publishAtLabel}</span> : p.date}</td>
                    <td className="admin-row-actions">
                      <Link href={`${ADMIN_PATH}/posts/${p.id}`} className="admin-link">Edit</Link>
                      <Link href={`${ADMIN_PATH}/preview/posts/${p.id}`} className="admin-link">Preview</Link>
                      {p.live && !p.scheduled && <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="admin-link">View ↗</a>}
                      <DeleteButton action={deletePost} id={p.id} label={p.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {(tab === 'all' || tab === 'projects') && (
      <section id="projects" className="adm-card adm-tab-panel">
        <div className="adm-card-head">
          <h2>Projects <span className="admin-count">{projects.length}</span></h2>
          <Link href={`${ADMIN_PATH}/projects/new`} className="adm-btn adm-btn--sm">+ New project</Link>
        </div>
        {projects.length === 0 ? <p className="adm-empty">No projects yet. Add your first one.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Filter</th><th>Order</th><th /></tr></thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`${ADMIN_PATH}/projects/${p.id}`} className="admin-row-title">{p.name}</Link>
                      <span className="adm-row-sub">/projects/{p.slug}</span>
                    </td>
                    <td className="adm-muted-cell">{p.cat}</td>
                    <td><StatusBadge item={p} /></td>
                    <td><span className="adm-tag">{p.key}</span></td>
                    <td className="adm-num">{p.sortOrder}</td>
                    <td className="admin-row-actions">
                      <Link href={`${ADMIN_PATH}/projects/${p.id}`} className="admin-link">Edit</Link>
                      <Link href={`${ADMIN_PATH}/preview/projects/${p.id}`} className="admin-link">Preview</Link>
                      {p.live && <a href={`/projects/${p.slug}`} target="_blank" rel="noopener noreferrer" className="admin-link">View ↗</a>}
                      <DeleteButton action={deleteProject} id={p.id} label={p.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {tab === 'comments' && (
        <section className="adm-card adm-tab-panel">
          <div className="adm-card-head">
            <div>
              <h2>Comments <span className="admin-count">{comments.length}</span></h2>
              <span className="admin-hint">Comments go live right away. Hide one to take it off the site, or delete it (with its replies).</span>
            </div>
          </div>
          {comments.length === 0 ? <p className="adm-empty">No comments yet. They’ll appear here as people comment on your posts and projects.</p> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>From</th><th>Comment</th><th>On</th><th>Date</th><th /></tr></thead>
                <tbody>
                  {comments.map((c) => (
                    <tr key={c.id} className={c.hidden ? 'adm-row-muted' : undefined}>
                      <td className="adm-nowrap">
                        <span className="admin-row-title">{c.name}{c.isAuthor && <span className="adm-tag adm-author-tag">Author</span>}</span>
                        <span className="adm-row-sub">{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : 'no email'}</span>
                      </td>
                      <td className="adm-message">
                        {c.parentName && <span className="adm-row-sub">↳ reply to {c.parentName}</span>}
                        <span className="adm-comment-body" title={c.body}>{c.body}</span>
                        {c.hidden && <span className="admin-badge adm-inline-badge">Hidden</span>}
                      </td>
                      <td><span className="adm-tag">{c.targetType === 'post' ? 'Post' : 'Project'}</span> <span className="adm-row-sub">{c.targetTitle}</span></td>
                      <td className="adm-nowrap">{c.date}</td>
                      <td className="admin-row-actions">
                        {c.href && <a href={c.href} target="_blank" rel="noopener noreferrer" className="admin-link">View ↗</a>}
                        <form action={setCommentHidden}>
                          <input type="hidden" name="id" value={c.id} /><input type="hidden" name="hidden" value={c.hidden ? '0' : '1'} />
                          <SubmitButton pendingLabel="…" className="admin-link">{c.hidden ? 'Show' : 'Hide'}</SubmitButton>
                        </form>
                        <DeleteButton action={deleteComment} id={c.id} label={`comment by ${c.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'inbox' && (
        <>
          <section className="adm-card adm-tab-panel">
            <div className="adm-card-head">
              <h2>Messages <span className="admin-count">{inbox.messages.length}</span></h2>
            </div>
            {inbox.messages.length === 0 ? <p className="adm-empty">No messages yet. They’ll appear here when someone uses the contact form.</p> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>From</th><th>Message</th><th>Date</th><th /></tr></thead>
                  <tbody>
                    {inbox.messages.map((m) => (
                      <tr key={m.id}>
                        <td className="adm-nowrap"><span className="admin-row-title">{m.name}</span><span className="adm-row-sub">{m.email}</span></td>
                        <td className="adm-message"><MessageDialog message={m} deleteAction={deleteMessage} /></td>
                        <td className="adm-nowrap">{m.date}</td>
                        <td className="admin-row-actions">
                          <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message')}`} className="admin-link">Reply</a>
                          <DeleteButton action={deleteMessage} id={m.id} label={`message from ${m.name}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="adm-card adm-tab-panel">
            <div className="adm-card-head">
              <h2>Newsletter subscribers <span className="admin-count">{inbox.subscribers.length}</span></h2>
              {inbox.subscribers.length > 0 && <CopyButton text={inbox.subscribers.map((x) => x.email).join(', ')} label="Copy all emails" />}
            </div>
            {inbox.subscribers.length === 0 ? <p className="adm-empty">No subscribers yet.</p> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Email</th><th>Subscribed</th><th /></tr></thead>
                  <tbody>
                    {inbox.subscribers.map((x) => (
                      <tr key={x.id}>
                        <td><a href={`mailto:${x.email}`} className="admin-row-title">{x.email}</a></td>
                        <td className="adm-nowrap">{x.date}</td>
                        <td className="admin-row-actions"><DeleteButton action={deleteSubscriber} id={x.id} label={x.email} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
