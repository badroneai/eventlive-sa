import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const schema = JSON.parse(fs.readFileSync(path.join(dataDir, 'schema.json'), 'utf8'));
const configuredSource = process.env.EVENTLIVE_SOURCE_FILE;
const samplePath = configuredSource ? path.join(root, configuredSource) : path.join(dataDir, 'demo_program.json');

function exists(p) {
  if (!p) return false;
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isStrictDateTime(value) {
  if (typeof value !== 'string' || !ISO_DATE_TIME_RE.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function validateFormat(value, format) {
  if (format === 'date-time') {
    return isStrictDateTime(value);
  }
  return true;
}

function validateObject(value, objectSchema, prefix) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  for (const key of objectSchema.required ?? []) {
    if (value[key] === undefined || value[key] === null || value[key] === '') {
      errors.push(`${prefix}: missing required field '${key}'`);
    }
  }

  for (const [key, fieldValue] of Object.entries(value)) {
    const prop = objectSchema.properties?.[key];
    if (!prop) {
      errors.push(`${prefix}: unexpected field '${key}'`);
      continue;
    }

    if (prop.type === 'string' && typeof fieldValue !== 'string') {
      errors.push(`${prefix}: field '${key}' must be string`);
    }
    if (prop.type === 'array' && !Array.isArray(fieldValue)) {
      errors.push(`${prefix}: field '${key}' must be array`);
    }
    if (prop.type === 'object' && (typeof fieldValue !== 'object' || Array.isArray(fieldValue) || fieldValue === null)) {
      errors.push(`${prefix}: field '${key}' must be object`);
    }
    if (prop.enum && !prop.enum.includes(fieldValue)) {
      errors.push(`${prefix}: field '${key}' value '${fieldValue}' is outside enum`);
    }
    if (prop.minLength !== undefined && typeof fieldValue === 'string' && fieldValue.length < prop.minLength) {
      errors.push(`${prefix}: field '${key}' must have minLength ${prop.minLength}`);
    }
    if (prop.minItems !== undefined && Array.isArray(fieldValue) && fieldValue.length < prop.minItems) {
      errors.push(`${prefix}: field '${key}' must contain at least ${prop.minItems} item(s)`);
    }
    if (prop.type === 'array' && Array.isArray(fieldValue) && prop.items?.type === 'string') {
      fieldValue.forEach((item, index) => {
        if (typeof item !== 'string') {
          errors.push(`${prefix}: field '${key}' item ${index + 1} must be string`);
        }
      });
    }
    if (prop.format && typeof fieldValue === 'string' && !validateFormat(fieldValue, prop.format)) {
      errors.push(`${prefix}: field '${key}' invalid format '${prop.format}'`);
    }
  }

  return errors;
}

function validateProgram(program) {
  const errors = validateObject(program, schema.properties.program, 'program');

  if (program?.event_start && program?.event_end) {
    const start = Date.parse(program.event_start);
    const end = Date.parse(program.event_end);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      errors.push('program: event_end is earlier than event_start');
    }
  }

  return errors;
}

function validateSession(row, index, program) {
  const errors = validateObject(row, schema.properties.sessions.items, `session ${index + 1}`);

  if (row.start_at && row.end_at) {
    const start = Date.parse(row.start_at);
    const end = Date.parse(row.end_at);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      errors.push(`session ${index + 1}: end_at is earlier than start_at`);
    }
  }

  if (typeof row.session_title === 'string' && row.session_title.trim() !== row.session_title) {
    errors.push(`session ${index + 1}: session_title has leading/trailing whitespace`);
  }

  if (program?.event_start && row.start_at) {
    const programStart = Date.parse(program.event_start);
    const sessionStart = Date.parse(row.start_at);
    if (!Number.isNaN(programStart) && !Number.isNaN(sessionStart) && sessionStart < programStart) {
      errors.push(`session ${index + 1}: start_at is earlier than program.event_start`);
    }
  }

  if (program?.event_end && row.end_at) {
    const programEnd = Date.parse(program.event_end);
    const sessionEnd = Date.parse(row.end_at);
    if (!Number.isNaN(programEnd) && !Number.isNaN(sessionEnd) && sessionEnd > programEnd) {
      errors.push(`session ${index + 1}: end_at is later than program.event_end`);
    }
  }

  return errors;
}

if (!exists(samplePath)) {
  throw new Error('No source file found. Expected data/demo_program.json or EVENTLIVE_SOURCE_FILE');
}

const document = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const sourceFile = path.relative(root, samplePath).replace(/\\/g, '/');

const allErrors = [];
allErrors.push(...validateObject(document, schema, 'document'));

const program = document.program ?? null;
const sessions = Array.isArray(document.sessions) ? document.sessions : [];

if (program) {
  allErrors.push(...validateProgram(program));
}

sessions.forEach((row, idx) => allErrors.push(...validateSession(row, idx, program)));

const ids = new Set();
sessions.forEach((row, idx) => {
  if (ids.has(row.id)) {
    allErrors.push(`session ${idx + 1}: duplicate id '${row.id}'`);
  }
  ids.add(row.id);
});

const allWarnings = [];
sessions.forEach((row, idx) => {
  if (Array.isArray(row.tags) && row.tags.length > 8) {
    allWarnings.push(`session ${idx + 1}: tags count is unusually high (${row.tags.length})`);
  }
});

const reportLines = [
  '# EventLive Validation Report',
  `- Source: ${sourceFile}`,
  `- Program title: ${program?.program_title || 'n/a'}`,
  `- Organizer: ${program?.organizer_name || 'n/a'}`,
  `- Total sessions: ${sessions.length}`,
  `- Total errors: ${allErrors.length}`,
  `- Total warnings: ${allWarnings.length}`,
  '',
  allErrors.length ? '## Errors' : '## Status',
  allErrors.length ? allErrors.map((e) => `- ${e}`).join('\n') : '- PASS: schema validation successful.'
];

if (allWarnings.length) {
  reportLines.push('', '## Warnings', allWarnings.map((w) => `- ${w}`).join('\n'));
}

const reportText = reportLines.join('\n');
fs.writeFileSync(path.join(reportsDir, 'validation-report.md'), reportText, 'utf8');
console.log(reportText);

if (allErrors.length) {
  process.exit(1);
}
