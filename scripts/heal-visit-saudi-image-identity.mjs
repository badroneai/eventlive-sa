// WO-5 self-heal: strikes PDF-crop image assignments whose identity no longer holds.
//
// See scripts/image-identity-gate.mjs for the root cause. This script re-derives, from
// THIS cycle's freshly parsed data/source_candidates.json, which title currently occupies
// every visit-saudi-summer PDF page+quadrant slot, then checks every catalog event whose
// image_url is a crop from that source against the current occupant of its slot. An event
// whose own title no longer clears the identity gate against the current occupant (or
// whose slot no longer has any dated card at all) has its image assignment struck, so the
// event falls back to an EventLive-generated cover on the next build instead of silently
// showing another event's poster.
//
// Runs every sync cycle (wired into npm run sources:sync) - no human step required.
import fs from 'node:fs';
import path from 'node:path';
import {
  distinctiveTitleTokens,
  parseVisitSaudiCropFilename,
  passesImageIdentityGate
} from './image-identity-gate.mjs';

const root = process.cwd();
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const candidatesPath = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE)
  : path.join(root, 'data', 'source_candidates.json');
const manifestPath = process.env.EVENTLIVE_IMAGE_CACHE_MANIFEST_FILE
  ? path.join(root, process.env.EVENTLIVE_IMAGE_CACHE_MANIFEST_FILE)
  : path.join(root, 'data', 'event_image_cache_manifest.json');
const reportJsonPath = process.env.EVENTLIVE_IMAGE_IDENTITY_REPORT_JSON_FILE
  ? path.join(root, process.env.EVENTLIVE_IMAGE_IDENTITY_REPORT_JSON_FILE)
  : path.join(root, 'reports', 'visit-saudi-image-identity-report.json');
const reportMdPath = process.env.EVENTLIVE_IMAGE_IDENTITY_REPORT_MD_FILE
  ? path.join(root, process.env.EVENTLIVE_IMAGE_IDENTITY_REPORT_MD_FILE)
  : path.join(root, 'reports', 'visit-saudi-image-identity-report.md');
const minRatio = Number(process.env.EVENTLIVE_IMAGE_IDENTITY_MIN_RATIO || 0.5);
const minIntersection = Number(process.env.EVENTLIVE_IMAGE_IDENTITY_MIN_INTERSECTION || 2);
const generatedAt = new Date().toISOString();
const sourceLabel = 'Visit Saudi Summer Calendar PDF';

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rel(filePath) {
  return path.relative(root, filePath);
}

function buildSlotOccupants(candidates) {
  const slots = new Map();
  for (const candidate of candidates) {
    if (candidate.source_label !== sourceLabel) continue;
    const imageUrl = String(candidate.image_url || candidate.original_image_url || '').trim();
    const parsed = parseVisitSaudiCropFilename(imageUrl);
    if (!parsed) continue;
    const key = `${candidate.source_url || ''}|${parsed.page}|${parsed.position}`;
    // Same page+quadrant should only ever hold one dated card per parse; last one wins,
    // which matches how visit-saudi-summer-pdf-utils.mjs itself keeps at most one item
    // per cardKey per page.
    slots.set(key, {
      title: candidate.title,
      tokens: distinctiveTitleTokens(candidate.title),
      source_url: candidate.source_url || '',
      page: parsed.page,
      position: parsed.position
    });
  }
  return slots;
}

