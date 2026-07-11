import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workdir = 'workspaces/_source-run-state-regression';
const dataDir = path.join(workdir, 'data');
const reportsDir = path.join(workdir, 'reports');
fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

const registryPath = path.join(dataDir, 'source_registry.json');
const statePath = path.join(dataDir, 'source_run_state.json');
const reportJsonPath = path.join(reportsDir, 'source-run-state-report.json');
const reportMdPath = path.join(reportsDir, 'source-run-state-report.md');

fs.writeFileSync(registryPath, `${JSON.stringify({
  sources: [
    {
      id: 'official-calendar',
      name: 'Official Calendar',
      owner: 'Official Owner',
      url: 'https://example.gov.sa/events',
      priority: 1,
      source_type: 'government-calendar',
      trust_level: 'official',
      intake_policy: 'official-feed-preferred',
      candidate_gate: 'human-review',
      fetch_method: 'html-calendar'
    },
    {
      id: 'community-discovery',
      name: 'Community Discovery',
      owner: 'Community',
      url: 'https://example.com/events',
      priority: 2,
      source_type: 'community-platform',
      trust_level: 'community',
      intake_policy: 'candidate-only',
      candidate_gate: 'source-evidence',
      fetch_method: 'search-page'
    },
    {
      id: 'seasonal-official',
      name: 'Seasonal Official',
      owner: 'Seasonal Owner',
      url: 'https://season.example/events',
      priority: 3,
      source_type: 'organizer-calendar',
      trust_level: 'official',
      intake_policy: 'monitor-public',
      candidate_gate: 'human-review',
      fetch_method: 'html-listing'
    },
    {
      id: 'failing-official',
      name: 'Failing Official',
      owner: 'Official Owner',
      url: 'https://failure.example.gov.sa/events',
      priority: 4,
      source_type: 'government-calendar',
      trust_level: 'official',
      intake_policy: 'official-feed-preferred',
      candidate_gate: 'human-review',
      fetch_method: 'html-calendar'
    },
    {
      id: 'blocked-official',
      name: 'Blocked Official',
      owner: 'Official Owner',
      url: 'https://blocked.example.gov.sa/events',
      priority: 5,
      source_type: 'government-calendar',
      trust_level: 'official',
      intake_policy: 'monitor-public',
      candidate_gate: 'human-review',
      fetch_method: 'html-calendar'
    }
  ]
}, null, 2)}\n`);

fs.writeFileSync(statePath, `${JSON.stringify({
  sources: [
    { id: 'seasonal-official', zero_yield_streak: 2 },
    {
      id: 'blocked-official',
      status: 'probe-blocked',
      last_attempted_at: '2026-07-04T18:10:00.000Z',
      last_collection_status: 'error',
      last_extracted: 0,
      error_streak: 1,
      next_action: 'Keep the protected source in the partnership lane.'
    }
  ]
}, null, 2)}\n`);

fs.writeFileSync(path.join(reportsDir, 'source-ingestion-plan.json'), `${JSON.stringify({
  generated_at: '2026-07-05T00:00:00.000Z',
  sources: [
    { id: 'official-calendar', ring: 'active-collector', cadence: 'daily', next_action: 'continue' },
    { id: 'community-discovery', ring: 'discovery-only', cadence: 'weekly-discovery', next_action: 'discover only' },
    { id: 'seasonal-official', ring: 'active-collector', cadence: 'daily', next_action: 'monitor' },
    { id: 'failing-official', ring: 'active-collector', cadence: 'daily', next_action: 'repair' },
    { id: 'blocked-official', ring: 'active-collector', cadence: 'daily', next_action: 'partnership' }
  ]
}, null, 2)}\n`);

const collectionReportPath = path.join(reportsDir, 'source-collection-report.json');
const collectionReport = {
  collected_at: '2026-07-05T00:10:00.000Z',
  sources: [
    { id: 'official-calendar', status: 'ok', extracted: 4, snapshot_path: 'data/raw/source-snapshots/official.json', note: '' },
    { id: 'seasonal-official', status: 'ok', extracted: 0, snapshot_path: 'data/raw/source-snapshots/seasonal.html', note: 'No future rows.' },
    { id: 'failing-official', status: 'error', extracted: 0, snapshot_path: '', note: 'Request timed out.' }
  ]
};
fs.writeFileSync(collectionReportPath, `${JSON.stringify(collectionReport, null, 2)}\n`);

