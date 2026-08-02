// Populates place photography for the city-profiles destination layer
// (EVENTME-CITY-PROFILES-BRIEF.md) from free-licensed Wikimedia Commons
// images, pilot-scoped to places whose source.origin is "wikidata" (they
// already carry an auditable Q-id — EVENTME-CITY-PROFILES-BRIEF.md's
// governance rule: "لا اختلاق أبدًا", no un-auditable content).
//
// Pipeline: Wikidata P18 (image) claim -> Commons file title -> Commons
// imageinfo (640px thumbnail URL + extmetadata license/artist/credit) ->
// license gate (CC0/CC BY/CC BY-SA/PD only, NC/ND rejected outright) ->
// download the THUMBNAIL (never hotlink; site policy per
// scripts/cache-event-images.mjs's idiom and prelaunch's external_images
// check) into dist/assets/place-images/<place-id>.<ext>.
//
// Deliberately does NOT write image data into data/city_places.json. The
// brief's Place.image{url,credit} shape is exposed by
// data/city-places.schema.json for future hand-authored overrides, but this
// script keeps that file human-authored and PR-reviewable by writing to a
// SEPARATE manifest (data/place_image_manifest.json) that
// scripts/city-places-render.mjs joins against place_id at build time —
// same separation event covers already use (data/events_catalog.json is
// authored; data/event_image_cache_manifest.json is machine-written).
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';
import { loadCityPlacesFile } from './city-places-data.mjs';

const cityPlacesPath = process.env.EVENTLIVE_CITY_PLACES_FILE
  ? path.join(root, process.env.EVENTLIVE_CITY_PLACES_FILE)
  : path.join(root, 'data', 'city_places.json');
const manifestPath = process.env.EVENTLIVE_PLACE_IMAGE_MANIFEST_FILE
  ? path.join(root, process.env.EVENTLIVE_PLACE_IMAGE_MANIFEST_FILE)
  : path.join(root, 'data', 'place_image_manifest.json');
const imageOutputDir = process.env.EVENTLIVE_PLACE_IMAGE_CACHE_DIR
  ? path.join(root, process.env.EVENTLIVE_PLACE_IMAGE_CACHE_DIR)
  : path.join(root, 'dist', 'assets', 'place-images');
const reportJsonPath = process.env.EVENTLIVE_PLACE_IMAGE_CACHE_REPORT_JSON_FILE
  ? path.join(root, process.env.EVENTLIVE_PLACE_IMAGE_CACHE_REPORT_JSON_FILE)
  : path.join(root, 'reports', 'place-image-cache-report.json');
const reportMdPath = process.env.EVENTLIVE_PLACE_IMAGE_CACHE_REPORT_MD_FILE
  ? path.join(root, process.env.EVENTLIVE_PLACE_IMAGE_CACHE_REPORT_MD_FILE)
  : path.join(root, 'reports', 'place-image-cache-report.md');
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_PLACE_IMAGE_CACHE_TIMEOUT_MS || 20000));
const maxImageBytes = Math.max(100000, Number(process.env.EVENTLIVE_PLACE_IMAGE_CACHE_MAX_BYTES || 3000000));
const concurrency = Math.max(1, Math.min(8, Number(process.env.EVENTLIVE_PLACE_IMAGE_CACHE_CONCURRENCY || 3)));
const thumbWidth = Math.max(200, Number(process.env.EVENTLIVE_PLACE_IMAGE_CACHE_THUMB_WIDTH || 640));
const generatedAt = new Date().toISOString();
const publicBasePath = '/assets/place-images';

// Wikimedia API etiquette requires an identifying User-Agent (unlabeled
// traffic gets rate-limited or blocked): https://meta.wikimedia.org/wiki/User-Agent_policy
const USER_AGENT = 'EventLiveCityProfiles/1.0 (https://eventme.live; place-image pilot per EVENTME-CITY-PROFILES-BRIEF.md; contact via github.com/badroneai/eventlive-sa)';

