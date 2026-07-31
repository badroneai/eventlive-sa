import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendGrowthRun, buildGrowthRun } from './source-growth-ledger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, 'source-growth-ledger.mjs');

function run(id, publicEvents, publishedNew = 0, collectorErrors = 0) {
  return buildGrowthRun({
    generatedAt: id,
    catalog: { events: Array.from({ length: publicEvents }) },
    ended: { ended_events: [] },
    publicEvents: { events: Array.from({ length: publicEvents }) },
    collection: { collected_at: id, candidates_discovered: 5, sources_attempted: 20, sources: [{ status: 'ok', new_candidates: 2, ended_new: 0, extracted: 2 }] },
    publish: { totals: { published: publishedNew, linked_existing: 3, blocked: 0 } },
    runState: { totals: { attempted: 20, productive: 10, collector_errors: collectorErrors } }
  });
}

// --- unit-level: appendGrowthRun/buildGrowthRun invariants -----------------

let history = appendGrowthRun([], run('2026-07-10T00:00:00.000Z', 1118));
assert.equal(history[0].status, 'baseline');
history = appendGrowthRun(history, run('2026-07-10T06:00:00.000Z', 1120, 2));
assert.equal(history.at(-1).public_delta, 2);
assert.equal(history.at(-1).status, 'healthy');
history = appendGrowthRun(history, run('2026-07-10T12:00:00.000Z', 1120, 3));
assert.equal(history.at(-1).lost_published_output, true);
assert.equal(history.at(-1).status, 'critical-persistence-gap');
history = appendGrowthRun(history, run('2026-07-10T12:00:00.000Z', 1123, 3));
assert.equal(history.length, 3, 'rerunning the same collection must replace its ledger row');
assert.equal(history.at(-1).lost_published_output, false);
assert.equal(history.at(-1).public_delta, 3);

// Every row produced by appendGrowthRun is tagged as a real ('ok') measurement.
assert.ok(history.every((row) => row.measurement_integrity === 'ok'));

// A row migrated with a poisoned tag keeps that tag until a new measurement
// for the same run_id supersedes it (self-healing, WO-9 requirement 2).
let poisonedSeed = [{ ...run('2026-07-11T00:00:00.000Z', 1118), measurement_integrity: 'poisoned-frozen-gauge-wo9' }];
let healed = appendGrowthRun(poisonedSeed, run('2026-07-12T00:00:00.000Z', 1150));
assert.equal(healed[0].measurement_integrity, 'poisoned-frozen-gauge-wo9', 'untouched poisoned row keeps its tag');
healed = appendGrowthRun(healed, run('2026-07-11T00:00:00.000Z', 1140));
assert.equal(healed[0].measurement_integrity, 'ok', 'a real re-measurement for the same run_id clears the poisoned tag');

console.log('SOURCE_GROWTH_LEDGER_OK (unit)');

// --- CLI-level: simulate two real sync cycles through the actual script ----
//
// This reproduces the exact WO-9 bug shape end-to-end: `sources:growth`
// runs the ledger AFTER npm run build (real, growing dist/events.json);
// `sources:growth:baseline` runs BEFORE the next cycle's collect/build,
// while dist/events.json is still whatever was last committed (frozen/
// stale) and the collection report is still the previous cycle's. Assert:
// (a) growth between cycles yields positive delta and a streak reset,
// (b) the baseline invocation never overwrites/regresses a measurement
//     (the frozen-gauge class ban),
// (c) a genuinely flat cycle still increments the streak (alarm still works).

