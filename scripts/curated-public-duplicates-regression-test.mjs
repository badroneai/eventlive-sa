import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collapseCuratedPublicDuplicates } from './curated-public-duplicates.mjs';
import { canonicalEventSlug, EVENT_ALIAS_PAGES } from './event-canonical-aliases.mjs';
import { eventIdentityKey, reconcileUrlLedger } from './published-url-ledger.mjs';

const raw = JSON.parse(fs.readFileSync(new URL('./fixtures/curated-public-duplicate-records.json', import.meta.url), 'utf8'));
const expectedPairs = [
  ['event-بي-إف-إل-مينا-11-نصف-النهائي-في-الرياض', 'event-pfl-mena-11-semi-finals-in-riyadh'],
  ['event-saudi-international-falcons-hunting-exhibition', 'event-saudi-falcons-hunting-exhibition']
];
const buildProjection = (rows) => rows.map((row) => ({
  ...row,
  file_slug: row.id,
  sessions: [{ session_type: 'attendance-window', inferred: true, source: 'event-start-end', starts_at: row.starts_at, ends_at: row.ends_at }]
}));
const publicRows = buildProjection(raw);
publicRows.excludedDraftLikeRecords = 2;
publicRows.excludedPublicSlugs = ['unrelated-draft'];
publicRows.recordExclusions = [{ id: 'unrelated-draft', reason: 'not-public-launch-record' }];
const beforeRaw = JSON.stringify(raw);
const beforePublic = JSON.stringify(publicRows);
const result = collapseCuratedPublicDuplicates(publicRows, raw);
assert.equal(result.events.length, 2);
assert.equal(result.exclusions.length, 2);
assert.equal(result.retainedAliases.length, result.exclusions.length, 'every consolidated alias retains its per-event evidence/calendar record');
assert.deepEqual([...result.redirects], expectedPairs, 'only the two reviewed pairs may collapse');
assert.equal(JSON.stringify(raw), beforeRaw, 'published source records and evidence must remain untouched');
assert.equal(JSON.stringify(publicRows), beforePublic, 'projection must not mutate its input');
assert.equal(result.events.excludedDraftLikeRecords, 2);
assert.deepEqual(result.events.excludedPublicSlugs, ['unrelated-draft']);
assert.equal(result.events.recordExclusions.length, 3);
for (const [alias, primary] of expectedPairs) {
  assert.equal(canonicalEventSlug(alias), '', 'guarded pairs must not have unconditional SEO aliases when their evidence no longer matches');
  assert.equal(EVENT_ALIAS_PAGES.has(`events/${alias}.html`), false, 'guard failure must restore independent sitemap eligibility');
  assert.equal(result.events.find((row) => row.id === primary), publicRows.find((row) => row.id === primary), 'primary fields, dates, precision, venue and evidence must not be synthesized or merged');
  assert.equal(result.retainedAliases.find((row) => row.id === alias), publicRows.find((row) => row.id === alias), 'retained alias fields must remain exactly the normalized original');
  assert.equal(result.exclusions.find((row) => row.id === alias).collapsed_onto, primary);
  assert.equal(result.exclusions.find((row) => row.id === alias).evidence_urls.length, 2);
}
assert.equal(canonicalEventSlug('event-cityscape-global'), 'event-cityscape-global-2026', 'unrelated static aliases must remain unchanged');
assert.deepEqual([...collapseCuratedPublicDuplicates([...publicRows].reverse(), [...raw].reverse()).redirects], expectedPairs, 'catalog order must not choose the canonical');
assert.equal(collapseCuratedPublicDuplicates(result.events, raw).events.length, 2, 'repeated projection must be idempotent');

for (const [aliasId, primaryId] of expectedPairs) {
  for (const id of [aliasId, primaryId]) {
    for (const [field, replacement] of [
      ['title', 'A similar-looking but different event'],
      ['city', 'Jeddah'],
      ['venue', 'Newly confirmed specific arena'],
      ['organizer', 'Different organizer'],
      ['starts_at', '2027-10-02T16:00:00+03:00'],
      ['ends_at', '2027-10-03T22:00:00+03:00'],
      ['source_url', 'https://example.invalid/different-event'],
      ['evidence_url', 'https://example.invalid/different-evidence'],
      ['time_precision', 'explicit'],
    ]) {
      const changed = structuredClone(raw);
      changed.find((row) => row.id === id)[field] = replacement;
      const guarded = collapseCuratedPublicDuplicates(buildProjection(changed), changed);
      assert.equal(guarded.redirects.has(aliasId), false, `${id}: changed ${field} must require review instead of discarding better/different evidence`);
      assert.equal(guarded.retainedAliases.some((row) => row.id === aliasId), false, 'inactive guards must not retain an obsolete compatibility alias');
      assert.ok(guarded.events.some((row) => row.id === aliasId));
      assert.ok(guarded.events.some((row) => row.id === primaryId));
    }
  }
  const rawWithAgenda = structuredClone(raw);
  rawWithAgenda.find((row) => row.id === aliasId).live_schedule_ready = true;
  assert.equal(collapseCuratedPublicDuplicates(buildProjection(rawWithAgenda), rawWithAgenda).redirects.has(aliasId), false, 'newly detailed agenda must remain visible');
  const publicWithAgenda = buildProjection(raw);
  publicWithAgenda.find((row) => row.id === aliasId).sessions.push({ title: 'Newly sourced session', session_type: 'session', inferred: false });
  assert.equal(collapseCuratedPublicDuplicates(publicWithAgenda, raw).redirects.has(aliasId), false, 'real new normalized agenda must not be confused with the inferred attendance window');
  const rawWithoutPrimary = raw.filter((row) => row.id !== primaryId);
  assert.equal(collapseCuratedPublicDuplicates(buildProjection(rawWithoutPrimary), rawWithoutPrimary).redirects.has(aliasId), false);
  const publicWithoutPrimary = publicRows.filter((row) => row.id !== primaryId);
  assert.ok(collapseCuratedPublicDuplicates(publicWithoutPrimary, raw).events.some((row) => row.id === aliasId), 'an ineligible primary must not erase a public alias');
}

const previous = { events: Object.fromEntries(raw.map((row) => [row.id, { identity: eventIdentityKey(row), first_seen: '2026-09-01', last_seen: '2026-09-29' }])) };
const ledger = reconcileUrlLedger(result.events, previous, '2026-09-30T12:00:00Z', result.redirects);
assert.deepEqual([...ledger.moved].sort(), [...result.redirects].sort());
assert.equal(ledger.retired.length, 0, 'a reviewed duplicate URL must move, never silently retire');
for (const [alias, primary] of expectedPairs) {
  assert.equal(ledger.state.events[alias].moved_to, primary);
  assert.equal(ledger.state.events[alias].first_seen, '2026-09-01');
}
const initialLedger = reconcileUrlLedger(result.events, { events: {} }, '2026-09-30T12:00:00Z', result.redirects);
assert.equal(initialLedger.moved.size, 2, 'old URLs must resolve even before a previous ledger exists');
const restoredLedger = reconcileUrlLedger(publicRows, ledger.state, '2026-10-01T12:00:00Z', new Map());
assert.equal(restoredLedger.moved.size, 0, 'restoring the alias reverses consolidation and removes its redirect');
const missingTargetLedger = reconcileUrlLedger([], previous, '2026-09-30T12:00:00Z', result.redirects);
assert.equal(missingTargetLedger.moved.size, 0, 'redirects must never point to missing primaries');

console.log('CURATED_PUBLIC_DUPLICATES_OK pairs=2 exact_guards=36 source_records=unchanged redirects=reversible');
