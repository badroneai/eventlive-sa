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
import fs from 'node:fs';
import path from 'node:path';
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
  console.log(`PUBLISHED_OUTPUT_PERSISTENCE_OK classified=4 build_exclusions=${parsed.total}`);
} else {
  console.log('PUBLISHED_OUTPUT_PERSISTENCE_OK classified=4 build_exclusions=not-built');
}
