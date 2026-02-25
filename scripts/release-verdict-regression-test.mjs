import { spawnSync } from 'node:child_process';

const cases = [
  {
    name: 'PASS when all active checks are successful',
    env: {
      UPTIME_OUTCOME: 'success',
      STABILITY_OUTCOME: 'success',
      SLO_OUTCOME: 'success',
      SLO_ENFORCEMENT_STATE: 'ACTIVE'
    },
    expectedVerdict: 'PASS',
    expectedReason: 'all active release checks passed'
  },
  {
    name: 'HOLD when uptime fails',
    env: {
      UPTIME_OUTCOME: 'failure',
      STABILITY_OUTCOME: 'success',
      SLO_OUTCOME: 'success',
      SLO_ENFORCEMENT_STATE: 'ACTIVE'
    },
    expectedVerdict: 'HOLD',
    expectedReason: 'uptime/stability verification failed'
  },
  {
    name: 'HOLD when active SLO gate fails',
    env: {
      UPTIME_OUTCOME: 'success',
      STABILITY_OUTCOME: 'success',
      SLO_OUTCOME: 'failure',
      SLO_ENFORCEMENT_STATE: 'ACTIVE'
    },
    expectedVerdict: 'HOLD',
    expectedReason: 'active SLO policy gate failed'
  },
  {
    name: 'ATTENTION when SLO enforcement is inactive',
    env: {
      UPTIME_OUTCOME: 'success',
      STABILITY_OUTCOME: 'success',
      SLO_OUTCOME: 'success',
      SLO_ENFORCEMENT_STATE: 'INACTIVE'
    },
    expectedVerdict: 'ATTENTION',
    expectedReason: 'SLO gate in warm-up mode (non-blocking until sample minimum)'
  },
  {
    name: 'ATTENTION when SLO enforcement state is unavailable',
    env: {
      UPTIME_OUTCOME: 'success',
      STABILITY_OUTCOME: 'success',
      SLO_OUTCOME: 'success',
      SLO_ENFORCEMENT_STATE: 'n/a'
    },
    expectedVerdict: 'ATTENTION',
    expectedReason: 'SLO enforcement state unavailable'
  }
];

for (const testCase of cases) {
  const run = spawnSync(process.execPath, ['scripts/release-safety-verdict.mjs'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...testCase.env,
      RELEASE_VERDICT_OUTPUT_MODE: 'json'
    }
  });

  const out = `${run.stdout || ''}`.trim();
  const err = `${run.stderr || ''}`.trim();

  if (run.status !== 0) {
    console.error(`TEST_FAIL ${testCase.name}: script exited with status ${run.status}`);
    if (out) console.error(out);
    if (err) console.error(err);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    console.error(`TEST_FAIL ${testCase.name}: invalid JSON output`);
    console.error(out || err);
    process.exit(1);
  }

  const allowedVerdicts = new Set(['PASS', 'ATTENTION', 'HOLD']);
  const allowedEnforcementStates = new Set(['ACTIVE', 'INACTIVE', 'N/A']);

  if (!allowedVerdicts.has(parsed.verdict)) {
    console.error(`TEST_FAIL ${testCase.name}: invalid verdict enum`);
    console.error(`actual verdict: ${parsed.verdict}`);
    process.exit(1);
  }

  if (typeof parsed.reason !== 'string' || parsed.reason.length === 0) {
    console.error(`TEST_FAIL ${testCase.name}: reason must be a non-empty string`);
    console.error(`actual reason: ${parsed.reason}`);
    process.exit(1);
  }

  if (!parsed.inputs || typeof parsed.inputs !== 'object') {
    console.error(`TEST_FAIL ${testCase.name}: inputs object missing`);
    process.exit(1);
  }

  const requiredInputKeys = ['uptimeOutcome', 'stabilityOutcome', 'sloOutcome', 'sloEnforcementState'];
  for (const key of requiredInputKeys) {
    if (!(key in parsed.inputs)) {
      console.error(`TEST_FAIL ${testCase.name}: inputs.${key} missing`);
      process.exit(1);
    }
  }

  if (!allowedEnforcementStates.has(parsed.inputs.sloEnforcementState)) {
    console.error(`TEST_FAIL ${testCase.name}: invalid inputs.sloEnforcementState enum`);
    console.error(`actual value: ${parsed.inputs.sloEnforcementState}`);
    process.exit(1);
  }

  if (parsed.verdict !== testCase.expectedVerdict) {
    console.error(`TEST_FAIL ${testCase.name}: verdict mismatch`);
    console.error(`expected verdict: ${testCase.expectedVerdict}`);
    console.error(`actual verdict: ${parsed.verdict}`);
    process.exit(1);
  }

  if (parsed.reason !== testCase.expectedReason) {
    console.error(`TEST_FAIL ${testCase.name}: reason mismatch`);
    console.error(`expected reason: ${testCase.expectedReason}`);
    console.error(`actual reason: ${parsed.reason}`);
    process.exit(1);
  }
}

console.log('TEST_OK release verdict regression checks passed');
