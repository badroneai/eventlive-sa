// Finds a working Saudi egress at runtime, from open proxy lists.
//
// Context: www.moc.gov.sa, www.mos.gov.sa and music.moc.gov.sa refuse
// connections from GitHub-hosted runners at TCP level while answering normally
// from inside the Kingdom (measured 2026-08-05, see EVENTME-SOURCE-ACQUISITION.md).
// scripts/ksa-egress.mjs can route those origins through EVENTLIVE_KSA_EGRESS_PROXY,
// but that assumes somebody owns an egress. This script asks whether a public
// one exists that actually works, and proves it against the real origin rather
// than against a generic "am I online" endpoint.
//
// It is deliberately conservative:
//   - open, public proxy lists only (proxifly, published on a CDN, MIT);
//   - Saudi exits only, because the restriction is geographic;
//   - every candidate is validated against the real target origin before it is
//     reported as usable — a proxy that answers 200 for example.com and fails
//     for moc.gov.sa is worthless here;
//   - it never carries credentials. These are public government pages, and the
//     candidates they produce still pass the same review gates as any other
//     source, so a hostile proxy can inject nothing that the pipeline would
//     publish unreviewed.
import { Agent, ProxyAgent } from 'undici';

const LISTS = [
  'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/SA/data.json',
  'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/countries/SA/data.json'
];

const VALIDATION_TARGET = process.env.EVENTLIVE_KSA_PROXY_TEST_URL || 'https://www.moc.gov.sa/en/Modules/Pages/Cultural-Calendar';
const TIMEOUT_MS = Number(process.env.EVENTLIVE_KSA_PROXY_TIMEOUT_MS || 15000);
const MAX_CANDIDATES = Number(process.env.EVENTLIVE_KSA_PROXY_MAX_CANDIDATES || 40);

export async function fetchCandidateProxies() {
  for (const listUrl of LISTS) {
    try {
      const response = await fetch(listUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) continue;
      const rows = await response.json();
      const candidates = (Array.isArray(rows) ? rows : [])
        .filter((row) => /^(http|https|socks4|socks5)$/i.test(String(row.protocol || '')))
        // undici's ProxyAgent speaks HTTP(S) proxies only; SOCKS would need an extra dependency.
        .filter((row) => /^https?$/i.test(String(row.protocol || '')))
        .map((row) => row.proxy || `${row.protocol}://${row.ip}:${row.port}`)
        .filter(Boolean);
      if (candidates.length) return candidates.slice(0, MAX_CANDIDATES);
    } catch { /* try the next mirror */ }
  }
  return [];
}

export async function validateProxy(proxyUrl, target = VALIDATION_TARGET) {
  const started = Date.now();
  let dispatcher;
  try {
    dispatcher = new ProxyAgent({ uri: proxyUrl, connectTimeout: TIMEOUT_MS, requestTimeout: TIMEOUT_MS });
    const response = await fetch(target, {
      dispatcher,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const body = await response.text();
    // A proxy that returns its own error page, an ISP portal or an empty body is
    // not a working egress even when the status code says 200.
    const plausible = response.ok && body.length > 2000 && /<html/i.test(body);
    return { proxy: proxyUrl, ok: plausible, status: response.status, bytes: body.length, ms: Date.now() - started };
  } catch (error) {
    return { proxy: proxyUrl, ok: false, status: 0, bytes: 0, ms: Date.now() - started, error: String(error?.cause?.code || error?.message || error).slice(0, 60) };
  } finally {
    await dispatcher?.close?.().catch(() => {});
  }
}

export async function discoverWorkingKsaProxy(target = VALIDATION_TARGET) {
  const candidates = await fetchCandidateProxies();
  if (!candidates.length) return { proxy: null, tested: 0, candidates: 0 };
  let tested = 0;
  // Sequential on purpose: free proxies are slow and flaky, and a burst of
  // parallel connections through them looks exactly like abuse.
  for (const candidate of candidates) {
    const result = await validateProxy(candidate, target);
    tested += 1;
    if (result.ok) return { proxy: candidate, tested, candidates: candidates.length, detail: result };
  }
  return { proxy: null, tested, candidates: candidates.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const direct = await fetch(VALIDATION_TARGET, { dispatcher: new Agent({ connectTimeout: TIMEOUT_MS }), signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then((response) => `HTTP ${response.status}`)
    .catch((error) => `FAIL ${String(error?.cause?.code || error?.message).slice(0, 40)}`);
  console.log(`KSA_PROXY_DISCOVERY target=${VALIDATION_TARGET}`);
  console.log(`  direct (no proxy): ${direct}`);
  const outcome = await discoverWorkingKsaProxy();
  if (outcome.proxy) {
    console.log(`KSA_PROXY_DISCOVERY_OK proxy=${outcome.proxy} tested=${outcome.tested}/${outcome.candidates} bytes=${outcome.detail.bytes} ms=${outcome.detail.ms}`);
  } else {
    console.log(`KSA_PROXY_DISCOVERY_NONE tested=${outcome.tested}/${outcome.candidates} — no public Saudi proxy reached the origin`);
  }
}
