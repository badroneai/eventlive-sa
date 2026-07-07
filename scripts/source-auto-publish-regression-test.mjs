import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workdir = 'workspaces/_source-auto-publish-regression';
const candidatesPath = path.join(workdir, 'source_candidates.json');
const catalogPath = path.join(workdir, 'events_catalog.json');

fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });

fs.writeFileSync(catalogPath, `${JSON.stringify({
  generated_for: 'EventLive source auto-publish regression',
  notes: 'Fixture catalog with an existing national event.',
  events: [
    {
      id: 'event-saudi-national-day',
      slug: 'saudi-national-day',
      title: 'Saudi National Day',
      organizer: 'Visit Saudi',
      city: 'Saudi Arabia',
      venue: 'Saudi Arabia',
      venue_address: 'Saudi Arabia',
      category: 'national day',
      summary: 'Existing catalog row from a national calendar.',
      starts_at: '2026-09-23T09:00:00+03:00',
      ends_at: '2026-09-23T18:00:00+03:00',
      updated_at: '2026-07-03T00:00:00+03:00',
      sessions_count: 0,
      tracks_count: 0,
      rooms_count: 0,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Test Fixture',
      source_label: 'Visit Saudi Calendar',
      source_url: 'https://www.visitsaudi.com/en/saudi-calendar',
      evidence_url: 'https://www.visitsaudi.com/en/saudi-calendar',
      source_confidence: 'approved-source',
      live_schedule_ready: false,
      source_file: '',
      tags: ['national day']
    },
    {
      id: 'event-invalid-auto-published',
      slug: 'invalid-auto-published',
      title: 'Invalid Auto Published',
      organizer: 'Regression Fixture',
      city: 'Riyadh',
      venue: 'Riyadh',
      venue_address: 'Riyadh',
      category: 'test',
      summary: 'Invalid auto-published row that must not survive a publish cycle.',
      starts_at: '2026-12-02T21:00:00+00:00',
      ends_at: '2026-12-03T21:00:00+00:00',
      updated_at: '2026-07-03T00:00:00+03:00',
      sessions_count: 0,
      tracks_count: 0,
      rooms_count: 0,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Regression Source',
      source_url: 'https://example.gov.sa/invalid',
      evidence_url: 'https://example.gov.sa/invalid',
      source_confidence: 'approved-source',
      live_schedule_ready: false,
      source_file: '',
      tags: ['regression']
    },
    {
      id: 'event-official-precise-session',
      slug: 'official-precise-session',
      title: 'Official Precise Session',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Online',
      venue_address: 'Online',
      category: 'workshop',
      summary: 'Existing live-ready row with a precise official session.',
      starts_at: '2026-12-04T10:00:00+03:00',
      ends_at: '2026-12-04T11:00:00+03:00',
      updated_at: '2026-07-03T00:00:00+03:00',
      sessions_count: 1,
      tracks_count: 1,
      rooms_count: 1,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Regression Authority Events',
      source_url: 'https://example.gov.sa/events/official-precise-session',
      evidence_url: 'https://example.gov.sa/events/official-precise-session',
      source_confidence: 'approved-source',
      live_schedule_ready: true,
      sessions: [{
        id: 'event-official-precise-session-official-session-1',
        title: 'Official Precise Session',
        starts_at: '2026-12-04T10:00:00+03:00',
        ends_at: '2026-12-04T11:00:00+03:00',
        session_type: 'official-online-workshop',
        room: 'Online'
      }],
      source_file: '',
      tags: ['workshop']
    }
  ]
}, null, 2)}\n`, 'utf8');

