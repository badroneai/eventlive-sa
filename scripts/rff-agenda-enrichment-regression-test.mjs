import assert from 'node:assert/strict';
import { parseRffAgendaRows } from './rff-agenda-utils.mjs';

const rows = [
  { text: '09:00 - 10:00\nDay 1\nOpening Ceremony', url: 'https://youtu.be/opening' },
  { text: '10:00 - 11:00\nPanel Discussion\nDay 1\nThe Non-Saudi Ownership Law\nLong description', url: 'https://www.therff.com/agenda' },
  { text: '10:00 - 11:00\nPanel Discussion\nDay 1\nThe Non-Saudi Ownership Law', url: 'https://www.therff.com/agenda' },
  { text: '09:30 - 10:15\nKeynote\nDay 2\nBuilding Future Cities' },
  { text: 'invalid\nDay 3\nMissing Time' }
];

const sessions = parseRffAgendaRows(rows);
assert.equal(sessions.length, 3, 'duplicate and incomplete RFF cards must be rejected');
assert.equal(sessions[0].starts_at, '2026-01-26T09:00:00+03:00');
assert.equal(sessions[0].source_url, 'https://youtu.be/opening');
assert.equal(sessions[1].track, 'Panel Discussion');
assert.equal(sessions[2].starts_at, '2026-01-27T09:30:00+03:00');
assert.equal(sessions[2].track, 'Keynote');

console.log(`RFF_AGENDA_ENRICHMENT_OK sessions=${sessions.length} duplicate_rejected=1 invalid_rejected=1`);
