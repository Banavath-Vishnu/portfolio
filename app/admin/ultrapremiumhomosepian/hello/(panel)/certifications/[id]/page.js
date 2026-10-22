import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { getCertification } from '@/lib/content';
import CertificationForm from '@/components/admin/CertificationForm';

export default async function EditCertificationPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const cert = Number(id) ? await getCertification(Number(id)) : null;
  if (!cert) notFound();
  return <CertificationForm key={cert.id} cert={cert} title="Edit certification" />;
}