fs.writeFileSync(candidatesPath, `${JSON.stringify({
  generated_for: 'EventLive source auto-publish regression',
  notes: 'Official duplicate with a different city/time should link, not publish.',
  candidates: [
    {
      id: 'candidate-swa-saudi-national-day',
      title: 'Saudi National Day',
      organizer: 'Saudi Water Authority',
      city: 'Riyadh',
      venue: 'Riyadh',
      category: 'national day',
      summary: 'Same national event from another official source.',
      starts_at: '2026-09-23T08:00:00+03:00',
      ends_at: '2026-09-24T04:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://www.swa.gov.sa/en/events/Event-639153024443263826',
      source_label: 'Saudi Water Authority Events',
      source_owner: 'Saudi Water Authority',
      evidence_url: 'https://www.swa.gov.sa/en/events/Event-639153024443263826',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-regression.html',
      discovered_at: '2026-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      extracted_sessions_count: 0,
      reviewer_notes: 'Regression fixture.',
      tags: ['national day']
    },
    {
      id: 'candidate-official-precise-session-generic-window',
      title: 'Official Precise Session',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Online',
      category: 'workshop',
      summary: 'Same event from source feed with a generic all-day window.',
      starts_at: '2026-12-04T09:00:00+03:00',
      ends_at: '2026-12-04T18:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/official-precise-session',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/official-precise-session',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-precise-regression.html',
      discovered_at: '2026-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Precise session preservation regression fixture.',
      tags: ['workshop']
    },
    {
      id: 'candidate-official-image-preservation',
      title: 'Official Image Preservation Workshop',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Regression Hall',
      category: 'workshop',
      summary: 'New official event that should be auto-published with its source image intact.',
      image_url: 'https://example.gov.sa/assets/workshop-cover.jpg',
      image_alt: 'Official Image Preservation Workshop cover',
      starts_at: '2026-11-18T09:00:00+03:00',
      ends_at: '2026-11-18T12:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/official-image-preservation-workshop',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/official-image-preservation-workshop',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-image-regression.html',
      discovered_at: '2026-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Image preservation regression fixture.',
      tags: ['workshop']
    },
    {
      id: 'candidate-official-image-preservation-title-variant',
      title: 'Image Preservation Official Workshop',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Regression Hall',
      category: 'workshop',
      summary: 'Same official event exposed with a slightly different title.',
      starts_at: '2026-11-18T09:00:00+03:00',
      ends_at: '2026-11-18T12:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/official-image-preservation-workshop?utm_source=calendar',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/official-image-preservation-workshop',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-image-regression.html',
      discovered_at: '2026-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Source/date duplicate regression fixture.',
      tags: ['workshop']
    }
  ]
}, null, 2)}\n`, 'utf8');

const run = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: candidatesPath,
    EVENTLIVE_EVENTS_CATALOG_FILE: catalogPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: path.join(workdir, 'source-auto-publish-report.json'),
    EVENTLIVE_AUTO_PUBLISH_REPORT_MD: path.join(workdir, 'source-auto-publish-report.md')
  }
});

const out = `${run.stdout || ''}\n${run.stderr || ''}`;
if (run.status !== 0) {
  console.error('TEST_FAIL source auto-publish regression command failed');
  console.error(out);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
const candidate = candidates.candidates[0];

if (
  catalog.events.length !== 3
  || catalog.events.some((event) => event.id === 'event-invalid-auto-published')
  || candidate.matched_catalog_event_id !== 'event-saudi-national-day'
  || !/Published:\s*1/i.test(out)
) {
  console.error('TEST_FAIL official title/date duplicate should link instead of publishing a second row');
  console.error(out);
  console.error(JSON.stringify({ catalog_events: catalog.events.length, candidate }, null, 2));
  process.exit(1);
}

const imageEvent = catalog.events.find((event) => event.title === 'Official Image Preservation Workshop');
const sourceDateVariant = candidates.candidates.find((row) => row.id === 'candidate-official-image-preservation-title-variant');
const preciseEvent = catalog.events.find((event) => event.id === 'event-official-precise-session');
const preciseCandidate = candidates.candidates.find((row) => row.id === 'candidate-official-precise-session-generic-window');
if (
  imageEvent?.image_url !== 'https://example.gov.sa/assets/workshop-cover.jpg'
  || imageEvent?.original_image_url !== 'https://example.gov.sa/assets/workshop-cover.jpg'
  || imageEvent?.image_alt !== 'Official Image Preservation Workshop cover'
) {
  console.error('TEST_FAIL auto-published candidate image fields must be preserved');
  console.error(JSON.stringify(imageEvent, null, 2));
  process.exit(1);
}

if (
  catalog.events.length !== 3
  || sourceDateVariant?.matched_catalog_event_id !== imageEvent.id
) {
  console.error('TEST_FAIL official source/date duplicate should link to the first published event');
  console.error(JSON.stringify({ catalog_events: catalog.events.length, sourceDateVariant }, null, 2));
  process.exit(1);
}

if (
  preciseCandidate?.matched_catalog_event_id !== 'event-official-precise-session'
  || preciseEvent?.starts_at !== '2026-12-04T10:00:00+03:00'
  || preciseEvent?.ends_at !== '2026-12-04T11:00:00+03:00'
) {
  console.error('TEST_FAIL linked generic source row must not overwrite existing precise live schedule times');
  console.error(JSON.stringify({ preciseCandidate, preciseEvent }, null, 2));
  process.exit(1);
}

console.log('TEST_OK source auto-publish duplicate regression checks passed');
