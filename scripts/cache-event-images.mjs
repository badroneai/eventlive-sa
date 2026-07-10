import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { isLikelyImageAssetUrl, isRejectedImageAssetUrl, isSourcePageLikeImageUrl } from './image-asset-utils.mjs';
import { ensureDir, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const eventsPath = process.env.EVENTLIVE_EVENTS_DIST_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_DIST_FILE)
  : path.join(root, 'dist', 'events.json');
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const manifestPath = process.env.EVENTLIVE_IMAGE_CACHE_MANIFEST_FILE
  ? path.join(root, process.env.EVENTLIVE_IMAGE_CACHE_MANIFEST_FILE)
  : path.join(root, 'data', 'event_image_cache_manifest.json');
const imageOutputDir = process.env.EVENTLIVE_IMAGE_CACHE_DIR
  ? path.join(root, process.env.EVENTLIVE_IMAGE_CACHE_DIR)
  : path.join(root, 'dist', 'assets', 'event-images');
const reportJsonPath = process.env.EVENTLIVE_IMAGE_CACHE_REPORT_JSON_FILE
  ? path.join(root, process.env.EVENTLIVE_IMAGE_CACHE_REPORT_JSON_FILE)
  : path.join(root, 'reports', 'event-image-cache-report.json');
const reportMdPath = process.env.EVENTLIVE_IMAGE_CACHE_REPORT_MD_FILE
  ? path.join(root, process.env.EVENTLIVE_IMAGE_CACHE_REPORT_MD_FILE)
  : path.join(root, 'reports', 'event-image-cache-report.md');
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_IMAGE_CACHE_TIMEOUT_MS || 20000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_IMAGE_CACHE_LIMIT || 500));
const maxImageBytes = Math.max(250000, Number(process.env.EVENTLIVE_IMAGE_CACHE_MAX_BYTES || 12000000));
const concurrency = Math.max(1, Math.min(16, Number(process.env.EVENTLIVE_IMAGE_CACHE_CONCURRENCY || 8)));
const failureRetryHours = Math.max(1, Number(process.env.EVENTLIVE_IMAGE_CACHE_FAILURE_RETRY_HOURS || 24));
const generatedAt = new Date().toISOString();
const tlsRelaxationAllowedHosts = new Set(['www.najran.gov.sa', 'najran.gov.sa']);

function hash(value = '') {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 10);
}

function slug(value = 'event') {
  return String(value || 'event')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'event';
}

function extensionFor(url, contentType = '') {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('image/avif')) return 'avif';
  if (type.includes('image/webp')) return 'webp';
  if (type.includes('image/png')) return 'png';
  if (type.includes('image/jpeg') || type.includes('image/jpg')) return 'jpg';
  if (type.includes('image/svg')) return 'svg';
  try {
    const ext = path.extname(new URL(url).pathname).replace(/^\./, '').toLowerCase();
    if (['avif', 'webp', 'png', 'jpg', 'jpeg', 'svg'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    // ignore malformed URLs below
  }
  return 'jpg';
}

function sourceImageUrl(event = {}) {
  const values = [event.original_image_url, event.image_url].filter(Boolean);
  const value = values.find((item) => /^https?:\/\//i.test(item)) || '';
  if (!value) return '';
  try {
    const url = new URL(value);
    if (/eventme\.live$/i.test(url.hostname)) return '';
    if (!isLikelyImageAssetUrl(url.href)) return '';
    return url.href;
  } catch {
    return '';
  }
}

function existingManifest() {
  if (!fs.existsSync(manifestPath)) {
    return {
      generated_at: generatedAt,
      public_base_path: '/assets/event-images',
      images: {}
    };
  }
  const manifest = readJson(manifestPath);
  return {
    generated_at: manifest.generated_at || generatedAt,
    public_base_path: manifest.public_base_path || '/assets/event-images',
    images: manifest.images && typeof manifest.images === 'object' ? manifest.images : {},
    failures: manifest.failures && typeof manifest.failures === 'object' ? manifest.failures : {}
  };
}

function isRejectedManifestImage(record = {}, sourceUrl = '') {
  const values = [sourceUrl, record.source_url, record.public_path, record.file].filter(Boolean);
  return values.some((value) => isRejectedImageAssetUrl(value) || isSourcePageLikeImageUrl(value));
}

function pruneRejectedManifestImages(manifest) {
  const removed = [];
  for (const [sourceUrl, record] of Object.entries(manifest.images || {})) {
    if (!isRejectedManifestImage(record, sourceUrl)) continue;
    removed.push({
      source_url: sourceUrl,
      file: record.file || '',
      reason: 'rejected-image-asset'
    });
    if (record.file) {
      const filePath = path.join(root, record.file);
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    }
    delete manifest.images[sourceUrl];
  }
  return removed;
}

function sourceRefererForUrl(url) {
  let referer = 'https://eventme.live/';
  try {
    referer = `${new URL(url).origin}/`;
  } catch {
    // Fall back to EventLive if the URL is unexpectedly malformed.
  }
  return referer;
}

function imageRequestOptions(url, referer = sourceRefererForUrl(url)) {
  let relaxedAgent;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && tlsRelaxationAllowedHosts.has(parsed.hostname)) {
      relaxedAgent = new https.Agent({ rejectUnauthorized: false });
    }
  } catch {
    relaxedAgent = undefined;
  }
  return {
    headers: {
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      'accept-language': 'ar,en;q=0.8',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      referer,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    },
    timeout: timeoutMs,
    ...(relaxedAgent ? { agent: relaxedAgent } : {})
  };
}

