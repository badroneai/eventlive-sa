import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, ['scripts/release-safety-verdict.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    RELEASE_VERDICT_VALIDATE_SCHEMA: '1',
    RELEASE_VERDICT_OUTPUT_MODE: 'json',
    RELEASE_VERDICT_INJECT_UPTIME_NON_STRING: '1',
    UPTIME_OUTCOME: 'success',
    STABILITY_OUTCOME: 'success',
    SLO_OUTCOME: 'success',
    SLO_ENFORCEMENT_STATE: 'ACTIVE'
  }
});

const out = `${run.stdout || ''}`.trim();
const err = `${run.stderr || ''}`.trim();
const combined = `${out}\n${err}`.trim();

if (run.status === 0) {
  console.error('CI_CHECK_FAIL nested-type negative schema gate test unexpectedly passed');
  if (combined) console.error(combined);
  process.exit(1);
}

if (run.status !== 2) {
  console.error(`CI_CHECK_FAIL expected exit code 2, got ${run.status}`);
  if (combined) console.error(combined);
  process.exit(1);
}

if (!combined.includes('RELEASE_VERDICT_SCHEMA_FAIL')) {
  console.error('CI_CHECK_FAIL expected schema failure marker not found');
  if (combined) console.error(combined);
  process.exit(1);
}

if (!combined.includes('payload.inputs.uptimeOutcome must be a string')) {
  console.error('CI_CHECK_FAIL expected nested type-mismatch failure not found');
  if (combined) console.error(combined);
  process.exit(1);
}

console.log('CI_CHECK_OK release verdict schema gate fails closed on nested type mismatch');
