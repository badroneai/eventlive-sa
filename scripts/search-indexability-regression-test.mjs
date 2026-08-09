import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OWNER_ONLY_PAGES } from './owner-only-pages.mjs';
import { LEGACY_CATEGORY_REDIRECTS, LEGACY_REDIRECT_PAGES } from './legacy-redirect-pages.mjs';
import { EVENT_ALIAS_PAGES } from './event-canonical-aliases.mjs';
import { isRedirectStubPath, movedEventStubPaths } from './published-url-ledger.mjs';

// Indexability gate.
//
// 2026-08-08: Search Console reported a new "Excluded by noindex tag" reason
// for eventme.live. The noindex itself turned out to be the intended
// owner-only policy (PR #30) — but auditing the built surface to prove that
// surfaced four defect classes that nothing was measuring, each of which costs
// real listings:
//
//  1. DOUBLE-ESCAPED ENTITIES — normalizeSeoMetaDescription() read an
//     already-escaped attribute value back out of the markup and re-escaped
//     it, so 62 pages shipped literal "&amp;quot;" inside the snippet Google
//     shows to a searcher.
//  2. BOILERPLATE ENGLISH DESCRIPTIONS — englishMeta() overwrote every English
//     description with one of two constants: 1,472 event pages shared one
//     sentence and 107 chrome pages shared another. Half the site had nothing
//     page-specific for Google to index or display.
//  3. NON-PLACE CITY LABELS — "{title} في {city}" rendered "... في عن بعد" /
//     "... in Online" on 166 pages, in the <title> a searcher reads.
//  4. COLLIDING TITLES — recurring events produced byte-identical titles on
//     separate indexable pages, so Google keeps one and drops the rest.
//
// Each class is banned below against the built surface, not against the
// generator source, because every one of them was introduced by a pass that
// looked correct in isolation and only misbehaved on real output.

const root = process.cwd();
const distDir = path.join(root, 'dist');
const SITE = 'https://eventme.live';
const ARABIC = /[؀-ۿ]/u;

// A single duplicate description group is allowed to be this large before it
// counts as boilerplate. Redirect stubs and a handful of intentionally-shared
// chrome lines are legitimate; a group in the hundreds never is.
const MAX_SHARED_DESCRIPTION_PAGES = 12;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(filePath);
    return entry.name.endsWith('.html') ? [filePath] : [];
  });
}

function attr(html, pattern) {
  return html.match(pattern)?.[1] ?? '';
}

// Redirect stubs exist on both surfaces, so the check must be language-blind.
// They are not content pages: no snippet of theirs is ever shown, because they
// canonicalise elsewhere and are kept out of the sitemap. The description and
// title rules below therefore skip them — but rule 7 holds them to a stricter
// contract of their own.
const movedStubPaths = movedEventStubPaths();

function isRedirectStub(relativePath) {
  return isRedirectStubPath(relativePath, movedStubPaths);
}

const pages = walk(distDir).map((filePath) => {
  const relativePath = path.relative(distDir, filePath).replace(/\\/g, '/');
  const html = fs.readFileSync(filePath, 'utf8');
  return {
    relativePath,
    english: relativePath === 'en/index.html' || relativePath.startsWith('en/'),
    redirectStub: isRedirectStub(relativePath),
    ownerOnly: OWNER_ONLY_PAGES.has(relativePath) || OWNER_ONLY_PAGES.has(path.basename(relativePath)),
    title: attr(html, /<title>([^<]*)<\/title>/i),
    description: attr(html, /<meta\s+name="description"\s+content="([^"]*)"/i),
    ogDescription: attr(html, /<meta\s+property="og:description"\s+content="([^"]*)"/i),
    twitterDescription: attr(html, /<meta\s+name="twitter:description"\s+content="([^"]*)"/i),
    canonical: attr(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i),
    robots: attr(html, /<meta\s+name="robots"\s+content="([^"]*)"/i)
  };
});

assert.ok(pages.length > 100, `expected a built dist/ to audit, found ${pages.length} pages`);
const indexable = pages.filter((page) => !/noindex/i.test(page.robots));

