import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'reports', 'reliability-rollup.md');
const outputPath = process.env.GITHUB_OUTPUT;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function appendOutput(key, value) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`, 'utf8');
}

const windowDays = toNumber(process.env.ROLLUP_WINDOW_DAYS, 7);
const minSuccessRatePct = toNumber(process.env.MIN_SUCCESS_RATE_PCT, 99);
const maxFailRatePct = toNumber(process.env.MAX_FAIL_RATE_PCT, 1);

const checks = [
  {
    key: 'uptime',
    outcome: String(process.env.UPTIME_OUTCOME || 'skipped'),
    attemptsUsed: toNumber(process.env.UPTIME_ATTEMPTS_USED, 0),
    resultMode: String(process.env.UPTIME_RESULT_MODE || 'n/a')
  },
  {
    key: 'stability',
    outcome: String(process.env.STABILITY_OUTCOME || 'skipped'),
    attemptsUsed: toNumber(process.env.STABILITY_ATTEMPTS_USED, 0),
    resultMode: String(process.env.STABILITY_RESULT_MODE || 'n/a')
  }
];

const evaluatedChecks = checks.filter((check) => check.outcome !== 'skipped');
const totalChecks = evaluatedChecks.length;
const passedChecks = evaluatedChecks.filter((check) => check.outcome === 'success').length;
const failedChecks = totalChecks - passedChecks;
const successRatePct = totalChecks ? Number(((passedChecks / totalChecks) * 100).toFixed(2)) : 0;
const failRatePct = totalChecks ? Number(((failedChecks / totalChecks) * 100).toFixed(2)) : 0;
const gate = totalChecks > 0 && successRatePct >= minSuccessRatePct && failRatePct <= maxFailRatePct
  ? 'PASS'
  : 'FAIL';

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, [
  '# Reliability Rollup',
  `- Generated at: ${new Date().toISOString()}`,
  `- Rolling window (days): ${windowDays}`,
  `- Total checks in window: ${totalChecks}`,
  `- Passed checks: ${passedChecks}`,
  `- Failed checks: ${failedChecks}`,
  `- Success rate: ${successRatePct}%`,
  `- Fail rate: ${failRatePct}%`,
  `- SLO success threshold: ${minSuccessRatePct}%`,
  `- SLO fail threshold: ${maxFailRatePct}%`,
  `- SLO gate: ${gate}`,
  '',
  '## Check Outcomes',
  ...checks.map((check) => `- ${check.key}: outcome=${check.outcome}, attempts_used=${check.attemptsUsed}, result_mode=${check.resultMode}`)
].join('\n') + '\n', 'utf8');

appendOutput('rollup_total_checks', String(totalChecks));
appendOutput('rollup_success_rate_pct', String(successRatePct));
appendOutput('rollup_fail_rate_pct', String(failRatePct));
appendOutput('rollup_gate', gate);

console.log(`RELIABILITY_ROLLUP_OK gate=${gate} total=${totalChecks} success_rate=${successRatePct}% fail_rate=${failRatePct}%`);
