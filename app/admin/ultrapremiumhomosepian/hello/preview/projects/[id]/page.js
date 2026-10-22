import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProjectArticle from '@/components/ProjectArticle';
import ApprovalBar from '@/components/admin/ApprovalBar';
import { requireAdmin } from '@/lib/admin';
import { getProjectById, getProjects } from '@/lib/content';
import { ADMIN_PATH } from '@/lib/adminPath';
import { publishProject, discardProjectDraft, unpublishProject } from '../../../actions';

// Shows the draft exactly as the public project page will, with approve/publish controls.
export default async function ProjectPreviewPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const project = Number(id) ? await getProjectById(Number(id)) : null;
  if (!project) notFound();
  const more = (await getProjects()).filter((p) => p.id !== project.id).slice(0, 3);

  return (
    <div className="preview-page">
      <Navbar />
      <main id="top" className="container">
        <ProjectArticle project={project} more={more} />
      </main>
      <Footer />
      <ApprovalBar item={project} editHref={`${ADMIN_PATH}/projects/${project.id}`} liveHref={`/projects/${project.slug}`}
        publish={publishProject} discard={discardProjectDraft} unpublish={unpublishProject} />
    </div>
  );
}
