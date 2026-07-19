import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { normalizeEventCategory } from './category-taxonomy.mjs';

const workdir = 'workspaces/_source-auto-publish-fuzzy-dedupe-regression';
const candidatesPath = path.join(workdir, 'source_candidates.json');
const catalogPath = path.join(workdir, 'events_catalog.json');
const reportJsonPath = path.join(workdir, 'source-auto-publish-report.json');
const reportMdPath = path.join(workdir, 'source-auto-publish-report.md');

fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });

const catalogEvents = [
  {
    id: 'event-saudi-industrial-series',
    slug: 'saudi-industrial-series',
    title: 'Saudi Industrial Series',
    organizer: 'dmg events',
    city: 'Riyadh',
    venue: 'Riyadh Front Exhibition & Conference Center',
    category: 'conference',
    summary: 'Authoritative organizer record.',
    starts_at: '2099-08-30T16:00:00+03:00',
    ends_at: '2099-09-01T22:00:00+03:00',
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: 'Saudi Industrial Series Official',
    source_url: 'https://industrial.example.com/visit',
    evidence_url: 'https://industrial.example.com/visit',
    source_confidence: 'organizer-confirmed',
    live_schedule_ready: false,
    sessions_count: 0,
    tags: ['conference']
  },
  {
    id: 'event-number-order',
    slug: 'saudi-industrial-series-2099',
    title: 'Saudi Industrial Series ٢٠٩٩',
    organizer: 'Regression Organizer',
    city: 'Jeddah',
    venue: 'Regression Complex Hall 1',
    category: 'conference',
    summary: 'Arabic-number title fixture.',
    starts_at: '2099-12-10T09:00:00+03:00',
    ends_at: '2099-12-11T18:00:00+03:00',
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: 'Regression Source A',
    source_url: 'https://source-a.example.com/events/number-order',
    evidence_url: 'https://source-a.example.com/events/number-order',
    source_confidence: 'approved-source',
    live_schedule_ready: false,
    sessions_count: 0,
    tags: ['conference']
  },
  {
    id: 'event-short-number-title',
    slug: 'leap-2099',
    title: 'LEAP ٢٠٩٩',
    organizer: 'Regression Organizer',
    city: 'Dammam',
    venue: 'Dammam Tech Center Hall 2',
    category: 'conference',
    summary: 'Short title fixture.',
    starts_at: '2099-06-10T09:00:00+03:00',
    ends_at: '2099-06-11T18:00:00+03:00',
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: 'Regression Short Source A',
    source_url: 'https://source-a.example.com/events/leap-2099',
    evidence_url: 'https://source-a.example.com/events/leap-2099',
    source_confidence: 'approved-source',
    live_schedule_ready: false,
    sessions_count: 0,
    tags: ['conference']
  },
  {
    id: 'event-long-overlapping-cohort',
    slug: 'web-development-cohort-2099',
    title: 'Web Development Cohort 2099',
    organizer: 'Regression Academy',
    city: 'Riyadh',
    venue: 'Regression Academy Hall 4',
    category: 'training',
    summary: 'Long cohort fixture.',
    starts_at: '2099-01-01T09:00:00+03:00',
    ends_at: '2099-04-30T17:00:00+03:00',
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: 'Regression Academy Source A',
    source_url: 'https://academy.example.com/cohorts/web-2099-a',
    evidence_url: 'https://academy.example.com/cohorts/web-2099-a',
    source_confidence: 'approved-source',
    live_schedule_ready: false,
    sessions_count: 0,
    tags: ['training']
  },
  ...[
    ['a', 'A', '2099-05-01T09:00:00+03:00', 'https://identity-a.example.com/forum'],
    ['b', 'B', '2099-05-05T09:00:00+03:00', 'https://identity-b.example.com/forum']
  ].map(([suffix, hall, startsAt, sourceUrl]) => ({
    id: `event-decisive-identity-${suffix}`,
    slug: `decisive-identity-${suffix}`,
    title: 'Identity Conflict Forum',
    organizer: 'Regression Organizer',
    city: 'Riyadh',
    venue: 'Identity Convention Center',
    venue_address: `Identity Convention Center Hall ${hall}`,
    category: 'forum',
    summary: `Identity fixture ${suffix}.`,
    starts_at: startsAt,
    ends_at: startsAt.replace('09:00:00', '17:00:00'),
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: `Identity Source ${suffix}`,
    source_url: sourceUrl,
    evidence_url: sourceUrl,
    source_confidence: 'approved-source',
    live_schedule_ready: false,
    sessions_count: 0,
    tags: ['forum']
  })),
  ...[
    ['known', 'Ambiguous Venue Center', 'https://ambiguous-a.example.com/forum'],
    ['unknown', '', 'https://ambiguous-b.example.com/forum']
  ].map(([suffix, venue, sourceUrl]) => ({
    id: `event-ambiguous-venue-${suffix}`,
    slug: 'ambiguous-venue-forum',
    title: 'Ambiguous Venue Forum',
    organizer: 'Regression Organizer',
    city: 'Riyadh',
    venue,
    category: 'forum',
    summary: `Ambiguous venue fixture ${suffix}.`,
    starts_at: '2099-07-01T09:00:00+03:00',
    ends_at: '2099-07-01T17:00:00+03:00',
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: `Ambiguous Venue Source ${suffix}`,
    source_url: sourceUrl,
    evidence_url: sourceUrl,
    source_confidence: 'approved-source',
    live_schedule_ready: false,
    sessions_count: 0,
    tags: ['forum']
  })),
  ...['A', 'B'].map((hall) => ({
    id: `event-multi-hall-${hall.toLowerCase()}`,
    slug: `multi-hall-${hall.toLowerCase()}`,
    title: 'Multi Hall Professional Forum',
    organizer: 'Regression Organizer',
    city: 'Riyadh',
    venue: 'Regression Complex',
    venue_address: `Regression Complex Hall ${hall}`,
    category: 'forum',
    summary: `Distinct event in Hall ${hall}.`,
    starts_at: '2099-11-20T10:00:00+03:00',
    ends_at: '2099-11-20T12:00:00+03:00',
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: `Regression Hall ${hall}`,
    source_url: `https://venue.example.com/events/hall-${hall.toLowerCase()}`,
    evidence_url: `https://venue.example.com/events/hall-${hall.toLowerCase()}`,
    source_confidence: 'approved-source',
    live_schedule_ready: false,
    sessions_count: 0,
    tags: ['forum']
  }))
];

