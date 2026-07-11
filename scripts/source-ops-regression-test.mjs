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
const attemptedInRunState = Object.values(runState.sources || {}).filter((source) => source?.last_attempted_at).length;
const attemptedInCollection = Array.isArray(collectionReport.sources) ? collectionReport.sources.length : 0;
const expectedBasis = attemptedInRunState > attemptedInCollection ? 'source_run_state' : 'source_collection_report';
const expectedAttempted = Math.max(attemptedInRunState, attemptedInCollection);

assert.equal(report.collection.basis, expectedBasis, 'source ops must use the widest available collection basis');
assert.equal(report.sources.attempted, expectedAttempted, 'source ops attempted count must reflect the widest available collection basis');
assert.ok(report.sources.collection_coverage_pct >= 25, 'source ops coverage must not collapse to a partial one-source test run');
assert.ok(report.sources.health.some((source) => source.status === 'healthy'), 'source ops must retain productive source health from run-state memory');
assert.equal(health.sources.every((source) => Number.isFinite(source.error_streak)), true, 'public source health must expose persistent error streaks');
assert.equal(health.totals.candidates_written, candidates.length, 'public source health must report the final deduplicated candidate queue');
assert.equal(health.totals.candidates_collected_before_dedupe, collectionReport.candidates_written, 'public source health must retain the pre-dedupe collection total separately');

console.log('source-ops-regression-test: ok');
