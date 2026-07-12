import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { classifyAudiences } from './audience-utils.mjs';
import { extractEmbeddedJsonObjects, walkEmbeddedObjects } from './embedded-json-utils.mjs';
import { parseFlexibleDateRange } from './date-parse-utils.mjs';
import { normalizeSaudiCity as normalizeCanonicalSaudiCity } from './city-utils.mjs';
import { eventEvidenceFromJsonLd } from './event-structured-data-utils.mjs';
import { ocrRemotePoster } from './poster-ocr-utils.mjs';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';
import { selectSourcesByCadence } from './source-cadence-utils.mjs';
import { parseVisitSaudiSummerPdfXml, visitSaudiPdfBufferToXml } from './visit-saudi-summer-pdf-utils.mjs';

const sourceRegistryPath = process.env.EVENTLIVE_SOURCE_REGISTRY_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_REGISTRY_FILE)
  : path.join(root, 'data', 'source_registry.json');
const sourceCandidatesPath = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE)
  : path.join(root, 'data', 'source_candidates.json');
const sourceRunStatePath = process.env.EVENTLIVE_SOURCE_RUN_STATE_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_RUN_STATE_FILE)
  : path.join(root, 'data', 'source_run_state.json');
const sourceEndedEventsPath = process.env.EVENTLIVE_SOURCE_ENDED_EVENTS_FILE || process.env.EVENTLIVE_SOURCE_ARCHIVE_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_ENDED_EVENTS_FILE || process.env.EVENTLIVE_SOURCE_ARCHIVE_FILE)
  : path.join(root, 'data', 'source_ended_events.json');
const legacySourceArchivePath = path.join(root, 'data', 'source_archive.json');
const snapshotDir = process.env.EVENTLIVE_SOURCE_SNAPSHOT_DIR
  ? path.join(root, process.env.EVENTLIVE_SOURCE_SNAPSHOT_DIR)
  : path.join(root, 'data', 'raw', 'source-snapshots');
const browserProbeReportPath = process.env.EVENTLIVE_BROWSER_PROBE_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_BROWSER_PROBE_REPORT_JSON)
  : path.join(root, 'reports', 'source-browser-probe-report.json');
const reportJsonPath = path.join(root, 'reports', 'source-collection-report.json');
const reportMdPath = path.join(root, 'reports', 'source-collection-report.md');
const checkpointJsonPath = process.env.EVENTLIVE_SOURCE_COLLECTION_CHECKPOINT_JSON
  ? path.join(root, process.env.EVENTLIVE_SOURCE_COLLECTION_CHECKPOINT_JSON)
  : path.join(root, 'reports', 'source-collection-checkpoint.json');
const now = new Date();
const collectedAt = now.toISOString();
const selectedIds = (process.env.EVENTLIVE_SOURCE_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

function environmentFlag(name, fallback = false) {
  const value = String(process.env[name] ?? '').trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
}

const collectEndedEvents = environmentFlag('EVENTLIVE_SOURCE_COLLECT_ENDED_EVENTS', false);
const collectionTimeScope = collectEndedEvents
  ? 'current-upcoming-and-ended'
  : 'current-and-upcoming-only';
const maxPerSource = Math.max(1, Number(process.env.EVENTLIVE_SOURCE_LIMIT || 40));
const maxArchivePerSource = Math.max(1, Number(process.env.EVENTLIVE_SOURCE_ENDED_LIMIT || process.env.EVENTLIVE_SOURCE_ARCHIVE_LIMIT || 24));
const trustedMaxPerSource = Math.max(maxPerSource, Number(process.env.EVENTLIVE_TRUSTED_SOURCE_LIMIT || 200));
const trustedMaxArchivePerSource = Math.max(maxArchivePerSource, Number(process.env.EVENTLIVE_TRUSTED_SOURCE_ENDED_LIMIT || 200));
const minEndedYear = Math.max(2022, Number(process.env.EVENTLIVE_SOURCE_ENDED_MIN_YEAR || 2022));
const fetchTimeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_SOURCE_FETCH_TIMEOUT_MS || 20000));
const browserFallbackMaxAgeMs = Math.max(
  60_000,
  Number(process.env.EVENTLIVE_BROWSER_FALLBACK_MAX_AGE_MS || 12 * 60 * 60 * 1000)
);
const browserFailureCooldownMs = Math.max(
  6 * 60 * 60 * 1000,
  Number(process.env.EVENTLIVE_BROWSER_FAILURE_COOLDOWN_MS || 72 * 60 * 60 * 1000)
);
const liveBrowserTimeoutMs = Math.max(10_000, Number(process.env.EVENTLIVE_LIVE_BROWSER_TIMEOUT_MS || 30_000));
const lastKnownGoodMaxAgeMs = Math.max(
  60_000,
  Number(process.env.EVENTLIVE_LAST_GOOD_SNAPSHOT_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000)
);
const dryRun = ['1', 'true', 'yes'].includes(String(process.env.EVENTLIVE_SOURCE_DRY_RUN || '').toLowerCase());
const adaptiveCadenceEnabled = !['0', 'false', 'no', 'off']
  .includes(String(process.env.EVENTLIVE_SOURCE_ADAPTIVE_CADENCE ?? 'true').toLowerCase());
const forceAllSources = ['1', 'true', 'yes', 'on']
  .includes(String(process.env.EVENTLIVE_SOURCE_FORCE_ALL || '').toLowerCase());
let activeSnapshotStamp = collectedAt.replace(/[:.]/g, '-');
const sourceFetchModes = new Map();
const sourceEvidenceSnapshots = new Map();

const tlsRelaxationAllowedHosts = new Set(['riyadh.sa', 'api.riyadh.sa', 'www.najran.gov.sa', 'najran.gov.sa']);

function isTlsRelaxationCandidate(url = '') {
  try {
    return tlsRelaxationAllowedHosts.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isTlsVerificationError(error = {}) {
  const text = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const reason = String(error?.cause?.message || '').toLowerCase();
  return /unable_to_verify_leaf_signature|certificate|ssl|cert_|self[- ]?signed|tls/.test(`${text} ${code} ${reason}`);
}

function normalizedHeaderReader(headers = {}) {
  const normalized = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    normalized[String(key).toLowerCase()] = Array.isArray(value) ? value.join(',') : String(value);
  });
  return {
    get(name = '') {
      return normalized[String(name || '').toLowerCase()] || null;
    }
  };
}

function buildTextResponse(url, status = 0, statusText = '', headers = {}, text = '') {
  return {
    ok: Number(status) >= 200 && Number(status) < 300,
    status: Number(status),
    statusText,
    url,
    headers: normalizedHeaderReader(headers),
    async text() {
      return text;
    }
  };
}

async function fetchWithRelaxedTls(url, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  const payload = options.body ? String(options.body) : '';
  const requestedUrl = new URL(url);
  const requestLib = requestedUrl.protocol === 'http:' ? http : https;
  const requestHeaders = { ...headers };

  return new Promise((resolve, reject) => {
    const req = requestLib.request({
      method,
      protocol: requestedUrl.protocol,
      hostname: requestedUrl.hostname,
      port: requestedUrl.port || (requestedUrl.protocol === 'https:' ? 443 : 80),
      path: `${requestedUrl.pathname || '/'}${requestedUrl.search || ''}`,
      headers: requestHeaders,
      timeout: fetchTimeoutMs,
      agent: requestedUrl.protocol === 'https:' ? new https.Agent({ rejectUnauthorized: false }) : undefined
    }, (res) => {
      const redirect = res.statusCode >= 300 && res.statusCode < 400 && res.headers.location;
      if (redirect) {
        const nextUrl = new URL(res.headers.location, requestedUrl).toString();
        res.resume();
        fetchWithRelaxedTls(nextUrl, options).then(resolve, reject);
        return;
      }
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        text += chunk;
      });
      res.on('end', () => {
        resolve(buildTextResponse(requestedUrl.toString(), res.statusCode || 0, res.statusMessage || '', res.headers, text));
      });
      res.on('error', (error) => {
        reject(error);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy(new Error(`timeout ${fetchTimeoutMs}ms`));
    });

    if (method !== 'GET' && payload) {
      req.write(payload);
    }
    req.end();
  });
}

const sourceExtractors = {
  'visit-saudi-calendar': extractVisitSaudi,
  'visit-saudi-seasons': extractVisitSaudiSeasons,
  'visit-saudi-calendar-pdf': extractVisitSaudiSummerPdf,
  'invest-saudi-events': extractInvestSaudiEvents,
  'saudi-space-agency-events': extractSaudiSpaceAgencyEvents,
  'experience-alula-events': extractExperienceAlula,
  'ithra-events': extractIthraEvents,
  'monshaat-events': extractMonshaat,
  'rfecc-whats-on': extractRfeccWhatsOn,
  'eye-of-riyadh-events': extractEyeOfRiyadh,
  'mdlbeast-events': extractMdlbeast,
  'sfda-events': extractSfdaEvents,
  'saudi-water-authority-events': extractSaudiWaterAuthorityEvents,
  'dhahran-expo-calendar': extractDhahranExpoCalendar,
  'eventbrite-saudi': extractEventbrite,
  'tuwaiq-academy-bootcamps': extractTuwaiqAcademy,
  'future-skills-catalog': extractFutureSkills,
  'code-mcit-programs': extractCodeMcitPrograms,
  'misk-hub-programs': extractMiskHubPrograms,
  'misk-hub-events': extractMiskHubEvents,
  'discover-aseer-events': extractDiscoverAseerEvents,
  'sdaia-academy-programs': extractSdaiaAcademyPrograms,
  'saudi-pro-league-fixtures': extractSaudiProLeagueFixtures,
  'moc-cultural-calendar': extractMocCulturalCalendar,
  'moc-cultural-subportals': extractMocCulturalCalendar,
  'mos-events': extractMinistryOfSportEvents,
  'jcci-events-center': extractJcciEventsCenter,
  'umm-al-qura-events': extractUmmAlQuraEvents,
  'madinah-chamber-events': extractMadinahChamberEvents,
  'madinah-architecture-festival': extractMadinahArchitectureFestival,
  'hayy-jameel-events': extractHayyJameelEvents,
  'sdaia-calendar-events': extractSdaiaCalendarEvents,
  'saudi-university-events': extractKaustEvents,
  'asharqia-chamber-events': extractAsharqiaChamberEvents,
  'makkah-chamber-events': extractMakkahChamberEvents,
  'qassim-chamber-events': extractQassimChamberEvents,
  'qassim-university-events': extractQassimUniversityEvents,
  'jouf-university-programs': extractJoufUniversityPrograms,
  'abha-chamber-events': extractAbhaChamberEvents,
  'jazan-chamber-events': extractJazanChamberEvents,
  'northern-borders-chamber-events': extractNorthernBordersChamberEvents,
  'tabuk-chamber-events': extractTabukChamberEvents,
  'scega-exhibitions-conferences': extractScegaEvents,
  'najran-municipality-summer-events': extractNajranMunicipalityEvents,
  'riyadh-city-events': extractRiyadhCityEvents,
  'informa-connect-saudi-events': extractInformaSaudiPortfolio
};

const sourceApiFallbackExtractors = new Map([
  ['moc-cultural-calendar', (source) => extractMocCalendarApi(source)],
  ['moc-cultural-subportals', (source) => extractMocCalendarApi(source)],
  ['monshaat-events', (source) => extractMonshaatInternalEvents(source)],
  ['jazan-chamber-events', (source) => extractJazanChamberEvents('', source)]
]);

function isDiscoveryOnlySource(source) {
  return source.intake_policy === 'candidate-only'
    || source.trust_level === 'aggregator'
    || source.trust_level === 'community'
    || source.source_type === 'industry-directory'
    || source.source_type === 'community-platform';
}

async function collectorFetch(url, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || process.env.EVENTLIVE_SOURCE_FETCH_ATTEMPTS || 3));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, {
        ...options,
        signal: options.signal || AbortSignal.timeout(fetchTimeoutMs)
      });
    } catch (error) {
      lastError = error;
      if (isTlsRelaxationCandidate(url) && isTlsVerificationError(error)) {
        try {
          return await fetchWithRelaxedTls(url, options);
        } catch (fallbackError) {
          lastError = fallbackError;
        }
      }
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function toSlug(value = '') {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  if (normalized) return normalized.slice(0, 72);
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12);
}

function writeAuxiliarySnapshot(source, label, content, extension = 'html') {
  ensureDir(snapshotDir);
  const safeLabel = toSlug(label || 'detail');
  const snapshotPath = path.join(snapshotDir, `${source.id}-${safeLabel}-${activeSnapshotStamp}.${extension}`);
  fs.writeFileSync(snapshotPath, content, 'utf8');
  const relativePath = rel(snapshotPath);
  sourceEvidenceSnapshots.set(source.id, relativePath);
  return relativePath;
}

function canUseBrowserHtmlFallback(source = {}) {
  if (isDiscoveryOnlySource(source)) return false;
  if (String(source.collector_method || 'GET').toUpperCase() !== 'GET') return false;
  const target = String(source.collector_url || source.url || '');
  return !/\/api\/|api\.|\.json(?:$|\?)/i.test(target);
}

function browserProbeSnapshotTimestamp(snapshotPath = '') {
  const name = path.basename(String(snapshotPath || ''));
  const match = name.match(/-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.html$/i);
  if (!match) return 0;
  const iso = match[1].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
  const timestamp = new Date(iso).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function browserProbeEvidenceTimestamp(probe = {}) {
  const explicit = new Date(probe.probed_at || 0).getTime();
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return browserProbeSnapshotTimestamp(probe.html_snapshot);
}

function recentBrowserProbeFailure(source, currentTime = Date.now()) {
  if (!canUseBrowserHtmlFallback(source) || !exists(browserProbeReportPath)) return false;
  try {
    const report = readJson(browserProbeReportPath);
    const probe = (report.sources || []).find((item) => item.id === source.id);
    if (!probe) return false;
    const failed = probe.status === 'error' || /blocked|protected|empty-or-shell/i.test(probe.classification || '');
    if (!failed) return false;
    const probedAtMs = browserProbeEvidenceTimestamp(probe);
    return probedAtMs > 0 && currentTime - probedAtMs <= browserFailureCooldownMs;
  } catch {
    return false;
  }
}

function freshBrowserProbeHtml(source, currentTime = Date.now()) {
  if (!canUseBrowserHtmlFallback(source) || !exists(browserProbeReportPath)) return '';
  try {
    const report = readJson(browserProbeReportPath);
    const probe = (report.sources || []).find((item) => item.id === source.id);
    if (!probe || probe.status !== 'ok' || /blocked|protected|policy-skipped/i.test(probe.classification || '')) return '';
    const probedAtMs = browserProbeEvidenceTimestamp(probe);
    if (!probedAtMs || currentTime - probedAtMs > browserFallbackMaxAgeMs) return '';
    const snapshotPath = String(probe.html_snapshot || '');
    if (!snapshotPath) return '';
    const absolutePath = path.isAbsolute(snapshotPath) ? snapshotPath : path.join(root, snapshotPath);
    if (!exists(absolutePath)) return '';
    const html = fs.readFileSync(absolutePath, 'utf8');
    return Buffer.byteLength(html) >= 512 ? html : '';
  } catch {
    return '';
  }
}

function trustedOfficialSource(source = {}) {
  return ['official', 'venue-official'].includes(source.trust_level)
    && !['candidate-only', 'partnership-needed'].includes(source.intake_policy);
}

function sourceRunLimits(source = {}, options = {}) {
  const trusted = trustedOfficialSource(source);
  const includeEnded = options.includeEnded ?? collectEndedEvents;
  return {
    active: Math.max(1, Number(source.max_candidates_per_run || (trusted ? trustedMaxPerSource : maxPerSource))),
    ended: includeEnded
      ? Math.max(1, Number(source.max_ended_per_run || (trusted ? trustedMaxArchivePerSource : maxArchivePerSource)))
      : 0
  };
}

function snapshotTimestamp(fileName, sourceId) {
  const escapedId = String(sourceId || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(fileName || '').match(new RegExp(`^${escapedId}-(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2})-(\\d{2})-(\\d{2})-(\\d{3})Z\\.html$`));
  if (!match) return 0;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${match[7]}Z`).getTime();
}

function latestOfficialSnapshotHtml(source, currentTime = Date.now()) {
  if (!canUseBrowserHtmlFallback(source) || !exists(snapshotDir)) return '';
  try {
    const candidates = fs.readdirSync(snapshotDir)
      .map((fileName) => ({ fileName, timestamp: snapshotTimestamp(fileName, source.id) }))
      .filter((item) => Number.isFinite(item.timestamp) && item.timestamp > 0)
      .filter((item) => currentTime - item.timestamp <= lastKnownGoodMaxAgeMs)
      .sort((a, b) => b.timestamp - a.timestamp);
    for (const candidate of candidates) {
      const html = fs.readFileSync(path.join(snapshotDir, candidate.fileName), 'utf8');
      if (Buffer.byteLength(html) >= 512) return html;
    }
  } catch {
    return '';
  }
  return '';
}

function sourceFallbackHtml(source) {
  const browserHtml = freshBrowserProbeHtml(source);
  if (browserHtml) {
    sourceFetchModes.set(source.id, 'browser-probe');
    return browserHtml;
  }
  const snapshotHtml = latestOfficialSnapshotHtml(source);
  if (snapshotHtml) {
    sourceFetchModes.set(source.id, 'last-known-good');
    return snapshotHtml;
  }
  return '';
}

function cleanTitle(value = '') {
  return stripTags(value).replace(/\s+\|\s+.*$/, '').trim();
}

function readableExcerpt(value = '', limit = 520) {
  const text = stripTags(value);
  if (text.length <= limit) return text;
  const head = text.slice(0, Math.max(1, limit - 3));
  const sentenceEnd = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), head.lastIndexOf('؟ '));
  if (sentenceEnd >= Math.floor(limit * 0.6)) return head.slice(0, sentenceEnd + 1).trim();
  const clipped = head.replace(/\s+\S*$/, '').trim();
  return `${clipped || head.trim()}...`;
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(decodeHtml(href), baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function isUsefulImageUrl(url = '') {
  const clean = String(url || '').trim();
  if (!/^https?:\/\//i.test(clean)) return false;
  if (/\.(?:svg|ico)(?:\?|#|$)/i.test(clean)) return false;
  if (/(?:logo|loader|sprite|icon|placeholder|avatar|apple|vision|rss|twitter|facebook|linkedin|youtube|snapchat|whatsapp)/i.test(clean)) return false;
  return /\.(?:jpg|jpeg|png|webp|avif)(?:\?|#|$)/i.test(clean)
    || /\/styles\/|\/images\/|\/events_images\/|\/is\/image\/|scene7\.com|datocms-assets\.com|wp-content\/uploads|cdn\./i.test(clean);
}

function metaContent(html = '', keyPattern = '') {
  const directMatcher = new RegExp(`<meta\\s+[^>]*(?:property|name|itemprop)=["']${keyPattern}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const reversedMatcher = new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${keyPattern}["'][^>]*>`, 'i');
  return decodeHtml(html.match(directMatcher)?.[1] || html.match(reversedMatcher)?.[1] || '');
}

function imageScore(url = '', hintScore = 0) {
  const clean = String(url || '').toLowerCase();
  let score = hintScore;
  const width = clean.match(/(?:^|[?&/_-])(?:w|width|resize|size|_)(\d{3,5})(?:\D|$)/i)?.[1]
    || clean.match(/(\d{3,5})x\d{3,5}/i)?.[1];
  if (width) score += Math.min(1400, Number(width));
  if (/og:image|twitter:image|event|cover|banner|hero|poster|image/i.test(clean)) score += 180;
  if (/thumb|thumbnail|small|avatar|logo|icon|placeholder/i.test(clean)) score -= 600;
  if (/\.(?:avif|webp)(?:\?|#|$)/i.test(clean)) score += 80;
  if (/\.(?:jpg|jpeg|png)(?:\?|#|$)/i.test(clean)) score += 50;
  return score;
}

function srcsetImages(srcset = '', baseUrl = '') {
  return String(srcset || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rawUrl, descriptor = ''] = part.split(/\s+/, 2);
      const width = descriptor.endsWith('w') ? Number(descriptor.replace(/\D/g, '')) : 0;
      const density = descriptor.endsWith('x') ? Number(descriptor.replace(/[^\d.]/g, '')) : 0;
      const url = resolveUrl(decodeHtml(rawUrl), baseUrl);
      return { url, score: imageScore(url, width || Math.round(density * 700)) };
    })
    .filter((item) => isUsefulImageUrl(item.url));
}

function firstUsefulImageFromHtml(html = '', baseUrl = '') {
  const candidates = [
    metaContent(html, 'og:image'),
    metaContent(html, 'og:image:secure_url'),
    metaContent(html, 'twitter:image'),
    metaContent(html, 'twitter:image:src'),
    metaContent(html, 'image')
  ]
    .map((url) => resolveUrl(url, baseUrl))
    .filter(isUsefulImageUrl)
    .map((url) => ({ url, score: imageScore(url, 1200) }));

  for (const match of html.matchAll(/<(?:img|source)\s+[^>]*(?:srcset|data-srcset)=["']([^"']+)["'][^>]*>/gi)) {
    candidates.push(...srcsetImages(match[1], baseUrl));
  }

  for (const match of html.matchAll(/<img\s+[^>]*(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["'][^>]*>/gi)) {
    const url = resolveUrl(decodeHtml(match[1]), baseUrl);
    if (isUsefulImageUrl(url)) candidates.push({ url, score: imageScore(url, 350) });
  }

  const unique = new Map();
  for (const item of candidates) {
    const key = item.url.split('#')[0];
    if (!unique.has(key) || unique.get(key).score < item.score) unique.set(key, item);
  }
  return [...unique.values()].sort((a, b) => b.score - a.score)[0]?.url || '';
}

function attendanceModeFromText(value = '') {
  const text = stripTags(value).toLowerCase();
  const online = /online|remote|virtual|webinar|zoom|عن بعد|إلكترونية|الكترونية|تفاعلية/.test(text);
  const inPerson = /riyadh|jeddah|dhahran|dammam|khobar|venue|حضوري|حضورية|الرياض|جدة|الظهران|الدمام|الخبر/.test(text);
  if (online && inPerson) return 'hybrid';
  if (online) return 'online';
  if (inPerson) return 'in-person';
  return '';
}

function priceLabelFromText(value = '') {
  const text = stripTags(value).toLowerCase();
  if (/free|مجاني|بدون رسوم/.test(text)) return 'free';
  const price = text.match(/(?:sar|ريال|ر\.س)\s*([\d,.]+)/i) || text.match(/([\d,.]+)\s*(?:sar|ريال|ر\.س)/i);
  return price ? `${price[1]} SAR` : '';
}

function registrationUrlFromHtml(html = '', baseUrl = '') {
  const baseHost = (() => {
    try { return new URL(baseUrl).hostname.replace(/^www\./, ''); } catch { return ''; }
  })();
  return [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,180}?)<\/a>/gi)]
    .map((match) => ({
      href: resolveUrl(decodeHtml(match[1]), baseUrl),
      text: stripTags(match[2]).toLowerCase()
    }))
    .filter((link) => !/(facebook|twitter|x\.com|instagram|linkedin|youtube|snapchat|whatsapp|mailto:|tel:|\/share)/i.test(link.href))
    .filter((link) => {
      try {
        const host = new URL(link.href).hostname.replace(/^www\./, '');
        return host === baseHost || /(webook|ticket|tickets|eventbrite|platinumlist|halayalla|haliyalla|tuwaiq|mcit|gov\.sa|edu\.sa)$/i.test(host);
      } catch {
        return false;
      }
    })
    .find((link) => /register|registration|apply|book|ticket|enroll|سجل|تسجيل|احجز|تذاكر|قدم/.test(`${link.href} ${link.text}`))
    ?.href || '';
}

function detailEnrichmentFromHtml(html = '', url = '', fallbackTitle = '') {
  const description = metaContent(html, 'description') || metaContent(html, 'og:description');
  const title = metaContent(html, 'og:title') || stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || fallbackTitle);
  const text = stripTags(html).slice(0, 5000);
  const imageUrl = firstUsefulImageFromHtml(html, url);
  const registrationUrl = registrationUrlFromHtml(html, url);
  let structuredEvidence = {};
  for (const payload of extractEmbeddedJsonObjects(html)) {
    walkEmbeddedObjects(payload, (entry) => {
      if (structuredEvidence.__found) return;
      const types = Array.isArray(entry?.['@type']) ? entry['@type'] : [entry?.['@type']];
      if (!types.includes('Event')) return;
      structuredEvidence = { ...eventEvidenceFromJsonLd(entry), __found: true };
    });
    if (structuredEvidence.__found) break;
  }
  delete structuredEvidence.__found;
  return {
    ...(imageUrl ? {
      image_url: imageUrl,
      image_alt: title || fallbackTitle,
      image_source_url: url
    } : {}),
    ...(description ? { rich_summary: stripTags(description).slice(0, 700) } : {}),
    ...structuredEvidence,
    ...(registrationUrl ? { registration_url: registrationUrl } : {}),
    ...(attendanceModeFromText(text) ? { attendance_mode: attendanceModeFromText(text) } : {}),
    ...(priceLabelFromText(text) ? { price_label: priceLabelFromText(text) } : {}),
    language: /lang=["']en/i.test(html) ? 'en' : (/lang=["']ar/i.test(html) || /[\u0600-\u06ff]/.test(text) ? 'ar' : '')
  };
}

function richFieldsFromItem(item = {}) {
  const fields = {};
  [
    'image_url',
    'image_alt',
    'image_source_url',
    'registration_url',
    'ticket_url',
    'organizer_url',
    'registration_status',
    'ticket_status',
    'offer_valid_from',
    'maps_url',
    'attendance_mode',
    'price_label',
    'language',
    'rich_summary',
    'registration_deadline',
    'parking_info',
    'accessibility_info',
    'age_policy',
    'duration_label',
    'richness_score'
  ].forEach((key) => {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') fields[key] = item[key];
  });
  if (Array.isArray(item.highlights) && item.highlights.length) fields.highlights = item.highlights.slice(0, 8);
  if (Array.isArray(item.performers) && item.performers.length) fields.performers = item.performers.slice(0, 20);
  return fields;
}

function calculateRichnessScore(item = {}) {
  return [
    item.image_url,
    item.summary || item.rich_summary,
    item.registration_url || item.ticket_url,
    item.attendance_mode,
    item.price_label,
    item.language,
    item.venue,
    item.category,
    Array.isArray(item.audiences) && item.audiences.length,
    Array.isArray(item.sessions) && item.sessions.length
  ].filter(Boolean).length;
}

function dateWithTime(year, monthIndex, day, time = '09:00:00') {
  const date = new Date(Date.UTC(Number(year), Number(monthIndex), Number(day)));
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${time}+03:00`;
}

function isValidPublicDateTime(value = '') {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(String(value || ''))
    && !Number.isNaN(new Date(value).getTime());
}

function hasValidCandidateDates(candidate = {}) {
  return isValidPublicDateTime(candidate.starts_at) && isValidPublicDateTime(candidate.ends_at);
}

function isoDateToSaudiDateTime(value, time = '09:00:00') {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]}T${time}+03:00`;
}

function monthIndex(monthName) {
  const raw = String(monthName || '').trim().toLowerCase();
  const key = raw.slice(0, 3);
  const months = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11
  };
  const arabicMonths = {
    يناير: 0,
    فبراير: 1,
    مارس: 2,
    أبريل: 3,
    ابريل: 3,
    مايو: 4,
    يونيو: 5,
    يوليو: 6,
    أغسطس: 7,
    اغسطس: 7,
    سبتمبر: 8,
    أكتوبر: 9,
    اكتوبر: 9,
    نوفمبر: 10,
    ديسمبر: 11
  };
  return months[key] ?? arabicMonths[raw];
}

function inferYear(month, day) {
  const currentYear = now.getFullYear();
  const candidate = new Date(Date.UTC(currentYear, month, day));
  const current = new Date(Date.UTC(currentYear, now.getMonth(), now.getDate()));
  return candidate < current ? currentYear + 1 : currentYear;
}

function parseMonshaatDate(dayText, monthText) {
  const text = `${stripTags(dayText)} ${stripTags(monthText)}`.replace(/[–—]/g, '-').replace(/\\s+/g, ' ').trim();
  const flexible = parseFlexibleDateRange(text, { end_time: '17:00:00' });
  if (flexible?.starts_at && flexible?.ends_at) {
    return flexible;
  }
  const day = Number(text.match(/\d{1,2}/)?.[0]);
  const monthYear = text.match(/(\d{4})\s+([A-Za-z]+)/);
  if (!day || !monthYear) return null;
  const year = Number(monthYear[1]);
  const month = monthIndex(monthYear[2]);
  if (!Number.isInteger(month)) return null;
  return {
    starts_at: dateWithTime(year, month, day),
    ends_at: dateWithTime(year, month, day, '17:00:00')
  };
}

function parseVisitSaudiDateRange(card) {
  const startsAt = isoDateToSaudiDateTime(card.startDate);
  const endsAt = isoDateToSaudiDateTime(card.endDate || card.startDate, '18:00:00');
  if (!startsAt || !endsAt) return null;
  return {
    starts_at: startsAt,
    ends_at: endsAt
  };
}

function parseDateFields(startDate, endDate, startTime = '09:00', endTime = '18:00') {
  const start = String(startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const end = String(endDate || startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!start || !end) return null;
  const cleanStartTime = String(startTime || '09:00').match(/^\d{2}:\d{2}/)?.[0] || '09:00';
  const cleanEndTime = String(endTime || '18:00').match(/^\d{2}:\d{2}/)?.[0] || '18:00';
  return {
    starts_at: `${start[1]}-${start[2]}-${start[3]}T${cleanStartTime}:00+03:00`,
    ends_at: `${end[1]}-${end[2]}-${end[3]}T${cleanEndTime}:00+03:00`
  };
}

function dateFieldsFromIsoDates(startDate, endDate, startTime = '09:00:00', endTime = '18:00:00') {
  const start = String(startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const end = String(endDate || startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!start || !end) return null;
  return {
    starts_at: `${start[1]}-${start[2]}-${start[3]}T${startTime}+03:00`,
    ends_at: `${end[1]}-${end[2]}-${end[3]}T${endTime}+03:00`
  };
}

function saudiDateTimeFromCompactUtc(value = '', fallbackTime = '09:00:00') {
  const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return '';
  if (match[4]) {
    const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5] || 0), Number(match[6] || 0));
    const saudi = new Date(utc + 3 * 3600 * 1000);
    return [
      saudi.getUTCFullYear(),
      String(saudi.getUTCMonth() + 1).padStart(2, '0'),
      String(saudi.getUTCDate()).padStart(2, '0')
    ].join('-') + `T${String(saudi.getUTCHours()).padStart(2, '0')}:${String(saudi.getUTCMinutes()).padStart(2, '0')}:${String(saudi.getUTCSeconds()).padStart(2, '0')}+03:00`;
  }
  return `${match[1]}-${match[2]}-${match[3]}T${fallbackTime}+03:00`;
}

function durationDaysBetween(startDateTime = '', endDateTime = '') {
  const start = new Date(startDateTime).getTime();
  const end = new Date(endDateTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86400000);
}

function yyyymmAfter(monthOffset = 0) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + monthOffset, 1));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dateTimeFromIsoDateAndClock(dateValue, timeValue, fallbackTime = '09:00:00') {
  const date = datePartFromAny(dateValue);
  if (!date) return '';
  const time = parseClockTime(timeValue || fallbackTime, fallbackTime);
  return `${date}T${time}+03:00`;
}

function datePartFromAny(value = '') {
  return String(value || '').match(/(\d{4})-(\d{2})-(\d{2})/)?.[0] || '';
}

function timePartFromAny(value = '', fallback = '09:00') {
  const text = String(value || '');
  const match = text.match(/T(\d{2}):(\d{2})/) || text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) return fallback;
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
}

