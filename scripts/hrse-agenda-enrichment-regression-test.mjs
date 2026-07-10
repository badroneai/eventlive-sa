import assert from 'node:assert/strict';
import { parseHrseAgendaHtml } from './hrse-agenda-utils.mjs';

function card({ classes = 'session list stream-border-color', time, stream = '', title, speakers = [] }) {
  return `<div class="agenda-sessions ${classes}">
    <span class="c-agenda-time-status"><span class="c-agenda-time-status-schedule"><span></span><span>${time}</span></span></span>
    ${stream ? `<div class="stream">${stream}</div>` : ''}
    <div class="title"><span class="formatted-text">${title}</span></div>
    <ul class="agenda-item-speakers">${speakers.map((speaker) => `<li><strong class="speaker-name"><span>${speaker}</span></strong></li>`).join('')}</ul>
  </div>`;
}

const html = [
  card({ classes: 'session_break list', time: '08:00 - 09:00', title: 'Registration' }),
  card({ time: '09:20 - 09:50', stream: 'HR Leaders Conference', title: 'Opening Address', speakers: ['Speaker One'] }),
  card({ time: '10:10 - 10:50', stream: 'Technology and Innovation Stage', title: 'The Future of Fairness', speakers: ['Speaker Two', 'Speaker Three'] }),
  card({ time: '10:10 - 10:50', stream: 'Technology and Innovation Stage', title: 'The Future of Fairness', speakers: ['Speaker Two'] }),
  card({ time: '25:00 - 26:00', stream: 'Bad Stage', title: 'Invalid Time' })
].join('\n');

const sessions = parseHrseAgendaHtml(html, {
  date: '2026-09-01',
  sourceUrl: 'https://informaconnect.com/hrse-saudi/agenda/3/'
});

assert.equal(sessions.length, 2, 'breaks, duplicate cards, and invalid times must not enter the live agenda');
assert.equal(sessions[0].starts_at, '2026-09-01T09:20:00+03:00');
assert.equal(sessions[0].ends_at, '2026-09-01T09:50:00+03:00');
assert.equal(sessions[0].room, 'HR Leaders Conference');
assert.equal(sessions[1].speaker, 'Speaker Two، Speaker Three');
assert.equal(sessions[1].source_url, 'https://informaconnect.com/hrse-saudi/agenda/3/');
assert.ok(sessions.every((session) => session.session_type === 'official-program-session'));

console.log(`HRSE_AGENDA_ENRICHMENT_OK sessions=${sessions.length} break_rejected=1 duplicate_rejected=1 invalid_rejected=1`);
