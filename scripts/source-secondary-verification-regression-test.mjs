import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workdir = 'workspaces/_source-secondary-verification-regression';
const candidatesPath = path.join(workdir, 'source_candidates.json');
const opsPath = path.join(workdir, 'source-ops-report.json');
const reportPath = path.join(workdir, 'source-secondary-verification-report.json');

fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });

fs.writeFileSync(candidatesPath, `${JSON.stringify({
  generated_for: 'EventLive source secondary verification regression',
  candidates: [
    {
      id: 'candidate-official-evidence-program',
      title: 'Official Culture Residency',
      city: 'Saudi Arabia',
      venue: 'Saudi Arabia',
      category: 'program',
      summary: 'Official long-running residency program.',
      starts_at: '2026-08-01T09:00:00+03:00',
      ends_at: '2026-12-15T18:00:00+03:00',
      source_url: 'https://www.moc.gov.sa/en/Modules/Pages/Initiative/Residency/EventDetail',
      source_label: 'Ministry of Culture Commission Calendars',
      source_owner: 'Ministry of Culture commissions',
      evidence_url: 'https://www.moc.gov.sa/en/Modules/Pages/Initiative/Residency/EventDetail',
      raw_snapshot_path: 'data/raw/source-snapshots/official-culture-residency.html',
      confidence: 'official',
      publication_gate: 'source-evidence',
      review_status: 'evidence-captured',
      tags: ['culture']
    },
    {
      id: 'candidate-eye-of-riyadh-official-match',
      title: 'Saudi Wood Expo 2026',
      city: 'Riyadh',
      venue: 'Riyadh Front',
      category: 'exhibition',
      summary: 'Directory lead with a strong official catalog match.',
      starts_at: '2026-08-30T09:00:00+03:00',
      ends_at: '2026-09-01T18:00:00+03:00',
      source_url: 'https://www.eyeofriyadh.com/events/details/saudi-wood-expo-2026',
      source_label: 'Eye of Riyadh Events',
      source_owner: 'Eye of Riyadh',
      evidence_url: 'https://www.eyeofriyadh.com/events/details/saudi-wood-expo-2026',
      raw_snapshot_path: 'data/raw/source-snapshots/eye-saudi-wood.html',
      confidence: 'public-listing',
      publication_gate: 'duplicate-review',
      review_status: 'evidence-captured',
      discovery_quality: 'strong-lead',
      discovery_score: 70
    },
    {
      id: 'candidate-eye-of-riyadh-weak-match',
      title: 'Global Proptech Summit 2026',
      city: 'Riyadh',
      venue: 'Riyadh',
      category: 'conference',
      summary: 'Directory lead with an insufficient official match.',
      starts_at: '2026-10-25T09:00:00+03:00',
      ends_at: '2026-10-26T18:00:00+03:00',
      source_url: 'https://www.eyeofriyadh.com/events/details/global-proptech-summit-2026',
      source_label: 'Eye of Riyadh Events',
      source_owner: 'Eye of Riyadh',
      evidence_url: 'https://www.eyeofriyadh.com/events/details/global-proptech-summit-2026',
      raw_snapshot_path: 'data/raw/source-snapshots/eye-global-proptech.html',
      confidence: 'public-listing',
      publication_gate: 'duplicate-review',
      review_status: 'evidence-captured',
      discovery_quality: 'strong-lead',
      discovery_score: 70
    },
    {
      id: 'candidate-eventbrite-unverified',
      title: 'Unverified Community Meetup',
      city: 'Riyadh',
      venue: 'Riyadh',
      category: 'meetup',
      summary: 'Community listing that must not auto-promote.',
      starts_at: '2026-09-02T09:00:00+03:00',
      ends_at: '2026-09-02T12:00:00+03:00',
      source_url: 'https://www.eventbrite.com/e/unverified-community-meetup',
      source_label: 'Eventbrite Saudi Arabia',
      source_owner: 'Eventbrite',
      evidence_url: 'https://www.eventbrite.com/e/unverified-community-meetup',
      raw_snapshot_path: 'data/raw/source-snapshots/eventbrite-unverified.html',
      confidence: 'unverified',
      publication_gate: 'source-evidence',
      review_status: 'evidence-captured'
    }
  ]
}, null, 2)}\n`, 'utf8');

fs.writeFileSync(opsPath, `${JSON.stringify({
  generated_at: '2026-07-08T00:00:00.000Z',
  queue: {
    discovery_focus: [
      {
        id: 'candidate-eye-of-riyadh-official-match',
        title: 'Saudi Wood Expo 2026',
        official_match: {
          id: 'event-saudi-wood-expo',
          title: 'Saudi Wood Expo',
          source_label: 'Riyadh City Events',
          evidence_kind: 'catalog',
          score: 115
        }
      },
      {
        id: 'candidate-eye-of-riyadh-weak-match',
        title: 'Global Proptech Summit 2026',
        official_match: {
          id: 'event-global-ai-summit',
          title: 'Global AI Summit',
          source_label: 'SDAIA Calendar and Events',
          evidence_kind: 'catalog',
          score: 82
        }
      }
    ]
  }
}, null, 2)}\n`, 'utf8');

const run = spawnSync(process.execPath, ['scripts/secondary-verify-source-candidates.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_CANDIDATES_FILE: candidatesPath,
    EVENTLIVE_SOURCE_OPS_REPORT_JSON: opsPath,
    EVENTLIVE_SECONDARY_VERIFY_REPORT_JSON: reportPath,
    EVENTLIVE_SECONDARY_VERIFY_REPORT_MD: path.join(workdir, 'source-secondary-verification-report.md')
  }
});

assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8')).candidates;
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const official = candidates.find((row) => row.id === 'candidate-official-evidence-program');
const matched = candidates.find((row) => row.id === 'candidate-eye-of-riyadh-official-match');
const weak = candidates.find((row) => row.id === 'candidate-eye-of-riyadh-weak-match');
const unverified = candidates.find((row) => row.id === 'candidate-eventbrite-unverified');

assert.equal(report.schema, 'eventlive.source-secondary-verification.v1');
assert.equal(report.totals.promoted, 2);
assert.equal(report.totals.official_programs_promoted, 1);
assert.equal(report.totals.official_catalog_matches_promoted, 1);
assert.equal(official.publication_gate, 'secondary-verified');
assert.equal(official.secondary_verification_kind, 'official-program-evidence');
assert.equal(matched.publication_gate, 'secondary-verified');
assert.equal(matched.confidence, 'partner');
assert.equal(matched.matched_catalog_event_id, 'event-saudi-wood-expo');
assert.equal(weak.publication_gate, 'duplicate-review');
assert.equal(unverified.publication_gate, 'source-evidence');

console.log('source-secondary-verification-regression-test: ok');
