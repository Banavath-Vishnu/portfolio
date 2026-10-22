import { requireAdmin } from '@/lib/admin';
import { getCategories } from '@/lib/content';
import PostForm from '@/components/admin/PostForm';

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <PostForm heading={{ eyebrow: 'Posts', title: 'New post' }} topics={await getCategories('post')} />
  );
}
