import assert from 'node:assert/strict';
import {
  extractExperienceAlulaDetailHtml,
  extractExperienceAlulaFestivalCards,
  parseAlulaDateRange
} from './collect-source-candidates.mjs';

assert.deepEqual(parseAlulaDateRange('Available from 16 July to 22 July 2026'), {
  starts_at: '2026-07-16T09:00:00+03:00',
  ends_at: '2026-07-22T18:00:00+03:00'
});
assert.deepEqual(parseAlulaDateRange('17 Dec 2026 to 9 Jan 2027'), {
  starts_at: '2026-12-17T09:00:00+03:00',
  ends_at: '2027-01-09T18:00:00+03:00'
});
assert.deepEqual(parseAlulaDateRange('23 to 31 Oct 2026'), {
  starts_at: '2026-10-23T09:00:00+03:00',
  ends_at: '2026-10-31T18:00:00+03:00'
});
assert.deepEqual(parseAlulaDateRange('16 Jan - 28 Feb | 10:30 - 18:00', 2026), {
  starts_at: '2026-01-16T09:00:00+03:00',
  ends_at: '2026-02-28T18:00:00+03:00'
});

const detailHtml = `
  <html lang="en"><head>
    <meta property="og:title" content="Summer Fruits Season in AlUla"/>
    <meta property="og:description" content="Stale dates from 22 Jul to 2 Aug 2026."/>
    <meta property="og:image" content="https://s7g10.scene7.com/is/image/rcu/summer-fruits"/>
  </head><body>
    <h3 class="sub-title">Available from 16 July to 22 July 2026</h3>
    <p class="body-semi-bold">Price</p><p class="body">Free entry</p>
    <p class="body-semi-bold">Duration</p><p class="body">1-2 hours</p>
    <p class="body-semi-bold">Age restrictions</p><p class="body">Suitable for all ages</p>
    <p class="body-semi-bold">Meeting location</p><p class="body">AlManshiyah Farmers Market</p>
    <a href="https://maps.app.goo.gl/alula">Get directions</a>
    <p class="body-semi-bold">Parking</p><p class="body">Free parking</p>
    <p class="body-semi-bold">Wheelchair and stroller accessible?</p><p class="body">Yes</p>
    <section id="overview-component"><div class="cmp-text"><p>A seasonal farmers market.</p></div></section>
  </body></html>`;
const detail = extractExperienceAlulaDetailHtml(detailHtml, 'https://www.experiencealula.com/en/whats-on/events/summer-fruits-season-in-alula');
assert.equal(detail.title, 'Summer Fruits Season in AlUla');
assert.equal(detail.city, 'AlUla');
assert.equal(detail.venue, 'AlManshiyah Farmers Market');
assert.equal(detail.price_label, 'free');
assert.equal(detail.maps_url, 'https://maps.app.goo.gl/alula');
assert.equal(detail.parking_info, 'Free parking');
assert.equal(detail.accessibility_info, 'Yes');
assert.equal(detail.summary, 'A seasonal farmers market.');
assert.equal(detail.image_url, 'https://s7g10.scene7.com/is/image/rcu/summer-fruits?$Responsive$&fit=stretch&fmt=webp&wid=1920');

const festivalHtml = `
  <div class="content-block d-flex" data-cmp-is="contentblock">
    <source media="(min-width: 1024px)" srcset="https://s7g10.scene7.com/is/image/rcu/wellness?$Responsive$&amp;wid=1920"/>
    <div class="body-container"><h4 class="title">AlUla Wellness Festival</h4>
    <p class="subtitle tags">23 to 31 Oct 2026</p>
    <div class="description cmp-text"><p>Reconnect and re-energise.</p></div>
    <a href="/en/whats-on/festivals/alula-wellness-festival">Learn more</a></div>
  </div>`;
const festivals = extractExperienceAlulaFestivalCards(festivalHtml, { url: 'https://www.experiencealula.com/en/whats-on/events' });
assert.equal(festivals.length, 1);
assert.equal(festivals[0].title, 'AlUla Wellness Festival');
assert.equal(festivals[0].starts_at, '2026-10-23T09:00:00+03:00');
assert.equal(festivals[0].url, 'https://www.experiencealula.com/en/whats-on/festivals/alula-wellness-festival');

console.log(`EXPERIENCE_ALULA_EXTRACTOR_OK detail=1 festivals=${festivals.length}`);
