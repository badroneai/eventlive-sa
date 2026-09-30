import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { load } from 'cheerio';
import { getEventRuntime } from './event-kind-utils.mjs';

// This checker is also used by the corpus gate. Fixtures supply their expected
// verdict independently, so neither a generator regression nor a bad oracle can
// make a falsely archived final-day event pass.
export function assertEventSeoStatus(html, ended, locale, label) {
  const $ = load(html);
  const marker = locale === 'ar' ? /منتهية|أرشيف موثق/ : /\bEnded\b|\bPast event\b|\bArchived\b/;
  for (const selector of ['title', 'meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]']) {
    const value = selector === 'title' ? $(selector).text() : $(selector).attr('content');
    assert.ok(value, `${label}: missing ${selector}`);
    assert.equal(marker.test(value), ended, `${label}: ${selector} must agree with the precision-aware end verdict`);
  }
  const schema = $('script[type="application/ld+json"]').toArray()
    .map((node) => JSON.parse($(node).text())).find((item) => item['@type'] === 'Event');
  assert.ok(schema, `${label}: missing Event structured data`);
  assert.equal(schema.eventStatus, `https://schema.org/Event${ended ? 'Completed' : 'Scheduled'}`, `${label}: Event JSON-LD must agree with the snippet`);
  return { $, schema };
}

const root = process.cwd();
const frozenNow = '2026-10-01T20:59:59.000Z'; // Last second of the Riyadh day, still Oct 1 in UTC.
const at = (day, time = '18:00:00') => `2026-${day}T${time}+03:00`;
const precisions = [undefined, 'unknown', 'date-only', 'date-only-defaulted', 'exact-start-estimated-end', 'unrecognized', 'exact', 'official-session-times'];
const sourced = new Set(['exact', 'official-session-times']);
const fixtures = [];
function fixture(id, overrides, ended) {
  const event = {
    id: `seo-clock-${id}`, title: `SEO clock ${id}`, title_en: `SEO clock ${id}`,
    organizer: 'SEO clock organizer', city: 'Riyadh', venue: 'SEO clock venue', category: 'technology',
    source_label: 'SEO clock fixture source', source_url: `https://example.com/seo-clock/${id}`,
    evidence_url: `https://example.com/seo-clock/${id}`, source_confidence: 'approved-source', approval_status: 'published',
    starts_at: at('10-01', '09:00:00'), ends_at: at('10-01'),
    ...overrides
  };
  fixtures.push({ event, ended });
  return event;
}
for (const precision of precisions) {
  const tag = precision || 'missing';
  fixture(`${tag}-final-day`, { time_precision: precision }, sourced.has(precision));
  fixture(`${tag}-previous-day`, { time_precision: precision, starts_at: at('09-30', '09:00:00'), ends_at: at('09-30') }, true);
  fixture(`${tag}-future-day`, { time_precision: precision, starts_at: at('10-02', '09:00:00'), ends_at: at('10-02') }, false);
}
const officialSession = {
  id: 'later-official-session', title: 'Later official session', session_type: 'official-session',
  starts_at: at('10-02', '09:00:00'), ends_at: at('10-02'), source_url: 'https://example.com/seo-clock/session'
};
fixture('extended-official-session', {
  time_precision: 'exact', starts_at: at('09-30', '09:00:00'), ends_at: at('09-30'), sessions: [officialSession]
}, false);
fixture('extended-uncertain-session', {
  time_precision: 'unknown', starts_at: at('09-30', '09:00:00'), ends_at: at('09-30'), sessions: [officialSession]
}, false);

