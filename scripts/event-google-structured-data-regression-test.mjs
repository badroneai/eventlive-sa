import assert from 'node:assert/strict';
import {
  eventEvidenceFromJsonLd,
  eventOfferJsonLd,
  eventOrganizerJsonLd,
  eventPerformerJsonLd
} from './event-structured-data-utils.mjs';

const organizer = eventOrganizerJsonLd(
  { organizer: 'Abha Chamber of Commerce' },
  { trust_level: 'official', url: 'https://abhacci.org.sa/Events' }
);
assert.equal(organizer.url, 'https://abhacci.org.sa/');
assert.equal(eventOrganizerJsonLd({ organizer: 'Unknown Organizer' }).url, undefined, 'unknown organizer URLs must not be invented');

const performer = eventPerformerJsonLd({
  performers: [{ name: 'Saudi Band', type: 'group', url: 'https://artists.example.sa/profile' }],
  sessions: [
    { title: 'Keynote', speaker: 'Dr Sara', session_type: 'keynote' },
    { title: 'Attendance', speaker: 'Not a performer', session_type: 'attendance-window', inferred: true }
  ]
});
assert.ok(Array.isArray(performer));
assert.deepEqual(performer.map((entry) => entry.name), ['Saudi Band', 'Dr Sara']);
assert.equal(performer[0]['@type'], 'PerformingGroup');

const verifiedOffer = eventOfferJsonLd({
  status: 'upcoming',
  ticket_url: 'https://tickets.example.sa/event/1',
  registration_status: 'open',
  offer_valid_from: '2026-07-01T09:00:00+03:00',
  price_label: 'مجاني'
});
assert.equal(verifiedOffer.availability, 'https://schema.org/InStock');
assert.equal(verifiedOffer.validFrom, '2026-07-01T09:00:00+03:00');
assert.equal(verifiedOffer.price, '0');
assert.equal(verifiedOffer.priceCurrency, 'SAR');

const usdOffer = eventOfferJsonLd({
  status: 'upcoming',
  ticket_url: 'https://tickets.example.com/event/2',
  price_label: '525 USD'
});
assert.equal(usdOffer.price, '525');
assert.equal(usdOffer.priceCurrency, 'USD', 'verified non-SAR prices must preserve their source currency');

const unknownOffer = eventOfferJsonLd({
  status: 'upcoming',
  registration_url: 'https://register.example.sa/event/1'
});
assert.equal(unknownOffer.availability, undefined, 'availability must remain absent without source evidence');
assert.equal(unknownOffer.validFrom, undefined, 'validFrom must remain absent without a documented sale start');
assert.equal(unknownOffer.price, undefined, 'price must remain absent without source evidence');
assert.equal(unknownOffer.priceCurrency, undefined, 'priceCurrency must remain absent until a verified price exists');
assert.equal(eventOfferJsonLd({ status: 'ended', ticket_url: 'https://tickets.example.sa/event/1' }), undefined);
assert.equal(eventOfferJsonLd({ status: 'upcoming' }), undefined, 'offers must not be fabricated without an action URL');

const extracted = eventEvidenceFromJsonLd({
  '@type': 'Event',
  organizer: { '@type': 'Organization', name: 'Official Host', url: 'https://host.example.sa/events' },
  performer: { '@type': 'PerformingGroup', name: 'Main Band', url: 'https://artists.example.sa/main-band' },
  offers: {
    '@type': 'Offer',
    url: 'https://tickets.example.sa/event/1',
    availability: 'https://schema.org/SoldOut',
    validFrom: '2026-06-01T12:00:00+03:00',
    price: 120,
    priceCurrency: 'SAR'
  }
});
assert.equal(extracted.organizer_url, 'https://host.example.sa/');
assert.equal(extracted.performers[0].type, 'group');
assert.equal(extracted.registration_status, 'sold-out');
assert.equal(extracted.offer_valid_from, '2026-06-01T12:00:00+03:00');
assert.equal(extracted.price_label, '120 SAR');

const aggregateOffer = eventEvidenceFromJsonLd({
  '@type': 'Event',
  offers: {
    '@type': 'AggregateOffer',
    url: 'https://tickets.example.com/event/free',
    lowPrice: '0.0',
    priceCurrency: 'USD'
  }
});
assert.equal(aggregateOffer.price_label, 'مجاني · 0 USD', 'AggregateOffer lowPrice must retain explicit currency evidence');

console.log('EVENT_GOOGLE_STRUCTURED_DATA_OK organizer=official performers=evidence-only offers=evidence-only extraction=json-ld');
