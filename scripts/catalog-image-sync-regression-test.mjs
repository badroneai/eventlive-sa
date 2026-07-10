import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-catalog-image-sync-'));
const catalogPath = path.join(tmp, 'events_catalog.json');
const candidatesPath = path.join(tmp, 'source_candidates.json');
const reportJsonPath = path.join(tmp, 'report.json');
const reportMdPath = path.join(tmp, 'report.md');

fs.writeFileSync(catalogPath, `${JSON.stringify({
  events: [
    {
      id: 'event-official-image',
      title: 'Official Image Workshop',
      source_label: 'Future Skills MCIT Catalogue',
      source_url: 'https://futureskills.mcit.gov.sa/ar/group/1',
      starts_at: '2026-07-12T09:00:00+03:00'
    },
    {
      id: 'event-untrusted-image',
      title: 'Untrusted Image Workshop',
      source_label: 'Community Source',
      source_url: 'https://example.com/event',
      starts_at: '2026-07-12T09:00:00+03:00'
    },
    {
      id: 'event-pinned-icon',
      title: 'Pinned Icon Recovery Workshop',
      source_label: 'Official Recovery Source',
      source_url: 'https://official.example.sa/events/recovery',
      starts_at: '2026-07-13T09:00:00+03:00',
      image_url: 'https://official.example.sa/theme/safari-pinned-tab.png',
      original_image_url: 'https://official.example.sa/theme/safari-pinned-tab.png'
    }
  ]
}, null, 2)}\n`, 'utf8');

fs.writeFileSync(candidatesPath, `${JSON.stringify({
  candidates: [
    {
      title: 'Official Image Workshop',
      source_label: 'Future Skills MCIT Catalogue',
      source_url: 'https://futureskills.mcit.gov.sa/ar/group/1',
      starts_at: '2026-07-12T09:00:00+03:00',
      confidence: 'official',
      image_url: 'https://futureskills.mcit.gov.sa/sites/default/files/styles/medium/public/2026-07/course.jpg?itok=ok',
      image_alt: 'Course image',
      image_source_url: 'https://futureskills.mcit.gov.sa/ar/group/1'
    },
    {
      title: 'Untrusted Image Workshop',
      source_label: 'Community Source',
      source_url: 'https://example.com/event',
      starts_at: '2026-07-12T09:00:00+03:00',
      confidence: 'community',
      image_url: 'https://example.com/uploads/event.jpg'
    },
    {
      title: 'Pinned Icon Recovery Workshop',
      source_label: 'Official Recovery Source',
      source_url: 'https://official.example.sa/events/recovery',
      starts_at: '2026-07-13T09:00:00+03:00',
      confidence: 'official',
      image_url: 'https://official.example.sa/uploads/recovery-1100x500.jpg',
      image_alt: 'Recovery workshop artwork'
    }
  ]
}, null, 2)}\n`, 'utf8');

process.env.EVENTLIVE_EVENTS_CATALOG_FILE = path.relative(root, catalogPath);
process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE = path.relative(root, candidatesPath);
process.env.EVENTLIVE_CATALOG_IMAGE_SYNC_REPORT_JSON = path.relative(root, reportJsonPath);
process.env.EVENTLIVE_CATALOG_IMAGE_SYNC_REPORT_MD = path.relative(root, reportMdPath);

await import('./sync-catalog-images-from-candidates.mjs');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const official = catalog.events.find((event) => event.id === 'event-official-image');
const untrusted = catalog.events.find((event) => event.id === 'event-untrusted-image');
const recovered = catalog.events.find((event) => event.id === 'event-pinned-icon');
const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'));

assert.equal(official.image_url, 'https://futureskills.mcit.gov.sa/sites/default/files/styles/medium/public/2026-07/course.jpg?itok=ok');
assert.equal(official.original_image_url, official.image_url);
assert.equal(official.image_alt, 'Course image');
assert.equal(official.image_discovery_method, 'catalog-candidate');
assert.equal(untrusted.image_url, undefined, 'untrusted candidates must not enrich published catalog events');
assert.equal(recovered.image_url, 'https://official.example.sa/uploads/recovery-1100x500.jpg', 'a generic pinned-tab icon must be replaced by trusted event artwork');
assert.equal(recovered.image_alt, 'Recovery workshop artwork');
assert.equal(report.synced, 2);

console.log('catalog-image-sync-regression-test: ok');
