// Two things a page must never do, both measured on the built site 2026-09-03.
//
// 1. Contradict itself. 1,175 pages whose event had finished rendered a session
//    chip reading "قادمة" — upcoming. The client's updateStatus() corrects it a
//    moment after load, so it was invisible to anyone looking with JavaScript on;
//    it is what a crawler reads first and what a no-JS visitor keeps. A page
//    titled "— منتهية يناير ٢٠٢٥" was announcing an upcoming session.
//
// 2. Address search engines instead of readers. 692 pages shipped, as visible
//    body copy, a line saying the page exists "لتكون مفيدة للمستخدم والذكاءات
//    ومحركات البحث". Whatever that was worth for rankings, it tells the visitor
//    the content was written for machines.
//
// Both are the same rule this repo enforces everywhere: what a surface says must
// be true, and must be addressed to the person reading it.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const now = Date.now();
const dirs = [path.join(root, 'dist', 'events'), path.join(root, 'dist', 'en', 'events')];

let scanned = 0;
const contradictions = [];
const engineFacing = [];

for (const dir of dirs) {
  assert.equal(fs.existsSync(dir), true, `${dir} must exist; run npm run build first`);
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(dir, name), 'utf8');
    // "Finished" means the LAST moment anything on this page is still running —
    // the parent window or its latest session, whichever is later. 60 pages carry
    // a parent endDate months behind their own schedule (chess-hub closes
    // 2026-08-25 while its sessions run to 2026-12-29), and reading ends_at alone
    // calls a live recurring event finished. Same rule as effectiveEventEnd() in
    // generate-site.mjs, so the gate and the generator cannot disagree.
    const endDates = [...html.matchAll(/"endDate":\s*"([^"]+)"/g)].map((match) => new Date(match[1]).getTime()).filter(Number.isFinite);
    if (!endDates.length) continue;
    const endDate = new Date(Math.max(...endDates)).toISOString();
    scanned += 1;
    const main = html.split('<main')[1]?.split('</main>')[0] || '';
    // The related-events block legitimately talks about OTHER, upcoming events.
    const own = main.split('data-section="related"')[0];
    // The attribute is emitted as `data-session-status=""` by the serialiser, so a
    // matcher anchored on `data-session-status>` silently matches nothing — which
    // is how the first draft of this gate passed against a page I had broken on
    // purpose. Anchor on the element, not on one serialisation of it.
    if (new Date(endDate).getTime() < now && /class="session-status"[^>]*>\s*(قادمة|Upcoming)\s*</.test(own)) {
      contradictions.push(path.relative(root, path.join(dir, name)));
    }
    if (/محركات البحث|search engines/i.test(own)) {
      engineFacing.push(path.relative(root, path.join(dir, name)));
    }
  }
}

assert.ok(scanned > 100, `expected a real corpus, scanned ${scanned}`);
assert.deepEqual(
  contradictions.slice(0, 10),
  [],
  `${contradictions.length} finished event page(s) render a session chip that still says "upcoming" before JavaScript runs`
);
assert.deepEqual(
  engineFacing.slice(0, 10),
  [],
  `${engineFacing.length} page(s) tell the reader, in visible body copy, that the page exists to serve search engines`
);

console.log(`PAGE_HONESTY_OK scanned=${scanned} self_contradictions=0 engine_facing_copy=0`);
