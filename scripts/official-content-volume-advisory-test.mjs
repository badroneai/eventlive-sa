import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const published = catalogEvents.filter((event) => event.approval_status === 'published');

const hayyJameelEvents = published.filter((event) => event.source_label === "Hayy Jameel What's On");
assert.ok(hayyJameelEvents.length >= 10, 'Hayy Jameel must retain broad official Jeddah coverage');
assert.equal(
  hayyJameelEvents.every((event) => /hayyjameel\.org\/wp-content\/uploads\//i.test(event.original_image_url || event.image_url || '')),
  true,
  'Hayy Jameel events must preserve their own high-resolution programme artwork'
);
assert.equal(
  hayyJameelEvents.every((event) => !/Shop Art Jameel|Explore Hayy Jameel|Venue Hire/i.test(event.program_outline?.official_description || '')),
  true,
  'Hayy Jameel official descriptions must not contain site navigation text'
);
assert.equal(
  hayyJameelEvents.every((event) => !/Shop Art Jameel|Explore Hayy Jameel|Venue Hire/i.test(`${event.description || ''} ${event.rich_summary || ''}`)),
  true,
  'Hayy Jameel rich descriptions must remain free of site navigation text'
);

const ithraEvents = published.filter((event) => event.source_label === 'Ithra Events');
assert.ok(ithraEvents.length >= 100, 'Ithra official index should contribute broad active coverage');

console.log(`official-content-volume-advisory-test: ok published=${published.length} hayyJameel=${hayyJameelEvents.length} ithra=${ithraEvents.length}`);
