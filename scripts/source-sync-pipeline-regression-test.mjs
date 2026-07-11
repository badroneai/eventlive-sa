import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts || {};
const sourceSync = scripts['sources:sync'] || '';
const steps = sourceSync.split('&&').map((step) => step.trim());

function stepIndex(name) {
  return steps.findIndex((step) => step === `npm run ${name}`);
}

function lastStepIndex(name) {
  return steps.findLastIndex((step) => step === `npm run ${name}`);
}

for (const name of [
  'sources:growth:baseline',
  'sources:collect',
  'sources:diagnostics:cadenced',
  'sources:ops',
  'sources:official-evidence',
  'sources:verify',
  'sources:auto-publish',
  'images:sync-catalog',
  'sources:details',
  'validate',
  'sources:state',
  'sources:ops',
  'sources:resolve',
  'build',
  'sources:growth',
  'images:cache',
  'sources:build:if-images-changed',
  'sources:health-gate'
]) {
  assert.notEqual(stepIndex(name), -1, `sources:sync must include ${name}`);
}

assert.ok(stepIndex('sources:collect') < stepIndex('sources:auto-publish'), 'source collection must happen before auto-publish');
assert.equal(stepIndex('sources:growth:baseline'), 0, 'growth baseline must be captured before any network collection mutates the run reports');
assert.ok(stepIndex('sources:collect') < stepIndex('sources:official-evidence'), 'official evidence verification must run after fresh discovery collection');
assert.ok(stepIndex('sources:official-evidence') < stepIndex('sources:verify'), 'official evidence verification must run before secondary verification and auto-publish');
assert.equal(stepIndex('sources:probe'), -1, 'the six-hour critical path must not run the full deep probe directly');
assert.equal(stepIndex('sources:radars'), -1, 'the six-hour critical path must not run heavy radars directly');
assert.equal(stepIndex('sources:yield'), -1, 'the six-hour critical path must not duplicate full source extraction for diagnostics');
assert.ok(stepIndex('sources:diagnostics:cadenced') < stepIndex('sources:plan'), 'cadenced diagnostics must refresh evidence before planning when due');
assert.ok(stepIndex('sources:diagnostics:cadenced') < stepIndex('sources:collect'), 'cadenced diagnostics must be decided before collection');
assert.ok(stepIndex('sources:collect') < stepIndex('sources:ops'), 'source ops must inspect collected candidates before secondary verification');
assert.ok(stepIndex('sources:ops') < stepIndex('sources:verify'), 'secondary verification must use the latest source ops matching report');
assert.ok(stepIndex('sources:verify') < stepIndex('sources:auto-publish'), 'secondary verification must run before auto-publish');
assert.ok(stepIndex('sources:auto-publish') < stepIndex('images:sync-catalog'), 'catalog image sync must run after auto-publish');
assert.ok(stepIndex('images:sync-catalog') < stepIndex('validate'), 'catalog image sync must run before validation');
assert.ok(stepIndex('images:sync-catalog') < stepIndex('sources:details'), 'source image sync must happen before detail enrichment');
assert.ok(stepIndex('sources:details') < stepIndex('validate'), 'detail enrichment and live activation must happen before validation');
assert.ok(stepIndex('validate') < stepIndex('sources:state'), 'source run-state must be refreshed after validation');
assert.ok(stepIndex('sources:state') < lastStepIndex('sources:ops'), 'source ops must inspect current run-state, not the previous run');
assert.ok(stepIndex('sources:ops') < stepIndex('sources:resolve'), 'initial duplicate/ops review must run before official resolver');
assert.ok(stepIndex('validate') < stepIndex('images:cache'), 'validated data must be built before image caching');
assert.ok(stepIndex('images:cache') > stepIndex('build'), 'image cache must run after a build creates dist/events.json');
assert.ok(stepIndex('sources:growth') > stepIndex('build'), 'growth ledger must inspect the built public catalog');
assert.ok(stepIndex('sources:growth') < stepIndex('images:cache'), 'growth ledger must persist the pre-cache catalog result before the final build');
assert.ok(stepIndex('images:cache') < stepIndex('sources:build:if-images-changed'), 'image changes must be evaluated after image caching');
assert.ok(stepIndex('sources:build:if-images-changed') < stepIndex('sources:health-gate'), 'source health must run after the conditional final build decision');
assert.ok(stepIndex('sources:growth') < stepIndex('sources:health-gate'), 'source health gate must inspect the current growth result');
assert.equal(steps.filter((step) => step === 'npm run build').length, 1, 'the critical path must not rebuild unconditionally after image caching');
assert.ok(lastStepIndex('sources:state') < lastStepIndex('sources:ops'), 'final source ops report must be regenerated after final source run-state');

const details = (scripts['sources:details'] || '').split('&&').map((step) => step.trim());
function detailIndex(name) {
  return details.findIndex((step) => step === `npm run ${name}`);
}

for (const name of [
  'sources:tuwaiq:details',
  'sources:future-skills:details',
  'sources:sfda:details',
  'sources:misk:details',
  'sources:dhahran:details',
  'sources:visit-saudi:details',
  'sources:swa:details',
  'sources:rfecc:details',
  'sources:mdlbeast:details',
  'sources:leap:agenda',
  'sources:money2020:agenda',
  'sources:backlog:details',
  'sources:single-session:activate'
]) {
  assert.notEqual(detailIndex(name), -1, `sources:details must include ${name}`);
}

assert.ok(detailIndex('sources:mdlbeast:details') < detailIndex('sources:backlog:details'), 'source-specific enrichers must run before generic backlog enrichment');
assert.ok(detailIndex('sources:leap:agenda') < detailIndex('sources:backlog:details'), 'official multi-session agendas must be enriched before generic backlog enrichment');
assert.ok(detailIndex('sources:money2020:agenda') < detailIndex('sources:backlog:details'), 'Money20/20 historical and current agenda monitoring must run before generic backlog enrichment');
assert.ok(detailIndex('sources:backlog:details') < detailIndex('sources:single-session:activate'), 'single-session activation must run after backlog enrichment');

console.log('source-sync-pipeline-regression-test: ok');
