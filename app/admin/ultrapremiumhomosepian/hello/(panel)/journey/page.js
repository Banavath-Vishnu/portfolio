import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { dbAvailable } from '@/lib/db';
import { getJourneyForAdmin } from '@/lib/content';
import { deleteJourney } from '../../actions';
import { ADMIN_PATH } from '@/lib/adminPath';
import PageHeader from '@/components/admin/PageHeader';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function JourneyAdminPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const header = (
    <PageHeader eyebrow="Site" title="Journey">
      <Link href={`${ADMIN_PATH}/journey/new`} className="adm-btn adm-btn--primary">+ New entry</Link>
    </PageHeader>
  );
  if (!(await dbAvailable())) {
    return <div className="admin-stack">{header}<div className="admin-alert"><strong>No database connected.</strong> The journey timeline is stored in D1.</div></div>;
  }
  const entries = await getJourneyForAdmin();
  const notice = sp?.saved ? 'Saved — it’s live on the homepage.' : sp?.deleted ? 'Entry deleted.' : null;

  return (
    <div className="admin-stack">
      {header}
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <section className="adm-card">
        <div className="adm-card-head">
          <div>
            <h2>Timeline <span className="admin-count">{entries.length}</span></h2>
            <span className="admin-hint">The “How I got here” section on the homepage, top to bottom.</span>
          </div>
        </div>
        {entries.length === 0 ? <p className="adm-empty">No entries yet. The Journey section stays hidden until you add one.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Role</th><th>Type</th><th>Dates</th><th /></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="adm-num">{e.sortOrder}</td>
                    <td>
                      <Link href={`${ADMIN_PATH}/journey/${e.id}`} className="admin-row-title">{e.title}</Link>
                      <span className="adm-row-sub">{e.org}</span>
                    </td>
                    <td>{e.type && <span className="adm-tag">{e.type}</span>}</td>
                    <td className="adm-nowrap">
                      {e.dates}
                      {e.live && <span className="admin-badge is-live adm-inline-badge"><span className="admin-badge-dot" aria-hidden="true" />Now</span>}
                    </td>
                    <td className="admin-row-actions">
                      <Link href={`${ADMIN_PATH}/journey/${e.id}`} className="admin-link">Edit</Link>
                      <DeleteButton action={deleteJourney} id={e.id} label={e.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
