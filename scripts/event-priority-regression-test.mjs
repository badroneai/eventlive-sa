import assert from 'node:assert/strict';
import { attendancePriorityRank, compareAttendancePriority } from './event-priority.mjs';

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

console.log('event-priority-regression-test: ok');
