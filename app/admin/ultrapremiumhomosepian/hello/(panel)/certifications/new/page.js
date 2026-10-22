import { requireAdmin } from '@/lib/admin';
import CertificationForm from '@/components/admin/CertificationForm';

export default async function NewCertificationPage() {
  await requireAdmin();
  return <CertificationForm title="New certification" />;
}
