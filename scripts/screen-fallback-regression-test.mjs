import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

function readJson(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist; run npm run build first`);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function readText(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(fullPath, 'utf8');
}

const events = readJson('events.json');
const today = readJson('today.json');
const updates = readJson('updates.json');
const liveStatus = readJson('live-status.json');
const screen = readText('screen.html');
const match = screen.match(/const fallbackToday = (\{[\s\S]*?\});\n\s*const controls =/);

assert.ok(match, 'screen.html must embed fallbackToday before controls');
const fallback = JSON.parse(match[1]);

assert.equal(fallback.generated_at, today.generated_at, 'screen fallback must be regenerated with today.json');
assert.equal(fallback.generated_at, events.generated_at, 'screen fallback must match events.json generation time');
assert.deepEqual(fallback.focus, today.focus, 'screen fallback focus must match today.json');
assert.equal(fallback.queue.length, today.queue.length, 'screen fallback queue must match today.json');
assert.equal(fallback.signals.events, events.events.length, 'screen fallback event signal must match events.json');
assert.equal(fallback.signals.actionable, today.queue.length, 'screen fallback actionable signal must match today queue');
assert.equal(fallback.signals.live_schedule_ready, liveStatus.totals.live_schedule_ready, 'screen fallback ready signal must match live-status.json');
assert.equal(fallback.live_updates.totals.updates, updates.totals.updates, 'screen fallback update count must match updates.json');
assert.equal(fallback.live_updates.totals.urgent, updates.totals.urgent, 'screen fallback urgent updates must match updates.json');
assert.equal(fallback.live_updates.focus?.id || '', updates.focus?.id || '', 'screen fallback update focus must match updates.json');

for (const forbidden of [
  '2026-07-05T07:31:50.651Z',
  '"events":340',
  'categories/conferences-forums.html',
  'categories/technology-bootcamp.html',
  'categories/sports-families.html'
]) {
  assert.equal(screen.includes(forbidden), false, `screen.html must not keep stale embedded value: ${forbidden}`);
}

assert.match(screen, /"dateModified":"[^"]+"/, 'screen structured data must expose dateModified');
assert.match(screen, new RegExp(`"dateModified":"${events.generated_at.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), 'screen structured data dateModified must match build time');

console.log(`screen-fallback-regression-test: ok events=${events.events.length} queue=${today.queue.length} updates=${updates.totals.updates}`);
