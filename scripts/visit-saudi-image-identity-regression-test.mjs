// WO-5 regression coverage: PDF poster crop <-> event identity gate.
//
// Part 1 exercises the shared gate (scripts/image-identity-gate.mjs) directly with fixed
// fixtures covering an accept case and a reject case.
// Part 2 runs the self-heal script (scripts/heal-visit-saudi-image-identity.mjs)
// end-to-end against an isolated fixture catalog + source_candidates.json, including the
// narrative case the work order was opened for: the "شاكر الشريف" comedy show event whose
// image_url is a stale PDF-crop filename (visit-saudi-summer-2026-p038-bottom-left.jpg)
// that a later sync cycle has silently overwritten with a different event's poster.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

fs.writeFileSync(catalogPath, `${JSON.stringify({
  events: [
    // The narrative case: this event's title no longer matches whatever the source PDF
    // currently has at page 38 bottom-left (a later sync moved a different show there).
    {
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
      id: 'event-سكة-الأطعمة',
      title: 'سكة الأطعمة',
      starts_at: '2026-06-01T00:00:00+03:00',
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
      id: 'event-فعالية-صيفية-قديمة',
      title: 'فعالية صيفية قديمة',
      starts_at: '2026-05-10T00:00:00+03:00',
      city: 'Riyadh',
      source_label: 'Visit Saudi Summer Calendar PDF',
      source_url: PDF_URL,
      image_url: '/assets/event-images/visit-saudi-summer-2026-p099-top-left.jpg',
      original_image_url: '/assets/event-images/visit-saudi-summer-2026-p099-top-left.jpg',
      image_alt: 'فعالية صيفية قديمة'
    },
    // Non-PDF-crop event: must be ignored entirely by the heal pass.
    {
      id: 'event-unrelated',
      title: 'فعالية غير متعلقة',
      starts_at: '2026-08-01T00:00:00+03:00',
      city: 'Riyadh',
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

fs.writeFileSync(manifestPath, `${JSON.stringify({
  generated_at: '2026-07-28T00:00:00.000Z',
  public_base_path: '/assets/event-images',
  images: {},
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

assert.equal(report.totals.struck, 2, 'exactly the two stale assignments must be struck');
assert.equal(report.totals.verified, 1, 'exactly the one still-correct assignment must be verified');
assert.ok(report.struck.some((item) => item.id === 'event-عرض-ستاند-أب-كوميدي-مع-شاكر-الشريف' && item.reason === 'identity-mismatch'));
assert.ok(report.struck.some((item) => item.id === 'event-فعالية-صيفية-قديمة' && item.reason === 'slot-vacated'));

console.log('visit-saudi-image-identity-regression-test: self-heal fixtures ok');
console.log('visit-saudi-image-identity-regression-test: ok');