function chunk(list, size) {
  const chunks = [];
  for (let index = 0; index < list.length; index += size) chunks.push(list.slice(index, index + size));
  return chunks;
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson(url, params) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  const response = await fetch(target.href, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// --- Step 1: Wikidata P18 (image) claims -----------------------------------

async function fetchP18Map(qids) {
  const p18ByQid = new Map();
  for (const idsChunk of chunk(qids, 50)) {
    const data = await fetchJson('https://www.wikidata.org/w/api.php', {
      action: 'wbgetentities',
      ids: idsChunk.join('|'),
      props: 'claims',
      format: 'json'
    });
    for (const [qid, entity] of Object.entries(data.entities || {})) {
      const claim = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (claim) p18ByQid.set(qid, String(claim));
    }
  }
  return p18ByQid;
}

// --- Step 2: Commons imageinfo (thumbnail url + extmetadata) ---------------

async function fetchImageInfoMap(filenames) {
  const infoByTitle = new Map();
  const titles = [...new Set(filenames)].map((name) => `File:${name}`);
  for (const titlesChunk of chunk(titles, 50)) {
    const data = await fetchJson('https://commons.wikimedia.org/w/api.php', {
      action: 'query',
      titles: titlesChunk.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|size|mime',
      iiurlwidth: String(thumbWidth),
      format: 'json'
    });
    const pages = data?.query?.pages || {};
    for (const page of Object.values(pages)) {
      const info = page?.imageinfo?.[0];
      if (!info || page.missing !== undefined) continue;
      infoByTitle.set(page.title, info);
    }
  }
  return infoByTitle;
}

// --- License gate: CC0 / CC BY / CC BY-SA / PD only, NC/ND rejected --------

function licenseVerdict(extmetadata = {}) {
  const licenseKey = String(extmetadata?.License?.value || '').toLowerCase().trim();
  const shortName = String(extmetadata?.LicenseShortName?.value || '').trim();
  const usageTerms = String(extmetadata?.UsageTerms?.value || '').toLowerCase().trim();
  // Include shortName in the probe too — some older/PD uploads carry only
  // LicenseShortName ("Public domain") with no machine-readable License key
  // at all, and checking licenseKey+usageTerms alone missed that case.
  const probe = `${licenseKey} ${shortName.toLowerCase()} ${usageTerms}`;
  const tokens = probe.split(/[^a-z0-9.]+/).filter(Boolean);

  if (tokens.includes('nc') || /non-?commercial/.test(probe)) {
    return { accepted: false, reason: 'license-nc', label: shortName || licenseKey || 'unknown' };
  }
  if (tokens.includes('nd') || /no-?derivatives/.test(probe)) {
    return { accepted: false, reason: 'license-nd', label: shortName || licenseKey || 'unknown' };
  }
  if (tokens.includes('cc0') || tokens.includes('zero') || /public\s*domain/.test(probe) || tokens.includes('pd')) {
    return { accepted: true, label: shortName || 'CC0' };
  }
  if (tokens.includes('by') && (tokens.includes('sa') || tokens.includes('by-sa'))) {
    return { accepted: true, label: shortName || 'CC BY-SA' };
  }
  if (tokens.includes('by')) {
    return { accepted: true, label: shortName || 'CC BY' };
  }
  if (!licenseKey && !shortName) {
    return { accepted: false, reason: 'license-unknown', label: 'unknown' };
  }
  return { accepted: false, reason: 'license-unrecognized', label: shortName || licenseKey };
}

// --- Download ----------------------------------------------------------------

function extensionForMime(mime = '') {
  const type = String(mime || '').toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  return '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// upload.wikimedia.org rate-limits bursty concurrent thumbnail fetches
// (observed: HTTP 429 across ~60% of a 6-way-concurrent first run against
// this dataset). Retry with backoff honoring Retry-After before giving up —
// same "transient network gets a second chance" idiom as
// cache-event-images.mjs's isTransientNetworkImageError/fetchImageWithFallback,
// just scoped to the one failure mode actually observed here.
async function downloadThumbnail(url, attempt = 1) {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'image/*' },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow'
  });
  if (response.status === 429 && attempt <= 4) {
    const retryAfterHeader = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader * 1000
      : 500 * 2 ** attempt;
    await sleep(waitMs);
    return downloadThumbnail(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = String(response.headers.get('content-type') || '');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 200) throw new Error('image-too-small');
  if (buffer.length > maxImageBytes) throw new Error(`image-too-large ${buffer.length}`);
  return { buffer, contentType };
}

// --- Manifest ------------------------------------------------------------
//
// WO-5 lesson (scripts/cache-event-images.mjs's existingManifest()):
// reconstructing the manifest object field-by-field silently drops any key
// this function doesn't explicitly list. Spread the parsed file instead of
// naming fields one by one, so any field this script doesn't know about
// (added by a future run, a human edit, or another tool) survives.

function existingManifest() {
  if (!fs.existsSync(manifestPath)) {
    return { schema: 'eventlive.place-image-manifest.v1', generated_at: generatedAt, public_base_path: publicBasePath, images: {} };
  }
  const manifest = readJson(manifestPath);
  return {
    ...manifest,
    images: manifest.images && typeof manifest.images === 'object' ? manifest.images : {}
  };
}

async function main() {
  ensureDir(imageOutputDir);
  ensureDir(path.dirname(manifestPath));
  ensureDir(path.dirname(reportJsonPath));

  const cityPlacesData = loadCityPlacesFile(cityPlacesPath);
  const wikidataPlaces = [];
  for (const city of cityPlacesData.cities || []) {
    for (const place of city.places || []) {
      if (place?.source?.origin === 'wikidata' && /^Q\d+$/.test(place.source.source_id || '')) {
        wikidataPlaces.push({ place, citySlug: city.city_slug });
      }
    }
  }

  const manifest = existingManifest();
  manifest.public_base_path = publicBasePath;

  console.log(`# EventLive Place Image Cache (pilot: source.origin=wikidata)`);
  console.log(`- Wikidata-sourced places: ${wikidataPlaces.length}`);

  const p18ByQid = await fetchP18Map(wikidataPlaces.map(({ place }) => place.source.source_id));
  const withP18 = wikidataPlaces.filter(({ place }) => p18ByQid.has(place.source.source_id));
  const withoutP18 = wikidataPlaces.filter(({ place }) => !p18ByQid.has(place.source.source_id));

  const infoByTitle = await fetchImageInfoMap(withP18.map(({ place }) => p18ByQid.get(place.source.source_id)));

  const rejectedLicense = [];
  const noImageInfo = [];
  const unsupportedMime = [];
  const downloaded = [];
  const reused = [];
  const downloadFailed = [];

  async function processOne({ place, citySlug }) {
    const filename = p18ByQid.get(place.source.source_id);
    const title = `File:${filename}`;
    const info = infoByTitle.get(title);
    if (!info) {
      noImageInfo.push({ place_id: place.id, qid: place.source.source_id, commons_title: title });
      return;
    }

    const verdict = licenseVerdict(info.extmetadata || {});
    if (!verdict.accepted) {
      rejectedLicense.push({ place_id: place.id, qid: place.source.source_id, commons_title: title, reason: verdict.reason, license: verdict.label });
      return;
    }

    const existing = manifest.images[place.id];
    if (existing?.file && existing.commons_title === title && fs.existsSync(path.join(root, existing.file))) {
      manifest.images[place.id] = { ...existing, checked_at: generatedAt, city_slug: citySlug, wikidata_id: place.source.source_id };
      reused.push({ place_id: place.id, file: existing.file, bytes: existing.bytes || 0 });
      return;
    }

    let ext = extensionForMime(info.mime);
    if (!ext) {
      unsupportedMime.push({ place_id: place.id, commons_title: title, mime: info.mime || 'unknown' });
      return;
    }

    try {
      const { buffer, contentType } = await downloadThumbnail(info.thumburl || info.url);
      const resolvedExt = extensionForMime(contentType) || ext;
      const filenameOnDisk = `${place.id}.${resolvedExt}`;
      const outputPath = path.join(imageOutputDir, filenameOnDisk);
      fs.writeFileSync(outputPath, buffer);
      const em = info.extmetadata || {};
      const artist = stripHtml(em.Artist?.value) || stripHtml(em.Credit?.value) || 'Unknown';
      const record = {
        place_id: place.id,
        city_slug: citySlug,
        file: rel(outputPath),
        public_path: `${publicBasePath}/${filenameOnDisk}`,
        commons_title: title,
        commons_page_url: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        wikidata_id: place.source.source_id,
        license: verdict.label,
        artist,
        credit_html_stripped: stripHtml(em.Credit?.value) || artist,
        content_type: contentType,
        bytes: buffer.length,
        width: info.thumbwidth || thumbWidth,
        retrieved_at: generatedAt,
        checked_at: generatedAt
      };
      manifest.images[place.id] = record;
      downloaded.push({ place_id: place.id, file: record.file, bytes: record.bytes, license: record.license });
    } catch (error) {
      downloadFailed.push({ place_id: place.id, commons_title: title, reason: String(error.message || error) });
    }
  }

  let cursor = 0;
  const targets = withP18;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(targets.length, 1)) }, async () => {
    while (cursor < targets.length) {
      const target = targets[cursor];
      cursor += 1;
      await processOne(target);
    }
  });
  await Promise.all(workers);

  // Stale entries: a manifest record for a place that no longer appears in
  // the current wikidata scope (removed from data/city_places.json, or its
  // origin changed). Kept on disk but flagged, not deleted — same idiom as
  // cache-event-images.mjs's `stale` marker; a human reviews before pruning.
  const currentPlaceIds = new Set(wikidataPlaces.map(({ place }) => place.id));
  for (const placeId of Object.keys(manifest.images)) {
    if (!currentPlaceIds.has(placeId)) manifest.images[placeId].stale = true;
    else delete manifest.images[placeId].stale;
  }

  const cachedTotal = Object.values(manifest.images).filter((record) => record.file && fs.existsSync(path.join(root, record.file))).length;
  const totalBytes = Object.values(manifest.images).reduce((sum, record) => sum + Number(record.bytes || 0), 0);
  manifest.generated_at = generatedAt;
  manifest.totals = {
    wikidata_places: wikidataPlaces.length,
    with_p18: withP18.length,
    without_p18: withoutP18.length,
    no_imageinfo: noImageInfo.length,
    rejected_license: rejectedLicense.length,
    unsupported_mime: unsupportedMime.length,
    downloaded: downloaded.length,
    reused: reused.length,
    download_failed: downloadFailed.length,
    cached_total: cachedTotal,
    total_bytes: totalBytes,
    hit_rate: wikidataPlaces.length ? Number((cachedTotal / wikidataPlaces.length).toFixed(4)) : 0
  };

  writeJson(manifestPath, manifest);

  const report = {
    generated_at: generatedAt,
    city_places_file: rel(cityPlacesPath),
    manifest: rel(manifestPath),
    image_dir: rel(imageOutputDir),
    totals: manifest.totals,
    downloaded,
    reused,
    rejected_license: rejectedLicense,
    no_imageinfo: noImageInfo,
    unsupported_mime: unsupportedMime,
    without_p18: withoutP18.map(({ place }) => ({ place_id: place.id, qid: place.source.source_id })),
    download_failed: downloadFailed
  };
  writeJson(reportJsonPath, report);

  const mdLines = [
    '# EventLive Place Image Cache Report',
    '',
    `- generated_at: ${generatedAt}`,
    `- city_places_file: ${rel(cityPlacesPath)}`,
    `- manifest: ${rel(manifestPath)}`,
    `- image_dir: ${rel(imageOutputDir)}`,
    `- wikidata_places (pilot scope): ${manifest.totals.wikidata_places}`,
    `- with P18 (has a Wikidata image claim): ${manifest.totals.with_p18}`,
    `- without P18: ${manifest.totals.without_p18}`,
    `- no Commons imageinfo: ${manifest.totals.no_imageinfo}`,
    `- rejected (non-free license — NC/ND/unrecognized): ${manifest.totals.rejected_license}`,
    `- unsupported mime: ${manifest.totals.unsupported_mime}`,
    `- downloaded (new this run): ${manifest.totals.downloaded}`,
    `- reused (already cached): ${manifest.totals.reused}`,
    `- download failed: ${manifest.totals.download_failed}`,
    `- cached total on disk: ${manifest.totals.cached_total}`,
    `- total bytes cached: ${manifest.totals.total_bytes}`,
    `- hit rate (cached / wikidata places): ${(manifest.totals.hit_rate * 100).toFixed(1)}%`,
    '',
    '## Rejected licenses',
    '',
    ...(rejectedLicense.length ? rejectedLicense.map((item) => `- ${item.place_id} (${item.qid}) — ${item.commons_title} — ${item.reason} (${item.license})`) : ['- none'])
  ];
  fs.writeFileSync(reportMdPath, `${mdLines.join('\n')}\n`, 'utf8');

  console.log(`- With P18: ${manifest.totals.with_p18}`);
  console.log(`- Downloaded: ${manifest.totals.downloaded}`);
  console.log(`- Reused: ${manifest.totals.reused}`);
  console.log(`- Rejected (license): ${manifest.totals.rejected_license}`);
  console.log(`- No imageinfo: ${manifest.totals.no_imageinfo}`);
  console.log(`- Download failed: ${manifest.totals.download_failed}`);
  console.log(`- Cached total: ${manifest.totals.cached_total}`);
  console.log(`- Total bytes: ${manifest.totals.total_bytes}`);
  console.log(`- Hit rate: ${(manifest.totals.hit_rate * 100).toFixed(1)}%`);
  console.log(`- Manifest: ${rel(manifestPath)}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main().catch((error) => {
  console.error(`PLACE_IMAGE_CACHE_FAILED ${error.message}`);
  process.exit(1);
});
