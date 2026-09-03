import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLocaleContext, localizedPath, supportedLocales, validateLocaleMessages } from './i18n-utils.mjs';
import { contentTranslationKey, createContentTranslator } from './content-translation-cache.mjs';

assert.deepEqual(supportedLocales(), ['ar-SA', 'en-SA']);
assert.deepEqual(validateLocaleMessages(), []);
assert.equal(localizedPath('events.html', 'ar-SA'), 'events.html');
assert.equal(localizedPath('events.html', 'en-SA'), 'en/events.html');

const ar = createLocaleContext('ar-SA');
const en = createLocaleContext('en-SA');
assert.equal(ar.dir, 'rtl');
assert.equal(en.dir, 'ltr');
assert.equal(en.t('event.startsIn', { duration: '2 hours' }), 'Starts in 2 hours');
assert.match(ar.formatNumber(1234), /١|۱/);
assert.match(en.formatNumber(1234), /1/);

const manifest = JSON.parse(fs.readFileSync('locales/manifest.json', 'utf8'));
assert.ok(manifest.futureLocales['zh-Hans'], 'future Chinese locale contract must remain declared');

console.log('TEST_OK i18n locale contract supports Arabic, English, and future locale registration');

// =============================================================================
// WO-10 (2026-07-31, owner-caught): CONTENT_PROSE_FIELDS registry sweep.
//
// `event.venue` rendered raw English ("Qassim") on the Arabic card-meta line
// because it was never listed in scripts/content-translation-cache.mjs's
// CONTENT_PROSE_FIELDS — the single registration point that feeds the AR
// swap, the EN restore, the CI translation queue, the disclosure marker, and
// the coverage metrics. Same defect class as the PR #19 outline leak: a
// prose field outside the registry is invisible to the whole system, not
// just missing a translation.
//
// Part A (unit, no build) proves every field the WO-10 field audit flagged
// REGISTER is actually wired into the registry, and that the two fields the
// audit flagged intentionally-not (program_outline.provider, session.speaker)
// stay out as a decision rather than an oversight.
//
// Part B (build) proves the wiring survives contact with a real
// generate-site.mjs build: a synthetic event carries a unique marker in
// every registered field plus a matching pre-seeded translation-cache entry
// (never data/content_translations.json — a throwaway copy in a scratch
// fixture dir), and the built Arabic event page must show the TRANSLATED
// marker everywhere that field renders, with the raw English marker gone.
// =============================================================================

const root = process.cwd();

const M = {
  VENUE: 'WO10-REGISTRY-SWEEP-VENUE-QZX',
  VENUE_ADDRESS: 'WO10-REGISTRY-SWEEP-VENUEADDR-QZX',
  ORGANIZER: 'WO10-REGISTRY-SWEEP-ORGANIZER-QZX',
  IMAGE_ALT: 'WO10-REGISTRY-SWEEP-IMAGEALT-QZX',
  DESCRIPTION: 'WO10-REGISTRY-SWEEP-DESCRIPTION-QZX',
  PRICE_LABEL: 'WO10-REGISTRY-SWEEP-PRICELABEL-QZX',
  TITLE: 'WO10-REGISTRY-SWEEP-TITLE-QZX',
  SUMMARY: 'WO10-REGISTRY-SWEEP-SUMMARY-QZX',
  RICH_SUMMARY: 'WO10-REGISTRY-SWEEP-RICHSUMMARY-QZX',
  OFFICIAL_DESCRIPTION: 'WO10-REGISTRY-SWEEP-OFFICIALDESC-QZX',
  DURATION_TEXT: 'WO10-REGISTRY-SWEEP-DURATION-QZX',
  GOAL: 'WO10-REGISTRY-SWEEP-GOAL-QZX',
  FEATURE: 'WO10-REGISTRY-SWEEP-FEATURE-QZX',
  REQUIREMENT: 'WO10-REGISTRY-SWEEP-REQUIREMENT-QZX',
  HIGHLIGHT: 'WO10-REGISTRY-SWEEP-HIGHLIGHT-QZX',
  SESSION_TITLE: 'WO10-REGISTRY-SWEEP-SESSIONTITLE-QZX',
  ROOM: 'WO10-REGISTRY-SWEEP-ROOM-QZX',
  TRACK: 'WO10-REGISTRY-SWEEP-TRACK-QZX',
  // Allowlisted — must stay OUTSIDE the registry (see the CONTENT_PROSE_FIELDS
  // doc comment). Included here so both parts of the sweep pin the exclusion
  // as a decision, not silent drift.
  PROVIDER: 'WO10-REGISTRY-SWEEP-PROVIDER-QZX',
  SPEAKER: 'WO10-REGISTRY-SWEEP-SPEAKER-QZX'
};

