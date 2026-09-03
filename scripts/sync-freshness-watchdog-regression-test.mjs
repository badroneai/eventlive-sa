// Nothing on this repo measured whether the catalog was still being refreshed.
// The uptime and stability checks answer "is the site up"; a site that is up and
// four days stale passes both of them, which is the exact shape of the outages
// this project has already lived through.
//
// The watchdog exists because of two measurements on this repo's own run history
// (2026-08-25 .. 2026-09-03):
//
//   * GitHub delays these scheduled runs by a median of 3h14m, worst 5h52m. The
//     "05:17 Riyadh" in source-sync.yml is when the run is REQUESTED, not when it
//     happens, so no fixed-time check can be trusted to look after a completed run.
//   * The longest gap between two SUCCESSFUL syncs was 26h30m with every slot
//     firing. Under the daily cadence one failed run means two days of stale
//     catalog, unnoticed.
//
// This test asserts the watchdog's invariants, not its wording.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const watchdog = fs.readFileSync(path.join(root, '.github', 'workflows', 'sync-freshness-watchdog.yml'), 'utf8');
const sync = fs.readFileSync(path.join(root, '.github', 'workflows', 'source-sync.yml'), 'utf8');

// ---------- it has to actually run, on its own schedule ----------
const watchdogCrons = [...watchdog.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
assert.ok(watchdogCrons.length >= 2, 'the watchdog needs more than one slot a day, or a single delayed slot is the same single point of failure it exists to cover');

const syncCrons = [...sync.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
assert.equal(syncCrons.length, 1, 'source sync is expected to run once a day; if that changed, revisit the thresholds below');
const syncHour = Number(syncCrons[0].split(' ')[1]);
for (const cron of watchdogCrons) {
  const hour = Number(cron.split(' ')[1]);
  assert.ok(
    Math.abs(hour - syncHour) >= 6,
    `watchdog slot ${cron} sits too close to the sync's own ${syncCrons[0]}: a catch-up dispatched there would queue behind the very run it is waiting for`
  );
}

// ---------- the thresholds have to be coherent ----------
const catchup = Number(watchdog.match(/CATCHUP_HOURS=(\d+)/)?.[1]);
const alarm = Number(watchdog.match(/ALARM_HOURS=(\d+)/)?.[1]);
assert.ok(Number.isFinite(catchup) && Number.isFinite(alarm), 'both thresholds must be readable');
assert.ok(catchup > 24, `a catch-up threshold of ${catchup}h would fire against a normally-late daily run — the measured worst delay alone is nearly 6h`);
assert.ok(alarm > catchup, `the alarm (${alarm}h) must come after the catch-up (${catchup}h), or the watchdog screams before it has tried to help`);
assert.ok(alarm < 48, `an alarm at ${alarm}h means two full days of stale catalog before anyone is told`);

// ---------- it has to help before it screams, and scream if helping failed ----------
assert.match(watchdog, /gh workflow run source-sync\.yml/, 'the watchdog must dispatch a catch-up, not merely report');
assert.match(watchdog, /select\(\.status != "completed"\)/, 'it must not stack a catch-up on a sync that is already running');
// Anchored to the alarm branch, not to the file: an unanchored /exit 1/ was
// satisfied by the "no successful run at all" branch higher up, so deleting the
// alarm's own exit left the gate green. `continue-on-error` + `::error::` is the
// same trap this repo already documented — a red annotation on a green run is as
// invisible as no signal at all.
assert.match(
  watchdog,
  /::error::SYNC_FRESHNESS_STALE[\s\S]{0,600}?\n\s*exit 1/,
  'past the alarm threshold the run must both annotate AND exit non-zero — this repo delivers failure mail, and a green run carrying a warning is invisible'
);

// A watchdog that cannot read run history or dispatch is a decoration.
assert.match(watchdog, /permissions:[\s\S]*actions:\s*write/, 'dispatching a workflow needs actions: write');

// ---------- it must measure SUCCESS, not merely "a run happened" ----------
// A sync that fails still produces a run. Measuring the last run rather than the
// last successful one would have reported the site as fresh through every day of
// the 2026-08-25..09-01 failure streak, when only 4 of 30 runs succeeded.
assert.match(
  watchdog,
  /--status success/,
  'freshness must be measured from the last SUCCESSFUL sync; a failed run is not a refresh'
);

console.log(`SYNC_FRESHNESS_WATCHDOG_OK slots=${watchdogCrons.length} catchup_hours=${catchup} alarm_hours=${alarm}`);