function dateTimeFromParts(dateValue, timeValue, fallbackTime = '09:00') {
  const date = datePartFromAny(dateValue);
  if (!date) return '';
  return `${date}T${timePartFromAny(timeValue, fallbackTime)}:00+03:00`;
}

function saudiDateTimeFromMillis(value) {
  const millis = Number(value);
  if (!Number.isFinite(millis)) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(millis)).map((part) => [part.type, part.value]));
  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) return '';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00+03:00`;
}

function saudiDateFromUnixSeconds(value) {
  const millis = Number(value);
  if (!Number.isFinite(millis)) return '';
  const normalized = millis > 10 ** 12 ? millis : millis * 1000;
  return saudiDateTimeFromMillis(normalized).slice(0, 10);
}

function clockTextFromUnixOrText(value, fallback = '09:00:00') {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const bounded = Math.round(numeric) % (24 * 3600);
    const hour = Math.floor(bounded / 3600);
    const minute = Math.floor((bounded % 3600) / 60);
    if (Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    }
  }
  return normalizeClock(String(value || ''), fallback);
}

function datetimeFromUnixAndClock(dateValue, timeValue, fallback = '09:00:00') {
  const dateText = saudiDateFromUnixSeconds(dateValue);
  if (!dateText) return '';
  const clockText = clockTextFromUnixOrText(timeValue, fallback);
  return `${dateText}T${clockText}+03:00`;
}

function saudiDateTimeFromIso(value) {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) return '';
  return saudiDateTimeFromMillis(millis);
}

function addHoursToSaudiDateTime(value, hours = 2) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\+03:00$/);
  if (!match) return '';
  const utcMillis = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]) - 3,
    Number(match[5]),
    Number(match[6])
  );
  return saudiDateTimeFromMillis(utcMillis + hours * 60 * 60 * 1000);
}

function cityFromSlugOrTitle(value = '', fallback = 'Saudi Arabia') {
  const text = stripTags(value).toLowerCase();
  if (/riyadh|الرياض/.test(text)) return 'Riyadh';
  if (/jeddah|جدة/.test(text)) return 'Jeddah';
  if (/makkah|mecca|مكة/.test(text)) return 'Makkah';
  if (/madinah|medina|المدينة/.test(text)) return 'Madinah';
  if (/dammam|الدمام/.test(text)) return 'Dammam';
  if (/khobar|الخبر/.test(text)) return 'Khobar';
  if (/dhahran|الظهران/.test(text)) return 'Dhahran';
  if (/diriyah|الدرعية/.test(text)) return 'Diriyah';
  if (/alula|al ula|العلا/.test(text)) return 'AlUla';
  if (/aseer|asir|abha|عسير|أبها|ابها/.test(text)) return 'Aseer';
  if (/khamis/.test(text)) return 'Khamis Mushait';
  return fallback;
}

function parseArabicNumericDateRange(value) {
  const dates = [...String(value || '').matchAll(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/g)];
  if (!dates.length) return null;
  const start = dates[0];
  const end = dates[1] || dates[0];
  return {
    starts_at: dateWithTime(Number(start[3]), Number(start[2]) - 1, Number(start[1])),
    ends_at: dateWithTime(Number(end[3]), Number(end[2]) - 1, Number(end[1]), '18:00:00')
  };
}

function normalizeClock(value = '', fallback = '09:00:00') {
  const text = stripTags(value).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).trim();
  const ampm = /\bpm\b|مساء/i.test(text) ? 'pm' : (/\bam\b|صباح/i.test(text) ? 'am' : '');
  const match = text.match(/(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return fallback;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (!Number.isInteger(hour) || hour < 0 || hour > 24 || !Number.isInteger(minute) || minute > 59) return fallback;
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  if (hour === 24) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function parseDmyDateRangeWithTimes(dateText = '', startTime = '', endTime = '') {
  const normalized = String(dateText || '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const dateTokens = [...normalized.matchAll(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/g)]
    .map((match) => {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      if (!Number.isInteger(month) || !Number.isInteger(day) || month < 0 || month > 11 || day < 1 || day > 31) return null;
      return {
        day,
        month,
        year: match[3] ? normalizeTwoDigitYear(match[3]) : null,
        index: match.index || 0,
        raw: match[0]
      };
    })
    .filter(Boolean);

  if (!dateTokens.length) return null;

  const completeDates = dateTokens.filter((item) => Number.isInteger(item.year));
  const yearHints = [...normalized.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const fallbackYear = yearHints.length ? yearHints[0] : null;

  const resolveYear = (token = {}, fallback = null) => {
    if (Number.isInteger(token?.year)) return token.year;
    if (Number.isInteger(fallback)) return fallback;
    return null;
  };

  const candidateDates = completeDates.length
    ? completeDates.map((token) => ({
      ...token,
      year: token.year
    }))
    : dateTokens.map((token) => ({
      ...token,
      year: resolveYear(token, fallbackYear) || inferFutureYear(token.month, token.day)
    }));

  if (!candidateDates.length) return null;
  const startToken = candidateDates[0];
  const endToken = candidateDates[1] || candidateDates[0];
  const normalizedEndYear = Number.isInteger(endToken.year) ? endToken.year : (
    endToken.month < startToken.month || endToken.day < startToken.day ? (startToken.year + 1) : startToken.year
  );

  return {
    starts_at: dateWithTime(startToken.year, startToken.month, startToken.day, normalizeClock(startTime)),
    ends_at: dateWithTime(normalizedEndYear, endToken.month, endToken.day, normalizeClock(endTime, '18:00:00'))
  };
}

function parseMdyDateRangeWithTimes(dateText = '', startTime = '', endTime = '') {
  const normalized = String(dateText || '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const dateTokens = [...normalized.matchAll(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/g)]
    .map((match) => {
      const month = Number(match[1]);
      const day = Number(match[2]);
      if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
      return {
        day,
        month: month - 1,
        year: match[3] ? normalizeTwoDigitYear(match[3]) : null,
        index: match.index || 0
      };
    })
    .filter(Boolean);

  if (!dateTokens.length) return null;

  const completeDates = dateTokens.filter((item) => Number.isInteger(item.year));
  const yearHints = [...normalized.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  const fallbackYear = yearHints.length ? yearHints[0] : null;

  const candidateDates = completeDates.length
    ? completeDates
    : dateTokens.map((token) => ({
      ...token,
      year: Number.isInteger(token.year) ? token.year : (Number.isInteger(fallbackYear) ? fallbackYear : inferYear(token.month, token.day))
    }));

  const startToken = candidateDates[0];
  const endToken = candidateDates[1] || candidateDates[0];
  const normalizedEndYear = Number.isInteger(endToken.year) ? endToken.year : (
    endToken.month < startToken.month || endToken.day < startToken.day ? (startToken.year + 1) : startToken.year
  );

  return {
    starts_at: dateWithTime(startToken.year, startToken.month, startToken.day, normalizeClock(startTime)),
    ends_at: dateWithTime(normalizedEndYear, endToken.month, endToken.day, normalizeClock(endTime, '18:00:00'))
  };
}

function parseYmdDateRange(dateText = '', startTime = '09:00:00', endTime = '18:00:00') {
  const normalized = String(dateText || '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const dates = [...normalized.matchAll(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/g)];
  if (!dates.length) return null;
  const start = dates[0];
  const end = dates[1] || dates[0];
  return {
    starts_at: dateWithTime(Number(start[1]), Number(start[2]) - 1, Number(start[3]), normalizeClock(startTime)),
    ends_at: dateWithTime(Number(end[1]), Number(end[2]) - 1, Number(end[3]), normalizeClock(endTime, '18:00:00'))
  };
}

function parseArabicMonthDateTime(value = '', fallbackEndHours = 2) {
  const text = stripTags(value).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/\s+/g, ' ').trim();
  const match = text.match(/([A-Za-z\u0600-\u06ff]+)\s+(\d{1,2})\s+(\d{4})(?:\s*,?\s*(\d{1,2}:\d{1,2}))?/);
  if (!match) return null;
  const month = monthIndex(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isInteger(month) || !day || !year) return null;
  const startsAt = dateWithTime(year, month, day, normalizeClock(match[4] || '16:30:00'));
  return {
    starts_at: startsAt,
    ends_at: addHoursToSaudiDateTime(startsAt, fallbackEndHours)
  };
}

function parseEnglishMonthYearRange(value) {
  const text = stripTags(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const match = text.match(/([A-Za-z]{3,9})\s+(\d{4})\s*-\s*([A-Za-z]{3,9})\s+(\d{4})/);
  if (!match) return null;
  const startMonth = monthIndex(match[1]);
  const endMonth = monthIndex(match[3]);
  const startYear = Number(match[2]);
  const endYear = Number(match[4]);
  if (!Number.isInteger(startMonth) || !Number.isInteger(endMonth) || !startYear || !endYear) return null;
  return {
    starts_at: dateWithTime(startYear, startMonth, 1),
    ends_at: dateWithTime(endYear, endMonth + 1, 0, '18:00:00')
  };
}

function parseEnglishProgramDateRange(value) {
  const text = stripTags(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  let match = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (match) {
    const startDay = Number(match[1]);
    const startMonth = monthIndex(match[2]);
    const startYear = Number(match[3]);
    const endDay = Number(match[4]);
    const endMonth = monthIndex(match[5]);
    const endYear = Number(match[6]);
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      return {
        starts_at: dateWithTime(startYear, startMonth, startDay),
        ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
      };
    }
  }
  return parseEnglishDateRange(text);
}

function parseCodeNumericDateRange(value = '') {
  const text = stripTags(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const match = text.match(/(\d{1,2})-(\d{1,2})-(20\d{2})\s*(?:-|to)\s*(\d{1,2})-(\d{1,2})-(20\d{2})/i);
  if (!match) return null;
  const startDay = Number(match[1]);
  const startMonth = Number(match[2]) - 1;
  const startYear = Number(match[3]);
  const endDay = Number(match[4]);
  const endMonth = Number(match[5]) - 1;
  const endYear = Number(match[6]);
  if (![startDay, startMonth, startYear, endDay, endMonth, endYear].every(Number.isFinite)) return null;
  return {
    starts_at: dateWithTime(startYear, startMonth, startDay),
    ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
  };
}

function datesFromCodeProgramText(value = '') {
  const text = stripTags(value)
    .replace(/&amp;/g, '&')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const ranges = [];
  const pushRange = (dates) => {
    if (dates?.starts_at && dates?.ends_at) ranges.push(dates);
  };

  for (const match of text.matchAll(/\d{1,2}-\d{1,2}-20\d{2}\s*(?:-|to)\s*\d{1,2}-\d{1,2}-20\d{2}/gi)) {
    pushRange(parseCodeNumericDateRange(match[0]));
  }
  for (const match of text.matchAll(/\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}\s*-\s*\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}/gi)) {
    pushRange(parseEnglishDateRange(match[0]));
  }
  for (const match of text.matchAll(/[A-Za-z]{3,9}\s+20\d{2}\s*-\s*[A-Za-z]{3,9}\s+20\d{2}/gi)) {
    pushRange(parseEnglishMonthYearRange(match[0]));
  }
  for (const match of text.matchAll(/\d{1,2}\s+[A-Za-z]{3,9}\s*-\s*\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}/gi)) {
    pushRange(parseEnglishDateRange(match[0]));
  }

  if (!ranges.length) {
    const singles = new Map();
    const singlePatterns = [
      /\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}/gi,
      /[A-Za-z]{3,9}\s+\d{1,2},?\s+20\d{2}/gi,
      /\d{1,2}\/\d{1,2}\/20\d{2}/g
    ];
    for (const pattern of singlePatterns) {
      for (const match of text.matchAll(pattern)) {
        const parsed = parseEnglishDateRange(match[0]);
        if (parsed?.starts_at) singles.set(parsed.starts_at, parsed);
      }
    }
    ranges.push(...singles.values());
  }

  if (!ranges.length) return null;
  const startEntry = ranges
    .map((dates) => ({ value: dates.starts_at, ms: new Date(dates.starts_at).getTime() }))
    .filter((entry) => Number.isFinite(entry.ms))
    .sort((a, b) => a.ms - b.ms)[0];
  const endEntry = ranges
    .map((dates) => ({ value: dates.ends_at || dates.starts_at, ms: new Date(dates.ends_at || dates.starts_at).getTime() }))
    .filter((entry) => Number.isFinite(entry.ms))
    .sort((a, b) => b.ms - a.ms)[0];
  if (!startEntry || !endEntry) return null;
  return {
    starts_at: startEntry.value,
    ends_at: endEntry.value
  };
}

function codeProgramCity(text = '') {
  const value = stripTags(text);
  const hasRiyadh = /Riyadh|الرياض/i.test(value);
  const hasJeddah = /Jeddah|جدة/i.test(value);
  const hasOnline = /remote|online|virtual|عن بعد/i.test(value);
  if (hasOnline && !hasRiyadh && !hasJeddah) return 'Online';
  if (hasRiyadh && hasJeddah) return 'Saudi Arabia';
  if (hasJeddah) return 'Jeddah';
  if (hasRiyadh) return 'Riyadh';
  return 'Riyadh';
}

function codeProgramCategory(title = '', fallback = '') {
  const text = `${title} ${fallback}`.toLowerCase();
  if (/game|gaming|esports/.test(text)) return 'gaming program';
  if (/ai|artificial intelligence|data/.test(text)) return 'AI entrepreneurship';
  if (/incubator|incubation/.test(text)) return 'incubator';
  if (/bootcamp|challenge|champion/.test(text)) return 'technology bootcamp';
  return fallback || 'technology program';
}

function resolveMocUrl(value = '', sourceUrl = 'https://www.moc.gov.sa/en/Modules/Pages/Cultural-Calendar') {
  const raw = decodeHtml(value || '').trim();
  if (!raw) return sourceUrl;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return resolveUrl(raw, sourceUrl);
  return resolveUrl(`/en/${raw.replace(/^\/+/, '')}`, 'https://www.moc.gov.sa/');
}

function isMocPlaceholderTitle(title = '') {
  return !stripTags(title)
    || /^events?$/i.test(stripTags(title))
    || /^hi$/i.test(stripTags(title))
    || /^test$/i.test(stripTags(title));
}

function mocCategory(event = {}, durationDays = 0) {
  const category = stripTags(event.categoryName || '').trim();
  if (/initiative/i.test(category) || durationDays > 45) return 'cultural initiative';
  if (/event/i.test(category)) return 'cultural event';
  return category || 'culture';
}

function mocPublicationGate(durationDays = 0, sourceGate = 'human-review') {
  if (durationDays > 45) return 'source-evidence';
  return sourceGate === 'duplicate-review' ? 'duplicate-review' : 'human-review';
}

function codeListingBlocksFromHtml(html = '') {
  return String(html || '').split(/<div class="[^"]*\bmain-item-program\b[^"]*\bProgram\b[^"]*">/).slice(1);
}

function latestCodeListingSnapshot() {
  const roots = [
    snapshotDir,
    path.join(root, 'data', 'raw', 'browser-probes')
  ];
  const files = roots.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((name) => /^code-mcit-programs-.*\.html$/i.test(name))
      .map((name) => path.join(dir, name));
  }).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const file of files) {
    try {
      const html = fs.readFileSync(file, 'utf8');
      if (codeListingBlocksFromHtml(html).length) return { html, file };
    } catch {
      // Ignore unreadable snapshots; they are optional resilience inputs.
    }
  }
  return null;
}

function parseOrdinalEnglishDateRange(value, defaultYear = now.getFullYear()) {
  let text = stripTags(value)
    .replace(/(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/\b20\d{2}\b/.test(text)) text = `${text} ${defaultYear}`;
  return parseEnglishDateRange(text, defaultYear);
}

function extractMiskProgramDateText(html) {
  const match = html.match(/Program Start\/End Date<\/b><\/span><\/div>\s*<div[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i);
  return stripTags(match?.[1] || '');
}

function parseClockTime(value, fallback = '09:00:00') {
  const match = stripTags(value).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return fallback;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = String(match[3] || '').toLowerCase();
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return fallback;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function applyTimeRangeToDates(dates, timeText = '') {
  if (!dates) return null;
  const [startText, endText] = stripTags(timeText).split(/\s*-\s*/);
  const startTime = parseClockTime(startText, '09:00:00');
  const endTime = parseClockTime(endText, '18:00:00');
  return {
    starts_at: `${dates.starts_at.slice(0, 10)}T${startTime}+03:00`,
    ends_at: `${dates.ends_at.slice(0, 10)}T${endTime}+03:00`
  };
}

function parseMiskDeadlineDate(value) {
  const match = stripTags(value).match(/Applications closing on\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})/i);
  if (!match) return null;
  const day = Number(match[1]);
  const month = monthIndex(match[2]);
  if (!day || !Number.isInteger(month)) return null;
  const year = inferYear(month, day);
  return {
    starts_at: dateWithTime(year, month, day, '09:00:00'),
    ends_at: dateWithTime(year, month, day, '23:59:00')
  };
}

function parseEnglishDateRange(value, defaultYear = now.getFullYear()) {
  const text = stripTags(value).replace(/[–—]/g, '-').replace(/,/g, ' ,').replace(/\s+/g, ' ').trim();
  const flexible = parseFlexibleDateRange(text, {
    now: new Date(`${String(defaultYear).padStart(4, '0')}-07-01T00:00:00+03:00`)
  });
  if (flexible?.starts_at && flexible?.ends_at) {
    return {
      starts_at: flexible.starts_at,
      ends_at: flexible.ends_at
    };
  }
  let slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const startMonth = Number(slashMatch[1]) - 1;
    const startDay = Number(slashMatch[2]);
    const startYear = Number(slashMatch[3]);
    const endMonth = Number(slashMatch[4]) - 1;
    const endDay = Number(slashMatch[5]);
    const endYear = Number(slashMatch[6]);
    return {
      starts_at: dateWithTime(startYear, startMonth, startDay),
      ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
    };
  }

  slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    return {
      starts_at: dateWithTime(year, month, day),
      ends_at: dateWithTime(year, month, day, '18:00:00')
    };
  }

  let match = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (match) {
    const startDay = Number(match[1]);
    const startMonth = monthIndex(match[2]);
    const startYear = Number(match[3]);
    const endDay = Number(match[4]);
    const endMonth = monthIndex(match[5]);
    const endYear = Number(match[6]);
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      return {
        starts_at: dateWithTime(startYear, startMonth, startDay),
        ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
      };
    }
  }

  match = text.match(/(?:[A-Za-z]{3}\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s*-\s*(?:[A-Za-z]{3}\s+)?(\d{1,2})\s+([A-Za-z]{3,9})(?:\s*,?\s*(\d{4}))?/);
  if (match) {
    const startDay = Number(match[1]);
    const startMonth = monthIndex(match[2]);
    const endDay = Number(match[3]);
    const endMonth = monthIndex(match[4]);
    const year = Number(match[5]) || inferYear(startMonth, startDay) || defaultYear;
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      const endYear = endMonth < startMonth ? year + 1 : year;
      return {
        starts_at: dateWithTime(year, startMonth, startDay),
        ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
      };
    }
  }

  match = text.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s*,?\s*(\d{4})/);
  if (match) {
    const startDay = Number(match[1]);
    const endDay = Number(match[2]);
    const month = monthIndex(match[3]);
    const year = Number(match[4]);
    if (Number.isInteger(month)) {
      return {
        starts_at: dateWithTime(year, month, startDay),
        ends_at: dateWithTime(year, month, endDay, '18:00:00')
      };
    }
  }

  match = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s*,?\s*(\d{4})/);
  if (match) {
    const day = Number(match[1]);
    const month = monthIndex(match[2]);
    const year = Number(match[3]);
    if (Number.isInteger(month)) {
      return {
        starts_at: dateWithTime(year, month, day),
        ends_at: dateWithTime(year, month, day, '18:00:00')
      };
    }
  }

  return null;
}

function parseAlulaDateRange(value, fallbackYear = now.getFullYear()) {
  const text = stripTags(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  let match = text.match(/(?:^|\D)(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?\s+to\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})(?:\D|$)/i);
  if (match) {
    const startDay = Number(match[1]);
    const startMonth = monthIndex(match[2]);
    const endDay = Number(match[4]);
    const endMonth = monthIndex(match[5]);
    const endYear = Number(match[6]);
    const startYear = Number(match[3]) || (startMonth > endMonth ? endYear - 1 : endYear);
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      return {
        starts_at: dateWithTime(startYear, startMonth, startDay),
        ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
      };
    }
  }
  match = text.match(/(?:^|\D)(\d{1,2})\s+(?:and|to)\s+(\d{1,2})\s+([A-Za-z]{3,9})\s*,?\s*(\d{4})(?:\D|$)/i);
  if (match) {
    const startDay = Number(match[1]);
    const endDay = Number(match[2]);
    const month = monthIndex(match[3]);
    const year = Number(match[4]);
    if (Number.isInteger(month)) {
      return {
        starts_at: dateWithTime(year, month, startDay),
        ends_at: dateWithTime(year, month, endDay, '18:00:00')
      };
    }
  }
  match = text.match(/(?:^|\s)(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})(?:\s|$)/i);
  if (match) {
    const day = Number(match[1]);
    const month = monthIndex(match[2]);
    const year = Number(match[3]) || fallbackYear;
    if (Number.isInteger(month)) {
      return {
        starts_at: dateWithTime(year, month, day),
        ends_at: dateWithTime(year, month, day, '18:00:00')
      };
    }
  }
  match = text.match(/(?:^|\D)(\d{1,2})\s+([A-Za-z]{3,9})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})(?:\D|$)/i);
  if (match) {
    const startDay = Number(match[1]);
    const startMonth = monthIndex(match[2]);
    const endDay = Number(match[3]);
    const endMonth = monthIndex(match[4]);
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      return {
        starts_at: dateWithTime(fallbackYear, startMonth, startDay),
        ends_at: dateWithTime(endMonth < startMonth ? fallbackYear + 1 : fallbackYear, endMonth, endDay, '18:00:00')
      };
    }
  }
  return parseEnglishDateRange(text);
}

function schemaDateToSaudiDateTime(value, fallbackTime = '09:00:00') {
  const text = String(value || '').trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T${fallbackTime}+03:00`;
  const withTime = text.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?(?:\.\d{1,6})?([+-]\d{2}:\d{2}|Z)?/);
  if (!withTime) return '';
  const seconds = withTime[3] || '00';
  const zone = withTime[4] || '+03:00';
  const date = new Date(`${withTime[1]}T${withTime[2]}:${seconds}${zone}`);
  if (Number.isNaN(date.getTime())) return '';
  const saudi = new Date(date.getTime() + 3 * 3600 * 1000);
  return `${saudi.getUTCFullYear()}-${String(saudi.getUTCMonth() + 1).padStart(2, '0')}-${String(saudi.getUTCDate()).padStart(2, '0')}T${String(saudi.getUTCHours()).padStart(2, '0')}:${String(saudi.getUTCMinutes()).padStart(2, '0')}:${String(saudi.getUTCSeconds()).padStart(2, '0')}+03:00`;
}

function parseStructuredDateRange(startDate, endDate) {
  const startsAt = schemaDateToSaudiDateTime(startDate, '09:00:00');
  const endsAt = schemaDateToSaudiDateTime(endDate || startDate, '18:00:00');
  if (!startsAt || !endsAt) return null;
  return {
    starts_at: startsAt,
    ends_at: endsAt
  };
}

function parseGoogleCalendarDate(value, fallbackTime = '09:00:00') {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!match) return '';
  const time = match[4]
    ? `${match[4]}:${match[5] || '00'}:${match[6] || '00'}`
    : fallbackTime;
  return `${match[1]}-${match[2]}-${match[3]}T${time}+03:00`;
}

function parseGoogleCalendarDateRange(value) {
  const [start, end] = String(value || '').split('/');
  const startsAt = parseGoogleCalendarDate(start, '09:00:00');
  const endsAt = parseGoogleCalendarDate(end || start, '18:00:00');
  if (!startsAt || !endsAt) return null;
  return {
    starts_at: startsAt,
    ends_at: endsAt
  };
}

function parseDhahranDateRange(value, year = now.getFullYear()) {
  const text = stripTags(value)
    .replace(/[–—]/g, '-')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let match = text.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})$/i);
  if (match) {
    const startDay = Number(match[1]);
    const endDay = Number(match[2]);
    const month = monthIndex(match[3]);
    if (Number.isInteger(month)) {
      return {
        starts_at: dateWithTime(year, month, startDay),
        ends_at: dateWithTime(year, month, endDay, '18:00:00')
      };
    }
  }

  match = text.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})$/i);
  if (match) {
    const startDay = Number(match[1]);
    const startMonth = monthIndex(match[2]);
    const endDay = Number(match[3]);
    const endMonth = monthIndex(match[4]);
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      return {
        starts_at: dateWithTime(year, startMonth, startDay),
        ends_at: dateWithTime(endMonth < startMonth ? year + 1 : year, endMonth, endDay, '18:00:00')
      };
    }
  }

  match = text.match(/^(\d{1,2})\s+([A-Za-z]{3,9})$/i);
  if (match) {
    const day = Number(match[1]);
    const month = monthIndex(match[2]);
    if (Number.isInteger(month)) {
      return {
        starts_at: dateWithTime(year, month, day),
        ends_at: dateWithTime(year, month, day, '18:00:00')
      };
    }
  }
  return null;
}

function parseJcciDate(value) {
  const text = stripTags(value).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).trim();
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s*[-–—]\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4}))?$/);
  if (!match) return null;
  const startMonth = Number(match[1]) - 1;
  const startDay = Number(match[2]);
  const startYear = normalizeTwoDigitYear(match[3]);
  const endMonth = Number(match[4] || match[1]) - 1;
  const endDay = Number(match[5] || match[2]);
  const endYear = normalizeTwoDigitYear(match[6] || match[3]);
  if (![startMonth, startDay, startYear, endMonth, endDay, endYear].every(Number.isFinite)) return null;
  return {
    starts_at: dateWithTime(startYear, startMonth, startDay),
    ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
  };
}

function normalizeTwoDigitYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) return NaN;
  return year < 100 ? 2000 + year : year;
}

function parseNextData(html) {
  const raw = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!raw) return null;
  try {
    return JSON.parse(decodeHtml(raw));
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

function fieldValue(fields, key) {
  const value = fields?.[key];
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value;
}

function linkValue(value, baseUrl) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const href = value.href || value.url || value.link || '';
  return href ? resolveUrl(href, baseUrl) : '';
}

function walkObjects(value, visit) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, visit);
    return;
  }
  visit(value);
  for (const child of Object.values(value)) walkObjects(child, visit);
}

function sitecoreTitle(fields, fallback = '') {
  return stripTags(
    fieldValue(fields, 'Title')
    || fieldValue(fields, 'title')
    || fieldValue(fields, 'NavigationTitle')
    || fallback
  );
}

function sitecoreDescription(fields) {
  return stripTags(
    fieldValue(fields, 'Description')
    || fieldValue(fields, 'description')
    || fieldValue(fields, 'NavigationDescription')
    || ''
  );
}

function sitecoreCity(fields, fallback = 'Saudi Arabia') {
  const city = fieldValue(fields, 'City');
  if (city?.fields?.Title?.value) return normalizeSaudiCity(city.fields.Title.value, fallback);
  if (city?.displayName || city?.name) return normalizeSaudiCity(city.displayName || city.name, fallback);
  return fallback;
}

