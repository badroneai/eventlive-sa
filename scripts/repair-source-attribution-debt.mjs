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
import { fallbackEventDescription, fallbackEventGoals } from './event-description-fallback.mjs';

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

  // A bare section heading is not a description. Replace it with the same derived
  // sentence enrich-official-event-backlog-details.mjs would have written — every
  // published row owes non-empty prose, so blanking the field would just trade this
  // outage for the backlog gate's.
  const body = stripSourceAttribution(event.summary);
  if (body && HEADING_ONLY.test(body)) {
    const derived = fallbackEventDescription(event);
    changes.push(`${id}.summary: replaced heading-only summary "${String(event.summary).slice(0, 60)}" with derived prose`);
    event.summary = derived;
    for (const field of ['description', 'rich_summary']) {
      if (stripSourceAttribution(event[field]) === body) {
        event[field] = derived;
        changes.push(`${id}.${field}: replaced heading-only text with derived prose`);
      }
    }
  }

  const outline = event.program_outline;
  if (outline && typeof outline === 'object') {
    const description = String(outline.official_description || '');
    if (countSourceAttributions(description) > 0) {
      const stripped = stripSourceAttribution(description);
      outline.official_description = HEADING_ONLY.test(stripped) || !stripped
        ? fallbackEventDescription(event)
        : stripped;
      changes.push(`${id}.program_outline.official_description: removed our own chrome from source prose`);
    }
    // The outline STAYS even when the prose is stripped: every published event owes
    // one (official-event-backlog-enrichment-regression-test), and the metadata
    // chips behind it — format, type, language, application close — really were
    // read off the source. Only the prose is re-derived.
    if (Array.isArray(outline.goals)) {
      const cleaned = outline.goals
        .map((goal) => stripSourceAttribution(goal))
        .filter((goal) => goal && !HEADING_ONLY.test(goal));
      const goals = cleaned.length ? cleaned : fallbackEventGoals(event);
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
