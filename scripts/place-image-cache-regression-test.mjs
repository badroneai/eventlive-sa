// Manifest-integrity gate for scripts/cache-place-images.mjs
// (EVENTME-CITY-PROFILES-BRIEF.md place-image pilot). Network-free — reads
// only the already-generated manifest/report on disk, same idiom as
// scripts/event-image-cache-regression-test.mjs. Lives in
// launch:product-gates rather than ci:site-gates (per GATES-GOVERNANCE.md
// rule #1) for the same reason test:image-cache does: it depends on a prior
// `npm run images:cache-places` network run, not just a code/template
// regression, so it doesn't belong in the fast structural battery. Skips
// cleanly when the manifest hasn't been generated yet (e.g. a fresh clone
// that never ran the cache step) rather than failing the whole gate suite.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'place_image_manifest.json');
const cacheScriptPath = path.join(root, 'scripts', 'cache-place-images.mjs');

const cacheScript = fs.readFileSync(cacheScriptPath, 'utf8');
assert.match(cacheScript, /license-nc/, 'the license gate must reject non-commercial (NC) licenses');
assert.match(cacheScript, /license-nd/, 'the license gate must reject no-derivatives (ND) licenses');
assert.match(cacheScript, /\.origin === 'wikidata'/, 'the pilot scope must stay limited to wikidata-sourced places');

if (!fs.existsSync(manifestPath)) {
  console.log('place-image-cache-regression-test: skipped (manifest not generated yet — run npm run images:cache-places)');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const images = manifest.images && typeof manifest.images === 'object' ? manifest.images : {};
const records = Object.values(images).filter((record) => !record.stale);

assert.ok(records.length > 0, 'place image manifest must include at least one cached image');

const NC_ND_PATTERN = /\bnc\b|non-?commercial|\bnd\b|no-?derivatives/i;

for (const record of records) {
  assert.ok(record.place_id, 'every manifest record must carry its place_id (the join key city-places-render.mjs looks up)');
  assert.equal(record.public_path?.startsWith('/assets/place-images/'), true, `${record.place_id}: public_path must use the place-images public path`);
  assert.ok(record.file, `${record.place_id}: manifest record must reference a cached file`);
  assert.equal(fs.existsSync(path.join(root, record.file)), true, `${record.place_id}: ${record.file} must exist on disk`);
  assert.ok(Number(record.bytes || 0) > 200, `${record.place_id}: ${record.file} must have a plausible image size`);
  assert.ok(String(record.artist || '').trim().length > 0, `${record.place_id}: manifest record must carry a non-empty artist credit`);
  assert.ok(String(record.license || '').trim().length > 0, `${record.place_id}: manifest record must carry a non-empty license`);
  assert.equal(NC_ND_PATTERN.test(record.license), false, `${record.place_id}: license "${record.license}" must not be NC/ND — only free licenses are ever cached`);
  assert.match(record.commons_title || '', /^File:/, `${record.place_id}: commons_title must be a Commons File: title`);
  assert.match(record.commons_page_url || '', /^https:\/\/commons\.wikimedia\.org\//, `${record.place_id}: commons_page_url must point at Commons`);
  assert.match(record.wikidata_id || '', /^Q\d+$/, `${record.place_id}: wikidata_id must be a Q-id`);
}

const cachedTotal = records.filter((record) => fs.existsSync(path.join(root, record.file))).length;
if (typeof manifest.totals?.cached_total === 'number') {
  assert.equal(manifest.totals.cached_total, cachedTotal, 'manifest totals.cached_total must match the number of records whose file actually exists on disk');
}

console.log(`place-image-cache-regression-test: ok cached=${records.length}`);
