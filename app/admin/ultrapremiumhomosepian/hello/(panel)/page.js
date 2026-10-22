import { requireAdmin } from '@/lib/admin';
import { dbAvailable } from '@/lib/db';
import { mediaConfigured } from '@/lib/media';
import { getAllPostsForAdmin, getAllProjectsForAdmin, getInbox, getCommentsForAdmin } from '@/lib/content';
import PageHeader from '@/components/admin/PageHeader';
import DashboardView, { NewButtons } from '@/components/admin/DashboardView';
import { ADMIN_PATH } from '@/lib/adminPath';

const NOTICES = {
  'saved=post': 'Post saved.',
  'deleted=post': 'Post deleted.',
  'saved=project': 'Project saved.',
  'deleted=project': 'Project deleted.',
  'published=post': 'Post published — it’s live now.',
  'scheduled=post': 'Post scheduled — it goes live automatically at the time you set.',
  'published=project': 'Project published — it’s live now.',
  'unpublished=post': 'Post unpublished.',
  'unpublished=project': 'Project unpublished.',
  'deleted=message': 'Message deleted.',
  'deleted=subscriber': 'Subscriber removed.',
  'hidden=comment': 'Comment hidden from the site.',
  'shown=comment': 'Comment is visible again.',
  'deleted=comment': 'Comment deleted (with its replies).',
};


export default async function AdminDashboard({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const notice = Object.entries(NOTICES).find(([k]) => { const [key, val] = k.split('='); return sp?.[key] === val; })?.[1];

  if (!(await dbAvailable())) {
    return (
      <div className="admin-stack">
        <PageHeader eyebrow="Overview" title="Dashboard"><NewButtons /></PageHeader>
        <div className="admin-alert">
          <strong>No database connected.</strong> The D1 binding <code>DB</code> isn’t available. Set <code>CF_D1_DATABASE_ID</code> in
          <code>.env.local</code>, run <code>npm run cf:config</code>, and restart (or redeploy). See the README’s Cloudflare section.
        </div>
      </div>
    );
  }

  let posts, projects, inbox, comments;
  try {
    [posts, projects, inbox, comments] = await Promise.all([getAllPostsForAdmin(), getAllProjectsForAdmin(), getInbox(), getCommentsForAdmin()]);
  } catch (err) {
    // Shown in full here: production builds hide server error messages, and this page is admin-only.
    return (
      <div className="admin-stack">
        <PageHeader eyebrow="Overview" title="Dashboard"><NewButtons /></PageHeader>
        <div className="admin-alert admin-alert--error">
          <strong>Couldn’t reach the database.</strong>
          <code>{err.message}</code>
          <span>Check <code>CF_D1_DATABASE_ID</code> / <code>CF_D1_DATABASE_NAME</code> in <code>.env.local</code>, run <code>npm run cf:config</code>,
            and redeploy. Locally, run <code>npm run check</code> to test the setup.</span>
        </div>
      </div>
    );
  }

  const tab = ['posts', 'projects', 'comments', 'inbox'].includes(sp?.tab) ? sp.tab : 'all';
  return <DashboardView posts={posts} projects={projects} inbox={inbox} comments={comments} notice={notice} tab={tab} blobReady={mediaConfigured()} />;
}
