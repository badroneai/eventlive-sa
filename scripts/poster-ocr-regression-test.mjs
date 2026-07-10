import assert from 'node:assert/strict';
import { posterScheduleFromOcr } from './poster-ocr-utils.mjs';

const innovation = posterScheduleFromOcr([
  'الأحد الوقت المكان 8 26 أبريل 6م 0 مساءً المعهد السعودي',
  'الأحد الوقت 6 ابريل 2026 المعهد السعودي'
]);
assert.ok(innovation, 'weekday reconciliation must recover the innovation poster date');
assert.equal(innovation.starts_at.slice(0, 10), '2026-04-26');
assert.equal(innovation.weekday_verified, true);

const safety = posterScheduleFromOcr([
  'الأربعاعء الوقت منصة العرض 222 2 أبريل 2026م 0 مساءً عن طريق منصة ZOOM',
  'الأربعاء 22 أبريل 2026م 1:00 مساءً ZOOM'
]);
assert.ok(safety, 'weekday reconciliation must recover the safety poster date');
assert.equal(safety.starts_at, '2026-04-22T13:00:00+03:00');
assert.equal(safety.time_precision, 'exact');

assert.equal(posterScheduleFromOcr(['فعالية بلا تاريخ موثوق']), null, 'uncertain posters must be rejected');

console.log('POSTER_OCR_OK fixtures=3');
