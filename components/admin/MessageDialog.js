'use client';

import { useRef } from 'react';
import DeleteButton from './DeleteButton';
import CopyButton from './CopyButton';

// Inbox message: a short preview in the table that opens the full message in a pop-up.
// Uses the native <dialog> (focus handling, Esc to close); clicking outside the card closes it too.
export default function MessageDialog({ message, deleteAction }) {
  const ref = useRef(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();
  const reply = `mailto:${message.email}?subject=${encodeURIComponent('Re: your message')}`;

  return (
    <>
      <button type="button" className="adm-msg-preview" onClick={open} title="Open message">
        {message.message}
      </button>
      <button type="button" className="admin-link adm-msg-open" onClick={open}>Open</button>

      <dialog ref={ref} className="adm-dialog" aria-labelledby={`msg-${message.id}-title`}
        onClick={(e) => { if (e.target === ref.current) close(); }}>
        <div className="adm-dialog-card">
          <header className="adm-dialog-head">
            <div className="adm-dialog-from">
              <span className="adm-avatar" aria-hidden="true">{message.name.trim().charAt(0).toUpperCase() || '?'}</span>
              <div>
                <h2 id={`msg-${message.id}-title`}>{message.name}</h2>
                <a href={`mailto:${message.email}`} className="adm-row-sub">{message.email}</a>
              </div>
            </div>
            <div className="adm-dialog-meta">
              <span className="admin-hint">{message.date}</span>
              <button type="button" className="adm-dialog-close" onClick={close} aria-label="Close">×</button>
            </div>
          </header>
          <div className="adm-dialog-body">{message.message}</div>
          <footer className="adm-dialog-foot">
            <DeleteButton action={deleteAction} id={message.id} label={`message from ${message.name}`} className="adm-btn adm-btn--danger" />
            <div className="adm-dialog-actions">
              <CopyButton text={message.message} label="Copy message" className="adm-btn" />
              <a href={reply} className="adm-btn adm-btn--primary">Reply ↗</a>
            </div>
          </footer>
        </div>
      </dialog>
    </>
  );
}
