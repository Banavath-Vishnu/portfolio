'use client';

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { renderContent, renderMarkdown } from '@/lib/markdown';
import { uploadInlineImage } from '@/app/admin/ultrapremiumhomosepian/hello/actions';
import Prose from '../Prose';

// The write-up editor for posts and projects. Content is Markdown or HTML (switchable per item, sent as
// `contentFormat`), shown as Write / Split / Preview; the preview uses the same renderer as the live site.
// Images: the Image button, pasting a screenshot (Ctrl+V) or dropping files — each uploads to Cloudinary and
// the right Markdown or HTML is inserted at the cursor.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const MD_HELP = [
  ['## Heading', 'headings (linkable)'],
  ['**bold** *italic* ~~strike~~', 'text styles'],
  ['- [ ] task', 'task lists'],
  ['| a | b |', 'tables'],
  ['```js … ```', 'highlighted code'],
  ['```mermaid … ```', 'diagrams'],
  ['$E=mc^2$  $$ … $$', 'math (LaTeX)'],
  ['> [!NOTE]', 'callouts: NOTE, TIP, IMPORTANT, WARNING, CAUTION'],
  ['text[^1] … [^1]: note', 'footnotes'],
  ['![alt](url "caption")', 'images: Image button, paste or drop a screenshot'],
  ['![alt | 50% right](url)', 'image size (small, medium, large, full, 60%, 320px) and place (left, right, center)'],
];

// Click to insert at the cursor (HTML mode). The site's styles cover all of these.
const HTML_SNIPPETS = [
  ['Image + caption', '<figure>\n  <img src="IMAGE_URL" alt="Describe the image">\n  <figcaption>Caption</figcaption>\n</figure>'],
  ['Image right, text wraps', '<figure class="right" style="--w: 45%">\n  <img src="IMAGE_URL" alt="Describe the image">\n  <figcaption>Caption</figcaption>\n</figure>\n<p>Text that flows around the image…</p>'],
  ['Two columns', '<div class="cols">\n  <div>\n    <h3>Left</h3>\n    <p>…</p>\n  </div>\n  <div>\n    <h3>Right</h3>\n    <p>…</p>\n  </div>\n</div>'],
  ['Callout', '<div class="callout">\n  <strong>Note</strong>\n  <p>Something worth highlighting.</p>\n</div>'],
  ['Tip / warning', '<div class="callout tip">\n  <strong>Tip</strong>\n  <p>…</p>\n</div>\n<div class="callout warning">\n  <strong>Warning</strong>\n  <p>…</p>\n</div>'],
  ['YouTube video', '<div class="embed">\n  <iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Video" allowfullscreen></iframe>\n</div>'],
  ['Collapsible section', '<details>\n  <summary>Click to expand</summary>\n  <p>Hidden content…</p>\n</details>'],
  ['Button link', '<p><a class="btn" href="https://example.com">Try it live ↗</a></p>'],
  ['Mermaid diagram', '<pre><code class="language-mermaid">graph LR\n  A[Client] --> B[API] --> C[(Database)]\n</code></pre>'],
];

