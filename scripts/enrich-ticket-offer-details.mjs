import fs from 'node:fs';
import path from 'node:path';
import {
  supportsTicketOfferUrl,
  ticketOfferEvidenceFromHtml
} from './ticket-offer-utils.mjs';

const root = process.cwd();
const catalogPath = path.resolve(process.env.EVENTLIVE_TICKET_OFFER_CATALOG || path.join(root, 'data', 'events_catalog.json'));
const reportJsonPath = path.resolve(process.env.EVENTLIVE_TICKET_OFFER_REPORT_JSON || path.join(root, 'reports', 'ticket-offer-enrichment-report.json'));
const reportMdPath = path.resolve(process.env.EVENTLIVE_TICKET_OFFER_REPORT_MD || path.join(root, 'reports', 'ticket-offer-enrichment-report.md'));
const timeoutMs = Number(process.env.EVENTLIVE_TICKET_OFFER_TIMEOUT_MS || 12_000);
const maxTargets = Number(process.env.EVENTLIVE_TICKET_OFFER_LIMIT || 20);
const now = new Date();
const checkedAt = now.toISOString();

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function actionUrl(event = {}) {
  return String(event.ticket_url || event.registration_url || '').trim();
}

function isCurrentEvent(event = {}) {
  const end = Date.parse(event.ends_at || event.starts_at || '');
  return Number.isFinite(end) && end >= now.getTime();
}

function hostFrom(url = '') {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'invalid';
  }
}

function looksBlocked(html = '') {
  return /cf-chl-|access denied|forbidden|تم حظرك|verify you are human|just a moment\.\.\./i.test(String(html));
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'EventLive/1.0 (+https://eventme.live/methodology.html)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ar,en;q=0.8'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    if (looksBlocked(html)) throw new Error('protected-or-challenge-page');
    return html;
  } finally {
    clearTimeout(timer);
  }
}

function markdown(report) {
  const rows = report.results.map((row) => `| ${row.id} | ${row.host} | ${row.status} | ${row.price_label || '—'} | ${row.method || row.reason || '—'} |`).join('\n');
  return `# Ticket offer enrichment\n\n- Checked at: ${report.checked_at}\n- Targets: ${report.targets}\n- Evidence found: ${report.evidence_found}\n- Catalog prices changed: ${report.changed}\n- No evidence: ${report.no_evidence}\n- Failed safely: ${report.failed}\n\n| Event | Host | Status | Lowest price | Evidence |\n|---|---|---|---:|---|\n${rows || '| — | — | no-targets | — | — |'}\n`;
}

async function inspectTarget(target) {
  const url = actionUrl(target);
  const host = hostFrom(url);
  try {
    const html = await fetchHtml(url);
    const offer = ticketOfferEvidenceFromHtml(url, html);
    if (!offer) return { id: target.id, host, url, status: 'no-evidence', reason: 'no-explicit-public-price' };
    return {
      id: target.id,
      host,
      url,
      status: 'evidence',
      price_label: offer.priceLabel,
      price: offer.price,
      price_currency: offer.priceCurrency,
      method: offer.method
    };
  } catch (error) {
    return { id: target.id, host, url, status: 'failed', reason: error?.message || String(error) };
  }
}

async function main() {
  const catalog = readJson(catalogPath);
  const events = Array.isArray(catalog.events) ? catalog.events : [];
  const targets = events
    .filter((event) => isCurrentEvent(event) && supportsTicketOfferUrl(actionUrl(event)))
    .slice(0, Math.max(0, maxTargets));

  const grouped = new Map();
  for (const target of targets) {
    const host = hostFrom(actionUrl(target));
    if (!grouped.has(host)) grouped.set(host, []);
    grouped.get(host).push(target);
  }

  const nestedResults = await Promise.all([...grouped.values()].map(async (group) => {
    const rows = [];
    for (const target of group) rows.push(await inspectTarget(target));
    return rows;
  }));
  const results = nestedResults.flat();
  let changed = 0;
  for (const result of results) {
    if (result.status !== 'evidence') continue;
    const event = events.find((entry) => entry.id === result.id);
    if (!event || event.price_label === result.price_label) continue;
    event.price_label = result.price_label;
    event.updated_at = checkedAt;
    changed += 1;
  }

  if (changed) writeJson(catalogPath, catalog);
  const report = {
    checked_at: checkedAt,
    targets: targets.length,
    evidence_found: results.filter((row) => row.status === 'evidence').length,
    changed,
    no_evidence: results.filter((row) => row.status === 'no-evidence').length,
    failed: results.filter((row) => row.status === 'failed').length,
    results
  };
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, markdown(report));
  console.log(`TICKET_OFFER_ENRICHMENT_OK targets=${report.targets} evidence=${report.evidence_found} changed=${report.changed} no_evidence=${report.no_evidence} failed=${report.failed}`);
}

await main();
