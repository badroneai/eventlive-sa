import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// WO-6 regression test: the event detail page was reorganized into a
// decisive hero, an "الآن" strip, the live schedule/attendance window, the
// official program section, a unified "معلومات عملية" practical-info card,
// a source & trust section, and FAQ last — plus a mobile-only sticky CTA
// bar. This test builds three synthetic fixtures (rich / poor / ended)
// because the live catalog cannot reliably guarantee all three states at
// once (WO-1/WO-2 precedent for synthetic fixtures), and asserts:
//   1. section order on the built page,
//   2. every merged fact (attendance type, duration, registration close,
//      provider) appears exactly once,
//   3. the sticky CTA bar exists for live events and is entirely absent for
//      an ended event.

const root = process.cwd();
const generatorPath = path.join(root, 'scripts', 'generate-site.mjs');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eventme-wo6-reorg-'));
const fixtureDataDir = path.join(fixtureRoot, 'data');
const fixtureDistDir = path.join(fixtureRoot, 'dist');

const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
const inTwoWeeksEnd = new Date(inTwoWeeks.getTime() + 3 * 60 * 60 * 1000);
const longAgoStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
const longAgoEnd = new Date(longAgoStart.getTime() + 3 * 60 * 60 * 1000);

// Each fixture needs its own source URL path: the generator's dedupe pass
// treats identical source_url path shapes as the same underlying event
// (source-identity dedupe) and drops the later duplicates, which would
// otherwise silently delete the poor/ended fixtures from the build.
function baseFixture(id, overrides = {}) {
  return {
    id,
    organizer: 'WO-6 regression organizer',
    city: 'Riyadh',
    venue: 'WO-6 regression venue',
    category: 'technology',
    updated_at: '2026-07-18T18:00:00+03:00',
    source_label: 'WO-6 regression source',
    source_url: `https://example.com/wo6/${id}`,
    evidence_url: `https://example.com/wo6/${id}`,
    source_confidence: 'approved-source',
    approval_status: 'published',
    ...overrides
  };
}

const richEventId = 'wo6-rich-event';
const poorEventId = 'wo6-poor-event';
const endedEventId = 'wo6-ended-event';

const catalog = {
  events: [
    baseFixture(richEventId, {
      title: 'WO-6 rich fixture event',
      starts_at: inTwoWeeks.toISOString(),
      ends_at: inTwoWeeksEnd.toISOString(),
      ticket_url: 'https://example.com/wo6/tickets',
      content_translated: true,
      program_outline: {
        official_description: 'وصف رسمي تفصيلي لفعالية WO-6 يتجاوز طول الجملة القصيرة بوضوح ليصلح لاختبار الاستبدال.',
        goals: ['هدف أول', 'هدف ثانٍ'],
        features: ['ميزة أولى'],
        requirements: ['متطلب أول'],
        duration_text: 'يومان متتاليان',
        registration_deadline: inTwoWeeks.toISOString(),
        provider: 'مزود WO-6 الرسمي'
      },
      sessions: [
        {
          title: 'جلسة WO-6 الأولى',
          starts_at: inTwoWeeks.toISOString(),
          ends_at: new Date(inTwoWeeks.getTime() + 60 * 60 * 1000).toISOString(),
          room: 'القاعة أ',
          source_url: 'https://example.com/wo6/session-1'
        },
        {
          title: 'جلسة WO-6 الثانية',
          starts_at: new Date(inTwoWeeks.getTime() + 90 * 60 * 1000).toISOString(),
          ends_at: new Date(inTwoWeeks.getTime() + 150 * 60 * 1000).toISOString(),
          room: 'القاعة ب',
          source_url: 'https://example.com/wo6/session-2'
        }
      ]
    }),
    baseFixture(poorEventId, {
      title: 'WO-6 poor fixture event',
      starts_at: inTwoWeeks.toISOString(),
      ends_at: inTwoWeeksEnd.toISOString()
    }),
    baseFixture(endedEventId, {
      title: 'WO-6 ended fixture event',
      starts_at: longAgoStart.toISOString(),
      ends_at: longAgoEnd.toISOString()
    })
  ]
};

