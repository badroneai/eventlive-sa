import assert from 'node:assert/strict';
import { inspectOfficialAgendaHtml } from './official-agenda-radar-utils.mjs';

const realAgenda = Array.from({ length: 4 }, (_, index) => `<div class="agenda-sessions session"><span>${9 + index}:00 - ${10 + index}:00</span><h3>Session ${index + 1}</h3></div>`).join('');
assert.equal(inspectOfficialAgendaHtml(realAgenda, { status: 200 }).status, 'published-timed-agenda');

const cloudflareLibraryButReal = `<script src="/cloudflare/library.js"></script>${realAgenda}`;
assert.equal(inspectOfficialAgendaHtml(cloudflareLibraryButReal, { status: 200 }).status, 'published-timed-agenda', 'a harmless Cloudflare asset name must not hide a real agenda');

const placeholder = Array.from({ length: 3 }, (_, index) => `<div class="wixui-repeater__item">0${index + 9}:00 - 10:00 Session Title Lorem ipsum</div>`).join('');
assert.equal(inspectOfficialAgendaHtml(placeholder, { status: 200 }).status, 'placeholder-not-publishable');

assert.equal(inspectOfficialAgendaHtml('<h1>Agenda will be announced soon</h1>', { status: 200 }).status, 'announced-no-timed-agenda');
assert.equal(inspectOfficialAgendaHtml('<h1>Attention Required</h1>', { status: 403 }).status, 'protected-or-partnership');
assert.equal(inspectOfficialAgendaHtml('', { status: 404 }).status, 'not-published');

console.log('OFFICIAL_AGENDA_RADAR_OK real=1 cloudflare_false_positive=0 placeholder_rejected=1 announced=1 protected=1');