const baseCandidate = {
  organizer: 'Regression Organizer',
  category: 'conference',
  summary: 'Regression candidate.',
  source_type: 'official-site',
  source_label: 'Regression Source B',
  source_owner: 'Regression Organizer',
  raw_snapshot_path: 'data/raw/source-snapshots/fuzzy-dedupe-regression.html',
  discovered_at: '2099-01-01T00:00:00+03:00',
  discovery_method: 'official-calendar',
  confidence: 'official',
  review_status: 'ready-for-review',
  publication_gate: 'auto-publish',
  extracted_sessions_count: 0,
  tags: ['conference']
};

const candidates = [
  {
    ...baseCandidate,
    id: 'candidate-saudi-industrial-source-conflict',
    title: 'Saudi Industrial Series',
    city: 'Riyadh',
    venue: 'Riyadh International Convention & Exhibition Center',
    starts_at: '2099-09-08T15:00:00+03:00',
    ends_at: '2099-09-10T21:00:00+03:00',
    source_url: 'https://city.example.sa/events/industrial-series',
    evidence_url: 'https://city.example.sa/events/industrial-series',
    matched_catalog_event_id: 'stale-duplicate-id'
  },
  {
    ...baseCandidate,
    id: 'candidate-reordered-number-title',
    title: '2099 Series Industrial Saudi',
    city: 'Jeddah',
    venue: 'Regression Complex Hall 1',
    starts_at: '2099-12-13T09:00:00+03:00',
    ends_at: '2099-12-14T18:00:00+03:00',
    source_url: 'https://source-b.example.com/events/reordered-number-title',
    evidence_url: 'https://source-b.example.com/events/reordered-number-title'
  },
  {
    ...baseCandidate,
    id: 'candidate-distinct-same-venue',
    title: 'Manufacturing Excellence Awards 2099',
    city: 'Jeddah',
    venue: 'Regression Complex Hall 1',
    starts_at: '2099-12-12T09:00:00+03:00',
    ends_at: '2099-12-12T12:00:00+03:00',
    source_url: 'https://source-b.example.com/events/manufacturing-awards',
    evidence_url: 'https://source-b.example.com/events/manufacturing-awards'
  },
  {
    ...baseCandidate,
    id: 'candidate-same-title-outside-window',
    title: '2099 Saudi Industrial Series',
    city: 'Jeddah',
    venue: 'Regression Complex Hall 1',
    starts_at: '2099-12-14T09:00:00+03:00',
    ends_at: '2099-12-15T18:00:00+03:00',
    source_url: 'https://source-c.example.com/events/later-industrial-series',
    evidence_url: 'https://source-c.example.com/events/later-industrial-series'
  },
  {
    ...baseCandidate,
    id: 'candidate-different-number',
    title: '2098 Series Industrial Saudi',
    city: 'Jeddah',
    venue: 'Regression Complex Hall 1',
    starts_at: '2099-12-13T09:00:00+03:00',
    ends_at: '2099-12-14T18:00:00+03:00',
    source_url: 'https://source-d.example.com/events/different-number',
    evidence_url: 'https://source-d.example.com/events/different-number'
  },
  {
    ...baseCandidate,
    id: 'candidate-short-number-title',
    title: '2099 LEAP',
    city: 'Dammam',
    venue: 'Dammam Tech Center Hall 2',
    starts_at: '2099-06-13T09:00:00+03:00',
    ends_at: '2099-06-14T18:00:00+03:00',
    source_url: 'https://source-b.example.com/events/leap-2099',
    evidence_url: 'https://source-b.example.com/events/leap-2099'
  },
  {
    ...baseCandidate,
    id: 'candidate-long-overlapping-cohort',
    title: '2099 Cohort Development Web',
    organizer: 'Regression Academy',
    city: 'Riyadh',
    venue: 'Regression Academy Hall 4',
    starts_at: '2099-01-20T09:00:00+03:00',
    ends_at: '2099-05-31T17:00:00+03:00',
    source_url: 'https://academy.example.com/cohorts/web-2099-b',
    evidence_url: 'https://academy.example.com/cohorts/web-2099-b'
  },
  {
    ...baseCandidate,
    id: 'candidate-decisive-identity-with-second-conflict',
    title: 'Identity Conflict Forum',
    city: 'Riyadh',
    venue: 'Identity Convention Center',
    venue_address: 'Identity Convention Center Hall A',
    starts_at: '2099-05-01T09:00:00+03:00',
    ends_at: '2099-05-01T17:00:00+03:00',
    source_label: 'Identity Source A',
    source_url: 'https://identity-a.example.com/forum',
    evidence_url: 'https://identity-a.example.com/forum'
  }
];

