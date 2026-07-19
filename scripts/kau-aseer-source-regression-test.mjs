import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  baseCandidate,
  extractDiscoverAseerEvents,
  extractKauEvents,
  extractKaustEvents,
  loadSourceExtraction,
  partitionSourceItems,
  sourceExtractors
} from './collect-source-candidates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (name) => fs.readFileSync(path.join(root, 'scripts', 'fixtures', name), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'source_registry.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'events_catalog.json'), 'utf8'));
const referenceDate = new Date('2026-07-19T00:00:00+03:00');

const hayySourceRegistry = registry.sources.find((source) => source.id === 'hayy-jameel-events');
assert.ok(hayySourceRegistry, 'Hayy Jameel source must remain registered');
assert.equal(hayySourceRegistry.trust_level, 'venue-official');
assert.equal(hayySourceRegistry.fetch_method, 'sitemap-pages');
assert.equal(hayySourceRegistry.collector_url, 'https://hayyjameel.org/whats-on-sitemap.xml');

const saudiconSource = registry.sources.find((source) => source.id === 'saudicon-events');
assert.ok(saudiconSource, 'Saudicon source must be registered');
assert.equal(saudiconSource.trust_level, 'aggregator');
assert.equal(saudiconSource.intake_policy, 'candidate-only');

const kauSource = registry.sources.find((source) => source.id === 'kau-events');
assert.ok(kauSource, 'KAU must be registered as an independent source');
assert.equal(kauSource.trust_level, 'official');
assert.equal(kauSource.fetch_method, 'html-listing');
assert.equal(sourceExtractors['kau-events'], extractKauEvents);
assert.equal(sourceExtractors['saudi-university-events'], extractKaustEvents);
assert.doesNotMatch(extractKaustEvents.toString(), /extractKauEvents|kau\.edu\.sa/i,
  'KAUST extractor must not fetch or invoke the independent KAU source');

const kauExtraction = await loadSourceExtraction(kauSource, sourceExtractors[kauSource.id], {
  fetchPrimary: async () => fixture('kau-events-page.html')
});
assert.equal(kauExtraction.items.length, 2);
const kauPartition = partitionSourceItems(kauExtraction.items, kauSource, { referenceDate });
assert.equal(kauPartition.activeItems.length, 2);
const kauCandidates = kauPartition.activeItems.map((item) => baseCandidate(kauSource, item, 'scripts/fixtures/kau-events-page.html'));
assert.ok(kauCandidates.every((candidate) => candidate.source_label === 'King Abdulaziz University Events'));
assert.ok(kauCandidates.every((candidate) => candidate.source_owner === 'King Abdulaziz University'));
assert.ok(kauCandidates.every((candidate) => candidate.confidence === 'official'));
assert.equal(kauCandidates.filter((candidate) => candidate.city === 'Jeddah' && new Date(candidate.starts_at) > referenceDate).length, 1);
const catalogKauEvents = catalog.events.filter((event) => event.source_label === 'King Abdulaziz University Events');
assert.equal(catalogKauEvents.length, 2, 'both live KAU rows must reach the catalog under the independent source identity');
assert.ok(catalogKauEvents.every((event) => event.source_url.startsWith('https://kau.edu.sa/en/event/')));

const aseerSource = registry.sources.find((source) => source.id === 'discover-aseer-events');
const aseerHubHtml = fixture('discover-aseer-events-page.html');
const aseerSeasonHtml = fixture('discover-aseer-summer-season-page.html');
const aseerExperiences = await extractDiscoverAseerEvents(aseerHubHtml, { ...aseerSource, skip_snapshot: true }, {
  fetchSeasonHtml: async () => aseerSeasonHtml
});
assert.equal(aseerExperiences.length, 2, 'verified season cards must replace the umbrella season row');
assert.deepEqual(aseerExperiences.map((event) => event.title), ['Summer and Samra', 'Perfume Week']);
assert.ok(aseerExperiences.every((event) => event.verification_method === 'official-season-detail-listing'));
assert.ok(aseerExperiences.every((event) => event.url.includes('/en/experiences/')));

const aseerFallback = await extractDiscoverAseerEvents(aseerHubHtml, { ...aseerSource, skip_snapshot: true }, {
  fetchSeasonHtml: async () => '<html><body>No verified experience cards</body></html>'
});
assert.equal(aseerFallback.length, 1, 'season umbrella must remain when no real detail cards are available');
assert.equal(aseerFallback[0].title, 'Summer Season 2026');
assert.equal(catalog.events.some((event) => event.id === 'event-aseer-season'), false,
  'the umbrella season must not remain after verified detail events reach the catalog');
assert.ok(catalog.events.filter((event) => event.source_label === 'Discover Aseer Events' && event.source_url.includes('/experiences/')).length >= 31,
  'verified Discover Aseer experience pages must reach the catalog');

console.log(`KAU_ASEER_SOURCE_REGRESSION_OK kau_events=${kauExtraction.items.length} kau_future_jeddah=${kauCandidates.filter((candidate) => new Date(candidate.starts_at) > referenceDate).length} aseer_detail_events=${aseerExperiences.length} aseer_fallback=${aseerFallback.length}`);
