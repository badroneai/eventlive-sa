import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveVenueLocation } from './venue-location-utils.mjs';

const registry = JSON.parse(fs.readFileSync('data/venue_registry.json', 'utf8'));
assert.equal(registry.schema, 'eventlive.venue-registry.v1', 'venue registry schema must remain explicit');
assert.ok(registry.venues.length >= 10, 'venue registry must retain the verified national set');

for (const venue of registry.venues) {
  assert.ok(venue.id && venue.name && venue.city, 'every venue must carry stable identity and city');
  assert.ok(Number(venue.latitude) >= 16 && Number(venue.latitude) <= 33, `${venue.id} latitude must be inside Saudi Arabia`);
  assert.ok(Number(venue.longitude) >= 34 && Number(venue.longitude) <= 56, `${venue.id} longitude must be inside Saudi Arabia`);
  assert.match(venue.evidence_url || '', /^https:\/\//, `${venue.id} must preserve verification evidence`);
  assert.ok(venue.verified_at, `${venue.id} must preserve verification time`);
}

const rfecc = resolveVenueLocation({ city: 'Riyadh', venue: 'Riyadh Front Exhibition & Convention Center' }, registry.venues);
assert.equal(rfecc?.registry_id, 'roshn-front-exhibition-center', 'RFECC alias must resolve to Roshn Front');
assert.equal(resolveVenueLocation({ city: 'Jeddah', venue: 'Riyadh Front Exhibition & Convention Center' }, registry.venues), null, 'city mismatch must prevent a false venue match');

const ithra = resolveVenueLocation({ city: 'Dhahran', venue: 'Ithra - Library', source_url: 'https://www.ithra.com/en/programme/example' }, registry.venues);
assert.equal(ithra?.registry_id, 'ithra-cultural-center', 'generic Ithra room names must resolve only with first-party source scope');
assert.equal(resolveVenueLocation({ city: 'Dhahran', venue: 'Ithra - Library', source_url: 'https://example.org/event' }, registry.venues), null, 'generic room names must not geocode outside their verified source');

const uqu = resolveVenueLocation({ city: 'Makkah', venue: 'Umm Al-Qura University', source_url: 'https://uqu.edu.sa/App/Events/41008' }, registry.venues);
assert.equal(uqu?.registry_id, 'umm-al-qura-university-abdiyah', 'UQU events must resolve to the verified Abidiyah campus');

const hayyJameel = resolveVenueLocation({ city: 'Jeddah', venue: 'Hayy Jameel - Hayy Makers, First Floor', source_url: 'https://hayyjameel.org/whats-on/pottery' }, registry.venues);
assert.equal(hayyJameel?.registry_id, 'hayy-jameel-creative-hub', 'Hayy Jameel programme rooms must resolve to the official venue coordinates');
assert.equal(resolveVenueLocation({ city: 'Jeddah', venue: 'Hayy Jameel', source_url: 'https://example.org/event' }, registry.venues), null, 'Hayy Jameel coordinates must remain scoped to the first-party source');

const publicEvents = JSON.parse(fs.readFileSync('dist/events.json', 'utf8')).events || [];
const active = publicEvents.filter((event) => event.status !== 'ended');
const geocodedActive = active.filter((event) => Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude)));
assert.ok(geocodedActive.length >= 50, 'verified registry must geocode a meaningful active event set');

for (const event of geocodedActive) {
  assert.ok(event.location_registry_id || event.location_verification_method === 'event-source', `${event.id} coordinates must carry provenance`);
  assert.match(event.location_evidence_url || '', /^https:\/\//, `${event.id} coordinates must expose evidence`);
  assert.match(event.directions_url || '', /destination=\d+(?:\.\d+)?%2C\d+(?:\.\d+)?/, `${event.id} directions must use exact coordinates`);
}

const genericCityEvents = active.filter((event) => /^(Riyadh|الرياض|Jeddah|جدة|Saudi Arabia|السعودية)$/i.test(String(event.venue || '').trim()));
assert.equal(genericCityEvents.some((event) => event.location_registry_id), false, 'generic city labels must never receive venue-level coordinates');

const sample = geocodedActive[0];
assert.ok(sample, 'a geocoded active event must exist');
const sampleHtml = fs.readFileSync(path.join('dist', sample.detail_url.replace(/^\.\//, '')), 'utf8');
assert.match(sampleHtml, /"@type":"GeoCoordinates"/, 'geocoded event structured data must expose GeoCoordinates');

console.log(`VENUE_LOCATION_OK registry=${registry.venues.length} active_geocoded=${geocodedActive.length}`);
