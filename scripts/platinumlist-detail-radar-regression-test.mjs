import assert from 'node:assert/strict';
import {
  classifyPlatinumlistDetail,
  parseDetailSignals
} from './platinumlist-detail-radar.mjs';

const liveEvent = classifyPlatinumlistDetail({
  url: 'https://riyadh.platinumlist.net/ar/event-tickets/106990/pfl-mena-10',
  title: 'PFL MENA 10 في الرياض',
  text: 'الجمعة 10 يوليو 2026. تفتح الأبواب 6:00 م. يبدأ العرض 8:00 م. Kingdom Arena Riyadh.',
  structured_types: ['Event']
});

assert.equal(liveEvent.radar_kind, 'live-timing-event-radar');
assert.equal(liveEvent.publishable_without_secondary_verification, false);
assert.ok(liveEvent.taxonomy_radar.includes('sports-fanzone-match'));

const attraction = classifyPlatinumlistDetail({
  url: 'https://riyadh.platinumlist.net/ar/event-tickets/six-flags-qiddiya-city',
  title: 'سيكس فلاقز مدينة القدية',
  text: 'تجربة ترفيهية ومدينة ألعاب وحديقة مفتوحة للزوار في الرياض.',
  structured_types: []
});

assert.equal(attraction.radar_kind, 'ongoing-experience-radar');
assert.equal(attraction.public_handling, 'owner-radar-until-product-model-supports-it');
assert.ok(attraction.taxonomy_radar.includes('attraction-tour-experience'));

const parsed = parseDetailSignals({
  url: 'https://jeddah.platinumlist.net/ar/event-tickets/107095/stand-up-comedy-night-in-jeddah',
  title: 'ليلة ستاند أب كوميدي في جدة',
  html: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Event","startDate":"2026-07-10","location":{"@type":"Place","name":"Jeddah"}}</script><img src="https://cdn.platinumlist.net/upload/event/sample-full-en123.jpg">',
  text: 'ليلة ستاند أب كوميدي في جدة\nالجمعة 10 يوليو 2026\nالمكان: جدة\nالتذاكر 90.00 SAR',
  images: []
});

assert.equal(parsed.city_ar, 'جدة');
assert.equal(parsed.has_event_schema, true);
assert.equal(parsed.radar_kind, 'dated-event-radar');
assert.equal(parsed.best_image_url, 'https://cdn.platinumlist.net/upload/event/sample-full-en123.jpg');

console.log('TEST_OK platinumlist detail radar regression checks passed');
