import { requireAdmin } from '@/lib/admin';
import { logout } from '../actions';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminPanelLayout({ children }) {
  await requireAdmin();
  return (
    <div className="adm-shell">
      <AdminSidebar logout={logout} />
      <main className="adm-main">{children}</main>
    </div>
  );
}