function buildSweepEvent() {
  return {
    title: M.TITLE,
    summary: M.SUMMARY,
    rich_summary: M.RICH_SUMMARY,
    description: M.DESCRIPTION,
    venue: M.VENUE,
    venue_address: M.VENUE_ADDRESS,
    organizer: M.ORGANIZER,
    image_alt: M.IMAGE_ALT,
    price_label: M.PRICE_LABEL,
    program_outline: {
      official_description: M.OFFICIAL_DESCRIPTION,
      duration_text: M.DURATION_TEXT,
      goals: [M.GOAL],
      features: [M.FEATURE],
      requirements: [M.REQUIREMENT],
      provider: M.PROVIDER
    },
    highlights: [M.HIGHLIGHT],
    sessions: [{ title: M.SESSION_TITLE, room: M.ROOM, track: M.TRACK, speaker: M.SPEAKER }]
  };
}

// --- Part A: registry wiring (fast, no build; never touches the real cache)
{
  const sweepEvent = buildSweepEvent();
  const translator = createContentTranslator();
  translator.localizeEventProse(sweepEvent, 'ar', { trackPending: true });
  const trackedSources = new Set(translator.pending().map((row) => row.source));

  const mustBeRegistered = [
    ['event.title', M.TITLE], ['event.summary', M.SUMMARY], ['event.rich_summary', M.RICH_SUMMARY],
    ['event.description', M.DESCRIPTION], ['event.venue', M.VENUE], ['event.venue_address', M.VENUE_ADDRESS],
    ['event.organizer', M.ORGANIZER], ['event.image_alt', M.IMAGE_ALT], ['event.price_label', M.PRICE_LABEL],
    ['program_outline.official_description', M.OFFICIAL_DESCRIPTION], ['program_outline.duration_text', M.DURATION_TEXT],
    ['program_outline.goals[]', M.GOAL], ['program_outline.features[]', M.FEATURE], ['program_outline.requirements[]', M.REQUIREMENT],
    ['event.highlights[]', M.HIGHLIGHT], ['session.title', M.SESSION_TITLE], ['session.room', M.ROOM], ['session.track', M.TRACK]
  ];
  for (const [label, marker] of mustBeRegistered) {
    assert.ok(
      trackedSources.has(marker),
      `WO-10 registry regression: ${label} is not wired into CONTENT_PROSE_FIELDS — it will render raw and untranslated forever, exactly like the Buraydah venue bug`
    );
  }
  assert.ok(
    !trackedSources.has(M.PROVIDER),
    'program_outline.provider must stay off the registry (data-feed/provenance brand label, same class as source_label) — update the CONTENT_PROSE_FIELDS doc comment and this allowlist together if this changes'
  );
  assert.ok(
    !trackedSources.has(M.SPEAKER),
    'session.speaker must stay off the registry (personal name — MT transliteration risk) — update the CONTENT_PROSE_FIELDS doc comment and this allowlist together if this changes'
  );
  console.log(`WO10_REGISTRY_SWEEP_PART_A_OK registered_fields_tracked=${mustBeRegistered.length} allowlisted_excluded=2`);
}

