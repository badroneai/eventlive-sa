import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const registryPath = path.join(root, 'data', 'source_registry.json');
const planPath = path.join(root, 'reports', 'source-ingestion-plan.json');
const reportJsonPath = path.join(root, 'reports', 'source-deep-probe-report.json');
const reportMdPath = path.join(root, 'reports', 'source-deep-probe-report.md');
const generatedAt = new Date().toISOString();
const selectedIds = (process.env.EVENTLIVE_PROBE_SOURCE_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const probeLimit = Math.max(1, Number(process.env.EVENTLIVE_PROBE_LIMIT || 28));
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_PROBE_TIMEOUT_MS || 12000));

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function titleFromHtml(html) {
  return stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function countMatches(html, pattern) {
  return [...String(html || '').matchAll(pattern)].length;
}

function sampleMatches(html, pattern, limit = 5) {
  return [...String(html || '').matchAll(pattern)]
    .slice(0, limit)
    .map((match) => stripTags(match[0]).slice(0, 220))
    .filter(Boolean);
}

function activeCollectorIds(plan) {
  return new Set((plan.sources || [])
    .filter((source) => source.ring === 'active-collector')
    .map((source) => source.id));
}

function chooseProbeSources(registry, plan) {
  const active = activeCollectorIds(plan);
  const priorityIds = new Set([
    ...(plan.next_extractors || []).slice(0, 18).map((source) => source.id),
    ...(plan.sources || [])
      .filter((source) => source.ring === 'evidence-monitor' || source.ring === 'venue-dedupe')
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 10)
      .map((source) => source.id)
  ]);

  let sources = (registry.sources || [])
    .filter((source) => !active.has(source.id))
    .filter((source) => selectedIds.length ? selectedIds.includes(source.id) : priorityIds.has(source.id))
    .sort((a, b) => Number(a.priority || 99) - Number(b.priority || 99));

  if (!selectedIds.length) sources = sources.slice(0, probeLimit);
  return sources;
}

async function fetchWithTimeout(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      }
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      final_url: response.url,
      content_type: response.headers.get('content-type') || '',
      body: text
    };
  } finally {
    clearTimeout(timeout);
  }
}

function blockedReason(status, html) {
  const title = titleFromHtml(html);
  if (status === 403) return 'http-403';
  if (/request rejected/i.test(title) || /request rejected/i.test(html)) return 'request-rejected';
  if (/just a moment|checking your browser|cf-browser-verification/i.test(title) || /cloudflare/i.test(html.slice(0, 5000))) {
    return 'bot-protection';
  }
  return '';
}

function scoreSignals(signals, source) {
  let score = 0;
  if (!signals.blocked_reason && signals.http_ok) score += 20;
  if (signals.structured_events > 0) score += 40;
  if (signals.google_calendar_links > 0) score += 38;
  if (signals.event_detail_links >= 3) score += 20;
  if (signals.date_snippets.length >= 3) score += 16;
  if (signals.json_or_api_hints >= 2) score += 10;
  if (source.trust_level === 'official' || source.trust_level === 'venue-official') score += 12;
  if (source.fetch_method === 'partnership-api') score -= 25;
  if (source.fetch_method === 'manual-review') score -= 12;
  if (signals.blocked_reason) score -= 35;
  return score;
}

function recommendationFor(source, signals) {
  if (source.fetch_method === 'partnership-api' || source.intake_policy === 'partnership-needed') {
    return 'partnership-lane';
  }
  if (signals.blocked_reason) return `blocked-or-protected:${signals.blocked_reason}`;
  if (signals.google_calendar_links > 0) return 'build-google-calendar-link-extractor';
  if (signals.structured_events > 0) return 'build-jsonld-event-extractor';
  if (signals.event_detail_links >= 5 && signals.date_snippets.length >= 3) return 'build-html-detail-extractor';
  if (signals.date_snippets.length >= 5) return 'probe-hidden-api-or-html-table';
  if (signals.json_or_api_hints >= 4) return 'inspect-client-api';
  return 'watch-or-evidence-only';
}

