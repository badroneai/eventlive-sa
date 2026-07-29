// EventLive — single source of truth for "does this event span more than
// one Riyadh calendar day" and the visible Arabic range label that must
// appear on every non-ended event card when it does (WO-7).
//
// homeEventCard already had this multi-day predicate + "من X إلى Y" label
// inline (from the trust sprint); eventCard (the renderer used by every
// facet/temporal page — cities, categories, audiences, this-week,
// this-month, today-events, weekend, tomorrow, and the SEO/search-intent
// guide pages) never had it, so an upcoming multi-day event only ever
// showed its bare start date there. That gap is exactly what this WO
// fixes. Both server-side renderers in scripts/generate-site.mjs now
// import from here instead of each keeping their own copy.
//
// The vanilla-JS client-side card renderers baked directly into the
// committed dist/events.html, dist/today.html, and dist/my-events.html
// shells (no bundler, no ES module import — see WO-3's riyadhDayKey
// precedent in dist/today.html) port an equivalent predicate + label by
// hand. Keep them in sync with this module and with each other.

import { riyadhDateKey } from './riyadh-date-utils.mjs';

// Tolerant of missing/invalid dates: any event without two resolvable
// Riyadh calendar-day keys is treated as NOT multi-day (never throws, never
// false-positives a card into showing a range it can't back up).
export function isMultiDayEvent(event) {
  if (!event) return false;
  const startKey = riyadhDateKey(event.starts_at);
  const endKey = riyadhDateKey(event.ends_at);
  if (!startKey || !endKey) return false;
  return startKey !== endKey;
}

function defaultFormatShortDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Riyadh'
  }).format(date);
}

// formatShortDate is injectable so callers that already own a day+month
// Arabic formatter (generate-site.mjs's formatShortDate) reuse it instead
// of this module keeping a second copy of the same Intl call — there must
// be exactly one place that decides what "12 أغسطس" looks like.
//
// Wording intentionally matches homeEventCard's existing "من X إلى Y"
// convention: locales/en-SA-static.json / generate-localized-site.mjs
// already carries a pattern that turns it into "From X to Y" once month
// names are swapped to English, so this label needs no new translation
// entries as long as the wording here never changes.
export function eventDateRangeLabel(event, formatShortDate = defaultFormatShortDate) {
  if (!isMultiDayEvent(event)) return '';
  const startLabel = formatShortDate(event.starts_at);
  const endLabel = formatShortDate(event.ends_at);
  if (!startLabel || !endLabel) return '';
  return `من ${startLabel} إلى ${endLabel}`;
}
