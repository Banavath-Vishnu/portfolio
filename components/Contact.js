'use client';

import { useActionState, useEffect, useState } from 'react';
import Honeypot from './Honeypot';
import { track } from '@/lib/track';
import { useFormStatus } from 'react-dom';
import { site } from '@/data/site';
import { sendMessage } from '@/app/actions';
import { ArrowIcon } from './Icons';

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pill pill--white contact-submit" disabled={pending}>
      {pending ? 'Sending…' : 'Send message'}
      <span className="arrow"><ArrowIcon /></span>
    </button>
  );
}

export default function Contact() {
  const [state, action] = useActionState(sendMessage, null);
  // Controlled so the text survives an error (React resets uncontrolled fields after an action).
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const bind = (name) => ({ name, value: f[name], onChange: (e) => setF((s) => ({ ...s, [name]: e.target.value })) });
  useEffect(() => { if (state?.ok) track('generate_lead', { form: 'contact' }); }, [state]);

  return (
    <section id="contact" className="contact">
      <div className="contact-text">
        <span className="eyebrow">CONTACT</span>
        <h2 className="contact-title">let’s<br /><strong>talk.</strong></h2>
        <p>Building something with AI, or need a backend that holds up to a security audit? I’d love to hear about it.</p>
        <a href={`mailto:${site.email}`} className="contact-email" data-track="email_click" data-track-label="contact">{site.email} ↗</a>
      </div>
      <div className="contact-form">
        {state?.ok ? (
          <p className="status" role="status">Message sent — thanks for reaching out! I’ll reply to {f.email || 'you'} soon.</p>
        ) : (
          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" required maxLength={100} autoComplete="name" className="input" {...bind('name')} /></div>
            <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" required maxLength={200} autoComplete="email" className="input" {...bind('email')} /></div>
            <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" rows={5} required minLength={10} maxLength={5000} className="input" {...bind('message')} /></div>
            {/* Hidden from people; bots that fill every field get ignored. */}
            <Honeypot />
            {state?.error && <p className="form-error" role="alert">{state.error}</p>}
            <SendButton />
          </form>
        )}
      </div>
    </section>
  );
}
