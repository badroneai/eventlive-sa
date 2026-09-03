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
import { maskFreshnessClaims } from './freshness-claim-utils.mjs';

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
const claimUtils = fs.readFileSync(path.join(root, 'scripts', 'freshness-claim-utils.mjs'), 'utf8');
const maskFn = claimUtils.slice(claimUtils.indexOf('export function maskFreshnessClaims'), claimUtils.indexOf('export function applyFreshnessClaims'));
const applyFn = claimUtils.slice(claimUtils.indexOf('export function applyFreshnessClaims'));
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
// ...and must read it from the FILE. previousState is deliberately empty under
// EVENTLIVE_FORCE_SEO_REFRESH, so carrying THAT through wiped the output
// fingerprints along with the record fingerprints. Measured before the fix: a
// forced refresh restamped all 1,699 pages. The two maps answer different
// questions and a force refresh has no business discarding the second.
assert.match(
  prepare,
  /carriedStaticPages[\s\S]{0,400}JSON\.parse\(fs\.readFileSync\(statePath/,
  'static_pages must be carried from the state file on disk, not from the (possibly emptied) previousState'
);

// The pass must cover EVERY page in the sitemap, event pages included. Their
// record fingerprint cannot answer "did this page's output change", and
// run-smart-build discards those fingerprints on a template change — which is
// almost every deploy — so all 3,188 event URLs shipped one identical <lastmod>.
const stamp = generator.slice(generator.indexOf('function stampPageFreshness'), generator.indexOf('function writeHtmlChangeManifest'));
assert.ok(stamp.length > 500, 'stampPageFreshness must exist — it is what makes every <lastmod> on this site true');
assert.doesNotMatch(
  stamp,
  /startsWith\('events\/'\)/,
  'event pages must not be excluded from output-based freshness'
);
assert.match(stamp, /startsWith\('en\/'\)/, 'English pages inherit their date from the Arabic node the localiser clones');

// ---------- behavioural: every claim shape must be neutralised by masking ----------
// The source-level check above catches an ASYMMETRIC edit — a claim rewritten but
// not masked. It cannot catch a SYMMETRIC one: delete a pattern from both lists and
// that check still passes, while the page keeps an unmasked timestamp, its
// fingerprint moves on every forced refresh, and every page is restamped forever.
// That hole was real: the event pages write «آخر تحديث» as a sentence, the
// search-intent pages as a labelled signal, and only the second shape was covered.
//
// Nor can it be caught by scanning a normal build's output, because most of these
// claims carry a STABLE date there — they only turn into the build instant on a
// forced refresh, which is what runs on almost every deploy.
//
// So the property is asserted directly and independently of any build mode: change
// the value inside a claim, and the masked form of the page must not change. The
// list below is deliberately a second, independent enumeration — a test that
// imports the list it is checking cannot detect a deletion from it.
const CLAIM_SHAPES = [
  { label: 'og:updated_time meta', pattern: /(<meta property="og:updated_time" content=")([^"]*)(")/ },
  { label: 'JSON-LD dateModified', pattern: /("dateModified":")([^"]*)(")/ },
  { label: 'search-intent «آخر تحديث» signal', pattern: /(<span>آخر تحديث<\/span><b>)([^<]*)(<\/b>)/ },
  { label: 'event-page «آخر تحديث» sentence', pattern: /(آخر تحديث: )([^<]*)(<)/ },
  { label: 'footer «آخر بناء» stamp', pattern: /(آخر بناء: )([^<]*)(<)/ },
  { label: 'home «آخر مزامنة» stamp', pattern: /(آخر مزامنة: )([^<]*)(<)/ }
];

const distDir = path.join(root, 'dist');
if (fs.existsSync(path.join(distDir, 'sitemap.xml'))) {
  const pages = [];
  for (const match of fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const relative = decodeURIComponent(match[1].replace('https://eventme.live/', '')).normalize('NFC') || 'index.html';
    if (relative.startsWith('en/')) continue;
    const file = path.join(distDir, relative);
    if (fs.existsSync(file)) pages.push(file);
  }
  // Non-event pages first: the sitemap is sorted, so `events/` fills the front and
  // an arbitrary head-slice missed the search-intent pages entirely — the gate then
  // reported their claim shape as "gone from the site" when it was simply unread.
  pages.sort((left, right) => Number(left.includes(`${path.sep}events${path.sep}`)) - Number(right.includes(`${path.sep}events${path.sep}`)));
  pages.length = Math.min(pages.length, 400);
  assert.ok(pages.length > 50, 'expected a built site to check the freshness claims against');

  const unmasked = [];
  const missing = [];
  for (const { label, pattern } of CLAIM_SHAPES) {
    const carrier = pages.find((file) => pattern.test(fs.readFileSync(file, 'utf8')));
    if (!carrier) { missing.push(label); continue; }
    const html = fs.readFileSync(carrier, 'utf8');
    const altered = html.replace(pattern, '$1SENTINEL-VALUE$3');
    assert.notEqual(altered, html, `${label}: the sentinel substitution did nothing, so this shape proves nothing`);
    if (maskFreshnessClaims(altered) !== maskFreshnessClaims(html)) {
      unmasked.push(`${label} (e.g. ${path.relative(distDir, carrier)})`);
    }
  }

  assert.deepEqual(
    unmasked,
    [],
    `these freshness claims survive masking, so the page fingerprint depends on the timestamp the build writes into it:\n  ${unmasked.join('\n  ')}`
  );
  assert.deepEqual(
    missing,
    [],
    `these claim shapes no longer appear anywhere in the built site — either the markup changed and the masking is now aimed at nothing, or the list is stale:\n  ${missing.join('\n  ')}`
  );
}

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
