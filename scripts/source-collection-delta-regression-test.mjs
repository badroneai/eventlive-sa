import assert from 'node:assert/strict';
import { isPastCandidate, mergeEndedEvents, sourceCandidateDelta } from './collect-source-candidates.mjs';

const source = { id: 'official-source', name: 'Official Source' };

const existing = [
  {
    id: 'existing-1',
    source_label: 'Official Source',
    source_url: 'https://example.gov.sa/event/a',
    title: 'Future Event A',
    starts_at: '2026-12-10T09:00:00+03:00',
    ends_at: '2026-12-10T12:00:00+03:00'
  },
  {
    id: 'existing-2',
    source_label: 'Official Source',
    source_url: 'https://example.gov.sa/event/b',
    title: 'Future Event B',
    starts_at: '2026-12-12T09:00:00+03:00',
    ends_at: '2026-12-12T12:00:00+03:00'
  },
  {
    id: 'linked-1',
    source_label: 'Official Source',
    source_url: 'https://example.gov.sa/event/linked',
    title: 'Linked Event',
    starts_at: '2026-12-14T09:00:00+03:00',
    ends_at: '2026-12-14T12:00:00+03:00',
    review_status: 'approved-for-catalog',
    matched_catalog_event_id: 'event-linked'
  },
  {
    id: 'other-source',
    source_label: 'Other Source',
    source_url: 'https://other.example/event',
    title: 'Other Event',
    starts_at: '2026-12-20T09:00:00+03:00',
    ends_at: '2026-12-20T12:00:00+03:00'
  },
  {
    id: 'invalid-linked',
    source_label: 'Official Source',
    source_url: 'https://example.gov.sa/event/invalid-linked',
    title: 'Invalid Linked Event',
    starts_at: '2026-12-20T21:00:00+00:00',
    ends_at: '2026-12-21T21:00:00+00:00',
    review_status: 'approved-for-catalog',
    matched_catalog_event_id: 'event-invalid-linked'
  }
];

const discovered = [
  {
    source_label: 'Official Source',
    source_url: 'https://example.gov.sa/event/a',
    title: 'Future Event A',
    starts_at: '2026-12-10T10:30:00+03:00',
    ends_at: '2026-12-10T12:30:00+03:00'
  },
  {
    source_label: 'Official Source',
    source_url: 'https://example.gov.sa/event/c',
    title: 'Future Event C',
    starts_at: '2026-12-18T09:00:00+03:00',
    ends_at: '2026-12-18T12:00:00+03:00'
  },
  {
    source_label: 'Official Source',
    source_url: 'https://example.gov.sa/event/invalid',
    title: 'Invalid Future Event',
    starts_at: '2026-12-22T21:00:00+00:00',
    ends_at: '2026-12-23T21:00:00+00:00'
  }
];

const delta = sourceCandidateDelta(source, discovered, existing);

assert.equal(delta.source_existing_active, 3);
assert.equal(delta.new_candidates, 1);
assert.equal(delta.refreshed_candidates, 1);
assert.equal(delta.missing_from_latest_run, 1);
assert.equal(delta.approved_linked_preserved, 1);

assert.equal(
  isPastCandidate({
    starts_at: '2026-07-01T09:00:00+03:00',
    ends_at: '2026-07-30T18:00:00+03:00'
  }, new Date('2026-07-05T12:00:00+03:00')),
  false,
  'ongoing multi-day event must remain collectible until its end time'
);

assert.equal(
  isPastCandidate({
    starts_at: '2026-07-01T09:00:00+03:00',
    ends_at: '2026-07-02T18:00:00+03:00'
  }, new Date('2026-07-05T12:00:00+03:00')),
  true,
  'ended event should be dropped from active collection'
);

const mergedEnded = mergeEndedEvents([{
  id: 'ended-old-time',
  source_label: 'Jazan Chamber Events',
  source_url: 'https://events.jazancci.org.sa/ar/events/sample',
  title: 'Jazan Sample Workshop',
  starts_at: '2026-06-16T15:00:00+03:00',
  ends_at: '2026-06-16T17:00:00+03:00',
  first_collected_at: '2026-07-05T00:00:00.000Z',
  collected_at: '2026-07-05T00:00:00.000Z'
}], [{
  id: 'ended-corrected-time',
  source_label: 'Jazan Chamber Events',
  source_url: 'https://events.jazancci.org.sa/ar/events/sample',
  title: 'Jazan Sample Workshop',
  starts_at: '2026-06-16T18:00:00+03:00',
  ends_at: '2026-06-16T20:00:00+03:00',
  collected_at: '2026-07-05T01:00:00.000Z'
}]);

assert.equal(mergedEnded.length, 1);
assert.equal(mergedEnded[0].id, 'ended-corrected-time');
assert.equal(mergedEnded[0].starts_at, '2026-06-16T18:00:00+03:00');
assert.equal(mergedEnded[0].first_collected_at, '2026-07-05T00:00:00.000Z');

const localeDuplicateEnded = mergeEndedEvents([{
  id: 'ended-space-en',
  source_label: 'Saudi Space Agency Events',
  source_url: 'https://ssa.gov.sa/en/events/space-debris/',
  title: 'Space Debris Conference',
  city: 'Riyadh',
  starts_at: '2026-01-26T10:00:00+03:00',
  ends_at: '2026-01-27T18:00:00+03:00'
}, {
  id: 'ended-space-ar',
  source_label: 'Saudi Space Agency Events',
  source_url: 'https://ssa.gov.sa/ar/events/space-debris/',
  title: 'Space Debris Conference',
  city: 'Riyadh',
  starts_at: '2026-01-26T10:00:00+03:00',
  ends_at: '2026-01-27T18:00:00+03:00'
}], []);
assert.equal(localeDuplicateEnded.length, 1, 'existing Arabic/English source variants of one ended event must reconcile without rediscovery');

console.log('TEST_OK source collection delta regression checks passed');
