import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { requiresFinalBuild } from './run-build-if-image-cache-changed.mjs';
import { selectSourcesByCadence, sourceCadenceDecision } from './source-cadence-utils.mjs';

const referenceDate = new Date('2026-07-11T12:00:00.000Z');
const recentAttempt = '2026-07-11T10:00:00.000Z';
const official = { id: 'official', intake_policy: 'official-feed-preferred' };

assert.equal(
  sourceCadenceDecision(official, { status: 'productive', last_attempted_at: recentAttempt }, referenceDate).due,
  true,
  'productive official sources must remain on every six-hour run'
);
assert.deepEqual(
  sourceCadenceDecision({ id: 'discovery', intake_policy: 'candidate-only' }, {
    status: 'productive', ring: 'discovery-only', last_attempted_at: recentAttempt
  }, referenceDate),
  {
    due: false,
    interval_hours: 24,
    reason: 'discovery-daily',
    next_due_at: '2026-07-12T10:00:00.000Z'
  },
  'productive discovery-only sources must run daily rather than every six hours'
);
assert.equal(
  sourceCadenceDecision(official, {
    status: 'zero-yield', zero_yield_streak: 4, last_attempted_at: recentAttempt
  }, referenceDate).interval_hours,
  24,
  'repeated zero-yield sources must cool down to daily'
);
assert.equal(
  sourceCadenceDecision(official, {
    status: 'zero-yield', zero_yield_streak: 14, last_attempted_at: recentAttempt
  }, referenceDate).interval_hours,
  72,
  'long-running zero-yield sources must cool down to every 72 hours'
);
assert.equal(
  sourceCadenceDecision(official, {
    status: 'zero-yield', zero_yield_streak: 50, last_attempted_at: recentAttempt
  }, referenceDate).interval_hours,
  168,
  'seasonal zero-yield sources must cool down to weekly'
);
assert.equal(
  sourceCadenceDecision(official, {
    status: 'collector-error', error_streak: 2, last_attempted_at: recentAttempt
  }, referenceDate).interval_hours,
  24,
  'repeated collector failures must retry daily rather than every six hours'
);
assert.equal(
  sourceCadenceDecision(official, {}, referenceDate).due,
  true,
  'new sources must always receive an initial attempt'
);
assert.equal(
  sourceCadenceDecision(official, {
    status: 'zero-yield', zero_yield_streak: 50, last_attempted_at: recentAttempt
  }, referenceDate, { forceAll: true }).due,
  true,
  'manual force-all runs must bypass adaptive cadence'
);

const selection = selectSourcesByCadence([
  official,
  { id: 'cold', intake_policy: 'official-feed-preferred' },
  { id: 'new', intake_policy: 'official-feed-preferred' }
], [
  { id: 'official', status: 'productive', last_attempted_at: recentAttempt },
  { id: 'cold', status: 'zero-yield', zero_yield_streak: 50, last_attempted_at: recentAttempt }
], referenceDate);
assert.deepEqual(selection.due.map((row) => row.source.id), ['official', 'new']);
assert.deepEqual(selection.deferred.map((row) => row.source.id), ['cold']);

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const sync = packageJson.scripts['sources:sync'];
assert.match(sync, /sources:diagnostics:cadenced/, 'source sync must use the daily diagnostics controller');
assert.doesNotMatch(sync, /npm run sources:(?:probe|radars|yield)(?:\s|&&|$)/, 'heavy diagnostics must not run directly on every six-hour sync');
assert.match(packageJson.scripts['launch:source-gates'], /test:source-cadence/, 'launch source gates must protect adaptive cadence');
assert.match(sync, /sources:build:if-images-changed/, 'source sync must make the second public build conditional');
assert.equal((sync.match(/npm run build/g) || []).length, 1, 'source sync must contain only one unconditional public build');
assert.equal(requiresFinalBuild({ totals: { fetched: 0 }, rejected_removed: [], failed: [] }), false, 'reused image assets must not trigger a second build');
assert.equal(requiresFinalBuild({ totals: { fetched: 1 }, rejected_removed: [], failed: [] }), true, 'newly cached images must trigger a final build');
assert.equal(requiresFinalBuild({ totals: { fetched: 0 }, rejected_removed: [], failed: [{ skipped: true }] }), false, 'remembered image failures must not trigger a rebuild');
assert.equal(requiresFinalBuild({ totals: { fetched: 0 }, rejected_removed: [], failed: [{ reason: 'new failure' }] }), true, 'new image failures must refresh the operational output');

