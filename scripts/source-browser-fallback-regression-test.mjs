import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workdir = path.join(root, 'workspaces', '_source-browser-fallback-regression');
const snapshotDir = path.join(workdir, 'source-snapshots');
const browserDir = path.join(workdir, 'browser-probes');
const reportPath = path.join(workdir, 'source-browser-probe-report.json');
const browserSnapshotPath = path.join(browserDir, 'official-source.html');

fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(browserDir, { recursive: true });
const browserHtml = `<html><body>${'Official event listing '.repeat(40)}</body></html>`;
fs.writeFileSync(browserSnapshotPath, browserHtml, 'utf8');
fs.writeFileSync(reportPath, `${JSON.stringify({
  generated_at: new Date().toISOString(),
  sources: [{
    id: 'official-source',
    status: 'ok',
    classification: 'rendered-html-candidates',
    html_snapshot: path.relative(root, browserSnapshotPath)
  }]
}, null, 2)}\n`, 'utf8');

process.env.EVENTLIVE_SOURCE_SNAPSHOT_DIR = path.relative(root, snapshotDir);
process.env.EVENTLIVE_BROWSER_PROBE_REPORT_JSON = path.relative(root, reportPath);
process.env.EVENTLIVE_BROWSER_FALLBACK_MAX_AGE_MS = String(60 * 60 * 1000);

const { freshBrowserProbeHtml, latestOfficialSnapshotHtml, writeAuxiliarySnapshot } = await import('./collect-source-candidates.mjs');
const officialSource = {
  id: 'official-source',
  url: 'https://example.gov.sa/events',
  collector_method: 'GET',
  trust_level: 'official',
  intake_policy: 'official-feed-preferred'
};

assert.equal(freshBrowserProbeHtml(officialSource), browserHtml, 'fresh successful browser HTML must recover an official collector');
assert.equal(
  freshBrowserProbeHtml({ ...officialSource, trust_level: 'community', intake_policy: 'candidate-only' }),
  '',
  'discovery-only sources must not use the publication collector fallback'
);
assert.equal(
  freshBrowserProbeHtml({ ...officialSource, collector_url: 'https://example.gov.sa/api/events' }),
  '',
  'HTML fallback must not be passed into JSON API extractors'
);

const auxiliaryPath = writeAuxiliarySnapshot(officialSource, 'detail', '{"ok":true}', 'json');
assert.equal(fs.existsSync(path.join(root, auxiliaryPath)), true, 'auxiliary snapshot writer must create its directory before writing');

const knownGoodHtml = `<html><body>${'Last known official event listing '.repeat(30)}</body></html>`;
const knownGoodPath = path.join(snapshotDir, 'official-source-2026-07-10T02-00-00-000Z.html');
fs.writeFileSync(knownGoodPath, knownGoodHtml, 'utf8');
assert.equal(
  latestOfficialSnapshotHtml(officialSource, new Date('2026-07-10T03:00:00.000Z').getTime()),
  knownGoodHtml,
  'recent last-known-good official HTML must recover a temporarily unavailable source'
);
assert.equal(
  latestOfficialSnapshotHtml(officialSource, new Date('2026-07-20T03:00:00.000Z').getTime()),
  '',
  'last-known-good official HTML must expire after the safety window'
);

fs.writeFileSync(reportPath, `${JSON.stringify({
  generated_at: '2020-01-01T00:00:00.000Z',
  sources: [{
    id: 'official-source',
    status: 'ok',
    classification: 'rendered-html-candidates',
    html_snapshot: path.relative(root, browserSnapshotPath)
  }]
}, null, 2)}\n`, 'utf8');
assert.equal(freshBrowserProbeHtml(officialSource), '', 'stale browser evidence must not be reused');

console.log('TEST_OK source browser fallback regression checks passed');
