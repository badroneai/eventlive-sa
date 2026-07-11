import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

execFileSync(process.execPath, ['scripts/source-ops-report.mjs'], {
  cwd: root,
  stdio: 'pipe',
  encoding: 'utf8'
});

const report = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'source-ops-report.json'), 'utf8'));
const runState = JSON.parse(fs.readFileSync(path.join(root, 'data', 'source_run_state.json'), 'utf8'));
const collectionReport = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'source-collection-report.json'), 'utf8'));
const candidates = JSON.parse(fs.readFileSync(path.join(root, 'data', 'source_candidates.json'), 'utf8')).candidates || [];
const health = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'source-health.json'), 'utf8'));
const runStateRows = Object.values(runState.sources || {});
const hasCurrentRunMarkers = runStateRows.some((source) => Object.hasOwn(source || {}, 'attempted_this_run'));
const attemptedInRunState = runStateRows.filter((source) => (
  source?.last_attempted_at && (!hasCurrentRunMarkers || source.attempted_this_run === true)
)).length;
const attemptedInCollection = Array.isArray(collectionReport.sources) ? collectionReport.sources.length : 0;
const adaptiveCadenceEnabled = collectionReport.adaptive_cadence_enabled === true;
const expectedBasis = adaptiveCadenceEnabled
  ? 'source_collection_report_adaptive'
  : attemptedInRunState > attemptedInCollection ? 'source_run_state' : 'source_collection_report';
const expectedAttempted = adaptiveCadenceEnabled
  ? attemptedInCollection
  : Math.max(attemptedInRunState, attemptedInCollection);

assert.equal(report.collection.basis, expectedBasis, 'source ops must use the widest available collection basis');
assert.equal(report.sources.attempted, expectedAttempted, 'source ops attempted count must reflect the widest available collection basis');
assert.ok(report.sources.collection_coverage_pct >= 25, 'source ops coverage must not collapse to a partial one-source test run');
if (adaptiveCadenceEnabled) {
  assert.equal(report.sources.deferred, Number(collectionReport.sources_deferred || 0), 'adaptive source ops must expose deferred collector lanes');
  assert.equal(report.sources.collection_coverage_pct, 100, 'adaptive source ops must measure coverage against sources due now');
  assert.equal(health.totals.cadence_deferred, report.sources.deferred, 'public source health must expose cadence-deferred lanes');
  assert.equal(health.totals.attempted_this_run, attemptedInCollection, 'public source health must distinguish current attempts from scheduled lanes');
}
assert.ok(report.sources.health.some((source) => source.status === 'healthy'), 'source ops must retain productive source health from run-state memory');
assert.equal(health.sources.every((source) => Number.isFinite(source.error_streak)), true, 'public source health must expose persistent error streaks');
assert.equal(health.totals.candidates_written, candidates.length, 'public source health must report the final deduplicated candidate queue');
assert.equal(health.totals.candidates_collected_before_dedupe, collectionReport.candidates_written, 'public source health must retain the pre-dedupe collection total separately');

console.log('source-ops-regression-test: ok');
