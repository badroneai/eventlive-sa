import assert from 'node:assert/strict';
import { parseFlexibleDateRange } from './date-parse-utils.mjs';

const fixedNow = new Date('2026-07-05T12:00:00+03:00');

assert.deepEqual(parseFlexibleDateRange('10-12 يوليو', { now: fixedNow }), {
  starts_at: '2026-07-10T09:00:00+03:00',
  ends_at: '2026-07-12T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('Jul 10-12', { now: fixedNow }), {
  starts_at: '2026-07-10T09:00:00+03:00',
  ends_at: '2026-07-12T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('05 - 12 2018 March', { now: fixedNow }), {
  starts_at: '2018-03-05T09:00:00+03:00',
  ends_at: '2018-03-12T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('30 Jul 2026 - 02 Aug 2026', { now: fixedNow }), {
  starts_at: '2026-07-30T09:00:00+03:00',
  ends_at: '2026-08-02T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('30 Jul - 02 Aug 2026', { now: fixedNow }), {
  starts_at: '2026-07-30T09:00:00+03:00',
  ends_at: '2026-08-02T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('21 - 24 2018 March', { now: fixedNow }), {
  starts_at: '2018-03-21T09:00:00+03:00',
  ends_at: '2018-03-24T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('4 يوليو', { now: fixedNow }), {
  starts_at: '2027-07-04T09:00:00+03:00',
  ends_at: '2027-07-04T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('من 5 إلى 8 أغسطس 2026', { now: fixedNow }), {
  starts_at: '2026-08-05T09:00:00+03:00',
  ends_at: '2026-08-08T18:00:00+03:00'
});
assert.deepEqual(parseFlexibleDateRange('2026-09-01 - 2026-09-03', { now: fixedNow }), {
  starts_at: '2026-09-01T09:00:00+03:00',
  ends_at: '2026-09-03T18:00:00+03:00'
});

console.log('date-parse-regression-test: ok');
