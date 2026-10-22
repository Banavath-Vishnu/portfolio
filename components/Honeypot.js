// Spam trap for public forms: a field people never see. Bots that fill in every field fill this one too, and
// their submission is quietly dropped (app/actions.js). It's named and labelled so that AI agents filling in a
// form for someone (e.g. a recruiter's assistant) read "leave this empty" and skip it, instead of losing the message.
export default function Honeypot() {
  return (
    <label className="hp-field" aria-hidden="true">
      Leave this field empty (spam protection)
      <input type="text" name="leave_empty" tabIndex={-1} autoComplete="off" />
    </label>
  );
}
