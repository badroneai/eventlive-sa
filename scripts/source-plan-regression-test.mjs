import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

execFileSync(process.execPath, ['scripts/source-ingestion-plan.mjs'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});

const plan = JSON.parse(fs.readFileSync('reports/source-ingestion-plan.json', 'utf8'));
const byId = new Map((plan.sources || []).map((source) => [source.id, source]));

for (const id of [
  'visit-saudi-calendar',
  'visit-saudi-seasons',
  'ithra-events',
  'sdaia-academy-programs',
  'saudi-pro-league-fixtures',
  'asharqia-chamber-events',
  'jazan-chamber-events',
  'umm-al-qura-events',
  'madinah-chamber-events',
  'madinah-architecture-festival',
  'hayy-jameel-events',
  'scega-exhibitions-conferences',
  'invest-saudi-events',
  'saudi-space-agency-events',
  'sfda-events'
]) {
  assert.equal(byId.get(id)?.ring, 'active-collector', `${id} should be in the active collector ring`);
  assert.equal(byId.get(id)?.has_active_collector, true, `${id} should be marked as collector-backed`);
}

for (const id of ['eventbrite-saudi', 'eye-of-riyadh-events']) {
  assert.equal(byId.get(id)?.ring, 'discovery-only', `${id} should stay in discovery-only because it is not safe for direct publication`);
  assert.equal(byId.get(id)?.has_active_collector, false, `${id} should not count as an active collector`);
}

assert.ok(Number(plan.totals?.active_collectors || 0) >= 22, 'active collector count should include official and venue-backed extractors');

console.log('source-plan-regression-test: ok');
