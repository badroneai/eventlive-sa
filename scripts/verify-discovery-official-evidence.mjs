import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const evidencePath = path.join(root, 'data', 'source_official_evidence.json');
const reportJsonPath = path.join(root, 'reports', 'source-official-evidence-report.json');
const reportMdPath = path.join(root, 'reports', 'source-official-evidence-report.md');
const verifiedAt = new Date().toISOString();

function hostOf(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeEvidenceText(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/&amp;/gi, '&')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function entryMatchesPayload(entry, payload = '') {
  const normalized = normalizeEvidenceText(payload);
  const groups = Array.isArray(entry.required_token_groups) ? entry.required_token_groups : [];
  return Boolean(normalized) && groups.length > 0 && groups.every((tokens) => (
    (Array.isArray(tokens) ? tokens : [tokens]).some((token) => normalized.includes(normalizeEvidenceText(token)))
  ));
}

function candidateMatchesEntry(candidate, entry) {
  if (candidate.title !== entry.title) return false;
  if (String(candidate.starts_at || '').slice(0, 10) !== entry.expected_start_date) return false;
  if (entry.expected_city && candidate.city !== entry.expected_city) return false;
  const discoveryHost = hostOf(candidate.discovery_source_url || candidate.source_url);
  return (entry.discovery_hosts || []).some((host) => discoveryHost === host || discoveryHost.endsWith(`.${host}`));
}

function verifiedCandidate(candidate, entry, timestamp) {
  const discoveryUrl = candidate.discovery_source_url || candidate.source_url;
  return {
    ...candidate,
    discovery_source_url: discoveryUrl,
    ticket_url: candidate.ticket_url || (/eventbrite\./i.test(discoveryUrl) ? discoveryUrl : ''),
    source_url: entry.official_url,
    evidence_url: entry.official_url,
    source_label: entry.source_label,
    source_owner: entry.source_owner,
    organizer: entry.organizer || entry.source_owner,
    category: entry.category || candidate.category,
    summary: entry.summary || candidate.summary,
    rich_summary: entry.summary || candidate.rich_summary || candidate.summary,
    confidence: 'verified-secondary',
    publication_gate: 'secondary-verified',
    review_status: 'ready-for-review',
    secondary_verified_at: timestamp,
    secondary_verification_kind: 'official-source-evidence',
    verification_method: 'directory-official-link-page-confirmation',
    reviewer_notes: `${candidate.reviewer_notes || ''} Official first-party page matched title, start date, city, and venue tokens on ${timestamp}.`.trim(),
    tags: [...new Set([...(entry.tags || candidate.tags || []), 'official-source-evidence'])].slice(0, 10)
  };
}

function evidenceIdentity(candidate) {
  return [candidate.source_url, candidate.title, String(candidate.starts_at || '').slice(0, 10)]
    .map(normalizeEvidenceText)
    .join('|');
}

function dedupeVerifiedCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const key = evidenceIdentity(candidate);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }
    const preferred = existing.matched_catalog_event_id ? existing : candidate;
    const secondary = preferred === existing ? candidate : existing;
    byKey.set(key, {
      ...secondary,
      ...preferred,
      ticket_url: preferred.ticket_url || secondary.ticket_url || '',
      discovery_source_url: preferred.discovery_source_url || secondary.discovery_source_url || '',
      reviewer_notes: [...new Set([preferred.reviewer_notes, secondary.reviewer_notes].filter(Boolean))].join(' ')
    });
  }
  return [...byKey.values()].sort((a, b) => String(a.starts_at || '').localeCompare(String(b.starts_at || '')));
}

