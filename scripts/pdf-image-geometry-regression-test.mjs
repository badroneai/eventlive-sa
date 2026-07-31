// WO-8 regression test: geometric binding of PDF poster pixels to dated cards.
//
// Root cause (see the WO-8 PR description for the full measured-coordinate writeup):
// scripts/visit-saudi-summer-pdf-utils.mjs classified BOTH text and <image> elements into
// a page's 4 quadrants using the same fixed thresholds, but for images it used only the
// image's ORIGIN POINT (top,left). A poster whose origin lands a few px inside a
// neighboring quadrant - while the bulk of its pixels are drawn in its OWN card's quadrant
// (e.g. the real p060 collision: Rahma Riad's poster origin at left=761, just under the
// col=810 split, but spanning left=761..1614, i.e. mostly in the RIGHT column) - won that
// neighboring slot by raw pixel area, silently evicting the neighbor's own (smaller,
// fully-contained) poster. attachDatedCardImages now binds by MAXIMAL OVERLAP AREA between
// the image's full rectangle and each dated card's quadrant region instead, with an
// ambiguity rule (a low overlap ratio, or no clear margin over the runner-up) that means
// NO card image for that cycle rather than a wrong one.
//
// This file exercises the real attachDatedCardImages / parseVisitSaudiSummerPdfXml /
// restoreVisitSaudiPdfText functions (never a reimplementation) against fixture XML
// fragments, using real coordinates measured from the live PDF's page 60 (fetched fresh
// for WO-8 - see the PR description) for the collision fixture.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  attachDatedCardImages,
  parseVisitSaudiSummerPdfXml,
  restoreVisitSaudiPdfText
} from './visit-saudi-summer-pdf-utils.mjs';

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-pdf-image-geometry-'));
const sourceDir = path.join(workDir, 'source');
const outputDir = path.join(workDir, 'output');
fs.mkdirSync(sourceDir, { recursive: true });

function makeSourceImage(name, marker) {
  const filePath = path.join(sourceDir, name);
  fs.writeFileSync(filePath, `FAKE-JPEG-BYTES:${marker}`);
  return filePath;
}

function readCopiedImage(publicPath) {
  const filename = publicPath.split('/').pop();
  return fs.readFileSync(path.join(outputDir, filename), 'utf8');
}

