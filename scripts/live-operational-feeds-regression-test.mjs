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

const eventsFeed = readJson('events.json');
const publicEvents = eventsFeed.events || [];
const activeEvents = publicEvents.filter((event) => event.status !== 'ended');
const liveStatus = readJson('live-status.json');
const today = readJson('today.json');
const activation = readJson('activation.json');
const serviceWorker = readText('sw.js');
const activationHtml = readText('activation.html');

assert.equal(liveStatus.generated_at, eventsFeed.generated_at, 'live-status.json must be regenerated with events.json');
assert.equal(today.generated_at, eventsFeed.generated_at, 'today.json must be regenerated with events.json');
assert.equal(activation.generated_at, eventsFeed.generated_at, 'activation.json must be regenerated with events.json');

assert.equal(liveStatus.canonical_domain, 'eventme.live', 'live-status.json must keep the production domain');
assert.equal(today.canonical_domain, 'eventme.live', 'today.json must keep the production domain');
assert.equal(activation.canonical_domain, 'eventme.live', 'activation.json must keep the production domain');

for (const event of publicEvents) {
  assert.ok(Number(event.sessions_count || 0) >= (event.sessions || []).length, `${event.id} sessions_count must not be lower than extracted sessions`);
}

assert.equal(liveStatus.totals.events, publicEvents.length, 'live-status total must match events.json');
assert.equal(liveStatus.totals.live, publicEvents.filter((event) => event.status === 'live').length, 'live count must match events.json');
assert.equal(liveStatus.totals.ongoing_programs, publicEvents.filter((event) => event.status === 'ongoing').length, 'ongoing count must match events.json');
assert.equal(liveStatus.totals.upcoming, publicEvents.filter((event) => event.status === 'upcoming').length, 'upcoming count must match events.json');
assert.equal(liveStatus.totals.ended, publicEvents.filter((event) => event.status === 'ended').length, 'ended count must match events.json');
assert.equal(liveStatus.totals.live_schedule_ready, publicEvents.filter((event) => event.live_schedule_ready).length, 'ready count must match events.json');
assert.equal(liveStatus.totals.needs_activation, activeEvents.filter((event) => !event.live_schedule_ready).length, 'activation count must match events.json');
assert.equal(liveStatus.totals.attendance_window_ready, publicEvents.filter((event) => event.attendance_window_ready).length, 'attendance window count must match events.json');
assert.equal(liveStatus.totals.basic_attendance_windows, publicEvents.filter((event) => event.schedule_quality === 'basic-window').length, 'basic attendance window count must match events.json');
assert.equal(today.signals.attendance_window_ready, publicEvents.filter((event) => event.attendance_window_ready).length, 'today signals must expose attendance window readiness');
assert.equal(today.signals.basic_attendance_windows, publicEvents.filter((event) => event.schedule_quality === 'basic-window').length, 'today signals must expose basic attendance windows');

assert.equal(Array.isArray(liveStatus.events), true, 'live-status.json must include an attendance queue');
assert.equal(liveStatus.events.length, activeEvents.length, 'attendance queue must include every active event');
assert.equal(Array.isArray(today.queue), true, 'today.json must expose an attendance queue');
assert.equal(today.queue.length, activeEvents.length, 'today queue must include every active event');
assert.deepEqual(today.focus || null, today.queue[0] || null, 'today focus must be the first priority row');

