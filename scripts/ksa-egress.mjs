// Egress routing for geo-restricted Saudi sources.
//
// Measured 2026-08-05 from a GitHub-hosted runner: www.moc.gov.sa,
// www.mos.gov.sa and music.moc.gov.sa fail at TCP connect — before HTTP, TLS or
// any header — while the same URLs answer 200 from inside the Kingdom. A save
// request to archive.org's US crawler also fails to fetch them. So this is a
// geographic restriction on the origin, not bot filtering and not a defect in
// our extractors: no user-agent, TLS or browser strategy can cross it, and none
// should be invented to try.
//
// The only honest fix is an egress inside Saudi Arabia. Two ways to provide one,
// both plain infrastructure rather than a workaround:
//
//   1. EVENTLIVE_KSA_EGRESS_PROXY — an http(s) proxy URL on a Saudi network,
//      passed as a repository secret. Sources flagged requires_ksa_egress in
//      data/source_registry.json are then fetched through it; everything else
//      keeps going out directly, so one proxy does not become a single point of
//      failure for 88 sources.
//   2. A self-hosted runner inside the Kingdom, which needs no code at all —
//      the direct fetch simply succeeds there.
//
// Until one exists the affected sources stay flagged and the harvest status
// reports them as chronically dead, which is the truth rather than a silent gap.
import fs from 'node:fs';
import path from 'node:path';

let cachedHosts = null;

export function ksaEgressHosts(registryPath = path.join(process.cwd(), 'data', 'source_registry.json')) {
  if (cachedHosts) return cachedHosts;
  const hosts = new Set();
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    for (const source of registry.sources || registry) {
      if (!source?.requires_ksa_egress) continue;
      for (const candidate of [source.url, source.collector_url, ...(source.collector_pages || [])]) {
        if (!candidate) continue;
        try { hosts.add(new URL(candidate).hostname); } catch { /* ignore malformed entries */ }
      }
    }
  } catch { /* a missing registry simply means no routing */ }
  cachedHosts = hosts;
  return hosts;
}

export function requiresKsaEgress(url = '', hosts = ksaEgressHosts()) {
  try {
    return hosts.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Returns an undici dispatcher when this URL needs the Saudi egress AND one is
// configured. Returns null otherwise — including when the URL needs it and no
// proxy exists, so the request fails honestly instead of pretending to work.
export async function ksaEgressDispatcher(url = '', env = process.env) {
  const proxyUrl = String(env.EVENTLIVE_KSA_EGRESS_PROXY || '').trim();
  if (!proxyUrl || !requiresKsaEgress(url)) return null;
  try {
    const { ProxyAgent } = await import('undici');
    return new ProxyAgent(proxyUrl);
  } catch {
    return null;
  }
}

export function ksaEgressStatus(env = process.env) {
  const configured = Boolean(String(env.EVENTLIVE_KSA_EGRESS_PROXY || '').trim());
  return { configured, hosts: [...ksaEgressHosts()] };
}
