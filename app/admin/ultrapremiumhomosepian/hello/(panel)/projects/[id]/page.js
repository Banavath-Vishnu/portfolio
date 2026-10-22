import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { getProjectById, getCategories } from '@/lib/content';
import { ADMIN_PATH } from '@/lib/adminPath';
import ProjectForm from '@/components/admin/ProjectForm';

const NOTICES = { saved: 'Draft saved. The live site is unchanged until you publish.', discarded: 'Pending changes discarded.' };

export default async function EditProjectPage({ params, searchParams }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [project, filters] = await Promise.all([Number(id) ? getProjectById(Number(id)) : null, getCategories('project')]);
  if (!project) notFound();
  const notice = sp?.saved ? NOTICES.saved : sp?.discarded ? NOTICES.discarded : null;

  return (
    // Keyed on state so the form reloads after a discard instead of keeping the old draft text.
    <ProjectForm
      key={`${project.hasDraft}-${project.name}-${project.slug}-${project.content.length}-${sp?.discarded ?? ''}`}
      project={project}
      filters={filters}
      heading={{ eyebrow: 'Projects', title: 'Edit project', previewHref: `${ADMIN_PATH}/preview/projects/${project.id}` }}
      notice={notice}
      alert={sp?.error === 'slug' ? 'Couldn’t publish: another project already uses this slug. Change it and save again.' : null}
    />
  );
}
