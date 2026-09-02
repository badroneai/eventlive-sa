import fs from 'node:fs';
import path from 'node:path';
import { classifyAudiences } from './audience-utils.mjs';
import { categoryDefinition, normalizeEventCategory, normalizeEventCategoryWithFallback } from './category-taxonomy.mjs';
import {
  addFuzzyDuplicateIndexEntry,
  buildFuzzyDuplicateIndex,
  canonicalDedupeVenue,
  findExactSourceConflict,
  findFuzzyVenueDateMatch,
  sourceAuthority
} from './event-dedupe-utils.mjs';
import { distinctiveTitleTokens, passesImageIdentityGate } from './image-identity-gate.mjs';
import { isLiveScheduleReady, liveReadySessionCount } from './live-ready-utils.mjs';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const candidatesPath = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE)
  : path.join(root, 'data', 'source_candidates.json');
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = process.env.EVENTLIVE_AUTO_PUBLISH_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_AUTO_PUBLISH_REPORT_JSON)
  : path.join(root, 'reports', 'source-auto-publish-report.json');
const reportMdPath = process.env.EVENTLIVE_AUTO_PUBLISH_REPORT_MD
  ? path.join(root, process.env.EVENTLIVE_AUTO_PUBLISH_REPORT_MD)
  : path.join(root, 'reports', 'source-auto-publish-report.md');
const publishedAt = new Date().toISOString();
const categoryFallbackAlerts = [];
const dryRun = ['1', 'true', 'yes'].includes(String(process.env.EVENTLIVE_AUTO_PUBLISH_DRY_RUN || '').toLowerCase());
const includePartner = !['0', 'false', 'no'].includes(String(process.env.EVENTLIVE_AUTO_PUBLISH_PARTNER || 'true').toLowerCase());
const officialUnknownCategoryFallback = 'community-occasions';

function toSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function uniqueId(baseId, existingIds) {
  let id = baseId;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  existingIds.add(id);
  return id;
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function normalizeMatchValue(value) {
  return decodeHtml(value)
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateMatchKey(row) {
  return [normalizeMatchValue(row.title), normalizeMatchValue(row.city), String(row.starts_at || row.event_start || '').slice(0, 10)].join('|');
}

function candidateLooseMatchKey(row) {
  return [normalizeMatchValue(row.title), String(row.starts_at || row.event_start || '').slice(0, 10)].join('|');
}

function candidateDateWindowKey(row) {
  return [
    normalizeMatchValue(row.city),
    String(row.starts_at || row.event_start || '').slice(0, 10),
    String(row.ends_at || row.event_end || '').slice(0, 10)
  ].join('|');
}

function normalizeSourceUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    url.search = '';
    return `${url.hostname}${url.pathname}`.replace(/\/+$/g, '').toLowerCase();
  } catch {
    return raw.split('#')[0].split('?')[0].replace(/\/+$/g, '').toLowerCase();
  }
}

function exactSourcePageKey(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/g, '') || '/';
    return url.toString().toLowerCase();
  } catch {
    return raw.split('#')[0].replace(/\/+$/g, '').toLowerCase();
  }
}

function isMultiEventDocumentUrl(value = '') {
  try {
    return /\.pdf$/i.test(new URL(String(value || '').trim()).pathname);
  } catch {
    return /\.pdf(?:$|[?#])/i.test(String(value || '').trim());
  }
}

// WO-8 identity-continuity guard: candidateSourceDateKey/candidateSourceIdentityKey both
// deliberately return '' for multi-event PDF documents just above (a single PDF page holds
// dozens of distinct dated cards, so a source-URL-only key would collide across ALL of
// them) - which means, for THIS class of source, the entire match cascade in main() falls
// back to title-text keys only (candidateMatchKey/candidateLooseMatchKey). That is exactly
// right day-to-day, but it has one blind spot: when a PDF text-extraction bug (see WO-8's
// lam-alef ligature fix in scripts/visit-saudi-summer-pdf-utils.mjs) is corrected, an
// ALREADY-PUBLISHED event's title text changes on the very next sync (e.g. "حفلة أحام" ->
// "حفلة أحلام") - every title-keyed matcher above would then miss it, and main() would
// mint a brand-new event id instead of updating the existing one in place, leaving the old
// row orphaned with its stale title forever (confirmed by tracing the cascade for this
// exact WO-8 case: no other matcher - bilingual alias is a hardcoded whitelist, action
// identity depends on a ticket URL that may not exist - reliably catches it).
//
// This is the SAME identity question the WO-5 image gate already answers for crops (does
// this title still belong to that card?), so it reuses the identical
// distinctiveTitleTokens/passesImageIdentityGate machinery and default thresholds (>=50%
// of the shorter title's distinctive words, or >=2 words) rather than inventing new ones.
// Scoped ONLY to multi-event document sources (the one class where source-anchored
// matching is unavailable) and requires an exact same-day city+date match on top of the
// token gate, to keep the false-positive surface for every OTHER source untouched.
function ligatureTolerantDocumentTitleMatch(candidate, catalogEvents) {
  if (!isMultiEventDocumentUrl(candidate.source_url)) return null;
  const candidateSource = normalizeSourceUrl(candidate.source_url);
  const candidateDate = String(candidate.starts_at || candidate.event_start || '').slice(0, 10);
  const candidateCity = normalizeMatchValue(candidate.city || '');
  if (!candidateSource || !candidateDate || !candidateCity) return null;
  const candidateTokens = distinctiveTitleTokens(candidate.title);
  if (!candidateTokens.length) return null;
  let best = null;
  for (const event of catalogEvents) {
    if (normalizeSourceUrl(event.source_url) !== candidateSource) continue;
    if (String(event.starts_at || '').slice(0, 10) !== candidateDate) continue;
    if (normalizeMatchValue(event.city || '') !== candidateCity) continue;
    const eventTokens = distinctiveTitleTokens(event.title);
    const gate = passesImageIdentityGate(candidateTokens, eventTokens);
    if (gate.passes && (!best || gate.ratio > best.ratio)) best = { event, ratio: gate.ratio };
  }
  return best ? best.event : null;
}

function candidateSourceDateKey(row) {
  const raw = row.source_url || row.evidence_url || row.image_source_url;
  if (isMultiEventDocumentUrl(raw)) return '';
  const source = normalizeSourceUrl(raw);
  if (!source || !source.includes('/')) return '';
  return [
    source,
    String(row.starts_at || row.event_start || '').slice(0, 10),
    String(row.ends_at || row.event_end || '').slice(0, 10)
  ].join('|');
}

function candidateSourceIdentityKey(row) {
  const raw = String(row.source_url || row.evidence_url || row.image_source_url || '').trim();
  if (isMultiEventDocumentUrl(raw)) return '';
  let source = '';
  try {
    const url = new URL(raw);
    const stableParams = [...url.searchParams.entries()]
      .filter(([key, value]) => /^(?:id|eventid|itemid|event|programid|courseid|bootcampid)$/i.test(key) && value)
      .sort(([a], [b]) => a.localeCompare(b));
    source = `${url.hostname}${url.pathname}`.replace(/\/+$/g, '').toLowerCase();
    if (stableParams.length) source += `?${new URLSearchParams(stableParams).toString().toLowerCase()}`;
  } catch {
    source = normalizeSourceUrl(raw);
  }
  if (!source || !source.includes('/')) return '';
  const pathParts = source.slice(source.indexOf('/') + 1).split('?')[0].split('/').filter(Boolean);
  const genericTail = new Set(['event', 'events', 'calendar', 'program', 'programs', 'bootcamp', 'bootcamps', 'course', 'courses', 'workshop', 'workshops']);
  if (pathParts.length < 2 || genericTail.has(pathParts.at(-1))) return '';
  if (/^(?:ar|en)$/i.test(pathParts[0]) && pathParts.length < 3) return '';
  return source;
}

const actionStopWords = new Set([
  'ar', 'en', 'sa', 'event', 'events', 'ticket', 'tickets', 'book', 'booking',
  'calendar', 'activity', 'activities', 'adventure', 'adventures', 'sport', 'sports',
  'music', 'world', 'cup', 'fifa', 'fan', 'zone', 'at', 'for', 'the', 'one', 'heart',
  'via', 'riyadh', 'jeddah', 'ruh', 'jed', '26', '2026'
]);

function normalizedSearchTokens(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/kimptonkafd/g, 'kimpton kafd')
    .replace(/fanzone/g, 'fan zone')
    .replace(/wc26/g, 'world cup 2026')
    .replace(/tickets?\d+/g, 'tickets')
    .replace(/roh/g, 'ruh')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token && !actionStopWords.has(token) && !/^\d+$/.test(token));
}

