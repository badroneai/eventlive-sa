// Validates data/city_places.json against data/city-places.schema.json
// (EVENTME-CITY-PROFILES-BRIEF.md destination layer) plus domain rules the
// schema itself cannot express. Wired into `npm run validate` (blocking —
// per GATES-GOVERNANCE.md this is a blocking-structural check: it only
// fails on a malformed data file, never on upstream source drift, so it
// belongs in the always-on validate chain, not a report-only battery).
//
// Two layers:
//  1. A small generic JSON Schema interpreter (subset: type, required,
//     enum, minLength, pattern, minimum/maximum, minItems, additionalProperties,
//     properties, items, format date/date-time) walks data/city-places.schema.json
//     against the file — this IS "JSON-schema-style validation", not just a
//     schema file kept for documentation.
//  2. Domain rules the schema format can't express: cross-city id/slug
//     uniqueness, and source-field completeness BY ORIGIN TYPE (a Wikidata
//     place needs a Q-id, an OSM place needs a node/way/relation id, an
//     editorial place needs an official_link — see the per-origin checks
//     below and SCHEMA.md's "لا اختلاق أبدًا" rule). These are still hard
//     errors: an un-auditable source is exactly what that rule forbids.
//
// Content-quality guidance from the brief (category balance, place-count
// tiers) is intentionally NOT enforced here as a hard failure — the brief
// itself says a thin city should "report the gap honestly rather than
// padding" (EVENTME-CITY-PROFILES-BRIEF.md, الخطة المرحلية). Those checks
// run as non-blocking warnings only.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataPath = process.env.EVENTLIVE_CITY_PLACES_FILE
  ? path.join(root, process.env.EVENTLIVE_CITY_PLACES_FILE)
  : path.join(root, 'data', 'city_places.json');
const schemaPath = path.join(root, 'data', 'city-places.schema.json');

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

if (!fs.existsSync(dataPath)) {
  console.error(`VALIDATE_CITY_PLACES_FAIL missing data file: ${path.relative(root, dataPath)}`);
  process.exit(1);
}
if (!fs.existsSync(schemaPath)) {
  console.error(`VALIDATE_CITY_PLACES_FAIL missing schema file: ${path.relative(root, schemaPath)}`);
  process.exit(1);
}

let data;
let schema;
try {
  data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
  console.error(`VALIDATE_CITY_PLACES_FAIL malformed JSON in ${path.relative(root, dataPath)}: ${error.message}`);
  process.exit(1);
}
try {
  schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
} catch (error) {
  console.error(`VALIDATE_CITY_PLACES_FAIL malformed JSON in ${path.relative(root, schemaPath)}: ${error.message}`);
  process.exit(1);
}

