import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const schema = JSON.parse(fs.readFileSync(path.join(dataDir, 'schema.json'), 'utf8'));
const samplePath = path.join(dataDir, 'sample_clean.json');
const csvPath = path.join(dataDir, 'sample_clean.csv');

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

function castRowTypes(row) {
  const next = { ...row };
  ['price_sar'].forEach((k) => {
    if (next[k] !== undefined) next[k] = Number(next[k]);
  });
  ['capacity', 'available_seats'].forEach((k) => {
    if (next[k] !== undefined && next[k] !== '') next[k] = Number.parseInt(next[k], 10);
  });
  if (typeof next.tags === 'string') {
    next.tags = next.tags ? next.tags.split('|').map((x) => x.trim()).filter(Boolean) : [];
  }
  return next;
}

function validateFormat(value, format) {
  if (format === 'date-time') {
    return !Number.isNaN(Date.parse(value));
  }
  return true;
}

function validateRow(row, index) {
  const errors = [];

  for (const key of schema.required ?? []) {
    if (row[key] === undefined || row[key] === null || row[key] === '') {
      errors.push(`row ${index + 1}: missing required field '${key}'`);
    }
  }

  for (const [key, value] of Object.entries(row)) {
    const prop = schema.properties[key];
    if (!prop) {
      errors.push(`row ${index + 1}: unexpected field '${key}'`);
      continue;
    }

    if (prop.type === 'string' && typeof value !== 'string') {
      errors.push(`row ${index + 1}: field '${key}' must be string`);
    }
    if (prop.type === 'number' && typeof value !== 'number') {
      errors.push(`row ${index + 1}: field '${key}' must be number`);
    }
    if (prop.type === 'integer' && !Number.isInteger(value)) {
      errors.push(`row ${index + 1}: field '${key}' must be integer`);
    }
    if (prop.type === 'array' && !Array.isArray(value)) {
      errors.push(`row ${index + 1}: field '${key}' must be array`);
    }
    if (prop.enum && !prop.enum.includes(value)) {
      errors.push(`row ${index + 1}: field '${key}' value '${value}' is outside enum`);
    }
    if (prop.minimum !== undefined && typeof value === 'number' && value < prop.minimum) {
      errors.push(`row ${index + 1}: field '${key}' must be >= ${prop.minimum}`);
    }
    if (prop.minLength !== undefined && typeof value === 'string' && value.length < prop.minLength) {
      errors.push(`row ${index + 1}: field '${key}' must have minLength ${prop.minLength}`);
    }
    if (prop.format && typeof value === 'string' && !validateFormat(value, prop.format)) {
      errors.push(`row ${index + 1}: field '${key}' invalid format '${prop.format}'`);
    }
  }

  if (row.start_at && row.end_at) {
    const start = Date.parse(row.start_at);
    const end = Date.parse(row.end_at);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      errors.push(`row ${index + 1}: end_at is earlier than start_at`);
    }
  }

  return errors;
}

let rows = [];
let sourceFile = '';
if (exists(samplePath)) {
  rows = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  sourceFile = 'data/sample_clean.json';
} else if (exists(csvPath)) {
  rows = parseCsv(fs.readFileSync(csvPath, 'utf8')).map(castRowTypes);
  sourceFile = 'data/sample_clean.csv';
} else {
  throw new Error('No source file found. Expected data/sample_clean.json or data/sample_clean.csv');
}

const allErrors = [];
rows.forEach((row, idx) => allErrors.push(...validateRow(row, idx)));

const reportLines = [
  '# EventLive Validation Report',
  `- Source: ${sourceFile}`,
  `- Total rows: ${rows.length}`,
  `- Total errors: ${allErrors.length}`,
  '',
  allErrors.length ? '## Errors' : '## Status',
  allErrors.length ? allErrors.map((e) => `- ${e}`).join('\n') : '- PASS: schema validation successful.'
].join('\n');

fs.writeFileSync(path.join(reportsDir, 'validation-report.md'), reportLines, 'utf8');
console.log(reportLines);

if (allErrors.length) {
  process.exit(1);
}
