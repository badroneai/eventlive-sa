import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'data', 'source_registry.json');
const planPath = path.join(root, 'reports', 'source-ingestion-plan.json');
const regionsPath = path.join(root, 'dist', 'regions.json');
const sourceHealthPath = path.join(root, 'dist', 'source-health.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const sources = new Map((registry.sources || []).map((source) => [source.id, source]));

const requiredSeeds = [
  { id: 'baha-amanah-events', city: 'Al Baha', gate: 'extraction' },
  { id: 'baha-chamber-events', city: 'Al Baha', gate: 'source-evidence' },
  { id: 'jouf-chamber-events', city: 'Sakaka', gate: 'extraction' },
  { id: 'northern-borders-chamber-events', city: 'Arar', gate: 'extraction' },
  { id: 'tabuk-chamber-events', city: 'Tabuk', gate: 'extraction' },
  { id: 'jazan-chamber-events', city: 'Jazan', gate: 'duplicate-review', rings: ['active-collector', 'venue-dedupe'] },
  { id: 'hail-chamber-events', city: 'Hail', gate: 'source-evidence' },
  { id: 'najran-chamber-events', city: 'Najran', gate: 'source-evidence' }
];

for (const seed of requiredSeeds) {
  const source = sources.get(seed.id);
  assert.ok(source, `${seed.id} must be registered`);
  assert.equal(source.trust_level, 'official', `${seed.id} must be official`);
  assert.ok(['venue-calendar', 'government-calendar'].includes(source.source_type), `${seed.id} must be a regional official source type`);
  assert.equal(source.candidate_gate, seed.gate, `${seed.id} must keep the expected safety gate`);
  assert.ok(source.cities.includes(seed.city), `${seed.id} must target ${seed.city}`);
  assert.ok(source.evidence_required.length >= 40, `${seed.id} must document evidence requirements`);
  assert.notEqual(source.intake_policy, 'candidate-only', `${seed.id} must not be discovery-only`);
}

if (fs.existsSync(planPath)) {
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const planned = new Map((plan.sources || []).map((source) => [source.id, source]));
  for (const seed of requiredSeeds) {
    const source = planned.get(seed.id);
    assert.ok(source, `${seed.id} must appear in the ingestion plan after sources:plan`);
    const allowedRings = seed.rings || ['extractor-backlog', 'evidence-monitor'];
    assert.ok(allowedRings.includes(source.ring), `${seed.id} must stay in an expected acquisition ring`);
  }
}

if (fs.existsSync(regionsPath)) {
  const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
  const seededRegions = regions.regions.filter((region) => region.registered_source_count > 0);
  assert.ok(seededRegions.length >= 10, 'region coverage must show registered source seeds across most regions');
  for (const key of ['al-baha-region', 'al-jawf-region', 'northern-borders-region', 'tabuk-region', 'jazan-region', 'hail-region', 'najran-region']) {
    const region = regions.regions.find((item) => item.key === key);
    assert.ok(region, `${key} must exist`);
    assert.ok(region.registered_source_count >= 1, `${key} must have at least one registered source seed`);
  }
}

if (fs.existsSync(sourceHealthPath)) {
  const health = JSON.parse(fs.readFileSync(sourceHealthPath, 'utf8'));
  const jazan = (health.sources || []).find((source) => source.id === 'jazan-chamber-events');
  if (jazan && Number(jazan.last_ended_extracted || 0) > 0) {
    assert.equal(jazan.status, 'productive', 'ended-only official collectors must count as productive source health');
  }
}

console.log('regional-source-seeds-regression-test: ok');
