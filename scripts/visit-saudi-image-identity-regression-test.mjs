// WO-5 regression coverage: PDF poster crop <-> event identity gate.
//
// Part 1 exercises the shared gate (scripts/image-identity-gate.mjs) directly with fixed
// fixtures covering an accept case and a reject case.
// Part 2 runs the self-heal script (scripts/heal-visit-saudi-image-identity.mjs)
// end-to-end against an isolated fixture catalog + source_candidates.json, including the
// narrative case the work order was opened for: the "شاكر الشريف" comedy show event whose
// image_url is a stale PDF-crop filename (visit-saudi-summer-2026-p038-bottom-left.jpg)
// that a later sync cycle has silently overwritten with a different event's poster.
// Part 3 is the class-ban: the first live heal run (sync 30423604962) struck 38 events
// exactly as this test's Part 2 predicted, but every struck row was then rejected by
// scripts/validate-data.mjs's strict catalog schema (additionalProperties: false,
// empty-string image_* fields don't satisfy their format/pattern/enum constraints). Part 2
// alone never caught this because it only asserted strike *mechanics*, not schema
// *validity* of the resulting rows - so Part 3 runs the real validator (the exact script
// `npm run validate` invokes, as a subprocess, not a reimplementation) against the
// struck fixture catalog and requires zero errors. This makes it impossible for a future
// change to strikeAssignment()'s output shape to pass locally and die in CI, because the
// validate gate that caught this bug lives inside `sources:sync` (after `sources:details`)
// and is therefore never exercised by the ~53-check Regression checks battery or any
// `npm run test:*` command - this fixture-scoped subprocess call is the only local
// signal for it.
// Part 4 is a second class-ban for the same "one script's rewrite silently erases
// another script's write to a shared file" defect family: scripts/cache-event-images.mjs's
// existingManifest() reconstructs data/event_image_cache_manifest.json from a fixed field
// list and was dropping the heal step's pdf_crop_provenance key on every `images:cache`
// run (confirmed live: sync 30424564386 landed with pdf_crop_provenance: {} in production).
// Part 4 runs the real cache-event-images.mjs as a subprocess, with zero network targets,
// against the manifest Part 2 just healed, and asserts provenance survives.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  distinctiveTitleTokens,
  normalizeArabicIdentityText,
  parseVisitSaudiCropFilename,
  passesImageIdentityGate
} from './image-identity-gate.mjs';

const root = process.cwd();

// --- Part 1: shared gate unit fixtures ---------------------------------------------

// Accept case: crop occupant title and event title are the same real Visit Saudi summer
// calendar entry ("Street Food" district, page 47 top-right of the 2026 PDF).
{
  const cropTitle = 'سكة الأطعمة';
  const eventTitle = 'سكة الأطعمة';
  const gate = passesImageIdentityGate(distinctiveTitleTokens(cropTitle), distinctiveTitleTokens(eventTitle));
  assert.equal(gate.passes, true, 'a crop whose title matches the event title must pass the identity gate');
  assert.deepEqual(gate.matchedTokens.sort(), distinctiveTitleTokens(eventTitle).sort());
}

// Reject case: two unrelated events observed sharing the exact same positional filename
// (visit-saudi-summer-2026-p053-bottom-left.jpg) in the live catalog - proof the filename
// alone cannot be trusted as identity. Neither title's distinctive words appear in the
// other's, so the gate must refuse the match.
{
  const currentOccupantTitle = 'ورث الفن';
  const staleEventTitle = 'كايف المزرعة';
  const gate = passesImageIdentityGate(distinctiveTitleTokens(currentOccupantTitle), distinctiveTitleTokens(staleEventTitle));
  assert.equal(gate.passes, false, 'unrelated titles sharing one positional filename must fail the identity gate');
  assert.deepEqual(gate.matchedTokens, []);
}

// Arabic normalization: tashkeel, alef variants, and ta marbuta must not defeat matching.
{
  const withDiacritics = 'عَرْضُ سْتَانْدْ أَبْ كُومِيدِي';
  const plain = 'عرض ستاند اب كوميدي';
  assert.equal(normalizeArabicIdentityText(withDiacritics), normalizeArabicIdentityText(plain));
  const alefVariant = distinctiveTitleTokens('أسامة إبراهيم آدم');
  const alefNormalized = distinctiveTitleTokens('اسامه ابراهيم ادم');
  assert.deepEqual(alefVariant.sort(), alefNormalized.sort(), 'alef variants and ta marbuta must normalize to the same tokens');
}

