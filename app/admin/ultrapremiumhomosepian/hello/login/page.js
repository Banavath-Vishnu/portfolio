import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { ADMIN_PATH } from '@/lib/adminPath';
import LoginForm from '@/components/admin/LoginForm';
import ThemeToggle from '@/components/ThemeToggle';
import { LogoMark } from '@/components/Icons';

export default async function LoginPage() {
  if (await isAdmin()) redirect(ADMIN_PATH);
  return (
    <main className="admin-login">
      <div className="admin-login-top">
        <a href="/" className="admin-link">← Back to site</a>
        <ThemeToggle />
      </div>
      <div className="admin-login-card">
        <span className="adm-brand-mark adm-brand-mark--lg"><LogoMark /></span>
        <div className="admin-login-head">
          <h1 className="admin-title">Welcome back</h1>
          <p className="admin-hint">Sign in to manage your posts and projects.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
