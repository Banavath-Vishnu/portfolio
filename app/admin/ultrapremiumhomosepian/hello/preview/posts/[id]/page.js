import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PostArticle from '@/components/PostArticle';
import ApprovalBar from '@/components/admin/ApprovalBar';
import { requireAdmin } from '@/lib/admin';
import { getPostById } from '@/lib/content';
import { ADMIN_PATH } from '@/lib/adminPath';
import { publishPost, publishPostNow, discardPostDraft, unpublishPost } from '../../../actions';

// Shows the draft exactly as the public post page will, with approve/publish controls.
export default async function PostPreviewPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const post = Number(id) ? await getPostById(Number(id)) : null;
  if (!post) notFound();

  return (
    <div className="preview-page">
      <Navbar />
      <main id="top" className="container" style={{ maxWidth: 820 }}>
        <PostArticle post={post} />
      </main>
      <Footer />
      <ApprovalBar item={post} editHref={`${ADMIN_PATH}/posts/${post.id}`} liveHref={`/blog/${post.slug}`}
        publish={publishPost} publishNow={publishPostNow} discard={discardPostDraft} unpublish={unpublishPost} />
    </div>
  );
}
