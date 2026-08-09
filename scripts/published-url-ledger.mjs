// Ledger of every event URL this site has ever published.
//
// 2026-08-09, from Search Console: 90 indexed URLs return 404. Tracing all ten
// retired event slugs through git history showed the site had no idea which
// ones died and which ones simply MOVED — the page was deleted either way, and
// whatever ranking the URL had accumulated went with it.
//
// The split matters and is not fuzzy:
//
//   MOVED  — the same event is still published under a different slug. The old
//            URL must redirect. Observed cause: a title carrying an HTML entity
//            ("Saudi Logistic &#038; Warehousing Expo") slugified as
//            "saudi-logistic-038-warehousing-expo"; when the entity was decoded
//            at ingestion the title corrected, the slug changed with it, and the
//            indexed URL died. PR #93 stops new entity corruption; this stops
//            the URL loss whatever causes the rename.
//
//   RETIRED — the source stopped publishing the event. Nothing survives it, and
//            404 is the correct, honest answer. Recorded, not redirected.
//
// Identity is EXACT (title + city + start day). Deliberately not fuzzy: a
// 60%-title match "recovers" a 2025 occurrence of a recurring Ithra programme
// onto its 2026 edition, which would send a visitor looking for a past event to
// a different date. An unmatched slug is retired, and being wrong in that
// direction only costs a 404 that was already correct.

import fs from 'node:fs';
import path from 'node:path';
import { LEGACY_REDIRECT_PAGES } from './legacy-redirect-pages.mjs';

const root = process.cwd();
const ledgerPath = path.join(root, 'data', 'published_url_ledger.json');

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Exact identity of an event across slug renames: title + city + start day. */
export function eventIdentityKey(event = {}) {
  const title = normalizeText(event.title_original || event.title);
  const city = normalizeText(event.city || event.city_label);
  const day = String(event.starts_at || '').slice(0, 10);
  if (!title || !day) return '';
  return `${title}|${city}|${day}`;
}

export function eventLedgerSlug(event = {}) {
  return String(event.file_slug || event.id || '').normalize('NFC').trim();
}

export function loadUrlLedger() {
  try {
    const parsed = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    return parsed && typeof parsed.events === 'object' && parsed.events ? parsed : { version: 1, events: {} };
  } catch {
    return { version: 1, events: {} };
  }
}

export function saveUrlLedger(state, generatedAt = new Date().toISOString()) {
  const payload = { version: 1, generated_at: generatedAt, events: state.events || {} };
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.writeFileSync(ledgerPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/**
 * Reconciles the ledger against the events being published now.
 *
 * @param {Array<object>} events every event in this build
 * @param {object} previous the ledger as last committed
 * @param {string} buildAt ISO timestamp for this build
 * @returns {{state: object, moved: Map<string,string>, retired: string[]}}
 *   `moved` maps an old slug to the slug that now carries the same event.
 */
export function reconcileUrlLedger(events = [], previous = { events: {} }, buildAt = new Date().toISOString()) {
  const previousEvents = previous?.events && typeof previous.events === 'object' ? previous.events : {};
  const day = buildAt.slice(0, 10);

  const liveBySlug = new Map();
  const liveByIdentity = new Map();
  for (const event of events) {
    const slug = eventLedgerSlug(event);
    if (!slug) continue;
    liveBySlug.set(slug, event);
    const identity = eventIdentityKey(event);
    // First writer wins: two live events sharing an identity is a duplicate
    // problem (TECH-DEBT #6), not a rename, and must not make the target of a
    // redirect depend on catalog ordering.
    if (identity && !liveByIdentity.has(identity)) liveByIdentity.set(identity, slug);
  }

  const nextEvents = {};
  const moved = new Map();
  const retired = [];

  // Every currently published slug is (re)recorded as live.
  for (const [slug, event] of liveBySlug) {
    const before = previousEvents[slug] || {};
    nextEvents[slug] = {
      identity: eventIdentityKey(event),
      first_seen: before.first_seen || day,
      last_seen: day
    };
  }

  // Everything the ledger knows that is no longer published: moved or retired.
  for (const [slug, entry] of Object.entries(previousEvents)) {
    if (liveBySlug.has(slug)) continue;
    const identity = entry.identity || '';
    const target = identity ? liveByIdentity.get(identity) : undefined;
    if (target && target !== slug) {
      moved.set(slug, target);
      nextEvents[slug] = { ...entry, last_seen: entry.last_seen || day, moved_to: target, moved_at: entry.moved_at || day };
      continue;
    }
    // A slug that was already redirecting keeps redirecting only while its
    // target is still published; otherwise it joins the retired set.
    if (entry.moved_to && liveBySlug.has(entry.moved_to)) {
      moved.set(slug, entry.moved_to);
      nextEvents[slug] = { ...entry };
      continue;
    }
    retired.push(slug);
    nextEvents[slug] = { ...entry, moved_to: undefined, retired_at: entry.retired_at || day };
  }

  return { state: { version: 1, events: nextEvents }, moved, retired: retired.sort() };
}

/** dist-relative paths of every event page that is now a rename redirect stub. */
export function movedEventStubPaths(ledger = loadUrlLedger()) {
  return new Set(
    Object.entries(ledger.events || {})
      .filter(([, entry]) => entry?.moved_to)
      .map(([slug]) => `events/${slug}.html`.normalize('NFC'))
  );
}

/**
 * Is this dist page a redirect stub (retired category slug or renamed event)?
 *
 * Language-blind on purpose: every stub ships an English mirror, because a stub
 * that exists only in Arabic leaves /en/<path> returning 404 — the defect
 * Search Console reported on 2026-08-09. Any gate that skips stubs must skip
 * both surfaces or it will start failing on the mirror alone.
 */
export function isRedirectStubPath(relativePath, movedPaths = movedEventStubPaths()) {
  const bare = String(relativePath).replace(/^en\//, '').normalize('NFC');
  return LEGACY_REDIRECT_PAGES.has(bare) || movedPaths.has(bare);
}
