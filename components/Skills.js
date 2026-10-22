import { skillGroups } from '@/data/site';

export default function Skills() {
  return (
    <section id="skills" className="section">
      <div className="heading heading--center">
        <span className="eyebrow">SKILLS</span>
        <h2 className="h2">The tools <strong>I build with</strong></h2>
      </div>
      <div className="skills-grid">
        {skillGroups.map((g) => (
          <div key={g.title} className="card lift skill-card">
            <div className="skill-head"><h3>{g.title}</h3><span className="skill-num mono">{g.num}</span></div>
            <div className="chips">{g.items.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
