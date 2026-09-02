// One-sweep repair for catalog rows already poisoned by the attribution feedback
// loop (incident 2026-09-01). The writer fix in source-attribution-utils.mjs stops
// NEW contamination; rows written before it stay poisoned until a source happens to
// republish, so they are normalized here in place.
//
// Rules (deliberately narrow — this repairs chrome, it never invents content):
//   * program_outline.official_description must carry ZERO attribution sentences.
//     That field is the SOURCE's own prose; our chrome being in it is proof the
//     value was read back out of a generated summary.
//   * summary / description / rich_summary keep exactly one attribution sentence.
//   * a summary that is nothing but a page-section heading plus attribution is
//     dropped — a heading is not a description, and an empty summary lets the
//     site's generic composer write an honest one.
//
// Idempotent: running it twice changes nothing.

import fs from 'node:fs';
import path from 'node:path';
import {
  countSourceAttributions,
  stripSourceAttribution,
  withSourceAttribution
} from './source-attribution-utils.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const HEADING_ONLY = /^(?:Program Details|Program Overview|Eligibility Criteria|Application criteria|Who Should Apply\??|Program Highlights|Program Outcomes)$/i;
const ATTRIBUTION_LABEL = /المصدر\s+الرسمي\s*:\s*([^.،؛]{1,80})(?:\.|$)/;

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const changes = [];

for (const event of catalog.events || []) {
  const id = event.slug || event.id;

  for (const field of ['summary', 'description', 'rich_summary']) {
    const value = String(event[field] || '');
    if (countSourceAttributions(value) <= 1) continue;
    const label = value.match(ATTRIBUTION_LABEL)?.[1] || '';
    const repaired = withSourceAttribution(value, label);
    if (repaired !== value) {
      event[field] = repaired;
      changes.push(`${id}.${field}: collapsed ${countSourceAttributions(value)} attribution sentences to 1`);
    }
  }

  const body = stripSourceAttribution(event.summary);
  if (body && HEADING_ONLY.test(body)) {
    changes.push(`${id}.summary: dropped heading-only summary "${String(event.summary).slice(0, 80)}"`);
    event.summary = '';
    for (const field of ['description', 'rich_summary']) {
      if (stripSourceAttribution(event[field]) === body) {
        event[field] = '';
        changes.push(`${id}.${field}: dropped heading-only text`);
      }
    }
  }

  const outline = event.program_outline;
  if (outline && typeof outline === 'object') {
    const description = String(outline.official_description || '');
    if (countSourceAttributions(description) > 0) {
      const stripped = stripSourceAttribution(description);
      outline.official_description = HEADING_ONLY.test(stripped) ? '' : stripped;
      changes.push(`${id}.program_outline.official_description: removed our own chrome from source prose`);
    }
    // A program outline whose prose is gone is four metadata chips, not an
    // outline. Leaving the husk in place would fail the per-source enrichment
    // gates against a row we never actually verified (AGENTS.md law 2.7).
    if (!outline.official_description && !(outline.goals || []).filter((goal) => stripSourceAttribution(goal)).length) {
      delete event.program_outline;
      changes.push(`${id}.program_outline: dropped — no verified source prose left behind the chrome`);
      continue;
    }
    if (Array.isArray(outline.goals)) {
      const goals = outline.goals
        .map((goal) => stripSourceAttribution(goal))
        .filter((goal) => goal && !HEADING_ONLY.test(goal));
      if (JSON.stringify(goals) !== JSON.stringify(outline.goals)) {
        outline.goals = goals;
        changes.push(`${id}.program_outline.goals: removed our own chrome from source prose`);
      }
    }
  }
}

if (changes.length) {
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}
console.log(`SOURCE_ATTRIBUTION_REPAIR rows_changed=${changes.length}`);
for (const change of changes) console.log(`- ${change}`);
