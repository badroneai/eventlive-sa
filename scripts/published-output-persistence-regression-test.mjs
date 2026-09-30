// On 2026-09-04 the sync went red three times in a row and did not publish. The
// entire diagnosis available in the log was:
//
//   SOURCE_HEALTH_FAIL published output was not preserved: public_delta=5 published_new=6
//
// No id, no reason, no way to tell whether an event had genuinely vanished or had
// simply been folded onto the record it duplicates. The ids existed — the ledger
// had computed them into its own report file — and were never printed.
//
// Two defects, one class: the build dropped records in silence, and the gate
// reported a number instead of a name.

import assert from 'node:assert/strict';
import './curated-public-duplicates-regression-test.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { classifyPublishedOutput, COLLAPSE_REASONS } from './published-output-persistence.mjs';

const distIds = new Set(['kept-one']);
const publishedIds = ['kept-one', 'gone-one'];

// Present in the output: nothing to report.
assert.equal(classifyPublishedOutput({ publishedIds: ['kept-one'], distIds }).lost, false);

// Collapsed onto a primary: published, under that primary. NOT a loss — this is
// the case that blocked the pipeline, and it is the common one (23 of 26 records
// dropped by an ordinary build).
for (const reason of COLLAPSE_REASONS) {
  const collapsed = classifyPublishedOutput({
    publishedIds,
    distIds,
    buildExclusions: new Map([['gone-one', { reason, collapsed_onto: 'kept-one' }]])
  });
  assert.equal(collapsed.lost, false, `${reason} means published under a primary, not lost`);
  assert.equal(collapsed.collapsed[0].collapsed_onto, 'kept-one', 'the primary must be named, not merely counted');
}

for (const collapsed_onto of ['', 'missing-primary']) {
  const lostCuratedAlias = classifyPublishedOutput({
    publishedIds: ['gone-one'],
    distIds,
    buildExclusions: new Map([['gone-one', { reason: 'duplicate-curated-alias', collapsed_onto }]])
  });
  assert.equal(lostCuratedAlias.lost, true, 'a curated alias is represented only when its named primary survives');
  assert.equal(lostCuratedAlias.collapsed.length, 0);
}
const representedCuratedAlias = classifyPublishedOutput({
  publishedIds: ['gone-one'],
  distIds,
  buildExclusions: new Map([['gone-one', { reason: 'duplicate-curated-alias', collapsed_onto: 'kept-one' }]])
});
assert.equal(representedCuratedAlias.lost, false, 'a curated alias with a surviving exact primary is represented');
assert.equal(representedCuratedAlias.collapsed[0]?.collapsed_onto, 'kept-one');

// The build refused to publish it: auto-publish and the build disagree. Real, and
// it must still stop the run — with the reason attached.
const refused = classifyPublishedOutput({
  publishedIds,
  distIds,
  buildExclusions: new Map([['gone-one', { reason: 'not-public-launch-record' }]])
});
assert.equal(refused.lost, true, 'a publish/build disagreement must still alarm');
assert.match(refused.missing[0], /not-public-launch-record/, 'and must say which disagreement');

// Absent with no recorded reason: a genuine loss, and the message says the build
// had nothing to say about it — which is the difference that matters.
const vanished = classifyPublishedOutput({ publishedIds, distIds });
assert.equal(vanished.lost, true);
assert.match(vanished.missing[0], /build recorded no exclusion/);

// ---------- escalation by scale ----------
// One record that never reached dist/events.json held 1,118 events and 3,296
// pages off the site for 69 hours, across six runs, because this gate blocked on
// any loss at all. It now blocks only when NOTHING published survived — a broken
// output path — and reports a partial loss at full volume while the rest of the
// catalog still reaches its readers.
const partial = classifyPublishedOutput({
  publishedIds: ['kept-one', 'gone-one'],
  distIds: new Set(['kept-one'])
});
assert.equal(partial.severity, 'partial');
assert.equal(partial.blocking, false, 'a partial loss must not freeze the site');
assert.equal(partial.lost, true, 'but it is still a loss, and still reported');

