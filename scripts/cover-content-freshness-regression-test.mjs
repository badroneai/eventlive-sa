import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { contentTranslationKey, loadContentTranslations, saveContentTranslations } from './content-translation-cache.mjs';

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
//
// INTENTIONALLY NOT WIRED INTO CI (dead-gate triage, 2026-08-02). This is a
// real, still-valid regression test, but it is unsafe to run inside any
// battery shared with the source-sync pipeline, and too slow/heavy to add
// to the ~35s ci:site-gates battery deploy.yml and source-sync.yml both
// share:
//   - It forces THREE full non-incremental rebuilds
//     (EVENTLIVE_INCREMENTAL_BUILD=false, one with
//     EVENTLIVE_FORCE_SEO_REFRESH=true) to get a deterministic result,
//     which took ~73s measured locally on 2026-08-02 — more than double the
//     entire ci:site-gates battery's own budget.
//   - A non-incremental rebuild regenerates every date-dependent artifact
//     (event covers whose "ended" status flips with "today"), not just the
//     probe event this test injects: the measured local run touched ~5,000
//     dist/ files even though the finally-block restores the real catalog
//     and rebuilds again afterward.
//   - Critically, one of those touched files is data/seo_page_state.json —
//     a file source-sync.yml's "Persist sync state back to the repository"
//     step commits straight from the working tree. If this test ran inside
//     a step that precedes that commit (which is where its siblings like
//     test:card-covers live), a rebuild forced by THIS test — not the
//     actual sync's real content changes — could get swept into the daily
//     sync commit as unrelated SEO-state churn.
// A human should run `npm run test:cover-content-freshness` manually
// whenever touching cover generation, the normalizeEvent()/
// localizeEventProse() ordering it guards, or the EN cover-variant
// selection logic in generate-site.mjs / generate-localized-site.mjs —
// before opening a PR that touches those paths. See
// scripts/run-publish-quality-gates.mjs and GATES-GOVERNANCE.md for how
// the two CI-reachable batteries (ci:site-gates, ci:publish-quality-gates)
// are kept honest; this script deliberately stays outside both.

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
    env: { ...process.env, EVENTLIVE_INCREMENTAL_BUILD: 'false', EVENTLIVE_FORCE_SEO_REFRESH: 'true', EVENTLIVE_SEO_STATE_PATH: '.eventlive-cache/seo-state-test.json' },
    stdio: 'ignore'
  });
}