function candidateActionIdentityKey(row) {
  const raw = String(row.ticket_url || row.registration_url || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const path = url.pathname.replace(/\/+$/g, '').toLowerCase();
    const stableParams = [...url.searchParams.entries()]
      .filter(([key, value]) => /^(?:id|eventid|eveid|event|programid|courseid|bootcampid|ticketid)$/i.test(key) && value)
      .sort(([a], [b]) => a.localeCompare(b));
    const genericActionPath = /\/(?:login|register|registration|checkout)(?:\.php)?$/i.test(path);
    if (!path || (genericActionPath && !stableParams.length)) return '';
    const query = stableParams.length ? `?${new URLSearchParams(stableParams).toString().toLowerCase()}` : '';
    return `${url.hostname.toLowerCase()}${path}${query}`;
  } catch {
    return '';
  }
}

function actionDistinctiveTokens(row) {
  const identity = candidateActionIdentityKey(row);
  if (!identity) return [];
  return [...new Set(normalizedSearchTokens(identity.slice(identity.indexOf('/') + 1)))];
}

function actionSemanticScore(row, event) {
  const actionTokens = actionDistinctiveTokens(row);
  if (!actionTokens.length) return 0;
  if (normalizeMatchValue(row.city) !== normalizeMatchValue(event.city)) return 0;
  const rowDate = String(row.starts_at || row.event_start || '').slice(0, 10);
  const eventDate = String(event.starts_at || event.event_start || '').slice(0, 10);
  if (!rowDate || rowDate !== eventDate) return 0;
  const eventTokens = new Set(normalizedSearchTokens(`${event.title || ''} ${event.slug || ''} ${event.venue || ''} ${event.organizer || ''}`));
  const overlap = actionTokens.filter((token) => eventTokens.has(token)).length;
  if (!overlap) return 0;
  return overlap / actionTokens.length;
}

function findActionSemanticMatch(row, events) {
  let best = null;
  let bestScore = 0;
  for (const event of events) {
    if (event.id === row.id) continue;
    const score = actionSemanticScore(row, event);
    if (score >= 0.5 && score > bestScore) {
      best = event;
      bestScore = score;
    }
  }
  return best;
}

function bilingualAliasKey(row) {
  const title = normalizeMatchValue(row.title);
  const source = normalizeSourceUrl(row.source_url || row.evidence_url);
  const year = String(row.starts_at || row.event_start || '').slice(0, 4);
  let alias = '';
  if (/(?:^|\s)(?:kashtah|كشتة)(?:\s|$)/i.test(title)) alias = 'kashtah';
  if (
    /eportal\.scega\.gov\.sa\/h-events-details\/2041$/.test(source)
    || /^(?:leap|ليب)\s*(?:20)?26$/i.test(title)
  ) alias = 'leap';
  if (
    /eportal\.scega\.gov\.sa\/h-events-details\/2087$/.test(source)
    || title === 'saudi woodshow'
    || title === 'ملتقى الأخشاب الدولي'
  ) alias = 'saudi-woodshow';
  if (
    /eportal\.scega\.gov\.sa\/h-events-details\/2086$/.test(source)
    || /riyadh global medical biotechnology summit/i.test(title)
    || /قمة الرياض العالمية للتقنية الحيوية الطبية/.test(title)
  ) alias = 'riyadh-medical-biotechnology-summit';
  if (
    /eportal\.scega\.gov\.sa\/h-events-details\/2088$/.test(source)
    || /al m[ei]lwah falcon race/i.test(title)
    || title === 'سباق الملواح'
  ) alias = 'al-milwah-falcon-race';
  if (!alias) return '';
  return [alias, normalizeMatchValue(row.city), year].join('|');
}

