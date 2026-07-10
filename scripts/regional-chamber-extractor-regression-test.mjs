import assert from 'node:assert/strict';
import {
  extractNajranMunicipalityEvents,
  extractNorthernBordersChamberEvents,
  extractTabukChamberEvents
} from './collect-source-candidates.mjs';

const tabukSource = {
  id: 'tabuk-chamber-events',
  name: 'Tabuk Chamber Events',
  url: 'https://www.tabukchamber.sa/',
  owner: 'Tabuk Chamber of Commerce'
};
const tabukRows = extractTabukChamberEvents(`
  <div class=" card-book row col ">
    <div><a href="https://www.tabukchamber.sa/activities/52"><img src="https://www.tabukchamber.sa/storage/poster.jpeg"></a></div>
    <div class="card-body"><a href="https://www.tabukchamber.sa/activities/52"><h6>ورشة قواعد المستفيد الحقيقي</h6></a>
    <p>الثلاثاء 7 يوليو 2026م الساعة 11 صباحاً، مقر غرفة تبوك</p></div>
  </div>
`, tabukSource);
assert.equal(tabukRows.length, 1);
assert.equal(tabukRows[0].starts_at, '2026-07-07T11:00:00+03:00');
assert.equal(tabukRows[0].ends_at, '2026-07-07T13:00:00+03:00');
assert.equal(tabukRows[0].city, 'Tabuk');
assert.equal(tabukRows[0].verification_method, 'official-page-explicit-date');

const northernSource = {
  id: 'northern-borders-chamber-events',
  name: 'Northern Borders Chamber Events',
  url: 'https://ncci.org.sa/category/events/',
  owner: 'Northern Borders Chamber of Commerce',
  disable_ocr: true
};
const northernRows = await extractNorthernBordersChamberEvents(JSON.stringify([{
  id: 4302,
  link: 'https://ncci.org.sa/4302-2/',
  title: { rendered: 'ورشة الصحة والسلامة المهنية' },
  content: { rendered: '<p>الأربعاء 22 أبريل 2026م الساعة 1:00 مساءً عبر منصة ZOOM</p>' },
  _embedded: { 'wp:featuredmedia': [{ source_url: 'https://ncci.org.sa/poster.png' }] }
}]), northernSource);
assert.equal(northernRows.length, 1);
assert.equal(northernRows[0].starts_at, '2026-04-22T13:00:00+03:00');
assert.equal(northernRows[0].city, 'Online');
assert.equal(northernRows[0].time_precision, 'exact');

const najranRows = extractNajranMunicipalityEvents(`
  <dga-card image="/FTPImages/najran-summer.png" data-url="/ar/News/NewsDetails/1381/najran-summer">
    <h4>برعاية أمير المنطقة.. أمانة نجران تطلق فعاليات مهرجان صيفنا هايل 2026 غدًا</h4>
    <span class="text-sm-semibold text-neutral-500">الإثنين, 6 يوليو 2026</span>
    <span class="text-md-regular dga-text-right">تطلق أمانة المنطقة، غدًا، مهرجان صيف نجران 2026 تحت شعار صيفنا هايل، ويستمر لمدة 30 يومًا؛ موزعًا على 11 موقعًا داخل مدينة نجران.</span>
  </dga-card>
`, {
  id: 'najran-municipality-summer-events',
  name: 'Najran Municipality Summer Events',
  url: 'https://www.najran.gov.sa/ar/News/AllNews',
  owner: 'Najran Municipality'
});
assert.equal(najranRows.length, 1);
assert.equal(najranRows[0].starts_at, '2026-07-07T00:00:00+03:00');
assert.equal(najranRows[0].ends_at, '2026-08-05T23:59:00+03:00');
assert.equal(najranRows[0].city, 'Najran');

console.log('REGIONAL_CHAMBER_EXTRACTORS_OK sources=3');
