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
      ...testCase.env
    }
  });

  const out = `${run.stdout || ''}\n${run.stderr || ''}`;

  if (run.status !== 0) {
    console.error(`TEST_FAIL ${testCase.name}: script exited with status ${run.status}`);
    console.error(out);
    process.exit(1);
  }

  const expectedLine = `RELEASE_VERDICT ${testCase.expectedVerdict} reason=${testCase.expectedReason}`;
  if (!out.includes(expectedLine)) {
    console.error(`TEST_FAIL ${testCase.name}: expected line not found`);
    console.error(`expected: ${expectedLine}`);
    console.error('actual output:');
    console.error(out);
    process.exit(1);
  }
}

console.log('TEST_OK release verdict regression checks passed');
