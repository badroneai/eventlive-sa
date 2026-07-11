import { createHash } from 'node:crypto';

const DEFAULT_SITE_URL = 'https://eventme.live';

function cleanList(values = []) {
  return values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
}

function normalizedSessions(event = {}) {
  return (event.sessions || []).map((session) => ({
    title: session.title || session.session_title || '',
    starts_at: session.starts_at || session.start_at || '',
    ends_at: session.ends_at || session.end_at || '',
    speaker: session.speaker || '',
    room: session.room || '',
    track: session.track || '',
    source_url: session.source_url || ''
  }));
}

export function eventSearchSnapshot(event = {}) {
  const outline = event.program_outline || {};
  return {
    id: event.id || '',
    file_slug: event.file_slug || '',
    title: event.title || '',
    summary: event.summary || '',
    description: event.description || '',
    starts_at: event.starts_at || '',
    ends_at: event.ends_at || '',
    status: event.status || '',
    event_kind: event.event_kind || '',
    city: event.city || '',
    venue: event.venue || '',
    venue_address: event.venue_address || '',
    latitude: event.latitude ?? event.lat ?? null,
    longitude: event.longitude ?? event.lng ?? event.lon ?? null,
    organizer: event.organizer || '',
    category: event.category || '',
    category_slug: event.category_slug || '',
    price_label: event.price_label || '',
    registration_status: event.registration_status || event.ticket_status || '',
    ticket_url: event.ticket_url || '',
    registration_url: event.registration_url || '',
    source_label: event.source_label || '',
    source_url: event.source_url || '',
    evidence_url: event.evidence_url || '',
    image_url: event.image_url || '',
    image_alt: event.image_alt || '',
    trust_tier: event.trust_tier || '',
    trust_label: event.trust_label || '',
    live_schedule_ready: Boolean(event.live_schedule_ready),
    agenda_ready: Boolean(event.agenda_ready),
    audiences: cleanList((event.audience_labels || []).map((item) => item.slug || item.label || item.label_ar)),
    tags: cleanList(event.tags || []),
    sessions: normalizedSessions(event),
    program_outline: {
      provider: outline.provider || '',
      official_description: outline.official_description || '',
      duration_text: outline.duration_text || '',
      registration_deadline: outline.registration_deadline || '',
      goals: cleanList(outline.goals || []),
      features: cleanList(outline.features || []),
      requirements: cleanList(outline.requirements || [])
    }
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

export function sitemapUrls(xml = '') {
  return [...String(xml).matchAll(/<loc>(https:\/\/eventme\.live\/[^<]*)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url, index, rows) => rows.indexOf(url) === index);
}