for (const event of today.queue) {
  assert.ok(event.id && event.title && event.detail_url, 'today rows must be actionable');
  assert.ok(event.starts_at, `${event.id} must keep starts_at`);
  assert.ok(event.action_url, `${event.id} must provide an action_url`);
  assert.equal(typeof event.priority_score, 'number', `${event.id} must provide priority_score`);
  assert.ok(Object.hasOwn(event, 'minutes_to_start'), `${event.id} must expose minutes_to_start`);
  assert.ok(Object.hasOwn(event, 'minutes_to_end'), `${event.id} must expose minutes_to_end`);
  assert.match(event.schedule_quality || '', /^(detailed|basic-window|missing)$/, `${event.id} must expose schedule_quality`);
  if (event.attendance_window_ready) {
    assert.ok(event.attendance_window?.starts_at, `${event.id} must expose attendance window starts_at`);
    assert.ok(event.attendance_window?.ends_at, `${event.id} must expose attendance window ends_at`);
    assert.equal(event.attendance_window?.session_type, 'attendance-window', `${event.id} must identify inferred attendance windows`);
  }
}

const expectedActivation = activeEvents.filter((event) => !event.live_schedule_ready || !Number(event.sessions_count || 0)).length;
assert.equal(activation.intent, 'live-schedule-activation', 'activation.json must declare its purpose');
assert.equal(activation.totals.candidates, expectedActivation, 'activation candidates must match active events needing enrichment');
assert.equal(activation.totals.basic_window_candidates, activation.events.filter((event) => event.schedule_quality === 'basic-window').length, 'activation basic-window total must match candidate rows');
assert.equal(activation.totals.missing_window_candidates, activation.events.filter((event) => !event.attendance_window_ready).length, 'activation missing-window total must match candidate rows');
assert.equal(Array.isArray(activation.events), true, 'activation.json must include candidate rows');
assert.equal(activation.events.length, expectedActivation, 'activation rows must match totals');
assert.equal(Array.isArray(activation.source_groups), true, 'activation.json must group candidates by source');
assert.equal(activation.totals.source_groups, activation.source_groups.length, 'activation source group total must match group rows');
assert.ok(activation.source_groups.length > 0, 'activation source groups must not be empty when candidates exist');
assert.ok(activation.source_groups.every((group) => group.source_label && Number(group.candidates || 0) > 0 && group.acquisition?.route && group.acquisition?.next_action), 'activation source groups must be actionable');
assert.match(activationHtml, /مصادر التفعيل الأعلى أثرًا/, 'activation.html must render source-group priorities');
assert.match(activationHtml, /قائمة التفعيل/, 'activation.html must render the activation queue');
assert.match(activationHtml, /activation\.json/, 'activation.html must link to its JSON feed');
for (const group of activation.source_groups.slice(0, 3)) {
  assert.ok(activationHtml.includes(group.source_label), `activation.html must render top activation source group ${group.source_label}`);
}

for (const event of activation.events) {
  assert.ok(event.id && event.title && event.detail_url, 'activation rows must be actionable');
  assert.ok(event.source_label || event.source_url || event.evidence_url, `${event.id} must keep source identity`);
  assert.ok(event.priority?.key && Number.isInteger(event.priority.rank), `${event.id} must include structured priority`);
  assert.equal(Array.isArray(event.blockers), true, `${event.id} must list blockers`);
  assert.ok(event.blockers.length > 0, `${event.id} must explain why activation is needed`);
  assert.ok(event.acquisition?.route && event.acquisition?.label && event.acquisition?.next_action, `${event.id} must include an extraction acquisition plan`);
  assert.match(event.schedule_quality || '', /^(detailed|basic-window|missing)$/, `${event.id} must expose schedule_quality`);
  if (event.attendance_window_ready) {
    assert.ok(event.attendance_window?.starts_at, `${event.id} must expose attendance window starts_at`);
    assert.ok(event.attendance_window?.ends_at, `${event.id} must expose attendance window ends_at`);
  }
  assert.match(event.request_url || '', /^mailto:/, `${event.id} must include a legitimate activation request URL`);
}

for (const asset of ['./today.json', './live-status.json', './activation.json']) {
  assert.ok(serviceWorker.includes(JSON.stringify(asset)), `${asset} must be precached`);
}

console.log(`live-operational-feeds-regression-test: ok events=${publicEvents.length} active=${activeEvents.length} activation=${expectedActivation}`);
