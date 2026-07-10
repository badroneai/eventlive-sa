import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeArabicSearch } from './arabic-normalize.mjs';
import { normalizeSaudiCity } from './city-utils.mjs';

const eventsPath = path.join(process.cwd(), 'dist', 'events.json');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')).events || [];
const keys = new Map();
for (const event of events) {
  const key = [
    normalizeArabicSearch(event.title),
    normalizeSaudiCity(event.city, event.city),
    event.starts_at,
    event.ends_at,
    normalizeArabicSearch(event.source_label || event.organizer)
  ].join('|');
  keys.set(key, (keys.get(key) || 0) + 1);
}
const duplicates = [...keys.entries()].filter(([, count]) => count > 1);
assert.deepEqual(duplicates, [], `public event feed contains ${duplicates.length} exact duplicate groups`);

console.log(`PUBLIC_DEDUPE_TEST_OK events=${events.length} duplicate_groups=0`);