function extractSitecoreEventItemsFromNextData(html, source, category = source.categories?.[0] || 'event') {
  const data = parseNextData(html);
  if (!data) return [];
  const items = [];
  const seen = new Set();
  walkObjects(data, (node) => {
    const fields = node.fields || {};
    const title = sitecoreTitle(fields, node.displayName || node.name || '');
    const rawDate = fieldValue(fields, 'Date')
      || fieldValue(fields, 'StartDate')
      || fieldValue(fields, 'Start Date')
      || fieldValue(fields, 'EventDate')
      || fieldValue(fields, 'Event Date');
    const endDate = fieldValue(fields, 'EndDate')
      || fieldValue(fields, 'End Date')
      || rawDate;
    const dates = parseStructuredDateRange(rawDate, endDate);
    if (!title || !dates) return;
    const nodeUrl = node.url ? resolveUrl(node.url, source.url) : '';
    const ctaUrl = linkValue(fieldValue(fields, 'CTA'), source.url)
      || linkValue(fieldValue(fields, 'TicketLink'), source.url)
      || linkValue(fieldValue(fields, 'Link'), source.url);
    const url = ctaUrl || nodeUrl || source.url;
    const key = `${title}|${dates.starts_at}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      title,
      url,
      summary: sitecoreDescription(fields) || `فعالية رسمية من ${source.name}.`,
      city: sitecoreCity(fields, source.cities?.[0] || 'Saudi Arabia'),
      venue: sitecoreCity(fields, source.cities?.[0] || 'Saudi Arabia'),
      category,
      raw_date_text: [rawDate, endDate].filter(Boolean).join(' - '),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: source.candidate_gate === 'duplicate-review' ? 'duplicate-review' : 'human-review',
      ...dates
    });
  });
  return items;
}

function extractJsonLdObjects(html) {
  const objects = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeHtml(match[1])
      .replace(/<script[^>]*>/gi, '')
      .replace(/<\/script>/gi, '')
      .trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) continue;
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      objects.push(parsed);
      if (Array.isArray(parsed['@graph'])) objects.push(...parsed['@graph']);
    } catch {
      // Keep collection resilient when a source emits malformed structured data.
    }
  }
  return objects;
}

function structuredEventFromHtml(html) {
  return extractJsonLdObjects(html).find((item) => {
    const type = Array.isArray(item?.['@type']) ? item['@type'].join(' ') : String(item?.['@type'] || '');
    return /Event/i.test(type) && item.startDate;
  });
}

function schemaText(value = '') {
  if (typeof value === 'string' || typeof value === 'number') return stripTags(value);
  if (!value || typeof value !== 'object') return '';
  return stripTags(value.name || value.value || value.url || '');
}

function informaSaudiSitemapUrls(xml = '') {
  return [...new Set([...String(xml).matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => decodeHtml(match[1]).trim())
    .filter(Boolean)
    .filter((value) => {
      try {
        const url = new URL(value);
        return /(^|\.)informaconnect\.com$/i.test(url.hostname)
          && /\/sitemap\.xml$/i.test(url.pathname)
          && /(?:saudi|riyadh|jeddah)/i.test(url.pathname)
          && !/(?:visa|invitation|form)/i.test(url.pathname);
      } catch {
        return false;
      }
    }))].slice(0, 40);
}

function informaRootUrl(sitemapUrl = '') {
  try {
    const url = new URL(sitemapUrl);
    url.pathname = url.pathname.replace(/sitemap\.xml$/i, '');
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function informaScheduleDateTime(dateValue = '', timeValue = '', fallbackTime = '09:00:00') {
  const date = String(dateValue || '').trim();
  const time = String(timeValue || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && time) {
    return `${date}T${time[1].padStart(2, '0')}:${time[2]}:${time[3] || '00'}+03:00`;
  }
  return schemaDateToSaudiDateTime(date, fallbackTime);
}

function informaBodyText(html = '') {
  return stripTags(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' '));
}

function informaCity(locality = '', html = '') {
  const normalized = normalizeSaudiCity(locality, 'Saudi Arabia');
  if (normalized !== 'Saudi Arabia') return normalized;
  const text = informaBodyText(html);
  const matches = [
    ['Riyadh', /\bRiyadh\b|الرياض/i],
    ['Jeddah', /\bJeddah\b|جدة/i],
    ['Dammam', /\bDammam\b|الدمام/i],
    ['Al Khobar', /\b(?:Al )?Khobar\b|الخبر/i],
    ['Dhahran', /\bDhahran\b|الظهران/i],
    ['Madinah', /\b(?:Madinah|Medina)\b|المدينة/i],
    ['Makkah', /\b(?:Makkah|Mecca)\b|مكة/i],
    ['AlUla', /\b(?:AlUla|Al-Ula)\b|العلا/i],
    ['Abha', /\bAbha\b|أبها/i]
  ].filter(([, pattern]) => pattern.test(text));
  return matches.length === 1 ? matches[0][0] : normalized;
}

function informaCategory(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  if (/expo|exhibition|show|معرض/.test(text)) return 'exhibition';
  if (/summit|congress|conference|forum|investment|week|قمة|مؤتمر|منتدى/.test(text)) return 'conference';
  if (/course|training|workshop|دورة|تدريب|ورشة/.test(text)) return 'training';
  return 'business event';
}

function informaSchemaImage(image = '') {
  const first = Array.isArray(image) ? image[0] : image;
  return schemaText(first?.url || first?.contentUrl || first);
}

function extractInformaEventFromHtml(html = '', source = {}, pageUrl = source.url) {
  if (!pageUrl || /(?:visa|invitation|form)/i.test(new URL(pageUrl).pathname)) return null;
  const event = extractJsonLdObjects(html).find((item) => {
    const type = Array.isArray(item?.['@type']) ? item['@type'].join(' ') : String(item?.['@type'] || '');
    return /(^|\s)Event($|\s)/i.test(type) && item.startDate && item.endDate;
  });
  if (!event || /EventCancelled/i.test(String(event.eventStatus || ''))) return null;

  const schedule = Array.isArray(event.eventSchedule) ? event.eventSchedule[0] : event.eventSchedule || {};
  const startsAt = informaScheduleDateTime(event.startDate, schedule.startTime, '09:00:00');
  const endsAt = informaScheduleDateTime(event.endDate, schedule.endTime, '18:00:00');
  if (!startsAt || !endsAt || Date.parse(endsAt) < Date.parse(startsAt)) return null;

  const location = Array.isArray(event.location) ? event.location[0] : event.location || {};
  const address = typeof location.address === 'object' ? location.address : {};
  const locality = schemaText(address.addressLocality || location.addressLocality || '');
  const country = schemaText(address.addressCountry || location.addressCountry || '');
  const bodyText = informaBodyText(html);
  const structuredLocation = `${schemaText(location.name)} ${schemaText(address.streetAddress)} ${locality} ${country}`.trim();
  if (structuredLocation ? !hasSaudiRelevance(structuredLocation) : !/saudi|السعود/i.test(bodyText)) return null;

  const title = schemaText(event.name);
  if (!title) return null;
  const description = schemaText(event.description) || `Official event from ${source.name}.`;
  const city = informaCity(locality, html);
  const venue = schemaText(location.name || address.streetAddress) || city;
  const url = resolveUrl(schemaText(event.url) || pageUrl, pageUrl);
  const imageUrl = informaSchemaImage(event.image);
  const organizer = schemaText(event.organizer) || source.owner;
  const details = detailEnrichmentFromHtml(html, pageUrl, title);
  const attendanceMode = /OnlineEventAttendanceMode/i.test(String(event.eventAttendanceMode || ''))
    ? 'online'
    : /MixedEventAttendanceMode/i.test(String(event.eventAttendanceMode || ''))
      ? 'hybrid'
      : 'in-person';
  const item = {
    title,
    preserve_full_title: true,
    url,
    organizer,
    summary: description,
    rich_summary: description,
    city,
    venue,
    category: informaCategory(title, description),
    raw_date_text: `${event.startDate} - ${event.endDate}`,
    starts_at: startsAt,
    ends_at: endsAt,
    attendance_mode: attendanceMode,
    language: schemaText(event.inLanguage) || details.language || 'en',
    confidence: 'official',
    review_status: 'ready-for-review',
    publication_gate: 'duplicate-review',
    verification_method: 'official-informa-portfolio-json-ld',
    date_precision: 'explicit-range',
    time_precision: schedule.startTime && schedule.endTime ? 'exact' : 'day-range',
    tags: ['Informa Connect', 'Saudi Arabia', informaCategory(title, description)],
    ...details,
    ...(imageUrl ? {
      image_url: imageUrl,
      image_alt: title,
      image_source_url: pageUrl
    } : {})
  };
  return {
    ...item,
    richness_score: calculateRichnessScore(item)
  };
}

function informaItemQuality(item = {}) {
  return [
    item.city && item.city !== 'Saudi Arabia' ? 3 : 0,
    /\/ar\/?$/i.test(item.url || '') ? 2 : 0,
    item.registration_url ? 1 : 0,
    item.image_url ? 1 : 0,
    item.time_precision === 'exact' ? 1 : 0
  ].reduce((sum, value) => sum + value, 0);
}

function dedupeInformaItems(items = []) {
  const rows = new Map();
  for (const item of items.filter(Boolean)) {
    const key = [
      normalizeCandidateKeyValue(item.title),
      String(item.starts_at || '').slice(0, 10),
      String(item.ends_at || '').slice(0, 10)
    ].join('|');
    const previous = rows.get(key);
    if (!previous || informaItemQuality(item) > informaItemQuality(previous)) rows.set(key, item);
  }
  return [...rows.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title));
}

async function extractInformaSaudiPortfolio(indexXml, source, options = {}) {
  const fetchPage = options.fetchPage || ((url) => fetchText(url));
  const snapshotWriter = options.writeSnapshot === false
    ? null
    : options.writeSnapshot || ((label, content) => writeAuxiliarySnapshot(source, label, content));
  const sitemapUrls = informaSaudiSitemapUrls(indexXml);
  const pages = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(5, sitemapUrls.length) }, async () => {
    while (cursor < sitemapUrls.length) {
      const sitemapUrl = sitemapUrls[cursor];
      cursor += 1;
      const pageUrl = informaRootUrl(sitemapUrl);
      if (!pageUrl) continue;
      try {
        const html = await fetchPage(pageUrl);
        const item = extractInformaEventFromHtml(html, source, pageUrl);
        if (!item) continue;
        if (snapshotWriter) item.raw_snapshot_path = snapshotWriter(item.title, html);
        pages.push(item);
      } catch {
        // A single retired portfolio site must not fail the entire official source.
      }
    }
  });
  await Promise.all(workers);
  return dedupeInformaItems(pages);
}

function sourceTypeFor(source) {
  if (source.source_type === 'government-calendar') return 'government-calendar';
  if (source.source_type === 'ticketing-marketplace') return 'ticketing-page';
  if (source.source_type === 'organizer-calendar') return 'official-site';
  if (source.source_type === 'conference-organizer') return 'official-site';
  if (source.source_type === 'destination-calendar') return 'official-site';
  if (source.source_type === 'venue-calendar') return 'official-site';
  if (source.source_type === 'national-calendar') return 'government-calendar';
  return 'manual-lead';
}

function confidenceFor(source) {
  if (['official', 'venue-official'].includes(source.trust_level)) return 'official';
  if (['official-marketplace', 'partner'].includes(source.trust_level)) return 'partner';
  if (source.trust_level === 'community') return 'unverified';
  return 'public-listing';
}

function discoveryMethodFor(source) {
  if (['official', 'venue-official'].includes(source.trust_level)) return 'official-calendar';
  if (source.trust_level === 'official-marketplace') return 'search-result';
  return 'search-result';
}

function reviewStatusFor(source) {
  if (source.candidate_gate === 'source-evidence') return 'new';
  if (source.candidate_gate === 'extraction') return 'extraction-needed';
  if (source.trust_level === 'aggregator') return 'evidence-captured';
  return 'ready-for-review';
}

function baseCandidate(source, item, snapshotPath) {
  const datePart = String(item.starts_at || '').slice(0, 10).replace(/-/g, '');
  const sourcePart = crypto.createHash('sha1').update(item.url || source.url).digest('hex').slice(0, 8);
  const id = `candidate-${source.id}-${toSlug(item.title)}-${datePart}-${sourcePart}`;
  const candidate = {
    id,
    title: item.preserve_full_title ? stripTags(item.title).trim() : cleanTitle(item.title),
    organizer: item.organizer || source.owner,
    city: item.city || source.cities?.[0] || 'Saudi Arabia',
    venue: item.venue || item.city || source.cities?.[0] || 'Saudi Arabia',
    category: item.category || source.categories?.[0] || 'فعاليات',
    summary: item.summary || `مرشح مستخرج من ${source.name}. يحتاج مراجعة قبل نقله إلى الكتالوج العام.`,
    starts_at: item.starts_at,
    ends_at: item.ends_at,
    source_type: sourceTypeFor(source),
    source_url: item.url || source.url,
    source_label: source.name,
    source_owner: source.owner,
    evidence_url: item.url || source.url,
    raw_snapshot_path: item.raw_snapshot_path || snapshotPath,
    discovered_at: collectedAt,
    discovery_method: discoveryMethodFor(source),
    confidence: item.confidence || confidenceFor(source),
    review_status: item.review_status || reviewStatusFor(source),
    publication_gate: item.publication_gate || source.candidate_gate || 'human-review',
    ...richFieldsFromItem({
      ...item,
      richness_score: item.richness_score || calculateRichnessScore(item)
    }),
    ...(item.discovery_quality ? { discovery_quality: item.discovery_quality } : {}),
    ...(Number.isInteger(item.discovery_score) ? { discovery_score: item.discovery_score } : {}),
    ...(item.discovery_notes ? { discovery_notes: item.discovery_notes } : {}),
    ...(item.verification_method ? { verification_method: item.verification_method } : {}),
    ...(item.date_precision ? { date_precision: item.date_precision } : {}),
    ...(item.time_precision ? { time_precision: item.time_precision } : {}),
    ...(Array.isArray(item.sessions) && item.sessions.length ? { sessions: item.sessions } : {}),
    extracted_sessions_count: Array.isArray(item.sessions) ? item.sessions.length : 0,
    reviewer_notes: `تم جمعه آلياً من ${source.name}. ${source.evidence_required}`,
    tags: [...new Set([...(source.categories || []), item.category, ...(Array.isArray(item.tags) ? item.tags : [])].filter(Boolean))].slice(0, 10)
  };
  return {
    ...candidate,
    audiences: classifyAudiences(candidate)
  };
}

function baseEndedEventRecord(source, item, snapshotPath) {
  const candidate = baseCandidate(source, {
    ...item,
    confidence: item.confidence || confidenceFor(source),
    review_status: item.review_status || 'evidence-captured',
    publication_gate: item.publication_gate || 'source-evidence'
  }, snapshotPath);
  const year = String(candidate.starts_at || '').slice(0, 4);
  return {
    ...candidate,
    id: candidate.id.replace(/^candidate-/, 'ended-'),
    ended_event_status: 'ended-before-latest-collection',
    collected_for: 'normal-ended-event-catalog',
    collected_at: collectedAt,
    historical_year: /^\d{4}$/.test(year) ? year : '',
    reviewer_notes: `تم حفظه آلياً كفعالية منتهية من ${source.name}. يعامل في المنصة مثل أي فعالية كانت موجودة ثم انتهت. ${source.evidence_required}`
  };
}

function cityFromVisitSaudiCard(card, source) {
  const text = [card.title, card.subTitle, card.cardCtaLink].filter(Boolean).join(' ').toLowerCase();
  const cityMatches = [
    ['Riyadh', ['riyadh']],
    ['Jeddah', ['jeddah']],
    ['AlUla', ['alula', 'al ula']],
    ['Aseer', ['aseer', 'abha']],
    ['Dammam', ['dammam']],
    ['Khobar', ['khobar']],
    ['Diriyah', ['diriyah']]
  ];
  return cityMatches.find(([, keys]) => keys.some((key) => text.includes(key)))?.[0]
    || source.cities?.[0]
    || 'Saudi Arabia';
}

function visitSaudiImageFromEvent(event) {
  const images = Array.isArray(event.bannerImages) ? event.bannerImages : [];
  const candidates = [];
  for (const image of images) {
    for (const key of ['s7fileReference', 'desktopImage', 'mobileImage', 's7mobileImageReference']) {
      const value = image?.[key];
      if (!value) continue;
      const url = resolveUrl(value, 'https://www.visitsaudi.com/');
      const highResUrl = /scene7\.com\/is\/image\//i.test(url)
        ? `${url.split('?')[0]}?wid=1400&hei=788&fit=constrain&fmt=webp`
        : url;
      if (isUsefulImageUrl(highResUrl)) candidates.push({ url: highResUrl, score: imageScore(highResUrl, key.startsWith('s7') ? 2400 : 900) });
    }
    for (const breakpoint of Array.isArray(image?.breakpoints) ? image.breakpoints : []) {
      candidates.push(...srcsetImages(breakpoint.srcset || '', 'https://www.visitsaudi.com/'));
    }
  }
  return candidates.sort((a, b) => b.score - a.score)[0]?.url || '';
}

function extractDataPropsJson(html, requiredText = '') {
  const props = [];
  const pattern = /data-props="([^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    if (requiredText && !match[1].includes(requiredText)) continue;
    try {
      props.push(JSON.parse(decodeHtml(match[1])));
    } catch {
      // Ignore non-JSON attributes; source pages often mix component metadata.
    }
  }
  return props;
}

function extractAssignedJson(html, marker) {
  const startIndex = html.indexOf(marker);
  if (startIndex < 0) return null;
  const objectStart = html.indexOf('{', startIndex);
  if (objectStart < 0) return null;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let index = objectStart; index < html.length; index += 1) {
    const char = html[index];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(html.slice(objectStart, index + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function extractVisitSaudi(html, source) {
  const apiItems = extractVisitSaudiApiEvents(html, source);
  if (apiItems.length) return apiItems;
  const items = [];
  const props = extractDataPropsJson(html, 'startDate');
  for (const prop of props) {
    const groupTitle = stripTags(prop.title || '');
    const cards = Array.isArray(prop.cards) ? prop.cards : [];
    for (const card of cards) {
      const dates = parseVisitSaudiDateRange(card);
      if (!dates || !card.title || !card.cardCtaLink) continue;
      items.push({
        title: card.title,
        url: resolveUrl(card.cardCtaLink, source.url),
        summary: card.subTitle || `مرشح من ${source.name}${groupTitle ? ` ضمن ${groupTitle}` : ''}.`,
        city: cityFromVisitSaudiCard(card, source),
        venue: cityFromVisitSaudiCard(card, source),
        category: groupTitle || 'tourism',
        ...dates
      });
    }
  }
  return items;
}

function extractVisitSaudiSeasons(html, source) {
  return extractVisitSaudiApiEvents(html, source)
    .filter((item) => /season|موسم|festival|fan zone|entertainment|tourism/i.test(`${item.title} ${item.summary} ${item.category}`));
}

function extractVisitSaudiSummerPdf(xml, source) {
  return parseVisitSaudiSummerPdfXml(xml, source);
}

function extractVisitSaudiApiEvents(payloadText, source) {
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return [];
  }
  const rows = Array.isArray(payload?.response?.data) ? payload.response.data : [];
  return rows
    .filter((event) => event?.title && event.startDate && event.endDate)
    .map((event) => {
      const city = event.destination?.title || cityFromSlugOrTitle(event.cityId, source.cities?.[0] || 'Saudi Arabia');
      const category = Array.isArray(event.categories) && event.categories.length
        ? event.categories.map((item) => item.title).filter(Boolean).slice(0, 2).join(' / ')
        : (event.season?.title || source.categories?.[0] || 'tourism');
      const startTime = event.dailyStartTime || event.timings?.[0]?.startTimeLabel || '09:00';
      const endTime = event.dailyEndTime || event.timings?.[0]?.endTimeLabel || '18:00';
      const imageUrl = visitSaudiImageFromEvent(event);
      return {
        title: event.title,
        url: event.pageLink?.url || event.ticketCTALink || source.url,
        organizer: source.owner,
        summary: stripTags(event.eventDescription || event.subtitle || event.season?.title || `فعالية من ${source.name}.`),
        city,
        venue: city,
        category,
        ...(imageUrl ? {
          image_url: imageUrl,
          image_alt: event.bannerImages?.[0]?.alt || event.title,
          image_source_url: event.pageLink?.url || source.url
        } : {}),
        starts_at: dateTimeFromParts(event.startDate, startTime),
        ends_at: dateTimeFromParts(event.endDate, endTime),
        confidence: 'official',
        review_status: 'ready-for-review',
        publication_gate: 'human-review',
        tags: [
          event.season?.title,
          event.seasonId,
          ...(Array.isArray(event.targetGroupTags) ? event.targetGroupTags : []),
          ...(Array.isArray(event.categories) ? event.categories.map((item) => item.title) : [])
        ].filter(Boolean)
      };
    })
    .filter((event) => event.starts_at && event.ends_at && event.url);
}

function investSaudiDateRange(event) {
  const startDate = event?.acf?.start_date || event?.date || '';
  const endDate = event?.acf?.end_date || startDate;
  return parseDmyDateRangeWithTimes([startDate, endDate].filter(Boolean).join(' - '));
}

function investSaudiCity(location = '') {
  const text = stripTags(location);
  if (/riyadh|الرياض/i.test(text)) return 'Riyadh';
  if (/jeddah|جدة/i.test(text)) return 'Jeddah';
  if (/dammam|الدمام/i.test(text)) return 'Dammam';
  if (/khobar|الخبر/i.test(text)) return 'Khobar';
  if (/makkah|mecca|مكة/i.test(text)) return 'Makkah';
  if (/madinah|medina|المدينة/i.test(text)) return 'Madinah';
  if (/saudi arabia|السعودية|المملكة/i.test(text)) return 'Saudi Arabia';
  return 'Global';
}

function investSaudiEventUrl(event, source) {
  const link = event?.acf?.link || event?.button?.href || '';
  if (!link || /coming-soon/i.test(link)) return source.url;
  return resolveUrl(link, source.url);
}

function extractInvestSaudiEvents(payloadText, source) {
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return [];
  }
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const seen = new Set();
  const items = [];
  for (const event of rows) {
    const title = stripTags(event?.title || '');
    const dates = investSaudiDateRange(event);
    if (!title || !dates) continue;
    const url = investSaudiEventUrl(event, source);
    const location = stripTags(event.location || '');
    const summary = stripTags(event.description || '');
    const category = Array.isArray(event.sectors) && event.sectors.length
      ? event.sectors.map((sector) => sector.name).filter(Boolean).slice(0, 2).join(' / ')
      : inferChamberCategory(title, summary);
    const imageUrl = event.image && (/investsaudi\.sa\/backend\/wp-content\/uploads\//i.test(event.image) || isUsefulImageUrl(event.image))
      ? event.image
      : '';
    const key = `${title}|${dates.starts_at}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: summary || `فعالية رسمية من Invest Saudi. الموقع: ${location}.`,
      city: investSaudiCity(location),
      venue: location || investSaudiCity(location),
      category,
      raw_date_text: [event?.acf?.start_date || event?.date, event?.acf?.end_date].filter(Boolean).join(' - '),
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      language: 'en',
      tags: ['investment', 'business', ...(Array.isArray(event.sectors) ? event.sectors.map((sector) => sector.name) : [])].filter(Boolean),
      ...dates
    });
  }
  return items;
}

function saudiSpaceAgencyCity(location = '') {
  const text = stripTags(location);
  if (/al[-\s]?uyaynah|العيينة|communication,\s*space\s*&\s*technology commission|cst headquarters/i.test(text)) return 'Riyadh';
  const local = normalizeSaudiCity(text, '');
  if (local) return local;
  if (/saudi arabia|ksa|kingdom of saudi arabia|السعودية|المملكة/i.test(text)) return 'Saudi Arabia';
  return text ? 'Global' : 'Saudi Arabia';
}

function saudiSpaceAgencyImageUrl(image = '') {
  const absolute = resolveUrl(image, 'https://ssa.gov.sa/');
  if (!absolute || !/^https?:\/\//i.test(absolute)) return '';
  return absolute
    .replace(/([?&])width=\d+/i, '$1width=1400')
    .replace(/([?&])height=\d+/i, '$1height=788');
}

function extractSaudiSpaceAgencyEvents(payloadText, source) {
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return [];
  }
  const rows = payload?.data?.searchResult?.items;
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const items = [];
  for (const event of rows) {
    const title = cleanTitle(event?.title || '');
    const startsAt = saudiDateTimeFromIso(event?.startDate);
    const endsAt = saudiDateTimeFromIso(event?.endDate) || addHoursToSaudiDateTime(startsAt, 3);
    const url = resolveUrl(event?.url || '', source.url);
    if (!title || !startsAt || !endsAt || !url) continue;
    const location = stripTags(event.location || '');
    const summary = stripTags(event.brief || event.description || '');
    const imageUrl = saudiSpaceAgencyImageUrl(event.image || firstUsefulImageFromHtml(event.description || '', source.url));
    const city = saudiSpaceAgencyCity(location);
    const key = `${title}|${startsAt}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: summary || `فعالية رسمية من وكالة الفضاء السعودية. الموقع: ${location || city}.`,
      city,
      venue: location || city,
      category: /training|program|competition|مسابقة/i.test(`${title} ${summary}`) ? 'space education' : 'space',
      raw_date_text: [event.startDate, event.endDate, location].filter(Boolean).join(' - '),
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      attendance_mode: city === 'Global' ? 'international' : 'in-person',
      language: 'en',
      confidence: 'official',
      review_status: city === 'Global' ? 'evidence-captured' : 'ready-for-review',
      publication_gate: city === 'Global' ? 'source-evidence' : 'human-review',
      tags: ['space', 'science', 'Saudi Space Agency', city].filter(Boolean),
      starts_at: startsAt,
      ends_at: endsAt
    });
  }
  return items;
}

async function extractMonshaat(html, source) {
  const items = [];
  const pattern = /<a\s+title="([^"]+)"\s+href="([^"]+)"\s+class="[^"]*event-card[^"]*"[\s\S]*?<div class="event-card-day[^"]*">([\s\S]*?)<\/div>\s*<div class="event-card-month">([\s\S]*?)<\/div>[\s\S]*?<p class="[^"]*event-card-desc[^"]*">([\s\S]*?)<\/p>[\s\S]*?<span class="event-card-location-txt">([\s\S]*?)<\/span>/g;
  for (const match of html.matchAll(pattern)) {
    const dates = parseMonshaatDate(match[3], match[4]);
    if (!dates) continue;
    const dateText = `${stripTags(match[3])} ${stripTags(match[4])}`.trim();
    items.push({
      title: match[1],
      url: resolveUrl(match[2], source.url),
      summary: stripTags(match[5]),
      city: normalizeSaudiCity(match[6], source.cities?.[0] || 'Saudi Arabia'),
      venue: stripTags(match[6]) || 'Monsha’at',
      category: 'entrepreneurship',
      raw_date_text: dateText,
      ...dates
    });
  }
  const apiItems = source.disable_internal_api ? [] : await extractMonshaatInternalEvents(source).catch(() => []);
  const seen = new Set();
  return [...items, ...apiItems].filter((item) => {
    const key = `${item.title}|${item.starts_at || ''}|${item.url || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function extractMonshaatInternalEvents(source) {
  const items = [];
  const seen = new Set();
  for (let offset = 0; offset < 6; offset += 1) {
    const monthKey = yyyymmAfter(offset);
    const apiUrl = `https://www.monshaat.gov.sa/ar/internal/content/events/list/${monthKey}`;
    const text = await fetchText(apiUrl, {
      accept: 'application/json',
      'accept-language': 'ar-SA,ar;q=0.9,en;q=0.8',
      referer: source.url
    });
    const rows = JSON.parse(text);
    if (!Array.isArray(rows) || !rows.length) continue;
    writeAuxiliarySnapshot(source, `monshaat-events-${monthKey}`, text, 'json');
    for (const row of rows) {
      const title = stripTags(row.title || '');
      const dates = dateFieldsFromIsoDates(row.field_start_date, row.field_end_date, '09:00:00', '18:00:00');
      if (!title || !dates) continue;
      const key = `${title}|${dates.starts_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const location = stripTags(row.field_location || '') || 'Monsha’at';
      items.push({
        title,
        url: resolveUrl(row.view_node || row.ics_file || source.url, source.url),
        organizer: source.owner,
        summary: stripTags(row.body || `فعالية رسمية من منشآت.`).slice(0, 500),
        city: normalizeSaudiCity(`${location} ${title}`, source.cities?.[0] || 'Saudi Arabia'),
        venue: location,
        category: stripTags(row.field_event_category || '') || 'entrepreneurship',
        raw_date_text: [row.field_start_date, row.field_end_date, row.field_event_time].filter(Boolean).join(' - '),
        confidence: 'official',
        review_status: 'ready-for-review',
        publication_gate: 'human-review',
        ...dates
      });
    }
  }
  return items;
}

function extractIthraEvents(html, source) {
  if (String(html || '').trim().startsWith('{')) {
    return extractIthraAlgoliaEvents(html, source);
  }
  const items = [];
  const seen = new Set();
  const blocks = [
    ...html.matchAll(/<a[^>]+href="([^"]*(?:\/en\/programme\/|\/en\/events\/|\/en\/calendar\/)[^"]+)"[\s\S]{0,2800}?<\/a>/gi)
  ].map((match) => ({ href: match[1], html: match[0] }));
  for (const block of blocks) {
    const title = cleanTitle(
      block.html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1]
      || block.html.match(/aria-label="([^"]+)"/i)?.[1]
      || block.html.match(/title="([^"]+)"/i)?.[1]
      || ''
    );
    const dateText = stripTags(
      block.html.match(/(?:date|time|calendar)[^>]*>([\s\S]{0,240}?)<\/(?:span|div|p)>/i)?.[1]
      || block.html.match(/(\d{1,2}\s+[A-Za-z]{3,9}\s+(?:-|to|–|—)\s+\d{1,2}\s+[A-Za-z]{3,9}\s*,?\s*20\d{2})/i)?.[1]
      || block.html.match(/(\d{1,2}\s+[A-Za-z]{3,9}\s*,?\s*20\d{2})/i)?.[1]
      || ''
    );
    const dates = parseEnglishProgramDateRange(dateText) || parseEnglishDateRange(dateText);
    const url = resolveUrl(block.href, source.url);
    const key = `${title}|${dates?.starts_at || ''}|${url}`;
    if (!title || !dates || seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url,
      summary: `فعالية رسمية من Ithra. التاريخ المعلن: ${dateText}.`,
      city: 'Dhahran',
      venue: 'Ithra',
      category: inferIthraCategory(title, block.html),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  return items;
}

function saudiDateTimeFromEpoch(value) {
  const epochSeconds = Number(value);
  if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) return '';
  return `${new Date((epochSeconds * 1000) + (3 * 60 * 60 * 1000)).toISOString().slice(0, 19)}+03:00`;
}

function ithraSessionsFromHit(hit = {}) {
  const starts = Array.isArray(hit.start_timestamp) ? hit.start_timestamp : [];
  const ends = Array.isArray(hit.end_timestamp) ? hit.end_timestamp : [];
  const calendar = Array.isArray(hit.website_calendar_json) ? hit.website_calendar_json : [];
  const venue = [hit.location, hit.venue].map((value) => stripTags(value || '')).filter(Boolean).join(' - ') || 'Ithra';
  const seen = new Set();
  return starts.map((start, index) => {
    const startsAt = saudiDateTimeFromEpoch(start);
    const endsAt = saudiDateTimeFromEpoch(ends[index]);
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) return null;
    const key = `${startsAt}|${endsAt}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const row = calendar[index] || {};
    const title = cleanTitle(row.title || hit.title || 'Ithra program session');
    return {
      id: `ithra-${hit.id || hit.objectID}-${String(startsAt).slice(0, 16).replace(/[^0-9]/g, '')}-${toSlug(title)}`,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      session_type: 'official-program-session',
      track: 'Ithra',
      room: venue,
      source_url: row.pageLink || hit.url
    };
  }).filter(Boolean).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

function extractIthraAlgoliaEvents(payload, source) {
  let parsed;
  try { parsed = JSON.parse(payload); } catch { return []; }
  const hits = Array.isArray(parsed?.hits) ? parsed.hits : [];
  const seen = new Set();
  return hits.map((hit) => {
    if (hit.locale && hit.locale !== 'en') return null;
    if (hit.exclude_from_listing || hit.exclude_from_pagelist || hit.is_cancelled) return null;
    const title = cleanTitle(hit.title || '');
    const url = resolveUrl(hit.url || '', source.url);
    const sessions = ithraSessionsFromHit(hit);
    const activeSessions = sessions.filter((session) => Date.parse(session.ends_at) >= now.getTime());
    const eventWindowSessions = activeSessions.length ? activeSessions : sessions;
    const startsAt = eventWindowSessions[0]?.starts_at || saudiDateTimeFromEpoch(hit.start_date || hit.timestamp);
    const endsAt = eventWindowSessions.at(-1)?.ends_at || saudiDateTimeFromEpoch(hit.end_date || hit.start_date || hit.timestamp);
    if (!title || !url || !startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) return null;
    const key = `${url}|${startsAt}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const website = hit.website_json || {};
    const venueLabel = stripTags(website.location || [hit.location, hit.venue].filter(Boolean).join(' - ')) || 'Ithra';
    const venue = /^ithra(?:\s*-|$)/i.test(venueLabel) ? venueLabel : `Ithra - ${venueLabel}`;
    const imageUrl = [
      ...(Array.isArray(hit.only_image_url) ? hit.only_image_url : []),
      ...(Array.isArray(hit.image_url) ? hit.image_url : []),
      hit.thumbnail
    ].find((value) => isUsefulImageUrl(value || '')) || '';
    const description = stripTags(hit.description || hit.short_description || hit.index_content || '');
    const price = hit.ticket_price === 'free' || /free/i.test(String(hit.ticket_price || ''))
      ? 'free'
      : Number(hit.ticket_price) > 0 ? `${Number(hit.ticket_price)} SAR` : priceLabelFromText(website.button_text || '');
    const registrationUrl = resolveUrl(hit.ticket_link || hit.registration_link || '', url);
    const category = inferIthraCategory(title, `${description} ${(hit.tags || []).map((tag) => tag?.label || tag?.key || '').join(' ')}`);
    return {
      title,
      url,
      organizer: source.owner,
      summary: description.slice(0, 700) || `برنامج رسمي من مركز إثراء في الظهران.`,
      rich_summary: description.slice(0, 700),
      city: 'Dhahran',
      venue,
      category,
      raw_date_text: [website.date, website.time].filter(Boolean).join(' - '),
      starts_at: startsAt,
      ends_at: endsAt,
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      ...(registrationUrl ? { registration_url: registrationUrl } : {}),
      ...(price ? { price_label: price } : {}),
      language: stripTags(website.language || hit.program_language || 'en'),
      attendance_mode: website.is_zoom ? 'online' : 'in-person',
      ...(sessions.length ? { sessions } : {}),
      age_policy: stripTags(website.age || hit.programme_age || ''),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      verification_method: 'official-public-algolia-index',
      date_precision: 'explicit-range',
      time_precision: 'exact',
      tags: [...new Set(['Ithra', ...(hit.filter_tags || []), ...(hit.tags || []).map((tag) => tag?.key || tag?.label).filter(Boolean)])],
      richness_score: calculateRichnessScore({
        title,
        summary: description,
        city: 'Dhahran',
        venue,
        category,
        image_url: imageUrl,
        registration_url: registrationUrl,
        attendance_mode: website.is_zoom ? 'online' : 'in-person',
        language: website.language || hit.program_language,
        sessions
      })
    };
  }).filter(Boolean).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title));
}

function inferIthraCategory(title = '', html = '') {
  const text = `${title} ${stripTags(html)}`.toLowerCase();
  if (/exhibition|gallery|معرض/.test(text)) return 'exhibition';
  if (/workshop|course|learning|تعلم|ورشة/.test(text)) return 'learning';
  if (/performance|concert|film|cinema|عرض|فيلم/.test(text)) return 'performance';
  if (/children|kids|family|طفل|عائلة/.test(text)) return 'family';
  return 'culture';
}

async function extractEyeOfRiyadh(html, source) {
  const items = [];
  const blocks = html.split(/<div style="color:#666A73; padding:0px 10px 3px 10px;">/).slice(1);
  for (const block of blocks) {
    const dateText = stripTags(block.match(/^([\s\S]*?)<\/div>/)?.[1] || '');
    const dates = parseEnglishDateRange(dateText);
    const titleMatch = block.match(/<a href="([^"]+)" style="color:#000;[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (!dates || !titleMatch) continue;
    const meta = stripTags(block.match(/<div style="color:#ADB0B6[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
    const [venuePart, categoryPart] = meta.split('|').map((item) => item.trim());
    const city = ['Jeddah', 'Medina', 'Dhahran', 'Al-Khobar', 'Riyadh'].find((name) => venuePart?.includes(name)) || 'Saudi Arabia';
    const category = categoryPart || 'business';
    const quality = directoryLeadScore({
      title: titleMatch[2],
      summary: stripTags(block.match(/<div style="color:#666A73; margin-bottom:10px;">([\s\S]*?)<\/div>/)?.[1] || ''),
      category,
      city,
      venue: venuePart || city
    });
    const url = resolveUrl(titleMatch[1], source.url);
    let enrichment = detailEnrichmentFromHtml(block, source.url, titleMatch[2]);
    try {
      const detailHtml = await fetchHtml({ ...source, collector_url: url });
      enrichment = {
        ...enrichment,
        ...detailEnrichmentFromHtml(detailHtml, url, titleMatch[2])
      };
    } catch {
      // Detail enrichment is best-effort; the directory row remains usable.
    }
    items.push({
      title: titleMatch[2],
      url,
      summary: stripTags(block.match(/<div style="color:#666A73; margin-bottom:10px;">([\s\S]*?)<\/div>/)?.[1] || ''),
      city,
      venue: venuePart || city,
      category,
      ticket_url: enrichment.registration_url || '',
      ...enrichment,
      richness_score: calculateRichnessScore({
        summary: stripTags(block.match(/<div style="color:#666A73; margin-bottom:10px;">([\s\S]*?)<\/div>/)?.[1] || ''),
        city,
        venue: venuePart || city,
        category,
        ...enrichment
      }),
      discovery_quality: quality.quality,
      discovery_score: quality.score,
      discovery_notes: quality.notes,
      ...dates
    });
  }
  return items;
}

function directoryLeadScore({ title = '', summary = '', category = '', city = '', venue = '' }) {
  const text = stripTags([title, summary, category, city, venue].filter(Boolean).join(' ')).toLowerCase();
  let score = 25;
  const notes = ['directory-source'];
  if (/riyadh|jeddah|dammam|dhahran|khobar|saudi|ksa|الرياض|جدة/.test(text)) {
    score += 20;
    notes.push('saudi-location-signal');
  }
  if (/expo|exhibition|summit|conference|championship|world cup|forum|construct|fintech|ai|data|hrse/.test(text)) {
    score += 25;
    notes.push('large-event-topic');
  }
  if (/programme|program|training|course/.test(text)) {
    score -= 10;
    notes.push('program-not-public-event');
  }
  if (city === 'Saudi Arabia') {
    score -= 10;
    notes.push('city-not-specific');
  }
  score = Math.max(0, Math.min(100, score));
  const quality = score >= 65 ? 'strong-lead' : (score >= 45 ? 'watch-lead' : (score >= 25 ? 'weak-lead' : 'blocked-noise'));
  return {
    score,
    quality,
    notes: notes.join(', ')
  };
}

function extractMdlbeast(html, source) {
  const items = [];
  const seen = new Set();
  for (const embedded of extractEmbeddedJsonObjects(html)) {
    walkEmbeddedObjects(embedded, (node) => {
      if (!node?.title || !node?.startDatetime) return;
      const dates = parseStructuredDateRange(node.startDatetime, node.endDatetime || node.startDatetime);
      if (!dates) return;
      const key = `${node.title}|${dates.starts_at}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        title: node.title,
        url: resolveUrl(node.path || `/events/${node.slug || ''}`, source.url),
        summary: `فعالية من تقويم MDLBEAST. المدينة: ${node.city || source.cities?.[0] || 'Saudi Arabia'}.`,
        city: normalizeSaudiCity(node.city || '', source.cities?.[0] || 'Saudi Arabia'),
        venue: node.city || source.cities?.[0] || 'Saudi Arabia',
        category: 'music',
        raw_date_text: [node.startDatetime, node.endDatetime].filter(Boolean).join(' - '),
        confidence: 'official',
        review_status: 'ready-for-review',
        publication_gate: 'human-review',
        ...dates
      });
    });
  }
  if (items.length) return items;

  const upcomingHtml = html.split(/past events/i)[0] || html;
  const pattern = /<a[^>]+href="([^"]+)"[\s\S]{0,2600}?<p[^>]*>([A-Za-z]{3}\s+\d{2}\s+[A-Za-z]{3}(?:\s*-\s*[A-Za-z]{3}\s+\d{2}\s+[A-Za-z]{3})?)[^<]*<\/p>\s*<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]{0,800}?<p[^>]*>In\s+([^<]+)<\/p>/g;
  for (const match of upcomingHtml.matchAll(pattern)) {
    const dates = parseEnglishDateRange(match[2]);
    if (!dates) continue;
    const city = stripTags(match[4]).replace(/\s+/g, ' ');
    items.push({
      title: match[3],
      url: resolveUrl(match[1], source.url),
      summary: `مرشح من تقويم MDLBEAST في ${city}.`,
      city,
      venue: city,
      category: 'music',
      raw_date_text: match[2],
      ...dates
    });
  }
  return items;
}