function analyzeSource(source, response) {
  const html = response.body || '';
  const structuredScripts = countMatches(html, /application\/ld\+json/gi);
  const structuredEvents = countMatches(html, /"@type"\s*:\s*"[^"]*Event/gi)
    + countMatches(html, /"startDate"\s*:/gi);
  const eventDetailLinks = countMatches(html, /href=["'][^"']*(?:event|events|calendar|whats-on)[^"']*["']/gi);
  const googleCalendarLinks = countMatches(html, /calendar\.google\.com\/calendar\/render/gi);
  const dateSnippets = sampleMatches(
    html,
    /(?:\d{1,2}\s*(?:-|–|—|to)\s*\d{1,2}\s+[A-Za-z]{3,9}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|20\d{2}[-/]\d{2}[-/]\d{2}|dates?[^<]{0,80}|calendar[^<]{0,80})/gi,
    6
  );
  const apiHints = countMatches(html, /\/api\/|wp-json|__NEXT_DATA__|graphql|ajax|endpoint|startDate|endDate/gi);
  const signals = {
    http_ok: response.ok,
    status: response.status,
    final_url: response.final_url,
    content_type: response.content_type,
    bytes: html.length,
    title: titleFromHtml(html),
    blocked_reason: blockedReason(response.status, html),
    structured_scripts: structuredScripts,
    structured_events: structuredEvents,
    google_calendar_links: googleCalendarLinks,
    event_detail_links: eventDetailLinks,
    json_or_api_hints: apiHints,
    date_snippets: dateSnippets
  };
  return {
    id: source.id,
    name: source.name,
    priority: source.priority,
    url: source.url,
    trust_level: source.trust_level,
    fetch_method: source.fetch_method,
    candidate_gate: source.candidate_gate,
    intake_policy: source.intake_policy,
    signals,
    extraction_score: scoreSignals(signals, source),
    recommendation: recommendationFor(source, signals)
  };
}

function renderMarkdown(report) {
  const rows = report.sources
    .map((source) => `| ${source.priority} | ${source.id} | ${source.signals.status || '-'} | ${source.extraction_score} | ${source.recommendation} | ${source.signals.google_calendar_links} | ${source.signals.structured_events} | ${source.signals.event_detail_links} | ${source.signals.title || '-'} |`);
  const lines = [
    '# EventLive Source Deep Probe',
    '',
    `Generated at: ${report.generated_at}`,
    '',
    '## Summary',
    '',
    `- Probed sources: ${report.totals.probed}`,
    `- Extractor-ready: ${report.totals.extractor_ready}`,
    `- Blocked/protected: ${report.totals.blocked}`,
    `- Partnership lanes: ${report.totals.partnership}`,
    `- Watch/evidence-only: ${report.totals.watch}`,
    '',
    '## Ranked Sources',
    '',
    '| Priority | Source | HTTP | Score | Recommendation | GCal | Structured events | Event links | Title |',
    '|---:|---|---:|---:|---|---:|---:|---:|---|',
    ...rows,
    '',
    '## Next Actions',
    '',
    ...report.next_actions.map((item) => `- ${item.id}: ${item.recommendation} (${item.reason})`)
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!exists(registryPath)) throw new Error(`Source registry not found: ${rel(registryPath)}`);
  const registry = readJson(registryPath);
  const plan = exists(planPath) ? readJson(planPath) : { sources: [], next_extractors: [] };
  const sources = chooseProbeSources(registry, plan);
  const results = [];

  for (const source of sources) {
    try {
      const response = await fetchWithTimeout(source);
      results.push(analyzeSource(source, response));
    } catch (error) {
      const signals = {
        http_ok: false,
        status: 0,
        final_url: source.url,
        content_type: '',
        bytes: 0,
        title: '',
        blocked_reason: error.name === 'AbortError' ? 'timeout' : error.message,
        structured_scripts: 0,
        structured_events: 0,
        google_calendar_links: 0,
        event_detail_links: 0,
        json_or_api_hints: 0,
        date_snippets: []
      };
      results.push({
        id: source.id,
        name: source.name,
        priority: source.priority,
        url: source.url,
        trust_level: source.trust_level,
        fetch_method: source.fetch_method,
        candidate_gate: source.candidate_gate,
        intake_policy: source.intake_policy,
        signals,
        extraction_score: scoreSignals(signals, source),
        recommendation: recommendationFor(source, signals)
      });
    }
  }

  const sorted = results.sort((a, b) => b.extraction_score - a.extraction_score || a.priority - b.priority);
  const report = {
    generated_at: generatedAt,
    registry: rel(registryPath),
    source_ingestion_plan: exists(planPath) ? rel(planPath) : '',
    probe_limit: probeLimit,
    timeout_ms: timeoutMs,
    totals: {
      probed: sorted.length,
      extractor_ready: sorted.filter((item) => /build-|probe-hidden-api|inspect-client-api/.test(item.recommendation)).length,
      blocked: sorted.filter((item) => item.recommendation.startsWith('blocked-or-protected')).length,
      partnership: sorted.filter((item) => item.recommendation === 'partnership-lane').length,
      watch: sorted.filter((item) => item.recommendation === 'watch-or-evidence-only').length
    },
    sources: sorted,
    next_actions: sorted.slice(0, 8).map((item) => ({
      id: item.id,
      recommendation: item.recommendation,
      reason: `score=${item.extraction_score}, gcal=${item.signals.google_calendar_links}, structured=${item.signals.structured_events}, links=${item.signals.event_detail_links}`
    }))
  };

  ensureDir(path.dirname(reportJsonPath));
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report), 'utf8');

  console.log('# EventLive Source Deep Probe');
  console.log(`- Probed: ${report.totals.probed}`);
  console.log(`- Extractor-ready: ${report.totals.extractor_ready}`);
  console.log(`- Blocked/protected: ${report.totals.blocked}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main().catch((error) => {
  console.error(`SOURCE_DEEP_PROBE_FAILED ${error.message}`);
  process.exit(1);
});
