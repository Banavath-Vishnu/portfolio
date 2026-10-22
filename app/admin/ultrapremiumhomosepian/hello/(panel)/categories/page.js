import { requireAdmin } from '@/lib/admin';
import { dbAvailable } from '@/lib/db';
import { getCategoriesForAdmin } from '@/lib/content';
import { addCategory, renameCategory, moveCategory, deleteCategory } from '../../actions';
import PageHeader from '@/components/admin/PageHeader';
import DeleteButton from '@/components/admin/DeleteButton';

const GROUPS = [
  { kind: 'project', title: 'Project categories', hint: 'The filter tabs above the projects on the homepage.', unit: 'project' },
  { kind: 'post', title: 'Blog topics', hint: 'The topic tabs on /blog and the tag on each post.', unit: 'post' },
];

function message(sp) {
  if (sp?.added) return { text: `Added “${sp.added}”.` };
  if (sp?.renamed) return { text: `Renamed to “${sp.renamed}” — everything using it was updated.` };
  if (sp?.deleted) return { text: `Deleted “${sp.deleted}”.` };
  if (sp?.error === 'empty') return { error: true, text: 'A category needs a name.' };
  if (sp?.error === 'exists') return { error: true, text: `“${sp.name}” already exists.` };
  if (sp?.error === 'inuse') {
    const unit = sp.kind === 'post' ? 'post' : 'project';
    return { error: true, text: `“${sp.name}” is used by ${sp.n} ${unit}${sp.n === '1' ? '' : 's'}. Move ${sp.n === '1' ? 'it' : 'them'} to another category first.` };
  }
  return null;
}

export default async function CategoriesPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const header = <PageHeader eyebrow="Site" title="Categories" />;
  if (!(await dbAvailable())) {
    return <div className="admin-stack">{header}<div className="admin-alert"><strong>No database connected.</strong> Categories are stored in D1.</div></div>;
  }
  const cats = await getCategoriesForAdmin();
  const note = message(sp);

  return (
    <div className="admin-stack">
      {header}
      {note && <p className={note.error ? 'admin-alert admin-alert--error' : 'admin-notice'} role={note.error ? 'alert' : 'status'}>{note.text}</p>}
      <p className="admin-hint">Changes go live right away. Renaming a category renames it on every post or project that uses it.</p>

      <div className="adm-cat-grid">
        {GROUPS.map((g) => (
          <section key={g.kind} className="adm-card">
            <div className="adm-card-head">
              <div>
                <h2>{g.title} <span className="admin-count">{cats[g.kind].length}</span></h2>
                <span className="admin-hint">{g.hint}</span>
              </div>
            </div>

            {cats[g.kind].length === 0 ? <p className="adm-empty">No categories yet. Add one below.</p> : (
              <ul className="adm-cat-list">
                {cats[g.kind].map((c, i, all) => (
                  <li key={c.id} className="adm-cat-row">
                    <form action={moveCategory} className="adm-cat-move">
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" name="dir" value="up" className="adm-icon-btn" disabled={i === 0} aria-label={`Move ${c.name} up`}>↑</button>
                      <button type="submit" name="dir" value="down" className="adm-icon-btn" disabled={i === all.length - 1} aria-label={`Move ${c.name} down`}>↓</button>
                    </form>
                    <form action={renameCategory} className="adm-cat-rename">
                      <input type="hidden" name="id" value={c.id} />
                      <input name="name" defaultValue={c.name} maxLength={40} required className="input" aria-label={`Rename ${c.name}`} />
                      <button type="submit" className="adm-btn adm-btn--sm">Rename</button>
                    </form>
                    <span className="adm-cat-used">{c.used} {g.unit}{c.used === 1 ? '' : 's'}</span>
                    <DeleteButton action={deleteCategory} id={c.id} label={c.name} />
                  </li>
                ))}
              </ul>
            )}

            <form action={addCategory} className="adm-cat-add">
              <input type="hidden" name="kind" value={g.kind} />
              <input name="name" maxLength={40} required className="input" placeholder={g.kind === 'post' ? 'e.g. Tutorials' : 'e.g. Mobile'} aria-label={`New ${g.title.toLowerCase()}`} />
              <button type="submit" className="adm-btn adm-btn--primary">+ Add</button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
