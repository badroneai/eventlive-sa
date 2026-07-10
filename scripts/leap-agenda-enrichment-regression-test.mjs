import assert from 'node:assert/strict';
import { parseLeapAgendaHtml } from './leap-agenda-utils.mjs';

function box({ title, start, end, room = '', track = '', speaker = '', url = '' }) {
  return `<div class="agenda-box">
    <div class="location-row"><ul>${room ? `<li><img src="map-pin.png"> ${room}</li>` : ''}<li><img src="clock.png"> date</li></ul></div>
    <h3><a href="${url || `https://onegiantleap.com/session/${title.toLowerCase().replace(/\s+/g, '-')}?utm_source=test`}">${title}</a></h3>
    <div class="tag-row"><ul><li>${track}</li></ul></div>
    <div class="agenda-team-row">${speaker ? `<div class="agenda-speaker"><div class="label"><span>${speaker}</span></div></div>` : ''}</div>
    <div class="button-row"><script type="application/ld+json">${JSON.stringify({ '@type': 'Event', name: title, startDate: start, endDate: end })}</script></div>
  </div>`;
}

const html = [
  box({ title: 'Stale April Session', start: '2026-04-13T12:00:00+02:00', end: '2026-04-13T12:30:00+02:00' }),
  box({ title: 'Welcome to LEAP', start: '2026-08-31T12:00:00+02:00', end: '2026-08-31T12:20:00+02:00', room: 'Leap Connect Hall 4', track: 'Opening Remarks', speaker: 'Aisha Example' }),
  box({ title: 'AI at Scale', start: '2026-09-01T14:00:00+02:00', end: '2026-09-01T14:45:00+02:00', room: 'DeepFest - Hall 5', track: 'Panel', speaker: 'Speaker One' }),
  box({ title: 'AI at Scale copy', start: '2026-09-01T14:00:00+02:00', end: '2026-09-01T14:45:00+02:00', room: 'DeepFest - Hall 5', track: 'Panel', speaker: 'Speaker One' }),
  box({ title: 'Zero Duration', start: '2026-09-02T15:00:00+02:00', end: '2026-09-02T15:00:00+02:00' }),
  box({ title: 'Closing Session', start: '2026-09-03T18:00:00+02:00', end: '2026-09-03T18:30:00+02:00', room: 'Main Stage', track: 'Closing Remarks' })
].join('\n');

const sessions = parseLeapAgendaHtml(html);
assert.equal(sessions.length, 3, 'only complete sessions inside the official LEAP 2026 window may be retained');
assert.equal(sessions[0].starts_at, '2026-08-31T12:00:00+03:00', 'published wall-clock time must be interpreted in Asia/Riyadh');
assert.equal(sessions[0].room, 'LEAP Connect - Hall 4');
assert.equal(sessions[0].track, 'Opening Remarks');
assert.equal(sessions[0].speaker, 'Aisha Example');
assert.equal(sessions[0].source_url, 'https://onegiantleap.com/session/welcome-to-leap');
assert.ok(sessions.every((session) => session.session_type === 'official-program-session'));
assert.ok(!sessions.some((session) => session.title.includes('April') || session.title.includes('Zero') || session.title.endsWith(' copy')));

console.log(`LEAP_AGENDA_ENRICHMENT_OK sessions=${sessions.length} stale_rejected=1 invalid_rejected=1 duplicate_rejected=1`);
