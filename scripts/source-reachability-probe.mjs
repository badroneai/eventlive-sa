// Source reachability probe — answers "can THIS environment reach that source,
// and by which strategy", from the environment that actually matters.
//
// Why it exists: four collectors (moc-cultural-calendar, mos-events,
// moc-cultural-subportals, qassim-chamber-events) failed 17 consecutive syncs
// with "fetch failed" / HTTP 403, while every one of their URLs answers 200
// from a laptop with a plain client. Diagnosing that from a laptop is
// guesswork — the only vantage point whose answer counts is a GitHub runner.
// So this runs there, tries the strategies that plausibly differ, and prints
// which one works instead of leaving us to reason about it.
//
// Read-only: it fetches public pages and writes a report. It never touches the
// catalog, the run state, or any source's ingestion status.
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { Agent } from 'undici';

const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'ar,en-US;q=0.9,en;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'upgrade-insecure-requests': '1'
};

const TARGETS = (process.env.EVENTLIVE_PROBE_URLS || [
  'https://www.moc.gov.sa/en/Modules/Pages/Cultural-Calendar',
  'https://www.mos.gov.sa/en/media/events',
  'https://music.moc.gov.sa/Cultural-Calendar',
  'https://qcc.org.sa/events-list'
].join(',')).split(',').map((value) => value.trim()).filter(Boolean);

const TIMEOUT_MS = Number(process.env.EVENTLIVE_PROBE_TIMEOUT_MS || 20000);

function shortError(error) {
  const cause = error?.cause;
  const parts = [error?.name, error?.message, cause?.code || cause?.message].filter(Boolean);
  return parts.join(' · ').slice(0, 160);
}

async function tcpConnect(host, port, family) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.connect({ host, port, family, timeout: TIMEOUT_MS });
    socket.on('connect', () => {
      socket.destroy();
      resolve({ ok: true, detail: `${Date.now() - started}ms` });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, detail: `timeout after ${TIMEOUT_MS}ms` });
    });
    socket.on('error', (error) => {
      socket.destroy();
      resolve({ ok: false, detail: error.code || error.message });
    });
  });
}

async function tryFetch(url, { headers = {}, dispatcher } = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, { headers, dispatcher, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = await response.text();
    return { ok: response.ok, detail: `HTTP ${response.status} · ${body.length}b · ${Date.now() - started}ms` };
  } catch (error) {
    return { ok: false, detail: shortError(error) };
  }
}

function tryCurl(url, args = []) {
  const started = Date.now();
  const result = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-L', '--max-time', String(Math.ceil(TIMEOUT_MS / 1000)), ...args, url], { encoding: 'utf8' });
  if (result.error) return { ok: false, detail: result.error.message.slice(0, 120) };
  const code = (result.stdout || '').trim();
  return { ok: code.startsWith('2'), detail: `HTTP ${code || '000'} · ${Date.now() - started}ms${result.stderr ? ` · ${result.stderr.trim().slice(0, 80)}` : ''}` };
}

async function tryBrowser(url) {
  const started = Date.now();
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ userAgent: BROWSER_HEADERS['user-agent'], locale: 'ar-SA' });
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
      const html = await page.content();
      return { ok: Boolean(response?.ok()), detail: `HTTP ${response?.status() ?? '?'} · ${html.length}b · ${Date.now() - started}ms` };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { ok: false, detail: shortError(error) };
  }
}

const results = [];
for (const url of TARGETS) {
  const host = new URL(url).hostname;
  const a = await dns.resolve4(host).catch(() => []);
  const aaaa = await dns.resolve6(host).catch(() => []);

  const strategies = {
    'tcp:443 (ipv4)': a.length ? await tcpConnect(a[0], 443, 4) : { ok: false, detail: 'no A record' },
    'tcp:443 (ipv6)': aaaa.length ? await tcpConnect(aaaa[0], 443, 6) : { ok: false, detail: 'no AAAA record' },
    'fetch: bare': await tryFetch(url),
    'fetch: browser headers': await tryFetch(url, { headers: BROWSER_HEADERS }),
    'fetch: ipv4-only + headers': await tryFetch(url, {
      headers: BROWSER_HEADERS,
      dispatcher: new Agent({ connect: { family: 4, timeout: TIMEOUT_MS }, autoSelectFamily: false })
    }),
    'fetch: relaxed TLS + headers': await tryFetch(url, {
      headers: BROWSER_HEADERS,
      dispatcher: new Agent({ connect: { rejectUnauthorized: false, timeout: TIMEOUT_MS } })
    }),
    'curl: default': tryCurl(url),
    'curl: ipv4 + UA': tryCurl(url, ['-4', '-A', BROWSER_HEADERS['user-agent']]),
    'browser: chromium': await tryBrowser(url)
  };

  results.push({ url, host, dns: { a, aaaa }, strategies });

  console.log(`\n=== ${host} ===`);
  console.log(`    A: ${a.join(', ') || 'none'}   AAAA: ${aaaa.join(', ') || 'none'}`);
  for (const [name, outcome] of Object.entries(strategies)) {
    console.log(`    ${outcome.ok ? 'OK  ' : 'FAIL'} ${name.padEnd(30)} ${outcome.detail}`);
  }
}

