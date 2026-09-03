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
import { reconcileSeoPageState, reconcileStaticPageState } from './seo-discovery-utils.mjs';

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

// ---------- 2. non-event pages, fingerprinted by their rendered output ----------
// Event pages are fingerprinted from their record. Every OTHER page — the home
// page, the hubs, the guides, the city, category and search-intent pages — had no
// record, so writeSitemap fell back to the build instant and declared all 105 of
// them modified on every build, several times a day, forever.
//
// It was worse than the sitemap: the build stamped the current instant into FOUR
// claims on each of those pages — og:updated_time, JSON-LD dateModified, the
// visible «آخر تحديث» line, and <lastmod>. Built twice with no input change,
// those timestamps were the ONLY difference between the two renderings.
//
// reconcileStaticPageState fingerprints the rendered HTML with the claims masked
// out (unmasked, the field feeds the hash and the hash sets the field, and nothing
// converges). Measured after the fix, over repeated builds with no input change:
// 104-105 of 105 pages keep their date, against 0 of 105 before.
const hashesA = new Map([['index.html', 'aaa'], ['guides.html', 'bbb']]);
const firstStatic = reconcileStaticPageState(hashesA, {}, older);
assert.equal(firstStatic.staticPages['index.html'].modified_at, older, 'a first sighting takes the build instant');

const secondStatic = reconcileStaticPageState(hashesA, { static_pages: firstStatic.staticPages }, now);
assert.equal(
  secondStatic.staticPages['index.html'].modified_at,
  older,
  'a page whose rendered output is byte-identical must keep its date'
);
assert.deepEqual(secondStatic.changedPaths, [], 'and must not be reported as changed');

const hashesB = new Map([['index.html', 'aaa'], ['guides.html', 'CHANGED']]);
const thirdStatic = reconcileStaticPageState(hashesB, { static_pages: secondStatic.staticPages }, now);
assert.equal(thirdStatic.staticPages['guides.html'].modified_at, now, 'a page whose output changed must take the new date');
assert.equal(thirdStatic.staticPages['index.html'].modified_at, older, 'and its neighbour must be left alone');
assert.deepEqual(thirdStatic.changedPaths, ['guides.html'], 'only the changed page is reported');

// Every claim the build REWRITES must also be masked before hashing. Miss one and
// the pass never converges: the value it writes changes the hash that decides the
// value. This is asserted on the source because it is the one way this mechanism
// fails silently — it would still run, and still restamp everything, forever.
const generator = fs.readFileSync(path.join(root, 'scripts', 'generate-site.mjs'), 'utf8');
const maskFn = generator.slice(generator.indexOf('function maskFreshnessClaims'), generator.indexOf('function applyFreshnessClaims'));
const applyFn = generator.slice(generator.indexOf('function applyFreshnessClaims'), generator.indexOf('function stampStaticPageFreshness'));
for (const group of ['FRESHNESS_CLAIM_PATTERNS', 'FRESHNESS_DISPLAY_PATTERNS']) {
  assert.ok(applyFn.includes(group), `${group} must be rewritten with the reconciled date`);
  assert.ok(maskFn.includes(group), `${group} is rewritten by applyFreshnessClaims but not masked before hashing — the fingerprint would depend on its own output`);
}

// The early pass must not wipe the late pass's map. prepareSeoDiscovery writes the
// state file long before the pages are final; writing its own object verbatim
// dropped static_pages on every build, so every static page looked new to the pass
// meant to prove it was not.
const prepare = generator.slice(generator.indexOf('function prepareSeoDiscovery'), generator.indexOf('function prepareSeoDiscovery') + 3000);
assert.match(
  prepare,
  /static_pages:\s*carriedStaticPages/,
  'prepareSeoDiscovery must carry static_pages through when it writes the state file'
);

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

console.log('SITEMAP_FRESHNESS_OK unchanged_pages_keep_their_date=yes static_pages=rendered-output-fingerprint test_isolation=yes');
