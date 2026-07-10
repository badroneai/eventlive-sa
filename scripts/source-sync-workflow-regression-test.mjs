import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowPath = path.join(root, '.github', 'workflows', 'source-sync.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function indexOfLine(pattern) {
  const index = workflow.split('\n').findIndex((line) => pattern.test(line));
  assert.notEqual(index, -1, `source-sync workflow must include ${pattern}`);
  return index;
}

assert.match(workflow, /cron:\s*["']17 \*\/6 \* \* \*["']/, 'source sync must run every 6 hours');
assert.match(workflow, /EVENTLIVE_SOURCE_ENDED_MIN_YEAR:\s*["']2022["']/, 'ended-event sync must keep the 2022 minimum-year boundary');
assert.match(workflow, /contents:\s*write/, 'source sync must be allowed to persist catalog state');
assert.match(workflow, /pages:\s*write/, 'source sync must be allowed to deploy Pages');
assert.match(workflow, /run:\s*npm run sources:sync/, 'source sync workflow must use the canonical sources:sync command');
assert.match(workflow, /data\/source_run_state\.json/, 'source sync must persist run-state memory across scheduled runs');
assert.match(workflow, /data\/event_image_cache_manifest\.json/, 'source sync must persist image cache manifest across scheduled runs');
assert.match(workflow, /reports\/source-\*\.json/, 'source sync must persist machine-readable source operation reports');
assert.match(workflow, /reports\/source-\*\.md/, 'source sync must persist readable source operation reports');
assert.match(workflow, /reports\/mygov-\*\.json/, 'source sync must persist GOV.SA/NEC radar JSON evidence');
assert.match(workflow, /reports\/mygov-\*\.md/, 'source sync must persist GOV.SA/NEC radar markdown evidence');
assert.match(workflow, /data\/raw\/mygov-wayback-radar\/\*\*/, 'source sync artifacts must include GOV.SA/NEC raw archive evidence');
assert.match(workflow, /reports\/event-image-cache-report\.json/, 'source sync must persist image-cache evidence JSON');
assert.match(workflow, /reports\/event-image-cache-report\.md/, 'source sync must persist image-cache evidence markdown');

const sourceSyncIndex = indexOfLine(/npm run sources:sync/);
const imageCacheTestIndex = indexOfLine(/npm run test:image-cache/);
const publicAssetsTestIndex = indexOfLine(/npm run test:public-assets/);
const sourcePipelineTestIndex = indexOfLine(/npm run test:source-sync-pipeline/);
const scegaExtractorTestIndex = indexOfLine(/npm run test:scega-events-extractor/);
const scegaAliasTestIndex = indexOfLine(/npm run test:scega-canonical-alias/);
const backlogTestIndex = indexOfLine(/npm run test:backlog-enrichment/);
const backlogSelectionTestIndex = indexOfLine(/npm run test:backlog-target-selection/);
const leapAgendaTestIndex = indexOfLine(/npm run test:leap-agenda-enrichment/);
const moneyAgendaTestIndex = indexOfLine(/npm run test:money2020-agenda-enrichment/);
const singleSessionTestIndex = indexOfLine(/npm run test:single-session-activation/);
const liveOpsTestIndex = indexOfLine(/npm run test:live-operational-feeds/);
const attendanceOfflineTestIndex = indexOfLine(/npm run test:attendance-mode-offline/);
const persistIndex = indexOfLine(/Persist sync state back to the repository/);
const deployIndex = indexOfLine(/Deploy to GitHub Pages/);

assert.ok(sourceSyncIndex < sourcePipelineTestIndex, 'pipeline-order test must run after sources:sync');
assert.ok(sourceSyncIndex < scegaExtractorTestIndex, 'SCEGA public API extractor test must run after sources:sync');
assert.ok(sourceSyncIndex < scegaAliasTestIndex, 'SCEGA canonical alias test must run after sources:sync');
assert.ok(sourceSyncIndex < backlogTestIndex, 'backlog enrichment test must run after sources:sync');
assert.ok(sourceSyncIndex < backlogSelectionTestIndex, 'backlog target selection test must run after sources:sync');
assert.ok(sourceSyncIndex < leapAgendaTestIndex, 'LEAP agenda regression test must run after sources:sync');
assert.ok(sourceSyncIndex < moneyAgendaTestIndex, 'Money20/20 agenda regression test must run after sources:sync');
assert.ok(sourceSyncIndex < singleSessionTestIndex, 'single-session activation test must run after sources:sync');
assert.ok(sourceSyncIndex < liveOpsTestIndex, 'live operational feeds test must run after sources:sync');
assert.ok(sourceSyncIndex < attendanceOfflineTestIndex, 'attendance offline test must run after sources:sync');
assert.ok(sourceSyncIndex < imageCacheTestIndex, 'image cache test must run after sources:sync');
assert.ok(sourceSyncIndex < publicAssetsTestIndex, 'public asset test must run after sources:sync');
assert.ok(backlogTestIndex < persistIndex, 'backlog enrichment test must pass before persisting synced state');
assert.ok(backlogSelectionTestIndex < persistIndex, 'backlog target selection test must pass before persisting synced state');
assert.ok(scegaExtractorTestIndex < persistIndex, 'SCEGA public API extractor test must pass before persisting synced state');
assert.ok(scegaAliasTestIndex < persistIndex, 'SCEGA canonical alias test must pass before persisting synced state');
assert.ok(leapAgendaTestIndex < persistIndex, 'LEAP agenda regression test must pass before persisting synced state');
assert.ok(moneyAgendaTestIndex < persistIndex, 'Money20/20 agenda regression test must pass before persisting synced state');
assert.ok(singleSessionTestIndex < persistIndex, 'single-session activation test must pass before persisting synced state');
assert.ok(liveOpsTestIndex < persistIndex, 'live operational feeds test must pass before persisting synced state');
assert.ok(attendanceOfflineTestIndex < persistIndex, 'attendance offline test must pass before persisting synced state');
assert.ok(imageCacheTestIndex < persistIndex, 'image cache test must pass before persisting synced state');
assert.ok(publicAssetsTestIndex < persistIndex, 'public asset test must pass before persisting synced state');
assert.ok(persistIndex < deployIndex, 'state persistence must happen before deployment');

console.log('source-sync-workflow-regression-test: ok');
