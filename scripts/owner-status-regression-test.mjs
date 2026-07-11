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
assert.equal(typeof status.source_sync?.no_growth_streak, 'number');
assert.equal(typeof status.source_sync?.new_active_candidates, 'number');
assert.equal(typeof status.source_sync?.new_ended_events, 'number');
assert.equal(typeof status.source_sync?.lost_published_output, 'boolean');
assert.equal(typeof status.source_sync?.due_sources, 'number');
assert.equal(typeof status.source_sync?.deferred_sources, 'number');
assert.equal(typeof status.source_sync?.persistent_collector_errors, 'number');
assert.equal(typeof status.source_sync?.diagnostics_status, 'string');
assert.ok(status.source_sync?.public_delta === 'baseline' || typeof status.source_sync?.public_delta === 'number');
assert.equal(typeof status.source_sync?.blocked_reasons, 'object');
assert.equal(Array.isArray(status.source_sync?.collector_error_sources), true);
assert.match(html, /أسباب الحجب في آخر دورة/);
assert.match(html, /مصادر تحتاج إصلاحًا/);
assert.match(html, /اتجاه نمو الكتالوج/);
assert.match(html, /دورات متتالية بلا نمو/);
assert.match(html, /مؤجلة بجدولة تكيفية/);
assert.match(html, /<meta name="robots" content="noindex,nofollow"/);

console.log(`OWNER_STATUS_TEST_OK blocked=${status.source_sync.blocked_remaining} errors=${status.source_sync.collector_error_sources.length}`);
