import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collapseCuratedPublicDuplicates } from './curated-public-duplicates.mjs';

const isPublishedPdf = (event) => event.approval_status === 'published'
  && /\/saudi-calendar-ar\.pdf(?:$|[?#])/i.test(event.source_url || event.evidence_url || '');

function unrepresentedPdfEvents(catalog, publicEvents, exclusions) {
  const publicIds = new Set(publicEvents.map((event) => event.id));
  // Re-evaluate the exact current facts, not merely a registered ID. A shared
  // PDF URL is never identity evidence and cannot qualify for this exception.
  const guarded = new Map(collapseCuratedPublicDuplicates(catalog, catalog).exclusions
    .map((row) => [row.id, row.collapsed_onto]));
  const recorded = new Map(exclusions
    .filter((row) => row.reason === 'duplicate-curated-alias')
    .map((row) => [row.id, row.collapsed_onto]));
  return catalog.filter(isPublishedPdf).filter((event) => {
    if (publicIds.has(event.id)) return false;
    const primary = guarded.get(event.id);
    return !(primary && recorded.get(event.id) === primary && publicIds.has(primary));
  });
}

// Both directions: factual changes, absent evidence/canonical, and an arbitrary
// same-PDF event must still be classified as missing. Source records stay intact.
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/curated-public-duplicate-records.json', import.meta.url), 'utf8'));
const before = JSON.stringify(fixture);
const reviewed = collapseCuratedPublicDuplicates(fixture, fixture);
const pdfAlias = fixture.find(isPublishedPdf);
assert.ok(pdfAlias);
assert.deepEqual(unrepresentedPdfEvents(fixture, reviewed.events, reviewed.exclusions), []);
assert.deepEqual(unrepresentedPdfEvents(fixture, reviewed.events, []).map((row) => row.id), [pdfAlias.id], 'an unrecorded alias is missing');
const primaryId = reviewed.exclusions.find((row) => row.id === pdfAlias.id).collapsed_onto;
assert.deepEqual(unrepresentedPdfEvents(fixture, reviewed.events.filter((row) => row.id !== primaryId), reviewed.exclusions).map((row) => row.id), [pdfAlias.id], 'a missing canonical is data loss');
for (const [field, value] of Object.entries({ title: 'Different event', starts_at: '2027-10-02T00:00:00+03:00', venue: 'A different venue', time_precision: 'exact' })) {
  const changed = fixture.map((row) => row.id === pdfAlias.id ? { ...row, [field]: value } : row);
  assert.deepEqual(unrepresentedPdfEvents(changed, reviewed.events, reviewed.exclusions).map((row) => row.id), [pdfAlias.id], `changed ${field} must disable the exception`);
}
const unrelated = { ...pdfAlias, id: 'distinct-shared-pdf-event', title: 'Another event in the same PDF' };
assert.deepEqual(unrepresentedPdfEvents([...fixture, unrelated], reviewed.events, [...reviewed.exclusions, { id: unrelated.id, reason: 'duplicate-curated-alias', collapsed_onto: primaryId }]).map((row) => row.id), [unrelated.id], 'even a forged report cannot excuse a generic shared-PDF collapse');
assert.equal(JSON.stringify(fixture), before, 'checking representation must preserve source records');

const catalog = JSON.parse(fs.readFileSync('data/events_catalog.json', 'utf8')).events || [];
const publicEvents = JSON.parse(fs.readFileSync('dist/events.json', 'utf8')).events || [];
const exclusions = JSON.parse(fs.readFileSync('reports/build-record-exclusions.json', 'utf8')).excluded || [];
const publicIds = new Set(publicEvents.map((event) => event.id));
const pdfEvents = catalog.filter(isPublishedPdf);
const missing = unrepresentedPdfEvents(catalog, publicEvents, exclusions);

assert.ok(pdfEvents.length > 1, 'the official summer PDF fixture must contain multiple published events');
assert.deepEqual(missing.map((event) => event.id), [], 'a shared multi-event PDF URL must not collapse distinct public events');

const pdfPublicEvents = publicEvents.filter((event) => pdfEvents.some((catalogEvent) => catalogEvent.id === event.id));
const detailUrls = pdfPublicEvents.map((event) => event.detail_url);
assert.equal(new Set(detailUrls).size, detailUrls.length, 'events from one multi-event document must retain unique detail URLs');
const representedAliases = pdfEvents.filter((event) => !publicIds.has(event.id)).length;
console.log(`MULTI_EVENT_DOCUMENT_BUILD_OK catalog=${pdfEvents.length} public=${pdfPublicEvents.length} guarded_aliases=${representedAliases} missing=${missing.length}`);