function sfdaTitleFromLinkText(value = '') {
  return stripTags(value)
    .replace(/^\s*20\d{2}[-/]\d{1,2}[-/]\d{1,2}\s*-\s*20\d{2}[-/]\d{1,2}[-/]\d{1,2}\s*/u, '')
    .replace(/رابط الدخول لورشة العمل.*$/u, '')
    .trim();
}

function sfdaCategory(title = '', url = '') {
  const text = `${title} ${url}`;
  if (/workshop|ورشة|ورش/i.test(text)) return 'regulatory workshop';
  if (/forum|منتدى/i.test(text)) return 'healthcare forum';
  if (/halal|حلال/i.test(text)) return 'halal';
  if (/medical|devices|الأجهزة|المستلزمات/i.test(text)) return 'medical devices';
  if (/pesticide|مبيدات/i.test(text)) return 'pesticides';
  if (/food|غذاء|تمور/i.test(text)) return 'food';
  return 'healthcare';
}

function sfdaDetailImage(html = '', baseUrl = '') {
  const candidates = [];
  for (const match of String(html || '').matchAll(/<img\s+[^>]*(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi)) {
    const url = resolveUrl(decodeHtml(match[1]), baseUrl);
    if (!isUsefulImageUrl(url)) continue;
    if (/\/themes\/custom\/|\/default_images\//i.test(url)) continue;
    candidates.push({ url, score: imageScore(url, 900) });
  }
  return candidates.sort((a, b) => b.score - a.score)[0]?.url || '';
}

async function extractSfdaEvents(html, source) {
  const pages = [source.url, ...(Array.isArray(source.collector_pages) ? source.collector_pages : [])];
  const htmlByUrl = new Map([[source.url, html]]);
  for (const pageUrl of pages.slice(1)) {
    try {
      htmlByUrl.set(pageUrl, await fetchText(pageUrl, { 'accept-language': 'ar-SA,ar;q=0.9,en;q=0.8' }));
    } catch {}
  }
  const rows = [];
  const seenLinks = new Set();
  for (const [pageUrl, pageHtml] of htmlByUrl.entries()) {
    for (const match of String(pageHtml || '').matchAll(/<a\s+[^>]*href=["']([^"']*\/ar\/(?:event|workshop)\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const url = resolveUrl(match[1], pageUrl);
      const rawText = stripTags(match[2]);
      const dates = parseYmdDateRange(rawText);
      const title = sfdaTitleFromLinkText(rawText);
      if (!title || !dates || seenLinks.has(url)) continue;
      seenLinks.add(url);
      rows.push({ url, rawText, title, dates });
    }
  }
  const items = [];
  for (const row of rows.slice(0, 40)) {
    let detailHtml = '';
    try {
      detailHtml = await fetchText(row.url, { 'accept-language': 'ar-SA,ar;q=0.9,en;q=0.8' });
    } catch {}
    const detailText = stripTags(detailHtml || row.rawText);
    const imageUrl = sfdaDetailImage(detailHtml, row.url);
    const isWorkshop = /\/workshop\//i.test(row.url);
    const attendanceMode = /رابط الدخول|webinar|online|عن بعد|الدخول لورشة/i.test(`${row.rawText} ${detailText}`) ? 'online' : '';
    const city = attendanceMode === 'online' ? 'Online' : normalizeSaudiCity(detailText, source.cities?.[0] || 'Saudi Arabia');
    items.push({
      title: row.title,
      url: row.url,
      organizer: source.owner,
      summary: `${isWorkshop ? 'ورشة عمل' : 'فعالية'} رسمية من الهيئة العامة للغذاء والدواء. ${row.title}`,
      city,
      venue: attendanceMode === 'online' ? 'Online' : city,
      category: sfdaCategory(row.title, row.url),
      raw_date_text: row.rawText,
      ...(imageUrl ? { image_url: imageUrl, image_alt: row.title, image_source_url: row.url } : {}),
      attendance_mode: attendanceMode || 'in-person',
      language: /[A-Za-z]{4,}/.test(row.title) ? 'en' : 'ar',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      tags: ['SFDA', isWorkshop ? 'workshop' : 'event', sfdaCategory(row.title, row.url)].filter(Boolean),
      ...row.dates
    });
  }
  return items;
}

function extractSaudiWaterAuthorityEvents(html, source) {
  const items = [];
  const seen = new Set();
  const links = [...html.matchAll(/href="([^"]*calendar\.google\.com\/calendar\/render\?[^"]+)"/gi)];
  for (const match of links) {
    const link = decodeHtml(match[1]);
    let params;
    try {
      params = new URL(link).searchParams;
    } catch {
      continue;
    }
    const title = stripTags(params.get('text') || '');
    const dates = parseGoogleCalendarDateRange(params.get('dates'));
    const details = stripTags(params.get('details') || '');
    const location = stripTags(params.get('location') || '') || source.cities?.[0] || 'Saudi Arabia';
    const precedingHtml = html.slice(Math.max(0, (match.index || 0) - 1600), match.index || 0);
    const detailHref = [...precedingHtml.matchAll(/href="([^"]*\/en\/events\/Event-[^"]+)"/gi)].pop()?.[1];
    const eventUrl = resolveUrl(detailHref || source.url, source.url);
    const key = `${title}|${dates?.starts_at || ''}|${location}`;
    if (!title || !dates || seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url: eventUrl,
      summary: details || `فعالية رسمية من تقويم الهيئة السعودية للمياه.`,
      city: normalizeSaudiCity(location, source.cities?.[0] || 'Saudi Arabia'),
      venue: location,
      category: inferSwaCategory(title, details),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  return items;
}

function extractDhahranExpoCalendar(html, source) {
  const section = html.match(/<h4 class="time"><span>List of 2026 Events<\/span><\/h4>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || '';
  const rows = [...section.matchAll(/<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi)];
  const items = [];
  const seen = new Set();
  for (const row of rows) {
    const title = stripTags(row[2]);
    const dateText = stripTags(row[3]);
    const organizer = stripTags(row[4]);
    if (!title || /^private\s+(event|wedding)$/i.test(title) || /^music concert$/i.test(title)) continue;
    const dates = parseDhahranDateRange(dateText, 2026);
    if (!dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url: source.url,
      organizer: organizer && organizer !== '-' ? organizer : source.owner,
      summary: `فعالية ضمن تقويم Dhahran Expo 2026. التاريخ المعلن: ${dateText}. المنظم: ${organizer || source.owner}.`,
      city: 'Dhahran',
      venue: 'Dhahran Expo',
      category: inferDhahranCategory(title),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      ...dates
    });
  }
  return items;
}

function inferDhahranCategory(title = '') {
  const text = title.toLowerCase();
  if (/conference|forum|technical congress/.test(text)) return 'conference';
  if (/expo|exhibition|fair|cidex/.test(text)) return 'exhibition';
  if (/concert/.test(text)) return 'music';
  if (/auction/.test(text)) return 'auction';
  if (/challenge/.test(text)) return 'sports';
  return 'venue event';
}

function inferSwaCategory(title = '', details = '') {
  const text = `${title} ${details}`.toLowerCase();
  if (/conference|congress|forum/.test(text)) return 'conference';
  if (/award|prize/.test(text)) return 'awards';
  if (/expo|exhibition/.test(text)) return 'exhibition';
  if (/national|flag|foundation/.test(text)) return 'national day';
  return 'water sector';
}

function highResAlulaImage(value = '') {
  const url = decodeHtml(value).trim();
  if (!url) return '';
  if (/scene7\.com\/is\/image\//i.test(url)) {
    return `${url.split('?')[0]}?$Responsive$&fit=stretch&fmt=webp&wid=1920`;
  }
  return url;
}

function experienceAlulaInfoPairs(html = '') {
  const pairs = new Map();
  for (const match of html.matchAll(/<p class="body-semi-bold">([^<]{1,160})<\/p>\s*<p class="body">([\s\S]*?)<\/p>/gi)) {
    const label = stripTags(match[1]);
    const value = stripTags(match[2]);
    if (label && value && !pairs.has(label)) pairs.set(label, value);
  }
  return pairs;
}

function experienceAlulaCategory(title = '') {
  const text = title.toLowerCase();
  if (/race|tour|endurance|warrior|cup|trail|سباق|بطولة/.test(text)) return 'sports';
  if (/festival|season|مهرجان|موسم/.test(text)) return 'festival';
  if (/music|concert|azimuth|موسيقى|حفل/.test(text)) return 'music';
  return 'destination event';
}

function extractExperienceAlulaDetailHtml(html = '', url = '') {
  const title = metaContent(html, 'og:title') || stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  if (!title) return null;
  const info = experienceAlulaInfoPairs(html);
  const titleYear = Number(title.match(/\b(20\d{2})\b/)?.[1] || now.getFullYear());
  const dateTexts = [
    ...[...html.matchAll(/<h3[^>]*class="[^"]*sub-title[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi)].map((match) => stripTags(match[1])),
    ...[...info.entries()].filter(([label]) => /schedule/i.test(label)).map(([, value]) => value)
  ].filter(Boolean);
  const dateText = dateTexts.find((value) => parseAlulaDateRange(value, titleYear)) || '';
  const dates = parseAlulaDateRange(dateText, titleYear);
  if (!dates) return null;
  const venue = info.get('Meeting location') || info.get('Location') || 'AlUla';
  const priceText = info.get('Price') || info.get('Price range') || '';
  const imageUrl = highResAlulaImage(metaContent(html, 'og:image') || firstUsefulImageFromHtml(html, url));
  const directionsBlock = html.match(/<p class="body-semi-bold">(?:Meeting location|Location)<\/p>[\s\S]{0,900}?href="([^"]+)"/i);
  const overview = stripTags(html.match(/<section[^>]+id="overview-component"[\s\S]*?<div[^>]+class="[^"]*cmp-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '');
  const summary = overview || stripTags(metaContent(html, 'og:description') || `فعالية رسمية منشورة من Experience AlUla.`);
  const booking = info.get('Booking') || '';
  const registrationUrl = /no advance booking required/i.test(booking) ? '' : registrationUrlFromHtml(html, url);
  return {
    title,
    url,
    summary,
    rich_summary: summary,
    city: 'AlUla',
    venue,
    category: experienceAlulaCategory(title),
    raw_date_text: dateText,
    ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
    ...(registrationUrl ? { registration_url: registrationUrl, ticket_url: registrationUrl } : {}),
    ...(priceText ? { price_label: priceLabelFromText(priceText) || priceText } : {}),
    ...(directionsBlock?.[1] ? { maps_url: resolveUrl(directionsBlock[1], url) } : {}),
    ...(info.get('Parking') ? { parking_info: info.get('Parking') } : {}),
    ...(info.get('Wheelchair and stroller accessible?') ? { accessibility_info: info.get('Wheelchair and stroller accessible?') } : {}),
    ...(info.get('Age restrictions') || info.get('Age limit') ? { age_policy: info.get('Age restrictions') || info.get('Age limit') } : {}),
    ...(info.get('Duration') ? { duration_label: info.get('Duration') } : {}),
    attendance_mode: 'in-person',
    language: 'en',
    highlights: [
      info.get('Duration') ? `Duration: ${info.get('Duration')}` : '',
      info.get('Age restrictions') || info.get('Age limit') ? `Age: ${info.get('Age restrictions') || info.get('Age limit')}` : '',
      booking ? `Booking: ${booking}` : '',
      info.get('Parking') ? `Parking: ${info.get('Parking')}` : '',
      info.get('Wheelchair and stroller accessible?') ? `Accessibility: ${info.get('Wheelchair and stroller accessible?')}` : ''
    ].filter(Boolean),
    ...dates
  };
}

function extractExperienceAlulaFestivalCards(html = '', source = {}) {
  const items = [];
  for (const titleMatch of html.matchAll(/<h4 class="title">([\s\S]*?)<\/h4>/gi)) {
    const title = stripTags(titleMatch[1]);
    const start = html.lastIndexOf('<div class="content-block', titleMatch.index);
    const end = html.indexOf('</a>', titleMatch.index);
    if (!title || start < 0 || end < 0) continue;
    const block = html.slice(start, end + 4);
    const dateText = stripTags(block.match(/<p class="subtitle tags">([\s\S]*?)<\/p>/i)?.[1] || '');
    const dates = parseAlulaDateRange(dateText, Number(dateText.match(/\b(20\d{2})\b/)?.[1] || now.getFullYear()));
    const href = block.match(/<a[^>]+href="([^"]+)"[^>]*>[^<]*(?:Learn more|اعرف المزيد)/i)?.[1]
      || block.match(/<a[^>]+href="([^"]+)"/i)?.[1];
    if (!dates || !href || !/\/whats-on\/festivals\//.test(href)) continue;
    const summary = stripTags(block.match(/<div class="description[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '');
    const image = highResAlulaImage([...block.matchAll(/srcset="([^"]+)"/gi)].map((match) => match[1]).find((value) => /wid=1920/.test(value)) || '');
    const url = resolveUrl(href, source.url);
    items.push({
      title,
      url,
      summary: summary || `مهرجان رسمي ضمن تقويم العلا.` ,
      rich_summary: summary || undefined,
      city: 'AlUla',
      venue: 'AlUla',
      category: 'festival',
      raw_date_text: dateText,
      ...(image ? { image_url: image, image_alt: title, image_source_url: url } : {}),
      attendance_mode: 'in-person',
      language: 'en',
      ...dates
    });
  }
  return items;
}

function experienceAlulaSitemapLinks(xml = '') {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => decodeHtml(match[1]))
    .filter((url) => /\/en\/whats-on\/events\/[^/?#]+/i.test(url));
}

async function extractExperienceAlula(html, source) {
  const blocks = [...html.matchAll(/<a[^>]+data-track-card-click="Product Cards"[\s\S]*?<\/a>/g)].map((match) => match[0]);
  const detailLinks = blocks
    .map((block) => block.match(/href="([^"]+)"/)?.[1])
    .filter((href) => href && /\/en\/whats-on\/(?:events|festivals)\//.test(href))
    .map((href) => resolveUrl(href, source.url));
  const items = [];

  try {
    const sitemapUrl = new URL('/sitemap.xml', source.url).href;
    const sitemap = await fetchHtml({ ...source, collector_url: sitemapUrl });
    detailLinks.push(...experienceAlulaSitemapLinks(sitemap));
  } catch {
    // The listing remains a legitimate fallback when sitemap retrieval fails.
  }

  try {
    const festivalUrl = new URL('/en/whats-on/festivals', source.url).href;
    const festivalHtml = await fetchHtml({ ...source, collector_url: festivalUrl });
    items.push(...extractExperienceAlulaFestivalCards(festivalHtml, source));
  } catch {
    // Event detail discovery can still produce a useful run without the festival page.
  }

  const uniqueDetailLinks = [...new Set(detailLinks)].slice(0, Math.max(maxPerSource * 2, 40));
  let cursor = 0;
  const detailItems = [];
  const workers = Array.from({ length: Math.min(4, uniqueDetailLinks.length) }, async () => {
    while (cursor < uniqueDetailLinks.length) {
      const url = uniqueDetailLinks[cursor];
      cursor += 1;
      try {
        const detailHtml = await fetchHtml({ ...source, collector_url: url });
        const event = extractExperienceAlulaDetailHtml(detailHtml, url);
        if (!event) continue;
        event.raw_snapshot_path = writeAuxiliarySnapshot(source, event.title || url, detailHtml);
        detailItems.push(event);
      } catch {
        // A failed detail must not invalidate other official detail pages in the same run.
      }
    }
  });
  await Promise.all(workers);
  items.push(...detailItems);

  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.url}|${item.starts_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function extractRfeccWhatsOn(_html, source) {
  const apiUrl = 'https://rfecc.sa/wp-json/wp/v2/mec-events?per_page=20&_embed=1';
  const payload = await fetchHtml({ ...source, collector_url: apiUrl });
  let events;
  try {
    events = JSON.parse(payload);
  } catch {
    return [];
  }
  if (!Array.isArray(events)) return [];

  const items = [];
  for (const event of events.slice(0, Math.max(maxPerSource * 3, 20))) {
    const url = event.link;
    const title = stripTags(event.title?.rendered || '');
    if (!url || !title) continue;
    try {
      const detailHtml = await fetchHtml({ ...source, collector_url: url });
      const structuredEvent = structuredEventFromHtml(detailHtml);
      const dates = structuredEvent
        ? parseStructuredDateRange(structuredEvent.startDate, structuredEvent.endDate)
        : parseStructuredDateRange(
          detailHtml.match(/"startDate"\s*:\s*"([^"]+)"/)?.[1],
          detailHtml.match(/"endDate"\s*:\s*"([^"]+)"/)?.[1]
        );
      if (!dates) continue;
      const rawSnapshotPath = writeAuxiliarySnapshot(source, title, detailHtml);
      const summary = stripTags(event.excerpt?.rendered || structuredEvent?.description || '');
      items.push({
        title,
        url,
        summary: summary || `فعالية معرض أو مؤتمر منشورة في تقويم واجهة الرياض للمعارض والمؤتمرات.`,
        city: 'Riyadh',
        venue: 'Riyadh Front Exhibition & Conference Center',
        category: 'exhibition',
        raw_snapshot_path: rawSnapshotPath,
        ...dates
      });
    } catch {
      // Skip individual detail failures and keep the source run useful.
    }
  }
  return items;
}

function eventbriteCategory(event) {
  const tag = (event.tags || []).find((item) => item.prefix === 'EventbriteCategory');
  return tag?.localized?.display_name || tag?.display_name || 'community';
}

function riyadhImageCandidates(row = {}, source = {}) {
  const sourceOrigin = (() => {
    try { return new URL(source.url).origin; } catch { return 'https://riyadh.sa'; }
  })();
  const candidates = [];
  const rows = [];
  const pushCandidate = (url, score = 700) => {
    if (!isUsefulImageUrl(url)) return;
    const absolute = resolveUrl(url, sourceOrigin);
    if (!isUsefulImageUrl(absolute)) return;
    const finalScore = imageScore(absolute, score);
    if (finalScore > 0) rows.push({ url: absolute, score: finalScore });
  };

  if (Array.isArray(row?.image)) {
    for (const media of row.image) {
      const preview = media?.preview?.medium || media?.preview?.[0];
      if (preview) pushCandidate(preview, 2400);
      if (media?.url) pushCandidate(media.url, 1700);
      if (media?.thumbnail) pushCandidate(media.thumbnail, 900);
    }
  }
  if (row?.entity_image?.url) pushCandidate(row.entity_image.url, 2200);
  if (row?.image_url) pushCandidate(row.image_url, 1600);

  const seen = new Map();
  for (const item of rows) {
    const key = item.url.split('?')[0];
    if (!seen.has(key) || seen.get(key).score < item.score) seen.set(key, item);
  }
  const best = [...seen.values()].sort((a, b) => b.score - a.score)[0];
  return best ? best.url : '';
}

function extractRiyadhCityEvent(row = {}, source = {}) {
  const title = cleanTitle(row.title || '');
  const startsAt = datetimeFromUnixAndClock(row.start_date, row.time?.start_time, '09:00:00');
  if (!title || !startsAt) return null;
  const endsAt = datetimeFromUnixAndClock(row.finish_date || row.start_date, row.time?.finish_time, '18:00:00')
    || addHoursToSaudiDateTime(startsAt, 9);
  const rawLocation = stripTags(row.geofield?.address || '');
  const city = normalizeSaudiCity(rawLocation, 'Riyadh');
  const summary = stripTags(row.body_summary || row.body || `فعالية رسمية من ${source.name}.`);
  const imageUrl = riyadhImageCandidates(row, source);
  const category = Array.isArray(row.category)
    ? row.category.map((item) => item?.taxonomy_term_name).filter(Boolean).join(' / ')
    : '';
  const attendanceMode = attendanceModeFromText(`${summary} ${rawLocation} ${row.website?.uri || ''}`) || (city === 'Online' ? 'online' : 'in-person');
  const venue = rawLocation || city;
  const url = resolveUrl(row.link || row?.website?.uri || source.url, source.url);
  return {
    title,
    url,
    organizer: row.organizer || source.owner,
    summary: summary || `فعالية رسمية من ${source.name}. التاريخ المعلن: ${startsAt.slice(0, 10)}.`,
    city,
    venue,
    category: category || 'city event',
    raw_date_text: `${startsAt.slice(0, 10)} ${clockTextFromUnixOrText(row.time?.start_time, '09:00:00')} - ${endsAt.slice(0, 10)} ${clockTextFromUnixOrText(row.time?.finish_time, '18:00:00')}`,
    ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
    attendance_mode: attendanceMode,
    confidence: 'official',
    review_status: 'ready-for-review',
    publication_gate: 'human-review',
    tags: [
      ...(Array.isArray(row.tags) ? row.tags.map((tag) => stripTags(typeof tag === 'string' ? tag : tag?.name || tag?.target_id || '')) : []),
      source.name
    ].filter(Boolean),
    starts_at: startsAt,
    ends_at: endsAt
  };
}

async function extractRiyadhCityEvents(_html, source) {
  const items = [];
  const seen = new Set();
  const sourceHostname = (() => {
    try {
      return new URL(source.url).hostname;
    } catch {
      return '';
    }
  })();
  const sourceApiBase = sourceHostname === 'api.riyadh.sa' ? `https://${sourceHostname}` : 'https://api.riyadh.sa';
  const perPage = 12;
  let total = 0;
  const seenPages = new Set();
  const fetchPage = async (page = 0) => {
    if (seenPages.has(page)) return [];
    seenPages.add(page);
    const url = `${sourceApiBase}/api/CountedEvents?_format=json&page=${page}&items_per_page=${perPage}&langcode=en`;
    const text = await fetchText(url, {
      accept: 'application/json, text/plain, */*',
      referer: source.url
    });
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return [];
    }
    const rows = Array.isArray(payload?.result?.items) ? payload.result.items : [];
    if (Number.isInteger(payload?.result?.counters?.total)) total = Number(payload.result.counters.total);
    return rows.map((row) => extractRiyadhCityEvent(row, source)).filter(Boolean);
  };

  for (let page = 0; page < Math.max(1, Math.ceil((total || (perPage * 2)) / perPage)); page += 1) {
    const rowItems = await fetchPage(page);
    for (const item of rowItems) {
      const startAtDate = String(item.starts_at || '').slice(0, 10);
      const key = `${item.title}|${startAtDate}|${item.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
    if (!rowItems.length || (total && (page + 1) * perPage >= total)) break;
    if (page >= 20) break;
  }
  return items
    .filter((item) => item.title && item.url && item.starts_at && item.ends_at)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

function eventbriteLeadScore({ title = '', summary = '', category = '', city = '', venue = '', url = '' }) {
  const text = stripTags([title, summary, category, city, venue, url].filter(Boolean).join(' ')).toLowerCase();
  let score = 0;
  const notes = [];
  if (/riyadh|jeddah|dammam|khobar|dhahran|saudi|ksa|الرياض|جدة/.test(text)) {
    score += 35;
    notes.push('saudi-location-signal');
  }
  if (venue && !/online|zoom|webinar/i.test(venue) && venue !== city) {
    score += 20;
    notes.push('specific-venue');
  }
  if (/tech|ai|data|fintech|expo|summit|conference|investment|startup|social|language|community|professional/.test(text)) {
    score += 15;
    notes.push('event-topic-fit');
  }
  if (/eventbrite\.(ca|de|co\.uk)/.test(url)) {
    score -= 10;
    notes.push('non-saudi-eventbrite-domain');
  }
  if (/citizenship|immigration|visa|passport|permanent resident|residency|webinar.*citizen/i.test(text)) {
    score -= 80;
    notes.push('immigration-citizenship-noise');
  }
  if (/webinar|zoom|online/.test(text) && !/riyadh|jeddah|saudi|ksa|الرياض|جدة/.test(text)) {
    score -= 35;
    notes.push('generic-online-noise');
  }
  score = Math.max(0, Math.min(100, score));
  const quality = score >= 65 ? 'strong-lead' : (score >= 45 ? 'watch-lead' : (score >= 25 ? 'weak-lead' : 'blocked-noise'));
  return {
    score,
    quality,
    notes: notes.join(', ')
  };
}

function extractEventbrite(html, source) {
  const data = extractAssignedJson(html, 'window.__SERVER_DATA__ =');
  const bucketEvents = (data?.request?.buckets || data?.buckets || [])
    .flatMap((bucket) => Array.isArray(bucket.events) ? bucket.events : []);
  const jsonLdEvents = (data?.jsonld || [])
    .flatMap((entry) => Array.isArray(entry.itemListElement) ? entry.itemListElement : [])
    .map((entry) => entry.item)
    .filter(Boolean);
  const rows = bucketEvents.length ? bucketEvents : jsonLdEvents;
  const seen = new Set();
  const items = [];
  for (const event of rows) {
    const url = event.url || event.parent_url;
    const title = event.name;
    const dates = parseDateFields(event.start_date || event.startDate, event.end_date || event.endDate, event.start_time, event.end_time);
    if (!title || !url || !dates) continue;
    const key = `${url}|${String(dates.starts_at).slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const venue = event.primary_venue || event.location || {};
    const address = venue.address || {};
    const relevanceText = [
      event.name,
      event.summary,
      event.description,
      event.url,
      venue.name,
      address.city,
      address.addressLocality,
      address.region,
      address.country,
      address.countryCode,
      address.localized_area_display
    ].filter(Boolean).join(' ');
    if (!hasSaudiRelevance(relevanceText)) continue;
    const city = normalizeSaudiCity(address.city || address.addressLocality || relevanceText, 'Saudi Arabia');
    const category = eventbriteCategory(event);
    const quality = eventbriteLeadScore({
      title,
      summary: event.summary || event.description || '',
      category,
      city,
      venue: venue.name || '',
      url
    });
    if (quality.quality === 'blocked-noise') continue;
    items.push({
      title,
      url,
      summary: event.summary || event.description || `مرشح مجتمعي من ${source.name}.`,
      city,
      venue: venue.name || city,
      category,
      discovery_quality: quality.quality,
      discovery_score: quality.score,
      discovery_notes: quality.notes,
      ...dates
    });
  }
  return items;
}

function hasSaudiRelevance(value = '') {
  const text = stripTags(value).toLowerCase();
  return /saudi|ksa|riyadh|jeddah|dammam|khobar|dhahran|al[-\s]?ula|aseer|abha|makkah|mecca|madinah|medina|الرياض|جدة|السعودية|المملكة/.test(text);
}

function normalizeSaudiCity(value = '', fallback = 'Saudi Arabia') {
  const text = stripTags(value);
  if (!text) return fallback;
  return normalizeCanonicalSaudiCity(text, fallback);
}

function extractTuwaiqAcademy(jsonText, source) {
  let payload;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    return [];
  }

  const rows = Array.isArray(payload.data) ? payload.data : [];
  return rows
    .filter((item) => item.title && item.startDate && item.endDate && item.slug)
    .map((item) => {
      const city = normalizeSaudiCity(item.locationName, source.cities?.[0] || 'Saudi Arabia');
      const category = [item.initiativeCategoryName, item.initiativeScopeName].filter(Boolean).join(' - ') || 'technology training';
      const registrationText = item.registrationEndDate
        ? ` ينتهي التسجيل في ${String(item.registrationEndDate).slice(0, 10)}.`
        : '';
      const imagePath = item.outerImage || item.initiativeScopeImage || item.logo || '';
      const imageUrl = imagePath
        ? resolveUrl(String(imagePath).replace(/^\/+/, ''), 'https://cdn.tuwaiq.edu.sa/initiatives_admin/')
        : '';
      const attendanceMode = attendanceModeFromText(item.locationName || '');
      const priceLabel = item.isPaid ? (item.price ? `${item.price} SAR` : 'paid') : 'free';
      return {
        title: item.title,
        url: resolveUrl(`/bootcamp/${item.slug}/view`, source.url),
        summary: `برنامج تقني من أكاديمية طويق ضمن ${category}.${registrationText}`,
        city,
        venue: stripTags(item.locationName || city),
        category,
        ...(imageUrl && isUsefulImageUrl(imageUrl) ? {
          image_url: imageUrl,
          image_alt: item.title,
          image_source_url: resolveUrl(`/bootcamp/${item.slug}/view`, source.url)
        } : {}),
        registration_url: resolveUrl(`/bootcamp/${item.slug}/view`, source.url),
        registration_deadline: item.registrationEndDate || '',
        attendance_mode: attendanceMode || (city === 'Online' ? 'online' : 'in-person'),
        price_label: priceLabel,
        language: 'ar',
        highlights: [
          item.initiativeCategoryName,
          item.initiativeScopeName,
          item.initiativeAgeName,
          item.isRegistrationOpen ? 'registration-open' : '',
          item.requireProfileCompletion ? 'requires-profile-completion' : ''
        ].filter(Boolean),
        richness_score: calculateRichnessScore({
          image_url: imageUrl,
          summary: `برنامج تقني من أكاديمية طويق ضمن ${category}.${registrationText}`,
          registration_url: resolveUrl(`/bootcamp/${item.slug}/view`, source.url),
          attendance_mode: attendanceMode || (city === 'Online' ? 'online' : 'in-person'),
          price_label: priceLabel,
          language: 'ar',
          venue: stripTags(item.locationName || city),
          category
        }),
        starts_at: item.startDate,
        ends_at: item.endDate
      };
    });
}

async function extractFutureSkills(html, source) {
  const items = [];
  const blocks = html.split(/<div class="col-lg-4 mb-4 is-not-member"/).slice(1);
  for (const block of blocks) {
    const href = block.match(/<a href="([^"]+)"/)?.[1];
    const title = stripTags(block.match(/<h5[^>]*>([\s\S]*?)<\/h5>/)?.[1] || '');
    const spans = [...block.matchAll(/<span>([\s\S]*?)<\/span>/g)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean);
    const dateText = spans.find((span) => /تبدأ\s+\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(span));
    const dates = parseArabicNumericDateRange(dateText);
    if (!href || !title || !dates) continue;
    const delivery = spans.find((span) => span !== dateText && /تفاعلية|مباشرة|عن بعد|حضورية|إلكترونية|الكترونية/.test(span)) || '';
    const courseType = spans.find((span) => span !== dateText && span !== delivery) || 'دورة تقنية';
    const url = resolveUrl(href, source.url);
    let enrichment = detailEnrichmentFromHtml(block, source.url, title);
    try {
      const detailHtml = await fetchHtml({ ...source, collector_url: url });
      enrichment = {
        ...enrichment,
        ...detailEnrichmentFromHtml(detailHtml, url, title)
      };
    } catch {
      // Keep the catalog useful even if a course detail page throttles.
    }
    items.push({
      title,
      url,
      summary: `${courseType}${delivery ? `، ${delivery}` : ''}. ${dateText}`,
      city: /عن بعد|تفاعلية|إلكترونية|الكترونية/.test(delivery) ? 'Online' : 'Saudi Arabia',
      venue: delivery || 'Future Skills',
      category: 'technology training',
      raw_date_text: dateText,
      registration_url: enrichment.registration_url || url,
      attendance_mode: enrichment.attendance_mode || attendanceModeFromText(delivery) || 'online',
      language: enrichment.language || 'ar',
      ...enrichment,
      richness_score: calculateRichnessScore({
        summary: `${courseType}${delivery ? `، ${delivery}` : ''}. ${dateText}`,
        city: /عن بعد|تفاعلية|إلكترونية|الكترونية/.test(delivery) ? 'Online' : 'Saudi Arabia',
        venue: delivery || 'Future Skills',
        category: 'technology training',
        registration_url: enrichment.registration_url || url,
        attendance_mode: enrichment.attendance_mode || attendanceModeFromText(delivery) || 'online',
        language: enrichment.language || 'ar',
        ...enrichment
      }),
      ...dates
    });
  }
  return items;
}

async function extractCodeMcitPrograms(html, source) {
  const items = [];
  let blocks = codeListingBlocksFromHtml(html);
  if (!blocks.length) {
    const fallback = latestCodeListingSnapshot();
    if (fallback) {
      blocks = codeListingBlocksFromHtml(fallback.html);
      writeAuxiliarySnapshot(source, 'code-listing-fallback-used', JSON.stringify({
        reason: /Unauthorized Access|دخول غير مصرح/i.test(html) ? 'unauthorized-access-html' : 'no-program-cards-in-current-html',
        fallback_snapshot: rel(fallback.file),
        blocks: blocks.length
      }, null, 2), 'json');
    }
  }
  for (const block of blocks) {
    const titleMatch = block.match(/<div class="col-12 element-title program-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/div>/);
    const dateText = stripTags(block.match(/<div class="col-12 program-created">([\s\S]*?)<\/div>/)?.[1] || '');
    const statusText = stripTags(block.match(/<li class="[^"]*(?:open|closed)[^"]*">([\s\S]*?)<\/li>/i)?.[1] || '');
    const category = stripTags(block.match(/<div class="tags">[\s\S]*?<li>([\s\S]*?)<\/li>/)?.[1] || '') || 'technology program';
    const summary = stripTags(block.match(/<div class="col-12 program-body">([\s\S]*?)<\/div>/)?.[1] || '');
    if (!titleMatch) continue;
    const title = cleanTitle(titleMatch[2]);
    const url = resolveUrl(titleMatch[1], source.url);
    const listingImageUrl = firstUsefulImageFromHtml(block, source.url);
    let detailHtml = '';
    let detailText = '';
    let detailEnrichment = {};
    try {
      if (source.disable_detail_fetch) throw new Error('detail-fetch-disabled');
      detailHtml = await fetchHtml({ ...source, collector_url: url });
      writeAuxiliarySnapshot(source, toSlug(title), detailHtml, 'html');
      detailText = stripTags(detailHtml).replace(/\s+/g, ' ').trim();
      detailEnrichment = detailEnrichmentFromHtml(detailHtml, url, title);
    } catch {
      detailText = stripTags(block).replace(/\s+/g, ' ').trim();
    }
    const dates = datesFromCodeProgramText(detailText) || parseEnglishMonthYearRange(dateText) || parseEnglishDateRange(dateText);
    if (!dates) continue;
    const city = codeProgramCity(`${detailText} ${summary}`);
    const attendanceMode = attendanceModeFromText(detailText) || (city === 'Online' ? 'online' : 'in-person');
    const imageUrl = detailEnrichment.image_url || listingImageUrl || '';
    const item = {
      title,
      url,
      summary: summary || detailEnrichment.rich_summary || `برنامج تقني من ${source.name}.`,
      city,
      venue: city === 'Online' ? 'Online' : (city === 'Saudi Arabia' ? 'CODE branches' : `CODE ${city}`),
      category: codeProgramCategory(title, category),
      raw_date_text: dateText || (detailText.match(/(?:Timeline|Program Timeline|Program Journey)[\s\S]{0,600}/i)?.[0] || '').slice(0, 600),
      confidence: 'official',
      review_status: isPastCandidate(dates) ? 'evidence-captured' : 'ready-for-review',
      publication_gate: 'human-review',
      attendance_mode: attendanceMode,
      price_label: priceLabelFromText(detailText),
      language: 'en',
      tags: [category, statusText].filter(Boolean),
      ...detailEnrichment,
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      registration_url: detailEnrichment.registration_url || (/open/i.test(statusText) ? url : ''),
      richness_score: calculateRichnessScore({
        title,
        summary,
        city,
        venue: city === 'Online' ? 'Online' : `CODE ${city}`,
        category,
        image_url: imageUrl,
        registration_url: detailEnrichment.registration_url || (/open/i.test(statusText) ? url : ''),
        attendance_mode: attendanceMode,
        language: 'en'
      }),
      ...dates
    };
    items.push({
      ...item,
      ticket_url: item.ticket_url || ''
    });
  }
  return items;
}

async function extractMiskHubPrograms(html, source) {
  const items = [];
  const blocks = html.split(/<div class="slide-contact">/).slice(1);
  for (const block of blocks) {
    const href = block.match(/<span href="([^"]+)"[^>]*>[\s\S]*?Applications closing/i)?.[1];
    const deadlineText = stripTags(block.match(/Applications closing on[\s\S]*?<\/i>/i)?.[0] || '');
    const title = stripTags(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] || '');
    const summary = stripTags(block.match(/<p[^>]*class="[^"]*body-text-1[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] || '');
    const attributes = [...block.matchAll(/<div class="mfont font-weight-200">[\s\S]*?<span>([\s\S]*?)<\/span><\/div>/g)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean);
    if (!href || !title) continue;
    const delivery = attributes.find((item) => /Online|Hybrid|In-Person/i.test(item)) || '';
    const city = /Online/i.test(delivery) ? 'Online' : (/Hybrid/i.test(delivery) ? 'Saudi Arabia' : 'Saudi Arabia');
    const url = resolveUrl(href, source.url);
    let detailDateText = '';
    let dates = null;
    let rawSnapshotPath = '';
    try {
      const detailHtml = await fetchHtml({ ...source, collector_url: url });
      rawSnapshotPath = writeAuxiliarySnapshot(source, title, detailHtml);
      detailDateText = extractMiskProgramDateText(detailHtml);
      dates = parseEnglishProgramDateRange(detailDateText);
    } catch {
      dates = null;
    }
    const usingProgramDates = Boolean(dates);
    dates ||= parseMiskDeadlineDate(deadlineText);
    if (!dates) continue;
    items.push({
      title: usingProgramDates ? title : `Application deadline: ${title}`,
      url,
      summary: `${summary || `مرشح برنامج من ${source.name}.`} ${usingProgramDates ? `Program window: ${detailDateText}. ${deadlineText}` : deadlineText}`.trim(),
      city,
      venue: delivery || 'Misk Hub',
      category: usingProgramDates ? 'skills program' : 'application deadline',
      confidence: usingProgramDates ? 'official' : undefined,
      review_status: usingProgramDates ? 'ready-for-review' : undefined,
      publication_gate: usingProgramDates ? 'human-review' : undefined,
      raw_snapshot_path: rawSnapshotPath || undefined,
      ...dates
    });
  }
  return items;
}

async function extractMiskHubEvents(html, source) {
  const apiItems = await extractMiskHubEventsApi(source).catch(() => []);
  if (apiItems.length) return apiItems;

  const items = [];
  const seen = new Set();
  const blocks = html.split(/<div class="slide-contact">/).slice(1);
  for (const block of blocks) {
    const title = stripTags(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] || '');
    const href = block.match(/data-program-url="([^"]+)"/)?.[1]
      || block.match(/href="([^"]*\/en\/events\/[^"]+)"/)?.[1];
    const dateText = stripTags(block.match(/fa-dxh-calendar[\s\S]*?<span class="pdbfx1">([\s\S]*?)<\/span>/)?.[1] || '');
    const timeText = stripTags(block.match(/fa-course-start-end[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)?.[1] || '');
    const summary = stripTags(block.match(/<p class="[^"]*body-text-2[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] || '');
    const category = stripTags(block.match(/<a[^>]+category=([^"#]+)[^>]*>[\s\S]*?<span><i>([\s\S]*?)<\/i><\/span>/)?.[2] || '') || 'skills';
    const delivery = stripTags(block.match(/(?:fa-video|fa-map-marker-alt)[\s\S]*?<span class="pdbfx1">([\s\S]*?)<\/span>/)?.[1] || '');
    const dateRange = parseEnglishProgramDateRange(dateText);
    const dates = applyTimeRangeToDates(dateRange, timeText);
    if (!title || !href || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const city = /online/i.test(delivery) ? 'Online' : 'Saudi Arabia';
    items.push({
      title,
      url: resolveUrl(href, source.url),
      summary: summary || `فعالية رسمية من Misk Hub. التاريخ المعلن: ${dateText}${timeText ? `، ${timeText}` : ''}.`,
      city,
      venue: delivery || city,
      category,
      raw_date_text: dateText,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  return items;
}

async function extractMiskHubEventsApi(source) {
  const items = [];
  const seen = new Set();
  let skipCount = 0;
  for (let page = 0; page < 4; page += 1) {
    const response = await collectorFetch('https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        origin: 'https://hub.misk.org.sa',
        referer: source.url,
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        SkipCount: skipCount,
        CurrentCulture: 'en-US',
        CategoryId: 0,
        OrderBy: '',
        EventTypeFilters: [],
        LanguageFilters: [],
        StatusFilters: [],
        FromDate: null,
        ToDate: null,
        LocationId: null,
        CurrentPageId: '4411'
      })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Misk events API HTTP ${response.status}`);
    const payload = JSON.parse(text);
    const fragment = String(payload.stringObjectValues || '');
    if (!fragment.trim()) break;
    writeAuxiliarySnapshot(source, `misk-events-api-${skipCount}`, text, 'json');
    for (const event of extractMiskEventsFromFragment(fragment, source)) {
      const key = `${event.title}|${event.starts_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(event);
    }
    if (!payload.nextSkippedValue || payload.nextSkippedValue === skipCount) break;
    skipCount = payload.nextSkippedValue;
  }
  return items;
}

function extractMiskEventsFromFragment(fragment, source) {
  const blocks = fragment.split(/<div class="article-outer v3">/).slice(1);
  const items = [];
  for (const block of blocks) {
    const title = stripTags(block.match(/<div class="article-title-inner[^"]*"[^>]*><a[^>]*><b>([\s\S]*?)<\/b>/)?.[1] || '');
    const href = block.match(/<a href="([^"]*\/events\/[^"]+)"/)?.[1] || '';
    const listValues = [...block.matchAll(/<li>[\s\S]*?<span>([\s\S]*?)<\/span><\/li>/g)].map((match) => stripTags(match[1]));
    const dateText = listValues.find((value) => /\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}/.test(value)) || '';
    const timeText = listValues.find((value) => /\d{1,2}:\d{2}\s*(?:am|pm)?/i.test(value)) || '';
    const delivery = listValues.find((value) => /online|in-person|hybrid|riyadh|jeddah|dammam|khobar/i.test(value)) || stripTags(block.match(/<div class=" time-label">[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1] || '');
    const summary = stripTags(block.match(/<p[^>]*class="[^"]*body-text[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] || '');
    const dateRange = parseEnglishDateRange(dateText);
    const dates = applyTimeRangeToDates(dateRange, timeText);
    if (!title || !href || !dates) continue;
    if (/test|testing|form-testing/i.test(`${title} ${href}`)) continue;
    if (/this event has passed/i.test(block)) continue;
    if (durationDaysBetween(dates.starts_at, dates.ends_at) > 30) continue;
    const city = /online/i.test(delivery) ? 'Online' : normalizeSaudiCity(delivery || title, 'Saudi Arabia');
    items.push({
      title,
      url: resolveUrl(href, source.url),
      summary: summary || `فعالية رسمية من Misk Hub. التاريخ المعلن: ${dateText}${timeText ? `، ${timeText}` : ''}.`,
      city,
      venue: delivery || city,
      category: 'skills',
      raw_date_text: [dateText, timeText].filter(Boolean).join(' '),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  return items;
}

function yearFromTitle(title, fallback = now.getFullYear()) {
  return Number(String(title || '').match(/\b(20\d{2})\b/)?.[1]) || fallback;
}

function extractDiscoverAseerEvents(html, source) {
  const upcomingSection = html
    .split(/Upcoming Seasons and Events/i)[1]
    ?.split(/Previous Seasons and Events/i)[0] || '';
  const blocks = [...upcomingSection.matchAll(/<a\s+href="([^"]+)"[^>]*class="[^"]*event-season[^"]*"[\s\S]*?<\/a>/gi)]
    .map((match) => ({ href: match[1], html: match[0] }));
  const items = [];
  const seen = new Set();
  for (const block of blocks) {
    const title = stripTags(block.html.match(/text-zinc-800[\s\S]*?>([\s\S]*?)<\/p>/)?.[1] || '');
    const dateText = stripTags(block.html.match(/text-zinc-400[\s\S]*?>([\s\S]*?)<\/p>/)?.[1] || '');
    const dates = parseOrdinalEnglishDateRange(dateText, yearFromTitle(title));
    if (!title || !dates) continue;
    const url = resolveUrl(block.href, source.url);
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: `موسم رسمي من Discover Aseer. التاريخ المعلن: ${dateText}.`,
      city: 'Aseer',
      venue: 'Aseer Region',
      category: 'season',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  return items;
}

async function extractSdaiaAcademyPrograms(html, source) {
  const seen = new Set();
  const items = [];
  let siteNodes = parseSdaiaAcademySiteNodes(html);
  const shouldTryEndpoint = !siteNodes.length && html.length > 5000;
  if (shouldTryEndpoint) {
    const endpointUrls = [
      '/en/Sectors/BuildingCapacity/academy/bootcamps/DataSources/bootcamps.aspx',
      '/Sectors/BuildingCapacity/academy/bootcamps/DataSources/bootcamps.aspx'
    ];

    const apiPayloads = await Promise.all(endpointUrls.map(async (path) => {
      try {
        const dataHtml = await fetchText(resolveUrl(path, source.url), {
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        });
        return parseSdaiaAcademySiteNodes(dataHtml);
      } catch {
        return [];
      }
    }));

    siteNodes = siteNodes
      .concat(apiPayloads.flat())
      .filter((node) => node?.title)
      .map((node) => ({
        ...node,
        url: node.url || node.detailUrl || ''
      }));
  }

  const uniqueNodes = [];
  const siteSeen = new Set();
  for (const node of siteNodes) {
    const key = `${node.id || ''}|${node.title}`;
    if (siteSeen.has(key)) {
      const existing = uniqueNodes.find((item) => `${item.id || ''}|${item.title}` === key);
      if (existing) {
        existing.summaryText = [existing.summaryText, node.summaryText].filter(Boolean).join(' | ');
        existing.image = existing.image || node.image;
        if (!existing.url) existing.url = node.url;
      }
      continue;
    }
    siteSeen.add(key);
    uniqueNodes.push(node);
  }
  siteNodes = uniqueNodes
    .filter((node) => node?.title);

  const fallbackCards = siteNodes.length
    ? []
    : [...html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => ({
        title: cleanTitle(match[0].match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1]
          || match[0].match(/title="([^"]+)"/i)?.[1]
          || match[0].match(/aria-label="([^"]+)"/i)?.[1]
          || ''),
        html: match[0],
        id: '',
        image: '',
        dateText: stripTags(
          match[0].match(/(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}\s*(?:-|to|–|—)\s*\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i)?.[1]
          || match[0].match(/(20\d{2}-\d{2}-\d{2}\s*(?:-|to|–|—)\s*20\d{2}-\d{2}-\d{2})/i)?.[1]
          || ''
        ),
        summaryText: match[0],
        url: match[0].match(/href="([^"]+)"/i)?.[1] || ''
      }))
      .filter((card) => card.title && card.dateText);

  const sourceCandidates = siteNodes.length ? siteNodes : fallbackCards;
  const titleFallback = source.cities?.[0] || 'Riyadh';

  for (const candidate of sourceCandidates) {
    if (!candidate.title) continue;
    const key = `${source.id}|${candidate.id || candidate.title}|${candidate.url || source.url}`;
    if (seen.has(key)) continue;

    let dateText = candidate.dateText;
    let detailsText = candidate.summaryText || '';
    let parsedDate = parseSdaiaDateFromText(dateText);
    let resolvedUrl = candidate.url ? resolveUrl(candidate.url, source.url) : source.url;

    if (!parsedDate && candidate.id && !source.disable_detail_fetch) {
      const detailCandidates = buildSdaiaAcademyDetailUrls(source, candidate.id);
      for (const detailUrl of detailCandidates) {
        try {
          const detailHtml = await fetchText(detailUrl, {
            accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
            'cache-control': 'no-cache',
            pragma: 'no-cache',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          });
          const detailDate = parseSdaiaDateFromText(detailHtml);
          if (detailDate?.starts_at) {
            parsedDate = detailDate;
            dateText = detailDate.raw_date_text || dateText;
            detailsText = `${detailsText} ${stripTags(detailHtml)}`;
            resolvedUrl = detailUrl;
            writeAuxiliarySnapshot(source, `sdaia-academy-${candidate.id}-${now.getTime()}`, detailHtml);
            break;
          }
        } catch {
          // Ignore, keep trying alternate detail candidates.
        }
      }
    }

    if (!parsedDate?.starts_at && candidate.url) {
      let detailHtml = '';
      const detailCandidates = [
        candidate.url,
        ...buildSdaiaAcademyDetailUrls(source, candidate.id).slice(0, 2)
      ].filter(Boolean);
      for (const detailUrl of detailCandidates) {
        try {
          detailHtml = await fetchText(detailUrl, {
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin'
          });
          const detailDate = parseSdaiaDateFromText(detailHtml);
          if (detailDate?.starts_at) {
            parsedDate = detailDate;
            dateText = detailDate.raw_date_text || dateText;
            detailsText = `${detailsText} ${stripTags(detailHtml)}`;
            writeAuxiliarySnapshot(source, `sdaia-academy-${candidate.id || candidate.title}-${now.getTime()}`, detailHtml);
            break;
          }
        } catch {
          // Ignore detail URL attempts that are blocked or missing.
        }
      }
    }

    if (!parsedDate?.starts_at) continue;

    const city = cityFromSlugOrTitle(`${candidate.summaryText || ''} ${candidate.title}` , titleFallback);
    const venueSource = candidate.campus || candidate.summaryText || '';
    const venue = /online|remote|عن بعد/i.test(venueSource) ? 'Online' : 'SDAIA Academy';
    const imageCandidates = [candidate.image, resolvedUrl];
    const imageSource = imageCandidates
      .map((item) => (/^https?:\/\//i.test(item) ? item : ''))
      .find(Boolean);

    const keyName = `${candidate.title}|${parsedDate.starts_at}|${resolvedUrl}`;
    if (seen.has(keyName)) continue;
    seen.add(keyName);

    items.push({
      title: candidate.title,
      url: resolvedUrl,
      organizer: source.owner,
      summary: `برنامج رسمي من SDAIA Academy. التاريخ المعلن: ${dateText}.`,
      city,
      venue,
      category: inferSdaiaAcademyCategory(candidate.title, detailsText),
      raw_date_text: dateText,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...(imageSource ? {
        image_url: resolveUrl(imageSource, source.url),
        image_alt: candidate.title,
        image_source_url: resolvedUrl
      } : {}),
      ...(attendanceModeFromText(detailsText) ? { attendance_mode: attendanceModeFromText(detailsText) } : {}),
      ...parsedDate
    });
  }
  return items;
}

function parseSdaiaAcademySiteNodes(html) {
  const siteNodePattern = /<site\b([^>]*)>([\s\S]*?)<\/site>/gi;
  const attr = (chunk = '', name = '') => decodeHtml((chunk.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1] || '').trim());
  return [...html.matchAll(siteNodePattern)].map((match) => {
    const chunk = match[1] || '';
    const body = match[2] || '';
    return {
      id: attr(chunk, 'ID'),
      title: attr(chunk, 'Title'),
      image: attr(chunk, 'Image'),
      dateText: [
        attr(chunk, 'CampDuration'),
        attr(chunk, 'timetable'),
        attr(chunk, 'CampsStart')
      ].filter(Boolean).join(' | '),
      campus: attr(chunk, 'CampsPlace'),
      detailUrl: (body.match(/href="([^"]+Details\.aspx[^"]*)"/i)?.[1] || ''),
      summaryText: stripTags(body).replace(/\s+/g, ' ').trim(),
      html: match[0]
    };
  });
}

function sanitizeSdaiaHtmlText(value = '') {
  return stripTags(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/_spPageContextInfo[\s\S]*?}/g, ' ')
      .replace(/formDigestValue[^"]*\"/gi, ' ')
      .replace(/SharePointError[^\n]*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function parseSdaiaDateFromText(value = '') {
  const text = sanitizeSdaiaHtmlText(value)
    .replace(/[\u200b\u00a0]/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  const candidates = [];
  const addCandidate = (candidate = '') => {
    const clean = String(candidate || '').replace(/\b(program duration|duration|dates?|from|to)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean) candidates.push(clean);
  };

  const fromToMatch = text.match(/From\s+(\d{1,2})\s+to\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/i);
  if (fromToMatch) {
    addCandidate(`${fromToMatch[1]} ${fromToMatch[3]} ${fromToMatch[4]} - ${fromToMatch[2]} ${fromToMatch[3]} ${fromToMatch[4]}`);
  }

  const fromToMonthMatch = text.match(/From\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+to\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/i);
  if (fromToMonthMatch) {
    addCandidate(`${fromToMonthMatch[1]} ${fromToMonthMatch[2]} ${fromToMonthMatch[5]} - ${fromToMonthMatch[3]} ${fromToMonthMatch[4]} ${fromToMonthMatch[5]}`);
  }

  const dateLines = [
    ...text.matchAll(/(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}\s*(?:-|to|–|—)\s*\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/gi),
    ...text.matchAll(/(Program\s*Duration[^\n]{0,180})/gi),
    ...text.matchAll(/(\d{1,2}\s*[-]\s*\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/gi)
  ];
  for (const match of dateLines) {
    addCandidate(match[1] || '');
  }

  for (const candidate of candidates.concat(text)) {
    const strict = parseEnglishDateRange(candidate);
    if (strict?.starts_at && strict?.ends_at) return { ...strict, raw_date_text: candidate };
    const flexible = parseFlexibleDateRange(candidate, {
      start_time: '09:00:00',
      end_time: '18:00:00',
      now: now
    });
    if (flexible?.starts_at && flexible?.ends_at) return { ...flexible, raw_date_text: candidate };
  }

  return null;
}

function buildSdaiaAcademyDetailUrls(source = {}, id = '') {
  const candidates = [
    `/en/Sectors/academy/bootcamps/BuildingAIAppDetails.aspx?ID=${encodeURIComponent(id)}`,
    `/en/Sectors/academy/bootcamps/BuildingAIAppDetails.aspx?Id=${encodeURIComponent(id)}`,
    `/en/Sectors/academy/bootcamps/DataSources/bootcamps.aspx?ID=${encodeURIComponent(id)}`,
    `/en/Sectors/academy/bootcamps/DataSources/bootcamps.aspx?item=${encodeURIComponent(id)}`,
    `/en/Sectors/academy/bootcamps/Pages/BuildingAIAppDetails.aspx?ID=${encodeURIComponent(id)}`
  ];
  const safeSource = (() => {
    try {
      return `${new URL(source.url).origin}/`;
    } catch {
      return String(source.url || '').replace(/\/[^/]*$/, '/');
    }
  })();
  return [...new Set([
    ...candidates,
    ...candidates.map((item) => resolveUrl(item, source.url))
  ].map((item) => resolveUrl(item, safeSource)))];
}

function inferSdaiaAcademyCategory(title = '', html = '') {
  const text = `${title} ${stripTags(html)}`.toLowerCase();
  if (/bootcamp|معسكر/.test(text)) return 'AI bootcamp';
  if (/quantum|كم/.test(text)) return 'quantum technology training';
  if (/generative|genai|توليدي/.test(text)) return 'generative AI training';
  if (/data|بيانات/.test(text)) return 'data training';
  return 'AI and data training';
}

function extractSaudiProLeagueFixtures(payloadText, source) {
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return [];
  }
  const rows = Array.isArray(payload?.content)
    ? payload.content
    : (Array.isArray(payload?.fixtures) ? payload.fixtures : []);
  const items = [];
  const seen = new Set();
  for (const fixture of rows) {
    const teams = Array.isArray(fixture.teams) ? fixture.teams : [];
    const home = teamName(teams[0]);
    const away = teamName(teams[1]);
    const startsAt = saudiDateTimeFromMillis(fixture.kickoff?.millis || fixture.provisionalKickoff?.millis);
    const endsAt = addHoursToSaudiDateTime(startsAt, 2);
    if (!home || !away || !startsAt || !endsAt) continue;
    const title = `${home} vs ${away}`;
    const ticketUrl = fixture.metadata?.['ticket-url'] || fixture.metadata?.ticketUrl || '';
    const url = ticketUrl || resolveUrl(`/en/match/${fixture.id || ''}`, source.url);
    const city = normalizeSaudiCity(fixture.ground?.city || title, source.cities?.[0] || 'Saudi Arabia');
    const venue = fixture.ground?.name || city;
    const key = `${title}|${startsAt}|${venue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: `مباراة رسمية من جدول Saudi Pro League. الملعب: ${venue}. الجولة: ${fixture.gameweek?.gameweek || 'غير محددة'}.`,
      city,
      venue,
      category: 'football match',
      raw_date_text: String(fixture.kickoff?.label || fixture.kickoff?.millis || fixture.provisionalKickoff?.millis || ''),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      tags: [
        'sports',
        'football',
        fixture.gameweek?.compSeason?.label,
        fixture.gameweek?.competition?.description
      ].filter(Boolean),
      ...{ starts_at: startsAt, ends_at: endsAt }
    });
  }
  return items;
}

function teamName(entry) {
  return stripTags(
    entry?.team?.club?.name
    || entry?.team?.shortName
    || entry?.team?.name
    || entry?.name
    || ''
  );
}

async function extractMocCulturalCalendar(html, source) {
  const apiItems = await extractMocCalendarApi(source).catch(() => []);
  if (apiItems.length) return apiItems;

  return extractSitecoreEventItemsFromNextData(html, source, source.categories?.[0] || 'culture')
    .filter((item) => !/no events right now/i.test(item.title));
}

function extractMocCalendarPayload(payload = {}, source) {
  return (payload.Events || [])
    .map((event) => {
      const startsAt = saudiDateTimeFromCompactUtc(event.fromDate, '09:00:00');
      const endsAt = saudiDateTimeFromCompactUtc(event.toDate, '18:00:00');
      const title = stripTags(event.title || '');
      if (isMocPlaceholderTitle(title) || !startsAt || !endsAt) return null;
      const durationDays = durationDaysBetween(startsAt, endsAt);
      const city = normalizeSaudiCity(event.regionName || event.regionValue || event.location || '', source.cities?.[0] || 'Saudi Arabia');
      const url = resolveMocUrl(event.eventDetailPageLink || event.templatePageLink || source.url, source.url);
      const imageUrl = event.image ? resolveUrl(event.image, source.url) : '';
      const category = mocCategory(event, durationDays);
      const publicationGate = mocPublicationGate(durationDays, source.candidate_gate);
      const summary = durationDays > 45
        ? `برنامج أو مبادرة ثقافية رسمية من تقويم وزارة الثقافة. المدة طويلة لذلك تحفظ كدليل مصدر ولا تنشر تلقائياً كفعالية لحظية.`
        : `فعالية رسمية من تقويم وزارة الثقافة. التصنيف: ${event.categoryName || source.categories?.[0] || 'culture'}.`;
      return {
        title,
        url,
        organizer: source.owner,
        summary,
        city,
        venue: stripTags(event.location || event.regionName || city),
        category,
        raw_date_text: [event.fromDate, event.toDate].filter(Boolean).join(' - '),
        ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
        attendance_mode: 'in-person',
        language: 'en',
        confidence: 'official',
        review_status: durationDays > 45 ? 'evidence-captured' : 'ready-for-review',
        publication_gate: publicationGate,
        tags: [event.categoryName, event.regionName, durationDays > 45 ? 'long-running cultural initiative' : 'cultural event'].filter(Boolean),
        richness_score: calculateRichnessScore({
          title,
          summary,
          city,
          venue: stripTags(event.location || event.regionName || city),
          category,
          image_url: imageUrl,
          attendance_mode: 'in-person',
          language: 'en'
        }),
        starts_at: startsAt,
        ends_at: endsAt
      };
    })
    .filter(Boolean);
}

async function extractMocCalendarApi(source) {
  const sourceOrigin = (() => {
    try { return new URL(source.url).origin; } catch { return 'https://www.moc.gov.sa'; }
  })();
  const response = await collectorFetch(`${sourceOrigin}/s-core/api/OtherEvents/CulturalCalendar`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: sourceOrigin,
      referer: source.url,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({
      culture: 'en',
      PageSize: 40,
      PageNumber: 0,
      EventDate: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`,
      categoryId: '',
      regionId: '',
      includeUnlisted: false
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`MOC calendar API HTTP ${response.status}`);
  const payload = JSON.parse(text);
  writeAuxiliarySnapshot(source, 'moc-cultural-calendar-api', text, 'json');
  return extractMocCalendarPayload(payload, source);
}

function extractMinistryOfSportEvents(html, source) {
  return extractSitecoreEventItemsFromNextData(html, source, 'sports')
    .map((item) => ({
      ...item,
      venue: item.venue === 'Saudi Arabia' ? item.city : item.venue,
      category: inferSportCategory(item.title, item.summary)
    }));
}

function inferSportCategory(title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  if (/cup|championship|tournament|league|race|tour|prix|final/.test(text)) return 'sports championship';
  if (/conference|forum|summit/.test(text)) return 'sports conference';
  return 'sports';
}

function extractJcciEventsCenter(html, source) {
  const items = [];
  const titleMatches = [...html.matchAll(/data-lfr-editable-id="(?:card-title-id|jcc-title)"[^>]*>[\s\S]*?<\/(?:span|h2)>/g)];
  const blocks = titleMatches.map((match, index) => {
    const nextMatch = titleMatches[index + 1];
    const start = match.index || 0;
    const end = nextMatch?.index || html.length;
    return {
      title: match[0],
      block: html.slice(start, end)
    };
  });
  const seen = new Set();
  for (const { title: titleMatch, block } of blocks) {
    const title = stripTags(titleMatch.match(/>([\s\S]*?)<\/(?:span|h2)>/)?.[1] || '');
    const dateText = stripTags(block.match(/data-lfr-editable-id="(?:card-date-id|jcc-date-value)"[^>]*>([\s\S]*?)<\/(?:div|p)>/)?.[1] || '');
    const venue = stripTags(block.match(/data-lfr-editable-id="(?:card-location-id|jcc-geolocation-value)"[^>]*>([\s\S]*?)<\/(?:div|p)>/)?.[1] || '');
    const summary = stripTags(block.match(/data-lfr-editable-id="card-subTitle-id"[\s\S]*?>([\s\S]*?)<\/span>/)?.[1] || block.match(/label-item-expand">([\s\S]*?)<\/span>/)?.[1] || '');
    const label = stripTags(block.match(/label-item-expand">([\s\S]*?)<\/span>/)?.[1] || '');
    const dates = parseJcciDate(dateText);
    if (!title || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url: source.url,
      summary: summary || `فعالية في مركز جدة للمعارض والفعاليات. التاريخ المعلن: ${dateText}.`,
      city: 'Jeddah',
      venue,
      category: label || inferJcciCategory(title, summary),
      raw_date_text: dateText,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      ...dates
    });
  }
  return items;
}

function inferJcciCategory(title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  if (/exhibition|expo|معرض/.test(text)) return 'exhibition';
  if (/forum|conference|summit|ملتقى|مؤتمر/.test(text)) return 'conference';
  if (/workshop|training|ورشة|تدريب/.test(text)) return 'training';
  return 'business event';
}

function inferChamberCategory(title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  if (/معرض|expo|exhibition|مهرجان/.test(text)) return 'exhibition';
  if (/ملتقى|مؤتمر|forum|conference|ندوة/.test(text)) return 'conference';
  if (/دورة|تدريب|training|course/.test(text)) return 'training';
  if (/ورشة|workshop/.test(text)) return 'workshop';
  if (/توظيف|وظائف|career|job/.test(text)) return 'career';
  if (/سياح|tourism/.test(text)) return 'tourism';
  return 'chamber event';
}

function extractMakkahChamberEvents(html, source) {
  const items = [];
  const seen = new Set();
  const blocks = html.split(/<li class="card media(?:\s+mt-3)?">/).slice(1);
  for (const block of blocks) {
    const title = stripTags(block.match(/itemprop="name">([\s\S]*?)<\/span>/)?.[1] || '');
    const href = block.match(/itemprop="url"\s+href="([^"]+)"/)?.[1] || '';
    const spans = [...block.matchAll(/<span itemprop="(?:startDate|endDate)">([\s\S]*?)<\/span>/g)].map((match) => stripTags(match[1]));
    const dateRangeText = spans.filter((value) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(value)).slice(0, 2).join(' إلى ');
    const timeValues = spans.filter((value) => /^\d{1,2}:\d{1,2}$/.test(value)).slice(0, 2);
    const dates = parseDmyDateRangeWithTimes(dateRangeText, timeValues[0], timeValues[1]);
    if (!title || !href || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const summary = stripTags(block.match(/<div><p>([\s\S]*?)<\/p><\/div>/)?.[1] || '');
    const badges = [...block.matchAll(/<span class="badge badge-info">([\s\S]*?)<\/span>/g)].map((match) => stripTags(match[1])).filter(Boolean);
    const imageSrc = block.match(/<img[^>]+src="([^"]+)"/i)?.[1] || '';
    const url = resolveUrl(href, source.url);
    const imageUrl = imageSrc ? resolveUrl(imageSrc, source.url) : '';
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: summary || `فعالية رسمية من غرفة مكة. التاريخ المعلن: ${dateRangeText}.`,
      city: 'Makkah',
      venue: 'Makkah Chamber',
      category: badges.find((badge) => !/حضوري|عن بعد|افتراضي/.test(badge)) || inferChamberCategory(title, summary),
      raw_date_text: [dateRangeText, ...timeValues].filter(Boolean).join(' '),
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      attendance_mode: badges.some((badge) => /عن بعد|افتراضي/.test(badge)) ? 'online' : 'in-person',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      richness_score: calculateRichnessScore({ title, summary, city: 'Makkah', venue: 'Makkah Chamber', category: inferChamberCategory(title, summary), image_url: imageUrl, attendance_mode: 'in-person', language: 'ar' }),
      language: 'ar',
      ...dates
    });
  }
  return items;
}

function uquClock(hourValue, minuteValue, period = '') {
  let hour = Number(hourValue);
  const minute = Number(minuteValue);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return '';
  if (/مساء|pm/i.test(period) && hour < 12) hour += 12;
  if (/صباح|am/i.test(period) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function extractUmmAlQuraEventDetail(detailHtml, source, url) {
  const text = stripTags(detailHtml);
  const title = cleanTitle(detailHtml.match(/<h1 class="text-2xl font-bold[^>]*>\s*([\s\S]*?)\s*<\/h1>/i)?.[1] || '');
  const startMatch = text.match(/تبدأ في:\s*(20\d{2})\/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2}):(\d{2})\s*-\s*(صباحاً|مساءً|صباحا|مساء|AM|PM)/i);
  const durationDays = Math.max(1, Number(text.match(/المدة:\s*(\d+)\s*يوم/)?.[1] || 1));
  if (!title || !startMatch) return null;
  const clock = uquClock(startMatch[4], startMatch[5], startMatch[6]);
  if (!clock) return null;
  const startDate = `${startMatch[1]}-${String(startMatch[2]).padStart(2, '0')}-${String(startMatch[3]).padStart(2, '0')}`;
  const startsAt = `${startDate}T${clock}:00+03:00`;
  const endDate = saudiDateOnlyOffset(startDate, durationDays - 1);
  const endsAt = durationDays === 1 ? addHoursToSaudiDateTime(startsAt, 2) : `${endDate}T18:00:00+03:00`;
  const summary = stripTags(detailHtml.match(/<div\s+class="mb-8 text-base text-justify[^\"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/i)?.[1] || '');
  const registrationHref = detailHtml.match(/href="([^"]*\/App\/Enrollments\/register\?event=[^"]+)"/i)?.[1] || '';
  const imageCandidate = metaContent(detailHtml, 'og:image');
  const imageUrl = isUsefulImageUrl(imageCandidate) ? resolveUrl(imageCandidate, url) : '';
  const attendanceMode = /عن بعد|افتراضي|online/i.test(text) ? 'online' : 'in-person';
  const city = attendanceMode === 'online' ? 'Online' : 'Makkah';
  const venue = attendanceMode === 'online' ? 'Online' : 'Umm Al-Qura University';
  return {
    title,
    url,
    organizer: source.owner,
    summary: summary.slice(0, 700) || `دورة أو فعالية رسمية من جامعة أم القرى في مكة المكرمة.`,
    city,
    venue,
    category: 'education training',
    raw_date_text: `${startMatch[0]} · ${durationDays} يوم`,
    starts_at: startsAt,
    ends_at: endsAt,
    ...(registrationHref ? { registration_url: resolveUrl(registrationHref, url) } : {}),
    ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
    attendance_mode: attendanceMode,
    confidence: 'official',
    review_status: 'ready-for-review',
    publication_gate: 'duplicate-review',
    verification_method: 'official-event-detail-explicit-start-duration',
    date_precision: 'explicit-start-duration',
    time_precision: 'exact-start-estimated-end',
    language: 'ar',
    tags: ['Umm Al-Qura University', 'Makkah', 'training'],
    richness_score: calculateRichnessScore({ title, summary, city, venue, category: 'education training', image_url: imageUrl, registration_url: registrationHref, attendance_mode: attendanceMode, language: 'ar' })
  };
}

async function extractUmmAlQuraEvents(html, source) {
  const urls = [...new Set([...String(html).matchAll(/href="(https:\/\/uqu\.edu\.sa\/App\/Events\/\d+)"/gi)].map((match) => match[1]))].slice(0, 24);
  const items = [];
  for (const url of urls) {
    try {
      const detailHtml = await fetchText(url, { 'accept-language': 'ar-SA,ar;q=0.9,en;q=0.8' });
      const item = extractUmmAlQuraEventDetail(detailHtml, source, url);
      if (item) items.push(item);
    } catch {
      // A single stale detail page must not prevent the official listing from refreshing.
    }
  }
  return items;
}

function extractMadinahChamberPayload(payloadText, source) {
  let payload;
  try { payload = JSON.parse(payloadText); } catch { return []; }
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    const title = cleanTitle(row?.title || '');
    const startsAt = dateTimeFromParts(row?.eventDate, row?.eventDate, '09:00');
    const endsAt = addHoursToSaudiDateTime(startsAt, 2);
    if (!title || !startsAt || !endsAt || !row?.eventId) continue;
    const key = `${row.eventId}|${startsAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const summaryHtml = row.summery || row.paragraph1 || '';
    const summary = stripTags(summaryHtml);
    const registrationHref = summaryHtml.match(/href=["']([^"']+)["']/i)?.[1] || '';
    const attendanceMode = /عن بعد|افتراضي|virtual|online|teams\.microsoft/i.test(`${row.location || ''} ${summaryHtml}`) ? 'online' : 'in-person';
    const city = attendanceMode === 'online' ? 'Online' : 'Madinah';
    const venue = attendanceMode === 'online' ? 'Online' : (stripTags(row.location || '') || 'Madinah Chamber');
    const imageFile = row.imageUrl || row.thmImageUrl || '';
    const imageUrl = imageFile ? `https://services.mi.org.sa/upload/events/main/${encodeURIComponent(imageFile)}` : '';
    const url = `https://www.mcci.org.sa/Event/eventDetails?circular=${encodeURIComponent(row.eventId)}`;
    items.push({
      title,
      url,
      organizer: stripTags(row.organisers || '') || source.owner,
      summary: summary.slice(0, 700) || `فعالية رسمية من غرفة المدينة المنورة.`,
      city,
      venue,
      category: stripTags(row.type || '') || inferChamberCategory(title, summary),
      raw_date_text: row.eventDate,
      starts_at: startsAt,
      ends_at: endsAt,
      ...(registrationHref ? { registration_url: resolveUrl(registrationHref, url) } : {}),
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      attendance_mode: attendanceMode,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      verification_method: 'official-public-json-api',
      date_precision: 'api-datetime',
      time_precision: 'exact-start-estimated-end',
      language: 'ar',
      tags: ['Madinah Chamber', stripTags(row.type || ''), 'business'].filter(Boolean),
      richness_score: calculateRichnessScore({ title, summary, city, venue, category: row.type, image_url: imageUrl, registration_url: registrationHref, attendance_mode: attendanceMode, language: 'ar' })
    });
  }
  return items;
}

async function extractMadinahChamberEvents(payloadText, source) {
  let firstPayload;
  try { firstPayload = JSON.parse(payloadText); } catch { return []; }
  const rows = Array.isArray(firstPayload?.data) ? [...firstPayload.data] : [];
  if (!collectEndedEvents) {
    return extractMadinahChamberPayload(JSON.stringify({ data: rows }), source);
  }
  const totalPages = Math.min(60, Math.max(1, Number(firstPayload?.totalPages || 1)));
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    try {
      const pageText = await fetchText(`https://services.mi.org.sa/api/events?PageNumber=${pageNumber}&PageSize=100`, {
        accept: 'application/json',
        referer: source.url
      });
      const pagePayload = JSON.parse(pageText);
      if (Array.isArray(pagePayload?.data)) rows.push(...pagePayload.data);
    } catch {
      // Keep the successfully fetched pages; the next six-hour run will retry the gap.
    }
  }
  if (rows.length) writeAuxiliarySnapshot(source, 'all-events-pages', JSON.stringify({ data: rows }, null, 2), 'json');
  return extractMadinahChamberPayload(JSON.stringify({ data: rows }), source);
}

function extractMadinahArchitectureFestival(html, source) {
  if (!/Madinah International\s+Architecture Festival|مهرجان المدينة المنورة الدولي للعمارة/i.test(html)) return [];
  const dateText = stripTags(html).match(/(?:Festival Date\s*)?(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i)?.[1] || '';
  const dates = parseEnglishDateRange(dateText);
  if (!dates) return [];
  const imagePath = html.match(/src="([^"]*competition-1\.[^"]+\.jpg)"/i)?.[1] || '';
  const imageUrl = imagePath ? resolveUrl(imagePath, source.url) : '';
  const title = 'مهرجان المدينة المنورة الدولي للعمارة 2026';
  const venue = 'Madinah';
  const summary = 'مهرجان ومعرض نهائي رسمي تنظمه هيئة تطوير منطقة المدينة المنورة، تعرض خلاله الفرق المختارة أعمالها ويُعلن الفائزون في المسابقة الدولية للتصميم.';
  return [{
    title,
    url: source.url,
    organizer: source.owner,
    summary,
    city: 'Madinah',
    venue,
    category: 'architecture design festival',
    raw_date_text: dateText,
    starts_at: dates.starts_at,
    ends_at: dateTimeFromParts(dates.ends_at, '21:00', '21:00'),
    ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: source.url } : {}),
    attendance_mode: 'in-person',
    confidence: 'official',
    review_status: 'ready-for-review',
    publication_gate: 'duplicate-review',
    verification_method: 'official-event-page-explicit-date',
    date_precision: 'explicit-date',
    time_precision: 'date-only',
    language: 'ar',
    tags: ['Madinah', 'architecture', 'design', 'festival'],
    richness_score: calculateRichnessScore({ title, summary, city: 'Madinah', venue, category: 'architecture design festival', image_url: imageUrl, attendance_mode: 'in-person', language: 'ar' })
  }];
}

function parseHayyJameelDateRange(value) {
  const text = stripTags(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const match = text.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\s*-\s*([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})/i);
  if (!match) return parseEnglishDateRange(text);
  const startMonth = monthIndex(match[1]);
  const startDay = Number(match[2]);
  const startYear = Number(match[3]);
  const endMonth = monthIndex(match[4]);
  const endDay = Number(match[5]);
  const endYear = Number(match[6]);
  if (!Number.isInteger(startMonth) || !Number.isInteger(endMonth) || !startDay || !endDay) return null;
  return {
    starts_at: dateWithTime(startYear, startMonth, startDay),
    ends_at: dateWithTime(endYear, endMonth, endDay, '18:00:00')
  };
}

function extractHayyJameelCards(html, source) {
  const cards = [...String(html).matchAll(/<li class="YESY mix-target([\s\S]*?)<\/li>/gi)].map((match) => match[0]);
  const items = [];
  const seen = new Set();
  for (const card of cards) {
    if (!/\b(?:current|up-coming)\b/i.test(card) || /\bpast\b/i.test(card)) continue;
    const title = stripTags(card.match(/<h3><a[^>]+title="([^"]+)"/i)?.[1] || '').trim();
    const href = card.match(/<h3><a[^>]+href="([^"]+)"/i)?.[1] || card.match(/<a[^>]+href="([^"]+)"[^>]+rel="bookmark"/i)?.[1] || '';
    const category = cleanTitle(card.match(/<h5>([\s\S]*?)<\/h5>/i)?.[1] || '') || 'culture arts';
    const dateText = stripTags(card.match(/<p class="uk-margin-medium-top">([\s\S]*?)<\/p>/i)?.[1] || '');
    const dates = parseHayyJameelDateRange(dateText);
    const imageCandidate = card.match(/<img[^>]+data-src="([^"]+)"/i)?.[1] || card.match(/<img[^>]+src="([^"]+)"/i)?.[1] || '';
    const url = resolveUrl(href, source.url);
    if (!title || !url || !dates) continue;
    const key = `${url}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      preserve_full_title: true,
      url,
      organizer: source.owner,
      summary: `فعالية ثقافية رسمية من تقويم حي جميل في جدة. التاريخ المعلن: ${dateText}.`,
      city: 'Jeddah',
      venue: 'Hayy Jameel',
      category,
      raw_date_text: dateText,
      ...(imageCandidate ? { image_url: resolveUrl(imageCandidate, url), image_alt: title, image_source_url: url } : {}),
      attendance_mode: 'in-person',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      verification_method: 'official-whats-on-listing',
      date_precision: 'explicit-date-range',
      time_precision: 'date-only',
      language: 'en',
      tags: ['Hayy Jameel', category, 'Jeddah'].filter(Boolean),
      ...dates
    });
  }
  return items;
}

function hayyJameelClock(hourValue, minuteValue = '0', meridiem = '') {
  let hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return '';
  if (/pm/i.test(meridiem) && hour < 12) hour += 12;
  if (/am/i.test(meridiem) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function extractHayyJameelSessions(detailSection, listing) {
  const year = Number(String(listing.starts_at || '').slice(0, 4));
  const lines = String(detailSection || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .split('\n')
    .map((line) => stripTags(line))
    .filter(Boolean);
  const sessions = [];
  let currentDate = '';
  for (const line of lines) {
    const dateMatch = line.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*,?\s*([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*,\s*(20\d{2}))?/i);
    if (dateMatch) {
      const month = monthIndex(dateMatch[1]);
      const day = Number(dateMatch[2]);
      const lineYear = Number(dateMatch[3] || year);
      if (Number.isInteger(month) && day && lineYear) currentDate = dateWithTime(lineYear, month, day).slice(0, 10);
      continue;
    }
    const timeMatch = line.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!currentDate || !timeMatch) continue;
    const endMeridiem = timeMatch[6];
    const startClock = hayyJameelClock(timeMatch[1], timeMatch[2], timeMatch[3] || endMeridiem);
    const endClock = hayyJameelClock(timeMatch[4], timeMatch[5], endMeridiem);
    if (!startClock || !endClock) continue;
    const startsAt = `${currentDate}T${startClock}+03:00`;
    let endsAt = `${currentDate}T${endClock}+03:00`;
    if (Date.parse(endsAt) <= Date.parse(startsAt)) endsAt = addHoursToSaudiDateTime(startsAt, 2);
    sessions.push({
      id: `${toSlug(listing.title)}-${currentDate}-${startClock.slice(0, 5).replace(':', '')}`,
      title: listing.title,
      starts_at: startsAt,
      ends_at: endsAt,
      room: listing.venue || 'Hayy Jameel',
      session_type: 'official-program-session',
      source_url: listing.url
    });
  }
  return sessions;
}

function extractHayyJameelDetail(detailHtml, listing, source) {
  const detailSection = detailHtml.match(/<nav class="side-nav uk-visible@m"[\s\S]*?<\/nav>/i)?.[0] || '';
  const contentSection = detailHtml.match(/<div class="entry-content">([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] || '';
  const location = stripTags(detailSection.match(/Location:\s*<br\s*\/?>([\s\S]*?)<\/p>/i)?.[1] || '');
  const registrationHref = detailSection.match(/<a[^>]+href="([^"]+)"[^>]*>\s*(?:Register|Book|Tickets?)/i)?.[1] || '';
  const highResolutionImage = [...detailHtml.matchAll(/<img[^>]+data-src="([^"]+)"/gi)]
    .map((match) => resolveUrl(match[1], listing.url))
    .find((url) => /(?:1100x500|scaled|1400x650)/i.test(url));
  const fullSummary = stripTags(contentSection) || listing.summary;
  const summary = readableExcerpt(fullSummary, 520);
  const venue = location ? `Hayy Jameel - ${location}` : listing.venue;
  const sessions = extractHayyJameelSessions(detailSection, { ...listing, venue });
  const startsAt = sessions[0]?.starts_at || listing.starts_at;
  const endsAt = sessions.at(-1)?.ends_at || listing.ends_at;
  return {
    ...listing,
    organizer: source.owner,
    summary,
    rich_summary: readableExcerpt(fullSummary, 1000),
    venue,
    venue_address: venue,
    starts_at: startsAt,
    ends_at: endsAt,
    ...(registrationHref ? { registration_url: resolveUrl(registrationHref, listing.url) } : {}),
    ...(highResolutionImage ? { image_url: highResolutionImage, image_alt: listing.title, image_source_url: listing.url } : {}),
    ...(sessions.length ? { sessions, sessions_count: sessions.length, live_schedule_ready: true, extracted_sessions_count: sessions.length } : {}),
    verification_method: sessions.length ? 'official-detail-explicit-session-times' : 'official-detail-date-range',
    time_precision: sessions.length ? 'official-session-times' : listing.time_precision,
    richness_score: calculateRichnessScore({ ...listing, summary, city: 'Jeddah', venue, image_url: highResolutionImage || listing.image_url, registration_url: registrationHref, attendance_mode: 'in-person', language: 'en' })
  };
}

async function extractHayyJameelEvents(html, source) {
  const listings = extractHayyJameelCards(html, source);
  const items = [];
  for (const listing of listings.slice(0, 30)) {
    try {
      const detailHtml = await fetchText(listing.url, { 'accept-language': 'en-US,en;q=0.9,ar;q=0.8' });
      items.push(extractHayyJameelDetail(detailHtml, listing, source));
    } catch {
      items.push(listing);
    }
  }
  return items;
}

function extractQassimChamberEvents(html, source) {
  const items = [];
  const seen = new Set();
  const blocks = html.split(/<div class="card h-100"/).slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/<h4 class="card-title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const title = stripTags(titleMatch?.[2] || '');
    const url = resolveUrl(titleMatch?.[1] || '', source.url);
    const dateText = stripTags(block.match(/<h6 class="card-subtitle">([\s\S]*?)<\/h6>/)?.[1] || '');
    const dates = parseArabicMonthDateTime(dateText);
    if (!title || !url || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const summary = stripTags(block.match(/<p class="card-text\s*">([\s\S]*?)<\/p>\s*<\/p>/)?.[1] || title);
    const imageSrc = block.match(/background-image:\s*url\('([^']+)'\)/i)?.[1] || '';
    const imageUrl = imageSrc ? resolveUrl(imageSrc, source.url) : '';
    const ended = /الفعالية انتهت/.test(block);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: summary || `فعالية رسمية من غرفة القصيم. التاريخ المعلن: ${dateText}.`,
      city: 'Buraydah',
      venue: 'Qassim Chamber',
      category: inferChamberCategory(title, summary),
      raw_date_text: dateText,
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      confidence: 'official',
      review_status: ended ? 'evidence-captured' : 'ready-for-review',
      publication_gate: 'duplicate-review',
      attendance_mode: 'in-person',
      language: 'ar',
      richness_score: calculateRichnessScore({ title, summary, city: 'Buraydah', venue: 'Qassim Chamber', category: inferChamberCategory(title, summary), image_url: imageUrl, attendance_mode: 'in-person', language: 'ar' }),
      ...dates
    });
  }
  return items;
}

function isQassimUniversityPublicEvent(title = '') {
  return !/التحويل|تغيير التخصص|بداية الدراسة|نهاية الدراسة|تسجيل المقررات|حذف|إضافة|الانسحاب|الاعتذار|إجازة|الاختبارات|موعد صرف|آخر يوم|أخر يوم|اخر موعد|رصد الدرجات|احتساب المعدل|المعدل التراكمي|استقبال طلبات/i.test(title);
}

function qassimUniversityCategory(title = '') {
  if (/نادي صيفي|النادي الصيفي|برنامج صيفي/i.test(title)) return 'summer program';
  if (/ورشة/i.test(title)) return 'workshop';
  if (/ندوة|محاضرة|ملتقى|مؤتمر/i.test(title)) return 'university event';
  return 'public university event';
}

function parseQassimUniversityEvents(html = '', source = {}) {
  const items = [];
  const blocks = String(html).split(/<div class="jet-listing-grid__item\b/i).slice(1);
  for (const block of blocks) {
    const title = stripTags(block.match(/<h4 class="elementor-heading-title[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || '');
    const dateText = stripTags(block.match(/<h3 class="jet-listing-dynamic-field__content"[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || '');
    const timeText = stripTags(block.match(/jet-listing-dynamic-field__content"[^>]*>\s*(\d{1,2}:\d{2}\s*(?:صباح(?:ًا|ا)?|مساء(?:ً|ًا|ا)?))/i)?.[1] || '');
    const href = block.match(/href="([^"]*\/events\/[^"]+)"/i)?.[1] || '';
    const schedule = officialScheduleFromText(`${dateText} ${timeText}`);
    if (!title || !isQassimUniversityPublicEvent(title) || !href || !schedule) continue;
    const url = resolveUrl(href, source.url);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: `فعالية عامة مدرجة في تقويم جامعة القصيم. الموعد المعلن: ${dateText}${timeText ? `، ${timeText}` : ''}.`,
      city: 'Buraydah',
      venue: 'Qassim University',
      category: qassimUniversityCategory(title),
      raw_date_text: `${dateText} ${timeText}`.trim(),
      attendance_mode: 'in-person',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      verification_method: 'official-calendar-explicit-date',
      date_precision: schedule.date_precision,
      time_precision: schedule.time_precision,
      language: 'ar',
      starts_at: schedule.starts_at,
      ends_at: schedule.ends_at
    });
  }
  return items;
}

async function extractQassimUniversityEvents(html, source) {
  const items = parseQassimUniversityEvents(html, source);
  await Promise.all(items.slice(0, 20).map(async (item) => {
    try {
      const detailHtml = await fetchHtml({ ...source, collector_url: item.url });
      const enrichment = detailEnrichmentFromHtml(detailHtml, item.url, item.title);
      item.raw_snapshot_path = writeAuxiliarySnapshot(source, item.title, detailHtml);
      Object.assign(item, enrichment);
      if (enrichment.rich_summary) item.summary = enrichment.rich_summary;
      item.richness_score = calculateRichnessScore(item);
    } catch {
      item.richness_score = calculateRichnessScore(item);
    }
  }));
  return items;
}

function parseJoufUniversitySummerProgram(detailHtml = '', source = {}, url = '', publishedDate = '') {
  const text = stripTags(detailHtml).replace(/\s+/g, ' ');
  const titleYear = Number(text.match(/البرنامج الصيفي[^.]{0,120}\b(20\d{2})\b/)?.[1] || publishedDate.slice(0, 4));
  const monthRange = text.match(/يمتد\s+من\s+شهر\s+([\u0600-\u06ff]+)\s+حتى\s+نهاية\s+([\u0600-\u06ff]+)\s+(20\d{2})/);
  const startDate = String(publishedDate || '').match(/^(20\d{2})-(\d{2})-(\d{2})/)?.[0] || '';
  const endMonth = monthRange ? monthIndex(monthRange[2]) : null;
  const year = Number(monthRange?.[3] || titleYear);
  if (!startDate || !Number.isInteger(endMonth) || !year || !/تطلق\s+جامعة\s+الجوف\s+البرنامج الصيفي/.test(text)) return null;
  const endDay = new Date(Date.UTC(year, endMonth + 1, 0)).getUTCDate();
  const contentImage = [...detailHtml.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi)]
    .map((match) => resolveUrl(decodeHtml(match[1]), url))
    .find((value) => /\/sites\/default\/files\/styles\/(?:webp|large)\/public\//i.test(value));
  const imageUrl = contentImage
    ? contentImage.replace(/\/styles\/(?:webp|large)\/public\//i, '/').split('?')[0]
    : firstUsefulImageFromHtml(detailHtml, url);
  const summaryMatch = text.match(/تطلق\s+جامعة\s+الجوف\s+البرنامج الصيفي[\s\S]{0,900}?(?=ويأتي البرنامج|وأكد|ويشتمل)/);
  const summary = stripTags(summaryMatch?.[0] || metaContent(detailHtml, 'description') || `برنامج صيفي رسمي من جامعة الجوف.`).slice(0, 900);
  return {
    title: `البرنامج الصيفي بجامعة الجوف ${year}`,
    url,
    organizer: source.owner,
    summary,
    rich_summary: summary,
    city: 'Sakaka',
    venue: 'Jouf University',
    category: 'summer program',
    raw_date_text: `${startDate} - نهاية ${monthRange[2]} ${year}`,
    ...(imageUrl ? { image_url: imageUrl, image_alt: `البرنامج الصيفي بجامعة الجوف ${year}`, image_source_url: url } : {}),
    attendance_mode: 'in-person',
    confidence: 'official',
    review_status: 'ready-for-review',
    publication_gate: 'duplicate-review',
    verification_method: 'official-launch-date-and-explicit-month-range',
    date_precision: 'official-month-window',
    time_precision: 'date-only',
    language: 'ar',
    highlights: ['أكثر من 50 برنامجًا وفعالية نوعية', 'أكثر من 210 ساعات تدريبية', 'مسارات معرفية وتدريبية وتطوعية ورياضية'],
    starts_at: `${startDate}T00:00:00+03:00`,
    ends_at: `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T23:59:00+03:00`
  };
}

async function extractJoufUniversityPrograms(html, source) {
  const items = [];
  const blocks = String(html).split(/<div class="views-row">/i).slice(1);
  for (const block of blocks) {
    if (!/البرنامج الصيفي|summer-program/i.test(block)) continue;
    const href = block.match(/<a href="([^"]+)"[^>]*hreflang="ar"/i)?.[1]
      || block.match(/onclick="location\.href=&#039;([^&]+)&#039;"/i)?.[1]
      || '';
    const publishedDate = block.match(/<time datetime="(20\d{2}-\d{2}-\d{2})/i)?.[1] || '';
    if (!href || !publishedDate) continue;
    const url = resolveUrl(href, source.url);
    try {
      const detailHtml = await fetchHtml({ ...source, collector_url: url });
      const item = parseJoufUniversitySummerProgram(detailHtml, source, url, publishedDate);
      if (!item) continue;
      item.raw_snapshot_path = writeAuxiliarySnapshot(source, item.title, detailHtml);
      item.richness_score = calculateRichnessScore(item);
      items.push(item);
    } catch {
      // The official detail is required because the listing alone lacks the end month.
    }
  }
  return items;
}

function extractAbhaChamberEvents(html, source) {
  const items = [];
  const seen = new Set();
  const blocks = html.split(/<div class="events-block">/).slice(1);
  for (const block of blocks) {
    const title = stripTags(block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || '');
    const dateText = stripTags(block.match(/<h6[^>]*>([\s\S]*?)<\/h6>/i)?.[1] || '');
    const dates = parseDmyDateRangeWithTimes(dateText);
    const href = block.match(/href="([^"]*\/Events\/Details\/\d+)"/i)?.[1] || '';
    const url = resolveUrl(href, source.url);
    if (!title || !href || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const summary = stripTags(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
    const imageSrc = block.match(/<img[^>]+src="([^"]+)"/i)?.[1] || '';
    const imageAlt = stripTags(block.match(/<img[^>]+alt="([^"]*)"/i)?.[1] || title);
    const imageUrl = imageSrc ? resolveUrl(imageSrc, source.url) : '';
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: summary || `فعالية رسمية من غرفة أبها. التاريخ المعلن: ${dateText}.`,
      city: 'Abha',
      venue: 'Abha Chamber',
      category: inferChamberCategory(title, summary),
      raw_date_text: dateText,
      ...(imageUrl ? { image_url: imageUrl, image_alt: imageAlt || title, image_source_url: url } : {}),
      confidence: 'official',
      review_status: 'evidence-captured',
      publication_gate: 'duplicate-review',
      attendance_mode: 'in-person',
      language: 'ar',
      richness_score: calculateRichnessScore({ title, summary, city: 'Abha', venue: 'Abha Chamber', category: inferChamberCategory(title, summary), image_url: imageUrl, attendance_mode: 'in-person', language: 'ar' }),
      ...dates
    });
  }
  return items;
}

const arabicMonthPattern = 'يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر';

function normalizedArabicDigits(value = '') {
  return String(value || '').replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
}

function officialClockFromText(value = '', fallback = '09:00') {
  const text = normalizedArabicDigits(value);
  const matches = [...text.matchAll(/(?<!\d)(\d{1,2})(?::(\d{2}))?\s*(صباح(?:اً)?|مساء(?:ً)?|[صم])/g)];
  for (const match of matches) {
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (hour < 1 || hour > 12 || minute > 59) continue;
    if (/مساء|م/.test(match[3]) && hour < 12) hour += 12;
    if (/صباح|ص/.test(match[3]) && hour === 12) hour = 0;
    return { value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, precision: 'exact' };
  }
  return { value: fallback, precision: 'date-only-defaulted' };
}

function addClockHours(value = '09:00', hours = 2) {
  const [hour, minute] = value.split(':').map(Number);
  const total = Math.min(1439, hour * 60 + minute + hours * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function officialScheduleFromText(value = '') {
  const text = normalizedArabicDigits(stripTags(value));
  const match = text.match(new RegExp(`(?<!\\d)(\\d{1,2})\\s*(${arabicMonthPattern})\\s*(20\\d{2})`));
  if (!match) return null;
  const clock = officialClockFromText(text, /مساء/.test(text) ? '18:00' : '09:00');
  const endClock = addClockHours(clock.value, 2);
  const dates = parseFlexibleDateRange(`${match[1]} ${match[2]} ${match[3]}`, {
    start_time: `${clock.value}:00`,
    end_time: `${endClock}:00`
  });
  return dates ? {
    ...dates,
    raw_date_text: match[0],
    date_precision: 'official-text',
    time_precision: clock.precision,
    weekday_verified: false
  } : null;
}

function tabukActivityBlocks(html = '') {
  return String(html).split(/<div class="\s*card-book row col\s*">/).slice(1);
}

function extractTabukChamberEvents(html, source) {
  const items = [];
  const seen = new Set();
  for (const block of tabukActivityBlocks(html)) {
    const href = block.match(/<a href="([^"]*\/activities\/\d+)"/i)?.[1] || '';
    const title = stripTags(block.match(/<h6>([\s\S]*?)<\/h6>/i)?.[1] || '');
    const body = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean)
      .join(' ');
    const schedule = officialScheduleFromText(body);
    if (!href || !title || !schedule) continue;
    const key = `${href}|${schedule.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const imageSrc = block.match(/<img[^>]+src="([^"]+)"/i)?.[1] || '';
    const imageUrl = imageSrc ? resolveUrl(imageSrc.replace(/^http:/i, 'https:'), source.url) : '';
    const online = /عن بعد|افتراضي|افتراضية|ZOOM|الاتصال المرئي/i.test(body);
    items.push({
      title,
      url: resolveUrl(href, source.url),
      organizer: source.owner,
      summary: body || `فعالية رسمية من غرفة تبوك. ${schedule.raw_date_text}.`,
      city: online ? 'Online' : 'Tabuk',
      venue: online ? 'Online' : 'Tabuk Chamber',
      category: inferChamberCategory(title, body),
      raw_date_text: schedule.raw_date_text,
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: resolveUrl(href, source.url) } : {}),
      attendance_mode: online ? 'online' : 'in-person',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      verification_method: 'official-page-explicit-date',
      date_precision: schedule.date_precision,
      time_precision: schedule.time_precision,
      language: 'ar',
      richness_score: calculateRichnessScore({ title, summary: body, city: online ? 'Online' : 'Tabuk', venue: online ? 'Online' : 'Tabuk Chamber', category: inferChamberCategory(title, body), image_url: imageUrl, attendance_mode: online ? 'online' : 'in-person', language: 'ar' }),
      starts_at: schedule.starts_at,
      ends_at: schedule.ends_at
    });
  }
  return items;
}

function saudiDateOnlyOffset(value = '', days = 0) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function extractNajranMunicipalityEvents(html, source) {
  const items = [];
  const blocks = String(html).split(/<dga-card\b/i).slice(1);
  for (const block of blocks) {
    const card = block.split(/<\/dga-card>/i)[0] || '';
    const title = stripTags(card.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || '');
    const body = stripTags(card.match(/<span class="text-md-regular[^"]*"[\s\S]*?>([\s\S]*?)<\/span>/i)?.[1] || '');
    const combined = `${title} ${body}`;
    if (!/صيف(?:نا هايل| نجران)\s*2026/i.test(combined) || !/30\s*(?:يوم|يوماً|يومًا)/.test(combined)) continue;
    const dateText = stripTags(card.match(/<span class="text-sm-semibold[^"]*">([\s\S]*?)<\/span>/i)?.[1] || '');
    const published = officialScheduleFromText(dateText);
    if (!published) continue;
    const startDate = saudiDateOnlyOffset(published.starts_at, /غد[ًاا]/.test(combined) ? 1 : 0);
    const endDate = saudiDateOnlyOffset(startDate, 29);
    if (!startDate || !endDate) continue;
    const href = card.match(/data-url="([^"]+)"/i)?.[1] || source.url;
    const imageSrc = card.match(/\bimage="([^"]+)"/i)?.[1] || '';
    const url = resolveUrl(href, source.url);
    const imageUrl = imageSrc ? resolveUrl(imageSrc, source.url) : '';
    items.push({
      title: 'مهرجان صيف نجران 2026 «صيفنا هايل»',
      url,
      organizer: source.owner,
      summary: body,
      city: 'Najran',
      venue: '11 موقعًا في مدينة نجران',
      category: 'entertainment families',
      raw_date_text: `${dateText} + غدًا + 30 يومًا`,
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      attendance_mode: 'in-person',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      verification_method: 'official-announcement-relative-date',
      date_precision: 'official-day-window',
      time_precision: 'date-only',
      language: 'ar',
      tags: ['Najran Summer', 'families', 'culture', 'entertainment'],
      richness_score: calculateRichnessScore({ title, summary: body, city: 'Najran', venue: '11 موقعًا في مدينة نجران', category: 'entertainment families', image_url: imageUrl, attendance_mode: 'in-person', language: 'ar' }),
      starts_at: `${startDate}T00:00:00+03:00`,
      ends_at: `${endDate}T23:59:00+03:00`
    });
    break;
  }
  return items;
}

function northernBordersRows(payload = '') {
  try {
    const parsed = JSON.parse(payload);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function extractNorthernBordersChamberEvents(payload, source) {
  const items = [];
  const seen = new Set();
  const rows = northernBordersRows(payload).slice(0, Math.max(1, Number(source.ocr_limit || 10)));
  for (const row of rows) {
    const title = stripTags(row?.title?.rendered || row?.title || '');
    const url = row?.link || '';
    const body = stripTags(row?.content?.rendered || row?.excerpt?.rendered || '');
    const imageUrl = row?._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
    let schedule = officialScheduleFromText(body);
    let ocrSnapshot = '';
    if (!schedule && imageUrl && !source.disable_ocr) {
      schedule = await ocrRemotePoster(imageUrl, { default_start_time: '18:00', duration_hours: 2 });
      if (schedule?.raw_text) ocrSnapshot = writeAuxiliarySnapshot(source, `${row.id || title}-poster-ocr`, schedule.raw_text, 'txt');
    }
    if (!title || !url || !schedule) continue;
    const key = `${url}|${schedule.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const online = /عن بعد|افتراضي|افتراضية|ZOOM|الاتصال المرئي/i.test(`${body} ${schedule.raw_text || ''}`);
    const city = /رفحاء/.test(`${title} ${body}`) ? 'Rafha' : 'Arar';
    const exactTime = schedule.time_precision === 'exact';
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: body || `فعالية رسمية من غرفة الحدود الشمالية، استُخرج موعدها من الملصق الرسمي مع تحقق يوم الأسبوع.`,
      city: online ? 'Online' : city,
      venue: online ? 'Online' : 'Northern Borders Chamber',
      category: inferChamberCategory(title, body),
      raw_date_text: schedule.raw_date_text || schedule.starts_at,
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      ...(ocrSnapshot ? { raw_snapshot_path: ocrSnapshot } : {}),
      attendance_mode: online ? 'online' : 'in-person',
      confidence: 'official',
      review_status: exactTime ? 'ready-for-review' : 'source-evidence',
      publication_gate: exactTime ? 'duplicate-review' : 'source-evidence',
      verification_method: schedule.weekday_verified ? 'official-poster-ocr-weekday-verified' : 'official-page-explicit-date',
      date_precision: schedule.date_precision,
      time_precision: schedule.time_precision,
      language: 'ar',
      tags: ['official poster', 'Northern Borders'],
      richness_score: calculateRichnessScore({ title, summary: body, city: online ? 'Online' : city, venue: online ? 'Online' : 'Northern Borders Chamber', category: inferChamberCategory(title, body), image_url: imageUrl, attendance_mode: online ? 'online' : 'in-person', language: 'ar' }),
      starts_at: schedule.starts_at,
      ends_at: schedule.ends_at
    });
  }
  return items;
}

function jazanApiEndpoint(month, year) {
  return `https://jazancci.org.sa/api/events/calendar/${month}/${year}`;
}

function jazanMonthsToFetch(referenceDate = now, options = {}) {
  const currentMonth = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  const futureMonths = Math.max(1, Number(options.futureMonths ?? process.env.EVENTLIVE_JAZAN_FUTURE_MONTHS ?? 12));
  const historyMode = String(
    options.historyMode
      ?? process.env.EVENTLIVE_JAZAN_HISTORY_MODE
      ?? (collectEndedEvents ? 'rolling' : 'none')
  ).toLowerCase();
  const historyBatchSize = Math.max(1, Number(options.historyBatchSize ?? process.env.EVENTLIVE_JAZAN_HISTORY_MONTHS_PER_RUN ?? 2));
  const activeMonths = [];
  for (let offset = 0; offset <= futureMonths; offset += 1) {
    const cursor = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + offset, 1));
    activeMonths.push({ month: cursor.getUTCMonth() + 1, year: cursor.getUTCFullYear() });
  }

  if (['none', 'off', 'disabled', 'future-only'].includes(historyMode)) return activeMonths;

  const historicalMonths = [];
  for (let year = minEndedYear; year <= currentMonth.getUTCFullYear(); year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const cursor = new Date(Date.UTC(year, month - 1, 1));
      if (cursor >= currentMonth) break;
      historicalMonths.push({ month, year });
    }
  }
  if (!historicalMonths.length) return activeMonths;
  if (historyMode === 'full') return [...historicalMonths, ...activeMonths];

  const sixHourSlot = Math.floor(referenceDate.getTime() / (6 * 60 * 60 * 1000));
  const startIndex = (sixHourSlot * historyBatchSize) % historicalMonths.length;
  const rollingHistory = Array.from({ length: Math.min(historyBatchSize, historicalMonths.length) }, (_, index) => (
    historicalMonths[(startIndex + index) % historicalMonths.length]
  ));
  return [...activeMonths, ...rollingHistory];
}

function parseJazanApiRows(payload = '') {
  try {
    const parsed = JSON.parse(String(payload || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function titleValue(value) {
  if (typeof value === 'string') return stripTags(value);
  if (value && typeof value === 'object') {
    return stripTags(value.ar || value.en || Object.values(value).find(Boolean) || '');
  }
  return '';
}

async function extractJazanChamberEvents(payload, source) {
  const rows = [];
  const seenEndpoints = new Set();
  const pushRows = (text) => {
    rows.push(...parseJazanApiRows(text));
  };

  pushRows(payload);
  if (source.collector_url) seenEndpoints.add(source.collector_url);
  seenEndpoints.add(jazanApiEndpoint(now.getUTCMonth() + 1, now.getUTCFullYear()));

  if (!source.disable_monthly_fetch) {
    const targets = jazanMonthsToFetch()
      .map(({ month, year }) => jazanApiEndpoint(month, year))
      .filter((endpoint) => !seenEndpoints.has(endpoint));
    for (let offset = 0; offset < targets.length; offset += 4) {
      const batch = targets.slice(offset, offset + 4);
      batch.forEach((endpoint) => seenEndpoints.add(endpoint));
      const payloads = await Promise.all(batch.map(async (endpoint) => {
        try {
          return await fetchHtml({ ...source, collector_url: endpoint });
        } catch {
          return '';
        }
      }));
      payloads.filter(Boolean).forEach(pushRows);
    }
  }

  const items = [];
  const seen = new Set();
  for (const row of rows) {
    if (row?.published === false) continue;
    const title = titleValue(row?.title);
    const dates = parseStructuredDateRange(row?.startAt, row?.endAt || row?.startAt);
    const url = row?.url || (row?.slug ? `https://events.jazancci.org.sa/ar/events/${row.slug}` : source.url);
    if (!title || !dates || !url) continue;
    const key = `${row?.id || url}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const description = stripTags(row?.description?.ar || row?.description?.en || '');
    const location = stripTags(row?.location || '');
    const imageUrl = row?.cover?.url && isUsefulImageUrl(row.cover.url) ? row.cover.url : '';
    const attendanceMode = attendanceModeFromText(`${location} ${description}`);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: description || `فعالية رسمية من غرفة جازان. التاريخ المعلن: ${row?.startAt || ''}.`,
      city: 'Jazan',
      venue: location || (attendanceMode === 'online' ? 'Online' : 'Jazan Chamber'),
      category: inferChamberCategory(title, description),
      raw_date_text: [row?.startAt, row?.endAt].filter(Boolean).join(' - '),
      ...(imageUrl ? { image_url: imageUrl, image_alt: title, image_source_url: url } : {}),
      ...(attendanceMode ? { attendance_mode: attendanceMode } : {}),
      confidence: 'official',
      review_status: isPastCandidate(dates) ? 'evidence-captured' : 'ready-for-review',
      publication_gate: 'duplicate-review',
      language: 'ar',
      richness_score: calculateRichnessScore({
        title,
        summary: description,
        city: 'Jazan',
        venue: location || 'Jazan Chamber',
        category: inferChamberCategory(title, description),
        image_url: imageUrl,
        attendance_mode: attendanceMode || 'in-person',
        language: 'ar'
      }),
      ...dates
    });
  }
  return items;
}

function extractSdaiaCalendarCardItems(html, source) {
  const items = [];
  const seen = new Set();
  const cards = [...html.matchAll(/<a class="card h-100 card-border card-action"[\s\S]*?<\/a>/gi)].map((match) => match[0]);
  for (const card of cards) {
    const href = card.match(/href="([^"]*EventsDetails\.aspx\?EventID=\d+[^"]*)"/i)?.[1];
    const title = stripTags(
      card.match(/<h5 class="card-title">([\s\S]*?)<\/h5>/i)?.[1]
      || card.match(/title="([^"]+)"/i)?.[1]
      || ''
    );
    const dateText = stripTags(card.match(/<p class="text-sm-regular text-muted">([\s\S]*?)<\/p>/i)?.[1] || '');
    const organizer = stripTags(card.match(/Organizer:\s*([^<]+)/i)?.[1] || source.owner);
    const tags = [...card.matchAll(/<span class="badge badge-default">([\s\S]*?)<\/span>/gi)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean);
    const dates = parseEnglishDateRange(dateText);
    if (!href || !title || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url: resolveUrl(href, source.url),
      organizer,
      summary: `فعالية رسمية من SDAIA. التاريخ المعلن: ${dateText}.`,
      city: 'Riyadh',
      venue: 'SDAIA',
      category: tags[0] || 'AI and data',
      tags,
      raw_date_text: dateText,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  return items;
}

async function extractSdaiaCalendarEvents(html, source) {
  const cardItems = extractSdaiaCalendarCardItems(html, source);
  if (cardItems.length) return cardItems;

  const renderedHtml = await fetchBrowserRenderedHtml(source).catch(() => '');
  const renderedItems = renderedHtml ? extractSdaiaCalendarCardItems(renderedHtml, source) : [];
  if (renderedItems.length) return renderedItems;

  const items = [];
  const seen = new Set();
  if (items.length) return items;

  const detailLinks = [...html.matchAll(/href="([^"]*(?:EventsDetails|EventID|\/Events\/Pages\/)[^"]+)"/gi)]
    .map((match) => resolveUrl(match[1], source.url));
  for (const url of detailLinks) {
    const surroundingIndex = html.indexOf(url.replace(/^https?:\/\/[^/]+/, ''));
    const context = surroundingIndex >= 0
      ? html.slice(Math.max(0, surroundingIndex - 900), surroundingIndex + 1200)
      : '';
    const title = stripTags(
      context.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1]
      || context.match(/title="([^"]+)"/i)?.[1]
      || ''
    );
    const dateText = stripTags(context.match(/(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}|20\d{2}-\d{2}-\d{2})/)?.[1] || '');
    const dates = parseEnglishDateRange(dateText) || parseStructuredDateRange(dateText, dateText);
    if (!title || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url,
      summary: `فعالية رسمية من SDAIA. التاريخ المعلن: ${dateText}.`,
      city: 'Riyadh',
      venue: 'SDAIA',
      category: 'AI and data',
      raw_date_text: dateText,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  return items;
}

async function extractKaustEvents(_html, source) {
  const items = await extractKaustCentralEvents(source);
  try {
    const kauHtml = await fetchHtml({ ...source, collector_url: 'https://kau.edu.sa/en/events' });
    if (!source.skip_snapshot) writeAuxiliarySnapshot(source, 'kau-events', kauHtml);
    items.push(...extractKauEvents(kauHtml, source));
  } catch {
    // KAUST remains the primary university feed; KAU is an opportunistic official supplement.
  }
  return items;
}

async function extractKaustCentralEvents(source) {
  const apiUrl = 'https://kaustsmart-api.cfapps.eu20.hana.ondemand.com/api/eventsmanagement/event-list';
  const payload = {
    page: 1,
    pageSize: Math.max(maxPerSource * 3, 100),
    audienceTypeIds: [],
    categoryIds: [],
    subCategoryIds: [],
    departmentIds: [],
    startDate: now.toISOString().slice(0, 10),
    endDate: '',
    locationType: [],
    searchByName: ''
  };
  const response = await collectorFetch(apiUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: 'https://kaustcentral-eventscalendar-userwebsite.cfapps.eu20.hana.ondemand.com',
      referer: 'https://kaustcentral-eventscalendar-userwebsite.cfapps.eu20.hana.ondemand.com/dashboard',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`KAUST API HTTP ${response.status}`);
  const rawSnapshotPath = source.skip_snapshot
    ? ''
    : writeAuxiliarySnapshot(source, 'kaustcentral-event-list', text, 'json');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const rows = Array.isArray(data?.data?.events) ? data.data.events : [];
  const items = [];
  const seen = new Set();
  for (const event of rows) {
    if (event.eventStatus && event.eventStatus !== 'Published') continue;
    if (event.eventVisibility && event.eventVisibility !== 'Public') continue;
    const title = stripTags(event.eventName || '');
    const startsAt = dateTimeFromIsoDateAndClock(event.eventStartDate, event.eventStartTime, '09:00:00');
    const endsAt = dateTimeFromIsoDateAndClock(event.eventEndDate || event.eventStartDate, event.eventEndTime, '18:00:00');
    if (!title || !startsAt || !endsAt) continue;
    const url = `https://kaustcentral-eventscalendar-userwebsite.cfapps.eu20.hana.ondemand.com/dashboard/event-details/${event.eventsMasterId}`;
    const key = `${title}|${startsAt}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const location = stripTags(event.eventLocationName || event.eventLocationType || 'KAUST');
    const isVirtual = /virtual|online/i.test(`${event.eventLocationType} ${event.eventVirtualLink}`);
    items.push({
      title,
      url,
      organizer: event.organizerName || source.owner,
      summary: stripTags(event.description || `فعالية عامة من تقويم KAUST Central.`),
      city: isVirtual ? 'Online' : 'Thuwal',
      venue: isVirtual ? 'Online' : (location || 'KAUST'),
      category: inferKaustCategory(title, event.description),
      raw_date_text: [event.eventStartDate, event.eventStartTime, event.eventEndDate, event.eventEndTime].filter(Boolean).join(' '),
      raw_snapshot_path: rawSnapshotPath,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...{ starts_at: startsAt, ends_at: endsAt }
    });
  }
  return items;
}

function extractKauEvents(html, source) {
  const items = [];
  const pattern = /"children":"([^"]+)"[\s\S]{0,900}?"children":"(\d{2}\s+[A-Za-z]{3}\s+20\d{2}\s*-\s*\d{2}\s+[A-Za-z]{3}\s+20\d{2})"[\s\S]{0,900}?"href":"([^"]*\/en\/event\/[^"]+)"/g;
  const seen = new Set();
  for (const match of html.matchAll(pattern)) {
    const title = decodeHtml(match[1]);
    const dateText = decodeHtml(match[2]);
    const dates = parseEnglishDateRange(dateText);
    const url = resolveUrl(decodeHtml(match[3]), 'https://kau.edu.sa/en/events');
    if (!title || !dates || seen.has(`${title}|${dates.starts_at}`)) continue;
    seen.add(`${title}|${dates.starts_at}`);
    items.push({
      title,
      url,
      organizer: 'King Abdulaziz University',
      summary: `فعالية رسمية من تقويم جامعة الملك عبدالعزيز. التاريخ المعلن: ${dateText}.`,
      city: 'Jeddah',
      venue: 'King Abdulaziz University',
      category: inferKauCategory(title),
      raw_date_text: dateText,
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'human-review',
      ...dates
    });
  }
  if (!items.length) {
    const links = [...html.matchAll(/"href":"([^"]*\/en\/event\/[^"]+)"/g)]
      .map((match) => decodeHtml(match[1]));
    const plain = stripTags(html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' '))
      .replace(/\s+/g, ' ');
    const pattern = /(?:Latest Events\s+|Read More\s+)?(.{5,180}?)\s+(\d{2}\s+[A-Za-z]{3}\s+20\d{2}\s*-\s*\d{2}\s+[A-Za-z]{3}\s+20\d{2})\s+Read More/g;
    [...plain.matchAll(pattern)].forEach((match, index) => {
      let title = decodeHtml(match[1]).replace(/^Home Events\s*/i, '').trim();
      title = title.split(/Latest Events\s+/i).pop().trim();
      const dateText = decodeHtml(match[2]);
      const dates = parseEnglishDateRange(dateText);
      const fallbackHref = `/en/event/${toSlug(title)}`;
      const url = resolveUrl(links[index] || fallbackHref, 'https://kau.edu.sa/en/events');
      const key = `${title}|${dates?.starts_at || ''}`;
      if (!title || !dates || !url || seen.has(key)) return;
      seen.add(key);
      items.push({
        title,
        url,
        organizer: 'King Abdulaziz University',
        summary: `فعالية رسمية من تقويم جامعة الملك عبدالعزيز. التاريخ المعلن: ${dateText}.`,
        city: 'Jeddah',
        venue: 'King Abdulaziz University',
        category: inferKauCategory(title),
        raw_date_text: dateText,
        confidence: 'official',
        review_status: 'ready-for-review',
        publication_gate: 'human-review',
        ...dates
      });
    });
  }
  return items;
}

function inferKauCategory(title = '') {
  const text = title.toLowerCase();
  if (/business|economy|growth|forum/.test(text)) return 'business forum';
  if (/research|beacons|science/.test(text)) return 'academic event';
  if (/career|وظائف/.test(text)) return 'career event';
  if (/workshop|ورشة/.test(text)) return 'workshop';
  return 'university event';
}

function parseDmyDate(value = '') {
  const match = stripTags(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return '';
  return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
}

function parseAsharqiaDateRange(startText, endText, startTimeText = '', endTimeText = '') {
  const dates = [parseDmyDate(startText), parseDmyDate(endText)].filter(Boolean).sort();
  if (!dates.length) return null;
  const defaultStartTime = /12:00\s*AM/i.test(startTimeText) && /12:00\s*AM/i.test(endTimeText) ? '09:00:00' : parseClockTime(startTimeText, '09:00:00');
  const defaultEndTime = /12:00\s*AM/i.test(startTimeText) && /12:00\s*AM/i.test(endTimeText) ? '18:00:00' : parseClockTime(endTimeText, '18:00:00');
  return {
    starts_at: `${dates[0]}T${defaultStartTime}+03:00`,
    ends_at: `${dates[1] || dates[0]}T${defaultEndTime}+03:00`
  };
}

function parseAsharqiaDetailPeriod(html, startTimeText = '', endTimeText = '') {
  const text = stripTags(html).replace(/\s+/g, ' ');
  const match = text.match(/(?:خلال\s+الفترة|الفترة)[^\d]{0,120}\(?\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*([A-Za-z\u0600-\u06ff]+)\s*(20\d{2})/i);
  if (!match) return null;
  const startDay = Number(match[1]);
  const endDay = Number(match[2]);
  const month = monthIndex(match[3]);
  const year = Number(match[4]);
  if (!startDay || !endDay || !Number.isInteger(month) || !year) return null;
  const startTime = parseClockTime(startTimeText, '09:00:00');
  const endTime = parseClockTime(endTimeText, '22:00:00');
  return {
    starts_at: dateWithTime(year, month, startDay, startTime),
    ends_at: dateWithTime(year, month, endDay, endTime)
  };
}

function durationDays(dates) {
  if (!dates?.starts_at || !dates?.ends_at) return 0;
  const start = new Date(dates.starts_at).getTime();
  const end = new Date(dates.ends_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86400000);
}

async function extractAsharqiaChamberEvents(html, source) {
  const items = [];
  const blocks = html.split(/<li class="dfwp-item">/).slice(1);
  const seen = new Set();
  for (const block of blocks) {
    const title = stripTags(block.match(/<h3 class="title">([\s\S]*?)<\/h3>/)?.[1] || '');
    const venue = stripTags(block.match(/fa-location-dot[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1] || '') || 'غرفة الشرقية';
    const endDateText = stripTags(block.match(/class="end-date">([\s\S]*?)<\/span>/)?.[1] || '');
    const startDateText = stripTags(block.match(/class="start-date">([\s\S]*?)<\/span>/)?.[1] || '');
    const timeMatches = [...block.matchAll(/time-Txt[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<span>([\s\S]*?)<\/span>/g)];
    const startTimeText = stripTags(timeMatches[0]?.[1] || '');
    const endTimeText = stripTags(timeMatches[0]?.[2] || '');
    const href = block.match(/href="([^"]*ChamberEventDetails\.aspx\?ItemID=\d+)"/i)?.[1] || '';
    const url = resolveUrl(href, source.url);
    let dates = parseAsharqiaDateRange(startDateText, endDateText, startTimeText, endTimeText);
    let detailDateText = '';
    if (url && (!dates || durationDays(dates) > 45)) {
      try {
        const detailHtml = await fetchHtml({ ...source, collector_url: url });
        const detailDates = parseAsharqiaDetailPeriod(detailHtml, startTimeText, endTimeText);
        if (detailDates) {
          dates = detailDates;
          detailDateText = stripTags(detailHtml).match(/(?:خلال\s+الفترة|الفترة)[^\.。]{0,160}/)?.[0] || '';
        }
      } catch {
        dates = durationDays(dates) > 45 ? null : dates;
      }
    }
    if (!title || !href || !dates) continue;
    const key = `${title}|${dates.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title,
      url,
      organizer: source.owner,
      summary: `فعالية رسمية من غرفة الشرقية. الموقع: ${venue}. التاريخ المعلن: ${detailDateText || [endDateText, startDateText].filter(Boolean).join(' - ')}.`,
      city: normalizeSaudiCity(`${venue} ${title}`, 'Dammam'),
      venue,
      category: inferAsharqiaCategory(title),
      raw_date_text: [detailDateText, endDateText, startDateText, startTimeText, endTimeText].filter(Boolean).join(' '),
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      ...dates
    });
  }
  return items;
}

function inferAsharqiaCategory(title = '') {
  const text = title.toLowerCase();
  if (/وظائف|career|job/.test(text)) return 'career fair';
  if (/معرض|expo|exhibition/.test(text)) return 'exhibition';
  if (/منتدى|forum/.test(text)) return 'business forum';
  if (/ملتقى/.test(text)) return 'business gathering';
  if (/حفل/.test(text)) return 'business reception';
  return 'business event';
}

function inferKaustCategory(title = '', description = '') {
  const text = `${title} ${stripTags(description)}`.toLowerCase();
  if (/world cup|fan zone|football|sport/.test(text)) return 'sports and community';
  if (/lecture|seminar|research|science|conference|symposium/.test(text)) return 'academic event';
  if (/workshop|training|course/.test(text)) return 'workshop';
  if (/community|celebration|festival/.test(text)) return 'community';
  return 'university event';
}

function mergeCandidateRecord(existing, discovered) {
  if (!existing) return discovered;
  const merged = { ...existing, ...discovered };
  for (const field of [
    'review_status',
    'publication_gate',
    'matched_catalog_event_id',
    'reviewed_at',
    'reviewed_by',
    'reviewer_notes'
  ]) {
    if (existing[field]) merged[field] = existing[field];
  }
  return merged;
}

function normalizeCandidateKeyValue(value) {
  return decodeHtml(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractScegaEvents(payload, source) {
  let parsed;
  try { parsed = JSON.parse(payload); } catch { return []; }
  const rawRows = parsed?.data?.items?.item1;
  if (!Array.isArray(rawRows)) return [];
  const grouped = new Map();

  for (const raw of rawRows) {
    const titleAr = stripTags(raw.nameAr || '');
    const titleEn = stripTags(raw.name || '');
    const title = titleAr && titleAr !== '---' ? titleAr : titleEn;
    if (!title || title === '---') continue;
    const sourceCity = stripTags(raw.city || raw.region || 'Saudi Arabia');
    const city = /malham|ملهم/i.test(sourceCity) ? 'Riyadh' : normalizeSaudiCity(sourceCity, sourceCity || 'Saudi Arabia');
    const venue = stripTags(raw.neighborhood || raw.eventLocationAr || raw.eventLocation || city);
    const startsAt = dateTimeFromIsoDateAndClock(raw.eventDateFrom, raw.eventStartTime, '09:00:00');
    const endsAt = dateTimeFromIsoDateAndClock(raw.eventDateTo || raw.eventDateFrom, raw.eventEndTime, '17:00:00');
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) continue;
    const key = [normalizeCandidateKeyValue(title), normalizeCandidateKeyValue(city), normalizeCandidateKeyValue(venue)].join('|');
    const previous = grouped.get(key);
    if (!previous) {
      grouped.set(key, { ...raw, title, city, venue, starts_at: startsAt, ends_at: endsAt, ids: [raw.id].filter(Boolean) });
      continue;
    }
    previous.starts_at = previous.starts_at < startsAt ? previous.starts_at : startsAt;
    previous.ends_at = previous.ends_at > endsAt ? previous.ends_at : endsAt;
    previous.ids = [...new Set([...previous.ids, raw.id].filter(Boolean))];
  }

  return [...grouped.values()].map((row) => {
    const detailId = row.ids.slice().sort((a, b) => Number(a) - Number(b))[0];
    const url = new URL(`/h-events-details/${detailId}`, source.url).href;
    const descriptionAr = stripTags(row.descriptionAr || '');
    const descriptionEn = stripTags(row.description || '');
    const summary = [descriptionAr, descriptionEn].find((value) => value && value !== '---')
      || `${row.title} فعالية رسمية مدرجة في تقويم الهيئة السعودية للمعارض والمؤتمرات.`;
    const categoryText = `${row.eventTypeAr || ''} ${row.eventTypeE || ''}`;
    const category = /مؤتمر|conference|forum|summit/i.test(categoryText) ? 'conference' : /معرض|exhibition|expo/i.test(categoryText) ? 'exhibition' : 'business event';
    return {
      title: row.title,
      url,
      organizer: source.owner,
      summary,
      city: row.city,
      venue: row.venue,
      category,
      raw_date_text: `${row.eventDateFrom || ''} ${row.eventStartTime || ''} - ${row.eventDateTo || row.eventDateFrom || ''} ${row.eventEndTime || ''}`.trim(),
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      attendance_mode: 'in-person',
      language: /[\u0600-\u06ff]/.test(row.title) ? 'ar' : 'en',
      confidence: 'official',
      review_status: 'ready-for-review',
      publication_gate: 'duplicate-review',
      verification_method: 'official-public-json-api',
      date_precision: 'explicit-range',
      time_precision: 'exact',
      tags: ['SCEGA', category, 'official business event'],
      richness_score: calculateRichnessScore({ title: row.title, summary, city: row.city, venue: row.venue, category, attendance_mode: 'in-person', language: 'ar' }),
      source_record_ids: row.ids.map(String)
    };
  }).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title));
}

function candidateMergeKey(candidate) {
  return [
    normalizeCandidateKeyValue(candidate.source_url),
    normalizeCandidateKeyValue(candidate.title),
    String(candidate.starts_at || '').slice(0, 10)
  ].join('|');
}

function refreshableCandidateIdentity(candidate = {}) {
  const url = normalizeCandidateKeyValue(candidate.source_url);
  if (!url || /\.pdf(?:$|[?#])|\/documents?\//i.test(url)) return '';
  return `${normalizeCandidateKeyValue(candidate.source_label)}|${url}`;
}

function endedStableMergeKey(candidate) {
  const title = normalizeCandidateKeyValue(candidate.title);
  const city = normalizeCandidateKeyValue(candidate.city);
  const source = normalizeCandidateKeyValue(candidate.source_label || candidate.source_owner);
  const startsAt = String(candidate.starts_at || '');
  const endsAt = String(candidate.ends_at || '');
  if (!title || !startsAt) return '';
  return `${source}|${title}|${city}|${startsAt}|${endsAt}`;
}

function mergeCandidates(existing, discovered, refreshedSourceLabels = new Set()) {
  const byKey = new Map();
  const discoveredKeys = new Set(discovered.map((candidate) => candidateMergeKey(candidate)));
  const existingByIdentity = new Map(existing
    .map((candidate) => [refreshableCandidateIdentity(candidate), candidate])
    .filter(([identity]) => identity));
  const discoveredIdentityCounts = discovered.reduce((counts, candidate) => {
    const identity = refreshableCandidateIdentity(candidate);
    if (identity) counts.set(identity, (counts.get(identity) || 0) + 1);
    return counts;
  }, new Map());
  const uniqueDiscoveredIdentities = new Set([...discoveredIdentityCounts]
    .filter(([, count]) => count === 1)
    .map(([identity]) => identity));
  const strongerDiscoveredUrls = new Set(discovered
    .filter((candidate) => candidate.source_url && !String(candidate.title || '').startsWith('Application deadline:'))
    .filter((candidate) => candidate.publication_gate !== 'source-evidence')
    .map((candidate) => candidate.source_url));
  const activeExisting = existing
    .filter(hasValidCandidateDates)
    .filter((candidate) => !isSeedCandidate(candidate) && !isPastCandidate(candidate))
    .filter((candidate) => {
      if (!refreshedSourceLabels.has(candidate.source_label)) return true;
      const identity = refreshableCandidateIdentity(candidate);
      if (identity && uniqueDiscoveredIdentities.has(identity)) return discoveredKeys.has(candidateMergeKey(candidate));
      if (candidate.review_status === 'approved-for-catalog' && candidate.matched_catalog_event_id) return true;
      return discoveredKeys.has(candidateMergeKey(candidate));
    })
    .filter((candidate) => {
      const isDeadlineOnly = String(candidate.title || '').startsWith('Application deadline:')
        || candidate.category === 'application deadline';
      return !(isDeadlineOnly && strongerDiscoveredUrls.has(candidate.source_url));
    });
  for (const candidate of activeExisting) {
    byKey.set(candidateMergeKey(candidate), candidate);
  }
  for (const candidate of discovered.filter(hasValidCandidateDates).filter((candidate) => !isPastCandidate(candidate))) {
    const key = candidateMergeKey(candidate);
    const identity = refreshableCandidateIdentity(candidate);
    const previous = byKey.get(key)
      || (identity && uniqueDiscoveredIdentities.has(identity) ? existingByIdentity.get(identity) : null);
    byKey.set(key, mergeCandidateRecord(previous, candidate));
  }
  return [...byKey.values()].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

function mergeEndedEvents(existing, discovered) {
  const byKey = new Map();
  const stableToKeys = new Map();
  const normalizeEndedRecord = (row) => {
    const collected = row.collected_at || row.archived_at || collectedAt;
    const { archive_status, archive_reason, archive_value, archived_at, first_archived_at, ...rest } = row;
    const reviewerNotes = String(row.reviewer_notes || '').includes('أرشيف')
      ? `تم حفظه آلياً كفعالية منتهية من ${row.source_label || 'المصدر'}. يعامل في المنصة مثل أي فعالية كانت موجودة ثم انتهت.`
      : row.reviewer_notes;
    return {
      ...rest,
      id: String(row.id || '').replace(/^archive-/, 'ended-'),
      ended_event_status: row.ended_event_status || archive_reason || archive_status || 'ended-before-latest-collection',
      collected_for: row.collected_for || archive_value || 'normal-ended-event-catalog',
      first_collected_at: row.first_collected_at || first_archived_at || collected,
      collected_at: collected,
      reviewer_notes: reviewerNotes,
      tags: Array.isArray(row.tags)
        ? [...new Set(row.tags.map((tag) => tag === 'historical-event' ? 'ended-event' : tag))]
        : []
    };
  };
  for (const row of existing.filter(hasValidCandidateDates)) {
    const normalized = normalizeEndedRecord(row);
    const key = candidateMergeKey(normalized);
    const stableKey = endedStableMergeKey(normalized);
    for (const staleKey of stableToKeys.get(stableKey) || []) {
      if (staleKey !== key) byKey.delete(staleKey);
    }
    byKey.set(key, normalized);
    stableToKeys.set(stableKey, new Set([key]));
  }
  for (const row of discovered.filter(hasValidCandidateDates)) {
    const normalized = normalizeEndedRecord(row);
    const key = candidateMergeKey(normalized);
    const stableKey = endedStableMergeKey(normalized);
    for (const staleKey of stableToKeys.get(stableKey) || []) {
      if (staleKey !== key) byKey.delete(staleKey);
    }
    byKey.set(key, {
      ...byKey.get(key),
      ...normalized,
      first_collected_at: byKey.get(key)?.first_collected_at || normalized.first_collected_at || normalized.collected_at,
      collected_at: normalized.collected_at
    });
    stableToKeys.set(stableKey, new Set([key]));
  }
  return [...byKey.values()]
    .filter(hasValidCandidateDates)
    .filter(isAllowedEndedCandidate)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
}

function sourceCandidateDelta(source, discoveredCandidates, existingCandidates = []) {
  const validDiscoveredCandidates = discoveredCandidates.filter(hasValidCandidateDates);
  const existingForSource = existingCandidates
    .filter((candidate) => candidate.source_label === source.name)
    .filter(hasValidCandidateDates)
    .filter((candidate) => !isSeedCandidate(candidate) && !isPastCandidate(candidate));
  const existingKeys = new Set(existingForSource.map((candidate) => candidateMergeKey(candidate)));
  const discoveredKeys = new Set(validDiscoveredCandidates.map((candidate) => candidateMergeKey(candidate)));
  const approvedLinked = existingForSource.filter((candidate) => (
    candidate.review_status === 'approved-for-catalog'
    && candidate.matched_catalog_event_id
  )).length;

  return {
    source_existing_active: existingForSource.length,
    new_candidates: validDiscoveredCandidates.filter((candidate) => !existingKeys.has(candidateMergeKey(candidate))).length,
    refreshed_candidates: validDiscoveredCandidates.filter((candidate) => existingKeys.has(candidateMergeKey(candidate))).length,
    missing_from_latest_run: existingForSource
      .filter((candidate) => !discoveredKeys.has(candidateMergeKey(candidate)))
      .filter((candidate) => !(candidate.review_status === 'approved-for-catalog' && candidate.matched_catalog_event_id))
      .length,
    approved_linked_preserved: approvedLinked
  };
}

function isPastCandidate(candidate, referenceDate = now) {
  const end = new Date(candidate.ends_at || candidate.starts_at).getTime();
  return !Number.isNaN(end) && end < referenceDate.getTime();
}

function isAllowedEndedCandidate(candidate) {
  const year = Number(String(candidate.starts_at || '').slice(0, 4));
  return Number.isInteger(year) && year >= minEndedYear;
}

function partitionSourceItems(extractedItems = [], source = {}, options = {}) {
  const referenceDate = options.referenceDate || now;
  const includeEnded = options.includeEnded ?? collectEndedEvents;
  const limits = sourceRunLimits(source, { includeEnded });
  const validItems = extractedItems
    .filter((item) => item.title && item.starts_at && item.ends_at && item.url);
  const pastItems = validItems.filter((item) => isPastCandidate(item, referenceDate));
  const activeItems = validItems
    .filter((item) => !isPastCandidate(item, referenceDate))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, limits.active);
  const endedItems = includeEnded
    ? pastItems
      .filter(isAllowedEndedCandidate)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .slice(0, limits.ended)
    : [];

  return {
    activeItems,
    endedItems,
    pastRowsSkipped: includeEnded ? 0 : pastItems.length
  };
}

function isSeedCandidate(candidate) {
  return String(candidate.source_owner || '') === 'EventLive Research'
    && String(candidate.source_url || '') === 'https://eventme.live/';
}

async function fetchHtml(source) {
  const configuredTarget = source.collector_url || source.url;
  const primaryTarget = source.id === 'jazan-chamber-events'
    ? jazanApiEndpoint(now.getUTCMonth() + 1, now.getUTCFullYear())
    : configuredTarget;
  const targets = [
    primaryTarget,
    ...(Array.isArray(source.collector_pages) ? source.collector_pages : [])
  ].filter(Boolean).filter((target, index, values) => values.indexOf(target) === index);
  const target = targets[0];
  const method = String(source.collector_method || 'GET').toUpperCase();
  const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  };
  if (/api\.saudi-pro-league\.pulselive\.com/i.test(target)) {
    headers.account = 'saudi-pro-league';
    headers.origin = 'https://www.spl.com.sa';
    headers.referer = 'https://www.spl.com.sa/';
    headers['sec-fetch-site'] = 'cross-site';
  }
  const options = { headers, method };
  if (method !== 'GET') {
    headers.accept = 'application/json, text/plain, */*';
    headers['content-type'] = 'application/json';
    headers.origin = new URL(source.url).origin;
    headers.referer = source.url;
    headers['sec-fetch-mode'] = 'cors';
    headers['sec-fetch-site'] = 'same-origin';
    options.body = JSON.stringify(source.collector_body || {});
  }
  if (source.id === 'ithra-events') {
    headers['x-algolia-application-id'] = 'ZJVUTJO7VX';
    headers['x-algolia-api-key'] = '508b60706403a2a3f4e7642ebbeaa2fd';
    headers.origin = 'https://www.ithra.com';
    headers.referer = 'https://www.ithra.com/en/programme/2026';
    headers['sec-fetch-site'] = 'cross-site';
  }
  if (source.fetch_method === 'pdf-calendar') {
    let lastPdfError;
    for (const candidateUrl of targets) {
      try {
        const pdfResponse = await collectorFetch(candidateUrl, {
          ...options,
          signal: AbortSignal.timeout(Math.max(fetchTimeoutMs, 120_000))
        });
        if (!pdfResponse.ok) throw new Error(`HTTP ${pdfResponse.status}`);
        const xml = visitSaudiPdfBufferToXml(Buffer.from(await pdfResponse.arrayBuffer()), {
          imageOutputDir: path.join(root, 'dist', 'assets', 'event-images'),
          publicBasePath: '/assets/event-images'
        });
        sourceFetchModes.set(source.id, 'direct-pdf');
        return xml;
      } catch (error) {
        lastPdfError = error;
      }
    }
    throw lastPdfError || new Error('pdf-fetch-failed');
  }
  let response;
  let text = '';
  let lastError;
  for (const candidateUrl of targets) {
    try {
      response = await collectorFetch(candidateUrl, { ...options });
      text = await response.text();
      if (response.ok) {
        sourceFetchModes.set(source.id, 'direct');
        break;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  if (!response?.ok) {
    const fallbackHtml = sourceFallbackHtml(source);
    if (fallbackHtml) return fallbackHtml;
    throw lastError || new Error('fetch failed');
  }
  if (/request rejected/i.test(text) || /<title>\s*Request Rejected\s*<\/title>/i.test(text)) {
    const fallbackHtml = sourceFallbackHtml(source);
    if (fallbackHtml) return fallbackHtml;
    throw new Error('request-rejected');
  }
  return text;
}

async function fetchText(url, headers = {}) {
  const response = await collectorFetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      ...headers
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return text;
}

async function loadSourceExtraction(source, extractor, options = {}) {
  const fetchPrimary = options.fetchPrimary || fetchHtml;
  const fallbackExtractor = options.fallbackExtractor || sourceApiFallbackExtractors.get(source.id);
  let primaryResult = null;
  let primaryError = null;
  try {
    const payload = await fetchPrimary(source);
    primaryResult = {
      payload,
      items: await extractor(payload, source),
      primary_error: null
    };
    const mode = sourceFetchModes.get(source.id) || 'direct';
    if (primaryResult.items.length && mode !== 'last-known-good') return primaryResult;
  } catch (error) {
    primaryError = error;
  }

  let fallbackResult = null;
  let fallbackError = null;
  if (fallbackExtractor) {
    try {
      const items = await fallbackExtractor(source);
      fallbackResult = { payload: '', items, primary_error: primaryError };
      if (items.length) {
        sourceFetchModes.set(source.id, 'official-api-fallback');
        return fallbackResult;
      }
    } catch (error) {
      fallbackError = error;
    }
  }

  const browserRecoveryCoolingDown = recentBrowserProbeFailure(source);
  const liveBrowserEnabled = !['1', 'true', 'yes'].includes(String(process.env.EVENTLIVE_DISABLE_LIVE_BROWSER_RECOVERY || '').toLowerCase())
    && !browserRecoveryCoolingDown;
  if (liveBrowserEnabled && canUseBrowserHtmlFallback(source)) {
    try {
      const payload = await fetchBrowserRenderedHtml(source);
      if (/just a moment|cf-browser-verification|cdn-cgi\/challenge|request rejected|access denied/i.test(payload)) {
        throw new Error('browser recovery encountered an access-protection page');
      }
      const items = await extractor(payload, source);
      if (items.length || !primaryResult) {
        sourceFetchModes.set(source.id, 'live-browser-recovery');
        return { payload, items, primary_error: primaryError };
      }
    } catch (error) {
      fallbackError = fallbackError || error;
    }
  } else if (browserRecoveryCoolingDown && !fallbackError) {
    fallbackError = new Error('live browser recovery deferred by recent failed probe cooldown');
  }

  if (primaryResult) return primaryResult;
  if (fallbackResult) return fallbackResult;
  const reasons = [primaryError?.message, fallbackError?.message].filter(Boolean).join('; ');
  throw new Error(reasons || 'source extraction failed');
}

async function fetchBrowserRenderedHtml(source, waitMs = 4500) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 }
    });
    await page.goto(source.collector_url || source.url, { waitUntil: 'domcontentloaded', timeout: liveBrowserTimeoutMs });
    await page.waitForLoadState('networkidle', { timeout: Math.min(10_000, liveBrowserTimeoutMs) }).catch(() => {});
    await page.waitForTimeout(waitMs);
    const html = await page.content();
    writeAuxiliarySnapshot(source, 'browser-rendered', html);
    return html;
  } finally {
    await browser.close();
  }
}

function snapshotExtensionFor(source) {
  if (source.fetch_method === 'pdf-calendar') return 'xml';
  if (/json|api/i.test(source.fetch_method || '') || source.collector_method === 'POST') return 'json';
  const target = source.collector_url || source.url || '';
  return /\/api\/|api\.|\.json(?:$|\?)/i.test(target) ? 'json' : 'html';
}

function writeReport(summary) {
  writeJson(reportJsonPath, summary);
  const lines = [
    '# EventLive Source Collection Report',
    '',
    `- collected_at: ${summary.collected_at}`,
    `- dry_run: ${summary.dry_run}`,
    `- time_scope: ${summary.time_scope}`,
    `- ended_collection_enabled: ${summary.ended_collection_enabled}`,
    `- sources_seen: ${summary.sources_seen}`,
    `- sources_runnable: ${summary.sources_runnable}`,
    `- sources_due: ${summary.sources_due}`,
    `- sources_attempted: ${summary.sources_attempted}`,
    `- sources_deferred: ${summary.sources_deferred}`,
    `- ended_min_year: ${summary.ended_min_year}`,
    `- candidates_discovered: ${summary.candidates_discovered}`,
    `- candidates_written: ${summary.candidates_written}`,
    `- ended_events_discovered: ${summary.ended_events_discovered ?? 0}`,
    `- ended_events_written: ${summary.ended_events_written ?? 0}`,
    `- ended_events_preserved: ${summary.ended_events_preserved ?? 0}`,
    `- past_rows_skipped: ${summary.past_rows_skipped ?? 0}`,
    '',
    '| Source | Status | Duration | Active | Ended | Past skipped | New | Refreshed | Missing latest | Snapshot | Note |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|',
    ...summary.sources.map((source) => `| ${source.id} | ${source.status} | ${Math.round((source.duration_ms || 0) / 1000)}s | ${source.extracted} | ${source.ended_extracted ?? 0} | ${source.past_rows_skipped ?? 0} | ${source.new_candidates ?? 0} | ${source.refreshed_candidates ?? 0} | ${source.missing_from_latest_run ?? 0} | ${source.snapshot_path || '-'} | ${source.note || ''} |`),
    '',
    '## Deferred By Adaptive Cadence',
    '',
    '| Source | Reason | Interval | Next due |',
    '|---|---|---:|---|',
    ...summary.deferred_sources.map((source) => `| ${source.id} | ${source.reason} | ${source.interval_hours}h | ${source.next_due_at || '-'} |`)
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function writeCollectionCheckpoint({ allSources, runnableSources, sources, deferredSources, sourceSummaries, discovered, endedDiscovered, existingCandidates, existingEndedEvents }) {
  writeJson(checkpointJsonPath, {
    schema: 'eventlive.source-collection-checkpoint.v1',
    checkpointed_at: new Date().toISOString(),
    collected_at: collectedAt,
    source_registry: rel(sourceRegistryPath),
    source_candidates: rel(sourceCandidatesPath),
    source_ended_events: rel(sourceEndedEventsPath),
    sources_seen: allSources.length,
    sources_runnable: runnableSources.length,
    sources_due: sources.length,
    sources_attempted: sources.length,
    sources_deferred: deferredSources.length,
    sources_completed: sourceSummaries.length,
    candidates_discovered_so_far: discovered.length,
    ended_events_discovered_so_far: endedDiscovered.length,
    ended_collection_enabled: collectEndedEvents,
    time_scope: collectionTimeScope,
    past_rows_skipped_so_far: sourceSummaries.reduce((sum, source) => sum + (source.past_rows_skipped || 0), 0),
    ended_min_year: minEndedYear,
    baseline_key: 'source_url + title + start_date',
    normalization_rule: 'candidateMergeKey from the source collector; compare apples-to-apples across periodic runs',
    sources: sourceSummaries,
    deferred_sources: deferredSources,
    existing_candidates_seen: existingCandidates.length,
    existing_ended_events_seen: existingEndedEvents.length
  });
}

async function main() {
  if (!exists(sourceRegistryPath)) {
    throw new Error(`Source registry not found: ${rel(sourceRegistryPath)}`);
  }
  const registry = readJson(sourceRegistryPath);
  const allSources = [...(registry.sources || [])].sort((a, b) => a.priority - b.priority);
  const runnableSources = allSources.filter((source) => sourceExtractors[source.id]);
  const previousRunState = exists(sourceRunStatePath) ? readJson(sourceRunStatePath) : { sources: [] };
  const cadenceSelection = selectSourcesByCadence(runnableSources, previousRunState.sources || [], now, { forceAll: forceAllSources });
  const sources = selectedIds.length
    ? runnableSources.filter((source) => selectedIds.includes(source.id))
    : adaptiveCadenceEnabled
      ? cadenceSelection.due.map((row) => row.source)
      : runnableSources;
  const deferredSources = selectedIds.length || !adaptiveCadenceEnabled
    ? []
    : cadenceSelection.deferred.map((row) => ({
      id: row.source.id,
      status: row.state.status || 'not-attempted',
      last_attempted_at: row.state.last_attempted_at || null,
      error_streak: Number(row.state.error_streak || 0),
      zero_yield_streak: Number(row.state.zero_yield_streak || 0),
      reason: row.decision.reason,
      interval_hours: row.decision.interval_hours,
      next_due_at: row.decision.next_due_at
    }));

  ensureDir(snapshotDir);
  const discovered = [];
  const endedDiscovered = [];
  const sourceSummaries = [];
  const stamp = collectedAt.replace(/[:.]/g, '-');
  activeSnapshotStamp = stamp;
  const existingEnvelope = exists(sourceCandidatesPath)
    ? readJson(sourceCandidatesPath)
    : { generated_for: 'EventLive source intake foundation', notes: '', candidates: [] };
  const existingCandidates = Array.isArray(existingEnvelope.candidates) ? existingEnvelope.candidates : [];
  const existingEndedEventsEnvelope = exists(sourceEndedEventsPath)
    ? readJson(sourceEndedEventsPath)
    : exists(legacySourceArchivePath)
      ? readJson(legacySourceArchivePath)
      : { generated_for: 'EventLive ended source events', notes: '', ended_events: [] };
  const existingEndedEvents = Array.isArray(existingEndedEventsEnvelope.ended_events)
    ? existingEndedEventsEnvelope.ended_events
    : Array.isArray(existingEndedEventsEnvelope.archived_events)
      ? existingEndedEventsEnvelope.archived_events
      : [];

  for (const source of sources) {
    const sourceStartedAt = Date.now();
    const extractor = sourceExtractors[source.id];
    const summary = {
      id: source.id,
      status: 'skipped',
      extracted: 0,
      snapshot_path: '',
      note: '',
      fetch_mode: '',
      source_existing_active: 0,
      new_candidates: 0,
      refreshed_candidates: 0,
      missing_from_latest_run: 0,
      approved_linked_preserved: 0,
      ended_extracted: 0,
      ended_new: 0,
      past_rows_skipped: 0,
      duration_ms: 0
    };
    try {
      const extraction = await loadSourceExtraction(source, extractor);
      const html = extraction.payload;
      summary.fetch_mode = sourceFetchModes.get(source.id) || 'direct';
      if (html) {
        const snapshotPath = path.join(snapshotDir, `${source.id}-${stamp}.${snapshotExtensionFor(source)}`);
        fs.writeFileSync(snapshotPath, html, 'utf8');
        summary.snapshot_path = rel(snapshotPath);
      } else {
        summary.snapshot_path = sourceEvidenceSnapshots.get(source.id) || '';
      }
      const partition = partitionSourceItems(extraction.items, source);
      const candidates = partition.activeItems
        .map((item) => baseCandidate(source, item, summary.snapshot_path));
      const endedEvents = partition.endedItems
        .map((item) => baseEndedEventRecord(source, item, summary.snapshot_path));
      discovered.push(...candidates);
      endedDiscovered.push(...endedEvents);
      summary.status = 'ok';
      summary.extracted = candidates.length;
      summary.ended_extracted = endedEvents.length;
      summary.past_rows_skipped = partition.pastRowsSkipped;
      Object.assign(summary, sourceCandidateDelta(source, candidates, existingCandidates));
      const existingEndedKeys = new Set(existingEndedEvents.map((item) => candidateMergeKey(item)));
      summary.ended_new = endedEvents.filter((item) => !existingEndedKeys.has(candidateMergeKey(item))).length;
      if (summary.fetch_mode !== 'direct') {
        const primaryNote = extraction.primary_error ? ` Primary page failed: ${extraction.primary_error.message}.` : '';
        summary.note = `Recovered via ${summary.fetch_mode} official evidence.${primaryNote}`;
      }
      if (!candidates.length) summary.note = `${summary.note ? `${summary.note} ` : ''}No future date-complete candidates found by the conservative extractor.`;
    } catch (error) {
      if (isDiscoveryOnlySource(source)) {
        summary.status = 'skipped';
        summary.note = `Discovery-only source unavailable in this run: ${error.message}`;
      } else {
        summary.status = 'error';
        summary.note = error.message;
      }
    }
    summary.duration_ms = Date.now() - sourceStartedAt;
    sourceSummaries.push(summary);
    writeCollectionCheckpoint({ allSources, runnableSources, sources, deferredSources, sourceSummaries, discovered, endedDiscovered, existingCandidates, existingEndedEvents });
  }

  const refreshedSourceLabels = new Set(sourceSummaries
    .filter((summary) => summary.status === 'ok')
    .map((summary) => allSources.find((source) => source.id === summary.id)?.name)
    .filter(Boolean));
  const merged = mergeCandidates(existingCandidates, discovered, refreshedSourceLabels);
  const mergedEndedEvents = collectEndedEvents
    ? mergeEndedEvents(existingEndedEvents, endedDiscovered)
    : existingEndedEvents;

  if (!dryRun) {
    writeJson(sourceCandidatesPath, {
      ...existingEnvelope,
      generated_for: existingEnvelope.generated_for || 'EventLive source intake foundation',
      notes: 'Pre-publication queue for discovered Saudi event leads. Candidates must be reviewed before they are copied into data/events_catalog.json.',
      candidates: merged
    });
    if (collectEndedEvents) {
      const { archived_events, archive_status, archive_reason, archive_value, ...endedEnvelope } = existingEndedEventsEnvelope;
      writeJson(sourceEndedEventsPath, {
        ...endedEnvelope,
        generated_for: 'EventLive ended source events',
        notes: 'Ended Saudi events collected from source extractors. The public site treats these as normal events with ended status.',
        ended_events: mergedEndedEvents
      });
    }
  }

  const report = {
    collected_at: collectedAt,
    dry_run: dryRun,
    source_registry: rel(sourceRegistryPath),
    source_candidates: rel(sourceCandidatesPath),
    source_ended_events: rel(sourceEndedEventsPath),
    time_scope: collectionTimeScope,
    ended_collection_enabled: collectEndedEvents,
    sources_seen: allSources.length,
    sources_runnable: runnableSources.length,
    sources_due: sources.length,
    sources_attempted: sources.length,
    sources_deferred: deferredSources.length,
    adaptive_cadence_enabled: adaptiveCadenceEnabled,
    force_all_sources: forceAllSources,
    max_per_source: maxPerSource,
    ended_min_year: minEndedYear,
    baseline_key: 'source_url + title + start_date',
    checkpoint: rel(checkpointJsonPath),
    candidates_discovered: discovered.length,
    ended_events_discovered: endedDiscovered.length,
    past_rows_skipped: sourceSummaries.reduce((sum, source) => sum + (source.past_rows_skipped || 0), 0),
    candidates_written: dryRun ? existingCandidates.length : merged.length,
    ended_events_written: !dryRun && collectEndedEvents ? mergedEndedEvents.length : 0,
    ended_events_preserved: existingEndedEvents.length,
    sources: sourceSummaries,
    deferred_sources: deferredSources
  };
  writeReport(report);
  console.log(`# EventLive Source Collector`);
  console.log(`- Time scope: ${report.time_scope}`);
  console.log(`- Ended collection enabled: ${report.ended_collection_enabled}`);
  console.log(`- Sources attempted: ${report.sources_attempted}`);
  console.log(`- Sources deferred by cadence: ${report.sources_deferred}`);
  console.log(`- Candidates discovered: ${report.candidates_discovered}`);
  console.log(`- Candidates written: ${report.candidates_written}`);
  console.log(`- Ended events written this run: ${report.ended_events_written}`);
  console.log(`- Existing ended events preserved: ${report.ended_events_preserved}`);
  console.log(`- Past rows skipped: ${report.past_rows_skipped}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`SOURCE_COLLECTION_FAILED ${error.message}`);
    process.exit(1);
  });
}

export {
  fetchHtml,
  freshBrowserProbeHtml,
  browserProbeEvidenceTimestamp,
  recentBrowserProbeFailure,
  latestOfficialSnapshotHtml,
  writeAuxiliarySnapshot,
  extractAbhaChamberEvents,
  extractAsharqiaChamberEvents,
  extractCodeMcitPrograms,
  extractExperienceAlulaDetailHtml,
  extractExperienceAlulaFestivalCards,
  extractInvestSaudiEvents,
  extractInformaEventFromHtml,
  extractInformaSaudiPortfolio,
  informaSaudiSitemapUrls,
  dedupeInformaItems,
  extractIthraEvents,
  extractSaudiSpaceAgencyEvents,
  extractSfdaEvents,
  jazanApiEndpoint,
  jazanMonthsToFetch,
  extractJazanChamberEvents,
  extractMakkahChamberEvents,
  extractUmmAlQuraEventDetail,
  extractUmmAlQuraEvents,
  extractMadinahChamberPayload,
  extractMadinahChamberEvents,
  extractMadinahArchitectureFestival,
  extractHayyJameelCards,
  extractHayyJameelDetail,
  extractHayyJameelEvents,
  baseCandidate,
  readableExcerpt,
  extractNajranMunicipalityEvents,
  extractNorthernBordersChamberEvents,
  extractMocCalendarPayload,
  extractQassimChamberEvents,
  extractTabukChamberEvents,
  extractScegaEvents,
  extractKaustEvents,
  extractKauEvents,
  extractRiyadhCityEvents,
  extractMonshaat,
  extractSaudiProLeagueFixtures,
  extractSdaiaAcademyPrograms,
  extractSdaiaCalendarEvents,
  extractVisitSaudiApiEvents,
  sourceCandidateDelta,
  sourceRunLimits,
  partitionSourceItems,
  loadSourceExtraction,
  isPastCandidate,
  mergeEndedEvents,
  mergeCandidates,
  parseAlulaDateRange,
  parseQassimUniversityEvents,
  parseJoufUniversitySummerProgram,
  parseMonshaatDate,
  sourceExtractors
};
