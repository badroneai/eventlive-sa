// Two reviewed SAME-event pairs, not a fuzzy matcher. Keep catalog/candidate
// records untouched; only the public discovery projection is consolidated.
// Exact factual guards make this reversible when either source improves or
// changes its schedule, venue, edition, or identity. Unknown hours stay unknown.
const visitSaudi = 'https://www.visitsaudi.com';
function record(fields, url) {
  return { ...fields, city: 'Riyadh', source_url: url, evidence_url: url };
}

export const CURATED_PUBLIC_DUPLICATE_PAIRS = [
  {
    // Both summaries identify edition 11, the semi-finals, and the third
    // Mostafa Nada / Osama El-Saeidy bout in Riyadh on 2026-10-02.
    alias: record({
      id: 'event-بي-إف-إل-مينا-11-نصف-النهائي-في-الرياض',
      title: 'بي إف إل مينا 11 - نصف النهائي في الرياض',
      organizer: 'Saudi Tourism Authority',
      venue: 'الرياض',
      starts_at: '2026-10-02T00:00:00+03:00',
      ends_at: '2026-10-02T23:59:00+03:00',
      time_precision: 'date-only-defaulted',
      date_precision: 'explicit-range'
    }, `${visitSaudi}/content/dam/documents/saudi-calendar-ar.pdf`),
    primary: record({
      id: 'event-pfl-mena-11-semi-finals-in-riyadh',
      title: 'PFL MENA 11 - Semi Finals in Riyadh',
      organizer: 'Saudi Tourism Authority',
      venue: 'Riyadh',
      starts_at: '2026-10-02T16:00:00+03:00',
      ends_at: '2026-10-02T22:00:00+03:00',
      time_precision: 'unknown'
    }, `${visitSaudi}/en/riyadh/events/pfl-mena-11-semi-finals`)
  },
  {
    // The Riyadh.sa summary names International Saudi Falcons and Hunting
    // Exhibition 2026 and the same Oct 1-10 window. Its Malham venue and
    // Saudi Falcons Club organizer are more specific than the tourism row.
    // The one-hour disagreement is NOT resolved or described as corroborated.
    alias: record({
      id: 'event-saudi-international-falcons-hunting-exhibition',
      title: 'Saudi International Falcons & Hunting Exhibition',
      organizer: 'Saudi Tourism Authority',
      venue: 'Riyadh',
      starts_at: '2026-10-01T14:00:00+03:00',
      ends_at: '2026-10-10T22:00:00+03:00',
      time_precision: 'unknown'
    }, `${visitSaudi}/en/riyadh/events/international-saudi-falcons-hunting-exhibition`),
    primary: record({
      id: 'event-saudi-falcons-hunting-exhibition',
      title: 'Saudi Falcons & Hunting Exhibition',
      organizer: 'Saudi Falcons Club',
      venue: 'Riyadh Exhibition & Convention Center - Malham',
      starts_at: '2026-10-01T15:00:00+03:00',
      ends_at: '2026-10-10T23:00:00+03:00',
      time_precision: 'unknown'
    }, 'https://riyadh.sa/en/moment/events/item/event/30835')
  }
];

function uniqueById(rows) {
  const index = new Map();
  for (const row of rows) {
    if (!row?.id) continue;
    index.set(row.id, index.has(row.id) ? null : row);
  }
  return index;
}

function matchesRecord(row, guard) {
  return Boolean(row) && Object.entries(guard).every(([key, value]) => row[key] === value);
}

export function collapseCuratedPublicDuplicates(publicEvents = [], rawCatalogEvents = []) {
  const publicById = uniqueById(publicEvents);
  const rawById = uniqueById(rawCatalogEvents);
  const excludedIds = new Set();
  const exclusions = [];
  const redirects = new Map();
  const retainedAliases = [];
  for (const pair of CURATED_PUBLIC_DUPLICATE_PAIRS) {
    const alias = publicById.get(pair.alias.id);
    const primary = publicById.get(pair.primary.id);
    const rawAlias = rawById.get(pair.alias.id);
    const rawPrimary = rawById.get(pair.primary.id);
    if (!alias || !primary || !matchesRecord(rawAlias, pair.alias) || !matchesRecord(rawPrimary, pair.primary)) continue;
    // A newly detailed agenda is stronger evidence than this reviewed snapshot.
    // Leave both visible for a new review rather than silently dropping it.
    const hasNewAgenda = (alias.sessions || []).some((session) => !(
      session.session_type === 'attendance-window'
      && session.inferred === true
      && session.source === 'event-start-end'
    ));
    if (rawAlias.live_schedule_ready || Number(rawAlias.sessions_count || 0) > 0 || rawAlias.sessions?.length || hasNewAgenda) continue;
    const aliasSlug = alias.file_slug || alias.id;
    const primarySlug = primary.file_slug || primary.id;
    if (aliasSlug === primarySlug) continue;
    excludedIds.add(alias.id);
    redirects.set(aliasSlug, primarySlug);
    // Regenerate per-event JSON/ICS compatibility artifacts from the original
    // normalized alias, without putting a duplicate back in aggregate feeds.
    retainedAliases.push(alias);
    exclusions.push({
      id: alias.id,
      slug: aliasSlug,
      title: rawAlias.title,
      reason: 'duplicate-curated-alias',
      collapsed_onto: primary.id,
      source_group: 'catalog',
      evidence_urls: [rawAlias.evidence_url, rawPrimary.evidence_url],
      note: 'Reviewed same-event identity; both source records retained; primary schedule and precision unchanged.'
    });
  }
  const events = publicEvents.filter((event) => !excludedIds.has(event.id));
  // Preserve the builder's existing exclusion accounting on the projection.
  events.excludedDraftLikeRecords = publicEvents.excludedDraftLikeRecords || 0;
  events.excludedPublicSlugs = [...(publicEvents.excludedPublicSlugs || [])];
  events.recordExclusions = [...(publicEvents.recordExclusions || []), ...exclusions];
  return { events, exclusions, redirects, retainedAliases };
}
