import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
const validationReportPath = process.env.EVENTLIVE_VALIDATION_REPORT_FILE
  ? path.join(root, process.env.EVENTLIVE_VALIDATION_REPORT_FILE)
  : path.join(reportsDir, 'validation-report.md');
fs.mkdirSync(path.dirname(validationReportPath), { recursive: true });

const schema = JSON.parse(fs.readFileSync(path.join(dataDir, 'schema.json'), 'utf8'));
const configuredSource = process.env.EVENTLIVE_SOURCE_FILE;
const samplePath = configuredSource ? path.join(root, configuredSource) : path.join(dataDir, 'demo_program.json');
const configuredCatalog = process.env.EVENTLIVE_EVENTS_CATALOG_FILE;
const catalogPath = configuredCatalog ? path.join(root, configuredCatalog) : path.join(dataDir, 'events_catalog.json');
const catalogSchemaPath = path.join(dataDir, 'events-catalog.schema.json');
const configuredCandidates = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE;
const candidatesPath = configuredCandidates ? path.join(root, configuredCandidates) : path.join(dataDir, 'source_candidates.json');
const candidatesSchemaPath = path.join(dataDir, 'source-candidates.schema.json');
const configuredSourceRegistry = process.env.EVENTLIVE_SOURCE_REGISTRY_FILE;
const sourceRegistryPath = configuredSourceRegistry ? path.join(root, configuredSourceRegistry) : path.join(dataDir, 'source_registry.json');
const sourceRegistrySchemaPath = path.join(dataDir, 'source-registry.schema.json');

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
    if (prop.type === 'boolean' && typeof fieldValue !== 'boolean') {
      errors.push(`${prefix}: field '${key}' must be boolean`);
    }
    if (prop.type === 'number' && typeof fieldValue !== 'number') {
      errors.push(`${prefix}: field '${key}' must be number`);
    }
    if (prop.type === 'integer' && (!Number.isInteger(fieldValue))) {
      errors.push(`${prefix}: field '${key}' must be integer`);
    }
    if ((prop.type === 'number' || prop.type === 'integer') && typeof fieldValue === 'number' && prop.minimum !== undefined && fieldValue < prop.minimum) {
      errors.push(`${prefix}: field '${key}' must be >= ${prop.minimum}`);
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

function validateArrayOfObjects(value, arraySchema, prefix) {
  const errors = [];
  if (!Array.isArray(value)) {
    errors.push(`${prefix}: must be array`);
    return errors;
  }
  if (arraySchema.minItems !== undefined && value.length < arraySchema.minItems) {
    errors.push(`${prefix}: must contain at least ${arraySchema.minItems} item(s)`);
  }
  value.forEach((item, index) => {
    errors.push(...validateObject(item, arraySchema.items, `${prefix} ${index + 1}`));
  });
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

function validateCatalog(catalog, catalogSchema) {
  const errors = [];
  const warnings = [];
  errors.push(...validateObject(catalog, catalogSchema, 'catalog'));

  const events = Array.isArray(catalog.events) ? catalog.events : [];
  if (Array.isArray(catalog.events)) {
    errors.push(...validateArrayOfObjects(catalog.events, catalogSchema.properties.events, 'catalog event'));
  }

  const ids = new Set();
  events.forEach((event, index) => {
    const prefix = `catalog event ${index + 1}`;
    if (event.id) {
      if (ids.has(event.id)) {
        errors.push(`${prefix}: duplicate id '${event.id}'`);
      }
      ids.add(event.id);
    }

    const startsAt = event.starts_at || event.event_start;
    const endsAt = event.ends_at || event.event_end;
    if (startsAt && endsAt) {
      const start = Date.parse(startsAt);
      const end = Date.parse(endsAt);
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        errors.push(`${prefix}: ends_at is earlier than starts_at`);
      }
    }

    if (event.live_schedule_ready === true && !event.url) {
      errors.push(`${prefix}: live_schedule_ready=true requires url`);
    }
    if (event.live_schedule_ready === false && event.url) {
      errors.push(`${prefix}: live_schedule_ready=false must not include url`);
    }
    if (event.approval_status === 'published' && !['approved-source', 'organizer-confirmed'].includes(event.source_confidence)) {
      warnings.push(`${prefix}: published catalog event should have approved source confidence`);
    }
    if (Array.isArray(event.tags) && event.tags.length > 10) {
      warnings.push(`${prefix}: tags count is unusually high (${event.tags.length})`);
    }
  });

  return { errors, warnings, total: events.length };
}

function normalizeMatchValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function candidateMatchKey(row) {
  const date = String(row.starts_at || '').slice(0, 10);
  return [normalizeMatchValue(row.title), normalizeMatchValue(row.city), date].join('|');
}

function validateSourceCandidates(candidates, candidatesSchema, catalogEvents = []) {
  const errors = [];
  const warnings = [];
  errors.push(...validateObject(candidates, candidatesSchema, 'source candidates'));

  const rows = Array.isArray(candidates.candidates) ? candidates.candidates : [];
  if (Array.isArray(candidates.candidates)) {
    errors.push(...validateArrayOfObjects(candidates.candidates, candidatesSchema.properties.candidates, 'source candidate'));
  }

  const ids = new Set();
  const catalogByKey = new Map(catalogEvents.map((event) => [candidateMatchKey(event), event]));
  rows.forEach((candidate, index) => {
    const prefix = `source candidate ${index + 1}`;
    if (candidate.id) {
      if (ids.has(candidate.id)) {
        errors.push(`${prefix}: duplicate id '${candidate.id}'`);
      }
      ids.add(candidate.id);
    }

    if (candidate.starts_at && candidate.ends_at) {
      const start = Date.parse(candidate.starts_at);
      const end = Date.parse(candidate.ends_at);
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        errors.push(`${prefix}: ends_at is earlier than starts_at`);
      }
    }

    if (candidate.review_status === 'approved-for-catalog' && candidate.publication_gate !== 'catalog-review') {
      errors.push(`${prefix}: approved-for-catalog requires publication_gate='catalog-review'`);
    }
    if (candidate.review_status === 'approved-for-catalog' && candidate.confidence === 'unverified') {
      errors.push(`${prefix}: approved-for-catalog cannot use confidence='unverified'`);
    }
    if (candidate.review_status === 'ready-for-review' && !candidate.evidence_url && !candidate.raw_snapshot_path) {
      errors.push(`${prefix}: ready-for-review requires evidence_url or raw_snapshot_path`);
    }
    if (candidate.publication_gate === 'source-evidence' && candidate.review_status === 'approved-for-catalog') {
      errors.push(`${prefix}: source-evidence gate cannot be approved-for-catalog`);
    }

    const matched = catalogByKey.get(candidateMatchKey(candidate));
    const duplicateAlreadyHandled = candidate.publication_gate === 'duplicate-review'
      || candidate.matched_catalog_event_id === matched?.id;
    if (matched && !duplicateAlreadyHandled) {
      warnings.push(`${prefix}: possible duplicate of catalog event '${matched.id}'`);
    }
    if (Array.isArray(candidate.tags) && candidate.tags.length > 10) {
      warnings.push(`${prefix}: tags count is unusually high (${candidate.tags.length})`);
    }
  });

  return { errors, warnings, total: rows.length };
}

