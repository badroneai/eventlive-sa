// EventLive — single source of truth for attendance-priority ordering (WO-3).
//
// The owner's rule, verbatim: a multi-day event has top priority ONLY on its
// first day. From day 2 onward, any event STARTING today outranks it; the
// ongoing event stays visible but not leading.
//
// Every public/owner-facing surface that decides "which event leads" must
// import compareAttendancePriority from here instead of hand-rolling its own
// ordering. Do not duplicate this logic anywhere else.
//
// Priority groups (lower group number = shown first):
//   Group 1 — starts today (riyadhDateKey(start) === todayKey), whether
//             currently live or later today. Internal order: live first,
//             then earliest start.
//   Group 2 — ongoing: started before today, still running right now.
//             Internal order: earliest end first.
//   Group 3 — future: has not started yet, and does not start today.
//             Internal order: earliest start first.
//
// This module only decides ORDER. It does not decide which events are
// eligible for a given surface — callers filter first, then sort with
// compareAttendancePriority.

import { riyadhDateKey } from './riyadh-date-utils.mjs';

function toMs(value) {
  const parsed = value instanceof Date ? value.getTime() : new Date(value || '').getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function eventWindow(event = {}) {
  const start = toMs(event.starts_at);
  const endRaw = toMs(event.ends_at || event.starts_at);
  const end = endRaw === null ? start : endRaw;
  return { start, end };
}

function isRunningNow(event, now, start, end) {
  if (start === null) return false;
  const effectiveEnd = end === null ? start : end;
  return event?.status !== 'ended' && start <= now && effectiveEnd >= now;
}

/**
 * Returns the priority rank for a single event at a point in time.
 * Lower `group` sorts first; `start`/`end` are epoch ms (Infinity when the
 * event has no parseable date, so it always sorts last within its group).
 */
export function attendancePriorityRank(event = {}, now = Date.now()) {
  const { start, end } = eventWindow(event);
  const startsToday = start !== null && riyadhDateKey(start) === riyadhDateKey(now);
  const live = isRunningNow(event, now, start, end);
  const safeStart = start === null ? Number.POSITIVE_INFINITY : start;
  const safeEnd = end === null ? Number.POSITIVE_INFINITY : end;

  if (startsToday) {
    return { group: 1, live, start: safeStart, end: safeEnd };
  }
  if (live) {
    // Started before today and still running: ongoing, yields to anything
    // starting today.
    return { group: 2, live: true, start: safeStart, end: safeEnd };
  }
  return { group: 3, live: false, start: safeStart, end: safeEnd };
}

/**
 * "Live moment" predicate (WO-1): true when an event is a currently-running
 * MOMENT — started, not yet ended, and NOT a long-running `program`. Programs
 * (multi-week camps, standing exhibitions, etc.) are deliberately excluded
 * here: they are "ongoing" in the attendance-priority sense but would
 * otherwise flood any "live now" surface (homepage board carousel, etc.)
 * with entries that are not a meaningful "happening right now" moment.
 *
 * This is the single source of truth for that exclusion — every surface
 * that needs "which events are live right now" (excluding programs) must
 * import this instead of re-deriving the `event_kind !== 'program' && start
 * <= now && end >= now` condition inline.
 */
export function isLiveMoment(event = {}, now = Date.now()) {
  if (event?.status === 'ended') return false;
  if (event?.event_kind === 'program') return false;
  const { start, end } = eventWindow(event);
  if (start === null) return false;
  const effectiveEnd = end === null ? start : end;
  // NOTE: membership, not entitlement. This answers "is the event inside its
  // window", which is what the board and the today section select on. Whether we
  // may then SAY "مباشر الآن" about it is a separate question, answered by
  // canClaimLiveNow() — a multi-day window cannot know the hour, so it stays on
  // the board (it really is running these days) but is labelled honestly rather
  // than removed. Removing it emptied the board entirely: on 2026-09-02 all 15
  // cards were multi-day.
  return start <= now && effectiveEnd >= now;
}

/**
 * Comparator for Array.prototype.sort implementing the unified
 * attendance-priority rule. `now` must be the same reference instant for
 * both events being compared (pass it explicitly; do not call Date.now()
 * independently per event or the relative order can flicker mid-sort).
 */
export function compareAttendancePriority(a, b, now = Date.now()) {
  const rankA = attendancePriorityRank(a, now);
  const rankB = attendancePriorityRank(b, now);
  if (rankA.group !== rankB.group) return rankA.group - rankB.group;

  if (rankA.group === 1) {
    if (rankA.live !== rankB.live) return rankA.live ? -1 : 1;
    if (rankA.start !== rankB.start) return rankA.start - rankB.start;
  } else if (rankA.group === 2) {
    if (rankA.end !== rankB.end) return rankA.end - rankB.end;
  } else {
    if (rankA.start !== rankB.start) return rankA.start - rankB.start;
  }

  const titleA = String(a?.title || '');
  const titleB = String(b?.title || '');
  return titleA.localeCompare(titleB, 'ar');
}
