function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function canonicalDomainUrl(value = '') {
  try {
    const url = new URL(cleanText(value));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return `${url.origin}/`;
  } catch {
    return '';
  }
}

function publicHttpUrl(value = '') {
  try {
    const url = new URL(cleanText(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function normalizedDateTime(value = '') {
  let text = cleanText(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(text)) text = `${text}+03:00`;
  if (!text.includes('T') || Number.isNaN(Date.parse(text))) return undefined;
  return text;
}

function eventAccessIsFree(event = {}) {
  const label = cleanText(event.price_label);
  if (/مجاني|free|بدون رسوم/i.test(label)) return true;
  if (/مدفوع|paid|ريال|sar|ر\.س/i.test(label)) return false;
  return undefined;
}

function offerAvailability(event = {}) {
  const state = cleanText(event.registration_status || event.ticket_status).toLowerCase();
  if (/closed|sold.?out|full|مغلق|نفدت|مكتمل/.test(state)) return 'https://schema.org/SoldOut';
  if (/pre.?order|pre.?sale|قريبا|قريبًا|حجز مسبق/.test(state)) return 'https://schema.org/PreOrder';
  if (/open|available|on.?sale|متاح|مفتوح/.test(state)) return 'https://schema.org/InStock';
  return undefined;
}

function offerValidFrom(event = {}) {
  const value = cleanText(
    event.offer_valid_from
      || event.ticket_sales_start
      || event.ticket_sales_start_at
      || event.registration_opens_at
  );
  return normalizedDateTime(value);
}

function numericOfferPrice(event = {}) {
  if (eventAccessIsFree(event) === true) return '0';
  const label = cleanText(event.price_label).replaceAll(',', '');
  const match = label.match(/(?:sar|ر\.?\s?س|ريال)?\s*(\d+(?:\.\d{1,2})?)\s*(?:sar|ر\.?\s?س|ريال)/i);
  return match?.[1];
}

function eventOfferJsonLd(event = {}) {
  if (event.status === 'ended') return undefined;
  const url = cleanText(event.ticket_url || event.registration_url);
  if (!/^https?:\/\//i.test(url)) return undefined;
  const price = numericOfferPrice(event);
  return {
    '@type': 'Offer',
    url,
    availability: offerAvailability(event),
    validFrom: offerValidFrom(event),
    price,
    priceCurrency: price !== undefined ? 'SAR' : undefined,
    category: cleanText(event.price_label) || (event.ticket_url ? 'Ticket' : 'Registration')
  };
}

function performerType(value = '') {
  if (/group|band|فرقة/i.test(value)) return 'PerformingGroup';
  if (/organization|organisation|company|جهة|مؤسسة/i.test(value)) return 'Organization';
  return 'Person';
}

function normalizedPerformer(value) {
  if (typeof value === 'string') {
    const name = cleanText(value);
    return name ? { '@type': 'Person', name } : null;
  }
  if (!value || typeof value !== 'object') return null;
  const name = cleanText(value.name || value.title);
  if (!name) return null;
  const url = publicHttpUrl(value.url || value.website);
  return {
    '@type': performerType(value.type || value['@type']),
    name,
    url: url || undefined
  };
}

function storedPerformer(value) {
  const performer = normalizedPerformer(value);
  if (!performer) return null;
  const type = performer['@type'] === 'PerformingGroup'
    ? 'group'
    : performer['@type'] === 'Organization' ? 'organization' : 'person';
  return {
    name: performer.name,
    type,
    url: performer.url || undefined
  };
}

function eventEvidenceFromJsonLd(value = {}) {
  if (!value || typeof value !== 'object') return {};
  const organizer = Array.isArray(value.organizer) ? value.organizer[0] : value.organizer;
  const offers = Array.isArray(value.offers) ? value.offers : [value.offers].filter(Boolean);
  const offer = offers.find((entry) => entry && typeof entry === 'object') || {};
  const performers = (Array.isArray(value.performer) ? value.performer : [value.performer])
    .map(storedPerformer)
    .filter(Boolean)
    .slice(0, 20);
  const availability = cleanText(offer.availability).split('/').pop().toLowerCase();
  const registrationStatus = availability === 'instock'
    ? 'open'
    : availability === 'soldout' ? 'sold-out' : availability === 'preorder' ? 'preorder' : '';
  const validFrom = cleanText(offer.validFrom);
  const price = offer.price === 0 || offer.price === '0'
    ? 'مجاني'
    : offer.price !== undefined && offer.price !== null && cleanText(offer.price)
      ? `${cleanText(offer.price)} ${cleanText(offer.priceCurrency || 'SAR')}`
      : '';
  const actionUrl = publicHttpUrl(offer.url);
  return {
    organizer: cleanText(organizer?.name) || undefined,
    organizer_url: canonicalDomainUrl(organizer?.url) || undefined,
    performers: performers.length ? performers : undefined,
    registration_url: actionUrl || undefined,
    ticket_url: actionUrl || undefined,
    registration_status: registrationStatus || undefined,
    offer_valid_from: normalizedDateTime(validFrom),
    price_label: price || undefined
  };
}

function eventPerformerJsonLd(event = {}) {
  const candidates = [
    ...(Array.isArray(event.performers) ? event.performers : []),
    ...(event.sessions || [])
      .filter((session) => !session.inferred && !['attendance-window', 'opening-hours'].includes(session.session_type))
      .flatMap((session) => cleanText(session.speaker).split(/\s*[،;|]\s*/))
      .filter(Boolean)
  ];
  const seen = new Set();
  const performers = [];
  for (const candidate of candidates) {
    const performer = normalizedPerformer(candidate);
    const key = cleanText(performer?.name).toLowerCase();
    if (!performer || !key || seen.has(key)) continue;
    seen.add(key);
    performers.push(performer);
    if (performers.length >= 20) break;
  }
  if (!performers.length) return undefined;
  return performers.length === 1 ? performers[0] : performers;
}

function eventOrganizerJsonLd(event = {}, registeredSource = null) {
  const name = cleanText(event.organizer || event.source_owner || event.source_label || '');
  if (!name) return undefined;
  const explicitUrl = canonicalDomainUrl(event.organizer_url || event.organizer_website);
  const trustedRegistryUrl = registeredSource
    && ['official', 'venue-official', 'partner', 'official-marketplace'].includes(registeredSource.trust_level)
    ? canonicalDomainUrl(registeredSource.url)
    : '';
  return {
    '@type': 'Organization',
    name,
    url: explicitUrl || trustedRegistryUrl || undefined
  };
}

export {
  canonicalDomainUrl,
  eventAccessIsFree,
  eventEvidenceFromJsonLd,
  eventOfferJsonLd,
  eventOrganizerJsonLd,
  eventPerformerJsonLd,
  offerAvailability,
  offerValidFrom
};
