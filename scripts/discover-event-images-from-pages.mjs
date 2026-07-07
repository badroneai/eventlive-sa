import fs from 'node:fs';
import path from 'node:path';
import { isLikelyImageAssetUrl, isRejectedImageAssetUrl } from './image-asset-utils.mjs';

const root = process.cwd();
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = process.env.EVENTLIVE_IMAGE_DISCOVERY_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_IMAGE_DISCOVERY_REPORT_JSON)
  : path.join(root, 'reports', 'event-image-discovery-report.json');
const reportMdPath = process.env.EVENTLIVE_IMAGE_DISCOVERY_REPORT_MD
  ? path.join(root, process.env.EVENTLIVE_IMAGE_DISCOVERY_REPORT_MD)
  : path.join(root, 'reports', 'event-image-discovery-report.md');
const limit = Math.max(1, Number(process.env.EVENTLIVE_IMAGE_DISCOVERY_LIMIT || 120));
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_IMAGE_DISCOVERY_TIMEOUT_MS || 9000));
const concurrency = Math.max(1, Math.min(12, Number(process.env.EVENTLIVE_IMAGE_DISCOVERY_CONCURRENCY || 6)));
const dryRun = process.env.EVENTLIVE_IMAGE_DISCOVERY_DRY_RUN === '1';
const generatedAt = new Date().toISOString();

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function isLikelyImageUrl(value = '') {
  return isLikelyImageAssetUrl(value);
}

function scoreImage(url = '', context = '') {
  const text = `${String(url)} ${String(context)}`.toLowerCase();
  let score = 0;
  if (/\.(?:jpg|jpeg|png|webp|avif)(?:$|[?#])/.test(text)) score += 20;
  if (/og|social|banner|cover|hero|event|card|1200|large|medium/.test(text)) score += 10;
  if (/gallery|poster|featured|thumbnail|wp-content|uploads|media/.test(text)) score += 5;
  if (isRejectedImageAssetUrl(text)) score -= 20;
  if (/w=(?:9\d{2}|1\d{3}|2\d{3})/.test(text)) score += 8;
  if (/(?:^|[\s=&_-])(?:9\d{2}|1\d{3}|2\d{3})w(?:$|[\s,"])/.test(text)) score += 8;
  if (/fit=max|auto=format/.test(text)) score += 4;
  if (/\b(?:logo|icon|favicon|sprite|placeholder|unsupported)\b/.test(text)) score -= 30;
  return score;
}

function pushCandidate(items, value, baseUrl, source, context = '') {
  if (!value) return;
  try {
    const url = new URL(decodeHtml(value), baseUrl).href;
    if (!isLikelyImageUrl(url)) return;
    const sourceBoost = source === 'meta' ? 35 : source === 'json-ld' ? 32 : source === 'srcset' ? 12 : 8;
    const score = scoreImage(url, context) + sourceBoost;
    if (score < 10) return;
    items.push({ url, source, score });
  } catch {
    // Ignore malformed candidate URLs.
  }
}

function attrValue(markup = '', name = '') {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  return decodeHtml(markup.match(pattern)?.[2] || '');
}

function bestSrcsetCandidate(value = '') {
  const candidates = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [url, descriptor = ''] = item.split(/\s+/, 2);
      const width = Number(descriptor.match(/^(\d+)w$/i)?.[1] || 0);
      const density = Number(descriptor.match(/^([\d.]+)x$/i)?.[1] || 0);
      return { url, weight: width || density * 1000 || 1 };
    })
    .filter((item) => item.url);
  candidates.sort((a, b) => b.weight - a.weight);
  return candidates[0]?.url || '';
}

function htmlImageContext(markup = '') {
  return [
    attrValue(markup, 'alt'),
    attrValue(markup, 'class'),
    attrValue(markup, 'id'),
    attrValue(markup, 'title'),
    attrValue(markup, 'aria-label')
  ].filter(Boolean).join(' ');
}

function extractHtmlImageCandidates(html = '', baseUrl = '', items = []) {
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*>/ig)) {
    const markup = match[0];
    const context = htmlImageContext(markup);
    const srcset = attrValue(markup, 'srcset') || attrValue(markup, 'data-srcset');
    const bestSrcset = bestSrcsetCandidate(srcset);
    if (bestSrcset) pushCandidate(items, bestSrcset, baseUrl, 'srcset', context);
    for (const attr of ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-image', 'data-bg']) {
      pushCandidate(items, attrValue(markup, attr), baseUrl, 'img', context);
    }
  }
}

function jsonLdImages(value, out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const item of value) jsonLdImages(item, out);
    return out;
  }
  if (typeof value === 'object') {
    if (typeof value.image === 'string') out.push(value.image);
    if (Array.isArray(value.image)) jsonLdImages(value.image, out);
    if (value.image && typeof value.image === 'object') jsonLdImages(value.image, out);
    if (typeof value.url === 'string' && /imageobject/i.test(String(value['@type'] || ''))) out.push(value.url);
    for (const item of Object.values(value)) {
      if (item && typeof item === 'object') jsonLdImages(item, out);
    }
  }
  return out;
}