function reconcileCollapsedMultiEventDocuments(candidates, catalogEvents) {
  const groups = new Map();
  for (const candidate of candidates) {
    if (!candidate.matched_catalog_event_id || !isMultiEventDocumentUrl(candidate.source_url)) continue;
    const rows = groups.get(candidate.matched_catalog_event_id) || [];
    rows.push(candidate);
    groups.set(candidate.matched_catalog_event_id, rows);
  }
  const staleEventIds = new Set();
  for (const [eventId, rows] of groups) {
    const distinctRows = new Set(rows.map((row) => candidateMatchKey(row)));
    const catalogEvent = catalogEvents.find((event) => event.id === eventId);
    if (
      distinctRows.size > 1
      && catalogEvent
      && isAutoPublishedEventLiveRow(catalogEvent)
      && isMultiEventDocumentUrl(catalogEvent.source_url)
    ) staleEventIds.add(eventId);
  }
  if (!staleEventIds.size) return { candidates, catalogEvents };
  return {
    catalogEvents: catalogEvents.filter((event) => !staleEventIds.has(event.id)),
    candidates: candidates.map((candidate) => {
      if (!staleEventIds.has(candidate.matched_catalog_event_id)) return candidate;
      const {
        matched_catalog_event_id,
        reviewed_at,
        reviewed_by,
        ...rest
      } = candidate;
      return {
        ...rest,
        review_status: 'ready-for-review',
        publication_gate: 'duplicate-review',
        reviewer_notes: `${candidate.reviewer_notes || ''} أُعيدت المطابقة بعد تصحيح هوية مستند متعدد الفعاليات.`.trim()
      };
    })
  };
}

function preferredDuplicateEvent(first, second) {
  const firstCanonical = first.id === `event-${first.slug}`;
  const secondCanonical = second.id === `event-${second.slug}`;
  if (firstCanonical !== secondCanonical) return firstCanonical ? first : second;
  const score = (event) => [
    event.image_url || event.original_image_url,
    event.registration_url,
    event.ticket_url,
    event.description || event.rich_summary,
    event.summary,
    event.program_outline?.official_description,
    event.price !== undefined || event.low_price !== undefined,
    Array.isArray(event.sessions) && event.sessions.length,
    event.live_schedule_ready
  ].filter(Boolean).length;
  return score(second) > score(first) ? second : first;
}

function mergeActionFields(preferred, discarded) {
  const isMissing = (value) => value === undefined || value === null || value === '';
  for (const field of [
    'registration_url',
    'ticket_url',
    'organizer_url',
    'description',
    'rich_summary',
    'summary',
    'program_outline',
    'price',
    'low_price',
    'high_price',
    'price_currency',
    'offer_valid_from'
  ]) {
    if (isMissing(preferred[field]) && !isMissing(discarded[field])) preferred[field] = discarded[field];
  }
  if ((!Array.isArray(preferred.sessions) || !preferred.sessions.length) && Array.isArray(discarded.sessions) && discarded.sessions.length) {
    preferred.sessions = discarded.sessions;
    preferred.sessions_count = discarded.sessions_count || discarded.sessions.length;
    preferred.live_schedule_ready = Boolean(discarded.live_schedule_ready);
  }
  return preferred;
}

function dedupeActionSemanticCatalog(events) {
  const result = [...events];
  const removed = [];
  for (let index = 0; index < result.length; index += 1) {
    const event = result[index];
    if (!candidateActionIdentityKey(event)) continue;
    const match = findActionSemanticMatch(event, result);
    if (!match) continue;
    if (event.published_by !== 'EventLive Auto Publisher' && match.published_by !== 'EventLive Auto Publisher') continue;
    const matchIndex = result.indexOf(match);
    if (matchIndex < 0 || matchIndex === index) continue;
    const preferredRecord = preferredDuplicateEvent(match, event);
    const preferred = mergeActionFields(preferredRecord, preferredRecord === match ? event : match);
    const discarded = preferred === match ? event : match;
    const preferredIndex = preferred === match ? matchIndex : index;
    const discardedIndex = preferred === match ? index : matchIndex;
    result[preferredIndex] = preferred;
    result.splice(discardedIndex, 1);
    if (discardedIndex < index) index -= 1;
    removed.push({ removed_event_id: discarded.id, kept_event_id: preferred.id, reason: 'action-url-semantic-match' });
  }
  return { events: result, removed };
}

function dedupeBilingualAliasCatalog(events) {
  const result = [];
  const indexByAlias = new Map();
  const removed = [];
  for (const event of events) {
    const alias = bilingualAliasKey(event);
    if (!alias || !indexByAlias.has(alias)) {
      if (alias) indexByAlias.set(alias, result.length);
      result.push(event);
      continue;
    }
    const index = indexByAlias.get(alias);
    const existing = result[index];
    if (existing.published_by !== 'EventLive Auto Publisher' && event.published_by !== 'EventLive Auto Publisher') {
      result.push(event);
      continue;
    }
    const preferredRecord = preferredDuplicateEvent(existing, event);
    const preferred = mergeActionFields(preferredRecord, preferredRecord === existing ? event : existing);
    const discarded = preferred === existing ? event : existing;
    result[index] = preferred;
    removed.push({ removed_event_id: discarded.id, kept_event_id: preferred.id, reason: 'bilingual-title-alias' });
  }
  return { events: result, removed };
}

function dedupeAutoPublishedCatalog(events) {
  const result = [];
  const indexByIdentity = new Map();
  const removed = [];
  for (const event of events) {
    const identity = event.published_by === 'EventLive Auto Publisher' ? candidateSourceIdentityKey(event) : '';
    if (!identity || !indexByIdentity.has(identity)) {
      if (identity) indexByIdentity.set(identity, result.length);
      result.push(event);
      continue;
    }
    const index = indexByIdentity.get(identity);
    const existing = result[index];
    const preferred = preferredDuplicateEvent(existing, event);
    const discarded = preferred === existing ? event : existing;
    result[index] = preferred;
    removed.push({ removed_event_id: discarded.id, kept_event_id: preferred.id, source_identity: identity });
  }
  return { events: result, removed };
}

function dedupeAutoPublishedSemanticCatalog(events) {
  const result = [];
  const indexByIdentity = new Map();
  const removed = [];
  for (const event of events) {
    const identity = event.published_by === 'EventLive Auto Publisher' ? candidateMatchKey(event) : '';
    const matchingIndex = (indexByIdentity.get(identity) || []).find((index) => {
      const existing = result[index];
      const existingVenue = canonicalDedupeVenue(existing);
      const eventVenue = canonicalDedupeVenue(event);
      if (existingVenue && eventVenue) return existingVenue === eventVenue;
      if (existingVenue || eventVenue) return false;
      const existingSource = sourceAuthority(existing);
      const eventSource = sourceAuthority(event);
      return Boolean(existingSource && eventSource && existingSource === eventSource);
    });
    if (!identity || matchingIndex === undefined) {
      if (identity) {
        const indexes = indexByIdentity.get(identity) || [];
        indexes.push(result.length);
        indexByIdentity.set(identity, indexes);
      }
      result.push(event);
      continue;
    }
    const existing = result[matchingIndex];
    const preferredRecord = preferredDuplicateEvent(existing, event);
    const preferred = mergeActionFields(preferredRecord, preferredRecord === existing ? event : existing);
    const discarded = preferred === existing ? event : existing;
    result[matchingIndex] = preferred;
    removed.push({
      removed_event_id: discarded.id,
      kept_event_id: preferred.id,
      reason: 'title-city-date-semantic-match'
    });
  }
  return { events: result, removed };
}

