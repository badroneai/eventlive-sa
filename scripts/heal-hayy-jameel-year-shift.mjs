// One-time heal (2026-09-19): Hayy Jameel rows whose window was pushed a year forward.
//
// extractHayyJameelDateRangeFromMonthDayMatrix read "July 2026" as "July 20" (the day regex
// swallowed the first two digits of the year) and inferYear() then assumed the date was in the
// future → "July 20, 2027". 40 of 93 Hayy rows advertised 2027 for 2026 (and 2024) screenings.
// The parser is fixed in scripts/collect-source-candidates.mjs; this script re-reads each affected
// page through the fixed extractor and rewrites starts_at/ends_at from it — in BOTH stores that
// carry the window: data/events_catalog.json and data/source_candidates.json. The candidate pool
// matters as much as the catalog: auto-publish re-applies a matched candidate's window to its
// catalog row on every sync, and a source that is not re-collected that run keeps its old
// candidates — healing the catalog alone let the 2027 windows come straight back
// (run 35425674234). Pages that yield no date are left untouched and listed (never guessed).
//
// Network: fetches the public detail pages of the affected rows only (same pages the daily sync
// reads). Usage: node scripts/heal-hayy-jameel-year-shift.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { extractHayyJameelListingFromDetail } from './collect-source-candidates.mjs';

const root = process.cwd();
const catalogPath = path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE || 'data/events_catalog.json');
const candidatesPath = path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE || 'data/source_candidates.json');
const dryRun = process.argv.includes('--dry-run');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const pool = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
const source = { id: 'hayy-jameel-events', name: "Hayy Jameel What's On", url: 'https://hayyjameel.org/whats-on/', owner: 'Art Jameel / Hayy Jameel' };
const healedAt = new Date().toISOString();

function slugYear(url = '') {
  const match = String(url).match(/(?:^|[^\d])(20\d{2})(?!\d)/);
  return match ? match[1] : null;
}
function normalizeUrl(url = '') {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
}
// 2026-09-19, second pass: the first pass only re-read a row whose SLUG year contradicted its
// window, or whose start had been pushed to 2027. That missed the archive pages entirely — 19
// live rows sat at 2026 while their own page lists screenings from 2018–2023, because those
// pages carry no year in the slug and 2026 is not 2027. The parser fix already derives the right
// window from those pages; nothing had asked it to. So: re-read EVERY Hayy row and adopt whatever
// its own page states. A row whose page agrees is left untouched, and a page that yields no date
// never changes anything.
function looksShifted() {
  return true;
}

const hayyEvents = (catalog.events || []).filter((row) => row.source_label === source.name);
const hayyCandidates = (pool.candidates || []).filter((row) => row.source_label === source.name);
const pages = new Map();
for (const row of [...hayyEvents, ...hayyCandidates]) {
  if (!looksShifted(row) || !row.source_url) continue;
  const key = normalizeUrl(row.source_url);
  if (!pages.has(key)) pages.set(key, row.source_url);
}
console.log(`HEAL_HAYY_YEAR pages=${pages.size} (shifted rows: catalog=${hayyEvents.filter(looksShifted).length} candidates=${hayyCandidates.filter(looksShifted).length})`);

let changedEvents = 0;
let changedCandidates = 0;
const untouched = [];
for (const [key, url] of pages) {
  let html = '';
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (EventLive heal-hayy-jameel-year-shift)' } });
    if (!response.ok) { untouched.push(`${url} http=${response.status}`); continue; }
    html = await response.text();
  } catch (error) {
    untouched.push(`${url} fetch-error=${error.message}`);
    continue;
  }
  const listing = extractHayyJameelListingFromDetail(html, url, source);
  if (!listing?.starts_at || !listing?.ends_at) { untouched.push(`${url} no-date-on-page`); continue; }
  // The page's date matrix takes the earliest and latest dated line it can see. On a page that
  // mixes years — a 2022 retrospective whose sidebar also lists a 2026 title — that produces a
  // four-year "window" which is worse than the wrong date it would replace. So a re-derived
  // window is adopted only when the page speaks with one voice: a span a real programme could
  // have (<= 120 days, which is what rejects the 1,480-day "windows"), and entirely in the past.
  // These are archive pages; anything still ahead is left to the normal sync to keep current.
  const spanDays = (Date.parse(listing.ends_at) - Date.parse(listing.starts_at)) / 86400000;
  const inThePast = Date.parse(listing.ends_at) < Date.now();
  if (spanDays > 120 || spanDays < 0 || !inThePast) {
    untouched.push(`${url} page-window-not-single-voiced (${listing.starts_at.slice(0, 10)}→${listing.ends_at.slice(0, 10)}, span=${Math.round(spanDays)}d, past=${inThePast})`);
    continue;
  }
  const apply = (row, label) => {
    if (normalizeUrl(row.source_url) !== key) return false;
    if (row.starts_at === listing.starts_at && row.ends_at === listing.ends_at) return false;
    // Only a wrong DAY is healed here. When the page and the row agree on the date, the row's
    // clock is the better of the two — the page parser falls back to 09:00/18:00 defaults, and
    // adopting those would downgrade a sourced time to a guess (law 2.6). An end-date-only
    // difference is a separate, smaller question and is left alone rather than risked.
    if (String(row.starts_at).slice(0, 10) === listing.starts_at.slice(0, 10)) return false;
    // A row that already carries official sessions is governed by those sessions, not by the
    // page's headline window: scripts/event-session-window.mjs keeps ends_at bracketing them.
    // Moving the window under them would contradict that gate (it did, on the Godus Bros row),
    // and the sessions are evidence this pass does not re-derive. Leave it to the sync.
    if ((row.sessions || []).some((session) => String(session.session_type || '').startsWith('official-'))) return false;
    console.log(`HEAL_HAYY_YEAR ${label} ${row.id} ${String(row.starts_at).slice(0, 10)}→${String(row.ends_at).slice(0, 10)} => ${listing.starts_at.slice(0, 10)}→${listing.ends_at.slice(0, 10)}`);
    row.starts_at = listing.starts_at;
    row.ends_at = listing.ends_at;
    if (listing.date_precision) row.date_precision = listing.date_precision;
    if (listing.time_precision) row.time_precision = listing.time_precision;
    return true;
  };
  for (const row of hayyEvents) if (apply(row, 'catalog')) { row.updated_at = healedAt; changedEvents++; }
  for (const row of hayyCandidates) if (apply(row, 'candidate')) changedCandidates++;
}
for (const line of untouched) console.log(`HEAL_HAYY_YEAR_UNTOUCHED ${line}`);
if (!dryRun && changedEvents) fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
if (!dryRun && changedCandidates) fs.writeFileSync(candidatesPath, `${JSON.stringify(pool, null, 2)}\n`, 'utf8');
console.log(`HEAL_HAYY_YEAR_DONE catalog_changed=${changedEvents} candidates_changed=${changedCandidates} untouched=${untouched.length} dry_run=${dryRun}`);
