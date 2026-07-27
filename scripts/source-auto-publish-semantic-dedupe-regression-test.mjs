import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workdir = 'workspaces/_source-auto-publish-semantic-dedupe-regression';
const candidatesPath = path.join(workdir, 'source_candidates.json');
const catalogPath = path.join(workdir, 'events_catalog.json');
const reportPath = path.join(workdir, 'source-auto-publish-report.json');

fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });
fs.writeFileSync(candidatesPath, `${JSON.stringify({ candidates: [] }, null, 2)}\n`, 'utf8');
fs.writeFileSync(catalogPath, `${JSON.stringify({
  events: [
    {
      id: 'event-business-sector-annual-reception',
      slug: 'business-sector-annual-reception',
      title: 'Business Sector Annual Reception.',
      city: 'Dhahran',
      category: 'community-occasions',
      starts_at: '2099-12-01T09:00:00+03:00',
      ends_at: '2099-12-01T18:00:00+03:00',
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Dhahran Expo Calendar',
      source_url: 'https://dhahranexpo.com.sa',
      source_confidence: 'approved-source',
      summary: 'Official event summary.'
    },
    {
      id: 'event-business-sector-annual-reception-2',
      slug: 'business-sector-annual-reception',
      title: 'Business Sector Annual Reception',
      city: 'Dhahran',
      category: 'community-occasions',
      starts_at: '2099-12-01T09:00:00+03:00',
      ends_at: '2099-12-01T18:00:00+03:00',
      approval_status: 'published',
      published_by: 'EventLive Auto Publisher',
      source_label: 'Dhahran Expo Calendar',
      source_url: 'https://dhahranexpo.com.sa',
      source_confidence: 'approved-source',
      price: 0,
      price_currency: 'SAR',
      registration_url: 'https://dhahranexpo.com.sa/register',
      program_outline: {
        official_description: 'Official enriched programme.',
        features: ['Official venue'],
        goals: ['Attend the programme']
      }
    }
  ]
}, null, 2)}\n`, 'utf8');

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

assert.equal(run.status, 0, `${run.stdout || ''}\n${run.stderr || ''}`);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert.equal(catalog.events.length, 1, 'punctuation-only title variants must collapse to one catalog event');
assert.equal(catalog.events[0].id, 'event-business-sector-annual-reception', 'canonical event id must survive');
assert.equal(catalog.events[0].registration_url, 'https://dhahranexpo.com.sa/register', 'richer duplicate fields must be preserved');
assert.equal(catalog.events[0].price, 0, 'explicit free price must survive dedupe');
assert.equal(catalog.events[0].price_currency, 'SAR', 'free offer currency must survive dedupe');
assert.equal(catalog.events[0].program_outline?.official_description, 'Official enriched programme.', 'enriched programme must survive dedupe');
assert.equal(report.duplicate_catalog_rows_removed, 1, 'semantic duplicate removal must be reported');
assert.equal(report.duplicate_catalog_rows[0]?.reason, 'title-city-date-semantic-match');

console.log('SOURCE_AUTO_PUBLISH_SEMANTIC_DEDUPE_OK removed=1');
