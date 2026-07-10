import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.join(process.cwd(), 'dist');
const jsonPath = path.join(distDir, 'owner-status.json');
const htmlPath = path.join(distDir, 'owner-status.html');

assert.equal(fs.existsSync(jsonPath), true, 'owner-status.json must exist after build');
assert.equal(fs.existsSync(htmlPath), true, 'owner-status.html must exist after build');

const status = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');

assert.equal(status.intent, 'eventlive-owner-status');
assert.equal(typeof status.source_sync?.published_new, 'number');
assert.equal(typeof status.source_sync?.linked_existing, 'number');
assert.equal(typeof status.source_sync?.blocked_remaining, 'number');
assert.equal(typeof status.source_sync?.blocked_reasons, 'object');
assert.equal(Array.isArray(status.source_sync?.collector_error_sources), true);
assert.match(html, /أسباب الحجب في آخر دورة/);
assert.match(html, /مصادر تحتاج إصلاحًا/);
assert.match(html, /<meta name="robots" content="noindex,nofollow"/);

console.log(`OWNER_STATUS_TEST_OK blocked=${status.source_sync.blocked_remaining} errors=${status.source_sync.collector_error_sources.length}`);
