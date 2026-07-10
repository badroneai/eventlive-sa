import assert from 'node:assert/strict';
import { parseVisitSaudiSummerPdfXml, restoreVisitSaudiPdfText } from './visit-saudi-summer-pdf-utils.mjs';

assert.equal(restoreVisitSaudiPdfText('يديموك بأ دناتس يقوسد هط ضرع'), 'عرض طه دسوقي ستاند أب كوميدي');
assert.equal(restoreVisitSaudiPdfText('Fan Zone دانيمورب ةدج'), 'جدة بروميناد Fan Zone');
assert.equal(restoreVisitSaudiPdfText('ويلوي 19 - وينوي 11'), '11 يونيو - 19 يوليو');

const fixture = `
<eventlive-pdf-meta year="2026"/>
<pdf2xml>
  <page number="30">
    <fontspec id="title" size="41"/><fontspec id="date" size="32"/><fontspec id="body" size="27"/>
    <eventlive-card-image card="top-left" src="/assets/event-images/visit-saudi-summer-2026-p030-top-left.jpg"/>
    <text top="321" left="87" font="title"><a href="https://webook.com/event"><b> يدابع - كرام شنب عم لايدنوملا اوشيع</b></a></text>
    <text top="369" left="569" font="title"><a href="https://webook.com/event"><b>انيرأ رهوجلا</b></a></text>
    <text top="760" left="538" font="date"><a href="https://webook.com/event"><b> ويلوي 19 - وينوي</b></a></text>
    <text top="760" left="734" font="date"><a href="https://webook.com/event"><b>11</b></a></text>
    <text top="815" left="150" font="body"><a href="https://webook.com/event"> عمجت انيرأ رهوجلا يدابع �إ ملاعلا سأك ءاوجأ لقنت ةيلاعف</a></text>
    <text top="959" left="561" font="title"><a href="https://webook.com/event"><b>ن�ا زجحا</b></a></text>
  </page>
  <page number="64"><fontspec id="title" size="41"/><text top="1" left="1" font="title">ةحابلا</text></page>
  <page number="65">
    <fontspec id="title" size="41"/><fontspec id="date" size="32"/>
    <text top="321" left="900" font="title"><a href="https://maps.app.goo.gl/place"><b>ةيثارتلا ىسوملا ةيرق</b></a></text>
    <text top="760" left="1200" font="date"><a href="https://maps.app.goo.gl/place"><b>سطسغا 31 - ويلوي 1</b></a></text>
  </page>
</pdf2xml>`;

const items = parseVisitSaudiSummerPdfXml(fixture, {
  url: 'https://www.visitsaudi.com/content/dam/documents/saudi-calendar-ar.pdf',
  owner: 'Saudi Tourism Authority'
});

assert.equal(items.length, 2);
assert.equal(items[0].title, 'عيشوا المونديال مع بنش مارك - عبادي الجوهر أرينا');
assert.equal(items[0].starts_at, '2026-06-11T00:00:00+03:00');
assert.equal(items[0].ends_at, '2026-07-19T23:59:00+03:00');
assert.equal(items[0].city, 'Jeddah');
assert.equal(items[0].ticket_url, 'https://webook.com/event');
assert.equal(items[0].image_url, '/assets/event-images/visit-saudi-summer-2026-p030-top-left.jpg');
assert.equal(items[0].image_discovery_method, 'official-pdf-embedded-image');
assert.equal(items[1].title, 'قرية الموسى التراثية');
assert.equal(items[1].city, 'Al Baha');
assert.equal(items[1].ticket_url, undefined);

const unsupportedYear = fixture.replace('year="2026"', 'year="2027"');
assert.equal(parseVisitSaudiSummerPdfXml(unsupportedYear, {}).length, 0, 'unknown annual layouts must fail closed');
assert.equal(parseVisitSaudiSummerPdfXml(fixture.replace('سطسغا 31 - ويلوي 1', 'فيصلا ةياهن ىتح'), {}).length, 1, 'imprecise summer windows must not publish');

console.log(`VISIT_SAUDI_SUMMER_PDF_OK items=${items.length}`);
