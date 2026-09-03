import { createHash } from 'node:crypto';

const DEFAULT_SITE_URL = 'https://eventme.live';

function cleanList(values = []) {
  return values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
}

function stablePublicValue(value) {
  if (Array.isArray(value)) return value.map(stablePublicValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stablePublicValue(nested)])
  );
}

function normalizedSessions(event = {}) {
  return (event.sessions || []).map((session) => ({
    id: session.id || '',
    title: session.title || session.session_title || '',
    starts_at: session.starts_at || session.start_at || '',
    ends_at: session.ends_at || session.end_at || '',
    session_type: session.session_type || '',
    speaker: session.speaker || '',
    moderator: session.moderator || '',
    room: session.room || '',
    track: session.track || '',
    source: session.source || '',
    source_url: session.source_url || '',
    inferred: Boolean(session.inferred)
  }));
}

export function eventSearchSnapshot(event = {}) {
  const outline = event.program_outline || {};
  return {
    id: event.id || '',
    file_slug: event.file_slug || '',
    title: event.title || '',
    summary: event.summary || '',
    rich_summary: event.rich_summary || '',
    description: event.description || '',
    starts_at: event.starts_at || '',
    ends_at: event.ends_at || '',
    status: event.status || '',
    event_kind: event.event_kind || '',
    city: event.city || '',
    venue: event.venue || '',
    venue_address: event.venue_address || '',
    maps_url: event.maps_url || '',
    directions_url: event.directions_url || '',
    latitude: event.latitude ?? event.lat ?? null,
    longitude: event.longitude ?? event.lng ?? event.lon ?? null,
    organizer: event.organizer || '',
    organizer_url: event.organizer_url || '',
    performers: stablePublicValue(event.performers || []),
    language: event.language || '',
    category: event.category || '',
    category_label: event.category_label || '',
    category_slug: event.category_slug || '',
    price_label: event.price_label || '',
    registration_status: event.registration_status || event.ticket_status || '',
    offer_valid_from: event.offer_valid_from || '',
    registration_deadline: event.registration_deadline || '',
    ticket_url: event.ticket_url || '',
    registration_url: event.registration_url || '',
    live_url: event.live_url || '',
    attendance_mode: event.attendance_mode || '',
    attendance_window: event.attendance_window || '',
    attendance_window_ready: Boolean(event.attendance_window_ready),
    parking_info: event.parking_info || '',
    accessibility_info: event.accessibility_info || '',
    age_policy: event.age_policy || '',
    source_label: event.source_label || '',
    source_owner: event.source_owner || '',
    source_type: event.source_type || '',
    source_confidence: event.source_confidence || event.confidence || '',
    source_url: event.source_url || '',
    evidence_url: event.evidence_url || '',
    location_evidence_url: event.location_evidence_url || '',
    approval_status: event.approval_status || '',
    approval_status_label: event.approval_status_label || '',
    publication_gate: event.publication_gate || '',
    verification_method: event.verification_method || '',
    image_url: event.image_url || '',
    image_alt: event.image_alt || '',
    // Not an intrinsic event field: it is derived from whether ANOTHER event
    // shares this (title, city). It belongs in the fingerprint anyway, because
    // the rendered <title> changes when it changes and an incremental build
    // would otherwise leave the older occurrence with a colliding title.
    seo_title_qualifier: event.seo_title_qualifier || '',
    trust_tier: event.trust_tier || '',
    trust_label: event.trust_label || '',
    live_schedule_ready: Boolean(event.live_schedule_ready),
    agenda_ready: Boolean(event.agenda_ready),
    schedule_depth: event.schedule_depth || '',
    schedule_quality: event.schedule_quality || '',
    official_sessions_count: Number(event.official_sessions_count || 0),
    sessions_count: Number(event.sessions_count || event.sessions?.length || 0),
    tracks_count: Number(event.tracks_count || 0),
    rooms_count: Number(event.rooms_count || 0),
    live_updates_count: Number(event.live_updates_count || 0),
    linked_live_updates_count: Number(event.linked_live_updates_count || 0),
    audiences: stablePublicValue(event.audience_labels || []),
    tags: cleanList(event.tags || []),
    highlights: stablePublicValue(event.highlights || []),
    live_updates: stablePublicValue(event.live_updates || []),
    sessions: normalizedSessions(event),
    program_outline: stablePublicValue(outline)
  };
}

export function eventSearchFingerprint(event = {}) {
  return createHash('sha256')
    .update(JSON.stringify(eventSearchSnapshot(event)))
    .digest('hex');
}

