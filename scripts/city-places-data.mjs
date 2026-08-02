// Shared loader for data/city_places.json (EVENTME-CITY-PROFILES-BRIEF.md
// destination layer). Imported by both scripts/generate-site.mjs (Arabic
// places section + JSON-LD) and scripts/generate-localized-site.mjs (English
// override pass) so the two never drift on how the file is read or keyed —
// Gate Governance rule #3.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
export const CITY_PLACES_PATH = path.join(root, 'data', 'city_places.json');
export const PLACE_IMAGE_MANIFEST_PATH = path.join(root, 'data', 'place_image_manifest.json');

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

// scripts/cache-place-images.mjs writes data/place_image_manifest.json
// SEPARATELY from data/city_places.json (see that script's header for why —
// keeps the data file human-authored/PR-reviewable). This is the single
// shared loader both scripts/city-places-render.mjs (the join at render
// time) and any place-image regression test read through, per Gate
// Governance rule #3 (no duplicate source of truth).
export function loadPlaceImageManifest(filePath = PLACE_IMAGE_MANIFEST_PATH) {
  if (!fs.existsSync(filePath)) return { images: {} };
  const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { ...manifest, images: manifest.images && typeof manifest.images === 'object' ? manifest.images : {} };
}

// A place's cached image record, or null when none exists yet (P18 absent,
// license rejected, fetch failed, or the place isn't wikidata-sourced) —
// the renderer must treat "no record" as "render no image", never as an
// error; the places section already works image-less today and must keep
// working that way for every place outside this pilot's scope.
export function placeImageRecord(manifest, placeId) {
  const record = manifest?.images?.[placeId];
  if (!record || record.stale || !record.public_path) return null;
  return record;
}
