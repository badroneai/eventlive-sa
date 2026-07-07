import assert from 'node:assert/strict';
import { isLiveScheduleReady, liveReadySessionCount } from './live-ready-utils.mjs';

const event = {
  source_confidence: 'approved-source',
  sessions: [
    { title: 'Opening', starts_at: '2026-08-01T09:00:00+03:00', ends_at: '2026-08-01T09:30:00+03:00' },
    { title: 'Panel', starts_at: '2026-08-01T10:00:00+03:00', ends_at: '2026-08-01T11:00:00+03:00' },
    { title: 'Workshop', starts_at: '2026-08-01T12:00:00+03:00', ends_at: '2026-08-01T13:00:00+03:00' }
  ]
};

assert.equal(liveReadySessionCount(event), 3);
assert.equal(isLiveScheduleReady(event), true);
assert.equal(isLiveScheduleReady({ ...event, source_confidence: 'pending-review' }), false);
assert.equal(isLiveScheduleReady({ ...event, sessions: event.sessions.slice(0, 2) }), false);
assert.equal(isLiveScheduleReady({
  source_confidence: 'approved-source',
  sessions: [
    {
      title: 'ورشة رسمية قصيرة',
      session_type: 'official-single-session',
      starts_at: '2026-07-06T10:00:00+03:00',
      ends_at: '2026-07-06T11:00:00+03:00'
    }
  ]
}), true);
assert.equal(isLiveScheduleReady({
  source_confidence: 'approved-source',
  sessions: [
    {
      title: 'نافذة حضور مستنتجة',
      session_type: 'attendance-window',
      starts_at: '2026-07-06T10:00:00+03:00',
      ends_at: '2026-07-06T11:00:00+03:00',
      inferred: true,
      source: 'event-start-end'
    }
  ]
}), false);
assert.equal(isLiveScheduleReady({
  source_confidence: 'approved-source',
  sessions: [
    {
      title: 'فعالية طويلة بجلسة واحدة',
      session_type: 'official-single-session',
      starts_at: '2026-07-06T10:00:00+03:00',
      ends_at: '2026-07-07T11:00:00+03:00'
    }
  ]
}), false);
assert.equal(isLiveScheduleReady({
  source_confidence: 'approved-source',
  sessions: [
    { title: 'ساعات الزيارة', session_type: 'opening-hours', starts_at: '2026-09-01T16:00:00+03:00', ends_at: '2026-09-01T22:00:00+03:00' },
    { title: 'ساعات الزيارة', session_type: 'opening-hours', starts_at: '2026-09-02T16:00:00+03:00', ends_at: '2026-09-02T22:00:00+03:00' },
    { title: 'ساعات الزيارة', session_type: 'opening-hours', starts_at: '2026-09-03T16:00:00+03:00', ends_at: '2026-09-03T22:00:00+03:00' }
  ]
}), true);

console.log('live-ready-regression-test: ok');