function withTempFixtures(fn) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'wo9-growth-ledger-'));
  try {
    return fn(cwd);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

function writeFixture(cwd, relPath, value) {
  const fullPath = path.join(cwd, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(value, null, 2));
}

function readFixture(cwd, relPath) {
  return JSON.parse(fs.readFileSync(path.join(cwd, relPath), 'utf8'));
}

function invokeLedger(cwd, { baseline = false } = {}) {
  const env = {
    ...process.env,
    EVENTLIVE_SOURCE_GROWTH_STATE_FILE: 'data/source_growth_state.json',
    EVENTLIVE_SOURCE_GROWTH_REPORT_JSON: 'reports/source-growth-report.json',
    EVENTLIVE_SOURCE_GROWTH_REPORT_MD: 'reports/source-growth-report.md',
    EVENTLIVE_EVENTS_CATALOG_FILE: 'data/events_catalog.json',
    EVENTLIVE_SOURCE_ENDED_EVENTS_FILE: 'data/source_ended_events.json',
    EVENTLIVE_PUBLIC_EVENTS_FILE: 'dist/events.json',
    EVENTLIVE_SOURCE_COLLECTION_REPORT_JSON: 'reports/source-collection-report.json',
    EVENTLIVE_SOURCE_AUTO_PUBLISH_REPORT_JSON: 'reports/source-auto-publish-report.json',
    EVENTLIVE_SOURCE_RUN_STATE_REPORT_JSON: 'reports/source-run-state-report.json'
  };
  const args = baseline ? [scriptPath, '--baseline'] : [scriptPath];
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8' });
  assert.equal(result.status, 0, `ledger invocation failed: ${result.stderr}`);
  return result.stdout;
}

function seedCollectionAndCatalog(cwd, { collectedAt, catalogRows, endedRows = 0 }) {
  writeFixture(cwd, 'reports/source-collection-report.json', {
    collected_at: collectedAt,
    candidates_discovered: 10,
    sources_attempted: 5,
    sources: [{ status: 'ok', new_candidates: 3, ended_new: 0, extracted: 3 }]
  });
  writeFixture(cwd, 'data/events_catalog.json', { events: Array.from({ length: catalogRows }) });
  writeFixture(cwd, 'data/source_ended_events.json', { ended_events: Array.from({ length: endedRows }) });
  writeFixture(cwd, 'reports/source-auto-publish-report.json', { totals: { published: 0, linked_existing: 3, blocked: 0 } });
  writeFixture(cwd, 'reports/source-run-state-report.json', { totals: { attempted: 5, productive: 5, collector_errors: 0 } });
}

withTempFixtures((cwd) => {
  // Simulate the git-committed dist/events.json: it only changes when a
  // "build" step in this simulation explicitly rewrites it, mirroring the
  // real sync workflow never committing dist/ back to the repo.
  const FROZEN_COMMITTED_PUBLIC = 1118;
  writeFixture(cwd, 'dist/events.json', { events: Array.from({ length: FROZEN_COMMITTED_PUBLIC }) });

  // ---- Cycle 1: collect -> build (real growth) -> post-build measurement --
  const T1 = '2026-07-11T01:11:39.757Z';
  seedCollectionAndCatalog(cwd, { collectedAt: T1, catalogRows: 426 });
  // "npm run build" for cycle 1: dist/events.json now reflects real growth,
  // but this build output is never committed back to git in reality.
  writeFixture(cwd, 'dist/events.json', { events: Array.from({ length: 1150 }) });
  invokeLedger(cwd); // sources:growth (post-build)

  let state = readFixture(cwd, 'data/source_growth_state.json');
  assert.equal(state.runs.length, 1);
  assert.equal(state.runs[0].public_events, 1150, 'cycle 1 post-build measurement is the real, grown value');

  // Simulate the never-committed build output reverting to the frozen,
  // git-committed snapshot for the START of cycle 2 (before cycle 2 collects
  // or builds anything).
  writeFixture(cwd, 'dist/events.json', { events: Array.from({ length: FROZEN_COMMITTED_PUBLIC }) });

  // ---- Cycle 2 baseline: runs BEFORE collect/build ------------------------
  // reports/source-collection-report.json still holds cycle 1's collected_at
  // (T1) because sources:collect hasn't run yet this cycle -- this is
  // exactly the run_id collision that caused the original bug.
  const baselineStdout = invokeLedger(cwd, { baseline: true });
  assert.match(baselineStdout, /SOURCE_GROWTH_BASELINE \(read-only, not persisted\)/);

  const stateAfterBaseline = readFixture(cwd, 'data/source_growth_state.json');
  assert.deepEqual(
    stateAfterBaseline,
    state,
    'requirement (b): a baseline invocation before this cycle\'s collect/build must not mutate the ledger state at all'
  );

  // ---- Cycle 2: collect (new collected_at) -> build (further growth) -----
  const T2 = '2026-07-11T05:06:45.655Z';
  seedCollectionAndCatalog(cwd, { collectedAt: T2, catalogRows: 430 });
  writeFixture(cwd, 'dist/events.json', { events: Array.from({ length: 1250 }) });
  invokeLedger(cwd); // sources:growth (post-build)

  state = readFixture(cwd, 'data/source_growth_state.json');
  assert.equal(state.runs.length, 2, 'cycle 1 row must survive untouched, cycle 2 appends a new row');
  assert.equal(state.runs[0].public_events, 1150, 'requirement (b): cycle 1\'s real measurement was not regressed to the frozen 1118');
  assert.equal(state.runs[1].public_events, 1250);
  assert.equal(state.runs[1].public_delta, 100, 'requirement (a): growth between cycles yields a positive delta');
  assert.equal(state.runs[1].no_growth_streak, 0, 'requirement (a): growth resets the no-growth streak');

  // ---- Cycle 3 baseline + a genuinely flat cycle --------------------------
  writeFixture(cwd, 'dist/events.json', { events: Array.from({ length: FROZEN_COMMITTED_PUBLIC }) });
  invokeLedger(cwd, { baseline: true });
  const stateAfterCycle3Baseline = readFixture(cwd, 'data/source_growth_state.json');
  assert.deepEqual(stateAfterCycle3Baseline, state, 'requirement (b) again: baseline is a no-op regardless of cycle number');

  const T3 = '2026-07-11T09:22:14.505Z';
  seedCollectionAndCatalog(cwd, { collectedAt: T3, catalogRows: 430 });
  writeFixture(cwd, 'dist/events.json', { events: Array.from({ length: 1250 }) }); // no growth vs cycle 2
  invokeLedger(cwd);

  state = readFixture(cwd, 'data/source_growth_state.json');
  assert.equal(state.runs.length, 3);
  assert.equal(state.runs[2].public_delta, 0);
  assert.equal(state.runs[2].no_growth_streak, 1, 'requirement (c): a genuinely flat cycle still increments the streak -- the alarm still works');

  console.log('SOURCE_GROWTH_LEDGER_OK (cli two-cycle simulation)');
});

console.log('SOURCE_GROWTH_LEDGER_OK');