fs.writeFileSync(catalogPath, `${JSON.stringify({ generated_for: 'fuzzy dedupe regression', events: catalogEvents }, null, 2)}\n`, 'utf8');
fs.writeFileSync(candidatesPath, `${JSON.stringify({ generated_at: '2099-01-01T00:00:00+03:00', candidates }, null, 2)}\n`, 'utf8');

const run = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: candidatesPath,
    EVENTLIVE_EVENTS_CATALOG_FILE: catalogPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: reportJsonPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_MD: reportMdPath
  }
});

assert.equal(run.status, 0, `${run.stdout || ''}\n${run.stderr || ''}`);
const outputCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events;
const outputCandidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8')).candidates;
const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'));

assert.equal(report.duplicate_catalog_rows_removed, 0, 'fuzzy review must not delete catalog rows');
assert.equal(outputCatalog.filter((event) => /^event-multi-hall-/.test(event.id)).length, 2, 'different halls must remain separate catalog events');
assert.equal(outputCatalog.filter((event) => /^event-ambiguous-venue-/.test(event.id)).length, 2, 'a missing venue on one row must not authorize deletion');
for (const originalEvent of catalogEvents) {
  assert.deepEqual(
    outputCatalog.find((event) => event.id === originalEvent.id),
    normalizeEventCategory(originalEvent),
    `duplicate review must not mutate existing catalog event ${originalEvent.id} beyond required category normalization`
  );
}
assert.equal(outputCatalog.length, catalogEvents.length + 4, 'only four proven-distinct candidates should be added');
assert.equal(report.totals.published, 4, 'distinct title, +4-day, different-number, and long-overlap candidates should publish');
assert.equal(report.totals.linked_existing, 0, 'fuzzy alerts must not link candidates automatically');
assert.equal(report.totals.duplicate_review_alerts, 4, 'source conflict, +3-day fuzzy, short-title, and second-record conflict cases must raise alerts');