// --- Part B: real build, real HTML surfaces --------------------------------
{
  const AR = {
    VENUE: 'موقع-اختبار-تسجيل-QZX',
    VENUE_ADDRESS: 'عنوان-اختبار-تسجيل-QZX',
    ORGANIZER: 'منظم-اختبار-تسجيل-QZX',
    IMAGE_ALT: 'وصف-صورة-اختبار-تسجيل-QZX',
    PRICE_LABEL: 'سعر-اختبار-تسجيل-QZX',
    OFFICIAL_DESCRIPTION: 'وصف-رسمي-اختبار-تسجيل-QZX يتجاوز عتبة طول النص القصير كي يصلح للاستبدال في القسم الرسمي من صفحة الفعالية.',
    DURATION_TEXT: 'مدة-اختبار-تسجيل-QZX',
    GOAL: 'هدف-اختبار-تسجيل-QZX',
    FEATURE: 'ميزة-اختبار-تسجيل-QZX',
    REQUIREMENT: 'متطلب-اختبار-تسجيل-QZX',
    SESSION_TITLE: 'جلسة-اختبار-تسجيل-QZX',
    ROOM: 'قاعة-اختبار-تسجيل-QZX',
    TRACK: 'مسار-اختبار-تسجيل-QZX'
  };

  const generatorPath = path.join(root, 'scripts', 'generate-site.mjs');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eventme-wo10-registry-'));
  const fixtureDataDir = path.join(fixtureRoot, 'data');
  const fixtureDistDir = path.join(fixtureRoot, 'dist');
  const sweepEventId = 'wo10-registry-sweep-event';
  let buildOk = false;

  try {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const inThreeDaysEnd = new Date(inThreeDays.getTime() + 3 * 60 * 60 * 1000);

    const catalog = {
      events: [
        {
          id: sweepEventId,
          title: 'WO-10 registry sweep fixture event',
          city: 'Riyadh',
          venue: M.VENUE,
          venue_address: M.VENUE_ADDRESS,
          organizer: M.ORGANIZER,
          // normalizeEvent() overwrites image_alt with a generated fallback
          // string whenever image_url resolves empty (localizeEventImage()
          // returns '' for any https URL absent from the image cache
          // manifest, which a scratch fixture can never satisfy) — that
          // would silently swallow the marker before translation runs. A
          // bare non-prefixed, non-http(s) path passes localizeEventImage()
          // through unchanged, which is enough to keep image_url truthy and
          // skip the fallback-cover branch entirely.
          image_url: '/wo10-test-fixture-cover.jpg',
          image_alt: M.IMAGE_ALT,
          price_label: M.PRICE_LABEL,
          category: 'technology',
          updated_at: '2026-07-31T18:00:00+03:00',
          source_url: `https://example.com/wo10/${sweepEventId}`,
          evidence_url: `https://example.com/wo10/${sweepEventId}`,
          source_confidence: 'approved-source',
          approval_status: 'published',
          starts_at: inThreeDays.toISOString(),
          ends_at: inThreeDaysEnd.toISOString(),
          program_outline: {
            official_description: M.OFFICIAL_DESCRIPTION,
            duration_text: M.DURATION_TEXT,
            goals: [M.GOAL],
            features: [M.FEATURE],
            requirements: [M.REQUIREMENT],
            // Allowlisted exclusion, seeded with a marker AND a matching
            // cache entry below — proves the exclusion holds even when a
            // translation is available, not just when one is missing.
            provider: M.PROVIDER
          },
          sessions: [
            {
              title: M.SESSION_TITLE,
              room: M.ROOM,
              track: M.TRACK,
              speaker: M.SPEAKER,
              starts_at: inThreeDays.toISOString(),
              ends_at: new Date(inThreeDays.getTime() + 60 * 60 * 1000).toISOString(),
              source_url: `https://example.com/wo10/${sweepEventId}/session-1`
            }
          ]
        }
      ]
    };

    // Throwaway cache in the scratch fixture dir only — never
    // data/content_translations.json (CI-owned, per WO-10 rule).
    const entries = {};
    const seed = (source, text) => {
      entries[contentTranslationKey('en', 'ar', source)] = {
        source,
        source_lang: 'en',
        target_lang: 'ar',
        text,
        method: 'llm-agent',
        translated_at: '2026-07-31T18:00:00.000Z'
      };
    };
    seed(M.VENUE, AR.VENUE);
    seed(M.VENUE_ADDRESS, AR.VENUE_ADDRESS);
    seed(M.ORGANIZER, AR.ORGANIZER);
    seed(M.IMAGE_ALT, AR.IMAGE_ALT);
    seed(M.PRICE_LABEL, AR.PRICE_LABEL);
    seed(M.OFFICIAL_DESCRIPTION, AR.OFFICIAL_DESCRIPTION);
    seed(M.DURATION_TEXT, AR.DURATION_TEXT);
    seed(M.GOAL, AR.GOAL);
    seed(M.FEATURE, AR.FEATURE);
    seed(M.REQUIREMENT, AR.REQUIREMENT);
    seed(M.SESSION_TITLE, AR.SESSION_TITLE);
    seed(M.ROOM, AR.ROOM);
    seed(M.TRACK, AR.TRACK);
    // Seeded even though provider/speaker are allowlisted-out — an entry
    // being AVAILABLE must not be enough to make an unregistered field
    // translate; only registry membership does that.
    seed(M.PROVIDER, 'يجب-ألا-يظهر-هذا-QZX');

    fs.cpSync(path.join(root, 'data'), fixtureDataDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureDataDir, 'events_catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(fixtureDataDir, 'source_ended_events.json'), `${JSON.stringify({ ended_events: [] }, null, 2)}\n`, 'utf8');
    fs.writeFileSync(
      path.join(fixtureDataDir, 'content_translations.json'),
      `${JSON.stringify({ version: 1, generated_at: '2026-07-31T18:00:00.000Z', entries }, null, 2)}\n`,
      'utf8'
    );

    const build = spawnSync(process.execPath, [generatorPath], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: { ...process.env, EVENTLIVE_INCREMENTAL_BUILD: 'false', EVENTLIVE_FORCE_SEO_REFRESH: 'true', EVENTLIVE_SEO_STATE_PATH: '.eventlive-cache/seo-state-test.json' }
    });
    if (build.status !== 0) {
      console.error(build.stdout || '');
      console.error(build.stderr || '');
      assert.fail(`WO-10 registry sweep fixture build exited with ${build.status ?? 'unknown status'}`);
    }
    buildOk = true;

    const html = fs.readFileSync(path.join(fixtureDistDir, 'events', `${sweepEventId}.html`), 'utf8');

    // Scoped to actual RENDERED TEXT (element/script text nodes), not
    // attribute values — a raw, untranslated venue legitimately survives
    // inside the Google Maps directions href (?destination=<raw venue>,
    // baked at normalize time before translation ever runs); that is a URL
    // query param, not prose, and is correctly out of the registry's scope
    // (same reasoning as the guard excluding URLs from registration below).
    // This is precise on purpose: text between '>' and '<' catches every
    // prose surface AND every inline JSON-LD <script> block (JSON-LD is
    // itself the text content of its <script> element), while skipping
    // attribute-embedded values.
    const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const appearsAsText = (value) => new RegExp(`>[^<]*${escapeForRegExp(value)}[^<]*<`).test(html);
    const appearsAsAttr = (attr, value) => html.includes(`${attr}="${value}"`);

    // Positive: every registered field's marker must be translated, and its
    // raw English form must not survive as rendered text anywhere.
    const positives = [
      ['venue', M.VENUE, AR.VENUE],
      ['venue_address', M.VENUE_ADDRESS, AR.VENUE_ADDRESS],
      ['organizer', M.ORGANIZER, AR.ORGANIZER],
      ['price_label', M.PRICE_LABEL, AR.PRICE_LABEL],
      ['program_outline.official_description', M.OFFICIAL_DESCRIPTION, AR.OFFICIAL_DESCRIPTION],
      ['program_outline.duration_text', M.DURATION_TEXT, AR.DURATION_TEXT],
      ['program_outline.goals[]', M.GOAL, AR.GOAL],
      ['program_outline.features[]', M.FEATURE, AR.FEATURE],
      ['program_outline.requirements[]', M.REQUIREMENT, AR.REQUIREMENT],
      ['session.title', M.SESSION_TITLE, AR.SESSION_TITLE],
      ['session.room', M.ROOM, AR.ROOM],
      ['session.track', M.TRACK, AR.TRACK]
    ];
    for (const [label, rawMarker, translatedMarker] of positives) {
      assert.ok(appearsAsText(translatedMarker), `WO-10 registry sweep: ${label} did not render its translated marker as text anywhere on ${sweepEventId}.html`);
      assert.ok(!appearsAsText(rawMarker), `WO-10 registry sweep: ${label} leaked its raw untranslated marker as rendered text on ${sweepEventId}.html — same defect class as the Buraydah venue bug`);
    }

    // image_alt renders as an attribute, not a text node — checked separately.
    assert.ok(appearsAsAttr('alt', AR.IMAGE_ALT), `WO-10 registry sweep: image_alt did not render its translated marker in an alt attribute on ${sweepEventId}.html`);
    assert.ok(!appearsAsAttr('alt', M.IMAGE_ALT), `WO-10 registry sweep: image_alt leaked its raw untranslated marker into an alt attribute on ${sweepEventId}.html`);

    // Negative: the allowlisted fields must render their RAW marker as text
    // (proving they are consciously bypassed, not silently broken) even
    // though a translation was available in the cache.
    assert.ok(appearsAsText(M.PROVIDER), 'WO-10 registry sweep: program_outline.provider must still render its raw source value — it is an intentional exclusion, not silently dropped');
    assert.ok(!appearsAsText('يجب-ألا-يظهر-هذا-QZX'), 'WO-10 registry sweep: program_outline.provider must NOT have been translated — an available cache entry must not leak through an unregistered field');
    assert.ok(appearsAsText(M.SPEAKER), 'WO-10 registry sweep: session.speaker must still render its raw source value — personal names are an intentional exclusion');

    console.log(`WO10_REGISTRY_SWEEP_PART_B_OK positives_checked=${positives.length + 1} allowlist_checked=2`);
  } finally {
    if (buildOk || fs.existsSync(fixtureRoot)) fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}
