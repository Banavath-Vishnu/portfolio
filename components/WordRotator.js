'use client';

import { useEffect, useState } from 'react';

// Cycles through words for the hero line ("I build …"); each new word slides up into place.
// Works for any number of words. Screen readers get the full list from the sr-only text in Hero.
export default function WordRotator({ words, interval = 2200 }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);

  return (
    <span className="word-mask" aria-hidden="true">
      <span key={i} className="word-current">{words[i]}</span>
    </span>
  );
}
