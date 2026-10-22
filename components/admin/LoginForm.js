'use client';

import { useActionState, useState } from 'react';
import { login } from '@/app/admin/ultrapremiumhomosepian/hello/actions';
import SubmitButton from './SubmitButton';

export default function LoginForm() {
  const [state, action] = useActionState(login, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="admin-form">
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="adm-password">
          <input id="password" name="password" type={show ? 'text' : 'password'} required autoComplete="current-password" autoFocus className="input" />
          <button type="button" className="adm-password-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {state?.error && <p className="admin-error" role="alert">{state.error}</p>}
      <SubmitButton pendingLabel="Signing in…" className="adm-btn adm-btn--primary adm-btn--block">Sign in</SubmitButton>
    </form>
  );
}
