import assert from 'node:assert/strict';
import { normalizeArabicSearch } from './arabic-normalize.mjs';
import { normalizeSaudiCity } from './city-utils.mjs';

function dedupeKey(row) {
  const start = new Date(row.starts_at).getTime();
  const day = Number.isFinite(start) ? Math.round(start / 86400000) : 0;
  return `${normalizeArabicSearch(row.title)}|${normalizeSaudiCity(row.city, row.city)}|${day}`;
}

const oxfordA = { title: 'Oxford Future of Real Estate Programme', city: 'Riyadh', starts_at: '2026-08-05T09:00:00+03:00' };
const oxfordB = { title: 'Oxford  Future  of Real Estate Programme', city: 'الرياض', starts_at: '2026-08-05T10:00:00+03:00' };
const familyRows = [
  { title: 'Family Office Investment Meeting', city: 'Riyadh', starts_at: '2026-09-02T09:00:00+03:00' },
  { title: 'Family Office Investment Meeting', city: 'Riyadh', starts_at: '2026-09-02T12:00:00+03:00' },
  { title: 'Family Office Investment Meeting', city: 'الرياض', starts_at: '2026-09-02T14:00:00+03:00' }
];

assert.equal(dedupeKey(oxfordA), dedupeKey(oxfordB));
assert.equal(new Set(familyRows.map(dedupeKey)).size, 1);

console.log('dedupe-regression-test: ok');
