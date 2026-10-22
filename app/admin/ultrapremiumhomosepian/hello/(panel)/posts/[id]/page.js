import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { getPostById, getCategories } from '@/lib/content';
import { ADMIN_PATH } from '@/lib/adminPath';
import PostForm from '@/components/admin/PostForm';

const NOTICES = { saved: 'Draft saved. The live site is unchanged until you publish.', discarded: 'Pending changes discarded.' };

export default async function EditPostPage({ params, searchParams }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [post, topics] = await Promise.all([Number(id) ? getPostById(Number(id)) : null, getCategories('post')]);
  if (!post) notFound();
  const notice = sp?.saved ? NOTICES.saved : sp?.discarded ? NOTICES.discarded : null;

  return (
    // Keyed on state so the form reloads after a discard instead of keeping the old draft text.
    <PostForm
      key={`${post.hasDraft}-${post.updatedAt}`}
      post={post}
      topics={topics}
      heading={{ eyebrow: 'Posts', title: 'Edit post', previewHref: `${ADMIN_PATH}/preview/posts/${post.id}` }}
      notice={notice}
      alert={sp?.error === 'slug' ? 'Couldn’t publish: another post already uses this slug. Change it and save again.' : null}
    />
  );
}