const total = classifyPublishedOutput({ publishedIds: ['gone-one', 'gone-two'], distIds: new Set() });
assert.equal(total.severity, 'total');
assert.equal(total.blocking, true, 'nothing surviving is a broken output path and must block the publish');

assert.equal(classifyPublishedOutput({ publishedIds: ['kept-one'], distIds: new Set(['kept-one']) }).severity, 'none');
// A collapse is not a loss, so it cannot make a run "total" either.
assert.equal(
  classifyPublishedOutput({
    publishedIds: ['gone-one'],
    distIds: new Set(),
    buildExclusions: new Map([['gone-one', { reason: 'duplicate-semantic', collapsed_onto: 'kept-one' }]])
  }).severity,
  'none',
  'a cycle whose only absence is a collapse has lost nothing'
);

const healthGate = fs.readFileSync(path.join(process.cwd(), 'scripts', 'source-health-gate.mjs'), 'utf8');
assert.match(healthGate, /persistence_severity/, 'the gate must read the severity, not just the boolean');
assert.match(healthGate, /SOURCE_HEALTH_NONBLOCKING_FINDING/, 'a partial loss must be reported at full volume');
assert.match(healthGate, /source-health-nonblocking-finding\.txt/, 'and must leave a marker the run verdict can act on');

const syncWorkflow = fs.readFileSync(path.join(process.cwd(), '.github', 'workflows', 'source-sync.yml'), 'utf8');
const verdictBlock = syncWorkflow.slice(syncWorkflow.indexOf('source-health-nonblocking-finding.txt'));
assert.ok(verdictBlock.length > 0, 'the run verdict must consult the marker');
assert.match(
  verdictBlock,
  /exit 1/,
  'a published-but-lossy run must still end RED — publishing anyway and going green would hide the defect entirely'
);

// ---------- the two halves must stay connected ----------
const root = process.cwd();
const generator = fs.readFileSync(path.join(root, 'scripts', 'generate-site.mjs'), 'utf8');
assert.match(
  generator,
  /build-record-exclusions\.json/,
  'the build must write what it dropped; without that file every absence looks identical'
);
// Anchored on the dedupe branch itself, not on the file. The build's silence was
// the root defect, and it comes back the moment this branch stops carrying either
// half: the reason (what kind of drop) or the primary (what represents it now).
// A file-wide match for the string "duplicate-source-identity" survives blanking
// both, which is exactly what a negative check found.
const dedupeBranch = generator.slice(generator.indexOf('const duplicateOf ='), generator.indexOf('seenIds.add(idKey)'));
assert.ok(dedupeBranch.length > 200, 'the dedupe branch must exist in generate-site.mjs');
assert.match(dedupeBranch, /reason:\s*duplicateOf\.reason/, 'a collapsed record must carry the reason it was collapsed');
assert.match(dedupeBranch, /collapsed_onto:\s*keptByKey\.get/, 'a collapsed record must name the record that now represents it');

const gate = fs.readFileSync(path.join(root, 'scripts', 'source-health-gate.mjs'), 'utf8');
assert.match(gate, /missing_published_ids/, 'the gate must print the ids it already has');
assert.match(gate, /collapsed_published_ids/, 'and the collapses, so a reader can see what was ruled out');

