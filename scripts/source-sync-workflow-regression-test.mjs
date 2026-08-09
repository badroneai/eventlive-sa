import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowPath = path.join(root, '.github', 'workflows', 'source-sync.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const deployWorkflowPath = path.join(root, '.github', 'workflows', 'deploy.yml');
const deployWorkflow = fs.readFileSync(deployWorkflowPath, 'utf8');

function indexOfLine(pattern) {
  const index = workflow.split('\n').findIndex((line) => pattern.test(line));
  assert.notEqual(index, -1, `source-sync workflow must include ${pattern}`);
  return index;
}

function indexOfDeployLine(pattern) {
  const index = deployWorkflow.split('\n').findIndex((line) => pattern.test(line));
  assert.notEqual(index, -1, `deploy workflow must include ${pattern}`);
  return index;
}

assert.match(workflow, /cron:\s*["']17 \*\/6 \* \* \*["']/, 'source sync must run every 6 hours');
assert.match(workflow, /EVENTLIVE_SOURCE_COLLECT_ENDED_EVENTS:\s*["']false["']/, 'scheduled sync must explicitly disable ended-event collection');
assert.match(workflow, /EVENTLIVE_SOURCE_ADAPTIVE_CADENCE:\s*["']true["']/, 'scheduled sync must defer repeatedly unproductive sources without disabling them');
assert.match(workflow, /EVENTLIVE_SOURCE_DIAGNOSTICS_INTERVAL_HOURS:\s*["']24["']/, 'heavy diagnostics must run at most daily on the six-hour workflow');
assert.match(workflow, /EVENTLIVE_INCLUDE_DISCOVERY_RADARS:\s*["']false["']/, 'discovery-only radars must stay off the production critical path');
assert.match(workflow, /EVENTLIVE_SOURCE_FETCH_TIMEOUT_MS:\s*["']12000["']/, 'scheduled collectors must use a bounded direct-fetch timeout');
assert.match(workflow, /EVENTLIVE_SOURCE_FETCH_ATTEMPTS:\s*["']2["']/, 'scheduled collectors must avoid three long retries per failed source');
assert.match(workflow, /EVENTLIVE_BROWSER_FAILURE_COOLDOWN_MS:\s*["']259200000["']/, 'failed browser probes must cool down for 72 hours');
assert.match(workflow, /uses:\s*actions\/cache@v4/, 'scheduled sync must retain downloaded event images between runs');
assert.match(workflow, /path:\s*dist\/assets\/event-images/, 'the workflow image cache must restore the public event-image directory');
assert.match(workflow, /eventlive-event-images-\$\{\{ runner\.os \}\}/, 'the workflow image cache must use a stable EventLive key prefix');
assert.match(deployWorkflow, /name:\s*Restore event image cache/, 'code deployments must restore source images before rebuilding the public site');
assert.match(deployWorkflow, /path:\s*dist\/assets\/event-images/, 'code deployments must restore the public event-image directory');
assert.match(deployWorkflow, /eventlive-event-images-\$\{\{ runner\.os \}\}/, 'source sync and code deployment must share the same image-cache prefix');
assert.doesNotMatch(workflow, /EVENTLIVE_SOURCE_ENDED_MIN_YEAR:/, 'scheduled sync must not configure a historical-year collection window');
assert.match(workflow, /EVENTLIVE_TRUSTED_SOURCE_LIMIT:\s*["']200["']/, 'trusted sources must not be constrained to the discovery-source cap');
assert.doesNotMatch(workflow, /EVENTLIVE_TRUSTED_SOURCE_ENDED_LIMIT:/, 'scheduled sync must not reserve capacity for ended-event ingestion');
assert.match(workflow, /EVENTLIVE_MAX_SOURCE_COLLECTOR_ERRORS:\s*["']12["']/, 'transient collector failures must not discard a complete catalog build');
assert.match(workflow, /EVENTLIVE_CRITICAL_SOURCE_ERROR_STREAK:\s*["']2["']/, 'critical-source failures must be persistent across distinct runs before blocking publication');
assert.match(workflow, /contents:\s*write/, 'source sync must be allowed to persist catalog state');
assert.match(workflow, /pages:\s*write/, 'source sync must be allowed to deploy Pages');
assert.match(workflow, /run:\s*npm run sources:sync/, 'source sync workflow must use the canonical sources:sync command');
assert.match(workflow, /data\/source_run_state\.json/, 'source sync must persist run-state memory across scheduled runs');
assert.match(workflow, /data\/source_growth_state\.json/, 'source sync must persist growth history across scheduled runs');
assert.match(workflow, /data\/event_image_cache_manifest\.json/, 'source sync must persist image cache manifest across scheduled runs');
assert.match(workflow, /data\/content_translations\.json/, 'source sync must persist CI-merged machine translations, or every run re-translates the same backlog and the English side never converges');
assert.match(workflow, /npm run test:en-surface-sweep/, 'the English-surface sweep gate must run on every sync — template chrome drift shipped silently for days without it');
assert.match(workflow, /issues:\s*write/, 'the sync must be allowed to maintain its own surface-debt issue — alerting must not depend on humans polling reports');
assert.match(workflow, /report-surface-debt-issue\.mjs/, 'recurring surface debt must feed the autonomous GitHub-issue alert');
assert.match(workflow, /reports\/i18n-en-surface\.json/, 'the sweep report must persist for trend inspection');
assert.match(workflow, /argos-translate-models-both-directions-v2/, 'the argos model cache key must cover both translation directions (the v1 cache held en->ar only and starved ar->en forever)');
assert.match(workflow, /reports\/source-\*\.json/, 'source sync must persist machine-readable source operation reports');
assert.match(workflow, /reports\/source-\*\.md/, 'source sync must persist readable source operation reports');
assert.match(workflow, /reports\/mygov-\*\.json/, 'source sync must persist GOV.SA/NEC radar JSON evidence');
assert.match(workflow, /reports\/mygov-\*\.md/, 'source sync must persist GOV.SA/NEC radar markdown evidence');
assert.match(workflow, /data\/raw\/mygov-wayback-radar\/\*\*/, 'source sync artifacts must include GOV.SA/NEC raw archive evidence');
assert.match(workflow, /reports\/event-image-cache-report\.json/, 'source sync must persist image-cache evidence JSON');
assert.match(workflow, /reports\/event-image-cache-report\.md/, 'source sync must persist image-cache evidence markdown');
assert.match(workflow, /git fetch origin "\$\{GITHUB_REF_NAME\}"/, 'source sync must fetch remote state before each persistence attempt');
assert.match(workflow, /git rebase --autostash "origin\/\$\{GITHUB_REF_NAME\}"/, 'source sync must rebase with generated-site changes safely stashed before pushing persisted data');
assert.match(workflow, /for attempt in 1 2 3/, 'source sync must retry persistence races');
assert.match(workflow, /npm run test:source-growth/, 'scheduled sync must regression-test the growth ledger');

const sourceSyncIndex = indexOfLine(/npm run sources:sync/);
const imageRestoreIndex = indexOfLine(/Restore event image cache/);
const preflightIndex = indexOfLine(/Source state preflight/);
const sourceHealthPreflightIndex = indexOfLine(/npm run test:source-health-gate/);
const sourceRunStatePreflightIndex = indexOfLine(/npm run test:source-run-state/);
const sourceFutureOnlyPreflightIndex = indexOfLine(/npm run test:source-future-only/);
const sourceCadencePreflightIndex = indexOfLine(/npm run test:source-cadence/);
const sourceWorkflowPreflightIndex = indexOfLine(/npm run test:source-sync-workflow/);
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
const sourceIndexNowNotifyIndex = indexOfLine(/Notify search engines about changed URLs/);
const sourceIndexNowReceiptUploadIndex = indexOfLine(/Upload IndexNow submission receipt/);
const deployImageRestoreIndex = deployWorkflow.split('\n').findIndex((line) => /Restore event image cache/.test(line));
const deployBuildIndex = deployWorkflow.split('\n').findIndex((line) => /Build EventLive public site/.test(line));
const deployIndexNowNotifyIndex = indexOfDeployLine(/Notify IndexNow after the new site is live/);
const deployReleaseEvidenceIndex = indexOfDeployLine(/Upload release verification evidence/);

assert.ok(preflightIndex < sourceSyncIndex, 'source-state preflight must run before the long collection step');
assert.ok(imageRestoreIndex < sourceSyncIndex, 'event images must be restored before the source sync builds the public catalog');
assert.ok(sourceHealthPreflightIndex < sourceSyncIndex, 'source health gate regression must fail fast before collection');
assert.ok(sourceRunStatePreflightIndex < sourceSyncIndex, 'source run-state regression must fail fast before collection');
assert.ok(sourceFutureOnlyPreflightIndex < sourceSyncIndex, 'future-only collection regression must fail fast before collection');
assert.ok(sourceCadencePreflightIndex < sourceSyncIndex, 'source cadence regression must fail fast before collection');
assert.ok(sourceWorkflowPreflightIndex < sourceSyncIndex, 'source workflow regression must fail fast before collection');
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
assert.ok(sourceIndexNowNotifyIndex < sourceIndexNowReceiptUploadIndex, 'source sync must upload the IndexNow receipt after attempting submission');
assert.match(workflow, /path:\s*reports\/indexnow-submission-receipt\.json/, 'source sync must retain the non-secret IndexNow receipt');
assert.ok(deployIndexNowNotifyIndex < deployReleaseEvidenceIndex, 'release verification must upload evidence after attempting IndexNow submission');
assert.match(deployWorkflow, /reports\/indexnow-submission-receipt\.json/, 'release verification artifact must retain the non-secret IndexNow receipt');
assert.ok(deployImageRestoreIndex >= 0 && deployImageRestoreIndex < deployBuildIndex, 'code deployment must restore source images before the public build');

// Class ban for syncs 30920399222 / 31016172861 / 31041912300 / 31069254407.
// The run-verdict step used to branch on publish_quality_gates alone and then
// state as fact that "the site DID publish this run ... NOT a publishing
// outage". When an earlier blocking step aborts the job, that battery is
// SKIPPED and the deploy never happens — so the outage branch fired the
// site-published message. Four consecutive runs emailed a reassuring
// "quality regression" while eventme.live sat frozen for ~20 hours and no
// catalog state was persisted. The verdict must read the DEPLOY outcome, and
// it must read it FIRST, or the pipeline can lie about being alive again.
assert.match(
  workflow,
  /DEPLOY_OUTCOME:\s*\$\{\{\s*steps\.deployment\.outcome\s*\}\}/,
  'the run verdict must read the actual Deploy to GitHub Pages outcome — a verdict derived only from quality gates cannot tell an outage from a regression'
);
assert.match(
  workflow,
  /SYNC_RUN_RED_PUBLISHING_OUTAGE/,
  'the run verdict must have a distinct publishing-outage verdict; an outage reported as a quality regression is a silent outage'
);
const outageBranchIndex = indexOfLine(/SYNC_RUN_RED_PUBLISHING_OUTAGE/);
const alreadyPublishedBranchIndex = indexOfLine(/SYNC_RUN_RED_SITE_ALREADY_PUBLISHED/);
assert.ok(
  outageBranchIndex < alreadyPublishedBranchIndex,
  'the publishing-outage check must run BEFORE the site-already-published branch, or a skipped deploy is announced as a successful publish'
);
assert.doesNotMatch(
  workflow.split('\n')[alreadyPublishedBranchIndex],
  /steps\.publish_quality_gates\.outcome/,
  'the site-already-published message must not be reachable straight from the quality-gate outcome — it must sit behind a confirmed successful deploy'
);
assert.match(
  workflow,
  /PUBLISH_QUALITY_GATES_NEVER_RAN/,
  'a skipped publish-quality battery must be reported as never-ran, not as failed — "skipped" is not "failed"'
);

console.log('source-sync-workflow-regression-test: ok');

// Build-written state must be committed back, or the mechanism it drives is a
// lying gauge: it recomputes from an empty slate every run and never detects
// the change it exists to detect.
//
// 2026-08-09: data/published_url_ledger.json is the record of which published
// event URLs moved vs died (scripts/published-url-ledger.mjs). Left out of the
// persist step it would reset on every sync, every rename would look like a
// first sighting, and the redirect stubs that keep an indexed URL alive would
// never be emitted — silently, exactly like the 404s that prompted it.
for (const stateFile of ['data/seo_page_state.json', 'data/published_url_ledger.json']) {
  assert.ok(
    new RegExp(`^\\s*${stateFile.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\\\?\\s*$`, 'm').test(workflow),
    `source-sync.yml must commit ${stateFile} back to the repository, or the state it holds resets every run`
  );
}
