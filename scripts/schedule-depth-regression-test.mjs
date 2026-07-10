import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const events = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'events.json'), 'utf8')).events || [];
const nonAgendaTypes = new Set(['attendance-window', 'opening-hours']);

assert.ok(events.length > 0, 'public events must exist');
for (const event of events) {
  const substantive = (event.sessions || []).filter((session) => !nonAgendaTypes.has(session.session_type));
  assert.equal(event.official_sessions_count, substantive.length, `${event.id} official session count must exclude attendance windows and opening hours`);
  assert.equal(event.live_schedule_ready, substantive.length > 0, `${event.id} live readiness must require a substantive official session`);
  assert.equal(event.agenda_ready, substantive.length >= 2, `${event.id} agenda readiness must require at least two substantive sessions`);
  if (event.schedule_depth === 'multi-session-agenda') assert.ok(substantive.length >= 2, `${event.id} multi-session depth must be real`);
  if (event.schedule_depth === 'official-single-session') assert.equal(substantive.length, 1, `${event.id} single-session depth must be exact`);
}

const liveReady = events.filter((event) => event.live_schedule_ready).length;
const agendas = events.filter((event) => event.agenda_ready).length;
assert.ok(liveReady >= 10, 'catalog should retain multiple real official-session events');
assert.ok(agendas <= liveReady, 'multi-session agendas cannot exceed official-session events');

console.log(`SCHEDULE_DEPTH_OK events=${events.length} official_schedule_events=${liveReady} agendas=${agendas}`);
