// <lastmod> is a claim about a page, and Google acts on it only "if it's
// consistently and verifiably (for example by comparing to the last modification
// of the page) accurate"
// (developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
//
// It was not. run-smart-build.mjs derived forceSeoRefresh from the reason
// `build-template-changed`, and templateInputs includes package.json,
// locales/en-SA-static.json and generate-site.mjs — files this repo touches on
// almost every deploy. A forced refresh discards the previous per-page state and
// stamps every row with that instant. Measured across two consecutive sync runs:
// 214 fingerprints genuinely changed and 1,596 modified_at values changed, i.e.
// all of them. The sitemap shipped 3,388 URLs carrying one identical <lastmod>.
//
// Rebuilding every page and DECLARING every page modified are different things.
// The first is correct after a template change; the second is a false claim that
// costs the pages which genuinely did change.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { reconcileSeoPageState } from './seo-discovery-utils.mjs';

const root = process.cwd();

// ---------- 1. the rule itself ----------
const older = '2026-01-15T10:00:00.000Z';
const now = '2026-09-03T12:00:00.000Z';
const events = [
  { file_slug: 'event-stable', title: 'Stable', starts_at: '2026-10-01T10:00:00+03:00', ends_at: '2026-10-01T12:00:00+03:00' },
  { file_slug: 'event-changed', title: 'Changed', starts_at: '2026-10-02T10:00:00+03:00', ends_at: '2026-10-02T12:00:00+03:00' }
];
const first = reconcileSeoPageState(events.map((event) => ({ ...event })), { version: 1, pages: {} }, older);
assert.equal(first.state.pages['event-stable'].modified_at, older, 'a first sighting takes the build instant');

// Same content, later build: the date must NOT move.
const second = reconcileSeoPageState(events.map((event) => ({ ...event })), first.state, now);
assert.equal(
  second.state.pages['event-stable'].modified_at,
  older,
  'an unchanged page must keep its modification date — restamping it is the false claim Google discounts'
);

// Real change: the date must move.
const edited = events.map((event) => (event.file_slug === 'event-changed' ? { ...event, title: 'Changed Again' } : { ...event }));
const third = reconcileSeoPageState(edited, second.state, now);
assert.equal(third.state.pages['event-changed'].modified_at, now, 'a genuinely changed page must take the new date');
assert.equal(third.state.pages['event-stable'].modified_at, older, 'and its neighbour must be left alone');

// ---------- 2. the open question, recorded rather than forced ----------
// run-smart-build.mjs deliberately couples `build-template-changed` to a full SEO
// refresh, and scripts/incremental-build-regression-test.mjs:69 gates that
// coupling. The reasoning is sound in itself: a template change really does alter
// the rendered HTML of every page, and Google counts an update to content,
// structured data or links as significant.
//
// The problem is frequency, not principle. templateInputs includes package.json,
// package-lock.json and locales/en-SA-static.json, so wiring a gate or bumping a
// dependency marks the template as changed — which in this repo is close to daily.
// A "one-time" refresh therefore fires on almost every deploy, and the result is
// 3,388 sitemap URLs carrying one identical <lastmod>, which is exactly the
// verifiably-inaccurate case Google says it discounts.
//
// Deliberately NOT changed here. The honest fix is to restamp only pages whose
// RENDERED OUTPUT actually changed — computable, since the incremental build
// already caches per-page artifacts — not to sever a coupling that an earlier
// decision put in on purpose. Recorded so the next person meets the evidence
// instead of rediscovering it.

// ---------- 3. no test may write the production state ----------
// Five regression tests spawn a real build with EVENTLIVE_FORCE_SEO_REFRESH=true
// in the working directory. A test that restamps the corpus it is measuring is
// the same defect wearing a different hat.
const scriptsDir = path.join(root, 'scripts');
const offenders = [];
for (const name of fs.readdirSync(scriptsDir)) {
  if (!name.endsWith('.mjs')) continue;
  const source = fs.readFileSync(path.join(scriptsDir, name), 'utf8');
  if (!/EVENTLIVE_FORCE_SEO_REFRESH:\s*'true'/.test(source)) continue;
  if (!/EVENTLIVE_SEO_STATE_PATH/.test(source)) offenders.push(name);
}
assert.deepEqual(
  offenders,
  [],
  'these scripts force an SEO refresh without redirecting the state file, so they overwrite data/seo_page_state.json'
);

console.log('SITEMAP_FRESHNESS_OK unchanged_pages_keep_their_date=yes template_coupling=documented test_isolation=yes');
