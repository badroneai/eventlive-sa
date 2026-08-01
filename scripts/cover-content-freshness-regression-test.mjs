import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Regression coverage for the "stale baked cover" class of bug: a generated
// event-cover SVG kept an OLD title after the event's real title changed
// (e.g. was translated/corrected), because fallbackCover() used to run
// inside normalizeEvent() BEFORE content translation had a chance to settle
// event.title. Since a generated cover's image_url always starts with
// /assets/event-covers/, every later build re-entered the "regenerate"
// branch but kept reading the same untranslated raw.title forever — the
// drift never self-healed. See generate-site.mjs buildEvents()/normalizeEvent()
// for the fix: cover generation is now deferred until after
// contentTranslator.localizeEventProse() has run.
//
// This test proves the fix end to end: inject a synthetic catalog event,
// build, change its title, rebuild, and assert the cover SVG's baked text
// tracks the new title rather than the old one.

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distDir = path.join(root, 'dist');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');

const originalCatalogRaw = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(originalCatalogRaw);
assert.ok(Array.isArray(catalog.events), 'catalog must have an events array');

const probeId = 'event-cover-refresh-regression-probe';
const probeSlug = 'cover-refresh-regression-probe';
const initialTitle = 'Cover Refresh Regression Probe One';
const changedTitle = 'Cover Refresh Regression Probe Two Renamed';
const coverPath = path.join(distDir, 'assets', 'event-covers', `${probeSlug}.svg`);
const eventArtifactPaths = [
  coverPath,
  path.join(distDir, 'events', `${probeSlug}.html`),
  path.join(distDir, 'events', `${probeSlug}.json`),
  path.join(distDir, 'events', `${probeSlug}.ics`),
  path.join(distDir, 'en', 'events', `${probeSlug}.html`)
];

function catalogWithProbeTitle(title) {
  const withoutProbe = catalog.events.filter((event) => event.id !== probeId);
  withoutProbe.push({
    id: probeId,
    slug: probeSlug,
    file_slug: probeSlug,
    title,
    organizer: 'EventLive QA',
    city: 'Riyadh',
    venue: 'EventLive QA Lab',
    venue_address: 'EventLive QA Lab, Riyadh',
    category: 'exhibitions-conferences',
    raw_category: 'venue event',
    summary: 'Synthetic regression-test event proving generated covers track the current title.',
    starts_at: '2099-01-01T09:00:00+03:00',
    ends_at: '2099-01-01T18:00:00+03:00',
    updated_at: new Date().toISOString(),
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: 'EventLive QA',
    source_url: 'https://eventme.live',
    evidence_url: 'https://eventme.live',
    source_confidence: 'approved-source',
    richness_score: 3
  });
  return { ...catalog, events: withoutProbe };
}

function writeCatalog(value) {
  fs.writeFileSync(catalogPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rebuildArabicSite() {
  execFileSync(process.execPath, ['scripts/generate-site.mjs'], {
    cwd: root,
    env: { ...process.env, EVENTLIVE_INCREMENTAL_BUILD: 'false', EVENTLIVE_FORCE_SEO_REFRESH: 'true' },
    stdio: 'ignore'
  });
}

function bakedTitleText(svg) {
  return [...svg.matchAll(/font-size="(?:44|52|60)"[^>]*>([^<]*)<\/text>/g)]
    .map((match) => match[1])
    .join(' ');
}

let restored = false;
function restoreCatalogAndRebuild() {
  if (restored) return;
  restored = true;
  writeCatalog(catalog);
  rebuildArabicSite();
  for (const artifactPath of eventArtifactPaths) {
    if (fs.existsSync(artifactPath)) fs.rmSync(artifactPath);
  }
}

try {
  writeCatalog(catalogWithProbeTitle(initialTitle));
  rebuildArabicSite();
  assert.equal(fs.existsSync(coverPath), true, 'a public catalog event without image_url must get a generated cover');
  const firstSvg = fs.readFileSync(coverPath, 'utf8');
  assert.ok(bakedTitleText(firstSvg).includes(initialTitle), 'cover must bake the event title on first generation');
  const firstSignature = firstSvg.match(/eventlive-cover-signature: ([a-f0-9]+)/)?.[1];
  assert.ok(firstSignature, 'generated cover must carry a content-signature comment for drift auditing');

  writeCatalog(catalogWithProbeTitle(changedTitle));
  rebuildArabicSite();
  assert.equal(fs.existsSync(coverPath), true, 'cover must still exist after the title changes and the site rebuilds');
  const secondSvg = fs.readFileSync(coverPath, 'utf8');
  const secondBaked = bakedTitleText(secondSvg);
  assert.ok(!secondBaked.includes(initialTitle), 'cover must not keep baking the old title after the source title changes');
  assert.ok(secondBaked.includes(changedTitle), 'cover must bake the CURRENT title after a title change + rebuild — this is the class fix under test');
  const secondSignature = secondSvg.match(/eventlive-cover-signature: ([a-f0-9]+)/)?.[1];
  assert.ok(secondSignature, 'rebuilt cover must still carry a content-signature comment');
  assert.notEqual(secondSignature, firstSignature, 'content-signature must change when the baked title changes');

  console.log('COVER_CONTENT_FRESHNESS_OK probe=cover-refresh-regression-probe rebuilds=2 title_changes_verified=1 signature_changed=1');
} finally {
  restoreCatalogAndRebuild();
}
