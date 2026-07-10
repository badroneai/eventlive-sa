import { normalizeArabicSearch } from './arabic-normalize.mjs';
import { normalizeSaudiCity } from './city-utils.mjs';

function normalizedVenueText(value = '') {
  return normalizeArabicSearch(value)
    .replace(/\b(conference|convention)\b/g, ' convention ')
    .replace(/\b(and|&)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cityMatches(eventCity, venueCity) {
  const eventNormalized = normalizeSaudiCity(eventCity, eventCity || '');
  const venueNormalized = normalizeSaudiCity(venueCity, venueCity || '');
  return !eventNormalized || !venueNormalized || eventNormalized === venueNormalized;
}

export function resolveVenueLocation(event = {}, venues = []) {
  const explicitLatitude = Number(event.latitude ?? event.lat);
  const explicitLongitude = Number(event.longitude ?? event.lng ?? event.lon);
  if (Number.isFinite(explicitLatitude) && Number.isFinite(explicitLongitude)) {
    return {
      latitude: explicitLatitude,
      longitude: explicitLongitude,
      precision: event.location_precision || 'source',
      verification_method: event.location_verification_method || 'event-source',
      verified_at: event.location_verified_at || event.verified_at || event.updated_at || '',
      evidence_url: event.location_evidence_url || event.evidence_url || event.source_url || '',
      registry_id: event.location_registry_id || ''
    };
  }

  const haystack = normalizedVenueText([event.venue, event.venue_address].filter(Boolean).join(' '));
  if (!haystack) return null;
  let best = null;
  for (const venue of venues) {
    if (!cityMatches(event.city, venue.city)) continue;
    for (const aliasValue of [venue.name, ...(venue.aliases || [])]) {
      const alias = normalizedVenueText(aliasValue);
      if (alias.length < 5 || !haystack.includes(alias)) continue;
      const score = alias.length + (haystack === alias ? 1000 : 0);
      if (!best || score > best.score) best = { venue, score };
    }
  }
  if (!best) return null;
  const latitude = Number(best.venue.latitude);
  const longitude = Number(best.venue.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    precision: best.venue.precision || 'venue',
    verification_method: best.venue.verification_method || 'venue-registry',
    verified_at: best.venue.verified_at || '',
    evidence_url: best.venue.evidence_url || '',
    registry_id: best.venue.id || ''
  };
}

export function coordinatesQuery(location) {
  if (!location) return '';
  return `${location.latitude},${location.longitude}`;
}