// Optional second stage: reachability alone does not prove we can still HARVEST
// a source. If the runner can load a page only through Chromium, the question
// becomes whether our existing extractor still finds events in that HTML — the
// difference between "wire the browser fallback" and "the page changed shape
// and needs a new extractor". Set EVENTLIVE_PROBE_SOURCE_ID to answer it.
// Read-only: it runs the extractor in memory and reports counts. Nothing is
// written to data/, no candidate is published, no run state is touched.
const probeSourceId = process.env.EVENTLIVE_PROBE_SOURCE_ID || '';
let extractorDryRun = null;
if (probeSourceId) {
  const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'source_registry.json'), 'utf8'));
  const source = (registry.sources || registry).find((entry) => entry.id === probeSourceId);
  if (!source) {
    console.log(`\nEXTRACTOR_DRY_RUN skipped: no source '${probeSourceId}' in the registry`);
  } else {
    const collectors = await import('./collect-source-candidates.mjs');
    const extractor = collectors[`extract${probeSourceId.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}`]
      || collectors.extractQassimChamberEvents;
    const target = source.collector_url || source.url;
    console.log(`\n=== extractor dry-run: ${probeSourceId} (${target}) ===`);

    const httpAttempt = await fetch(target, { headers: BROWSER_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(async (response) => ({ status: response.status, html: await response.text() }))
      .catch((error) => ({ status: 0, html: '', error: shortError(error) }));
    let httpItems = [];
    try { httpItems = extractor(httpAttempt.html, source) || []; } catch (error) { httpAttempt.error = shortError(error); }
    console.log(`    http     HTTP ${httpAttempt.status} · ${httpAttempt.html.length}b · extracted ${httpItems.length} item(s)${httpAttempt.error ? ` · ${httpAttempt.error}` : ''}`);

    let browserHtml = '';
    let browserItems = [];
    let browserError = '';
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage({ userAgent: BROWSER_HEADERS['user-agent'], viewport: { width: 1280, height: 900 } });
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(3000);
        browserHtml = await page.content();
      } finally {
        await browser.close();
      }
      browserItems = extractor(browserHtml, source) || [];
    } catch (error) {
      browserError = shortError(error);
    }
    const challenged = /just a moment|cf-browser-verification|cdn-cgi\/challenge|request rejected|access denied/i.test(browserHtml);
    console.log(`    browser  ${browserHtml.length}b · extracted ${browserItems.length} item(s)${challenged ? ' · CHALLENGE PAGE' : ''}${browserError ? ` · ${browserError}` : ''}`);
    if (browserItems.length) {
      console.log(`    sample   ${JSON.stringify(browserItems[0]).slice(0, 220)}`);
    }
    extractorDryRun = {
      source_id: probeSourceId,
      target,
      http: { status: httpAttempt.status, bytes: httpAttempt.html.length, items: httpItems.length, error: httpAttempt.error || null },
      browser: { bytes: browserHtml.length, items: browserItems.length, challenge_page: challenged, error: browserError || null }
    };
  }
}

const reportPath = path.join(process.cwd(), 'reports', 'source-reachability-probe.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({
  schema: 'eventlive.source-reachability-probe.v1',
  generated_at: new Date().toISOString(),
  environment: process.env.GITHUB_ACTIONS ? 'github-actions-runner' : 'local',
  timeout_ms: TIMEOUT_MS,
  extractor_dry_run: extractorDryRun,
  results
}, null, 2)}\n`, 'utf8');

const summary = results.map((row) => {
  const winners = Object.entries(row.strategies).filter(([, outcome]) => outcome.ok).map(([name]) => name);
  return `${row.host}: ${winners.length ? `reachable via ${winners.join(', ')}` : 'UNREACHABLE by every strategy tried'}`;
});
console.log(`\nSOURCE_REACHABILITY_PROBE_DONE environment=${process.env.GITHUB_ACTIONS ? 'runner' : 'local'}`);
for (const line of summary) console.log(`  ${line}`);