// English mirrors live under /en/ and canonicalise to their own /en/ URL.
function publicUrlOf(relativePath) {
  if (relativePath === 'index.html') return `${SITE}/`;
  if (relativePath === 'en/index.html') return `${SITE}/en/`;
  return `${SITE}/${relativePath}`;
}

// ---------------------------------------------------------------------------
// 1. No double-escaped entity may reach a title or any description variant.
//    "&amp;quot;" is the signature of a pass that escaped an already-escaped
//    value; a searcher reads the result verbatim in the SERP.
// ---------------------------------------------------------------------------
const DOUBLE_ESCAPED = /&amp;(?:quot|amp|lt|gt|apos|nbsp|#\d+);/;
const doubleEscaped = pages.filter((page) => [page.title, page.description, page.ogDescription, page.twitterDescription]
  .some((value) => DOUBLE_ESCAPED.test(value)));
assert.deepEqual(
  doubleEscaped.map((page) => page.relativePath),
  [],
  'double-escaped HTML entities in title/description — a pass re-escaped an already-escaped value'
);

// ---------------------------------------------------------------------------
// 2. description, og:description and twitter:description must agree. They are
//    written together; a drift means one writer was missed (which is exactly
//    how the double-escape hid on twitter:description while corrupting the
//    other two).
// ---------------------------------------------------------------------------
const driftedDescriptions = indexable.filter((page) => page.description
  && page.ogDescription
  && page.twitterDescription
  && !(page.description === page.ogDescription && page.description === page.twitterDescription));
assert.deepEqual(
  driftedDescriptions.map((page) => page.relativePath),
  [],
  'description/og:description/twitter:description disagree — one writer was missed'
);

// ---------------------------------------------------------------------------
// 3. No boilerplate description may be shared across a large block of pages,
//    on either language surface.
// ---------------------------------------------------------------------------
const byDescription = new Map();
for (const page of indexable) {
  if (!page.description || page.redirectStub) continue;
  if (!byDescription.has(page.description)) byDescription.set(page.description, []);
  byDescription.get(page.description).push(page.relativePath);
}
const boilerplate = [...byDescription.entries()]
  .filter(([, files]) => files.length > MAX_SHARED_DESCRIPTION_PAGES)
  .map(([description, files]) => `${files.length} pages share "${description.slice(0, 70)}…" (e.g. ${files[0]})`);
assert.deepEqual(
  boilerplate,
  [],
  `more than ${MAX_SHARED_DESCRIPTION_PAGES} indexable pages share one meta description`
);

// Every indexable page must actually have one.
assert.deepEqual(
  indexable.filter((page) => !page.description && !page.redirectStub).map((page) => page.relativePath),
  [],
  'indexable pages with no meta description'
);

// ---------------------------------------------------------------------------
// 4. A delivery mode must never be rendered as a place.
// ---------------------------------------------------------------------------
// Anchored to the slot the city is interpolated into — the phrase right before
// the brand suffix in a title, or right before the date clause in a
// description. An unanchored match would flag "Art in Virtual Motion", which is
// simply an event's name.
const NON_PLACE_PHRASES = [
  /\sفي (?:عن بعد|أونلاين|اونلاين)\s*(?:\||—|من\b)/u,
  /\sin (?:Online|Virtual|Remote)\s*(?:\||—|from\b|on\b)/
];
const nonPlace = pages.filter((page) => NON_PLACE_PHRASES
  .some((pattern) => pattern.test(page.title) || pattern.test(page.description)));
assert.deepEqual(
  nonPlace.map((page) => page.relativePath),
  [],
  'a delivery mode ("عن بعد"/"Online") was rendered into the city slot of a title or description'
);

// ---------------------------------------------------------------------------
// 5. No two indexable pages may share a <title>. Google keeps one and drops
//    the rest, so a colliding title silently costs a listing.
// ---------------------------------------------------------------------------
// Judged among SELF-CANONICAL pages only. A page that hands its indexing signal
// to another page (a duplicate event record, see event-canonical-aliases.mjs) is
// allowed to share that page's title — that is what consolidation means. Two
// pages that both claim to be canonical and share a title are the defect.
const byTitle = new Map();
for (const page of indexable) {
  if (page.redirectStub) continue;
  if (page.canonical && page.canonical !== publicUrlOf(page.relativePath)) continue;
  if (!byTitle.has(page.title)) byTitle.set(page.title, []);
  byTitle.get(page.title).push(page.relativePath);
}
const collidingTitles = [...byTitle.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([title, files]) => `"${title.slice(0, 70)}" -> ${files.join(', ')}`);
assert.deepEqual(
  collidingTitles,
  [],
  'indexable pages share a <title> — recurring events must carry their own date, true duplicates must be deduped'
);

// ---------------------------------------------------------------------------
// 6. Owner-only pages stay out of the sitemap, and everything in the sitemap
//    stays indexable. A noindex URL submitted for indexing is the exact
//    contradiction Search Console reports back as an error.
// ---------------------------------------------------------------------------
const sitemapUrls = new Set(
  [...fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
);
const publicUrl = (relativePath) => (relativePath === 'index.html' ? `${SITE}/` : `${SITE}/${relativePath}`);
const noindexInSitemap = pages
  .filter((page) => /noindex/i.test(page.robots) && sitemapUrls.has(publicUrl(page.relativePath)))
  .map((page) => page.relativePath);
assert.deepEqual(noindexInSitemap, [], 'noindex pages must never be submitted in sitemap.xml');

// ---------------------------------------------------------------------------
// 7. A legacy redirect stub carries a canonical to its target and nothing that
//    claims to be a language alternate of it.
// ---------------------------------------------------------------------------
// A redirect stub must exist on BOTH surfaces. 2026-08-09: the Arabic stub for
// a retired category redirected correctly while /en/categories/<slug>.html
// 404'd, because localization only ever processed sitemap URLs and a stub is
// deliberately not in the sitemap.
function assertRedirectStub(relativePath, expectedTargetPath) {
  const filePath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(filePath), `${relativePath} must exist as a redirect stub, not 404`);
  const html = fs.readFileSync(filePath, 'utf8');
  const canonical = attr(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  assert.ok(canonical.startsWith(SITE), `${relativePath} must keep an absolute canonical`);
  assert.notEqual(canonical, publicUrlOf(relativePath), `${relativePath} must canonicalise to its replacement, not itself`);
  if (expectedTargetPath) {
    assert.equal(canonical, publicUrlOf(expectedTargetPath), `${relativePath} must canonicalise to ${expectedTargetPath}`);
    assert.ok(fs.existsSync(path.join(distDir, expectedTargetPath)), `${relativePath} redirects to ${expectedTargetPath}, which this build did not produce`);
  }
  assert.ok(/http-equiv="refresh"/i.test(html), `${relativePath} must actually move the visitor, not only the crawler`);
  // Only <link rel="alternate" hreflang> counts. The localizer also injects a
  // language-switch <a hreflang="…">, which is visitor navigation on a page the
  // visitor passes through — not an indexing signal.
  assert.ok(
    !/<link\b[^>]*hreflang=/i.test(html),
    `${relativePath} is a redirect stub and must not declare hreflang alternates`
  );
  assert.ok(!sitemapUrls.has(publicUrlOf(relativePath)), `${relativePath} canonicalises elsewhere and must stay out of sitemap.xml`);
}

for (const [staleSlug, currentSlug] of LEGACY_CATEGORY_REDIRECTS) {
  // Only aliases whose replacement this build actually published.
  if (!fs.existsSync(path.join(distDir, `categories/${currentSlug}.html`))) continue;
  assertRedirectStub(`categories/${staleSlug}.html`, `categories/${currentSlug}.html`);
  assertRedirectStub(`en/categories/${staleSlug}.html`, `en/categories/${currentSlug}.html`);
}

// ---------------------------------------------------------------------------
// 7b. Published-URL ledger: a URL this site published may not die by accident.
//
// Every event page ever published is recorded (scripts/published-url-ledger.mjs).
// When a slug leaves the catalog the ledger decides, on an EXACT identity match
// (title + city + start day), whether the event MOVED — in which case the old
// URL must redirect — or was RETIRED, in which case 404 is the honest answer.
// Before this existed, both cases deleted the page and Search Console reported
// the result as 90 not-found URLs with no way to tell the two apart.
// ---------------------------------------------------------------------------
const ledgerPath = path.join(root, 'data', 'published_url_ledger.json');
assert.ok(fs.existsSync(ledgerPath), 'the build must maintain data/published_url_ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerEvents = ledger.events || {};

// Every event page this build published must be in the ledger, or a future
// rename of it would be invisible and its URL would die silently.
const publishedEventSlugs = pages
  .filter((page) => /^events\/.+\.html$/u.test(page.relativePath))
  .map((page) => page.relativePath.replace(/^events\//, '').replace(/\.html$/, '').normalize('NFC'));
const unledgered = publishedEventSlugs
  .filter((slug) => !ledgerEvents[slug] && !ledgerEvents[slug.normalize('NFD')])
  .filter((slug) => !EVENT_ALIAS_PAGES.has(`events/${slug}.html`.normalize('NFC')));
assert.deepEqual(unledgered.slice(0, 10), [], 'published event pages missing from the URL ledger');

for (const [slug, entry] of Object.entries(ledgerEvents)) {
  if (!entry?.moved_to) continue;
  // A stub is only required while its target is still published; when the
  // target itself retires, reconcileUrlLedger() drops the moved_to.
  if (!fs.existsSync(path.join(distDir, `events/${entry.moved_to}.html`))) continue;
  assertRedirectStub(`events/${slug}.html`, `events/${entry.moved_to}.html`);
  assertRedirectStub(`en/events/${slug}.html`, `en/events/${entry.moved_to}.html`);
}

// ---------------------------------------------------------------------------
// 8. English pages must not ship Arabic metadata.
// ---------------------------------------------------------------------------
// Chrome only, for the same reason as the title check below: an event whose
// TITLE has not been translated yet legitimately renders Arabic inside its
// English description, because the description is built from that title. That
// is MT backlog, reported by the en-surface sweep, and owner rule is explicit
// that translation never breaks the sync. A chrome page has no such excuse.
const arabicOnEnglish = indexable
  .filter((page) => page.english && !page.relativePath.startsWith('en/events/') && ARABIC.test(page.description))
  .map((page) => page.relativePath);
assert.deepEqual(arabicOnEnglish, [], 'English chrome pages shipped an Arabic meta description');

// A title may legitimately name the brand in its own text ("Why EventLive Shows
// Completed Events"). What may never happen is two brand SUFFIXES stacked at the
// end — the signature of appending the English brand to a title that already
// carried the Arabic one.
const DOUBLE_BRAND_SUFFIX = /\|\s*EventLive(?: Saudi Arabia)?\s*\|\s*EventLive(?: Saudi Arabia)?\s*$/;
const doubledBrand = pages
  .filter((page) => DOUBLE_BRAND_SUFFIX.test(page.title))
  .map((page) => `${page.relativePath}: ${page.title}`);
assert.deepEqual(doubledBrand, [], 'a <title> ends with the brand suffix twice');

// English CHROME pages (everything the templates own) must have an English
// title. Event titles are content: an untranslated one is MT backlog, reported
// by the en-surface sweep, and never blocks the build (owner rule: translation
// never breaks the sync).
const arabicChromeTitles = indexable
  .filter((page) => page.english && !page.relativePath.startsWith('en/events/') && ARABIC.test(page.title))
  .map((page) => `${page.relativePath}: ${page.title}`);
assert.deepEqual(arabicChromeTitles, [], 'English chrome pages shipped an Arabic <title>');

console.log(`search-indexability-regression-test: ${pages.length} pages audited, ${indexable.length} indexable, 0 violations`);
