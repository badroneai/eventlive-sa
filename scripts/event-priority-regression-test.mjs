import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { attendancePriorityRank, compareAttendancePriority, isLiveMoment } from './event-priority.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');

// Fixed "now" so the fixtures below are deterministic regardless of when
// this test runs. 2026-07-29 12:00 Riyadh time (UTC+3).
const NOW = new Date('2026-07-29T09:00:00.000Z').getTime();
const YESTERDAY_09Z = new Date('2026-07-28T09:00:00.000Z').getTime();
const TODAY_06Z = new Date('2026-07-29T06:00:00.000Z').getTime();
const TODAY_10Z = new Date('2026-07-29T10:00:00.000Z').getTime();
const TODAY_12Z = new Date('2026-07-29T12:00:00.000Z').getTime();
const TOMORROW_09Z = new Date('2026-07-30T09:00:00.000Z').getTime();

function sortByPriority(events, now = NOW) {
  return [...events].sort((a, b) => compareAttendancePriority(a, b, now));
}

// (a) A festival that started yesterday and is still ongoing, plus a
// workshop starting today, both currently live at NOW. Rule: "any event
// STARTING today outranks it" — the workshop must lead even though the
// festival is also live right now.
{
  const festival = {
    id: 'festival-ongoing',
    title: 'Ongoing Festival',
    starts_at: new Date(YESTERDAY_09Z).toISOString(),
    ends_at: new Date(TODAY_12Z).toISOString(),
    status: 'ongoing'
  };
  const workshop = {
    id: 'workshop-today',
    title: 'Today Workshop',
    starts_at: new Date(TODAY_06Z).toISOString(),
    ends_at: new Date(TODAY_10Z).toISOString(),
    status: 'live'
  };
  const [first, second] = sortByPriority([festival, workshop]);
  assert.equal(first.id, 'workshop-today', 'case (a): event starting today must lead over an ongoing multi-day event');
  assert.equal(second.id, 'festival-ongoing', 'case (a): the ongoing festival must stay visible but not leading');
  assert.equal(attendancePriorityRank(workshop, NOW).group, 1, 'case (a): workshop starting today must be group 1');
  assert.equal(attendancePriorityRank(festival, NOW).group, 2, 'case (a): festival past its first day must be group 2 (ongoing)');
}

