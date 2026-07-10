import assert from 'node:assert/strict';
import { parseMoney2020AgendaHtml } from './money2020-agenda-utils.mjs';

function session({ day, start, end, title, room, speaker = '' }) {
  return `<div class="agenda"><div class="agenda-box-wrapper"><div class="agenda-box"><div class="tags-row"><div class="type">${room}</div><ul><li>Monday ${day} September, ${start}—${end} (30 min)</li></ul></div><div class="heading">${title}</div></div><div class="agenda-team-row"><div class="name"><span>${speaker}</span></div></div></div></div>`;
}

const html = [
  session({ day: 14, start: '03:00 PM', end: '03:30 PM', title: 'Fintech Strategy', room: 'Venturescape', speaker: 'Speaker One' }),
  session({ day: 15, start: '11:00 AM', end: '11:45 AM', title: 'Future of Money', room: 'The Pulse', speaker: 'Speaker Two' }),
  session({ day: 15, start: '11:00 AM', end: '11:45 AM', title: 'Future of Money copy', room: 'The Pulse', speaker: 'Speaker Two' }),
  session({ day: 18, start: '11:00 AM', end: '11:45 AM', title: 'Outside Event', room: 'The Pulse' })
].join('\n');

const sessions = parseMoney2020AgendaHtml(html, {
  year: 2025,
  windowStart: '2025-09-14T00:00:00+03:00',
  windowEnd: '2025-09-18T00:00:00+03:00',
  sourceUrl: 'https://money2020middleeast.com/2025-agenda'
});

assert.equal(sessions.length, 2);
assert.equal(sessions[0].starts_at, '2025-09-14T15:00:00+03:00');
assert.equal(sessions[0].ends_at, '2025-09-14T15:30:00+03:00');
assert.equal(sessions[0].room, 'Venturescape');
assert.equal(sessions[0].speaker, 'Speaker One');
assert.ok(sessions.every((row) => row.source_url === 'https://money2020middleeast.com/2025-agenda'));
assert.ok(!sessions.some((row) => row.title.endsWith(' copy') || row.title === 'Outside Event'));

console.log(`MONEY2020_AGENDA_ENRICHMENT_OK sessions=${sessions.length} duplicate_rejected=1 outside_window_rejected=1`);
