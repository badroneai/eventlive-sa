import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = JSON.parse(fs.readFileSync('data/source_registry.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('data/source-registry.schema.json', 'utf8'));
const collector = fs.readFileSync('scripts/collect-source-candidates.mjs', 'utf8');
const source = registry.sources.find((item) => item.id === 'visit-saudi-calendar-pdf');
const sourceProperties = schema.properties.sources.items.properties;

assert.ok(source, 'Visit Saudi summer PDF source must remain registered');
assert.ok(source.max_candidates_per_run >= 100, 'high-yield official calendars must not be truncated at the global default');
assert.ok(source.max_ended_per_run >= 100, 'official historical rows must not be truncated at the global default');
assert.ok(sourceProperties.max_candidates_per_run, 'source registry schema must support source-specific active limits');
assert.ok(sourceProperties.max_ended_per_run, 'source registry schema must support source-specific ended limits');
assert.match(collector, /source\.max_candidates_per_run\s*\|\|\s*maxPerSource/, 'collector must honor the source-specific active limit');
assert.match(collector, /source\.max_ended_per_run\s*\|\|\s*maxArchivePerSource/, 'collector must honor the source-specific ended limit');

console.log(`SOURCE_LIMIT_POLICY_OK active=${source.max_candidates_per_run} ended=${source.max_ended_per_run}`);
