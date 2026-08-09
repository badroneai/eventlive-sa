// Duplicate event records that describe the SAME real event under two slugs.
//
// The Visit Saudi Summer Calendar PDF is a multi-event document: every row it
// yields is a whole-day window with the PDF's own Arabic spelling. When the
// same event was already ingested from a richer first-party source (Discover
// Aseer, Visit Saudi Calendar/Seasons, MDLBEAST), the two records survive
// buildEvents()'s semantic dedupe because that key hashes the Arabic title, and
// the two titles differ — by transliteration ("سكاي فيلج" vs "قرية السماء"), by
// wording ("متنزه" vs "حديقة"), or by a typo in the PDF ("ليلة اابطال").
//
// The result is two indexable pages competing for one event: 36 pages across 14
// events. Google keeps one and drops the rest, arbitrarily, so a real event can
// lose the better page.
//
// This registry does NOT unpublish anything — unpublishing a published event is
// an owner decision (see APPROVAL-DECISION-GUIDE.md). It consolidates the pair
// the way duplicates are meant to be consolidated: the duplicate keeps its page
// and its visitors, points <link rel="canonical"> at the primary, and stays out
// of sitemap.xml. Reversible, and it costs nothing if the records are later
// merged at the data layer instead — which remains the real fix.
//
// Each entry was confirmed by inspecting both records' city, start date, venue
// and source. Primary = the record with the more precise time window and the
// more specific source; between two PDF rows, the correctly spelled one.

export const EVENT_CANONICAL_ALIASES = new Map([
  // Aseer destinations: Discover Aseer (09:00–18:00 windows) vs the PDF's
  // whole-day rows for the same place and the same season.
  ['event-حديقة-مطار-ابها-الدولي', 'event-abha-international-airport-park'],
  ['event-مزرعة-الليوان', 'event-alliwan-farm'],
  ['event-واحة-عسيب', 'event-asib-oasis'],
  ['event-بيوني-الشرف', 'event-bioni-al-sharaf'],
  ['event-برندة', 'event-veranda'],
  ['event-بلاتو', 'event-plato'],
  ['event-سكاي-فيلج', 'event-sky-village'],
  // Jeddah / Riyadh: first-party listing vs the PDF row.
  ['event-حفلة-أحام', 'event-ahlam-concert'],
  ['event-ألف-وواحد', 'event-a-thousand-and-one'],
  ['event-ليلة-ستاند-أب-كوميدي', 'event-stand-up-comedy-night-2'],
  ['event-كنوز-غارقة', 'event-sunken-treasures'],
  // Two rows out of the same PDF: the "ended-…" row carries the truncated
  // window, the "event-…" row the full season.
  ['ended-visit-saudi-calendar-pdf-ساوث-ويست-الكاوبوي-20260607-4a38d19e', 'event-ساوث-ويست-الكاوبوي'],
  ['ended-visit-saudi-calendar-pdf-كايف-المزرعة-20260524-4a38d19e', 'event-كايف-المزرعة'],
  // Same PDF, same date, same event — one row misspells "الأبطال".
  ['ended-visit-saudi-calendar-pdf-wwe-ليلة-اابطال-20260627-4a38d19e', 'ended-visit-saudi-calendar-pdf-wwe-ليلة-الأبطال-20260627-4a38d19e']
]);

/** dist-relative page paths (Arabic surface) of every aliased duplicate. */
export const EVENT_ALIAS_PAGES = new Set(
  [...EVENT_CANONICAL_ALIASES.keys()].map((slug) => `events/${slug}.html`.normalize('NFC'))
);

/** @returns {string} the primary slug for a duplicate, or '' when not aliased. */
export function canonicalEventSlug(fileSlug = '') {
  return EVENT_CANONICAL_ALIASES.get(String(fileSlug).normalize('NFC')) || '';
}

/**
 * Maps a dist-relative event page path to the page its canonical must point at.
 * @returns {string} the primary page path, or '' when the page is not an alias.
 */
export function canonicalEventPage(relativePath = '') {
  const match = String(relativePath).normalize('NFC').match(/^events\/(.+)\.html$/u);
  if (!match) return '';
  const primary = canonicalEventSlug(match[1]);
  return primary ? `events/${primary}.html` : '';
}
