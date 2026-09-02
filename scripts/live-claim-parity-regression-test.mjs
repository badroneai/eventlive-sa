// "مباشرة الآن" asserts something about THIS HOUR. The rule that decides when we
// are entitled to say it exists in two places by necessity — once in Node
// (getEventStatus, the build) and once as a string of JavaScript emitted into
// every page (liveRuntimeScript's runtime(), the visitor's clock). Two copies of
// a rule drift; this gate is what stops them.
//
// Incident 2026-09-02 (owner report): leap-2026 runs 11:00–21:00 daily but is
// stored as one unbroken 82-hour window, so `start <= now <= end` was true at
// 23:00 and the site claimed an event that had closed two hours earlier. All 15
// cards on the live board that night were multi-day windows.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LIVE_CLAIM_MAX_WINDOW_HOURS,
  canClaimLiveNow,
  getEventStatus
} from './event-kind-utils.mjs';

const root = process.cwd();
const HOUR = 3600000;

// ---------- 1. the rule itself ----------
assert.equal(LIVE_CLAIM_MAX_WINDOW_HOURS, 24, 'the live-claim window is a stated policy, not a tunable');
assert.equal(canClaimLiveNow(0, 24 * HOUR), true, 'exactly 24h still earns the claim');
assert.equal(canClaimLiveNow(0, 24 * HOUR + 1), false, 'past 24h the hour is not ours to assert');
assert.equal(canClaimLiveNow(NaN, 0), false, 'an unparseable window never earns the claim');

// The owner's case, verbatim.
const leapStart = '2026-08-31T11:00:00+03:00';
const leapEnd = '2026-09-03T21:00:00+03:00';
const at2300 = new Date('2026-09-02T23:00:00+03:00').getTime();
assert.equal(
  getEventStatus(leapStart, leapEnd, at2300, 'moment').key,
  'ongoing',
  'a multi-day event must NOT claim "مباشرة الآن" at 23:00 on an intermediate night'
);
// ...while a genuinely short window still claims it, and still ends.
const shortStart = '2026-09-02T19:00:00+03:00';
const shortEnd = '2026-09-02T22:00:00+03:00';
assert.equal(getEventStatus(shortStart, shortEnd, new Date('2026-09-02T20:00:00+03:00').getTime(), 'moment').key, 'live');
assert.equal(getEventStatus(shortStart, shortEnd, new Date('2026-09-02T23:30:00+03:00').getTime(), 'moment').key, 'ended');
assert.equal(getEventStatus(leapStart, leapEnd, new Date('2026-08-30T10:00:00+03:00').getTime(), 'moment').key, 'upcoming');

// ---------- 2. parity with the emitted client rule ----------
// Read the generator source rather than a built page: the page is downstream of
// this string, so checking the source catches the drift one step earlier.
const generator = fs.readFileSync(path.join(root, 'scripts', 'generate-site.mjs'), 'utf8');
const runtimeBlock = generator.match(/function runtime\(el\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(runtimeBlock, 'liveRuntimeScript must still carry a runtime(el) status resolver');
assert.match(
  runtimeBlock,
  /if \(end - start > \$\{LIVE_CLAIM_MAX_WINDOW_HOURS\} \* 3600000\)/,
  'the client clock must gate the live claim on the SAME constant the build uses, interpolated from event-kind-utils.mjs — not a hardcoded number that can drift'
);
assert.match(runtimeBlock, /label: 'مستمرة هذه الأيام'/, 'the client must use the same honest label as the build');
assert.ok(
  runtimeBlock.indexOf("label: 'مستمرة هذه الأيام'") < runtimeBlock.indexOf("label: 'مباشرة الآن'"),
  'the multi-day guard must be checked BEFORE the live claim, or it never fires'
);

// ---------- 3. the corpus ----------
// Nothing published may be labelled live while its window is longer than the
// claim allows. This is what fails when a future source starts emitting
// week-long windows for single evenings.
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const events = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const offenders = [];
for (const event of events) {
  if (event.approval_status !== 'published') continue;
  const start = new Date(event.starts_at).getTime();
  const end = new Date(event.ends_at || event.starts_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
  // Probe the rule across the whole window, including the small hours.
  for (let at = start; at <= end; at += 6 * HOUR) {
    if (getEventStatus(event.starts_at, event.ends_at, at, 'moment').key === 'live' && !canClaimLiveNow(start, end)) {
      offenders.push(`${event.slug || event.id} (${((end - start) / HOUR).toFixed(0)}h window)`);
      break;
    }
  }
}
assert.deepEqual(offenders, [], `these published events would claim "مباشرة الآن" on a window too long to know the hour:\n${offenders.join('\n')}`);

const multiDay = events.filter((event) => {
  const start = new Date(event.starts_at).getTime();
  const end = new Date(event.ends_at || event.starts_at).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && !canClaimLiveNow(start, end);
}).length;
console.log(`LIVE_CLAIM_PARITY_OK window_hours=${LIVE_CLAIM_MAX_WINDOW_HOURS} events=${events.length} multi_day_protected=${multiDay} false_claims=0`);
