import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workdir = path.join('workspaces', '_scega-canonical-alias-regression');
const candidatesPath = path.join(workdir, 'source_candidates.json');
const catalogPath = path.join(workdir, 'events_catalog.json');
const reportPath = path.join(workdir, 'source-auto-publish-report.json');

fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });

const baseEvent = {
  organizer: 'Official organizer',
  city: 'Riyadh',
  venue: 'Riyadh',
  category: 'conference',
  summary: 'Official canonical event.',
  ends_at: '2026-09-03T22:00:00+03:00',
  updated_at: '2026-07-10T00:00:00+03:00',
  approval_status: 'published',
  published_by: 'EventLive Auto Publisher',
  source_label: 'Official event owner',
  evidence_url: 'https://official.example/event',
  source_confidence: 'approved-source',
  live_schedule_ready: false,
  sessions_count: 0,
  tracks_count: 0,
  rooms_count: 0,
  live_updates_count: 0,
  tags: ['conference']
};

const aliases = [
  {
    canonical: { id: 'event-leap-2026', slug: 'leap-2026', title: 'LEAP 2026', starts_at: '2026-08-31T11:00:00+03:00', source_url: 'https://onegiantleap.com/', live_schedule_ready: true, sessions_count: 1, sessions: [{ id: 'leap-session', title: 'Opening', starts_at: '2026-08-31T11:00:00+03:00', ends_at: '2026-08-31T11:30:00+03:00', room: 'Main' }] },
    duplicate: { id: 'event-ليب-26', slug: 'ليب-26', title: 'ليب 26', starts_at: '2026-08-31T08:00:00+03:00', source_url: 'https://eportal.scega.gov.sa/h-events-details/2041' }
  },
  {
    canonical: { id: 'event-saudi-woodshow', slug: 'saudi-woodshow', title: 'Saudi WoodShow', starts_at: '2026-09-01T13:00:00+03:00', source_url: 'https://woodshowglobal.com/saudi' },
    duplicate: { id: 'event-ملتقى-الأخشاب-الدولي', slug: 'ملتقى-الأخشاب-الدولي', title: 'ملتقى الأخشاب الدولي', starts_at: '2026-09-01T14:00:00+03:00', source_url: 'https://eportal.scega.gov.sa/h-events-details/2087' }
  },
  {
    canonical: { id: 'event-riyadh-global-medical-biotechnology-summit', slug: 'riyadh-global-medical-biotechnology-summit', title: 'Riyadh Global Medical Biotechnology Summit', starts_at: '2026-09-14T09:30:00+03:00', source_url: 'https://riyadh.sa/event/30261' },
    duplicate: { id: 'event-قمة-الرياض-العالمية-للتقنية-الحيوية-الطبية-2026', slug: 'قمة-الرياض-العالمية-للتقنية-الحيوية-الطبية-2026', title: 'قمة الرياض العالمية للتقنية الحيوية الطبية 2026', starts_at: '2026-09-14T09:00:00+03:00', source_url: 'https://eportal.scega.gov.sa/h-events-details/2086' }
  },
  {
    canonical: { id: 'event-al-milwah-falcon-race', slug: 'al-milwah-falcon-race', title: 'Al Milwah Falcon Race', starts_at: '2026-10-04T19:00:00+03:00', ends_at: '2026-10-09T23:00:00+03:00', source_url: 'https://www.visitsaudi.com/en/riyadh/events/melwah-racing' },
    duplicate: { id: 'event-سباق-الملواح', slug: 'سباق-الملواح', title: 'سباق الملواح', starts_at: '2026-10-04T07:00:00+03:00', ends_at: '2026-10-09T12:00:00+03:00', source_url: 'https://eportal.scega.gov.sa/h-events-details/2088' }
  }
];

const events = aliases.flatMap(({ canonical, duplicate }) => [
  { ...baseEvent, ...canonical, evidence_url: canonical.source_url },
  { ...baseEvent, ...duplicate, evidence_url: duplicate.source_url }
]);
const candidates = aliases.map(({ duplicate }) => ({
  id: `candidate-${duplicate.id}`,
  title: duplicate.title,
  organizer: 'Saudi Conventions & Exhibitions General Authority',
  city: 'Riyadh',
  venue: 'Riyadh',
  category: 'conference',
  summary: 'Official SCEGA corroborating record.',
  starts_at: duplicate.starts_at,
  ends_at: duplicate.ends_at || baseEvent.ends_at,
  source_type: 'government-calendar',
  source_url: duplicate.source_url,
  source_label: 'SCEGA ePortal Events',
  source_owner: 'Saudi Conventions & Exhibitions General Authority',
  evidence_url: duplicate.source_url,
  raw_snapshot_path: 'data/raw/source-snapshots/scega.json',
  discovered_at: '2026-07-10T00:00:00+03:00',
  discovery_method: 'official-calendar',
  confidence: 'official',
  review_status: 'approved-for-catalog',
  publication_gate: 'catalog-review',
  extracted_sessions_count: 0,
  tags: ['conference']
}));

fs.writeFileSync(catalogPath, `${JSON.stringify({ events }, null, 2)}\n`);
fs.writeFileSync(candidatesPath, `${JSON.stringify({ candidates }, null, 2)}\n`);

const run = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: candidatesPath,
    EVENTLIVE_EVENTS_CATALOG_FILE: catalogPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: reportPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_MD: path.join(workdir, 'source-auto-publish-report.md')
  }
});
assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const candidateEnvelope = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const canonicalIds = aliases.map(({ canonical }) => canonical.id);

assert.equal(catalog.events.length, 4, 'each bilingual SCEGA record must collapse into its canonical event');
assert.deepEqual(new Set(catalog.events.map((event) => event.id)), new Set(canonicalIds));
assert.equal(report.duplicate_catalog_rows_removed, 4);
assert.equal(report.totals.published, 0, 'corroborating SCEGA aliases must never create a second public card');
assert.deepEqual(
  new Set(candidateEnvelope.candidates.map((candidate) => candidate.matched_catalog_event_id)),
  new Set(canonicalIds),
  'all SCEGA candidates must link to the retained canonical records'
);
assert.equal(catalog.events.find((event) => event.id === 'event-leap-2026')?.sessions_count, 1, 'the richer first-party live agenda must survive reconciliation');

console.log('SCEGA_CANONICAL_ALIAS_OK aliases=4 duplicate_cards=0');
