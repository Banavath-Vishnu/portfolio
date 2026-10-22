'use client';

import { useState } from 'react';

// Copies text (e.g. all subscriber emails) to the clipboard and briefly confirms.
export default function CopyButton({ text, label = 'Copy', className = 'adm-btn adm-btn--sm' }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {}
  }
  return <button type="button" className={className} onClick={copy}>{done ? 'Copied ✓' : label}</button>;
}
