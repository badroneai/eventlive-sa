// Renders the "أبرز المعالم في {city}" / "Top attractions in {city}" places
// section + its JSON-LD (TouristDestination / TouristAttraction / ItemList)
// for a single city page, from data/city_places.json.
//
// Called from TWO places by design:
//  - scripts/generate-site.mjs, lang:'ar' — the section as it ships on the
//    Arabic dist/cities/<slug>.html page.
//  - scripts/generate-localized-site.mjs, lang:'en' — inside
//    applyEnglishContentOverrides(), AFTER translateVisibleText() has
//    already run over the page. That generic pass has no idea these place
//    names/descriptions are real bilingual content (not template chrome), so
//    it will have mangled or left-Arabic the text inside #city-places. This
//    module's EN render is used to fully REPLACE that DOM subtree — the same
//    "regenerate wholesale from source data" idiom applyEnglishContentOverrides
//    already uses for event hero/FAQ text (rebuildEnglishEventFaq()) — rather
//    than trying to patch individual translated text nodes. That guarantees
//    zero leftover Arabic in the section regardless of what the generic
//    text-node translator did to it, and keeps English content genuinely
//    bilingual-authored (per data/city_places.json) instead of machine
//    translated at build time.
//
// Places are identified in both languages via matching data-place-id
// attributes (article[data-place-id]) and the section root carries
// data-city-slug — this is the "structural id, not display text" identity
// Gate Governance rule #2 requires, and it's what lets
// scripts/city-places-regression-test.mjs and the EN override pass find the
// right nodes without depending on translatable copy.
import { hasOsmPlace } from './city-places-data.mjs';
import { cityNameBySlug } from './city-name-registry.mjs';
import { PLACE_CATEGORIES, placeCategoryLabel } from './place-category-taxonomy.mjs';

const OSM_ATTRIBUTION_URL = 'https://www.openstreetmap.org/copyright';
const OSM_ATTRIBUTION_TEXT = Object.freeze({
  ar: 'بيانات الأماكن جزئيًا © OpenStreetMap contributors',
  en: 'Place data partly © OpenStreetMap contributors'
});

const STRINGS = Object.freeze({
  ar: {
    heading: (city) => `أبرز المعالم في ${city}`,
    directions: 'الاتجاهات',
    officialSite: 'الموقع الرسمي',
    countryName: 'السعودية'
  },
  en: {
    heading: (city) => `Top attractions in ${city}`,
    directions: 'Directions',
    officialSite: 'Official site',
    countryName: 'Saudi Arabia'
  }
});

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeHref(value = '') {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '#';
  } catch {
    return '#';
  }
}

function directionsUrl(coordinates) {
  const lat = coordinates?.lat;
  const lon = coordinates?.lon;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
}

function placeName(place, lang) {
  return lang === 'en' ? place.name_en : place.name_ar;
}

function placeDescription(place, lang) {
  return lang === 'en' ? place.description_en : place.description_ar;
}

function cityDisplayName(cityEntry, lang) {
  const registryEntry = cityNameBySlug(cityEntry.city_slug);
  if (registryEntry) return lang === 'en' ? registryEntry.en : registryEntry.ar;
  return cityEntry.city_slug;
}

// Canonical-order category grouping shared by the AR/EN HTML render and the
// JSON-LD ItemList builder below, so the two never disagree on grouping.
export function groupPlacesByCategory(cityEntry) {
  const byCategory = new Map();
  for (const place of cityEntry?.places || []) {
    if (!byCategory.has(place.category)) byCategory.set(place.category, []);
    byCategory.get(place.category).push(place);
  }
  return PLACE_CATEGORIES
    .filter((category) => byCategory.has(category.key))
    .map((category) => ({ category, places: byCategory.get(category.key) }));
}

function placeCardHtml(place, lang) {
  const strings = STRINGS[lang];
  const name = placeName(place, lang);
  const description = placeDescription(place, lang);
  const categoryLabel = placeCategoryLabel(place.category, lang);
  const directions = `<a class="cta" href="${escapeHtml(directionsUrl(place.coordinates))}">${strings.directions}</a>`;
  const officialLink = place.official_link
    ? `<a class="cta" href="${escapeHtml(safeHref(place.official_link))}">${strings.officialSite}</a>`
    : '';
  return `<article class="card place-card" data-place-id="${escapeHtml(place.id)}"><div class="card-body"><h3 class="title">${escapeHtml(name)}</h3><p>${escapeHtml(description)}</p><div class="meta"><span class="chip" data-place-category="${escapeHtml(place.category)}">${escapeHtml(categoryLabel)}</span></div><div class="activation-actions">${directions}${officialLink}</div></div></article>`;
}

