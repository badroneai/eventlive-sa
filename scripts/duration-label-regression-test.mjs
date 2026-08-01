import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { arabicDaysLabel, arabicHoursLabel, arabicMinutesLabel } from './duration-label.mjs';

// WO: Arabic count-agreement for duration/countdown text -- live evidence
// was "يبدأ بعد 3 ساعة" (must read "3 ساعات") and "يبدأ بعد 1 ساعة" (must
// read "ساعة واحدة"). Same defect class as WO-1/WO-2's banned "1 فعاليات":
// Arabic requires grammatical number agreement, not digit substitution into
// one fixed noun form. Mirrors the branch shape of
// scripts/event-count-label.mjs's eventCountLabel.

// ---- Part 1: unit-style cases for the shared build-time module ----------

const HOUR_CASES = { 0: '0 ساعة', 1: 'ساعة واحدة', 2: 'ساعتان', 3: '3 ساعات', 10: '10 ساعات', 11: '11 ساعة' };
const DAY_CASES = { 0: '0 يومًا', 1: 'يوم واحد', 2: 'يومان', 3: '3 أيام', 10: '10 أيام', 11: '11 يومًا' };
const MINUTE_CASES = { 0: '0 دقيقة', 1: 'دقيقة واحدة', 2: 'دقيقتان', 3: '3 دقائق', 10: '10 دقائق', 11: '11 دقيقة' };

for (const [count, expected] of Object.entries(HOUR_CASES)) {
  assert.equal(arabicHoursLabel(Number(count)), expected, `arabicHoursLabel(${count})`);
}
for (const [count, expected] of Object.entries(DAY_CASES)) {
  assert.equal(arabicDaysLabel(Number(count)), expected, `arabicDaysLabel(${count})`);
}
for (const [count, expected] of Object.entries(MINUTE_CASES)) {
  assert.equal(arabicMinutesLabel(Number(count)), expected, `arabicMinutesLabel(${count})`);
}

// ---- Part 2: built-output guard ------------------------------------------
//
// Proves every committed client-runtime copy actually carries the fixed
// logic, not a silent no-op. Extracts the SHIPPED function source out of
// the built HTML and *executes* it in a fresh vm context (not a copy
// re-typed in this test) -- a future edit that fixes generate-site.mjs but
// forgets a hand-ported dist shell (or vice versa) fails here.

const root = process.cwd();
const distDir = path.join(root, 'dist');

function readDist(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} must exist -- run npm run build first`);
  return fs.readFileSync(fullPath, 'utf8');
}

function loadShippedFunction(html, name, relativePath) {
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\s*\\}`));
  assert.ok(match, `${relativePath} must define ${name}() (no silent no-op on the duration-agreement port)`);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${match[0]}\nthis.__fn = ${name};`, sandbox);
  return sandbox.__fn;
}

function assertLabelFunction(html, name, cases, relativePath) {
  const fn = loadShippedFunction(html, name, relativePath);
  for (const [count, expected] of Object.entries(cases)) {
    assert.equal(fn(Number(count)), expected, `${relativePath} ${name}(${count})`);
  }
}

// Pages whose client-runtime carries the full trio: every page
// scripts/generate-site.mjs embeds liveRuntimeScript()/activationRuntimeScript()
// into (fully regenerated each build), plus index.html/events.html, which
// are only *patched* in place by generate-site.mjs (their embedded
// countdown script is hand-ported committed source, never rewritten
// wholesale) so their copies have to be checked as committed output too.
const longFormPages = [
  'index.html',
  'events.html',
  'cities.html',
  'categories.html',
  'audiences.html',
  'this-month.html',
  'this-week.html',
  'today-events.html',
  'print.html',
  'share.html',
  'signage.html'
];

for (const relativePath of longFormPages) {
  const html = readDist(relativePath);
  assertLabelFunction(html, 'arabicHoursLabel', HOUR_CASES, relativePath);
  assertLabelFunction(html, 'arabicDaysLabel', DAY_CASES, relativePath);
  assertLabelFunction(html, 'arabicMinutesLabel', MINUTE_CASES, relativePath);
  assert.doesNotMatch(html, /hour \+ ' ساعة'/, `${relativePath} must not keep the pre-fix "hour + ' ساعة'" digit-glued composition`);
  assert.doesNotMatch(html, /day \+ ' يوم '/, `${relativePath} must not keep the pre-fix "day + ' يوم '" digit-glued composition`);
}

// Pages whose client-runtime only needed the day-agreement fix: the short
// "N يوم N س" kiosk/event-page formatter's hour/minute segments already use
// bare "س"/"د" abbreviation letters, which carry no count-agreement defect.
const dayOnlyPages = ['event.html', 'events.html', 'screen.html'];
for (const relativePath of dayOnlyPages) {
  const html = readDist(relativePath);
  assertLabelFunction(html, 'arabicDaysLabel', DAY_CASES, relativePath);
  assert.doesNotMatch(html, /days \+ ' يوم '/, `${relativePath} must not keep the pre-fix "days + ' يوم '" digit-glued composition`);
}

// A representative individual event-detail page (scripts/generate-site.mjs's
// per-event template) -- this is where the live evidence bug ("يبدأ بعد 3
// ساعة") actually rendered from.
const eventsDir = path.join(distDir, 'events');
assert.ok(fs.existsSync(eventsDir), 'dist/events must exist -- run npm run build first');
const sampleEventFile = fs.readdirSync(eventsDir).find((name) => name.endsWith('.html'));
assert.ok(sampleEventFile, 'dist/events must contain at least one built event page');
const eventRelativePath = path.join('events', sampleEventFile);
const eventHtml = readDist(eventRelativePath);
assertLabelFunction(eventHtml, 'arabicHoursLabel', HOUR_CASES, eventRelativePath);
assertLabelFunction(eventHtml, 'arabicDaysLabel', DAY_CASES, eventRelativePath);
assertLabelFunction(eventHtml, 'arabicMinutesLabel', MINUTE_CASES, eventRelativePath);

console.log('duration-label-regression-test: ok');
