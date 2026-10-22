import { requireAdmin } from '@/lib/admin';
import { getCategories } from '@/lib/content';
import ProjectForm from '@/components/admin/ProjectForm';

export default async function NewProjectPage() {
  await requireAdmin();
  return (
    <ProjectForm heading={{ eyebrow: 'Projects', title: 'New project' }} filters={await getCategories('project')} />
  );
}