function duplicateReviewResult(candidate, alert, duplicateReviewAlerts, blocked) {
  const possibleEvent = alert.event;
  const reportAlert = {
    kind: alert.kind,
    candidate_id: candidate.id,
    possible_event_id: possibleEvent.id,
    conflict_fields: alert.conflict_fields,
    title_key: alert.title_key,
    venue_key: alert.venue_key,
    candidate_source: sourceAuthority(candidate),
    existing_source: sourceAuthority(possibleEvent),
    candidate_starts_at: candidate.starts_at || candidate.event_start || '',
    existing_starts_at: possibleEvent.starts_at || possibleEvent.event_start || '',
    date_gap_days: Number(alert.date_gap_days.toFixed(3)),
    start_date_drift_days: Number(alert.start_date_drift_days.toFixed(3))
  };
  duplicateReviewAlerts.push(reportAlert);
  blocked.push({
    candidate_id: candidate.id,
    title: candidate.title,
    reason: `possible duplicate requires review: ${alert.kind}`,
    kind: alert.kind,
    possible_event_id: possibleEvent.id
  });
  const note = `تنبيه تكرار ${alert.kind}: راجع السجل المحتمل ${possibleEvent.id}.`;
  const { matched_catalog_event_id: staleMatch, ...unmatchedCandidate } = candidate;
  return {
    ...unmatchedCandidate,
    review_status: candidate.review_status === 'rejected' ? 'rejected' : 'ready-for-review',
    publication_gate: 'duplicate-review',
    reviewer_notes: String(candidate.reviewer_notes || '').includes(note)
      ? candidate.reviewer_notes
      : `${candidate.reviewer_notes || ''} ${note}`.trim()
  };
}

function canonicalizeQueryIdentityEvents(events, candidates) {
  const queryEvents = events.filter((event) => (
    event.published_by === 'EventLive Auto Publisher'
    && candidateSourceIdentityKey(event).includes('?')
  ));
  const queryIds = new Set(queryEvents.map((event) => event.id));
  const reservedIds = new Set(events.filter((event) => !queryIds.has(event.id)).map((event) => event.id));
  const idMap = new Map();
  for (const event of queryEvents) {
    const slug = toSlug(event.title || event.id);
    const nextId = uniqueId(`event-${slug}`, reservedIds);
    reservedIds.add(nextId);
    if (event.id !== nextId) idMap.set(event.id, nextId);
    event.id = nextId;
    event.slug = slug;
  }
  const updatedCandidates = candidates.map((candidate) => idMap.has(candidate.matched_catalog_event_id)
    ? { ...candidate, matched_catalog_event_id: idMap.get(candidate.matched_catalog_event_id) }
    : candidate);
  return {
    candidates: updatedCandidates,
    remapped: [...idMap.entries()].map(([from, to]) => ({ from, to }))
  };
}

function isLongSeasonLike(row) {
  const start = new Date(row.starts_at || row.event_start).getTime();
  const end = new Date(row.ends_at || row.event_end || row.starts_at || row.event_start).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const durationDays = Math.round((end - start) / 86400000);
  const text = `${row.title || ''} ${row.category || ''}`.toLowerCase();
  return durationDays >= 7 && /season|موسم|festival|summer|winter/.test(text);
}

function isPast(candidate) {
  const end = new Date(candidate.ends_at || candidate.starts_at).getTime();
  return !Number.isNaN(end) && end < Date.now();
}

function isValidPublicDateTime(value = '') {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(String(value || ''))
    && !Number.isNaN(new Date(value).getTime());
}

function hasValidPublicDateTimes(row = {}) {
  return isValidPublicDateTime(row.starts_at || row.event_start)
    && isValidPublicDateTime(row.ends_at || row.event_end);
}

function isAutoPublishedEventLiveRow(row = {}) {
  return row.published_by === 'EventLive Auto Publisher';
}

function hasPreciseLiveSchedule(row = {}) {
  return Boolean(row.live_schedule_ready)
    && Array.isArray(row.sessions)
    && row.sessions.some((session) => String(session.session_type || '').startsWith('official-') && session.starts_at && session.ends_at);
}

function hasOfficialProviderEnrichment(row = {}) {
  return Boolean(row.program_outline?.provider && row.program_outline?.source_url);
}

function shouldPreservePrimaryOfficialRecord(existing = {}, candidate = {}) {
  return hasOfficialProviderEnrichment(existing);
}

function sourceConfidenceFor(candidate) {
  if (candidate.confidence === 'official') return 'approved-source';
  if (candidate.confidence === 'verified-secondary') return 'corroborated-source';
  if (candidate.confidence === 'partner') return 'organizer-confirmed';
  if (candidate.evidence_url || candidate.raw_snapshot_path) return 'pending-review';
  return 'needs-source-evidence';
}

function hasVerifiedSecondaryEvidence(candidate) {
  if (candidate.confidence !== 'verified-secondary') return false;
  if (candidate.secondary_verification_kind !== 'official-source-evidence') return false;
  if (!candidate.secondary_verified_at) return false;
  if (candidate.verification_method !== 'directory-official-link-page-confirmation') return false;
  try {
    const officialHost = new URL(candidate.source_url || '').hostname.replace(/^www\./, '');
    const discoveryHost = new URL(candidate.discovery_source_url || '').hostname.replace(/^www\./, '');
    return Boolean(officialHost && discoveryHost && officialHost !== discoveryHost);
  } catch {
    return false;
  }
}

function richFieldsFromCandidate(candidate = {}) {
  const fields = {};
  [
    'image_url',
    'image_alt',
    'image_source_url',
    'registration_url',
    'ticket_url',
    'organizer_url',
    'registration_status',
    'ticket_status',
    'offer_valid_from',
    'maps_url',
    'attendance_mode',
    'price_label',
    'language',
    'rich_summary',
    'registration_deadline',
    'parking_info',
    'accessibility_info',
    'age_policy',
    'duration_label',
    'richness_score'
  ].forEach((key) => {
    if (candidate[key] !== undefined && candidate[key] !== null && candidate[key] !== '') fields[key] = candidate[key];
  });
  if (Array.isArray(candidate.highlights) && candidate.highlights.length) fields.highlights = candidate.highlights.slice(0, 8);
  if (Array.isArray(candidate.performers) && candidate.performers.length) fields.performers = candidate.performers.slice(0, 20);
  return fields;
}

