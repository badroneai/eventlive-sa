import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'official-single-session-activation-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(reportPath), true, 'official single-session report must exist');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.ok(report.totals.activated >= 10, 'single-session activation should cover a meaningful short-event batch');
assert.equal(report.totals.activated, report.activated.length, 'activation total must match report rows');

const activatedIds = new Set(report.activated.map((row) => row.id));
for (const id of activatedIds) {
  const catalogEvent = catalogEvents.find((event) => event.id === id);
  const distEvent = distEvents.find((event) => event.id === id);
  assert.ok(catalogEvent, `${id} must exist in catalog`);
  assert.ok(distEvent, `${id} must exist in dist/events.json`);
  for (const event of [catalogEvent, distEvent]) {
    assert.equal(event.live_schedule_ready, true, `${id} must be live-ready`);
    assert.equal(event.sessions_count, 1, `${id} must expose exactly one official session`);
    assert.equal(event.sessions?.length, 1, `${id} must include one detailed session`);
    assert.match(event.sessions[0].session_type, /^official-/, `${id} session must be typed official`);
    assert.notEqual(event.sessions[0].session_type, 'attendance-window', `${id} must not be a basic attendance window`);
    assert.equal(Boolean(event.sessions[0].starts_at && event.sessions[0].ends_at), true, `${id} session must carry start/end`);
  }
}

const forbiddenIds = [
  'event-the-groves',
  'event-arabic-language-exhibition-28',
  'event-معسكر-هندسة-البرمجيات-الحديثة-وأنظمة-الذكاء-الاصطناعي'
];

for (const id of forbiddenIds) {
  const event = catalogEvents.find((row) => row.id === id);
  if (!event) continue;
  assert.equal(activatedIds.has(id), false, `${id} must not be activated by the single-session rule`);
}

console.log(`official-single-session-activation-regression-test: ok activated=${report.totals.activated}`);
