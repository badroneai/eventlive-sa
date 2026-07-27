import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { categoryDefinition } from './category-taxonomy.mjs';

const workdir = 'workspaces/_source-auto-publish-regression';
const candidatesPath = path.join(workdir, 'source_candidates.json');
const catalogPath = path.join(workdir, 'events_catalog.json');
const reportJsonPath = path.join(workdir, 'source-auto-publish-report.json');
const unknownRawCategory = 'Emerging Civic Experience';

if (categoryDefinition(unknownRawCategory)) {
  console.error('TEST_FAIL unknown-category fixture must not become a known taxonomy alias');
  process.exit(1);
}

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
      starts_at: '2099-09-23T09:00:00+03:00',
      ends_at: '2099-09-23T18:00:00+03:00',
      updated_at: '2099-07-03T00:00:00+03:00',
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
      starts_at: '2099-12-02T21:00:00+00:00',
      ends_at: '2099-12-03T21:00:00+00:00',
      updated_at: '2099-07-03T00:00:00+03:00',
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
      starts_at: '2099-12-04T10:00:00+03:00',
      ends_at: '2099-12-04T11:00:00+03:00',
      updated_at: '2099-07-03T00:00:00+03:00',
      sessions_count: 1,
      tracks_count: 1,
      rooms_count: 1,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Regression Authority Events',
      source_url: 'https://example.gov.sa/events/official-precise-session',
      evidence_url: 'https://example.gov.sa/events/official-precise-session',
      ticket_url: 'https://tickets.example.gov.sa/tickets/official-precise-session',
      source_confidence: 'approved-source',
      live_schedule_ready: true,
      sessions: [{
        id: 'event-official-precise-session-official-session-1',
        title: 'Official Precise Session',
        starts_at: '2099-12-04T10:00:00+03:00',
        ends_at: '2099-12-04T11:00:00+03:00',
        session_type: 'official-online-workshop',
        room: 'Online'
      }],
      source_file: '',
      tags: ['workshop']
    },
    {
      id: 'event-provider-enriched-workshop',
      slug: 'provider-enriched-workshop',
      title: 'Provider Enriched Workshop',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Online',
      venue_address: 'Online',
      category: 'workshop',
      summary: 'Existing row enriched from its official detail page.',
      starts_at: '2099-12-08T14:30:00+03:00',
      ends_at: '2099-12-08T16:00:00+03:00',
      updated_at: '2099-07-03T00:00:00+03:00',
      sessions_count: 0,
      tracks_count: 0,
      rooms_count: 0,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Regression Authority Events',
      source_url: 'https://example.gov.sa/events/provider-enriched-workshop',
      evidence_url: 'https://example.gov.sa/events/provider-enriched-workshop',
      source_confidence: 'approved-source',
      live_schedule_ready: false,
      program_outline: {
        provider: 'Regression Authority Events',
        source_url: 'https://example.gov.sa/events/provider-enriched-workshop'
      },
      source_file: '',
      tags: ['workshop']
    },
    {
      id: 'event-collapsed-pdf-row',
      slug: 'collapsed-pdf-row',
      title: 'Collapsed PDF Row',
      organizer: 'Saudi Tourism Authority',
      city: 'Jeddah',
      venue: 'Jeddah',
      venue_address: 'Jeddah',
      category: 'festival',
      summary: 'Stale row created by the former one-document-one-event identity rule.',
      starts_at: '2099-12-20T00:00:00+03:00',
      ends_at: '2099-12-20T23:59:00+03:00',
      updated_at: '2099-07-03T00:00:00+03:00',
      sessions_count: 0,
      tracks_count: 0,
      rooms_count: 0,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Visit Saudi Calendar PDF',
      source_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      evidence_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      source_confidence: 'approved-source',
      live_schedule_ready: false,
      source_file: 'data/raw/source-snapshots/calendar.xml',
      tags: ['festival']
    },
    {
      id: 'event-eishha-rich-detail',
      slug: 'eishha-rich-detail',
      title: 'Eishha Live It Fan Zone For FIFA World Cup 2026',
      organizer: 'Riyadh City',
      city: 'Riyadh',
      venue: 'Boulevard City',
      venue_address: 'Boulevard City',
      category: 'sports',
      summary: 'Rich official detail row with image and precise operating hours.',
      image_url: 'https://riyadh.sa/eishha.jpg',
      starts_at: '2099-06-11T18:00:00+03:00',
      ends_at: '2099-07-19T23:55:00+03:00',
      updated_at: '2099-07-03T00:00:00+03:00',
      sessions_count: 0,
      tracks_count: 0,
      rooms_count: 0,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Riyadh City Events',
      source_url: 'https://riyadh.sa/en/moment/events/item/event/31073',
      evidence_url: 'https://riyadh.sa/en/moment/events/item/event/31073',
      source_confidence: 'approved-source',
      live_schedule_ready: false,
      source_file: 'data/raw/source-snapshots/riyadh-city-events.json',
      tags: ['sports']
    },
    {
      id: 'event-kashtah-rich-detail',
      slug: 'kashtah',
      title: 'Kashtah',
      organizer: 'Saudi Tourism Authority',
      city: 'Aseer',
      venue: 'Al-Hadabah Park',
      venue_address: 'Al-Hadabah Park',
      category: 'families',
      summary: 'Rich official detail row for Kashtah.',
      image_url: 'https://visitsaudi.com/kashtah.jpg',
      starts_at: '2099-06-27T16:00:00+03:00',
      ends_at: '2099-08-31T00:00:00+03:00',
      updated_at: '2099-07-03T00:00:00+03:00',
      sessions_count: 0,
      tracks_count: 0,
      rooms_count: 0,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Visit Saudi Calendar',
      source_url: 'https://www.visitsaudi.com/en/aseer/events/kashtah',
      evidence_url: 'https://www.visitsaudi.com/en/aseer/events/kashtah',
      source_confidence: 'approved-source',
      live_schedule_ready: false,
      source_file: 'data/raw/source-snapshots/visit-saudi.json',
      tags: ['families']
    },
    {
      id: 'event-ithra-session-refresh',
      slug: 'ithra-session-refresh',
      title: 'Ithra Session Refresh',
      organizer: 'Ithra',
      city: 'Dhahran',
      venue: 'Ithra Tower',
      venue_address: 'Ithra Tower',
      category: 'learning',
      summary: 'Existing Ithra event awaiting its official sessions.',
      starts_at: '2099-12-12T09:00:00+03:00',
      ends_at: '2099-12-12T18:00:00+03:00',
      updated_at: '2099-07-03T00:00:00+03:00',
      sessions_count: 0,
      tracks_count: 0,
      rooms_count: 0,
      live_updates_count: 0,
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Ithra Events',
      source_url: 'https://www.ithra.com/en/programme/2026/ithra-session-refresh',
      evidence_url: 'https://www.ithra.com/en/programme/2026/ithra-session-refresh',
      source_confidence: 'approved-source',
      live_schedule_ready: false,
      program_outline: {
        provider: 'Ithra',
        source_url: 'https://www.ithra.com/en/programme/2026/ithra-session-refresh'
      },
      source_file: 'data/raw/source-snapshots/ithra.json',
      tags: ['learning']
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
      starts_at: '2099-09-23T08:00:00+03:00',
      ends_at: '2099-09-24T04:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://www.swa.gov.sa/en/events/Event-639153024443263826',
      source_label: 'Saudi Water Authority Events',
      source_owner: 'Saudi Water Authority',
      evidence_url: 'https://www.swa.gov.sa/en/events/Event-639153024443263826',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-regression.html',
      discovered_at: '2099-07-03T00:00:00+03:00',
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
      title: 'Official Precise Session | July Programme',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Online',
      category: 'workshop',
      summary: 'Same event from source feed with a generic all-day window.',
      starts_at: '2099-12-04T09:00:00+03:00',
      ends_at: '2099-12-04T18:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/official-precise-session',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/official-precise-session',
      ticket_url: 'https://tickets.example.gov.sa/tickets/official-precise-session',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-precise-regression.html',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Precise session preservation regression fixture.',
      tags: ['workshop']
    },
    {
      id: 'candidate-ithra-session-refresh',
      title: 'Ithra Session Refresh',
      organizer: 'Ithra',
      city: 'Dhahran',
      venue: 'Ithra - Ithra Tower',
      category: 'learning',
      summary: 'Official Ithra event with newly available sessions.',
      starts_at: '2099-12-12T10:00:00+03:00',
      ends_at: '2099-12-12T13:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://www.ithra.com/en/programme/2026/ithra-session-refresh',
      source_label: 'Ithra Events',
      source_owner: 'King Abdulaziz Center for World Culture / Ithra',
      evidence_url: 'https://www.ithra.com/en/programme/2026/ithra-session-refresh',
      raw_snapshot_path: 'data/raw/source-snapshots/ithra.json',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      verification_method: 'official-detail-explicit-session-times',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      extracted_sessions_count: 3,
      sessions: [
        { id: 'ithra-1', title: 'Session 1', starts_at: '2099-12-12T10:00:00+03:00', ends_at: '2099-12-12T11:00:00+03:00', session_type: 'official-program-session' },
        { id: 'ithra-2', title: 'Session 2', starts_at: '2099-12-12T11:00:00+03:00', ends_at: '2099-12-12T12:00:00+03:00', session_type: 'official-program-session' },
        { id: 'ithra-3', title: 'Session 3', starts_at: '2099-12-12T12:00:00+03:00', ends_at: '2099-12-12T13:00:00+03:00', session_type: 'official-program-session' }
      ],
      reviewer_notes: 'Ithra periodic session refresh regression fixture.',
      tags: ['learning']
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
      starts_at: '2099-11-18T09:00:00+03:00',
      ends_at: '2099-11-18T12:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/official-image-preservation-workshop',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/official-image-preservation-workshop',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-image-regression.html',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Image preservation regression fixture.',
      tags: ['workshop']
    },
    {
      id: 'candidate-official-unknown-category',
      title: 'Official Emerging Civic Experience',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Emerging Civic Hall',
      category: unknownRawCategory,
      summary: 'Official event with a useful but not-yet-mapped source category.',
      starts_at: '2099-01-15T09:00:00+03:00',
      ends_at: '2099-01-15T12:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/official-emerging-civic-experience',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/official-emerging-civic-experience',
      raw_snapshot_path: 'data/raw/source-snapshots/official-unknown-category-regression.html',
      discovered_at: '2099-07-19T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Official unknown-category fallback regression fixture.',
      tags: ['civic experience']
    },
    {
      id: 'candidate-discovery-unknown-category',
      title: 'Discovery Emerging Civic Experience',
      organizer: 'Unverified Discovery Lead',
      city: 'Jeddah',
      venue: 'Discovery Civic Hall',
      category: unknownRawCategory,
      summary: 'Discovery-only lead that must remain queued for review.',
      starts_at: '2099-02-15T09:00:00+03:00',
      ends_at: '2099-02-15T12:00:00+03:00',
      source_type: 'manual-lead',
      source_url: 'https://example.com/discovery/emerging-civic-experience',
      source_label: 'Discovery Regression Feed',
      source_owner: 'Discovery Regression Feed',
      evidence_url: 'https://example.com/discovery/emerging-civic-experience',
      raw_snapshot_path: 'data/raw/source-snapshots/discovery-unknown-category-regression.html',
      discovered_at: '2099-07-19T00:00:00+03:00',
      discovery_method: 'discovery-lead',
      confidence: 'discovery',
      review_status: 'new',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Discovery source isolation regression fixture.',
      tags: ['civic experience']
    },
    {
      id: 'candidate-provider-enriched-generic-window',
      title: 'Provider Enriched Workshop',
      organizer: 'Regression Authority',
      city: 'Riyadh',
      venue: 'Online',
      category: 'workshop',
      summary: 'Generic source-card window that must not replace detail enrichment.',
      image_url: '/assets/event-images/provider-enriched-workshop.jpg',
      image_alt: 'Provider Enriched Workshop',
      image_source_url: 'https://example.gov.sa/events/provider-enriched-workshop',
      starts_at: '2099-12-08T09:00:00+03:00',
      ends_at: '2099-12-08T18:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/provider-enriched-workshop',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/provider-enriched-workshop',
      raw_snapshot_path: 'data/raw/source-snapshots/provider-enrichment-regression.html',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Provider enrichment preservation fixture.',
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
      starts_at: '2099-11-18T09:00:00+03:00',
      ends_at: '2099-11-18T12:00:00+03:00',
      source_type: 'official-site',
      source_url: 'https://example.gov.sa/events/official-image-preservation-workshop?utm_source=calendar',
      source_label: 'Regression Authority Events',
      source_owner: 'Regression Authority',
      evidence_url: 'https://example.gov.sa/events/official-image-preservation-workshop',
      raw_snapshot_path: 'data/raw/source-snapshots/source-auto-publish-image-regression.html',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'auto-publish',
      extracted_sessions_count: 0,
      reviewer_notes: 'Source/date duplicate regression fixture.',
      tags: ['workshop']
    },
    {
      id: 'candidate-official-pdf-event-one',
      title: 'Official PDF Event One',
      organizer: 'Saudi Tourism Authority',
      city: 'Jeddah',
      venue: 'Jeddah',
      category: 'festival',
      summary: 'First distinct event from a multi-event official PDF.',
      starts_at: '2099-12-20T00:00:00+03:00',
      ends_at: '2099-12-20T23:59:00+03:00',
      source_type: 'official-site',
      source_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      source_label: 'Visit Saudi Calendar PDF',
      source_owner: 'Saudi Tourism Authority',
      evidence_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      raw_snapshot_path: 'data/raw/source-snapshots/calendar.xml',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'approved-for-catalog',
      publication_gate: 'catalog-review',
      matched_catalog_event_id: 'event-collapsed-pdf-row',
      extracted_sessions_count: 0,
      reviewer_notes: 'Multi-event PDF regression fixture.',
      tags: ['festival']
    },
    {
      id: 'candidate-official-pdf-event-two',
      title: 'Official PDF Event Two',
      organizer: 'Saudi Tourism Authority',
      city: 'Al Baha',
      venue: 'Al Baha',
      category: 'festival',
      summary: 'Second distinct event from the same multi-event official PDF and date.',
      starts_at: '2099-12-20T00:00:00+03:00',
      ends_at: '2099-12-20T23:59:00+03:00',
      source_type: 'official-site',
      source_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      source_label: 'Visit Saudi Calendar PDF',
      source_owner: 'Saudi Tourism Authority',
      evidence_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      raw_snapshot_path: 'data/raw/source-snapshots/calendar.xml',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'approved-for-catalog',
      publication_gate: 'catalog-review',
      matched_catalog_event_id: 'event-collapsed-pdf-row',
      extracted_sessions_count: 0,
      reviewer_notes: 'Multi-event PDF regression fixture.',
      tags: ['festival']
    },
    {
      id: 'candidate-official-pdf-eishha-arabic',
      title: 'عيشها',
      organizer: 'Saudi Tourism Authority',
      city: 'Riyadh',
      venue: 'Riyadh',
      category: 'sports',
      summary: 'Arabic calendar row for the same rich English event.',
      starts_at: '2099-06-11T00:00:00+03:00',
      ends_at: '2099-07-19T23:59:00+03:00',
      source_type: 'official-site',
      source_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      source_label: 'Visit Saudi Calendar PDF',
      source_owner: 'Saudi Tourism Authority',
      evidence_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      ticket_url: 'https://webook.com/ar/sa/ruh/sports-event/events/eishha-world-cup-2026-fan-zone-tickets',
      registration_url: 'https://webook.com/ar/sa/ruh/sports-event/events/eishha-world-cup-2026-fan-zone-tickets',
      raw_snapshot_path: 'data/raw/source-snapshots/calendar.xml',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      extracted_sessions_count: 0,
      reviewer_notes: 'Action URL semantic identity regression fixture.',
      tags: ['sports']
    },
    {
      id: 'candidate-official-pdf-kashtah-arabic',
      title: 'كشتة',
      organizer: 'Saudi Tourism Authority',
      city: 'Aseer',
      venue: 'Aseer',
      category: 'families',
      summary: 'Arabic calendar row for Kashtah.',
      starts_at: '2099-06-27T00:00:00+03:00',
      ends_at: '2099-08-31T23:59:00+03:00',
      source_type: 'official-site',
      source_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      source_label: 'Visit Saudi Calendar PDF',
      source_owner: 'Saudi Tourism Authority',
      evidence_url: 'https://www.visitsaudi.com/content/dam/documents/calendar.pdf',
      raw_snapshot_path: 'data/raw/source-snapshots/calendar.xml',
      discovered_at: '2099-07-03T00:00:00+03:00',
      discovery_method: 'official-calendar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      extracted_sessions_count: 0,
      reviewer_notes: 'Bilingual alias regression fixture.',
      tags: ['families']
    }
  ]
}, null, 2)}\n`, 'utf8');

const run = spawnSync(process.execPath, ['scripts/auto-publish-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: candidatesPath,
    EVENTLIVE_EVENTS_CATALOG_FILE: catalogPath,
    EVENTLIVE_AUTO_PUBLISH_REPORT_JSON: reportJsonPath,
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
const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'));
const candidate = candidates.candidates[0];

if (
  catalog.events.length !== 10
  || catalog.events.some((event) => event.id === 'event-invalid-auto-published')
  || candidate.matched_catalog_event_id !== 'event-saudi-national-day'
  || !/Published:\s*4/i.test(out)
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
const ithraEvent = catalog.events.find((event) => event.id === 'event-ithra-session-refresh');
const ithraCandidate = candidates.candidates.find((row) => row.id === 'candidate-ithra-session-refresh');
const providerEvent = catalog.events.find((event) => event.id === 'event-provider-enriched-workshop');
const providerCandidate = candidates.candidates.find((row) => row.id === 'candidate-provider-enriched-generic-window');
const officialUnknownCandidate = candidates.candidates.find((row) => row.id === 'candidate-official-unknown-category');
const officialUnknownEvent = catalog.events.find((event) => event.id === officialUnknownCandidate?.matched_catalog_event_id);
const discoveryUnknownCandidate = candidates.candidates.find((row) => row.id === 'candidate-discovery-unknown-category');
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
  catalog.events.length !== 10
  || sourceDateVariant?.matched_catalog_event_id !== imageEvent.id
) {
  console.error('TEST_FAIL official source/date duplicate should link to the first published event');
  console.error(JSON.stringify({ catalog_events: catalog.events.length, sourceDateVariant }, null, 2));
  process.exit(1);
}

if (
  officialUnknownEvent?.category !== 'community-occasions'
  || officialUnknownEvent?.raw_category !== unknownRawCategory
  || officialUnknownEvent?.approval_status !== 'published'
  || officialUnknownEvent?.published_by !== 'EventLive Auto Publisher'
  || officialUnknownEvent?.source_url !== 'https://example.gov.sa/events/official-emerging-civic-experience'
  || officialUnknownCandidate?.review_status !== 'approved-for-catalog'
  || officialUnknownCandidate?.publication_gate !== 'catalog-review'
  || !report.published.some((row) => row.candidate_id === officialUnknownCandidate.id)
) {
  console.error('TEST_FAIL an official unknown category must publish in community-occasions with raw lineage');
  console.error(JSON.stringify({ officialUnknownCandidate, officialUnknownEvent, published: report.published }, null, 2));
  process.exit(1);
}

if (
  discoveryUnknownCandidate?.matched_catalog_event_id
  || discoveryUnknownCandidate?.review_status !== 'new'
  || catalog.events.some((event) => event.title === 'Discovery Emerging Civic Experience')
  || report.published.some((row) => row.candidate_id === discoveryUnknownCandidate.id)
  || !report.blocked.some((row) => (
    row.candidate_id === discoveryUnknownCandidate.id
    && row.reason === 'unknown category requires review'
  ))
) {
  console.error('TEST_FAIL an unknown category from a discovery source must remain blocked for review');
  console.error(JSON.stringify({ discoveryUnknownCandidate, published: report.published, blocked: report.blocked }, null, 2));
  process.exit(1);
}

const pdfEvents = catalog.events.filter((event) => /^Official PDF Event /.test(event.title));
const pdfCandidates = candidates.candidates.filter((row) => /^candidate-official-pdf-event-/.test(row.id));
if (
  pdfEvents.length !== 2
  || catalog.events.some((event) => event.id === 'event-collapsed-pdf-row')
  || new Set(pdfCandidates.map((row) => row.matched_catalog_event_id)).size !== 2
) {
  console.error('TEST_FAIL a multi-event PDF must not collapse distinct rows onto one source identity');
  console.error(JSON.stringify({ pdfEvents, pdfCandidates }, null, 2));
  process.exit(1);
}

const actionCandidate = candidates.candidates.find((row) => row.id === 'candidate-official-pdf-eishha-arabic');
const actionEvent = catalog.events.find((event) => event.id === 'event-eishha-rich-detail');
if (
  actionCandidate?.matched_catalog_event_id !== 'event-eishha-rich-detail'
  || actionEvent?.starts_at !== '2099-06-11T18:00:00+03:00'
  || !actionEvent?.ticket_url?.includes('eishha-world-cup-2026-fan-zone-tickets')
  || catalog.events.some((event) => event.id === 'event-عيشها')
) {
  console.error('TEST_FAIL action URL semantics must join a bilingual calendar row to its richer detail record');
  console.error(JSON.stringify({ actionCandidate, actionEvent }, null, 2));
  process.exit(1);
}

const aliasCandidate = candidates.candidates.find((row) => row.id === 'candidate-official-pdf-kashtah-arabic');
if (
  aliasCandidate?.matched_catalog_event_id !== 'event-kashtah-rich-detail'
  || catalog.events.some((event) => event.id === 'event-كشتة')
) {
  console.error('TEST_FAIL a high-confidence bilingual title alias must retain the richer official detail row');
  console.error(JSON.stringify({ aliasCandidate }, null, 2));
  process.exit(1);
}

if (
  providerCandidate?.matched_catalog_event_id !== 'event-provider-enriched-workshop'
  || providerEvent?.starts_at !== '2099-12-08T14:30:00+03:00'
  || providerEvent?.ends_at !== '2099-12-08T16:00:00+03:00'
  || providerEvent?.image_url !== '/assets/event-images/provider-enriched-workshop.jpg'
) {
  console.error('TEST_FAIL linked source row must preserve official provider timing while filling missing media');
  console.error(JSON.stringify({ providerCandidate, providerEvent }, null, 2));
  process.exit(1);
}

if (
  preciseCandidate?.matched_catalog_event_id !== 'event-official-precise-session'
  || preciseEvent?.starts_at !== '2099-12-04T10:00:00+03:00'
  || preciseEvent?.ends_at !== '2099-12-04T11:00:00+03:00'
  || preciseEvent?.title !== 'Official Precise Session | July Programme'
) {
  console.error('TEST_FAIL an exact source-page refresh must update the title without overwriting precise live schedule times');
  console.error(JSON.stringify({ preciseCandidate, preciseEvent }, null, 2));
  process.exit(1);
}

if (
  ithraCandidate?.matched_catalog_event_id !== 'event-ithra-session-refresh'
  || ithraEvent?.sessions?.length !== 3
  || ithraEvent?.sessions_count !== 3
  || ithraEvent?.live_schedule_ready !== true
  || ithraEvent?.venue !== 'Ithra - Ithra Tower'
  || ithraEvent?.summary !== 'Official Ithra event with newly available sessions.'
) {
  console.error('TEST_FAIL an official periodic source refresh must activate sessions and refresh its verified venue');
  console.error(JSON.stringify({ ithraCandidate, ithraEvent }, null, 2));
  process.exit(1);
}

console.log('TEST_OK source auto-publish duplicate regression checks passed');
