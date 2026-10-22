'use client';

// Server action form with a confirm step, so a stray click can't delete anything.
export default function DeleteButton({ action, id, label, className = 'admin-link admin-link--danger' }) {
  return (
    <form
      action={action}
      onSubmit={(e) => { if (!confirm(`Delete “${label}”? This can't be undone.`)) e.preventDefault(); }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>Delete</button>
    </form>
  );
}
