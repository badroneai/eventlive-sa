import assert from 'node:assert/strict';
import { appendGrowthRun, buildGrowthRun } from './source-growth-ledger.mjs';

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

console.log('SOURCE_GROWTH_LEDGER_OK');