function main() {
  const catalog = readJson(catalogPath, { events: [] });
  const candidatesEnvelope = readJson(candidatesPath, { candidates: [] });
  const events = Array.isArray(catalog.events) ? catalog.events : [];
  const candidates = Array.isArray(candidatesEnvelope.candidates) ? candidatesEnvelope.candidates : [];

  const slotOccupants = buildSlotOccupants(candidates);

  const manifest = readJson(manifestPath, {
    generated_at: generatedAt,
    public_base_path: '/assets/event-images',
    images: {}
  });
  if (!manifest.pdf_crop_provenance || typeof manifest.pdf_crop_provenance !== 'object') {
    manifest.pdf_crop_provenance = {};
  }

  const struck = [];
  const verified = [];
  const skippedNoCrop = [];
  const seenEventIds = new Set();

  for (const event of events) {
    const imageUrl = String(event.image_url || '').trim();
    const parsed = parseVisitSaudiCropFilename(imageUrl);
    if (!parsed) continue;
    seenEventIds.add(event.id);

    const key = `${event.source_url || ''}|${parsed.page}|${parsed.position}`;
    const occupant = slotOccupants.get(key);
    const eventTokens = distinctiveTitleTokens(event.title);

    if (!occupant) {
      struck.push({
        id: event.id,
        title: event.title,
        file: parsed.filename,
        reason: 'slot-vacated',
        detail: `no dated card currently occupies page ${parsed.page} ${parsed.position} of ${event.source_url || sourceLabel}`
      });
      strikeAssignment(event, manifest, 'slot-vacated');
      continue;
    }

    const gate = passesImageIdentityGate(occupant.tokens, eventTokens, { minRatio, minIntersection });
    if (!gate.passes) {
      struck.push({
        id: event.id,
        title: event.title,
        file: parsed.filename,
        reason: 'identity-mismatch',
        detail: `page ${parsed.page} ${parsed.position} is now "${occupant.title}"`,
        matched_tokens: gate.matchedTokens,
        ratio: gate.ratio
      });
      strikeAssignment(event, manifest, 'identity-mismatch');
      continue;
    }

    manifest.pdf_crop_provenance[event.id] = {
      event_id: event.id,
      source_pdf: event.source_url || occupant.source_url,
      page: parsed.page,
      position: parsed.position,
      ocr_tokens_matched: gate.matchedTokens,
      verified_against_title: occupant.title,
      verified_at: generatedAt
    };
    verified.push({ id: event.id, title: event.title, file: parsed.filename, matched_tokens: gate.matchedTokens });
  }

  // Prune provenance for events that no longer exist or no longer carry a PDF-crop image.
  for (const eventId of Object.keys(manifest.pdf_crop_provenance)) {
    if (!seenEventIds.has(eventId)) delete manifest.pdf_crop_provenance[eventId];
  }

  if (struck.length) writeJson(catalogPath, catalog);
  manifest.generated_at = generatedAt;
  writeJson(manifestPath, manifest);

  const report = {
    generated_at: generatedAt,
    catalog: rel(catalogPath),
    candidates: rel(candidatesPath),
    manifest: rel(manifestPath),
    source_label: sourceLabel,
    thresholds: { min_ratio: minRatio, min_intersection: minIntersection },
    totals: {
      pdf_crop_assignments: verified.length + struck.length,
      verified: verified.length,
      struck: struck.length,
      slots_seen_this_cycle: slotOccupants.size
    },
    struck,
    verified,
    skipped_no_crop: skippedNoCrop
  };
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, [
    '# EventLive Visit Saudi Image Identity Report',
    '',
    `- generated_at: ${generatedAt}`,
    `- pdf_crop_assignments: ${report.totals.pdf_crop_assignments}`,
    `- verified: ${report.totals.verified}`,
    `- struck: ${report.totals.struck}`,
    `- slots_seen_this_cycle: ${report.totals.slots_seen_this_cycle}`,
    '',
    '## Struck (fell back to generated cover)',
    '',
    ...(struck.length ? struck.map((item) => `- ${item.title} (${item.file}) - ${item.reason} - ${item.detail}`) : ['- none']),
    '',
    '## Verified',
    '',
    ...(verified.length ? verified.map((item) => `- ${item.title} (${item.file})`) : ['- none'])
  ].join('\n') + '\n', 'utf8');

  console.log('# EventLive Visit Saudi Image Identity Heal');
  console.log(`- PDF crop assignments checked: ${report.totals.pdf_crop_assignments}`);
  console.log(`- Verified: ${report.totals.verified}`);
  console.log(`- Struck: ${report.totals.struck}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

// generate-site.mjs merges each build on top of the previous dist/events.json by id, then
// by (title|starts_at|city) identity (see loadPreviousEvents/eventIdentity), and its image
// resolution is an OR-chain across raw and previous fields:
//   localizeEventImage(raw.cached_image_url || previous.cached_image_url || raw.image_url
//     || raw.image || previous.image_url || '')
// A struck event keeps the same id/title/starts_at/city, so if we simply blanked
// raw.image_url to '' here, that falsy value would fall straight through to
// previous.image_url - resurrecting the exact same wrong/stale poster from the prior
// build on the next cycle. We instead point at an /assets/event-covers/ sentinel path:
// it is a non-empty (truthy) string so the OR-chain in generate-site.mjs's
// localizeEventImage(raw.cached_image_url || previous.cached_image_url || raw.image_url
// || raw.image || previous.image_url || '') stops here rather than falling through to
// previous.image_url, and both of the two places downstream that decide "this event
// needs a real image" already treat an /assets/event-covers/ path as "no source image":
//   - generate-site.mjs's own fallback trigger (`!event.image_url ||
//     event.image_url.startsWith('/assets/event-covers/')` -> fallbackCover(event))
//   - auto-publish-source-candidates.mjs's mergeMissingCandidateEnrichment `imageMissing`
//     check, so a future cycle can re-bind a legitimate new crop to this event once one
//     clears the identity gate, instead of leaving it permanently orphaned.
const STRUCK_IMAGE_SENTINEL = '/assets/event-covers/__wo5-identity-struck__.svg';

function strikeAssignment(event, manifest, reason) {
  delete manifest.pdf_crop_provenance[event.id];
  event.image_url = STRUCK_IMAGE_SENTINEL;
  event.original_image_url = '';
  event.image_alt = '';
  event.image_source_url = '';
  event.image_discovered_at = '';
  event.image_discovery_method = '';
  event.image_identity_struck_at = generatedAt;
  event.image_identity_strike_reason = reason;
  event.updated_at = generatedAt;
}

main();
