import Link from 'next/link';
import SubmitButton from './SubmitButton';

// Fixed bar on admin preview pages: shows where the item stands and lets you approve it.
export default function ApprovalBar({ item, editHref, liveHref, publish, discard, unpublish, publishNow }) {
  const { id, hasDraft, live, everPublished, scheduled, publishAt, publishAtLabel } = item;
  // Approving a draft whose publish time is still ahead schedules it instead of publishing now.
  const schedules = Boolean(publishAt && new Date(publishAt) > new Date());
  const state = scheduled && !hasDraft ? { tone: 'scheduled', text: `Scheduled — goes live ${publishAtLabel}.` }
    : live
    ? hasDraft ? { tone: 'pending', text: 'Changes pending — the site still shows the previous version.' }
      : { tone: 'live', text: 'Live — this is what visitors see.' }
    : everPublished ? { tone: 'draft', text: 'Unpublished — hidden from the site.' }
      : { tone: 'draft', text: 'Draft — not on the site yet.' };
  const canPublish = hasDraft || !live;

  return (
    <div className="approval-bar" role="region" aria-label="Preview controls">
      <div className="approval-status">
        <span className={`approval-dot is-${state.tone}`} aria-hidden="true" />
        <strong>Preview</strong>
        <span>{state.text}</span>
      </div>
      <div className="approval-actions">
        <Link href={editHref} className="adm-btn">← Edit</Link>
        {live && !hasDraft && !scheduled && <a href={liveHref} target="_blank" rel="noopener noreferrer" className="adm-btn">View live ↗</a>}
        {live && hasDraft && (
          <form action={discard}><input type="hidden" name="id" value={id} />
            <SubmitButton pendingLabel="Discarding…" className="adm-btn">Discard changes</SubmitButton>
          </form>
        )}
        {live && !hasDraft && (
          <form action={unpublish}><input type="hidden" name="id" value={id} />
            <SubmitButton pendingLabel={scheduled ? 'Cancelling…' : 'Unpublishing…'} className="adm-btn">{scheduled ? 'Cancel schedule' : 'Unpublish'}</SubmitButton>
          </form>
        )}
        {scheduled && !hasDraft && publishNow && (
          <form action={publishNow}><input type="hidden" name="id" value={id} />
            <SubmitButton pendingLabel="Publishing…" className="adm-btn adm-btn--success">Publish now</SubmitButton>
          </form>
        )}
        {canPublish && (
          <form action={publish}><input type="hidden" name="id" value={id} />
            <SubmitButton pendingLabel={schedules ? 'Scheduling…' : 'Publishing…'} className="adm-btn adm-btn--success">
              {schedules ? `${live ? 'Approve changes' : 'Approve'} & schedule · ${publishAtLabel}` : live ? 'Publish changes' : 'Approve & publish'}
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
