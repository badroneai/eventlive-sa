import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const TIMING_REPORT_PATH = process.env.SCHEMA_SUITE_TIMING_REPORT_PATH || 'reports/schema-suite-timing.md';
const HISTORY_PATH = process.env.SCHEMA_SUITE_HISTORY_PATH || 'ops/schema-suite-runtime-history.json';
const STATUS_JSON_PATH = process.env.SCHEMA_SUITE_REGRESSION_STATUS_JSON || 'reports/schema-suite-regression-status.json';
const STATUS_MD_PATH = process.env.SCHEMA_SUITE_REGRESSION_STATUS_MD || 'reports/schema-suite-regression-status.md';

const REGRESSION_FACTOR = Number(process.env.SCHEMA_SUITE_REGRESSION_FACTOR || 1.5); // 50% slower than baseline
const CONSECUTIVE_LIMIT = Number(process.env.SCHEMA_SUITE_REGRESSION_CONSECUTIVE || 3);
const FAIL_ON_DETECTED = process.env.SCHEMA_SUITE_REGRESSION_FAIL_ON_DETECTED === '1';
const MAX_HISTORY = Number(process.env.SCHEMA_SUITE_REGRESSION_MAX_HISTORY || 40);

const nowIso = new Date().toISOString();

const parseField = (content, key) => {
  const m = content.match(new RegExp(`- ${key}:\\s*([^\\n]+)`));
  return m ? m[1].trim() : null;
};

if (!existsSync(TIMING_REPORT_PATH)) {
  console.error(`SCHEMA_SUITE_REGRESSION_FAIL missing timing report at ${TIMING_REPORT_PATH}`);
  process.exit(1);
}

const timingMd = await fs.readFile(TIMING_REPORT_PATH, 'utf8');
const status = parseField(timingMd, 'status');
const totalDurationRaw = parseField(timingMd, 'total_duration_ms');
const generatedAt = parseField(timingMd, 'generated_at') || nowIso;
const totalDurationMs = Number(totalDurationRaw);

if (!Number.isFinite(totalDurationMs) || totalDurationMs < 0) {
  console.error('SCHEMA_SUITE_REGRESSION_FAIL invalid total_duration_ms in timing report');
  process.exit(1);
}

await fs.mkdir('ops', { recursive: true });
await fs.mkdir('reports', { recursive: true });

const history = existsSync(HISTORY_PATH)
  ? JSON.parse(await fs.readFile(HISTORY_PATH, 'utf8'))
  : { created_at: nowIso, samples: [], baseline_duration_ms: null };

history.samples ??= [];

const sample = {
  observed_at: generatedAt,
  suite_status: status || 'UNKNOWN',
  total_duration_ms: totalDurationMs
};

history.samples.push(sample);
if (history.samples.length > MAX_HISTORY) {
  history.samples = history.samples.slice(history.samples.length - MAX_HISTORY);
}

const passSamples = history.samples.filter((s) => s.suite_status === 'PASS');
if (!Number.isFinite(history.baseline_duration_ms) && passSamples.length > 0) {
  history.baseline_duration_ms = passSamples[0].total_duration_ms;
}

const baseline = Number(history.baseline_duration_ms);
const thresholdMs = Number.isFinite(baseline) ? Math.ceil(baseline * REGRESSION_FACTOR) : null;

let consecutiveRegression = 0;
for (let i = history.samples.length - 1; i >= 0; i -= 1) {
  const s = history.samples[i];
  if (s.suite_status !== 'PASS') break;
  if (!Number.isFinite(thresholdMs) || s.total_duration_ms <= thresholdMs) break;
  consecutiveRegression += 1;
}

const regressionDetected = Number.isFinite(thresholdMs)
  ? consecutiveRegression >= CONSECUTIVE_LIMIT
  : false;

const summary = {
  evaluated_at: nowIso,
  timing_report_path: TIMING_REPORT_PATH,
  latest_sample: sample,
  baseline_duration_ms: Number.isFinite(baseline) ? baseline : null,
  regression_factor: REGRESSION_FACTOR,
  threshold_duration_ms: thresholdMs,
  consecutive_regression_count: consecutiveRegression,
  consecutive_limit: CONSECUTIVE_LIMIT,
  regression_detected: regressionDetected,
  status: regressionDetected ? 'WARN' : 'OK'
};

await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
await fs.writeFile(STATUS_JSON_PATH, JSON.stringify(summary, null, 2), 'utf8');

const md = [
  '# Schema Suite Regression Status',
  '',
  `- evaluated_at: ${summary.evaluated_at}`,
  `- latest_total_duration_ms: ${summary.latest_sample.total_duration_ms}`,
  `- latest_suite_status: ${summary.latest_sample.suite_status}`,
  `- baseline_duration_ms: ${summary.baseline_duration_ms ?? 'n/a'}`,
  `- regression_factor: ${summary.regression_factor}`,
  `- threshold_duration_ms: ${summary.threshold_duration_ms ?? 'n/a'}`,
  `- consecutive_regression_count: ${summary.consecutive_regression_count}`,
  `- consecutive_limit: ${summary.consecutive_limit}`,
  `- regression_detected: ${summary.regression_detected}`,
  `- status: ${summary.status}`,
  '',
  `Source timing report: \`${TIMING_REPORT_PATH}\``,
  `History store: \`${HISTORY_PATH}\``
].join('\n');

await fs.writeFile(STATUS_MD_PATH, `${md}\n`, 'utf8');

console.log(
  `SCHEMA_SUITE_REGRESSION_STATUS ${summary.status} baseline_ms=${summary.baseline_duration_ms ?? 'n/a'} threshold_ms=${summary.threshold_duration_ms ?? 'n/a'} consecutive=${summary.consecutive_regression_count}/${summary.consecutive_limit}`
);

if (regressionDetected && FAIL_ON_DETECTED) {
  console.error('SCHEMA_SUITE_REGRESSION_FAIL persistent runtime regression detected');
  process.exit(1);
}

console.log('SCHEMA_SUITE_REGRESSION_OK');
