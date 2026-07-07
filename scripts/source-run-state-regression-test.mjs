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
    }
  ]
}, null, 2)}\n`);

fs.writeFileSync(statePath, `${JSON.stringify({
  sources: [
    { id: 'seasonal-official', zero_yield_streak: 2 }
  ]
}, null, 2)}\n`);

fs.writeFileSync(path.join(reportsDir, 'source-ingestion-plan.json'), `${JSON.stringify({
  generated_at: '2026-07-05T00:00:00.000Z',
  sources: [
    { id: 'official-calendar', ring: 'active-collector', cadence: 'daily', next_action: 'continue' },
    { id: 'community-discovery', ring: 'discovery-only', cadence: 'weekly-discovery', next_action: 'discover only' },
    { id: 'seasonal-official', ring: 'active-collector', cadence: 'daily', next_action: 'monitor' }
  ]
}, null, 2)}\n`);

fs.writeFileSync(path.join(reportsDir, 'source-collection-report.json'), `${JSON.stringify({
  collected_at: '2026-07-05T00:10:00.000Z',
  sources: [
    { id: 'official-calendar', status: 'ok', extracted: 4, snapshot_path: 'data/raw/source-snapshots/official.json', note: '' },
    { id: 'seasonal-official', status: 'ok', extracted: 0, snapshot_path: 'data/raw/source-snapshots/seasonal.html', note: 'No future rows.' }
  ]
}, null, 2)}\n`);

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

const run = spawnSync(process.execPath, ['scripts/source-run-state.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_REGISTRY_FILE: registryPath,
    EVENTLIVE_SOURCE_RUN_STATE_FILE: statePath,
    EVENTLIVE_SOURCE_RUN_STATE_REPORT_JSON: reportJsonPath,
    EVENTLIVE_SOURCE_RUN_STATE_REPORT_MD: reportMdPath,
    EVENTLIVE_SOURCE_COLLECTION_REPORT_JSON: path.join(reportsDir, 'source-collection-report.json'),
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

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const official = state.sources.find((source) => source.id === 'official-calendar');
const discovery = state.sources.find((source) => source.id === 'community-discovery');
const seasonal = state.sources.find((source) => source.id === 'seasonal-official');

assert.equal(official.status, 'productive');
assert.equal(official.auto_publish_eligible_by_source, true);
assert.equal(discovery.ring, 'discovery-only');
assert.equal(discovery.auto_publish_eligible_by_source, false);
assert.equal(discovery.source_boundary, 'discovery_signal_only');
assert.equal(seasonal.status, 'zero-yield');
assert.equal(seasonal.zero_yield_streak, 3);
assert.match(seasonal.next_action, /Zero-yield for 3 runs/);
assert.ok(fs.existsSync(reportMdPath));

console.log('TEST_OK source run state regression checks passed');