export function extractImagesFromHtml(html = '', baseUrl = '') {
  const items = [];
  const metaPattern = /<meta\b[^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["'][^>]*>/ig;
  const reverseMetaPattern = /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/ig;
  const imageSrcPattern = /<link\b[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/ig;
  for (const pattern of [metaPattern, reverseMetaPattern, imageSrcPattern]) {
    let match;
    while ((match = pattern.exec(html))) pushCandidate(items, match[1], baseUrl, 'meta');
  }
  for (const match of html.matchAll(/<script\b[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/ig)) {
    try {
      const rawImages = jsonLdImages(JSON.parse(match[1]));
      for (const rawImage of rawImages) pushCandidate(items, rawImage, baseUrl, 'json-ld');
    } catch {
      // Some source pages include invalid JSON-LD; other signals can still work.
    }
  }
  extractHtmlImageCandidates(html, baseUrl, items);
  const bestByUrl = new Map();
  for (const item of items) {
    const current = bestByUrl.get(item.url);
    if (!current || item.score > current.score) bestByUrl.set(item.url, item);
  }
  return [...bestByUrl.values()].sort((a, b) => b.score - a.score);
}

function sourcePageUrl(event = {}) {
  const value = event.evidence_url || event.source_url || event.url || '';
  if (!/^https?:\/\//i.test(value)) return '';
  try {
    const url = new URL(value);
    if (/eventme\.live$/i.test(url.hostname)) return '';
    return url.href;
  } catch {
    return '';
  }
}

function hasUsableImage(event = {}) {
  if (event.image_discovered_at) return false;
  return isLikelyImageUrl(event.image_url) || isLikelyImageUrl(event.original_image_url);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5',
      'accept-language': 'ar,en;q=0.8',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
  });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!/html|xml/i.test(contentType)) throw new Error(`not-html ${contentType || 'unknown'}`);
  return response.text();
}

async function main() {
  const catalog = readJson(catalogPath, { events: [] });
  const events = Array.isArray(catalog.events) ? catalog.events : [];
  const targets = events
    .map((event, index) => ({ event, index, url: sourcePageUrl(event) }))
    .filter((target) => target.url && !hasUsableImage(target.event))
    .slice(0, limit);
  const enriched = [];
  const cleared = [];
  const failed = [];
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const target = targets[cursor];
      cursor += 1;
      try {
        const html = await fetchHtml(target.url);
        const images = extractImagesFromHtml(html, target.url);
        if (!images.length) {
          if (!dryRun && target.event.image_discovered_at) {
            delete target.event.image_url;
            delete target.event.original_image_url;
            delete target.event.image_alt;
            delete target.event.image_source_url;
            delete target.event.image_discovered_at;
            delete target.event.image_discovery_method;
            cleared.push({ id: target.event.id, title: target.event.title, source_url: target.url });
          }
          failed.push({ id: target.event.id, title: target.event.title, source_url: target.url, reason: 'no image candidate' });
          continue;
        }
        const selected = images[0];
        if (!dryRun) {
          target.event.image_url = selected.url;
          target.event.original_image_url = selected.url;
          target.event.image_alt = target.event.image_alt || target.event.title || '';
          target.event.image_source_url = target.url;
          target.event.image_discovered_at = generatedAt;
          target.event.image_discovery_method = selected.source;
        }
        enriched.push({
          id: target.event.id,
          title: target.event.title,
          source_label: target.event.source_label,
          source_url: target.url,
          image_url: selected.url,
          method: selected.source,
          alternatives: images.slice(1, 4).map((item) => item.url)
        });
      } catch (error) {
        failed.push({ id: target.event.id, title: target.event.title, source_url: target.url, reason: error.message });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
  if (!dryRun && enriched.length) {
    writeJson(catalogPath, catalog);
  }
  const report = {
    generated_at: generatedAt,
    dry_run: dryRun,
    catalog_file: path.relative(root, catalogPath),
    targets: targets.length,
    enriched: enriched.length,
    cleared: cleared.length,
    failed: failed.length,
    enriched_events: enriched,
    cleared_events: cleared,
    failed_events: failed
  };
  writeJson(reportJsonPath, report);
  fs.mkdirSync(path.dirname(reportMdPath), { recursive: true });
  fs.writeFileSync(reportMdPath, [
    '# EventLive Event Image Discovery Report',
    '',
    `- generated_at: ${generatedAt}`,
    `- dry_run: ${dryRun}`,
    `- catalog_file: ${path.relative(root, catalogPath)}`,
    `- targets: ${targets.length}`,
    `- enriched: ${enriched.length}`,
    `- cleared: ${cleared.length}`,
    `- failed: ${failed.length}`,
    '',
    '## Enriched',
    '',
    ...(enriched.length ? enriched.map((item) => `- ${item.title} — ${item.image_url}`) : ['- none']),
    '',
    '## Failed',
    '',
    ...(failed.length ? failed.slice(0, 80).map((item) => `- ${item.title} — ${item.reason}`) : ['- none'])
  ].join('\n') + '\n', 'utf8');
  console.log('# EventLive Event Image Discovery');
  console.log(`- Targets: ${targets.length}`);
  console.log(`- Enriched: ${enriched.length}`);
  console.log(`- Cleared: ${cleared.length}`);
  console.log(`- Failed: ${failed.length}`);
  console.log(`- Report: ${path.relative(root, reportMdPath)}`);
}

if (process.env.EVENTLIVE_IMAGE_DISCOVERY_SKIP_RUN !== '1') {
  await main();
}