const alertsByCandidate = new Map(report.duplicate_review_alerts.map((alert) => [alert.candidate_id, alert]));
assert.equal(alertsByCandidate.get('candidate-saudi-industrial-source-conflict')?.kind, 'exact-title-city-source-conflict');
assert.equal(alertsByCandidate.get('candidate-reordered-number-title')?.kind, 'fuzzy-title-venue-date-window');
assert.equal(alertsByCandidate.get('candidate-reordered-number-title')?.start_date_drift_days, 3, 'the +3-day boundary must alert');
assert.equal(alertsByCandidate.get('candidate-short-number-title')?.kind, 'fuzzy-title-venue-date-window');
assert.equal(alertsByCandidate.get('candidate-decisive-identity-with-second-conflict')?.kind, 'exact-title-city-source-conflict');
assert.equal(alertsByCandidate.get('candidate-decisive-identity-with-second-conflict')?.possible_event_id, 'event-decisive-identity-b');
assert.equal(alertsByCandidate.has('candidate-same-title-outside-window'), false, 'the +4-day boundary must not fuzzy-match');
assert.equal(alertsByCandidate.has('candidate-different-number'), false, 'different numeric title tokens must remain distinct');
assert.equal(alertsByCandidate.has('candidate-long-overlapping-cohort'), false, 'overlapping long ranges must not bypass the ±3-day start window');

for (const id of [
  'candidate-saudi-industrial-source-conflict',
  'candidate-reordered-number-title',
  'candidate-short-number-title',
  'candidate-decisive-identity-with-second-conflict'
]) {
  const candidate = outputCandidates.find((row) => row.id === id);
  assert.equal(candidate.review_status, 'ready-for-review');
  assert.equal(candidate.publication_gate, 'duplicate-review');
  assert.equal(Object.hasOwn(candidate, 'matched_catalog_event_id'), false, 'an alert must not become an automatic link');
  const sourceUrl = candidates.find((row) => row.id === id).source_url;
  assert.equal(
    outputCatalog.filter((event) => event.source_url === sourceUrl).length,
    catalogEvents.filter((event) => event.source_url === sourceUrl).length,
    'an alerted candidate must not add a catalog row'
  );
}

for (const id of [
  'candidate-distinct-same-venue',
  'candidate-same-title-outside-window',
  'candidate-different-number',
  'candidate-long-overlapping-cohort'
]) {
  const candidate = outputCandidates.find((row) => row.id === id);
  assert.equal(candidate.review_status, 'approved-for-catalog');
  assert.equal(candidate.publication_gate, 'catalog-review');
  assert.ok(candidate.matched_catalog_event_id, `${id} should publish as a distinct event`);
}

console.log(`FUZZY_DEDUPE_TEST_OK alerts=${report.totals.duplicate_review_alerts} published=${report.totals.published} boundary_days=3 multi_hall=2`);
