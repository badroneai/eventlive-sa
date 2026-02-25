import fs from 'node:fs';

const outputPath = process.env.GITHUB_OUTPUT;
const outputMode = (process.env.RELEASE_VERDICT_OUTPUT_MODE || 'text').toLowerCase();

const uptimeOutcome = (process.env.UPTIME_OUTCOME || '').toLowerCase();
const stabilityOutcome = (process.env.STABILITY_OUTCOME || '').toLowerCase();
const sloOutcome = (process.env.SLO_OUTCOME || '').toLowerCase();
const sloEnforcementState = (process.env.SLO_ENFORCEMENT_STATE || 'n/a').toUpperCase();

function setOutput(key, value) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`, 'utf8');
}

let verdict = 'PASS';
let reason = 'all active release checks passed';

if (uptimeOutcome !== 'success' || stabilityOutcome !== 'success') {
  verdict = 'HOLD';
  reason = 'uptime/stability verification failed';
} else if (sloEnforcementState === 'ACTIVE' && sloOutcome !== 'success') {
  verdict = 'HOLD';
  reason = 'active SLO policy gate failed';
} else if (sloEnforcementState === 'INACTIVE') {
  verdict = 'ATTENTION';
  reason = 'SLO gate in warm-up mode (non-blocking until sample minimum)';
} else if (sloEnforcementState === 'N/A') {
  verdict = 'ATTENTION';
  reason = 'SLO enforcement state unavailable';
}

setOutput('verdict', verdict);
setOutput('verdict_reason', reason);

if (outputMode === 'json') {
  console.log(
    JSON.stringify({
      verdict,
      reason,
      inputs: {
        uptimeOutcome,
        stabilityOutcome,
        sloOutcome,
        sloEnforcementState
      }
    })
  );
} else {
  console.log(`RELEASE_VERDICT ${verdict} reason=${reason}`);
}
