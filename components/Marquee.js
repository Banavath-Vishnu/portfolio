import { marquee } from '@/data/site';

export default function Marquee() {
  const items = [...marquee, ...marquee];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map((m, i) => <span key={i} className="marquee-item">{m} <span>✦</span></span>)}
      </div>
    </div>
  );
}
