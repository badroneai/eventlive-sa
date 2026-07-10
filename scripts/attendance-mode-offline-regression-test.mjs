import assert from 'node:assert/strict';
import fs from 'node:fs';

const eventsEnvelope = JSON.parse(fs.readFileSync('dist/events.json', 'utf8'));
const events = Array.isArray(eventsEnvelope) ? eventsEnvelope : eventsEnvelope.events;
const target = events.find((event) => event.status !== 'ended' && event.detail_url && event.file_slug && event.ics_url);
assert.ok(target, 'build must contain an upcoming event suitable for attendance mode');

const htmlPath = `dist/${target.detail_url.replace(/^\.\//, '')}`;
const html = fs.readFileSync(htmlPath, 'utf8');
const serviceWorker = fs.readFileSync('dist/sw.js', 'utf8');
const attendancePage = fs.readFileSync('dist/attendance.html', 'utf8');

assert.match(html, /data-attendance-save/, 'upcoming event pages must expose the attendance-save control');
assert.match(html, /eventlive-attendance-events/, 'attendance mode must persist saved events locally');
assert.match(html, /CACHE_EVENT_ASSETS/, 'attendance mode must request an explicit offline event bundle');
assert.match(html, /attendance_mode_saved/, 'attendance mode use must be measurable');
assert.match(serviceWorker, /self\.addEventListener\('message'/, 'service worker must accept event-bundle cache messages');
assert.match(serviceWorker, /CACHE_EVENT_ASSETS_RESULT/, 'service worker must acknowledge the number of cached assets');
assert.ok(serviceWorker.includes('/events\\/.+\\.(?:json|ics)'), 'event JSON and ICS files must use runtime caching');
assert.match(serviceWorker, /caches\.match\('\.\/index\.html'\)/, 'offline navigation must have a stable fallback');
assert.match(attendancePage, /eventlive-attendance-events/, 'attendance dashboard must read the same local saved-event store');
assert.match(attendancePage, /data-attendance-list/, 'attendance dashboard must expose the saved-event list');
assert.match(attendancePage, /data-network-state/, 'attendance dashboard must explain its current online/offline state');
assert.match(attendancePage, /attendance_mode_removed/, 'attendance dashboard removals must be measurable');
assert.ok(serviceWorker.includes(JSON.stringify('./attendance.html')), 'attendance dashboard must be available offline');
assert.doesNotMatch(fs.readFileSync('dist/sitemap.xml', 'utf8'), /attendance\.html/, 'personal attendance dashboard must not be indexed');

console.log(`ATTENDANCE_MODE_OFFLINE_OK event=${target.id}`);