// (b) The same festival, but evaluated on its own first day (starts_at ==
// today). Rule: "a multi-day event has top priority ONLY on its first
// day." On day 1 it must lead over a plain future event.
{
  const festivalFirstDay = {
    id: 'festival-day-1',
    title: 'Festival First Day',
    starts_at: new Date(TODAY_06Z).toISOString(),
    ends_at: new Date(TOMORROW_09Z + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'live'
  };
  const futureEvent = {
    id: 'future-conference',
    title: 'Future Conference',
    starts_at: new Date(TOMORROW_09Z).toISOString(),
    ends_at: new Date(TOMORROW_09Z + 3 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming'
  };
  const [first, second] = sortByPriority([futureEvent, festivalFirstDay]);
  assert.equal(first.id, 'festival-day-1', 'case (b): a multi-day event must lead on its own first day');
  assert.equal(second.id, 'future-conference');
  assert.equal(attendancePriorityRank(festivalFirstDay, NOW).group, 1, 'case (b): festival starting today must be group 1, not group 2');
}

// (c) Two events both starting (and already live) today: earlier start
// must win.
{
  const earlier = {
    id: 'today-live-earlier',
    title: 'Earlier Live Event',
    starts_at: new Date(TODAY_06Z).toISOString(),
    ends_at: new Date(TODAY_12Z).toISOString(),
    status: 'live'
  };
  const later = {
    id: 'today-live-later',
    title: 'Later Live Event',
    starts_at: new Date(TODAY_10Z).toISOString(),
    ends_at: new Date(TODAY_12Z).toISOString(),
    status: 'live'
  };
  const [first, second] = sortByPriority([later, earlier]);
  assert.equal(first.id, 'today-live-earlier', 'case (c): among two events live and starting today, the earlier start must lead');
  assert.equal(second.id, 'today-live-later');
}

// Additional coverage: group 1 (starts today, not yet live) must still
// outrank group 2 (ongoing, currently live) — the rule is about which day
// the event started, not about which one is live right now.
{
  const ongoingLive = {
    id: 'ongoing-live-now',
    title: 'Ongoing Live Now',
    starts_at: new Date(YESTERDAY_09Z).toISOString(),
    ends_at: new Date(TODAY_12Z).toISOString(),
    status: 'ongoing'
  };
  const laterTodayUpcoming = {
    id: 'later-today-not-yet-live',
    title: 'Later Today Not Yet Live',
    starts_at: new Date(TODAY_12Z + 60 * 60 * 1000).toISOString(),
    ends_at: new Date(TODAY_12Z + 3 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming'
  };
  const [first] = sortByPriority([ongoingLive, laterTodayUpcoming]);
  assert.equal(first.id, 'later-today-not-yet-live', 'group 1 (starts today) must outrank group 2 (ongoing) even when group 2 is currently live and group 1 has not started yet');
}

// Group 3 (future, no ambiguity) must still be plain earliest-start-first,
// same as the pre-WO-3 chronological sort.
{
  const soon = { id: 'future-soon', title: 'Future Soon', starts_at: new Date(TOMORROW_09Z).toISOString() };
  const later = { id: 'future-later', title: 'Future Later', starts_at: new Date(TOMORROW_09Z + 5 * 24 * 60 * 60 * 1000).toISOString() };
  const [first, second] = sortByPriority([later, soon]);
  assert.equal(first.id, 'future-soon');
  assert.equal(second.id, 'future-later');
  assert.equal(attendancePriorityRank(soon, NOW).group, 3);
  assert.equal(attendancePriorityRank(later, NOW).group, 3);
}

// Events with no parseable start date must sort last, never crash the
// comparator (defensive: malformed catalog rows must not break ordering).
{
  const undated = { id: 'undated', title: 'Undated' };
  const dated = { id: 'dated', title: 'Dated', starts_at: new Date(TOMORROW_09Z).toISOString() };
  const [first, second] = sortByPriority([undated, dated]);
  assert.equal(first.id, 'dated');
  assert.equal(second.id, 'undated');
}

// Built-output guard: dist/today.html has no generator function in
// scripts/generate-site.mjs — its own client-side "priority" ranking
// (sortedActionable) only gets replaced by a literal-string .replace()
// inside externalizeTodayEventsPayload(). If the committed dist/today.html
// shell ever drifts (reformat, upstream edit) that .replace silently
// no-ops, the old savedBias/liveBias/raw-distance sort quietly comes back,
// and nothing else in the battery would catch it. Assert the ported
// markers are present and the old chain is gone.
{
  const todayHtmlPath = path.join(distDir, 'today.html');
  assert.equal(
    fs.existsSync(todayHtmlPath),
    true,
    'dist/today.html must exist; run npm run build first'
  );
  const todayHtml = fs.readFileSync(todayHtmlPath, 'utf8');

  assert.match(
    todayHtml,
    /attendancePriorityRank/,
    'dist/today.html no longer contains attendancePriorityRank — the literal-string ' +
      '.replace() in externalizeTodayEventsPayload (scripts/generate-site.mjs) ' +
      'no-oped, most likely because the committed dist/today.html shell for ' +
      'sortedActionable() drifted out from under the exact string match. Re-sync ' +
      'the .replace() target with the current dist/today.html content.'
  );
  assert.match(
    todayHtml,
    /riyadhDayKey/,
    'dist/today.html no longer contains riyadhDayKey — the literal-string .replace() ' +
      'in externalizeTodayEventsPayload (scripts/generate-site.mjs) no-oped, most ' +
      'likely because the committed dist/today.html shell for sortedActionable() ' +
      'drifted out from under the exact string match. Re-sync the .replace() target ' +
      'with the current dist/today.html content.'
  );
  assert.doesNotMatch(
    todayHtml,
    /liveBias/,
    'dist/today.html still contains the old liveBias chain — the literal-string ' +
      '.replace() in externalizeTodayEventsPayload (scripts/generate-site.mjs) ' +
      'no-oped (most likely because the committed dist/today.html shell for ' +
      'sortedActionable() drifted out from under the exact string match), so the ' +
      'pre-WO-3 saved/live-only/raw-distance sort has silently come back. Re-sync ' +
      'the .replace() target with the current dist/today.html content.'
  );
}

// WO-1: isLiveMoment() is the single shared predicate for "which events are
// live right now" (excluding long-running programs) — consumed both by
// patchHomePage's `todayEvents` filter and by the homepage live-board
// carousel's `liveEvents` filter (scripts/generate-site.mjs). Unit-test it
// directly so the exclusion rule can never silently drift between callers.
{
  const liveMoment = {
    id: 'live-moment',
    event_kind: 'moment',
    starts_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    ends_at: new Date(NOW + 60 * 60 * 1000).toISOString()
  };
  const liveProgram = {
    id: 'live-program',
    event_kind: 'program',
    starts_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    ends_at: new Date(NOW + 60 * 60 * 1000).toISOString()
  };
  const notYetStarted = {
    id: 'future',
    event_kind: 'moment',
    starts_at: new Date(NOW + 60 * 60 * 1000).toISOString(),
    ends_at: new Date(NOW + 2 * 60 * 60 * 1000).toISOString()
  };
  const alreadyEndedWindow = {
    id: 'ended-window',
    event_kind: 'moment',
    starts_at: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(NOW - 60 * 60 * 1000).toISOString()
  };
  const markedEnded = {
    id: 'marked-ended',
    event_kind: 'moment',
    status: 'ended',
    starts_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    ends_at: new Date(NOW + 60 * 60 * 1000).toISOString()
  };
  assert.equal(isLiveMoment(liveMoment, NOW), true, 'isLiveMoment: a running non-program event must be live');
  assert.equal(isLiveMoment(liveProgram, NOW), false, 'isLiveMoment: a running program must be excluded (it would flood any "live now" surface)');
  assert.equal(isLiveMoment(notYetStarted, NOW), false, 'isLiveMoment: an event that has not started yet must not be live');
  assert.equal(isLiveMoment(alreadyEndedWindow, NOW), false, 'isLiveMoment: an event whose window has closed must not be live');
  assert.equal(isLiveMoment(markedEnded, NOW), false, 'isLiveMoment: status "ended" must override an otherwise-open window');
  assert.equal(isLiveMoment({}, NOW), false, 'isLiveMoment: an event with no parseable start must not crash and must not be live');
}

// WO-1 built-output guard: the homepage "live now" board carousel is spliced
// into the committed dist/index.html shell by two literal-string .replace()
// calls in patchHomePage (scripts/generate-site.mjs) — one toggling
// #boardSingle's `hidden` attribute, one replacing the whole
// <section id="boardLive"> block. If the committed shell ever drifts out
// from under either literal match, the replace silently no-ops and the
// carousel quietly stops rendering (the homepage would fall back to
// whatever #boardSingle/#boardLive happened to contain from a prior build).
// Assert the structural markers survive in the built output.
{
  const indexHtmlPath = path.join(distDir, 'index.html');
  assert.equal(fs.existsSync(indexHtmlPath), true, 'dist/index.html must exist; run npm run build first');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  for (const marker of ['id="boardSingle"', 'id="boardLive"', 'id="boardLiveTrack"', 'id="boardLiveBadge"', 'board-live-card']) {
    assert.match(
      indexHtml,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `dist/index.html no longer contains ${marker} — the WO-1 board-live literal-string ` +
        '.replace() in patchHomePage (scripts/generate-site.mjs) no-oped, most likely ' +
        'because the committed dist/index.html shell drifted out from under the exact ' +
        'string match. Re-sync the .replace() target with the current dist/index.html content.'
    );
  }

  assert.match(
    indexHtml,
    /if \(boardSingle && boardSingle\.hidden\) return;/,
    'dist/index.html no longer guards tick() against running while the live carousel is ' +
      'active — the single-pinned-event board could start fighting the carousel for the ' +
      'same DOM nodes. Re-check the committed dist/index.html runtime script.'
  );
}

console.log('event-priority-regression-test: ok');