function validateSourceRegistry(registry, registrySchema) {
  const errors = [];
  const warnings = [];
  errors.push(...validateObject(registry, registrySchema, 'source registry'));

  const sources = Array.isArray(registry.sources) ? registry.sources : [];
  if (Array.isArray(registry.sources)) {
    errors.push(...validateArrayOfObjects(registry.sources, registrySchema.properties.sources, 'source registry item'));
  }

  const ids = new Set();
  const priorities = new Set();
  sources.forEach((source, index) => {
    const prefix = `source registry item ${index + 1}`;
    if (source.id) {
      if (ids.has(source.id)) {
        errors.push(`${prefix}: duplicate id '${source.id}'`);
      }
      ids.add(source.id);
    }
    if (Number.isInteger(source.priority)) {
      if (priorities.has(source.priority)) {
        warnings.push(`${prefix}: duplicate priority '${source.priority}'`);
      }
      priorities.add(source.priority);
    }
    if (source.trust_level === 'aggregator' && source.intake_policy !== 'candidate-only') {
      warnings.push(`${prefix}: aggregator sources should normally use candidate-only intake`);
    }
    if (source.intake_policy === 'partnership-needed' && source.fetch_method !== 'partnership-api') {
      warnings.push(`${prefix}: partnership-needed source should normally use partnership-api fetch method`);
    }
    if (source.trust_level === 'community' && source.candidate_gate !== 'source-evidence') {
      warnings.push(`${prefix}: community sources should normally start at source-evidence gate`);
    }
  });

  return { errors, warnings, total: sources.length };
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

let catalogSourceFile = 'not configured';
let catalogEventsTotal = 0;
let catalogEvents = [];
if (configuredCatalog && !exists(catalogPath)) {
  catalogSourceFile = path.relative(root, catalogPath).replace(/\\/g, '/');
  allErrors.push(`catalog: configured file not found '${catalogSourceFile}'`);
} else if (exists(catalogPath)) {
  const catalogSchema = JSON.parse(fs.readFileSync(catalogSchemaPath, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  catalogEvents = Array.isArray(catalog.events) ? catalog.events : [];
  catalogSourceFile = path.relative(root, catalogPath).replace(/\\/g, '/');
  const catalogResult = validateCatalog(catalog, catalogSchema);
  catalogEventsTotal = catalogResult.total;
  allErrors.push(...catalogResult.errors);
  allWarnings.push(...catalogResult.warnings);
}

let candidatesSourceFile = 'not configured';
let candidatesTotal = 0;
if (configuredCandidates && !exists(candidatesPath)) {
  candidatesSourceFile = path.relative(root, candidatesPath).replace(/\\/g, '/');
  allErrors.push(`source candidates: configured file not found '${candidatesSourceFile}'`);
} else if (exists(candidatesPath)) {
  const candidatesSchema = JSON.parse(fs.readFileSync(candidatesSchemaPath, 'utf8'));
  const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
  candidatesSourceFile = path.relative(root, candidatesPath).replace(/\\/g, '/');
  const candidatesResult = validateSourceCandidates(candidates, candidatesSchema, catalogEvents);
  candidatesTotal = candidatesResult.total;
  allErrors.push(...candidatesResult.errors);
  allWarnings.push(...candidatesResult.warnings);
}

let sourceRegistrySourceFile = 'not configured';
let sourceRegistryTotal = 0;
if (configuredSourceRegistry && !exists(sourceRegistryPath)) {
  sourceRegistrySourceFile = path.relative(root, sourceRegistryPath).replace(/\\/g, '/');
  allErrors.push(`source registry: configured file not found '${sourceRegistrySourceFile}'`);
} else if (exists(sourceRegistryPath)) {
  const sourceRegistrySchema = JSON.parse(fs.readFileSync(sourceRegistrySchemaPath, 'utf8'));
  const sourceRegistry = JSON.parse(fs.readFileSync(sourceRegistryPath, 'utf8'));
  sourceRegistrySourceFile = path.relative(root, sourceRegistryPath).replace(/\\/g, '/');
  const sourceRegistryResult = validateSourceRegistry(sourceRegistry, sourceRegistrySchema);
  sourceRegistryTotal = sourceRegistryResult.total;
  allErrors.push(...sourceRegistryResult.errors);
  allWarnings.push(...sourceRegistryResult.warnings);
}

const reportLines = [
  '# EventLive Validation Report',
  `- Source: ${sourceFile}`,
  `- Catalog source: ${catalogSourceFile}`,
  `- Source candidates: ${candidatesSourceFile}`,
  `- Source registry: ${sourceRegistrySourceFile}`,
  `- Program title: ${program?.program_title || 'n/a'}`,
  `- Organizer: ${program?.organizer_name || 'n/a'}`,
  `- Total sessions: ${sessions.length}`,
  `- Catalog events: ${catalogEventsTotal}`,
  `- Source candidates total: ${candidatesTotal}`,
  `- Source registry total: ${sourceRegistryTotal}`,
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
fs.writeFileSync(validationReportPath, reportText, 'utf8');
console.log(reportText);

if (allErrors.length) {
  process.exit(1);
}
