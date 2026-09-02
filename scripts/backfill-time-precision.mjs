// One sweep to give every published row the time-precision judgement the
// collectors already made and the publish path threw away.
//
// scripts/auto-publish-source-candidates.mjs is a field allowlist; it copied
// starts_at and ends_at but not time_precision, so data/events_catalog.json
// carried the field on 0 of 866 rows. Every surface therefore treated a
// fabricated 09:00–18:00 default exactly like a clock the source published.
//
// Two passes, in order of evidence quality:
//   1. Recover the collector's own verdict by matching each published row back to
//      its candidate (source_url first, then exact title).
//   2. For rows with no surviving candidate, read the verdict off the window
//      itself. This is inference, so it is labelled as such — 'date-only-defaulted'
//      is only assigned to the literal machine-written windows the collectors emit
//      (09:00→18:00, 00:00→23:59, 00:00→00:00); anything else becomes 'unknown',
//      which means "we looked and cannot tell", not "trustworthy".
//
// Idempotent, and never downgrades a verdict recovered from a candidate.

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8')).candidates || [];

const bySourceUrl = new Map();
const byTitle = new Map();
for (const candidate of candidates) {
  if (!candidate.time_precision) continue;
  if (candidate.source_url && !bySourceUrl.has(candidate.source_url)) bySourceUrl.set(candidate.source_url, candidate);
  const title = String(candidate.title || '').trim();
  if (title && !byTitle.has(title)) byTitle.set(title, candidate);
}

// The literal windows the collectors write when a source published no clock.
// See the ~60 fabrication sites listed in the 2026-09-02 audit.
const FABRICATED = new Set(['09:00→18:00', '00:00→23:59', '00:00→00:00', '00:00→18:00']);

function windowKey(event) {
  return `${String(event.starts_at || '').slice(11, 16)}→${String(event.ends_at || '').slice(11, 16)}`;
}

let recovered = 0;
let inferred = 0;
let unknown = 0;
let untouched = 0;

for (const event of catalog.events || []) {
  if (event.time_precision) { untouched += 1; continue; }
  const candidate = bySourceUrl.get(event.source_url) || byTitle.get(String(event.title || '').trim());
  if (candidate?.time_precision) {
    event.time_precision = candidate.time_precision;
    if (candidate.date_precision) event.date_precision = candidate.date_precision;
    recovered += 1;
    continue;
  }
  if (FABRICATED.has(windowKey(event))) {
    event.time_precision = 'date-only-defaulted';
    inferred += 1;
    continue;
  }
  event.time_precision = 'unknown';
  unknown += 1;
}

if (recovered || inferred || unknown) {
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}
console.log(`TIME_PRECISION_BACKFILL recovered=${recovered} inferred_fabricated=${inferred} unknown=${unknown} already_set=${untouched}`);