function mergeMissingCandidateEnrichment(existing = {}, candidate = {}) {
  const richFields = richFieldsFromCandidate(candidate);
  const imageMissing = !existing.image_url
    || String(existing.image_url).startsWith('/assets/event-covers/')
    || /\/themes\/custom\/[^?#]*(?:list|logo|icon)[^/?#]*\.(?:png|jpe?g|webp|svg)(?:$|[?#])/i.test(String(existing.image_url));
  const verifiedOfficialImage = hasVerifiedSecondaryEvidence(candidate)
    && richFields.image_url
    && normalizeSourceUrl(candidate.image_source_url) === normalizeSourceUrl(candidate.source_url);
  if ((imageMissing || verifiedOfficialImage) && richFields.image_url) {
    existing.image_url = richFields.image_url;
    existing.original_image_url = candidate.original_image_url || richFields.image_url;
    existing.image_alt = richFields.image_alt || existing.image_alt || candidate.title;
    existing.image_source_url = richFields.image_source_url || existing.image_source_url || candidate.source_url || '';
  }
  for (const field of ['registration_url', 'ticket_url', 'organizer_url', 'registration_status', 'ticket_status', 'offer_valid_from', 'maps_url', 'attendance_mode', 'price_label', 'language', 'rich_summary', 'registration_deadline', 'parking_info', 'accessibility_info', 'age_policy', 'duration_label']) {
    if (!existing[field] && richFields[field]) existing[field] = richFields[field];
  }
  if ((!Array.isArray(existing.highlights) || !existing.highlights.length) && richFields.highlights) {
    existing.highlights = richFields.highlights;
  }
  if ((!Array.isArray(existing.performers) || !existing.performers.length) && richFields.performers) {
    existing.performers = richFields.performers;
  }
  existing.richness_score = Math.max(Number(existing.richness_score || 0), Number(richFields.richness_score || 0));
  const candidateSessions = Array.isArray(candidate.sessions) ? candidate.sessions : [];
  const scheduleConfidence = candidate.confidence === 'official'
    ? sourceConfidenceFor(candidate)
    : (existing.source_confidence || sourceConfidenceFor(candidate));
  const candidateScheduleReady = isLiveScheduleReady({
    ...existing,
    ...candidate,
    source_confidence: scheduleConfidence,
    sessions: candidateSessions
  });
  if (candidateSessions.length && (!hasPreciseLiveSchedule(existing)
    || (candidateScheduleReady
      && normalizeSourceUrl(existing.source_url || existing.evidence_url) === normalizeSourceUrl(candidate.source_url || candidate.evidence_url)))) {
    existing.sessions = candidateSessions;
    existing.sessions_count = liveReadySessionCount({ sessions: candidateSessions });
    existing.live_schedule_ready = candidateScheduleReady;
    if (candidateScheduleReady && !existing.url) existing.url = candidate.source_url || candidate.evidence_url || '';
    if (!candidateScheduleReady) delete existing.url;
  }
  return existing;
}

function catalogEventFromCandidate(candidate, existingIds) {
  const slug = toSlug(candidate.title || candidate.id);
  const baseId = `event-${slug || candidate.id.replace(/^candidate-/, '')}`;
  const rawCategory = String(candidate.category || '').trim() || 'unspecified';
  const category = categoryDefinition(rawCategory, candidate)?.key || officialUnknownCategoryFallback;
  const sessions = Array.isArray(candidate.sessions) ? candidate.sessions : [];
  const sessionsCount = Math.max(Number(candidate.extracted_sessions_count || 0), liveReadySessionCount({ sessions }));
  const liveScheduleReady = isLiveScheduleReady({ ...candidate, source_confidence: sourceConfidenceFor(candidate), sessions });
  const event = {
    id: uniqueId(baseId, existingIds),
    slug,
    title: decodeHtml(candidate.title),
    organizer: candidate.organizer || candidate.source_owner || candidate.source_label,
    city: candidate.city,
    venue: candidate.venue || candidate.city,
    venue_address: candidate.venue || candidate.city,
    category,
    raw_category: rawCategory,
    summary: candidate.summary || `فعالية منشورة آلياً من ${candidate.source_label}.`,
    ...richFieldsFromCandidate(candidate),
    ...(candidate.image_url || candidate.image || candidate.original_image_url ? {
      image_url: candidate.image_url || candidate.image || candidate.original_image_url,
      original_image_url: candidate.original_image_url || candidate.image_url || candidate.image,
      image_alt: candidate.image_alt || candidate.title,
      image_source_url: candidate.image_source_url || candidate.source_url || candidate.evidence_url || ''
    } : {}),
    starts_at: candidate.starts_at,
    ends_at: candidate.ends_at,
    updated_at: publishedAt,
    ...(sessions.length ? { sessions } : {}),
    sessions_count: sessionsCount,
    tracks_count: 0,
    rooms_count: 0,
    live_updates_count: 0,
    approval_status: 'published',
    published_by: 'EventLive Auto Publisher',
    source_label: candidate.source_label,
    source_url: candidate.source_url || '',
    evidence_url: candidate.evidence_url || candidate.source_url || '',
    source_confidence: sourceConfidenceFor(candidate),
    live_schedule_ready: liveScheduleReady,
    ...(liveScheduleReady ? { url: candidate.source_url || candidate.evidence_url || '' } : {}),
    source_file: candidate.raw_snapshot_path || '',
    // The collectors already judge how much of each timestamp came from the
    // source and how much they invented — 'exact', 'exact-start-estimated-end',
    // 'date-only', 'date-only-defaulted', 'official-session-times', 'unknown'.
    // This allowlist dropped both fields, so the published catalog carried the
    // judgement on 0 of 866 rows and every surface had to treat a fabricated
    // 09:00–18:00 default exactly like a sourced clock. That is the difference
    // between "we know it ends at 21:00" and "we guessed 18:00", and the site was
    // asserting both with the same confidence (owner report 2026-09-02).
    // 'unknown' is written when a collector offers nothing: absent means the
    // pipeline forgot, unknown means it looked and could not tell — the two must
    // stay distinguishable (AGENTS.md law 2.6).
    time_precision: candidate.time_precision || 'unknown',
    ...(candidate.date_precision ? { date_precision: candidate.date_precision } : {}),
    tags: Array.isArray(candidate.tags) ? candidate.tags.slice(0, 10) : [],
    audiences: classifyAudiences(candidate)
  };
  return normalizeEventCategoryWithFallback(event, categoryFallbackAlerts);
}

function autoPublishBlocker(candidate, catalogByMatch, catalogByLooseMatch, catalogByDateWindow, catalogBySourceDate) {
  if (!candidate.title || !candidate.city || !candidate.starts_at || !candidate.ends_at) return 'missing required public fields';
  if (candidate.confidence !== 'official' && !categoryDefinition(candidate.category, candidate)) {
    return 'unknown category requires review';
  }
  if (!isValidPublicDateTime(candidate.starts_at) || !isValidPublicDateTime(candidate.ends_at)) return 'invalid public datetime';
  if (!candidate.source_url || !candidate.source_label || !candidate.source_owner) return 'missing source identity';
  if (!candidate.evidence_url && !candidate.raw_snapshot_path) return 'missing evidence';
  if (isPast(candidate)) return 'candidate already ended';
  if (candidate.review_status === 'rejected' || candidate.publication_gate === 'blocked') return 'candidate is blocked';
  if (['source-evidence', 'extraction'].includes(candidate.publication_gate)) {
    return `publication gate ${candidate.publication_gate} is not auto-publishable`;
  }
  if (catalogByMatch.has(candidateMatchKey(candidate))) return 'possible duplicate already exists';
  if (catalogByLooseMatch.has(candidateLooseMatchKey(candidate))) return 'possible duplicate by title/date already exists';
  const sourceDateKey = candidateSourceDateKey(candidate);
  if (sourceDateKey && catalogBySourceDate.has(sourceDateKey)) return 'possible duplicate by source/date already exists';
  if (isLongSeasonLike(candidate) && catalogByDateWindow.has(candidateDateWindowKey(candidate))) {
    return 'possible duplicate by city/date window already exists';
  }
  if (candidate.confidence === 'official' || hasVerifiedSecondaryEvidence(candidate)) return '';
  if (includePartner && candidate.confidence === 'partner') return '';
  return `confidence ${candidate.confidence || 'unknown'} is not auto-publishable`;
}

function trustedAlreadyPublished(candidate) {
  if (!candidate.title || !candidate.city || !candidate.starts_at || !candidate.ends_at) return false;
  if (!isValidPublicDateTime(candidate.starts_at) || !isValidPublicDateTime(candidate.ends_at)) return false;
  if (!candidate.source_url || !candidate.source_label || !candidate.source_owner) return false;
  if (!candidate.evidence_url && !candidate.raw_snapshot_path) return false;
  if (isPast(candidate)) return false;
  if (candidate.review_status === 'rejected' || candidate.publication_gate === 'blocked') return false;
  if (['source-evidence', 'extraction'].includes(candidate.publication_gate)) return false;
  return candidate.confidence === 'official'
    || hasVerifiedSecondaryEvidence(candidate)
    || (includePartner && candidate.confidence === 'partner');
}

function writeReport(report) {
  const totals = report.totals || {
    candidates_seen: report.candidates_seen,
    published: report.published.length,
    linked_existing: report.linked_existing?.length || 0,
    blocked: report.blocked.length
  };
  const blockedByReason = report.blocked.reduce((acc, item) => {
    const reason = item.reason || 'unknown';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  writeJson(reportJsonPath, report);
  const lines = [
    '# EventLive Source Auto Publish Report',
    '',
    `- published_at: ${report.published_at}`,
    `- dry_run: ${report.dry_run}`,
    `- include_partner: ${report.include_partner}`,
    `- candidates_seen: ${totals.candidates_seen}`,
    `- published_new: ${totals.published}`,
    `- linked_existing: ${totals.linked_existing}`,
    `- blocked_remaining: ${totals.blocked}`,
    `- duplicate_review_alerts: ${totals.duplicate_review_alerts || 0}`,
    '',
    '## Blocked summary',
    '',
    ...Object.entries(blockedByReason).map(([reason, count]) => `- ${reason}: ${count}`),
    '',
    '| Candidate | Status | Catalog event | Reason |',
    '|---|---|---|---|',
    ...report.published.map((item) => `| ${item.candidate_id} | published | ${item.event_id} | ${item.title} |`),
    ...(report.linked_existing || []).map((item) => `| ${item.candidate_id} | linked-existing | ${item.event_id} | ${item.reason} |`),
    ...report.blocked.map((item) => `| ${item.candidate_id} | blocked | ${item.possible_event_id || '-'} | ${item.reason} |`)
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  if (!exists(candidatesPath)) throw new Error(`Source candidates file not found: ${rel(candidatesPath)}`);
  if (!exists(catalogPath)) throw new Error(`Events catalog file not found: ${rel(catalogPath)}`);

  const candidatesEnvelope = readJson(candidatesPath);
  const catalogEnvelope = readJson(catalogPath);
  const rawCandidates = Array.isArray(candidatesEnvelope.candidates) ? candidatesEnvelope.candidates : [];
  const rawCatalogEvents = Array.isArray(catalogEnvelope.events) ? catalogEnvelope.events : [];
  const reconciledDocuments = reconcileCollapsedMultiEventDocuments(rawCandidates, rawCatalogEvents);
  const candidates = reconciledDocuments.candidates;
  const validCatalogEvents = reconciledDocuments.catalogEvents
    .filter((event) => hasValidPublicDateTimes(event) || !isAutoPublishedEventLiveRow(event))
    .map((event) => normalizeEventCategoryWithFallback(event, categoryFallbackAlerts));
  const dedupedCatalog = dedupeAutoPublishedCatalog(validCatalogEvents);
  const semanticDedupedCatalog = dedupeAutoPublishedSemanticCatalog(dedupedCatalog.events);
  const actionDedupedCatalog = dedupeActionSemanticCatalog(semanticDedupedCatalog.events);
  const aliasDedupedCatalog = dedupeBilingualAliasCatalog(actionDedupedCatalog.events);
  const catalogEvents = aliasDedupedCatalog.events;
  const existingIds = new Set(catalogEvents.map((event) => event.id));
  const catalogByMatch = new Map(catalogEvents.map((event) => [candidateMatchKey(event), event]));
  const catalogByLooseMatch = new Map(catalogEvents.map((event) => [candidateLooseMatchKey(event), event]));
  const catalogByDateWindow = new Map(catalogEvents
    .filter(isLongSeasonLike)
    .map((event) => [candidateDateWindowKey(event), event]));
  const catalogBySourceDate = new Map(catalogEvents
    .map((event) => [candidateSourceDateKey(event), event])
    .filter(([key]) => key));
  const catalogBySourceIdentity = new Map(catalogEvents
    .map((event) => [candidateSourceIdentityKey(event), event])
    .filter(([key]) => key));
  const catalogByActionIdentity = new Map(catalogEvents
    .map((event) => [candidateActionIdentityKey(event), event])
    .filter(([key]) => key));
  const catalogByBilingualAlias = new Map(catalogEvents
    .map((event) => [bilingualAliasKey(event), event])
    .filter(([key]) => key));
  const fuzzyDuplicateIndex = buildFuzzyDuplicateIndex(catalogEvents);
  const published = [];
  const linkedExisting = [];
  const blocked = [];
  const duplicateReviewAlerts = [];

  let updatedCandidates = candidates.map((candidate) => {
    if (
      candidate.review_status === 'approved-for-catalog'
      && candidate.matched_catalog_event_id
      && !existingIds.has(candidate.matched_catalog_event_id)
    ) {
      blocked.push({
        candidate_id: candidate.id,
        title: candidate.title,
        reason: `linked catalog row ${candidate.matched_catalog_event_id} was superseded by dedupe`
      });
      return candidate;
    }
    const exactMatch = catalogByMatch.get(candidateMatchKey(candidate));
    const looseMatch = !exactMatch ? catalogByLooseMatch.get(candidateLooseMatchKey(candidate)) : null;
    const bilingualAliasMatch = !exactMatch && !looseMatch
      ? catalogByBilingualAlias.get(bilingualAliasKey(candidate))
      : null;
    const actionIdentityMatch = !exactMatch && !looseMatch && !bilingualAliasMatch
      ? catalogByActionIdentity.get(candidateActionIdentityKey(candidate))
      : null;
    const actionSemanticMatch = !exactMatch && !looseMatch && !bilingualAliasMatch && !actionIdentityMatch
      ? findActionSemanticMatch(candidate, catalogEvents)
      : null;
    const sourceIdentityMatch = !exactMatch && !looseMatch && !bilingualAliasMatch && !actionIdentityMatch && !actionSemanticMatch
      ? catalogBySourceIdentity.get(candidateSourceIdentityKey(candidate))
      : null;
    const windowMatch = !exactMatch && !looseMatch && !bilingualAliasMatch && !actionIdentityMatch && !actionSemanticMatch && !sourceIdentityMatch && isLongSeasonLike(candidate)
      ? catalogByDateWindow.get(candidateDateWindowKey(candidate))
      : null;
    const sourceDateMatch = !exactMatch && !looseMatch && !bilingualAliasMatch && !actionIdentityMatch && !actionSemanticMatch && !sourceIdentityMatch && !windowMatch
      ? catalogBySourceDate.get(candidateSourceDateKey(candidate))
      : null;
    // WO-8: lowest-priority fallback, only reached once every title-anchored matcher above
    // has failed - see ligatureTolerantDocumentTitleMatch's comment for why this exists.
    const documentTitleMatch = !exactMatch && !looseMatch && !bilingualAliasMatch && !actionIdentityMatch && !actionSemanticMatch && !sourceIdentityMatch && !windowMatch && !sourceDateMatch
      ? ligatureTolerantDocumentTitleMatch(candidate, catalogEvents)
      : null;
    const decisiveIdentityMatch = catalogByBilingualAlias.get(bilingualAliasKey(candidate))
      || catalogByActionIdentity.get(candidateActionIdentityKey(candidate))
      || catalogBySourceIdentity.get(candidateSourceIdentityKey(candidate));
    const canReceiveDuplicateAlert = candidate.review_status !== 'rejected'
      && candidate.publication_gate !== 'blocked';
    const exactSourceConflict = canReceiveDuplicateAlert
      ? findExactSourceConflict(candidate, fuzzyDuplicateIndex, {
        ignoreEventIds: [decisiveIdentityMatch?.id]
      })
      : null;
    if (exactSourceConflict) {
      return duplicateReviewResult(candidate, exactSourceConflict, duplicateReviewAlerts, blocked);
    }
    const existingMatch = exactMatch || looseMatch || bilingualAliasMatch || actionIdentityMatch || actionSemanticMatch || sourceIdentityMatch || windowMatch || sourceDateMatch || documentTitleMatch;
    if (existingMatch) {
      if (trustedAlreadyPublished(candidate)) {
        const alreadyLinked = candidate.review_status === 'approved-for-catalog'
          && candidate.matched_catalog_event_id === existingMatch.id;
        const sameSourcePage = normalizeSourceUrl(existingMatch.source_url || existingMatch.evidence_url)
          === normalizeSourceUrl(candidate.source_url || candidate.evidence_url);
        const exactSourcePage = exactSourcePageKey(existingMatch.source_url || existingMatch.evidence_url)
          === exactSourcePageKey(candidate.source_url || candidate.evidence_url);
        const sameSourceDetailRefresh = exactSourcePage && /^official-detail-/i.test(candidate.verification_method || '');
        const preservePrimaryOfficialRecord = shouldPreservePrimaryOfficialRecord(existingMatch, candidate) && !sameSourceDetailRefresh;
        mergeMissingCandidateEnrichment(existingMatch, candidate);
        if (sameSourcePage && candidate.confidence === 'official' && candidate.source_label) {
          existingMatch.source_label = candidate.source_label;
        }
        if (sameSourcePage && candidate.venue) {
          existingMatch.venue = candidate.venue;
          existingMatch.venue_address = candidate.venue;
        }
        if ((bilingualAliasMatch || actionIdentityMatch || actionSemanticMatch) && !exactSourcePage && !preservePrimaryOfficialRecord) {
          mergeActionFields(existingMatch, candidate);
        } else if (!windowMatch && !preservePrimaryOfficialRecord) {
          const querySpecificIdentity = sourceIdentityMatch && candidateSourceIdentityKey(candidate).includes('?');
          if (exactSourcePage || (!sourceDateMatch && (!sourceIdentityMatch || querySpecificIdentity))) {
            existingMatch.title = decodeHtml(candidate.title || existingMatch.title);
          }
          if (sameSourcePage && (sameSourceDetailRefresh || !hasPreciseLiveSchedule(existingMatch))) {
            existingMatch.summary = candidate.summary || candidate.rich_summary || existingMatch.summary;
            const refreshedCategory = normalizeEventCategory({
              ...existingMatch,
              category: candidate.category || existingMatch.category,
              raw_category: candidate.category || existingMatch.raw_category || existingMatch.category
            }, { strict: false });
            if (refreshedCategory) {
              existingMatch.category = refreshedCategory.category;
              existingMatch.raw_category = refreshedCategory.raw_category;
            }
          }
          if (!hasPreciseLiveSchedule(existingMatch)) {
            existingMatch.starts_at = candidate.starts_at || existingMatch.starts_at;
            existingMatch.ends_at = candidate.ends_at || existingMatch.ends_at;
          }
          existingMatch.source_url = candidate.source_url || existingMatch.source_url || '';
          existingMatch.evidence_url = candidate.evidence_url || candidate.source_url || existingMatch.evidence_url || '';
          existingMatch.source_file = candidate.raw_snapshot_path || existingMatch.source_file || '';
          Object.assign(existingMatch, richFieldsFromCandidate(candidate));
        }
        existingMatch.audiences = classifyAudiences({ ...existingMatch, ...candidate });
        existingMatch.updated_at = publishedAt;
        linkedExisting.push({
          candidate_id: candidate.id,
          event_id: existingMatch.id,
          title: candidate.title,
          reason: alreadyLinked
            ? 'already linked to catalog event'
            : 'trusted duplicate linked to existing catalog event'
        });
        return {
          ...candidate,
          review_status: 'approved-for-catalog',
          publication_gate: 'catalog-review',
          reviewed_at: candidate.reviewed_at || publishedAt,
          reviewed_by: candidate.reviewed_by || 'EventLive Auto Publisher',
          matched_catalog_event_id: existingMatch.id,
          reviewer_notes: alreadyLinked
            ? candidate.reviewer_notes
            : `${candidate.reviewer_notes || ''} مربوط تلقائياً بسجل كتالوج موجود في ${publishedAt}.`.trim()
        };
      }
      blocked.push({
        candidate_id: candidate.id,
        title: candidate.title,
        reason: `possible duplicate already exists: ${existingMatch.id}`
      });
      return {
        ...candidate,
        matched_catalog_event_id: existingMatch.id
      };
    }

    const fuzzyDuplicate = canReceiveDuplicateAlert
      ? findFuzzyVenueDateMatch(candidate, fuzzyDuplicateIndex)
      : null;
    if (fuzzyDuplicate) {
      return duplicateReviewResult(candidate, fuzzyDuplicate, duplicateReviewAlerts, blocked);
    }

    const blocker = autoPublishBlocker(candidate, catalogByMatch, catalogByLooseMatch, catalogByDateWindow, catalogBySourceDate);
    if (blocker) {
      blocked.push({
        candidate_id: candidate.id,
        title: candidate.title,
        reason: blocker
      });
      const { matched_catalog_event_id: staleMatch, ...unmatchedCandidate } = candidate;
      return {
        ...unmatchedCandidate,
        publication_gate: candidate.publication_gate === 'duplicate-review'
          ? 'source-evidence'
          : candidate.publication_gate
      };
    }

    const event = catalogEventFromCandidate(candidate, existingIds);
    catalogEvents.push(event);
    catalogByMatch.set(candidateMatchKey(event), event);
    catalogByLooseMatch.set(candidateLooseMatchKey(event), event);
    const sourceDateKey = candidateSourceDateKey(event);
    if (sourceDateKey) catalogBySourceDate.set(sourceDateKey, event);
    const sourceIdentityKey = candidateSourceIdentityKey(event);
    if (sourceIdentityKey) catalogBySourceIdentity.set(sourceIdentityKey, event);
    const actionIdentityKey = candidateActionIdentityKey(event);
    if (actionIdentityKey) catalogByActionIdentity.set(actionIdentityKey, event);
    const bilingualKey = bilingualAliasKey(event);
    if (bilingualKey) catalogByBilingualAlias.set(bilingualKey, event);
    if (isLongSeasonLike(event)) catalogByDateWindow.set(candidateDateWindowKey(event), event);
    addFuzzyDuplicateIndexEntry(fuzzyDuplicateIndex, event);
    published.push({
      candidate_id: candidate.id,
      event_id: event.id,
      title: event.title
    });
    return {
      ...candidate,
      review_status: 'approved-for-catalog',
      publication_gate: 'catalog-review',
      reviewed_at: publishedAt,
      reviewed_by: 'EventLive Auto Publisher',
      matched_catalog_event_id: event.id,
      reviewer_notes: `${candidate.reviewer_notes || ''} نشر آلياً وفق سياسة المصادر الموثوقة في ${publishedAt}.`.trim()
    };
  });

  const canonicalization = canonicalizeQueryIdentityEvents(catalogEvents, updatedCandidates);
  updatedCandidates = canonicalization.candidates;
  const canonicalIdMap = new Map(canonicalization.remapped.map((item) => [item.from, item.to]));
  for (const row of [...published, ...linkedExisting]) {
    if (canonicalIdMap.has(row.event_id)) row.event_id = canonicalIdMap.get(row.event_id);
  }

  const report = {
    published_at: publishedAt,
    dry_run: dryRun,
    include_partner: includePartner,
    source_candidates: rel(candidatesPath),
    events_catalog: rel(catalogPath),
    candidates_seen: candidates.length,
    totals: {
      candidates_seen: candidates.length,
      published: published.length,
      linked_existing: linkedExisting.length,
      blocked: blocked.length,
      duplicate_review_alerts: duplicateReviewAlerts.length,
      category_fallback_alerts: categoryFallbackAlerts.length,
      reconciled: published.length + linkedExisting.length
    },
    category_fallback_alerts: categoryFallbackAlerts,
    duplicate_catalog_rows_removed: dedupedCatalog.removed.length
      + semanticDedupedCatalog.removed.length
      + actionDedupedCatalog.removed.length
      + aliasDedupedCatalog.removed.length,
    duplicate_catalog_rows: [
      ...dedupedCatalog.removed,
      ...semanticDedupedCatalog.removed,
      ...actionDedupedCatalog.removed,
      ...aliasDedupedCatalog.removed
    ],
    canonical_event_ids_remapped: canonicalization.remapped.length,
    canonical_event_id_remaps: canonicalization.remapped,
    duplicate_review_alerts: duplicateReviewAlerts,
    published,
    linked_existing: linkedExisting,
    blocked
  };

  ensureDir(path.dirname(reportJsonPath));
  if (!dryRun) {
    writeJson(catalogPath, {
      ...catalogEnvelope,
      events: catalogEvents.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    });
    writeJson(candidatesPath, {
      ...candidatesEnvelope,
      candidates: updatedCandidates
    });
  }
  writeReport(report);

  console.log('# EventLive Source Auto Publish');
  console.log(`- Candidates seen: ${report.candidates_seen}`);
  console.log(`- Published: ${published.length}`);
  console.log(`- Linked existing: ${linkedExisting.length}`);
  console.log(`- Blocked: ${blocked.length}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
