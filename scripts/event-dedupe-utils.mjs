import { normalizeArabicSearch } from './arabic-normalize.mjs';
import { normalizeSaudiCity } from './city-utils.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
export const FUZZY_DATE_WINDOW_DAYS = 3;
export const EXACT_SOURCE_CONFLICT_WINDOW_DAYS = 14;

export function normalizeDedupeDigits(value = '') {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeDedupeText(value = '') {
  return normalizeArabicSearch(normalizeDedupeDigits(String(value || '').normalize('NFKC')));
}

function sortedTokens(value = '') {
  return normalizeDedupeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' }));
}

export function canonicalDedupeTitle(value = '') {
  return sortedTokens(value).join(' ');
}

export function canonicalDedupeCity(row = {}) {
  return normalizeDedupeText(normalizeSaudiCity(row.city, row.city || ''));
}

function hasVenueSubdivision(value = '') {
  return /(?:^|\s)(?:hall|room|suite|قاعة|قاعه|صالة|صاله)(?:\s|$)/iu.test(value);
}

export function canonicalDedupeVenue(row = {}) {
  const venue = sortedTokens(row.venue || '').join(' ');
  const address = sortedTokens(row.venue_address || '').join(' ');
  if (!venue) return address;
  if (!address) return venue;
  const subdivided = [venue, address].filter(hasVenueSubdivision);
  if (subdivided.length) return subdivided.sort((left, right) => right.length - left.length)[0];
  return venue;
}

export function sourceAuthority(row = {}) {
  const raw = String(row.source_url || row.evidence_url || '').trim();
  if (raw) {
    try {
      return new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      // Fall through to the declared source identity.
    }
  }
  return normalizeDedupeText(row.source_owner || row.source_label || '');
}

function rangeOf(row = {}) {
  const start = new Date(row.starts_at || row.event_start || '').getTime();
  const end = new Date(row.ends_at || row.event_end || row.starts_at || row.event_start || '').getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

export function startDateDriftDays(first = {}, second = {}) {
  const firstRange = rangeOf(first);
  const secondRange = rangeOf(second);
  if (!firstRange || !secondRange) return Number.POSITIVE_INFINITY;
  return Math.abs(firstRange.start - secondRange.start) / DAY_MS;
}

export function dateRangeGapDays(first = {}, second = {}) {
  const firstRange = rangeOf(first);
  const secondRange = rangeOf(second);
  if (!firstRange || !secondRange) return Number.POSITIVE_INFINITY;
  if (firstRange.start <= secondRange.end && secondRange.start <= firstRange.end) return 0;
  const gap = firstRange.end < secondRange.start
    ? secondRange.start - firstRange.end
    : firstRange.start - secondRange.end;
  return gap / DAY_MS;
}

export function rangesMatchWithinDays(first = {}, second = {}, days = FUZZY_DATE_WINDOW_DAYS) {
  const firstRange = rangeOf(first);
  const secondRange = rangeOf(second);
  if (!firstRange || !secondRange) return false;
  const padding = days * DAY_MS;
  return firstRange.start - padding <= secondRange.end
    && secondRange.start - padding <= firstRange.end;
}

function titleCityKey(row = {}) {
  const titleKey = canonicalDedupeTitle(row.title);
  const cityKey = canonicalDedupeCity(row);
  if (!titleKey || !cityKey) return '';
  return `${titleKey}|${cityKey}`;
}

export function buildFuzzyDuplicateIndex(events = []) {
  const index = new Map();
  for (const event of events) addFuzzyDuplicateIndexEntry(index, event);
  return index;
}

export function addFuzzyDuplicateIndexEntry(index, event = {}) {
  const key = titleCityKey(event);
  if (!key) return;
  const bucket = index.get(key) || [];
  bucket.push(event);
  index.set(key, bucket);
}

export function findExactSourceConflict(row = {}, index = new Map(), { ignoreEventIds = [] } = {}) {
  const key = titleCityKey(row);
  if (!key) return null;
  const ignoredIds = new Set(ignoreEventIds.filter(Boolean));
  const orderedTitle = normalizeDedupeText(row.title);
  const rowSource = sourceAuthority(row);
  const rowVenue = canonicalDedupeVenue(row);
  for (const event of index.get(key) || []) {
    if (event.id && row.id && event.id === row.id) continue;
    if (ignoredIds.has(event.id)) continue;
    const eventSource = sourceAuthority(event);
    if (orderedTitle !== normalizeDedupeText(event.title)) continue;
    const venueConflict = Boolean(rowVenue && canonicalDedupeVenue(event) && rowVenue !== canonicalDedupeVenue(event));
    const startDrift = startDateDriftDays(row, event);
    const dateConflict = startDrift > 0;
    const sourceConflict = Boolean(rowSource && eventSource && rowSource !== eventSource);
    const multiVenueSameWindow = venueConflict && startDrift <= FUZZY_DATE_WINDOW_DAYS;
    const conflictingSourceDate = sourceConflict
      && dateConflict
      && startDrift <= EXACT_SOURCE_CONFLICT_WINDOW_DAYS;
    if (!multiVenueSameWindow && !conflictingSourceDate) continue;
    return {
      kind: sourceConflict
        ? 'exact-title-city-source-conflict'
        : 'exact-title-city-venue-conflict',
      event,
      conflict_fields: [sourceConflict ? 'source' : '', venueConflict ? 'venue' : '', dateConflict ? 'date' : ''].filter(Boolean),
      title_key: canonicalDedupeTitle(row.title),
      venue_key: rowVenue,
      date_gap_days: dateRangeGapDays(row, event),
      start_date_drift_days: startDrift
    };
  }
  return null;
}

export function findFuzzyVenueDateMatch(row = {}, index = new Map()) {
  const key = titleCityKey(row);
  const rowVenue = canonicalDedupeVenue(row);
  if (!key || !rowVenue) return null;
  for (const event of index.get(key) || []) {
    if (event.id && row.id && event.id === row.id) continue;
    const eventVenue = canonicalDedupeVenue(event);
    if (!eventVenue || rowVenue !== eventVenue) continue;
    if (startDateDriftDays(row, event) > FUZZY_DATE_WINDOW_DAYS) continue;
    return {
      kind: 'fuzzy-title-venue-date-window',
      event,
      conflict_fields: ['title-order', 'date-window'],
      title_key: canonicalDedupeTitle(row.title),
      venue_key: rowVenue,
      date_gap_days: dateRangeGapDays(row, event),
      start_date_drift_days: startDateDriftDays(row, event)
    };
  }
  return null;
}

export function findPublicNearDuplicatePairs(events = []) {
  const index = buildFuzzyDuplicateIndex(events);
  const pairs = [];
  const seen = new Set();
  for (const event of events) {
    const match = findFuzzyVenueDateMatch(event, index);
    if (!match) continue;
    const ids = [String(event.id || ''), String(match.event.id || '')].sort();
    const pairKey = ids.join('|');
    if (!ids[0] || seen.has(pairKey)) continue;
    seen.add(pairKey);
    pairs.push({ first_event_id: ids[0], second_event_id: ids[1], ...match });
  }
  return pairs;
}
