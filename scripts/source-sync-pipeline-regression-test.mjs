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
  'sources:collect',
  'sources:radars',
  'sources:ops',
  'sources:verify',
  'sources:auto-publish',
  'images:sync-catalog',
  'sources:details',
  'validate',
  'sources:state',
  'sources:ops',
  'sources:resolve',
  'build',
  'images:cache',
  'sources:health-gate'
]) {
  assert.notEqual(stepIndex(name), -1, `sources:sync must include ${name}`);
}

assert.ok(stepIndex('sources:collect') < stepIndex('sources:auto-publish'), 'source collection must happen before auto-publish');
assert.ok(stepIndex('sources:probe') < stepIndex('sources:radars'), 'source radars must run after the general source probe');
assert.ok(stepIndex('sources:radars') < stepIndex('sources:plan'), 'source plan must include the latest radar evidence');
assert.ok(stepIndex('sources:radars') < stepIndex('sources:collect'), 'source radars must refresh evidence before collection/ops reporting');
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
assert.ok(stepIndex('images:cache') < steps.findLastIndex((step) => step === 'npm run build'), 'a final build must run after image caching');
assert.ok(steps.findLastIndex((step) => step === 'npm run build') < stepIndex('sources:health-gate'), 'source health gate must inspect the final built site');
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
  'sources:backlog:details',
  'sources:single-session:activate'
]) {
  assert.notEqual(detailIndex(name), -1, `sources:details must include ${name}`);
}

assert.ok(detailIndex('sources:mdlbeast:details') < detailIndex('sources:backlog:details'), 'source-specific enrichers must run before generic backlog enrichment');
assert.ok(detailIndex('sources:backlog:details') < detailIndex('sources:single-session:activate'), 'single-session activation must run after backlog enrichment');

console.log('source-sync-pipeline-regression-test: ok');