// "Screenshot 2026-10-18 at 10.42.png" → "Screenshot 2026-10-18 at 10.42"; pasted images are just "image.png".
function altFor(file) {
  const base = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[[\]_"<>|]+/g, ' ').trim();
  return !base || base === 'image' ? 'Screenshot' : base;
}

const Segmented = ({ label, value, options, onChange }) => (
  <div className="adm-seg" role="radiogroup" aria-label={label}>
    {options.map(([v, text]) => (
      <button key={v} type="button" role="radio" aria-checked={value === v} className="adm-seg-btn" onClick={() => onChange(v)}>{text}</button>
    ))}
  </div>
);

export default function ContentEditor({ value, onChange, format, onFormat, placeholder }) {
  const [view, setView] = useState('write');
  const [help, setHelp] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const area = useRef(null);
  const picker = useRef(null);
  // Uploads finish after more typing, so edits always apply to the latest text.
  const latest = useRef(value);
  latest.current = value;
  const html = format === 'html';
  const deferred = useDeferredValue(value);
  const preview = useMemo(
    () => (view === 'write' ? '' : renderContent(deferred || (html ? '<p><em>Nothing to preview yet.</em></p>' : '*Nothing to preview yet.*'), format)),
    [view, deferred, format, html],
  );

  const update = (text) => { latest.current = text; onChange(text); };

  // Puts `text` on its own line at the cursor and moves the cursor after it.
  function insert(text) {
    const cur = latest.current;
    const ta = area.current;
    const at = ta && document.activeElement === ta ? ta.selectionEnd : cur.length;
    const before = cur.slice(0, at);
    const after = cur.slice(at);
    const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trail = after.startsWith('\n') ? '\n' : '\n\n';
    update(before + lead + text + trail + after);
    const caret = (before + lead + text + trail).length;
    requestAnimationFrame(() => { if (ta) { ta.focus(); ta.setSelectionRange(caret, caret); } });
  }

  async function upload(files) {
    const images = [...files].filter((f) => IMAGE_TYPES.includes(f.type));
    if (!images.length) { if (files.length) setError('Only JPG, PNG, WebP, GIF or AVIF images can be added.'); return; }
    setError('');
    if (view === 'preview') setView('write');
    for (const file of images) {
      const alt = altFor(file);
      // A placeholder marks the spot while the upload runs; it's swapped for the real image (or removed on failure).
      const token = html ? `<!-- Uploading ${alt}… -->` : `![Uploading ${alt}…]()`;
      const drop = () => update(latest.current.replace(`${token}\n\n`, '').replace(token, ''));
      insert(token);
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await uploadInlineImage(fd);
        if (res?.url) update(latest.current.replace(token, html ? `<img src="${res.url}" alt="${alt}">` : `![${alt}](${res.url})`));
        else { drop(); setError(res?.error || 'Upload failed.'); }
      } catch {
        drop();
        setError('Upload failed — check your connection and try again.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function switchFormat(next) {
    if (next === format) return;
    if (next === 'html' && latest.current.trim()) {
      // Markdown → HTML can be converted exactly; the other way can't, but Markdown displays HTML as-is.
      const convert = window.confirm('Convert your Markdown to HTML?\n\nOK = convert it (recommended)\nCancel = keep the text as it is');
      if (convert) update(renderMarkdown(latest.current).trim());
    } else if (next === 'markdown' && latest.current.trim()
      && !window.confirm('Switch to Markdown? Your HTML is kept as it is — Markdown shows HTML too, but blank lines and indentation start to matter.')) {
      return;
    }
    onFormat(next);
  }

  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');

  return (
    <div className="field adm-writer">
      <input type="hidden" name="contentFormat" value={format} />
      <div className="adm-writer-bar">
        <Segmented label="Format" value={format} onChange={switchFormat} options={[['markdown', 'Markdown'], ['html', 'HTML']]} />
        <Segmented label="View" value={view} onChange={setView} options={[['write', 'Write'], ['split', 'Split'], ['preview', 'Preview']]} />
        <button type="button" className="admin-tab adm-md-image" onClick={() => picker.current?.click()} disabled={uploading > 0}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-9 9" />
          </svg>
          {uploading ? `Uploading ${uploading}…` : 'Image'}
        </button>
        <input ref={picker} type="file" accept={IMAGE_TYPES.join(',')} multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        <button type="button" className="admin-link adm-writer-help" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
          {help ? 'Hide help' : html ? 'HTML snippets' : 'Markdown help'}
        </button>
      </div>

      {help && (html ? (
        <div className="adm-snippets">
          {HTML_SNIPPETS.map(([label, code]) => (
            <button key={label} type="button" className="adm-chip" onClick={() => insert(code)} title={code}>+ {label}</button>
          ))}
          <span className="admin-hint">Click to insert at the cursor. Classes you can use: <code>cols</code>, <code>callout</code> (<code>tip</code>/<code>warning</code>), <code>embed</code>, <code>btn</code>, and on <code>&lt;figure&gt;</code>: <code>left</code>/<code>right</code> with <code>style=&quot;--w: 40%&quot;</code>. Scripts are removed when the page is shown.</span>
        </div>
      ) : (
        <dl className="admin-cheatsheet">
          {MD_HELP.map(([code, label]) => <div key={code}><dt className="mono">{code}</dt><dd>{label}</dd></div>)}
        </dl>
      ))}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className={`adm-writer-panes is-${view}`}>
        <div className={`adm-md-drop${dragging ? ' is-dragging' : ''}`} hidden={view === 'preview'}
          onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={(e) => { if (hasFiles(e)) { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); } }}>
          <textarea ref={area} name="content" className="input admin-editor mono" value={value} onChange={(e) => update(e.target.value)}
            placeholder={html ? '<h2>Section</h2>\n<p>Write HTML here…</p>' : placeholder} spellCheck={!html}
            aria-label={html ? 'Content (HTML)' : 'Content (Markdown)'}
            onPaste={(e) => {
              const files = [...(e.clipboardData?.files || [])];
              if (files.some((f) => IMAGE_TYPES.includes(f.type))) { e.preventDefault(); upload(files); }
            }} />
          {dragging && <span className="adm-md-drop-hint" aria-hidden="true">Drop images to upload</span>}
        </div>
        {view !== 'write' && <div className="admin-preview adm-writer-preview"><Prose html={preview} /></div>}
      </div>
      <span className="admin-hint">
        Paste a screenshot (Ctrl+V) or drop images on the editor — they upload to Cloudinary.{' '}
        {html ? <>Images go in as <code>&lt;img&gt;</code>; wrap them in a snippet for captions or placement.</>
          : <>Caption: <code>![alt](url &quot;caption&quot;)</code> · size &amp; place: <code>![alt | medium right](url)</code>.</>}
      </span>
    </div>
  );
}