async function fetchImage(url, redirectsLeft = 3, referer = sourceRefererForUrl(url)) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const request = client.get(parsed, imageRequestOptions(url, referer), (response) => {
      response.on('error', reject);
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && location && redirectsLeft > 0) {
        response.resume();
        const nextUrl = new URL(location, parsed).href;
        fetchImage(nextUrl, redirectsLeft - 1, referer).then(resolve, reject);
        return;
      }

      const contentType = String(response.headers['content-type'] || '');
      if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode || 'unknown'}`));
        return;
      }
      if (!/^image\//i.test(contentType)) {
        response.resume();
        reject(new Error(`not-image ${contentType || 'unknown'}`));
        return;
      }

      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > maxImageBytes) {
          request.destroy(new Error(`image-too-large ${bytes}`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 200) {
          reject(new Error('image-too-small'));
          return;
        }
        resolve({ buffer, contentType });
      });
    });
    request.on('timeout', () => request.destroy(new Error(`timeout ${timeoutMs}ms`)));
    request.on('error', reject);
  });
}

function isTransientNetworkImageError(error = {}) {
  return /ECONNRESET|socket hang up|aborted|terminated|timeout/i.test(String(error.message || ''));
}

function classifyImageFailure(error = {}) {
  const message = String(error.message || error || '');
  if (/certificate|CERT_|self signed|unable to verify|has expired/i.test(message)) return 'tls-certificate';
  if (/not-image\s+text\/html/i.test(message)) return 'source-returned-html';
  if (/not-image/i.test(message)) return 'non-image-response';
  if (/HTTP\s+(401|403)/i.test(message)) return 'access-denied';
  if (/HTTP\s+(404|410)/i.test(message)) return 'not-found';
  if (/HTTP\s+5\d\d/i.test(message)) return 'upstream-server-error';
  if (/image-too-small|image-too-large/i.test(message)) return 'invalid-image-size';
  if (isTransientNetworkImageError(error)) return 'transient-network';
  return 'fetch-failed';
}

function nextFailureRetryAt(failedAt = generatedAt, kind = 'fetch-failed') {
  const hours = kind === 'transient-network' || kind === 'upstream-server-error'
    ? Math.min(6, failureRetryHours)
    : failureRetryHours;
  return new Date(new Date(failedAt).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function shouldSkipRecentFailure(record = {}) {
  if (!record.retry_after) return false;
  const retryAfter = new Date(record.retry_after).getTime();
  return Number.isFinite(retryAfter) && retryAfter > Date.now();
}

function rememberFailure(manifest, target, error) {
  const kind = classifyImageFailure(error);
  const previous = manifest.failures?.[target.source_url] || {};
  if (!manifest.failures) manifest.failures = {};
  manifest.failures[target.source_url] = {
    source_url: target.source_url,
    failure_kind: kind,
    reason: String(error.message || error || kind),
    failed_at: generatedAt,
    retry_after: nextFailureRetryAt(generatedAt, kind),
    attempts: Number(previous.attempts || 0) + 1,
    event_ids: [...new Set(target.event_ids)],
    titles: [...new Set(target.titles)].slice(0, 8),
    source_hosts: [...new Set(target.source_hosts)].slice(0, 4)
  };
  return manifest.failures[target.source_url];
}

async function fetchImageViaFetch(url, referer = sourceRefererForUrl(url)) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: imageRequestOptions(url, referer).headers
  });
  const contentType = String(response.headers.get('content-type') || '');
  if (!response.ok) throw new Error(`HTTP ${response.status || 'unknown'}`);
  if (!/^image\//i.test(contentType)) throw new Error(`not-image ${contentType || 'unknown'}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 200) throw new Error('image-too-small');
  if (buffer.length > maxImageBytes) throw new Error(`image-too-large ${buffer.length}`);
  return { buffer, contentType };
}

