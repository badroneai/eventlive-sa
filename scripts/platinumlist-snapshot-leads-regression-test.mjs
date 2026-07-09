import assert from 'node:assert/strict';
import {
  chooseBestImageUrl,
  parsePlatinumlistEventLinks,
  parsePlatinumlistHtml
} from './platinumlist-snapshot-leads.mjs';

const fullImage = 'https://cdn.platinumlist.net/upload/event/sample_event_107109-full-en1783268842.jpg';
const middleImage = 'https://cdn.platinumlist.net/upload/event/sample_event_107109-middle-en1783268858.jpg';

assert.equal(chooseBestImageUrl([middleImage, `${fullImage}.webp`, fullImage]), fullImage);

const html = `
<div class="event-grid-item">
  <a class="event-grid-item__picture-container" href="https://riyadh.platinumlist.net/ar/event-tickets/107109/melotech">
    <picture>
      <source srcset="${middleImage}" media="(min-width: 767px)">
      <source srcset="${fullImage}" media="(min-width: 414px)">
      <img alt="ميلوتيك تقدم موجي في الرياض" src="${middleImage}">
    </picture>
  </a>
  <div class="event-grid-item__info">
    <div class="event-grid-item__name">
      <a class="event-grid-item__title" href="https://riyadh.platinumlist.net/ar/event-tickets/107109/melotech">ميلوتيك تقدم موجي في الرياض</a>
    </div>
  </div>
  <div class="event-grid-item__details">
    <div class="event-grid-item__top">
      <span class="price">200.00 SAR</span>
    </div>
    <div class="event-grid-item__bottom">
      <span class="date date--color-gray">الخميس 09 يوليو</span>
    </div>
  </div>
</div>`;

const leads = parsePlatinumlistHtml(html, {
  filePath: 'data/raw/browser-probes/platinumlist-riyadh-test.html',
  source: {
    id: 'platinumlist-riyadh',
    url: 'https://riyadh.platinumlist.net/ar/calendar/today',
    final_url: 'https://riyadh.platinumlist.net/ar/calendar/today'
  }
});

assert.equal(leads.length, 1);
assert.equal(leads[0].city_ar, 'الرياض');
assert.equal(leads[0].title, 'ميلوتيك تقدم موجي في الرياض');
assert.equal(leads[0].date_text, 'الخميس 09 يوليو');
assert.equal(leads[0].price_text, '200.00 SAR');
assert.equal(leads[0].best_image_url, fullImage);
assert.equal(leads[0].source_policy, 'candidate-only');
assert.equal(leads[0].publishable_without_secondary_verification, false);

const linkOnly = parsePlatinumlistEventLinks(
  '<a href="https://riyadh.platinumlist.net/ar/event-tickets/106990/pfl-mena-10">PFL MENA 10 في الرياض</a>',
  { filePath: 'data/raw/browser-probes/platinumlist-riyadh-test.html' }
);

assert.equal(linkOnly.length, 1);
assert.equal(linkOnly[0].source_id, 'platinumlist-riyadh');
assert.equal(linkOnly[0].title, 'PFL MENA 10 في الرياض');
assert.equal(linkOnly[0].evidence_level, 'marketplace-rendered-link');
assert.equal(linkOnly[0].publishable_without_secondary_verification, false);

console.log('TEST_OK platinumlist snapshot lead parser regression checks passed');
