import assert from 'node:assert/strict';
import { parseSmartDataAgendaHtml } from './smart-data-agenda-utils.mjs';

function card(day, index, time, title) {
  return `<div class="section section_${index}" id="section_${day}_${index}"><div class="text-wrap"><div class="left"><h3>${time}</h3></div><div class="right"><h3>${title}</h3><ul><li>Detail</li></ul></div></div></div>`;
}

const html = [
  '<div class="tab-content cs-tab day active" id="tab_1">',
  card(1, 1, '09:00 – 10:00', 'REGISTRATION AND REFRESHMENTS'),
  card(1, 2, '10:00 – 10:20', 'Opening Intelligence'),
  card(1, 3, '10:00 – 10:20', 'Opening Intelligence'),
  '</div>',
  '<div class="tab-content cs-tab day" id="tab_2">',
  card(2, 1, '10:30 – 11:00', 'Agentic AI at National Scale'),
  card(2, 2, '25:00 – 26:00', 'Invalid Time'),
  '</div>'
].join('');

const sessions = parseSmartDataAgendaHtml(html);
assert.equal(sessions.length, 3, 'duplicate and invalid agenda cards must be rejected');
assert.equal(sessions[0].starts_at, '2026-08-26T09:00:00+03:00');
assert.equal(sessions[0].session_type, 'official-program-break');
assert.equal(sessions[1].session_type, 'official-program-session');
assert.equal(sessions[2].starts_at, '2026-08-27T10:30:00+03:00');
assert.equal(sessions[2].track, 'Smart Data & AI');
assert.equal(sessions[2].source_url, 'https://saudi.smartdataseries.com/agenda');

console.log(`SMART_DATA_AGENDA_ENRICHMENT_OK sessions=${sessions.length} duplicate_rejected=1 invalid_rejected=1`);
