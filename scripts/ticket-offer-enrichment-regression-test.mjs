import assert from 'node:assert/strict';
import {
  eventbriteOfferEvidence,
  informaOfferEvidence,
  nofomoOfferEvidence,
  supportsTicketOfferUrl,
  ticketOfferEvidenceFromHtml
} from './ticket-offer-utils.mjs';

const eventbrite = eventbriteOfferEvidence(`
  <script type="application/ld+json">{
    "@context":"https://schema.org",
    "@type":"Event",
    "offers":{"@type":"AggregateOffer","lowPrice":"0.0","highPrice":"0.0","priceCurrency":"USD"}
  }</script>
`);
assert.equal(eventbrite.priceLabel, 'free · 0 USD');
assert.equal(eventbrite.priceCurrency, 'USD');

const informa = informaOfferEvidence(`
  <span class="informa-payment-price-info__end-price">$725.00</span>
  <span class="informa-payment-price-info__end-price">$525.00</span>
`);
assert.equal(informa.priceLabel, '525 USD');
assert.equal(informa.method, 'informa-visible-package-price');

const nofomo = nofomoOfferEvidence(`
  <div><p>SAR</p><p>1,699.00</p></div>
  <div><p>SAR</p><p>499.00</p></div>
  <p>SAR 50 Wallet Credit</p>
`);
assert.equal(nofomo.priceLabel, '499 SAR');
assert.equal(nofomo.method, 'nofomo-visible-ticket-price');

assert.equal(supportsTicketOfferUrl('https://www.eventbrite.com/e/test'), true);
assert.equal(supportsTicketOfferUrl('https://webook.com/ar/event/test'), false, 'unsupported dynamic providers must not be guessed');
assert.equal(ticketOfferEvidenceFromHtml('https://unknown.example/event', '<p>SAR</p><p>10</p>'), null);
assert.equal(eventbriteOfferEvidence('<script type="application/ld+json">not-json</script>'), null);

console.log('TICKET_OFFER_ENRICHMENT_TEST_OK evidence=explicit-only providers=3');
