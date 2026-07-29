// EventLive — single source of truth for the Asia/Riyadh calendar-day key.
// Extracted from scripts/generate-site.mjs (WO-3) so it can be shared with
// scripts/event-priority.mjs without importing the executable build script
// (generate-site.mjs runs the full site build as a side effect of import).
//
// Every "which calendar day (Riyadh time) does this instant fall on" check
// across the codebase must go through this function — do not reimplement it.

export function riyadhDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Riyadh'
  }).format(date);
}