export function reconcileSeoPageState(events = [], previousState = {}, modifiedAt = new Date().toISOString()) {
  const previousPages = previousState?.pages && typeof previousState.pages === 'object' ? previousState.pages : {};
  const nextEntries = [];
  const changedEvents = [];
  const unchangedEvents = [];

  for (const event of events) {
    const slug = String(event.file_slug || '').trim();
    if (!slug) continue;
    const fingerprint = eventSearchFingerprint(event);
    const previous = previousPages[slug];
    const unchanged = previous?.fingerprint === fingerprint && previous?.modified_at;
    const seoModifiedAt = unchanged ? previous.modified_at : modifiedAt;
    event.seo_modified_at = seoModifiedAt;
    nextEntries.push([slug, { fingerprint, modified_at: seoModifiedAt }]);
    (unchanged ? unchangedEvents : changedEvents).push(event);
  }

  nextEntries.sort(([left], [right]) => left.localeCompare(right));
  const nextSlugs = new Set(nextEntries.map(([slug]) => slug));
  const removedSlugs = Object.keys(previousPages).filter((slug) => !nextSlugs.has(slug)).sort();

  return {
    state: { version: 1, pages: Object.fromEntries(nextEntries) },
    changedEvents,
    unchangedEvents,
    removedSlugs
  };
}

// Event pages are fingerprinted from their DATA (eventSearchSnapshot above),
// which works because an event page is a rendering of one record. Every other
// page — the home page, the hubs, the guides, the city, category and
// search-intent pages — has no such record, so writeSitemap fell back to the
// build instant and declared all 105 of them modified on every single build.
//
// <lastmod> is a claim Google acts on only "if it's consistently and verifiably
// accurate" (developers.google.com/search/docs/crawling-indexing/sitemaps/
// build-sitemap). A page that says "modified today" every day teaches a crawler
// to ignore the field — including on the pages that genuinely did change.
//
// So these are fingerprinted by their RENDERED OUTPUT instead, with the
// timestamps the build writes into them masked out first; see
// stampStaticPageFreshness in generate-site.mjs for why the masking is not
// optional.
export function reconcileStaticPageState(hashes = new Map(), previousState = {}, modifiedAt = new Date().toISOString()) {
  const previousPages = previousState?.static_pages && typeof previousState.static_pages === 'object'
    ? previousState.static_pages
    : {};
  const nextEntries = [];
  const changedPaths = [];

  for (const [relativePath, fingerprint] of hashes) {
    const key = String(relativePath || '').trim();
    if (!key || !fingerprint) continue;
    const previous = previousPages[key];
    const unchanged = previous?.fingerprint === fingerprint && previous?.modified_at;
    nextEntries.push([key, { fingerprint, modified_at: unchanged ? previous.modified_at : modifiedAt }]);
    if (!unchanged) changedPaths.push(key);
  }

  nextEntries.sort(([left], [right]) => left.localeCompare(right));
  return {
    staticPages: Object.fromEntries(nextEntries),
    changedPaths: changedPaths.sort()
  };
}

function normalizeRelativePath(value = '') {
  const clean = String(value || '').trim().replace(/^https?:\/\/eventme\.live\/?/i, '').replace(/^\.\//, '').replace(/^\/+/, '');
  return clean.replace(/#.*$/, '').replace(/\?.*$/, '');
}

function bilingualUrls(relativePath, siteUrl = DEFAULT_SITE_URL) {
  const clean = normalizeRelativePath(relativePath);
  if (!clean || clean === 'index.html') return [`${siteUrl}/`, `${siteUrl}/en/`];
  return [`${siteUrl}/${clean}`, `${siteUrl}/en/${clean}`];
}

export function buildIndexNowDelta({ changedEvents = [], removedSlugs = [], siteUrl = DEFAULT_SITE_URL } = {}) {
  const urls = new Set();
  const addPath = (value) => bilingualUrls(value, siteUrl).forEach((url) => urls.add(url));

  if (changedEvents.length || removedSlugs.length) {
    for (const path of [
      '',
      'events.html',
      'today-events.html',
      'this-week.html',
      'this-month.html',
      'saudi-events-today.html',
      'saudi-events-tomorrow.html',
      'saudi-events-weekend.html',
      'saudi-events-this-month.html',
      'cities.html',
      'categories.html',
      'audiences.html',
      'guides.html'
    ]) addPath(path);
  }

  for (const event of changedEvents) {
    addPath(`events/${event.file_slug}.html`);
    for (const relatedPath of [event.city_url, event.category_url, ...(event.audience_urls || [])]) addPath(relatedPath);
  }
  for (const slug of removedSlugs) addPath(`events/${slug}.html`);

  return [...urls].sort();
}

export function mergeIndexNowBatchUrls({ currentUrls = [], previousDelta = {}, batchId = '' } = {}) {
  const normalizedBatchId = String(batchId || '').trim();
  const previousUrls = normalizedBatchId && previousDelta?.batch_id === normalizedBatchId && Array.isArray(previousDelta.urls)
    ? previousDelta.urls
    : [];
  return [...new Set([...previousUrls, ...currentUrls].filter(Boolean).map(String))].sort();
}

export function sitemapUrls(xml = '') {
  return [...String(xml).matchAll(/<loc>(https:\/\/eventme\.live\/[^<]*)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url, index, rows) => rows.indexOf(url) === index);
}
