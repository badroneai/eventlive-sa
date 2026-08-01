// Shared loader for data/city_places.json (EVENTME-CITY-PROFILES-BRIEF.md
// destination layer). Imported by both scripts/generate-site.mjs (Arabic
// places section + JSON-LD) and scripts/generate-localized-site.mjs (English
// override pass) so the two never drift on how the file is read or keyed —
// Gate Governance rule #3.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
export const CITY_PLACES_PATH = path.join(root, 'data', 'city_places.json');

export function loadCityPlacesFile(filePath = CITY_PLACES_PATH) {
  if (!fs.existsSync(filePath)) return { version: 0, updated_at: null, cities: [] };
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function cityPlacesBySlug(data) {
  return new Map((data?.cities || []).map((city) => [city.city_slug, city]));
}

export function hasOsmPlace(cityEntry) {
  return Boolean((cityEntry?.places || []).some((place) => place?.source?.origin === 'osm'));
}
