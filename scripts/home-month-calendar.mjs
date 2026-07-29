// EventLive — WO-2 "this month" mini calendar strip.
//
// Pure HTML-templating + date math, deliberately free of any import from
// scripts/generate-site.mjs (that file runs the full site build as a
// side effect of import — see scripts/home-board-live.mjs's header comment
// for the same rationale). Keeping this module import-free lets regression
// tests exercise it directly with synthetic fixtures, no build required.
//
// Consumed by BOTH the homepage calendar strip (patchHomePage) and the
// this-month.html day-anchor groups (writeTemporalPages) in
// scripts/generate-site.mjs, called with the SAME `events` array and the
// SAME `reference` timestamp (buildAt) in both places — that shared input
// is what guarantees every homepage `#day-YYYY-MM-DD` link has a matching
// anchor on this-month.html. Do not let the two call sites drift onto
// different reference instants or event sources.
import { riyadhDateKey } from './riyadh-date-utils.mjs';
import { eventCountLabel } from './event-count-label.mjs';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Riyadh-local exclusive end of the current Gregorian month, as a UTC
// instant. Saudi Arabia does not observe DST, so a fixed +03:00 offset is
// safe year-round — do not swap this for a generic UTC month boundary,
// which silently drifts the last Riyadh calendar day by up to 3 hours.
export function riyadhMonthEndExclusive(reference = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Riyadh'
  }).formatToParts(new Date(reference));
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+03:00`).getTime();
}

// Every Riyadh calendar day from `reference`'s day (inclusive) through the
// last day of that same Gregorian month, each carrying the non-ended events
// from `events` whose starts_at falls on that day. Always returns at least
// one day (today), even on the last day of the month — the calendar strip
// never has zero days to render, only days with zero events. `events` does
// not need pre-filtering to the month; membership is derived purely from
// which day-bucket each event's start date lands in.
export function remainingMonthDays(events = [], reference = Date.now()) {
  const monthEnd = riyadhMonthEndExclusive(reference);
  const todayKey = riyadhDateKey(reference);
  const byDay = new Map();
  for (const event of events || []) {
    if (!event || event.status === 'ended') continue;
    const start = new Date(event.starts_at || '');
    if (Number.isNaN(start.getTime())) continue;
    const key = riyadhDateKey(start);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(event);
  }
  const days = [];
  let cursor = new Date(`${todayKey}T00:00:00+03:00`).getTime();
  if (Number.isNaN(cursor)) return days;
  while (cursor < monthEnd) {
    const key = riyadhDateKey(cursor);
    const dayEvents = (byDay.get(key) || [])
      .slice()
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    days.push({ key, date: new Date(cursor), events: dayEvents });
    cursor += 24 * 60 * 60 * 1000;
  }
  return days;
}

// Static, zero-JS mini calendar row. Days with events are links (to the
// matching this-month.html day anchor) carrying an accessible label built
// from eventCountLabel() (correct Arabic count agreement); days with none
// render as a plain, unlinked cell with just the day number — this is the
// "render remaining days without event dots" degrade path (see WO-2 PR
// notes for why we always render every remaining day rather than hiding
// the strip: `days` is never empty, so there is nothing to hide it for).
export function homeCalendarStrip(days = []) {
  if (!days.length) return '';
  const cells = days.map((day) => {
    const count = day.events.length;
    const dayNumber = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', timeZone: 'Asia/Riyadh' }).format(day.date);
    if (!count) {
      return `<span class="cal-day" data-day="${escapeHtml(day.key)}"><b>${escapeHtml(dayNumber)}</b></span>`;
    }
    const monthName = new Intl.DateTimeFormat('ar-SA', { month: 'long', timeZone: 'Asia/Riyadh' }).format(day.date);
    const label = `${dayNumber} ${monthName} · ${eventCountLabel(count)}`;
    return `<a class="cal-day has-events" data-day="${escapeHtml(day.key)}" href="./this-month.html#day-${escapeHtml(day.key)}" aria-label="${escapeHtml(label)}"><b>${escapeHtml(dayNumber)}</b><span class="cal-dot" aria-hidden="true"></span></a>`;
  }).join('\n        ');
  return `<div class="cal-strip" role="list" aria-label="أيام الشهر المتبقية">
        ${cells}
      </div>`;
}
