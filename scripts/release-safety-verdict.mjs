import fs from 'node:fs';

const outputPath = process.env.GITHUB_OUTPUT;
const outputMode = (process.env.RELEASE_VERDICT_OUTPUT_MODE || 'text').toLowerCase();
const validateSchema = ['1', 'true', 'yes', 'on'].includes(
  (process.env.RELEASE_VERDICT_VALIDATE_SCHEMA || '').toLowerCase()
);

const uptimeOutcome = (process.env.UPTIME_OUTCOME || '').toLowerCase();
const stabilityOutcome = (process.env.STABILITY_OUTCOME || '').toLowerCase();
const sloOutcome = (process.env.SLO_OUTCOME || '').toLowerCase();
const sloEnforcementState = (process.env.SLO_ENFORCEMENT_STATE || 'n/a').toUpperCase();

function setOutput(key, value) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`, 'utf8');
}

function failSchemaValidation(message) {
  console.error(`RELEASE_VERDICT_SCHEMA_FAIL ${message}`);
  process.exit(2);
}

function validateBySchema(value, schema, path = 'payload') {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      failSchemaValidation(`${path} must be an object`);
    }

    const required = schema.required || [];
    for (const key of required) {
      if (!(key in value)) {
        failSchemaValidation(`${path}.${key} missing`);
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          failSchemaValidation(`${path}.${key} is not allowed by schema`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          validateBySchema(value[key], childSchema, `${path}.${key}`);
        }
      }
    }

    return;
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      failSchemaValidation(`${path} must be a string`);
    }

    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      failSchemaValidation(`${path} length must be >= ${schema.minLength}`);
    }

    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      failSchemaValidation(`${path} must be one of: ${schema.enum.join(', ')} (actual: ${value})`);
    }
  }
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

const payload = {
  verdict,
  reason,
  inputs: {
    uptimeOutcome,
    stabilityOutcome,
    sloOutcome,
    sloEnforcementState
  }
};

if (validateSchema) {
  const schema = JSON.parse(
    fs.readFileSync(new URL('../data/release-verdict.schema.json', import.meta.url), 'utf8')
  );
  validateBySchema(payload, schema, 'payload');
}

setOutput('verdict', verdict);
setOutput('verdict_reason', reason);

if (outputMode === 'json') {
  console.log(JSON.stringify(payload));
} else {
  console.log(`RELEASE_VERDICT ${verdict} reason=${reason}`);
}
