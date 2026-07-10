import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workdir = path.join('workspaces', '_source-auto-publish-identity-regression');
const candidatesPath = path.join(workdir, 'source_candidates.json');
const catalogPath = path.join(workdir, 'events_catalog.json');
const reportPath = path.join(workdir, 'source-auto-publish-report.json');
fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });

const sourceUrl = 'https://example.gov.sa/bootcamp/stable-program-id/view';
const baseEvent = {
  slug: 'stable-program',
  title: 'Stable Official Program',
  organizer: 'Official Academy',
  city: 'Riyadh',
  venue: 'Official Academy',
  category: 'bootcamp',
  summary: 'Official program whose dates changed after publication.',
  ends_at: '2026-10-15T21:30:00+03:00',
  updated_at: '2026-07-01T00:00:00+03:00',
  approval_status: 'published',
  published_by: 'EventLive Auto Publisher',
  source_label: 'Official Academy Programs',
  source_url: sourceUrl,
  evidence_url: sourceUrl,
  source_confidence: 'approved-source',
  live_schedule_ready: false,
  sessions_count: 0,
  tracks_count: 0,
  rooms_count: 0,
  live_updates_count: 0,
  tags: ['bootcamp']
};
const detailEvent = {
  ...baseEvent,
  category: 'conference',
  starts_at: '2026-09-14T09:00:00+03:00',
  ends_at: '2026-09-15T18:00:00+03:00'
};
fs.writeFileSync(catalogPath, `${JSON.stringify({ events: [
  { ...baseEvent, id: 'event-stable-program', starts_at: '2026-07-26T17:30:00+03:00' },
  { ...baseEvent, id: 'event-stable-program-2', starts_at: '2026-07-26T17:30:00+03:00' },
  { ...detailEvent, id: 'event-forum', slug: 'forum', title: 'Official Forum', source_url: 'https://example.gov.sa/events/Details.aspx?EventID=122&utm_source=test', evidence_url: 'https://example.gov.sa/events/Details.aspx?EventID=122' },
  { ...detailEvent, id: 'event-forum-copy', slug: 'forum-copy', title: 'Official Forum', source_url: 'https://example.gov.sa/events/Details.aspx?utm_medium=email&EventID=122', evidence_url: 'https://example.gov.sa/events/Details.aspx?EventID=122' },
  { ...detailEvent, id: 'event-summit', slug: 'summit', title: 'Official Summit', source_url: 'https://example.gov.sa/events/Details.aspx?EventID=123', evidence_url: 'https://example.gov.sa/events/Details.aspx?EventID=123' }
] }, null, 2)}\n`);
fs.writeFileSync(candidatesPath, `${JSON.stringify({ candidates: [{
  id: 'candidate-stable-program',
  title: 'Stable Official Program',
  organizer: 'Official Academy',
  city: 'Riyadh',
  venue: 'Official Academy',
  category: 'bootcamp',
  summary: 'Official program with corrected dates.',
  starts_at: '2026-07-19T17:30:00+03:00',
  ends_at: '2026-10-08T21:30:00+03:00',
  source_url: sourceUrl,
  source_label: 'Official Academy Programs',
  source_owner: 'Official Academy',
  evidence_url: sourceUrl,
  raw_snapshot_path: 'data/raw/source-snapshots/stable-program.json',
  confidence: 'official',
  review_status: 'approved-for-catalog',
  publication_gate: 'catalog-review',
  tags: ['bootcamp']
}, {
  id: 'candidate-summit-title-correction',
  title: 'Official Summit Corrected',
  organizer: 'Official Academy',
  city: 'Riyadh',
  venue: 'Official Academy',
  category: 'conference',
  summary: 'Official query-specific event title correction.',
  starts_at: '2026-09-15T09:00:00+03:00',
  ends_at: '2026-09-15T18:00:00+03:00',
  source_url: 'https://example.gov.sa/events/Details.aspx?EventID=123',
  source_label: 'Official Academy Events',
  source_owner: 'Official Academy',
  evidence_url: 'https://example.gov.sa/events/Details.aspx?EventID=123',
  raw_snapshot_path: 'data/raw/source-snapshots/summit.json',
  confidence: 'official',
  review_status: 'approved-for-catalog',
  publication_gate: 'catalog-review',
  tags: ['conference']
}] }, null, 2)}\n`);

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
const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert.equal(catalog.events.length, 3, 'duplicate auto-published rows with one detail URL must be reconciled without merging distinct query IDs');
const stableProgram = catalog.events.find((event) => event.id === 'event-stable-program');
assert.ok(stableProgram, 'canonical event id must be retained');
assert.equal(stableProgram.starts_at, '2026-07-19T17:30:00+03:00', 'corrected official dates must update the retained event');
assert.ok(catalog.events.some((event) => event.id === 'event-official-forum'), 'tracking parameters must not split one official detail event');
assert.ok(catalog.events.some((event) => event.id === 'event-official-summit-corrected'), 'distinct EventID values must remain distinct official events');
assert.equal(catalog.events.find((event) => event.id === 'event-official-summit-corrected')?.title, 'Official Summit Corrected', 'query-specific official identity must correct its retained title and canonical id');
assert.equal(candidates.candidates[0].matched_catalog_event_id, 'event-stable-program');
assert.equal(report.totals.published, 0, 'date correction must not publish a new event');
assert.equal(report.duplicate_catalog_rows_removed, 2);
assert.equal(report.canonical_event_ids_remapped, 2);

console.log('TEST_OK source identity reconciliation prevents date-shift duplicates');
