import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { dbAvailable } from '@/lib/db';
import { mediaConfigured } from '@/lib/media';
import { getCertificationsForAdmin } from '@/lib/content';
import { deleteCertification } from '../../actions';
import { ADMIN_PATH } from '@/lib/adminPath';
import PageHeader from '@/components/admin/PageHeader';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function CertificationsAdminPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const header = (
    <PageHeader eyebrow="Site" title="Certifications">
      <Link href={`${ADMIN_PATH}/certifications/new`} className="adm-btn adm-btn--primary">+ New certification</Link>
    </PageHeader>
  );
  if (!(await dbAvailable())) {
    return <div className="admin-stack">{header}<div className="admin-alert"><strong>No database connected.</strong> Certifications are stored in D1.</div></div>;
  }
  const certs = await getCertificationsForAdmin();
  const notice = sp?.saved ? 'Saved — it’s live on the homepage.' : sp?.deleted ? 'Certification deleted.' : null;

  return (
    <div className="admin-stack">
      {header}
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {!mediaConfigured() && (
        <div className="admin-alert"><strong>Image uploads are off.</strong> Add your Cloudinary details to <code>.env.local</code> to attach certificate images.</div>
      )}
      <section className="adm-card">
        <div className="adm-card-head">
          <div>
            <h2>Certifications <span className="admin-count">{certs.length}</span></h2>
            <span className="admin-hint">Shown on the homepage after the Journey section. Hidden while the list is empty.</span>
          </div>
        </div>
        {certs.length === 0 ? <p className="adm-empty">No certifications yet. Add your first one.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th /><th>Certification</th><th>Frame</th><th>Date</th><th>Order</th><th /></tr></thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id}>
                    <td className="adm-thumb-cell">
                      {c.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={c.image} alt="" className="adm-thumb" />
                        : <span className="adm-thumb adm-thumb--empty" aria-hidden="true">✦</span>}
                    </td>
                    <td>
                      <Link href={`${ADMIN_PATH}/certifications/${c.id}`} className="admin-row-title">{c.title}</Link>
                      <span className="adm-row-sub">{c.issuer}</span>
                    </td>
                    <td><span className="adm-tag">{c.orientation === 'landscape' ? 'Landscape' : 'Portrait'}</span></td>
                    <td className="adm-nowrap">{c.issued}</td>
                    <td className="adm-num">{c.sortOrder}</td>
                    <td className="admin-row-actions">
                      <Link href={`${ADMIN_PATH}/certifications/${c.id}`} className="admin-link">Edit</Link>
                      {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="admin-link">Credential ↗</a>}
                      <DeleteButton action={deleteCertification} id={c.id} label={c.title} />
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