let buildOk = false;
try {
  fs.cpSync(path.join(root, 'data'), fixtureDataDir, { recursive: true });
  fs.writeFileSync(
    path.join(fixtureDataDir, 'events_catalog.json'),
    `${JSON.stringify(catalog, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(fixtureDataDir, 'source_ended_events.json'),
    `${JSON.stringify({ ended_events: [] }, null, 2)}\n`,
    'utf8'
  );

  const build = spawnSync(process.execPath, [generatorPath], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_INCREMENTAL_BUILD: 'false',
      EVENTLIVE_FORCE_SEO_REFRESH: 'true'
    }
  });
  if (build.status !== 0) {
    console.error(build.stdout || '');
    console.error(build.stderr || '');
    assert.fail(`WO-6 fixture build exited with ${build.status ?? 'unknown status'}`);
  }
  buildOk = true;

  function readEventHtml(id) {
    return fs.readFileSync(path.join(fixtureDistDir, 'events', `${id}.html`), 'utf8');
  }

  function sectionOrder(html) {
    const markers = ['data-section="hero"', 'data-section="now"', 'data-section="schedule"', 'data-section="program"', 'data-section="practical"', 'data-section="source"', 'data-section="faq"'];
    return markers
      .map((marker) => ({ marker, index: html.indexOf(marker) }))
      .filter((entry) => entry.index !== -1);
  }

  function assertAscending(entries, label) {
    for (let i = 1; i < entries.length; i += 1) {
      assert.ok(
        entries[i].index > entries[i - 1].index,
        `${label}: ${entries[i - 1].marker} must come before ${entries[i].marker}`
      );
    }
  }

  // --- Rich event: every section present, in the WO-6 order -------------
  const richHtml = readEventHtml(richEventId);
  const richOrder = sectionOrder(richHtml);
  assert.deepEqual(
    richOrder.map((entry) => entry.marker),
    ['data-section="hero"', 'data-section="now"', 'data-section="schedule"', 'data-section="program"', 'data-section="practical"', 'data-section="source"', 'data-section="faq"'],
    'rich event must render every WO-6 section, in order'
  );
  assertAscending(richOrder, 'rich event');

  // Hero: decisive — one primary CTA, one secondary save button, cover
  // image, and a single city-and-date line (no duplicated multi-signal
  // strip).
  const heroSection = richHtml.slice(richHtml.indexOf('data-section="hero"'), richHtml.indexOf('data-section="now"'));
  assert.match(heroSection, /class="cta hero-cta-primary"/, 'hero must expose one primary CTA');
  assert.match(heroSection, /class="cta hero-cta-secondary"[^>]*data-attendance-save/, 'hero must expose the secondary save action');
  assert.match(heroSection, /event-hero-media"><img class="cover"/, 'hero must place the cover image inside the hero media column');
  assert.doesNotMatch(heroSection, /class="signal-strip"/, 'hero must not keep the old multi-signal strip');

  // Single-occurrence merge proof: duration / registration-close / provider
  // must each appear exactly once on the page (in the practical-info card),
  // and must not remain in the program section's old signal strip.
  for (const [label, value] of [['المدة', 'يومان متتاليان'], ['المزود', 'مزود WO-6 الرسمي']]) {
    const occurrences = richHtml.split(`<dt>${label}</dt>`).length - 1;
    assert.equal(occurrences, 1, `"${label}" must appear exactly once on the built page`);
    assert.ok(richHtml.includes(`<dd>${value}</dd>`), `"${label}" value must render`);
  }
  const registrationCloseOccurrences = richHtml.split('<dt>إغلاق التسجيل</dt>').length - 1;
  assert.equal(registrationCloseOccurrences, 1, '"إغلاق التسجيل" must appear exactly once on the built page');

  // The four attendance facts (attendance type / source / schedule / entry)
  // still render exactly once as their own group.
  assert.equal((richHtml.match(/class="attendance-fact"/g) || []).length, 4, 'the four core attendance facts must render exactly once');

  // Practical-info card: directions + entry repeat + calendar + share/print/QR.
  const practicalSection = richHtml.slice(richHtml.indexOf('data-section="practical"'), richHtml.indexOf('data-section="source"'));
  assert.match(practicalSection, /class="event-quick-actions"/, 'practical-info card must expose the action row');
  assert.match(practicalSection, />الاتجاهات</, 'practical-info card must expose directions for an in-person event');
  assert.match(practicalSection, />الدخول أو التسجيل</, 'practical-info card must repeat the entry/ticket CTA deliberately');
  assert.match(practicalSection, />أضف للتقويم</, 'practical-info card must expose add-to-calendar');
  assert.match(practicalSection, />مشاركة</, 'practical-info card must link to the share entry point');
  assert.match(practicalSection, />طباعة</, 'practical-info card must link to the print entry point');
  assert.match(practicalSection, />رمز QR</, 'practical-info card must link to the QR/signage entry point');

  // Source & trust: source link + last-updated. (content_translated is
  // computed by the content-translation pipeline, not settable from a raw
  // catalog fixture, so the machine-translation note itself is covered by
  // the battery's real-catalog build rather than this synthetic fixture —
  // what this test guarantees is that the note, when it renders at all,
  // renders inside this section and never inside the hero.)
  const sourceSection = richHtml.slice(richHtml.indexOf('data-section="source"'), richHtml.indexOf('data-section="faq"'));
  assert.match(sourceSection, /آخر تحديث:/, 'source & trust section must show a last-updated line');
  assert.match(sourceSection, /class="meta"><a class="cta" href="[^"]+">المصدر<\/a>/, 'source & trust section must expose the official source link');
  assert.doesNotMatch(heroSection, /data-mt-note/, 'the machine-translation note must not live in the hero anymore');

  // FAQ DOM untouched: still uses .event-faq .program-check, the localizer
  // selector this WO was explicitly told not to break.
  assert.match(richHtml, /class="section event-faq" data-section="faq"><div class="wrap"><article class="readiness"><span>إجابات مختصرة<\/span>/, 'FAQ DOM shape must remain exactly what generate-localized-site.mjs expects');

  // Sticky CTA bar: present for a live/upcoming event, both buttons meet
  // the 44px a11y minimum via the shared .cta rule, save button wired.
  assert.match(richHtml, /<div class="mobile-sticky-cta" data-sticky-cta>/, 'a live event must render the mobile sticky CTA bar');
  const stickyBar = richHtml.slice(richHtml.indexOf('data-sticky-cta'), richHtml.indexOf('data-sticky-cta') + 600);
  assert.match(stickyBar, /class="cta"/, 'sticky bar primary action must use the shared .cta sizing (>=44px min-height)');
  assert.match(stickyBar, /data-attendance-save/, 'sticky bar must expose a working save action');

  // --- Poor event: attendance-window only, program section omitted ------
  const poorHtml = readEventHtml(poorEventId);
  const poorOrder = sectionOrder(poorHtml);
  assert.deepEqual(
    poorOrder.map((entry) => entry.marker),
    ['data-section="hero"', 'data-section="now"', 'data-section="schedule"', 'data-section="practical"', 'data-section="source"', 'data-section="faq"'],
    'poor event must omit the program section but keep every other WO-6 section in order'
  );
  assertAscending(poorOrder, 'poor event');
  assert.match(poorHtml, />\s*نافذة الحضور\s*</, 'poor event must label its schedule section as an attendance window');

  // --- Ended event: "now" strip and sticky bar are hidden (omitted) -----
  const endedHtml = readEventHtml(endedEventId);
  const endedOrder = sectionOrder(endedHtml);
  assert.deepEqual(
    endedOrder.map((entry) => entry.marker),
    ['data-section="hero"', 'data-section="schedule"', 'data-section="practical"', 'data-section="source"', 'data-section="faq"'],
    'ended event must hide the "الآن" strip entirely while keeping the rest of the WO-6 order'
  );
  assertAscending(endedOrder, 'ended event');
  assert.doesNotMatch(endedHtml, /data-sticky-cta/, 'ended event must not render the mobile sticky CTA bar');
  assert.doesNotMatch(endedHtml, /data-attendance-save/, 'ended event must not offer the save-for-attendance action');
  assert.match(endedHtml, /فعالية مكتملة محفوظة/, 'ended event must still explain itself as a retained record');

  console.log(`EVENT_PAGE_REORG_EVIDENCE rich=${richOrder.length} poor=${poorOrder.length} ended=${endedOrder.length}`);
  console.log('event-page-reorg-regression-test: ok');
} finally {
  if (buildOk || fs.existsSync(fixtureRoot)) {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}