const collector = fs.readFileSync('scripts/collect-source-candidates.mjs', 'utf8');
const browserProbe = fs.readFileSync('scripts/source-browser-probe.mjs', 'utf8');
const radars = fs.readFileSync('scripts/run-source-radars.mjs', 'utf8');
const diagnostics = fs.readFileSync('scripts/run-cadenced-source-diagnostics.mjs', 'utf8');
const sourceOps = fs.readFileSync('scripts/source-ops-report.mjs', 'utf8');
assert.match(collector, /selectSourcesByCadence/, 'collector must select only sources due in the current slot');
assert.match(collector, /duration_ms/, 'collector reports must expose per-source duration for future tuning');
assert.match(collector, /recentBrowserProbeFailure/, 'collector must suppress repeated live-browser failures during cooldown');
assert.match(browserProbe, /failureCooldownMs/, 'browser probes must retain a failure cooldown');
assert.match(browserProbe, /if \(!navigationError\) await page\.screenshot/, 'failed navigation must not waste time taking a full-page screenshot');
assert.match(radars, /discovery_only:\s*true/, 'Platinumlist radars must be classified as manual discovery work');
assert.match(radars, /includeDiscoveryRadars/, 'manual discovery radars must require an explicit opt-in');
assert.match(diagnostics, /EVENTLIVE_SOURCE_DIAGNOSTICS_INTERVAL_HOURS/, 'diagnostic cadence must be configurable and durable');
assert.match(sourceOps, /source_collection_report_adaptive/, 'source health must distinguish adaptive collection from historical run state');
assert.match(sourceOps, /scheduled_runnable_coverage_pct/, 'source health must expose scheduled coverage without hiding current attempts');
assert.match(sourceOps, /cadence-deferred/, 'deferred sources must remain visible in health output');

const diagnosticsWorkdir = path.join('workspaces', '_source-cadence-regression');
const diagnosticsJson = path.join(diagnosticsWorkdir, 'diagnostics.json');
const diagnosticsMd = path.join(diagnosticsWorkdir, 'diagnostics.md');
fs.rmSync(diagnosticsWorkdir, { recursive: true, force: true });
fs.mkdirSync(diagnosticsWorkdir, { recursive: true });
fs.writeFileSync(diagnosticsJson, `${JSON.stringify({ last_executed_at: new Date().toISOString() }, null, 2)}\n`);
const diagnosticsRun = spawnSync(process.execPath, ['scripts/run-cadenced-source-diagnostics.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_DIAGNOSTICS_REPORT_JSON: diagnosticsJson,
    EVENTLIVE_SOURCE_DIAGNOSTICS_REPORT_MD: diagnosticsMd
  }
});
assert.equal(diagnosticsRun.status, 0, diagnosticsRun.stderr || 'cadenced diagnostics skip must succeed');
const diagnosticsReport = JSON.parse(fs.readFileSync(diagnosticsJson, 'utf8'));
assert.equal(diagnosticsReport.status, 'skipped-fresh', 'fresh diagnostics must be skipped on the six-hour critical path');
assert.equal(diagnosticsReport.totals.commands, 0, 'skipped diagnostics must not launch heavy commands');
fs.rmSync(diagnosticsWorkdir, { recursive: true, force: true });

console.log('SOURCE_CADENCE_OK hot=every-run discovery=24h error=24h zero=24-168h diagnostics=24h');
