import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workdir = path.join('workspaces', '_source-action-identity-regression');
fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });
const catalogPath = path.join(workdir, 'events_catalog.json');
const candidatesPath = path.join(workdir, 'source_candidates.json');
const reportPath = path.join(workdir, 'report.json');

const shared = {
  organizer: 'Eye of Riyadh',
  city: 'Riyadh',
  venue: 'Riyadh International Convention & Exhibition Center',
  category: 'conference',
  starts_at: '2026-08-30T09:00:00+03:00',
  ends_at: '2026-09-01T18:00:00+03:00',
  source_label: 'Eye of Riyadh Events',
  source_id: 'eye-of-riyadh-events',
  source_owner: 'Eye of Riyadh',
  source_confidence: 'public-listing',
  approval_status: 'published',
  published_by: 'EventLive Auto Publisher',
  sessions_count: 0,
  tracks_count: 0,
  rooms_count: 0,
  live_updates_count: 0,
  live_schedule_ready: false,
  tags: ['conference']
};

fs.writeFileSync(catalogPath, `${JSON.stringify({ events: [{
  ...shared,
  id: 'event-saudi-industrial-series',
  slug: 'saudi-industrial-series',
  title: 'Saudi Industrial Series',
  summary: 'Existing exhibition.',
  source_url: 'https://www.eyeofriyadh.com/events/details/saudi-industrial-series',
  evidence_url: 'https://www.eyeofriyadh.com/events/details/saudi-industrial-series',
  ticket_url: 'https://www.eyeofriyadh.com/events/register.php?eveid=9611',
  registration_url: 'https://www.eyeofriyadh.com/events/register.php?eveid=9611'
}] }, null, 2)}\n`);

fs.writeFileSync(candidatesPath, `${JSON.stringify({ candidates: [{
  ...shared,
  id: 'candidate-hrse-ksa',
  title: 'HRSE KSA',
  summary: 'A distinct conference on the same date and at the same venue.',
  source_url: 'https://www.eyeofriyadh.com/events/details/hrse-ksa',
  evidence_url: 'https://www.eyeofriyadh.com/events/details/hrse-ksa',
  ticket_url: 'https://www.eyeofriyadh.com/events/register.php?eveid=9604',
  registration_url: 'https://www.eyeofriyadh.com/events/register.php?eveid=9604',
  confidence: 'public-listing',
  review_status: 'evidence-captured',
  publication_gate: 'duplicate-review',
  matched_catalog_event_id: 'event-saudi-industrial-series',
  source_type: 'marketplace'
}, {
  ...shared,
  id: 'candidate-global-proptech-summit',
  title: 'Global Proptech Summit 2026',
  organizer: 'Global Proptech Summit',
  city: 'Riyadh',
  venue: 'Mandarin Oriental Al Faisaliah',
  summary: 'A directory discovery confirmed by the independent official event page.',
  starts_at: '2026-10-25T09:00:00+03:00',
  ends_at: '2026-10-26T18:00:00+03:00',
  source_type: 'organizer-site',
  source_url: 'https://globalproptechsummit.example/',
  evidence_url: 'https://globalproptechsummit.example/',
  source_label: 'Global Proptech Summit Official',
  source_owner: 'Global Proptech Summit',
  image_url: 'https://globalproptechsummit.example/assets/event-hero.webp',
  image_source_url: 'https://globalproptechsummit.example/',
  discovery_source_url: 'https://www.eyeofriyadh.com/events/details/global-proptech-summit-2026',
  verification_method: 'directory-official-link-page-confirmation',
  secondary_verified_at: '2026-07-10T00:00:00+03:00',
  secondary_verification_kind: 'official-source-evidence',
  confidence: 'verified-secondary',
  review_status: 'ready-for-review',
  publication_gate: 'auto-publish'
}] }, null, 2)}\n`);

const run = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: candidatesPath,
    EVENTLIVE_EVENTS_CATALOG_FILE: catalogPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: reportPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_MD: path.join(workdir, 'report.md')
  }
});
assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);

const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8')).candidates;
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert.equal(candidates[0].matched_catalog_event_id || '', '', 'different event query IDs must not collapse into one event');
assert.equal(candidates[0].publication_gate, 'source-evidence', 'cleared false duplicates must return to the evidence radar');
assert.equal(report.blocked[0]?.reason, 'confidence public-listing is not auto-publishable', 'discovery-only event must be blocked for trust, not as a false duplicate');
assert.equal(report.totals.published, 1, 'independent official-page confirmation must unlock publication');
assert.ok(candidates[1].matched_catalog_event_id, 'verified secondary candidate must link to its published event');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events;
assert.equal(catalog.find((event) => event.title === 'Global Proptech Summit 2026')?.source_confidence, 'corroborated-source', 'secondary verification must retain its distinct trust tier');
assert.equal(catalog.find((event) => event.title === 'Global Proptech Summit 2026')?.image_url, 'https://globalproptechsummit.example/assets/event-hero.webp', 'verified official imagery must reach the catalog');

const secondRun = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: candidatesPath,
    EVENTLIVE_EVENTS_CATALOG_FILE: catalogPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: reportPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_MD: path.join(workdir, 'report.md')
  }
});
assert.equal(secondRun.status, 0, `${secondRun.stdout}\n${secondRun.stderr}`);
const secondReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert.equal(secondReport.totals.published, 0, 'verified secondary publishing must be idempotent');
assert.equal(secondReport.totals.linked_existing, 1, 'verified secondary event must stay linked on later syncs');
assert.equal(secondReport.blocked.some((item) => /global proptech/i.test(item.title)), false, 'verified secondary event must not regress into duplicate review');

console.log('SOURCE_ACTION_IDENTITY_OK distinct_query_ids=2 false_duplicates=0');
