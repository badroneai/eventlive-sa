import { validateReleaseVerdictPayload } from './release-verdict-schema-validator.mjs';

const fixture = (process.env.RELEASE_VERDICT_SCHEMA_NEGATIVE_FIXTURE || '').toLowerCase();

const payload = {
  verdict: 'PASS',
  reason: 'all active release checks passed',
  inputs: {
    uptimeOutcome: 'success',
    stabilityOutcome: 'success',
    sloOutcome: 'success',
    sloEnforcementState: 'ACTIVE'
  }
};

switch (fixture) {
  case 'missing-required':
    delete payload.reason;
    break;
  case 'additional-property':
    payload.debugExtra = 'unexpected';
    break;
  case 'nested-type':
    payload.inputs.uptimeOutcome = 123;
    break;
  default:
    console.error('RELEASE_VERDICT_SCHEMA_FAIL unknown negative fixture');
    process.exit(2);
}

try {
  validateReleaseVerdictPayload(payload);
  console.error(`RELEASE_VERDICT_SCHEMA_FAIL ${fixture} unexpectedly passed`);
  process.exit(1);
} catch (error) {
  console.error(`RELEASE_VERDICT_SCHEMA_FAIL ${error.message}`);
  process.exit(2);
}