// Threshold: >=2 distinctive words intersecting is enough even under 50% ratio for long titles.
{
  const gate = passesImageIdentityGate(
    ['كوميدي', 'شاكر'],
    ['عرض', 'ستاند', 'اب', 'كوميدي', 'مع', 'شاكر', 'الشريف']
  );
  assert.equal(gate.passes, true, '>=2 intersecting distinctive words must pass even below the 50% ratio threshold');
}

// Filename parsing.
{
  assert.deepEqual(parseVisitSaudiCropFilename('/assets/event-images/visit-saudi-summer-2026-p038-bottom-left.jpg'), {
    filename: 'visit-saudi-summer-2026-p038-bottom-left.jpg',
    year: 2026,
    page: 38,
    position: 'bottom-left'
  });
  assert.equal(parseVisitSaudiCropFilename('/assets/event-covers/some-event.svg'), null, 'generated covers are not PDF crops');
  assert.equal(parseVisitSaudiCropFilename('https://example.com/photo.jpg'), null, 'remote images are not PDF crops');
}

console.log('visit-saudi-image-identity-regression-test: gate unit fixtures ok');

// --- Part 2: end-to-end self-heal run -----------------------------------------------

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-visit-saudi-image-identity-'));
const catalogPath = path.join(tmp, 'events_catalog.json');
const candidatesPath = path.join(tmp, 'source_candidates.json');
const manifestPath = path.join(tmp, 'event_image_cache_manifest.json');
const reportJsonPath = path.join(tmp, 'report.json');
const reportMdPath = path.join(tmp, 'report.md');

const PDF_URL = 'https://www.visitsaudi.com/content/dam/documents/saudi-calendar-ar.pdf';

// Every event below carries the full set of fields data/events-catalog.schema.json
// requires (organizer, venue, category, raw_category, ends_at, updated_at,
// sessions_count, source_confidence, approval_status, live_schedule_ready) so that Part 3
// exercises the real validator against realistic, otherwise-valid catalog rows - the only
// thing under test is whether striking an image assignment keeps the row schema-valid.
const REQUIRED_FIXTURE_FIELDS = {
  organizer: 'Saudi Tourism Authority',
  venue: 'Jeddah',
  category: 'tourism-experiences',
  raw_category: 'tourism',
  ends_at: '2026-07-30T23:59:00+03:00',
  updated_at: '2026-07-28T00:00:00.000Z',
  sessions_count: 0,
  source_confidence: 'approved-source',
  approval_status: 'published',
  live_schedule_ready: false
};