function markersFromXml(xml) {
  return [...xml.matchAll(/<eventlive-card-image\s+([^>]*)\/>/g)].map((match) => {
    const attrs = {};
    for (const attrMatch of match[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[attrMatch[1]] = attrMatch[2];
    return attrs;
  });
}

// --- Fixture 1: the real p060 collision (Harry Potter / Rahma Riad) ---------------------
// Text nodes below are the REAL raw (RTL-reversed, pre-restoreVisitSaudiPdfText) XML text
// pdftohtml produced for page 60 of the live PDF fetched for WO-8 - title + date line only
// (trimmed for fixture brevity; the full page also has body copy, irrelevant to binding).
// Image coordinates are the REAL calendar-60_2.jpg (Harry Potter's own poster) and
// calendar-60_4.jpg (Rahma Riad's poster, spanning past the column split) origins/sizes.
const ownHarryPotterPoster = makeSourceImage('calendar-60_2.jpg', 'HARRY-POTTER-OWN-POSTER');
const rahmaPosterSpanningColumns = makeSourceImage('calendar-60_4.jpg', 'RAHMA-OWN-POSTER-SPANS-COLUMN-SPLIT');

const p060Fixture = `<pdf2xml>
  <page number="60" position="absolute" top="0" left="0" height="2025" width="1620">
    <image top="1146" left="91" width="672" height="376" src="${ownHarryPotterPoster}"/>
    <image top="1214" left="761" width="853" height="480" src="${rahmaPosterSpanningColumns}"/>
    <text top="1109" left="352" width="405" height="59" font="14"><a href="https://www.rcrc.gov.sa/"><b> Harry Potter ارتسكروأ</b></a></text>
    <text top="1546" left="488" width="272" height="46" font="16"><a href="https://www.rcrc.gov.sa/"><b>سطسغأ 1 - ويلوي 28</b></a></text>
    <text top="1109" left="890" width="628" height="59" font="14"><a href="https://webook.com/ar/sa/ruh/music-events/events/rahma-riad-at-vocally-in-riyadh-60"><b>يلاكوف � ضاير ةمحر عم ةيقارع ةليل</b></a></text>
    <text top="1547" left="1421" width="101" height="46" font="16"><a href="https://webook.com/ar/sa/ruh/music-events/events/rahma-riad-at-vocally-in-riyadh-60"><b>ويلوي 24</b></a></text>
  </page>
</pdf2xml>`;

const p060Attached = attachDatedCardImages(p060Fixture, 2026, { imageOutputDir: outputDir, publicBasePath: '/assets/event-images' });
const p060Markers = markersFromXml(p060Attached);
const bottomLeftMarker = p060Markers.find((m) => m.card === 'bottom-left');
const bottomRightMarker = p060Markers.find((m) => m.card === 'bottom-right');

assert.ok(bottomLeftMarker, 'Harry Potter (bottom-left) must still get an image');
assert.ok(bottomRightMarker, 'Rahma Riad (bottom-right) must still get an image');
assert.equal(readCopiedImage(bottomLeftMarker.src), 'FAKE-JPEG-BYTES:HARRY-POTTER-OWN-POSTER', 'bottom-left must bind to its OWN poster, not the neighbor whose origin merely lands left of the column split');
assert.equal(readCopiedImage(bottomRightMarker.src), 'FAKE-JPEG-BYTES:RAHMA-OWN-POSTER-SPANS-COLUMN-SPLIT', 'bottom-right must bind to the poster that visually belongs to it, by overlap area, not origin point');
assert.ok(Number(bottomLeftMarker['overlap-ratio']) > 0.9, 'a fully-contained poster should score a near-1.0 overlap ratio');
assert.ok(bottomLeftMarker['image-bbox'] && bottomLeftMarker['card-bbox'], 'geometry evidence (image/card bbox) must be recorded on the marker for provenance');

// Narrative end-to-end check: the parsed catalog item for Harry Potter must carry its own
// image, exactly matching what the owner's WO-8 report demanded be fixed.
const p060Items = parseVisitSaudiSummerPdfXml(`<eventlive-pdf-meta year="2026"/>\n${p060Attached}`, {
  url: 'https://www.visitsaudi.com/content/dam/documents/saudi-calendar-ar.pdf',
  owner: 'Saudi Tourism Authority'
});
const harryPotterItem = p060Items.find((item) => item.title === 'أوركسترا Harry Potter');
assert.ok(harryPotterItem, 'Harry Potter card must still parse with its correct title');
assert.equal(harryPotterItem.image_url, bottomLeftMarker.src, 'Harry Potter catalog item must point at its own crop file');
assert.equal(harryPotterItem.pdf_crop_overlap_ratio, Number(bottomLeftMarker['overlap-ratio']));
const rahmaItem = p060Items.find((item) => item.title.includes('رحمة رياض'));
assert.ok(rahmaItem, 'Rahma Riad card must still parse');
assert.equal(rahmaItem.image_url, bottomRightMarker.src, 'Rahma Riad catalog item must point at her own crop file, never the Harry Potter card\'s');

// --- Fixture 2: a clean, non-colliding 2-card layout must keep both images unchanged ----
const topLeftPoster = makeSourceImage('calendar-8_1.jpg', 'CHINA-WEEK-OWN-POSTER');
const topRightPoster = makeSourceImage('calendar-8_3.jpg', 'ICE-CREAM-DAY-OWN-POSTER');
const cleanFixture = `<pdf2xml>
  <page number="8" position="absolute" top="0" left="0" height="2025" width="1620">
    <image top="408" left="81" width="693" height="336" src="${topLeftPoster}"/>
    <image top="320" left="900" width="600" height="330" src="${topRightPoster}"/>
    <text top="321" left="502" width="254" height="59" font="14"><a href="x"><b>ينيصلا عوبس�ا</b></a></text>
    <text top="758" left="530" width="230" height="46" font="16"><a href="x"><b>ويلوي 29 - ويلوي 23</b></a></text>
    <text top="320" left="877" width="645" height="59" font="14"><a href="x"><b> عم نواعتلاب ميرك سي�ل يملاعلا مويلا</b></a></text>
    <text top="757" left="1429" width="97" height="46" font="16"><a href="x"><b>ويلوي 19</b></a></text>
  </page>
</pdf2xml>`;
const cleanAttached = attachDatedCardImages(cleanFixture, 2026, { imageOutputDir: outputDir, publicBasePath: '/assets/event-images' });
const cleanMarkers = markersFromXml(cleanAttached);
assert.equal(cleanMarkers.length, 2, 'a clean layout with no boundary-spanning images must keep exactly one image per dated card');
assert.equal(readCopiedImage(cleanMarkers.find((m) => m.card === 'top-left').src), 'FAKE-JPEG-BYTES:CHINA-WEEK-OWN-POSTER');
assert.equal(readCopiedImage(cleanMarkers.find((m) => m.card === 'top-right').src), 'FAKE-JPEG-BYTES:ICE-CREAM-DAY-OWN-POSTER');

// --- Fixture 3: ambiguity rule - a mostly off-page decorative image must attach nowhere -
// Mirrors the real page 34 bug found during WO-8's impact audit: a full-bleed background
// graphic (calendar-34_2.png) whose origin technically lands left of the column split but
// is drawn almost entirely PAST the page's right edge, previously won its slot by raw
// pixel area despite having near-zero real overlap with any card.
const offPageBanner = makeSourceImage('calendar-34_2.png', 'MOSTLY-OFF-PAGE-BANNER');
const realPoster = makeSourceImage('calendar-34_5.jpg', 'REAL-CARD-POSTER');
const ambiguousFixture = `<pdf2xml>
  <page number="34" position="absolute" top="0" left="0" height="2025" width="1620">
    <image top="292" left="1616" width="1068" height="587" src="${offPageBanner}"/>
    <image top="404" left="856" width="691" height="369" src="${realPoster}"/>
    <text top="321" left="900" width="200" height="59" font="14"><a href="x"><b>ةقراغ زونك</b></a></text>
    <text top="758" left="1200" width="230" height="46" font="16"><a href="x"><b>ويلوي 29 - ويلوي 23</b></a></text>
  </page>
</pdf2xml>`;
const ambiguousAttached = attachDatedCardImages(ambiguousFixture, 2026, { imageOutputDir: outputDir, publicBasePath: '/assets/event-images' });
const ambiguousMarkers = markersFromXml(ambiguousAttached);
assert.equal(ambiguousMarkers.length, 1, 'the off-page banner must not bind anywhere; only the real poster should attach');
assert.equal(ambiguousMarkers[0].card, 'top-right');
assert.equal(readCopiedImage(ambiguousMarkers[0].src), 'FAKE-JPEG-BYTES:REAL-CARD-POSTER');

// --- Fixture 4: lam-alef ligature drop -> title must parse as أحلام, not أحام ------------
// Raw text is the ACTUAL byte sequence pdftohtml emitted for this card in the live PDF
// fetched for WO-8 (page 38): a word-internal U+FFFD standing in for the dropped لا.
assert.equal(restoreVisitSaudiPdfText('<a href="x"><b>م�حأ ةلفح</b></a>'), 'حفلة أحلام', 'word-internal lam-alef ligature drop must restore to أحلام, not أحام');
assert.equal(
  restoreVisitSaudiPdfText('<a href="x">،ةرخاف ةيبرط ةيسمأ � م�حأ ةنانفلا عم ةيئانثتسا ةليلل اودعتسا</a>'),
  'استعدوا لليلة استثنائية مع الفنانة أحلام في أمسية طربية فاخرة،',
  'the SAME summary line must both restore أحلام AND keep the pre-existing isolated-token في fixup intact'
);
// The assertion above already proves the standalone/isolated "�" token in that same
// sentence (a DIFFERENT corruption class - an entire dropped short word, not a
// word-internal ligature - see decodeXml's comment) still resolves via the pre-existing
// في fixup, unaffected by this change.

// --- Fixture 5: title-correction identity continuity ------------------------------------
// The ligature fix means an ALREADY-PUBLISHED event's title changes text on its next sync
// (e.g. "حفلة أحام" -> "حفلة أحلام"). Traced end-to-end: for a multi-event PDF document
// source, candidateSourceDateKey/candidateSourceIdentityKey in
// scripts/auto-publish-source-candidates.mjs both deliberately return '' (a single PDF page
// holds many distinct dated cards, so a source-URL-only key would collide across all of
// them), so the ENTIRE match cascade for this source class falls back to title-text keys -
// which the ligature fix, by definition, breaks for this one title. Without
// ligatureTolerantDocumentTitleMatch, this would mint a brand-new "event-حفلة-أحلام" row
// while "event-حفلة-أحام" sits orphaned with its stale title forever. This exercises the
// REAL scripts/auto-publish-source-candidates.mjs as a subprocess (never a
// reimplementation) against a fixture catalog + candidate, matching the project's existing
// "class ban" pattern (see scripts/source-auto-publish-regression-test.mjs).
// scripts/auto-publish-source-candidates.mjs resolves its env-override file paths as
// path.join(process.cwd(), envValue) (see `root` in scripts/program-lifecycle-utils.mjs) -
// an OS tmpdir absolute path would double up incorrectly, so (matching the convention in
// scripts/source-auto-publish-regression-test.mjs) this fixture lives under the repo's
// gitignored workspaces/ directory instead, relative to repo root.
const identityWorkdir = 'workspaces/_pdf-image-geometry-identity-continuity';
fs.rmSync(identityWorkdir, { recursive: true, force: true });
fs.mkdirSync(identityWorkdir, { recursive: true });
const identityCatalogPath = path.join(identityWorkdir, 'events_catalog.json');
const identityCandidatesPath = path.join(identityWorkdir, 'source_candidates.json');
const identityReportJsonPath = path.join(identityWorkdir, 'auto-publish-report.json');
const identityReportMdPath = path.join(identityWorkdir, 'auto-publish-report.md');
const pdfSourceUrl = 'https://www.visitsaudi.com/content/dam/documents/saudi-calendar-ar.pdf';

fs.writeFileSync(identityCatalogPath, `${JSON.stringify({
  generated_for: 'WO-8 identity-continuity regression',
  notes: 'Fixture: one already-published event with the pre-fix ligature-dropped title.',
  events: [{
    id: 'event-حفلة-أحام',
    slug: 'حفلة-أحام',
    title: 'حفلة أحام',
    organizer: 'Saudi Tourism Authority',
    city: 'Jeddah',
    venue: 'جدة',
    venue_address: 'جدة',
    category: 'family-entertainment',
    summary: 'Fixture summary before the ligature fix.',
    starts_at: '2099-07-30T00:00:00+03:00',
    ends_at: '2099-07-30T23:59:00+03:00',
    updated_at: '2099-07-01T00:00:00+03:00',
    sessions_count: 0,
    tracks_count: 0,
    rooms_count: 0,
    live_updates_count: 0,
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: 'Visit Saudi Summer Calendar PDF',
    source_url: pdfSourceUrl,
    evidence_url: pdfSourceUrl,
    source_confidence: 'approved-source',
    live_schedule_ready: false,
    source_file: '',
    tags: ['tourism']
  }]
}, null, 2)}\n`, 'utf8');

fs.writeFileSync(identityCandidatesPath, `${JSON.stringify({
  generated_for: 'WO-8 identity-continuity regression',
  notes: 'Fixture: a fresh candidate for the SAME card, now with the ligature fixed.',
  candidates: [{
    id: 'candidate-حفلة-أحلام-2099-07-30',
    title: 'حفلة أحلام',
    organizer: 'Saudi Tourism Authority',
    city: 'Jeddah',
    venue: 'جدة',
    category: 'entertainment',
    summary: 'Fixture summary after the ligature fix.',
    starts_at: '2099-07-30T00:00:00+03:00',
    ends_at: '2099-07-30T23:59:00+03:00',
    source_type: 'official-pdf',
    source_url: pdfSourceUrl,
    source_label: 'Visit Saudi Summer Calendar PDF',
    source_owner: 'Saudi Tourism Authority',
    evidence_url: pdfSourceUrl,
    raw_snapshot_path: 'data/raw/source-snapshots/fixture.xml',
    discovered_at: '2099-07-01T00:00:00+03:00',
    discovery_method: 'official-pdf-row',
    confidence: 'official',
    review_status: 'ready-for-review',
    publication_gate: 'duplicate-review',
    extracted_sessions_count: 0,
    tags: ['tourism']
  }]
}, null, 2)}\n`, 'utf8');

const identityRun = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: identityCandidatesPath,
    EVENTLIVE_EVENTS_CATALOG_FILE: identityCatalogPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: identityReportJsonPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_MD: identityReportMdPath
  }
});
assert.equal(identityRun.status, 0, `auto-publish-source-candidates.mjs must exit 0\n${identityRun.stdout}\n${identityRun.stderr}`);

const identityCatalog = JSON.parse(fs.readFileSync(identityCatalogPath, 'utf8'));
assert.equal(identityCatalog.events.length, 1, 'the corrected title must NOT mint a second, orphaning event');
assert.equal(identityCatalog.events[0].id, 'event-حفلة-أحام', 'the id must stay stable once minted, even though the title text changed');
assert.equal(identityCatalog.events[0].title, 'حفلة أحلام', 'the existing event must be updated IN PLACE to the corrected title');

fs.rmSync(workDir, { recursive: true, force: true });
console.log('pdf-image-geometry-regression-test: p060 collision fixture ok (bottom-left keeps its OWN poster)');
console.log('pdf-image-geometry-regression-test: clean 2-card layout unaffected');
console.log('pdf-image-geometry-regression-test: ambiguous/off-page image attaches to no card (cover fallback)');
console.log('pdf-image-geometry-regression-test: lam-alef ligature drop (أحام -> أحلام) fixed at extraction');
console.log('pdf-image-geometry-regression-test: title-correction identity continuity ok (no orphan/duplicate)');
console.log('pdf-image-geometry-regression-test: ok');
