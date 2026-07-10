import fs from 'node:fs';
import path from 'node:path';
import { isLikelyImageAssetUrl } from './image-asset-utils.mjs';

const root = process.cwd();
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const candidatesPath = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE)
  : path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = process.env.EVENTLIVE_CATALOG_IMAGE_SYNC_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_CATALOG_IMAGE_SYNC_REPORT_JSON)
  : path.join(root, 'reports', 'catalog-image-sync-report.json');
const reportMdPath = process.env.EVENTLIVE_CATALOG_IMAGE_SYNC_REPORT_MD
  ? path.join(root, process.env.EVENTLIVE_CATALOG_IMAGE_SYNC_REPORT_MD)
  : path.join(root, 'reports', 'catalog-image-sync-report.md');
const dryRun = process.env.EVENTLIVE_CATALOG_IMAGE_SYNC_DRY_RUN === '1';
const generatedAt = new Date().toISOString();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function norm(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function day(value = '') {
  return String(value || '').slice(0, 10);
}

function eventUrl(event = {}) {
  return event.source_url || event.evidence_url || event.url || '';
}

function matchKeys(event = {}) {
  const title = norm(event.title);
  const starts = day(event.starts_at);
  const source = norm(event.source_label);
  const url = norm(eventUrl(event));
  return [
    `${title}|${url}|${starts}`,
    `${title}|${source}|${starts}`
  ].filter((item) => !item.includes('||'));
}

function candidateIsTrusted(candidate = {}) {
  return candidate.confidence === 'official'
    || candidate.source_confidence === 'approved-source'
    || /official|government|ministry|academy|chamber/i.test(`${candidate.source_type || ''} ${candidate.discovery_method || ''} ${candidate.source_label || ''}`);
}

function imageFields(candidate = {}) {
  const imageUrl = String(candidate.image_url || candidate.original_image_url || '').trim();
  if (!isLikelyImageAssetUrl(imageUrl)) return null;
  return {
    image_url: imageUrl,
    original_image_url: imageUrl,
    image_alt: candidate.image_alt || candidate.title || '',
    image_source_url: candidate.image_source_url || candidate.evidence_url || candidate.source_url || candidate.url || ''
  };
}

function hasUsableCatalogImage(event = {}) {
  const value = String(event.image_url || event.original_image_url || '').trim();
  if (/^\/?assets\/event-(?:images|covers)\//i.test(value)) return true;
  return isLikelyImageAssetUrl(value);
}

function main() {
  const catalog = readJson(catalogPath);
  const candidatesEnvelope = readJson(candidatesPath);
  const events = Array.isArray(catalog.events) ? catalog.events : [];
  const candidates = Array.isArray(candidatesEnvelope.candidates) ? candidatesEnvelope.candidates : [];

  const byKey = new Map();
  for (const candidate of candidates) {
    if (!candidateIsTrusted(candidate)) continue;
    const fields = imageFields(candidate);
    if (!fields) continue;
    for (const key of matchKeys(candidate)) {
      if (!byKey.has(key)) byKey.set(key, { candidate, fields });
    }
  }

  const synced = [];
  for (const event of events) {
    if (hasUsableCatalogImage(event)) continue;
    const match = matchKeys(event).map((key) => byKey.get(key)).find(Boolean);
    if (!match) continue;
    Object.assign(event, match.fields, {
      image_discovered_at: generatedAt,
      image_discovery_method: 'catalog-candidate'
    });
    synced.push({
      id: event.id,
      title: event.title,
      source_label: event.source_label,
      image_url: match.fields.image_url
    });
  }

  if (!dryRun && synced.length) writeJson(catalogPath, catalog);
  const report = {
    generated_at: generatedAt,
    dry_run: dryRun,
    catalog_file: path.relative(root, catalogPath),
    candidates_file: path.relative(root, candidatesPath),
    trusted_image_candidates: byKey.size,
    synced: synced.length,
    synced_events: synced
  };
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, [
    '# EventLive Catalog Image Sync Report',
    '',
    `- generated_at: ${generatedAt}`,
    `- dry_run: ${dryRun}`,
    `- catalog_file: ${path.relative(root, catalogPath)}`,
    `- candidates_file: ${path.relative(root, candidatesPath)}`,
    `- trusted_image_candidates: ${byKey.size}`,
    `- synced: ${synced.length}`,
    '',
    '## Synced',
    '',
    ...(synced.length ? synced.map((item) => `- ${item.title} — ${item.image_url}`) : ['- none'])
  ].join('\n') + '\n', 'utf8');

  console.log('# EventLive Catalog Image Sync');
  console.log(`- Synced: ${synced.length}`);
  console.log(`- Report: ${path.relative(root, reportMdPath)}`);
}

main();
