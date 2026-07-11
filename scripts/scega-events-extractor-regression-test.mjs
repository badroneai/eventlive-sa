import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractScegaEvents } from './collect-source-candidates.mjs';

const source = {
  id: 'scega-exhibitions-conferences',
  name: 'SCEGA ePortal Events',
  url: 'https://eportal.scega.gov.sa/home',
  owner: 'Saudi Conventions & Exhibitions General Authority'
};

const payload = JSON.stringify({
  data: {
    items: {
      item1: [
        { id: 2086, name: '---', nameAr: 'قمة التقنية الحيوية', eventDateFrom: '2026-09-14T00:00:00', eventDateTo: '2026-09-16T00:00:00', eventStartTime: '09:00:00', eventEndTime: '18:00:00', city: 'Riyadh', region: 'Riyadh', neighborhood: 'فندق ومركز المؤتمرات', eventTypeAr: 'مؤتمر' },
        { id: 2089, name: '---', nameAr: 'قمة التقنية الحيوية', eventDateFrom: '2026-09-15T00:00:00', eventDateTo: '2026-09-16T00:00:00', eventStartTime: '09:00:00', eventEndTime: '18:00:00', city: 'Riyadh', region: 'Riyadh', neighborhood: 'فندق ومركز المؤتمرات', eventTypeAr: 'مؤتمر' },
        { id: 2087, name: '---', nameAr: 'ملتقى الأخشاب الدولي', eventDateFrom: '2026-09-01T00:00:00', eventDateTo: '2026-09-03T00:00:00', eventStartTime: '14:00:00', eventEndTime: '22:00:00', city: 'Riyadh', region: 'Riyadh', neighborhood: 'مركز الرياض الدولي للمؤتمرات والمعارض', eventTypeAr: 'مؤتمر' }
      ]
    }
  }
});

const rows = extractScegaEvents(payload, source);
assert.equal(rows.length, 2, 'overlapping duplicate authority records must merge before candidate creation');
const biotech = rows.find((row) => row.title === 'قمة التقنية الحيوية');
assert.ok(biotech);
assert.equal(biotech.starts_at, '2026-09-14T09:00:00+03:00');
assert.equal(biotech.ends_at, '2026-09-16T18:00:00+03:00');
assert.deepEqual(biotech.source_record_ids, ['2086', '2089']);
assert.equal(biotech.url, 'https://eportal.scega.gov.sa/h-events-details/2086');
assert.equal(biotech.category, 'conference');
assert.equal(biotech.verification_method, 'official-public-json-api');

const registry = JSON.parse(fs.readFileSync('data/source_registry.json', 'utf8'));
const registeredSource = registry.sources.find((entry) => entry.id === source.id);
assert.ok(registeredSource, 'SCEGA source must remain registered');
assert.equal(registeredSource.collector_body.onlyUpcoming, true, 'six-hour sync must ask the authority API for upcoming events only');
assert.match(registeredSource.collector_url, /pageSize=500/, 'collector page must be large enough for the full current authority timeline');
assert.ok(registeredSource.max_ended_per_run >= 100, 'explicit manual historical maintenance must retain its source-specific capacity');

console.log(`SCEGA_EVENTS_EXTRACTOR_OK rows=${rows.length} merged_duplicates=1 scheduled_scope=upcoming-only`);
