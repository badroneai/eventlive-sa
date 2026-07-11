import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceRunLimits } from './collect-source-candidates.mjs';

const registry = JSON.parse(fs.readFileSync('data/source_registry.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('data/source-registry.schema.json', 'utf8'));
const collector = fs.readFileSync('scripts/collect-source-candidates.mjs', 'utf8');
const source = registry.sources.find((item) => item.id === 'visit-saudi-calendar-pdf');
const riyadhSource = registry.sources.find((item) => item.id === 'riyadh-city-events');
const sourceProperties = schema.properties.sources.items.properties;

assert.ok(source, 'Visit Saudi summer PDF source must remain registered');
assert.ok(source.max_candidates_per_run >= 100, 'high-yield official calendars must not be truncated at the global default');
assert.ok(source.max_ended_per_run >= 100, 'official historical rows must not be truncated at the global default');
assert.ok(riyadhSource.max_candidates_per_run >= 100, 'high-volume Riyadh official events must not repeat the same 40-row window forever');
assert.ok(sourceProperties.max_candidates_per_run, 'source registry schema must support source-specific active limits');
assert.ok(sourceProperties.max_ended_per_run, 'source registry schema must support source-specific ended limits');
assert.equal(sourceRunLimits({ trust_level: 'official', intake_policy: 'official-feed-preferred' }).active, 200, 'trusted official sources must receive the high-yield active default');
assert.equal(sourceRunLimits({ trust_level: 'official', intake_policy: 'official-feed-preferred' }).ended, 0, 'default collection must not allocate ended-event capacity');
assert.equal(sourceRunLimits({ trust_level: 'official', intake_policy: 'official-feed-preferred' }, { includeEnded: true }).ended, 200, 'manual historical collection must retain the high-yield ended default');
assert.equal(sourceRunLimits({ trust_level: 'official', intake_policy: 'official-feed-preferred' }, { includeEnded: false }).ended, 0, 'future-only collection must override source-specific archive capacity');
assert.equal(sourceRunLimits({ trust_level: 'community', intake_policy: 'candidate-only' }).active, 40, 'discovery-only sources must retain the conservative default');
assert.equal(sourceRunLimits({ trust_level: 'official', intake_policy: 'official-feed-preferred', max_candidates_per_run: 12 }).active, 12, 'explicit source limits must remain authoritative');
assert.match(collector, /sourceRunLimits\(source, \{ includeEnded \}\)/, 'collector must apply the shared time-scope-aware source limit policy');

console.log(`SOURCE_LIMIT_POLICY_OK active=${source.max_candidates_per_run} scheduled_ended=0 manual_ended=${source.max_ended_per_run}`);