async function fetchImageWithFallback(url) {
  let lastError;
  const referers = [...new Set([sourceRefererForUrl(url), 'https://eventme.live/'])];
  for (const referer of referers) {
    try {
      return await fetchImage(url, 3, referer);
    } catch (error) {
      lastError = error;
      if (isTransientNetworkImageError(error)) {
        try {
          return await fetchImageViaFetch(url, referer);
        } catch (fetchError) {
          lastError = fetchError;
        }
      }
    }
  }
  try {
    return await fetchImageViaFetch(url, 'https://eventme.live/');
  } catch (error) {
    throw lastError || error;
  }
}

function eventRows() {
  if (!fs.existsSync(eventsPath)) throw new Error(`Events feed not found: ${rel(eventsPath)}. Run npm run build first.`);
  const envelope = readJson(eventsPath);
  const builtEvents = Array.isArray(envelope.events) ? envelope.events : [];
  if (!fs.existsSync(catalogPath)) return builtEvents;
  const catalog = readJson(catalogPath);
  const rawEvents = Array.isArray(catalog.events) ? catalog.events : [];
  const rawById = new Map(rawEvents.map((event) => [event.id, event]));
  return builtEvents.map((event) => {
    const raw = rawById.get(event.id);
    if (!raw) return event;
    return {
      ...event,
      image_url: raw.image_url || event.image_url,
      original_image_url: raw.original_image_url || event.original_image_url,
      image_source_url: raw.image_source_url || event.image_source_url,
      image_discovered_at: raw.image_discovered_at || event.image_discovered_at,
      image_discovery_method: raw.image_discovery_method || event.image_discovery_method
    };
  });
}

function collectTargets(events) {
  const byUrl = new Map();
  for (const event of events) {
    const url = sourceImageUrl(event);
    if (!url) continue;
    const row = byUrl.get(url) || {
      source_url: url,
      event_ids: [],
      titles: [],
      source_hosts: []
    };
    row.event_ids.push(event.id);
    row.titles.push(event.title);
    try { row.source_hosts.push(new URL(url).hostname); } catch {}
    byUrl.set(url, row);
  }
  return [...byUrl.values()].slice(0, limit);
}

