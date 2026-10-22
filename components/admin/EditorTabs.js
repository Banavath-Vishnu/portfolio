'use client';

import { useEffect, useState } from 'react';

// Details / Write tabs for the post and project editors. Both panes stay in the same <form> (the hidden one is
// just not shown), so saving always sends everything. The last tab you used is remembered for this browser tab,
// and Ctrl/Cmd+S saves a draft from anywhere in the editor.

const KEY = 'adm-editor-tab';

export function useEditorTab(isNew) {
  const [tab, setTabState] = useState(isNew ? 'details' : 'write');
  useEffect(() => {
    if (isNew) return;
    try { const saved = sessionStorage.getItem(KEY); if (saved === 'details' || saved === 'write') setTabState(saved); } catch { /* storage blocked */ }
  }, [isNew]);
  const setTab = (t) => { setTabState(t); try { sessionStorage.setItem(KEY, t); } catch { /* storage blocked */ } };
  return [tab, setTab];
}

export function useSaveShortcut(formRef) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const form = formRef.current;
        form?.requestSubmit(form.querySelector('button[name="intent"][value="draft"]') || undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formRef]);
}

const Icon = ({ d }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export default function EditorTabs({ tab, onTab, words, missing }) {
  const tabs = [
    { key: 'details', label: 'Details', note: missing ? 'needs a title' : 'title, summary, publishing, images', icon: 'M4 6h16M4 12h16M4 18h10' },
    { key: 'write', label: 'Write', note: `${words.toLocaleString('en-US')} word${words === 1 ? '' : 's'}`, icon: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4' },
  ];
  return (
    <div className="adm-etabs adm-editor-full" role="tablist" aria-label="Editor sections">
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`adm-etab${missing && t.key === 'details' ? ' has-issue' : ''}`} onClick={() => onTab(t.key)}>
          <Icon d={t.icon} />
          <span className="adm-etab-label">{t.label}</span>
          <span className="adm-etab-note">{t.note}</span>
        </button>
      ))}
      <span className="adm-etabs-hint admin-hint">Ctrl+S saves a draft</span>
    </div>
  );
}

export const wordCount = (text) => (text || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
