// Sends one visitor action to Google Analytics 4 and Microsoft Clarity (whichever are switched on).
// Safe to call anywhere in the browser: does nothing when neither tool is loaded.
//   track('share', { method: 'linkedin', content_type: 'post', item_id: 'my-slug' })
// In HTML, add data-track="event_name" (+ optional data-track-label="…") to a link or button instead —
// components/Analytics.js reports those clicks automatically.
export function track(name, params = {}) {
  if (typeof window === 'undefined') return;
  try { window.gtag?.('event', name, params); } catch { /* blocked by an extension */ }
  try { window.clarity?.('event', name); } catch { /* blocked by an extension */ }
}
