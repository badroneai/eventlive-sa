import assert from 'node:assert/strict';
import { parseQassimUniversityEvents } from './collect-source-candidates.mjs';

const fixture = `
  <div class="jet-listing-grid__item" data-post-id="1">
    <h3 class="jet-listing-dynamic-field__content">12 يوليو 2026</h3>
    <h4 class="elementor-heading-title elementor-size-default">انطلاق النادي الصيفي التاسع لجامعة القصيم</h4>
    <div class="jet-listing-dynamic-field__content">4:30 مساءً</div>
    <a href="https://www.qu.edu.sa/events/summer-club/">قراءة المزيد</a>
  </div>
  <div class="jet-listing-grid__item" data-post-id="2">
    <h3 class="jet-listing-dynamic-field__content">26 يوليو 2026</h3>
    <h4 class="elementor-heading-title elementor-size-default">تغيير التخصص والمقر على الفصل الدراسي الأول</h4>
    <div class="jet-listing-dynamic-field__content">12:00 صباحًا</div>
    <a href="https://www.qu.edu.sa/events/change-major/">قراءة المزيد</a>
  </div>
  <div class="jet-listing-grid__item" data-post-id="3">
    <h3 class="jet-listing-dynamic-field__content">21 أغسطس 2026</h3>
    <h4 class="elementor-heading-title elementor-size-default">اخر موعد لرصد الدرجات للفصل الصيفي</h4>
    <div class="jet-listing-dynamic-field__content">12:00 صباحًا</div>
    <a href="https://www.qu.edu.sa/events/grades/">قراءة المزيد</a>
  </div>`;

const events = parseQassimUniversityEvents(fixture, {
  url: 'https://www.qu.edu.sa/events/',
  owner: 'Qassim University'
});

assert.equal(events.length, 1, 'administrative academic deadlines must not become public events');
assert.equal(events[0].title, 'انطلاق النادي الصيفي التاسع لجامعة القصيم');
assert.equal(events[0].city, 'Buraydah');
assert.equal(events[0].starts_at, '2026-07-12T16:30:00+03:00');
assert.equal(events[0].ends_at, '2026-07-12T18:30:00+03:00');
assert.equal(events[0].time_precision, 'exact');
assert.equal(events[0].category, 'summer program');

console.log(`QASSIM_UNIVERSITY_EXTRACTOR_OK events=${events.length}`);