function rebuildLocalizedSite() {
  execFileSync(process.execPath, ['scripts/generate-localized-site.mjs'], {
    cwd: root,
    env: { ...process.env, EVENTLIVE_INCREMENTAL_BUILD: 'false' },
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

// --- EN cover-variant regression coverage -----------------------------
// A generated cover bakes the AR title into the SVG; /en/ pages used to
// reference that exact same file, shipping Arabic-baked images to English
// visitors. generate-site.mjs now writes an English-baked sibling at
// assets/event-covers/en/<slug>.svg (fallbackCoverEn()) whenever the EN
// title resolves to genuine non-Arabic text, and generate-localized-site.mjs
// rewrites every cover-URL surface on the EN page (img src, og:image,
// twitter:image, JSON-LD image) to that variant when it exists on disk.
// This proves it end to end for a real Arabic-title event with a KNOWN
// ar->en cache translation (the same lookup EN pages use for title_en).
const enProbeId = 'event-cover-en-variant-regression-probe';
const enProbeSlug = 'cover-en-variant-regression-probe';
const enProbeArabicTitle = 'فعالية تجريبية للتحقق من غلاف الصفحة الإنجليزية';
const enProbeEnglishTitle = 'Regression Probe English Cover Verification Event';
const enProbeArtifacts = {
  arCover: path.join(distDir, 'assets', 'event-covers', `${enProbeSlug}.svg`),
  enCover: path.join(distDir, 'assets', 'event-covers', 'en', `${enProbeSlug}.svg`),
  arHtml: path.join(distDir, 'events', `${enProbeSlug}.html`),
  arJson: path.join(distDir, 'events', `${enProbeSlug}.json`),
  arIcs: path.join(distDir, 'events', `${enProbeSlug}.ics`),
  enHtml: path.join(distDir, 'en', 'events', `${enProbeSlug}.html`)
};

function catalogWithEnProbe() {
  const withoutProbe = catalog.events.filter((event) => event.id !== enProbeId);
  withoutProbe.push({
    id: enProbeId,
    slug: enProbeSlug,
    file_slug: enProbeSlug,
    title: enProbeArabicTitle,
    organizer: 'EventLive QA',
    city: 'Riyadh',
    venue: 'EventLive QA Lab',
    venue_address: 'EventLive QA Lab, Riyadh',
    category: 'exhibitions-conferences',
    raw_category: 'venue event',
    summary: 'فعالية تجريبية اصطناعية للتحقق من أن صفحات اللغة الإنجليزية تعرض غلافًا مولّدًا بنص إنجليزي.',
    starts_at: '2099-02-01T09:00:00+03:00',
    ends_at: '2099-02-01T18:00:00+03:00',
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

const contentTranslationsPath = path.join(root, 'data', 'content_translations.json');
const originalContentTranslationsRaw = fs.existsSync(contentTranslationsPath)
  ? fs.readFileSync(contentTranslationsPath, 'utf8')
  : null;

function injectKnownEnTranslation() {
  const cache = loadContentTranslations();
  const key = contentTranslationKey('ar', 'en', enProbeArabicTitle);
  cache.entries[key] = {
    source_lang: 'ar',
    target_lang: 'en',
    source: enProbeArabicTitle,
    text: enProbeEnglishTitle,
    // 'llm-agent' keeps this entry immune to pruneGlossaryViolations() /
    // pruneMixedTranslations(), which only ever touch machine entries.
    method: 'llm-agent'
  };
  saveContentTranslations(cache);
}

function restoreContentTranslations() {
  if (originalContentTranslationsRaw === null) {
    if (fs.existsSync(contentTranslationsPath)) fs.rmSync(contentTranslationsPath, { force: true });
    return;
  }
  fs.writeFileSync(contentTranslationsPath, originalContentTranslationsRaw, 'utf8');
}

let enProbeRestored = false;
function restoreEnProbeAndRebuild() {
  if (enProbeRestored) return;
  enProbeRestored = true;
  writeCatalog(catalog);
  restoreContentTranslations();
  rebuildArabicSite();
  for (const artifactPath of Object.values(enProbeArtifacts)) {
    if (fs.existsSync(artifactPath)) fs.rmSync(artifactPath, { force: true });
  }
}

try {
  writeCatalog(catalogWithEnProbe());
  injectKnownEnTranslation();
  rebuildArabicSite();

  assert.equal(fs.existsSync(enProbeArtifacts.enCover), true, 'a generated cover with a known ar->en translation must get an EN-baked variant');
  const enCoverSvg = fs.readFileSync(enProbeArtifacts.enCover, 'utf8');
  assert.ok(bakedTitleText(enCoverSvg).includes(enProbeEnglishTitle), 'the EN cover variant must bake the EN title, not the Arabic title');
  assert.ok(!bakedTitleText(enCoverSvg).includes(enProbeArabicTitle), 'the EN cover variant must not bake Arabic text');
  const enCoverSignature = enCoverSvg.match(/eventlive-cover-signature: ([a-f0-9]+)/)?.[1];
  assert.ok(enCoverSignature, 'EN cover variant must carry its own content-signature comment (PR #56 idiom extended to the EN variant)');

  rebuildLocalizedSite();

  assert.equal(fs.existsSync(enProbeArtifacts.enHtml), true, 'the EN event page must be generated for the probe event');
  const enHtml = fs.readFileSync(enProbeArtifacts.enHtml, 'utf8');
  const $ = load(enHtml, { decodeEntities: false });
  const enCoverHref = `/assets/event-covers/en/${enProbeSlug}.svg`;

  const coverImgSrc = $('img.cover').first().attr('src');
  assert.equal(coverImgSrc, enCoverHref, 'the EN event page must reference the EN cover variant in its <img src>, not the Arabic cover');

  const ogImage = $('meta[property="og:image"]').attr('content');
  assert.ok(ogImage?.endsWith(enCoverHref), 'the EN event page og:image must point at the EN cover variant');

  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  assert.ok(twitterImage?.endsWith(enCoverHref), 'the EN event page twitter:image must point at the EN cover variant');

  const eventJsonLd = $('script[type="application/ld+json"]').toArray()
    .map((element) => { try { return JSON.parse($(element).html() || '{}'); } catch { return null; } })
    .find((value) => value?.['@type'] === 'Event');
  assert.ok(Array.isArray(eventJsonLd?.image) && eventJsonLd.image.some((url) => String(url).endsWith(enCoverHref)), 'the EN event page JSON-LD Event.image must point at the EN cover variant');

  console.log('COVER_EN_VARIANT_OK probe=cover-en-variant-regression-probe en_cover_written=1 en_page_references_en_cover=1 en_title_baked=1');
} finally {
  restoreEnProbeAndRebuild();
}