fs.writeFileSync(catalogPath, `${JSON.stringify({
  events: [
    // The narrative case: this event's title no longer matches whatever the source PDF
    // currently has at page 38 bottom-left (a later sync moved a different show there).
    {
      ...REQUIRED_FIXTURE_FIELDS,
      id: 'event-عرض-ستاند-أب-كوميدي-مع-شاكر-الشريف',
      title: 'عرض ستاند أب كوميدي مع شاكر الشريف',
      starts_at: '2026-07-30T00:00:00+03:00',
      city: 'Jeddah',
      source_label: 'Visit Saudi Summer Calendar PDF',
      source_url: PDF_URL,
      image_url: '/assets/event-images/visit-saudi-summer-2026-p038-bottom-left.jpg',
      original_image_url: '/assets/event-images/visit-saudi-summer-2026-p038-bottom-left.jpg',
      image_alt: 'عرض ستاند أب كوميدي مع شاكر الشريف'
    },
    // Control case: still correctly bound this cycle - must survive untouched.
    {
      ...REQUIRED_FIXTURE_FIELDS,
      id: 'event-سكة-الأطعمة',
      title: 'سكة الأطعمة',
      starts_at: '2026-06-01T00:00:00+03:00',
      ends_at: '2026-06-01T23:59:00+03:00',
      city: 'Jeddah',
      source_label: 'Visit Saudi Summer Calendar PDF',
      source_url: PDF_URL,
      image_url: '/assets/event-images/visit-saudi-summer-2026-p047-top-right.jpg',
      original_image_url: '/assets/event-images/visit-saudi-summer-2026-p047-top-right.jpg',
      image_alt: 'سكة الأطعمة'
    },
    // Vacated-slot case: the page/position this event captured no longer has any dated
    // card at all in the freshest extraction (calendar reshuffled it away entirely).
    {
      ...REQUIRED_FIXTURE_FIELDS,
      id: 'event-فعالية-صيفية-قديمة',
      title: 'فعالية صيفية قديمة',
      starts_at: '2026-05-10T00:00:00+03:00',
      ends_at: '2026-05-10T23:59:00+03:00',
      city: 'Riyadh',
      venue: 'Riyadh',
      source_label: 'Visit Saudi Summer Calendar PDF',
      source_url: PDF_URL,
      image_url: '/assets/event-images/visit-saudi-summer-2026-p099-top-left.jpg',
      original_image_url: '/assets/event-images/visit-saudi-summer-2026-p099-top-left.jpg',
      image_alt: 'فعالية صيفية قديمة'
    },
    // Non-PDF-crop event: must be ignored entirely by the heal pass.
    {
      ...REQUIRED_FIXTURE_FIELDS,
      id: 'event-unrelated',
      title: 'فعالية غير متعلقة',
      starts_at: '2026-08-01T00:00:00+03:00',
      ends_at: '2026-08-01T23:59:00+03:00',
      city: 'Riyadh',
      venue: 'Riyadh',
      source_label: 'Some Other Source',
      source_url: 'https://example.com/calendar',
      image_url: '/assets/event-covers/event-unrelated.svg'
    }
  ]
}, null, 2)}\n`, 'utf8');

fs.writeFileSync(candidatesPath, `${JSON.stringify({
  candidates: [
    // Fresh extraction this cycle: page 38 bottom-left is now a completely different show.
    {
      title: 'قهوة ونجوم في جدة',
      source_label: 'Visit Saudi Summer Calendar PDF',
      source_url: PDF_URL,
      image_url: '/assets/event-images/visit-saudi-summer-2026-p038-bottom-left.jpg'
    },
    // Fresh extraction this cycle: page 47 top-right is still Street Food - unchanged.
    {
      title: 'سكة الأطعمة',
      source_label: 'Visit Saudi Summer Calendar PDF',
      source_url: PDF_URL,
      image_url: '/assets/event-images/visit-saudi-summer-2026-p047-top-right.jpg'
    }
    // Note: no candidate at all for p099-top-left this cycle - that slot has no dated
    // card anymore, exercising the "slot-vacated" strike path.
  ]
}, null, 2)}\n`, 'utf8');

// images/failures are pre-seeded here (as if a prior images:cache run had already
// populated them) so Part 2 and Part 4 can both prove neither script clobbers the
// other's section of the shared manifest file - this cycle's real order is
// heal -> images:sync-catalog -> ... -> images:cache, and both scripts rewrite the same
// data/event_image_cache_manifest.json. cache-event-images.mjs prunes any images record
// whose referenced file no longer exists on disk (pruneMissingManifestFiles), so the
// pre-seeded record must point at a real file - inside this test's own tmp sandbox, never
// the real repo's dist/ - for it to legitimately survive a real images:cache run in Part 4.
const preseededImageFilePath = path.join(tmp, 'preexisting-cache', 'some-remote-poster-aaaaaaaaaa.jpg');
fs.mkdirSync(path.dirname(preseededImageFilePath), { recursive: true });
fs.writeFileSync(preseededImageFilePath, Buffer.from('fixture-image-bytes'));
const PRESEEDED_MANIFEST_IMAGE = {
  source_url: 'https://example.com/some-remote-poster.jpg',
  public_path: '/assets/event-images/some-remote-poster-aaaaaaaaaa.jpg',
  file: path.relative(root, preseededImageFilePath),
  content_type: 'image/jpeg',
  bytes: 12345,
  event_ids: ['event-unrelated-remote'],
  titles: ['Unrelated remote-image event'],
  cached_at: '2026-07-01T00:00:00.000Z',
  checked_at: '2026-07-01T00:00:00.000Z'
};
const PRESEEDED_MANIFEST_FAILURE = {
  source_url: 'https://example.com/broken-poster.jpg',
  failure_kind: 'not-found',
  reason: 'HTTP 404',
  failed_at: '2026-07-01T00:00:00.000Z',
  retry_after: '2026-07-02T00:00:00.000Z',
  attempts: 1,
  event_ids: ['event-unrelated-remote-2'],
  titles: ['Another unrelated event'],
  source_hosts: ['example.com']
};

