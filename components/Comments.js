'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Honeypot from './Honeypot';
import { useRouter } from 'next/navigation';
import { postComment } from '@/app/actions';
import { LogoMark } from './Icons';
import { track } from '@/lib/track';

// Comments under a post or project. Anyone can comment (name required, email optional and never shown)
// and reply; replies stay one level deep. Comments appear right away. Your name/email are remembered in
// this browser for next time. When you're logged in as admin, you comment as the site author.

const REMEMBER = 'comment-author';
const readRemembered = () => { try { return JSON.parse(localStorage.getItem(REMEMBER)) || {}; } catch { return {}; } };

function CommentForm({ targetType, targetId, parentId, author, authorName, onDone, autoFocus, compact }) {
  const [state, action, pending] = useActionState(postComment, null);
  const [who, setWho] = useState({ name: '', email: '' });
  const [body, setBody] = useState('');
  const router = useRouter();
  const box = useRef(null);

  useEffect(() => { const r = readRemembered(); setWho({ name: r.name || '', email: r.email || '' }); }, []);
  useEffect(() => { if (autoFocus) box.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    if (!state?.ok) return;
    track('comment_post', { content_type: targetType, reply: Boolean(parentId) });
    setBody('');
    if (!author) { try { localStorage.setItem(REMEMBER, JSON.stringify(who)); } catch { /* private mode */ } }
    router.refresh(); // pull in the new comment
    onDone?.(state.id);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={action} className={`cm-form${compact ? ' cm-form--reply' : ''}`}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <Honeypot />
      {author ? (
        <p className="cm-as">Commenting as <strong>{authorName}</strong> <span className="cm-badge">Author</span></p>
      ) : (
        <div className="cm-fields">
          <input name="name" required maxLength={60} placeholder="Name *" aria-label="Name" className="cm-input" autoComplete="name"
            value={who.name} onChange={(e) => setWho((w) => ({ ...w, name: e.target.value }))} />
          <input name="email" type="email" maxLength={200} placeholder="Email (optional, never shown)" aria-label="Email (optional)" className="cm-input" autoComplete="email"
            value={who.email} onChange={(e) => setWho((w) => ({ ...w, email: e.target.value }))} />
        </div>
      )}
      <textarea ref={box} name="body" required maxLength={2000} rows={compact ? 3 : 4} className="cm-input cm-textarea"
        placeholder={parentId ? 'Write a reply…' : 'Share your thoughts…'} aria-label={parentId ? 'Reply' : 'Comment'}
        value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="cm-form-foot">
        {state?.error ? <p className="cm-error" role="alert">{state.error}</p> : <span className="cm-hint">{body.length > 1700 ? `${2000 - body.length} characters left` : ''}</span>}
        <div className="cm-form-actions">
          {onDone && compact && <button type="button" className="cm-link" onClick={() => onDone(null)}>Cancel</button>}
          <button type="submit" className="pill pill--white cm-submit" disabled={pending || body.trim().length < 2}>
            {pending ? 'Posting…' : parentId ? 'Reply' : 'Post comment'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Comment({ c, children }) {
  return (
    <div className="cm-item" id={`comment-${c.id}`}>
      <span className={`cm-avatar${c.isAuthor ? ' is-author' : ''}`} aria-hidden="true">{c.isAuthor ? <LogoMark size={18} /> : c.name.trim().charAt(0).toUpperCase()}</span>
      <div className="cm-main">
        <div className="cm-head">
          <strong className="cm-name">{c.name}</strong>
          {c.isAuthor && <span className="cm-badge">Author</span>}
          <span className="cm-date">{c.date}</span>
        </div>
        <p className="cm-body">{c.body}</p>
        {children}
      </div>
    </div>
  );
}

export default function Comments({ targetType, targetId, comments, author = false, authorName }) {
  const [replyTo, setReplyTo] = useState(null);
  const [flash, setFlash] = useState(null);
  const total = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  // After posting, briefly highlight the new comment once it's on the page.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`comment-${flash}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('is-new'); }
      setFlash(null);
    }, 500);
    return () => clearTimeout(t);
  }, [flash, comments]);

  const shared = { targetType, targetId, author, authorName };

  return (
    <section id="comments" className="section cm" aria-labelledby="comments-title">
      <h2 id="comments-title" className="cm-title">Comments <span className="cm-count">{total}</span></h2>
      <CommentForm {...shared} onDone={(id) => id && setFlash(id)} />

      {comments.length === 0 ? (
        <p className="cm-empty">No comments yet — start the conversation.</p>
      ) : (
        <ol className="cm-list">
          {comments.map((c) => (
            <li key={c.id}>
              <Comment c={c}>
                <button type="button" className="cm-link" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} aria-expanded={replyTo === c.id}>
                  {replyTo === c.id ? 'Cancel' : 'Reply'}
                </button>
                {c.replies.length > 0 && (
                  <ol className="cm-replies">
                    {c.replies.map((r) => (
                      <li key={r.id}>
                        <Comment c={r}>
                          <button type="button" className="cm-link" onClick={() => setReplyTo(c.id)}>Reply</button>
                        </Comment>
                      </li>
                    ))}
                  </ol>
                )}
                {replyTo === c.id && (
                  <CommentForm {...shared} parentId={c.id} compact autoFocus
                    onDone={(id) => { setReplyTo(null); if (id) setFlash(id); }} />
                )}
              </Comment>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