// The exclusions file is what makes the distinction possible at all. If a build
// has run, it must be there and it must describe records.
const exclusionsPath = path.join(root, 'reports', 'build-record-exclusions.json');
if (fs.existsSync(exclusionsPath)) {
  const parsed = JSON.parse(fs.readFileSync(exclusionsPath, 'utf8'));
  assert.equal(parsed.schema, 'eventlive.build-record-exclusions.v1');
  assert.ok(Array.isArray(parsed.excluded), 'the exclusions file must carry a list, not only a count');
  for (const row of parsed.excluded.slice(0, 50)) {
    assert.ok(row.reason, 'every dropped record must carry a reason');
    if (COLLAPSE_REASONS.has(row.reason)) {
      assert.ok(row.collapsed_onto, `${row.id || row.slug}: a collapse must name the record it collapsed onto`);
    }
  }
  // Guarded discovery consolidation must not strand a previously published
  // URL or discard its original evidence/clock-precision metadata. This reads
  // only the pairs this build actually consolidated, never an expected source
  // volume or a fixed assumption that upstream facts remain unchanged.
  const curatedRows = parsed.excluded.filter((row) => row.reason === 'duplicate-curated-alias');
  if (curatedRows.length) {
    const publicRows = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'events.json'), 'utf8')).events || [];
    const publicById = new Map(publicRows.map((row) => [row.id, row]));
    const catalogRows = JSON.parse(fs.readFileSync(path.join(root, 'data', 'events_catalog.json'), 'utf8')).events || [];
    const catalogById = new Map(catalogRows.map((row) => [row.id, row]));
    for (const row of curatedRows) {
      const primary = publicById.get(row.collapsed_onto);
      const original = catalogById.get(row.id);
      assert.ok(primary, `${row.id}: consolidated primary must survive in public output`);
      assert.ok(original, `${row.id}: original source record must remain in the catalog`);
      assert.equal(original.approval_status, 'published', `${row.id}: consolidation must not unpublish the original source record`);
      assert.equal(publicById.has(row.id), false, `${row.id}: duplicate must be absent from discovery`);
      const primarySlug = primary.file_slug || primary.id;
      for (const languagePrefix of ['', 'en/']) {
        const target = `https://eventme.live/${languagePrefix}events/${primarySlug}.html`;
        const aliasPath = path.join(root, 'dist', languagePrefix, 'events', `${row.slug}.html`);
        const primaryPath = path.join(root, 'dist', languagePrefix, 'events', `${primarySlug}.html`);
        assert.ok(fs.existsSync(primaryPath), `${row.id}: ${languagePrefix || 'Arabic '}redirect target must exist`);
        assert.ok(fs.existsSync(aliasPath), `${row.id}: old ${languagePrefix || 'Arabic '}detail URL must still resolve`);
        const $ = load(fs.readFileSync(aliasPath, 'utf8'));
        assert.equal($('link[rel="canonical"]').attr('href'), target, `${row.id}: redirect canonical must target its corresponding-language primary`);
        const refresh = $('meta[http-equiv]').filter((_, element) => String($(element).attr('http-equiv')).toLowerCase() === 'refresh').attr('content') || '';
        const destination = refresh.match(/^\s*0\s*;\s*url\s*=\s*(.+?)\s*$/i)?.[1]?.replace(/^["']|["']$/g, '');
        assert.ok(destination, `${row.id}: old detail URL must carry an immediate redirect`);
        assert.equal(new URL(destination, `https://eventme.live/${languagePrefix}events/${row.slug}.html`).href, target);
      }
      const jsonPath = path.join(root, 'dist', 'events', `${row.slug}.json`);
      assert.ok(fs.existsSync(jsonPath), `${row.id}: original per-event JSON URL must remain available`);
      const retained = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      for (const field of ['id', 'source_url', 'evidence_url', 'starts_at', 'ends_at', 'time_precision']) {
        assert.equal(retained[field], original[field], `${row.id}: retained JSON must preserve original ${field}`);
      }
      const icsPath = path.join(root, 'dist', 'events', `${row.slug}.ics`);
      assert.ok(fs.existsSync(icsPath), `${row.id}: original per-event calendar URL must remain available`);
      const calendar = fs.readFileSync(icsPath, 'utf8');
      assert.ok(calendar.includes('BEGIN:VCALENDAR') && calendar.includes(`UID:${row.id}@eventme.live`), `${row.id}: compatibility calendar must retain the original event identity`);
    }
  }
  console.log(`PUBLISHED_OUTPUT_PERSISTENCE_OK classified=4 build_exclusions=${parsed.total}`);
} else {
  console.log('PUBLISHED_OUTPUT_PERSISTENCE_OK classified=4 build_exclusions=not-built');
}
