'use client';

import { useActionState, useEffect, useState } from 'react';
import Honeypot from './Honeypot';
import { track } from '@/lib/track';
import { useFormStatus } from 'react-dom';
import { subscribe } from '@/app/actions';

function SubscribeButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="pill pill--white" disabled={pending}>{pending ? 'Subscribing…' : 'Subscribe'}</button>;
}

export default function Newsletter() {
  const [state, action] = useActionState(subscribe, null);
  const [email, setEmail] = useState('');
  useEffect(() => { if (state?.ok) track('sign_up', { method: 'newsletter' }); }, [state]);

  return (
    <div className="newsletter">
      <div className="newsletter-text">
        <h3>Get new posts <strong>in your inbox</strong></h3>
        <p>New writing on AI systems, backend security and shipping products — straight to your inbox. No spam.</p>
      </div>
      {state?.ok ? (
        <p className="status" role="status">Thanks — you’re on the list.</p>
      ) : (
        <form className="newsletter-form" action={action}>
          <div className="field">
            <label htmlFor="nl-email">Email address</label>
            <input id="nl-email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@example.com" className="input"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Honeypot />
          <SubscribeButton />
          {state?.error && <p className="form-error" role="alert">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