/**
 * @param {object} cityEntry - one entry from data/city_places.json's `cities` array, or undefined.
 * @param {{lang?: 'ar'|'en'}} options
 * @returns {string} full <section> HTML, or '' when the city has no places (caller must not render an empty section).
 */
export function renderCityPlacesSection(cityEntry, { lang = 'ar' } = {}) {
  if (!cityEntry || !Array.isArray(cityEntry.places) || cityEntry.places.length === 0) return '';
  const strings = STRINGS[lang];
  const cityName = cityDisplayName(cityEntry, lang);
  const intro = lang === 'en' ? cityEntry.intro_en : cityEntry.intro_ar;
  const groups = groupPlacesByCategory(cityEntry);
  const groupsHtml = groups.map(({ category, places }) => {
    const label = lang === 'en' ? category.label_en : category.label_ar;
    return `<div class="place-category-group" data-place-category-group="${category.key}"><h3 class="place-category-heading">${escapeHtml(label)}</h3><div class="grid">${places.map((place) => placeCardHtml(place, lang)).join('')}</div></div>`;
  }).join('');
  const attribution = hasOsmPlace(cityEntry)
    ? `<p class="osm-attribution">${escapeHtml(OSM_ATTRIBUTION_TEXT[lang])} — <a href="${OSM_ATTRIBUTION_URL}">openstreetmap.org/copyright</a></p>`
    : '';
  return `<section class="section city-places" id="city-places" data-city-slug="${escapeHtml(cityEntry.city_slug)}"><div class="wrap"><h2>${escapeHtml(strings.heading(cityName))}</h2>${intro ? `<p class="lead city-places-intro">${escapeHtml(intro)}</p>` : ''}${groupsHtml}${attribution}</div></section>`;
}

function jsonLdScript(value) {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

/**
 * @param {object} cityEntry
 * @param {{lang?: 'ar'|'en', canonical: string}} options - canonical = absolute URL of the city page (that language's variant).
 * @returns {string} concatenated <script type="application/ld+json"> blocks, or '' when the city has no places.
 */
export function renderCityPlacesJsonLd(cityEntry, { lang = 'ar', canonical }) {
  if (!cityEntry || !Array.isArray(cityEntry.places) || cityEntry.places.length === 0) return '';
  const strings = STRINGS[lang];
  const cityName = cityDisplayName(cityEntry, lang);
  const intro = lang === 'en' ? cityEntry.intro_en : cityEntry.intro_ar;
  const inLanguage = lang === 'en' ? 'en-SA' : 'ar-SA';

  const attractionRef = (place) => ({
    '@type': 'TouristAttraction',
    '@id': `${canonical}#place-${place.id}`,
    name: placeName(place, lang)
  });

  const destination = jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    '@id': `${canonical}#tourist-destination`,
    name: cityName,
    ...(intro ? { description: intro } : {}),
    inLanguage,
    containedInPlace: { '@type': 'Country', name: strings.countryName },
    includesAttraction: cityEntry.places.map((place) => ({
      '@type': 'TouristAttraction',
      '@id': `${canonical}#place-${place.id}`,
      name: placeName(place, lang),
      description: placeDescription(place, lang),
      geo: {
        '@type': 'GeoCoordinates',
        latitude: place.coordinates.lat,
        longitude: place.coordinates.lon
      }
    }))
  });

  const groups = groupPlacesByCategory(cityEntry);
  const itemLists = groups.map(({ category, places }) => jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${canonical}#places-itemlist-${category.key}`,
    name: lang === 'en' ? `${category.label_en} in ${cityName}` : `${category.label_ar} في ${cityName}`,
    inLanguage,
    numberOfItems: places.length,
    itemListElement: places.map((place, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: attractionRef(place)
    }))
  })).join('');

  return `${destination}${itemLists}`;
}
