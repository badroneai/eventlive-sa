import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  jazanMonthsToFetch,
  partitionSourceItems,
  sourceRunLimits
} from './collect-source-candidates.mjs';

const referenceDate = new Date('2026-07-11T12:00:00Z');
const source = {
  id: 'future-only-fixture',
  trust_level: 'official',
  intake_policy: 'official-feed-preferred',
  max_candidates_per_run: 20,
  max_ended_per_run: 20
};
const rows = [
  {
    title: 'Future event',
    starts_at: '2026-08-01T09:00:00+03:00',
    ends_at: '2026-08-01T17:00:00+03:00',
    url: 'https://example.com/future'
  },
  {
    title: 'Ongoing event',
    starts_at: '2026-07-10T09:00:00+03:00',
    ends_at: '2026-07-12T17:00:00+03:00',
    url: 'https://example.com/ongoing'
  },
  {
    title: 'Recently ended event',
    starts_at: '2026-06-01T09:00:00+03:00',
    ends_at: '2026-06-01T17:00:00+03:00',
    url: 'https://example.com/ended'
  },
  {
    title: 'Old event below the historical boundary',
    starts_at: '2021-06-01T09:00:00+03:00',
    ends_at: '2021-06-01T17:00:00+03:00',
    url: 'https://example.com/old'
  }
];

const futureOnly = partitionSourceItems(rows, source, { includeEnded: false, referenceDate });
assert.deepEqual(
  futureOnly.activeItems.map((row) => row.title),
  ['Ongoing event', 'Future event'],
  'future-only collection must retain ongoing and upcoming events'
);
assert.equal(futureOnly.endedItems.length, 0, 'future-only collection must never return ended events');
assert.equal(futureOnly.pastRowsSkipped, 2, 'future-only collection must count every rejected past row');
assert.equal(sourceRunLimits(source, { includeEnded: false }).ended, 0, 'future-only limits must disable ended capacity even when the source requests it');

const manualHistory = partitionSourceItems(rows, source, { includeEnded: true, referenceDate });
assert.deepEqual(
  manualHistory.endedItems.map((row) => row.title),
  ['Recently ended event'],
  'manual historical mode must remain explicit and respect the 2022 minimum boundary'
);

const jazanFutureMonths = jazanMonthsToFetch(referenceDate, { futureMonths: 12, historyMode: 'none' });
assert.equal(jazanFutureMonths.length, 13, 'Jazan recurring collection must inspect the current and next 12 months only');
assert.deepEqual(jazanFutureMonths[0], { month: 7, year: 2026 });
assert.deepEqual(jazanFutureMonths.at(-1), { month: 7, year: 2027 });

const workflow = fs.readFileSync('.github/workflows/source-sync.yml', 'utf8');
const registry = JSON.parse(fs.readFileSync('data/source_registry.json', 'utf8'));
const collector = fs.readFileSync('scripts/collect-source-candidates.mjs', 'utf8');
const radars = fs.readFileSync('scripts/run-source-radars.mjs', 'utf8');
const agendaRadar = fs.readFileSync('scripts/source-official-agenda-radar.mjs', 'utf8');
const moneyEnricher = fs.readFileSync('scripts/enrich-money2020-agendas.mjs', 'utf8');
const rffEnricher = fs.readFileSync('scripts/enrich-rff-agenda-details.mjs', 'utf8');

assert.match(workflow, /EVENTLIVE_SOURCE_COLLECT_ENDED_EVENTS:\s*["']false["']/, 'six-hour workflow must explicitly select future-only mode');
assert.match(workflow, /npm run test:source-future-only/, 'six-hour workflow must run this guard before collection');
assert.doesNotMatch(workflow, /EVENTLIVE_SOURCE_ENDED_MIN_YEAR:/, 'six-hour workflow must not advertise an archive window');
assert.match(collector, /if \(collectEndedEvents\) \{\s*const \{ archived_events/s, 'collector must leave the ended-event file untouched in future-only mode');
assert.match(collector, /source\.id === 'jazan-chamber-events'[\s\S]*jazanApiEndpoint\(now\.getUTCMonth\(\) \+ 1/, 'Jazan primary request must roll forward with the current month');
assert.match(collector, /if \(!collectEndedEvents\) \{\s*return extractMadinahChamberPayload/s, 'Madinah recurring collection must not traverse historical pages');
assert.match(radars, /historical_only:\s*true/, 'archive-only radars must be marked explicitly');
assert.match(radars, /filter\(\(radar\) => collectEndedEvents \|\| !radar\.historical_only\)/, 'archive-only radars must be excluded from future-only runs');
assert.match(agendaRadar, /targets\.filter\(\(target\) => target\.extractor !== 'historical-active'\)/, 'historical agenda probes must be excluded from future-only runs');
assert.match(moneyEnricher, /if \(collectEndedEvents\) \{[\s\S]*fetchHtml\(agenda2025Url\)/, 'Money20/20 2025 must require historical opt-in');
assert.match(rffEnricher, /status:\s*'skipped-historical-source'/, 'RFF historical enrichment must no-op during recurring future-only runs');

const scega = registry.sources.find((entry) => entry.id === 'scega-exhibitions-conferences');
assert.equal(scega?.collector_body?.onlyUpcoming, true, 'SCEGA API request must be upcoming-only');

console.log('SOURCE_FUTURE_ONLY_OK active=2 ended=0 past_skipped=2 jazan_months=13');