function applyEvidenceEntries(candidates, entries, payloadByUrl, timestamp = verifiedAt) {
  const results = [];
  let updated = [...candidates];
  for (const entry of entries) {
    if (entry.status !== 'active') {
      results.push({ id: entry.id, status: 'radar', matched: 0, note: entry.radar_reason || 'Policy radar only.' });
      continue;
    }
    const payload = payloadByUrl.get(entry.official_url) || '';
    if (!entryMatchesPayload(entry, payload)) {
      results.push({ id: entry.id, status: 'failed', matched: 0, note: 'Required official title/date/venue tokens did not all match.' });
      continue;
    }
    let matched = 0;
    updated = updated.map((candidate) => {
      if (!candidateMatchesEntry(candidate, entry)) return candidate;
      matched += 1;
      return verifiedCandidate(candidate, entry, timestamp);
    });
    results.push({ id: entry.id, status: matched ? 'verified' : 'no-candidate', matched, note: matched ? 'Official evidence matched.' : 'No matching discovery candidate in the current queue.' });
  }
  const beforeDedupe = updated.length;
  updated = dedupeVerifiedCandidates(updated);
  return { candidates: updated, results, deduplicated: beforeDedupe - updated.length };
}

function scriptUrls(html, pageUrl) {
  const pageOrigin = new URL(pageUrl).origin;
  return [...html.matchAll(/<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi)]
    .map((match) => new URL(match[1], pageUrl).toString())
    .filter((url) => new URL(url).origin === pageOrigin)
    .slice(0, 4);
}

async function fetchEvidencePayload(url) {
  const headers = {
    accept: 'text/html,application/javascript,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9,ar;q=0.8',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36'
  };
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  const html = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const modules = await Promise.all(scriptUrls(html, url).map(async (scriptUrl) => {
    try {
      const scriptResponse = await fetch(scriptUrl, { headers, signal: AbortSignal.timeout(30_000) });
      return scriptResponse.ok ? await scriptResponse.text() : '';
    } catch {
      return '';
    }
  }));
  return [html, ...modules].join('\n');
}

function writeReport(report) {
  writeJson(reportJsonPath, report);
  const lines = [
    '# EventLive Official Evidence Verification',
    '',
    `- generated_at: ${report.generated_at}`,
    `- entries: ${report.totals.entries}`,
    `- verified_entries: ${report.totals.verified_entries}`,
    `- candidates_verified: ${report.totals.candidates_verified}`,
    `- deduplicated: ${report.totals.deduplicated}`,
    '',
    '| Entry | Status | Candidates | Note |',
    '|---|---|---:|---|',
    ...report.results.map((row) => `| ${row.id} | ${row.status} | ${row.matched} | ${row.note} |`)
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  if (!exists(candidatesPath) || !exists(evidencePath)) throw new Error('Official evidence inputs are missing.');
  const envelope = readJson(candidatesPath);
  const evidence = readJson(evidencePath);
  const entries = Array.isArray(evidence.entries) ? evidence.entries : [];
  const payloadByUrl = new Map();
  for (const entry of entries.filter((row) => row.status === 'active')) {
    try {
      payloadByUrl.set(entry.official_url, await fetchEvidencePayload(entry.official_url));
    } catch (error) {
      payloadByUrl.set(entry.official_url, '');
      entry.fetch_error = error.message;
    }
  }
  const outcome = applyEvidenceEntries(envelope.candidates || [], entries, payloadByUrl, verifiedAt);
  writeJson(candidatesPath, { ...envelope, candidates: outcome.candidates });
  ensureDir(path.dirname(reportJsonPath));
  const report = {
    schema: 'eventlive.source-official-evidence-report.v1',
    generated_at: verifiedAt,
    source_candidates: rel(candidatesPath),
    source_evidence: rel(evidencePath),
    totals: {
      entries: entries.length,
      verified_entries: outcome.results.filter((row) => row.status === 'verified').length,
      candidates_verified: outcome.results.reduce((sum, row) => sum + row.matched, 0),
      deduplicated: outcome.deduplicated
    },
    results: outcome.results.map((row) => {
      const entry = entries.find((item) => item.id === row.id);
      return entry?.fetch_error ? { ...row, note: `${row.note} Fetch: ${entry.fetch_error}` } : row;
    })
  };
  writeReport(report);
  console.log(`# EventLive Official Evidence`);
  console.log(`- Verified entries: ${report.totals.verified_entries}`);
  console.log(`- Candidates verified: ${report.totals.candidates_verified}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`SOURCE_OFFICIAL_EVIDENCE_FAILED ${error.message}`);
    process.exit(1);
  });
}

export { applyEvidenceEntries, entryMatchesPayload };
