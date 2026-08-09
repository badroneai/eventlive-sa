// Single source of truth for disambiguating <title> collisions.
//
// An event page title is "{title} في {city}" (Arabic) / "{title} in {city}"
// (English). A recurring event — the same course run twice, the same workshop
// held in two months — produces byte-identical titles on two indexable pages.
// Google then has to pick one and drops the other as a duplicate, so the
// second occurrence never earns its own listing.
//
// The rule: when a (title, city) pair is claimed by more than one event, every
// page in that group carries its own start date. Month granularity first,
// falling back to the full day for occurrences inside the same month.
//
// Both generators derive the qualifier from the SAME complete event list — the
// Arabic build from buildEvents(), the localizer from dist/events-catalog.json
// — so the two surfaces can never disagree about which pages are qualified.

// The group key must be the text that actually gets RENDERED on the surface
// being built. Keying the English pass on the Arabic title misses the largest
// collision class there: two events with different Arabic titles collapse onto
// one English title, so the pages collide even though the Arabic key called
// them distinct. Callers pass the key builder for their own surface.
function defaultGroupKey(event = {}) {
  const title = String(event.title || '').trim();
  const city = String(event.city || event.city_label || '').trim();
  // \u0000 as the separator, written as an escape so it stays visible in source:
  // a title ending in a city name must not key the same as the next pair over.
  return `${title}\u0000${city}`;
}

// Identity that both surfaces can produce. The Arabic build works on
// buildEvents() records (file_slug present); the localizer works on
// dist/events-catalog.json, whose records carry only id + detail_url — keying
// on file_slug alone silently produced an empty qualifier map there.
export function eventQualifierKey(event = {}) {
  const fileSlug = String(event.file_slug || '').trim();
  if (fileSlug) return fileSlug;
  const detailUrl = String(event.detail_url || '').trim();
  if (detailUrl) return detailUrl.replace(/^.*\//, '').replace(/\.html$/, '');
  return String(event.id || '').trim();
}

function startDate(event = {}) {
  const value = event.starts_at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(date, locale, granularity) {
  const options = granularity === 'day'
    ? { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'long', year: 'numeric' }
    : { timeZone: 'Asia/Riyadh', month: 'long', year: 'numeric' };
  // ca-gregory: the site publishes Gregorian event dates; without it an ar-SA
  // formatter silently switches to the Hijri calendar and the qualifier would
  // disagree with every other date on the page.
  return new Intl.DateTimeFormat(`${locale}-u-ca-gregory`, options).format(date);
}

/**
 * @param {Array<object>} events every published event, not just the ones being rendered
 * @param {'ar-SA'|'en-GB'} locale
 * @param {(event: object) => string} groupKey the rendered title+city for THIS surface
 * @returns {Map<string, string>} file_slug -> qualifier ('' when the title is already unique)
 */
export function buildTitleQualifiers(events = [], locale = 'ar-SA', groupKey = defaultGroupKey) {
  const groups = new Map();
  for (const event of events) {
    const key = groupKey(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  const qualifiers = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Month first; if two occurrences share a month the month alone would keep
    // them identical, so the whole group escalates to day granularity — a group
    // must be qualified consistently or the pages look arbitrarily different.
    const monthly = group.map((event) => {
      const date = startDate(event);
      return date ? format(date, locale, 'month') : '';
    });
    const distinct = new Set(monthly.filter(Boolean));
    const granularity = distinct.size === monthly.filter(Boolean).length ? 'month' : 'day';
    for (const event of group) {
      const date = startDate(event);
      if (!date) continue;
      const key = eventQualifierKey(event);
      if (key) qualifiers.set(key, format(date, locale, granularity));
    }
  }
  return qualifiers;
}

/** Appends the qualifier to a title fragment, keeping the separator in one place. */
export function withTitleQualifier(fragment, qualifier) {
  return qualifier ? `${fragment} — ${qualifier}` : fragment;
}
