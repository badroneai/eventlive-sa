import assert from 'node:assert/strict';
import { applyEvidenceEntries, entryMatchesPayload } from './verify-discovery-official-evidence.mjs';

const entry = {
  id: 'official-test',
  status: 'active',
  title: 'Saudi AI Summit',
  discovery_hosts: ['eventbrite.com'],
  official_url: 'https://summit.example/sa/',
  source_label: 'Saudi AI Summit Official',
  source_owner: 'Official Organizer',
  expected_start_date: '2026-10-15',
  expected_city: 'Riyadh',
  required_token_groups: [['Saudi AI Summit'], ['October 15, 2026'], ['Riyadh']]
};
const payload = '<main>Saudi AI Summit | October 15, 2026 | Riyadh</main>';
assert.equal(entryMatchesPayload(entry, payload), true);
assert.equal(entryMatchesPayload(entry, 'Saudi AI Summit | Riyadh'), false);

const candidate = {
  id: 'candidate-test',
  title: 'Saudi AI Summit',
  city: 'Riyadh',
  starts_at: '2026-10-15T09:00:00+03:00',
  ends_at: '2026-10-15T17:00:00+03:00',
  source_url: 'https://www.eventbrite.com/e/saudi-ai-summit-123',
  source_label: 'Eventbrite Saudi Arabia',
  source_owner: 'Eventbrite',
  publication_gate: 'source-evidence',
  review_status: 'new',
  confidence: 'unverified',
  tags: []
};
const outcome = applyEvidenceEntries([candidate, { ...candidate, id: 'candidate-test-2' }], [entry], new Map([[entry.official_url, payload]]), '2026-07-10T00:00:00.000Z');
assert.equal(outcome.results[0].status, 'verified');
assert.equal(outcome.results[0].matched, 2);
assert.equal(outcome.deduplicated, 1);
assert.equal(outcome.candidates.length, 1);
assert.equal(outcome.candidates[0].source_url, entry.official_url);
assert.equal(outcome.candidates[0].discovery_source_url, candidate.source_url);
assert.equal(outcome.candidates[0].confidence, 'verified-secondary');
assert.equal(outcome.candidates[0].publication_gate, 'secondary-verified');
assert.equal(outcome.candidates[0].verification_method, 'directory-official-link-page-confirmation');

console.log('SOURCE_OFFICIAL_EVIDENCE_OK');
