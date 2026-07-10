import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const events = JSON.parse(fs.readFileSync('dist/events.json', 'utf8')).events || [];
const leap = events.find((event) => /^LEAP\s+2026$/i.test(event.title || ''));
assert.ok(leap, 'LEAP 2026 must be present in the public build');
assert.ok(leap.sessions.length >= 100, 'LEAP must retain its full official multi-track agenda');
assert.equal(leap.category, 'conference', 'LEAP must remain classified as a conference');
assert.match(leap.venue, /Convention Centre, Malham/i, 'LEAP must retain the official Malham venue');
assert.match(leap.directions_url, /Convention%20Centre%20Malham/, 'LEAP directions must target the official venue');
assert.equal(leap.source_label, 'LEAP 2026 Official', 'LEAP must expose its first-party source');

const filePath = path.join('dist', leap.detail_url.replace(/^\.\//, ''));
const html = fs.readFileSync(filePath, 'utf8');
const sessionItems = html.match(/<article class="session"[^>]+data-session-item/g) || [];
const dayButtons = html.match(/data-agenda-day=/g) || [];

assert.equal(sessionItems.length, leap.sessions.length, 'every official session must render as one agenda item');
assert.ok(dayButtons.length >= 5, 'agenda must expose all-days plus one button per event day');
assert.match(html, /data-agenda-search/, 'agenda must include session and speaker search');
assert.match(html, /data-agenda-room/, 'agenda must include room filtering');
assert.match(html, /data-agenda-now/, 'agenda must include a live now summary');
assert.match(html, /data-agenda-next/, 'agenda must include a next-session summary');
assert.match(html, /window\.EventLiveAgenda/, 'agenda controls must expose a testable runtime API');
assert.match(html, /\.agenda-head \.eyebrow\{color:#72530a\}/, 'agenda eyebrow must use a WCAG AA color on the light page background');
assert.match(html, /https:\/\/onegiantleap\.com\/session\//, 'official session evidence links must remain visible');
assert.doesNotMatch(html, /2026-04-1[3-6]T/, 'stale April sessions must never enter the LEAP 2026 public agenda');
assert.doesNotMatch(html, /Exhibition \/ Families|Riyadh Riyadh/, 'stale Visit Saudi classification and venue text must not leak into the public page');

const money = events.find((event) => event.id === 'ended-money2020-middle-east-2025');
assert.ok(money, 'Money20/20 Middle East 2025 must be retained as a normal ended event');
assert.equal(money.sessions.length, 242, 'Money20/20 must retain all official agenda cards, including simultaneous sessions');
assert.equal(money.rooms_count, 11, 'Money20/20 must retain every official stage');
const moneyHtml = fs.readFileSync(path.join('dist', money.detail_url.replace(/^\.\//, '')), 'utf8');
assert.equal((moneyHtml.match(/<article class="session"[^>]+data-session-item/g) || []).length, 242, 'Money20/20 detail page must render every official session');
assert.match(moneyHtml, /الأحد، ١٤ سبتمبر/, 'Money20/20 detail page must include its official pre-event programme day');
assert.doesNotMatch(moneyHtml, /Future of Money copy/, 'CMS duplicate sessions must never reach the public agenda');

const hrse = events.find((event) => event.id === 'event-hrse-ksa');
assert.ok(hrse, 'HRSE KSA must remain present in the public build');
assert.ok(hrse.sessions.length >= 20, 'HRSE KSA must retain the official four-day agenda');
assert.equal(hrse.source_label, 'HRSE KSA Official', 'HRSE KSA must expose its first-party agenda source');
assert.equal(hrse.live_schedule_ready, true, 'HRSE KSA must activate the live agenda experience');
const hrseHtml = fs.readFileSync(path.join('dist', hrse.detail_url.replace(/^\.\//, '')), 'utf8');
assert.equal((hrseHtml.match(/<article class="session"[^>]+data-session-item/g) || []).length, hrse.sessions.length, 'HRSE detail page must render every official session');
assert.match(hrseHtml, /HR Leaders Conference|Technology and Innovation Stage/, 'HRSE agenda must retain official stream labels');
assert.match(hrseHtml, /https:\/\/informaconnect\.com\/hrse-saudi\/agenda\//, 'HRSE sessions must retain first-party evidence links');

const smartData = events.find((event) => event.id === 'event-smart-data-ai-summit');
assert.ok(smartData, 'Smart Data & AI Summit must remain present in the public build');
assert.ok(smartData.sessions.length >= 20, 'Smart Data & AI Summit must retain both official agenda days');
assert.equal(smartData.source_label, 'Smart Data & AI Summit Official');
assert.equal(smartData.live_schedule_ready, true);
const smartDataHtml = fs.readFileSync(path.join('dist', smartData.detail_url.replace(/^\.\//, '')), 'utf8');
assert.equal((smartDataHtml.match(/<article class="session"[^>]+data-session-item/g) || []).length, smartData.sessions.length, 'Smart Data detail page must render every official agenda item');
assert.match(smartDataHtml, /Agentic AI|Data Intelligence/, 'Smart Data agenda must retain official programme titles');
assert.match(smartDataHtml, /https:\/\/saudi\.smartdataseries\.com\/agenda/, 'Smart Data sessions must retain first-party evidence links');
assert.doesNotMatch(smartDataHtml, /0 قاعات|٠ قاعات/, 'agendas without published room names must not display a misleading zero-room count');
assert.doesNotMatch(smartDataHtml, /<select[^>]+data-agenda-room/, 'agendas without published room names must not display an empty room filter');

const rff2026 = events.find((event) => event.id === 'ended-real-estate-future-forum-2026');
assert.ok(rff2026, 'RFF 2026 must be preserved as a normal ended event');
assert.ok(rff2026.sessions.length >= 20, 'RFF 2026 must retain its official three-day agenda');
assert.equal(rff2026.source_label, 'Real Estate Future Forum Official');
const rffHtml = fs.readFileSync(path.join('dist', rff2026.detail_url.replace(/^\.\//, '')), 'utf8');
assert.equal((rffHtml.match(/<article class="session"[^>]+data-session-item/g) || []).length, rff2026.sessions.length, 'RFF 2026 page must render every official session');
assert.match(rffHtml, /Non-Saudi Ownership Law|Opening Ceremony/, 'RFF 2026 must retain official session titles');
assert.doesNotMatch(rffHtml, /25.*27.*2027|٢٠٢٧/, 'RFF 2027 dates must not leak into the RFF 2026 agenda page');

const proptech2025 = events.find((event) => event.id === 'ended-global-proptech-summit-2025');
assert.ok(proptech2025, 'Global PropTech Summit 2025 must be preserved as a normal ended event');
assert.ok(proptech2025.sessions.length >= 25, 'Global PropTech Summit 2025 must retain the official two-day PDF agenda');
assert.equal(proptech2025.source_label, 'Global PropTech Summit Official');
const proptechHtml = fs.readFileSync(path.join('dist', proptech2025.detail_url.replace(/^\.\//, '')), 'utf8');
assert.equal((proptechHtml.match(/<article class="session"[^>]+data-session-item/g) || []).length, proptech2025.sessions.length, 'Global PropTech 2025 page must render every official session');
assert.match(proptechHtml, /PROPTECH|PropTech/, 'Global PropTech 2025 must retain official programme titles');
assert.doesNotMatch(proptechHtml, /25\s*(?:-|–)\s*26\s+(?:October|Oct)\s+2026|٢٥\s*(?:-|–)\s*٢٦[^\n]{0,30}٢٠٢٦/i, 'Global PropTech 2026 dates must not leak into the 2025 agenda page');

console.log(`EVENT_AGENDA_UI_OK leap_sessions=${sessionItems.length} money2020_sessions=${money.sessions.length} hrse_sessions=${hrse.sessions.length} smart_data_sessions=${smartData.sessions.length} rff2026_sessions=${rff2026.sessions.length} proptech2025_sessions=${proptech2025.sessions.length} day_controls=${dayButtons.length}`);
