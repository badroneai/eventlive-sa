import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { DURATION_LABEL_RUNTIME_JS } from './duration-label.mjs';
import { classifyEventKind, getEventRuntime, hasSourcedClock, LIVE_CLAIM_MAX_WINDOW_HOURS, SOURCED_TIME_PRECISION } from './event-kind-utils.mjs';
import { riyadhDateKey } from './riyadh-date-utils.mjs';

// Execute the actual emitted clock, without importing the executable builder
// (which would rebuild dist) or depending on the changing external catalog.
const generator = fs.readFileSync('scripts/generate-site.mjs', 'utf8');
const ast = parse(generator, { ecmaVersion: 'latest', sourceType: 'module' });
function functionSource(source, tree, name) {
  const node = tree.body.find((item) => item.type === 'FunctionDeclaration' && item.id.name === name);
  assert.ok(node, `missing ${name}`);
  return source.slice(node.start, node.end);
}
const functionNames = ['dateValue', 'formatDate', 'formatEventDate', 'runtimeAttrs', 'clockPrecisionRuntimeScript', 'liveRuntimeScript', 'homeTickerEvent', 'patchHomeTickerClockRuntime'];
const builders = vm.runInNewContext(`${functionNames.map((name) => functionSource(generator, ast, name)).join('\n')}; ({${functionNames.join(',')}})`, {
  DURATION_LABEL_RUNTIME_JS, LIVE_CLAIM_MAX_WINDOW_HOURS, SOURCED_TIME_PRECISION, hasSourcedClock, riyadhDateKey,
  escapeHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
  cityLabel: (city) => city,
  compactEventUrl: (event) => `./events/${event.id}.html`
});
const sourceRuntime = builders.liveRuntimeScript().replace(/^<script>|<\/script>$/g, '');
const normalizeNode = ast.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'normalizeEvent');
const statusNode = normalizeNode.body.body.flatMap((node) => node.declarations || []).find((node) => node.id.name === 'status').init;
const normalizeStatusExpression = generator.slice(statusNode.start, statusNode.end);
const shell = fs.readFileSync('dist/index.html', 'utf8');
const patchedShell = builders.patchHomeTickerClockRuntime(shell);
const tickerScript = patchedShell.match(/\/\* eventlive-home-precision-clock:start \*\/([\s\S]*?)\/\* eventlive-home-precision-clock:end \*\//)?.[1];
assert.ok(tickerScript, 'retained homepage shell must accept the generator-owned ticker patch');
assert.equal(builders.patchHomeTickerClockRuntime(patchedShell), patchedShell, 'ticker patch must be idempotent');
assert.match(generator, /next = patchHomeTickerClockRuntime\(next\)/, 'the build must actually apply the ticker patch');

// Use the real AST-based localizer too: dictionary coverage alone does not
// prove that emitted runtime literals become English.
const localizer = fs.readFileSync('scripts/generate-localized-site.mjs', 'utf8');
const localizerAst = parse(localizer, { ecmaVersion: 'latest', sourceType: 'module' });
const literalMapNode = localizerAst.body.flatMap((node) => node.declarations || []).find((node) => node.id.name === 'runtimeLiteralMap');
const runtimeLiteralMap = vm.runInNewContext(`(${localizer.slice(literalMapNode.init.start, literalMapNode.init.end)})`);
const exact = JSON.parse(fs.readFileSync('locales/en-SA-static.json', 'utf8'));
const localize = vm.runInNewContext(`(${functionSource(localizer, localizerAst, 'rewriteRuntimeLiterals')})`, {
  parse, runtimeLiteralMap, exact, translateText: (value) => value, rootRelativeAsset: (value) => value
});
const english = (script) => localize(script, 'index.html').replaceAll("'ar-SA'", "'en-SA'").replaceAll('"ar-SA"', '"en-SA"');
const englishDate = vm.runInNewContext(`(${functionSource(localizer, localizerAst, 'formatEnglishEventDate')})`, { hasSourcedClock });

// Dates displayed before JavaScript runs must obey the same precision rule as
// the live clock. Restrict this to event boundaries; system update timestamps
// and independently sourced official-session times retain their real clocks.
const CLOCK_TEXT = /[0-9٠-٩]{1,2}:[0-9٠-٩]{2}/u;
const dateFixture = { starts_at: '2026-10-01T09:00:00+03:00', ends_at: '2026-10-03T18:00:00+03:00' };
let staticChecks = 0;
for (const precision of ['', undefined, 'unknown', 'date-only', 'date-only-defaulted', 'exact-start-estimated-end', 'unrecognized', ...SOURCED_TIME_PRECISION]) {
  const event = { ...dateFixture, time_precision: precision };
  for (const value of [event.starts_at, event.ends_at]) {
    for (const formatter of [builders.formatEventDate, englishDate]) {
      assert.equal(CLOCK_TEXT.test(formatter(event, value)), hasSourcedClock(event), `static date precision ${precision}`);
      staticChecks += 1;
    }
  }
}
assert.match(builders.formatDate(dateFixture.starts_at), CLOCK_TEXT, 'system timestamp formatter must keep the actual hour');
for (const name of ['enrichEventSummary', 'eventCard', 'eventFaqItems', 'relatedEventsHtml', 'renderEventDetail', 'patchHomePage']) {
  const code = functionSource(generator, ast, name);
  assert.match(code, /formatEventDate\(/, `${name} must use the event-aware formatter`);
  assert.doesNotMatch(code, /\bformatDate\(\s*(?:event|row|nextEvent)\.(?:starts_at|ends_at)\b/, `${name} must not silently reintroduce an unsourced event clock`);
}
for (const name of ['englishEventFaq', 'englishEventDescription']) {
  const code = functionSource(localizer, localizerAst, name);
  assert.match(code, /formatEnglishEventDate\(event,\s*event\.(?:starts_at|ends_at)\)/, `${name} must pass source precision to its formatter`);
  assert.doesNotMatch(code, /formatEnglishEventDate\(event\.(?:starts_at|ends_at)\)/);
}
const publicJson = vm.runInNewContext(`(${functionSource(generator, ast, 'eventPublicJson')})`, {
  isOnlineEvent: () => false, cityLabel: (value) => value, publicAssetUrl: (value) => value, eventKeywords: () => [],
  eventLocationJsonLd: () => ({}), organizerJsonLdForEvent: () => ({}), eventPerformerJsonLd: () => undefined,
  eventSchemaDescription: () => '', eventAccessIsFree: () => false, eventAudienceJsonLd: () => [],
  unique: (values) => [...new Set(values)], eventOfferJsonLd: () => undefined
});
assert.equal(publicJson(dateFixture).time_precision, 'unknown', 'public JSON must preserve missing precision as uncertainty');
assert.equal(Object.hasOwn(publicJson(dateFixture), 'date_precision'), false, 'no date precision may be invented');
const exactJson = publicJson({ ...dateFixture, time_precision: 'exact', date_precision: 'day' });
assert.equal(exactJson.time_precision, 'exact');
assert.equal(exactJson.date_precision, 'day');
assert.equal(exactJson.starts_at, dateFixture.starts_at, 'display repair must not rewrite source timestamps');

function element(dataset = {}) {
  const classes = new Set();
  return {
    dataset, textContent: '', innerHTML: '', style: {}, hidden: false,
    hasAttribute: (name) => name === 'data-static-until-live' && dataset.staticUntilLive === '1',
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    classes
  };
}
function clockContext(now) {
  const clock = { now: Date.parse(now) };
  class ClockDate extends Date { static now() { return clock.now; } }
  return { clock, Date: ClockDate };
}
function runRuntime(script, precision, now = '2026-10-01T12:00:00+03:00', overrides = {}) {
  const time = element({ start: '2026-10-01T09:00:00+03:00', end: '2026-10-01T18:00:00+03:00', kind: 'moment', timePrecision: precision, ...overrides });
  const status = element(time.dataset);
  const context = clockContext(now);
  Object.assign(context, { window: { location: { hostname: 'example.test' } }, navigator: {}, setInterval() {}, document: {
    querySelector: () => null,
    querySelectorAll: (selector) => selector === '[data-live-time]' ? [time] : selector === '[data-runtime-status]' ? [status] : []
  } });
  vm.runInNewContext(script, context);
  return { time, status, advance: (now) => { context.clock.now = Date.parse(now); context.window.EventLiveRuntimeClock.update(); } };
}
function runTicker(script, rows, now = '2026-10-01T12:00:00+03:00') {
  const context = clockContext(now);
  const countdown = element();
  Object.assign(context, { ticker: rows, setInterval() {}, document: { getElementById: () => countdown } });
  for (const key of ['cdD', 'cdH', 'cdM', 'cdS', 'boardLabel', 'boardTitle', 'boardMeta', 'boardCta', 'boardSingle']) context[key] = element();
  vm.runInNewContext(script, context);
  return { context, countdown, advance: (now) => { context.clock.now = Date.parse(now); context.tick(); } };
}
function staticStatus(event, now) {
  return vm.runInNewContext(`(${normalizeStatusExpression})`, {
    ...clockContext(now), sourceGroup: 'catalog', raw: event, previous: {}, statusEndsAt: event.ends_at, kind: classifyEventKind(event), getEventRuntime
  });
}
function temporalMembership(script, precision, now) {
  const time = element({ start: '2026-10-01T09:00:00+03:00', end: '2026-10-01T18:00:00+03:00', kind: 'moment', timePrecision: precision });
  const card = {
    removed: false,
    getAttribute: (name) => name === 'data-event-start' ? time.dataset.start : time.dataset.end,
    querySelector: (selector) => selector === '[data-live-time], [data-runtime-status]' ? time : null,
    remove() { this.removed = true; }
  };
  const section = { getAttribute: () => '72', querySelectorAll: () => [card], querySelector: () => element() };
  vm.runInNewContext(script, { ...clockContext(now), window: { location: { hostname: 'example.test' } }, navigator: {}, setInterval() {}, document: {
    querySelector: () => section, querySelectorAll: (selector) => selector === '[data-live-time]' ? [time] : []
  } });
  return !card.removed;
}
const row = (precision, overrides = {}) => ({ id: 'fixture', t: 'Event fixture', c: 'Riyadh', s: '2026-10-01T09:00:00+03:00', e: '2026-10-01T18:00:00+03:00', k: 'moment', p: precision, u: './events/fixture.html', ...overrides });
const uncertain = ['', undefined, 'unknown', 'date-only', 'date-only-defaulted', 'exact-start-estimated-end', 'unrecognized'];
let checks = 0;
for (const [language, runtime, ticker] of [['ar', sourceRuntime, tickerScript], ['en', english(sourceRuntime), english(tickerScript)]]) {
  for (const precision of uncertain) {
    const result = runRuntime(runtime, precision);
    assert(result.status.classes.has('status-ongoing'), `${language}/${precision}: date membership must not claim live`);
    assert.match(result.time.textContent, language === 'ar' ? /وقت غير مؤكد/ : /Time not confirmed/);
    assert.doesNotMatch(result.time.textContent, /\d\s*(?:ساع|دقيق|hour|minute)|يبدأ بعد|ينتهي بعد|انتهت منذ|Starts in|Ends in|Ended .*ago/i);
    const note = result.time.textContent;
    result.advance('2026-10-01T23:45:00+03:00');
    assert.equal(result.time.textContent, note, 'fabricated end hour must not end a date-only event early');
    result.advance('2026-10-02T00:01:00+03:00');
    assert(result.status.classes.has('status-ended'), 'date-only event ends on the next Riyadh day');
    const upcoming = runRuntime(runtime, precision, '2026-09-30T22:00:00Z', { staticUntilLive: '1' });
    assert(upcoming.status.classes.has('status-ongoing'), 'calendar date must be Riyadh, not UTC or the browser timezone');
    const future = runRuntime(runtime, precision, '2026-09-29T12:00:00+03:00', { staticUntilLive: '1' });
    assert.match(future.time.textContent, language === 'ar' ? /وقت غير مؤكد/ : /Time not confirmed/);
    const multiDayFuture = runRuntime(runtime, precision, '2026-09-29T12:00:00+03:00', { staticUntilLive: '1', end: '2026-10-03T18:00:00+03:00' });
    assert.match(multiDayFuture.time.textContent, language === 'ar' ? /من .+ إلى .+/ : /From .+ to .+/, 'uncertain clocks must preserve the complete upcoming multi-day date range');
    for (const now of ['2026-09-30T12:00:00+03:00', '2026-10-01T12:00:00+03:00', '2026-10-01T23:45:00+03:00']) {
      const board = runTicker(ticker, [row(precision)], now);
      assert.equal(board.context.pickFocus(Date.parse(now)).live, null);
      assert.equal(board.countdown.style.display, 'none');
      assert.equal(board.context.cdH.textContent, '');
      assert.match(board.context.boardMeta.textContent, language === 'ar' ? /وقت غير مؤكد/ : /Time not confirmed/);
      assert.doesNotMatch(board.context.boardMeta.textContent, /\d{1,2}:\d{2}/, 'date-only ticker meta must have no clock');
    }
    checks += 9;
  }
  for (const precision of [...uncertain, ...SOURCED_TIME_PRECISION]) {
    for (const kind of ['moment', 'program']) {
      for (const now of ['2026-09-30T12:00:00+03:00', '2026-10-01T08:00:00+03:00', '2026-10-01T12:00:00+03:00', '2026-10-01T23:45:00+03:00', '2026-10-02T00:01:00+03:00']) {
        const event = { starts_at: '2026-10-01T09:00:00+03:00', ends_at: '2026-10-01T18:00:00+03:00', time_precision: precision, event_kind: kind };
        const status = getEventRuntime(event, Date.parse(now)).status;
        assert.equal(staticStatus(event, now).key, status.key, 'normalizeEvent must use the event-object precision verdict');
        const client = runRuntime(runtime, precision, now, { kind });
        assert(client.status.classes.has(`status-${status.key}`), 'build/client status must agree before, inside, after and across the date boundary');
        if (language === 'ar') assert.equal(client.status.textContent, status.label, 'build/client labels must agree');
        checks += 1;
      }
    }
    assert.equal(temporalMembership(runtime, precision, '2026-10-01T23:45:00+03:00'), !SOURCED_TIME_PRECISION.has(precision), 'temporal filters must retain uncertain times for the full last day');
    assert.equal(temporalMembership(runtime, precision, '2026-10-02T00:01:00+03:00'), false, 'temporal filters must remove ended dates');
    assert.equal(temporalMembership(runtime, precision, '2026-10-01T12:00:00+03:00'), true, 'temporal filter must preserve the positive active case');
    checks += 3;
  }
  for (const precision of SOURCED_TIME_PRECISION) {
    const result = runRuntime(runtime, precision);
    assert(result.status.classes.has('status-live'));
    const future = runRuntime(runtime, precision, '2026-10-01T08:00:00+03:00');
    assert(future.status.classes.has('status-upcoming'));
    assert.match(future.time.textContent, language === 'ar' ? /يبدأ بعد/ : /Starts in/);
    future.advance('2026-10-01T12:00:00+03:00');
    assert(future.status.classes.has('status-live'));
    future.advance('2026-10-01T19:00:00+03:00');
    assert(future.status.classes.has('status-ended'));
    for (const override of [{ e: '2026-10-03T18:00:00+03:00' }, { k: 'program' }]) {
      const board = runTicker(ticker, [row(precision, override)]);
      assert.equal(board.context.pickFocus(Date.parse('2026-10-01T12:00:00+03:00')).live, null);
      assert.equal(board.countdown.style.display, 'none', 'ongoing long/program windows are not live-hour countdowns');
    }
    const board = runTicker(ticker, [row(precision)]);
    assert.equal(board.countdown.style.display, '');
    assert.equal(board.context.cdH.textContent, '06');
    board.context.ticker = [row('unknown')]; board.context.tick();
    assert.equal(board.countdown.style.display, 'none', 'a precise countdown must clear when focus changes to uncertain');
    assert.equal(board.context.cdH.textContent, '');
    checks += 8;
  }
  const long = runRuntime(runtime, 'exact', undefined, { end: '2026-10-03T18:00:00+03:00' });
  assert(long.status.classes.has('status-ongoing'));
  const invalid = runRuntime(runtime, 'exact', undefined, { start: 'invalid' });
  assert(invalid.status.classes.has('status-draft'));
  const empty = runTicker(ticker, [row('unknown')], '2026-10-02T12:00:00+03:00');
  assert.equal(empty.countdown.style.display, 'none');
  assert.equal(empty.context.boardCta.href, './events.html');
  if (language === 'en') {
    assert.doesNotMatch(runRuntime(runtime, 'unknown').time.textContent, /[ء-ي]/u);
    assert.doesNotMatch(runTicker(ticker, [row('unknown')]).context.boardMeta.textContent, /[ء-ي]/u);
  }
}
assert.match(builders.runtimeAttrs({ time_precision: 'official-session-times' }), /data-time-precision="official-session-times"/);
assert.match(builders.runtimeAttrs({}), /data-time-precision="unknown"/);
assert.equal(builders.homeTickerEvent({ id: 'fixture', time_precision: 'exact' }).p, 'exact');
assert.equal(builders.homeTickerEvent({ id: 'fixture' }).p, 'unknown');

// Negative controls prove these assertions catch the original class of bug,
// rather than passing merely because a helper name exists in the source.
const unsafeRuntime = sourceRuntime.replace('if (!hasRuntimeClock(el.dataset.timePrecision))', 'if (false)');
assert.throws(() => assert(runRuntime(unsafeRuntime, 'unknown').status.classes.has('status-ongoing')));
const unsafeTicker = tickerScript.replace('var sourced = hasRuntimeClock(ev.p);', 'var sourced = true;');
assert.throws(() => assert.equal(runTicker(unsafeTicker, [row('unknown')]).context.pickFocus(Date.parse('2026-10-01T12:00:00+03:00')).live, null));
const unsafeTemporal = sourceRuntime.replace('clockEl && hasRuntimeClock(clockEl.dataset.timePrecision)', 'true');
assert.throws(() => assert.equal(temporalMembership(unsafeTemporal, 'unknown', '2026-10-01T23:45:00+03:00'), true));
const unsafeFormatter = vm.runInNewContext(`(${functionSource(generator, ast, 'formatEventDate')})`, { hasSourcedClock: () => true, formatDate: builders.formatDate, dateValue: builders.dateValue });
assert.throws(() => assert.doesNotMatch(unsafeFormatter({ ...dateFixture, time_precision: 'unknown' }), CLOCK_TEXT));
console.log(`RUNTIME_TIME_PRECISION_OK fixture_checks=${checks} static_format_checks=${staticChecks} locales=ar,en negative_controls=4`);
