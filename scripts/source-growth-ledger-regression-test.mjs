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
// WO-9b: a published_new COUNT with no identity data behind it can never
// trigger the persistence alarm by itself -- "published 3" with nothing to
// check against is indistinguishable from "published nothing checkable".
// (This is the old numeric heuristic's exact failure mode: it inferred loss
// from published_new vs. delta alone. See the dedicated WO-9b block below
// for the real, identity-based cases.)
history = appendGrowthRun(history, run('2026-07-10T12:00:00.000Z', 1120, 3));
assert.equal(history.at(-1).lost_published_output, false);
assert.notEqual(history.at(-1).status, 'critical-persistence-gap');
history = appendGrowthRun(history, run('2026-07-10T12:00:00.000Z', 1123, 3));
assert.equal(history.length, 3, 'rerunning the same collection must replace its ledger row');
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

// --- unit-level: WO-9b identity-based persistence check --------------------
//
// The health gate's original lost_published_output heuristic assumed every
// publish must increase the NET public count (published_new >
// max(0, publicDelta)). That's false under ordinary churn: publishing N new
// events while N (or more) previously-public events age out in the same
// cycle nets to public_delta=0 with nothing actually lost. The WO-9 fix to
// the frozen baseline gauge exposed this immediately -- honest deltas (no
// longer permanently inflated by the frozen-gauge bug) hit this flawed
// assumption on the very first live cycle and false-alarmed the gate.
//
// Replaced with an identity check: was every id the auto-publish report
// says it published actually found (by id) in the built dist/events.json.

function runWithPublish({ id, collectedAt = id, publishedAt = id, catalogRows, publicEventIds, publishedEventIds = [] }) {
  return buildGrowthRun({
    generatedAt: id,
    catalog: { events: Array.from({ length: catalogRows ?? publicEventIds.length }) },
    ended: { ended_events: [] },
    publicEvents: { events: publicEventIds.map((eventId) => ({ id: eventId })) },
    collection: { collected_at: collectedAt, candidates_discovered: 5, sources_attempted: 20, sources: [{ status: 'ok', new_candidates: 2, ended_new: 0, extracted: 2 }] },
    publish: {
      published_at: publishedAt,
      totals: { published: publishedEventIds.length, linked_existing: 3, blocked: 0 },
      published: publishedEventIds.map((eventId) => ({ candidate_id: `candidate-${eventId}`, event_id: eventId, title: eventId }))
    },
    runState: { totals: { attempted: 20, productive: 10, collector_errors: 0 } }
  });
}

const baseIds = Array.from({ length: 20 }, (_, i) => `event-base-${i}`);

// (a) churn: 7 published ids all present in output, while 7 previously
// public events aged out in the SAME cycle -- net delta 0. Must NOT be
// flagged as lost; the alarm must not fire on churn alone.
const newIds = Array.from({ length: 7 }, (_, i) => `event-new-${i}`);
const churnPublicIds = [...baseIds.slice(7), ...newIds]; // 13 survivors + 7 new = 20, net delta 0
let churnHistory = appendGrowthRun([], runWithPublish({ id: '2026-08-01T00:00:00.000Z', publicEventIds: baseIds }));
churnHistory = appendGrowthRun(churnHistory, runWithPublish({
  id: '2026-08-01T06:00:00.000Z',
  publicEventIds: churnPublicIds,
  publishedEventIds: newIds
}));
assert.equal(churnHistory.at(-1).public_delta, 0, 'sanity: net delta is 0 under this churn scenario');
assert.equal(churnHistory.at(-1).lost_published_output, false, 'requirement (a): all published ids present -> not lost, even at net delta 0');
assert.deepEqual(churnHistory.at(-1).missing_published_ids, []);
assert.notEqual(churnHistory.at(-1).status, 'critical-persistence-gap', 'requirement (a): churn alone does not fire the alarm');

// (b) genuine loss: one published id never makes it into dist/events.json.
// The real alarm must STAY ARMED for this case -- the fix must not neuter it.
const droppedId = 'event-dropped-1';
let lossHistory = appendGrowthRun([], runWithPublish({ id: '2026-08-02T00:00:00.000Z', publicEventIds: baseIds }));
lossHistory = appendGrowthRun(lossHistory, runWithPublish({
  id: '2026-08-02T06:00:00.000Z',
  publicEventIds: baseIds, // droppedId never appears here
  publishedEventIds: [droppedId]
}));
assert.equal(lossHistory.at(-1).lost_published_output, true, 'requirement (b): a published id absent from output is genuinely lost');
assert.deepEqual(lossHistory.at(-1).missing_published_ids, [droppedId], 'missing ids are surfaced for diagnosability');
assert.equal(lossHistory.at(-1).status, 'critical-persistence-gap', 'requirement (b): the real alarm still fires');

// (c) stale/mismatched publish report: published_at PREDATES this run's own
// collected_at, i.e. auto-publish did not rerun this cycle and the report on
// disk is a leftover from an earlier cycle. Must skip the check (null), not
// false-alarm on data that was never describing this run.
let staleHistory = appendGrowthRun([], runWithPublish({ id: '2026-08-03T00:00:00.000Z', publicEventIds: baseIds }));
staleHistory = appendGrowthRun(staleHistory, runWithPublish({
  id: '2026-08-03T06:00:00.000Z',
  collectedAt: '2026-08-03T06:00:00.000Z',
  publishedAt: '2026-08-02T23:00:00.000Z', // stale: predates this cycle's own collected_at
  publicEventIds: baseIds, // droppedId absent here too -- but correlation fails first, so it must not matter
  publishedEventIds: [droppedId]
}));
assert.equal(staleHistory.at(-1).lost_published_output, null, 'requirement (c): a stale/mismatched publish report skips the check (null)');
assert.equal(staleHistory.at(-1).publish_report_correlated, false);
assert.notEqual(staleHistory.at(-1).status, 'critical-persistence-gap', 'requirement (c): no false alarm from stale data');

