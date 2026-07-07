import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeArabicSearch } from './arabic-normalize.mjs';

assert.equal(normalizeArabicSearch('الذكاء الاصطناعي'), normalizeArabicSearch('ذكاء أصطناعي'));
assert.equal(normalizeArabicSearch('الذكاء الأصطناعي'), normalizeArabicSearch('ذكاء اصطناعي'));

if (fs.existsSync('dist/search-index.json')) {
  const rows = JSON.parse(fs.readFileSync('dist/search-index.json', 'utf8'));
  const query = normalizeArabicSearch('الذكاء الأصطناعي');
  const hits = rows.filter((row) => String(row.search_text || '').includes(query) || query.split(' ').every((part) => String(row.search_text || '').includes(part)));
  assert.ok(hits.length > 0, 'built search index should find AI wording variants');
}

console.log('search-regression-test: ok');
