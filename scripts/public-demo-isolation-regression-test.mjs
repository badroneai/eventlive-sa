import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(distDir, name), 'utf8'));

const events = readJson('events.json').events || [];
const updates = readJson('updates.json').updates || [];
const liveStatus = readJson('live-status.json');
const publicPayload = JSON.stringify({ events, updates, liveStatus });

assert.equal(events.some((event) => event.id === 'demo-event'), false, 'public catalog must exclude the internal demo event');
assert.equal(events.some((event) => /ملتقى التحول الرقمي في القطاع الحكومي 2026/.test(event.title || '')), false, 'public catalog must exclude the demo title');
assert.equal(/UPD-00[1-4]/.test(publicPayload), false, 'public operational feeds must exclude demo live updates');
assert.equal(fs.existsSync(path.join(distDir, 'events', 'demo-event.html')), false, 'public build must not emit the demo detail page');
assert.equal(fs.existsSync(path.join(distDir, 'events', 'demo-event.json')), false, 'public build must not emit the demo JSON page');
assert.equal(fs.existsSync(path.join(distDir, 'events', 'demo-event.ics')), false, 'public build must not emit the demo calendar file');

console.log(`PUBLIC_DEMO_ISOLATION_OK events=${events.length} updates=${updates.length}`);
