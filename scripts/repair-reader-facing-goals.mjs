// One-sweep repair for body copy that addressed search engines instead of readers.
//
// 692 event pages shipped this line as visible text inside the program section:
//
//   إثراء بطاقة الفعالية لتكون مفيدة للمستخدم والذكاءات ومحركات البحث.
//
// The page telling its own visitor that it exists to be useful to search engines.
// Whatever it was worth for rankings, it says out loud that the content was
// written for machines — the opposite of what Google's helpful-content guidance
// asks for, and the opposite of what a person opening an event page wants.
//
// fallbackEventGoals() now writes reader-facing lines, but these goals are stored
// in data/events_catalog.json, so the generator fix only reaches rows an enricher
// rewrites later. This replaces the stored copy in place.
//
// Narrow on purpose: it only touches the exact machine-written triple this repo
// generated, never prose a source actually published. Idempotent.

import fs from 'node:fs';
import path from 'node:path';
import { fallbackEventGoals } from './event-description-fallback.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Two generators wrote reader-hostile goal lines: the shared fallback, and the
// Visit Saudi enricher's own triple. Both are matched here.
const RETIRED = /محركات البحث/;
const RETIRED_REPLACEMENTS = new Map([
  ['رفع جودة صفحة الفعالية لمحركات البحث والذكاءات عبر وصف وصورة ومصدر رسمي.', 'إرفاق وصف وصورة ورابط المصدر الرسمي ليتحقق الزائر بنفسه.']
]);
const GENERATED_PREFIXES = [/^تقديم .+ موثقة من مصدرها/, /^توضيح الموعد والمدينة والموقع/];

let repaired = 0;
let skipped = 0;
for (const event of catalog.events || []) {
  const outline = event.program_outline;
  const goals = Array.isArray(outline?.goals) ? outline.goals : null;
  if (!goals || !goals.some((goal) => RETIRED.test(String(goal)))) continue;
  // Only replace when the whole block is the generated triple. A row where a
  // source contributed real goals keeps them; we swap just the offending line.
  const isGenerated = goals.every((goal) => RETIRED.test(String(goal)) || GENERATED_PREFIXES.some((re) => re.test(String(goal).trim())));
  if (isGenerated) {
    outline.goals = fallbackEventGoals(event);
  } else {
    // A row whose other goals came from a source keeps them; only the offending
    // line is swapped for its reader-facing counterpart, or dropped if it has none.
    outline.goals = goals
      .map((goal) => (RETIRED.test(String(goal)) ? RETIRED_REPLACEMENTS.get(String(goal).trim()) || '' : goal))
      .filter(Boolean);
    skipped += 1;
  }
  repaired += 1;
}

if (repaired) fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`READER_FACING_GOALS_REPAIR repaired=${repaired} partial_rows=${skipped}`);
