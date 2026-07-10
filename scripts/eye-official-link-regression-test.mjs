import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  canonicalOfficialUrl,
  extractEyeOfficialWebsite,
  extractEyeOrganizer,
  extractOfficialPageImage,
  selectOfficialEventImage,
  verifyOfficialEventPage
} from './eye-official-link-utils.mjs';

const directoryHtml = `
  <h1>HVAC R Saudi Arabia</h1>
  <div>Website: <span><a href="https://official.example/events/hvac?utm_source=directory">Click Here</a></span></div>
  <div>Organizer</div>
  <img title="dmg events" alt="dmg events" />
`;
const candidate = {
  title: 'HVAC R Saudi Arabia',
  starts_at: '2026-08-30T09:00:00+03:00',
  source_url: 'https://directory.example/events/hvac'
};

assert.equal(extractEyeOfficialWebsite(directoryHtml), 'https://official.example/events/hvac?utm_source=directory');
assert.equal(extractEyeOrganizer(directoryHtml), 'dmg events');
assert.equal(extractOfficialPageImage('<meta property="og:image" content="/hero.webp">', 'https://official.example/events/hvac'), 'https://official.example/hero.webp');
assert.equal(selectOfficialEventImage('<meta property="og:image" content="/event-logo.png">', 'https://official.example/events/hvac'), '', 'official logos must not replace event card imagery');
assert.equal(canonicalOfficialUrl('https://official.example/events/hvac?utm_source=directory&id=7'), 'https://official.example/events/hvac?id=7');
assert.equal(verifyOfficialEventPage(candidate, 'https://official.example/events/hvac', '<title>HVACR Saudi Arabia</title><p>30 August 2026</p>').confirmed, true);
assert.equal(verifyOfficialEventPage(candidate, candidate.source_url, '<p>HVAC R Saudi Arabia 30 August 2026</p>').reason, 'official-link-is-not-independent');
assert.equal(verifyOfficialEventPage(candidate, 'https://official.example/events/hvac', '<p>HVAC R Saudi Arabia 2026</p>').reason, 'month-not-confirmed');

const candidateSchema = JSON.parse(fs.readFileSync('data/source-candidates.schema.json', 'utf8'));
const catalogSchema = JSON.parse(fs.readFileSync('data/events-catalog.schema.json', 'utf8'));
assert.ok(candidateSchema.properties.candidates.items.properties.confidence.enum.includes('verified-secondary'), 'candidate contract must retain the secondary verification tier');
assert.ok(candidateSchema.properties.candidates.items.properties.discovery_source_url, 'candidate contract must preserve the discovery source URL');
assert.ok(catalogSchema.properties.events.items.properties.source_confidence.enum.includes('corroborated-source'), 'catalog contract must retain corroborated source confidence');

console.log('EYE_OFFICIAL_LINK_OK independent=1 missing_month_rejected=1');
