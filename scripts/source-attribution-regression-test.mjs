// Gate for the source-attribution invariant (incident 2026-09-01).
//
// Class banned: an enrichment writer reading back its OWN generated summary as a
// description input, then appending the "المصدر الرسمي: <جهة>." sentence again.
// The generated chrome accumulates inside catalog content, welds an Arabic
// sentence onto English source prose, and trips test:en-surface-sweep — which is
// blocking, so one poisoned row froze eventme.live for three days (sync runs
// 33448363668 → 33533573061).
//
// Two directions are checked:
//   A. unit — withSourceAttribution() is idempotent and strips before it appends.
//   B. corpus — no published summary carries more than one attribution sentence,
//      and no summary is a bare section heading plus attribution.
//
// This is OUR writer's output shape, not third-party content volume, so it is
// correctly blocking (AGENTS.md law 2.2).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  countSourceAttributions,
  stripSourceAttribution,
  withSourceAttribution
} from './source-attribution-utils.mjs';

const root = process.cwd();

// ---------- A. unit ----------
const once = withSourceAttribution('Eligibility Criteria for the fellowship', 'Misk Hub');
assert.equal(countSourceAttributions(once), 1, 'composition must emit exactly one attribution sentence');
assert.equal(
  withSourceAttribution(once, 'Misk Hub'),
  once,
  'composition must be idempotent — re-running enrichment may not grow the summary'
);
assert.equal(
  withSourceAttribution(withSourceAttribution(once, 'Misk Hub'), 'Misk Hub'),
  once,
  'composition must stay idempotent across repeated runs'
);
assert.equal(
  stripSourceAttribution('Eligibility Criteria المصدر الرسمي: Misk Hub. المصدر الرسمي: Misk Hub.'),
  'Eligibility Criteria',
  'strip must remove every attribution sentence, not just the last'
);
assert.equal(
  withSourceAttribution('', 'Misk Hub'),
  '',
  'an attribution sentence alone is not a summary'
);
// Prose that legitimately mentions the phrase without the colon is body copy.
const prose = 'راجع رابط المصدر الرسمي قبل الحضور لاحتمال تحديث القاعات أو ساعات الدخول.';
assert.equal(stripSourceAttribution(prose), prose, 'strip must not eat prose that merely mentions the phrase');

// ---------- B. corpus ----------
const catalogPath = path.join(root, 'data', 'events_catalog.json');
assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
const events = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
assert.ok(events.length > 0, 'catalog must carry events');

const HEADING_ONLY = /^(?:Program Details|Program Overview|Eligibility Criteria|Application criteria|Who Should Apply\??|Program Highlights|Program Outcomes)$/i;

const duplicated = [];
const headingOnly = [];
for (const event of events) {
  for (const field of ['summary', 'description', 'rich_summary']) {
    const value = String(event[field] || '');
    if (countSourceAttributions(value) > 1) {
      duplicated.push(`${event.slug || event.id}.${field}: ${value.slice(0, 120)}`);
    }
  }
  const body = stripSourceAttribution(event.summary);
  if (body && HEADING_ONLY.test(body)) {
    headingOnly.push(`${event.slug || event.id}: ${String(event.summary).slice(0, 120)}`);
  }
  const outlineDescription = event.program_outline?.official_description;
  if (outlineDescription && countSourceAttributions(outlineDescription) > 0) {
    duplicated.push(`${event.slug || event.id}.program_outline.official_description: ${String(outlineDescription).slice(0, 120)}`);
  }
}

assert.deepEqual(
  duplicated,
  [],
  `Source attribution fed back into content — an enrichment writer is reading its own summary as a description input:\n${duplicated.map((row) => `- ${row}`).join('\n')}`
);
assert.deepEqual(
  headingOnly,
  [],
  `A page-section heading shipped as the whole event summary:\n${headingOnly.map((row) => `- ${row}`).join('\n')}`
);

console.log(`SOURCE_ATTRIBUTION_OK events=${events.length} duplicated=0 heading_only=0`);
