// WO-9 one-time migration: annotate the source-growth ledger's poisoned
// history (2026-07-11 -> 2026-07-31T09:16:31.542Z) instead of silently
// keeping it.
//
// Root cause (see PR "WO-9: fix frozen source-growth gauge" for the full
// two-cycle trace): `sources:growth:baseline` ran before `sources:collect`/
// `npm run build` each cycle and wrote a row keyed by the PREVIOUS cycle's
// collected_at (its own collection report hadn't been refreshed yet) using a
// stale, pre-build read of dist/events.json (git-tracked but never updated
// by the sync bot -- frozen at 1118 events since commit b7322ac3, "perf:
// ship a compact mobile event catalog"). That overwrote every previous
// cycle's real, post-build measurement, one cycle after it was written.
// The true per-cycle public_events values for the poisoned window are not
// recoverable (the real post-build dist/events.json was never committed --
// only its length briefly lived in each job's ephemeral workspace). This
// script does NOT fabricate recovered numbers. It tags every row that was
// ever poisoned by a baseline overwrite and records a top-level
// `discontinuities` entry so the state file is honest about what happened,
// per WO-9 requirement 2 ("do not silently keep a 50-run false streak").
//
// This is a one-time historical migration, not part of any ongoing
// workflow. It is safe to re-run (idempotent): rows already correctly
// measured (i.e. the most recent, un-poisoned row at the time of the fix)
// are left untouched, and re-running after that point is a no-op because
// the cutoff run_id is fixed below.
import path from 'node:path';
import { readJson, root, writeJson } from './program-lifecycle-utils.mjs';

const statePath = path.join(root, process.env.EVENTLIVE_SOURCE_GROWTH_STATE_FILE || 'data/source_growth_state.json');

// The cutoff is computed dynamically as the LAST row currently in state:
// that row is, by construction, the most recent post-build measurement and
// has not yet been overwritten by a subsequent baseline call (none has run
// since it was written). Every row strictly before it was, at some point,
// overwritten by a baseline call and its true value is unrecoverable.
// (Observed live twice while investigating WO-9: the row that looked
// "caught up" at 2026-07-31T14:35Z with public_events=1413 was itself
// poisoned back down to 1118 by the very next cycle's baseline call before
// this fix could land -- see the PR's two-cycle trace table.)
const REASON = 'WO-9: sources:growth:baseline ran before sources:collect/npm run build each cycle and overwrote the prior cycle\'s real post-build measurement with a stale pre-build read of the git-committed dist/events.json (frozen at 1118 events since commit b7322ac3). public_events/public_delta/no_growth_streak on tagged rows do not reflect real catalog growth for this window; catalog_active_rows/catalog_delta are unaffected (data/events_catalog.json is refreshed and committed every cycle). Fixed by making sources:growth:baseline read-only (no state/report writes) -- see scripts/source-growth-ledger.mjs.';

function main() {
  const state = readJson(statePath);
  const cutoffRunId = state.runs.at(-1)?.run_id;
  const poisonedRunIds = [];
  state.runs = state.runs.map((row) => {
    if (cutoffRunId !== undefined && String(row.run_id) < String(cutoffRunId)) {
      poisonedRunIds.push(row.run_id);
      return { ...row, measurement_integrity: 'poisoned-frozen-gauge-wo9' };
    }
    return { ...row, measurement_integrity: row.measurement_integrity || 'ok' };
  });

  if (!poisonedRunIds.length) {
    console.log('WO9_MIGRATION_NOOP no rows before cutoff run_id; nothing to annotate');
    return;
  }

  state.discontinuities = [
    ...(state.discontinuities || []).filter((entry) => entry.id !== 'wo9-frozen-baseline-gauge'),
    {
      id: 'wo9-frozen-baseline-gauge',
      detected_at: new Date().toISOString(),
      cutoff_run_id: cutoffRunId,
      reason: REASON,
      poisoned_run_count: poisonedRunIds.length,
      poisoned_run_ids: poisonedRunIds
    }
  ];

  writeJson(statePath, state);
  console.log(`WO9_MIGRATION_OK tagged ${poisonedRunIds.length} rows as poisoned-frozen-gauge-wo9, cutoff=${cutoffRunId}`);
}

main();