fs.writeFileSync(path.join(reportsDir, 'source-yield-report.json'), `${JSON.stringify({
  generated_at: '2026-07-05T00:09:00.000Z',
  sources: [
    { id: 'official-calendar', future_complete: 4, zero_yield_reason: '' },
    { id: 'seasonal-official', future_complete: 0, zero_yield_reason: 'past-date:12', dropped_samples: [{ title: 'Old Event' }] }
  ]
}, null, 2)}\n`);

fs.writeFileSync(path.join(reportsDir, 'source-deep-probe-report.json'), `${JSON.stringify({
  generated_at: '2026-07-05T00:08:00.000Z',
  sources: []
}, null, 2)}\n`);

function runStateScript() {
  const run = spawnSync(process.execPath, ['scripts/source-run-state.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_SOURCE_REGISTRY_FILE: registryPath,
      EVENTLIVE_SOURCE_RUN_STATE_FILE: statePath,
      EVENTLIVE_SOURCE_RUN_STATE_REPORT_JSON: reportJsonPath,
      EVENTLIVE_SOURCE_RUN_STATE_REPORT_MD: reportMdPath,
      EVENTLIVE_SOURCE_COLLECTION_REPORT_JSON: collectionReportPath,
      EVENTLIVE_SOURCE_YIELD_REPORT_JSON: path.join(reportsDir, 'source-yield-report.json'),
      EVENTLIVE_SOURCE_INGESTION_PLAN_JSON: path.join(reportsDir, 'source-ingestion-plan.json'),
      EVENTLIVE_SOURCE_DEEP_PROBE_REPORT_JSON: path.join(reportsDir, 'source-deep-probe-report.json')
    }
  });

  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(run.status || 1);
  }
}

runStateScript();

let state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const official = state.sources.find((source) => source.id === 'official-calendar');
const discovery = state.sources.find((source) => source.id === 'community-discovery');
let seasonal = state.sources.find((source) => source.id === 'seasonal-official');
let failing = state.sources.find((source) => source.id === 'failing-official');
let blocked = state.sources.find((source) => source.id === 'blocked-official');

assert.equal(official.status, 'productive');
assert.equal(official.auto_publish_eligible_by_source, true);
assert.equal(discovery.ring, 'discovery-only');
assert.equal(discovery.auto_publish_eligible_by_source, false);
assert.equal(discovery.source_boundary, 'discovery_signal_only');
assert.equal(seasonal.status, 'zero-yield');
assert.equal(seasonal.zero_yield_streak, 3);
assert.equal(failing.status, 'collector-error');
assert.equal(failing.error_streak, 1);
assert.equal(blocked.status, 'probe-blocked');
assert.equal(blocked.error_streak, 1);
assert.equal(blocked.next_action, 'Keep the protected source in the partnership lane.');
assert.match(seasonal.next_action, /Zero-yield for 3 runs/);
assert.equal(state.totals.attempted, 3, 'current-run attempted total must not count historical attempts');
assert.equal(state.totals.collector_errors, 1, 'current-run errors must be separated from persistent source state');
assert.equal(state.totals.persistent_collector_errors, 1, 'persistent source error state must remain observable');
assert.equal(blocked.attempted_this_run, false, 'unattempted historical rows must be marked explicitly');
assert.ok(fs.existsSync(reportMdPath));

runStateScript();
state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
seasonal = state.sources.find((source) => source.id === 'seasonal-official');
failing = state.sources.find((source) => source.id === 'failing-official');
blocked = state.sources.find((source) => source.id === 'blocked-official');
assert.equal(seasonal.zero_yield_streak, 3, 'recomputing one collection run must not inflate zero-yield streaks');
assert.equal(failing.error_streak, 1, 'recomputing one collection run must not inflate error streaks');
assert.equal(blocked.next_action, 'Keep the protected source in the partnership lane.', 'unattempted blocked sources must preserve their safe next action');

collectionReport.collected_at = '2026-07-05T06:10:00.000Z';
fs.writeFileSync(collectionReportPath, `${JSON.stringify(collectionReport, null, 2)}\n`);
runStateScript();
state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
seasonal = state.sources.find((source) => source.id === 'seasonal-official');
failing = state.sources.find((source) => source.id === 'failing-official');
assert.equal(seasonal.zero_yield_streak, 4, 'a distinct collection run must increment zero-yield streaks once');
assert.equal(failing.error_streak, 2, 'a distinct collection run must increment error streaks once');

console.log('TEST_OK source run state regression checks passed');