fs.writeFileSync(manifestPath, `${JSON.stringify({
  generated_at: '2026-07-28T00:00:00.000Z',
  public_base_path: '/assets/event-images',
  images: {
    'https://example.com/some-remote-poster.jpg': PRESEEDED_MANIFEST_IMAGE
  },
  failures: {
    'https://example.com/broken-poster.jpg': PRESEEDED_MANIFEST_FAILURE
  },
  pdf_crop_provenance: {
    'event-عرض-ستاند-أب-كوميدي-مع-شاكر-الشريف': {
      event_id: 'event-عرض-ستاند-أب-كوميدي-مع-شاكر-الشريف',
      source_pdf: PDF_URL,
      page: 38,
      position: 'bottom-left',
      ocr_tokens_matched: ['عرض', 'ستاند', 'كوميدي', 'شاكر', 'الشريف'],
      verified_at: '2026-07-01T00:00:00.000Z'
    }
  }
}, null, 2)}\n`, 'utf8');

process.env.EVENTLIVE_EVENTS_CATALOG_FILE = path.relative(root, catalogPath);
process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE = path.relative(root, candidatesPath);
process.env.EVENTLIVE_IMAGE_CACHE_MANIFEST_FILE = path.relative(root, manifestPath);
process.env.EVENTLIVE_IMAGE_IDENTITY_REPORT_JSON_FILE = path.relative(root, reportJsonPath);
process.env.EVENTLIVE_IMAGE_IDENTITY_REPORT_MD_FILE = path.relative(root, reportMdPath);

await import('./heal-visit-saudi-image-identity.mjs');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'));

const shaker = catalog.events.find((event) => event.id === 'event-عرض-ستاند-أب-كوميدي-مع-شاكر-الشريف');
const streetFood = catalog.events.find((event) => event.id === 'event-سكة-الأطعمة');
const vacated = catalog.events.find((event) => event.id === 'event-فعالية-صيفية-قديمة');
const unrelated = catalog.events.find((event) => event.id === 'event-unrelated');

// The شاكر الشريف narrative case: struck, not left pointing at another event's poster.
assert.notEqual(shaker.image_url, '/assets/event-images/visit-saudi-summer-2026-p038-bottom-left.jpg', 'شاكر الشريف must no longer point at the mismatched positional crop');
assert.equal(shaker.image_url.startsWith('/assets/event-covers/'), true, 'a struck assignment must fall back to the generated-cover path, never an unrelated poster');
assert.equal(shaker.image_identity_strike_reason, 'identity-mismatch');
assert.ok(shaker.image_identity_struck_at, 'a struck assignment must record when it was struck');
assert.equal(manifest.pdf_crop_provenance['event-عرض-ستاند-أب-كوميدي-مع-شاكر-الشريف'], undefined, 'struck events must not retain manifest provenance');

// Vacated slot: also struck, distinct reason.
assert.equal(vacated.image_url.startsWith('/assets/event-covers/'), true);
assert.equal(vacated.image_identity_strike_reason, 'slot-vacated');

// Still-correct assignment: untouched, with provenance recorded per WO-5 requirement 2.
assert.equal(streetFood.image_url, '/assets/event-images/visit-saudi-summer-2026-p047-top-right.jpg', 'a crop that still matches its event must not be struck');
assert.equal(streetFood.image_identity_strike_reason, undefined);
const provenance = manifest.pdf_crop_provenance['event-سكة-الأطعمة'];
assert.ok(provenance, 'a verified PDF-crop assignment must have manifest provenance');
assert.equal(provenance.source_pdf, PDF_URL);
assert.equal(provenance.page, 47);
assert.equal(provenance.position, 'top-right');
assert.ok(Array.isArray(provenance.ocr_tokens_matched) && provenance.ocr_tokens_matched.length > 0);

// Non-PDF-crop event must be untouched.
assert.equal(unrelated.image_url, '/assets/event-covers/event-unrelated.svg');

