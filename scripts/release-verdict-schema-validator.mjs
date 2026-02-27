import fs from 'node:fs';

function schemaFail(message) {
  throw new Error(message);
}

function validateBySchema(value, schema, path = 'payload') {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      schemaFail(`${path} must be an object`);
    }

    const required = schema.required || [];
    for (const key of required) {
      if (!(key in value)) {
        schemaFail(`${path}.${key} missing`);
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          schemaFail(`${path}.${key} is not allowed by schema`);
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
      schemaFail(`${path} must be a string`);
    }

    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      schemaFail(`${path} length must be >= ${schema.minLength}`);
    }

    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      schemaFail(`${path} must be one of: ${schema.enum.join(', ')} (actual: ${value})`);
    }
  }
}

export function validateReleaseVerdictPayload(payload) {
  const schema = JSON.parse(
    fs.readFileSync(new URL('../data/release-verdict.schema.json', import.meta.url), 'utf8')
  );
  validateBySchema(payload, schema, 'payload');
}
