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
//
// a11y-prod-pipeline-fix: the container is a real <ul> and every cell is
// wrapped in a real <li> (class "cal-cell") — axe's aria-required-children
// rule flags ANY role="list" element whose direct children aren't
// listitems, and the original WO-2 markup put role="list" straight on a
// <div> whose children were bare <a>/<span> cells, which is exactly that
// violation (it shipped 2026-07-29 and turned the production Lighthouse
// a11y gate red for 5 days). Do NOT put role="listitem" directly on the
// <a> below — that overwrites its link role and makes the day
// unreachable as a link; the <li> wrapper is what carries the listitem
// semantics instead. Do NOT give .cal-cell `display:contents` to make it
// "invisible" for grid/flex layout purposes either — that has a browser
// history of pulling elements (including their implicit role) out of the
// accessibility tree, which would silently reintroduce this same bug.
// Grid/flex sizing for .cal-cell instead of .cal-day lives beside
// .cal-strip in the dist shell <style> block (see that block's own
// comment for why it lives there).
//
// The explicit role="list" below is NOT redundant, even though <ul>
// already implies it: .cal-strip's CSS sets `list-style: none`, and
// WebKit/Safari (all iOS browsers, a large share of Saudi traffic)
// deliberately strips list semantics from the accessibility tree for any
// <ul>/<ol> styled with list-style: none — VoiceOver stops announcing
// "list, N items" and its children stop being exposed as listitems. An
// explicit role="list" on the <ul> restores that semantics in WebKit; it
// is a harmless no-op in Chrome/Firefox. axe does not flag its absence
// (this is a WebKit-only accessibility-tree quirk, not a DOM-visible
// violation), so do not "clean up" this attribute as redundant — removing
// it silently reintroduces a quieter version of the exact bug this file
// exists to fix, but only on Safari/iOS.
export function homeCalendarStrip(days = []) {
  if (!days.length) return '';
  const cells = days.map((day) => {
    const count = day.events.length;
    const dayNumber = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', timeZone: 'Asia/Riyadh' }).format(day.date);
    if (!count) {
      return `<li class="cal-cell"><span class="cal-day" data-day="${escapeHtml(day.key)}"><b>${escapeHtml(dayNumber)}</b></span></li>`;
    }
    const monthName = new Intl.DateTimeFormat('ar-SA', { month: 'long', timeZone: 'Asia/Riyadh' }).format(day.date);
    const label = `${dayNumber} ${monthName} · ${eventCountLabel(count)}`;
    return `<li class="cal-cell"><a class="cal-day has-events" data-day="${escapeHtml(day.key)}" href="./this-month.html#day-${escapeHtml(day.key)}" aria-label="${escapeHtml(label)}"><b>${escapeHtml(dayNumber)}</b><span class="cal-dot" aria-hidden="true"></span></a></li>`;
  }).join('\n        ');
  return `<ul class="cal-strip" role="list" aria-label="أيام الشهر المتبقية">
        ${cells}
      </ul>`;
}
