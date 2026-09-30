import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyMdlbeastDetails, runMdlbeastEnrichment } from './enrich-mdlbeast-events-details.mjs';

const fixture = (id = 'test-event') => ({
  id, source_label: 'MDLBEAST Events', source_url: `https://mdlbeast.com/events/${id}`,
  title: 'Approved concert', city: 'Riyadh', venue: 'Approved venue',
  starts_at: '2026-12-01T18:00:00+03:00', ends_at: '2026-12-01T23:00:00+03:00',
  description: 'Previously verified detailed description.', summary: 'Short existing summary.',
  image_url: 'https://www.datocms-assets.com/123/concert.jpg',
  program_outline: { provider: 'MDLBEAST', features: ['Previously verified feature'], collected_at: '2026-09-01T00:00:00Z' },
  updated_at: '2026-09-01T00:00:00Z'
});

for (const sections of [undefined, null, {}, [], ['Official section'], [null, {}, 'Official section']]) {
  const event = fixture();
  applyMdlbeastDetails(event, {}, { sections });
  assert.ok(Array.isArray(event.program_outline.features));
  assert.equal(event.description, 'Previously verified detailed description.');
  assert.ok(!event.program_outline.features.includes('[object Object]'));
  if (Array.isArray(sections) && sections.includes('Official section')) {
    assert.ok(event.program_outline.features.includes('Official section'));
  }
}
for (const page of [undefined, null, {}]) {
  assert.doesNotThrow(() => applyMdlbeastDetails(fixture(), {}, page));
}
const badWindow = fixture();
applyMdlbeastDetails(badWindow, {}, { starts_at: '2026-12-02T18:00:00+03:00', ends_at: '2026-12-01T23:00:00+03:00' });
assert.equal(badWindow.starts_at, fixture().starts_at);
assert.equal(badWindow.ends_at, fixture().ends_at);

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-mdlbeast-'));
const originalFetch = globalThis.fetch;
try {
  fs.mkdirSync(path.join(rootDir, 'data'));
  const rows = ['http-error', 'network-error', 'invalid-json', 'empty-page', 'missing-url', 'empty-next-data', 'next-error-page', 'good-after-failures'].map(fixture);
  delete rows[4].source_url;
  const before = structuredClone(rows);
  fs.writeFileSync(path.join(rootDir, 'data/events_catalog.json'), JSON.stringify({ events: rows }));
  fs.writeFileSync(path.join(rootDir, 'data/source_candidates.json'), JSON.stringify({ candidates: [] }));
  globalThis.fetch = async (url) => {
    if (url.endsWith('http-error')) return { ok: false, status: 503 };
    if (url.endsWith('network-error')) throw new Error('original upstream connection failure');
    if (url.endsWith('invalid-json')) return { ok: true, text: async () => '<script id="__NEXT_DATA__" type="application/json">{broken</script>' };
    if (url.endsWith('empty-page')) return { ok: true, text: async () => '<html>temporarily unavailable</html>' };
    if (url.endsWith('empty-next-data')) return { ok: true, text: async () => '<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script>' };
    if (url.endsWith('next-error-page')) return { ok: true, text: async () => '<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"statusCode":404,"title":"Not found"}}}</script>' };
    assert.ok(url.endsWith('good-after-failures'));
    return { ok: true, text: async () => '<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify({ props: { pageProps: { event: { title: 'Updated official concert', sections: [null, {}] } } } }) + '</script>' };
  };
  const report = await runMdlbeastEnrichment({ rootDir });
  const after = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/events_catalog.json'))).events;
  assert.deepEqual(after.slice(0, 7), before.slice(0, 7), 'unavailable sources must preserve every field of previous rows');
  assert.equal(after[7].title, 'Updated official concert', 'a failed row must not stop later rows');
  assert.equal(report.totals.fetch_failures, 7);
  assert.equal(report.totals.enriched, 1);
  assert.ok(report.failed.some((item) => item.reason === 'HTTP 503'));
  assert.ok(report.failed.some((item) => item.reason === 'original upstream connection failure'));
  assert.ok(report.failed.some((item) => item.reason === 'Missing MDLBEAST source URL'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(rootDir, 'reports/mdlbeast-enrichment-report.json'))), report);
  // Newly approved rows still get an honest calendar fallback, while the
  // unavailable source remains a reported failure rather than fake fetch success.
  const fresh = fixture('new-row');
  delete fresh.program_outline;
  fs.writeFileSync(path.join(rootDir, 'data/events_catalog.json'), JSON.stringify({ events: [fresh, fixture('after-fallback')] }));
  const fallbackReport = await runMdlbeastEnrichment({ rootDir, fetchPage: async (url) => {
    if (url.endsWith('new-row')) throw new Error('new-row outage');
    return { fetched: true, title: 'Success after fallback', sections: [] };
  } });
  const fallback = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/events_catalog.json'))).events[0];
  assert.equal(fallback.program_outline.source_method, 'approved-calendar-row');
  assert.equal(fallback.description, fresh.description);
  assert.equal(fallbackReport.totals.enriched, 2);
  assert.equal(fallbackReport.enriched[0].fetched, false);
  assert.equal(fallbackReport.enriched[1].title, 'Success after fallback');
  assert.equal(fallbackReport.totals.fetched, 1);
  assert.equal(fallbackReport.failed[0].reason, 'new-row outage');
  // An unexpected apply failure is isolated transactionally too.
  fs.writeFileSync(path.join(rootDir, 'data/events_catalog.json'), JSON.stringify({ events: [fixture()] }));
  const applyReport = await runMdlbeastEnrichment({ rootDir, fetchPage: async () => ({ fetched: true, starts_at: 'invalid', ends_at: 'invalid', title: 'Should never be committed', get city() { throw new Error('apply fixture failure'); } }) });
  assert.equal(applyReport.totals.enrichment_failures, 1);
  assert.equal(applyReport.failed[0].reason, 'apply fixture failure');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(rootDir, 'data/events_catalog.json'))).events, [fixture()]);
} finally {
  globalThis.fetch = originalFetch;
  fs.rmSync(rootDir, { recursive: true, force: true });
}
console.log('mdlbeast-fallback-regression-test: ok (section shapes, preserved rows, fetch errors, report persistence, row isolation)');