// Symmetry check: the heal script must not clobber the OTHER sections of the shared
// manifest file it doesn't own (images/failures, owned by cache-event-images.mjs).
assert.deepEqual(manifest.images['https://example.com/some-remote-poster.jpg'], PRESEEDED_MANIFEST_IMAGE, 'heal must not disturb the pre-existing images cache section of the shared manifest');
assert.deepEqual(manifest.failures['https://example.com/broken-poster.jpg'], PRESEEDED_MANIFEST_FAILURE, 'heal must not disturb the pre-existing failures ledger section of the shared manifest');

assert.equal(report.totals.struck, 2, 'exactly the two stale assignments must be struck');
assert.equal(report.totals.verified, 1, 'exactly the one still-correct assignment must be verified');
assert.ok(report.struck.some((item) => item.id === 'event-عرض-ستاند-أب-كوميدي-مع-شاكر-الشريف' && item.reason === 'identity-mismatch'));
assert.ok(report.struck.some((item) => item.id === 'event-فعالية-صيفية-قديمة' && item.reason === 'slot-vacated'));

// A struck row must DELETE its now-inapplicable image fields, not set them to '' - an
// empty string satisfies none of data/events-catalog.schema.json's format/pattern/enum
// constraints for these optional fields (this is exactly what broke sync 30423604962).
for (const struckEvent of [shaker, vacated]) {
  for (const key of ['original_image_url', 'image_alt', 'image_source_url', 'image_discovered_at', 'image_discovery_method']) {
    assert.equal(Object.prototype.hasOwnProperty.call(struckEvent, key), false, `${struckEvent.id} must not retain '${key}' as an empty string - the key must be absent`);
  }
}

console.log('visit-saudi-image-identity-regression-test: self-heal fixtures ok');

// --- Part 3: class ban - the struck output must pass the REAL catalog schema validator ---
//
// Runs the exact script `npm run validate` invokes (scripts/validate-data.mjs) as a
// subprocess, scoped to the fixture catalog Part 2 just healed in place, so this proves
// schema validity with the real validator rather than a reimplementation of its rules.
// Source candidates / source registry are left pointed at the real repo files (already
// proven valid by the Regression checks battery) so only the catalog fixture - the thing
// this WO's fix touches - is under test here.
const validateReportPath = path.join(tmp, 'validation-report.md');
const validateEnv = { ...process.env, EVENTLIVE_EVENTS_CATALOG_FILE: path.relative(root, catalogPath), EVENTLIVE_VALIDATION_REPORT_FILE: path.relative(root, validateReportPath) };
// Part 2 pointed EVENTLIVE_SOURCE_CANDIDATES_FILE at a minimal candidates fixture that
// only satisfies the heal script's needs, not the (unrelated) source-candidates schema -
// unset it so this run falls back to the real, already-valid data/source_candidates.json.
delete validateEnv.EVENTLIVE_SOURCE_CANDIDATES_FILE;
delete validateEnv.EVENTLIVE_SOURCE_REGISTRY_FILE;
const validateRun = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  cwd: root,
  encoding: 'utf8',
  env: validateEnv
});

if (validateRun.status !== 0) {
  console.error(validateRun.stdout);
  console.error(validateRun.stderr);
}
assert.equal(validateRun.status, 0, 'scripts/validate-data.mjs must accept the healed fixture catalog (including all struck rows) with zero schema errors');
assert.match(validateRun.stdout, /Total errors: 0/, 'the real validator must report zero errors against the struck fixture catalog');

console.log('visit-saudi-image-identity-regression-test: struck rows pass the real catalog schema validator (class ban for sync 30423604962)');