// Exercise each actual predicate at the transition, including the otherwise
// unused default English description path, without importing an executable build.
function functionsFrom(file, names, dependencies = {}) {
  const source = fs.readFileSync(path.join(root, 'scripts', file), 'utf8');
  const tree = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const declarations = tree.body.map((node) => node.type === 'ExportNamedDeclaration' ? node.declaration : node);
  const code = names.map((name) => {
    const node = declarations.find((item) => item?.type === 'FunctionDeclaration' && item.id.name === name);
    assert.ok(node, `${file}: missing ${name}`);
    return source.slice(node.start, node.end);
  }).join('\n');
  return vm.runInNewContext(`${code}; ({${names.join(',')}})`, { getEventRuntime, ...dependencies });
}
const ar = functionsFrom('generate-site.mjs', ['dateValue', 'effectiveEventEnd', 'effectiveEventEndIso', 'eventHasEnded']);
const en = functionsFrom('generate-localized-site.mjs', ['eventHasEnded']);
for (const { event, ended } of fixtures) {
  for (const [locale, predicate] of [['ar', ar.eventHasEnded], ['en', en.eventHasEnded]]) {
    assert.equal(predicate(event, Date.parse(frozenNow)), ended, `${locale}/${event.id}: fixed-clock predicate`);
  }
}
for (const precision of precisions) {
  const event = { starts_at: at('10-01', '09:00:00'), ends_at: at('10-01'), time_precision: precision };
  for (const predicate of [ar.eventHasEnded, en.eventHasEnded]) {
    assert.equal(predicate(event, Date.parse(at('10-01'))), false, 'the exact ending instant is inclusive');
    assert.equal(predicate(event, Date.parse(at('10-01')) + 1), sourced.has(precision), 'only a sourced clock expires after its precise end');
    assert.equal(predicate(event, Date.parse('2026-10-01T21:00:00Z')), true, 'unknown times expire at Riyadh midnight, before UTC midnight');
    assert.equal(predicate({}, Date.parse(frozenNow)), false, 'missing dates cannot prove an event has ended');
  }
}

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-seo-clock-'));
try {
  fs.cpSync(path.join(root, 'data'), path.join(fixtureRoot, 'data'), { recursive: true });
  fs.cpSync(path.join(root, 'locales'), path.join(fixtureRoot, 'locales'), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, 'data', 'events_catalog.json'), JSON.stringify({ events: fixtures.map(({ event }) => event) }));
  fs.writeFileSync(path.join(fixtureRoot, 'data', 'source_ended_events.json'), JSON.stringify({ ended_events: [] }));
  // A fixture has never published production URLs and must not inherit their retirement ledger.
  fs.rmSync(path.join(fixtureRoot, 'data', 'published_url_ledger.json'), { force: true });
  const preload = path.join(fixtureRoot, 'clock.cjs');
  fs.writeFileSync(preload, `const NativeDate = Date; const now = NativeDate.parse(${JSON.stringify(frozenNow)}); global.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };\n`);
  for (const script of ['generate-site.mjs', 'generate-localized-site.mjs']) {
    const result = spawnSync(process.execPath, ['--require', preload, path.join(root, 'scripts', script)], {
      cwd: fixtureRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, EVENTLIVE_INCREMENTAL_BUILD: 'false', EVENTLIVE_FORCE_SEO_REFRESH: 'true', EVENTLIVE_SEO_STATE_PATH: '.eventlive-cache/seo-state-test.json' }
    });
    assert.equal(result.status, 0, `${script} fixture build failed:\n${result.stdout}\n${result.stderr}`);
  }
  let checked = 0;
  let negative = 0;
  for (const { event, ended } of fixtures) {
    for (const locale of ['ar', 'en']) {
      const html = fs.readFileSync(path.join(fixtureRoot, 'dist', ...(locale === 'en' ? ['en'] : []), 'events', `${event.id}.html`), 'utf8');
      const { $, schema } = assertEventSeoStatus(html, ended, locale, `${locale}/${event.id}`);
      if (event.sessions) assert.equal(Date.parse(schema.endDate), Date.parse(officialSession.ends_at), 'the latest official session still extends structured data');
      checked += 1;
      // Corrupt actual output, not a source-text matcher: both false archives
      // and silent completed events must turn this same assertion red.
      const title = $('title').text();
      $('title').text(ended ? 'Fixture | EventLive' : `${title} ${locale === 'ar' ? 'منتهية' : 'Ended'}`);
      assert.throws(() => assertEventSeoStatus($.html(), ended, locale, 'corrupted title'), /title must agree/);
      $('title').text(title);
      const schemaNode = $('script[type="application/ld+json"]').filter((_, node) => JSON.parse($(node).text())['@type'] === 'Event');
      schemaNode.text(JSON.stringify({ ...schema, eventStatus: `https://schema.org/Event${ended ? 'Scheduled' : 'Completed'}` }));
      assert.throws(() => assertEventSeoStatus($.html(), ended, locale, 'corrupted schema'), /Event JSON-LD must agree/);
      negative += 2;
    }
  }
  console.log(`SEO_TIME_PRECISION_OK rendered=${checked} negative_checks=${negative} riyadh_midnight=pass official_session_extension=pass`);
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
