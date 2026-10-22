'use client';

import { useFormStatus } from 'react-dom';

// With name/value set, only the button that was clicked shows its pending label.
export default function SubmitButton({ children, pendingLabel = 'Saving…', className = 'adm-btn adm-btn--primary', name, value }) {
  const { pending, data } = useFormStatus();
  const mine = pending && (!name || data?.get(name) === value);
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {mine ? pendingLabel : children}
    </button>
  );
}