// --- Layer 1: generic JSON Schema (subset) interpreter -------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateAgainstSchema(value, nodeSchema, pointer) {
  if (!nodeSchema || typeof nodeSchema !== 'object') return;

  if (nodeSchema.type) {
    const expected = nodeSchema.type;
    const actual = typeOf(value);
    const matches = expected === 'integer'
      ? actual === 'number' && Number.isInteger(value)
      : actual === expected;
    if (!matches) {
      fail(`${pointer}: expected type "${expected}", got "${actual}"`);
      return;
    }
  }

  if (nodeSchema.enum && !nodeSchema.enum.includes(value)) {
    fail(`${pointer}: "${value}" is not one of [${nodeSchema.enum.join(', ')}]`);
  }

  if (typeof value === 'string') {
    if (typeof nodeSchema.minLength === 'number' && value.trim().length < nodeSchema.minLength) {
      fail(`${pointer}: must be at least ${nodeSchema.minLength} character(s), got empty/short value`);
    }
    if (nodeSchema.pattern && !new RegExp(nodeSchema.pattern).test(value)) {
      fail(`${pointer}: "${value}" does not match pattern ${nodeSchema.pattern}`);
    }
    if (nodeSchema.format === 'date' && !DATE_RE.test(value)) {
      fail(`${pointer}: "${value}" is not a YYYY-MM-DD date`);
    }
    if (nodeSchema.format === 'date-time' && !DATE_TIME_RE.test(value)) {
      fail(`${pointer}: "${value}" is not an ISO date-time`);
    }
  }

  if (typeof value === 'number') {
    if (typeof nodeSchema.minimum === 'number' && value < nodeSchema.minimum) {
      fail(`${pointer}: ${value} is below minimum ${nodeSchema.minimum}`);
    }
    if (typeof nodeSchema.maximum === 'number' && value > nodeSchema.maximum) {
      fail(`${pointer}: ${value} is above maximum ${nodeSchema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof nodeSchema.minItems === 'number' && value.length < nodeSchema.minItems) {
      fail(`${pointer}: must have at least ${nodeSchema.minItems} item(s), got ${value.length}`);
    }
    if (nodeSchema.items) {
      value.forEach((item, index) => validateAgainstSchema(item, nodeSchema.items, `${pointer}[${index}]`));
    }
  }

  if (typeOf(value) === 'object') {
    for (const requiredKey of nodeSchema.required || []) {
      if (!(requiredKey in value)) fail(`${pointer}: missing required field "${requiredKey}"`);
    }
    if (nodeSchema.additionalProperties === false) {
      const allowed = new Set(Object.keys(nodeSchema.properties || {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) fail(`${pointer}: unexpected field "${key}" not declared in schema`);
      }
    }
    for (const [key, propSchema] of Object.entries(nodeSchema.properties || {})) {
      if (key in value) validateAgainstSchema(value[key], propSchema, `${pointer}.${key}`);
    }
  }
}

validateAgainstSchema(data, schema, '$');

// Bail before domain-rule checks if the shape itself is broken — they index
// into fields the schema pass may not have found.
if (errors.length) {
  console.error(`VALIDATE_CITY_PLACES_FAIL ${errors.length} schema error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

// --- Layer 2: domain rules -------------------------------------------------

const seenCitySlugs = new Set();
const seenPlaceIds = new Set();
const originIdPatterns = {
  wikidata: { pattern: /^Q\d+$/, hint: 'a Wikidata Q-id like "Q12345"' },
  osm: { pattern: /^(node|way|relation)\/\d+$/, hint: 'an OSM element id like "node/123456789"' }
};

for (const city of data.cities || []) {
  const cityPointer = `city_slug="${city.city_slug}"`;
  if (seenCitySlugs.has(city.city_slug)) fail(`${cityPointer}: duplicate city_slug`);
  seenCitySlugs.add(city.city_slug);

  const categoriesSeen = new Set();
  for (const place of city.places || []) {
    const placePointer = `${cityPointer} place id="${place.id}"`;
    if (!place.id.startsWith(`${city.city_slug}-`)) {
      warn(`${placePointer}: id should be prefixed with the city slug per SCHEMA.md convention`);
    }
    if (seenPlaceIds.has(place.id)) fail(`${placePointer}: duplicate place id (ids must be globally unique)`);
    seenPlaceIds.add(place.id);
    categoriesSeen.add(place.category);

    // Saudi Arabia bounding box (generous margins: covers Farasan Islands in
    // the south, Arar in the north, the Red Sea coast, and the Gulf coast).
    // Not in the JSON schema (schema keeps the universal -90/90, -180/180
    // range) because this constraint is specific to this dataset's domain,
    // not to the "coordinates" shape in general.
    const { lat, lon } = place.coordinates;
    if (lat < 15 || lat > 33 || lon < 33 || lon > 57) {
      fail(`${placePointer}: coordinates (${lat}, ${lon}) fall outside the expected Saudi Arabia bounding box (lat 15..33, lon 33..57) — check for a swapped lat/lon or a wrong source match`);
    }

    // Source completeness BY ORIGIN TYPE (SCHEMA.md hard rule #1: "لا
    // اختلاق أبدًا" — every place must have an auditable source).
    const origin = place.source?.origin;
    const sourceId = place.source?.source_id || '';
    if (origin === 'wikidata' || origin === 'osm') {
      const { pattern, hint } = originIdPatterns[origin];
      if (!pattern.test(sourceId)) {
        fail(`${placePointer}: origin "${origin}" requires source_id to look like ${hint}, got "${sourceId}"`);
      }
    } else if (origin === 'moc') {
      if (sourceId.trim().length < 3) {
        fail(`${placePointer}: origin "moc" requires a non-trivial dataset reference in source_id`);
      }
    } else if (origin === 'editorial') {
      if (!place.official_link || !place.official_link.trim()) {
        fail(`${placePointer}: origin "editorial" requires official_link (SCHEMA.md: only allowed for a famous place verified via an official page)`);
      }
      if (sourceId.trim().length < 3) {
        fail(`${placePointer}: origin "editorial" requires a source_id referencing the verifying page`);
      }
    }

    // Bilingual non-empty text (schema minLength:1 already checks presence;
    // this catches whitespace-only strings the length check on the raw
    // value could miss depending on trimming order).
    for (const field of ['name_ar', 'name_en', 'description_ar', 'description_en']) {
      if (!String(place[field] || '').trim()) fail(`${placePointer}: ${field} must not be empty/whitespace-only`);
    }
  }
  for (const field of ['intro_ar', 'intro_en']) {
    if (!String(city[field] || '').trim()) fail(`${cityPointer}: ${field} must not be empty/whitespace-only`);
  }

  // Soft guidance only (brief explicitly allows thin cities) — reported, not blocking.
  if (categoriesSeen.size < 3) {
    warn(`${cityPointer}: covers only ${categoriesSeen.size} place categor${categoriesSeen.size === 1 ? 'y' : 'ies'} (brief target: >=3 where the city genuinely has them)`);
  }
}

if (errors.length) {
  console.error(`VALIDATE_CITY_PLACES_FAIL ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const cityCount = (data.cities || []).length;
const placeCount = (data.cities || []).reduce((sum, city) => sum + (city.places || []).length, 0);
console.log(`VALIDATE_CITY_PLACES_OK cities=${cityCount} places=${placeCount} warnings=${warnings.length}`);
for (const warning of warnings) console.log(`  ! ${warning}`);
