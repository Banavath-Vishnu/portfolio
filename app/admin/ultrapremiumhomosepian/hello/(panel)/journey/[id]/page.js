import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { getJourneyEntry } from '@/lib/content';
import JourneyForm from '@/components/admin/JourneyForm';

export default async function EditJourneyPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const entry = Number(id) ? await getJourneyEntry(Number(id)) : null;
  if (!entry) notFound();
  return <JourneyForm key={entry.id} entry={entry} title="Edit entry" />;
}