// --- Part 4: class ban - pdf_crop_provenance must survive a real images:cache rewrite ---
//
// Second live heal run (sync 30424564386) was green (69/31/38, matching Part 2's
// predictions exactly), but post-merge verification found data/event_image_cache_manifest.json
// on origin/main with pdf_crop_provenance: {} - 0 entries where 31 were expected.
// Root cause: existingManifest() in scripts/cache-event-images.mjs (which runs via
// `images:cache`, right after the heal step in `npm run sources:sync`) reconstructs the
// manifest object from a fixed field list and was silently dropping any key it didn't
// know about, including pdf_crop_provenance. Same silent-drop class as Part 3's schema
// bug - a script's own rewrite of a file it doesn't fully own erasing another script's
// write to that same file. This part runs the REAL scripts/cache-event-images.mjs (the
// exact script `npm run images:cache` invokes) as a subprocess against the manifest Part 2
// just healed, with zero network targets (an empty dist/events.json fixture, so
// collectTargets() has nothing to fetch and no network call is made), and asserts
// pdf_crop_provenance - and the pre-seeded images/failures sections - all survive.
const cacheEventsDistPath = path.join(tmp, 'dist_events.json');
fs.writeFileSync(cacheEventsDistPath, `${JSON.stringify({ events: [] }, null, 2)}\n`, 'utf8');
const cacheImageOutputDir = path.join(tmp, 'cached-images');
const cacheReportJsonPath = path.join(tmp, 'image-cache-report.json');
const cacheReportMdPath = path.join(tmp, 'image-cache-report.md');

const cacheEnv = {
  ...process.env,
  EVENTLIVE_EVENTS_DIST_FILE: path.relative(root, cacheEventsDistPath),
  EVENTLIVE_EVENTS_CATALOG_FILE: path.relative(root, catalogPath),
  EVENTLIVE_IMAGE_CACHE_MANIFEST_FILE: path.relative(root, manifestPath),
  EVENTLIVE_IMAGE_CACHE_DIR: path.relative(root, cacheImageOutputDir),
  EVENTLIVE_IMAGE_CACHE_REPORT_JSON_FILE: path.relative(root, cacheReportJsonPath),
  EVENTLIVE_IMAGE_CACHE_REPORT_MD_FILE: path.relative(root, cacheReportMdPath),
  EVENTLIVE_IMAGE_CACHE_TIMEOUT_MS: '3000',
  EVENTLIVE_IMAGE_CACHE_CONCURRENCY: '1'
};
delete cacheEnv.EVENTLIVE_SOURCE_CANDIDATES_FILE;
delete cacheEnv.EVENTLIVE_SOURCE_REGISTRY_FILE;

const cacheRun = spawnSync(process.execPath, ['scripts/cache-event-images.mjs'], {
  cwd: root,
  encoding: 'utf8',
  env: cacheEnv,
  timeout: 30000
});

if (cacheRun.status !== 0) {
  console.error(cacheRun.stdout);
  console.error(cacheRun.stderr);
}
assert.equal(cacheRun.status, 0, 'scripts/cache-event-images.mjs must run cleanly against the healed manifest with zero network targets');

const manifestAfterCache = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.ok(manifestAfterCache.pdf_crop_provenance, 'pdf_crop_provenance key must still exist after a real images:cache rewrite (sync 30424564386 regression)');
assert.deepEqual(
  manifestAfterCache.pdf_crop_provenance['event-سكة-الأطعمة'],
  manifest.pdf_crop_provenance['event-سكة-الأطعمة'],
  'the WO-5 provenance entry the heal step wrote must survive images:cache byte-for-byte'
);
assert.equal(
  Object.keys(manifestAfterCache.pdf_crop_provenance).length,
  Object.keys(manifest.pdf_crop_provenance).length,
  'images:cache must not add or drop any pdf_crop_provenance entries'
);
// Symmetry, the other direction: images/failures (owned by cache-event-images.mjs) must
// also still be intact - proves this is a real rewrite, not a no-op subprocess call.
// cache-event-images.mjs legitimately flags any cached image whose source_url isn't
// among this run's targets as stale=true (our fixture has zero live event targets) -
// that's correct, unrelated behavior; everything else about the record must survive.
assert.deepEqual(manifestAfterCache.images['https://example.com/some-remote-poster.jpg'], { ...PRESEEDED_MANIFEST_IMAGE, stale: true }, 'images:cache must preserve its own pre-existing images section');
assert.deepEqual(manifestAfterCache.failures['https://example.com/broken-poster.jpg'], PRESEEDED_MANIFEST_FAILURE, 'images:cache must preserve its own pre-existing failures section');

console.log('visit-saudi-image-identity-regression-test: pdf_crop_provenance survives a real images:cache rewrite (class ban for sync 30424564386)');
console.log('visit-saudi-image-identity-regression-test: ok');
