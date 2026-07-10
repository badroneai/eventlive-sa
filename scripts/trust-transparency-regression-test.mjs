import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const events = JSON.parse(fs.readFileSync(path.join(distDir, 'events.json'), 'utf8')).events || [];
const allowedTiers = new Set(['official', 'official-venue', 'official-marketplace', 'organizer-confirmed', 'partner', 'approved-source', 'corroborated']);

assert.ok(events.length > 0, 'public catalog must exist');
for (const event of events) {
  assert.ok(allowedTiers.has(event.trust_tier), `${event.id} must expose a supported trust tier`);
  assert.ok(String(event.trust_label || '').trim(), `${event.id} must expose an Arabic trust label`);
  assert.ok(Number.isFinite(Date.parse(event.verified_at)), `${event.id} must expose a valid verification timestamp`);
  assert.ok(String(event.verification_method || '').trim(), `${event.id} must expose a verification method`);
  assert.ok(event.freshness_hours === null || Number.isInteger(event.freshness_hours), `${event.id} freshness must be an integer or null`);
}

const sample = events.find((event) => event.status !== 'ended') || events[0];
const detailJson = JSON.parse(fs.readFileSync(path.join(distDir, String(sample.detail_url).replace(/^\.\//, '').replace(/\.html$/, '.json')), 'utf8'));
assert.equal(detailJson.trust_tier, sample.trust_tier, 'event detail JSON must preserve trust tier');
assert.equal(detailJson.verified_at, sample.verified_at, 'event detail JSON must preserve verification time');

console.log(`TRUST_TRANSPARENCY_OK events=${events.length} tiers=${new Set(events.map((event) => event.trust_tier)).size}`);
