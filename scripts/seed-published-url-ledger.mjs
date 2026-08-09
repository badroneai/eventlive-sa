#!/usr/bin/env node
// One-time backfill for data/published_url_ledger.json.
//
// The ledger only knows what it has seen. Starting it empty would protect every
// FUTURE slug rename while leaving the URLs that already died invisible — and
// those are precisely the ones Search Console is reporting as 404.
//
// Reconstructs the full history of published event slugs from what the repo
// already commits: data/seo_page_state.json (one entry per published event page,
// committed by every sync since 2026-07-11) for the slugs, and the catalog files
// for each slug's identity (title + city + start day).
//
// Safe to re-run: it only ADDS slugs the ledger does not already carry, and
// never edits an entry the build has written. Run once, commit the result, then
// let reconcileUrlLedger() maintain it.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { eventIdentityKey, eventLedgerSlug, loadUrlLedger, saveUrlLedger } from './published-url-ledger.mjs';

const root = process.cwd();
const STATE_FILE = 'data/seo_page_state.json';
const CATALOG_FILES = ['data/events_catalog.json', 'data/source_ended_events.json'];

function git(args) {
  return execFileSync('git', args, { cwd: root, maxBuffer: 1024 * 1024 * 512 }).toString();
}

function showJson(commit, file) {
  try {
    return JSON.parse(git(['show', `${commit}:${file}`]));
  } catch {
    return null;
  }
}

function commitsFor(files) {
  return git(['log', '--format=%H%x09%ad', '--date=short', '--', ...files])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'));
}

console.log('reading published-slug history from', STATE_FILE);
const stateCommits = commitsFor([STATE_FILE]);
// Newest commit first, so the first time a slug is seen going backwards is its
// last_seen, and the last time is its first_seen.
const seen = new Map();
for (const [commit, date] of stateCommits) {
  const state = showJson(commit, STATE_FILE);
  if (!state?.pages) continue;
  for (const slug of Object.keys(state.pages)) {
    const entry = seen.get(slug);
    if (entry) entry.first_seen = date;
    else seen.set(slug, { first_seen: date, last_seen: date });
  }
}
console.log(`  ${stateCommits.length} commits scanned, ${seen.size} distinct slugs ever published`);

console.log('recovering identities from catalog history');
const identities = new Map();
const catalogCommits = commitsFor(CATALOG_FILES);
for (const [commit] of catalogCommits) {
  if (identities.size >= seen.size) break;
  for (const file of CATALOG_FILES) {
    const parsed = showJson(commit, file);
    if (!parsed) continue;
    for (const event of parsed.events || parsed.ended_events || []) {
      const slug = eventLedgerSlug(event);
      if (!slug || identities.has(slug) || !seen.has(slug)) continue;
      const identity = eventIdentityKey(event);
      if (identity) identities.set(slug, identity);
    }
  }
}
console.log(`  ${catalogCommits.length} commits scanned, ${identities.size}/${seen.size} identities recovered`);

const ledger = loadUrlLedger();
ledger.events = ledger.events || {};
let added = 0;
let skippedNoIdentity = 0;
for (const [slug, dates] of seen) {
  if (ledger.events[slug]) continue;
  const identity = identities.get(slug);
  // A slug with no recoverable identity cannot be matched to a rename target,
  // so recording it would only assert "this once existed" without enabling any
  // decision. Left out deliberately rather than stored as a half-entry.
  if (!identity) { skippedNoIdentity += 1; continue; }
  ledger.events[slug] = { identity, first_seen: dates.first_seen, last_seen: dates.last_seen };
  added += 1;
}

saveUrlLedger(ledger);
console.log(`seed-published-url-ledger: added=${added} skipped_no_identity=${skippedNoIdentity} total=${Object.keys(ledger.events).length}`);
console.log(`wrote ${path.join('data', 'published_url_ledger.json')}`);
