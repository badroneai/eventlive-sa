// One-time heal (2026-09-19): Hayy Jameel rows whose window was pushed a year forward.
//
// extractHayyJameelDateRangeFromMonthDayMatrix read "July 2026" as "July 20" (the day regex
// swallowed the first two digits of the year) and inferYear() then assumed the date was in the
// future → "July 20, 2027". 40 of 93 Hayy rows advertised 2027 for 2026 (and some 2024) screenings.
// The parser is fixed in scripts/collect-source-candidates.mjs; this script re-reads each affected
// row's own source page through the fixed extractor and rewrites starts_at/ends_at from it.
// Rows whose page no longer yields a date are left untouched and listed (never guessed).
//
// Network: fetches the public detail pages of the affected rows only (same pages the daily sync
// reads). Usage: node scripts/heal-hayy-jameel-year-shift.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { extractHayyJameelListingFromDetail } from './collect-source-candidates.mjs';

const root = process.cwd();
const catalogPath = path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE || 'data/events_catalog.json');
const dryRun = process.argv.includes('--dry-run');
const envelope = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const source = { id: 'hayy-jameel-events', name: "Hayy Jameel What's On", url: 'https://hayyjameel.org/whats-on/', owner: 'Art Jameel / Hayy Jameel' };
const healedAt = new Date().toISOString();

function slugYear(url = '') {
  const match = String(url).match(/(?:^|[^\d])(20\d{2})(?!\d)/);
  return match ? match[1] : null;
}
function looksShifted(event) {
  const year = slugYear(event.source_url);
  const startYear = event.starts_at.slice(0, 4);
  const endYear = event.ends_at.slice(0, 4);
  if (year && startYear !== year && endYear !== year) return true;
  return startYear === '2027' && !/2027/.test(String(event.title || '') + String(event.source_url || ''));
}

const targets = (envelope.events || []).filter((event) => event.source_label === source.name && looksShifted(event));
console.log(`HEAL_HAYY_YEAR targets=${targets.length}`);
let changed = 0;
const untouched = [];
for (const event of targets) {
  let html = '';
  try {
    const response = await fetch(event.source_url, { headers: { 'user-agent': 'Mozilla/5.0 (EventLive heal-hayy-jameel-year-shift)' } });
    if (!response.ok) { untouched.push(`${event.id} http=${response.status}`); continue; }
    html = await response.text();
  } catch (error) {
    untouched.push(`${event.id} fetch-error=${error.message}`);
    continue;
  }
  const listing = extractHayyJameelListingFromDetail(html, event.source_url, source);
  if (!listing?.starts_at || !listing?.ends_at) { untouched.push(`${event.id} no-date-on-page`); continue; }
  if (listing.starts_at === event.starts_at && listing.ends_at === event.ends_at) continue;
  console.log(`HEAL_HAYY_YEAR ${event.id} ${event.starts_at.slice(0, 10)}→${event.ends_at.slice(0, 10)} => ${listing.starts_at.slice(0, 10)}→${listing.ends_at.slice(0, 10)}`);
  event.starts_at = listing.starts_at;
  event.ends_at = listing.ends_at;
  if (listing.date_precision) event.date_precision = listing.date_precision;
  if (listing.time_precision) event.time_precision = listing.time_precision;
  event.updated_at = healedAt;
  changed++;
}
for (const line of untouched) console.log(`HEAL_HAYY_YEAR_UNTOUCHED ${line}`);
if (!dryRun && changed) fs.writeFileSync(catalogPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
console.log(`HEAL_HAYY_YEAR_DONE changed=${changed} untouched=${untouched.length} dry_run=${dryRun}`);
