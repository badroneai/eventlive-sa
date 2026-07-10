import assert from 'node:assert/strict';
import { selectBacklogTargets } from './backlog-target-utils.mjs';

const nowMs = Date.parse('2026-07-10T09:00:00+03:00');
const fresh = '2026-07-10T08:30:00+03:00';
const stale = '2026-06-20T08:30:00+03:00';
const events = [
  { id: 'fresh-first', approval_status: 'published', program_outline: { source_method: 'approved-source-row', collected_at: fresh } },
  { id: 'stale-first', approval_status: 'published', program_outline: { source_method: 'approved-source-row', collected_at: stale } },
  { id: 'missing-last', approval_status: 'published' },
  { id: 'draft-missing', approval_status: 'draft' }
];

const first = selectBacklogTargets(events, { nowMs, limit: 1, refreshIntervalMs: 7 * 24 * 60 * 60 * 1000 });
assert.deepEqual(first.map((event) => event.id), ['missing-last'], 'a missing outline at the end of the catalog must outrank earlier refresh rows');

const all = selectBacklogTargets(events, { nowMs, limit: 10, refreshIntervalMs: 7 * 24 * 60 * 60 * 1000 });
assert.deepEqual(all.map((event) => event.id), ['missing-last', 'stale-first'], 'fresh and unpublished rows must not consume the recurring enrichment budget');

console.log('BACKLOG_TARGET_SELECTION_OK missing_first=1 stale_refresh=1');