// NFC normalization: an id compared under a different Unicode normalization
// form must still be recognized as present, not read as a false "lost" id.
// (Plain Arabic letters have no NFC/NFD distinction -- alef-hamza does: it
// canonically decomposes into base alef + combining hamza above.)
const arabicIdNFC = 'event-أحلام'.normalize('NFC'); // event-أحلام, precomposed alef-hamza
const arabicIdNFD = arabicIdNFC.normalize('NFD'); // same text, decomposed
assert.notEqual(arabicIdNFC, arabicIdNFD, 'sanity: these are literally different strings byte-for-byte');
let nfcHistory = appendGrowthRun([], runWithPublish({ id: '2026-08-04T00:00:00.000Z', publicEventIds: baseIds }));
nfcHistory = appendGrowthRun(nfcHistory, runWithPublish({
  id: '2026-08-04T06:00:00.000Z',
  publicEventIds: [...baseIds, arabicIdNFD], // dist stores the DECOMPOSED form
  publishedEventIds: [arabicIdNFC] // report says it published the COMPOSED form
}));
assert.equal(nfcHistory.at(-1).lost_published_output, false, 'an id present under a different Unicode normalization form is not a false loss');

console.log('SOURCE_GROWTH_LEDGER_OK (wo9b identity persistence check)');

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

function seedCollectionAndCatalog(cwd, { collectedAt, catalogRows, endedRows = 0, publishedIds = [] }) {
  writeFixture(cwd, 'reports/source-collection-report.json', {
    collected_at: collectedAt,
    candidates_discovered: 10,
    sources_attempted: 5,
    sources: [{ status: 'ok', new_candidates: 3, ended_new: 0, extracted: 3 }]
  });
  writeFixture(cwd, 'data/events_catalog.json', { events: Array.from({ length: catalogRows }) });
  writeFixture(cwd, 'data/source_ended_events.json', { ended_events: Array.from({ length: endedRows }) });
  writeFixture(cwd, 'reports/source-auto-publish-report.json', {
    published_at: collectedAt, // correlated: auto-publish ran fresh this cycle, right after collect
    totals: { published: publishedIds.length, linked_existing: 3, blocked: 0 },
    published: publishedIds.map((eventId) => ({ candidate_id: `candidate-${eventId}`, event_id: eventId, title: eventId }))
  });
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

  // ---- Cycle 4: real end-to-end WO-9b churn case through the actual CLI --
  // Publishes 2 new ids while 2 previously-public events implicitly age out
  // (net delta 0, same total public count as cycle 3), and asserts the real
  // script -- reading its own JSON round-trip of the auto-publish report and
  // the built dist/events.json -- does NOT raise the persistence alarm.
  const T4 = '2026-07-11T13:40:00.000Z';
  const churnIds = ['event-churn-a', 'event-churn-b'];
  seedCollectionAndCatalog(cwd, { collectedAt: T4, catalogRows: 430, publishedIds: churnIds });
  writeFixture(cwd, 'dist/events.json', {
    events: [...Array.from({ length: 1248 }), ...churnIds.map((id) => ({ id }))]
  }); // 1248 unnamed + 2 named churned-in = 1250, same total as cycle 3 -> net delta 0
  invokeLedger(cwd);

  state = readFixture(cwd, 'data/source_growth_state.json');
  assert.equal(state.runs.length, 4);
  assert.equal(state.runs[3].public_delta, 0, 'sanity: net delta is 0 for this cycle too');
  assert.equal(state.runs[3].lost_published_output, false, 'WO-9b end-to-end: both published ids landed in the built output -> not lost');
  assert.equal(state.runs[3].no_growth_streak, 2, 'sanity: streak keeps climbing on flat delta (2 consecutive flat cycles) -- the churn fix does not touch that path');
  assert.notEqual(state.runs[3].status, 'critical-persistence-gap', 'WO-9b end-to-end: churn alone never fires the persistence alarm via the real CLI');

  // ---- discontinuities annotation must survive real invocations ---------
  // Self-caught follow-up to WO-9: main() used to rebuild `state` from
  // scratch every run, silently dropping the WO-9 poisoned-history
  // `discontinuities` entry on the very next real sync cycle (verified
  // against production history: present in commit fe948662, gone one sync
  // cycle later in 86947532). Seed a discontinuities entry directly into
  // the state file (as the one-time WO-9 migration would have) and confirm
  // it survives a subsequent real (non-baseline) invocation.
  const seededState = readFixture(cwd, 'data/source_growth_state.json');
  seededState.discontinuities = [{ id: 'wo9-frozen-baseline-gauge', poisoned_run_count: 1, poisoned_run_ids: [T1] }];
  writeFixture(cwd, 'data/source_growth_state.json', seededState);

  const T5 = '2026-07-11T17:00:00.000Z';
  seedCollectionAndCatalog(cwd, { collectedAt: T5, catalogRows: 430 });
  writeFixture(cwd, 'dist/events.json', { events: Array.from({ length: 1260 }) });
  invokeLedger(cwd);

  state = readFixture(cwd, 'data/source_growth_state.json');
  assert.equal(state.runs.length, 5);
  assert.deepEqual(
    state.discontinuities,
    seededState.discontinuities,
    'WO-9b: the discontinuities annotation must survive a real (non-baseline) invocation, not be silently dropped'
  );

  console.log('SOURCE_GROWTH_LEDGER_OK (cli two-cycle simulation + wo9b churn cycle + discontinuities survival)');
});

console.log('SOURCE_GROWTH_LEDGER_OK');
