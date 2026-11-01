'use client';

// Server action form with a confirm step to discard draft changes.
export default function DiscardButton({
  action,
  id,
  label,
  live = true,
  returnTo = 'dashboard',
  className = 'admin-link admin-link--warn',
  children = 'Discard draft',
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = live
          ? `Discard pending draft changes for “${label}”? This will revert to the live version.`
          : `Discard draft “${label}”?`;
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <button type="submit" className={className}>{children}</button>
    </form>
  );
}

