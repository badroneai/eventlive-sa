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
function looksShifted(row) {
  const year = slugYear(row.source_url);
  const startYear = String(row.starts_at || '').slice(0, 4);
  const endYear = String(row.ends_at || '').slice(0, 4);
  if (year && startYear !== year && endYear !== year) return true;
  return startYear === '2027' && !/2027/.test(String(row.title || '') + String(row.source_url || ''));
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
  const apply = (row, label) => {
    if (normalizeUrl(row.source_url) !== key) return false;
    if (row.starts_at === listing.starts_at && row.ends_at === listing.ends_at) return false;
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
