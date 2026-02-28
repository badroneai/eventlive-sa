import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const STATUS_PATH = process.env.SCHEMA_SUITE_REGRESSION_STATUS_PATH || 'reports/schema-suite-regression-status.json';

if (!existsSync(STATUS_PATH)) {
  console.error(`SCHEMA_SUITE_REGRESSION_SUMMARY_FAIL missing status file at ${STATUS_PATH}`);
  process.exit(1);
}

const status = JSON.parse(await fs.readFile(STATUS_PATH, 'utf8'));

const summaryStatus = status.status || 'UNKNOWN';
const baseline = status.baseline_duration_ms ?? 'n/a';
const threshold = status.threshold_duration_ms ?? 'n/a';
const latest = status.latest_sample?.total_duration_ms ?? 'n/a';
const samplesProgress = `${status.baseline_sample_count ?? 0}/${status.baseline_min_samples ?? 'n/a'}`;
const consecutive = `${status.consecutive_regression_count ?? 0}/${status.consecutive_limit ?? 'n/a'}`;

console.log(
  `SCHEMA_SUITE_REGRESSION_SUMMARY status=${summaryStatus} latest_ms=${latest} baseline_ms=${baseline} threshold_ms=${threshold} samples=${samplesProgress} consecutive=${consecutive}`
);

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  const out = [
    `schema_regression_status=${summaryStatus}`,
    `schema_regression_latest_ms=${latest}`,
    `schema_regression_baseline_ms=${baseline}`,
    `schema_regression_threshold_ms=${threshold}`,
    `schema_regression_samples_progress=${samplesProgress}`,
    `schema_regression_consecutive=${consecutive}`
  ].join('\n');
  await fs.appendFile(githubOutput, `${out}\n`, 'utf8');
}

const githubStepSummary = process.env.GITHUB_STEP_SUMMARY;
if (githubStepSummary) {
  const lines = [
    '## Schema Runtime Regression Trend',
    `- Status: ${summaryStatus}`,
    `- Latest total duration: ${latest} ms`,
    `- Baseline (rolling median): ${baseline} ms`,
    `- Threshold (${status.regression_factor ?? 'n/a'}x): ${threshold} ms`,
    `- Baseline sample progress: ${samplesProgress}`,
    `- Consecutive above threshold: ${consecutive}`,
    ''
  ].join('\n');
  await fs.appendFile(githubStepSummary, `${lines}\n`, 'utf8');
}

console.log('SCHEMA_SUITE_REGRESSION_SUMMARY_OK');
