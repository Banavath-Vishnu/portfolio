import { requireAdmin } from '@/lib/admin';
import JourneyForm from '@/components/admin/JourneyForm';

export default async function NewJourneyPage() {
  await requireAdmin();
  return <JourneyForm title="New entry" />;
}
