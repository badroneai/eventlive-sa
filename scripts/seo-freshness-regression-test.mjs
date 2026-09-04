import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { eventSearchFingerprint, reconcileSeoPageState } from './seo-discovery-utils.mjs';

const sample = {
  file_slug: 'event-stable-sample',
  title: 'Stable Event',
  summary: 'A useful event summary.',
  starts_at: '2026-08-01T18:00:00+03:00',
  ends_at: '2026-08-01T20:00:00+03:00',
  status: 'upcoming',
  city: 'Riyadh',
  venue: 'Venue',
  updated_at: '2026-07-01T00:00:00Z'
};
const firstFingerprint = eventSearchFingerprint(sample);
assert.equal(firstFingerprint, eventSearchFingerprint({ ...sample, updated_at: '2026-07-11T00:00:00Z' }), 'volatile collector timestamps must not alter SEO freshness');
assert.notEqual(firstFingerprint, eventSearchFingerprint({ ...sample, venue: 'New venue' }), 'visible semantic changes must alter SEO freshness');

const previous = { version: 1, pages: { [sample.file_slug]: { fingerprint: firstFingerprint, modified_at: '2026-07-01T00:00:00.000Z' } } };
const stable = reconcileSeoPageState([{ ...sample }], previous, '2026-07-11T00:00:00.000Z');
assert.equal(stable.changedEvents.length, 0);
assert.equal(stable.unchangedEvents[0].seo_modified_at, '2026-07-01T00:00:00.000Z');
const changed = reconcileSeoPageState([{ ...sample, venue: 'New venue' }], previous, '2026-07-11T00:00:00.000Z');
assert.equal(changed.changedEvents.length, 1);
assert.equal(changed.changedEvents[0].seo_modified_at, '2026-07-11T00:00:00.000Z');

const root = process.cwd();
const statePath = path.join(root, 'data', 'seo_page_state.json');
const sitemapPath = path.join(root, 'dist', 'sitemap.xml');
assert.ok(fs.existsSync(statePath), 'build must create data/seo_page_state.json');
assert.ok(fs.existsSync(sitemapPath), 'build must create dist/sitemap.xml');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const pageEntries = Object.entries(state.pages || {});
assert.ok(pageEntries.length >= 1_000, 'SEO state must cover the public event catalog');

// The two maps in this file answer different questions, and <lastmod> follows the
// second one:
//
//   state.pages        — did the event RECORD change? Decides what gets
//                        re-rendered and what IndexNow is told.
//   state.static_pages — did the page's rendered OUTPUT change? Decides what the
//                        site may claim as that page's modification date.
//
// Until PR #114 they were the same thing for event pages, so this test could
// assert the sitemap against state.pages. They are no longer coupled on purpose:
// run-smart-build discards the record fingerprints on any template change, which
// is nearly every deploy, and asserting the sitemap against a map that gets wiped
// is asserting that every page is modified daily.
//
// The failure that produced this rewrite was date-shaped: locally both maps said
// the same day and the old assertion passed; in CI, a day later, the record map
// still said 2026-09-03 while the output map correctly said 2026-09-04.
const staticEntries = Object.entries(state.static_pages || {});
assert.ok(staticEntries.length >= 1_000, 'output fingerprints must cover the built pages, event pages included');

const eventEntries = staticEntries.filter(([relative]) => relative.startsWith('events/'));
assert.ok(eventEntries.length >= 500, `expected event pages among the output fingerprints, found ${eventEntries.length}`);
for (const [relative, entry] of eventEntries.slice(0, 20)) {
  const escapedPath = relative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    sitemap,
    new RegExp(`<loc>https://eventme\\.live/${escapedPath}<\\/loc><lastmod>${entry.modified_at.slice(0, 10)}<\\/lastmod>`),
    `${relative}: the sitemap must carry the date its rendered output earned, not the build instant`
  );
}

console.log(`seo-freshness-regression-test: ok records=${pageEntries.length} output_fingerprints=${staticEntries.length}`);
