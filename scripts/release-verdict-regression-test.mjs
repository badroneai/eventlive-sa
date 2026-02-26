import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const schema = JSON.parse(
  fs.readFileSync(new URL('../data/release-verdict.schema.json', import.meta.url), 'utf8')
);

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

function fail(testName, message, detail) {
  console.error(`TEST_FAIL ${testName}: ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function validateBySchema(value, currentSchema, path, testName) {
  if (currentSchema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(testName, `${path} must be an object`);
    }

    const required = currentSchema.required || [];
    for (const key of required) {
      if (!(key in value)) {
        fail(testName, `${path}.${key} missing`);
      }
    }

    if (currentSchema.additionalProperties === false && currentSchema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in currentSchema.properties)) {
          fail(testName, `${path}.${key} is not allowed by schema`);
        }
      }
    }

    if (currentSchema.properties) {
      for (const [key, childSchema] of Object.entries(currentSchema.properties)) {
        if (key in value) {
          validateBySchema(value[key], childSchema, `${path}.${key}`, testName);
        }
      }
    }

    return;
  }

  if (currentSchema.type === 'string') {
    if (typeof value !== 'string') {
      fail(testName, `${path} must be a string`);
    }

    if (typeof currentSchema.minLength === 'number' && value.length < currentSchema.minLength) {
      fail(testName, `${path} length must be >= ${currentSchema.minLength}`);
    }

    if (Array.isArray(currentSchema.enum) && !currentSchema.enum.includes(value)) {
      fail(testName, `${path} must be one of: ${currentSchema.enum.join(', ')}`, `actual value: ${value}`);
    }
  }
}

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
    fail(testCase.name, `script exited with status ${run.status}`, out || err);
  }

  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    fail(testCase.name, 'invalid JSON output', out || err);
  }

  validateBySchema(parsed, schema, 'payload', testCase.name);

  if (parsed.verdict !== testCase.expectedVerdict) {
    fail(
      testCase.name,
      'verdict mismatch',
      `expected verdict: ${testCase.expectedVerdict}\nactual verdict: ${parsed.verdict}`
    );
  }

  if (parsed.reason !== testCase.expectedReason) {
    fail(
      testCase.name,
      'reason mismatch',
      `expected reason: ${testCase.expectedReason}\nactual reason: ${parsed.reason}`
    );
  }
}

console.log('TEST_OK release verdict regression checks passed');
