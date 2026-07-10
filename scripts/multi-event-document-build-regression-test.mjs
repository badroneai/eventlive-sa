import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync('data/events_catalog.json', 'utf8')).events || [];
const publicEvents = JSON.parse(fs.readFileSync('dist/events.json', 'utf8')).events || [];
const publicIds = new Set(publicEvents.map((event) => event.id));
const pdfEvents = catalog.filter((event) => (
  event.approval_status === 'published'
  && /\/saudi-calendar-ar\.pdf(?:$|[?#])/i.test(event.source_url || event.evidence_url || '')
));
const missing = pdfEvents.filter((event) => !publicIds.has(event.id));

assert.ok(pdfEvents.length > 1, 'the official summer PDF fixture must contain multiple published events');
assert.deepEqual(missing.map((event) => event.id), [], 'a shared multi-event PDF URL must not collapse distinct public events');

const pdfPublicEvents = publicEvents.filter((event) => publicIds.has(event.id) && pdfEvents.some((catalogEvent) => catalogEvent.id === event.id));
const detailUrls = pdfPublicEvents.map((event) => event.detail_url);
assert.equal(new Set(detailUrls).size, detailUrls.length, 'events from one multi-event document must retain unique detail URLs');

console.log(`MULTI_EVENT_DOCUMENT_BUILD_OK catalog=${pdfEvents.length} public=${pdfEvents.length - missing.length}`);
