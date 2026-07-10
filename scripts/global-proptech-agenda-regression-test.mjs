import assert from 'node:assert/strict';
import { parseGlobalProptechAgendaText } from './global-proptech-agenda-utils.mjs';

const text = `
DAY 1 26 OCT
09:00 - 10:00             Reception

11:00 - 11:30            THE CAPITAL MARKET AUTHORITY:
Fireside Chat            EMPOWERMENT AND A PACKAGE OF ENHANCEMENTS
30 mins

                                                       10:25 - 10:40
                                                       Opening Keynote

DAY 2 27 OCT
  10:00 -10:15                      BEYOND THE REALTOR: BUILDING AN END-TO-END AI-
  Keynote                           POWERED PROPTECH ECOSYSTEM
  15 mins

10:00 - 09:00             Invalid Duration
`;

const sessions = parseGlobalProptechAgendaText(text);
assert.equal(sessions.length, 3, 'indented profile timestamps and invalid durations must be rejected');
assert.equal(sessions[0].starts_at, '2025-10-26T09:00:00+03:00');
assert.equal(sessions[0].session_type, 'official-program-break');
assert.match(sessions[1].title, /EMPOWERMENT AND A PACKAGE OF ENHANCEMENTS/);
assert.equal(sessions[2].starts_at, '2025-10-27T10:00:00+03:00');
assert.match(sessions[2].title, /POWERED PROPTECH ECOSYSTEM/);

console.log(`GLOBAL_PROPTECH_AGENDA_OK sessions=${sessions.length} profile_timestamp_rejected=1 invalid_rejected=1`);
