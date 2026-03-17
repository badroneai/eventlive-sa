import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, ['scripts/release-safety-verdict.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    RELEASE_VERDICT_VALIDATE_SCHEMA: '1',
    RELEASE_VERDICT_OUTPUT_MODE: 'json',
    UPTIME_OUTCOME: 'success',
    STABILITY_OUTCOME: 'success',
    SLO_OUTCOME: 'success',
    SLO_ENFORCEMENT_STATE: 'ACTIVE'
  }
});

const out = `${run.stdout || ''}`.trim();
const err = `${run.stderr || ''}`.trim();

if (run.status !== 0) {
  console.error(`CI_CHECK_FAIL release verdict schema gate exited with status ${run.status}`);
  if (out) console.error(out);
  if (err) console.error(err);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(out);
} catch {
  console.error('CI_CHECK_FAIL release verdict schema gate returned invalid JSON');
  console.error(out || err);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object') {
  console.error('CI_CHECK_FAIL release verdict schema gate returned non-object payload');
  process.exit(1);
}

if (typeof parsed.verdict !== 'string' || parsed.verdict.length === 0) {
  console.error('CI_CHECK_FAIL verdict field missing/invalid');
  process.exit(1);
}

if (typeof parsed.reason !== 'string' || parsed.reason.length === 0) {
  console.error('CI_CHECK_FAIL reason field missing/invalid');
  process.exit(1);
}

console.log('CI_CHECK_OK release verdict schema gate is enforceable');
