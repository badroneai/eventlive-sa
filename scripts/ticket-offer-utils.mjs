import { load } from 'cheerio';

const supportedHosts = new Set([
  'eventbrite.com',
  'informaconnect.com',
  'nofomo.com'
]);

function cleanText(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizedHost(value = '') {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function numericPrice(value) {
  const cleaned = cleanText(value).replaceAll(',', '').replace(/[^\d.]/g, '');
  if (!cleaned) return undefined;
  const price = Number(cleaned);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

function normalizedCurrency(value = '') {
  const text = cleanText(value).toUpperCase();
  if (text.includes('$') || text.includes('USD')) return 'USD';
  if (text.includes('SAR') || /ريال|ر\.?\s?س/i.test(text)) return 'SAR';
  return '';
}

function evidence(price, currency, method) {
  if (!Number.isFinite(price) || price < 0 || !currency) return null;
  const normalizedPrice = Number(price.toFixed(2));
  return {
    price: normalizedPrice,
    priceCurrency: currency,
    priceLabel: normalizedPrice === 0 ? `free · 0 ${currency}` : `${normalizedPrice} ${currency}`,
    method
  };
}

function lowestEvidence(values = []) {
  return values
    .filter(Boolean)
    .sort((left, right) => left.price - right.price)[0] || null;
}

function jsonLdValues(html = '') {
  const values = [];
  for (const match of String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      values.push(JSON.parse(match[1]));
    } catch {
      // Ignore malformed third-party blocks and continue with the remaining evidence.
    }
  }
  return values;
}

function typedOfferObjects(value, offers = []) {
  if (Array.isArray(value)) {
    for (const item of value) typedOfferObjects(item, offers);
    return offers;
  }
  if (!value || typeof value !== 'object') return offers;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some((type) => type === 'Offer' || type === 'AggregateOffer')) offers.push(value);
  for (const child of Object.values(value)) typedOfferObjects(child, offers);
  return offers;
}

export function supportsTicketOfferUrl(url = '') {
  return supportedHosts.has(normalizedHost(url));
}

export function eventbriteOfferEvidence(html = '') {
  const candidates = typedOfferObjects(jsonLdValues(html)).map((offer) => {
    const price = numericPrice(offer.price ?? offer.lowPrice);
    const currency = normalizedCurrency(offer.priceCurrency);
    return evidence(price, currency, 'eventbrite-json-ld');
  });
  return lowestEvidence(candidates);
}

export function informaOfferEvidence(html = '') {
  const $ = load(String(html));
  const candidates = [];
  $('.informa-payment-price-info__end-price').each((_, element) => {
    const text = cleanText($(element).text());
    candidates.push(evidence(numericPrice(text), normalizedCurrency(text), 'informa-visible-package-price'));
  });
  return lowestEvidence(candidates);
}

export function nofomoOfferEvidence(html = '') {
  const $ = load(String(html));
  const candidates = [];
  $('p').each((_, element) => {
    const currency = normalizedCurrency($(element).text());
    if (!currency) return;
    const priceText = cleanText($(element).next('p').text());
    if (!/^\d[\d,.]*$/u.test(priceText)) return;
    candidates.push(evidence(numericPrice(priceText), currency, 'nofomo-visible-ticket-price'));
  });
  return lowestEvidence(candidates);
}

export function ticketOfferEvidenceFromHtml(url = '', html = '') {
  const host = normalizedHost(url);
  if (host === 'eventbrite.com') return eventbriteOfferEvidence(html);
  if (host === 'informaconnect.com') return informaOfferEvidence(html);
  if (host === 'nofomo.com') return nofomoOfferEvidence(html);
  return null;
}