async function main() {
  ensureDir(imageOutputDir);
  ensureDir(path.dirname(manifestPath));
  ensureDir(path.dirname(reportJsonPath));

  const manifest = existingManifest();
  const rejectedRemoved = pruneRejectedManifestImages(manifest);
  const targets = collectTargets(eventRows());
  const fetched = [];
  const reused = [];
  const failed = [];
  const skippedRecentFailures = [];

  async function processTarget(target) {
    const current = manifest.images[target.source_url];
    if (current?.file && fs.existsSync(path.join(root, current.file))) {
      reused.push({ source_url: target.source_url, file: current.file, events: target.event_ids.length });
      manifest.images[target.source_url] = {
        ...current,
        event_ids: [...new Set([...(current.event_ids || []), ...target.event_ids])],
        titles: [...new Set([...(current.titles || []), ...target.titles])].slice(0, 8),
        checked_at: generatedAt
      };
      if (manifest.failures?.[target.source_url]) delete manifest.failures[target.source_url];
      return;
    }

    const recentFailure = manifest.failures?.[target.source_url];
    if (shouldSkipRecentFailure(recentFailure)) {
      const skipped = {
        source_url: target.source_url,
        events: target.event_ids.length,
        reason: recentFailure.reason,
        failure_kind: recentFailure.failure_kind,
        retry_after: recentFailure.retry_after,
        skipped: true
      };
      skippedRecentFailures.push(skipped);
      failed.push(skipped);
      return;
    }

    try {
      const { buffer, contentType } = await fetchImageWithFallback(target.source_url);
      const ext = extensionFor(target.source_url, contentType);
      const filename = `${slug(target.titles[0] || target.event_ids[0])}-${hash(target.source_url)}.${ext}`;
      const outputPath = path.join(imageOutputDir, filename);
      fs.writeFileSync(outputPath, buffer);
      const file = rel(outputPath);
      const publicPath = `/assets/event-images/${filename}`;
      const record = {
        source_url: target.source_url,
        public_path: publicPath,
        file,
        content_type: contentType,
        bytes: buffer.length,
        event_ids: [...new Set(target.event_ids)],
        titles: [...new Set(target.titles)].slice(0, 8),
        cached_at: generatedAt,
        checked_at: generatedAt
      };
      manifest.images[target.source_url] = record;
      if (manifest.failures?.[target.source_url]) delete manifest.failures[target.source_url];
      fetched.push({ source_url: target.source_url, file, bytes: buffer.length, events: target.event_ids.length });
    } catch (error) {
      const failure = rememberFailure(manifest, target, error);
      failed.push({
        source_url: target.source_url,
        events: target.event_ids.length,
        reason: failure.reason,
        failure_kind: failure.failure_kind,
        retry_after: failure.retry_after
      });
    }
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (cursor < targets.length) {
      const target = targets[cursor];
      cursor += 1;
      await processTarget(target);
    }
  });
  await Promise.all(workers);

  const usedUrls = new Set(targets.map((target) => target.source_url));
  for (const sourceUrl of Object.keys(manifest.images)) {
    if (!usedUrls.has(sourceUrl)) manifest.images[sourceUrl].stale = true;
  }
  manifest.generated_at = generatedAt;
  manifest.totals = {
    targets: targets.length,
    cached_total: Object.values(manifest.images).filter((record) => record.file && fs.existsSync(path.join(root, record.file))).length,
    fetched: fetched.length,
    reused: reused.length,
    failed: failed.length,
    skipped_recent_failures: skippedRecentFailures.length,
    remembered_failures: Object.keys(manifest.failures || {}).length
  };

  writeJson(manifestPath, manifest);

  const report = {
    generated_at: generatedAt,
    events_file: rel(eventsPath),
    manifest: rel(manifestPath),
    image_dir: rel(imageOutputDir),
    totals: manifest.totals,
    fetched,
    reused,
    rejected_removed: rejectedRemoved,
    skipped_recent_failures: skippedRecentFailures,
    failed
  };
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, [
    '# EventLive Event Image Cache Report',
    '',
    `- generated_at: ${generatedAt}`,
    `- events_file: ${rel(eventsPath)}`,
    `- manifest: ${rel(manifestPath)}`,
    `- image_dir: ${rel(imageOutputDir)}`,
    `- targets: ${manifest.totals.targets}`,
    `- cached_total: ${manifest.totals.cached_total}`,
    `- fetched: ${manifest.totals.fetched}`,
    `- reused: ${manifest.totals.reused}`,
    `- rejected_removed: ${rejectedRemoved.length}`,
    `- failed: ${manifest.totals.failed}`,
    `- skipped_recent_failures: ${manifest.totals.skipped_recent_failures}`,
    `- remembered_failures: ${manifest.totals.remembered_failures}`,
    `- concurrency: ${concurrency}`,
    '',
    '## Failed',
    '',
    ...(failed.length ? failed.map((item) => `- ${item.source_url} — ${item.failure_kind || 'fetch-failed'} — ${item.reason}${item.retry_after ? ` — retry after ${item.retry_after}` : ''}`) : ['- none'])
  ].join('\n') + '\n', 'utf8');

  console.log('# EventLive Event Image Cache');
  console.log(`- Targets: ${manifest.totals.targets}`);
  console.log(`- Cached total: ${manifest.totals.cached_total}`);
  console.log(`- Fetched: ${manifest.totals.fetched}`);
  console.log(`- Reused: ${manifest.totals.reused}`);
  console.log(`- Rejected removed: ${rejectedRemoved.length}`);
  console.log(`- Failed: ${manifest.totals.failed}`);
  console.log(`- Skipped recent failures: ${manifest.totals.skipped_recent_failures}`);
  console.log(`- Remembered failures: ${manifest.totals.remembered_failures}`);
  console.log(`- Concurrency: ${concurrency}`);
  console.log(`- Manifest: ${rel(manifestPath)}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main().catch((error) => {
  console.error(`EVENT_IMAGE_CACHE_FAILED ${error.message}`);
  process.exit(1);
});
